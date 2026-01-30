"""
Live Stream API – Kafka-sourced data for the Live Stream UI.
Reads from kafka_live_feed (city MongoDB), populated by kafka-consumer or Spark.
"""
from fastapi import APIRouter, Query
from src.db.mongo_client import get_db

router = APIRouter(prefix="/api/live-stream", tags=["Live Stream"])


@router.get("")
async def get_live_stream(
    limit: int = Query(100, ge=1, le=500, description="Max records per topic"),
    topics: str = Query("power_demand,aqi_stream,traffic_events,grid_alerts,incident_text", description="Comma-separated topics"),
    city_id: str | None = Query(None, description="Optional city_id filter (e.g. nyc, sf)"),
):
    """
    Recent Kafka-sourced records for the Live Stream tab.
    Data is written by kafka-consumer (or Spark) from Kafka topics.
    """
    db = get_db("city")
    if db is None:
        return {
            "ok": False,
            "message": "City MongoDB not connected",
            "by_topic": {},
            "last_updated": None,
        }
    coll = db["kafka_live_feed"]
    topic_list = [t.strip() for t in topics.split(",") if t.strip()]
    by_topic = {}
    last_updated = None
    try:
        query = {}
        if city_id:
            query["city_id"] = city_id.lower()
        cursor = coll.find(query).sort("ingested_at", -1).limit(limit * len(topic_list) if topic_list else limit)
        for doc in cursor:
            t = doc.get("topic", "unknown")
            if topic_list and t not in topic_list:
                continue
            if t not in by_topic:
                by_topic[t] = []
            if len(by_topic[t]) >= limit:
                continue
            rec = {
                "ts": doc.get("ts"),
                "ingested_at": doc.get("ingested_at"),
                "city_id": doc.get("city_id"),
                "zone_id": doc.get("zone_id"),
                "payload": doc.get("payload", {}),
            }
            by_topic[t].append(rec)
            if last_updated is None:
                last_updated = doc.get("ingested_at")
        # Ensure all requested topics exist
        for t in topic_list:
            if t not in by_topic:
                by_topic[t] = []
    except Exception as e:
        return {
            "ok": False,
            "message": str(e),
            "by_topic": {},
            "last_updated": None,
        }
    return {
        "ok": True,
        "by_topic": by_topic,
        "last_updated": last_updated,
    }
