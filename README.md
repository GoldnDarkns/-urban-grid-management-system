# Climate- and Constraint-Aware Urban Grid Management System

A full-stack intelligent system for managing urban energy grids with deep learning-powered demand forecasting, anomaly detection, and zone risk assessment.

> 📊 **Current Status:** See [PROJECT_STATUS.md](PROJECT_STATUS.md) for complete project status, features, and documentation.

**Status:** ✅ Production Ready - All Core Features Implemented  
**Version:** 1.0.0  
**Last Updated:** January 19, 2026

## 🌟 Features

- **MongoDB Database**: Time-series data storage with optimized indexes
- **Deep Learning Models**:
  - LSTM for energy demand forecasting
  - Autoencoder for anomaly detection
  - GNN for zone risk scoring
- **FastAPI Backend**: RESTful API with real-time analytics
- **React Frontend**: Modern, responsive dashboard with interactive visualizations

## 📋 Prerequisites

- Python 3.8 or higher
- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)

## 🚀 Quick Start

### 1. Clone and Setup Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure MongoDB

1. Copy the example environment file:
   ```bash
   copy .env.example .env   # Windows
   cp .env.example .env     # macOS/Linux
   ```

2. Edit `.env` with your MongoDB connection:
   ```
   MONGO_URI=mongodb://localhost:27017
   MONGO_DB=urban_grid_ai
   ```

   For MongoDB Atlas:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   MONGO_DB=urban_grid_ai
   ```

### 3. Initialize Database

```bash
# Seed core data (zones, households, policies)
python -m src.db.seed_core --reset

# Ingest real-world datasets (requires data files in data/ folder)
python -m src.db.ingest_real_data

# Verify setup
python -m src.db.sanity_check
```

### 4. Train Deep Learning Models

```bash
# Train LSTM demand forecasting model
python -m src.models.lstm_demand_forecast

# Train Autoencoder anomaly detection model
python -m src.models.autoencoder_anomaly

# Train GNN zone risk scoring model
python -m src.models.gnn_risk_scoring

# Train ARIMA statistical model
python -m src.models.arima_demand_forecast

# Train Prophet seasonal model
python -m src.models.prophet_demand_forecast
```

### 5. Start the Application

```bash
# Terminal 1: Start FastAPI backend
uvicorn backend.main:app --reload --port 8000

# Terminal 2: Start React frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## 📁 Project Structure

```
urban-grid-management-system/
├── backend/                    # FastAPI Backend
│   ├── main.py                # API entry point
│   └── routes/
│       ├── data.py            # MongoDB data endpoints
│       ├── models.py          # ML model endpoints
│       └── analytics.py       # Analytics endpoints
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   │   ├── Home.jsx       # Dashboard overview
│   │   │   ├── Data.jsx       # MongoDB explorer
│   │   │   ├── Analytics.jsx  # Charts & visualizations
│   │   │   ├── LSTM.jsx       # LSTM model details
│   │   │   ├── Autoencoder.jsx # Anomaly detection
│   │   │   ├── GNN.jsx        # Graph neural network
│   │   │   └── Insights.jsx   # AI recommendations
│   │   └── services/
│   │       └── api.js         # API client
│   └── package.json
│
├── src/                        # Python ML & Database
│   ├── config.py              # Configuration
│   ├── db/
│   │   ├── mongo_client.py    # MongoDB connection
│   │   ├── indexes.py         # Index definitions
│   │   ├── seed_core.py       # Core data seeding
│   │   ├── seed_timeseries.py # Time-series generation
│   │   ├── ingest_real_data.py # Real data ingestion
│   │   └── sanity_check.py    # Database validation
│   ├── queries/
│   │   ├── basic_queries.py   # Basic MongoDB queries
│   │   └── advanced_queries.py # Complex aggregations
│   └── models/
│       ├── lstm_demand_forecast.py   # LSTM model
│       ├── autoencoder_anomaly.py    # Autoencoder model
│       └── gnn_risk_scoring.py       # GNN model
│
├── data/                       # Datasets
│   ├── README.md              # Dataset instructions
│   └── (dataset files)
│
├── requirements.txt
└── README.md
```

## 🗄️ MongoDB Collections

| Collection | Description |
|------------|-------------|
| `zones` | City zones with population, priority, critical sites |
| `households` | Residential units with baseline consumption |
| `meter_readings` | Hourly energy consumption (time-series) |
| `air_climate_readings` | AQI and weather data (time-series) |
| `alerts` | System alerts (emergency, warning, watch) |
| `constraint_events` | Lockdowns, advisories |
| `policies` | AQI threshold policies |
| `grid_edges` | Zone adjacency graph |

## 🤖 Deep Learning Models

### Model Status: All Trained ✅

| Model | Type | Purpose | Status | Performance |
|-------|------|---------|--------|-------------|
| **LSTM** | Deep Learning | Demand Forecasting | ✅ Trained | RMSE: 64.27, R²: 0.64 |
| **Autoencoder** | Deep Learning | Anomaly Detection | ✅ Trained | Anomaly Rate: 5.33% |
| **GNN** | Deep Learning | Zone Risk Scoring | ✅ Trained | Accuracy: 95%+ |
| **ARIMA** | Statistical | Demand Forecasting | ✅ Trained | RMSE: 88.82, R²: 0.5352 |
| **Prophet** | Statistical | Seasonal Forecasting | ✅ Trained | RMSE: 48.41, R²: 0.8619 ⭐ Best |

### LSTM Demand Forecasting
- **Purpose**: Predict future energy demand
- **Architecture**: 2 LSTM layers (64, 32 units) + Dense layers
- **Input**: 24-hour historical data with 4 features
- **Output**: Next hour demand prediction
- **Performance**: RMSE: 64.27 kWh, R²: 0.64

### Autoencoder Anomaly Detection
- **Purpose**: Detect unusual consumption patterns
- **Architecture**: Encoder (16→8→3) + Decoder (3→8→16)
- **Method**: Reconstruction error threshold at 95th percentile
- **Features**: Cyclical time encoding for hour/day
- **Performance**: Anomaly rate: 5.33%, Threshold: 0.026

### GNN Zone Risk Scoring
- **Purpose**: Compute zone risk with network effects
- **Architecture**: 2 Graph Conv layers (32, 16 units)
- **Input**: Zone features + adjacency matrix
- **Output**: Risk classification (Low/Medium/High)
- **Performance**: 95%+ accuracy

### ARIMA & Prophet Forecasting
- **ARIMA**: Statistical time-series forecasting (RMSE: 88.82)
- **Prophet**: Seasonal forecasting with best performance (RMSE: 48.41, R²: 0.8619)

## 🌐 API Endpoints

### Data Endpoints (`/api/data`)
- `GET /status` - Database status
- `GET /zones` - All zones
- `GET /households` - Households list
- `GET /alerts` - Recent alerts
- `GET /grid-edges` - Zone connectivity

### Analytics Endpoints (`/api/analytics`)
- `GET /demand/hourly` - Hourly demand aggregation
- `GET /demand/by-zone` - Demand by zone
- `GET /aqi/by-zone` - AQI by zone
- `GET /zone-risk` - Zone risk assessment
- `GET /anomalies` - Consumption anomalies

### Model Endpoints (`/api/models`)
- `GET /overview` - All models summary with metrics
- `GET /lstm` - LSTM model details
- `GET /lstm/prediction` - Live demand prediction
- `GET /autoencoder` - Autoencoder details
- `GET /gnn` - GNN details and architecture
- `GET /arima` - ARIMA model details
- `GET /prophet` - Prophet model details

## 📊 Frontend Pages (13 Total)

1. **Home** (`/`) - System overview, architecture diagram, real-time stats
2. **Guide** (`/guide`) - Complete system documentation and workflow
3. **Data** (`/data`) - MongoDB collection explorer, indexes, zone details
4. **Analytics** (`/analytics`) - Interactive charts, demand/AQI visualizations
5. **LSTM** (`/lstm`) - Model architecture, gates explanation, live predictions
6. **Autoencoder** (`/autoencoder`) - Encoder-decoder visualization, anomaly detection
7. **GNN** (`/gnn`) - Graph structure, message passing, risk scores
8. **Model Comparison** (`/comparison`) - Compare LSTM, ARIMA, Prophet performance
9. **Insights** (`/insights`) - AI recommendations, alerts, anomalies
10. **City Map** (`/citymap`) - Interactive 2D city map with zone visualization
11. **3D City** (`/simulation3d`) - 3D city visualization with energy flow
12. **Advanced Visualizations** (`/visualizations`) - Advanced data visualizations
13. **Reports** (`/reports`) - Generate comprehensive reports

> See [PROJECT_STATUS.md](PROJECT_STATUS.md) for detailed page descriptions.

## 🔧 Configuration

### Environment Variables (`.env`)
```
MONGO_URI=mongodb://localhost:27017
MONGO_DB=urban_grid_ai
```

### Default Settings (`src/config.py`)
- City: MetroCity
- Zones: 20
- Households: 500

## 📈 Running Queries

```bash
# Basic queries (3 queries)
python -m src.queries.basic_queries

# Advanced queries (7 queries)
python -m src.queries.advanced_queries
```

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Verify MONGO_URI in `.env`
- Check network for Atlas

**Frontend Build Error:**
- Run `npm install` in frontend/
- Check Node.js version (18+)

**Model Training Error:**
- Ensure data is loaded first
- Check TensorFlow installation

## 📚 Technologies

- **Backend**: Python, FastAPI, PyMongo, TensorFlow
- **Frontend**: React, Vite, Recharts, Framer Motion
- **Database**: MongoDB / MongoDB Atlas
- **ML**: LSTM, Autoencoder, GNN

## 📚 Documentation

- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Complete project status, features, and achievements
- **[PROJECT_REVIEW.md](PROJECT_REVIEW.md)** - Technical review and implementation details
- **[NLP_INTEGRATION_DISCUSSION.md](NLP_INTEGRATION_DISCUSSION.md)** - Future NLP features discussion
- **[Guide Page](http://localhost:5173/guide)** - Interactive system documentation (in-app)

## 🎯 Current Status

✅ **All Core Features Implemented**  
✅ **5 ML Models Trained** (LSTM, Autoencoder, GNN, ARIMA, Prophet)  
✅ **13 Frontend Pages** - Complete user interface  
✅ **MongoDB Atlas Connected** - 360K+ data points  
✅ **Real-time Analytics** - Accurate calculations verified  
✅ **Production Ready** - All systems operational  

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for detailed status.

## 📝 License

MIT License
