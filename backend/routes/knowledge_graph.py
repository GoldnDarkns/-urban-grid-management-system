"""
Knowledge Graph API - Neo4j-backed risk reasoning and graph visualization.
"""
from fastapi import APIRouter, Query
from typing import Optional

from backend.services.neo4j_kg_service import get_kg_service

router = APIRouter(prefix="/api/kg", tags=["Knowledge Graph"])


@router.get("/status")
async def kg_status():
    """Check if Neo4j Knowledge Graph is available and optionally init schema."""
    kg = get_kg_service()
    if not kg.available:
        return {
            "available": False,
            "message": "Neo4j not configured or driver unavailable. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD (e.g. bolt://localhost:7687 when Neo4j runs in Docker).",
        }
    try:
        kg._driver.verify_connectivity()
    except Exception as e:
        return {
            "available": False,
            "message": f"Neo4j not reachable: {e}. Is Neo4j running? (e.g. docker-compose up -d neo4j)",
        }
    schema = kg.init_schema()
    return {
        "available": True,
        "schema": schema,
        "message": "Neo4j Knowledge Graph ready. Use Sync KG from processed data (after city processing) to populate.",
    }


def _build_grid_edges(coords_list: list) -> list:
    """Build adjacency edges from zone grid_position (row, col). Returns [(zone_a, zone_b), ...]."""
    zone_by_pos = {}
    for z in coords_list:
        pos = z.get("grid_position")
        zid = z.get("zone_id")
        if pos is not None and zid:
            zone_by_pos[(pos.get("row"), pos.get("col"))] = zid
    edges = []
    for (row, col), zid in zone_by_pos.items():
        for dr, dc in [(0, 1), (1, 0)]:
            nb = zone_by_pos.get((row + dr, col + dc))
            if nb and nb != zid:
                edges.append((zid, nb))
    return edges


@router.post("/sync")
async def kg_sync(city_id: Optional[str] = Query(None, description="City to sync (e.g. nyc)")):
    """
    Sync Knowledge Graph from MongoDB processed_zone_data.
    Call after city processing. Uses latest doc per zone; enriches with city zone coords and grid adjacency.
    """
    kg = get_kg_service()
    if not kg.available:
        return {"success": False, "error": "Neo4j not available", "synced": 0, "edges": 0}
    if not city_id:
        return {"success": False, "error": "city_id required", "synced": 0, "edges": 0}
    try:
        from src.db.mongo_client import get_city_db
        from backend.services.city_config import CityService
        db = get_city_db()
        if db is None:
            return {"success": False, "error": "MongoDB city DB not available", "synced": 0, "edges": 0}
        cursor = db.processed_zone_data.find({"city_id": city_id}).sort("timestamp", -1)
        all_docs = list(cursor)
        # Keep latest document per zone_id so we sync current state
        by_zone = {}
        for z in all_docs:
            zid = z.get("zone_id")
            if zid and zid not in by_zone:
                by_zone[zid] = z
        zones = list(by_zone.values())
        if not zones:
            return {"success": True, "city_id": city_id, "synced": 0, "edges": 0, "message": "No processed zone data for this city. Run city processing first."}
        # Enrich with lat/lon and grid position from city config
        city_config = CityService.get_city(city_id)
        coords_list = []
        if city_config:
            try:
                coords_list = CityService.calculate_zone_coordinates(city_id, city_config.num_zones, use_reverse_geocode=False)
            except Exception:
                pass
        coords_by_id = {z.get("zone_id"): z for z in coords_list if z.get("zone_id")}
        for z in zones:
            c = coords_by_id.get(z.get("zone_id"))
            if c:
                if z.get("lat") is None:
                    z["lat"] = c.get("lat")
                if z.get("lon") is None:
                    z["lon"] = c.get("lon")
        grid_edges = _build_grid_edges(coords_list) if coords_list else None
        result = kg.sync_from_processed_zones(city_id, zones, edges=grid_edges)
        return {"success": True, "city_id": city_id, **result}
    except Exception as e:
        return {"success": False, "error": str(e), "synced": 0, "edges": 0}


@router.get("/risk")
async def kg_risk(
    city_id: str = Query(..., description="City ID"),
    zone_id: str = Query(..., description="Zone ID"),
):
    """Get risk for a zone from Knowledge Graph (neighbor-aware reasoning)."""
    kg = get_kg_service()
    if not kg.available:
        return {"error": "Neo4j not available", "zone_id": zone_id}
    out = kg.compute_risk_from_kg(city_id, zone_id)
    if out is None:
        return {"error": "Zone not found in KG or not synced", "zone_id": zone_id}
    return out


@router.get("/graph")
async def kg_graph(
    city_id: str = Query(..., description="City ID"),
    limit: int = Query(200, ge=1, le=500),
):
    """Get nodes and edges for graph visualization (frontend or Neo4j Browser)."""
    kg = get_kg_service()
    if not kg.available:
        return {"nodes": [], "edges": [], "error": "Neo4j not available"}
    return kg.get_graph_for_viz(city_id, limit=limit)


@router.get("/neo4j-browser-url")
async def neo4j_browser_url():
    """Return Neo4j Browser URL. Always localhost:7474 so the link works from the user's browser (Neo4j is port-mapped)."""
    return {
        "url": "http://localhost:7474",
        "message": "Open in browser to explore the Knowledge Graph. Run: MATCH (z:Zone) RETURN z LIMIT 100",
    }
