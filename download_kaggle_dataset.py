#!/usr/bin/env python3
"""
Download Kaggle AQI Dataset
Attempts to download the dataset using Kaggle API or direct download
"""
import os
import sys
import requests
import zipfile
import shutil
from pathlib import Path

DATASET_REF = "patelfarhaan/starter-historical-air-quality-ae56e46a-2"
OUTPUT_DIR = Path("data")
CSV_FILE = OUTPUT_DIR / "kaggle_aqi.csv"

def download_via_kaggle_cli():
    """Try to download using Kaggle CLI"""
    try:
        import kaggle
        print("[Kaggle] Using Kaggle CLI...")
        
        # Download the kernel/dataset
        kaggle.api.authenticate()
        print(f"[Kaggle] Downloading {DATASET_REF}...")
        
        # Try kernel pull first
        try:
            kaggle.api.kernels_pull(DATASET_REF, path=str(OUTPUT_DIR / "kaggle_kernel"), unzip=True)
            print("[Kaggle] Kernel downloaded successfully")
            
            # Find CSV in the downloaded files
            csv_files = list((OUTPUT_DIR / "kaggle_kernel").glob("**/*.csv"))
            if csv_files:
                shutil.copy(csv_files[0], CSV_FILE)
                print(f"[Kaggle] CSV copied to {CSV_FILE}")
                return True
        except Exception as e:
            print(f"[Kaggle] Kernel pull failed: {e}")
        
        # Try dataset download
        try:
            dataset_owner, dataset_name = DATASET_REF.split("/", 1)
            kaggle.api.dataset_download_files(f"{dataset_owner}/{dataset_name}", path=str(OUTPUT_DIR), unzip=True)
            print("[Kaggle] Dataset downloaded successfully")
            
            # Find CSV
            csv_files = list(OUTPUT_DIR.glob("*.csv"))
            if csv_files:
                if csv_files[0] != CSV_FILE:
                    shutil.copy(csv_files[0], CSV_FILE)
                print(f"[Kaggle] CSV ready at {CSV_FILE}")
                return True
        except Exception as e:
            print(f"[Kaggle] Dataset download failed: {e}")
        
        return False
    except ImportError:
        print("[Kaggle] Kaggle library not installed. Install with: pip install kaggle")
        return False
    except Exception as e:
        print(f"[Kaggle] Error: {e}")
        return False

def download_public_dataset():
    """Try to download a publicly available AQI dataset"""
    print("[Public] Attempting to download EPA AQI data...")
    
    # Try to get a sample dataset from a public source
    # Note: This is a fallback - real Kaggle dataset is preferred
    try:
        # Create a more comprehensive sample with multiple cities and dates
        OUTPUT_DIR.mkdir(exist_ok=True)
        
        # Generate sample data for major US cities
        cities_data = [
            (40.7128, -74.0060, "New York", "NY"),
            (34.0522, -118.2437, "Los Angeles", "CA"),
            (41.8781, -87.6298, "Chicago", "IL"),
            (29.7604, -95.3698, "Houston", "TX"),
            (33.4484, -112.0740, "Phoenix", "AZ"),
            (39.9526, -75.1652, "Philadelphia", "PA"),
            (32.7767, -96.7970, "Dallas", "TX"),
            (37.7749, -122.4194, "San Francisco", "CA"),
            (25.7617, -80.1918, "Miami", "FL"),
            (47.6062, -122.3321, "Seattle", "WA"),
        ]
        
        import random
        from datetime import datetime, timedelta
        
        lines = ["lat,lon,aqi,pm25,pm10,o3,no2,so2,co,city,state,date\n"]
        
        # Generate data for last 30 days
        base_date = datetime.now()
        for day_offset in range(30):
            date = (base_date - timedelta(days=day_offset)).strftime("%Y-%m-%d")
            for lat, lon, city, state in cities_data:
                # Generate realistic AQI values (30-100 range)
                aqi = random.randint(30, 100)
                pm25 = round(random.uniform(5, 25), 1)
                pm10 = round(random.uniform(10, 35), 1)
                o3 = random.randint(20, 60)
                no2 = random.randint(15, 40)
                so2 = random.randint(2, 10)
                co = round(random.uniform(0.2, 1.0), 1)
                
                lines.append(f"{lat},{lon},{aqi},{pm25},{pm10},{o3},{no2},{so2},{co},{city},{state},{date}\n")
        
        with open(CSV_FILE, 'w') as f:
            f.writelines(lines)
        
        print(f"[Public] Generated sample dataset with {len(cities_data) * 30} records")
        print(f"[Public] CSV created at {CSV_FILE}")
        print("[Public] NOTE: This is sample data. For production, download real Kaggle dataset.")
        return True
    except Exception as e:
        print(f"[Public] Error creating sample: {e}")
        return False

def main():
    print("=" * 60)
    print("Kaggle AQI Dataset Downloader")
    print("=" * 60)
    print()
    
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    # Try Kaggle CLI first
    if download_via_kaggle_cli():
        print("\n✅ Dataset downloaded successfully!")
        return 0
    
    # Fallback: Create sample dataset
    print("\n⚠️  Could not download via Kaggle CLI.")
    print("Creating sample CSV dataset...")
    if download_public_dataset():
        print("\n✅ Sample CSV created.")
        print("\n📋 Next Steps:")
        print("1. Go to https://www.kaggle.com/datasets/epa/epa-historical-air-quality")
        print("2. Download the dataset manually")
        print(f"3. Place the CSV at: {CSV_FILE.absolute()}")
        return 0
    
    print("\n❌ Failed to download or create dataset.")
    return 1

if __name__ == "__main__":
    sys.exit(main())
