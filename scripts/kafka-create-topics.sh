#!/bin/bash
# Create Kafka topics for Urban Grid Management System (Phase 2).
# Run inside a Kafka client container; KAFKA_CFG_BOOTSTRAP_SERVERS must be set.

set -e
BOOTSTRAP="${KAFKA_CFG_BOOTSTRAP_SERVERS:-kafka:9092}"
echo "Creating topics (bootstrap=$BOOTSTRAP)..."

for topic in power_demand aqi_stream traffic_events grid_alerts incident_text; do
  # Use Apache Kafka path (not Bitnami)
  /opt/kafka/bin/kafka-topics.sh --create --if-not-exists \
    --bootstrap-server "$BOOTSTRAP" \
    --partitions 1 \
    --replication-factor 1 \
    --topic "$topic"
  echo "  Topic $topic OK"
done

echo "All topics created."
