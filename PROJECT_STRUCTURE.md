# Project Structure

## 📁 Root Directory

```
-urban-grid-management-system/
├── README.md                    # Main project documentation
├── requirements.txt             # Python dependencies
├── test_mongodb_connection.py   # MongoDB connection test script
├── push_to_github.ps1           # Git push script
│
├── backend/                     # FastAPI Backend
│   ├── main.py                  # API entry point
│   └── routes/                  # API routes
│       ├── data.py              # Data endpoints
│       ├── analytics.py         # Analytics endpoints
│       ├── models.py            # ML model endpoints
│       ├── incidents.py         # Incident report endpoints
│       └── simulations.py       # Simulation endpoints
│
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── pages/               # Page components (14 pages)
│   │   ├── components/          # Reusable components
│   │   └── services/            # API client
│   └── package.json
│
├── src/                         # Python ML & Database
│   ├── config.py                # Configuration
│   ├── db/                      # Database modules
│   │   ├── mongo_client.py      # MongoDB connection
│   │   ├── seed_core.py         # Core data seeding
│   │   ├── ingest_real_data.py # Real data ingestion
│   │   └── ...
│   ├── models/                  # ML models
│   │   ├── lstm_demand_forecast.py
│   │   ├── autoencoder_anomaly.py
│   │   └── gnn_risk_scoring.py
│   ├── nlp/                     # NLP processing
│   └── queries/                 # MongoDB queries
│
├── data/                        # Datasets
│   ├── README.md                # Data instructions
│   └── *.csv                    # Data files
│
└── docs/                        # 📚 All Documentation
    ├── README.md                # Documentation index
    ├── PROJECT_STATUS.md        # Project status
    ├── PROJECT_REVIEW.md        # Technical review
    ├── PROJECT_TRANSCRIPT.md    # Original requirements
    ├── CURRENT_STATUS.md        # Current status
    ├── COMMERCIAL_PRODUCTION_ROADMAP.md
    ├── PRODUCTION_FEATURES_RECOMMENDATIONS.md
    │
    ├── analysis/                # Analysis & Planning
    │   ├── GRID_MANAGER_ANALYSIS.md
    │   ├── CURRENT_STATE_ANALYSIS.md
    │   ├── IMPROVEMENT_ROADMAP.md
    │   ├── DATABASE_ALTERNATIVES.md
    │   ├── HYBRID_ARCHITECTURE.md
    │   └── COST_BREAKDOWN.md
    │
    ├── guides/                  # How-to Guides
    │   ├── TRAIN_ARIMA_PROPHET.md
    │   ├── TRAIN_TRANSFORMER_NLP.md
    │   ├── PUSH_TO_GITHUB.md
    │   └── NLP_INTEGRATION_DISCUSSION.md
    │
    └── troubleshooting/         # Troubleshooting
        ├── WHY_SERVER_CANT_CONNECT.md
        ├── QUICK_FIX_MONGODB.md
        ├── DATA_ACCURACY_FIXES.md
        └── MONGODB_CONNECTION_GUIDE.md
```

## 🎯 Quick Navigation

### Getting Started
- **Main README**: [README.md](README.md)
- **Project Status**: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)

### Planning & Analysis
- **Improvement Roadmap**: [docs/analysis/IMPROVEMENT_ROADMAP.md](docs/analysis/IMPROVEMENT_ROADMAP.md)
- **Current State**: [docs/analysis/CURRENT_STATE_ANALYSIS.md](docs/analysis/CURRENT_STATE_ANALYSIS.md)
- **Grid Manager Analysis**: [docs/analysis/GRID_MANAGER_ANALYSIS.md](docs/analysis/GRID_MANAGER_ANALYSIS.md)

### Setup & Configuration
- **Database Options**: [docs/analysis/DATABASE_ALTERNATIVES.md](docs/analysis/DATABASE_ALTERNATIVES.md)
- **EC2 + Local GPU**: [docs/analysis/HYBRID_ARCHITECTURE.md](docs/analysis/HYBRID_ARCHITECTURE.md)
- **Cost Analysis**: [docs/analysis/COST_BREAKDOWN.md](docs/analysis/COST_BREAKDOWN.md)

### Troubleshooting
- **MongoDB Issues**: [docs/troubleshooting/](docs/troubleshooting/)

### Development Guides
- **Model Training**: [docs/guides/](docs/guides/)

---

## 📝 File Organization Rules

1. **Root Directory**: Only essential files (README, requirements.txt, config files)
2. **docs/**: All documentation organized by category
3. **Subdirectories**: Keep their own README.md files (frontend/, data/)

---

## 🔍 Finding Things

- **Project Overview**: `README.md`
- **Documentation Index**: `docs/README.md`
- **Analysis & Planning**: `docs/analysis/`
- **How-to Guides**: `docs/guides/`
- **Troubleshooting**: `docs/troubleshooting/`
