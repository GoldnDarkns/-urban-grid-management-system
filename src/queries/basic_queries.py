"""
Basic queries for Urban Grid Management System.
Demonstrates simple MongoDB queries on the core collections.
"""
from src.db.mongo_client import get_db
from pprint import pprint

def list_zones_with_hospitals():
    """Query 1: List all zones that contain hospitals."""
    db = get_db()
    
    print("=== Query 1: Zones with Hospitals ===")
    zones = db.zones.find({"critical_sites": "hospital"})
    
    results = list(zones)
    print(f"Found {len(results)} zones with hospitals:\n")
    
    for zone in results:
        print(f"  {zone['_id']}: {zone['name']}")
        print(f"    Priority: {zone['grid_priority']}")
        print(f"    Critical Sites: {', '.join(zone['critical_sites'])}")
        print()
    
    return results

def list_top_zones_by_priority(limit=5):
    """Query 2: List top N zones by grid priority."""
    db = get_db()
    
    print(f"=== Query 2: Top {limit} Zones by Grid Priority ===")
    zones = db.zones.find().sort("grid_priority", -1).limit(limit)
    
    results = list(zones)
    print(f"Top {len(results)} zones:\n")
    
    for zone in results:
        print(f"  {zone['_id']}: {zone['name']}")
        print(f"    Priority: {zone['grid_priority']}")
        print(f"    Population: {zone['population_est']:,}")
        print()
    
    return results

def show_zone_adjacency(zone_id):
    """Query 3: Show adjacency list for a given zone."""
    db = get_db()
    
    print(f"=== Query 3: Adjacency List for {zone_id} ===")
    
    # Get zone info
    zone = db.zones.find_one({"_id": zone_id})
    if not zone:
        print(f"❌ Zone {zone_id} not found")
        return None
    
    print(f"Zone: {zone['name']} ({zone_id})")
    print(f"Priority: {zone['grid_priority']}")
    print()
    
    # Get neighbors
    neighbors = list(db.grid_edges.find({"from_zone": zone_id}))
    
    if not neighbors:
        print("  No neighbors found")
        return []
    
    print(f"Adjacent zones ({len(neighbors)}):")
    neighbor_ids = [n["to_zone"] for n in neighbors]
    
    # Get neighbor details
    neighbor_zones = db.zones.find({"_id": {"$in": neighbor_ids}})
    for nz in neighbor_zones:
        print(f"  → {nz['_id']}: {nz['name']} (Priority: {nz['grid_priority']})")
    
    print()
    return neighbor_ids

def main():
    """Run all basic queries."""
    print("\n" + "="*60)
    print("Urban Grid Management System - Basic Queries")
    print("="*60 + "\n")
    
    # Query 1
    list_zones_with_hospitals()
    
    # Query 2
    list_top_zones_by_priority(5)
    
    # Query 3
    show_zone_adjacency("Z_001")
    
    print("="*60)
    print("All queries completed!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
