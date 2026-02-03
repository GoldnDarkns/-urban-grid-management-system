# Model Storage Format and React ↔ Backend Flow

## Are we saving in TensorFlow?

**Yes.** All neural models (TFT, LSTM, Autoencoder, GNN) are built and saved using **TensorFlow/Keras**. They are stored on disk as **`.keras`** files (Keras 3 native format), not as `.json` or `.py`.

| Model | File | Library | Purpose |
|-------|------|---------|--------|
| TFT | `src/models/tft_demand_model.keras` | TensorFlow/Keras | Demand forecasting |
| LSTM | `src/models/lstm_demand_model.keras` | TensorFlow/Keras | Demand forecasting (comparison) |
| Autoencoder | `src/models/autoencoder_anomaly_model.keras` | TensorFlow/Keras | Anomaly detection |
| GNN | `src/models/gnn_risk_model.keras` | TensorFlow/Keras | Zone risk scoring |

Training scripts (e.g. `src/models/tft_demand_forecast.py`) call `model.save(path)` and the backend loads them with `keras.models.load_model(path)`.

---

## File formats

- **Model weights + architecture:** **`.keras`** (single file per model). This is the TensorFlow/Keras native format; it is binary (not human-readable) and contains both the model structure and weights. No `.json` or `.py` is used for storing the trained model.
- **Metrics (RMSE, MAE, R², etc.):** **`.json`** when we persist them (e.g. `src/models/tft_metrics.json`, `arima_metrics.json`, `prophet_metrics.json`). The **overview** endpoint can serve metrics from these files or from hardcoded defaults so the UI always has something to show.

---

## How the React frontend connects to the models

1. **Model overview / metrics (Advanced Analytics, Model Comparison)**  
   - Frontend calls: `GET /api/models/overview` (via `modelsAPI.getOverview()` in `api.js`).  
   - Backend: `backend/routes/models.py` → `get_models_overview()`.  
   - Backend does **not** load `.keras` files for this endpoint; it returns a list of model metadata and metrics (from hardcoded values and/or from `.json` files like `arima_metrics.json`, `prophet_metrics.json`).  
   - So the **metrics** you see in the UI come from the **API response** (backend), which may read `.json` or use defaults — not from React reading a `.json` file directly.

2. **Predictions (TFT / LSTM)**  
   - Frontend calls: `GET /api/models/tft/prediction` or `GET /api/models/lstm/prediction` (with optional `city_id`, `zone_id`).  
   - Backend: loads the corresponding **`.keras`** model (once, then cached in memory), runs inference, optionally caches result in MongoDB `model_outputs`, and returns the prediction.  
   - So the **connection** is: React → HTTP request → FastAPI → `keras.models.load_model(.keras)` and `model.predict()` → JSON response → React.

3. **Model images (training curves, etc.)**  
   - Frontend requests images via `GET /api/models/images/{model_name}/{image_type}`.  
   - Backend serves PNG files (e.g. from `src/models/`) as base64 in the response.

**Summary:** React never reads `.keras` or `.json` files directly. All model access goes through the backend API; the backend reads `.keras` (TensorFlow) and optionally `.json` (metrics) and returns JSON to the frontend.
