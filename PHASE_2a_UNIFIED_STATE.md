# Phase 2a — Unified City State

**Goal:** One API that returns aggregated "city state" (grid, AQI, traffic, incidents, zones, alerts) so the AI and UI have a single view.

**Status:** Done (core).

---

## What Was Done

1. **GET /api/city/state** — Unified city state endpoint.
   - **Query params:** `city_id` (optional; uses current if omitted), `zones_limit` (default 100), `alerts_limit` (default 50).
   - **Response:** Built from MongoDB (processed_zone_data, alerts):
     - `city_id`, `city_name`, `timestamp`
     - `zones`: list of latest per zone with `zone_id`, `timestamp`, `aqi`, `weather`, `traffic`, `demand_forecast`, `risk_score`, `anomaly_detection`, `recommendations_count`
     - `alerts`: recent alerts with `zone_id`, `ts`, `level`, `type`, `message`, `details`
     - `grid`: `zone_count`, `high_risk_count`, `alert_count`
     - `stress_index`: 0–100 (optional), derived from high-risk zones + alert count.

2. **Helper** — `_clean_for_json()` in city_selection for ObjectId/datetime serialization (reused for state).

**Outcome:** Single state snapshot for domain-specific AI and Scenario Console. Scenario overrides (what-if AQI/zone) can be added later as a separate endpoint or body to /api/city/state.
