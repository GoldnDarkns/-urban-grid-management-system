# Phase List: What’s Done and What’s Left

Single reference for all phases we discussed and their status.  
Details: **PHASES_MASTER_PLAN.md** (full phase text), **TASKS_LEFT.md** (P0/P1/P2 production list).

---

## Master phase list (from PHASES_MASTER_PLAN)

| # | Phase | Goal (short) | Status |
|---|--------|----------------|--------|
| **0** | **Phase 0 — Real TFT** | TFT vs LSTM comparison meaningful; real TFT model | ✅ **Done** |
| **1** | **Phase 1a — Performance** | Faster site; cache models; no retraining in hot path | ✅ **Done** |
| **2** | **Phase 1b — Kafka data path** | APIs → Kafka → consumer → MongoDB for City Live | ✅ **Done** |
| **3** | **Phase 1c — Navigation** | Group Simulated vs City Live; same routes | ✅ **Done** |
| **4** | **Phase 2a — Unified city state** | One API for city state (zones, alerts, grid) | ✅ **Done** |
| **5** | **Phase 2b — Grounding DB + synthetic events** | Evidence for AI (asset_registry, active_events, service_outages, playbooks) | ✅ **Done** |
| **6** | **Phase 2c — Domain-specific AI (orchestrator)** | Intent → tools → scenario_result + assistant_reply | ✅ **Done** |
| **7** | **Phase 2d — Agentic Scenario Console** | City Live page: chat + scenario result panel | ✅ **Done** |
| **8** | **Phase 2e — Agent Run Trace** | Store runs; “View Run Log” in UI | ✅ **Done** |
| **9** | **Phase 3a — Scenario bank & evaluation** | Curated scenarios, run and record outcome | ✅ **Done** |
| **10** | **Phase 3b — Agentic execution (n8n)** | Approve actions → run workflows | ⬜ **Left** |
| **11** | **Phase 3c — RBAC & role-based views** | Roles, permissions, route guards | ⬜ **Left** |
| **12** | **Phase 4 — Voice (optional)** | Deepgram STT/TTS for Scenario Console | ✅ **Done** |
| **13** | **Phase 5 — Later** | Unified AI Recs, Stress Index, “why”/“what if,” outsourcing, AWS, etc. | ⬜ **Left** (partially done; see below) |

---

## What’s done (summary)

### Phases (all through 2e)

- **Phase 0:** Real TFT model (`tft_demand_forecast.py`, TFT prediction API, cache).
- **Phase 1a:** Model cache, pre-compute, no retraining in hot path.
- **Phase 1b:** Kafka producer/consumer, raw_* collections, DataProcessor from Kafka.
- **Phase 1c:** Navbar Simulated / City Live sections.
- **Phase 2a:** GET /api/city/state (zones, alerts, grid, stress_index).
- **Phase 2b:** Grounding router (asset_registry, active_events, service_outages, playbooks), synthetic-events, playbooks seeded.
- **Phase 2c:** agent_orchestrator, POST /api/agent/start, POST /api/agent/message.
- **Phase 2d:** ScenarioConsole.jsx, /scenario-console, chat + scenario result panel.
- **Phase 2e:** agent_runs in city DB, GET /api/agent/runs, GET /api/agent/runs/{run_id}, “View Run Log” in Scenario Console.

### P0 “Brain” outputs (from TASKS_LEFT — partially done)

- **City Stress Index (0–100):** ✅ Done (in GET /api/city/state and executive-summary).
- **“Why this is happening”:** ✅ Done (why_summary in state + executive-summary).
- **“What if I do nothing?”:** ✅ Done (what_if_no_action in state + executive-summary).
- **Executive summary API:** ✅ Done (GET /api/city/executive-summary; stress, why, what if, top failing zones, top actions).
- **Executive summary on Home (City Live):** ✅ Done (card with stress index, why, what if).
- **Zone Resilience Score:** ✅ Done (inverse of risk; per-zone resilience_score in ml_processed; state + executive-summary + top_resilient_zones; Home card “Zone resilience (can absorb shock)”).

### Phase 4 — Voice

- **Deepgram STT/TTS:** Backend proxy (`POST /api/voice/transcribe`, `POST /api/voice/synthesize`, `GET /api/voice/config`). Scenario Console: **Text** vs **Voice** mode (toggle); record → transcribe → send to agent; optional **Speak reply** (TTS). Set `DEEPGRAM_API_KEY` in env to enable voice.

### Other done items

- City Map: pan/zoom, “Fit all zones.”
- Scenario Console: power_outage → outage playbooks so “I have no power” gets real reply + scenario_result.
- CORS, backend healthcheck, frontend timeouts, MODEL_STORAGE_AND_FLOW, HOW_TO_RUN 502 section, PHASES_AND_CHECKLIST, TASKS_LEFT.

---

## What’s left

### Phases (in order)

| Phase | What’s left |
|-------|----------------|
| **3b** | Agentic execution — approve AI actions → call n8n (or similar) to run workflows; audit log. |
| **3c** | RBAC — roles, permissions, auth, route guards, conditional nav by role. |
| **5** | Later — Unified AI Recommendations (domain AI drives AI Recs page), model outsourcing, AWS/Spark, etc. |

### P0 – Still to do (from TASKS_LEFT)

- **Policy/trigger visibility** — Show which rules/triggers fired.
- **Critical asset register + map** — Formal list and map of critical assets (you have `critical_sites`).
- **Critical load zones** — Formalize from `critical_sites` (hospitals, airports).
- **Health alerts** — Heat index + AQI thresholds (heatwave, unhealthy AQI).
- **Vulnerable population index** — Per zone or city.
- **Incident streams by type and urgency** — Structured incident feed.
- **AQI components + heat index** — PM2.5, PM10, O₃, NO₂; heat index from temp.
- **Zone-level demand (kW/MW) and multi-horizon forecasts** — Expose scale and 1h/6h/24h.

### P1 – Should have (next wave)

- **Energy/Grid:** Load ramp rate, sector split, transformer/congestion, supply placeholders, N-1 contingency.
- **Environment:** Forecasted pollution, rainfall/flood/storm, urban heat island.
- **Transport:** Zone congestion, incident closures, evacuation/shelters.
- **Health:** Hospital/ICU/ambulance when data available.
- **Infrastructure:** Asset risk state (flood, backup).
- **AI meta:** Error history, overrides, action effectiveness.
- **City AI core:** Cascading failure probability, Emergency Action Plan Generator.

### P2 / P3 – Nice to have (later)

- Voltage/outages, backup gen, wildfire/drought, traffic emissions, transit, water, sensors, digital twin, compliance, etc.

---

## Quick reference

- **Done:** Phases **0, 1a, 1b, 1c, 2a, 2b, 2c, 2d, 2e, 3a, 4** + **City Stress Index, “why,” “what if,” Executive summary** (API + Home card) + **Zone Resilience Score** (per-zone + top_resilient_zones + Home card) + **Voice** (Deepgram STT/TTS, text/voice toggle, Speak reply) + **Scenario Bank** (CRUD, run one, run batch, pass/fail/score).
- **Next (suggested order):**  
  1. **P0** — Policy visibility, critical asset register, health alerts, incident streams, AQI/heat, demand scale.  
  2. **Phase 3b** — Agentic execution (n8n).  
  3. **P1** — Grid/env/transport/health/infra, cascading failure, action plan generator.  
  4. **Phases 3c, 5** as needed.

Use **PHASES_MASTER_PLAN.md** for full phase descriptions and **TASKS_LEFT.md** for the full P0/P1/P2 checklist.
