# Urban Grid Management System — Project Documentation

**Climate- and Constraint-Aware Urban Grid Management System**

This document describes the full architecture, features, data, and operations of the project.

---

## 1. Overview

### 1.1 Purpose

The system is a full-stack platform for managing urban energy grids with:

- **Demand forecasting** (TFT primary, LSTM comparison, ARIMA, Prophet)
- **Anomaly detection** (Autoencoder)
- **Zone risk scoring** (GNN)
- **Knowledge graph** (Neo4j) for explainable risk reasoning
- **AI recommendations** (OpenRouter/Mistral) for operator actions
- **Real-time and simulated data** (MongoDB Atlas, live APIs, Kafka)

### 1.2 Operating Modes

| Mode | Description | Data Source |
|------|-------------|-------------|
| **Simulated** | Pre-built dataset, demo and development | MongoDB Atlas (`SIM_MONGO_URI`) |
| **City Live** | Real cities, live APIs | OpenWeatherMap, AirVisual, TomTom, EIA, Census, City 311, Kafka → MongoDB |

The frontend sends `X-Data-Mode: sim` or `X-Data-Mode: city` so the backend routes to the correct database and logic.

---

## 2. Architecture

### 2.1 High-Level Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite) — http://localhost                       │
│  Nginx serves static app and proxies /api → backend              │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (FastAPI) — http://localhost:8000                       │
│  Routes: data, analytics, models, city, queries, AI, KG, etc.   │
└─────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  MongoDB        │  │  Neo4j           │  │  Kafka           │
│  (Atlas / local)│  │  Knowledge Graph │  │  Live data stream │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 2.2 Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, Framer Motion, Recharts, Lucide React, React Router v6 |
| **Backend** | Python 3.11+, FastAPI, PyMongo, TensorFlow/Keras |
| **Databases** | MongoDB (Atlas / local), Neo4j (Knowledge Graph) |
| **Streaming** | Apache Kafka (KRaft), kafka-producer, kafka-consumer |
| **Infrastructure** | Docker, Docker Compose, Nginx |
| **ML/NLP** | TFT, LSTM, Autoencoder, GNN, ARIMA, Prophet; OpenRouter (Mistral) for AI recommendations |

### 2.3 Project Structure

```
urban-grid-management-system/
├── backend/                    # FastAPI backend
│   ├── main.py                 # API entry, CORS, routers
│   ├── routes/
│   │   ├── data.py             # MongoDB data, CRUD, collection sample
│   │   ├── analytics.py        # Demand, AQI, risk, anomalies
│   │   ├── models.py           # TFT, LSTM, Autoencoder, GNN, ARIMA, Prophet
│   │   ├── queries.py          # MongoDB query list, execute, create (CRUD queries 11–15)
│   │   ├── city_selection.py   # City list, current city, processing
│   │   ├── ai_recommendations.py # OpenRouter/Mistral recommendations
│   │   ├── knowledge_graph.py  # Neo4j sync, graph, risk
│   │   ├── incidents.py        # Incident reports (311-style)
│   │   ├── live_stream.py      # Live stream tab data
│   │   └── ...
│   └── services/
│       ├── background_processor.py  # City processing pipeline
│       ├── data_processor.py        # Zone aggregation, ML inputs
│       ├── neo4j_kg_service.py      # Neo4j sync
│       ├── weather_service.py, aqi_service.py, traffic_service.py, ...
│       └── city311_service.py      # City 311 API
├── frontend/
│   ├── src/
│   │   ├── pages/              # Home, Guide, Data, Analytics, AdvancedAnalytics, AdminData, etc.
│   │   ├── components/        # Navbar, StatCard, TronArchitectureDiagram, ...
│   │   ├── services/api.js    # Axios client, X-Data-Mode, all API calls
│   │   └── utils/useAppMode.js, useZones.js
│   └── package.json
├── src/                        # Python shared (DB, ML, queries)
│   ├── db/                     # mongo_client, seed_core, seed_timeseries, indexes
│   ├── models/                 # LSTM, autoencoder, GNN, ARIMA, Prophet, TFT-related
│   ├── queries/                # basic_queries, advanced_queries
│   └── nlp/                    # Incident classification
├── data/                       # CSV datasets (e.g. Kaggle AQI)
├── docker-compose.yml          # backend, frontend, mongodb, neo4j, kafka, producer, consumer
├── .env.example / .env         # MONGO_URI, SIM_MONGO_URI, CITY_MONGO_URI, Neo4j, API keys
└── requirements.txt
```

---

## 3. Data and MongoDB

### 3.1 Database Modes

- **Simulated:** Uses `SIM_MONGO_URI` and `SIM_MONGO_DB` (typically MongoDB Atlas). Seeded with zones, households, meter_readings, air_climate_readings, alerts, grid_edges, policies, constraint_events, mongodb_queries.
- **City Live:** Uses `CITY_MONGO_URI` (or local MongoDB in Docker). Data comes from city processing (APIs + Kafka) and is written to processed_zone_data, weather_data, aqi_data, traffic_data, etc.

### 3.2 MongoDB Collections (Simulated)

| Collection | Purpose | Typical Count |
|------------|---------|----------------|
| `zones` | Geographic zones, priority, critical_sites, lat/lon | 20 |
| `households` | Households per zone, baseline_kwh_daily | 500 |
| `meter_readings` | Hourly energy (zone_id, household_id, kwh, ts) | 360,000+ |
| `air_climate_readings` | AQI, temperature, etc. per zone (ts) | 14,400+ |
| `grid_edges` | Zone adjacency (from_zone, to_zone) | 50 |
| `alerts` | System alerts (zone_id, level, type, ts) | 50 |
| `constraint_events` | Maintenance, capacity reduction | 5 |
| `policies` | AQI thresholds, risk weights | 1 |
| `mongodb_queries` | User-created/suggested queries (id, name, description, type, collection, code) | 15+ |

### 3.3 Indexes

- `meter_readings`: zone_id, ts
- `air_climate_readings`: zone_id, ts
- `alerts`: zone_id, ts
- `mongodb_queries`: id

### 3.4 CRUD and Data Editor

- **Data Editor (Admin):** Create, read, update, delete documents in any allowed collection. Documents are sorted newest-first (by `ts` or `_id` where applicable).
- **Query CRUD (11–15):** Insert/update meter_readings and air_climate_readings, delete old readings via `/api/queries/execute/{id}` (POST with body). Changes are persisted in MongoDB Atlas when using Simulated mode with Atlas.

---

## 4. Machine Learning Models

### 4.1 Pipeline (City Live)

1. **TFT (Temporal Fusion Transformer)** — Primary demand forecast per zone (next-hour kWh, interpretable).
2. **Autoencoder** — Anomaly detection on zone-level features; flags high reconstruction error.
3. **GNN (Graph Neural Network)** — Zone risk scoring using graph (grid_edges) and zone features.
4. **Neo4j Knowledge Graph** — Sync zones and risk into graph for explainable reasoning.
5. **AI Recommendations** — OpenRouter/Mistral consumes ML outputs and returns prioritized natural-language actions.

### 4.2 Models Summary

| Model | Type | Purpose | Notes |
|-------|------|---------|--------|
| **TFT** | Deep Learning | Demand forecasting (primary) | Multi-horizon, variable selection, interpretable |
| **LSTM** | Deep Learning | Demand forecasting (comparison) | Baseline vs TFT |
| **Autoencoder** | Deep Learning | Anomaly detection | Reconstruction error threshold (e.g. 95th percentile) |
| **GNN** | Deep Learning | Zone risk scoring | Message passing over grid_edges |
| **ARIMA** | Statistical | Demand forecasting | Classical baseline |
| **Prophet** | Statistical | Seasonal forecasting | Used in City Live; hidden in Simulated |

### 4.3 Features Used

- **Demand models:** Historical kwh, time (hour/day encoding), zone, temperature, AQI where available.
- **Autoencoder:** 6 inputs (e.g. kwh, hour, day, temperature, AQI, baseline_ratio).
- **GNN:** Node features per zone (demand, AQI, priority, critical_sites, etc.), adjacency from grid_edges.

---

## 5. API Overview

### 5.1 Data and Status

- `GET /api/health` — Backend health, database status.
- `GET /api/data/status?city_id=...` — MongoDB connection and collection counts (mode-aware).
- `GET /api/data/zones`, `/households`, `/alerts`, `/grid-edges` — Core data (mode-aware).
- `GET /api/data/collection/{name}/sample?limit=50` — Sample documents, newest first (Simulated).
- `POST /api/data/collection/{name}/create` — Insert document (Simulated).
- `PUT /api/data/collection/{name}/update/{doc_id}` — Update document (Simulated).
- `DELETE /api/data/collection/{name}/delete/{doc_id}` — Delete document (Simulated).

### 5.2 Analytics

- `GET /api/analytics/demand/hourly`, `/demand/by-zone`, `/aqi/by-zone`, `/zone-risk`, `/anomalies`, `/correlation`, `/alerts/summary` — Aggregations (mode-aware).

### 5.3 Models

- `GET /api/models/overview` — All models summary.
- `GET /api/models/tft`, `/models/tft/prediction`, `/lstm`, `/lstm/prediction`, `/autoencoder`, `/gnn`, `/arima`, `/prophet` — Model details and predictions.

### 5.4 Queries (Simulated)

- `GET /api/queries/list` — All queries (default 1–15 + user-created from mongodb_queries), sorted for display (newest first in Admin).
- `GET /api/queries/execute/{id}` — Run read query; for CRUD 11–15 returns metadata/example body.
- `POST /api/queries/execute/{id}` — Run CRUD 11–15 with JSON body.
- `POST /api/queries/create` — Add new query (name, description, type, collection, optional code) to mongodb_queries.

### 5.5 City and Processing

- `GET /api/city/list`, `/api/city/current`, `/api/city/processing-summary` — City list, selected city, processing status.
- `POST /api/city/select` — Set current city and trigger processing (City Live).
- `GET /api/city/processed-data`, `/zone-coordinates` — Processed zones and coordinates (City Live).

### 5.6 AI and Knowledge Graph

- `GET /api/ai/recommendations?city_id=...` — AI recommendations (OpenRouter/Mistral).
- `GET /api/kg/status`, `POST /api/kg/sync`, `GET /api/kg/graph`, `/api/kg/risk` — Neo4j Knowledge Graph (City Live).

### 5.7 Incidents and Live Stream

- `GET /api/incidents`, `/incidents/{id}`, `POST /api/incidents`, `/incidents/analytics/summary`, `/incidents/analytics/trends` — Incident reports (311-style).
- `GET /api/live-stream` — Live stream tab data (Kafka → MongoDB).

---

## 6. Frontend Pages and Features

### 6.1 Global Behavior

- **Mode switcher:** Navbar toggles **Simulated** vs **City Live**. All data requests use the selected mode via `X-Data-Mode`.
- **City selector (City Live):** Modal to pick city and run processing; processing can be cancelled (X).

### 6.2 Main Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Status, architecture diagram, DB connection, feature cards |
| `/guide` | Guide | Overview, data flow, pages guide, outputs |
| `/data` | Data | Zones, alerts, grid edges; collection stats (mode-aware) |
| `/analytics` | Analytics | Hourly demand, demand by zone, AQI by zone, correlation, anomalies, costs |
| `/advanced` | Advanced Analytics | Overview, TFT, LSTM, Autoencoder, GNN, Knowledge Graph (City only), Model Comparison |
| `/ai-recommendations` | AI Recs | AI-generated recommendations (with robust JSON parsing for truncated responses) |
| `/insights` | Insights | Risk overview, alerts, anomalies, demand forecast |
| `/incidents` | Incident Reports | Incident list, filters, analytics, submission |
| `/citymap` | 2D Grid | Zone map, risk coloring, grid edges |
| `/simulation3d` | 3D | 3D zone visualization |
| `/visualizations` | Viz | Heatmaps, MongoDB Queries tab (run queries 1–15, CRUD forms for 11–15) |
| `/admin/data` | Admin (Sim only) | Overview, Collections, Query Code, Data Editor, Manage Queries |
| `/reports` | Reports | Report generation |

### 6.3 Admin — Manage Queries (Simulated)

- **Search:** Filter by name, description, collection, or query code.
- **Suggested queries:** Click to add predefined queries (e.g. High Energy Consumers, Recent AQI Spikes) to `mongodb_queries`; they appear in the list and in Visualizations → MongoDB Queries.
- **Existing queries:** Default 1–15 plus user-created (id > 15), newest first. Click a query to expand and see full MongoDB query code; copy button available.
- **Data Editor:** Per-collection browse; newest documents first. Add/Edit/Delete documents; changes reflected in MongoDB Atlas when connected.

### 6.4 Simulated-Only vs City-Only UI

- **Simulated only:** Admin, Manage Queries, Knowledge Graph hidden in Advanced Analytics, Prophet hidden in Model Comparison, Live Stream and Disaster Sim removed from nav.
- **City Live only:** Knowledge Graph tab, Prophet in Model Comparison, Live Stream (if re-enabled in nav).

---

## 7. How to Run

### 7.1 Prerequisites

- Docker and Docker Compose (recommended), or Python 3.8+ and Node 18+ for local run.
- For Simulated mode with cloud data: set `SIM_MONGO_URI` and `SIM_MONGO_DB` in `.env` (e.g. MongoDB Atlas).
- For City Live: optional API keys in `.env` (OpenWeatherMap, AirVisual, TomTom, EIA, Census, City 311); Neo4j credentials for Knowledge Graph.

### 7.2 Docker (Recommended)

```bash
# First time: copy env
copy .env.example .env
# Edit .env: SIM_MONGO_URI for Simulated, API keys for City Live

# Start full stack (backend, frontend, mongodb, neo4j, kafka, producer, consumer)
docker-compose up --build
# Or background:
docker-compose up -d --build
```

- **App:** http://localhost  
- **API:** http://localhost:8000  
- **Neo4j Browser:** http://localhost:7474 (e.g. neo4j / urban-grid-kg)

### 7.3 Local (No Docker)

```bash
# Backend
python -m venv venv
venv\Scripts\activate   # or source venv/bin/activate
pip install -r requirements.txt
# Seed DB if needed: python -m src.db.seed_core --reset; python -m src.db.seed_timeseries --days 7
uvicorn backend.main:app --reload --port 8000

# Frontend (another terminal)
cd frontend && npm install && npm run dev
# Open http://localhost:5173
```

### 7.4 Troubleshooting

- **Simulated “MongoDB disconnected”:** Set `SIM_MONGO_URI` and `SIM_MONGO_DB` in `.env` and restart backend (`docker-compose up -d --build backend` or restart uvicorn).
- **502 Bad Gateway:** Ensure backend is up; `docker-compose ps`; `docker-compose logs backend`; restart or rebuild backend/frontend as needed.
- **AI Recommendations parse error:** Backend and frontend use truncation-safe JSON parsing; increase `OPENROUTER_MAX_TOKENS` in `.env` if responses are cut off.
- **New code not visible:** Rebuild frontend: `docker-compose up -d --build frontend`, then hard-refresh (Ctrl+Shift+R).

---

## 8. Configuration

### 8.1 Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` / `MONGO_DB` | Default MongoDB (e.g. local) |
| `SIM_MONGO_URI` / `SIM_MONGO_DB` | Simulated mode DB (often Atlas) |
| `CITY_MONGO_URI` / `CITY_MONGO_DB` | City Live DB (optional override) |
| `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | Neo4j Knowledge Graph |
| `OPENROUTER_API_KEY`, `OPENROUTER_MAX_TOKENS` | AI recommendations |
| API keys for weather, AQI, traffic, EIA, Census, 311 | City Live and Kafka producer |

### 8.2 Mode and Headers

- Frontend `api.js` sets `X-Data-Mode: sim` or `X-Data-Mode: city` on every request based on the selected mode.
- Backend routes use this header to choose MongoDB connection and logic (Simulated vs City Live).

---

## 9. Summary

- **Architecture:** React frontend + FastAPI backend + MongoDB + Neo4j + Kafka, all documented above.
- **Data:** Simulated uses MongoDB Atlas (or local) with seeded collections; City Live uses APIs + Kafka and processed_zone_data (and related) in MongoDB.
- **ML:** TFT (primary), LSTM (comparison), Autoencoder, GNN, ARIMA, Prophet; Neo4j for knowledge graph; OpenRouter for AI recommendations.
- **Admin:** Data Editor and Manage Queries (search, suggested queries, expand to see full query code, newest first); CRUD in MongoDB and in query execution (11–15).
- **Run:** Docker Compose for full stack; `.env` for URIs and API keys; see “How to Run” and “Troubleshooting” for common issues.

For step-by-step run instructions and Docker basics, see **HOW_TO_RUN.md**. For a short overview and quick start, see **README.md**.
