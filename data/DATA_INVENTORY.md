# Data Folder Inventory

Checked: all files in `data/` for fallback use.

---

## ✅ AQI (already wired)

| File | Purpose |
|------|--------|
| **Kaggle_Aqi_Downloaded.csv** | Main AQI fallback (lat/lon + AQI). Already used when AirVisual hits 429. |
| kaggle_aqi.csv | Alternate/same AQI data. |
| city_day.csv | AQI by city (Indian cities: Ahmedabad, etc.) – City, Date, PM2.5, AQI. |
| station_day.csv | AQI by station (Indian stations) – StationId, Date, PM2.5, AQI. |
| stations.csv | Station list (Indian) – StationId, City, State. No lat/lon. |

**Use for fallback:** `Kaggle_Aqi_Downloaded.csv` is the one the app uses. Others are extra.

---

## ✅ Weather

| File / Folder | Purpose |
|---------------|--------|
| **US_City_Temp_Data.csv** | **Best for US weather fallback.** Monthly mean temp by US city (columns: time, albuquerque, anchorage, atlanta, boise, boston, chicago, dallas, denver, detroit, los_angeles, new_york, san_francisco, seattle, etc.). 1948–2022. We map city_id (e.g. nyc, la, sf) to column and use latest month. |
| **7890488/** (62 CSVs) | Figshare “210 US cities” daily weather: one CSV per station (e.g. USW00023183.csv). Columns: Date, tmax, tmin, prcp. Station IDs are NOAA-style; we’d need station→lat/lon to use by zone. Optional for a second, daily weather source. |
| ghcnd.xlsx | GHCN data in Excel. Can be used if we add Excel read support and station mapping. |

**Use for fallback:** `US_City_Temp_Data.csv` – ready for weather fallback (city-based).

---

## ✅ EIA (electricity & emissions)

| File | Purpose |
|------|--------|
| **annual_generation_state.xls** | Net generation by state by type/source (1990–2024). Use for electricity fallback when EIA API fails. |
| **emission_annual.xlsx** | U.S. electric power industry estimated emissions by state (1990–2024). Use for CO2/emissions fallback. |

**Note:** Both are Excel (XLS/XLSX). Code will need to read them with pandas (+ openpyxl for .xlsx; xlrd or “Save as CSV” for .xls). If you prefer, export each to CSV and we’ll use the CSVs.

---

## ✅ Traffic (new)

| File | Purpose |
|------|--------|
| **traffic_speed_20260129.csv** | Chicago traffic speed by segment. Columns: SEGMENTID, STREET, DIRECTION, FROM_STREET, TO_STREET, LENGTH, STREET_HEADING, **CURRENT_SPEED**, LAST_UPDATED. Use when TomTom API fails: sample a row (or median speed where CURRENT_SPEED > 0) and return a traffic-like object for fallback. |

---

## ✅ Weather – extra (new)

| File | Purpose |
|------|--------|
| **2023.csv.gz** | Likely NOAA GHCN daily data for 2023 (gzip). Use with `pandas.read_csv(..., compression='gzip')`; usually has columns like station id, date, element (TMAX, TMIN, PRCP), value. For daily-by-station fallback we’d need a station list with lat/lon (e.g. ghcnd-stations.txt) to match zones. Optional. |

---

## Summary

| Data type | Status | File(s) to use |
|-----------|--------|----------------|
| AQI | ✅ Ready | Kaggle_Aqi_Downloaded.csv (already in use) |
| Weather | ✅ Ready | US_City_Temp_Data.csv (+ optional: 2023.csv.gz for daily by station) |
| EIA electricity | ✅ Present | annual_generation_state.xls |
| EIA emissions | ✅ Present | emission_annual.xlsx |
| Traffic | ✅ Present | traffic_speed_20260129.csv |

Next step: implement weather and EIA fallbacks in code using these files; keep AQI as is.
