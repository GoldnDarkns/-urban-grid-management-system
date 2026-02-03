# Discussion Summary: Domain-Specific Agentic AI & Production Path

**Purpose:** Capture the key decisions and direction from our discussion so we can draft BRD, PRD, and TDD with a clear, shared baseline.

---

## 1. Vision

- **Holistic domain-specific AI** for urban management in crises — not just energy or AQI, but traffic, water, emergency services, resource allocation, integrated.
- **Agentic:** The AI doesn’t only recommend; it can **act** (trigger workflows, alerts, APIs), with human-in-the-loop where needed.
- **Testable:** We can **throw random/custom scenarios** at the AI and evaluate: How did it act? How did it resolve the situation? What solutions did it use? **Why?** That’s what makes the product stand out and “worth it.”
- **Production-level:** Role-based views (DB engineer, network engineer, mayor), clear architecture, and a path from current website to this next state.

---

## 2. Scenario-Based Testing (Core Differentiator)

- **Flow:** Ingest city data → compile → showcase current state. User/tester **creates random scenarios** (e.g. heatwave + hospital backup failed, gas leak + traffic jam). Scenarios are fed to the domain-specific AI. We evaluate: Did it act? How did it resolve? What did it do and why?
- **Why it matters:** Demonstrates value in a concrete way (“we test the AI on out-of-the-box scenarios”) and builds trust. Requires the AI to be trained (or rule-driven) on a good amount of city-related data so decisions have high confidence and accuracy.
- **Needs:** (1) A clear **scenario format** (structured or parsed from text), (2) AI that returns **actions + reasoning + (optional) simulated outcome**, (3) A **scenario bank** over time for regression testing and evaluation.

---

## 3. Upgrade Path: Current Website → Next State

| Current | Next |
|--------|-----|
| Data ingestion (Sim + City), analytics, ML models, LLM recommendations | **Unified city state** (one “City State” API: grid, AQI, traffic, incidents, zones, alerts) |
| No formal scenario testing | **Scenario input** (inject or override state for “what-if” / testing) |
| LLM for recommendations | **Domain-specific AI** (rules + KG + small models) → **actions + why** |
| No systematic testing of AI | **Scenario testing UI/API** → run scenario, get actions + resolution + why, judge and record |
| No execution | **Agentic execution** (e.g. n8n) when ready, with human-in-the-loop |

So: **unified state → scenario injection → domain AI (actions + why) → scenario testing → then execution.**

---

## 4. Infrastructure & “Handyman” Services

- **Keep:** Kafka (event stream), Spark (batch/stream), current stack (FastAPI, MongoDB, Neo4j).
- **Add when ready:** **n8n** (or similar) as execution layer: AI outputs actions → n8n runs them (alerts, APIs, workflows). Human-in-the-loop where needed.
- **AWS:** Not required for the core AI and scenario testing. Consider when: training at scale, managed Kafka/Spark, or customer requirement. Document as “optional / later” in TDD.
- **Kafka:** Already the “handyman” for events; can add topics for `scenario.execution` or `ai.actions` if needed.

---

## 5. Role-Based Views & Access

- **DB engineer** → Admin, database access, query tools.
- **Network engineer** → Connections, Kafka, topology.
- **Mayor / executive** → Full maps, logistics, stress index, high-level view.
- **Implementation:** RBAC (roles + permissions) on backend; frontend route guards and conditional UI by role. No need for FaceNet/biometric in v1; can add later as optional. Prioritize RBAC and role-based views for production.

---

## 6. Optional / Later

- **WebRTC** (real-time voice/video): Only if product explicitly needs it (e.g. operator–field collaboration).
- **Speech-to-speech / voice:** E.g. “What’s the situation in Zone 3?” → voice answer. Phase 2 if users need it.
- **FaceNet / face login:** Optional factor for personnel; RBAC first, then consider biometric if required.
- **AWS:** When scale or customer demands it.

---

## 7. What Goes Into BRD, PRD, TDD

- **BRD:** Who is it for (city managers, engineers, mayor)? What problem does it solve? What does “success” look like? Scenario-based testing and “AI that acts and explains” as differentiators. High-level scope and stakeholders.
- **PRD:** Features in order: unified state, scenario input, domain AI, scenario testing, evaluation/scenario bank, execution (n8n), RBAC. Optional features (voice, WebRTC, face) in later phases. Acceptance criteria for “AI worth it” (e.g. pass N scenarios, explain every action).
- **TDD:** Architecture (data flow, APIs, where Kafka/Spark/n8n sit), scenario format and storage, RBAC design, state model. No AWS in TDD unless we decide to adopt it.

---

## 8. Next Steps

1. Use this summary as the baseline for BRD, PRD, and TDD.
2. Draft **BRD outline** → fill in business context and success criteria.
3. Draft **PRD outline** → fill in features, phases, and acceptance criteria.
4. Draft **TDD outline** → fill in architecture, APIs, and technical design.

Once outlines are in place, we iterate on each document until they’re complete enough to follow as the “path to fruition.”
