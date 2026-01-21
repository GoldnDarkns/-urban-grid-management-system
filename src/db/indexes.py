"""
Index creation module for Urban Grid Management System.
Creates indexes optimized for time-series queries and lookups.
"""
from src.db.mongo_client import get_db

def create_indexes(db):
    """
    Create all required indexes for optimal query performance.
    
    Args:
        db: MongoDB database instance
    """
    print("\n=== Creating Indexes ===")
    
    # meter_readings indexes (time-series)
    meter_collection = db.meter_readings
    meter_collection.create_index([("zone_id", 1), ("ts", -1)], name="zone_ts_idx")
    meter_collection.create_index([("household_id", 1), ("ts", -1)], name="household_ts_idx")
    print("[OK] Created indexes for meter_readings")
    
    # air_climate_readings indexes (time-series)
    air_collection = db.air_climate_readings
    air_collection.create_index([("zone_id", 1), ("ts", -1)], name="zone_ts_idx")
    print("[OK] Created indexes for air_climate_readings")
    
    # alerts indexes
    alerts_collection = db.alerts
    alerts_collection.create_index([("zone_id", 1), ("ts", -1)], name="zone_ts_idx")
    alerts_collection.create_index([("type", 1), ("ts", -1)], name="type_ts_idx")
    print("[OK] Created indexes for alerts")
    
    # constraint_events indexes
    constraint_collection = db.constraint_events
    constraint_collection.create_index([("city", 1), ("start_ts", -1)], name="city_start_ts_idx")
    constraint_collection.create_index([("city", 1), ("end_ts", -1)], name="city_end_ts_idx")
    print("[OK] Created indexes for constraint_events")
    
    # grid_edges indexes (graph queries)
    edges_collection = db.grid_edges
    edges_collection.create_index([("from_zone", 1)], name="from_zone_idx")
    edges_collection.create_index([("to_zone", 1)], name="to_zone_idx")
    print("[OK] Created indexes for grid_edges")
    
    # incident_reports indexes
    incidents_collection = db.incident_reports
    incidents_collection.create_index([("zone_id", 1), ("timestamp", -1)], name="zone_ts_idx")
    incidents_collection.create_index([("nlp_analysis.category", 1)], name="category_idx")
    incidents_collection.create_index([("nlp_analysis.urgency", 1)], name="urgency_idx")
    incidents_collection.create_index([("status", 1)], name="status_idx")
    print("[OK] Created indexes for incident_reports")
    
    print("=== All indexes created successfully ===\n")
