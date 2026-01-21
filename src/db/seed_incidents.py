"""
Seed script for Incident Reports with NLP processing.
Generates 40 realistic incidents based on actual Atlas data.
"""
import random
from datetime import datetime, timedelta, timezone
from src.db.mongo_client import get_db
from src.nlp.incident_processor import process_incident

# Realistic incident templates based on category
INCIDENT_TEMPLATES = {
    "transformer_fault": [
        "Transformer near {zone_id} overheating, burning smell reported. Immediate shutdown required.",
        "Transformer failure detected in {zone_name}. Power supply interrupted to {zone_id}.",
        "Smoke observed from transformer substation in {zone_name} ({zone_id}). Field team dispatched.",
        "Transformer malfunction in {zone_id}. Voltage fluctuations affecting nearby areas."
    ],
    "voltage_issue": [
        "Voltage fluctuations reported in {zone_name} ({zone_id}). Appliances experiencing damage.",
        "Unstable voltage in {zone_id}. Multiple complaints from residents in {zone_name}.",
        "Voltage spike detected in {zone_name}. Equipment protection systems activated.",
        "Low voltage issue in {zone_id}. Power quality degraded in {zone_name} area."
    ],
    "outage": [
        "Power outage in {zone_name} ({zone_id}). Affecting approximately 500 households.",
        "Blackout reported in {zone_id}. Duration: 2 hours. Cause under investigation.",
        "Frequent power trips in {zone_name}, 3 times since morning. Zone {zone_id} affected.",
        "Power interruption in {zone_id}. Estimated restoration time: 4 hours."
    ],
    "high_demand": [
        "Peak demand exceeded in {zone_name} ({zone_id}). Load shedding may be required.",
        "Overload condition detected in {zone_id}. Demand 150% above baseline.",
        "High consumption spike in {zone_name}. Grid stress in {zone_id}.",
        "Excessive load in {zone_id}. Transformer operating at 95% capacity."
    ],
    "pollution_complaint": [
        "AQI very high in {zone_name} ({zone_id}). Visibility low, traffic heavy near industrial area.",
        "Residents complaining about smoke and pollution in {zone_id}. Breathing difficulties reported.",
        "Air quality alert in {zone_name}. AQI crossed 200. Zone {zone_id} affected.",
        "Heavy smog in {zone_id}. Industrial emissions causing visibility issues in {zone_name}."
    ],
    "safety_hazard": [
        "Electrical fire risk in {zone_name} ({zone_id}). Immediate safety response required.",
        "Exposed cables detected in {zone_id}. Safety hazard for pedestrians in {zone_name}.",
        "Spark observed from electrical equipment in {zone_name}. Zone {zone_id} evacuated as precaution.",
        "Safety concern: Damaged electrical infrastructure in {zone_id}. {zone_name} area."
    ],
    "equipment_failure": [
        "Equipment failure in {zone_name} ({zone_id}). Backup systems activated.",
        "System breakdown in {zone_id}. Maintenance team dispatched to {zone_name}.",
        "Component malfunction detected in {zone_name}. Zone {zone_id} affected.",
        "Equipment outage in {zone_id}. Service restoration in progress."
    ],
    "cable_damage": [
        "Cable damage reported in {zone_name} ({zone_id}). Repair work scheduled.",
        "Broken power line in {zone_id}. Affecting supply to {zone_name}.",
        "Cable cut incident in {zone_name}. Zone {zone_id} experiencing intermittent power.",
        "Underground cable fault in {zone_id}. Excavation required in {zone_name}."
    ],
    "weather_damage": [
        "Storm damage to power infrastructure in {zone_name} ({zone_id}). Assessment ongoing.",
        "Tree fall on power lines in {zone_id}. {zone_name} area affected.",
        "Lightning strike damaged equipment in {zone_name}. Zone {zone_id}.",
        "Weather-related outage in {zone_id}. Wind damage to transmission lines in {zone_name}."
    ]
}

REPORTERS = [
    "field_technician_01", "field_technician_02", "field_technician_03",
    "operator_01", "operator_02", "maintenance_team_01",
    "citizen_report", "automated_monitoring", "dispatch_center"
]

def get_zone_metrics(db, zone_id):
    """Get current metrics for a zone from Atlas."""
    # Get zone info
    zone = db.zones.find_one({"_id": zone_id})
    if not zone:
        return None
    
    # Get recent AQI
    aqi_reading = db.air_climate_readings.find_one(
        {"zone_id": zone_id},
        sort=[("ts", -1)]
    )
    current_aqi = aqi_reading["aqi"] if aqi_reading else 50
    
    # Get recent demand
    demand_reading = db.meter_readings.find_one(
        {"zone_id": zone_id},
        sort=[("ts", -1)]
    )
    current_demand = demand_reading["kwh"] if demand_reading else 0
    
    # Get alert count (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_alerts = db.alerts.count_documents({
        "zone_id": zone_id,
        "ts": {"$gte": week_ago}
    })
    
    # Calculate risk level (simplified)
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
    
    return {
        "zone": zone,
        "current_aqi": current_aqi,
        "current_demand": current_demand,
        "recent_alerts": recent_alerts,
        "zone_risk_score": risk_score,
        "zone_risk_level": risk_level,
        "has_hospital": "hospital" in zone.get("critical_sites", []),
        "grid_priority": zone.get("grid_priority", 3)
    }

def select_zone_for_incident(db, category):
    """Select an appropriate zone based on incident category and actual data."""
    zones = list(db.zones.find())
    
    if category == "pollution_complaint":
        # Prefer zones with high AQI
        high_aqi_zones = []
        for zone in zones:
            aqi_reading = db.air_climate_readings.find_one(
                {"zone_id": zone["_id"]},
                sort=[("ts", -1)]
            )
            if aqi_reading and aqi_reading["aqi"] > 120:
                high_aqi_zones.append(zone["_id"])
        if high_aqi_zones:
            return random.choice(high_aqi_zones)
    
    elif category == "high_demand":
        # Prefer zones with high demand
        high_demand_zones = []
        for zone in zones:
            demand_reading = db.meter_readings.find_one(
                {"zone_id": zone["_id"]},
                sort=[("kwh", -1)]
            )
            if demand_reading and demand_reading["kwh"] > 1000:
                high_demand_zones.append(zone["_id"])
        if high_demand_zones:
            return random.choice(high_demand_zones)
    
    elif category in ["safety_hazard", "transformer_fault"]:
        # Prefer zones with hospitals (critical infrastructure)
        hospital_zones = [z["_id"] for z in zones if "hospital" in z.get("critical_sites", [])]
        if hospital_zones:
            return random.choice(hospital_zones)
    
    # Default: random zone
    return random.choice(zones)["_id"]

def generate_incident(db, incident_num, start_date, days_span):
    """Generate a single realistic incident."""
    # Random date within span
    days_offset = random.uniform(0, days_span)
    incident_date = start_date + timedelta(days=days_offset)
    # Add random hour
    incident_date = incident_date.replace(
        hour=random.randint(6, 22),
        minute=random.randint(0, 59)
    )
    
    # Select category (weighted towards common issues)
    category_weights = {
        "transformer_fault": 0.15,
        "voltage_issue": 0.12,
        "outage": 0.15,
        "high_demand": 0.10,
        "pollution_complaint": 0.15,
        "safety_hazard": 0.08,
        "equipment_failure": 0.10,
        "cable_damage": 0.10,
        "weather_damage": 0.05
    }
    category = random.choices(
        list(category_weights.keys()),
        weights=list(category_weights.values())
    )[0]
    
    # Select appropriate zone
    zone_id = select_zone_for_incident(db, category)
    
    # Get zone metrics for context
    metrics = get_zone_metrics(db, zone_id)
    if not metrics:
        return None
    
    zone = metrics["zone"]
    zone_name = zone["name"]
    
    # Generate description
    template = random.choice(INCIDENT_TEMPLATES[category])
    description = template.format(zone_id=zone_id, zone_name=zone_name)
    
    # Process with NLP
    context = {
        "zone_risk_score": metrics["zone_risk_score"],
        "zone_risk_level": metrics["zone_risk_level"],
        "current_aqi": metrics["current_aqi"],
        "current_demand": metrics["current_demand"],
        "recent_alerts": metrics["recent_alerts"],
        "has_hospital": metrics["has_hospital"],
        "grid_priority": metrics["grid_priority"]
    }
    
    nlp_analysis = process_incident(description, context, zone_name)
    
    # Create incident document
    incident = {
        "_id": f"INC_{str(incident_num).zfill(5)}",
        "zone_id": zone_id,
        "zone_name": zone_name,
        "timestamp": incident_date,
        "reporter": random.choice(REPORTERS),
        "description": description,
        "nlp_analysis": nlp_analysis,
        "context": context,
        "status": random.choice(["open", "investigating", "resolved"]),
        "resolved_at": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    # If resolved, add resolved_at
    if incident["status"] == "resolved":
        resolution_delay = timedelta(hours=random.randint(1, 48))
        incident["resolved_at"] = incident_date + resolution_delay
    
    return incident

def seed_incidents(num_incidents=40, days_span=21):
    """
    Seed incident reports collection.
    
    Args:
        num_incidents: Number of incidents to generate (default: 40)
        days_span: Number of days to span (default: 21 = 3 weeks)
    """
    print(f"\n=== Seeding Incident Reports ({num_incidents} incidents, {days_span} days) ===")
    
    db = get_db()
    if db is None:
        print("[X] MongoDB connection failed!")
        return
    
    # Clear existing incidents
    db.incident_reports.delete_many({})
    print("[OK] Cleared existing incident reports")
    
    # Start date: 3 weeks ago
    start_date = datetime.now(timezone.utc) - timedelta(days=days_span)
    
    incidents = []
    for i in range(1, num_incidents + 1):
        incident = generate_incident(db, i, start_date, days_span)
        if incident:
            incidents.append(incident)
    
    if incidents:
        db.incident_reports.insert_many(incidents)
        print(f"[OK] Inserted {len(incidents)} incident reports")
        
        # Print summary
        categories = {}
        urgencies = {}
        for inc in incidents:
            cat = inc["nlp_analysis"]["category"]
            urg = inc["nlp_analysis"]["urgency"]
            categories[cat] = categories.get(cat, 0) + 1
            urgencies[urg] = urgencies.get(urg, 0) + 1
        
        print(f"\nCategory distribution:")
        for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
            print(f"  {cat}: {count}")
        
        print(f"\nUrgency distribution:")
        for urg, count in sorted(urgencies.items(), key=lambda x: ["low", "medium", "high", "critical"].index(x[0])):
            print(f"  {urg}: {count}")
    else:
        print("[X] No incidents generated!")

if __name__ == "__main__":
    import sys
    num = int(sys.argv[1]) if len(sys.argv) > 1 else 40
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 21
    seed_incidents(num, days)
