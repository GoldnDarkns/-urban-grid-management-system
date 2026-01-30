# Best Fallback Datasets to Download

Use these **one “perfect” dataset per category** when APIs hit rate limits. Download once, put in `data/`, and the app will use them as fallbacks (same flow → Kafka / MongoDB).

---

## 1. Weather (fallback for OpenWeatherMap)

**Small dataset (recommended – skip the 30GB NOAA):**

- **Monthly Mean Temperature – Major US Cities (1948–2022)**  
  **https://www.kaggle.com/datasets/garrickhague/temp-data-of-prominent-us-cities-from-1948-to-2022**
- **Size:** Small (single CSV, few MB). US cities, monthly mean temp; we’ll map city/state → zones and use as weather fallback.
- **Where to put:** e.g. `data/weather_fallback_us_cities.csv` (save the Kaggle CSV there).

**Optional – daily data, still smaller than 30GB:**

- **Compiled daily temperature and precipitation – 210 U.S. cities** (Figshare)  
  **https://figshare.com/articles/dataset/Compiled_daily_temperature_and_precipitation_data_for_the_U_S_cities/7890488**
- **Size:** ~272 MB total; you can download only selected city files to keep it small.
- **Where to put:** e.g. `data/weather_210cities/` (one CSV per city).

**Not recommended for fallback:** NOAA GHCN-Daily on Kaggle (~30GB) is too large for a simple fallback.

---

## 2. AQI (you already have this)

- **Current:** `data/Kaggle_Aqi_Downloaded.csv` (e.g. EPA/Kaggle AQI with lat, lon, AQI).
- No extra download needed unless you want to swap to a different AQI file (same column idea: lat, lon, AQI).

---

## 3. Traffic (fallback for TomTom)

**Best choice: City of Chicago – Traffic Speed**

- **Why:** Real traffic speed by segment, CSV, free, US city, good for “traffic flow” style fallback.
- **Source:** Chicago Data Portal.  
  **https://data.cityofchicago.org/Transportation/Traffic-Tracker-Historical-Congestion-Estimates-by-Region/vw7y-fq6r**
- **Alternative (more “flow” style):**  
  **Chicago Traffic Speed (segment-level):**  
  **https://data.cityofchicago.org/Transportation/traffic-speed/5a25-jnzd**
- **Download:** Use “Export” → CSV. You may get segment IDs and speeds; we can map region/segment to approximate lat/lon or use as a generic “city traffic” fallback when TomTom fails.
- **What we need:** Either (1) CSV with lat/lon + speed/congestion, or (2) CSV with region/segment + speed so we can build a simple lookup (e.g. one row per “region” and we use nearest region by city).
- **Where to put:** e.g. `data/chicago_traffic_speed.csv` or `data/traffic_fallback.csv`.

**If you prefer one national-style dataset:**

- **PeMS California Traffic Speed (Zenodo)**  
  **https://zenodo.org/records/3939793**  
  - Large (e.g. 635 MB compressed), many sensors; we’d use a sample or aggregate by area. Good if you want California coverage and are OK with bigger files.

**Recommendation:** Start with **Chicago Traffic Tracker or Traffic Speed** CSV; put it in `data/traffic_fallback.csv` (or similar) and we’ll wire it as TomTom fallback.

---

## 4. EIA – Electricity & CO2 (fallback for EIA API)

**Source page:** **https://www.eia.gov/electricity/data/state/** (Historical State Data)

**Download exactly these two files (EIA only offers XLS/XLSX; we use these two for fallback):**

| # | What it is | Direct download link | After download |
|---|------------|----------------------|-----------------|
| 1 | **Net Generation by State** (annual, 1990–2024) | **https://www.eia.gov/annual_generation_state.xls** | Open in Excel → “Save As” → CSV → save as `data/eia_annual_generation_state.csv` |
| 2 | **U.S. Electric Power Industry Estimated Emissions by State** (annual, 1990–2024) | **https://www.eia.gov/emission_annual.xlsx** | Open in Excel → “Save As” → CSV (if multiple sheets, save the main data sheet) → save as `data/eia_emission_annual.csv` |

**Steps:**

1. Click **https://www.eia.gov/annual_generation_state.xls** → save the file (e.g. `annual_generation_state.xls`).  
2. Open it in Excel (or Google Sheets), then **File → Save As** → choose **CSV (Comma delimited)** → save into your project as **`data/eia_annual_generation_state.csv`**.  
3. Click **https://www.eia.gov/emission_annual.xlsx** → save the file (e.g. `emission_annual.xlsx`).  
4. Open it in Excel, pick the sheet with state/year/emissions data, then **File → Save As** → **CSV** → save as **`data/eia_emission_annual.csv`**.

**What we need:**  
- **Generation file:** state (e.g. CA, NY), year, and generation/value columns.  
- **Emissions file:** state, year, CO2 (and optionally SO2, NOx) columns.  

We’ll use these two CSVs when the EIA API fails or is rate-limited.

---

## 5. Optional: 311 / Incidents

- Only needed if you want a **static fallback** when a city’s 311 API is down.
- NYC/Chicago often expose 311 or service requests as CSV on their open data portals. You can pick one city (e.g. NYC 311), export CSV (request_id, type, status, created_date, lat, lon, etc.) and save as e.g. `data/311_fallback_nyc.csv`. We can wire it later.

---

## Summary – “Most perfect” single download per category

| Data type   | Best dataset to download | Where to get it | Put file(s) in |
|------------|---------------------------|-----------------|----------------|
| **Weather** | NOAA GHCN-Daily (stations + one year CSV) | Kaggle: [noaa/noaa-global-historical-climatology-network-daily](https://www.kaggle.com/datasets/noaa/noaa-global-historical-climatology-network-daily) or NCEI links above | `data/ghcnd-stations.txt`, `data/ghcnd-daily-2023.csv` (or `data/ghcnd/` from Kaggle ZIP) |
| **AQI**     | Already have Kaggle AQI   | —               | `data/Kaggle_Aqi_Downloaded.csv` ✅ |
| **Traffic** | Chicago Traffic Speed / Tracker | [Chicago Data Portal – Traffic](https://data.cityofchicago.org/Transportation/traffic-speed/5a25-jnzd) → Export CSV | `data/traffic_fallback.csv` (or `chicago_traffic_speed.csv`) |
| **EIA**     | EIA state generation + emissions | [EIA State Data](https://www.eia.gov/electricity/data/state/) → annual_generation_state.xls + emission_annual.xlsx → save as CSV | `data/eia_annual_generation_state.csv`, `data/eia_emission_annual.csv` |

After you download and place these, tell me the **exact paths and column names** (or share the first 2–3 lines of each CSV), and I’ll wire the fallback logic so that when an API fails or hits a limit we use these files and then continue the same flow (Kafka → consumer → MongoDB / direct MongoDB) as today.
