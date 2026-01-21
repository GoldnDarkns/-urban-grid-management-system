"""
Auto-generate incident reports from anomalies and alerts.
This runs periodically or can be triggered manually.
"""
from datetime import datetime, timedelta, timezone
from src.db.mongo_client import get_db
from src.nlp.incident_processor import process_incident

def generate_incident_from_anomaly(anomaly, db):
    """Generate an incident report from a consumption anomaly."""
    zone_id = anomaly.get("zone_id")
    household_id = anomaly.get("household_id")
    timestamp = anomaly.get("timestamp")
    kwh = anomaly.get("kwh", 0)
    multiplier = anomaly.get("multiplier", 1.0)
    
    # Get zone info
    zone = db.zones.find_one({"_id": zone_id})
    if not zone:
        return None
    
    zone_name = zone.get("name", zone_id)
    
    # Generate description based on anomaly severity
    if multiplier > 5.0:
        description = f"Extreme consumption spike detected in {zone_name} ({zone_id}). Household {household_id} showing {multiplier:.1f}x normal consumption. Possible equipment malfunction or theft."
        category = "high_demand"
    elif multiplier > 3.0:
        description = f"High consumption anomaly in {zone_name} ({zone_id}). Household {household_id} consuming {kwh:.2f} kWh ({multiplier:.1f}x baseline). Investigation required."
        category = "high_demand"
    else:
        description = f"Consumption anomaly detected in {zone_name} ({zone_id}). Household {household_id} showing elevated usage."
        category = "equipment_failure"
    
    # Get context
    aqi_reading = db.air_climate_readings.find_one(
        {"zone_id": zone_id},
        sort=[("ts", -1)]
    )
    current_aqi = aqi_reading["aqi"] if aqi_reading else 50
    
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_alerts = db.alerts.count_documents({
        "zone_id": zone_id,
        "ts": {"$gte": week_ago}
    })
    
    risk_score = 0
    if current_aqi > 200:
        risk_score += 15
    elif current_aqi > 150:
        risk_score += 8
    if recent_alerts > 5:
        risk_score += 10
    elif recent_alerts > 2:
        risk_score += 5
    if "hospital" in zone.get("critical_sites", []):
        risk_score += 8
    
    if risk_score >= 15:
        risk_level = "high"
    elif risk_score >= 8:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    context = {
        "zone_risk_score": risk_score,
        "zone_risk_level": risk_level,
        "current_aqi": current_aqi,
        "current_demand": kwh,
        "recent_alerts": recent_alerts,
        "has_hospital": "hospital" in zone.get("critical_sites", []),
        "grid_priority": zone.get("grid_priority", 3)
    }
    
    # Process with NLP
    nlp_analysis = process_incident(description, context, zone_name)
    
    # Check if incident already exists for this anomaly
    existing = db.incident_reports.find_one({
        "zone_id": zone_id,
        "household_id": household_id,
        "timestamp": {"$gte": timestamp - timedelta(hours=1), "$lte": timestamp + timedelta(hours=1)}
    })
    
    if existing:
        return None  # Already generated
    
    # Create incident
    count = db.incident_reports.count_documents({})
    incident_id = f"INC_{str(count + 1).zfill(5)}"
    
    incident = {
        "_id": incident_id,
        "zone_id": zone_id,
        "zone_name": zone_name,
        "household_id": household_id,
        "timestamp": timestamp if isinstance(timestamp, datetime) else datetime.fromisoformat(str(timestamp)),
        "reporter": "automated_monitoring",
        "description": description,
        "nlp_analysis": nlp_analysis,
        "context": context,
        "status": "open",
        "resolved_at": None,
        "created_at": datetime.now(timezone.utc),
        "source": "anomaly_detection"
    }
    
    db.incident_reports.insert_one(incident)
    return incident

def generate_incident_from_alert(alert, db):
    """Generate an incident report from an alert."""
    zone_id = alert.get("zone_id")
    alert_type = alert.get("type")
    alert_level = alert.get("level")
    timestamp = alert.get("ts")
    
    # Get zone info
    zone = db.zones.find_one({"_id": zone_id})
    if not zone:
        return None
    
    zone_name = zone.get("name", zone_id)
    
    # Generate description based on alert
    if alert_type == "aqi_threshold":
        aqi_value = alert.get("aqi_value", 0)
        if alert_level == "emergency":
            description = f"Emergency air quality alert in {zone_name} ({zone_id}). AQI reached {aqi_value}. Immediate action required. Residents reporting breathing difficulties."
        elif alert_level == "alert":
            description = f"Air quality alert in {zone_name} ({zone_id}). AQI at {aqi_value}. Traffic restrictions and industrial limits activated."
        else:
            description = f"Air quality watch in {zone_name} ({zone_id}). AQI at {aqi_value}. Public advisory issued."
        category = "pollution_complaint"
    else:
        description = f"{alert_level.title()} alert in {zone_name} ({zone_id}). Type: {alert_type}."
        category = "equipment_failure"
    
    # Get context
    aqi_reading = db.air_climate_readings.find_one(
        {"zone_id": zone_id},
        sort=[("ts", -1)]
    )
    current_aqi = aqi_reading["aqi"] if aqi_reading else 50
    
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_alerts = db.alerts.count_documents({
        "zone_id": zone_id,
        "ts": {"$gte": week_ago}
    })
    
    risk_score = 0
    if current_aqi > 200:
        risk_score += 15
    elif current_aqi > 150:
        risk_score += 8
    if recent_alerts > 5:
        risk_score += 10
    elif recent_alerts > 2:
        risk_score += 5
    if "hospital" in zone.get("critical_sites", []):
        risk_score += 8
    
    if risk_score >= 15:
        risk_level = "high"
    elif risk_score >= 8:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    context = {
        "zone_risk_score": risk_score,
        "zone_risk_level": risk_level,
        "current_aqi": current_aqi,
        "current_demand": 0,
        "recent_alerts": recent_alerts,
        "has_hospital": "hospital" in zone.get("critical_sites", []),
        "grid_priority": zone.get("grid_priority", 3)
    }
    
    # Process with NLP
    nlp_analysis = process_incident(description, context, zone_name)
    
    # Check if incident already exists for this alert
    existing = db.incident_reports.find_one({
        "zone_id": zone_id,
        "timestamp": {"$gte": timestamp - timedelta(hours=1), "$lte": timestamp + timedelta(hours=1)},
        "source": "alert_triggered"
    })
    
    if existing:
        return None  # Already generated
    
    # Create incident
    count = db.incident_reports.count_documents({})
    incident_id = f"INC_{str(count + 1).zfill(5)}"
    
    incident = {
        "_id": incident_id,
        "zone_id": zone_id,
        "zone_name": zone_name,
        "timestamp": timestamp if isinstance(timestamp, datetime) else datetime.fromisoformat(str(timestamp)),
        "reporter": "automated_monitoring",
        "description": description,
        "nlp_analysis": nlp_analysis,
        "context": context,
        "status": "open",
        "resolved_at": None,
        "created_at": datetime.now(timezone.utc),
        "source": "alert_triggered",
        "alert_id": alert.get("_id")
    }
    
    db.incident_reports.insert_one(incident)
    return incident

def auto_generate_from_recent_anomalies(db, hours=24, limit=10):
    """Auto-generate incidents from recent anomalies."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    # Get recent anomalies (from analytics endpoint logic)
    households = {h["_id"]: h for h in db.households.find()}
    readings = list(db.meter_readings.find({
        "ts": {"$gte": since}
    }).sort("kwh", -1).limit(1000))
    
    anomalies = []
    for r in readings:
        household = households.get(r["household_id"])
        if household:
            hourly_baseline = household.get("baseline_kwh_daily", 15) / 24
            if r["kwh"] > hourly_baseline * 2.0:  # 2x threshold
                anomalies.append({
                    "household_id": r["household_id"],
                    "zone_id": r["zone_id"],
                    "timestamp": r["ts"],
                    "kwh": r["kwh"],
                    "multiplier": r["kwh"] / hourly_baseline
                })
    
    anomalies.sort(key=lambda x: x["multiplier"], reverse=True)
    
    generated = 0
    for anomaly in anomalies[:limit]:
        incident = generate_incident_from_anomaly(anomaly, db)
        if incident:
            generated += 1
    
    return generated

def auto_generate_from_recent_alerts(db, hours=24, limit=10):
    """Auto-generate incidents from recent alerts."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    alerts = list(db.alerts.find({
        "ts": {"$gte": since},
        "level": {"$in": ["alert", "emergency"]}
    }).sort("ts", -1).limit(limit))
    
    generated = 0
    for alert in alerts:
        incident = generate_incident_from_alert(alert, db)
        if incident:
            generated += 1
    
    return generated

if __name__ == "__main__":
    db = get_db()
    if db:
        print("Auto-generating incidents from anomalies...")
        anomaly_count = auto_generate_from_recent_anomalies(db, hours=24, limit=5)
        print(f"Generated {anomaly_count} incidents from anomalies")
        
        print("Auto-generating incidents from alerts...")
        alert_count = auto_generate_from_recent_alerts(db, hours=24, limit=5)
        print(f"Generated {alert_count} incidents from alerts")
    else:
        print("MongoDB connection failed!")
