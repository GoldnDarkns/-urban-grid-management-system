# Phase 1c — Navigation Reorganization (UI only)

**Goal:** Group all existing pages under Simulated vs City Live; no routes or features removed.

**Status:** Done.

---

## What Was Done

1. **Section label:** Navbar shows a "Simulated" or "City Live" label next to the mode switcher so it's clear which section the nav links belong to.

2. **Simulated nav (SIM_NAV):**  
   Core (Home, Guide, Data) → Analytics (Analytics, Advanced, AI Recs, Insights) → **Models** (TFT, LSTM, Autoencoder, GNN, Compare) → Viz (2D Grid, 3D, Viz) → Mgmt (Incidents, **Data Editor**, **Manage Queries**, Reports).

3. **City Live nav (CITY_NAV):**  
   Core (Home, Guide, Data) → Analytics (Analytics, Advanced, AI Recs, Insights, Cost, Live Stream) → **Models** (TFT, LSTM, Autoencoder, GNN, Compare) → Viz (Maps, Viz) → Mgmt (Incidents, Reports).  
   City Selection + Processing Status remains in the nav context (CitySelector).

4. **Same routes:** No routes removed or added in App.jsx. Only the menu structure (Navbar links and grouping) changed.

**Outcome:** Clear separation by mode; Models and Admin (Data Editor, Manage Queries) are explicit in the menu; easier to add "Scenario Console" under City Live later.
