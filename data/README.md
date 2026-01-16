# Data Directory

This folder contains real-world datasets for the Urban Grid Management System.

## Required Datasets

### 1. Energy Consumption Data

**UCI Individual Household Electric Power Consumption**
- Download from: https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption
- Click "Download" button
- Extract the zip file
- Place `household_power_consumption.txt` in this folder

**Expected file:** `household_power_consumption.txt`
- Size: ~127MB (uncompressed)
- Format: Semicolon-separated values
- Columns: Date, Time, Global_active_power, Global_reactive_power, Voltage, Global_intensity, Sub_metering_1, Sub_metering_2, Sub_metering_3

### 2. Air Quality Data

**India Air Quality Data**
- Download from: https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india
- Requires Kaggle account (free)
- Download and extract the zip
- Place CSV files in this folder

**Expected files:**
- `city_day.csv` - Daily air quality readings by city
- `city_hour.csv` - Hourly air quality readings (if available)
- `station_day.csv` - Station-level daily readings
- `station_hour.csv` - Station-level hourly readings

## Alternative Datasets

If you can't access the above, these alternatives work:

### Energy Data Alternatives
- London Smart Meters: https://www.kaggle.com/datasets/jeanmidev/smart-meters-in-london
- ASHRAE Energy: https://www.kaggle.com/c/ashrae-energy-prediction/data

### Air Quality Alternatives
- Beijing PM2.5: https://archive.ics.uci.edu/dataset/381/beijing+pm2+5+data
- Global Air Quality: https://www.kaggle.com/datasets/open-aq/openaq

## After Downloading

Run the ingestion script:
```bash
python -m src.db.ingest_real_data
```

This will:
1. Parse the downloaded CSV/TXT files
2. Transform data to match our schema
3. Load into MongoDB collections
4. Create appropriate indexes

