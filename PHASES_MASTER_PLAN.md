# Phases Master Plan — Full Sequence

**Purpose:** One ordered list of all phases from our conversations, what we do first/second/etc., and **where domain-specific AI sits** (mandatory, upper layer, how we build it). No implementation yet — this is the plan.

---

## Domain-Specific AI: Mandatory or Optional?

**Domain-specific AI is mandatory** for the City Emergency Brain and the Agentic Scenario Console.

- It is the **single reasoning layer** that **consumes** the outputs of all models (TFT, LSTM, GNN, Autoencoder, etc.) and **produces one unified answer**: what’s wrong, what to do, why, and (in the console) scenario_result (affected zones, evidence, actions, ETA, cost, risk before/after).
- We use it **instead of** showing each model separately in the Scenario Console: the user sees **one** response from the domain-specific AI, not “TFT says X, GNN says Y.” So it **overtakes** the need to showcase each model in that flow — it’s the **upper layer** on top of the models.
- It does **not** replace the models: TFT, GNN, etc. keep running (or their results are pre-computed and stored). The domain-specific AI **reads** those results from MongoDB (and grounding DB) and **reasons** over them to produce the final answer.

---

## Where Exactly Does Domain-Specific AI Lie?

**In the new City Live “Agentic Scenario Console” (scenario simulation subtab):**

```
User input (text or voice): "My area has no power since 20 minutes"
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  DOMAIN-SPECIFIC AI (orchestrator / brain)                      │
│  • Intent classification (power outage, AQI, traffic, etc.)    │
│  • Up to 3 clarifying questions (e.g. "Which zone?")           │
│  • Tools: read active_events, service_outages, asset_registry,  │
│           playbooks, AND model_outputs (TFT, GNN, anomalies)    │
│  • Evidence-first: no guessing; cite event IDs, model flags     │
│  • Apply playbooks/rules → produce scenario_result + reply      │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
  scenario_result (affected zones, hypotheses, evidence, actions,
                   ETA, cost, grid plan, risk before/after)
  + assistant_reply (text)
  + Agent Run Trace (steps, tool_calls, evidence IDs)
        │
        ▼
  UI: Right panel shows scenario_result; left panel shows chat.
      "View Run Log" shows trace. We do NOT show each model
      (TFT, GNN, etc.) separately — domain-specific AI is the
      single interface that provides the output.
```

So: **Domain-specific AI = the upper layer.** It sits **on top of**:

1. **Model outputs** (TFT forecast, GNN risk, Autoencoder anomaly, etc.) — read from MongoDB (pre-computed or on-demand).
2. **Grounding DB** (active_events, service_outages, asset_registry, playbooks) — read via tools.
3. **Unified city state** (when we have it) — grid, AQI, traffic, alerts.

It **produces** the one answer the operator sees. The models stay underneath; we don’t remove them, we just stop **surfacing** them one-by-one in the Scenario Console — the domain-specific AI overtakes that and provides the single output.

**Elsewhere (future):** The same domain-specific AI can later power: unified AI Recommendations (replace or augment LLM), City Stress Index, “why this is happening,” “what if I do nothing,” so it’s the one reasoning layer for the whole product.

---

## How We Build Domain-Specific AI

| Aspect | Approach |
|--------|----------|
| **Logic** | Rules + KG (Neo4j) + tool calls. Optional: small classifier for intent (no general-purpose LLM for core decisions). |
| **Inputs** | Unified state (or scenario overrides), model_outputs (TFT, GNN, anomalies), active_events, service_outages, asset_registry, playbooks. |
| **Flow** | Classify intent → optional clarifying questions (max 3) → query tools (MongoDB, Neo4j) → apply playbooks/rules → build scenario_result + assistant_reply. |
| **Rule** | Evidence-first: every conclusion must cite evidence (event ID, model flag, or “hypothesis” + confidence). No guessing when evidence is missing. |
| **Output** | scenario_result (structured JSON for right panel) + assistant_reply (text) + trace (for “View Run Log”). |
| **Where it runs** | Backend (FastAPI): e.g. POST /api/agent/start, POST /api/agent/message. Same engine for live state and scenario testing. |

We do **not** use a general-purpose LLM for the core “what to do and why” — we use rules + playbooks + tools so that behavior is deterministic and explainable. Optional: use a small LLM only for **phrasing** the reply, with structured inputs from the rules.

---

## Full Phase Sequence (Order of Work)

Below is the sequence we follow. Each phase builds on the previous.

---

### Phase 0 — Real TFT model (fix TFT vs LSTM comparison)

**Goal:** Today the TFT prediction endpoint just calls the LSTM model, so "TFT vs LSTM" in analytics shows the same model twice. We need a **real TFT model** so the comparison is meaningful.

**Deliverables:**

- **TFT training script** (e.g. `src/models/tft_demand_forecast.py`) that uses the same Sim DB `meter_readings` as LSTM, builds a **TFT-style model** (attention over time + feedforward, interpretable multi-horizon capable), trains it, and saves to `src/models/tft_demand_model.keras`.
- **TFT prediction in API:** `get_tft_prediction()` loads and runs the **TFT model** (cached like LSTM), not LSTM. Pre-compute and `model_outputs` support type `"tft"` separately from `"lstm"`.
- **Result:** In Analytics / Model Comparison, TFT and LSTM are **two different models** with different predictions and metrics.

**Outcome:** TFT vs LSTM comparison is real and meaningful; TFT is the primary predictor, LSTM is the comparison baseline.

**Domain-specific AI:** Not in this phase. Prepares real TFT outputs for later consumption.

---

### Phase 1a — Performance (make current site faster)

**Goal:** Reduce wait times without changing features.

**Deliverables:**

- Confirm no retraining in any hot path; model routes = inference only (already true; document and enforce).
- Cache loaded models in backend (e.g. LSTM/TFT load once per process, reuse) so model pages don’t reload from disk every request.
- Optional: Pre-compute TFT/GNN/anomaly outputs in background and store in MongoDB (e.g. model_outputs); model pages read from DB instead of running inference on page load.

**Outcome:** Faster model pages and clearer path for “pre-trained only, just give outputs.”

**Domain-specific AI:** Not in this phase.

---

### Phase 1b — Kafka as main data path (City Live)

**Goal:** APIs → Kafka → consumer → MongoDB so City Live is fed by continuous ingestion; frontend only reads from FastAPI → MongoDB.

**Deliverables:**

- Producers: scheduled collectors for EIA, AQI, Traffic, Weather, 311 → Kafka topics (e.g. raw_eia_power, raw_aqi, raw_traffic, raw_weather, raw_311_incidents).
- Consumer: validate, dedupe, normalize, city→zone mapping → write to MongoDB (raw_* and derived: features_hourly, processed_zone_data or equivalent).
- Processing job: aggregate raw → zone-level features; optionally run ML inference and write model_outputs, risk_scores, alerts.
- Frontend and APIs only read from MongoDB (no direct Kafka).

**Outcome:** Data pre-populated; site feels faster; single source of truth for City Live.

**Domain-specific AI:** Not in this phase. Prepares data (model_outputs, state) that domain-specific AI will later read.

---

### Phase 1c — Navigation reorganization (UI only)

**Goal:** Group all existing pages under Simulated vs City Live; no routes or features removed.

**Deliverables:**

- Top-level: Simulated | City Live.
- Simulated: Home, Guide, Data Explorer, Analytics, Models (TFT/LSTM/Autoencoder/GNN/ARIMA/Prophet + comparison), Visualizations (MongoDB queries + CRUD), Maps (2D, 3D), Reports, Admin (Data Editor, Manage Queries).
- City Live: Home, City Selection + Processing Status, Live Stream, Analytics, Models, Knowledge Graph, AI Recommendations, Incidents, Maps, Reports; **plus** (when built) Agentic Scenario Console.
- Implement with dropdowns or sidebar sections; same routes, only menu structure changes.

**Outcome:** Clear separation by mode; easier to add “Scenario Console” under City Live.

**Domain-specific AI:** Not in this phase.

---

### Phase 2a — Unified city state (optional but recommended)

**Goal:** One API that returns aggregated “city state” (grid, AQI, traffic, incidents, zones, alerts) so the AI and UI have a single view.

**Deliverables:**

- State model and GET /api/city-state (or equivalent) built from MongoDB (processed_zone_data, alerts, etc.).
- Optional: City Stress Index (0–100) and per-zone metrics.
- Scenario overrides: API or body to submit “what-if” overrides (e.g. AQI 180 in Z_003); state API returns “real + overrides.”

**Outcome:** Single state snapshot for domain-specific AI and Scenario Console.

**Domain-specific AI:** Will consume this state in Phase 2c/2d.

---

### Phase 2b — Grounding DB + synthetic events (for Scenario Console)

**Goal:** Give the AI evidence it can cite (no hallucination).

**Deliverables:**

- Collections: asset_registry (transformers, substations, feeders, water pumps, zones), active_events (outages, failures, AQI spikes, road closures), service_outages (power/water by zone: % affected, start_ts, eta), playbooks (allowed actions + ETA/cost per event type).
- Synthetic event generator: creates realistic events for **testing** the Scenario Console only; writes into active_events (and optionally service_outages). Does not affect existing Analytics/Data pages.
- Backend APIs or internal access so domain-specific AI can query these collections.

**Outcome:** Domain-specific AI can return evidence-backed answers (event IDs, playbook actions).

**Domain-specific AI:** Uses these as tools in Phase 2c.

---

### Phase 2c — Domain-specific AI (orchestrator) — **MANDATORY**

**Goal:** Build the reasoning layer that reads model outputs + grounding + state and returns one unified answer (actions + why + scenario_result).

**Deliverables:**

- Orchestrator service: intent classification (rule or small model), up to 3 clarifying questions, tool calls (MongoDB: model_outputs, active_events, service_outages, asset_registry, playbooks; optional Neo4j).
- Evidence-first: no conclusion without evidence; “insufficient evidence” + next question when needed.
- Outputs: scenario_result (affected zones, hypotheses with confidence, evidence IDs, recommended actions, ETA, cost, grid plan, risk before/after), assistant_reply (text), and structured trace for Agent Run Trace.
- APIs: POST /api/agent/start, POST /api/agent/message (input: session, user message or transcript; output: assistant_reply, scenario_result, run_id for trace).

**Outcome:** Single “brain” that overtakes showing each model in the Scenario Console; provides the one output operators see.

**Domain-specific AI:** This phase **is** building it.

---

### Phase 2d — Agentic Scenario Console (new City Live subtab)

**Goal:** New page under City Live: scenario simulation with chat + scenario result panel.

**Deliverables:**

- New route/page: e.g. City Live → “Scenario Console” (or “Simulate scenario”).
- Left panel: conversation (text input first); user types scenario or question; assistant replies; shows “clarifying question count (max 3).”
- Right panel: render scenario_result (affected zones, hypotheses, evidence, recommended actions, ETA, cost, grid plan, risk before/after).
- Calls POST /api/agent/message; displays assistant_reply and scenario_result; does **not** show TFT/GNN/etc. individually — only the domain-specific AI output.
- Optional: “Run scenario” from a list (scenario bank) or free-form text.

**Outcome:** Operators can run scenarios and see one clear answer from the domain-specific AI.

**Domain-specific AI:** It is the backend of this page; the UI is the front for it.

---

### Phase 2e — Agent Run Trace (explainability)

**Goal:** Every agent run is stored with a step-by-step trace; UI can show “View Run Log.”

**Deliverables:**

- MongoDB collection agent_runs: run_id, session_id, user_input, created_at, final_answer (assistant_reply, scenario_result), trace[] (steps: intent_classification, clarifying_question, evidence_query, model_inference, plan_generation, etc. with duration_ms, inputs_summary, outputs_summary, tool_calls, evidence IDs).
- APIs: GET /api/agent/runs?session_id=..., GET /api/agent/runs/{run_id}; POST /api/agent/message returns run_id so UI can fetch trace.
- UI: “View Run Log” / “Explain this result” → drawer or panel with timeline (expandable rows), scorecard (confidence, evidence sources, missing info, assumptions).

**Outcome:** Enterprise-grade explainability; every answer is auditable.

**Domain-specific AI:** Trace is the log of what the domain-specific AI did (steps, tools, evidence).

---

### Phase 3a — Scenario bank & evaluation

**Goal:** Curated scenarios for regression testing and evaluation.

**Deliverables:**

- Store scenarios (e.g. name, overrides, optional expected outcome) in DB or config.
- API or UI to run a scenario and optionally record outcome (pass/fail or score).
- Optional: batch run and compare outcomes for releases.

**Outcome:** We can test the domain-specific AI on random/custom scenarios and track quality.

**Domain-specific AI:** Same AI; we’re just managing and evaluating scenarios.

---

### Phase 3b — Agentic execution (n8n or equivalent)

**Goal:** Selected AI actions can trigger real workflows (alerts, APIs, tasks) with human-in-the-loop.

**Deliverables:**

- When domain-specific AI returns “recommended actions,” operator can approve; backend calls n8n (or similar) to run workflow (e.g. send alert, call traffic API).
- Audit log: who approved, when, what action, result.
- Optional: Kafka topic ai.actions for event-driven execution.

**Outcome:** The AI can “act,” not only recommend.

**Domain-specific AI:** Its output (recommended actions) becomes the input to execution.

---

### Phase 3c — RBAC & role-based views

**Goal:** Different roles see different parts of the app (DB engineer → admin/DB; network engineer → connections; mayor → full maps/logistics).

**Deliverables:**

- Backend: roles and permissions (e.g. can_access_admin, can_see_network, can_see_full_map); auth (login → role).
- Frontend: route guards and conditional nav/pages by role.
- No FaceNet/biometric in v1 unless required.

**Outcome:** Production-ready access control.

**Domain-specific AI:** Not specific to this phase; RBAC applies to all pages including Scenario Console.

---

### Phase 4 — Voice (Deepgram STT/TTS) — optional

**Goal:** Scenario Console supports voice input and optional voice output.

**Deliverables:**

- Deepgram: voice → transcript → same POST /api/agent/message; optional TTS for assistant reply.
- Same domain-specific AI and scenario_result; only the input/output channel changes.

**Outcome:** Hands-free use for operators.

**Domain-specific AI:** Unchanged; voice is an additional interface to it.

---

### Phase 5 — Later / optional

- **Unified AI Recommendations (site-wide):** Replace or augment current LLM recommendations with domain-specific AI so “AI Recommendations” page is driven by the same brain (reads state + model_outputs + playbooks, returns actions + why).
- **City Stress Index / “Why” / “What if I do nothing”:** Expose as first-class APIs and UI; powered by same domain-specific AI.
- **Model outsourcing:** Run TFT/GNN inference on a separate service (e.g. Lambda, Cloud Run) if inference remains a bottleneck after Phase 1a/1b.
- **AWS / Spark:** When scale or customer requires it.
- **WebRTC, FaceNet, etc.:** Per BRD/PRD when in scope.

---

## Summary Table: Order and Focus

| Order | Phase | Focus | Domain-specific AI |
|-------|--------|--------|--------------------|
| **0** | **0** | **Real TFT model** (TFT vs LSTM comparison meaningful) | — |
| **1st** | **1a** | Performance (cache, pre-compute) | — |
| **2nd** | **1b** | Kafka as main path (City Live) | — |
| **3rd** | **1c** | Navigation reorganization | — |
| **4th** | **2a** | Unified city state (optional) | Consumes state |
| **5th** | **2b** | Grounding DB + synthetic events | Uses as tools |
| **6th** | **2c** | **Domain-specific AI (orchestrator)** | **Build it here** |
| **7th** | **2d** | Agentic Scenario Console (new subtab) | **Front-end for it** |
| **8th** | **2e** | Agent Run Trace | Logs its steps |
| **9th** | **3a** | Scenario bank & evaluation | Same AI |
| **10th** | **3b** | Agentic execution (n8n) | Its actions → execution |
| **11th** | **3c** | RBAC & role-based views | — |
| **12th** | **4** | Voice (optional) | Same AI, voice I/O |
| **Later** | **5** | Recommendations takeover, Stress Index, outsourcing, AWS, etc. | Same AI powers more surfaces |

---

## Direct Answers

1. **Which phases first, second, etc.?**  
   First: **Phase 0** (real TFT model so TFT vs LSTM comparison is meaningful). Then **1a → 1b → 1c** (performance, Kafka, nav). Then **2a → 2b → 2c → 2d → 2e** (state, grounding, domain AI, Scenario Console, trace). Then **3a → 3b → 3c** (scenario bank, execution, RBAC). Then **4** (voice) and **5** (optional extras).

2. **Is domain-specific AI optional or mandatory?**  
   **Mandatory** for the Scenario Console and for the City Emergency Brain vision. It is the single layer that provides the output instead of showcasing each model.

3. **How will we build it?**  
   Rules + KG + tools (read model_outputs, active_events, service_outages, playbooks); intent classification; up to 3 clarifying questions; evidence-first; output scenario_result + assistant_reply + trace. No general-purpose LLM for core decisions.

4. **Where does it lie in the new Scenario Console idea?**  
   It is the **upper layer**: it runs **on top of** the models (reads their outputs) and **on top of** the grounding DB. In the new City Live “simulate scenarios” subtab, the domain-specific AI **is** the brain: user input → AI (with tools + playbooks) → one scenario_result + reply + trace. The UI shows **that** unified output; we do not show each model (TFT, GNN, etc.) in that tab — the domain-specific AI overtakes that and provides the single output.

Use this document as the single reference for phase order and for the role of domain-specific AI in the project.
