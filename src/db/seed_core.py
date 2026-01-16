"""
Seed script for Urban Grid Management System.
Populates MongoDB with initial zones, households, policies, and graph structure.
"""
import argparse
import random
from tqdm import tqdm
from src.config import DEFAULT_CITY, DEFAULT_ZONES, DEFAULT_HOUSEHOLDS
from src.db.mongo_client import get_db
from src.db.indexes import create_indexes

def generate_zones(db, city, num_zones):
    """Generate zone documents."""
    zones_collection = db.zones
    
    # Define zone names (realistic city zone names)
    zone_names = [
        "Downtown", "Midtown", "Riverside", "Harbor", "Parkview",
        "Hillcrest", "Westside", "Eastside", "Northgate", "Southgate",
        "Central", "Industrial", "Residential", "Commercial", "Tech",
        "Medical", "University", "Airport", "Port", "Suburban"
    ]
    
    # Ensure we have enough names
    while len(zone_names) < num_zones:
        zone_names.extend([f"Zone_{i}" for i in range(len(zone_names), num_zones)])
    
    zones = []
    hospital_zones = random.sample(range(num_zones), min(2, num_zones))
    
    for i in range(num_zones):
        zone_id = f"Z_{str(i+1).zfill(3)}"
        
        # Determine if this zone has critical infrastructure
        has_hospital = i in hospital_zones
        critical_sites = []
        
        if has_hospital:
            critical_sites.append("hospital")
            grid_priority = random.choice([4, 5])  # Higher priority
        else:
            grid_priority = random.choice([1, 2, 3])
        
        # Add other critical sites randomly
        if random.random() < 0.3:  # 30% chance
            critical_sites.append(random.choice(["water", "telecom", "emergency"]))
        
        zone_doc = {
            "_id": zone_id,
            "city": city,
            "name": zone_names[i],
            "population_est": random.randint(5000, 50000),
            "critical_sites": critical_sites,
            "grid_priority": grid_priority,
            "created_at": "2024-01-01T00:00:00Z"
        }
        zones.append(zone_doc)
    
    zones_collection.insert_many(zones)
    print(f"[OK] Inserted {len(zones)} zones")
    return zones

def generate_households(db, zones, num_households):
    """Generate household documents distributed across zones."""
    households_collection = db.households
    
    # Distribute households across zones (weighted by population)
    zone_weights = [z.get("population_est", 1) for z in zones]
    total_weight = sum(zone_weights)
    zone_distribution = [int((w / total_weight) * num_households) for w in zone_weights]
    
    # Adjust for rounding
    diff = num_households - sum(zone_distribution)
    if diff > 0:
        for i in range(diff):
            zone_distribution[i % len(zone_distribution)] += 1
    
    households = []
    household_counter = 1
    
    dwelling_types = ["apartment", "villa", "studio"]
    dwelling_baselines = {
        "apartment": (8, 15),  # kWh per day range
        "villa": (15, 30),
        "studio": (5, 10)
    }
    
    for zone_idx, zone in enumerate(zones):
        zone_id = zone["_id"]
        num_households_in_zone = zone_distribution[zone_idx]
        
        for _ in range(num_households_in_zone):
            household_id = f"H_{str(household_counter).zfill(6)}"
            dwelling_type = random.choice(dwelling_types)
            baseline_range = dwelling_baselines[dwelling_type]
            baseline_kwh_daily = round(random.uniform(*baseline_range), 2)
            
            household_doc = {
                "_id": household_id,
                "zone_id": zone_id,
                "dwelling_type": dwelling_type,
                "solar_installed": random.random() < 0.15,  # 15% have solar
                "baseline_kwh_daily": baseline_kwh_daily,
                "created_at": "2024-01-01T00:00:00Z"
            }
            households.append(household_doc)
            household_counter += 1
    
    households_collection.insert_many(households)
    print(f"[OK] Inserted {len(households)} households")
    return households

def generate_policy(db, city):
    """Generate AQI policy document."""
    policies_collection = db.policies
    
    policy_doc = {
        "_id": "POL_AQI_CONTROL_V1",
        "city": city,
        "policy_name": "AQI Control Policy",
        "version": "1.0",
        "aqi_thresholds": [
            {
                "level": "watch",
                "min": 101,
                "actions": ["public_advisory"]
            },
            {
                "level": "alert",
                "min": 151,
                "actions": ["traffic_restriction", "industrial_limit"]
            },
            {
                "level": "emergency",
                "min": 201,
                "actions": ["load_shifting", "peak_control", "critical_load_protection"]
            }
        ],
        "demand_threshold_mw": 500.0,
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    policies_collection.insert_one(policy_doc)
    print("[OK] Inserted AQI policy")
    return policy_doc

def generate_grid_edges(db, zones):
    """Generate zone adjacency graph (ring + extra edges)."""
    edges_collection = db.grid_edges
    
    edges = []
    zone_ids = [z["_id"] for z in zones]
    num_zones = len(zone_ids)
    
    # Create ring: Z_001 -> Z_002, Z_002 -> Z_003, ..., Z_020 -> Z_001
    for i in range(num_zones):
        from_zone = zone_ids[i]
        to_zone = zone_ids[(i + 1) % num_zones]
        
        # Add both directions for undirected graph
        edges.append({
            "from_zone": from_zone,
            "to_zone": to_zone,
            "edge_type": "adjacent"
        })
        edges.append({
            "from_zone": to_zone,
            "to_zone": from_zone,
            "edge_type": "adjacent"
        })
    
    # Add extra edges: connect every 4th node to node+2 (skip one)
    for i in range(0, num_zones, 4):
        if i + 2 < num_zones:
            from_zone = zone_ids[i]
            to_zone = zone_ids[i + 2]
            
            # Check if edge already exists
            if not any(e["from_zone"] == from_zone and e["to_zone"] == to_zone for e in edges):
                edges.append({
                    "from_zone": from_zone,
                    "to_zone": to_zone,
                    "edge_type": "adjacent"
                })
                edges.append({
                    "from_zone": to_zone,
                    "to_zone": from_zone,
                    "edge_type": "adjacent"
                })
    
    edges_collection.insert_many(edges)
    print(f"[OK] Inserted {len(edges)} grid edges")
    return edges

def seed_database(reset=False, num_zones=DEFAULT_ZONES, num_households=DEFAULT_HOUSEHOLDS, city=DEFAULT_CITY):
    """Main seeding function."""
    db = get_db()
    
    print(f"\n=== Seeding Database ===")
    print(f"City: {city}")
    print(f"Zones: {num_zones}")
    print(f"Households: {num_households}")
    
    if reset:
        print("\n[WARNING] RESET MODE: Dropping existing collections...")
        collections_to_drop = [
            "zones", "households", "meter_readings", "air_climate_readings",
            "constraint_events", "policies", "alerts", "grid_edges"
        ]
        for coll_name in collections_to_drop:
            if coll_name in db.list_collection_names():
                db[coll_name].drop()
                print(f"  Dropped {coll_name}")
    
    # Generate data
    zones = generate_zones(db, city, num_zones)
    households = generate_households(db, zones, num_households)
    policy = generate_policy(db, city)
    edges = generate_grid_edges(db, zones)
    
    # Create indexes
    create_indexes(db)
    
    # Print final counts
    print("\n=== Seeding Complete ===")
    print(f"Zones: {db.zones.count_documents({})}")
    print(f"Households: {db.households.count_documents({})}")
    print(f"Policies: {db.policies.count_documents({})}")
    print(f"Grid Edges: {db.grid_edges.count_documents({})}")
    print(f"Meter Readings: {db.meter_readings.count_documents({})} (empty, ready for Phase 2)")
    print(f"Air/Climate Readings: {db.air_climate_readings.count_documents({})} (empty, ready for Phase 2)")
    print(f"Constraint Events: {db.constraint_events.count_documents({})} (empty, ready for Phase 2)")
    print(f"Alerts: {db.alerts.count_documents({})} (empty, ready for Phase 2)")
    print()

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Seed Urban Grid Management System database")
    parser.add_argument("--reset", action="store_true", help="Drop existing collections before seeding")
    parser.add_argument("--zones", type=int, default=DEFAULT_ZONES, help=f"Number of zones (default: {DEFAULT_ZONES})")
    parser.add_argument("--households", type=int, default=DEFAULT_HOUSEHOLDS, help=f"Number of households (default: {DEFAULT_HOUSEHOLDS})")
    parser.add_argument("--city", type=str, default=DEFAULT_CITY, help=f"City name (default: {DEFAULT_CITY})")
    
    args = parser.parse_args()
    
    seed_database(
        reset=args.reset,
        num_zones=args.zones,
        num_households=args.households,
        city=args.city
    )

if __name__ == "__main__":
    main()
