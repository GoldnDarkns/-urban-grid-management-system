"""
Kafka Consumer – Phase 2 / Phase 1b
Consumes from power_demand, aqi_stream, traffic_events, grid_alerts, incident_text.
- Writes to kafka_live_feed (city DB) for Live Stream UI.
- Phase 1b: Also upserts to topic-keyed raw_* collections (raw_aqi, raw_traffic, etc.)
  so processing job can read latest per (city_id, zone_id) from MongoDB.
Run: python -m backend.kafka_consumer (e.g. in Docker kafka-consumer service).
"""
from __future__ import annotations

import json
import os
import signal
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from confluent_kafka import Consumer, KafkaError
from pymongo import MongoClient
from bson import ObjectId

BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
MONGO_URI = os.getenv("CITY_MONGO_URI", os.getenv("MONGO_URI", "mongodb://mongodb:27017"))
MONGO_DB = os.getenv("CITY_MONGO_DB", "urban_grid_city")
TOPICS = ["power_demand", "aqi_stream", "traffic_events", "grid_alerts", "incident_text"]
# Phase 1b: topic -> raw collection name (processing job reads from these)
# aqi_stream splits: type=weather -> raw_weather, else -> raw_aqi
TOPIC_TO_RAW_COLLECTION = {
    "aqi_stream": None,  # resolved in _upsert_raw by payload.type
    "traffic_events": "raw_traffic",
    "power_demand": "raw_power_demand",
    "grid_alerts": "raw_grid_alerts",
    "incident_text": "raw_311",
}
_shutdown = False


def _on_sigterm(*_):
    global _shutdown
    _shutdown = True


def _clean_for_storage(obj):
    """Recursively convert ObjectIds to strings for storage."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: _clean_for_storage(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_for_storage(item) for item in obj]
    if hasattr(obj, "isoformat") and callable(getattr(obj, "isoformat")):
        return obj.isoformat()
    return obj


def _upsert_raw(db, topic: str, payload: dict, doc: dict) -> None:
    """Phase 1b: upsert into topic-keyed raw_* collection (latest per city_id, zone_id)."""
    coll_name = TOPIC_TO_RAW_COLLECTION.get(topic)
    if topic == "aqi_stream":
        coll_name = "raw_weather" if payload.get("type") == "weather" else "raw_aqi"
    if not coll_name:
        return
    city_id = (payload.get("city_id") or "").strip().lower() or None
    zone_id = (payload.get("zone_id") or "").strip() or None
    if not city_id:
        return
    raw_doc = {
        "city_id": city_id,
        "zone_id": zone_id,
        "ts": payload.get("ts"),
        "ingested_at": doc.get("ingested_at"),
        "topic": topic,
        "payload": _clean_for_storage(payload),
    }
    filter_ = {"city_id": city_id, "zone_id": zone_id}
    try:
        db[coll_name].replace_one(filter_, raw_doc, upsert=True)
    except Exception as e:
        print(f"[KafkaConsumer] raw upsert error {coll_name}: {e}")


def main() -> None:
    global _shutdown
    signal.signal(signal.SIGTERM, _on_sigterm)
    signal.signal(signal.SIGINT, _on_sigterm)

    print(f"[KafkaConsumer] bootstrap={BOOTSTRAP} mongo={MONGO_DB} (Phase 1b: raw_* collections)")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    db = client[MONGO_DB]
    coll = db["kafka_live_feed"]

    conf = {
        "bootstrap.servers": BOOTSTRAP,
        "group.id": "ugms-live-stream",
        "auto.offset.reset": "latest",
    }
    consumer = Consumer(conf)
    consumer.subscribe(TOPICS)

    count = 0
    batch = []
    batch_size = 50

    while not _shutdown:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            if batch:
                try:
                    coll.insert_many(batch)
                    count += len(batch)
                    print(f"[KafkaConsumer] wrote {len(batch)} docs (total {count})")
                except Exception as e:
                    print(f"[KafkaConsumer] insert error: {e}")
                batch = []
            continue
        if msg.error():
            if msg.error().code() != KafkaError._PARTITION_EOF:
                print(f"[KafkaConsumer] error: {msg.error()}")
            continue
        try:
            payload = json.loads(msg.value().decode("utf-8")) if msg.value() else {}
        except Exception:
            payload = {"raw": msg.value().decode("utf-8", errors="replace")}
        clean_payload = _clean_for_storage(payload)
        doc = {
            "topic": msg.topic(),
            "ts": payload.get("ts"),
            "ingested_at": datetime.now(timezone.utc).isoformat(),
            "payload": clean_payload,
        }
        if "city_id" in payload:
            doc["city_id"] = str(payload["city_id"]) if payload["city_id"] else None
        if "zone_id" in payload:
            doc["zone_id"] = str(payload["zone_id"]) if payload["zone_id"] else None
        batch.append(doc)
        # Phase 1b: upsert into raw_* so processing job can read latest per zone
        _upsert_raw(db, msg.topic(), payload, doc)
        if len(batch) >= batch_size:
            try:
                coll.insert_many(batch)
                count += len(batch)
                print(f"[KafkaConsumer] wrote {len(batch)} docs (total {count})")
            except Exception as e:
                print(f"[KafkaConsumer] insert error: {e}")
            batch = []

    consumer.close()
    if batch:
        try:
            coll.insert_many(batch)
        except Exception as e:
            print(f"[KafkaConsumer] final insert error: {e}")
    client.close()
    print("[KafkaConsumer] shutdown")


if __name__ == "__main__":
    main()
