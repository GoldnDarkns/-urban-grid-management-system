#!/usr/bin/env python3
"""Create sample Kaggle AQI CSV dataset"""
import random
from pathlib import Path
from datetime import datetime, timedelta

data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

cities = [
    (40.7128, -74.0060, "New York", "NY"),
    (34.0522, -118.2437, "Los Angeles", "CA"),
    (41.8781, -87.6298, "Chicago", "IL"),
    (37.7749, -122.4194, "San Francisco", "CA"),
    (29.7604, -95.3698, "Houston", "TX"),
    (33.4484, -112.0740, "Phoenix", "AZ"),
    (39.9526, -75.1652, "Philadelphia", "PA"),
    (32.7767, -96.7970, "Dallas", "TX"),
    (25.7617, -80.1918, "Miami", "FL"),
    (47.6062, -122.3321, "Seattle", "WA"),
]

lines = ["lat,lon,aqi,pm25,pm10,o3,no2,so2,co,city,state,date\n"]

base_date = datetime.now()
for day_offset in range(30):
    date_str = (base_date - timedelta(days=day_offset)).strftime("%Y-%m-%d")
    for lat, lon, city, state in cities:
        aqi = random.randint(30, 100)
        pm25 = round(random.uniform(5, 25), 1)
        pm10 = round(random.uniform(10, 35), 1)
        o3 = random.randint(20, 60)
        no2 = random.randint(15, 40)
        so2 = random.randint(2, 10)
        co = round(random.uniform(0.2, 1.0), 1)
        
        lines.append(f"{lat},{lon},{aqi},{pm25},{pm10},{o3},{no2},{so2},{co},{city},{state},{date_str}\n")

csv_file = data_dir / "kaggle_aqi.csv"
with open(csv_file, 'w') as f:
    f.writelines(lines)

print(f"[SUCCESS] Created {len(lines)-1} records in {csv_file}")
