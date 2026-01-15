# Climate- and Constraint-Aware Urban Grid Management System

## Phase 1: MongoDB Foundation

This is Phase 1 of the Urban Grid Management System project. This phase focuses on setting up the MongoDB database foundation with core collections, indexes, and seed data.

### Prerequisites

- Python 3.8 or higher
- MongoDB (local installation or MongoDB Atlas)
- pip (Python package manager)

### Setup Instructions

#### 1. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 3. Configure MongoDB Connection

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   # On macOS/Linux:
   # cp .env.example .env
   ```

2. Edit `.env` and set your MongoDB connection string:
   ```
   MONGO_URI=mongodb://localhost:27017
   MONGO_DB=urban_grid_ai
   ```

   For MongoDB Atlas, use:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

#### 4. Seed the Database

Run the seed script to populate the database with initial data:

```bash
# Basic seeding (default: 20 zones, 500 households)
python -m src.db.seed_core

# Reset and reseed (drops existing collections)
python -m src.db.seed_core --reset

# Custom parameters
python -m src.db.seed_core --reset --zones 25 --households 1000 --city "NewCity"
```

#### 5. Verify Setup

Run the sanity check to verify everything is set up correctly:

```bash
python -m src.db.sanity_check
```

This will:
- Test database connection
- Print collection counts
- Display sample documents
- Show zone adjacency relationships

### Project Structure

```
urban-grid-ai/
├── README.md
├── requirements.txt
├── .env.example
├── .env                    # (create this, not in git)
└── src/
    ├── config.py
    ├── db/
    │   ├── mongo_client.py
    │   ├── indexes.py
    │   ├── seed_core.py
    │   └── sanity_check.py
    └── queries/
        └── basic_queries.py
```

### Collections

The database includes the following collections:

- **zones**: City zones with metadata (population, critical infrastructure, priority)
- **households**: Residential units distributed across zones
- **meter_readings**: (Structure ready, data in later phases)
- **air_climate_readings**: (Structure ready, data in later phases)
- **constraint_events**: (Structure ready, data in later phases)
- **policies**: AQI threshold policies and actions
- **alerts**: (Structure ready, data in later phases)
- **grid_edges**: Zone adjacency graph for network analysis

### Default Configuration

- **City Name**: MetroCity
- **Zones**: 20 (Z_001 to Z_020)
- **Households**: 500 (H_000001 to H_000500)
- **Database Name**: urban_grid_ai

### Running Basic Queries

```bash
python -m src.queries.basic_queries
```

### Phase 1 Scope

This phase includes:
- ✅ MongoDB connection setup
- ✅ Collection structure and indexes
- ✅ Seed data generation
- ✅ Basic validation and queries

**Not included in Phase 1:**
- ❌ Deep Learning models
- ❌ Time-series data insertion
- ❌ Real-time monitoring
- ❌ Predictive analytics

### Troubleshooting

**Connection Error:**
- Ensure MongoDB is running locally, or
- Verify your MONGO_URI in `.env` is correct
- Check network connectivity for Atlas

**Import Errors:**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

**Empty Collections:**
- Run `python -m src.db.seed_core --reset` to populate data

### Next Steps

After Phase 1 is complete, subsequent phases will add:
- Time-series data ingestion
- Deep Learning model integration (LSTM, Autoencoder, GNN)
- Real-time monitoring and alerting
- Predictive analytics and scenario simulation
