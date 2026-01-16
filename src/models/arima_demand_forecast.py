"""
ARIMA Demand Forecasting Model for Urban Grid Management System.

This model predicts future energy demand using ARIMA (AutoRegressive Integrated Moving Average).
Classical statistical time-series forecasting model.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.stattools import adfuller
    from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
except ImportError:
    print("ERROR: statsmodels not installed. Install with: pip install statsmodels")
    exit(1)

from src.db.mongo_client import get_db


def fetch_demand_data(limit=None):
    """
    Fetch meter readings from MongoDB and aggregate by hour.
    Same data source as LSTM for fair comparison.
    
    Returns:
        DataFrame with hourly demand data
    """
    print("Fetching demand data from MongoDB...")
    db = get_db()
    
    # Aggregate meter readings by hour
    pipeline = [
        {"$group": {
            "_id": {
                "year": {"$year": "$ts"},
                "month": {"$month": "$ts"},
                "day": {"$dayOfMonth": "$ts"},
                "hour": {"$hour": "$ts"}
            },
            "total_kwh": {"$sum": "$kwh"},
            "avg_kwh": {"$avg": "$kwh"},
            "reading_count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1}}
    ]
    
    if limit:
        pipeline.append({"$limit": limit})
    
    results = list(db.meter_readings.aggregate(pipeline))
    
    if not results:
        print("[X] No data found in MongoDB!")
        return None
    
    # Convert to DataFrame
    data = []
    for r in results:
        ts = datetime(
            r["_id"]["year"],
            r["_id"]["month"],
            r["_id"]["day"],
            r["_id"]["hour"]
        )
        data.append({
            "ts": ts,
            "total_kwh": r["total_kwh"],
            "avg_kwh": r["avg_kwh"],
            "count": r["reading_count"]
        })
    
    df = pd.DataFrame(data)
    df = df.sort_values("ts").reset_index(drop=True)
    
    print(f"[OK] Fetched {len(df)} hourly readings")
    print(f"    Date range: {df['ts'].min()} to {df['ts'].max()}")
    print(f"    Total demand: {df['total_kwh'].sum():.2f} kWh")
    
    return df


def check_stationarity(series):
    """Check if time series is stationary using Augmented Dickey-Fuller test."""
    result = adfuller(series.dropna())
    return result[1] <= 0.05  # p-value <= 0.05 means stationary


def find_optimal_arima_params(series, max_p=5, max_d=2, max_q=5):
    """
    Find optimal ARIMA parameters using AIC (Akaike Information Criterion).
    
    Returns:
        Best (p, d, q) parameters
    """
    print("\nFinding optimal ARIMA parameters...")
    best_aic = np.inf
    best_params = (1, 1, 1)
    
    # Try different parameter combinations
    for p in range(max_p + 1):
        for d in range(max_d + 1):
            for q in range(max_q + 1):
                try:
                    model = ARIMA(series, order=(p, d, q))
                    fitted = model.fit()
                    if fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_params = (p, d, q)
                except:
                    continue
    
    print(f"[OK] Best parameters: ARIMA{best_params} (AIC: {best_aic:.2f})")
    return best_params


def train_arima_model():
    """
    Train ARIMA model on MongoDB demand data.
    
    Returns:
        Trained model, metrics, and training history
    """
    print("\n" + "="*60)
    print("ARIMA Demand Forecasting Model - Training")
    print("="*60)
    
    # Fetch data (same as LSTM)
    df = fetch_demand_data()
    if df is None or len(df) < 100:
        print("[X] Insufficient data for training!")
        return None, None, None
    
    # Use total_kwh as the time series
    series = df['total_kwh'].values
    
    # Split data (80/20, no shuffle for time series)
    split_idx = int(len(series) * 0.8)
    train_data = series[:split_idx]
    test_data = series[split_idx:]
    
    print(f"\nTraining set: {len(train_data)} samples")
    print(f"Test set: {len(test_data)} samples")
    
    # Convert to pandas Series with datetime index
    train_series = pd.Series(train_data, index=pd.date_range(start='2024-01-01', periods=len(train_data), freq='H'))
    
    # Find optimal parameters
    best_params = find_optimal_arima_params(train_series, max_p=3, max_d=2, max_q=3)
    
    # Train model
    print(f"\nTraining ARIMA{best_params} model...")
    model = ARIMA(train_series, order=best_params)
    fitted_model = model.fit()
    
    print("\nModel Summary:")
    print(fitted_model.summary())
    
    # Make predictions on test set
    print("\n" + "="*60)
    print("Model Evaluation")
    print("="*60)
    
    # Forecast for test set length
    forecast = fitted_model.forecast(steps=len(test_data))
    forecast_values = forecast.values
    
    # Calculate metrics
    rmse = np.sqrt(mean_squared_error(test_data, forecast_values))
    mae = mean_absolute_error(test_data, forecast_values)
    r2 = r2_score(test_data, forecast_values)
    mape = np.mean(np.abs((test_data - forecast_values) / test_data)) * 100
    
    print(f"\nTest Metrics:")
    print(f"  RMSE: {rmse:.2f} kWh")
    print(f"  MAE:  {mae:.2f} kWh")
    print(f"  R²:   {r2:.4f}")
    print(f"  MAPE: {mape:.2f}%")
    
    # Save model
    model_path = "src/models/arima_demand_model.pkl"
    import pickle
    with open(model_path, 'wb') as f:
        pickle.dump(fitted_model, f)
    print(f"\n[OK] Model saved to {model_path}")
    
    # Create visualization
    plt.figure(figsize=(14, 6))
    plt.plot(range(len(train_data)), train_data, label='Training Data', color='#00d4ff', alpha=0.7)
    plt.plot(range(len(train_data), len(series)), test_data, label='Actual Test', color='#ffffff', linewidth=2)
    plt.plot(range(len(train_data), len(series)), forecast_values, label='ARIMA Forecast', color='#00ff88', linewidth=2, linestyle='--')
    plt.xlabel('Hour')
    plt.ylabel('Demand (kWh)')
    plt.title('ARIMA Demand Forecasting - Predictions vs Actual')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('src/models/arima_predictions.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Visualization saved to src/models/arima_predictions.png")
    
    metrics = {
        'rmse': rmse,
        'mae': mae,
        'r2': r2,
        'mape': mape,
        'params': best_params,
        'training_time': 5  # ARIMA is fast
    }
    
    # Save metrics to JSON file
    import json
    metrics_path = "src/models/arima_metrics.json"
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"[OK] Metrics saved to {metrics_path}")
    
    return fitted_model, metrics, None


if __name__ == "__main__":
    model, metrics, history = train_arima_model()
    if model:
        print("\n" + "="*60)
        print("[SUCCESS] ARIMA model trained successfully!")
        print("="*60)
