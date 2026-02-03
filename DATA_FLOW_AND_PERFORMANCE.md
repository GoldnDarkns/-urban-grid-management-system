# Data Flow & Performance: Current vs Proposed

**Purpose:** Clarify how data moves today, what takes the most time, and how your ideas (Kafka as main provider, pre-trained-only inference, optional model outsourcing) fit into the phases.

**Phase 1a status:** Done. LSTM/TFT model cache + pre-compute (`model_outputs`) + **query-keyed cache** (city_id, zone_id) so different city/zone returns correct prediction; inference filters meter_readings by scope.

---

## 1. Your Understanding vs Reality (Summary)

| Your understanding | What actually happens |
|--------------------|------------------------|
| APIs are called and feed the website; processing is done locally. | ✅ **Correct.** City Live: backend (DataProcessor) calls Weather, AQI, Traffic APIs per zone, processes in memory, writes to MongoDB (processed_zone_data). |
| Kafka is just live streaming so you can see data live. | ✅ **Correct.** Kafka producer fetches APIs on a timer and publishes to topics; consumer writes to `kafka_live_feed`. The **Live Stream** tab reads from `kafka_live_feed`. The rest of the app (Analytics, Models, AI Recs, etc.) does **not** read from Kafka — it reads from `processed_zone_data` and other collections filled by the **background processor** (API calls → process → MongoDB). |
| Models are saving previous output and retraining on new inputs, so they take long. | ❌ **Not in the City Live pipeline.** In the City Live **processing** path we do **not** load TFT/LSTM/GNN or retrain. We use **lightweight heuristics** (avg demand × temp, z-score anomaly, rule-based risk). So the slowness there is **not** retraining — it’s **many API calls** (N zones × 3 APIs) and per-zone work. On the **Model pages** (TFT/LSTM), we do **inference only** (load saved model, predict); there is no retraining on each request. So “pre-trained only, just give outputs” is already the case for model pages; we can still **optimize** (cache model load, pre-compute and store results). |

---

## 2. Current Flow (City Live) — Step by Step

```
User selects city (POST /api/city/select/nyc)
    → Backend returns immediately (~1s): “Background processing started.”
    → In background:
        1. Write zone coordinates to City MongoDB.
        2. Start BackgroundProcessor (runs every 5 minutes).
        3. Each run: DataProcessor.process_all_zones()
            For each zone (e.g. 20–40 zones, 5 at a time):
                a. Weather API (1 call)
                b. AQI API (1 call)
                c. Traffic API (1 call)
                d. process_with_ml_models() → heuristics only (no Keras/TFT)
                e. generate_recommendations()
                f. _create_alerts_from_processing()
                g. Insert into processed_zone_data (MongoDB)
            Plus: process_eia_data() for the city.
    → Frontend / Analytics / AI Recs read from MongoDB (processed_zone_data, etc.).
```

**Kafka (parallel, not the main path):**

```
Kafka producer (runs every ~45s):
    → Reads current city from backend (/api/city/current).
    → Fetches Weather, AQI, Traffic, EIA, 311 for that city (limited zones).
    → Publishes to topics: power_demand, aqi_stream, traffic_events, grid_alerts, incident_text.

Kafka consumer:
    → Reads from those topics.
    → Writes to MongoDB: kafka_live_feed.

Live Stream tab:
    → GET /api/live-stream → reads kafka_live_feed.
```

So: **main path for “the website” = APIs → Backend processing → MongoDB.** Kafka = **only** for the Live Stream tab. APIs are **not** “fed to Kafka” for the rest of the app; they’re called directly by the backend when the background processor runs.

---

## 3. What Takes the Most Time

| Where | What | Why it’s slow |
|-------|------|----------------|
| **City Live: first load / every 5 min** | `process_all_zones()` | N zones × 3 API calls (Weather, AQI, Traffic). Concurrency is capped (e.g. 5 zones at a time) to avoid rate limits. So for 25 zones ≈ 5 “waves” × (3 × 5) = 75 API calls; each call can be 0.3–2s → tens of seconds to a few minutes. Plus DB writes and heuristics (cheap). |
| **City Live: “Process all” (if user triggers)** | Same as above | Same bottleneck: many APIs per run. |
| **Model pages (TFT/LSTM, etc.)** | `get_lstm_prediction()` etc. | Load model from disk (**every request**), read meter_readings from DB, scale data (scaler fit + transform), run `model.predict()`. No retraining. Slowness = model load + DB read + inference. |
| **Simulated mode** | Reads from Atlas | Usually fast; depends on network and query size. |

So the **dominant** cost in City Live is **API volume and latency**, not model training. Second is **model load + inference** on model pages if we don’t cache.

---

## 4. Rerouting APIs Through Kafka (Kafka as Main Provider)

**Idea:** APIs → Kafka (producers) → consumer → MongoDB (raw_* then derived) → processing reads from MongoDB. Frontend only talks to FastAPI, which reads from MongoDB.

**Does that make the website faster?**

- **Yes, in the sense of “feels faster”:**  
  - Today: When user selects a city, the **first** time they see Analytics/AI Recs, they depend on the background run (N zones × APIs). That run can take 1–3+ minutes.  
  - With Kafka-first: Producers run on a **schedule** (e.g. every 1–5 min) and push to Kafka; consumer writes to MongoDB. So by the time the user opens the app (or a few minutes after city select), **data is already in MongoDB**. The website then just **reads** from MongoDB — no “wait for 60 API calls” on that request. So **perceived** speed improves: no long “processing…” tied to the user action.  
- **Caveat:** The **first** time after selecting a new city, you still need data. Options: (1) Run a one-off “backfill” (same APIs, but run once and write to Kafka/DB), or (2) Accept that the first 1–2 ingestion cycles (e.g. 2–10 min) may have sparse data until the pipeline fills.  
- **Summary:** Kafka as main path **decouples** “user action” from “API latency.” Data is **pre-populated** by a continuous pipeline. That’s why it can make the site feel faster and is worth doing in the phases.

---

## 5. Pre-trained Models Only (No Retraining)

**Current:**

- **City Live pipeline (DataProcessor):** No TFT/LSTM/GNN at all. Only heuristics (avg × temp, z-score, rules). So **no retraining** there.
- **Model pages (e.g. LSTM):** Load saved model from disk → read data → **inference only**. Scaler is `fit_transform` on the **current** batch each time (cheap, not “training” the LSTM). So we’re already **pre-trained + inference only** on those routes.

**What we can do to “keep pre-trained and just give outputs” and speed up:**

1. **Cache loaded models** in the backend (e.g. load LSTM/TFT once per process, reuse). Avoids “load from disk every request” on model pages.
2. **Pre-compute and store** model outputs: e.g. in the City Live pipeline (or a separate job that runs on stored data), run TFT/LSTM/GNN **inference** periodically and write results to MongoDB (e.g. `model_outputs`). Model pages then just **read** from MongoDB — no inference on page load. That makes model pages very fast.
3. **Ensure no accidental retraining:** Any route that does `model.fit()` or retrains should be removed from the hot path or run only in an offline “training” job. Today we’re already inference-only on the model routes; we just need to keep it that way and add caching/pre-compute.

So: **Yes, we can and should keep pre-trained models and only run inference;** we can also add caching and pre-computed results so the website is faster.

---

## 6. Outsourcing Models (Run Online, Pass Data, Get Results)

**Idea:** Run TFT/LSTM/GNN on another platform (e.g. AWS Lambda, Cloud Run, or a small inference API). Backend sends features (or minimal payload), gets back predictions, then continues processing / stores and serves to frontend.

**Pros:**

- Offloads CPU/memory from the main backend.
- Can use GPU or larger instances only for inference.
- Main app stays lighter and more stable.

**Cons:**

- Extra latency (network round-trip).
- Cost (compute on the other platform).
- More moving parts (deploy and maintain the inference service).

**When it’s worth it:** When inference on the main backend is clearly the bottleneck (e.g. model load + predict takes 2–5s per request and blocks other work). Right now the **bigger** bottleneck is City Live **API volume**, not model inference. So a sensible order is:

1. **First:** Kafka-first ingestion + pre-compute inference and store in MongoDB (so model pages just read).  
2. **Then:** If inference is still slow or heavy (e.g. many zones × TFT), consider moving inference to a dedicated service (same “pre-trained only,” just running elsewhere).

We can **add “optional: outsource model inference”** as a later phase so it’s in the plan but not blocking.

---

## 7. Flow Comparison (One Picture)

**Current (City Live):**

```
User selects city
    → Backend starts background processor (every 5 min)
    → Each run: for each zone: [Weather API, AQI API, Traffic API] → heuristics → DB
    → Frontend reads from MongoDB (processed_zone_data, etc.)
Kafka: producer → topics → consumer → kafka_live_feed → Live Stream tab only.
```

**Proposed (Kafka as main provider):**

```
Producers (scheduled): [EIA, AQI, Traffic, Weather, 311] → Kafka topics
    → Consumer: validate, dedupe, map to zones → MongoDB (raw_*, then derived / processed_zone_data)
    → Processing job: read from MongoDB, run heuristics + optional ML inference → write model_outputs, etc.
Frontend: only FastAPI → read from MongoDB (processed_zone_data, model_outputs, etc.).
```

So: **APIs no longer called on “user action”; they’re called by producers on a schedule.** The website always reads from MongoDB. That’s how we “reroute API calling through Kafka” and make Kafka the **main** provider of data for the app (with the consumer + processing filling MongoDB).

---

## 8. Where This Fits in the Phases

We can fold performance explicitly into the phases:

- **Phase 1a – Performance (can be first):**
  - **Pre-trained only:** Confirm no retraining in any hot path; model routes = load once or cache + inference only.
  - **Faster model pages:** Cache loaded models in backend and/or pre-compute TFT/LSTM/GNN outputs into MongoDB; model pages read from DB.
  - **Optional:** Reduce perceived wait on city select (e.g. show “Data is loading…” and poll for first processed_zone_data instead of blocking).

- **Phase 1b – Kafka as main path (same as before):**
  - Producers: EIA, AQI, Traffic, Weather, 311 → Kafka.
  - Consumer → raw_* + derived/processed_zone_data.
  - Processing (and optional ML inference) reads from MongoDB, writes processed_zone_data / model_outputs.
  - Frontend only talks to FastAPI → MongoDB.  
  → Result: Data is pre-populated; website feels faster.

- **Later phase – Optional model outsourcing:**
  - Dedicated inference service: backend sends features, gets predictions, stores in MongoDB.  
  → Only if inference is still the bottleneck after 1a/1b.

This keeps “make the website faster” as a first-class goal (Phase 1a + 1b) and your ideas (Kafka as main provider, pre-trained only, optional outsourcing) clearly incorporated before we start building.

---

## 9. Short Answers to Your Questions

1. **Current scenario: APIs feed the website, processing is local, Kafka is just live stream?**  
   **Yes.** Main path = APIs → backend processing → MongoDB. Kafka = Live Stream tab only.

2. **Reroute APIs through Kafka so Kafka is the main provider — does that increase speed?**  
   **Yes, in practice.** Data is ingested continuously and stored; the site reads from DB so user requests don’t wait on many API calls. We can add this as Phase 1b.

3. **Models: are they saving output and retraining?**  
   **No.** City Live pipeline uses heuristics only. Model pages use **inference only** (pre-trained). Slowness = API volume + (on model pages) model load + inference.

4. **Keep pre-trained models and just give outputs?**  
   **Yes.** We’ll keep inference-only and add caching/pre-compute so model pages are fast (Phase 1a).

5. **Outsource models to an online platform?**  
   **Reasonable later.** First do Kafka + pre-compute; add “run models elsewhere” as an optional phase if inference is still the bottleneck.

6. **What takes the most time?**  
   **City Live:** N zones × 3 APIs (and DB/heuristics). **Model pages:** model load + inference (no retraining). We’ll document and phase as above so we don’t derail and can incorporate this into the same roadmap.
