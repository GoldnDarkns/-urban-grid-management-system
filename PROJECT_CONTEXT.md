# Urban Grid Management System — Full Project Context

**Purpose:** Single, LLM/IDE-ready document for handoff (e.g. moving to another Cursor PC). Use this to understand where the project is, what’s done, what’s left, the full architecture, data flow, APIs, and how to run it.

**Last compiled:** February 2025  
**Status:** Phases 0–2e, 3a, 4 done; 3b, 3c, 5 and P0/P1 items remain.

---

## 1. Executive Summary

- **Product:** Climate- and constraint-aware urban grid management system with domain-specific agentic AI (“City Emergency Brain”). Two modes: **Simulated** (MongoDB Atlas / local seed) and **City Live** (live APIs + Kafka + MongoDB).
- **Stack:** FastAPI backend, React (Vite) frontend, MongoDB (city + sim), Neo4j (Knowledge Graph), Kafka (live stream + raw_* ingestion), Docker Compose for full stack.
- **Differentiator:** Domain-specific AI (rules + KG + tools) that returns **one** answer (scenario_result + assistant_reply + trace) instead of surfacing each model separately; scenario testing and “why” / “what if” for operators.
- **Current state:** Core phases 0–2e, 3a, and 4 are implemented. Scenario Console, Scenario Bank, Agent Run Trace, Voice (Deepgram), City Stress Index, Executive Summary, Zone Resilience, “why” / “what if” are in place. Remaining: Phase 3b (n8n execution), 3c (RBAC), Phase 5 extras, and P0/P1 production items (policy visibility, critical asset register, health alerts, incident streams, AQI/heat, demand scale, etc.).

---

## 2. BRD / PRD / TDD Reference

- **OUTLINE_BRD_PRD_TDD.md** — Skeleton for Business Requirements (BRD), Product Requirements (PRD), and Technical Design (TDD). Use as checklist; many items are implemented but not all sections are “filled” in that file.
- **DISCUSSION_SUMMARY.md** — Agreed vision: holistic domain-specific AI, agentic (can act via n8n later), testable on random scenarios, production role-based views.
- **Key success criteria (from outlines):** “AI worth it” = throw random crises at the AI and get correct, explainable actions; pass N scenarios; every action has a traceable “why”; role-based access in production.

---

## 3. Phases: Full Checklist (Done vs Left)

| # | Phase | Goal | Status | Notes |
|---|--------|------|--------|--------|
| 0 | **Phase 0 — Real TFT** | TFT vs LSTM comparison meaningful; real TFT model | ✅ Done | `src/models/tft_demand_forecast.py`, `tft_demand_model.keras`, TFT prediction API, cache |
| 1 | **Phase 1a — Performance** | Faster site; cache models; no retraining in hot path | ✅ Done | Model cache, pre-compute, MODEL_OUTPUTS_MAX_AGE |
| 2 | **Phase 1b — Kafka data path** | APIs → Kafka → consumer → MongoDB for City Live | ✅ Done | kafka-producer, kafka-consumer, raw_* collections, DataProcessor can read from Kafka |
| 3 | **Phase 1c — Navigation** | Group Simulated vs City Live; same routes | ✅ Done | Navbar: Simulated / City Live sections (see Navbar.jsx) |
| 4 | **Phase 2a — Unified city state** | One API for aggregated city state | ✅ Done | GET /api/city/state (zones, alerts, grid, stress_index, why_summary, what_if_no_action) |
| 5 | **Phase 2b — Grounding DB + synthetic events** | Evidence for AI (asset_registry, active_events, service_outages, playbooks) | ✅ Done | grounding router, synthetic-events, playbooks seeded |
| 6 | **Phase 2c — Domain-specific AI (orchestrator)** | Intent → tools → scenario_result + assistant_reply | ✅ Done | agent_orchestrator, POST /api/agent/start, POST /api/agent/message |
| 7 | **Phase 2d — Agentic Scenario Console** | City Live page: chat + scenario result panel | ✅ Done | ScenarioConsole.jsx, /scenario-console, agentAPI.start/message |
| 8 | **Phase 2e — Agent Run Trace** | Store trace; “View Run Log” in UI | ✅ Done | agent_runs in city DB, GET /api/agent/runs, GET /api/agent/runs/{run_id}, View Run Log in Scenario Console |
| 9 | **Phase 3a — Scenario bank & evaluation** | Curated scenarios, run and record outcome | ✅ Done | scenarios API, Scenario Bank page, run one/batch, pass/fail/score |
| 10 | **Phase 3b — Agentic execution (n8n)** | Approve actions → run workflows | ⬜ Left | |
| 11 | **Phase 3c — RBAC & role-based views** | Roles, permissions, route guards | ⬜ Left | |
| 12 | **Phase 4 — Voice (optional)** | Deepgram STT/TTS for Scenario Console | ✅ Done | Text/Voice toggle, Speak reply; DEEPGRAM_API_KEY in .env |
| 13 | **Phase 5 — Later** | Unified AI Recs, Stress Index, “why”/“what if,” outsourcing, AWS | ⬜ Left (partially done) | Stress Index, “why,” “what if,” Executive Summary done; rest in TASKS_LEFT |

**Reference docs:** PHASES_MASTER_PLAN.md (full phase descriptions), PHASES_AND_CHECKLIST.md, PHASE_LIST_DONE_AND_LEFT.md, TASKS_LEFT.md.

---

## 4. Architecture Overview

### 4.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React, Vite) — http://localhost (Docker) or :517x (dev)                │
│   • Mode: Simulated | City Live (localStorage ugms_mode)                         │
│   • Nav: Simulated = Home, Guide, Data, Analytics, Models, Viz, Maps, Admin      │
│   • Nav: City Live  = Home, Guide, Data, Analytics, Models, Live Stream,        │
│           Scenario Console, Scenario Bank, Incidents, Maps, Reports              │
│   • API base: VITE_API_BASE_URL or http://localhost:8000/api; X-Data-Mode: sim|city │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI) — port 8000                                                    │
│   • Routers: data, models, analytics, simulations, incidents, queries,        │
│              ai_recommendations, live_data, city_selection, live_stream,         │
│              knowledge_graph, grounding, agent, voice, scenarios                  │
│   • DB: MongoDB (Sim: SIM_MONGO_URI/SIM_MONGO_DB; City: CITY_MONGO_URI/CITY_MONGO_DB) │
│   • Neo4j: Knowledge Graph (sync, risk, graph) — NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD │
│   • ObjectId: patched encoder + middleware so all responses are JSON-serializable │
└─────────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ MongoDB      │    │ Neo4j        │    │ Kafka        │
│ (Sim + City) │    │ (KG)         │    │ (live stream) │
└──────────────┘    └──────────────┘    └──────────────┘
         ▲                    │                    ▲
         │                    │                    │
┌──────────────┐    ┌──────────────────────────────────────┐
│ Background   │    │ kafka-producer (APIs → Kafka)         │
│ Processor    │    │ kafka-consumer (Kafka → MongoDB)      │
│ (per city)   │    │   → kafka_live_feed + raw_* collections│
└──────────────┘    └──────────────────────────────────────┘
```

### 4.2 Data Flow (City Live) — Two Paths

**Path A — User selects city / background processing (main path for Analytics, AI Recs, Data):**

1. User selects city → `POST /api/city/select/{city_id}` → backend sets `_current_city`, writes zones to City MongoDB, starts `BackgroundProcessor` (runs every 5 min).
2. Each run: `DataProcessor.process_all_zones()` — for each zone: call Weather, AQI, Traffic APIs → heuristics (no Keras in hot path) → `generate_recommendations()`, `_create_alerts_from_processing()` → write to `processed_zone_data`, `alerts`.
3. Frontend/Data/Analytics/AI Recs read from MongoDB (`processed_zone_data`, `alerts`, etc.).

**Path B — Kafka (Live Stream tab + raw_* for future processing):**

1. **kafka-producer** (every ~45s): reads `GET /api/city/current` → fetches Weather, AQI, Traffic, EIA, 311 for current city (limited zones) → publishes to topics: `power_demand`, `aqi_stream`, `traffic_events`, `grid_alerts`, `incident_text`.
2. **kafka-consumer**: consumes those topics → writes each message to `kafka_live_feed` (for Live Stream UI) and upserts to **raw_*** collections (`raw_aqi`, `raw_weather`, `raw_traffic`, `raw_power_demand`, `raw_grid_alerts`, `raw_311`) keyed by `city_id`/`zone_id`.
3. **Live Stream** tab: `GET /api/live-stream` reads from `kafka_live_feed`.

**Model inference (TFT/LSTM, etc.):** No retraining in hot path. Model routes load `.keras` once (cached), run inference only; optional pre-compute to `model_outputs` in MongoDB.

---

## 5. Data Structure

### 5.1 MongoDB — Simulated DB (SIM_MONGO_DB, e.g. urban_grid_ai)

| Collection | Description |
|------------|--------------|
| zones | Zone metadata, population, critical_sites |
| households | Residential units, baseline consumption |
| meter_readings | Hourly energy (time-series) |
| air_climate_readings | AQI, weather (time-series) |
| alerts | System alerts (emergency, warning, watch) |
| constraint_events | Lockdowns, advisories |
| policies | AQI threshold policies |
| grid_edges | Zone adjacency |
| incident_reports | Incidents with NLP analysis |

### 5.2 MongoDB — City DB (CITY_MONGO_DB, e.g. urban_grid_city)

| Collection | Description |
|------------|--------------|
| zones | City zones (written on city select) |
| processed_zone_data | Per-zone processed result: raw_data, ml_processed, recommendations (from DataProcessor or derived from raw_*) |
| alerts | Alerts created from processing |
| weather_data, aqi_data, traffic_data | Raw API results (Path A) |
| kafka_live_feed | Documents from Kafka consumer (Live Stream tab) |
| raw_aqi, raw_weather, raw_traffic, raw_power_demand, raw_grid_alerts, raw_311 | Latest per (city_id, zone_id) from Kafka (Phase 1b) |
| agent_runs | Phase 2e: run_id, session_id, user_input, trace[], final_answer (assistant_reply, scenario_result) |
| scenarios | Phase 3a: scenario definitions (name, overrides, expected outcome, etc.) |
| scenario_runs | Phase 3a: run history (scenario_id, outcome, pass/fail, score) |

(Other collections may exist for EIA, 311, cost, etc., as used by backend services.)

### 5.3 Neo4j (Knowledge Graph)

- Used for zone risk reasoning (neighbor-aware). Sync: `POST /api/kg/sync?city_id=...`. Graph: zones, adjacency, risk-related nodes/edges. Browser: http://localhost:7474 (neo4j / urban-grid-kg).

### 5.4 Kafka Topics

| Topic | Producer writes | Consumer writes to |
|-------|------------------|---------------------|
| power_demand | EIA data | kafka_live_feed + raw_power_demand |
| aqi_stream | Weather + AQI (per zone) | kafka_live_feed + raw_weather / raw_aqi |
| traffic_events | Traffic (per zone) | kafka_live_feed + raw_traffic |
| grid_alerts | Heartbeat / grid alerts | kafka_live_feed + raw_grid_alerts |
| incident_text | 311 incidents | kafka_live_feed + raw_311 |

---

## 6. Step-by-Step: Data Input and Output

### 6.1 City selection and background processing

1. **Input:** User picks city in UI → frontend calls `cityAPI.selectCity(cityId)` → `POST /api/city/select/{city_id}`.
2. **Backend:** Sets global `_current_city`, gets zone coordinates via `CityService.calculate_zone_coordinates()`, writes zones to City DB, calls `start_background_processing(city_id)`.
3. **Output:** Immediate response “Background processing started.” Background: `DataProcessor.process_all_zones()` runs (every 5 min): for each zone, calls Weather, AQI, Traffic APIs → writes `processed_zone_data`, `alerts`. No response body for the background job itself.

### 6.2 Kafka producer (input → Kafka)

1. **Input:** kafka-producer runs on interval (e.g. 45s). Reads current city from `GET http://backend:8000/api/city/current`.
2. **Actions:** For each of up to MAX_ZONES zones: WeatherService, AQIService (AirVisual + Kaggle fallback), TrafficService → build JSON payloads; EIA once; City311 once. Publish to respective topics with `json.dumps(payload).encode()`.
3. **Output:** Messages on Kafka topics (key optional, value = JSON string).

### 6.3 Kafka consumer (Kafka → MongoDB)

1. **Input:** Consumer subscribes to `power_demand`, `aqi_stream`, `traffic_events`, `grid_alerts`, `incident_text`.
2. **Actions:** For each message: parse JSON, add `ingested_at`, append to batch; also `_upsert_raw(db, topic, payload, doc)` into raw_* collection (by city_id, zone_id).
3. **Output:** Batch insert into `kafka_live_feed`; upserts into `raw_aqi`, `raw_weather`, `raw_traffic`, etc.

### 6.4 Unified city state API

1. **Input:** `GET /api/city/state?city_id=...&zones_limit=100&alerts_limit=50`. Uses `_current_city` if city_id omitted.
2. **Backend:** Reads `processed_zone_data` (latest per zone), `alerts` for city; computes stress_index (0–100), why_summary, what_if_no_action.
3. **Output:** JSON: city_id, city_name, timestamp, zones[], alerts[], grid{}, stress_index, why_summary[], what_if_no_action.

### 6.5 Agent (Scenario Console)

1. **Input:** `POST /api/agent/start` (body optional: city_id) → returns session_id. Then `POST /api/agent/message` with session_id, message, optional zone_id/city_id.
2. **Backend:** `agent_orchestrator.run()`: intent classification → tools (city state, active_events, service_outages, playbooks, etc.) → scenario_result + assistant_reply; persist to agent_runs, return run_id.
3. **Output:** assistant_reply (text), scenario_result (affected_zones, hypotheses, evidence_ids, recommended_actions, etc.), run_id, trace (if requested). UI shows reply in chat and scenario_result in right panel; “View Run Log” uses GET /api/agent/runs/{run_id}.

### 6.6 Voice (Phase 4)

1. **Input:** Frontend: audio blob → `POST /api/voice/transcribe` (FormData with audio file). For TTS: `POST /api/voice/synthesize` with `{ text }`.
2. **Backend:** Proxies to Deepgram (DEEPGRAM_API_KEY). Transcribe returns transcript; synthesize returns blob (audio).
3. **Output:** Transcript used as message to agent; TTS blob played in browser.

---

## 7. Backend API Summary (Routes and Input/Output)

| Prefix / Route | Method | Purpose | Key input | Key output |
|----------------|--------|---------|-----------|------------|
| /api/data/* | GET | Status, zones, households, alerts, grid-edges, meter sample, air-climate sample | Optional city_id, zone_id, limit | JSON (status, list of docs) |
| /api/data/collection/:name/* | GET/POST/PUT/DELETE | Admin CRUD (Sim) | collectionName, docId, body | Sample docs or success |
| /api/models/overview | GET | All models metadata/metrics | — | List of model info |
| /api/models/tft, /lstm, /autoencoder, /gnn | GET | Model details | — | Model metadata |
| /api/models/tft/prediction, /lstm/prediction | GET | Prediction | city_id, zone_id (optional) | Prediction JSON |
| /api/models/images/:model/:type | GET | Training curves etc. | — | Image (base64 or binary) |
| /api/analytics/* | GET | Demand hourly/by-zone, AQI, alerts summary, zone-risk, anomalies, correlation | zone_id, hours, days, city_id, threshold, limit | Aggregations JSON |
| /api/simulations/save, /list, /:id, /:id/analytics | POST/GET | Save/list/get simulation, analytics | body (save), simulationId | Simulation docs |
| /api/incidents, /incidents/:id, /incidents (POST), /incidents/analytics/* | GET/POST | Incidents CRUD + analytics | params (zone, category, urgency, status) | Incidents list / summary |
| /api/queries/list, /execute/:id, /create, /update/:id, /delete/:id | GET/POST/PUT/DELETE | Saved queries (Sim) | queryId, params, body | Query results or success |
| /api/ai/recommendations, /system-state | GET | AI recommendations, system state | city_id (optional) | Recommendations list, state |
| /api/live/311/requests | GET | 311 requests (City) | city_id, limit, status | List of 311 requests |
| /api/city/list | GET | List cities | — | cities[] |
| /api/city/current | GET | Current selected city | — | city_id, name, etc. or nulls |
| /api/city/select/:city_id | POST | Select city, start background processing | path city_id | { success, message } |
| /api/city/process/all, /zone/:id, /eia | POST | Trigger process all / single zone / EIA | city_id, zone lat/lon | Success message |
| /api/city/zones/coordinates, /processed-data, /processing-summary, /costs | GET | Zone coords, processed data, summary, costs | city_id, zone_id, limit | JSON |
| /api/city/state | GET | **Unified city state** (Phase 2a) | city_id, zones_limit, alerts_limit | zones, alerts, grid, stress_index, why_summary, what_if_no_action |
| /api/city/executive-summary | GET | **P0 executive summary** | city_id | stress_index, why_summary, what_if_no_action, top_failing_zones, top_resilient_zones, top_recommended_actions |
| /api/live-stream | GET | Kafka live feed (for Live Stream tab) | limit | List of kafka_live_feed docs |
| /api/kg/status, /sync, /risk, /graph, /neo4j-browser-url | GET/POST | Neo4j KG | city_id, zone_id, limit | Status, graph, risk |
| /api/grounding/* | GET | Asset registry, active events, service outages, playbooks, synthetic-events | — | Collections data |
| /api/agent/start | POST | Start agent session | body: { city_id } | session_id, city_id |
| /api/agent/message | POST | Send message to domain AI | body: session_id, message, city_id?, zone_id? | assistant_reply, scenario_result, run_id, trace? |
| /api/agent/runs | GET | List runs | session_id (optional) | runs[] |
| /api/agent/runs/:run_id | GET | Get one run (trace) | — | run doc with trace |
| /api/voice/config, /transcribe, /synthesize | GET/POST | Voice config, STT, TTS | FormData (transcribe), { text } (synthesize) | config, transcript, audio blob |
| /api/scenarios | GET/POST | List/create scenarios | city_id (list), body (create) | scenarios[] or scenario |
| /api/scenarios/:id | GET/PUT/DELETE | Get/update/delete scenario | body (PUT) | scenario |
| /api/scenarios/:id/run | POST | Run one scenario | city_id (optional) | Run result |
| /api/scenarios/run-batch | POST | Run batch | body: { scenario_ids, city_id? } | Batch results |
| /api/scenarios/runs/history | GET | Run history | scenario_id, limit | history[] |
| /api/health | GET | Health check | — | status, database |

All API requests from frontend send header `X-Data-Mode: sim | city` (from localStorage `ugms_mode`). Backend uses it to choose Sim vs City DB where applicable.

---

## 8. Frontend Structure

### 8.1 Entry and routing

- **App.jsx:** BrowserRouter, Routes: `/select-city` and `/*` → AppLayout. AppLayout: TronBackground, Navbar, Routes (see below).
- **Base URL:** In Docker, frontend is at http://localhost (Nginx). In dev, Vite (e.g. http://localhost:5177). API: `VITE_API_BASE_URL` or `http://localhost:8000/api`.

### 8.2 Routes (all pages)

| Path | Component | Mode |
|------|-----------|------|
| / | Home | Both |
| /select-city | Redirect to / | — |
| /guide | Guide | Both |
| /data | Data | Both |
| /analytics | Analytics | Both |
| /advanced-analytics | AdvancedAnalytics | Both |
| /ai-recommendations | AIRecommendations | Both |
| /insights | Insights | Both |
| /cost | Cost | City Live |
| /live-stream | LiveStream | City Live |
| /tft, /lstm, /autoencoder, /gnn | TFT, LSTM, Autoencoder, GNN | Both |
| /comparison | ModelComparison | Both |
| /citymap | CityMap | Both |
| /visualizations | AdvancedViz | Both |
| /scenario-console | ScenarioConsole | City Live |
| /scenario-bank | ScenarioBank | City Live |
| /incidents | IncidentReports | Both |
| /reports | Reports | Both |
| /simulation | Simulation | Sim |
| /simulation3d | Simulation3D | Sim |
| /admin/queries | AdminQueries | Sim |
| /admin/data | AdminData | Sim |

### 8.3 Navbar and mode

- **Navbar.jsx:** CITY_NAV (City Live) vs SIM_NAV (Simulated); mode from `useAppMode()` (localStorage `ugms_mode`). CitySelector, ModeSwitcher. Scenario Console and Scenario Bank appear under City Live.

### 8.4 API client (frontend/src/services/api.js)

- **api:** axios instance; baseURL = VITE_API_BASE_URL or http://localhost:8000/api; interceptor adds `X-Data-Mode` from localStorage.
- **Exports:** dataAPI, analyticsAPI, modelsAPI, simulationsAPI, incidentsAPI, queriesAPI, aiAPI, cityAPI, liveAPI, liveStreamAPI, agentAPI, scenariosAPI, voiceAPI, kgAPI, healthCheck.

---

## 9. Docker and How to Run

### 9.1 Services (docker-compose.yml)

| Service | Role | Ports / Notes |
|---------|------|----------------|
| backend | FastAPI app | 8000 |
| frontend | Nginx serving React build, proxy /api → backend | 80 |
| mongodb | MongoDB 7 | 27017 |
| neo4j | Neo4j 5 (KG) | 7474 (HTTP), 7687 (Bolt) |
| kafka | Apache Kafka (KRaft) | 9092 |
| kafka-init | Creates topics (power_demand, aqi_stream, traffic_events, grid_alerts, incident_text) | — |
| kafka-producer | Python: calls backend /api/city/current, fetches APIs, publishes to Kafka | — |
| kafka-consumer | Python: consumes Kafka, writes kafka_live_feed + raw_* | — |

Backend depends on mongodb, neo4j. Frontend depends on backend (healthcheck). kafka-producer depends on kafka, kafka-init, backend. kafka-consumer depends on kafka, kafka-init, mongodb.

### 9.2 Environment (.env)

- Copy from `.env.example`. Key variables:
  - **MongoDB:** MONGO_URI, MONGO_DB; SIM_MONGO_URI, SIM_MONGO_DB (Sim mode); CITY_MONGO_URI, CITY_MONGO_DB (City mode). Docker default City: mongodb://mongodb:27017, urban_grid_city.
  - **Kafka:** KAFKA_BOOTSTRAP_SERVERS=kafka:9092; KAFKA_PRODUCER_CITY_ID; KAFKA_PRODUCER_INTERVAL_SECONDS=45.
  - **Neo4j:** NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD (Docker: bolt://neo4j:7687, neo4j, urban-grid-kg).
  - **Voice:** DEEPGRAM_API_KEY (Scenario Console voice).
  - **AI Recs:** OPENROUTER_API_KEY, MISTRAL_API_KEY (optional).
  - **AQI fallback:** KAGGLE_AQI_CSV_PATH (e.g. /app/data/Kaggle_Aqi_Downloaded.csv in Docker); data/ mounted read-only.

### 9.3 Commands

- **Start (build if needed):** `docker-compose up --build` (foreground) or `docker-compose up -d --build` (background).
- **Stop:** `docker-compose down`.
- **Logs:** `docker-compose logs -f backend`, `docker-compose logs -f kafka-producer`, `docker-compose logs -f kafka-consumer`.
- **Health:** Backend: http://localhost:8000/api/health. App: http://localhost.

See **HOW_TO_RUN.md** for full steps, 502/connection troubleshooting, and Sim seed instructions.

---

## 10. What’s Left to Do (Prioritized)

### 10.1 Phases (in order)

- **Phase 3b — Agentic execution (n8n):** Approve AI actions → call n8n (or equivalent) to run workflows; audit log.
- **Phase 3c — RBAC & role-based views:** Roles (e.g. city_manager, db_engineer, mayor), permissions, auth, frontend route guards and conditional nav.
- **Phase 5 — Later:** Unified AI Recommendations (domain AI drives AI Recs page), model outsourcing, AWS/Spark, etc.

### 10.2 P0 – Must have (from TASKS_LEFT.md)

- Policy/trigger visibility — show which rules/triggers fired.
- Critical asset register + map — formal list and map (critical_sites exist, need formal exposure).
- Critical load zones — formalize from critical_sites (hospitals, airports).
- Health alerts — heat index + AQI thresholds (heatwave, unhealthy AQI).
- Vulnerable population index — per zone or city.
- Incident streams by type and urgency — structured incident feed.
- AQI components + heat index — PM2.5, PM10, O₃, NO₂; heat index from temp.
- Zone-level demand (kW/MW) and multi-horizon forecasts — expose scale and 1h/6h/24h.

### 10.3 P1 – Should have (next wave)

- Energy/Grid: load ramp rate, sector split, transformer/congestion, supply placeholders, N-1 contingency.
- Environment: forecasted pollution, rainfall/flood/storm, urban heat island.
- Transport: zone congestion, incident closures, evacuation/shelters.
- Health/infra/AI meta, cascading failure probability, Emergency Action Plan Generator, executive summary API enhancements.

Use **TASKS_LEFT.md** and **PRODUCTION_ROADMAP_PRIORITIES.md** for full P0/P1/P2 breakdown.

---

## 11. Key File Locations (Quick Reference)

| Area | Path |
|------|------|
| Backend entry | backend/main.py |
| City state & executive summary | backend/routes/city_selection.py (get_city_state, get_executive_summary) |
| Agent API & orchestrator | backend/routes/agent.py, backend/services/agent_orchestrator.py |
| Grounding (playbooks, events, outages) | backend/routes/grounding.py |
| Scenarios (bank, run, batch) | backend/routes/scenarios.py |
| Voice proxy | backend/routes/voice.py |
| Kafka producer | backend/kafka_producer.py |
| Kafka consumer | backend/kafka_consumer.py |
| Data processor & background | backend/services/data_processor.py, background_processor.py |
| Models (TFT, LSTM, etc.) | backend/routes/models.py; src/models/*.keras, tft_demand_forecast.py |
| Frontend app & routes | frontend/src/App.jsx |
| Navbar & nav config | frontend/src/components/Navbar.jsx |
| API client | frontend/src/services/api.js |
| Scenario Console UI | frontend/src/pages/ScenarioConsole.jsx |
| Scenario Bank UI | frontend/src/pages/ScenarioBank.jsx |
| Docker | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile |
| Env example | .env.example |
| Phase docs | PHASES_MASTER_PLAN.md, PHASES_AND_CHECKLIST.md, PHASE_LIST_DONE_AND_LEFT.md |
| Tasks & roadmap | TASKS_LEFT.md, PRODUCTION_ROADMAP_PRIORITIES.md |
| Data flow | DATA_FLOW_AND_PERFORMANCE.md, docs/DATA_FLOW_AND_FALLBACK_DATASETS.md |
| Model storage | MODEL_STORAGE_AND_FLOW.md |
| Run guide | HOW_TO_RUN.md |

---

## 12. LLM / IDE Handoff Notes

- **Single source of truth for “where we are”:** This file + PHASE_LIST_DONE_AND_LEFT.md + TASKS_LEFT.md.
- **To run the app:** Docker Desktop running → `docker-compose up --build` (or `-d`). Open http://localhost. Backend http://localhost:8000.
- **To add a feature:** Check PHASES_MASTER_PLAN.md for phase order; TASKS_LEFT.md and PRODUCTION_ROADMAP_PRIORITIES.md for P0/P1; OUTLINE_BRD_PRD_TDD.md for BRD/PRD/TDD alignment.
- **Domain-specific AI:** Implemented in agent_orchestrator + POST /api/agent/message. It is the single “brain” for Scenario Console (not per-model display). Input: message + session; output: scenario_result + assistant_reply + run_id/trace.
- **Data mode:** Frontend sends X-Data-Mode: sim | city. Backend uses SIM_MONGO_* vs CITY_MONGO_* and _current_city for city-scoped endpoints.
- **Scenario Bank:** Stored in MongoDB (scenarios collection); API under /api/scenarios; UI at /scenario-bank. Run one or batch; pass/fail/score for evaluation.

This document is intended to give full context so an LLM or developer on a new machine can continue work without re-reading every phase and doc file.
