"""
Sanity check script for Urban Grid Management System.
Validates database setup and displays sample data.
"""
import sys
from src.db.mongo_client import get_db, ping
from pprint import pprint

def run_sanity_check():
    """Run comprehensive sanity checks."""
    print("=== Urban Grid Management System - Sanity Check ===\n")
    
    # Test connection
    print("1. Testing MongoDB connection...")
    if not ping():
        print("[X] Connection failed!")
        sys.exit(1)
    print("[OK] Connection successful\n")
    
    db = get_db()
    
    # Collection counts
    print("2. Collection counts:")
    collections = {
        "zones": db.zones,
        "households": db.households,
        "policies": db.policies,
        "grid_edges": db.grid_edges,
        "meter_readings": db.meter_readings,
        "air_climate_readings": db.air_climate_readings,
        "constraint_events": db.constraint_events,
        "alerts": db.alerts
    }
    
    all_exist = True
    for name, collection in collections.items():
        count = collection.count_documents({})
        status = "[OK]" if count >= 0 else "[X]"
        print(f"   {status} {name}: {count} documents")
        if count < 0:
            all_exist = False
    
    print()
    
    # Check required collections have data
    required_collections = ["zones", "households", "policies", "grid_edges"]
    for coll_name in required_collections:
        count = collections[coll_name].count_documents({})
        if count == 0:
            print(f"[X] {coll_name} is empty! Run seed_core.py first.")
            all_exist = False
    
    if not all_exist:
        print("\n[X] Sanity check failed!")
        sys.exit(1)
    
    # Sample documents
    print("3. Sample documents:")
    
    # One zone
    print("\n   Zone sample (Z_001):")
    zone = db.zones.find_one({"_id": "Z_001"})
    if zone:
        pprint(zone, indent=6)
    else:
        print("      [X] Z_001 not found")
        sys.exit(1)
    
    # One policy
    print("\n   Policy sample:")
    policy = db.policies.find_one({"_id": "POL_AQI_CONTROL_V1"})
    if policy:
        pprint(policy, indent=6)
    else:
        print("      [X] Policy not found")
        sys.exit(1)
    
    # Three households
    print("\n   Household samples (first 3):")
    households = list(db.households.find().limit(3))
    if households:
        for h in households:
            pprint(h, indent=6)
    else:
        print("      [X] No households found")
        sys.exit(1)
    
    # Zone neighbors
    print("\n4. Zone adjacency (Z_001 neighbors):")
    zone_id = "Z_001"
    neighbors = list(db.grid_edges.find({"from_zone": zone_id}))
    if neighbors:
        neighbor_ids = [n["to_zone"] for n in neighbors]
        print(f"   {zone_id} is adjacent to: {', '.join(neighbor_ids)}")
    else:
        print(f"   [X] No neighbors found for {zone_id}")
        sys.exit(1)
    
    print("\n=== All checks passed! [OK] ===\n")
    sys.exit(0)

if __name__ == "__main__":
    run_sanity_check()
