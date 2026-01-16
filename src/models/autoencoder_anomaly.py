"""
Autoencoder Anomaly Detection Model for Urban Grid Management System.

This model detects anomalous energy consumption patterns by learning
normal patterns and flagging deviations (high reconstruction error).
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF warnings

import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

# TensorFlow/Keras imports
import tensorflow as tf
from tensorflow import keras
from keras import layers, models, callbacks

from src.db.mongo_client import get_db


def fetch_consumption_data(limit=50000):
    """
    Fetch meter readings from MongoDB for anomaly detection.
    
    Returns:
        DataFrame with consumption data per household per hour
    """
    print("Fetching consumption data from MongoDB...")
    db = get_db()
    
    # Simpler query - just fetch raw readings with a limit
    # This avoids memory issues on Atlas free tier
    cursor = db.meter_readings.find(
        {},
        {"household_id": 1, "ts": 1, "kwh": 1, "voltage": 1, "_id": 0}
    ).limit(limit)
    
    results = list(cursor)
    
    if not results:
        print("[X] No meter readings found!")
        return None
    
    # Convert to DataFrame
    data = []
    for r in results:
        ts = r["ts"]
        if isinstance(ts, datetime):
            dt = ts
        else:
            dt = datetime.fromisoformat(str(ts))
        
        data.append({
            "household_id": r["household_id"],
            "timestamp": dt,
            "kwh": r["kwh"],
            "voltage": r.get("voltage", 230.0) or 230.0,
            "hour": dt.hour,
            "day_of_week": dt.weekday()
        })
    
    df = pd.DataFrame(data)
    
    print(f"[OK] Fetched {len(df)} records")
    print(f"    Households: {df['household_id'].nunique()}")
    print(f"    Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    
    return df


def prepare_features(df):
    """
    Prepare features for autoencoder.
    
    Features:
    - kwh: Energy consumption
    - voltage: Voltage level
    - hour: Hour of day (cyclical)
    - day_of_week: Day of week (cyclical)
    """
    # Create cyclical features for time
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    
    features = ['kwh', 'voltage', 'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos']
    return df[features].values, features


def build_autoencoder(input_dim, encoding_dim=3):
    """
    Build autoencoder model architecture.
    
    Architecture:
    - Encoder: input_dim -> 16 -> 8 -> encoding_dim
    - Decoder: encoding_dim -> 8 -> 16 -> input_dim
    
    Args:
        input_dim: Number of input features
        encoding_dim: Size of the latent space
    
    Returns:
        Compiled autoencoder model
    """
    # Encoder
    inputs = layers.Input(shape=(input_dim,))
    encoded = layers.Dense(16, activation='relu')(inputs)
    encoded = layers.Dropout(0.2)(encoded)
    encoded = layers.Dense(8, activation='relu')(encoded)
    encoded = layers.Dense(encoding_dim, activation='relu')(encoded)
    
    # Decoder
    decoded = layers.Dense(8, activation='relu')(encoded)
    decoded = layers.Dense(16, activation='relu')(decoded)
    decoded = layers.Dropout(0.2)(decoded)
    outputs = layers.Dense(input_dim, activation='linear')(decoded)
    
    # Model
    autoencoder = models.Model(inputs, outputs)
    
    autoencoder.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse'
    )
    
    return autoencoder


def train_autoencoder(epochs=50, batch_size=64):
    """
    Train the autoencoder for anomaly detection.
    
    The model learns to reconstruct normal patterns.
    High reconstruction error indicates anomalies.
    
    Returns:
        Trained model, scaler, threshold, and training history
    """
    print("\n" + "="*60)
    print("Autoencoder Anomaly Detection - Training")
    print("="*60)
    
    # Fetch data
    df = fetch_consumption_data()
    if df is None or len(df) < 100:
        print("[X] Insufficient data for training!")
        return None, None, None, None
    
    # Prepare features
    data, feature_names = prepare_features(df)
    print(f"\nFeatures: {feature_names}")
    print(f"Data shape: {data.shape}")
    
    # Scale data
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data)
    
    # Split data (use all data for training since we want to learn "normal")
    # In practice, you'd filter out known anomalies first
    X_train, X_test = train_test_split(scaled_data, test_size=0.2, random_state=42)
    
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    
    # Build model
    input_dim = X_train.shape[1]
    autoencoder = build_autoencoder(input_dim, encoding_dim=3)
    
    print("\nModel Architecture:")
    autoencoder.summary()
    
    # Callbacks
    early_stop = callbacks.EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    )
    
    # Train
    print("\nTraining...")
    history = autoencoder.fit(
        X_train, X_train,  # Autoencoder reconstructs input
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.2,
        callbacks=[early_stop],
        verbose=1
    )
    
    # Calculate reconstruction error on test set
    print("\n" + "="*60)
    print("Model Evaluation")
    print("="*60)
    
    X_pred = autoencoder.predict(X_test, verbose=0)
    mse = np.mean(np.power(X_test - X_pred, 2), axis=1)
    
    # Set threshold at 95th percentile of reconstruction error
    threshold = np.percentile(mse, 95)
    
    print(f"Reconstruction Error (MSE):")
    print(f"  Mean: {np.mean(mse):.6f}")
    print(f"  Std: {np.std(mse):.6f}")
    print(f"  Min: {np.min(mse):.6f}")
    print(f"  Max: {np.max(mse):.6f}")
    print(f"  Threshold (95th percentile): {threshold:.6f}")
    
    # Count anomalies
    anomalies = mse > threshold
    print(f"\nAnomalies detected: {np.sum(anomalies)} ({np.sum(anomalies)/len(mse)*100:.2f}%)")
    
    # Save model
    model_path = "src/models/autoencoder_anomaly_model.keras"
    autoencoder.save(model_path)
    print(f"\n[OK] Model saved to {model_path}")
    
    # Save threshold
    np.save("src/models/anomaly_threshold.npy", threshold)
    print("[OK] Threshold saved to src/models/anomaly_threshold.npy")
    
    # Plot results
    plot_training_history(history)
    plot_reconstruction_error(mse, threshold)
    
    return autoencoder, scaler, threshold, history


def plot_training_history(history):
    """Plot training loss."""
    plt.figure(figsize=(10, 4))
    
    plt.plot(history.history['loss'], label='Training Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Autoencoder Training Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss (MSE)')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('src/models/autoencoder_training_history.png', dpi=150)
    print("[OK] Training history plot saved to src/models/autoencoder_training_history.png")
    plt.close()


def plot_reconstruction_error(mse, threshold):
    """Plot reconstruction error distribution."""
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.hist(mse, bins=50, alpha=0.7, edgecolor='black')
    plt.axvline(x=threshold, color='r', linestyle='--', label=f'Threshold ({threshold:.4f})')
    plt.title('Reconstruction Error Distribution')
    plt.xlabel('MSE')
    plt.ylabel('Frequency')
    plt.legend()
    plt.grid(True)
    
    plt.subplot(1, 2, 2)
    plt.scatter(range(len(mse)), mse, alpha=0.5, s=10)
    plt.axhline(y=threshold, color='r', linestyle='--', label='Threshold')
    plt.title('Reconstruction Error per Sample')
    plt.xlabel('Sample Index')
    plt.ylabel('MSE')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('src/models/autoencoder_reconstruction_error.png', dpi=150)
    print("[OK] Reconstruction error plot saved to src/models/autoencoder_reconstruction_error.png")
    plt.close()


def detect_anomalies(model, scaler, threshold, new_data):
    """
    Detect anomalies in new data.
    
    Args:
        model: Trained autoencoder
        scaler: Fitted scaler
        threshold: Anomaly threshold
        new_data: DataFrame with new readings
    
    Returns:
        DataFrame with anomaly flags and scores
    """
    # Prepare features
    data, _ = prepare_features(new_data.copy())
    
    # Scale
    scaled = scaler.transform(data)
    
    # Reconstruct
    reconstructed = model.predict(scaled, verbose=0)
    
    # Calculate reconstruction error
    mse = np.mean(np.power(scaled - reconstructed, 2), axis=1)
    
    # Flag anomalies
    is_anomaly = mse > threshold
    
    # Add results to dataframe
    result = new_data.copy()
    result['reconstruction_error'] = mse
    result['is_anomaly'] = is_anomaly
    result['anomaly_score'] = mse / threshold  # Score > 1 means anomaly
    
    return result


def analyze_anomalies_in_db():
    """
    Run anomaly detection on data in MongoDB and report findings.
    """
    print("\n" + "="*60)
    print("Analyzing Anomalies in Database")
    print("="*60)
    
    # Load model and threshold
    try:
        model = keras.models.load_model("src/models/autoencoder_anomaly_model.keras")
        threshold = np.load("src/models/anomaly_threshold.npy")
    except Exception as e:
        print(f"[X] Could not load model: {e}")
        print("    Run training first!")
        return
    
    # Fetch data
    df = fetch_consumption_data()
    if df is None:
        return
    
    # Prepare and scale
    data, _ = prepare_features(df.copy())
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(data)
    
    # Detect anomalies
    reconstructed = model.predict(scaled, verbose=0)
    mse = np.mean(np.power(scaled - reconstructed, 2), axis=1)
    
    df['reconstruction_error'] = mse
    df['is_anomaly'] = mse > threshold
    df['anomaly_score'] = mse / threshold
    
    # Report
    anomalies = df[df['is_anomaly']]
    
    print(f"\nTotal records analyzed: {len(df)}")
    print(f"Anomalies detected: {len(anomalies)} ({len(anomalies)/len(df)*100:.2f}%)")
    
    if len(anomalies) > 0:
        print(f"\nTop 10 anomalies by score:")
        top_anomalies = anomalies.nlargest(10, 'anomaly_score')
        for _, row in top_anomalies.iterrows():
            print(f"  {row['household_id']} at {row['timestamp']}: "
                  f"{row['kwh']:.2f} kWh, Score: {row['anomaly_score']:.2f}")
        
        # Anomalies by household
        print(f"\nHouseholds with most anomalies:")
        household_anomalies = anomalies.groupby('household_id').size().sort_values(ascending=False)
        for hh, count in household_anomalies.head(5).items():
            print(f"  {hh}: {count} anomalies")
    
    return df


def main():
    """Main function to train and evaluate the model."""
    print("\n" + "="*60)
    print("Urban Grid Management System")
    print("Autoencoder Anomaly Detection Model")
    print("="*60)
    
    # Train model
    model, scaler, threshold, history = train_autoencoder(
        epochs=50,
        batch_size=64
    )
    
    if model is None:
        print("\n[X] Training failed!")
        return
    
    # Analyze anomalies
    analyze_anomalies_in_db()
    
    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)


if __name__ == "__main__":
    main()

