# Phase 2d: Agentic Scenario Console — Implementation Summary

**Status:** Implemented. New City Live page: chat + scenario result panel, wired to domain-specific AI (Phase 2c).

---

## What Was Built

### 1. Frontend API (`frontend/src/services/api.js`)

- **agentAPI.start(body)** — `POST /api/agent/start` with optional `{ city_id }`. Returns `{ session_id, city_id }`.
- **agentAPI.message(body)** — `POST /api/agent/message` with `{ session_id, message, city_id?, zone_id? }`. Returns `{ assistant_reply, scenario_result, run_id, trace }`.

### 2. Scenario Console page (`frontend/src/pages/ScenarioConsole.jsx`)

- **Left panel (chat):**
  - “Start session” button (uses current city from `cityAPI.getCurrentCity()`).
  - Session indicator: “Session active”, city badge, clarifying count (max 3).
  - Message list: user and assistant bubbles.
  - Text input + Send; Enter to send.
- **Right panel (scenario result):**
  - Renders `scenario_result`: message, grid summary (zones, high risk, alerts), affected zones, hypotheses (with confidence), evidence IDs, recommended actions.
  - Collapsible “Run trace” (steps from last response).
- **Behavior:** On start, session is created with current city. Each message calls `POST /api/agent/message`; response updates chat and right panel. If the AI asks a clarifying question (e.g. “Which zone?”), user can reply with zone in text (e.g. “Z_001”) or the next message is sent as-is.

### 3. Route and navigation

- **Route:** `/scenario-console` → `ScenarioConsole` (in `App.jsx`).
- **Nav:** City Live nav includes “Scenario Console” (MessageSquare icon, mgmt group) in `Navbar.jsx`.

---

## Flow

1. User opens **Scenario Console** (City Live only).
2. Optionally selects a city (dropdown); then clicks **Start session** → `POST /api/agent/start` with current `city_id`.
3. User types a scenario or question (e.g. “My area has no power”) and sends → `POST /api/agent/message`.
4. Left panel shows user message and AI reply; right panel shows scenario result (zones, hypotheses, evidence, recommended actions) and optional trace.

---

## Next (Phase 2e)

- **Agent Run Trace:** Persist `agent_runs` in MongoDB; add `GET /api/agent/runs/{run_id}` and “View Run Log” UI (drawer/panel with full trace and scorecard).
