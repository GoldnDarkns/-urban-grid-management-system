# AQI Fallback & Page Results – Summary

**Date:** January 28, 2026

---

## 1. Kaggle AQI fallback (your CSV)

Your file **`data/Kaggle_Aqi_Downloaded.csv`** is used when the AirVisual API fails (429 rate limit or other errors).

### What was done

- **Path:**  
  - **Backend (DataProcessor / AQI service):** `aqi_kaggle_fallback.py` now tries, in order:  
    - `KAGGLE_AQI_CSV_PATH` (env), then  
    - `data/Kaggle_Aqi_Downloaded.csv`, then  
    - `data/kaggle_aqi.csv`.  
  - **Docker:** `KAGGLE_AQI_CSV_PATH=/app/data/Kaggle_Aqi_Downloaded.csv` in `docker-compose.yml` (your `data/` folder is mounted at `/app/data`).  
  - **Kafka producer:** `kaggle_aqi_service.py` tries the same env var and then the same filenames (including `Kaggle_Aqi_Downloaded.csv`) in `data/` and `/app/data/`.

- **CSV columns:**  
  Your EPA-style CSV has columns like **Latitude**, **Longitude**, **AQI**, **Arithmetic Mean**, **City Name**, **State Name**, **Date Local**.  
  - Both `aqi_kaggle_fallback.py` and `kaggle_aqi_service.py` now map:  
    - `Latitude` / `Longitude` → lat/lon  
    - `AQI` → AQI (empty treated as missing; see below)  
    - `Arithmetic Mean` → PM2.5  
    - `City Name` / `State Name` → city/state  
  - If **AQI** is empty but **Arithmetic Mean** (PM2.5) is present, AQI is derived from PM2.5 so the fallback still returns a valid AQI.

- **Empty AQI:**  
  Safe parsing was added so empty or invalid AQI values don’t break loading; they either use the derived AQI from PM2.5 or default to 50.

### What you need to do

- **Nothing** if the file is already at **`data/Kaggle_Aqi_Downloaded.csv`** (local run or Docker mount).  
- **Optional:** In `.env` you can set:  
  `KAGGLE_AQI_CSV_PATH=data/Kaggle_Aqi_Downloaded.csv`  
  (Docker already sets the path for the container.)

### How to confirm it’s working

- When AirVisual returns 429 or errors, logs should show:  
  - `[AQIKaggleFallback] Loaded N AQI records from Kaggle_Aqi_Downloaded.csv` or  
  - `[KaggleAQI] Loaded N records from Kaggle_Aqi_Downloaded.csv`  
  and then AQI values from the CSV (or derived from PM2.5) will be used and stored in `processed_zone_data` / `aqi_data` and shown on the site.

---

## 2. Results on each page (City Live)

All of these use **processed data** (from `processed_zone_data` and related APIs) when in **City Live** mode with a city selected and after processing has run.

| Page | Data source | What’s shown |
|------|-------------|--------------|
| **Home** | `getStatus(city_id)` | Zone count, processed count (distinct_zones / count). |
| **Data** | `getStatus(city_id)`, `getProcessedData`, `getZoneCoordinates` | Collections (incl. distinct_zones), zone list with AQI, demand, risk, weather, traffic. |
| **Analytics** | `getProcessedData`, `getZoneCoordinates`, `getCosts` | Demand, AQI by zone, alerts, costs; “Select a city and run processing” when no city/data. |
| **Advanced Analytics** | `getProcessedData` | TFT, LSTM (comparison), Autoencoder, GNN outputs (live badge). |
| **Insights** | `getProcessedData` | Zone risk, alerts, anomalies, TFT demand aggregate from processed data. |
| **AI Recommendations** | `aiAPI.getRecommendations(city_id)` (backend uses `processed_zone_data`) | Recommendations and system state from live processed data. |
| **City Map** | `getZoneCoordinates`, `getProcessedData` | Zone positions and risk from processed data. |
| **Cost** | `getCosts(city_id)` (backend uses `processed_zone_data` + EIA) | Energy/CO₂/AQI/311 cost estimates. |
| **Live Stream** | `GET /api/live-stream` (Kafka → MongoDB) | Live feed; AQI can come from Kaggle fallback when API fails. |
| **Visualizations** | `getProcessedData` | Heatmap, zone comparison, etc., from processed data. |
| **Incidents** | City 311 API (and Sim incident_reports) | 311 requests; page is mode-aware. |
| **Reports** | `getProcessedData` (City) | Report data from processed zones. |

So: **each page is wired to the right APIs**, and **DL/processing results** (demand forecast, risk, anomalies, AQI, etc.) come from **processed_zone_data** and are **displayed** on the website.  
If a page shows “no data” in City mode, select a city and run processing; after it completes, refresh or wait for the next poll and the results will appear.
