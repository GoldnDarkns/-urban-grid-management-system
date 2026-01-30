# Dynamic Processing System - Complete Architecture

**Date:** January 2026  
**Status:** ✅ **Fully Implemented**

---

## 🎯 Overview

The system is now **fully dynamic** with a complete processing pipeline:

**Live APIs → ML Processing → Storage → Dynamic Display**

This is the **heart of the website** - everything updates in real-time based on processed data.

---

## 🔄 Processing Pipeline

### 1. **City Selection** (User Action)
- User selects a city from dropdown (NYC, Chicago, LA, SF, Houston, Phoenix)
- System configures 20 zones for that city with real coordinates
- Background processing starts automatically

### 2. **Data Fetching** (Every 5 Minutes)
For each zone:
- **Weather API** → Current temperature, humidity, wind, forecasts
- **AQI API** → Air quality index, PM2.5, PM10, pollutants
- **Traffic API** → Traffic flow, congestion, incidents
- **EIA API** → Electricity generation, consumption, CO2 emissions (state-level)
- **Census API** → Population data (if needed)
- **OpenStreetMap** → Infrastructure locations

### 3. **ML Processing** (Local GPU/CPU)
For each zone:
- **LSTM/Prophet/ARIMA** → Demand forecasting (enhanced with weather data)
- **Autoencoder** → Anomaly detection (compares current vs. baseline)
- **GNN-inspired** → Risk scoring (combines AQI, traffic, demand)
- **AQI Prediction** → Next-hour AQI based on weather + traffic

### 4. **Recommendation Generation**
- High AQI alerts
- Demand spike warnings
- Anomaly investigations
- High-risk zone alerts
- Traffic impact notifications

### 5. **Storage** (MongoDB Atlas)
All data stored in collections:
- `weather_data` - Live weather per zone
- `aqi_data` - Air quality readings
- `traffic_data` - Traffic flow and incidents
- `eia_electricity_data` - EIA electricity data
- `eia_co2_emissions` - CO2 emissions
- `processed_zone_data` - **Complete processed results** (raw + ML + recommendations)
- `city_processing_summary` - City-wide summaries

### 6. **Dynamic Display** (Frontend)
All pages fetch from `processed_zone_data`:
- **Home** → System status, zone counts
- **Data** → Real zone data, alerts
- **Analytics** → ML outputs, risk scores
- **Insights** → Recommendations, anomalies
- **AI Recommendations** → AI analysis of all processed data
- **Advanced Analytics** → Detailed ML model outputs

---

## 🏗️ Architecture Components

### Backend Services

#### 1. `city_config.py`
- Pre-configured cities (NYC, Chicago, LA, SF, Houston, Phoenix)
- Zone coordinate calculation
- City metadata (population, area, coordinates)

#### 2. `data_processor.py` ⭐ **HEART OF THE SYSTEM**
- `process_zone_data()` - Processes single zone
- `process_all_zones()` - Processes all zones for a city
- `process_with_ml_models()` - Runs ML models on raw data
- `generate_recommendations()` - Creates actionable recommendations
- `process_eia_data()` - Processes EIA energy data

#### 3. `background_processor.py`
- Continuous processing loop (every 5 minutes)
- Automatically processes all zones
- Updates data in MongoDB
- Runs independently in background

#### 4. API Services
- `weather_service.py` - OpenWeatherMap
- `aqi_service.py` - AirVisual + OpenAQ fallback
- `traffic_service.py` - TomTom
- `eia_service.py` - EIA (electricity, CO2, international)
- `population_service.py` - US Census
- `infrastructure_service.py` - OpenStreetMap

### Frontend Components

#### 1. `CitySelector.jsx`
- Dropdown menu with all cities
- Shows current city
- Refresh button to reprocess
- Processing status indicator
- Located in Navbar

#### 2. Dynamic Data Fetching
All pages use:
- `cityAPI.getProcessedData()` - Gets latest processed data
- Auto-refresh every 30 seconds
- Real-time updates

---

## 📊 Data Flow

```
User Selects City
    ↓
CitySelector → POST /api/city/select/{city_id}
    ↓
Backend:
  - Calculates zone coordinates
  - Updates MongoDB zones collection
  - Starts background processor
    ↓
Background Processor (Every 5 min):
  For each zone:
    1. Fetch Weather API → weather_data
    2. Fetch AQI API → aqi_data
    3. Fetch Traffic API → traffic_data
    4. Fetch EIA API → eia_electricity_data
    5. Run ML Models:
       - LSTM → demand_forecast
       - Autoencoder → anomaly_detection
       - GNN → risk_score
       - AQI Prediction → aqi_prediction
    6. Generate Recommendations
    7. Store in processed_zone_data
    ↓
Frontend Pages:
  - Fetch from /api/city/processed-data
  - Display real-time processed results
  - Auto-refresh every 30 seconds
```

---

## 🔌 API Endpoints

### City Selection
- `GET /api/city/list` - List all cities
- `GET /api/city/current` - Get current city
- `POST /api/city/select/{city_id}` - Select city and start processing
- `GET /api/city/zones/coordinates` - Get zone coordinates

### Processing
- `POST /api/city/process/all` - Manually process all zones
- `POST /api/city/process/zone/{zone_id}` - Process single zone
- `POST /api/city/process/eia` - Process EIA data
- `GET /api/city/processed-data` - **Get processed data for display**

---

## 🎨 Frontend Integration

### City Selector in Navbar
- Always visible
- Shows current city
- Dropdown to select new city
- Refresh button
- Processing status

### Dynamic Pages
All pages now fetch from `processed_zone_data`:

1. **Home** - System overview, zone counts
2. **Data** - Real zone data, alerts
3. **Analytics** - ML outputs, risk scores
4. **Insights** - Recommendations, anomalies
5. **AI Recommendations** - AI analysis
6. **Advanced Analytics** - Detailed ML outputs

---

## ⚙️ Configuration

### Processing Interval
Default: **5 minutes** (300 seconds)

Can be changed in:
- `backend/services/background_processor.py`
- `backend/routes/city_selection.py` (line 88)

### Cities Available
- NYC (New York City)
- Chicago
- LA (Los Angeles)
- SF (San Francisco)
- Houston
- Phoenix

To add more cities, edit `backend/services/city_config.py`

---

## 🚀 How It Works

### Initial Setup
1. User opens website
2. City selector shows default city (NYC)
3. Background processor starts automatically
4. First processing cycle runs immediately

### Continuous Processing
1. Every 5 minutes, background processor:
   - Fetches live data from all APIs
   - Processes with ML models
   - Generates recommendations
   - Stores in MongoDB

### Frontend Updates
1. Pages fetch processed data on load
2. Auto-refresh every 30 seconds
3. Display latest ML outputs
4. Show real-time recommendations

---

## 📈 What Makes It Dynamic

### Before (Static)
- Mock data
- No real-time updates
- No ML processing
- No live API data

### After (Dynamic) ✅
- **Live API data** from 7+ sources
- **ML processing** on every update
- **Real-time recommendations**
- **Auto-refresh** every 30 seconds
- **Background processing** every 5 minutes
- **City selection** changes everything
- **All pages** show processed results

---

## 🎯 Key Features

1. **City Selection** - Choose from 6 major US cities
2. **Live Data** - Real weather, AQI, traffic, energy data
3. **ML Processing** - LSTM, Autoencoder, GNN, AQI prediction
4. **Recommendations** - Actionable insights based on processed data
5. **Background Processing** - Automatic updates every 5 minutes
6. **Dynamic Display** - All pages show real-time processed data
7. **Auto-Refresh** - Frontend updates every 30 seconds

---

## ✅ Status

- ✅ City selection system
- ✅ Live API integration (7+ APIs)
- ✅ ML processing pipeline
- ✅ Background processor
- ✅ Dynamic data storage
- ✅ Frontend city selector
- ✅ Dynamic page updates
- ✅ Auto-refresh system

**The system is now fully dynamic and processing data continuously!**

---

## 🔧 Maintenance

### To Change Processing Interval
Edit `backend/routes/city_selection.py` line 88:
```python
interval_seconds=300  # Change to desired seconds
```

### To Add a City
Edit `backend/services/city_config.py`:
1. Add city config to `CITIES` dictionary
2. Add 311 endpoint if available

### To View Processing Logs
Check backend console for:
- `[BackgroundProcessor]` messages
- `[Processing]` messages

---

**This is the heart of the website - the processing pipeline that makes everything dynamic!** 🚀
