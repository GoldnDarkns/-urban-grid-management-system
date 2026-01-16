"""
Advanced MongoDB queries for Urban Grid Management System.
These queries demonstrate complex aggregations, time-series analysis, and analytics.
Total: 10 meaningful queries (combined with basic_queries.py)
"""
from datetime import datetime, timedelta
from src.db.mongo_client import get_db
from pprint import pprint


def query_4_hourly_demand_by_zone(zone_id="Z_001", hours=24):
    """
    Query 4: Aggregate hourly energy demand for a specific zone.
    Uses $group aggregation with date truncation.
    """
    db = get_db()
    
    print(f"=== Query 4: Hourly Demand for {zone_id} (last {hours}h) ===")
    
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    pipeline = [
        {"$match": {
            "zone_id": zone_id,
            "ts": {"$gte": cutoff}
        }},
        {"$group": {
            "_id": {
                "year": {"$year": "$ts"},
                "month": {"$month": "$ts"},
                "day": {"$dayOfMonth": "$ts"},
                "hour": {"$hour": "$ts"}
            },
            "total_kwh": {"$sum": "$kwh"},
            "avg_kwh": {"$avg": "$kwh"},
            "reading_count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1}},
        {"$limit": 24}
    ]
    
    results = list(db.meter_readings.aggregate(pipeline))
    
    print(f"Found {len(results)} hourly aggregations:\n")
    for r in results[:10]:  # Show first 10
        date_str = f"{r['_id']['month']}/{r['_id']['day']} {r['_id']['hour']}:00"
        print(f"  {date_str}: {r['total_kwh']:.2f} kWh (avg: {r['avg_kwh']:.3f}, count: {r['reading_count']})")
    
    if len(results) > 10:
        print(f"  ... and {len(results) - 10} more hours")
    print()
    
    return results


def query_5_aqi_threshold_violations():
    """
    Query 5: Find zones that exceeded AQI policy thresholds.
    Joins air_climate_readings with policy thresholds.
    """
    db = get_db()
    
    print("=== Query 5: AQI Threshold Violations ===")
    
    # Get policy thresholds
    policy = db.policies.find_one({"_id": "POL_AQI_CONTROL_V1"})
    watch_threshold = 101
    
    if policy:
        for t in policy.get("aqi_thresholds", []):
            if t["level"] == "watch":
                watch_threshold = t["min"]
                break
    
    # Find violations grouped by zone
    pipeline = [
        {"$match": {"aqi": {"$gte": watch_threshold}}},
        {"$group": {
            "_id": "$zone_id",
            "violation_count": {"$sum": 1},
            "max_aqi": {"$max": "$aqi"},
            "avg_aqi": {"$avg": "$aqi"}
        }},
        {"$sort": {"violation_count": -1}},
        {"$limit": 10}
    ]
    
    results = list(db.air_climate_readings.aggregate(pipeline))
    
    print(f"Zones with AQI >= {watch_threshold} (Watch level):\n")
    for r in results:
        print(f"  {r['_id']}: {r['violation_count']} violations")
        print(f"    Max AQI: {r['max_aqi']}, Avg AQI: {r['avg_aqi']:.1f}")
    print()
    
    return results


def query_6_consumption_anomalies(threshold_multiplier=2.0):
    """
    Query 6: Find households with consumption anomalies.
    Compares actual consumption to baseline.
    """
    db = get_db()
    
    print(f"=== Query 6: Consumption Anomalies (>{threshold_multiplier}x baseline) ===")
    
    # Get households with their baselines
    households = {h["_id"]: h for h in db.households.find()}
    
    # Find readings that are significantly above baseline
    anomalies = []
    
    # Sample recent readings
    recent_readings = list(db.meter_readings.find().sort("ts", -1).limit(5000))
    
    for reading in recent_readings:
        household = households.get(reading["household_id"])
        if household:
            hourly_baseline = household.get("baseline_kwh_daily", 15) / 24
            if reading["kwh"] > hourly_baseline * threshold_multiplier:
                anomalies.append({
                    "household_id": reading["household_id"],
                    "zone_id": reading["zone_id"],
                    "ts": reading["ts"],
                    "kwh": reading["kwh"],
                    "baseline_hourly": round(hourly_baseline, 3),
                    "multiplier": round(reading["kwh"] / hourly_baseline, 1)
                })
    
    # Sort by multiplier
    anomalies.sort(key=lambda x: x["multiplier"], reverse=True)
    
    print(f"Found {len(anomalies)} anomalous readings:\n")
    for a in anomalies[:10]:
        print(f"  {a['household_id']} ({a['zone_id']}): {a['kwh']:.2f} kWh")
        print(f"    Baseline: {a['baseline_hourly']:.3f} kWh/h, Multiplier: {a['multiplier']}x")
    
    if len(anomalies) > 10:
        print(f"  ... and {len(anomalies) - 10} more anomalies")
    print()
    
    return anomalies[:50]


def query_7_active_constraint_events():
    """
    Query 7: Find currently active or recent constraint events.
    Time-range query on constraint_events collection.
    """
    db = get_db()
    
    print("=== Query 7: Active/Recent Constraint Events ===")
    
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    
    # Find events that are currently active or ended recently
    events = list(db.constraint_events.find({
        "$or": [
            {"end_ts": {"$gte": now}},  # Currently active
            {"start_ts": {"$gte": week_ago}}  # Started in last week
        ]
    }).sort("start_ts", -1))
    
    print(f"Found {len(events)} events in the last 7 days:\n")
    for e in events:
        status = "ACTIVE" if e["end_ts"] >= now else "ENDED"
        print(f"  [{status}] {e['_id']}: {e['type']}")
        print(f"    Severity: {e['severity']}")
        print(f"    Reason: {e['reason']}")
        print(f"    Duration: {e['start_ts'].strftime('%m/%d %H:%M')} - {e['end_ts'].strftime('%m/%d %H:%M')}")
        print()
    
    return events


def query_8_zone_risk_factors():
    """
    Query 8: Calculate risk factors for each zone.
    Aggregates multiple metrics to compute risk score.
    """
    db = get_db()
    
    print("=== Query 8: Zone Risk Factor Analysis ===")
    
    zones = list(db.zones.find())
    risk_scores = []
    
    cutoff = datetime.utcnow() - timedelta(hours=24)
    
    for zone in zones:
        zone_id = zone["_id"]
        
        # Get recent demand
        demand_pipeline = [
            {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
            {"$group": {
                "_id": None,
                "total_kwh": {"$sum": "$kwh"},
                "avg_kwh": {"$avg": "$kwh"},
                "max_kwh": {"$max": "$kwh"}
            }}
        ]
        demand = list(db.meter_readings.aggregate(demand_pipeline))
        
        # Get recent AQI
        aqi_pipeline = [
            {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
            {"$group": {
                "_id": None,
                "avg_aqi": {"$avg": "$aqi"},
                "max_aqi": {"$max": "$aqi"}
            }}
        ]
        aqi = list(db.air_climate_readings.aggregate(aqi_pipeline))
        
        # Calculate risk score (simplified)
        risk_score = 0
        
        # Factor 1: Grid priority (higher = more critical)
        risk_score += zone.get("grid_priority", 1) * 10
        
        # Factor 2: Has critical infrastructure
        if zone.get("critical_sites"):
            risk_score += len(zone["critical_sites"]) * 15
        
        # Factor 3: High AQI
        if aqi and aqi[0].get("avg_aqi"):
            avg_aqi = aqi[0]["avg_aqi"]
            if avg_aqi > 150:
                risk_score += 30
            elif avg_aqi > 100:
                risk_score += 15
        
        # Factor 4: High demand
        if demand and demand[0].get("max_kwh"):
            max_kwh = demand[0]["max_kwh"]
            if max_kwh > 2:  # High consumption spike
                risk_score += 20
        
        risk_scores.append({
            "zone_id": zone_id,
            "zone_name": zone["name"],
            "risk_score": risk_score,
            "grid_priority": zone.get("grid_priority", 1),
            "critical_sites": zone.get("critical_sites", []),
            "avg_aqi": aqi[0]["avg_aqi"] if aqi else None,
            "max_demand_kwh": demand[0]["max_kwh"] if demand else None
        })
    
    # Sort by risk score
    risk_scores.sort(key=lambda x: x["risk_score"], reverse=True)
    
    print("Top 10 zones by risk score:\n")
    for r in risk_scores[:10]:
        print(f"  {r['zone_id']} ({r['zone_name']}): Risk Score = {r['risk_score']}")
        print(f"    Priority: {r['grid_priority']}, Critical: {', '.join(r['critical_sites']) or 'None'}")
        if r['avg_aqi']:
            print(f"    Avg AQI: {r['avg_aqi']:.1f}")
    print()
    
    return risk_scores


def query_9_demand_vs_temperature_correlation():
    """
    Query 9: Analyze correlation between temperature and energy demand.
    Joins meter_readings with air_climate_readings.
    """
    db = get_db()
    
    print("=== Query 9: Demand vs Temperature Analysis ===")
    
    # Get hourly aggregated data
    cutoff = datetime.utcnow() - timedelta(days=3)
    
    # Aggregate demand by hour
    demand_pipeline = [
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {
            "_id": {
                "day": {"$dayOfMonth": "$ts"},
                "hour": {"$hour": "$ts"}
            },
            "total_kwh": {"$sum": "$kwh"}
        }},
        {"$sort": {"_id.day": 1, "_id.hour": 1}}
    ]
    demand_data = list(db.meter_readings.aggregate(demand_pipeline))
    
    # Aggregate temperature by hour
    temp_pipeline = [
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {
            "_id": {
                "day": {"$dayOfMonth": "$ts"},
                "hour": {"$hour": "$ts"}
            },
            "avg_temp": {"$avg": "$temperature_c"}
        }},
        {"$sort": {"_id.day": 1, "_id.hour": 1}}
    ]
    temp_data = list(db.air_climate_readings.aggregate(temp_pipeline))
    
    # Match and display
    temp_dict = {(t["_id"]["day"], t["_id"]["hour"]): t["avg_temp"] for t in temp_data}
    
    print("Hourly demand vs temperature (last 3 days):\n")
    print(f"  {'Hour':<12} {'Demand (kWh)':<15} {'Temp (C)':<10}")
    print("  " + "-" * 37)
    
    for d in demand_data[:24]:  # Show first 24 hours
        key = (d["_id"]["day"], d["_id"]["hour"])
        temp = temp_dict.get(key, "N/A")
        temp_str = f"{temp:.1f}" if isinstance(temp, float) else temp
        print(f"  Day {d['_id']['day']:2d} {d['_id']['hour']:02d}:00  {d['total_kwh']:>10.2f}      {temp_str}")
    
    if len(demand_data) > 24:
        print(f"  ... and {len(demand_data) - 24} more hours")
    print()
    
    return {"demand": demand_data, "temperature": temp_data}


def query_10_critical_infrastructure_status():
    """
    Query 10: Comprehensive status report for critical infrastructure zones.
    Combines zone data, alerts, and recent readings.
    """
    db = get_db()
    
    print("=== Query 10: Critical Infrastructure Status Report ===")
    
    # Find zones with critical infrastructure
    critical_zones = list(db.zones.find({
        "critical_sites": {"$exists": True, "$ne": []}
    }))
    
    print(f"Found {len(critical_zones)} zones with critical infrastructure:\n")
    
    cutoff = datetime.utcnow() - timedelta(hours=24)
    
    for zone in critical_zones:
        zone_id = zone["_id"]
        
        # Get recent alerts for this zone
        alerts = list(db.alerts.find({
            "zone_id": zone_id,
            "ts": {"$gte": cutoff}
        }).sort("ts", -1).limit(5))
        
        # Get latest AQI
        latest_aqi = db.air_climate_readings.find_one(
            {"zone_id": zone_id},
            sort=[("ts", -1)]
        )
        
        # Get demand summary
        demand_summary = list(db.meter_readings.aggregate([
            {"$match": {"zone_id": zone_id, "ts": {"$gte": cutoff}}},
            {"$group": {
                "_id": None,
                "total_kwh": {"$sum": "$kwh"},
                "avg_kwh": {"$avg": "$kwh"}
            }}
        ]))
        
        print(f"  {zone_id}: {zone['name']}")
        print(f"    Critical Sites: {', '.join(zone['critical_sites'])}")
        print(f"    Grid Priority: {zone['grid_priority']}")
        
        if latest_aqi:
            print(f"    Latest AQI: {latest_aqi['aqi']} (Temp: {latest_aqi['temperature_c']}C)")
        
        if demand_summary:
            print(f"    24h Demand: {demand_summary[0]['total_kwh']:.2f} kWh")
        
        if alerts:
            print(f"    Recent Alerts: {len(alerts)}")
            for a in alerts[:2]:
                print(f"      - [{a['level'].upper()}] {a['type']} (AQI: {a.get('aqi_value', 'N/A')})")
        else:
            print("    Recent Alerts: None")
        
        print()
    
    return critical_zones


def run_all_advanced_queries():
    """Run all advanced queries."""
    print("\n" + "="*60)
    print("Urban Grid Management System - Advanced Queries (4-10)")
    print("="*60 + "\n")
    
    query_4_hourly_demand_by_zone()
    query_5_aqi_threshold_violations()
    query_6_consumption_anomalies()
    query_7_active_constraint_events()
    query_8_zone_risk_factors()
    query_9_demand_vs_temperature_correlation()
    query_10_critical_infrastructure_status()
    
    print("="*60)
    print("All advanced queries completed!")
    print("="*60 + "\n")


if __name__ == "__main__":
    run_all_advanced_queries()

