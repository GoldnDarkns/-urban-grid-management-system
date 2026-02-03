# Phase 1b — Kafka as Main Data Path (City Live)

**Goal:** APIs → Kafka → consumer → MongoDB so City Live is fed by continuous ingestion; frontend and APIs only read from MongoDB. No direct API calls on "user action" for City Live data.

**Status:** Outline and first steps. Full implementation in follow-up work.

---

## 0. Who Calls the APIs? (Important)

**The Kafka producer calls the APIs.** That’s how new information gets into the system.

| Who | Calls APIs? | Role |
|-----|--------------|------|
| **Kafka producer** | **Yes.** Runs on a schedule (e.g. every 45 s or 1–5 min). Fetches Weather, AQI, Traffic, EIA, 311 **per zone** and **publishes** the results to Kafka topics. | Source of new data. |
| **Kafka consumer** | No. | Reads from Kafka and writes to MongoDB (kafka_live_feed + raw_*). |
| **Processing job** | No. | Reads **from MongoDB** (data that arrived via producer → Kafka → consumer). Runs heuristics/ML and writes processed_zone_data. |
| **User / frontend** | No. | Only reads from FastAPI → MongoDB. |

**End-to-end flow:**

1. **Producer** (scheduled) → calls Weather, AQI, Traffic, EIA, 311 APIs → **publishes to Kafka**.
2. **Consumer** → reads from Kafka → writes to MongoDB (raw_*, kafka_live_feed).
3. **Processing job** → reads from MongoDB (raw_*) → runs heuristics/ML → writes processed_zone_data.
4. **Frontend** → reads from MongoDB via FastAPI.

So: **APIs are still called — by the producer.** The change is that they are **not** called by the processing job or when the user clicks “Process.” The processing job and the website just use data that the producer already put into Kafka and the consumer wrote to MongoDB.

---

## 1. Current vs Target

| Current | Target (Phase 1b) |
|--------|--------------------|
| User selects city → BackgroundProcessor runs → DataProcessor calls Weather/AQI/Traffic **per zone** (N×3 API calls) → writes processed_zone_data | Producers run on a **schedule** (e.g. every 1–5 min) → publish to Kafka → Consumer writes to MongoDB (raw or derived) → **Processing job** reads from MongoDB, runs heuristics, writes processed_zone_data |
| Kafka: producer → topics → consumer → **kafka_live_feed only** (Live Stream tab) | Kafka: same topics → consumer writes to **raw_*** and/or **kafka_live_feed** → processing job builds **processed_zone_data** from Kafka-sourced data |
| First load / "Process all" = long wait (many API calls) | Data pre-populated by pipeline; site reads from DB → faster perceived load |

---

## 2. Deliverables (from PHASES_MASTER_PLAN)

- **Producers:** Scheduled collectors for EIA, AQI, Traffic, Weather, 311 → Kafka topics (e.g. raw_eia_power, raw_aqi, raw_traffic, raw_weather, raw_311_incidents). *Current producer already publishes to power_demand, aqi_stream, traffic_events, grid_alerts, incident_text; can keep or add raw_* topics.*
- **Consumer:** Validate, dedupe, normalize, city→zone mapping → write to MongoDB (raw_* and/or derived: features_hourly, or feed into processed_zone_data).
- **Processing job:** Aggregate raw → zone-level features; run heuristics (and optional ML inference); write processed_zone_data, model_outputs, risk_scores, alerts.
- **Frontend and APIs:** Only read from MongoDB (no direct Kafka). City Live endpoints read processed_zone_data built from Kafka-sourced data.

**Outcome:** Data pre-populated; site feels faster; single source of truth for City Live.

---

## 3. Implementation Steps (Suggested Order)

### Step 1 — Consumer writes to topic-keyed collections (raw_*)

- Keep writing to `kafka_live_feed` for Live Stream tab (no regression).
- **Add:** For each topic, also upsert into a topic-specific collection, e.g.:
  - `aqi_stream` → `raw_aqi` (or `kafka_raw_aqi`) with city_id, zone_id, ts, payload.
  - `power_demand` → `raw_power_demand`
  - `traffic_events` → `raw_traffic`
  - `incident_text` → `raw_311_incidents`
- Use (city_id, zone_id, ts) or (topic, city_id, zone_id, ts) for dedupe/upsert so the latest value per zone is available.

### Step 2 — Processing job: build processed_zone_data from Kafka-sourced data

- New job (or extend BackgroundProcessor) that:
  - Reads **from MongoDB** (raw_* or kafka_live_feed aggregated by city/zone). It does **not** call Weather/AQI/Traffic APIs — that data is already in MongoDB because the **producer** called the APIs and published to Kafka, and the consumer wrote it to raw_*.
  - Runs same heuristics (demand forecast, anomaly, risk, recommendations) as DataProcessor.
  - Writes to `processed_zone_data` as today.
- City Live "Process" or scheduled run triggers this job; the job does **not** call APIs (APIs are called only by the producer on its schedule).

### Step 3 — City select / first load

- When user selects a city:
  - Option A: Start producer for that city (if not already) and run consumer; wait for at least one cycle of raw_* data, then run processing job (read from raw_* → write processed_zone_data). Show "Data is loading…" until first processed_zone_data appears.
  - Option B: Keep one-off "backfill" that still calls APIs once and writes to Kafka (or directly to raw_*) so first load has data quickly; thereafter pipeline only uses Kafka.
- Frontend and existing APIs unchanged: they still read processed_zone_data, alerts, etc. from MongoDB.

### Step 4 — Optional: raw_* topics and producer naming

- If desired, rename or add topics to raw_weather, raw_aqi, raw_traffic, raw_eia, raw_311 so consumer and processing job have a clear schema. Current topics can stay; consumer can still write to raw_* collections by mapping topic → collection.

---

## 4. What Exists Today

- **kafka_producer.py:** Fetches Weather, AQI, Traffic, EIA, 311 per zone (up to MAX_ZONES); publishes to aqi_stream, power_demand, traffic_events, grid_alerts, incident_text. Runs on interval (e.g. 45s).
- **kafka_consumer.py:** Consumes those topics; writes to `kafka_live_feed` (city DB) with topic, ts, ingested_at, payload, city_id, zone_id.
- **DataProcessor / BackgroundProcessor:** Calls APIs per zone, runs heuristics, writes processed_zone_data. Used when user selects city and on a timer.

Phase 1b = add consumer path to raw_* (or aggregated) + processing job that **reads from MongoDB** (Kafka-sourced) and writes processed_zone_data, and optionally use that path when "Process" is requested so we don’t call APIs again for that run.

---

## 5. Status

- **Step 1 — Done:** Consumer writes to topic-keyed collections: raw_weather and raw_aqi (from aqi_stream by payload.type), raw_traffic, raw_power_demand, raw_grid_alerts, raw_311. Upsert by (city_id, zone_id). Live Stream still uses kafka_live_feed.
- **Step 2 — Done:** DataProcessor has _read_raw_for_city() and process_from_kafka_raw(city_id); BackgroundProcessor tries Kafka path first, then API path. New endpoint: POST /api/city/process/from-kafka.
- **Flow:** Producer (APIs on schedule) → Kafka → Consumer → MongoDB (raw_*) → Processing job → processed_zone_data. Website uses Kafka path when raw_* has data; otherwise API path.

Once Step 2 is in place, City Live is fed from: **Producer (calls APIs on schedule) → Kafka → Consumer → MongoDB (raw_*) → Processing job (reads raw_*, runs ML/heuristics) → processed_zone_data.** The website and “Process” action no longer trigger API calls; only the producer does.
