"""
LSTM Demand Forecasting Model for Urban Grid Management System.

This model predicts future energy demand based on historical consumption patterns.
Uses LSTM (Long Short-Term Memory) networks to capture temporal dependencies.
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF warnings

import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

# TensorFlow/Keras imports (GPU used by default when available)
import tensorflow as tf
from tensorflow import keras
from keras import layers, models, callbacks

# Prefer GPU when available
_gpus = tf.config.list_physical_devices('GPU')
if _gpus:
    try:
        for _g in _gpus:
            tf.config.experimental.set_memory_growth(_g, True)
    except RuntimeError:
        pass

from src.db.mongo_client import get_db


def fetch_demand_data(limit=None):
    """
    Fetch meter readings from MongoDB and aggregate by hour.
    
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
        print("[X] No meter readings found!")
        return None
    
    # Convert to DataFrame
    data = []
    for r in results:
        dt = datetime(
            r["_id"]["year"],
            r["_id"]["month"],
            r["_id"]["day"],
            r["_id"]["hour"],
            tzinfo=timezone.utc
        )
        data.append({
            "timestamp": dt,
            "total_kwh": r["total_kwh"],
            "avg_kwh": r["avg_kwh"],
            "hour": r["_id"]["hour"],
            "day_of_week": dt.weekday(),
            "month": r["_id"]["month"]
        })
    
    df = pd.DataFrame(data)
    df = df.sort_values("timestamp").reset_index(drop=True)
    
    print(f"[OK] Fetched {len(df)} hourly records")
    print(f"    Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    
    return df


def create_sequences(data, seq_length=24, forecast_horizon=1):
    """
    Create sequences for LSTM training.
    
    Args:
        data: Scaled feature array
        seq_length: Number of past hours to use (default 24 = 1 day)
        forecast_horizon: Number of hours to predict (default 1)
    
    Returns:
        X: Input sequences (samples, seq_length, features)
        y: Target values (samples, forecast_horizon)
    """
    X, y = [], []
    
    for i in range(len(data) - seq_length - forecast_horizon + 1):
        X.append(data[i:(i + seq_length)])
        y.append(data[(i + seq_length):(i + seq_length + forecast_horizon), 0])  # Only predict demand
    
    return np.array(X), np.array(y)


def build_lstm_model(seq_length, n_features, forecast_horizon=1):
    """
    Build LSTM model architecture.
    
    Args:
        seq_length: Input sequence length
        n_features: Number of input features
        forecast_horizon: Number of hours to predict
    
    Returns:
        Compiled Keras model
    """
    model = models.Sequential([
        # First LSTM layer with return sequences for stacking
        layers.LSTM(64, return_sequences=True, input_shape=(seq_length, n_features)),
        layers.Dropout(0.2),
        
        # Second LSTM layer
        layers.LSTM(32, return_sequences=False),
        layers.Dropout(0.2),
        
        # Dense layers
        layers.Dense(16, activation='relu'),
        layers.Dense(forecast_horizon)
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    
    return model


def train_demand_forecast_model(seq_length=24, epochs=50, batch_size=32):
    """
    Train the LSTM demand forecasting model.
    
    Args:
        seq_length: Number of past hours to use for prediction
        epochs: Training epochs
        batch_size: Training batch size
    
    Returns:
        Trained model, scaler, and training history
    """
    print("\n" + "="*60)
    print("LSTM Demand Forecasting Model - Training")
    print("="*60)
    
    # Fetch data
    df = fetch_demand_data()
    if df is None or len(df) < seq_length + 10:
        print("[X] Insufficient data for training!")
        return None, None, None
    
    # Prepare features
    features = ['total_kwh', 'hour', 'day_of_week', 'month']
    data = df[features].values
    
    print(f"\nFeatures: {features}")
    print(f"Data shape: {data.shape}")
    
    # Scale data
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data)
    
    # Create sequences
    X, y = create_sequences(scaled_data, seq_length=seq_length)
    print(f"Sequences created: X={X.shape}, y={y.shape}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False  # Don't shuffle time series
    )
    
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    
    # Build model
    n_features = X.shape[2]
    model = build_lstm_model(seq_length, n_features)
    
    print("\nModel Architecture:")
    model.summary()
    
    # Callbacks
    early_stop = callbacks.EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    )
    
    # Train
    print("\nTraining...")
    history = model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.2,
        callbacks=[early_stop],
        verbose=1
    )
    
    # Evaluate
    print("\n" + "="*60)
    print("Model Evaluation")
    print("="*60)
    
    y_pred = model.predict(X_test, verbose=0)
    
    # Inverse transform for interpretable metrics
    # Create dummy arrays to inverse transform just the demand column
    y_test_inv = y_test * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
    y_pred_inv = y_pred * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
    
    mse = mean_squared_error(y_test_inv, y_pred_inv)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test_inv, y_pred_inv)
    r2 = r2_score(y_test_inv, y_pred_inv)
    
    print(f"Test MSE: {mse:.4f}")
    print(f"Test RMSE: {rmse:.4f}")
    print(f"Test MAE: {mae:.4f}")
    print(f"Test R2 Score: {r2:.4f}")
    
    # Save model
    model_path = "src/models/lstm_demand_model.keras"
    model.save(model_path)
    print(f"\n[OK] Model saved to {model_path}")
    
    # Plot results
    plot_training_history(history)
    plot_predictions(y_test_inv, y_pred_inv)
    
    return model, scaler, history


def plot_training_history(history):
    """Plot training and validation loss."""
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history['loss'], label='Training Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss (MSE)')
    plt.legend()
    plt.grid(True)
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['mae'], label='Training MAE')
    plt.plot(history.history['val_mae'], label='Validation MAE')
    plt.title('Model MAE')
    plt.xlabel('Epoch')
    plt.ylabel('MAE')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('src/models/lstm_training_history.png', dpi=150)
    print("[OK] Training history plot saved to src/models/lstm_training_history.png")
    plt.close()


def plot_predictions(y_true, y_pred, n_samples=100):
    """Plot actual vs predicted values."""
    plt.figure(figsize=(14, 5))
    
    # Limit samples for clarity
    n = min(n_samples, len(y_true))
    
    plt.plot(range(n), y_true[:n], label='Actual', alpha=0.8)
    plt.plot(range(n), y_pred[:n], label='Predicted', alpha=0.8)
    plt.title('Demand Forecast: Actual vs Predicted')
    plt.xlabel('Time Step (hours)')
    plt.ylabel('Total kWh')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('src/models/lstm_predictions.png', dpi=150)
    print("[OK] Predictions plot saved to src/models/lstm_predictions.png")
    plt.close()


def predict_demand(model, scaler, recent_data, seq_length=24):
    """
    Make demand predictions using trained model.
    
    Args:
        model: Trained LSTM model
        scaler: Fitted scaler
        recent_data: DataFrame with recent hourly data
        seq_length: Sequence length model was trained with
    
    Returns:
        Predicted demand for next hour
    """
    if len(recent_data) < seq_length:
        print(f"[X] Need at least {seq_length} hours of data!")
        return None
    
    # Prepare features
    features = ['total_kwh', 'hour', 'day_of_week', 'month']
    data = recent_data[features].tail(seq_length).values
    
    # Scale
    scaled = scaler.transform(data)
    
    # Reshape for LSTM (1 sample, seq_length, n_features)
    X = scaled.reshape(1, seq_length, -1)
    
    # Predict
    pred_scaled = model.predict(X, verbose=0)
    
    # Inverse transform
    pred = pred_scaled[0, 0] * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
    
    return pred


def main():
    """Main function to train and evaluate the model."""
    print("\n" + "="*60)
    print("Urban Grid Management System")
    print("LSTM Demand Forecasting Model")
    print("="*60)
    
    # Train model
    model, scaler, history = train_demand_forecast_model(
        seq_length=24,  # Use 24 hours of history
        epochs=50,
        batch_size=32
    )
    
    if model is None:
        print("\n[X] Training failed!")
        return
    
    # Test prediction
    print("\n" + "="*60)
    print("Sample Prediction")
    print("="*60)
    
    df = fetch_demand_data()
    if df is not None and len(df) >= 24:
        pred = predict_demand(model, scaler, df, seq_length=24)
        if pred is not None:
            print(f"Predicted demand for next hour: {pred:.2f} kWh")
    
    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)


if __name__ == "__main__":
    main()

