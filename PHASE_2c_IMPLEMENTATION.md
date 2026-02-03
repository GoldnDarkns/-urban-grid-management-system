# Phase 2c: Domain-Specific AI — Implementation Summary

**Status:** Implemented (orchestrator + agent API). UI is Phase 2d.

---

## What Was Built

### 1. Orchestrator service (`backend/services/agent_orchestrator.py`)

- **Intent classification:** Rule-based from keywords → `power_outage` | `aqi_spike` | `road_closure` | `failure` | `general`.
- **Clarifying questions:** Up to 3; if intent needs a zone and `zone_id` is missing, asks “Which zone?” and lists zone IDs from city state.
- **Tools (MongoDB):**
  - `fetch_city_state(db, city_id)` — processed_zone_data + alerts.
  - `fetch_active_events(db, city_id, zone_id?, event_type?, limit)` — active_events.
  - `fetch_service_outages(db, city_id, zone_id?, limit)` — service_outages.
  - `fetch_playbooks(db, event_type?, limit)` — playbooks (seeds if empty).
  - `fetch_asset_registry(db, city_id, zone_id?, limit)` — asset_registry.
- **Evidence-first:** Builds `scenario_result` from tool results; hypotheses cite `evidence_ids`.
- **Output:** `scenario_result` (affected_zones, hypotheses, evidence_ids, recommended_actions, grid, clarifying_question), `assistant_reply` (templates), `trace` (steps + tool_calls).

### 2. Agent API (`backend/routes/agent.py`)

- **POST /api/agent/start**  
  Body: `{ "city_id": "nyc" }` (optional).  
  Returns: `{ "session_id": "<uuid>", "city_id": "nyc" | null }`.
- **POST /api/agent/message**  
  Body: `{ "session_id": "<uuid>", "message": "...", "city_id": "nyc", "zone_id": "Z_001" }` (city_id/zone_id optional overrides).  
  Returns: `{ "assistant_reply": "...", "scenario_result": { ... }, "run_id": "<uuid>", "trace": [ ... ] }`.

Sessions are in-memory: `session_id` → `{ city_id, zone_id, clarifying_count, message_history }`. Zone can be provided in the message (e.g. “Z_001”) or in `zone_id` after a clarifying question.

### 3. Router registration

- `backend/main.py`: `agent` router included; routes live under `/api/agent`.

---

## Flow

1. Frontend (or client) calls **POST /api/agent/start** with optional `city_id` → gets `session_id`.
2. User sends a message (e.g. “My area has no power”).
3. Frontend calls **POST /api/agent/message** with `session_id` and `message` (and optional `city_id`/`zone_id`).
4. Orchestrator: classifies intent → if zone needed and missing, returns clarifying question; else runs tools → builds scenario_result + template reply + trace.
5. Response: `assistant_reply`, `scenario_result`, `run_id`, `trace`.

---

## Next (Phase 2d)

- New City Live subtab “Scenario Console”: chat panel (left) + scenario result panel (right).
- Chat calls POST /api/agent/message; right panel renders `scenario_result`.
- Optional “View Run Log” using `trace` (Phase 2e can persist `agent_runs` and add GET /api/agent/runs/{run_id}).
