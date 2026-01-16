"""
Prophet Demand Forecasting Model for Urban Grid Management System.

This model predicts future energy demand using Facebook Prophet.
Additive regression model designed for forecasting with daily observations and seasonal effects.
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
    from prophet import Prophet
except ImportError:
    print("ERROR: prophet not installed. Install with: pip install prophet")
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


def train_prophet_model():
    """
    Train Prophet model on MongoDB demand data.
    
    Returns:
        Trained model, metrics, and training history
    """
    print("\n" + "="*60)
    print("Prophet Demand Forecasting Model - Training")
    print("="*60)
    
    # Fetch data (same as LSTM)
    df = fetch_demand_data()
    if df is None or len(df) < 100:
        print("[X] Insufficient data for training!")
        return None, None, None
    
    # Prepare data for Prophet (needs 'ds' and 'y' columns)
    prophet_df = pd.DataFrame({
        'ds': df['ts'],
        'y': df['total_kwh']
    })
    
    # Split data (80/20, no shuffle for time series)
    split_idx = int(len(prophet_df) * 0.8)
    train_df = prophet_df[:split_idx].copy()
    test_df = prophet_df[split_idx:].copy()
    
    print(f"\nTraining set: {len(train_df)} samples")
    print(f"Test set: {len(test_df)} samples")
    
    # Create and train Prophet model
    print("\nTraining Prophet model...")
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=True,
        seasonality_mode='additive',
        changepoint_prior_scale=0.05
    )
    
    import time
    start_time = time.time()
    model.fit(train_df)
    training_time = time.time() - start_time
    
    print(f"[OK] Model trained in {training_time:.2f} seconds")
    
    # Make predictions on test set
    print("\n" + "="*60)
    print("Model Evaluation")
    print("="*60)
    
    # Create future dataframe for test period
    future = model.make_future_dataframe(periods=len(test_df), freq='H')
    forecast = model.predict(future)
    
    # Extract predictions for test period
    test_forecast = forecast.tail(len(test_df))
    forecast_values = test_forecast['yhat'].values
    actual_values = test_df['y'].values
    
    # Calculate metrics
    rmse = np.sqrt(mean_squared_error(actual_values, forecast_values))
    mae = mean_absolute_error(actual_values, forecast_values)
    r2 = r2_score(actual_values, forecast_values)
    mape = np.mean(np.abs((actual_values - forecast_values) / actual_values)) * 100
    
    print(f"\nTest Metrics:")
    print(f"  RMSE: {rmse:.2f} kWh")
    print(f"  MAE:  {mae:.2f} kWh")
    print(f"  R²:   {r2:.4f}")
    print(f"  MAPE: {mape:.2f}%")
    
    # Save model
    import pickle
    model_path = "src/models/prophet_demand_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"\n[OK] Model saved to {model_path}")
    
    # Create visualization
    fig, ax = plt.subplots(figsize=(14, 6))
    ax.plot(train_df['ds'], train_df['y'], label='Training Data', color='#00d4ff', alpha=0.7)
    ax.plot(test_df['ds'], actual_values, label='Actual Test', color='#ffffff', linewidth=2)
    ax.plot(test_df['ds'], forecast_values, label='Prophet Forecast', color='#aa66ff', linewidth=2, linestyle='--')
    ax.fill_between(test_df['ds'], 
                     test_forecast['yhat_lower'].values, 
                     test_forecast['yhat_upper'].values, 
                     alpha=0.2, color='#aa66ff', label='Uncertainty')
    ax.set_xlabel('Date')
    ax.set_ylabel('Demand (kWh)')
    ax.set_title('Prophet Demand Forecasting - Predictions vs Actual')
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig('src/models/prophet_predictions.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[OK] Visualization saved to src/models/prophet_predictions.png")
    
    metrics = {
        'rmse': rmse,
        'mae': mae,
        'r2': r2,
        'mape': mape,
        'training_time': training_time
    }
    
    # Save metrics to JSON file
    import json
    metrics_path = "src/models/prophet_metrics.json"
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"[OK] Metrics saved to {metrics_path}")
    
    return model, metrics, None


if __name__ == "__main__":
    model, metrics, history = train_prophet_model()
    if model:
        print("\n" + "="*60)
        print("[SUCCESS] Prophet model trained successfully!")
        print("="*60)
