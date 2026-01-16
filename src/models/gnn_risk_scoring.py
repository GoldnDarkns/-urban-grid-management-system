"""
GNN Zone Risk Scoring Model for Urban Grid Management System.

This model uses Graph Neural Networks to compute risk scores for zones,
considering both zone features and network effects (neighboring zone influence).

Uses a simple GNN implementation with TensorFlow (no Spektral dependency).
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF warnings

import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

# TensorFlow/Keras imports
import tensorflow as tf
from tensorflow import keras
from keras import layers, models, callbacks

from src.db.mongo_client import get_db


def fetch_zone_data():
    """
    Fetch zone data and features from MongoDB.
    
    Returns:
        DataFrame with zone features
    """
    print("Fetching zone data from MongoDB...")
    db = get_db()
    
    zones = list(db.zones.find())
    
    if not zones:
        print("[X] No zones found!")
        return None
    
    # Get zone features
    zone_data = []
    for z in zones:
        zone_data.append({
            "zone_id": z["_id"],
            "name": z["name"],
            "population_est": z.get("population_est", 10000),
            "grid_priority": z.get("grid_priority", 1),
            "has_hospital": "hospital" in z.get("critical_sites", []),
            "has_water": "water" in z.get("critical_sites", []),
            "has_telecom": "telecom" in z.get("critical_sites", []),
            "has_emergency": "emergency" in z.get("critical_sites", []),
            "num_critical_sites": len(z.get("critical_sites", []))
        })
    
    df = pd.DataFrame(zone_data)
    print(f"[OK] Fetched {len(df)} zones")
    
    return df


def fetch_zone_metrics():
    """
    Fetch aggregated metrics for each zone from time-series data.
    
    Returns:
        DataFrame with zone metrics (demand, AQI, etc.)
    """
    print("Fetching zone metrics from MongoDB...")
    db = get_db()
    
    # Get demand metrics per zone
    demand_pipeline = [
        {"$group": {
            "_id": "$zone_id",
            "total_kwh": {"$sum": "$kwh"},
            "avg_kwh": {"$avg": "$kwh"},
            "max_kwh": {"$max": "$kwh"},
            "reading_count": {"$sum": 1}
        }}
    ]
    demand_results = list(db.meter_readings.aggregate(demand_pipeline))
    demand_df = pd.DataFrame(demand_results).rename(columns={"_id": "zone_id"})
    
    # Get AQI metrics per zone
    aqi_pipeline = [
        {"$group": {
            "_id": "$zone_id",
            "avg_aqi": {"$avg": "$aqi"},
            "max_aqi": {"$max": "$aqi"},
            "avg_temp": {"$avg": "$temperature_c"}
        }}
    ]
    aqi_results = list(db.air_climate_readings.aggregate(aqi_pipeline))
    aqi_df = pd.DataFrame(aqi_results).rename(columns={"_id": "zone_id"})
    
    # Get alert counts per zone
    alert_pipeline = [
        {"$group": {
            "_id": "$zone_id",
            "alert_count": {"$sum": 1},
            "emergency_alerts": {"$sum": {"$cond": [{"$eq": ["$level", "emergency"]}, 1, 0]}}
        }}
    ]
    alert_results = list(db.alerts.aggregate(alert_pipeline))
    alert_df = pd.DataFrame(alert_results).rename(columns={"_id": "zone_id"})
    
    # Merge all metrics
    metrics_df = demand_df
    if not aqi_df.empty:
        metrics_df = metrics_df.merge(aqi_df, on="zone_id", how="outer")
    if not alert_df.empty:
        metrics_df = metrics_df.merge(alert_df, on="zone_id", how="outer")
    
    metrics_df = metrics_df.fillna(0)
    
    print(f"[OK] Fetched metrics for {len(metrics_df)} zones")
    
    return metrics_df


def fetch_adjacency_matrix():
    """
    Fetch zone adjacency from grid_edges and build adjacency matrix.
    
    Returns:
        Adjacency matrix (numpy array), zone_id to index mapping
    """
    print("Fetching adjacency matrix from MongoDB...")
    db = get_db()
    
    # Get all zones
    zones = list(db.zones.find({}, {"_id": 1}))
    zone_ids = sorted([z["_id"] for z in zones])
    zone_to_idx = {z: i for i, z in enumerate(zone_ids)}
    n_zones = len(zone_ids)
    
    # Initialize adjacency matrix with self-loops
    adj_matrix = np.eye(n_zones)
    
    # Get edges
    edges = list(db.grid_edges.find())
    
    for edge in edges:
        from_zone = edge["from_zone"]
        to_zone = edge["to_zone"]
        
        if from_zone in zone_to_idx and to_zone in zone_to_idx:
            i = zone_to_idx[from_zone]
            j = zone_to_idx[to_zone]
            adj_matrix[i, j] = 1
            adj_matrix[j, i] = 1  # Ensure symmetric
    
    # Normalize adjacency matrix (D^-1/2 * A * D^-1/2)
    degree = np.sum(adj_matrix, axis=1)
    d_inv_sqrt = np.diag(1.0 / np.sqrt(degree + 1e-8))
    adj_normalized = d_inv_sqrt @ adj_matrix @ d_inv_sqrt
    
    print(f"[OK] Built {n_zones}x{n_zones} adjacency matrix")
    print(f"    Total edges: {len(edges)}")
    
    return adj_normalized, zone_to_idx


def create_risk_labels(zone_df, metrics_df):
    """
    Create risk labels based on zone features and metrics.
    
    Risk levels:
    - 0 (Low): Normal conditions
    - 1 (Medium): Elevated risk
    - 2 (High): High risk (critical infrastructure + high AQI/demand)
    """
    # Merge zone features with metrics
    df = zone_df.merge(metrics_df, on="zone_id", how="left").fillna(0)
    
    # Calculate risk score
    risk_score = np.zeros(len(df))
    
    # Factor 1: Grid priority (higher = more critical)
    risk_score += df["grid_priority"].values * 10
    
    # Factor 2: Critical infrastructure
    risk_score += df["has_hospital"].astype(int).values * 30
    risk_score += df["has_water"].astype(int).values * 15
    risk_score += df["has_emergency"].astype(int).values * 10
    
    # Factor 3: High AQI
    if "avg_aqi" in df.columns:
        risk_score += np.where(df["avg_aqi"] > 150, 25, 0)
        risk_score += np.where(df["avg_aqi"] > 100, 10, 0)
    
    # Factor 4: High demand
    if "max_kwh" in df.columns:
        high_demand_threshold = df["max_kwh"].quantile(0.75)
        risk_score += np.where(df["max_kwh"] > high_demand_threshold, 15, 0)
    
    # Factor 5: Alert history
    if "emergency_alerts" in df.columns:
        risk_score += df["emergency_alerts"].values * 20
    
    # Categorize into risk levels
    risk_labels = np.zeros(len(df), dtype=int)
    risk_labels[risk_score >= 30] = 1  # Medium
    risk_labels[risk_score >= 60] = 2  # High
    
    df["risk_score"] = risk_score
    df["risk_label"] = risk_labels
    
    print(f"\nRisk distribution:")
    print(f"  Low (0): {np.sum(risk_labels == 0)}")
    print(f"  Medium (1): {np.sum(risk_labels == 1)}")
    print(f"  High (2): {np.sum(risk_labels == 2)}")
    
    return df


class GraphConvLayer(layers.Layer):
    """
    Simple Graph Convolution Layer.
    
    Implements: H' = sigma(A * H * W)
    where A is normalized adjacency, H is node features, W is learnable weights.
    """
    
    def __init__(self, units, activation='relu', **kwargs):
        super().__init__(**kwargs)
        self.units = units
        self.activation = keras.activations.get(activation)
    
    def build(self, input_shape):
        # input_shape[0] is features shape: (batch, nodes, features)
        self.w = self.add_weight(
            shape=(input_shape[0][-1], self.units),
            initializer='glorot_uniform',
            trainable=True,
            name='kernel'
        )
        self.b = self.add_weight(
            shape=(self.units,),
            initializer='zeros',
            trainable=True,
            name='bias'
        )
    
    def call(self, inputs):
        features, adj = inputs
        # Graph convolution: A * X * W + b
        support = tf.matmul(features, self.w)  # X * W
        output = tf.matmul(adj, support) + self.b  # A * (X * W) + b
        return self.activation(output)


def build_gnn_model(n_nodes, n_features, n_classes=3):
    """
    Build GNN model for zone risk classification.
    
    Args:
        n_nodes: Number of zones
        n_features: Number of input features per zone
        n_classes: Number of risk classes
    
    Returns:
        Compiled Keras model
    """
    # Inputs
    feature_input = layers.Input(shape=(n_nodes, n_features), name='features')
    adj_input = layers.Input(shape=(n_nodes, n_nodes), name='adjacency')
    
    # Graph convolution layers
    x = GraphConvLayer(32, activation='relu')([feature_input, adj_input])
    x = layers.Dropout(0.3)(x)
    x = GraphConvLayer(16, activation='relu')([x, adj_input])
    x = layers.Dropout(0.3)(x)
    
    # Output layer (per-node classification)
    output = layers.Dense(n_classes, activation='softmax')(x)
    
    model = models.Model(inputs=[feature_input, adj_input], outputs=output)
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.01),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def train_gnn_model(epochs=100, batch_size=1):
    """
    Train the GNN model for zone risk scoring.
    
    Returns:
        Trained model, scaler, and training history
    """
    print("\n" + "="*60)
    print("GNN Zone Risk Scoring - Training")
    print("="*60)
    
    # Fetch data
    zone_df = fetch_zone_data()
    if zone_df is None:
        return None, None, None
    
    metrics_df = fetch_zone_metrics()
    adj_matrix, zone_to_idx = fetch_adjacency_matrix()
    
    # Create labels
    df = create_risk_labels(zone_df, metrics_df)
    
    # Prepare features
    feature_cols = ['population_est', 'grid_priority', 'has_hospital', 'has_water',
                    'has_telecom', 'has_emergency', 'num_critical_sites']
    
    # Add metrics if available
    for col in ['total_kwh', 'avg_kwh', 'max_kwh', 'avg_aqi', 'max_aqi', 
                'alert_count', 'emergency_alerts']:
        if col in df.columns:
            feature_cols.append(col)
    
    # Sort by zone_id to match adjacency matrix order
    df = df.sort_values('zone_id').reset_index(drop=True)
    
    print(f"\nFeatures: {feature_cols}")
    
    # Scale features
    scaler = MinMaxScaler()
    features = scaler.fit_transform(df[feature_cols].values)
    
    # Get labels
    labels = df['risk_label'].values
    
    n_nodes = len(df)
    n_features = features.shape[1]
    n_classes = 3
    
    print(f"Nodes: {n_nodes}, Features: {n_features}, Classes: {n_classes}")
    
    # Reshape for GNN (batch, nodes, features)
    X = features.reshape(1, n_nodes, n_features)
    A = adj_matrix.reshape(1, n_nodes, n_nodes)
    y = labels.reshape(1, n_nodes)
    
    # Build model
    model = build_gnn_model(n_nodes, n_features, n_classes)
    
    print("\nModel Architecture:")
    model.summary()
    
    # Train
    print("\nTraining...")
    history = model.fit(
        [X, A], y,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.0,  # Small dataset, use all for training
        verbose=1
    )
    
    # Evaluate
    print("\n" + "="*60)
    print("Model Evaluation")
    print("="*60)
    
    y_pred_proba = model.predict([X, A], verbose=0)
    y_pred = np.argmax(y_pred_proba[0], axis=1)
    
    print("\nClassification Report:")
    unique_labels = np.unique(np.concatenate([labels, y_pred]))
    target_names = ['Low', 'Medium', 'High'][:len(unique_labels)]
    print(classification_report(labels, y_pred, labels=unique_labels, target_names=target_names))
    
    # Confusion matrix
    cm = confusion_matrix(labels, y_pred)
    print("Confusion Matrix:")
    print(cm)
    
    # Save model
    model_path = "src/models/gnn_risk_model.keras"
    model.save(model_path)
    print(f"\n[OK] Model saved to {model_path}")
    
    # Plot results
    plot_training_history(history)
    plot_risk_scores(df, y_pred, y_pred_proba[0])
    
    return model, scaler, history


def plot_training_history(history):
    """Plot training loss and accuracy."""
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history['loss'], label='Loss')
    plt.title('GNN Training Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True)
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['accuracy'], label='Accuracy')
    plt.title('GNN Training Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('src/models/gnn_training_history.png', dpi=150)
    print("[OK] Training history plot saved to src/models/gnn_training_history.png")
    plt.close()


def plot_risk_scores(df, predictions, probabilities):
    """Plot zone risk scores."""
    plt.figure(figsize=(14, 5))
    
    # Bar chart of risk levels
    plt.subplot(1, 2, 1)
    colors = ['green', 'orange', 'red']
    risk_colors = [colors[p] for p in predictions]
    plt.bar(range(len(df)), df['risk_score'], color=risk_colors, alpha=0.7)
    plt.xlabel('Zone Index')
    plt.ylabel('Risk Score')
    plt.title('Zone Risk Scores')
    plt.xticks(range(len(df)), df['zone_id'], rotation=45, ha='right')
    
    # Probability heatmap
    plt.subplot(1, 2, 2)
    plt.imshow(probabilities.T, aspect='auto', cmap='RdYlGn_r')
    plt.colorbar(label='Probability')
    plt.yticks([0, 1, 2], ['Low', 'Medium', 'High'])
    plt.xticks(range(len(df)), df['zone_id'], rotation=45, ha='right')
    plt.xlabel('Zone')
    plt.ylabel('Risk Level')
    plt.title('Risk Probability Distribution')
    
    plt.tight_layout()
    plt.savefig('src/models/gnn_risk_scores.png', dpi=150)
    print("[OK] Risk scores plot saved to src/models/gnn_risk_scores.png")
    plt.close()


def predict_zone_risk():
    """
    Load trained model and predict risk for all zones.
    """
    print("\n" + "="*60)
    print("Zone Risk Prediction")
    print("="*60)
    
    # Load model
    try:
        model = keras.models.load_model(
            "src/models/gnn_risk_model.keras",
            custom_objects={'GraphConvLayer': GraphConvLayer}
        )
    except Exception as e:
        print(f"[X] Could not load model: {e}")
        return
    
    # Fetch current data
    zone_df = fetch_zone_data()
    metrics_df = fetch_zone_metrics()
    adj_matrix, _ = fetch_adjacency_matrix()
    
    df = create_risk_labels(zone_df, metrics_df)
    
    # Prepare features
    feature_cols = ['population_est', 'grid_priority', 'has_hospital', 'has_water',
                    'has_telecom', 'has_emergency', 'num_critical_sites']
    
    for col in ['total_kwh', 'avg_kwh', 'max_kwh', 'avg_aqi', 'max_aqi',
                'alert_count', 'emergency_alerts']:
        if col in df.columns:
            feature_cols.append(col)
    
    df = df.sort_values('zone_id').reset_index(drop=True)
    
    scaler = MinMaxScaler()
    features = scaler.fit_transform(df[feature_cols].values)
    
    n_nodes = len(df)
    X = features.reshape(1, n_nodes, -1)
    A = adj_matrix.reshape(1, n_nodes, n_nodes)
    
    # Predict
    y_pred_proba = model.predict([X, A], verbose=0)
    y_pred = np.argmax(y_pred_proba[0], axis=1)
    
    risk_names = ['Low', 'Medium', 'High']
    
    print("\nZone Risk Assessment:")
    print("-" * 60)
    
    for i, row in df.iterrows():
        risk_level = risk_names[y_pred[i]]
        confidence = y_pred_proba[0][i][y_pred[i]] * 100
        print(f"{row['zone_id']} ({row['name']}):")
        print(f"  Risk Level: {risk_level} (Confidence: {confidence:.1f}%)")
        print(f"  Grid Priority: {row['grid_priority']}")
        if row['has_hospital']:
            print(f"  [!] Has Hospital - Critical Infrastructure")
        print()


def main():
    """Main function to train and evaluate the model."""
    print("\n" + "="*60)
    print("Urban Grid Management System")
    print("GNN Zone Risk Scoring Model")
    print("="*60)
    
    # Train model
    model, scaler, history = train_gnn_model(
        epochs=100,
        batch_size=1
    )
    
    if model is None:
        print("\n[X] Training failed!")
        return
    
    # Predict risks
    predict_zone_risk()
    
    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)


if __name__ == "__main__":
    main()

