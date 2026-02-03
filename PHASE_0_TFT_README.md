# Phase 0 — Real TFT Model

**Goal:** TFT and LSTM are **two different models** so the TFT vs LSTM comparison in Analytics is meaningful. Previously the TFT endpoint just called the LSTM model.

## What Was Done

1. **Phase 0 added to PHASES_MASTER_PLAN.md** — Real TFT model is the first priority (Phase 0).
2. **TFT training script:** `src/models/tft_demand_forecast.py`
   - Uses the same Sim DB `meter_readings` data as LSTM (same `fetch_demand_data`, `create_sequences` from LSTM script).
   - Builds a **TFT-style model**: input (24, 4) → Dense(32) → MultiHeadAttention over time → GlobalAveragePooling1D → Dense(16) → Dense(1).
   - Trains and saves to `src/models/tft_demand_model.keras`, plus `tft_metrics.json`, `tft_training_history.png`, `tft_predictions.png`.
3. **API wiring:** `get_tft_prediction()` now loads and runs the **TFT model** (cached like LSTM), not LSTM. Pre-compute uses type `"tft"` in `model_outputs`; LSTM uses type `"lstm"`. TFT images added to model image map.

## Generate the TFT Model File (One-Time)

You must run the TFT training **once** so that `src/models/tft_demand_model.keras` exists. Until then, the TFT prediction endpoint returns a clear error: *"TFT model not found. Run once: python -m src.models.tft_demand_forecast"*.

**Option A — Inside Docker (recommended if TensorFlow fails locally on Windows):**
```bash
docker-compose exec backend python -m src.models.tft_demand_forecast
```
The model will be written inside the container. To persist it on the host, ensure `src/models/` is mounted or copy the file out.

**Option B — Local (if TensorFlow loads correctly):**
```bash
cd "path/to/urban-grid-management-system"
python -m src.models.tft_demand_forecast
```
Requires MongoDB with Sim DB and `meter_readings` (e.g. run seed first: `python -m src.db.seed_core --reset`, `python -m src.db.seed_timeseries --days 7`).

After training, you should see:
- `src/models/tft_demand_model.keras`
- `src/models/tft_metrics.json`
- `src/models/tft_training_history.png`
- `src/models/tft_predictions.png`

Then restart the backend; TFT prediction will use the real TFT model and the TFT vs LSTM comparison in Analytics will show **two different models**.
