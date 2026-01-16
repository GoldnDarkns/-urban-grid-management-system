# Training ARIMA and Prophet Models

## Why Train Them?

You're absolutely right! For a fair comparison, **all models should be trained on the same MongoDB data**. Currently:
- ✅ LSTM: Trained on MongoDB data
- ❌ ARIMA: Not trained (theoretical metrics)
- ❌ Prophet: Not trained (theoretical metrics)

## Installation

First, install the required dependencies:

```bash
pip install statsmodels prophet
```

Or update your requirements:

```bash
pip install -r requirements.txt
```

## Training Instructions

### 1. Train ARIMA Model

```bash
python -m src.models.arima_demand_forecast
```

This will:
- Fetch the same MongoDB data as LSTM
- Find optimal ARIMA parameters (p, d, q)
- Train on 80% of data, test on 20%
- Calculate real RMSE, MAE, R², MAPE
- Save model to `src/models/arima_demand_model.pkl`
- Save metrics to `src/models/arima_metrics.json`
- Create visualization: `src/models/arima_predictions.png`

### 2. Train Prophet Model

```bash
python -m src.models.prophet_demand_forecast
```

This will:
- Fetch the same MongoDB data as LSTM
- Train Prophet with seasonality (yearly, weekly, daily)
- Train on 80% of data, test on 20%
- Calculate real RMSE, MAE, R², MAPE
- Save model to `src/models/prophet_demand_model.pkl`
- Save metrics to `src/models/prophet_metrics.json`
- Create visualization: `src/models/prophet_predictions.png`

## After Training

Once both models are trained:

1. **Backend will automatically detect** the trained models and metrics
2. **Model Comparison page** will show **REAL metrics** instead of theoretical
3. All three models (LSTM, ARIMA, Prophet) will be compared fairly on the same data

## Expected Results

After training, you'll see:
- **ARIMA**: Real metrics from MongoDB data (typically faster training, may have lower accuracy)
- **Prophet**: Real metrics from MongoDB data (good at seasonality, moderate speed)
- **LSTM**: Already trained (RMSE: 64.27, R²: 0.64)

All metrics will be **accurate and comparable** because they're all trained on the **same dataset**!

## Notes

- ARIMA training is fast (usually < 10 seconds)
- Prophet training is moderate (usually 30-60 seconds)
- Both use the same 80/20 train/test split as LSTM for fair comparison
- Models are saved so you don't need to retrain every time
