# Data Directory

Place your Kaggle AQI dataset CSV file here.

**File name:** `kaggle_aqi.csv`

**Expected columns:**
- `lat` / `latitude` / `Latitude`
- `lon` / `longitude` / `Longitude`
- `aqi` / `AQI` / `aqius`
- `pm25`, `pm10`, `o3`, `no2`, `so2`, `co` (optional)
- `city`, `state` (optional)

The AQI service will automatically use this dataset when AirVisual API is rate-limited.
