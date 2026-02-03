# Phase 1a — Pre-Implementation: Performance (Cache + Pre-Compute)

**Status:** Phase 1a **done**. LSTM/TFT cache + pre-compute + **query-keyed cache** (city_id, zone_id). Move to Phase 1b.

**Purpose:** Align on what we will do, confirm compliance with what's built, and answer questions before applying Phase 1a. After you confirm, we implement → you test → we solidify → then move to Phase 1b.

---

## 1. What Phase 1a Will Do (Concrete)

| Item | What we will do | What we will NOT change |
|------|------------------|--------------------------|
| **Cache LSTM model** | Load `lstm_demand_model.keras` **once** (at first request or at app startup) and **reuse** in memory for all subsequent `/models/lstm/prediction` and `/models/tft/prediction` requests. | We will NOT change the prediction logic (same inputs, same outputs). We will NOT remove or rename any route. |
| **Optional: pre-compute** | If you want, we can add a **background or scheduled** step that runs LSTM inference on recent `meter_readings` (Sim DB) and stores results in a new collection (e.g. `model_outputs`). Then the prediction endpoint could **read from that collection** when available instead of running inference every time. | We will NOT change how City Live works (DataProcessor heuristics stay as-is). We will NOT change Simulated mode data flow. |

**Scope for "minimal Phase 1a":** Implement **only** the LSTM model cache first. Pre-compute can be a follow-up step in the same phase (or Phase 1a.2) after we validate the cache.

---

## 2. Compliance With What's Already Built

| Existing piece | How Phase 1a respects it |
|----------------|---------------------------|
| **Routes** | No routes removed or renamed. `/models/lstm/prediction`, `/models/tft/prediction`, and all other model routes stay. Same request/response shape. |
| **Simulated mode** | LSTM prediction today uses `get_db()` (default Sim) and `meter_readings`. We keep that; we only cache the loaded Keras model so we don't reload from disk every request. |
| **City Live mode** | No change. City Live pipeline (DataProcessor) uses heuristics only; we don't touch it. Model pages in City Live may still call LSTM prediction (which uses Sim DB data); that behavior stays unless you want to change it later. |
| **Frontend** | No frontend changes required. Frontend keeps calling `getTFTPrediction()` / `getLSTMPrediction()`; responses stay the same. |
| **Other models** | Autoencoder, GNN, ARIMA, Prophet: we don't load them in the prediction hot path today (only LSTM is loaded per request). So Phase 1a only caches LSTM. If later we add inference endpoints for Autoencoder/GNN, we can cache those too. |

---

## 3. How We Will Implement the Cache (Technical)

- **Where:** In `backend/routes/models.py`, around the LSTM prediction logic.
- **How:** Introduce a **module-level** or **lazy-loaded** variable (e.g. `_lstm_model`) that holds the loaded Keras model. On first call to `get_lstm_prediction()` (or a small helper), load the model and assign to `_lstm_model`; on later calls, reuse `_lstm_model`. Use the same model path: `src/models/lstm_demand_model.keras`.
- **Thread safety:** FastAPI runs async; we'll load the model once. No concurrent load needed if we lazy-load on first request.
- **Failure:** If the model file is missing, we keep returning the same error as today (no change in behavior).

---

## 4. How We Will Test & Solidify

1. **Before change:** You (or we) note current behavior: open Model Comparison or TFT/LSTM page, note response time for prediction (e.g. first load vs refresh).
2. **Apply Phase 1a:** We add the LSTM cache only; no other code changes.
3. **Test:**  
   - First request to `/models/lstm/prediction` or `/models/tft/prediction`: should return same JSON as before (prediction, unit, horizon, etc.).  
   - Second and later requests: should return **faster** (no disk load).  
   - Simulated mode and City Live mode: no regression; other pages unchanged.
4. **Solidify:** If tests pass, we consider Phase 1a done and document it (e.g. one line in PHASES_MASTER_PLAN: "Phase 1a done: LSTM model cached"). Then we move to Phase 1b.

---

## 5. Questions for You Before We Implement

1. **Scope:** Do you want Phase 1a to be **only** the LSTM model cache for now, or should we also add **pre-compute** (background job that writes LSTM predictions to MongoDB so the endpoint can sometimes just read)? Pre-compute is a bit more work and adds a new collection; we can do cache first and add pre-compute as a second step if you prefer.

2. **Mode:** LSTM prediction currently uses **Sim DB** (`get_db()` default) and `meter_readings`. So in **City Live** mode, when the user opens the TFT/LSTM prediction page, they still get a prediction based on Sim data (if available). Is that acceptable for Phase 1a, or do you want prediction in City Live to use City DB / `processed_zone_data`? (That would be a separate change; we can do it in a later phase.)

3. **Docker:** When we implement, we'll assume the backend runs as it does today (e.g. Docker or local uvicorn). The model file path `src/models/lstm_demand_model.keras` is relative to the app root; is that the same in your Docker setup (e.g. `/app/src/models/lstm_demand_model.keras`)? If not, we can make the path configurable via env.

4. **Other models:** Should we cache **only LSTM** for Phase 1a, or do you also want **Autoencoder** and **GNN** cached if they have prediction endpoints that load `.keras` on each request? (From the code, only LSTM prediction loads a Keras model per request; Autoencoder/GNN detail routes don't run inference. So we're only caching LSTM unless you want us to add inference endpoints for those too later.)

---

## 6. What Was Implemented (Phase 1a Applied)

- **LSTM/TFT model cache:** `_get_lstm_model()` / `_get_tft_model()` load once and reuse. Paths: `LSTM_MODEL_PATH`, `TFT_MODEL_PATH`.
- **Pre-compute:** Sim DB collection `model_outputs` stores LSTM and TFT predictions. Endpoint returns recent doc if within 15 min (`MODEL_OUTPUTS_MAX_AGE_SEC`); else runs inference and writes.
- **Query-keyed cache:** Cache is keyed by **city_id** and **zone_id**. Endpoints accept optional `city_id`, `zone_id` query params. Different city/zone → different cache entry (or re-run inference). Inference filters `meter_readings` by zone_id/city_id when provided. Frontend (TFT/LSTM pages) passes current city from `cityAPI.getCurrentCity()` so changing city shows the correct prediction.
- **Clarifications in code:** TFT is primary predictor; LSTM is comparison. Prediction uses Sim DB (meter_readings).

**How to test:** Call GET `/api/models/tft/prediction`, `/api/models/lstm/prediction` with and without `?city_id=nyc` or `?zone_id=Z_001`. Same (city, zone) within 15 min → cached; different city/zone → new result.

Phase 1a solidified. Proceed to Phase 1b (Kafka as main data path).
