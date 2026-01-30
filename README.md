# Climate- and Constraint-Aware Urban Grid Management System

A full-stack intelligent system for managing urban energy grids with deep learning-powered demand forecasting, anomaly detection, and zone risk assessment.

> 📊 **Full documentation:** See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for architecture, data, APIs, ML models, and run instructions.

**Status:** ✅ Production Ready - All Core Features Implemented  
**Version:** 1.0.0  
**Last Updated:** January 19, 2026

## 🌟 Features

- **MongoDB Database**: Time-series data storage with optimized indexes
- **Deep Learning Models**:
  - **TFT (Temporal Fusion Transformer)** for energy demand forecasting — interpretable multi-horizon; LSTM kept for comparison
  - Autoencoder for anomaly detection
  - GNN for zone risk scoring
  - ARIMA and Prophet for statistical forecasting
- **NLP Integration**: Incident Reports with automatic classification, urgency detection, and entity extraction
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
# Train TFT / LSTM demand forecasting (LSTM script kept for comparison)
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

### Run with Docker (Phase 2)

**New to Docker / Kafka?** → See **[HOW_TO_RUN.md](HOW_TO_RUN.md)** for step‑by‑step instructions, what “build”/“rebuild” means, and what each service does.

**Requires:** [Docker](https://docs.docker.com/get-docker/) and Docker Compose. Ensure Docker Desktop (or Docker Engine) is running.

Run the full stack (backend, frontend, MongoDB, Kafka, producer, consumer) in containers:

```bash
# 1. Copy env and set MongoDB URIs for Docker (optional)
cp .env.example .env
# Edit .env: use mongodb://mongodb:27017 when using Docker's MongoDB.

# 2. Build and start
docker-compose up --build
```

- **Frontend:** http://localhost (Nginx serves the app and proxies `/api` to the backend)
- **Backend API:** http://localhost:8000
- **MongoDB:** localhost:27017 (Docker volume `mongodb_data`)
- **Kafka:** localhost:9092 (Phase 2; used by `kafka-producer` service)

To use **MongoDB Atlas** for Sim data, set `SIM_MONGO_URI` (and `SIM_MONGO_DB`) in `.env`. City data uses the local MongoDB container unless `CITY_MONGO_URI` is overridden.

**Kafka (Phase 2):** The stack includes Kafka (KRaft), **kafka-producer** (APIs → Kafka every ~45 s), and **kafka-consumer** (Kafka → MongoDB `kafka_live_feed`). The **Live Stream** tab (nav → Live Stream) polls `GET /api/live-stream` every 45 s so you see live data flowing in. Same API keys as the main app (in `.env`). Optional env: `KAFKA_PRODUCER_CITY_ID` (default `nyc`), `KAFKA_PRODUCER_INTERVAL_SECONDS` (default `45`).

**Neo4j Knowledge Graph:** The stack includes **Neo4j** (ports 7474 HTTP, 7687 Bolt). After city processing, zone data is synced to Neo4j for explainable risk reasoning (neighbor-aware). Open **Neo4j Browser** at http://localhost:7474 (default auth: `neo4j` / `urban-grid-kg`) to explore the graph. Advanced Analytics → **Knowledge Graph** tab: status, Sync KG, and link to Neo4j Browser. API: `GET /api/kg/status`, `POST /api/kg/sync?city_id=nyc`, `GET /api/kg/graph?city_id=nyc`, `GET /api/kg/risk?city_id=nyc&zone_id=Z_001`.

**Simulated mode shows zeros / "MongoDB disconnected"?**  
- Docker’s local MongoDB starts empty. **Option A:** Use Atlas for Sim: set `SIM_MONGO_URI` to your Atlas URI in `.env`. **Option B:** Seed the local DB:  
  `docker-compose run --rm backend python -m src.db.seed_core --reset`  
  then  
  `docker-compose run --rm backend python -m src.db.seed_timeseries --days 7`  
  Restart the stack (`docker-compose up -d`) and reload the app.

**Runtimes, “is it still running?”, Kafka, and Live Stream:** See [HOW_TO_RUN.md](HOW_TO_RUN.md) and [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for startup times, why the backend runs indefinitely, how to check Kafka / kafka-producer / kafka-consumer, and the Live Stream tab.

**502 Bad Gateway or "MongoDB: disconnected" / "API unreachable" at http://localhost?**  
- API calls go through Nginx to the backend; 502 means Nginx could not reach the backend.  
- Ensure the stack is up: `docker-compose ps` (backend, frontend, mongodb running).  
- Rebuild frontend: `docker-compose up -d --build frontend`, wait ~30 s, refresh http://localhost.  
- If still 502: `docker-compose logs backend`; if MongoDB errors, run `docker-compose up -d mongodb`, wait ~10 s, then `docker-compose restart backend`.  
- Test backend directly: http://localhost:8000/api/health — if healthy + database connected, rebuild frontend and try again.
- **"Container name already in use" (ghost container):** Restart Docker Desktop, then run `docker-compose up -d` again. Or use a different project name: `docker-compose -p ugms up -d` (same stack, different container names).

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
│   │   │   ├── TFT.jsx       # TFT (primary) demand forecasting
│   │   │   ├── LSTM.jsx      # LSTM (comparison) model details
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
│       ├── lstm_demand_forecast.py   # LSTM (comparison); TFT primary in pipeline
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
| `incident_reports` | Incident reports with NLP analysis |

## 🤖 Deep Learning Models

### Model Status: All Trained ✅

| Model | Type | Purpose | Status | Performance |
|-------|------|---------|--------|-------------|
| **TFT** | Deep Learning | Demand Forecasting (primary) | ✅ In use | Interpretable multi-horizon; variable selection |
| **LSTM** | Deep Learning | Demand Forecasting (comparison) | ✅ Trained | RMSE: 64.27, R²: 0.64 |
| **Autoencoder** | Deep Learning | Anomaly Detection | ✅ Trained | Anomaly Rate: 5.33% |
| **GNN** | Deep Learning | Zone Risk Scoring | ✅ Trained | Accuracy: 95%+ |
| **ARIMA** | Statistical | Demand Forecasting | ✅ Trained | RMSE: 88.82, R²: 0.5352 |
| **Prophet** | Statistical | Seasonal Forecasting | ✅ Trained | RMSE: 48.41, R²: 0.8619 ⭐ Best |

### TFT (Temporal Fusion Transformer) — Primary Demand Forecasting
- **Purpose**: Interpretable multi-horizon energy demand forecasting; suited to mixed inputs (static zone, known future, historical series).
- **Why TFT**: Variable selection, temporal attention, multi-horizon in one model; outperforms LSTM on benchmarks; interpretable for grid operators.
- **LSTM** is kept for comparison (see Advanced Analytics → TFT vs LSTM).

### LSTM Demand Forecasting (Comparison Baseline)
- **Purpose**: Baseline demand prediction; kept to compare with TFT.
- **Architecture**: 2 LSTM layers (64, 32 units) + Dense layers
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
- `GET /models/tft` - TFT model details (primary)
- `GET /models/tft/prediction` - Live TFT demand prediction
- `GET /lstm` - LSTM model details (comparison)
- `GET /lstm/prediction` - Live LSTM demand prediction
- `GET /autoencoder` - Autoencoder details
- `GET /gnn` - GNN details and architecture
- `GET /arima` - ARIMA model details
- `GET /prophet` - Prophet model details

### Incident Reports Endpoints (`/api/incidents`)
- `GET /incidents` - List incidents with filters (zone, category, urgency, status)
- `GET /incidents/{id}` - Get specific incident details
- `POST /incidents` - Create new incident (manual submission)
- `GET /incidents/analytics/summary` - Summary statistics (categories, urgencies, sentiments)
- `GET /incidents/analytics/trends` - Time-series trends

## 📊 Frontend Pages (14 Total)

1. **Home** (`/`) - System overview, architecture diagram, real-time stats
2. **Guide** (`/guide`) - Complete system documentation and workflow
3. **Data** (`/data`) - MongoDB collection explorer, indexes, zone details
4. **Analytics** (`/analytics`) - Interactive charts, demand/AQI visualizations
5. **TFT** (Advanced Analytics → TFT) - Primary demand forecasting; interpretable multi-horizon. **LSTM** (Advanced Analytics → LSTM) - Comparison baseline, architecture, gates, live predictions
6. **Autoencoder** (`/autoencoder`) - Encoder-decoder visualization, anomaly detection
7. **GNN** (`/gnn`) - Graph structure, message passing, risk scores
8. **Model Comparison** (Advanced Analytics → Model Comparison) - Compare TFT (primary), LSTM, ARIMA, Prophet performance
9. **Insights** (`/insights`) - AI recommendations, alerts, anomalies
10. **Incident Reports** (`/incidents`) - NLP-powered incident analysis, classification, and tracking
11. **City Map** (`/citymap`) - Interactive 2D city map with zone visualization
12. **3D City** (`/simulation3d`) - 3D city visualization with energy flow
13. **Advanced Visualizations** (`/visualizations`) - Advanced data visualizations
14. **Reports** (`/reports`) - Generate comprehensive reports

> See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for detailed page descriptions and architecture.

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
- **ML**: TFT (primary), LSTM (comparison), Autoencoder, GNN

## 📚 Documentation

- **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)** - Full architecture, data, APIs, ML models, run instructions
- **[HOW_TO_RUN.md](HOW_TO_RUN.md)** - Step-by-step Docker and run guide
- **[Guide Page](http://localhost:5173/guide)** - Interactive system documentation (in-app)

## 🎯 Current Status

✅ **All Core Features Implemented**  
✅ **TFT primary + 5 models** (TFT, LSTM comparison, Autoencoder, GNN, ARIMA, Prophet)  
✅ **NLP Integration** - Incident Reports with automatic classification and analysis  
✅ **14 Frontend Pages** - Complete user interface  
✅ **MongoDB Atlas Connected** - 360K+ data points  
✅ **Real-time Analytics** - Accurate calculations verified  
✅ **Production Ready** - All systems operational  

See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for detailed status and architecture.

## 📝 License

MIT License
