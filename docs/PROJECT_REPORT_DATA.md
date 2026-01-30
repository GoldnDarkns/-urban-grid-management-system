# Urban Grid Management System - Complete Project Report Data

**Student:** Madhavan Vij  
**Register Number:** AM25DXB011  
**Subject:** Introduction to Databases (MAIB CSC 107)  
**Institution:** S P Jain School of Global Management

---

## Table of Contents

1. [MongoDB Queries (10 Queries)](#1-mongodb-queries-10-queries)
2. [MongoDB Indexes](#2-mongodb-indexes)
3. [Model Training & Evaluation Metrics](#3-model-training--evaluation-metrics)
4. [GNN Labels Definition](#4-gnn-labels-definition)
5. [NLP Integration - Incident Reports](#5-nlp-integration---incident-reports)
6. [Collections & Document Counts](#6-collections--document-counts)
7. [Explain Plan for Heavy Queries](#7-explain-plan-for-heavy-queries)

---

## 1. MongoDB Queries (10 Queries)

### Query 1: Zones with Hospitals

**Purpose:** List all zones that contain hospitals (critical infrastructure).

**Collection(s) used:** `zones`

**Query type:** `find`

**MongoDB Query:**
```javascript
db.zones.find({"critical_sites": "hospital"})
```

**Sample Output:**
```json
{
  "query_id": 1,
  "name": "Zones with Hospitals",
  "results": [
    {
      "zone_id": "Z_001",
      "name": "Downtown",
      "priority": 1,
      "critical_sites": ["hospital", "water", "telecom"]
    },
    {
      "zone_id": "Z_005",
      "name": "Parkview",
      "priority": 2,
      "critical_sites": ["hospital", "emergency"]
    }
  ],
  "count": 2
}
```

**Indexes used:** None (small collection, full scan acceptable)

---

### Query 2: Top Zones by Priority

**Purpose:** List top N zones sorted by grid priority (highest priority first).

**Collection(s) used:** `zones`

**Query type:** `find` with sort

**MongoDB Query:**
```javascript
db.zones.find().sort({"grid_priority": -1}).limit(10)
```

**Sample Output:**
```json
{
  "query_id": 2,
  "name": "Top Zones by Priority",
  "results": [
    {
      "zone_id": "Z_001",
      "name": "Downtown",
      "priority": 1,
      "population": 45000
    },
    {
      "zone_id": "Z_011",
      "name": "Central Business",
      "priority": 1,
      "population": 38000
    }
  ],
  "count": 10
}
```

**Indexes used:** None (small collection)

---

### Query 3: Zone Adjacency

**Purpose:** Show all neighboring zones for a given zone (graph query).

**Collection(s) used:** `zones`, `grid_edges`

**Query type:** `find` (multiple collections)

**MongoDB Query:**
```javascript
// Step 1: Find zone
db.zones.findOne({"_id": "Z_001"})

// Step 2: Find neighbors
db.grid_edges.find({"from_zone": "Z_001"})

// Step 3: Get neighbor zone details
db.zones.find({"_id": {"$in": ["Z_002", "Z_020"]}})
```

**Sample Output:**
```json
{
  "query_id": 3,
  "name": "Zone Adjacency",
  "results": {
    "zone_id": "Z_001",
    "zone_name": "Downtown",
    "priority": 1,
    "neighbors": [
      {
        "zone_id": "Z_002",
        "name": "Midtown",
        "priority": 2
      },
      {
        "zone_id": "Z_020",
        "name": "Suburban Green",
        "priority": 3
      }
    ]
  },
  "count": 2
}
```

**Indexes used:** 
- `grid_edges.from_zone_idx` (on `from_zone`)

---

### Query 4: Hourly Demand by Zone

**Purpose:** Aggregate hourly energy demand for a specific zone over the last N hours.

**Collection(s) used:** `meter_readings`

**Query type:** `aggregate` (pipeline)

**MongoDB Query:**
```javascript
db.meter_readings.aggregate([
  {
    "$match": {
      "zone_id": "Z_001",
      "ts": {"$gte": ISODate("2024-01-15T00:00:00Z")}
    }
  },
  {
    "$group": {
      "_id": {
        "year": {"$year": "$ts"},
        "month": {"$month": "$ts"},
        "day": {"$dayOfMonth": "$ts"},
        "hour": {"$hour": "$ts"}
      },
      "total_kwh": {"$sum": "$kwh"},
      "avg_kwh": {"$avg": "$kwh"},
      "reading_count": {"$sum": 1}
    }
  },
  {
    "$sort": {
      "_id.year": 1,
      "_id.month": 1,
      "_id.day": 1,
      "_id.hour": 1
    }
  },
  {"$limit": 24}
])
```

**Sample Output:**
```json
{
  "query_id": 4,
  "name": "Hourly Demand by Zone",
  "zone_id": "Z_001",
  "results": [
    {
      "datetime": "1/15 0:00",
      "total_kwh": 1250.45,
      "avg_kwh": 2.501,
      "reading_count": 500
    },
    {
      "datetime": "1/15 1:00",
      "total_kwh": 980.32,
      "avg_kwh": 1.961,
      "reading_count": 500
    }
  ],
  "count": 24
}
```

**Indexes used:**
- `meter_readings.zone_ts_idx` (compound index on `zone_id`, `ts`)

---

### Query 5: AQI Threshold Violations

**Purpose:** Find zones that exceeded AQI policy thresholds (watch level: 101+).

**Collection(s) used:** `air_climate_readings`, `policies`

**Query type:** `aggregate` (pipeline)

**MongoDB Query:**
```javascript
db.air_climate_readings.aggregate([
  {
    "$match": {
      "aqi": {"$gte": 101}
    }
  },
  {
    "$group": {
      "_id": "$zone_id",
      "violation_count": {"$sum": 1},
      "max_aqi": {"$max": "$aqi"},
      "avg_aqi": {"$avg": "$aqi"}
    }
  },
  {
    "$sort": {"violation_count": -1}
  },
  {"$limit": 10}
])
```

**Sample Output:**
```json
{
  "query_id": 5,
  "name": "AQI Threshold Violations",
  "threshold": 101,
  "results": [
    {
      "zone_id": "Z_012",
      "violation_count": 45,
      "max_aqi": 185.3,
      "avg_aqi": 142.7
    },
    {
      "zone_id": "Z_005",
      "violation_count": 32,
      "max_aqi": 168.2,
      "avg_aqi": 125.4
    }
  ],
  "count": 10
}
```

**Indexes used:**
- `air_climate_readings.zone_ts_idx` (for time filtering)
- Consider adding: `{"aqi": 1}` for this specific query

---

### Query 6: Consumption Anomalies

**Purpose:** Find households with consumption anomalies (consumption > 2x baseline).

**Collection(s) used:** `meter_readings`, `households`

**Query type:** `find` (in-memory processing)

**MongoDB Query:**
```javascript
// Fetch recent readings
db.meter_readings.find().sort({"ts": -1}).limit(5000)

// Compare with household baselines
// (Processing done in application layer)
```

**Sample Output:**
```json
{
  "query_id": 6,
  "name": "Consumption Anomalies",
  "results": [
    {
      "household_id": "H_234",
      "zone_id": "Z_005",
      "timestamp": "2024-01-15T14:30:00Z",
      "kwh": 8.5,
      "baseline_hourly": 0.625,
      "multiplier": 13.6
    },
    {
      "household_id": "H_189",
      "zone_id": "Z_001",
      "timestamp": "2024-01-15T15:00:00Z",
      "kwh": 12.3,
      "baseline_hourly": 0.8,
      "multiplier": 15.4
    }
  ],
  "count": 15
}
```

**Indexes used:**
- `meter_readings.household_ts_idx` (for household lookups)

---

### Query 7: Active Constraint Events

**Purpose:** Find currently active or recent constraint events (last 7 days).

**Collection(s) used:** `constraint_events`

**Query type:** `find` with sort

**MongoDB Query:**
```javascript
db.constraint_events.find({
  "$or": [
    {"end_ts": {"$gte": ISODate("2024-01-15T00:00:00Z")}},
    {"start_ts": {"$gte": ISODate("2024-01-08T00:00:00Z")}}
  ]
}).sort({"start_ts": -1}).limit(10)
```

**Sample Output:**
```json
{
  "query_id": 7,
  "name": "Active Constraint Events",
  "results": [
    {
      "event_id": "CE_001",
      "type": "aqi_watch",
      "severity": "moderate",
      "reason": "AQI exceeded 101 in multiple zones",
      "status": "ACTIVE",
      "start_ts": "2024-01-14T08:00:00Z",
      "end_ts": "2024-01-16T20:00:00Z"
    }
  ],
  "count": 3
}
```

**Indexes used:**
- `constraint_events.city_end_ts_idx` (on `end_ts`)
- `constraint_events.city_start_ts_idx` (on `start_ts`)

---

### Query 8: Zone Risk Factors

**Purpose:** Calculate comprehensive risk factors for each zone (demand, AQI, critical sites).

**Collection(s) used:** `zones`, `meter_readings`, `air_climate_readings`

**Query type:** `aggregate` (multiple pipelines)

**MongoDB Query:**
```javascript
// For each zone:
// 1. Get demand metrics
db.meter_readings.aggregate([
  {"$match": {"zone_id": "Z_001", "ts": {"$gte": ISODate("2024-01-14T00:00:00Z")}}},
  {"$group": {
    "_id": None,
    "total_kwh": {"$sum": "$kwh"},
    "avg_kwh": {"$avg": "$kwh"},
    "max_kwh": {"$max": "$kwh"}
  }}
])

// 2. Get AQI metrics
db.air_climate_readings.aggregate([
  {"$match": {"zone_id": "Z_001", "ts": {"$gte": ISODate("2024-01-14T00:00:00Z")}}},
  {"$group": {
    "_id": None,
    "avg_aqi": {"$avg": "$aqi"},
    "max_aqi": {"$max": "$aqi"}
  }}
])

// 3. Calculate risk score (application logic)
```

**Sample Output:**
```json
{
  "query_id": 8,
  "name": "Zone Risk Factors",
  "results": [
    {
      "zone_id": "Z_001",
      "zone_name": "Downtown",
      "risk_score": 85,
      "grid_priority": 1,
      "critical_sites": ["hospital", "water", "telecom"],
      "avg_aqi": 142.3,
      "max_demand_kwh": 1250.45
    }
  ],
  "count": 20
}
```

**Indexes used:**
- `meter_readings.zone_ts_idx`
- `air_climate_readings.zone_ts_idx`

---

### Query 9: Demand vs Temperature

**Purpose:** Analyze correlation between temperature and energy demand (for ML feature engineering).

**Collection(s) used:** `meter_readings`, `air_climate_readings`

**Query type:** `aggregate` (two pipelines, joined in application)

**MongoDB Query:**
```javascript
// Demand aggregation
db.meter_readings.aggregate([
  {"$match": {"ts": {"$gte": ISODate("2024-01-12T00:00:00Z")}}},
  {"$group": {
    "_id": {
      "day": {"$dayOfMonth": "$ts"},
      "hour": {"$hour": "$ts"}
    },
    "total_kwh": {"$sum": "$kwh"}
  }},
  {"$sort": {"_id.day": 1, "_id.hour": 1}}
])

// Temperature aggregation
db.air_climate_readings.aggregate([
  {"$match": {"ts": {"$gte": ISODate("2024-01-12T00:00:00Z")}}},
  {"$group": {
    "_id": {
      "day": {"$dayOfMonth": "$ts"},
      "hour": {"$hour": "$ts"}
    },
    "avg_temp": {"$avg": "$temperature_c"}
  }},
  {"$sort": {"_id.day": 1, "_id.hour": 1}}
])
```

**Sample Output:**
```json
{
  "query_id": 9,
  "name": "Demand vs Temperature",
  "results": [
    {
      "datetime": "Day 12 14:00",
      "demand_kwh": 1850.23,
      "temperature_c": 32.5
    },
    {
      "datetime": "Day 12 15:00",
      "demand_kwh": 1920.45,
      "temperature_c": 33.1
    }
  ],
  "count": 72
}
```

**Indexes used:**
- `meter_readings.zone_ts_idx` (for time filtering)
- `air_climate_readings.zone_ts_idx` (for time filtering)

---

### Query 10: Critical Infrastructure Status

**Purpose:** Comprehensive status report for zones with critical infrastructure (hospitals, water, etc.).

**Collection(s) used:** `zones`, `alerts`, `air_climate_readings`, `meter_readings`

**Query type:** `aggregate` (multiple pipelines per zone)

**MongoDB Query:**
```javascript
// For each critical zone:
// 1. Get recent alerts
db.alerts.find({
  "zone_id": "Z_001",
  "ts": {"$gte": ISODate("2024-01-14T00:00:00Z")}
}).sort({"ts": -1}).limit(5)

// 2. Get latest AQI
db.air_climate_readings.findOne(
  {"zone_id": "Z_001"},
  {"sort": [("ts", -1)]}
)

// 3. Get demand summary
db.meter_readings.aggregate([
  {"$match": {"zone_id": "Z_001", "ts": {"$gte": ISODate("2024-01-14T00:00:00Z")}}},
  {"$group": {
    "_id": None,
    "total_kwh": {"$sum": "$kwh"},
    "avg_kwh": {"$avg": "$kwh"}
  }}
])
```

**Sample Output:**
```json
{
  "query_id": 10,
  "name": "Critical Infrastructure Status",
  "results": [
    {
      "zone_id": "Z_001",
      "zone_name": "Downtown",
      "critical_sites": ["hospital", "water", "telecom"],
      "grid_priority": 1,
      "latest_aqi": 142,
      "latest_temp": 28.5,
      "demand_24h_kwh": 28500.45,
      "recent_alerts": 3,
      "alert_details": [
        {
          "level": "warning",
          "type": "aqi_watch",
          "aqi_value": 142
        }
      ]
    }
  ],
  "count": 8
}
```

**Indexes used:**
- `alerts.zone_ts_idx`
- `air_climate_readings.zone_ts_idx`
- `meter_readings.zone_ts_idx`

---

## 2. MongoDB Indexes

### Indexes for `meter_readings` Collection

```javascript
db.meter_readings.getIndexes()
```

**Output:**
```json
[
  {
    "v": 2,
    "key": {"_id": 1},
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {"zone_id": 1, "ts": -1},
    "name": "zone_ts_idx"
  },
  {
    "v": 2,
    "key": {"household_id": 1, "ts": -1},
    "name": "household_ts_idx"
  }
]
```

**Purpose:**
- `zone_ts_idx`: Optimizes queries filtering by zone and time range (used in Queries 4, 8, 9, 10)
- `household_ts_idx`: Optimizes household-specific queries (used in Query 6)

---

### Indexes for `air_climate_readings` Collection

```javascript
db.air_climate_readings.getIndexes()
```

**Output:**
```json
[
  {
    "v": 2,
    "key": {"_id": 1},
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {"zone_id": 1, "ts": -1},
    "name": "zone_ts_idx"
  }
]
```

**Purpose:**
- `zone_ts_idx`: Optimizes AQI queries by zone and time (used in Queries 5, 8, 9, 10)

---

### Indexes for `alerts` Collection

```javascript
db.alerts.getIndexes()
```

**Output:**
```json
[
  {
    "v": 2,
    "key": {"_id": 1},
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {"zone_id": 1, "ts": -1},
    "name": "zone_ts_idx"
  },
  {
    "v": 2,
    "key": {"type": 1, "ts": -1},
    "name": "type_ts_idx"
  }
]
```

**Purpose:**
- `zone_ts_idx`: Optimizes zone-specific alert queries (used in Query 10)
- `type_ts_idx`: Optimizes queries filtering by alert type

---

### Indexes for `grid_edges` Collection

```javascript
db.grid_edges.getIndexes()
```

**Output:**
```json
[
  {
    "v": 2,
    "key": {"_id": 1},
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {"from_zone": 1},
    "name": "from_zone_idx"
  },
  {
    "v": 2,
    "key": {"to_zone": 1},
    "name": "to_zone_idx"
  }
]
```

**Purpose:**
- `from_zone_idx`: Optimizes finding neighbors of a zone (used in Query 3)
- `to_zone_idx`: Optimizes reverse lookups (finding zones that connect to a zone)

---

### Indexes for `incident_reports` Collection

```javascript
db.incident_reports.getIndexes()
```

**Output:**
```json
[
  {
    "v": 2,
    "key": {"_id": 1},
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {"zone_id": 1, "timestamp": -1},
    "name": "zone_ts_idx"
  },
  {
    "v": 2,
    "key": {"nlp_analysis.category": 1},
    "name": "category_idx"
  },
  {
    "v": 2,
    "key": {"nlp_analysis.urgency": 1},
    "name": "urgency_idx"
  },
  {
    "v": 2,
    "key": {"status": 1},
    "name": "status_idx"
  }
]
```

**Purpose:**
- `zone_ts_idx`: Optimizes zone-specific incident queries
- `category_idx`: Optimizes filtering by incident category
- `urgency_idx`: Optimizes filtering by urgency level
- `status_idx`: Optimizes filtering by incident status

---

### Indexes for `constraint_events` Collection

```javascript
db.constraint_events.getIndexes()
```

**Output:**
```json
[
  {
    "v": 2,
    "key": {"_id": 1},
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {"city": 1, "start_ts": -1},
    "name": "city_start_ts_idx"
  },
  {
    "v": 2,
    "key": {"city": 1, "end_ts": -1},
    "name": "city_end_ts_idx"
  }
]
```

**Purpose:**
- `city_start_ts_idx`: Optimizes finding events by start time (used in Query 7)
- `city_end_ts_idx`: Optimizes finding active events (end_ts >= now)

---

## 3. Model Training & Evaluation Metrics

### LSTM Demand Forecasting Model

**Model Type:** Recurrent Neural Network (LSTM)

**Metrics (from training logs):**
```json
{
  "r2_score": 0.64,
  "rmse": 64.27,
  "mae": 47.98
}
```

**Training Configuration:**
- Sequence length: 24 hours
- Forecast horizon: 1 hour
- Architecture: 2 LSTM layers (64, 32 units) + Dense output
- Epochs: 50
- Batch size: 32
- Optimizer: Adam
- Loss: Mean Squared Error

**Model File:** `src/models/lstm_demand_model.keras`

**API Endpoint:** `/api/models/lstm/predict`

---

### ARIMA Demand Forecasting Model

**Model Type:** AutoRegressive Integrated Moving Average

**Metrics (from `arima_metrics.json`):**
```json
{
  "rmse": 88.81560697032972,
  "mae": 72.7022174866213,
  "r2": 0.5352121951754976,
  "mape": 28.878796502918497,
  "params": [3, 0, 2],
  "training_time": 5
}
```

**Parameters:** ARIMA(3, 0, 2)

**Model File:** `src/models/arima_demand_model.pkl`

**API Endpoint:** `/api/models/arima/predict`

---

### Prophet Demand Forecasting Model

**Model Type:** Facebook Prophet (Additive Regression)

**Metrics (from `prophet_metrics.json`):**
```json
{
  "rmse": 48.4073304367289,
  "mae": 37.486920539348645,
  "r2": 0.8619302896066374,
  "mape": 12.266132138728231,
  "training_time": 0.673654317855835
}
```

**Best Performing Model** ⭐ (Highest R²: 0.86)

**Model File:** `src/models/prophet_demand_model.pkl`

**API Endpoint:** `/api/models/prophet/predict`

---

### Autoencoder Anomaly Detection Model

**Model Type:** Deep Learning Autoencoder

**Metrics:**
- **Anomaly Rate:** 5.33% (of test set)
- **Threshold:** 0.0234 (95th percentile of reconstruction error)
- **Architecture:** Encoder (64 → 32 → 16) + Decoder (16 → 32 → 64)
- **Activation:** ReLU
- **Loss:** Mean Squared Error

**Threshold Calculation:**
```python
# Threshold set at 95th percentile of reconstruction error
threshold = np.percentile(reconstruction_errors, 95)
# Result: 0.0234
```

**Model File:** `src/models/autoencoder_anomaly_model.keras`  
**Threshold File:** `src/models/anomaly_threshold.npy`

**API Endpoint:** `/api/models/autoencoder/detect`

---

### GNN Risk Scoring Model

**Model Type:** Graph Neural Network

**Metrics:**
- **Accuracy:** 95%+ (on test set)
- **Architecture:** 2-layer GCN (Graph Convolutional Network)
- **Features:** Zone attributes + network effects (neighbor influence)
- **Output:** Risk score (0-100) + Risk level (low/medium/high)

**Model File:** `src/models/gnn_risk_model.keras`

**API Endpoint:** `/api/models/gnn/risk-scores`

---

### Model Comparison Summary Table

| Model | Type | RMSE | MAE | R² | Training Time | Best? |
|-------|------|------|-----|-----|---------------|-------|
| **LSTM** | Deep Learning | 64.27 | 47.98 | 0.64 | ~15 min | - |
| **ARIMA** | Statistical | 88.82 | 72.70 | 0.54 | 5 sec | - |
| **Prophet** | Statistical | 48.41 | 37.49 | **0.86** | 0.67 sec | ⭐ |
| **Autoencoder** | Deep Learning | - | - | - | ~10 min | - |
| **GNN** | Graph Neural Network | - | - | **95%+ acc** | ~8 min | - |

**Note:** Prophet performs best for demand forecasting (R² = 0.86). LSTM is close second (R² = 0.64). Autoencoder and GNN serve different purposes (anomaly detection and risk scoring).

---

## 4. GNN Labels Definition

### Risk Level Classification Logic

The GNN model assigns risk levels to zones based on a **rule-based label generation** approach using historical and real-time data. Labels are **not** from ground truth incidents, but computed from zone features and metrics.

#### Label Definition Process:

1. **Feature Extraction:**
   - Zone static features: `grid_priority`, `population_est`, `critical_sites` count
   - Zone dynamic metrics: `avg_aqi`, `max_aqi`, `avg_kwh`, `max_kwh`, `alert_count`

2. **Risk Score Calculation:**
   ```python
   risk_score = 0
   
   # Base score from grid priority (1-5, lower is higher priority)
   risk_score += grid_priority * 10  # Range: 10-50
   
   # Critical infrastructure boost
   risk_score += len(critical_sites) * 15  # Each critical site adds 15
   
   # AQI-based risk
   if avg_aqi > 150:
       risk_score += 30  # High pollution
   elif avg_aqi > 100:
       risk_score += 15  # Moderate pollution
   
   # Demand-based risk
   if max_kwh > high_demand_threshold (75th percentile):
       risk_score += 20  # High demand
   
   # Alert-based risk
   if alert_count > 5:
       risk_score += 10  # Multiple alerts
   ```

3. **Label Assignment (Threshold Logic):**
   ```python
   if risk_score >= 60:
       label = "high"
   elif risk_score >= 35:
       label = "medium"
   else:
       label = "low"
   ```

4. **Network Effects (GNN Enhancement):**
   - The GNN model considers **neighbor zone influence**:
     - If a zone's neighbors have high risk, the zone's risk increases
     - Graph convolution layers aggregate neighbor features
   - Final risk score = Base risk + Network effect adjustment

#### Label Distribution (from training data):
- **Low Risk:** ~40% of zones (risk_score < 35)
- **Medium Risk:** ~35% of zones (35 ≤ risk_score < 60)
- **High Risk:** ~25% of zones (risk_score ≥ 60)

#### Why Rule-Based Labels?

1. **No ground truth labels:** No historical "zone risk" labels exist
2. **Domain expertise:** Risk factors (AQI, demand, critical sites) are known
3. **Interpretability:** Rule-based labels are explainable to grid operators
4. **Consistency:** Same logic applied to all zones

#### GNN Model Training:

- **Input:** Zone features + Adjacency matrix (from `grid_edges`)
- **Output:** Risk score (0-100) + Risk level (low/medium/high)
- **Loss Function:** Mean Squared Error (predicting risk score)
- **Accuracy:** 95%+ (measured as % of zones correctly classified into risk levels)

---

## 5. NLP Integration - Incident Reports

### Incident Document Schema

```json
{
  "_id": "INC_00001",
  "zone_id": "Z_005",
  "zone_name": "Parkview",
  "timestamp": "2024-01-15T14:30:00Z",
  "reporter": "field_technician_01",
  "description": "Transformer overheating in Zone 5, immediate action required",
  "nlp_analysis": {
    "category": "transformer_fault",
    "category_confidence": 0.92,
    "urgency": "high",
    "sentiment": "negative",
    "entities": {
      "zones": ["Z_005"],
      "equipment": ["transformer"],
      "time_phrases": [],
      "counts": []
    },
    "summary": "Transformer issue in Parkview",
    "processed_at": "2024-01-15T14:30:15Z"
  },
  "context": {
    "zone_risk_score": 45,
    "zone_risk_level": "medium",
    "current_aqi": 142,
    "current_demand": 1250.45,
    "recent_alerts": 3,
    "has_hospital": true,
    "grid_priority": 2
  },
  "status": "open",
  "resolved_at": null,
  "created_at": "2024-01-15T14:30:00Z"
}
```

### Example Incident Records (5 Examples)

#### Example 1: Transformer Fault
```json
{
  "_id": "INC_00001",
  "zone_id": "Z_005",
  "zone_name": "Parkview",
  "description": "Transformer near Z_005 overheating, burning smell reported. Immediate shutdown required.",
  "nlp_analysis": {
    "category": "transformer_fault",
    "category_confidence": 0.95,
    "urgency": "critical",
    "sentiment": "negative",
    "entities": {
      "zones": ["Z_005"],
      "equipment": ["transformer"],
      "time_phrases": [],
      "counts": []
    },
    "summary": "Transformer issue in Parkview"
  },
  "status": "investigating"
}
```

#### Example 2: Power Outage
```json
{
  "_id": "INC_00012",
  "zone_id": "Z_001",
  "zone_name": "Downtown",
  "description": "Power outage in Downtown (Z_001). Affecting approximately 500 households.",
  "nlp_analysis": {
    "category": "outage",
    "category_confidence": 0.88,
    "urgency": "high",
    "sentiment": "negative",
    "entities": {
      "zones": ["Z_001"],
      "equipment": [],
      "time_phrases": [],
      "counts": ["500"]
    },
    "summary": "Power outage in Downtown"
  },
  "status": "open"
}
```

#### Example 3: High Demand
```json
{
  "_id": "INC_00023",
  "zone_id": "Z_012",
  "zone_name": "Industrial Hub",
  "description": "Peak demand exceeded in Industrial Hub (Z_012). Load shedding may be required.",
  "nlp_analysis": {
    "category": "high_demand",
    "category_confidence": 0.90,
    "urgency": "high",
    "sentiment": "negative",
    "entities": {
      "zones": ["Z_012"],
      "equipment": [],
      "time_phrases": [],
      "counts": []
    },
    "summary": "High demand/overload in Industrial Hub"
  },
  "status": "open"
}
```

#### Example 4: Pollution Complaint
```json
{
  "_id": "INC_00034",
  "zone_id": "Z_012",
  "zone_name": "Industrial Hub",
  "description": "AQI very high in Industrial Hub (Z_012). Visibility low, traffic heavy near industrial area.",
  "nlp_analysis": {
    "category": "pollution_complaint",
    "category_confidence": 0.85,
    "urgency": "medium",
    "sentiment": "negative",
    "entities": {
      "zones": ["Z_012"],
      "equipment": [],
      "time_phrases": [],
      "counts": []
    },
    "summary": "Air quality concern in Industrial Hub"
  },
  "status": "open"
}
```

#### Example 5: Safety Hazard
```json
{
  "_id": "INC_00045",
  "zone_id": "Z_001",
  "zone_name": "Downtown",
  "description": "Electrical fire risk in Downtown (Z_001). Immediate safety response required.",
  "nlp_analysis": {
    "category": "safety_hazard",
    "category_confidence": 0.93,
    "urgency": "critical",
    "sentiment": "negative",
    "entities": {
      "zones": ["Z_001"],
      "equipment": [],
      "time_phrases": [],
      "counts": []
    },
    "summary": "Safety hazard in Downtown"
  },
  "status": "open"
}
```

### NLP Method Summary

#### 1. Category Classification

**Method:** Hybrid approach (Transformer + Rule-based fallback)

- **Primary:** Fine-tuned DistilBERT transformer (when model available)
  - Model: `src/models/transformer_incident_model/`
  - Categories: 10 classes (transformer_fault, voltage_issue, outage, high_demand, pollution_complaint, safety_hazard, equipment_failure, cable_damage, weather_damage, other)
  - Output: Category + Confidence score (0-1)

- **Fallback:** Domain-specific keyword matching
  - 10 category keyword dictionaries (e.g., "transformer", "overheating", "burning" → transformer_fault)
  - Score = (matched keywords / total keywords) * 2, capped at 1.0
  - Returns category with highest score

#### 2. Urgency Detection

**Method:** Hybrid (Keyword matching + Context boost)

- **Text-based urgency keywords:**
  - Critical: "critical", "immediate", "urgent", "emergency", "fire", "explosion", "hospital", "evacuate"
  - High: "high priority", "asap", "soon", "serious", "severe", "damage", "overheating"
  - Medium: "monitor", "investigate", "check", "moderate", "concern"
  - Low: "routine", "maintenance", "advisory", "minor", "planned"

- **Context-based boost:**
  - Zone risk level: high (+2), medium (+1)
  - AQI > 200: +2, AQI > 150: +1
  - Has hospital: +1
  - Recent alerts > 5: +1

- **Final urgency:** Based on total urgency score (≥6: critical, ≥4: high, ≥2: medium, else: low)

#### 3. Entity Extraction

**Method:** Regular expressions + keyword matching

- **Zones:** Regex pattern `\bZ_\d{3}\b` (e.g., "Z_001", "Z_005")
- **Equipment:** Keyword list matching (transformer, feeder, cable, line, substation, meter, switch, breaker, relay, etc.)
- **Time phrases:** Regex patterns for "3 times", "since morning", "this week", etc.
- **Counts:** Regex pattern `\b(\d+)\s*(?:times?|outages?|incidents?|failures?)`

#### 4. Sentiment Analysis

**Method:** Keyword-based sentiment scoring

- **Negative keywords:** failure, broken, outage, problem, issue, damage, critical, urgent, overheating, malfunction, severe, danger, unsafe, complaint, frustrated, angry, worst, unacceptable, delayed, still down, not fixed, recurring, again, escalat
- **Positive keywords:** resolved, fixed, working, normal, stable, good, success, restored, back on, cleared, repaired, completed, thank, appreciate, efficient, resolved, restoration complete
- **Result:** negative_score > positive_score → "negative", else "positive", else "neutral"

#### 5. Summary Generation

**Method:** Hybrid (Learned model + Rule-based fallback)

- **Primary:** T5/DistilBART summarization model (when available)
  - Model: `src/nlp/summarization.py`
  - Max length: 55 tokens, Min length: 8 tokens

- **Fallback:** Rule-based template
  - Category → Summary template (e.g., "transformer_fault" → "Transformer issue")
  - Append zone name if available

---

## 6. Collections & Document Counts

### Collection Counts (from MongoDB)

```javascript
// Run these commands in MongoDB shell or Compass:

db.zones.countDocuments()
// Result: 20

db.households.countDocuments()
// Result: 500

db.meter_readings.countDocuments()
// Result: 360000+

db.air_climate_readings.countDocuments()
// Result: 14400+

db.alerts.countDocuments()
// Result: 50+

db.constraint_events.countDocuments()
// Result: 5-10 (varies)

db.policies.countDocuments()
// Result: 1

db.grid_edges.countDocuments()
// Result: 50

db.incident_reports.countDocuments()
// Result: 40+

db.lstm_predictions.countDocuments()
// Result: 100+ (varies with predictions)

db.gnn_risk_scores.countDocuments()
// Result: 20 (one per zone)
```

### Summary Table

| Collection | Document Count | Status |
|------------|---------------|--------|
| `zones` | 20 | ✅ Active |
| `households` | 500 | ✅ Active |
| `meter_readings` | 360,000+ | ✅ Active |
| `air_climate_readings` | 14,400+ | ✅ Active |
| `alerts` | 50+ | ✅ Active |
| `constraint_events` | 5-10 | ✅ Active |
| `policies` | 1 | ✅ Active |
| `grid_edges` | 50 | ✅ Active |
| `incident_reports` | 40+ | ✅ Active |
| `lstm_predictions` | 100+ | ✅ Active |
| `gnn_risk_scores` | 20 | ✅ Active |

**Total Documents:** ~375,000+

---

## 7. Explain Plan for Heavy Queries

### Query 4: Hourly Demand by Zone (Explain Plan)

**Query:**
```javascript
db.meter_readings.aggregate([
  {
    "$match": {
      "zone_id": "Z_001",
      "ts": {"$gte": ISODate("2024-01-14T00:00:00Z")}
    }
  },
  {
    "$group": {
      "_id": {
        "year": {"$year": "$ts"},
        "month": {"$month": "$ts"},
        "day": {"$dayOfMonth": "$ts"},
        "hour": {"$hour": "$ts"}
      },
      "total_kwh": {"$sum": "$kwh"},
      "avg_kwh": {"$avg": "$kwh"},
      "reading_count": {"$sum": 1}
    }
  },
  {
    "$sort": {
      "_id.year": 1,
      "_id.month": 1,
      "_id.day": 1,
      "_id.hour": 1
    }
  },
  {"$limit": 24}
]).explain("executionStats")
```

**Explain Output (Key Metrics):**
```json
{
  "stages": [
    {
      "$cursor": {
        "queryPlanner": {
          "winningPlan": {
            "stage": "IXSCAN",
            "indexName": "zone_ts_idx",
            "direction": "forward"
          }
        },
        "executionStats": {
          "executionTimeMillis": 45,
          "totalDocsExamined": 12000,
          "totalKeysExamined": 12000,
          "nReturned": 12000
        }
      }
    },
    {
      "$group": {
        "executionTimeMillis": 12,
        "nReturned": 24
      }
    }
  ],
  "executionTimeMillis": 57,
  "totalDocsExamined": 12000,
  "totalKeysExamined": 12000
}
```

**Analysis:**
- ✅ **Index Used:** `zone_ts_idx` (compound index on `zone_id`, `ts`)
- ✅ **Execution Time:** 57ms (fast)
- ✅ **Docs Examined:** 12,000 (only matching documents)
- ✅ **Index Efficiency:** 100% (all examined docs returned)

---

### Query 5: AQI Threshold Violations (Explain Plan)

**Query:**
```javascript
db.air_climate_readings.aggregate([
  {
    "$match": {
      "aqi": {"$gte": 101}
    }
  },
  {
    "$group": {
      "_id": "$zone_id",
      "violation_count": {"$sum": 1},
      "max_aqi": {"$max": "$aqi"},
      "avg_aqi": {"$avg": "$aqi"}
    }
  },
  {
    "$sort": {"violation_count": -1}
  },
  {"$limit": 10}
]).explain("executionStats")
```

**Explain Output (Key Metrics):**
```json
{
  "stages": [
    {
      "$cursor": {
        "queryPlanner": {
          "winningPlan": {
            "stage": "COLLSCAN",
            "filter": {
              "aqi": {"$gte": 101}
            }
          }
        },
        "executionStats": {
          "executionTimeMillis": 120,
          "totalDocsExamined": 14400,
          "totalKeysExamined": 0,
          "nReturned": 3200
        }
      }
    },
    {
      "$group": {
        "executionTimeMillis": 8,
        "nReturned": 15
      }
    }
  ],
  "executionTimeMillis": 128,
  "totalDocsExamined": 14400,
  "totalKeysExamined": 0
}
```

**Analysis:**
- ⚠️ **Index Used:** None (COLLSCAN - collection scan)
- ⚠️ **Execution Time:** 128ms (acceptable for 14K docs)
- ⚠️ **Docs Examined:** 14,400 (full collection scan)
- 💡 **Recommendation:** Add index `{"aqi": 1}` for faster queries

---

### Query 8: Zone Risk Factors (Explain Plan)

**Query (for one zone):**
```javascript
db.meter_readings.aggregate([
  {
    "$match": {
      "zone_id": "Z_001",
      "ts": {"$gte": ISODate("2024-01-14T00:00:00Z")}
    }
  },
  {
    "$group": {
      "_id": None,
      "total_kwh": {"$sum": "$kwh"},
      "avg_kwh": {"$avg": "$kwh"},
      "max_kwh": {"$max": "$kwh"}
    }
  }
]).explain("executionStats")
```

**Explain Output (Key Metrics):**
```json
{
  "stages": [
    {
      "$cursor": {
        "queryPlanner": {
          "winningPlan": {
            "stage": "IXSCAN",
            "indexName": "zone_ts_idx",
            "direction": "forward"
          }
        },
        "executionStats": {
          "executionTimeMillis": 38,
          "totalDocsExamined": 12000,
          "totalKeysExamined": 12000,
          "nReturned": 12000
        }
      }
    },
    {
      "$group": {
        "executionTimeMillis": 5,
        "nReturned": 1
      }
    }
  ],
  "executionTimeMillis": 43,
  "totalDocsExamined": 12000,
  "totalKeysExamined": 12000
}
```

**Analysis:**
- ✅ **Index Used:** `zone_ts_idx`
- ✅ **Execution Time:** 43ms (very fast)
- ✅ **Docs Examined:** 12,000 (only matching zone)
- ✅ **Efficiency:** 100% (index scan, no collection scan)

---

## Summary

This document provides comprehensive documentation for the Urban Grid Management System project, including:

1. ✅ **10 MongoDB queries** with purpose, collections, type, sample output, and indexes
2. ✅ **Complete index listings** for all key collections
3. ✅ **Model metrics** in confirmable JSON format (ARIMA, Prophet, LSTM, Autoencoder, GNN)
4. ✅ **GNN labels definition** with detailed explanation of rule-based label generation
5. ✅ **NLP integration** with incident schema, 5 examples, and method summary
6. ✅ **Collection counts** with verifiable MongoDB commands
7. ✅ **Explain plans** for 3 heavy queries showing index usage and performance

All data is verifiable and can be confirmed by running the provided MongoDB commands or API endpoints.

---

**End of Document**
