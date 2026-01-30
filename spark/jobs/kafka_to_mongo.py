"""
Spark Structured Streaming: Kafka -> MongoDB (kafka_live_feed).
Consumes power_demand, aqi_stream, traffic_events, grid_alerts, incident_text.
Run via spark-submit with --packages org.apache.spark:spark-sql-kafka-2.12:3.5.0
"""
import os
import json
from datetime import datetime, timezone
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, lit
from pyspark.sql.types import StringType, StructType, StructField

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
MONGO_URI = os.getenv("CITY_MONGO_URI", os.getenv("MONGO_URI", "mongodb://mongodb:27017"))
MONGO_DB = os.getenv("CITY_MONGO_DB", "urban_grid_city")
TOPICS = "power_demand,aqi_stream,traffic_events,grid_alerts,incident_text"

def main():
    spark = (
        SparkSession.builder
        .appName("kafka-to-mongo")
        .config("spark.sql.streaming.checkpointLocation", "/tmp/spark-kafka-mongo-checkpoint")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    df = (
        spark.readStream
        .format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP)
        .option("subscribe", TOPICS)
        .option("startingOffsets", "latest")
        .option("failOnDataLoss", "false")
        .load()
    )

    # value is binary JSON; we keep raw string for MongoDB
    raw = df.select(
        col("topic"),
        col("value").cast(StringType()).alias("value_str"),
        col("timestamp").cast("long").alias("kafka_ts"),
    )

    def write_batch(batch_df, batch_id):
        if batch_df.isEmpty():
            return
        try:
            from pymongo import MongoClient
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            db = client[MONGO_DB]
            coll = db["kafka_live_feed"]
            rows = batch_df.collect()
            docs = []
            for r in rows:
                try:
                    payload = json.loads(r.value_str) if r.value_str else {}
                except Exception:
                    payload = {"raw": r.value_str}
                doc = {
                    "topic": r.topic,
                    "ts": payload.get("ts"),
                    "ingested_at": datetime.now(timezone.utc).isoformat(),
                    "kafka_ts": r.kafka_ts,
                    "payload": payload,
                }
                if "city_id" in payload:
                    doc["city_id"] = payload["city_id"]
                if "zone_id" in payload:
                    doc["zone_id"] = payload["zone_id"]
                docs.append(doc)
            if docs:
                coll.insert_many(docs)
            client.close()
        except Exception as e:
            print(f"[kafka-to-mongo] batch {batch_id} write error: {e}")

    q = (
        raw.writeStream
        .foreachBatch(write_batch)
        .outputMode("append")
        .trigger(processingTime="30 seconds")
        .start()
    )
    q.awaitTermination()

if __name__ == "__main__":
    main()
