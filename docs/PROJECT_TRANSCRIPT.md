# Project Transcript: Urban Grid Management System

**Project:** Climate- and Constraint-Aware Urban Grid & Emission Management System  
**Phase:** Phase 1 - MongoDB Foundation  
**Date:** January 2026  
**Repository:** https://github.com/GoldnDarkns/-urban-grid-management-system

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Initial Requirements](#initial-requirements)
3. [Detailed System Specification](#detailed-system-specification)
4. [Phase 1 Requirements](#phase-1-requirements)
5. [Implementation Summary](#implementation-summary)
6. [Repository Setup](#repository-setup)

---

## Project Overview

### Course Requirements

**Course:** MAIB Introduction to Database  
**Institution:** SP Jain School of Global Management  
**Deliverable:** IEEE-format research report

**Project Requirements:**
- Design and implement a real-time NoSQL database solution using MongoDB
- Handle large-scale, distributed data
- Connect database to Deep Learning model for predictive analytics or anomaly detection
- Prepare final report in IEEE format suitable for research publication

**Technical Requirements:**
- MongoDB implementation (collections, documents, indexes)
- Architecture diagram showing MongoDB + Deep Learning integration
- 10 meaningful MongoDB queries
- Optimization techniques (indexing, query tuning, sharding/replication)
- Deep Learning integration using Python (TensorFlow/Keras)
- Document challenges and solutions (data consistency, scalability)
- IEEE-format report (Abstract, Introduction, Literature Review, Methodology, Results, Conclusion, References)

---

## Detailed System Specification

### The Final Idea: "Climate- and Constraint-Aware Urban Grid & Emission Management System"

#### Simple Definition

A city decision-support system that helps a city operate safely when conditions become abnormal:
- Extreme heatwaves
- Severe air pollution events (AQI spikes)
- Indoor advisories or lockdown-like constraints
- Any combination that triggers stress on the grid and public health

#### System Integrates

**Inputs:**
- Energy consumption (smart meters)
- Climate conditions (temperature, humidity)
- Air quality (AQI, PM2.5)
- Constraints/events (lockdown/advisory)
- Policy thresholds (AQI threshold levels and actions)

**Outputs:**
- Demand forecasts (predict peaks)
- Anomaly alerts (abnormal consumption patterns)
- Emission-control triggers (when AQI crosses threshold)
- DSM recommendations (demand-side management)
- Critical infrastructure protection plans
- Zone risk rankings (including ripple effects via GNN)
- What-if scenario comparisons

---

### The Real Business Problem

#### Reality A: Electricity Demand and Air Pollution are Linked

When people use more electricity (especially during heat):
- Power generation increases
- If fossil sources ramp up → emissions rise
- AQI worsens (especially PM2.5)
- Demand spikes and AQI spikes often occur together

#### Reality B: When AQI is High, City Cannot Just "Generate More"

When pollution is already high:
- City may be forced to restrict industrial activity
- Enforce traffic controls
- Reduce certain emissions
- Potentially shift generation mix
- These actions can restrict grid flexibility

**The Tension:**
- Need power to keep people safe indoors
- But producing more power can worsen pollution
- Emission restrictions can limit available supply options

#### Reality C: Under Extreme Conditions, Failure Risk Becomes Systemic

When grid is stressed:
- Transformers can overheat
- Local feeders can trip
- Voltage can drop
- Blackouts become more likely
- Failures can cascade (zone-to-zone effects)

---

### The Core Business Question

**"How can a city proactively manage electricity demand, emissions, and grid stability under extreme heat or constraints like lockdowns/indoor advisories, while automatically triggering emission control actions when AQI crosses thresholds—AND deciding which actions to take (DSM, restrictions) without risking critical infrastructure?"**

---

### The System's Core Logic (Cause-and-Effect Loop)

**Step-by-Step Chain:**

1. Heat increases OR lockdown/advisory begins
2. People stay indoors → AC + appliance usage rises
3. Residential electricity demand spikes
4. Increased generation ramps emissions → AQI increases
5. AQI crosses threshold → city triggers emission control policy
6. Emission control restricts some activities and generation flexibility
7. Grid becomes more fragile because:
   - Demand is high
   - Flexibility is constrained
   - Risk is uneven across zones
8. City must:
   - Protect hospitals and critical services
   - Recommend DSM actions to reduce demand
   - Decide best action plan via what-if simulation

---

### System Components (7 Major Modules)

#### Module 1: Monitoring & Data Collection (Real-time operational picture)

**What it ingests:**
- **A) Smart meter energy usage**
  - Household consumption (kWh per hour)
  - Zone aggregated load (sum of households)
- **B) Air quality readings**
  - AQI, PM2.5 (optionally PM10, NO2)
- **C) Climate readings**
  - Temperature, humidity (optionally wind speed)
- **D) Constraint Events**
  - "Indoor advisory" (people encouraged to stay home)
  - "Lockdown" (movement restricted)
  - Severity level (mild/moderate/severe)
  - Duration window
- **E) Zone metadata**
  - Population density
  - Baseline consumption
  - Presence of critical infrastructure (hospitals etc.)
  - Priority level

#### Module 2: Predictive Analytics (Deep Learning)

**Model 2A: Demand Forecasting (DL)**
- Inputs: Past demand history, temperature/humidity, AQI, constraint severity, time features
- Output: Next 1–3 hours demand (or next day)
- Model: LSTM/GRU (sequential + multi-factor + non-linear)

**Model 2B: Anomaly Detection (DL)**
- Detects abnormal consumption patterns
- Examples: Household consumption spikes, zone consumption anomalies
- May indicate: theft/tampering, meter failure, unusual load events
- Model: Autoencoder (learns "normal" patterns, flags deviations)

#### Module 3: Emission Control Trigger System (policy + thresholds)

**Core idea:** Cities define AQI thresholds and associated responses

**Example policy levels:**
- **Watch:** AQI ≥ 101 → public advisory
- **Alert:** AQI ≥ 151 → traffic restrictions + industrial emission limits
- **Emergency:** AQI ≥ 201 → stronger restrictions + demand response + protect critical loads

**What the system does:**
- Reads latest AQI per zone
- Identifies the policy level
- Triggers alert with recommended actions

#### Module 4: Residential Zone Risk Scoring (with network effects)

**Why zones need scoring:**
- Cities manage feeders, substations, neighborhoods (not individual households)
- Zones differ in: load patterns, vulnerability, critical infrastructure, historical outages

**Risk factors:**
- Current demand high relative to baseline
- Forecasted demand is high
- AQI is high (policy constraints)
- Temperature is high (heat stress)
- Constraint event severity is high
- High population density
- High grid priority / critical sites exist

**GNN Integration:**
- Captures "My risk depends on me AND my neighbors"
- If Zone A is overloaded, neighboring Zone B may be affected
- Zones treated as graph: nodes = zones, edges = adjacency
- Output = risk score class/level

#### Module 5: DSM (Demand Side Management) Recommendation Engine

**DSM triggers:**
- Demand forecast is high AND
- AQI policy level is Alert/Emergency OR supply flexibility is constrained

**DSM recommendations:**
- "Reduce heavy appliance usage 2–6 PM"
- "Delay EV charging to off-peak"
- "Commercial cooling restrictions during peak"
- "Encourage thermostat set-point changes"

**Constraint:** DSM must not harm hospitals, water supply, emergency services

#### Module 6: Critical Infrastructure Protection Logic

**Protected zones contain:**
- Hospitals
- Water pumping stations
- Emergency response units
- Telecom hubs

**What the system does:**
- Tags these zones as "protected"
- Lowers acceptable risk threshold for them
- Ensures DSM actions do not target them aggressively
- Ensures emergency planning prioritizes their stability

#### Module 7: What-if Scenario Simulator (decision support)

**Scenarios to simulate:**
- Scenario A: baseline (no controls)
- Scenario B: emission control only
- Scenario C: emission + DSM
- Scenario D: emission + DSM + indoor advisory continues
- Scenario E: emergency mode with critical protection maximum

**What is compared:**
- Predicted demand curve
- Predicted number of high-risk zones
- Risk level for critical zones (must be low)
- Estimated outage risk proxy
- Policy compliance (AQI actions triggered)

---

### Why MongoDB is Central

**MongoDB is justified because storing:**
- Huge sensor time-series
- Heterogeneous documents (not all sensors same fields)
- Distributed zone data
- Real-time alert logs
- Policies and events

**MongoDB supports:**
- High write rate ingestion
- Flexible schema
- Fast aggregation
- Scaling (sharding/replication)

---

### The Model Stack

**Implemented DL:**
- LSTM/GRU demand forecasting
- Autoencoder anomaly detection
- GNN (Spektral / TensorFlow) for zone risk propagation and scoring

**Optional ML:**
- Gradient boosting or logistic regression for outage probability proxy (not mandatory)

**Agreed:** Avoid overkill models like transformers/RL

---

### System Outputs

**Real-time outputs:**
- Current demand per zone
- Current AQI per zone
- Active constraints now
- Emission control triggers + action list
- DSM recommendations
- Critical infrastructure protection status
- Zone risk ranking (top 10)
- Anomaly alerts (household spikes)
- What-if scenario comparison table

---

## Phase 1 Requirements

### Goals for Phase 1 (Definition of Done)

1. Create a repo structure for a Python project that connects to MongoDB
2. Implement MongoDB connection using environment variables
3. Create / ensure collections:
   - zones
   - households
   - meter_readings
   - air_climate_readings
   - constraint_events
   - policies
   - alerts
   - grid_edges
4. Create indexes required for time-series performance
5. Create a seed script that inserts:
   - 20 zones (default) with realistic fields including critical infrastructure
   - 500 households distributed across zones
   - 1 AQI policy document with threshold levels + actions
   - Zone adjacency graph in grid_edges (ring + extra edges)
6. Create a sanity_check script that prints counts, sample documents, and neighbor list for a zone
7. Add README instructions to run everything locally

### Constraints

- Python only
- Use pymongo + python-dotenv
- Keep modules clean and separated
- Use clear logging/print statements
- Provide scripts runnable from command line
- Code must not assume MongoDB Atlas; must work with local MongoDB too
- No notebooks. No ML. No UI.

### Project Settings

- City name: "MetroCity" (default, configurable)
- Zones: 20 (default, configurable)
- Households: 500 (default, configurable)
- Zone IDs: "Z_001" to "Z_020"
- Household IDs: "H_000001" etc.

### Required Repo Structure

```
urban-grid-ai/
  README.md
  requirements.txt
  .env.example
  src/
    config.py
    db/
      mongo_client.py
      indexes.py
      seed_core.py
      sanity_check.py
    queries/
      basic_queries.py
```

### Implementation Details

**A) requirements.txt:**
- pymongo
- python-dotenv
- pydantic (optional)
- tqdm (optional)

**B) .env.example:**
```
MONGO_URI=mongodb://localhost:27017
MONGO_DB=urban_grid_ai
```

**C) src/config.py:**
- Loads env vars
- Defines DB name and city defaults
- Defines constants for zones/households counts
- Validates required env vars

**D) src/db/mongo_client.py:**
- Loads env
- Creates MongoClient
- Provides get_db() and ping() functions
- Fails fast with readable error if cannot connect

**E) src/db/indexes.py:**
- Function create_indexes(db) creates:
  - meter_readings: {zone_id:1, ts:-1} and {household_id:1, ts:-1}
  - air_climate_readings: {zone_id:1, ts:-1}
  - alerts: {zone_id:1, ts:-1} and {type:1, ts:-1}
  - constraint_events: {city:1, start_ts:-1} and {city:1, end_ts:-1}
  - grid_edges: {from_zone:1} and {to_zone:1}
- Print confirmation of each index created

**F) src/db/seed_core.py:**
- CLI arguments:
  - --reset (drop/clear collections before seeding)
  - --zones N (default 20)
  - --households N (default 500)
  - --city NAME (default MetroCity)
- Insert zones with fields:
  - _id (Z_###), city, name, population_est, critical_sites (list), grid_priority
  - At least 2 zones include "hospital" in critical_sites
  - Some zones include "water" or "telecom"
  - grid_priority higher (e.g., 5) if hospital exists
- Insert households with fields:
  - _id (H_######), zone_id, dwelling_type, solar_installed, baseline_kwh_daily
  - Distribute households across zones fairly
  - dwelling_type in ["apartment","villa","studio"]
  - solar_installed true for ~10-20%
  - baseline_kwh_daily depends on dwelling_type (villa higher)
- Insert policies:
  - Exactly one doc with _id="POL_AQI_CONTROL_V1"
  - Includes city, aqi_thresholds (watch/alert/emergency), demand_threshold_mw
- Insert grid_edges:
  - Create ring adjacency: Z_001-Z_002, ... Z_020-Z_001
  - Store undirected edges as two directed documents
  - Add extra edges (connect every 4th node to node+2)
- After seeding: call create_indexes(db), print final counts

**G) src/db/sanity_check.py:**
- Connect to db, ping
- Print counts for zones, households, policies, grid_edges
- Print one zone doc, one policy doc, 3 household docs
- Pick Z_001 and print its neighbors from grid_edges
- Exit with code 0 if everything exists, else non-zero

**H) src/queries/basic_queries.py:**
- List zones with hospitals
- List top 5 zones by grid_priority
- Show adjacency list for a given zone id

---

## Implementation Summary

### What Was Built

#### 1. Project Structure
- Complete repository scaffold with organized modules
- Configuration management with environment variables
- Clean separation of concerns (db, queries, config)

#### 2. MongoDB Setup
- Connection handler with proper error handling
- 8 collections created and ready:
  - `zones` - City zones with metadata
  - `households` - Residential units
  - `meter_readings` - Structure ready (empty for Phase 2)
  - `air_climate_readings` - Structure ready (empty for Phase 2)
  - `constraint_events` - Structure ready (empty for Phase 2)
  - `policies` - AQI threshold policies
  - `alerts` - Structure ready (empty for Phase 2)
  - `grid_edges` - Zone adjacency graph

#### 3. Indexes
- Time-series indexes for optimal query performance
- Graph query indexes for zone relationships

#### 4. Seed Data
- 20 zones with realistic names, population estimates, critical infrastructure
- 500 households distributed across zones by population
- AQI policy document with 3 threshold levels (Watch/Alert/Emergency)
- Zone adjacency graph (ring topology + extra edges)

#### 5. Validation Tools
- Sanity check script for database validation
- Basic query examples demonstrating MongoDB operations

### Files Created

1. **README.md** - Complete setup instructions
2. **requirements.txt** - Dependencies (pymongo, python-dotenv, pydantic, tqdm)
3. **.env.example** - Environment template
4. **.gitignore** - Python project ignore rules
5. **src/config.py** - Configuration & env loading
6. **src/db/mongo_client.py** - MongoDB connection handler
7. **src/db/indexes.py** - Time-series indexes
8. **src/db/seed_core.py** - Data seeding script
9. **src/db/sanity_check.py** - Validation script
10. **src/queries/basic_queries.py** - Sample queries
11. **PUSH_TO_GITHUB.md** - GitHub push instructions
12. **push_to_github.ps1** - Helper script for pushing

### Key Features

- **Environment-based configuration** - Works with local MongoDB and Atlas
- **Realistic seed data** - Zones with hospitals, households with varying consumption patterns
- **Graph structure** - Zone adjacency for future GNN implementation
- **Policy system** - AQI thresholds ready for emission control triggers
- **Time-series ready** - Indexes prepared for Phase 2 data ingestion

---

## Repository Setup

### GitHub Repository

**URL:** https://github.com/GoldnDarkns/-urban-grid-management-system

**Status:** Successfully pushed with all Phase 1 code

**Commits:**
1. Phase 1: MongoDB foundation setup - Collections, indexes, seed data, and validation scripts
2. Add GitHub push instructions and helper script

### Quick Start Commands

```bash
# Clone repository
git clone https://github.com/GoldnDarkns/-urban-grid-management-system.git
cd urban-grid-management-system

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure MongoDB
copy .env.example .env
# Edit .env with your MONGO_URI

# Seed database
python -m src.db.seed_core --reset

# Verify setup
python -m src.db.sanity_check

# Run basic queries
python -m src.queries.basic_queries
```

---

## Current Status

### Phase 1: ✅ COMPLETE

- ✅ Database foundation ready
- ✅ Data model defined and seeded
- ✅ Indexes created
- ✅ Connection working
- ✅ Repository on GitHub

### Phase 2+: 🔄 PENDING

- ⏳ Time-series data ingestion
- ⏳ Deep Learning model integration (LSTM, Autoencoder, GNN)
- ⏳ Real-time monitoring
- ⏳ Emission control trigger system
- ⏳ DSM recommendation engine
- ⏳ What-if scenario simulator

---

## Notes

- All code follows Python best practices with error handling and logging
- System is ready to run once MongoDB is configured
- Foundation is solid and ready for Phase 2 development
- Repository includes comprehensive documentation

---

**End of Transcript**
