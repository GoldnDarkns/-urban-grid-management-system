# Phases and Checklist — Urban Grid Management System

**Purpose:** One place to see where we are, what’s done, what’s next, and **that the Scenario Console will show responses** when the backend agent returns data.

---

## Will the Scenario Console show responses?

**Yes.** When you continue building and the backend agent is working:

1. **Left panel (chat):** Your message (e.g. “I have no power”) is sent to `POST /api/agent/message`. The backend domain-specific AI returns `assistant_reply` (text). The UI appends that as the **AI** message under **You**.
2. **Right panel (Scenario result):** The same response includes `scenario_result` (affected zones, hypotheses, evidence, recommended actions, ETA, cost, risk, etc.). The UI renders that in the **Scenario result** panel.

So once the agent responds successfully, you’ll see:
- **AI** reply text in the chat.
- **Scenario result** (zones, evidence, actions, etc.) in the right panel.

If you see **no** AI reply and **no** scenario result, common causes are:
- Backend not running or returning 502/timeout → check `docker-compose ps` and `docker-compose logs backend`.
- Agent returns empty `assistant_reply` or `scenario_result` → we added fallback messages in the UI (“No reply text from AI…”, “No scenario result for this message…”).
- Session not started → click **Start session** before sending.

The **phases** below are what we built so the backend agent exists (Phase 2c/2d); the next step is ensuring it returns non-empty replies and results (and fixing any 502/timeouts).

---

## Phase checklist (from PHASES_MASTER_PLAN)

| # | Phase | Goal | Status | Notes |
|---|--------|------|--------|--------|
| **0** | **Phase 0 — Real TFT** | TFT vs LSTM comparison meaningful; real TFT model | ✅ Done | `src/models/tft_demand_forecast.py`, TFT prediction API, cache |
| **1** | **Phase 1a — Performance** | Faster site; cache models; no retraining in hot path | ✅ Done | Model cache, pre-compute, MODEL_OUTPUTS_MAX_AGE |
| **2** | **Phase 1b — Kafka data path** | APIs → Kafka → consumer → MongoDB for City Live | ✅ Done | kafka-producer, kafka-consumer, raw_* collections, DataProcessor from Kafka |
| **3** | **Phase 1c — Navigation** | Group Simulated vs City Live; same routes | ✅ Done | Navbar: Simulated / City Live sections |
| **4** | **Phase 2a — Unified city state** | One API for aggregated city state | ✅ Done | GET /api/city/state |
| **5** | **Phase 2b — Grounding DB + synthetic events** | Evidence for AI (asset_registry, active_events, service_outages, playbooks) | ✅ Done | grounding router, synthetic-events endpoint, playbooks seeded |
| **6** | **Phase 2c — Domain-specific AI (orchestrator)** | Reasoning layer: intent → tools → scenario_result + assistant_reply | ✅ Done | agent_orchestrator, POST /api/agent/start, POST /api/agent/message |
| **7** | **Phase 2d — Agentic Scenario Console** | New City Live page: chat + scenario result panel | ✅ Done | ScenarioConsole.jsx, /scenario-console, agentAPI.start/message |
| **8** | **Phase 2e — Agent Run Trace** | Store trace; “View Run Log” in UI | ✅ Done | agent_runs in city DB, GET /api/agent/runs, GET /api/agent/runs/{run_id}, View Run Log in Scenario Console |
| **9** | **Phase 3a — Scenario bank & evaluation** | Curated scenarios, run and record outcome | ✅ Done | scenarios API, Scenario Bank page, run one/batch, pass/fail/score |
| **10** | **Phase 3b — Agentic execution (n8n)** | Approve actions → run workflows | ⬜ Todo | |
| **11** | **Phase 3c — RBAC & role-based views** | Roles, permissions, route guards | ⬜ Todo | |
| **12** | **Phase 4 — Voice (optional)** | Deepgram STT/TTS for Scenario Console | ✅ Done | Text/Voice toggle, Speak reply; set DEEPGRAM_API_KEY |
| **13** | **Phase 5 — Later** | Unified AI Recommendations, Stress Index, “why” / “what if,” outsourcing | ⬜ Todo | See TASKS_LEFT.md |

---

## What’s done (summary)

- **Phases 0, 1a, 1b, 1c, 2a, 2b, 2c, 2d** are implemented.
- **Scenario Console** exists: session start, send message, display assistant reply and scenario result (with fallbacks when empty).
- **Backend agent** exists: intent classification, tools (city state, events, playbooks), scenario_result + assistant_reply + trace (in-memory sessions).
- **City Map:** pan/zoom, “Fit all zones.”
- **CORS, healthcheck, timeouts, MODEL_STORAGE_AND_FLOW, TASKS_LEFT** documented and/or fixed.

---

## What’s next (order)

1. **Make Scenario Console show responses in your environment**  
   - Ensure backend is up and healthy (`docker-compose ps`, `docker-compose logs backend`).  
   - If agent returns empty reply/result, improve orchestrator (e.g. “no power” → intent power_outage → query service_outages/active_events → fill scenario_result and assistant_reply).

2. **Phase 2e — Agent Run Trace**  
   - Persist agent runs and trace; API to fetch run/trace; UI “View Run Log.”

3. **Production roadmap (see TASKS_LEFT.md)**  
   - P0: City Stress Index, Zone Resilience, “why,” “what if,” policy visibility, critical asset register, health alerts, incident streams, AQI/heat, demand scale.  
   - P1: Grid/env/transport/health/infra, cascading failure, action plan generator, executive summary API.  
   - P2/P3: As capacity allows.

4. **Phases 3a, 3b, 3c, 4, 5**  
   - Scenario bank, agentic execution, RBAC, voice, Phase 5 extras.

---

## Console / accessibility fix

- The Scenario Console message input now has `id="scenario-console-message"` and `name="scenario-message"` so the browser “form field should have an id or name attribute” warning is resolved.

Use this file with **PHASES_MASTER_PLAN.md** (full phase descriptions) and **TASKS_LEFT.md** (production P0/P1/P2 list) to track progress and next steps.
