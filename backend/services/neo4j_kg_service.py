"""
Knowledge Graph service using Neo4j for urban grid risk reasoning.

Schema:
  - Zone: zone_id, city_id, lat, lon, risk_score, risk_level, aqi, demand_forecast_kwh,
          anomaly_score, updated_at
  - ADJACENT_TO: Zone -> Zone (proximity-based or grid edges)
  - (Optional) HAS_ALERT, AFFECTED_BY for events

Risk reasoning: Cypher queries over zones and neighbors (e.g. cascade, high-AQI propagation).
"""
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
    GraphDatabase = None


def _get_driver():
    if not NEO4J_AVAILABLE:
        return None
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "urban-grid-kg")
    try:
        return GraphDatabase.driver(uri, auth=(user, password))
    except Exception:
        return None


class Neo4jKGService:
    """Knowledge Graph service: schema, ETL, risk reasoning."""

    def __init__(self):
        self._driver = _get_driver()

    @property
    def available(self) -> bool:
        """True if Neo4j driver was created (URI/user/pass set). Use status endpoint to verify connectivity."""
        return self._driver is not None

    def close(self):
        if self._driver:
            self._driver.close()
            self._driver = None

    def _run(self, query: str, parameters: Optional[Dict] = None):
        if not self._driver:
            return []
        with self._driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

    def init_schema(self) -> Dict[str, Any]:
        """Create constraints and indexes. Idempotent. Compatible with Neo4j 5.x."""
        if not self._driver:
            return {"ok": False, "error": "Neo4j driver not available"}
        errors = []
        with self._driver.session() as session:
            # Unique Zone per (city_id, zone_id) - Neo4j 5.x
            try:
                session.run("""
                    CREATE CONSTRAINT zone_id_city IF NOT EXISTS
                    FOR (z:Zone) REQUIRE (z.city_id, z.zone_id) IS UNIQUE
                """)
            except Exception as e:
                err = str(e).lower()
                if "equivalent" in err or "already exists" in err or "equivalent constraint" in err:
                    pass
                else:
                    errors.append(f"constraint: {e}")
            for idx_name, label, prop in [
                ("zone_city", "Zone", "city_id"),
                ("zone_risk", "Zone", "risk_level"),
            ]:
                try:
                    session.run(
                        f"CREATE INDEX {idx_name} IF NOT EXISTS FOR (z:{label}) ON (z.{prop})"
                    )
                except Exception as e:
                    err = str(e).lower()
                    if "equivalent" in err or "already exists" in err:
                        pass
                    else:
                        errors.append(f"index {idx_name}: {e}")
        if errors:
            return {"ok": True, "message": "Schema init with warnings", "warnings": errors}
        return {"ok": True, "message": "Schema initialized"}

    def sync_zone(
        self,
        city_id: str,
        zone_id: str,
        lat: float,
        lon: float,
        risk_score: float,
        risk_level: str,
        aqi: Optional[float] = None,
        demand_forecast_kwh: Optional[float] = None,
        anomaly_score: Optional[float] = None,
        risk_factors: Optional[List[str]] = None,
    ) -> bool:
        """Upsert a Zone node from processed data."""
        if not self._driver:
            return False
        updated = datetime.now(timezone.utc).isoformat()
        factors = risk_factors or []
        try:
            self._run("""
                MERGE (z:Zone {city_id: $city_id, zone_id: $zone_id})
                SET z.lat = $lat, z.lon = $lon,
                    z.risk_score = $risk_score, z.risk_level = $risk_level,
                    z.aqi = $aqi, z.demand_forecast_kwh = $demand_forecast_kwh,
                    z.anomaly_score = $anomaly_score, z.risk_factors = $risk_factors,
                    z.updated_at = $updated_at
            """, {
                "city_id": city_id,
                "zone_id": zone_id,
                "lat": lat,
                "lon": lon,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "aqi": aqi,
                "demand_forecast_kwh": demand_forecast_kwh,
                "anomaly_score": anomaly_score,
                "risk_factors": factors,
                "updated_at": updated,
            })
            return True
        except Exception:
            return False

    def sync_adjacent(self, city_id: str, edges: List[tuple]) -> bool:
        """Create ADJACENT_TO relationships. edges = [(zone_a, zone_b), ...]."""
        if not self._driver or not edges:
            return True
        try:
            with self._driver.session() as session:
                for (za, zb) in edges:
                    session.run("""
                        MERGE (a:Zone {city_id: $city_id, zone_id: $za})
                        MERGE (b:Zone {city_id: $city_id, zone_id: $zb})
                        MERGE (a)-[:ADJACENT_TO]->(b)
                    """, {"city_id": city_id, "za": za, "zb": zb})
            return True
        except Exception:
            return False

    def compute_risk_from_kg(self, city_id: str, zone_id: str) -> Optional[Dict[str, Any]]:
        """
        Reason over the graph: own risk + neighbor influence (cascade / propagation).
        Returns risk_score, risk_level, factors, neighbor_contribution.
        """
        if not self._driver:
            return None
        try:
            records = self._run("""
                MATCH (z:Zone {city_id: $city_id, zone_id: $zone_id})
                OPTIONAL MATCH (z)-[:ADJACENT_TO]->(n:Zone)
                WITH z, collect(n) AS neighbors
                WITH z,
                     z.risk_score AS base_score,
                     [n IN neighbors WHERE n IS NOT NULL | n.risk_score] AS neighbor_scores
                WITH z, base_score,
                     base_score + 0.15 * reduce(s = 0.0, x IN neighbor_scores | s + coalesce(x, 0)) AS kg_score
                RETURN z.zone_id AS zone_id, base_score,
                   CASE WHEN kg_score >= 60 THEN 'high'
                        WHEN kg_score >= 35 THEN 'medium'
                        ELSE 'low' END AS risk_level,
                   neighbor_scores AS neighbor_contributions
            """, {"city_id": city_id, "zone_id": zone_id})
            if not records:
                return None
            r = records[0]
            return {
                "zone_id": r.get("zone_id"),
                "risk_score": round(r.get("base_score", 0) + 0.15 * sum(r.get("neighbor_contributions") or []), 1),
                "risk_level": r.get("risk_level", "low"),
                "base_score": r.get("base_score"),
                "neighbor_contributions": r.get("neighbor_contributions"),
                "source": "knowledge_graph",
            }
        except Exception:
            return None

    def get_graph_for_viz(self, city_id: str, limit: int = 200) -> Dict[str, Any]:
        """Return nodes and edges for frontend visualization or Neo4j Browser."""
        if not self._driver:
            return {"nodes": [], "edges": [], "error": "Neo4j not available"}
        try:
            nodes = self._run("""
                MATCH (z:Zone {city_id: $city_id})
                RETURN z.zone_id AS id, z.zone_id AS label, z.risk_level AS risk_level,
                       z.risk_score AS risk_score, z.lat AS lat, z.lon AS lon
                LIMIT $limit
            """, {"city_id": city_id, "limit": limit})
            edges = self._run("""
                MATCH (a:Zone {city_id: $city_id})-[r:ADJACENT_TO]->(b:Zone)
                RETURN a.zone_id AS source, b.zone_id AS target
                LIMIT $limit
            """, {"city_id": city_id, "limit": limit})
            return {
                "nodes": [{"id": n["id"], "label": n["label"], "risk_level": n.get("risk_level"), "risk_score": n.get("risk_score"), "lat": n.get("lat"), "lon": n.get("lon")} for n in nodes],
                "edges": [{"source": e["source"], "target": e["target"]} for e in edges],
            }
        except Exception as e:
            return {"nodes": [], "edges": [], "error": str(e)}

    def sync_from_processed_zones(
        self,
        city_id: str,
        zones: List[Dict[str, Any]],
        edges: Optional[List[tuple]] = None,
    ) -> Dict[str, Any]:
        """
        ETL: bulk upsert zones and adjacency from processed_zone_data-style list.
        zones: list of {zone_id, lat, lon, ml_processed: {risk_score, demand_forecast, anomaly_detection}, raw_data: {aqi}, ...}
        edges: optional [(zone_a, zone_b), ...] for ADJACENT_TO; if None, consecutive zone_ids are used.
        """
        if not self._driver:
            return {"synced": 0, "edges": 0, "error": "Neo4j not available"}
        synced = 0
        for z in zones:
            zone_id = z.get("zone_id")
            if not zone_id:
                continue
            ml = z.get("ml_processed") or {}
            risk = ml.get("risk_score") or {}
            score = risk.get("score", 0) if isinstance(risk, dict) else 0
            level = risk.get("level", "low") if isinstance(risk, dict) else "low"
            factors = risk.get("factors", []) if isinstance(risk, dict) else []
            raw = z.get("raw_data") or {}
            aqi_val = (raw.get("aqi") or {}).get("aqi")
            demand = (ml.get("demand_forecast") or {}).get("next_hour_kwh")
            anomaly = (ml.get("anomaly_detection") or {}).get("anomaly_score")
            lat = z.get("lat") or 0.0
            lon = z.get("lon") or 0.0
            if self.sync_zone(
                city_id=city_id,
                zone_id=zone_id,
                lat=lat,
                lon=lon,
                risk_score=float(score),
                risk_level=str(level),
                aqi=float(aqi_val) if aqi_val is not None else None,
                demand_forecast_kwh=float(demand) if demand is not None else None,
                anomaly_score=float(anomaly) if anomaly is not None else None,
                risk_factors=factors if isinstance(factors, list) else [],
            ):
                synced += 1
        zone_ids = [z["zone_id"] for z in zones if z.get("zone_id")]
        if edges is None:
            edges = []
            for i in range(len(zone_ids) - 1):
                edges.append((zone_ids[i], zone_ids[i + 1]))
        if edges:
            self.sync_adjacent(city_id, edges)
        return {"synced": synced, "edges": len(edges)}


# Singleton for use in routes/processor
_kg_service: Optional[Neo4jKGService] = None


def get_kg_service() -> Neo4jKGService:
    global _kg_service
    if _kg_service is None:
        _kg_service = Neo4jKGService()
    return _kg_service
