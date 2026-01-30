"""
Kafka Consumer – Phase 2
Consumes from power_demand, aqi_stream, traffic_events, grid_alerts, incident_text
and writes to MongoDB kafka_live_feed (city DB). Powers the Live Stream UI.
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
_shutdown = False


def _on_sigterm(*_):
    global _shutdown
    _shutdown = True


def main() -> None:
    global _shutdown
    signal.signal(signal.SIGTERM, _on_sigterm)
    signal.signal(signal.SIGINT, _on_sigterm)

    print(f"[KafkaConsumer] bootstrap={BOOTSTRAP} mongo={MONGO_DB}")
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
        # CRITICAL: Convert all ObjectIds to strings before storing
        def clean_for_storage(obj):
            """Recursively convert ObjectIds to strings for storage"""
            if isinstance(obj, ObjectId):
                return str(obj)
            if isinstance(obj, dict):
                return {k: clean_for_storage(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [clean_for_storage(item) for item in obj]
            if hasattr(obj, 'isoformat') and callable(getattr(obj, 'isoformat')):
                return obj.isoformat()
            return obj
        
        # Clean payload before storing
        clean_payload = clean_for_storage(payload)
        
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
