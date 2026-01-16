"""
Real data ingestion script for Urban Grid Management System.
Loads real-world datasets into MongoDB collections.
"""
import argparse
import os
import csv
from datetime import datetime, timezone
from pathlib import Path
from tqdm import tqdm
from src.db.mongo_client import get_db
from src.db.indexes import create_indexes

DATA_DIR = Path("data")


def parse_uci_power_consumption(filepath, limit=None):
    """
    Parse UCI Individual Household Electric Power Consumption dataset.
    
    File format: Date;Time;Global_active_power;Global_reactive_power;Voltage;
                 Global_intensity;Sub_metering_1;Sub_metering_2;Sub_metering_3
    """
    print(f"\nParsing UCI Power Consumption: {filepath}")
    
    readings = []
    line_count = 0
    error_count = 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        # Skip header
        header = f.readline()
        print(f"Header: {header.strip()}")
        
        for line in tqdm(f, desc="Reading power data"):
            if limit and line_count >= limit:
                break
            
            try:
                parts = line.strip().split(';')
                if len(parts) < 9:
                    continue
                
                date_str, time_str = parts[0], parts[1]
                
                # Skip missing values (marked as ?)
                if '?' in parts[2:]:
                    continue
                
                # Parse datetime (format: d/m/yyyy and hh:mm:ss)
                dt = datetime.strptime(f"{date_str} {time_str}", "%d/%m/%Y %H:%M:%S")
                dt = dt.replace(tzinfo=timezone.utc)
                
                # Parse values
                global_active_power = float(parts[2])  # kilowatts
                global_reactive_power = float(parts[3])
                voltage = float(parts[4])
                global_intensity = float(parts[5])  # amperes
                sub_metering_1 = float(parts[6])  # watt-hours
                sub_metering_2 = float(parts[7])
                sub_metering_3 = float(parts[8])
                
                # Convert minute reading to kWh (power in kW * 1/60 hour)
                kwh = global_active_power / 60.0
                
                readings.append({
                    "ts": dt,
                    "kwh": round(kwh, 4),
                    "voltage": voltage,
                    "global_active_power_kw": global_active_power,
                    "global_reactive_power_kw": global_reactive_power,
                    "intensity_amp": global_intensity,
                    "sub_metering_1_wh": sub_metering_1,
                    "sub_metering_2_wh": sub_metering_2,
                    "sub_metering_3_wh": sub_metering_3
                })
                
                line_count += 1
                
            except (ValueError, IndexError) as e:
                error_count += 1
                continue
    
    print(f"Parsed {len(readings):,} readings ({error_count} errors/skipped)")
    return readings


def aggregate_to_hourly(readings):
    """Aggregate minute-level readings to hourly."""
    print("Aggregating to hourly readings...")
    
    hourly = {}
    
    for r in tqdm(readings, desc="Aggregating"):
        # Round down to hour
        hour_key = r["ts"].replace(minute=0, second=0, microsecond=0)
        
        if hour_key not in hourly:
            hourly[hour_key] = {
                "ts": hour_key,
                "kwh_sum": 0,
                "voltage_sum": 0,
                "count": 0
            }
        
        hourly[hour_key]["kwh_sum"] += r["kwh"]
        hourly[hour_key]["voltage_sum"] += r["voltage"]
        hourly[hour_key]["count"] += 1
    
    # Calculate averages
    result = []
    for hour_key, data in hourly.items():
        result.append({
            "ts": data["ts"],
            "kwh": round(data["kwh_sum"], 3),
            "voltage": round(data["voltage_sum"] / data["count"], 1),
            "reading_count": data["count"]
        })
    
    result.sort(key=lambda x: x["ts"])
    print(f"Aggregated to {len(result):,} hourly readings")
    return result


def distribute_to_households(db, hourly_readings, sample_size=None, household_sample=100):
    """
    Distribute single-household readings across a sample of households.
    Uses scaling and variation to simulate multiple households.
    
    Args:
        household_sample: Number of households to use (default 100 to fit free tier)
    """
    print("\nDistributing readings across households...")
    
    all_households = list(db.households.find({}, {"_id": 1, "zone_id": 1, "baseline_kwh_daily": 1}))
    if not all_households:
        print("[X] No households found! Run seed_core.py first.")
        return
    
    # Sample households to reduce data size (for free tier limits)
    import random
    if len(all_households) > household_sample:
        households = random.sample(all_households, household_sample)
        print(f"Sampled {household_sample} households from {len(all_households)}")
    else:
        households = all_households
    
    print(f"Distributing to {len(households)} households")
    
    # Sample readings if too many
    if sample_size and len(hourly_readings) > sample_size:
        step = len(hourly_readings) // sample_size
        hourly_readings = hourly_readings[::step][:sample_size]
        print(f"Sampled to {len(hourly_readings)} readings")
    
    # Clear existing meter readings
    db.meter_readings.delete_many({})
    print("Cleared existing meter readings")
    
    batch = []
    batch_size = 10000
    total = len(hourly_readings) * len(households)
    
    with tqdm(total=total, desc="Creating household readings") as pbar:
        for reading in hourly_readings:
            base_kwh = reading["kwh"]
            
            for household in households:
                # Scale based on household baseline
                baseline = household.get("baseline_kwh_daily", 15)
                scale_factor = baseline / 15.0  # Normalize to average baseline
                
                # Add random variation (0.7 to 1.3)
                variation = random.uniform(0.7, 1.3)
                
                household_kwh = base_kwh * scale_factor * variation
                
                meter_reading = {
                    "household_id": household["_id"],
                    "zone_id": household["zone_id"],
                    "ts": reading["ts"],
                    "kwh": round(household_kwh, 4),
                    "voltage": reading["voltage"] + random.uniform(-5, 5),
                    "power_factor": round(random.uniform(0.85, 0.98), 2)
                }
                batch.append(meter_reading)
                pbar.update(1)
                
                if len(batch) >= batch_size:
                    db.meter_readings.insert_many(batch)
                    batch = []
    
    if batch:
        db.meter_readings.insert_many(batch)
    
    count = db.meter_readings.count_documents({})
    print(f"[OK] Inserted {count:,} meter readings")


def parse_india_aqi_data(filepath):
    """
    Parse India Air Quality dataset (city_day.csv or similar).
    
    Expected columns: City, Date, PM2.5, PM10, NO, NO2, NOx, NH3, CO, SO2, O3, Benzene, Toluene, Xylene, AQI, AQI_Bucket
    """
    print(f"\nParsing India AQI Data: {filepath}")
    
    readings = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in tqdm(reader, desc="Reading AQI data"):
            try:
                # Parse date
                date_str = row.get('Date', '')
                if not date_str:
                    continue
                
                # Try different date formats
                dt = None
                for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y']:
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        dt = dt.replace(tzinfo=timezone.utc)
                        break
                    except ValueError:
                        continue
                
                if not dt:
                    continue
                
                # Parse AQI and other values
                aqi = row.get('AQI', '')
                if not aqi or aqi == 'NA' or aqi == '':
                    continue
                
                try:
                    aqi = float(aqi)
                except ValueError:
                    continue
                
                # Parse optional fields
                def safe_float(val, default=None):
                    try:
                        if val and val != 'NA':
                            return float(val)
                    except ValueError:
                        pass
                    return default
                
                reading = {
                    "city": row.get('City', 'Unknown'),
                    "ts": dt,
                    "aqi": int(aqi),
                    "pm25": safe_float(row.get('PM2.5')),
                    "pm10": safe_float(row.get('PM10')),
                    "no2": safe_float(row.get('NO2')),
                    "co": safe_float(row.get('CO')),
                    "so2": safe_float(row.get('SO2')),
                    "o3": safe_float(row.get('O3')),
                    "aqi_bucket": row.get('AQI_Bucket', '')
                }
                readings.append(reading)
                
            except Exception as e:
                continue
    
    print(f"Parsed {len(readings):,} AQI readings")
    return readings


def distribute_aqi_to_zones(db, aqi_readings, sample_size=None):
    """
    Distribute AQI readings across our 20 zones.
    Maps cities to zones and adds variation.
    """
    print("\nDistributing AQI readings across zones...")
    
    zones = list(db.zones.find({}, {"_id": 1, "name": 1}))
    if not zones:
        print("[X] No zones found! Run seed_core.py first.")
        return
    
    print(f"Distributing to {len(zones)} zones")
    
    # Sample if needed
    if sample_size and len(aqi_readings) > sample_size:
        step = len(aqi_readings) // sample_size
        aqi_readings = aqi_readings[::step][:sample_size]
        print(f"Sampled to {len(aqi_readings)} readings")
    
    # Clear existing
    db.air_climate_readings.delete_many({})
    print("Cleared existing air/climate readings")
    
    import random
    batch = []
    batch_size = 5000
    total = len(aqi_readings) * len(zones)
    
    with tqdm(total=total, desc="Creating zone readings") as pbar:
        for reading in aqi_readings:
            base_aqi = reading["aqi"]
            
            for zone in zones:
                # Add zone-specific variation
                zone_offset = hash(zone["_id"]) % 30 - 15
                variation = random.uniform(0.85, 1.15)
                
                zone_aqi = int(base_aqi * variation + zone_offset)
                zone_aqi = max(20, min(500, zone_aqi))  # Clamp
                
                # Generate temperature based on season (rough estimate from date)
                month = reading["ts"].month
                if month in [4, 5, 6]:  # Summer
                    base_temp = random.uniform(32, 42)
                elif month in [11, 12, 1, 2]:  # Winter
                    base_temp = random.uniform(10, 22)
                else:  # Monsoon/transition
                    base_temp = random.uniform(25, 35)
                
                air_reading = {
                    "zone_id": zone["_id"],
                    "ts": reading["ts"],
                    "aqi": zone_aqi,
                    "pm25": reading.get("pm25") or random.uniform(20, 100),
                    "pm10": reading.get("pm10") or random.uniform(40, 150),
                    "temperature_c": round(base_temp + random.uniform(-3, 3), 1),
                    "humidity_pct": random.randint(30, 80),
                    "wind_speed_kmh": round(random.uniform(5, 25), 1)
                }
                batch.append(air_reading)
                pbar.update(1)
                
                if len(batch) >= batch_size:
                    db.air_climate_readings.insert_many(batch)
                    batch = []
    
    if batch:
        db.air_climate_readings.insert_many(batch)
    
    count = db.air_climate_readings.count_documents({})
    print(f"[OK] Inserted {count:,} air/climate readings")


def generate_alerts_from_real_data(db):
    """Generate alerts based on real AQI data exceeding thresholds."""
    print("\nGenerating alerts from real data...")
    
    # Get policy thresholds
    policy = db.policies.find_one({"_id": "POL_AQI_CONTROL_V1"})
    if not policy:
        print("[X] No policy found!")
        return
    
    watch_threshold = 101
    alert_threshold = 151
    emergency_threshold = 201
    
    for t in policy.get("aqi_thresholds", []):
        if t["level"] == "watch":
            watch_threshold = t["min"]
        elif t["level"] == "alert":
            alert_threshold = t["min"]
        elif t["level"] == "emergency":
            emergency_threshold = t["min"]
    
    # Clear existing alerts
    db.alerts.delete_many({})
    
    # Find high AQI readings
    high_readings = list(db.air_climate_readings.aggregate([
        {"$match": {"aqi": {"$gte": watch_threshold}}},
        {"$sample": {"size": 200}}  # Sample to avoid too many alerts
    ]))
    
    alerts = []
    for i, reading in enumerate(high_readings):
        aqi = reading["aqi"]
        
        if aqi >= emergency_threshold:
            level = "emergency"
            actions = ["load_shifting", "peak_control", "critical_load_protection"]
        elif aqi >= alert_threshold:
            level = "alert"
            actions = ["traffic_restriction", "industrial_limit"]
        else:
            level = "watch"
            actions = ["public_advisory"]
        
        alert = {
            "_id": f"ALT_{str(i+1).zfill(5)}",
            "zone_id": reading["zone_id"],
            "ts": reading["ts"],
            "type": "aqi_threshold",
            "level": level,
            "aqi_value": aqi,
            "triggered_actions": actions,
            "acknowledged": False,
            "created_at": datetime.now(timezone.utc)
        }
        alerts.append(alert)
    
    if alerts:
        db.alerts.insert_many(alerts)
    
    print(f"[OK] Generated {len(alerts)} alerts")


def ingest_all_data(power_file=None, aqi_file=None, hours_limit=720):
    """
    Main ingestion function.
    
    Args:
        power_file: Path to UCI power consumption file
        aqi_file: Path to India AQI CSV file
        hours_limit: Limit number of hours to ingest (default 720 = 30 days)
                    Use 0 for all data (warning: may exceed free tier limits)
    """
    db = get_db()
    
    print("\n" + "="*60)
    print("Urban Grid Management System - Real Data Ingestion")
    print("="*60)
    
    # Find data files if not specified
    if not power_file:
        power_file = DATA_DIR / "household_power_consumption.txt"
    if not aqi_file:
        # Try different possible names
        for name in ["city_day.csv", "city_hour.csv", "station_day.csv"]:
            if (DATA_DIR / name).exists():
                aqi_file = DATA_DIR / name
                break
    
    # Ingest power consumption data
    if power_file and Path(power_file).exists():
        print(f"\n[1] Processing Power Consumption Data")
        print(f"    File: {power_file}")
        
        # Parse minute-level data (limit to avoid memory issues)
        readings = parse_uci_power_consumption(power_file, limit=2000000)
        
        if readings:
            # Aggregate to hourly
            hourly = aggregate_to_hourly(readings)
            
            # Limit hours if specified (default to 2160 = 90 days for free tier)
            if hours_limit == 0:
                hours_limit = 2160  # 90 days max for free tier
                print(f"Using max {hours_limit} hours (90 days) to fit free tier")
            
            if hours_limit and len(hourly) > hours_limit:
                hourly = hourly[:hours_limit]
                print(f"Limited to {hours_limit} hours")
            
            # Distribute to households (sample 100 households for free tier)
            distribute_to_households(db, hourly, household_sample=100)
    else:
        print(f"\n[!] Power consumption file not found: {power_file}")
        print("    Download from: https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption")
    
    # Ingest AQI data
    if aqi_file and Path(aqi_file).exists():
        print(f"\n[2] Processing Air Quality Data")
        print(f"    File: {aqi_file}")
        
        aqi_readings = parse_india_aqi_data(aqi_file)
        
        if aqi_readings:
            # Limit sample size
            sample_size = min(len(aqi_readings), 365)  # ~1 year of daily data
            distribute_aqi_to_zones(db, aqi_readings, sample_size=sample_size)
    else:
        print(f"\n[!] AQI file not found in data/ directory")
        print("    Download from: https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india")
    
    # Generate alerts from real data
    if db.air_climate_readings.count_documents({}) > 0:
        generate_alerts_from_real_data(db)
    
    # Recreate indexes
    print("\n[3] Updating indexes...")
    create_indexes(db)
    
    # Summary
    print("\n" + "="*60)
    print("=== Ingestion Complete ===")
    print("="*60)
    print(f"Zones: {db.zones.count_documents({})}")
    print(f"Households: {db.households.count_documents({})}")
    print(f"Policies: {db.policies.count_documents({})}")
    print(f"Grid Edges: {db.grid_edges.count_documents({})}")
    print(f"Meter Readings: {db.meter_readings.count_documents({}):,}")
    print(f"Air/Climate Readings: {db.air_climate_readings.count_documents({}):,}")
    print(f"Alerts: {db.alerts.count_documents({})}")
    print()


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Ingest real-world data into Urban Grid Management System")
    parser.add_argument("--power-file", type=str, help="Path to UCI power consumption file")
    parser.add_argument("--aqi-file", type=str, help="Path to India AQI CSV file")
    parser.add_argument("--hours", type=int, default=720, help="Limit hours of data to ingest (default: 720 = 30 days)")
    
    args = parser.parse_args()
    
    ingest_all_data(
        power_file=args.power_file,
        aqi_file=args.aqi_file,
        hours_limit=args.hours
    )


if __name__ == "__main__":
    main()

