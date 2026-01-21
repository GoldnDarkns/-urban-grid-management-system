# Improvement Roadmap: Multi-City Data & Feature Requirements

**Goal:** Scale the system to handle multiple cities with real data before adding advanced features

---

## PHASE 1: DATA INFRASTRUCTURE & MULTI-CITY SUPPORT

### Step 1: Database Scaling Strategy

#### Current Limitations:
- **MongoDB Atlas Free Tier**: 512MB storage, limited connections
- **Current Data**: ~360K meter readings, 14K climate readings (single city)
- **Projected Multi-City**: 10 cities × 360K = 3.6M readings (exceeds free tier)

#### Recommended Solutions:

**Option A: MongoDB Atlas Paid Tier** (Recommended for MVP)
- **M2 Cluster**: $9/month - 2GB storage, shared RAM
- **M5 Cluster**: $57/month - 5GB storage, 2GB RAM
- **Pros**: Easy migration, same codebase, managed service
- **Cons**: Monthly cost, but reasonable for commercial product
- **Best For**: Quick scaling, proof of concept

**Option B: Self-Hosted MongoDB**
- **Docker Container**: Run MongoDB on VPS (DigitalOcean, AWS EC2)
- **Cost**: $12-40/month for 4-8GB RAM, 50-100GB storage
- **Pros**: More control, no per-GB pricing, can scale vertically
- **Cons**: Need to manage backups, updates, security
- **Best For**: Long-term cost savings, full control

**Option C: Hybrid Approach** (Best for Production)
- **Time-Series Data**: Use MongoDB Time-Series Collections (efficient compression)
- **Historical Archive**: Move old data (>1 year) to S3/cheaper storage
- **Active Data**: Keep last 90 days in MongoDB for fast queries
- **Pros**: Best of both worlds - fast queries + cost-effective storage
- **Cons**: More complex, need archive/restore logic

**Recommendation**: Start with **Option A (M2 Cluster)** for MVP, migrate to **Option C** when scaling.

---

### Step 2: Multi-City Data Architecture

#### Database Schema Changes Needed:

```python
# Current Schema (Single City)
{
  "zone_id": "Z_001",
  "name": "Downtown",
  ...
}

# New Schema (Multi-City)
{
  "city_id": "NYC",
  "city_name": "New York City",
  "zone_id": "NYC_Z_001",
  "name": "Manhattan",
  "timezone": "America/New_York",
  "country": "USA",
  ...
}
```

#### Required Changes:

1. **Add `city_id` to all collections**
   - `zones` → add `city_id` field
   - `households` → add `city_id` field
   - `meter_readings` → add `city_id` field
   - `air_climate_readings` → add `city_id` field
   - `alerts` → add `city_id` field
   - `incident_reports` → add `city_id` field

2. **Create `cities` collection**
   ```python
   {
     "_id": "NYC",
     "name": "New York City",
     "country": "USA",
     "timezone": "America/New_York",
     "latitude": 40.7128,
     "longitude": -74.0060,
     "population": 8800000,
     "data_sources": {
       "energy": "api_url",
       "aqi": "api_url",
       "weather": "api_url"
     },
     "created_at": datetime,
     "status": "active"
   }
   ```

3. **Update Indexes**
   - Add compound indexes: `(city_id, zone_id, ts)`
   - Add city_id to all existing indexes

4. **Update API Endpoints**
   - All endpoints need `city_id` parameter
   - Default to current city if not specified
   - Filter all queries by `city_id`

---

### Step 3: City Data Sources & APIs

#### Available Public Data Sources:

**1. Energy Consumption Data:**

| City | Source | Format | Update Frequency | Access |
|------|--------|--------|------------------|--------|
| **London** | UK Power Networks | CSV/API | Daily | Public (requires registration) |
| **New York** | NYC Open Data | CSV/JSON API | Hourly | Free, no auth |
| **Los Angeles** | LADWP Open Data | CSV/API | Daily | Free, no auth |
| **Chicago** | ComEd Open Data | CSV | Daily | Free |
| **San Francisco** | PG&E Open Data | CSV | Daily | Free |
| **Toronto** | Toronto Open Data | CSV/API | Daily | Free |
| **Sydney** | AEMO (Australia) | CSV/API | 5-min intervals | Free |
| **Berlin** | Open Power System Data | CSV | Daily | Free |
| **Tokyo** | TEPCO Open Data | CSV | Daily | Free (limited) |

**2. Air Quality Data:**

| Source | Coverage | Format | Update Frequency | Access |
|--------|----------|--------|------------------|--------|
| **OpenAQ** | 100+ cities globally | JSON API | Real-time | Free, API key required |
| **AirVisual API** | 10,000+ cities | JSON API | Hourly | Free tier: 500 calls/day |
| **WAQI (World Air Quality)** | 10,000+ stations | JSON API | Real-time | Free, no auth |
| **US EPA AirNow** | US cities | JSON API | Hourly | Free, no auth |
| **European Air Quality** | EU cities | JSON API | Hourly | Free |

**3. Weather Data:**

| Source | Coverage | Format | Update Frequency | Access |
|--------|----------|--------|------------------|--------|
| **OpenWeatherMap** | Global | JSON API | Real-time | Free: 60 calls/min |
| **WeatherAPI** | Global | JSON API | Real-time | Free: 1M calls/month |
| **NOAA API** | US only | JSON API | Hourly | Free, no auth |
| **Met Office (UK)** | UK | JSON API | Hourly | Free, registration |

**4. City-Specific APIs:**

| City | Platform | Data Available | Access |
|------|----------|----------------|--------|
| **New York** | NYC Open Data Portal | Energy, AQI, Weather, Traffic | Free, no auth |
| **London** | London Datastore | Energy, AQI, Weather | Free |
| **Los Angeles** | LA Open Data | Energy, AQI, Weather | Free |
| **Chicago** | Chicago Data Portal | Energy, AQI, Weather | Free |
| **San Francisco** | DataSF | Energy, AQI, Weather | Free |

---

### Step 4: City Selection Page Implementation

#### Frontend: City Selector Page

**Location**: New page at `/cities` or dropdown in navigation

**Features Needed:**
1. **City Browser**
   - Grid/list of available cities
   - Filter by country, region
   - Search functionality
   - Show city status (data available, last updated)

2. **City Details**
   - City name, country, timezone
   - Data coverage (energy, AQI, weather)
   - Last data update timestamp
   - Number of zones, households
   - Data quality score

3. **City Selection**
   - "Select City" button
   - Sets active city in session/localStorage
   - Redirects to dashboard with city context

4. **Data Status Indicators**
   - ✅ Real-time data available
   - ⚠️ Historical data only
   - ❌ No data available
   - 🔄 Data updating...

#### Backend: City Management API

**New Endpoints:**
```python
GET /api/cities                    # List all cities
GET /api/cities/{city_id}          # Get city details
POST /api/cities                   # Add new city (admin)
PUT /api/cities/{city_id}          # Update city config
GET /api/cities/{city_id}/status  # Get data status
POST /api/cities/{city_id}/sync    # Trigger data sync
```

**Data Sync Service:**
- Background job to fetch data from APIs
- Store in MongoDB with `city_id`
- Update last_sync timestamp
- Handle API rate limits
- Error handling and retry logic

---

### Step 5: Data Ingestion Pipeline

#### Architecture:

```
External APIs → Data Fetcher → Data Transformer → MongoDB
     ↓              ↓                ↓              ↓
  (Rate Limit)  (Error Handle)  (Normalize)   (Index)
```

#### Implementation Requirements:

1. **Data Fetcher Service** (`src/data_fetchers/`)
   ```python
   - openaq_fetcher.py      # Air quality from OpenAQ
   - openweather_fetcher.py # Weather from OpenWeatherMap
   - nyc_data_fetcher.py    # NYC-specific data
   - london_data_fetcher.py # London-specific data
   - generic_fetcher.py     # Generic CSV/JSON fetcher
   ```

2. **Data Transformer** (`src/data_transformers/`)
   ```python
   - normalize_energy.py   # Normalize energy data formats
   - normalize_aqi.py      # Normalize AQI data formats
   - normalize_weather.py # Normalize weather data
   - timezone_converter.py # Convert to UTC
   ```

3. **Scheduler** (Celery or APScheduler)
   ```python
   - Hourly sync for real-time data
   - Daily sync for historical data
   - On-demand sync via API
   ```

4. **Error Handling**
   - API rate limit handling
   - Retry with exponential backoff
   - Dead letter queue for failed syncs
   - Alert on persistent failures

---

## PHASE 2: UI REORGANIZATION

### Move "Gimmicks" to Advanced Analytics Page

#### Current Pages to Reorganize:

**Move to `/advanced-analytics`:**
- `/lstm` → `/advanced-analytics/lstm`
- `/autoencoder` → `/advanced-analytics/autoencoder`
- `/gnn` → `/advanced-analytics/gnn`
- `/model-comparison` → `/advanced-analytics/model-comparison`
- `/simulation3d` → `/advanced-analytics/simulation3d` (optional - can remove)

**Keep in Main Navigation:**
- `/` (Home) - Dashboard overview
- `/data` - Data explorer
- `/analytics` - Operational analytics
- `/insights` - Actionable recommendations
- `/incidents` - Incident management
- `/cities` - City selector (NEW)

**New Advanced Analytics Page Structure:**
```
/advanced-analytics
  ├── Overview (model comparison, architecture)
  ├── LSTM Details
  ├── Autoencoder Details
  ├── GNN Details
  ├── Model Architecture (technical deep-dive)
  └── 3D Visualization (optional)
```

---

## PHASE 3: REQUIREMENTS FOR MAJOR FEATURES

### Feature 1: Cost Analysis

#### Requirements:

**Data Needed:**
1. **Energy Pricing Data**
   - Cost per kWh by time-of-day (peak/off-peak)
   - Cost per kWh by zone/city
   - Historical pricing trends
   - Source: Utility rate schedules, energy markets

2. **Infrastructure Costs**
   - Equipment replacement costs (transformers, lines)
   - Maintenance costs per asset type
   - Labor costs for repairs
   - Source: Utility budgets, industry standards

3. **Economic Impact Data**
   - Business interruption costs by sector
   - GDP impact per kWh lost
   - Customer compensation rates
   - Source: Economic studies, utility reports

**API/Data Sources:**
- **Energy Pricing**: EIA (US Energy Information Administration) API
- **Market Prices**: Day-ahead market APIs (varies by region)
- **Infrastructure Costs**: Internal utility data (if available) or industry benchmarks

**Implementation Requirements:**
- Cost calculation engine
- Pricing database/configuration
- Cost-benefit analysis algorithms
- Report generation

**Dependencies:**
- Multi-city support (pricing varies by city)
- Historical data (for trend analysis)
- User permissions (cost data may be sensitive)

---

### Feature 2: SCADA Integration

#### Requirements:

**Hardware/Infrastructure:**
1. **SCADA System Access**
   - Network access to SCADA network (isolated, secure)
   - VPN or dedicated connection
   - Firewall rules and security protocols

2. **Communication Protocols**
   - DNP3 (Distributed Network Protocol)
   - Modbus TCP/RTU
   - IEC 61850
   - OPC UA (OLE for Process Control)
   - MQTT (for modern IoT systems)

3. **Security Requirements**
   - Certificate-based authentication
   - Encrypted connections
   - Role-based access control
   - Audit logging
   - Compliance with NERC CIP (North America) or equivalent

**Software Requirements:**
1. **SCADA Drivers/Libraries**
   - Python libraries: `pymodbus`, `pydnp3`, `opcua`
   - Or use SCADA gateway/translator
   - Real-time data streaming

2. **Data Mapping**
   - Map SCADA points to our data model
   - Point ID mapping configuration
   - Unit conversions
   - Data validation

3. **Control Capabilities** (if write access)
   - Command authentication
   - Command logging
   - Safety interlocks
   - Approval workflows

**Implementation Requirements:**
- SCADA connector service (separate from main API)
- Real-time data streaming (WebSockets or Server-Sent Events)
- Command queue and execution
- Error handling and reconnection logic

**Dependencies:**
- Access to actual SCADA system (requires utility partnership)
- Security clearance/approvals
- Network infrastructure
- Testing environment (can't test on production SCADA)

**Note:** This is the HARDEST feature. Requires:
- Utility partnership (they won't give SCADA access easily)
- Security certifications
- Specialized knowledge
- Testing environment

---

### Feature 3: Real Geography (GIS Integration)

#### Requirements:

**Data Sources:**

1. **Base Maps**
   - **Mapbox**: $0-5 per 1000 requests (free tier: 50K/month)
   - **Google Maps**: $7 per 1000 requests (free tier: $200 credit/month)
   - **OpenStreetMap**: Free, but needs tile server
   - **Esri ArcGIS**: Enterprise pricing

2. **City Boundaries**
   - **OpenStreetMap**: Free, via Overpass API
   - **City Open Data Portals**: Free, city-specific
   - **Census Bureau (US)**: Free, TIGER/Line files

3. **Infrastructure Data**
   - **Power Lines**: Utility GIS data (proprietary, requires partnership)
   - **Substations**: Utility GIS data or OpenStreetMap (limited)
   - **Buildings**: OpenStreetMap, city data portals
   - **Zoning**: City planning departments

4. **Elevation/Topography**
   - **USGS (US)**: Free, DEM files
   - **SRTM (Global)**: Free, 30m resolution
   - **Google Elevation API**: $5 per 1000 requests

**API Keys Needed:**
- Mapbox API key (free tier available)
- Google Maps API key (free tier available)
- OpenStreetMap (no key needed)

**Implementation Requirements:**
1. **Map Component**
   - React map library (react-map-gl for Mapbox, or Google Maps React)
   - Zone overlay rendering
   - Marker clustering
   - Heat maps for demand/AQI

2. **Data Integration**
   - Convert zone IDs to geographic boundaries
   - Store lat/lng for zones/substations
   - GeoJSON for zone shapes

3. **Performance**
   - Tile caching
   - Lazy loading
   - Clustering for large datasets

**Dependencies:**
- Zone geographic data (need to map zones to real locations)
- API keys and billing setup
- Frontend map library integration

**Cost Estimate:**
- Mapbox: ~$50-200/month for moderate usage
- Google Maps: ~$200-500/month for moderate usage
- OpenStreetMap: Free (self-hosted tile server)

---

### Feature 4: Workflow Automation

#### Requirements:

**Workflow Engine:**
1. **Workflow Definition**
   - JSON/YAML workflow definitions
   - Conditional logic (if-then-else)
   - Parallel execution
   - Error handling and retries

2. **Workflow Types:**
   - Alert → Action workflows
   - Incident → Assignment → Resolution
   - Scheduled tasks (daily reports)
   - Data sync workflows

**Implementation Options:**

**Option A: Custom Workflow Engine**
- Build in Python
- Store workflows in MongoDB
- Pros: Full control, no dependencies
- Cons: More development time

**Option B: Use Existing Framework**
- **Prefect**: Python workflow engine (open source)
- **Airflow**: Apache Airflow (more complex, but powerful)
- **Temporal**: Workflow orchestration (more enterprise-focused)
- Pros: Battle-tested, features built-in
- Cons: Additional dependency, learning curve

**Option C: Simple State Machine**
- Custom state machine in Python
- Store state in MongoDB
- Pros: Lightweight, easy to understand
- Cons: Limited features

**Recommendation**: Start with **Option C (Simple State Machine)** for MVP, migrate to **Option A or B** if needed.

**Data Needed:**
- Workflow definitions (stored in MongoDB)
- Workflow execution history
- User permissions (who can trigger workflows)
- Integration endpoints (email, SMS, APIs)

**Dependencies:**
- User authentication (for workflow triggers)
- Notification system (email/SMS for workflow steps)
- API integrations (for external actions)

---

## IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Weeks 1-4)
1. ✅ Database scaling (upgrade MongoDB or migrate)
2. ✅ Multi-city schema changes
3. ✅ City selection page
4. ✅ Data fetcher for 2-3 cities (NYC, London, LA)
5. ✅ Move gimmicks to Advanced Analytics page

### Phase 2: Data Expansion (Weeks 5-8)
1. ✅ Add 5-10 more cities
2. ✅ Real-time data sync (hourly)
3. ✅ Data quality monitoring
4. ✅ City comparison features

### Phase 3: Major Features (Weeks 9-16)
1. **Cost Analysis** (easiest, can start here)
2. **GIS Integration** (moderate difficulty)
3. **Workflow Automation** (moderate difficulty)
4. **SCADA Integration** (hardest, requires partnership)

---

## TECHNICAL REQUIREMENTS SUMMARY

### Immediate Needs:
- **Database**: Upgrade MongoDB or migrate to self-hosted
- **API Keys**: Mapbox/Google Maps, OpenWeatherMap, OpenAQ
- **Data Sources**: Identify 5-10 cities with public data
- **Code Changes**: Multi-city schema, city selector UI

### Short-term Needs:
- **Background Jobs**: Celery or APScheduler for data sync
- **Error Handling**: Robust retry logic for API calls
- **Monitoring**: Data quality alerts, sync status

### Long-term Needs:
- **SCADA Access**: Utility partnership (if pursuing control features)
- **Security**: Certifications, compliance (if handling sensitive data)
- **Infrastructure**: Scaling plan for 100+ cities

---

## COST ESTIMATES

### Monthly Operating Costs (10 Cities):

| Service | Cost |
|--------|------|
| MongoDB Atlas M5 | $57/month |
| Mapbox API | $50-200/month |
| OpenWeatherMap | Free (60 calls/min) |
| OpenAQ API | Free |
| VPS (if self-hosting) | $20-40/month |
| **Total** | **$127-297/month** |

### One-time Development Costs:
- Multi-city development: 2-3 weeks
- GIS integration: 1-2 weeks
- Workflow engine: 1-2 weeks
- Cost analysis: 1 week
- SCADA integration: 4-8 weeks (if partnership secured)

---

## NEXT STEPS

1. **Decide on database solution** (MongoDB upgrade vs. self-hosted)
2. **Choose 5-10 cities** to start with (prioritize cities with good public data)
3. **Get API keys** (Mapbox, OpenWeatherMap, OpenAQ)
4. **Start with Phase 1** (multi-city schema + city selector)
5. **Test with 2-3 cities** before scaling to more

**Recommendation**: Start with **NYC, London, and Los Angeles** - they have excellent public data APIs.
