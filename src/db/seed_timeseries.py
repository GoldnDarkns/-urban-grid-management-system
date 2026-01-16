"""
Time-series data generator for Urban Grid Management System.
Generates realistic meter readings, air/climate data, and constraint events.
"""
import argparse
import random
from datetime import datetime, timedelta
from tqdm import tqdm
from src.config import DEFAULT_CITY
from src.db.mongo_client import get_db

# Constants for realistic data generation
PEAK_HOURS = [9, 10, 11, 12, 13, 14, 17, 18, 19, 20]  # High demand hours
OFF_PEAK_HOURS = [0, 1, 2, 3, 4, 5, 6, 23]  # Low demand hours

# Temperature patterns (varies by hour)
BASE_TEMP_SUMMER = 32  # Celsius
BASE_TEMP_WINTER = 18

# AQI baseline and variation
BASE_AQI = 80
AQI_PEAK_MULTIPLIER = 1.5  # AQI tends to be higher during peak hours


def get_hour_multiplier(hour):
    """Get demand multiplier based on hour of day."""
    if hour in PEAK_HOURS:
        return random.uniform(1.3, 1.8)
    elif hour in OFF_PEAK_HOURS:
        return random.uniform(0.4, 0.7)
    else:
        return random.uniform(0.8, 1.2)


def get_temperature(hour, base_temp=BASE_TEMP_SUMMER):
    """Get realistic temperature based on hour."""
    # Temperature peaks around 2-4 PM, lowest around 4-6 AM
    hour_offset = {
        0: -6, 1: -7, 2: -8, 3: -8, 4: -9, 5: -8,
        6: -6, 7: -4, 8: -2, 9: 0, 10: 2, 11: 4,
        12: 5, 13: 6, 14: 7, 15: 7, 16: 6, 17: 5,
        18: 3, 19: 1, 20: -1, 21: -2, 22: -4, 23: -5
    }
    temp = base_temp + hour_offset.get(hour, 0) + random.uniform(-2, 2)
    return round(temp, 1)


def get_humidity(hour):
    """Get realistic humidity based on hour."""
    # Humidity higher in early morning, lower in afternoon
    if hour in [0, 1, 2, 3, 4, 5, 6]:
        return random.randint(70, 90)
    elif hour in [12, 13, 14, 15, 16]:
        return random.randint(40, 60)
    else:
        return random.randint(50, 75)


def get_aqi(hour, base_aqi=BASE_AQI):
    """Get realistic AQI based on hour."""
    # AQI higher during traffic hours and industrial activity
    if hour in [8, 9, 10, 17, 18, 19]:
        multiplier = random.uniform(1.2, 1.6)
    elif hour in [0, 1, 2, 3, 4, 5]:
        multiplier = random.uniform(0.7, 0.9)
    else:
        multiplier = random.uniform(0.9, 1.2)
    
    aqi = int(base_aqi * multiplier + random.randint(-10, 10))
    return max(20, min(300, aqi))  # Clamp between 20-300


def generate_meter_readings(db, days=7, batch_size=10000):
    """Generate hourly meter readings for all households."""
    print(f"\n=== Generating Meter Readings ({days} days) ===")
    
    households = list(db.households.find({}, {"_id": 1, "baseline_kwh_daily": 1, "zone_id": 1}))
    if not households:
        print("[X] No households found! Run seed_core.py first.")
        return
    
    print(f"Generating readings for {len(households)} households...")
    
    # Start from 'days' ago
    start_time = datetime.utcnow() - timedelta(days=days)
    total_hours = days * 24
    
    readings = []
    total_readings = len(households) * total_hours
    
    with tqdm(total=total_readings, desc="Meter readings") as pbar:
        for hour_offset in range(total_hours):
            current_ts = start_time + timedelta(hours=hour_offset)
            hour = current_ts.hour
            hour_multiplier = get_hour_multiplier(hour)
            
            for household in households:
                # Calculate hourly consumption based on daily baseline
                daily_baseline = household.get("baseline_kwh_daily", 15)
                hourly_baseline = daily_baseline / 24
                
                # Apply hour multiplier and random variation
                consumption = hourly_baseline * hour_multiplier * random.uniform(0.8, 1.2)
                
                # Occasionally add anomalies (2% chance)
                if random.random() < 0.02:
                    consumption *= random.uniform(2.0, 4.0)  # Spike
                
                reading = {
                    "household_id": household["_id"],
                    "zone_id": household["zone_id"],
                    "ts": current_ts,
                    "kwh": round(consumption, 3),
                    "voltage": round(random.uniform(218, 242), 1),  # Normal range ~220-240V
                    "power_factor": round(random.uniform(0.85, 0.98), 2)
                }
                readings.append(reading)
                pbar.update(1)
                
                # Batch insert
                if len(readings) >= batch_size:
                    db.meter_readings.insert_many(readings)
                    readings = []
    
    # Insert remaining
    if readings:
        db.meter_readings.insert_many(readings)
    
    count = db.meter_readings.count_documents({})
    print(f"[OK] Inserted {count:,} meter readings")


def generate_air_climate_readings(db, days=7):
    """Generate hourly air quality and climate readings per zone."""
    print(f"\n=== Generating Air/Climate Readings ({days} days) ===")
    
    zones = list(db.zones.find({}, {"_id": 1, "name": 1}))
    if not zones:
        print("[X] No zones found! Run seed_core.py first.")
        return
    
    print(f"Generating readings for {len(zones)} zones...")
    
    start_time = datetime.utcnow() - timedelta(days=days)
    total_hours = days * 24
    
    readings = []
    total_readings = len(zones) * total_hours
    
    with tqdm(total=total_readings, desc="Air/Climate readings") as pbar:
        for hour_offset in range(total_hours):
            current_ts = start_time + timedelta(hours=hour_offset)
            hour = current_ts.hour
            
            for zone in zones:
                # Each zone has slightly different baseline AQI
                zone_aqi_offset = hash(zone["_id"]) % 30 - 15  # -15 to +15
                
                reading = {
                    "zone_id": zone["_id"],
                    "ts": current_ts,
                    "aqi": get_aqi(hour, BASE_AQI + zone_aqi_offset),
                    "pm25": round(random.uniform(10, 80), 1),
                    "pm10": round(random.uniform(20, 120), 1),
                    "temperature_c": get_temperature(hour),
                    "humidity_pct": get_humidity(hour),
                    "wind_speed_kmh": round(random.uniform(5, 25), 1)
                }
                readings.append(reading)
                pbar.update(1)
    
    db.air_climate_readings.insert_many(readings)
    count = db.air_climate_readings.count_documents({})
    print(f"[OK] Inserted {count:,} air/climate readings")


def generate_constraint_events(db, days=7):
    """Generate constraint events (lockdowns, advisories) over the time period."""
    print(f"\n=== Generating Constraint Events ({days} days) ===")
    
    start_time = datetime.utcnow() - timedelta(days=days)
    
    # Generate 2-5 events over the period
    num_events = random.randint(2, 5)
    events = []
    
    event_types = [
        {"type": "indoor_advisory", "severity": "mild", "reason": "High temperature warning"},
        {"type": "indoor_advisory", "severity": "moderate", "reason": "Air quality alert"},
        {"type": "lockdown", "severity": "severe", "reason": "Emergency grid maintenance"},
        {"type": "indoor_advisory", "severity": "moderate", "reason": "Heat wave advisory"},
        {"type": "traffic_restriction", "severity": "mild", "reason": "Pollution control measure"}
    ]
    
    for i in range(num_events):
        # Random start time within the period
        event_start = start_time + timedelta(
            days=random.randint(0, days-1),
            hours=random.randint(6, 18)
        )
        
        # Duration: 2-12 hours
        duration_hours = random.randint(2, 12)
        event_end = event_start + timedelta(hours=duration_hours)
        
        event_template = random.choice(event_types)
        
        event = {
            "_id": f"EVT_{str(i+1).zfill(4)}",
            "city": DEFAULT_CITY,
            "type": event_template["type"],
            "severity": event_template["severity"],
            "reason": event_template["reason"],
            "start_ts": event_start,
            "end_ts": event_end,
            "affected_zones": "all",  # Could be specific zones
            "created_at": datetime.utcnow()
        }
        events.append(event)
    
    if events:
        db.constraint_events.insert_many(events)
    
    count = db.constraint_events.count_documents({})
    print(f"[OK] Inserted {count} constraint events")


def generate_alerts(db, days=7):
    """Generate alerts based on thresholds being crossed."""
    print(f"\n=== Generating Alerts ({days} days) ===")
    
    # Get policy thresholds
    policy = db.policies.find_one({"_id": "POL_AQI_CONTROL_V1"})
    if not policy:
        print("[X] No policy found!")
        return
    
    # Get air readings with high AQI
    aqi_thresholds = policy.get("aqi_thresholds", [])
    watch_threshold = 101
    alert_threshold = 151
    emergency_threshold = 201
    
    for t in aqi_thresholds:
        if t["level"] == "watch":
            watch_threshold = t["min"]
        elif t["level"] == "alert":
            alert_threshold = t["min"]
        elif t["level"] == "emergency":
            emergency_threshold = t["min"]
    
    # Find readings that exceed thresholds
    high_aqi_readings = list(db.air_climate_readings.find(
        {"aqi": {"$gte": watch_threshold}},
        {"zone_id": 1, "ts": 1, "aqi": 1}
    ).limit(50))  # Limit to avoid too many alerts
    
    alerts = []
    for i, reading in enumerate(high_aqi_readings):
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
            "acknowledged": random.choice([True, False]),
            "created_at": datetime.utcnow()
        }
        alerts.append(alert)
    
    if alerts:
        db.alerts.insert_many(alerts)
    
    count = db.alerts.count_documents({})
    print(f"[OK] Inserted {count} alerts")


def seed_timeseries(days=7, reset=False):
    """Main function to seed all time-series data."""
    db = get_db()
    
    print("\n" + "="*60)
    print("Urban Grid Management System - Time-Series Data Generator")
    print("="*60)
    print(f"Generating {days} days of time-series data...")
    
    if reset:
        print("\n[WARNING] RESET MODE: Clearing time-series collections...")
        db.meter_readings.delete_many({})
        db.air_climate_readings.delete_many({})
        db.constraint_events.delete_many({})
        db.alerts.delete_many({})
        print("Cleared: meter_readings, air_climate_readings, constraint_events, alerts")
    
    # Generate data
    generate_meter_readings(db, days=days)
    generate_air_climate_readings(db, days=days)
    generate_constraint_events(db, days=days)
    generate_alerts(db, days=days)
    
    # Summary
    print("\n" + "="*60)
    print("=== Time-Series Seeding Complete ===")
    print("="*60)
    print(f"Meter Readings: {db.meter_readings.count_documents({}):,}")
    print(f"Air/Climate Readings: {db.air_climate_readings.count_documents({}):,}")
    print(f"Constraint Events: {db.constraint_events.count_documents({})}")
    print(f"Alerts: {db.alerts.count_documents({})}")
    print()


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Generate time-series data for Urban Grid Management System")
    parser.add_argument("--days", type=int, default=7, help="Number of days of data to generate (default: 7)")
    parser.add_argument("--reset", action="store_true", help="Clear existing time-series data before generating")
    
    args = parser.parse_args()
    seed_timeseries(days=args.days, reset=args.reset)


if __name__ == "__main__":
    main()

