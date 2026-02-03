# Pages & Verification

All routes and nav links are wired; frontend build passes. Use this to confirm every page works.

## Backend
- **URL:** http://localhost:8000  
- **Health:** http://localhost:8000/api/health → `{"status":"healthy","database":"connected"}`  
- **CORS:** Allows origins 5173–5180 (and 127.0.0.1) so the Vite dev server can call the API.

## Frontend
- **URL:** http://localhost:5177 (or the port Vite prints when you run `npm run dev`)  
- **Build:** `npm run build` completes successfully (all 24 page components load).

## Pages (all have routes + nav)

| Route | Page | City Live nav | Simulated nav |
|-------|------|---------------|----------------|
| `/` | Home | ✓ Home | ✓ Home |
| `/guide` | Guide | ✓ Guide | ✓ Guide |
| `/data` | Data | ✓ Data | ✓ Data |
| `/analytics` | Analytics | ✓ Analytics | ✓ Analytics |
| `/advanced-analytics` | AdvancedAnalytics | ✓ Advanced | ✓ Advanced |
| `/ai-recommendations` | AIRecommendations | ✓ AI Recs | ✓ AI Recs |
| `/insights` | Insights | ✓ Insights | ✓ Insights |
| `/cost` | Cost | ✓ Cost | — |
| `/live-stream` | LiveStream | ✓ Live Stream | — |
| `/tft` | TFT | ✓ TFT | ✓ TFT |
| `/lstm` | LSTM | ✓ LSTM | ✓ LSTM |
| `/autoencoder` | Autoencoder | ✓ Autoencoder | ✓ Autoencoder |
| `/gnn` | GNN | ✓ GNN | ✓ GNN |
| `/comparison` | ModelComparison | ✓ Compare | ✓ Compare |
| `/citymap` | CityMap | ✓ Maps | ✓ 2D Grid |
| `/visualizations` | AdvancedViz | ✓ Viz | ✓ Viz |
| `/scenario-console` | ScenarioConsole | ✓ Scenario Console | — |
| `/incidents` | IncidentReports | ✓ Incidents | ✓ Incidents |
| `/reports` | Reports | ✓ Reports | ✓ Reports |
| `/simulation` | Simulation | — | (via URL) |
| `/simulation3d` | Simulation3D | — | ✓ 3D |
| `/admin/queries` | AdminQueries | — | ✓ Manage Queries |
| `/admin/data` | AdminData | — | ✓ Data Editor |

## If CORS errors persist
1. Restart the backend (so it loads the updated CORS list): stop the process on port 8000, then run from project root:  
   `$env:PYTHONPATH = (Get-Location).Path; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000`
2. Hard-refresh the frontend (Ctrl+Shift+R) at http://localhost:5177 (or your Vite port).
3. Confirm the frontend URL is in the backend’s allowed origins (e.g. 5173–5180).
