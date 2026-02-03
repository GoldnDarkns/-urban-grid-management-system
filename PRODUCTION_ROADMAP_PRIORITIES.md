# Production Roadmap: Priority & Validity Analysis

**Goal:** Turn the Urban Grid Management System into a **production-level City Emergency Brain** that answers:
- What is failing now?
- What will fail next?
- Which zones are most vulnerable?
- Which infrastructure is at risk?
- What action reduces harm fastest?
- Why is the AI recommending this?
- What happens if I do nothing?

This document **categorizes your proposed additions by priority**, compares **what you already have vs. what’s proposed**, and assesses **validity and worth**. It also suggests **other ideas that may be more important** than some of the proposed ones.

---

## Priority Levels (How We Use Them)

| Level | Meaning | When to do |
|-------|--------|------------|
| **P0 – Must have** | Core to “Emergency Brain” value; existing tools don’t do this well. | First. |
| **P1 – Should have** | Strong impact on credibility and operator trust. | Next wave. |
| **P2 – Nice to have** | Improves completeness; can be phased. | After P0/P1. |
| **P3 – Later / optional** | Valuable but data-heavy or niche. | When capacity allows. |

---

## 1. ⚡ ENERGY & POWER GRID INPUTS

### What you already have
- **Demand & load:** Zone-level demand from `meter_readings` (Sim) and `processed_zone_data` / demand forecast (City). Hourly aggregation, demand by zone, TFT/LSTM/ARIMA/Prophet forecasts (1h+). **No** explicit kW/MW scale, **no** household/commercial/industrial split, **no** load ramp rate, **no** “critical load zones” as a first-class concept (you have `critical_sites` on zones, e.g. hospital).
- **Supply & generation:** `EnergyGridService` / EIA placeholder only (returns `demand_mw: None`). **No** power plant availability, renewable output, backup generator status, or battery storage.
- **Grid infrastructure:** **None** (no transformer load %, substation health, line congestion, voltage/frequency, live outages).
- **Grid constraints:** `constraint_events` (maintenance, capacity reduction); **no** N-1 contingency.

### What you proposed
- Demand: zone-level real-time demand (kW/MW), sector split, peak load forecasts (1h/6h/24h), load ramp rate, critical load zones (hospitals, airports).
- Supply: plant availability, renewable generation, backup generator status, battery storage.
- Infrastructure: transformer load %, substation health, line congestion, voltage/frequency stability, live outage reports.
- Constraints: maintenance, capacity reduction, N-1 contingency risk.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Zone-level demand (kW/MW), peak forecasts 1h/6h/24h | **P0** | ✅ Yes | You already have demand and forecasts; exposing scale (kW/MW) and multi-horizon is low effort, high clarity. |
| Critical load zones (hospitals, airports) as explicit input | **P0** | ✅ Yes | You have `critical_sites` (hospital, water, telecom, emergency). Formalize “critical load” and feed into risk and AI. |
| Load ramp rate | **P1** | ✅ Yes | Simple derivative of demand; helps “what will fail next” and stress detection. |
| Household/commercial/industrial split | **P1** | ✅ Yes | High value for demand response and equity; need proxy or external data (e.g. land use, tax). |
| Transformer load %, substation health, line congestion | **P1** | ✅ Yes | Core grid state; usually requires utility/SCADA or synthetic in Sim. |
| Power plant availability, renewable output, battery storage | **P1** | ✅ Yes | Supply side is missing; EIA/ISO APIs or synthetic. |
| N-1 contingency risk | **P1** | ✅ Yes | “If one line fails, cascade?”—emergency managers care; can start with graph (you have `grid_edges`). |
| Voltage/frequency stability, live outage reports | **P2** | ✅ Yes | Important but often utility-specific; add when data available. |
| Backup generator status | **P2** | ✅ Yes | Critical for hospitals/data centers; add with critical-infrastructure layer. |

**Other ideas that may be more important here:**  
- **Single “Grid stress index” (0–100)** that combines demand, constraints, and (when available) congestion/outages. That’s the one number an operator wants before diving into details. Prioritize this over adding every variable separately.

---

## 2. 🌍 ENVIRONMENT & CLIMATE INPUTS

### What you already have
- **Air quality:** AQI (Sim: `air_climate_readings` with aqi, pm25, pm10, temperature, humidity, wind_speed_kmh; City: AirVisual + Kaggle fallback). Alerts from AQI thresholds (watch/alert/emergency). **No** NO₂, SO₂, CO, O₃ as separate series; **no** pollution source attribution; **no** forecasted pollution spikes.
- **Weather:** OpenWeatherMap (temp, feels_like, pressure, humidity, wind). **No** heat index, rainfall intensity, flood probability, storm alerts, drought index.
- **Climate disaster:** **None** (no wildfire, dust storm, urban heat island, or climate anomaly alerts).

### What you proposed
- AQI components (PM2.5, PM10, NO₂, SO₂, CO, O₃), source attribution, forecasted spikes.
- Weather: temperature, heat index, wind, rainfall, flood probability, storm alerts, drought index.
- Climate: wildfire risk, dust storm risk, urban heat island, climate anomaly alerts.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Heat index / temperature thresholds (heatwave) | **P0** | ✅ Yes | Direct driver of demand and health; you have temp, add heat index and “heatwave” flag. |
| AQI components (PM2.5, PM10, O₃, NO₂) as inputs | **P0** | ✅ Yes | You have PM2.5/PM10 in places; expose consistently and use in alerts and AI. |
| Forecasted pollution spikes | **P1** | ✅ Yes | “What will fail next”; can start with simple persistence or external API. |
| Rainfall intensity, flood probability, storm alerts | **P1** | ✅ Yes | Evacuation and grid damage; OpenWeatherMap or NWS. |
| Urban heat island intensity | **P1** | ✅ Yes | Zone-level; land use + temp; differentiates you. |
| Wildfire / dust storm / drought index | **P2** | ✅ Yes | Regional; add when targeting those hazards. |
| Pollution source attribution (traffic vs industry) | **P2** | ⚠️ Maybe | Valuable but model-heavy; phase after core AQI. |

**Other ideas:**  
- **Single “Environmental stress index” (0–100)** combining AQI, heat, and (when available) flood/storm. Complements Grid stress and City stress.

---

## 3. 🚦 TRANSPORTATION & MOBILITY INPUTS

### What you already have
- TomTom traffic: `current_speed`, `free_flow_speed`, `road_closure`, confidence (per segment). Stored in `traffic_data`. **No** zone-level congestion index, incident-based closures, emergency vehicle delays, or traffic emission contribution.
- **No** public transport status, crowd density, evacuation routes, or bottleneck prediction.

### What you proposed
- Road congestion per zone, incident closures, emergency vehicle delays, traffic emissions.
- Metro/bus status, passenger density, service disruption alerts.
- Evacuation route capacity, travel time to shelters, bottleneck prediction.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Zone-level congestion / traffic stress | **P1** | ✅ Yes | Aggregate TomTom by zone; you have coordinates and zones. |
| Incident-based closures | **P1** | ✅ Yes | TomTom has `road_closure`; link to 311/incidents for “why.” |
| Evacuation route capacity / travel time to shelters | **P1** | ✅ Yes | Emergency managers care; need shelter GIS and routing (e.g. OSRM). |
| Traffic emission contribution | **P2** | ✅ Yes | Proxy from congestion + fleet mix; supports “City Emergency Brain” story. |
| Public transport status + disruption alerts | **P2** | ✅ Yes | GTFS-RT or agency APIs; city-dependent. |
| Bottleneck prediction | **P2** | ⚠️ Maybe | Useful; can follow after basic evacuation and congestion. |

**Other ideas:**  
- **“Mobility stress” (0–100)** per zone: congestion + closures + (optional) transit disruptions. One number for “can people and responders move?”.

---

## 4. 🏥 PUBLIC HEALTH & MEDICAL CAPACITY INPUTS

### What you already have
- **None.** No hospital load, ICU/ER, ambulance availability, vulnerable population index, or health alerts. Zones have `critical_sites` (e.g. hospital) but no occupancy or capacity.

### What you proposed
- Hospital load (ICU, ER crowding, ambulance availability, heatstroke/respiratory spikes).
- Vulnerable population (elderly, children, chronic disease, poverty).
- Health alerts (pollution advisories, heat emergencies, pandemic-style constraints).

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Vulnerable population index (elderly, children, poverty proxy) | **P0** | ✅ Yes | Census/tract data; you have population_service. Drives “who is at risk” and equity. |
| Health alerts (heat + AQI advisories) | **P0** | ✅ Yes | You have AQI and temp; generating “health advisory” from thresholds is low effort. |
| Hospital/ICU/ER load, ambulance availability | **P1** | ✅ Yes | Emergency managers care most; often requires health dept or synthetic. |
| Heatstroke / respiratory case spikes | **P2** | ✅ Yes | Correlate with temp/AQI; proxy or syndromic data. |

**Other ideas:**  
- **“Vulnerability score” per zone** combining vulnerable pop + AQI + heat. That matters more than raw hospital occupancy for “which zones to protect first” when data is limited.

---

## 5. 🚨 EMERGENCY INCIDENT & SAFETY INPUTS

### What you already have
- **311 / incidents:** City 311 API (NYC, Chicago, LA, SF), normalized; incident NLP (categories: transformer_fault, voltage_issue, outage, high_demand, pollution_complaint, safety_hazard, equipment_failure, cable_damage, weather_damage, other); urgency (critical/high/medium/low). **No** fire/power/industrial/gas/road as separate live streams; **no** fire station/police deployment or response times.
- **Real-time 311:** Stored and queryable; **no** complaint clustering, entity extraction (zone, asset, severity) in API response.

### What you proposed
- Incident streams: fire, power outage calls, industrial accidents, gas leaks, road accidents.
- Emergency services: fire station availability, police deployment, response times per zone.
- Real-time 311: complaint clustering, urgency classification, entity extraction (zone, asset, severity).

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Incident streams by type (fire, outage, gas, road) | **P0** | ✅ Yes | Your NLP already classifies; expose “streams” by category and feed into risk and AI. |
| Urgency classification | **P0** | ✅ Yes | You have it; expose and use in prioritization and “what is failing now.” |
| Entity extraction (zone, asset, severity) | **P1** | ✅ Yes | NLP + geocoding; improves “where” and “what.” |
| Complaint clustering | **P1** | ✅ Yes | Reduces noise; surface hotspots. |
| Fire/police availability and response times | **P2** | ✅ Yes | OSM has stations; response times need CAD or synthetic. |

**Other ideas:**  
- **“Incident stress” (0–100)** per zone: count and severity of open incidents. Combines with grid and env for City Stress.

---

## 6. 🏗️ CRITICAL INFRASTRUCTURE INPUTS

### What you already have
- **Zones:** `critical_sites`: hospital, water, telecom, emergency (from seed). **No** airports, water plants, data centers, government buildings as structured assets.
- **InfrastructureService (OSM):** hospitals, schools, universities, fire_stations, police. **No** asset-level state (power backup, cooling, flood exposure, security).

### What you proposed
- Critical assets: hospitals, airports, water plants, telecom, data centers, government buildings.
- Asset state: power backup duration, cooling failure risk, flood exposure, security risk.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Critical asset register (type, zone, location) | **P0** | ✅ Yes | You have OSM + zones; formalize list (hospitals, airports, water, etc.) and link to zones. |
| Asset risk state (flood exposure, power backup duration) | **P1** | ✅ Yes | Emergency managers prioritize this; start with flood zone + simple backup assumptions. |
| Cooling failure risk, security risk | **P2** | ✅ Yes | Add when you have data or proxies. |

**Other ideas:**  
- CISA/IRPF and EOC research say **identify critical assets and assess risk** first. Your **“Which infrastructure is at risk?”** is exactly this. Doing one **critical infrastructure layer** (assets + risk state) is more important than adding every possible grid variable before it.

---

## 7. 💧 WATER & SANITATION INPUTS

### What you already have
- **None.** No water supply, wastewater, or contamination alerts. Only “water” as a critical_site type on zones.

### What you proposed
- Water supply: reservoir levels, pump energy dependency, demand spikes (heatwave).
- Wastewater: flooded drainage risk, sewer overflow incidents.
- Contamination alerts.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Reservoir levels / supply stress | **P2** | ✅ Yes | Major city system; often agency API or manual. |
| Flooded drainage / sewer overflow | **P2** | ✅ Yes | Links to flood and rainfall; good for Gulf/coastal cities. |
| Water demand spikes (heatwave) | **P2** | ✅ Yes | Proxy from temp + population. |
| Contamination alerts | **P3** | ✅ Yes | When available. |

**Worth it:** Yes, but after P0/P1. Water is critical but usually second wave after power, health, and incidents.

---

## 8. 🏭 INDUSTRY & EMISSIONS CONTROL INPUTS

### What you already have
- Policies: `aqi_thresholds`, triggered actions (load_shifting, traffic_restriction, industrial_limit, etc.). **No** factory-level emissions, compliance violations, or green zones.

### What you proposed
- Factory emission output per zone, compliance violations.
- City actions: traffic restrictions, industrial shutdown triggers, green zone enforcement.
- Carbon/net-zero targets, emergency emission caps.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Policy rule inputs (AQI thresholds, demand response triggers) | **P0** | ✅ Yes | You already have policies; expose as “what the city will do” and feed into AI. |
| Traffic/industrial restrictions as “active actions” | **P1** | ✅ Yes | Show current restrictions and triggers; aligns with recommendations. |
| Factory emissions per zone / compliance | **P2** | ✅ Yes | Valuable; often regulator or synthetic. |
| Net-zero / emission caps | **P2** | ✅ Yes | For long-term and scenario planning. |

---

## 9. 🛰️ SENSOR NETWORK & IOT INPUTS

### What you already have
- **Effective “sensors”:** Meter readings (Sim), weather/AQI/traffic APIs (City). **No** unified sensor layer, satellite, or heat/fire/pollution plume tracking.

### What you proposed
- Real-time sensors: smart meters, air, noise, flood, crowd.
- Satellite: heat maps, fire detection, pollution plume tracking.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Smart meter / air sensor as “sensor feed” abstraction | **P1** | ✅ Yes | You have the data; labeling as sensor streams improves narrative and extensibility. |
| Satellite heat / fire / plume | **P2** | ✅ Yes | Differentiator; APIs exist (e.g. NASA FIRMS); add when focusing on wildfires. |

---

## 10. 🏙️ URBAN GEOSPATIAL & DIGITAL TWIN INPUTS

### What you already have
- Zones (boundaries, names, priority, critical_sites). City Map (2D), Simulation3D (3D). **No** land use, elevation, or flood zones as data layers; **no** scenario playback or “digital twin state” as a product.

### What you proposed
- GIS: zone boundaries, land use, elevation, flood zones, critical infrastructure map.
- Digital twin: real-time simulation parameters, scenario playback.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Zone boundaries + critical infrastructure map | **P0** | ✅ Yes | You have zones and OSM; one “official” map layer is enough for v1. |
| Land use (residential/industrial) | **P1** | ✅ Yes | Drives demand split and vulnerability; OSM or parcel data. |
| Elevation / flood zones | **P1** | ✅ Yes | Critical for “who is at risk” and infrastructure exposure. |
| Scenario playback / “what if” history | **P1** | ✅ Yes | “What happens if I do nothing?”—unique value; start with simple playback. |
| Full digital twin state | **P2** | ✅ Yes | Evolve from current 3D + playback. |

---

## 11. 📊 SOCIO-ECONOMIC & DEMOGRAPHIC INPUTS

### What you already have
- **Zones:** `population_est`. **City:** Census/population_service. **No** migration/commuter inflow, economic activity intensity, slum/high-risk housing, or vulnerable community score.

### What you proposed
- Population density, migration/commuter inflow, economic activity intensity.
- Risk equity: slum/high-risk housing, vulnerable community scoring.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Population density + vulnerable community score | **P0** | ✅ Yes | You have population; add vulnerability (elderly, poverty proxy) and use in risk and equity. |
| High-risk housing / slum zones | **P1** | ✅ Yes | Census + land use or municipal data. |
| Migration/commuter inflow, economic activity | **P2** | ✅ Yes | Harder data; add when available. |

---

## 12. 📡 COMMUNICATION & POLICY INPUTS

### What you already have
- **Policies:** AQI thresholds, risk weights. **No** emergency alerts sent, compliance rates, demand response triggers, load shedding priorities, legal restrictions, or override authority.

### What you proposed
- Public messaging: alerts sent, compliance rates.
- Policy rules: AQI thresholds, demand response triggers, load shedding priorities.
- Governance: legal restrictions, emergency override authority.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Policy rule inputs (triggers, priorities) | **P0** | ✅ Yes | You have policies; expose and use in AI and “why this recommendation.” |
| Load shedding / demand response priorities | **P1** | ✅ Yes | Core for “what action reduces harm fastest.” |
| Emergency alerts sent (and ideally compliance) | **P2** | ✅ Yes | When integrated with alerting system. |
| Legal restrictions / override authority | **P2** | ✅ Yes | Metadata for recommendations. |

---

## 13. 🤖 AI/ML META INPUTS

### What you already have
- Model outputs (TFT, LSTM, Autoencoder, GNN, etc.); AI recommendations (OpenRouter/Mistral) with project context. **No** structured forecast error history, incident resolution outcomes, operator overrides, or learning from past emergencies.

### What you proposed
- Model feedback: forecast error history, incident resolution outcomes, operator overrides.
- Continuous learning: past emergencies, action effectiveness, zone resilience tracking.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| Forecast error history (per model, per zone) | **P1** | ✅ Yes | Simple to log; improves “why trust this model” and model comparison. |
| Operator override / “what was done” | **P1** | ✅ Yes | Critical for learning and explanation; store action + outcome. |
| Action effectiveness scoring | **P1** | ✅ Yes | Did load shift reduce risk? Log and aggregate. |
| Past emergencies + resilience tracking | **P2** | ✅ Yes | Enables “what we learned” and better recommendations. |

---

## 14. 🧠 DOMAIN-SPECIFIC CITY AI CORE (Your Unique Edge)

### What you already have
- **Unified outputs:** Zone risk (GNN + analytics), alerts, anomalies, demand forecast, AI recommendations with natural language and project context. **No** single City Stress Index (0–100), Zone Resilience Score, Cascading Failure Probability, or Emergency Action Plan Generator as named products. **No** explicit “why this is happening” or “what if I do nothing” outputs.

### What you proposed
- City Stress Index (0–100).
- Zone Resilience Score.
- Cascading Failure Probability.
- Emergency Action Plan Generator.
- “Why this is happening” explanations.
- “What if I do nothing?” scenario.

### Priority & validity

| Item | Priority | Worth it? | Notes |
|------|----------|-----------|--------|
| City Stress Index (0–100) | **P0** | ✅ Yes | Combine grid + env + incident + (optional) mobility stress. **The** headline number. |
| Zone Resilience Score | **P0** | ✅ Yes | Inverse or complement of risk; “which zones can absorb shock.” |
| “Why this is happening” | **P0** | ✅ Yes | You have context; make AI output structured “reasons” (e.g. high AQI + heat → demand spike). |
| “What if I do nothing?” | **P0** | ✅ Yes | Simple scenario: run forecast forward with no action; show degradation. |
| Cascading Failure Probability | **P1** | ✅ Yes | N-1 + graph + load; “if X fails, then Y.” |
| Emergency Action Plan Generator | **P1** | ✅ Yes | Turn recommendations into step-by-step plans; extend current AI recommendations. |

**Other ideas:**  
- **Single “Executive summary” API:** one JSON with stress index, top 3 failing zones, top 3 at-risk assets, top 3 recommended actions, and one “why” and one “what if we do nothing.” That’s what an emergency manager wants in one glance. Prioritize that over more charts.

---

## Cross-cutting: What Emergency Managers Actually Want (Research)

From CISA IRPF, DHS EMOTR, FEMA EOC materials, and resilience frameworks:

1. **Critical infrastructure first:** Identify assets, assess risk, then monitor. Your infrastructure layer and “at-risk assets” support this.
2. **Lifelines:** Energy, water, transport, communications. You’re strong on energy and starting on others; water and transport are natural P1/P2.
3. **Cross-sector coordination:** One place that combines grid, env, health, incidents. Your “City Emergency Brain” and unified stress/resilience scores do that.
4. **Actionability:** Not just charts—recommendations, priorities, and “what if.” Your AI recommendations + action plan generator + “what if I do nothing?” speak to this.
5. **Explainability:** “Why is the AI saying this?”—your “why this is happening” and policy/trigger visibility address that.

So: your proposed direction matches what EOCs need. The main gap is **delivering it as a few clear outputs** (stress index, resilience score, executive summary, action plan, why, what-if) rather than only more input layers.

---

## Recommended order of implementation (high level)

1. **P0 – “Brain” outputs (differentiation)**  
   - City Stress Index (0–100) and Zone Resilience Score.  
   - “Why this is happening” and “What if I do nothing?” (and optional Executive summary API).  
   - Policy/trigger visibility and critical asset register + map.

2. **P0 – Inputs that feed the brain**  
   - Critical load zones (from existing `critical_sites`) and formalized critical asset list.  
   - Health alerts (heat + AQI) and vulnerable population index.  
   - Incident streams by type + urgency; AQI components + heat index.  
   - Zone-level demand (kW/MW) and multi-horizon forecasts.

3. **P1 – Next layer**  
   - Grid: load ramp, transformer/congestion/N-1 when data exists; supply (renewables, storage) placeholders or APIs.  
   - Env: forecasted pollution, rainfall/flood, storm, urban heat island.  
   - Transport: zone congestion, evacuation routes/shelters, incident closures.  
   - Health: hospital/ICU/ambulance when available.  
   - Infrastructure: asset risk state (flood, backup).  
   - AI meta: error history, overrides, action effectiveness.  
   - Cascading failure probability and Action Plan Generator.

4. **P2 / P3**  
   - Water, industry emissions, sensor abstraction, satellite, full digital twin, compliance and legal metadata, etc., as capacity and data allow.

---

## Summary table: Priority by theme

| Theme | P0 | P1 | P2 | P3 |
|-------|----|----|----|----|
| **Energy/Grid** | Demand scale & forecasts, critical load zones | Ramp rate, sector split, transformer/congestion, supply, N-1 | Voltage/frequency, outages, backup gen | — |
| **Environment** | Heat index, AQI components | Pollution forecast, rainfall/flood, storm, UHI | Wildfire, dust, drought, attribution | — |
| **Transport** | — | Zone congestion, closures, evacuation/shelters | Traffic emissions, transit, bottlenecks | — |
| **Health** | Vulnerable pop, health alerts | Hospital/ICU/ambulance | Case spikes | — |
| **Incidents** | Streams by type, urgency | Entity extraction, clustering | Fire/police availability, response times | — |
| **Infrastructure** | Asset register + map | Asset risk state | Cooling, security | — |
| **Water** | — | — | Supply, drainage, demand spikes | Contamination |
| **Industry/Policy** | Policy rules, triggers | Restrictions, priorities | Factory emissions, caps | — |
| **Sensors/IoT** | — | Sensor feed abstraction | Satellite heat/fire/plume | — |
| **GIS/Twin** | Zones + critical map | Land use, flood zones, playback | Full twin state | — |
| **Socio-economic** | Pop density, vulnerability score | High-risk housing | Migration, economic activity | — |
| **Comms/Policy** | Policy inputs | Load shedding, DR priorities | Alerts sent, compliance | Legal/override |
| **AI meta** | — | Error history, overrides, effectiveness | Past emergencies, resilience tracking | — |
| **City AI core** | Stress index, resilience score, “why”, “what if” | Cascading failure, action plan generator | — | — |

---

**Bottom line:**  
Your list is valid and well-aligned with production “City Emergency Brain” goals. The highest leverage is **P0 outputs** (City Stress Index, Zone Resilience Score, “why,” “what if,” executive summary) and **P0 inputs** that already exist or need small extensions (critical loads, health alerts, incident streams, AQI/heat, demand scale). Doing a few of these well will make the site feel production-grade; then layer in P1/P2 by data availability and user feedback.
