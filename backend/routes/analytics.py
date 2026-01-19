"""
Analytics API routes - Data analysis and aggregation endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timedelta, timezone
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.mongo_client import get_db
from pymongo.errors import ConnectionFailure

router = APIRouter()


def safe_get_db():
    """Safely get database connection, return None if connection fails."""
    try:
        return get_db()
    except (ConnectionFailure, Exception) as e:
        return None


@router.get("/demand/hourly")
async def get_hourly_demand(zone_id: Optional[str] = None, hours: int = 168):
    """Get hourly demand aggregation (default: last 7 days)."""
    try:
        db = safe_get_db()
        if db is None:
            return {"data": [], "count": 0, "error": "MongoDB connection failed"}
        
        pipeline = [
            {"$group": {
                "_id": {
                    "year": {"$year": "$ts"},
                    "month": {"$month": "$ts"},
                    "day": {"$dayOfMonth": "$ts"},
                    "hour": {"$hour": "$ts"}
                },
                "total_kwh": {"$sum": "$kwh"},
                "avg_kwh": {"$avg": "$kwh"},
                "max_kwh": {"$max": "$kwh"},
                "reading_count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1}},
            {"$limit": hours}
        ]
        
        if zone_id:
            pipeline.insert(0, {"$match": {"zone_id": zone_id}})
        
        results = list(db.meter_readings.aggregate(pipeline))
        
        # Format for charting
        data = []
        for r in results:
            data.append({
                "timestamp": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}T{r['_id']['hour']:02d}:00:00",
                "total_kwh": round(r["total_kwh"], 2),
                "avg_kwh": round(r["avg_kwh"], 4),
                "max_kwh": round(r["max_kwh"], 4),
                "count": r["reading_count"]
            })
        
        return {"data": data, "count": len(data)}
    except Exception as e:
        return {"data": [], "count": 0, "error": str(e)}


@router.get("/demand/by-zone")
async def get_demand_by_zone():
    """Get demand aggregated by zone."""
    try:
        db = get_db()
        
        pipeline = [
            {"$group": {
                "_id": "$zone_id",
                "total_kwh": {"$sum": "$kwh"},
                "avg_kwh": {"$avg": "$kwh"},
                "max_kwh": {"$max": "$kwh"},
                "reading_count": {"$sum": 1}
            }},
            {"$sort": {"total_kwh": -1}}
        ]
        
        results = list(db.meter_readings.aggregate(pipeline))
        
        # Get zone names
        zones = {z["_id"]: z["name"] for z in db.zones.find()}
        
        data = []
        for r in results:
            data.append({
                "zone_id": r["_id"],
                "zone_name": zones.get(r["_id"], "Unknown"),
                "total_kwh": round(r["total_kwh"], 2),
                "avg_kwh": round(r["avg_kwh"], 4),
                "max_kwh": round(r["max_kwh"], 4),
                "count": r["reading_count"]
            })
        
        return {"data": data, "count": len(data)}
    except Exception as e:
        return {"data": [], "count": 0, "error": str(e)}


@router.get("/aqi/daily")
async def get_daily_aqi(zone_id: Optional[str] = None, days: int = 30):
    """Get daily AQI aggregation."""
    try:
        db = get_db()
        
        pipeline = [
            {"$group": {
                "_id": {
                    "zone_id": "$zone_id",
                    "year": {"$year": "$ts"},
                    "month": {"$month": "$ts"},
                    "day": {"$dayOfMonth": "$ts"}
                },
                "avg_aqi": {"$avg": "$aqi"},
                "max_aqi": {"$max": "$aqi"},
                "min_aqi": {"$min": "$aqi"},
                "avg_temp": {"$avg": "$temperature_c"},
                "avg_humidity": {"$avg": "$humidity_pct"}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
            {"$limit": days * 20}  # 20 zones max
        ]
        
        if zone_id:
            pipeline.insert(0, {"$match": {"zone_id": zone_id}})
        
        results = list(db.air_climate_readings.aggregate(pipeline))
        
        data = []
        for r in results:
            data.append({
                "zone_id": r["_id"]["zone_id"],
                "date": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}",
                "avg_aqi": round(r["avg_aqi"], 1) if r["avg_aqi"] else None,
                "max_aqi": r["max_aqi"],
                "min_aqi": r["min_aqi"],
                "avg_temp": round(r["avg_temp"], 1) if r["avg_temp"] else None,
                "avg_humidity": round(r["avg_humidity"], 1) if r["avg_humidity"] else None
            })
        
        return {"data": data, "count": len(data)}
    except Exception as e:
        return {"data": [], "count": 0, "error": str(e)}


@router.get("/aqi/by-zone")
async def get_aqi_by_zone():
    """Get AQI aggregated by zone."""
    try:
        db = get_db()
        
        pipeline = [
            {"$group": {
                "_id": "$zone_id",
                "avg_aqi": {"$avg": "$aqi"},
                "max_aqi": {"$max": "$aqi"},
                "min_aqi": {"$min": "$aqi"},
                "avg_temp": {"$avg": "$temperature_c"},
                "reading_count": {"$sum": 1}
            }},
            {"$sort": {"avg_aqi": -1}}
        ]
        
        results = list(db.air_climate_readings.aggregate(pipeline))
        
        # Get zone names
        zones = {z["_id"]: z["name"] for z in db.zones.find()}
        
        data = []
        for r in results:
            data.append({
                "zone_id": r["_id"],
                "zone_name": zones.get(r["_id"], "Unknown"),
                "avg_aqi": round(r["avg_aqi"], 1) if r["avg_aqi"] else None,
                "max_aqi": r["max_aqi"],
                "min_aqi": r["min_aqi"],
                "avg_temp": round(r["avg_temp"], 1) if r["avg_temp"] else None,
                "count": r["reading_count"]
            })
        
        return {"data": data, "count": len(data)}
    except Exception as e:
        return {"data": [], "count": 0, "error": str(e)}


@router.get("/alerts/summary")
async def get_alerts_summary():
    """Get alerts summary by level and zone."""
    try:
        db = get_db()
        
        # By level
        level_pipeline = [
            {"$group": {
                "_id": "$level",
                "count": {"$sum": 1}
            }}
        ]
        by_level = list(db.alerts.aggregate(level_pipeline))
        
        # By zone
        zone_pipeline = [
            {"$group": {
                "_id": "$zone_id",
                "count": {"$sum": 1},
                "emergency_count": {"$sum": {"$cond": [{"$eq": ["$level", "emergency"]}, 1, 0]}},
                "alert_count": {"$sum": {"$cond": [{"$eq": ["$level", "alert"]}, 1, 0]}},
                "watch_count": {"$sum": {"$cond": [{"$eq": ["$level", "watch"]}, 1, 0]}}
            }},
            {"$sort": {"count": -1}}
        ]
        by_zone = list(db.alerts.aggregate(zone_pipeline))
        
        # Get zone names
        zones = {z["_id"]: z["name"] for z in db.zones.find()}
        
        for z in by_zone:
            z["zone_name"] = zones.get(z["_id"], "Unknown")
        
        return {
            "by_level": {r["_id"]: r["count"] for r in by_level},
            "by_zone": by_zone,
            "total": db.alerts.count_documents({})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zone-risk")
async def get_zone_risk_factors():
    """Calculate risk factors for each zone."""
    try:
        db = safe_get_db()
        if db is None:
            return {"data": [], "count": 0, "error": "MongoDB connection failed"}
        
        zones = list(db.zones.find())
        
        # Pre-aggregate all metrics in one pass for efficiency
        # Get all demand metrics by zone
        demand_pipeline = [
            {"$group": {
                "_id": "$zone_id",
                "total_kwh": {"$sum": "$kwh"},
                "avg_kwh": {"$avg": "$kwh"},
                "max_kwh": {"$max": "$kwh"}
            }}
        ]
        demand_by_zone = {r["_id"]: r for r in db.meter_readings.aggregate(demand_pipeline)}
        
        # Get all AQI metrics by zone
        aqi_pipeline = [
            {"$group": {
                "_id": "$zone_id",
                "avg_aqi": {"$avg": "$aqi"},
                "max_aqi": {"$max": "$aqi"}
            }}
        ]
        aqi_by_zone = {r["_id"]: r for r in db.air_climate_readings.aggregate(aqi_pipeline)}
        
        # Get all alert counts by zone
        alert_pipeline = [
            {"$group": {
                "_id": "$zone_id",
                "total": {"$sum": 1},
                "emergency": {"$sum": {"$cond": [{"$eq": ["$level", "emergency"]}, 1, 0]}}
            }}
        ]
        alerts_by_zone = {r["_id"]: r for r in db.alerts.aggregate(alert_pipeline)}
        
        risk_data = []
        
        for zone in zones:
            zone_id = zone["_id"]
            
            # Get pre-aggregated metrics
            demand = demand_by_zone.get(zone_id)
            aqi = aqi_by_zone.get(zone_id)
            alert_info = alerts_by_zone.get(zone_id, {"total": 0, "emergency": 0})
            alert_count = alert_info["total"]
            emergency_count = alert_info["emergency"]
            
            # Calculate risk score (normalized to 0-100 scale)
            # BASELINE: Most zones should be LOW risk (green) under normal conditions
            risk_score = 0
            
            # Grid priority: Only highest priority (1) adds significant risk
            # Priority 1 = critical infrastructure, 5 = low priority
            priority = zone.get("grid_priority", 3)
            if priority == 1:
                risk_score += 8  # Critical zones get some base risk
            elif priority == 2:
                risk_score += 4
            # Priority 3-5 add nothing (normal zones)
            
            # Critical sites: Only hospitals add meaningful risk (need protection)
            if zone.get("critical_sites"):
                if "hospital" in zone["critical_sites"]:
                    risk_score += 12  # Hospitals need priority = higher risk if issues
            
            # AQI: Only VERY bad air quality adds risk
            if aqi and aqi.get("avg_aqi"):
                avg_aqi = aqi["avg_aqi"]
                if avg_aqi > 300:  # Hazardous
                    risk_score += 25
                elif avg_aqi > 200:  # Very Unhealthy
                    risk_score += 15
                elif avg_aqi > 150:  # Unhealthy
                    risk_score += 8
                # Below 150 = acceptable, no risk added
            
            # Emergency alerts: Only actual emergencies add risk
            if emergency_count >= 3:
                risk_score += 20
            elif emergency_count >= 1:
                risk_score += 10
            
            # Determine risk level - Adjusted thresholds to show meaningful variation
            # Based on actual data: max score ~12, so thresholds adjusted accordingly
            if risk_score >= 15:
                risk_level = "high"
            elif risk_score >= 8:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            risk_data.append({
                "zone_id": zone_id,
                "zone_name": zone["name"],
                "grid_priority": zone.get("grid_priority", 1),
                "critical_sites": zone.get("critical_sites", []),
                "population": zone.get("population_est", 0),
                "demand": demand if demand else None,
                "aqi": aqi if aqi else None,
                "alert_count": alert_count,
                "emergency_count": emergency_count,
                "risk_score": risk_score,
                "risk_level": risk_level
            })
        
        # Sort by risk score
        risk_data.sort(key=lambda x: x["risk_score"], reverse=True)
        
        return {"data": risk_data, "count": len(risk_data)}
    except Exception as e:
        return {"data": [], "count": 0, "error": str(e)}


@router.get("/anomalies")
async def get_consumption_anomalies(threshold: float = 2.0, limit: int = 50):
    """Find consumption anomalies (readings above threshold * baseline)."""
    try:
        db = safe_get_db()
        if db is None:
            return {"anomalies": [], "count": 0, "error": "MongoDB connection failed"}
        
        # Get households with baselines
        households = {h["_id"]: h for h in db.households.find()}
        
        # Get recent high readings
        readings = list(db.meter_readings.find().sort("kwh", -1).limit(1000))
        
        anomalies = []
        for r in readings:
            household = households.get(r["household_id"])
            if household:
                hourly_baseline = household.get("baseline_kwh_daily", 15) / 24
                if r["kwh"] > hourly_baseline * threshold:
                    anomalies.append({
                        "household_id": r["household_id"],
                        "zone_id": r["zone_id"],
                        "timestamp": r["ts"].isoformat() if r.get("ts") else None,
                        "kwh": round(r["kwh"], 3),
                        "baseline_hourly": round(hourly_baseline, 3),
                        "multiplier": round(r["kwh"] / hourly_baseline, 1)
                    })
        
        # Sort by multiplier
        anomalies.sort(key=lambda x: x["multiplier"], reverse=True)
        
        return {"anomalies": anomalies[:limit], "count": len(anomalies)}
    except Exception as e:
        return {"anomalies": [], "count": 0, "error": str(e)}


@router.get("/correlation")
async def get_correlation_matrix():
    """Calculate correlation matrix from real MongoDB data."""
    try:
        db = safe_get_db()
        if db is None:
            return {"variables": [], "matrix": [], "error": "MongoDB connection failed"}
        
        # Get sample of meter readings with timestamps
        readings = list(db.meter_readings.find(
            {},
            {"kwh": 1, "ts": 1, "zone_id": 1}
        ).limit(10000))
        
        # Get corresponding air/climate readings
        climate_readings = {}
        for r in db.air_climate_readings.find({}, {"aqi": 1, "temperature_c": 1, "humidity_pct": 1, "ts": 1, "zone_id": 1}).limit(10000):
            key = f"{r.get('zone_id')}_{r.get('ts')}"
            climate_readings[key] = r
        
        # Build data vectors for correlation
        demand_values = []
        aqi_values = []
        temp_values = []
        humidity_values = []
        hour_values = []
        
        for reading in readings:
            ts = reading.get("ts")
            if not ts:
                continue
            
            demand_values.append(reading.get("kwh", 0))
            hour_values.append(ts.hour)
            
            # Try to match with climate data
            zone_id = reading.get("zone_id")
            if zone_id and ts:
                # Find closest climate reading (same zone, same hour)
                climate_key = f"{zone_id}_{ts.replace(minute=0, second=0, microsecond=0)}"
                climate = climate_readings.get(climate_key)
                if not climate:
                    # Try to find any climate reading for this zone
                    for key, val in climate_readings.items():
                        if key.startswith(f"{zone_id}_"):
                            climate = val
                            break
                
                if climate:
                    aqi_values.append(climate.get("aqi", 0))
                    temp_values.append(climate.get("temperature_c", 0))
                    humidity_values.append(climate.get("humidity_pct", 0))
                else:
                    aqi_values.append(0)
                    temp_values.append(0)
                    humidity_values.append(0)
            else:
                aqi_values.append(0)
                temp_values.append(0)
                humidity_values.append(0)
        
        # Calculate correlations using numpy-like approach
        import math
        
        def calculate_correlation(x, y):
            """Calculate Pearson correlation coefficient."""
            if len(x) != len(y) or len(x) == 0:
                return 0.0
            
            n = len(x)
            sum_x = sum(x)
            sum_y = sum(y)
            sum_xy = sum(x[i] * y[i] for i in range(n))
            sum_x2 = sum(x[i] * x[i] for i in range(n))
            sum_y2 = sum(y[i] * y[i] for i in range(n))
            
            numerator = n * sum_xy - sum_x * sum_y
            denominator = math.sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y))
            
            if denominator == 0:
                return 0.0
            
            return numerator / denominator
        
        # Normalize vectors to same length
        min_len = min(len(demand_values), len(aqi_values), len(temp_values), len(humidity_values), len(hour_values))
        if min_len == 0:
            return {"variables": [], "matrix": [], "error": "Insufficient data"}
        
        demand_values = demand_values[:min_len]
        aqi_values = aqi_values[:min_len]
        temp_values = temp_values[:min_len]
        humidity_values = humidity_values[:min_len]
        hour_values = hour_values[:min_len]
        
        # Calculate correlations
        variables = ['Demand', 'AQI', 'Temperature', 'Humidity', 'Hour']
        data_vectors = {
            'Demand': demand_values,
            'AQI': aqi_values,
            'Temperature': temp_values,
            'Humidity': humidity_values,
            'Hour': hour_values
        }
        
        matrix = []
        for v1 in variables:
            for v2 in variables:
                if v1 == v2:
                    corr = 1.0
                else:
                    corr = calculate_correlation(data_vectors[v1], data_vectors[v2])
                matrix.append({
                    "x": v1,
                    "y": v2,
                    "value": round(corr, 2)
                })
        
        return {
            "variables": variables,
            "matrix": matrix,
            "data_points": min_len
        }
    except Exception as e:
        return {"variables": [], "matrix": [], "error": str(e)}

