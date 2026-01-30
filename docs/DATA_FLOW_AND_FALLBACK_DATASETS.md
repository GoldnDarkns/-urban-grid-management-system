# Data Flow A→Z & Fallback Datasets

This doc explains: (1) **how data is retrieved, processed, and saved** end-to-end, and (2) **which fallback datasets you can provide** when APIs hit rate limits or fail.

---

## Part 1: Data flow A→Z

There are **two main data paths**. Both feed the same MongoDB (CITY DB) and UI.

### Path A: City Live processing (when you “Process” a city)

Used when you select a city (e.g. Los Angeles) and run “Processing” from the UI. This is the **main path** for dashboards, analytics, and alerts.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. USER SELECTS CITY (e.g. LA)                                                    │
│    → Backend: CityService.get_city() + calculate_zone_coordinates() (in-memory)   │
│    → MongoDB: zones collection updated (bulk write, background)                    │
│    → Background task starts: DataProcessor + BackgroundProcessor                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 2. PER ZONE (e.g. 35 zones for LA) – for each zone:                              │
│                                                                                   │
│    a) FETCH LIVE APIs (in order):                                                 │
│       • Weather   → OpenWeatherMap (lat, lon)                                    │
│       • AQI       → AirVisual (IQAir); on 429/fail → Kaggle CSV fallback ✅       │
│       • Traffic   → TomTom (lat, lon)                                              │
│                                                                                   │
│    b) WRITE RAW TO MONGODB (CITY DB):                                             │
│       • weather_data, aqi_data, traffic_data (one doc per zone per type)          │
│                                                                                   │
│    c) ML PROCESSING (in-process):                                                 │
│       • Demand forecast, anomaly detection, risk score (from raw_data)            │
│                                                                                   │
│    d) RECOMMENDATIONS + ALERTS:                                                   │
│       • generate_recommendations(); _create_alerts_from_processing()              │
│       • alerts → MongoDB alerts collection                                        │
│                                                                                   │
│    e) SAVE COMBINED RESULT:                                                       │
│       • processed_zone_data.insert_one({ zone_id, city_id, raw_data,             │
│          ml_processed, recommendations })                                         │
│                                                                                   │
│    f) LATER (after all zones): EIA data once per city/state:                      │
│       • EIA electricity + CO2 → eia_electricity_data, eia_co2_emissions           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 3. UI READS FROM MONGODB                                                          │
│    • Data page: processed_zone_data, zones, alerts, weather_data, aqi_data, etc. │
│    • Analytics: hourly demand, anomalies, alerts summary (from same collections)  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Summary – Path A:**  
**APIs (per zone)** → **MongoDB (raw + processed_zone_data + alerts)** → **UI**.  
No Kafka in this path; data goes straight to MongoDB.

---

### Path B: Kafka producer → Kafka → Consumer → MongoDB (Live Stream)

Used by the **kafka-producer** service (runs every ~45s). Feeds the **Live Stream** tab and `kafka_live_feed` in MongoDB.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. KAFKA PRODUCER (backend/kafka_producer.py) – every INTERVAL (e.g. 45s)       │
│    • Gets current city from backend /api/city/current                           │
│    • Gets zones (same CityService.calculate_zone_coordinates)                    │
│    • For each zone / source:                                                    │
│      – Weather  → OpenWeatherMap → topic "aqi_stream" (combined with AQI)       │
│      – AQI      → AirVisual; on fail/429 → Kaggle ✅ → topic "aqi_stream"        │
│      – Traffic  → TomTom → topic "traffic_events"                                │
│    • EIA (once) → get_electricity_operational_data() → topic "power_demand"      │
│    • 311 (once) → City311Service.get_311_requests() → topic "incident_text"       │
│    • Heartbeat → topic "grid_alerts"                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 2. KAFKA TOPICS                                                                  │
│    power_demand | aqi_stream | traffic_events | grid_alerts | incident_text   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 3. KAFKA CONSUMER (backend/kafka_consumer.py)                                    │
│    • Consumes all 5 topics                                                       │
│    • Writes each message → MongoDB CITY DB, collection: kafka_live_feed         │
│    • Doc shape: { topic, ts, ingested_at, payload, city_id?, zone_id? }         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 4. UI – LIVE STREAM TAB                                                          │
│    • GET /api/live-stream → reads from kafka_live_feed                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Summary – Path B:**  
**APIs** → **Kafka producer** → **Kafka topics** → **Kafka consumer** → **MongoDB (kafka_live_feed)** → **Live Stream UI**.

---

## Part 2: APIs and current fallbacks

| API / source       | Used for              | Where used              | Rate limit / failure | Current fallback              |
|--------------------|-----------------------|-------------------------|----------------------|-------------------------------|
| **OpenWeatherMap** | Weather (temp, etc.)  | Path A + Path B         | Yes (calls/day)      | ❌ None – returns `None`      |
| **AirVisual (IQAir)** | AQI                 | Path A + Path B         | 429 common           | ✅ **Kaggle CSV** (`data/Kaggle_Aqi_Downloaded.csv`) |
| **TomTom**         | Traffic flow          | Path A + Path B         | 400 on some points   | ❌ None – returns `None`      |
| **EIA**            | Electricity, CO2      | Path A (EIA step) + Path B | Key/limits       | ❌ None                       |
| **City 311**       | Incidents / 311       | Path B (incident_text) + cost/incidents | Per city   | ✅ NYC: Socrata fallback      |

So today only **AQI** has a real fallback (Kaggle CSV). Weather, Traffic, and EIA have no dataset fallback.

---

## Part 3: Datasets you can provide for fallbacks

If you provide the following, we can wire them so that when an API fails or hits a limit we **read from the dataset instead**, then continue the same flow (Kafka and/or MongoDB as today).

### 1. Weather (fallback for OpenWeatherMap)

- **Purpose:** When OpenWeatherMap fails or rate-limits, use a CSV/dataset to get temp, humidity, etc. by location or time.
- **Format that works well:**
  - CSV with columns such as: **lat** (or latitude), **lon** (or longitude), **temp** (or temperature), **humidity**, **pressure**, **wind_speed**, **timestamp** (or date/time).
  - Optional: **city_id** or **zone_id** if you have pre-aggregated by zone.
- **Example columns:**  
  `lat,lon,temp,humidity,pressure,wind_speed,description,timestamp`  
  or  
  `latitude,longitude,temperature_c,humidity_pct,pressure_hpa,wind_speed_mps,conditions,datetime_utc`
- **Where we’d use it:** Same shape as OpenWeatherMap response so we can still run ML and write to `weather_data` and `processed_zone_data` (Path A) and/or publish to Kafka (Path B).

---

### 2. AQI – already have fallback ✅

- **Current:** `data/Kaggle_Aqi_Downloaded.csv` (or env `KAGGLE_AQI_CSV_PATH`).
- **Format:** Lat/lon + AQI (and optional PM2.5, etc.). We match nearest point by distance.
- **No new dataset needed** unless you want to replace or add another file; if so, same format (lat, lon, AQI, optional extra fields).

---

### 3. Traffic (fallback for TomTom)

- **Purpose:** When TomTom returns 400/429 or fails, use a CSV/dataset to get traffic-like metrics by location.
- **Format that works well:**
  - CSV with: **lat**, **lon** (or latitude, longitude), and one or more of: **current_speed**, **free_flow_speed**, **confidence**, **congestion_level** (e.g. free/moderate/heavy).
  - Optional: **timestamp**, **road_closure** (0/1 or true/false).
- **Example columns:**  
  `lat,lon,current_speed_kph,free_flow_speed_kph,confidence,congestion_level,timestamp`
- **Where we’d use it:** Same shape as TomTom response so we can still write to `traffic_data` and `processed_zone_data` (Path A) and Kafka `traffic_events` (Path B).

---

### 4. EIA (electricity / CO2 fallback)

- **Purpose:** When EIA API fails or is over limit, use pre-downloaded electricity/CO2 data by state (and optionally time).
- **Format that works well:**
  - **Electricity:** CSV with **state** (e.g. CA, NY), **value** (or generation/consumption), **timestamp** or **period** (e.g. monthly).
  - **CO2:** Same idea: **state**, **value** (or emissions), **timestamp** or **period**.
- **Example columns (electricity):**  
  `state,period,value,series_name`  
  or  
  `state,year,month,generation_mwh,consumption_mwh`
- **Example columns (CO2):**  
  `state,year,emissions_tons` or `state,period,co2_emissions`
- **Where we’d use it:** To fill `eia_electricity_data` and `eia_co2_emissions` (Path A) and Kafka `power_demand` (Path B) when the API is unavailable.

---

### 5. 311 / incidents (optional)

- **Purpose:** If a city’s 311 API is down or rate-limited, we could fall back to a static CSV of sample incidents.
- **Format:** CSV with columns like **request_id**, **type** or **complaint_type**, **status**, **created_date**, **lat**, **lon**, **description** (optional), **city_id** (optional).
- **Where we’d use it:** Path B `incident_text` and any incident/cost features that read 311 data.

---

## Part 4: Order of operations (sequence) – quick reference

**Path A – City Live processing**

1. User selects city → zones computed → MongoDB `zones` updated (background).
2. For each zone, in order:
   - Fetch **Weather** → write `weather_data`.
   - Fetch **AQI** (API → on fail use Kaggle) → write `aqi_data`.
   - Fetch **Traffic** → write `traffic_data`.
   - Run **ML** on raw_data → get demand, anomaly, risk.
   - **Recommendations** + **alerts** → write `alerts`.
   - Write one doc to **processed_zone_data** (raw_data + ml_processed + recommendations).
3. After all zones: **EIA** (electricity + CO2) → `eia_electricity_data`, `eia_co2_emissions`.
4. UI reads from these MongoDB collections.

**Path B – Kafka Live Stream**

1. Producer: for current city’s zones → fetch Weather, AQI (with Kaggle fallback), Traffic; once per run: EIA, 311.
2. Producer publishes to Kafka topics (power_demand, aqi_stream, traffic_events, grid_alerts, incident_text).
3. Consumer reads topics → writes to MongoDB **kafka_live_feed**.
4. Live Stream tab reads from **kafka_live_feed**.

---

## Part 5: What to give me next

You can say, for example:

- “I’ll add **weather** CSV at `data/weather_fallback.csv` with columns …”
- “I’ll add **traffic** CSV at `data/traffic_fallback.csv` with columns …”
- “I’ll add **EIA** CSVs at `data/eia_electricity.csv` and `data/eia_co2.csv` with columns …”

Then we can:

1. Add a **weather** fallback (CSV by lat/lon or zone) when OpenWeatherMap fails.
2. Add a **traffic** fallback (CSV by lat/lon) when TomTom fails.
3. Add **EIA** fallbacks (CSV by state/period) when EIA API fails.
4. Keep using the **same pipeline** after fallback: data still goes to MongoDB (and Kafka in Path B) so the rest of the app (ML, alerts, Live Stream, analytics) stays the same.

If you tell me which of these you have (or will create), I’ll tell you the exact column names and file paths to use and then implement the fallback logic in code.
