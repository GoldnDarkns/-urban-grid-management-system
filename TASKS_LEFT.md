# Tasks Left: Urban Grid Management System Upgrades

This list is derived from **PRODUCTION_ROADMAP_PRIORITIES.md**. It summarizes what’s left to build to reach a production-level “City Emergency Brain.”

---

## P0 – Must have (do first)

### “Brain” outputs (differentiation)
- [x] **City Stress Index (0–100)** – Single number combining demand, constraints, AQI, heat, incidents.
- [x] **Zone Resilience Score** – Inverse/complement of risk; “which zones can absorb shock.”
- [x] **“Why this is happening”** – Structured reasons (e.g. high AQI + heat → demand spike).
- [x] **“What if I do nothing?”** – Simple scenario: run forecast forward with no action; show degradation.
- [ ] **Policy/trigger visibility** – Show which rules/triggers fired.
- [ ] **Critical asset register + map** – Formal list and map of critical assets (you have `critical_sites`).

### Inputs that feed the brain
- [ ] **Critical load zones** – Formalize from existing `critical_sites` (hospitals, airports).
- [ ] **Health alerts** – Heat index + AQI thresholds (heatwave, unhealthy AQI).
- [ ] **Vulnerable population index** – Per zone or city.
- [ ] **Incident streams by type and urgency** – Structured incident feed.
- [ ] **AQI components + heat index** – PM2.5, PM10, O₃, NO₂; heat index from temp.
- [ ] **Zone-level demand (kW/MW) and multi-horizon forecasts** – Expose scale and 1h/6h/24h.

---

## P1 – Should have (next wave)

### Energy / grid
- [ ] Load ramp rate (derivative of demand).
- [ ] Household/commercial/industrial split (proxy or external data).
- [ ] Transformer load %, substation health, line congestion (utility/SCADA or synthetic).
- [ ] Power plant availability, renewable output, battery storage (EIA/ISO or placeholders).
- [ ] N-1 contingency risk (“if one line fails, cascade?”).

### Environment
- [ ] Forecasted pollution spikes.
- [ ] Rainfall, flood probability, storm alerts (OpenWeatherMap/NWS).
- [ ] Urban heat island intensity (zone-level).

### Transport
- [ ] Zone-level congestion / traffic stress (aggregate TomTom by zone).
- [ ] Incident-based closures (link TomTom + 311/incidents).
- [ ] Evacuation route capacity / travel time to shelters (shelter GIS + routing).

### Health
- [ ] Hospital/ICU/ambulance when data available.

### Infrastructure
- [ ] Asset risk state (flood, backup).

### AI meta
- [ ] Error history, overrides, action effectiveness.

### City AI core
- [ ] **Cascading failure probability** – N-1 + graph + load.
- [ ] **Emergency Action Plan Generator** – Turn recommendations into step-by-step plans.
- [ ] **Executive summary API** – One JSON: stress index, top 3 failing zones, top 3 at-risk assets, top 3 actions, one “why,” one “what if we do nothing.”

---

## P2 / P3 – Nice to have (later)

- Voltage/frequency stability, live outage reports, backup generator status.
- Wildfire / dust storm / drought index.
- Traffic emissions, public transport status, bottleneck prediction.
- Water supply/drainage, industry emissions, sensor abstraction, satellite, full digital twin, compliance metadata.

---

## Recommended order (high level)

1. **P0 “Brain” outputs** – Stress index, resilience score, “why,” “what if,” policy visibility, critical asset register + map.
2. **P0 inputs** – Critical loads, health alerts, vulnerable pop, incident streams, AQI/heat, demand scale + multi-horizon.
3. **P1** – Grid (ramp, congestion, supply), env (forecast, flood, UHI), transport (congestion, closures, evacuation), health/infra/AI meta, cascading failure, action plan generator, executive summary API.
4. **P2/P3** – As capacity and data allow.

---

## Already done (reference)

- TFT, LSTM, Autoencoder, GNN models; model overview and predictions.
- City Live / Simulated modes; zone processing; Kafka pipeline; Neo4j KG.
- Agent/Scenario Console (domain AI); grounding (asset registry, playbooks, synthetic events).
- City Map with pan/zoom and “Fit all zones”; CORS and backend healthcheck; MODEL_STORAGE_AND_FLOW doc.

Use this file to track remaining work and reprioritize as needed.
