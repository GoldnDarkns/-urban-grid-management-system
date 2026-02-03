# Outlines: BRD, PRD, TDD

Use these as skeletons to fill in. Base context: **DISCUSSION_SUMMARY.md**.

---

# Part 1: BRD Outline (Business Requirements Document)

## 1. Executive Summary
- [ ] One-paragraph overview of the product and its purpose
- [ ] Key differentiator: holistic domain-specific agentic AI, testable on random scenarios

## 2. Business Context
- [ ] **Problem statement:** What problem does this solve for cities / emergency managers?
- [ ] **Current state:** Brief description of the existing Urban Grid Management System
- [ ] **Desired state:** City Emergency Brain — unified state, scenario testing, domain AI that acts and explains

## 3. Stakeholders & Users
- [ ] **Primary:** City / emergency managers, operators
- [ ] **Secondary:** DB engineer (admin, DB access), network engineer (connections, topology), mayor / executive (maps, logistics, high-level)
- [ ] **Other:** Citizens (if applicable), partners (if applicable)

## 4. Business Objectives
- [ ] Objective 1: (e.g. Provide a single, testable AI for urban crisis decision support)
- [ ] Objective 2: (e.g. Enable scenario-based validation of AI behavior)
- [ ] Objective 3: (e.g. Support role-appropriate views for different personnel)
- [ ] Add more as needed

## 5. Success Criteria
- [ ] **“AI worth it”:** (e.g. We can throw random crises at the AI and it responds with correct, explainable actions)
- [ ] **Measurable:** (e.g. Pass N curated scenarios; every action has a traceable “why”)
- [ ] **Production:** Role-based access working; scenario testing available to operators or QA

## 6. Scope (In / Out)
- [ ] **In scope:** Unified city state, scenario input & testing, domain-specific AI (actions + why), agentic execution (n8n), RBAC and role-based views
- [ ] **Out of scope (for initial release):** (e.g. Full AWS migration, WebRTC, speech, face login — or list as “later”)

## 7. Assumptions & Constraints
- [ ] Assumptions: (e.g. City data is available via current APIs / Kafka; operators will use scenario testing to validate AI)
- [ ] Constraints: (e.g. Budget, timeline, compliance, data privacy)

## 8. Risks & Mitigations
- [ ] Risk 1 / Mitigation
- [ ] Risk 2 / Mitigation

## 9. Approval & Sign-off
- [ ] Roles that must approve (e.g. Product Owner, Tech Lead)
- [ ] Placeholder for signatures / dates

---

# Part 2: PRD Outline (Product Requirements Document)

## 1. Product Overview
- [ ] Product name and one-line description
- [ ] Link to BRD (business objectives and success criteria)

## 2. User Personas & Jobs to Be Done
- [ ] **Persona 1 (e.g. City Manager):** Goals, pain points, how this product helps
- [ ] **Persona 2 (e.g. DB Engineer):** Goals, pain points, how this product helps
- [ ] **Persona 3 (e.g. Mayor):** Goals, pain points, how this product helps
- [ ] Jobs to be done: (e.g. “Run a random scenario and see how the AI resolves it”)

## 3. Features & Requirements (Prioritized)

### Phase 1: Foundation
- [ ] **F1 – Unified City State**
  - Description: Single aggregated view of grid, AQI, traffic, incidents, zones, alerts
  - Acceptance criteria: API returns City Stress Index (or equivalent) and per-zone metrics; UI can “showcase” current state
  - Dependencies: Existing data sources (MongoDB, Kafka, APIs)
- [ ] **F2 – Scenario Input**
  - Description: Ability to inject or override state (e.g. “AQI 180 in Z_003, hospital backup failed”)
  - Acceptance criteria: Scenario can be submitted via API and/or UI; system reasons on “real + overrides”
  - Dependencies: F1
- [ ] **F3 – Domain-Specific AI (Actions + Why)**
  - Description: Rules + KG + (optional) small models → recommended actions + structured reasoning
  - Acceptance criteria: For any given state (live or scenario), AI returns prioritized actions and “why” (rule id + parameters or natural explanation)
  - Dependencies: F1, scenario format defined in TDD
- [ ] **F4 – Scenario Testing UI / API**
  - Description: Submit scenario → get actions + resolution + why → judge and (optional) record
  - Acceptance criteria: Tester can create scenario, run AI, see actions and explanation; optional “good/bad” or rating
  - Dependencies: F2, F3

### Phase 2: Execution & Production Readiness
- [ ] **F5 – Scenario Bank & Evaluation**
  - Description: Curated set of scenarios for regression and evaluation
  - Acceptance criteria: Scenarios stored; can run batch and compare outcomes (e.g. pass/fail or score)
  - Dependencies: F4
- [ ] **F6 – Agentic Execution**
  - Description: Selected AI actions can trigger real workflows (e.g. n8n): alerts, APIs, tasks
  - Acceptance criteria: Human-in-the-loop for high-stakes actions; audit log of what was executed
  - Dependencies: F3, n8n or equivalent
- [ ] **F7 – RBAC & Role-Based Views**
  - Description: Roles (e.g. DB engineer, network engineer, mayor) with different permissions and UI views
  - Acceptance criteria: Login → role → appropriate routes and data; DB engineer sees admin/DB; network sees connections; mayor sees full maps/logistics
  - Dependencies: Auth, backend permissions, frontend route guards

### Phase 3 (Optional / Later)
- [ ] **F8 – Voice / WebRTC / Face login:** As per BRD scope; add acceptance criteria when in scope

## 4. User Stories (Sample — Expand as Needed)
- [ ] As a city manager, I can run a random scenario and see how the AI acts and why, so that I trust it in real crises.
- [ ] As a DB engineer, I can access admin and database tools, so that I can manage data and queries.
- [ ] As the mayor, I can see the full map and logistics view, so that I have a high-level picture of the city state.
- [ ] As an operator, I can approve or reject AI-suggested actions before they execute, so that we keep human-in-the-loop.

## 5. Non-Functional Requirements
- [ ] **Performance:** (e.g. Scenario run returns within X seconds)
- [ ] **Security:** RBAC, audit log for actions, no sensitive data to third-party LLM if domain AI is used)
- [ ] **Availability:** (e.g. Target uptime if applicable)
- [ ] **Explainability:** Every AI action has a traceable “why”

## 6. Out of Scope (for This PRD)
- [ ] List items from BRD “out of scope” or “later”

## 7. Success Metrics (Link to BRD)
- [ ] Pass N scenarios with explainable actions
- [ ] Role-based access in production
- [ ] (Add metrics you will track)

## 8. Open Questions / TBD
- [ ] Items to resolve before or during development

---

# Part 3: TDD Outline (Technical Design Document)

## 1. Document Control
- [ ] Version, date, author
- [ ] Link to PRD and BRD

## 2. Architecture Overview
- [ ] **High-level diagram:** Ingest (APIs, Kafka) → Unified State (service/API) → Domain AI (rules + KG + models) → Actions → Execution (n8n) and/or Scenario Testing
- [ ] **Components:** Backend (FastAPI), MongoDB, Neo4j, Kafka, Spark (existing), n8n (new when execution is added), Frontend (React)
- [ ] **Data flow:** How “current state” is built; how “scenario” overrides state; how AI reads state and writes actions

## 3. Unified City State
- [ ] **State model:** What fields (e.g. per-zone: demand, AQI, risk, alerts; global: stress index, critical incidents)
- [ ] **State API:** e.g. `GET /api/city-state?city_id=...` (live) and `POST /api/city-state/scenario` (submit scenario, get state with overrides)
- [ ] **Sources:** MongoDB collections, Kafka consumers, external APIs — list and how they feed state
- [ ] **Storage:** Where state is computed (on-demand vs cached); where scenario overrides are stored (e.g. in-memory for run, or DB for scenario bank)

## 4. Scenario Format & Storage
- [ ] **Scenario schema:** e.g. JSON with `overrides` (zone_id, metric, value), optional free text, optional “expected outcome” for evaluation
- [ ] **API:** `POST /api/scenarios/run` (body: scenario) → returns actions + why + (optional) simulated outcome
- [ ] **Scenario bank:** Collection or store for saved scenarios; used for regression and evaluation
- [ ] **Evaluation:** How “good” is measured (e.g. expert rating, checklist, stress delta); where results are stored

## 5. Domain-Specific AI
- [ ] **Inputs:** Unified state (live or scenario)
- [ ] **Logic:** Rules engine + Neo4j (and optional small models); no general-purpose LLM for core decisions
- [ ] **Outputs:** List of actions (type, target, params) + per-action “why” (rule id, triggered conditions)
- [ ] **Interface:** e.g. `POST /api/ai/decide` (body: state or scenario_id) → { actions, reasoning }
- [ ] **Training data (if any):** City scenarios, policies, past responses; where stored and how used

## 6. Agentic Execution
- [ ] **Trigger:** When an action is “approved” (human-in-the-loop) or auto-executed (low risk)
- [ ] **Mechanism:** n8n webhook or API call from backend; n8n runs workflow (alert, API, task)
- [ ] **Audit:** Log every executed action (who, when, what, outcome if available)
- [ ] **Kafka (optional):** Topic `ai.actions` or `scenario.execution` for event-driven execution

## 7. RBAC & Role-Based Views
- [ ] **Roles:** e.g. `city_manager`, `db_engineer`, `network_engineer`, `mayor`
- [ ] **Permissions:** Matrix (role × resource/action); e.g. db_engineer → admin, data editor; network_engineer → connections, Kafka view; mayor → full map, logistics, read-only stress
- [ ] **Backend:** Middleware or decorator that checks role/permission per route
- [ ] **Frontend:** Route guards; conditional nav and pages by role; API sends role or permissions after login
- [ ] **Auth:** How login works (e.g. JWT, session); where roles are stored (user document, IDP)

## 8. Infrastructure
- [ ] **Current:** FastAPI, MongoDB, Neo4j, Kafka, Spark, React — keep as-is for Phase 1–2
- [ ] **Add:** n8n (self-hosted or cloud) for execution
- [ ] **AWS:** “Optional / later” — e.g. for training at scale, managed Kafka/Spark; document when to revisit
- [ ] **Deployment:** Docker Compose (current); note if Kubernetes or cloud deployment is planned

## 9. APIs Summary (New or Changed)
- [ ] `GET /api/city-state` — unified state (live)
- [ ] `POST /api/city-state/scenario` — state with scenario overrides
- [ ] `POST /api/scenarios/run` — run scenario, get actions + why
- [ ] `POST /api/ai/decide` — (optional) direct “decide” from state
- [ ] Scenario bank: `GET/POST /api/scenarios` (list, create, get by id)
- [ ] Execution: internal call to n8n or `POST /api/actions/execute` (with approval flow)
- [ ] RBAC: auth endpoints; role in token or `GET /api/me` with permissions

## 10. Data Model (Key Entities)
- [ ] **CityState:** (logical) aggregated state; may not be a single collection — describe how it’s built
- [ ] **Scenario:** id, name, overrides (JSON), created_at, optional expected_outcome
- [ ] **ScenarioRun:** scenario_id, state_snapshot, actions_returned, reasoning, outcome/rating, timestamp
- [ ] **User / Role:** user id, role, permissions (if stored in DB)
- [ ] **ActionLog:** action, role/user, approved_by, executed_at, result (for audit)

## 11. Security & Compliance
- [ ] **Data:** What stays on-prem vs third-party; no PII to LLM if using domain AI only
- [ ] **Audit:** Action execution and scenario runs logged for compliance
- [ ] **RBAC:** Least privilege per role

## 12. Risks & Mitigations (Technical)
- [ ] e.g. n8n downtime → queue actions and retry; state computation slow → cache with TTL

## 13. Open Points / TBD
- [ ] Items to resolve during implementation

---

# How to Use These Outlines

1. **BRD:** Fill in sections 1–9 with your business context, stakeholders, and success criteria. Get sign-off before locking PRD.
2. **PRD:** Fill in features (F1–F7+) with detailed acceptance criteria; add user stories. Keep in sync with BRD scope.
3. **TDD:** Fill in architecture, state model, scenario schema, APIs, RBAC matrix, and data model. Keep in sync with PRD features.

Iterate on each doc until they’re complete enough to drive development. Use **DISCUSSION_SUMMARY.md** as the single source of “what we agreed” when in doubt.
