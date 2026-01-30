#!/bin/bash
# Setup script for Kaggle AQI dataset
# Downloads dataset using Kaggle CLI and prepares it for Kafka streaming

set -e

echo "=== Kaggle AQI Dataset Setup ==="

# Check if Kaggle CLI is installed
if ! command -v kaggle &> /dev/null; then
    echo "ERROR: Kaggle CLI not found. Installing..."
    pip install kaggle
    echo "Please configure Kaggle credentials:"
    echo "1. Go to https://www.kaggle.com/account"
    echo "2. Create API token (download kaggle.json)"
    echo "3. Place it at ~/.kaggle/kaggle.json"
    echo "   OR set KAGGLE_USERNAME and KAGGLE_KEY environment variables"
    exit 1
fi

# Dataset reference from user
DATASET="patelfarhaan/starter-historical-air-quality-ae56e46a-2"
OUTPUT_DIR="data"
CSV_FILE="$OUTPUT_DIR/kaggle_aqi.csv"

echo "Dataset: $DATASET"
echo "Output: $CSV_FILE"

# Create data directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Download dataset using Kaggle CLI
echo "Downloading dataset..."
kaggle kernels pull "$DATASET" -p "$OUTPUT_DIR/kaggle_kernel" || {
    echo "Note: Kernel pull may require authentication or the kernel may not be publicly accessible."
    echo "Trying dataset download instead..."
    
    # Try to download the dataset directly
    DATASET_OWNER=$(echo "$DATASET" | cut -d'/' -f1)
    DATASET_NAME=$(echo "$DATASET" | cut -d'/' -f2)
    
    kaggle datasets download -d "$DATASET_OWNER/$DATASET_NAME" -p "$OUTPUT_DIR" --unzip || {
        echo "ERROR: Could not download dataset."
        echo "Please manually download the CSV file and place it at: $CSV_FILE"
        echo "Or use: kaggle datasets download <dataset-owner>/<dataset-name> -p $OUTPUT_DIR --unzip"
        exit 1
    }
}

# Find the CSV file in the downloaded data
echo "Looking for CSV file..."
CSV_FOUND=$(find "$OUTPUT_DIR" -name "*.csv" -type f | head -1)

if [ -n "$CSV_FOUND" ] && [ "$CSV_FOUND" != "$CSV_FILE" ]; then
    echo "Found CSV: $CSV_FOUND"
    echo "Copying to $CSV_FILE..."
    cp "$CSV_FOUND" "$CSV_FILE"
    echo "✅ Dataset ready at $CSV_FILE"
elif [ -f "$CSV_FILE" ]; then
    echo "✅ Dataset already exists at $CSV_FILE"
else
    echo "⚠️  CSV file not found automatically."
    echo "Please manually place your Kaggle AQI CSV at: $CSV_FILE"
    echo "Expected columns: lat, lon, aqi, pm25, pm10, o3, no2, so2, co, city, state"
fi

echo ""
echo "=== Setup Complete ==="
echo "The Kafka producer will automatically use this dataset when AirVisual API is rate-limited."
echo "Restart backend: docker-compose restart backend"
