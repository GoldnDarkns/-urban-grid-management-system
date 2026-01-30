"""
Kafka Producer – Phase 2
Fetches from Weather, AQI, Traffic, EIA, 311 APIs and publishes to Kafka topics.
Run: python -m backend.kafka_producer (e.g. in Docker kafka-producer service).
"""
from __future__ import annotations

import json
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional

# Project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient

from backend.services.city_config import CityService
from backend.services.weather_service import WeatherService
from backend.services.aqi_service import AQIService
from backend.services.kaggle_aqi_service import KaggleAQIService
from backend.services.traffic_service import TrafficService
from backend.services.eia_service import EIAService
from backend.services.city311_service import City311Service

BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
DEFAULT_CITY_ID = os.getenv("KAFKA_PRODUCER_CITY_ID", "nyc").lower()
INTERVAL = int(os.getenv("KAFKA_PRODUCER_INTERVAL_SECONDS", "45"))
MAX_ZONES = min(5, int(os.getenv("KAFKA_PRODUCER_MAX_ZONES", "5")))
TOPICS = "power_demand aqi_stream traffic_events grid_alerts incident_text".split()
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://backend:8000").rstrip("/")

_shutdown = False


def _on_sigterm(*_):
    global _shutdown
    _shutdown = True

def _get_selected_city_id() -> Optional[str]:
    """
    Read the currently selected city from the running backend (UI-driven).
    Falls back to DEFAULT_CITY_ID when none is selected or backend is unreachable.
    """
    try:
        r = requests.get(f"{BACKEND_BASE_URL}/api/city/current", timeout=3)
        if r.status_code != 200:
            return None
        data = r.json() if "application/json" in (r.headers.get("content-type") or "") else {}
        if isinstance(data, dict):
            cid = data.get("city_id")
            if cid:
                return str(cid).lower()
    except Exception:
        return None
    return None

def _produce(producer: Producer, topic: str, key: str | None, value: dict) -> None:
    try:
        producer.produce(
            topic,
            key=key.encode("utf-8") if key else None,
            value=json.dumps(value, default=str).encode("utf-8"),
        )
        producer.poll(0)
    except Exception as e:
        print(f"[KafkaProducer] produce error {topic}: {e}")


def _run_once(producer: Producer) -> None:
    city_id = _get_selected_city_id() or DEFAULT_CITY_ID
    city = CityService.get_city(city_id)
    if not city:
        print(f"[KafkaProducer] City {city_id} not found")
        return
    num_zones = min(getattr(city, "num_zones", 20), MAX_ZONES)
    zones = CityService.calculate_zone_coordinates(city_id, num_zones=num_zones, use_reverse_geocode=False)
    ts = datetime.now(timezone.utc).isoformat()

    weather_svc = WeatherService()
    aqi_svc = AQIService()
    kaggle_aqi_svc = KaggleAQIService()  # Kaggle dataset fallback/enhancement
    traffic_svc = TrafficService()
    eia_svc = EIAService()
    c311_svc = City311Service()

    # weather_data – publish to aqi_stream topic (combined with AQI for simplicity)
    # Note: Could create separate weather_stream topic if needed
    for z in zones:
        try:
            weather = weather_svc.get_current_weather(z["lat"], z["lon"], city_id)
            if weather:
                _produce(producer, "aqi_stream", z["zone_id"], {
                    "city_id": city_id,
                    "zone_id": z["zone_id"], 
                    "ts": ts, 
                    "type": "weather",
                    **weather
                })
        except Exception as e:
            print(f"[KafkaProducer] Weather error for {z['zone_id']}: {e}")
        time.sleep(0.3)

    # aqi_stream – one message per zone (delay to avoid AirVisual 429 rate limit)
    # Try AirVisual first, fallback to Kaggle dataset if rate-limited or fails
    for z in zones:
        aqi = None
        source = "airvisual"
        
        # Try AirVisual API first
        aqi = aqi_svc.get_current_aqi(z["lat"], z["lon"])
        
        # If AirVisual fails or is rate-limited, use Kaggle dataset
        if not aqi or aqi.get("source") == "synthetic" or aqi.get("source") == "kaggle_dataset":
            kaggle_aqi = kaggle_aqi_svc.get_aqi_for_location(z["lat"], z["lon"])
            if kaggle_aqi:
                aqi = kaggle_aqi
                source = "kaggle"
                print(f"[KafkaProducer] Using Kaggle AQI for zone {z['zone_id']} (distance: {kaggle_aqi.get('distance_km', 0)}km)")
        
        if aqi:
            _produce(producer, "aqi_stream", z["zone_id"], {
                "city_id": city_id, 
                "zone_id": z["zone_id"], 
                "ts": ts, 
                "source": source,
                **aqi
            })
        time.sleep(1.5)

    # traffic_events – one per zone
    for z in zones:
        tr = traffic_svc.get_traffic_flow(z["lat"], z["lon"])
        if tr:
            _produce(producer, "traffic_events", z["zone_id"], {"city_id": city_id, "zone_id": z["zone_id"], "ts": ts, **tr})
        time.sleep(0.2)

    # power_demand – EIA state-level
    try:
        el = eia_svc.get_electricity_operational_data(state=city.state, frequency="monthly", limit=1)
        if el:
            _produce(producer, "power_demand", city.state, {"city_id": city_id, "state": city.state, "ts": ts, "electricity": el})
    except Exception as e:
        print(f"[KafkaProducer] EIA error: {e}")

    # incident_text – 311 requests
    try:
        reqs = c311_svc.get_311_requests(city_id=city_id, limit=20, status="open")
        for i, r in enumerate(reqs or []):
            _produce(producer, "incident_text", None, {"city_id": city_id, "ts": ts, "index": i, "raw": r})
    except Exception as e:
        print(f"[KafkaProducer] 311 error: {e}")

    # grid_alerts – placeholder heartbeat
    _produce(producer, "grid_alerts", city_id, {"city_id": city_id, "ts": ts, "alerts": [], "source": "kafka_producer"})


def main() -> None:
    global _shutdown
    signal.signal(signal.SIGTERM, _on_sigterm)
    signal.signal(signal.SIGINT, _on_sigterm)

    print(f"[KafkaProducer] bootstrap={BOOTSTRAP} default_city={DEFAULT_CITY_ID} interval={INTERVAL}s backend={BACKEND_BASE_URL}")
    conf = {"bootstrap.servers": BOOTSTRAP}
    producer = Producer(conf)

    # Wait for Kafka to be ready
    admin = AdminClient(conf)
    for attempt in range(1, 31):
        try:
            admin.list_topics(timeout=10)
            break
        except Exception as e:
            print(f"[KafkaProducer] wait for Kafka attempt {attempt}/30: {e}")
            time.sleep(2)
    else:
        print("[KafkaProducer] Kafka not ready after 30 attempts, exiting")
        sys.exit(1)

    count = 0
    while not _shutdown:
        try:
            _run_once(producer)
            producer.flush(timeout=10)
            count += 1
            print(f"[KafkaProducer] cycle {count} OK")
        except Exception as e:
            print(f"[KafkaProducer] cycle error: {e}")
        for _ in range(INTERVAL):
            if _shutdown:
                break
            time.sleep(1)

    print("[KafkaProducer] shutdown")
    producer.flush(timeout=5)


if __name__ == "__main__":
    main()
