"""
TFT (Temporal Fusion Transformer-style) Demand Forecasting Model for Urban Grid Management System.

This model predicts future energy demand using attention over time (TFT-style):
interpretable multi-horizon forecasting with temporal attention.
Uses the same meter_readings data as LSTM so TFT vs LSTM comparison is meaningful.
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

import tensorflow as tf
from tensorflow import keras
from keras import layers, models, callbacks, Input, Model

_gpus = tf.config.list_physical_devices('GPU')
if _gpus:
    try:
        for _g in _gpus:
            tf.config.experimental.set_memory_growth(_g, True)
    except RuntimeError:
        pass

from src.models.lstm_demand_forecast import fetch_demand_data, create_sequences


def build_tft_model(seq_length, n_features, forecast_horizon=1):
    """
    Build TFT-style model: input -> Dense encoding -> MultiHeadAttention over time -> pool -> output.
    Different from LSTM so TFT vs LSTM comparison is meaningful.
    """
    inp = Input(shape=(seq_length, n_features))
    # Encode each timestep
    x = layers.Dense(32, activation='relu')(inp)  # (batch, seq_length, 32)
    # Self-attention over time (TFT-style: which past hours matter)
    x = layers.MultiHeadAttention(num_heads=2, key_dim=16)(x, x, x)  # (batch, seq_length, 32)
    x = layers.GlobalAveragePooling1D()(x)  # (batch, 32)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(16, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    out = layers.Dense(forecast_horizon)(x)

    model = Model(inp, out)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    return model


def train_tft_demand_forecast_model(seq_length=24, epochs=50, batch_size=32):
    """Train TFT-style demand forecasting model. Saves to src/models/tft_demand_model.keras."""
    print("\n" + "="*60)
    print("TFT Demand Forecasting Model - Training")
    print("="*60)

    df = fetch_demand_data()
    if df is None or len(df) < seq_length + 10:
        print("[X] Insufficient data for training!")
        return None, None, None

    features = ['total_kwh', 'hour', 'day_of_week', 'month']
    data = df[features].values
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data)

    X, y = create_sequences(scaled_data, seq_length=seq_length)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    n_features = X.shape[2]
    model = build_tft_model(seq_length, n_features)
    model.summary()

    early_stop = callbacks.EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    history = model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.2,
        callbacks=[early_stop],
        verbose=1
    )

    y_pred = model.predict(X_test, verbose=0)
    y_test_inv = y_test * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
    y_pred_inv = y_pred * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]

    rmse = np.sqrt(mean_squared_error(y_test_inv, y_pred_inv))
    mae = mean_absolute_error(y_test_inv, y_pred_inv)
    r2 = r2_score(y_test_inv, y_pred_inv)
    print(f"Test RMSE: {rmse:.4f}, MAE: {mae:.4f}, R2: {r2:.4f}")

    model_path = "src/models/tft_demand_model.keras"
    model.save(model_path)
    print(f"[OK] Model saved to {model_path}")

    # Save metrics for API overview
    metrics_path = "src/models/tft_metrics.json"
    import json
    with open(metrics_path, 'w') as f:
        json.dump({"rmse": rmse, "mae": mae, "r2": r2, "training_time": len(history.history['loss'])}, f)

    # Plots
    plt.figure(figsize=(12, 4))
    plt.subplot(1, 2, 1)
    plt.plot(history.history['loss'], label='Training Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('TFT Model Loss')
    plt.xlabel('Epoch')
    plt.legend()
    plt.grid(True)
    plt.subplot(1, 2, 2)
    plt.plot(history.history['mae'], label='Training MAE')
    plt.plot(history.history['val_mae'], label='Validation MAE')
    plt.title('TFT Model MAE')
    plt.xlabel('Epoch')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig("src/models/tft_training_history.png", dpi=150)
    plt.close()

    n = min(100, len(y_test_inv))
    plt.figure(figsize=(14, 5))
    plt.plot(range(n), y_test_inv[:n], label='Actual', alpha=0.8)
    plt.plot(range(n), y_pred_inv[:n], label='TFT Predicted', alpha=0.8)
    plt.title('TFT Demand Forecast: Actual vs Predicted')
    plt.xlabel('Time Step')
    plt.ylabel('Total kWh')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig("src/models/tft_predictions.png", dpi=150)
    plt.close()

    return model, scaler, history


def main():
    print("\n" + "="*60)
    print("Urban Grid Management System - TFT Demand Model")
    print("="*60)
    model, scaler, history = train_tft_demand_forecast_model(seq_length=24, epochs=50, batch_size=32)
    if model is None:
        print("\n[X] Training failed!")
        return
    print("\n[OK] TFT training complete. Use tft_demand_model.keras in the API.")


if __name__ == "__main__":
    main()
