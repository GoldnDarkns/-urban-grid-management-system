# Phase 2c: Domain-Specific AI — Design & LLM Role

**Purpose:** Clarify how we build the domain-specific AI: whether we need an LLM, how it converses and processes, and what we build in each phase.

---

## Do We Need an LLM?

**Core answer: No.** The **core reasoning** (“what to do and why”) is **not** powered by a general-purpose LLM.

| Layer | Approach | LLM? |
|-------|----------|------|
| **Intent** | Rule-based or small classifier (e.g. keyword → power_outage / aqi / traffic / general). | No (or tiny local model). |
| **Clarifying questions** | Fixed templates per intent (e.g. “Which zone?” → list from city state). | No. |
| **Evidence & reasoning** | Tool calls: read MongoDB (model_outputs, active_events, service_outages, playbooks, city state). Apply rules + playbooks. | **No.** |
| **Structured output** | Build `scenario_result` (zones, hypotheses, evidence IDs, actions, ETA, cost) from rules + tool results. | No. |
| **Text reply to the user** | **Optional:** small LLM only for **phrasing** — we feed it **structured content** (summary + evidence + actions) and ask it to turn that into natural language. If we skip LLM, we use **templates** (e.g. “Based on event {id}, playbook recommends {action}. ETA: {eta}.”). | **Optional.** |

So: **conversation** (turn-taking, clarifying questions, one reply) is implemented by the **orchestrator** (rules + tools). **Natural-language phrasing** can be either templates (no LLM) or a small LLM with structured input only (no open-ended reasoning).

---

## How It Converses and Processes

1. **User says something** (e.g. “My area has no power since 20 minutes”) → POST `/api/agent/message` with session + message.
2. **Orchestrator:**
   - **Classify intent** (rule or small model): e.g. `power_outage` + maybe extract “20 minutes.”
   - **Optional clarifying questions (max 3):** e.g. “Which zone or address?” → use city state / zones to offer choices; user picks.
   - **Tool calls:**  
     - GET city state (zones, alerts).  
     - Query `active_events`, `service_outages`, `asset_registry`, `playbooks` (and optionally `model_outputs`) for the relevant city/zone.
   - **Evidence-first:** Every conclusion ties to an event ID, model output, or playbook action. If evidence is missing → “Insufficient evidence” + suggest what’s needed (e.g. “Please specify zone”).
   - **Build outputs:**  
     - `scenario_result` (structured JSON): affected zones, hypotheses with confidence, evidence IDs, recommended actions, ETA, cost, risk before/after.  
     - `assistant_reply` (text): from **templates** or **optional LLM phrasing** from that structured content.  
     - `trace` (for “View Run Log”): steps, tool_calls, evidence IDs.
3. **Response** to caller: `assistant_reply`, `scenario_result`, `run_id` (for trace).  
4. **UI** (Phase 2d): left panel = chat (user message + assistant_reply); right panel = scenario_result; “View Run Log” = trace.

So the **conversation** is: user input → orchestrator (intent + tools + rules) → one reply + one scenario_result. No need for an LLM to “understand” or “reason”; the orchestrator does that with deterministic logic and evidence.

---

## What We Build in Each Phase

| Phase | What we build | Domain-specific AI |
|-------|----------------|---------------------|
| **2a** | Unified city state API (`GET /api/city/state`). | **Data consumed later** by the AI. |
| **2b** | Grounding DB (asset_registry, active_events, service_outages, playbooks) + synthetic events + APIs. | **Tools/data** the AI will call in 2c. |
| **2c** | **The domain-specific AI itself:** orchestrator service + `POST /api/agent/start`, `POST /api/agent/message`; intent, clarifying questions, tool calls, rules/playbooks, scenario_result + assistant_reply + trace. | **We build the brain here.** |
| **2d** | Agentic Scenario Console UI: chat + scenario result panel, calling `/api/agent/message`. | **Front-end for** the AI. |
| **2e** | Agent Run Trace (store trace, GET run API, “View Run Log” UI). | **Explainability** of the same AI. |

So **right now (after 2b):** we have only built the **foundation** — state API and grounding APIs. We have **not** yet built the thing that converses and processes; that is **Phase 2c**.

---

## Summary

- **LLM:** Not required for core. Optional only for **phrasing** the final reply from structured content; otherwise use templates.
- **Conversation:** Implemented by the **orchestrator** (intent + up to 3 clarifying questions + tool calls + rules + playbooks) → one `assistant_reply` + one `scenario_result` per turn.
- **This phase (2b):** We built the **data/tools** (grounding DB + APIs). **Phase 2c** is when we build the **domain-specific AI** (orchestrator + agent APIs).
