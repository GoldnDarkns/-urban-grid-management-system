# How to Run the Urban Grid Management System

**You don’t need to know Docker, Kafka, or Spark.** This guide explains the basics and gives you exact steps.

---

## 1. What you need on your computer

- **Docker Desktop**  
  Docker runs the whole app (website, backend, database, Kafka) in isolated “containers” so you don’t install Python, Node, MongoDB, or Kafka yourself.

  - **Install:** [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)  
  - **Windows:** Install “Docker Desktop”, then **start it** (you should see the whale icon in the system tray).  
  - **Optional:** Give Docker at least **4–6 GB RAM** in Docker Desktop → Settings → Resources (helps when Kafka + backend run).

- **A terminal**  
  - Windows: **PowerShell** or **Command Prompt**.  
  - Mac/Linux: **Terminal**.

---

## 2. What “build” and “rebuild” mean

- **Build** = Docker reads the `Dockerfile` and your code, installs dependencies (Python packages, Node, etc.), and creates an **image** (a snapshot of your app).  
- **Rebuild** = run build again, usually after you changed code or dependencies. Docker rebuilds only what changed when possible.

- **`docker-compose up --build`** = “Build images if needed, then start all services.”  
  - First time (or after big changes): can take **5–20 minutes** (installing TensorFlow, etc.).  
  - Later runs: often **30 seconds – 2 minutes** (uses cache).

---

## 3. What runs when you start the app (simple picture)

| Thing            | What it is (simple)                    | What it does here                                      |
|------------------|----------------------------------------|--------------------------------------------------------|
| **Docker**       | Tool that runs “containers”            | Runs everything below in one command.                  |
| **MongoDB**      | Database                               | Stores city data, Kafka stream, simulated data.        |
| **Neo4j**        | Graph database                         | Knowledge Graph for risk reasoning (zones, adjacency). |
| **Backend**      | Python API (FastAPI)                   | Serves data to the website, runs ML, talks to MongoDB & Neo4j. |
| **Frontend**     | React website                          | The UI you see at http://localhost.                    |
| **Kafka**        | Message bus                            | Receives live data (weather, AQI, traffic, etc.).      |
| **kafka-producer** | Small service that calls APIs       | Fetches live APIs every ~45 s and sends to Kafka.      |
| **kafka-consumer** | Small service that reads Kafka      | Reads from Kafka and writes to MongoDB.                |
| **Live Stream**  | A tab in the website                   | Shows that live data updating every ~45 s.             |

**Spark** is optional. We use **kafka-consumer** (Python) to write Kafka data to MongoDB. You can ignore Spark unless you want to experiment with it later.

**One-sentence flow:**  
APIs → **kafka-producer** → **Kafka** → **kafka-consumer** → **MongoDB** → **Backend** → **Frontend** (including the **Live Stream** tab).

---

## 4. Step-by-step: run the application

### Step 1: Open a terminal

- **Windows:** Open PowerShell or Command Prompt.  
- **Mac/Linux:** Open Terminal.

### Step 2: Go to the project folder

```powershell
cd "C:\Users\goldn\Downloads\Urban City Manager\-urban-grid-management-system"
```

*(Use your actual path if it’s different. On Mac/Linux, use the right path for your system.)*

### Step 3: Create `.env` (first time only)

```powershell
copy .env.example .env
```

*(On Mac/Linux use: `cp .env.example .env`.)*

- You can leave `.env` as is for City Live mode (local MongoDB in Docker).  
- **Simulated mode:** For the Simulated part of the website to work, set **MongoDB Atlas** in `.env`: `SIM_MONGO_URI` and `SIM_MONGO_DB` to your Atlas connection string and database name (e.g. copy from `MONGO_URI` / `MONGO_DB`). Without this, Simulated mode will show "MongoDB disconnected" until you add these and restart the backend.
- **Voice (Phase 4):** For Scenario Console voice (talk to agent, agent speaks reply), set `DEEPGRAM_API_KEY` in `.env` to your Deepgram API key (get one at https://console.deepgram.com). If unset, only Text mode is available.

### Step 4: Start Docker Desktop

- Make sure **Docker Desktop** is running (whale icon in tray).  
- Wait until it says “Docker Desktop is running.”

### Step 5: Build and start everything (including Neo4j)

**One command starts everything:** backend, frontend, MongoDB, **Neo4j**, Kafka, producer, consumer. You don’t start Neo4j separately.

Run **one** of these:

**Option A – Foreground (see logs in the terminal):**

```powershell
docker-compose up --build
```

- **First run:** Can take **5–20 minutes** (downloads images, installs deps).  
- **Later runs:** Usually **30 s – 2 min**.  
- Logs from backend, Kafka, producer, consumer, etc. will scroll in the terminal.  
- To stop: press **Ctrl+C** in that terminal.

**Option B – Background (terminal free for other commands):**

```powershell
docker-compose up -d --build
```

- `-d` = “detached” (run in background).  
- To stop later: `docker-compose down`.

---

## 5. Open the app

1. **Website:** [http://localhost](http://localhost)  
2. **Backend API:** [http://localhost:8000](http://localhost:8000)  
3. **Neo4j Browser (Knowledge Graph):** [http://localhost:7474](http://localhost:7474) — login: `neo4j` / `urban-grid-kg`  
4. Use the **navbar** to switch **City Live** / **Simulated**, pick a city, open **Live Stream**, **Data**, **Analytics**, **Advanced Analytics → Knowledge Graph**, etc.

---

## 6. Is it working?

- **Frontend:** You see the Urban Grid UI at http://localhost.  
- **Backend:** Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health) → `"status": "healthy"`.  
- **City Live:** Select a city (e.g. Phoenix) → “Processing…” popup → after a few minutes, Data / Analytics show numbers.  
- **Live Stream:** Nav → **Live Stream**. After ~1–2 minutes you should see AQI, Traffic, etc. updating every ~45 s.  
- **Neo4j:** [http://localhost:7474](http://localhost:7474) should load (login: `neo4j` / `urban-grid-kg`). In the app: **Advanced Analytics** → **Knowledge Graph** tab should say “Neo4j Knowledge Graph ready.”  
- **Kafka / producer / consumer:** In Docker Desktop → **Containers** → your project. You should see `backend`, `frontend`, `mongodb`, `neo4j`, `kafka`, `kafka-producer`, `kafka-consumer`.  
  - **Logs:**  
    - `docker-compose logs kafka-producer` → look for `[KafkaProducer] cycle N OK`.  
    - `docker-compose logs kafka-consumer` → look for `[KafkaConsumer] wrote N docs`.

---

## 7. When to “rebuild”

**6b. After code changes (TFT, Neo4j, new UI):** If you pulled new code or made frontend changes (e.g. TFT tab, Knowledge Graph tab), the running app won’t show them until you **rebuild the frontend**. Run: `docker-compose up -d --build frontend` (wait for build to finish), then **hard-refresh** the page (Ctrl+Shift+R). You should then see **TFT**, **LSTM (comparison)**, **Knowledge Graph** in Advanced Analytics.

**Rebuild** (use `docker-compose up --build` again) when:

- You pulled new code that changes `Dockerfile`, `requirements.txt`, or frontend dependencies.  
- You added or changed Python/Node packages.  
- Something broke and you want a clean build.

**No need to rebuild** when:

- You only changed frontend code (e.g. React components) and you’re **not** using Docker for frontend dev.  
- You only changed backend code but haven’t changed dependencies—*often* a restart is enough:  
  - `docker-compose restart backend`

---

## 8. Useful commands (summary)

| What you want          | Command                                  |
|------------------------|------------------------------------------|
| **Start (build if needed)** | `docker-compose up --build`         |
| **Start in background**     | `docker-compose up -d --build`      |
| **Stop everything**         | `docker-compose down`               |
| **See what’s running**      | `docker-compose ps`                 |
| **Backend logs**            | `docker-compose logs -f backend`    |
| **Kafka producer logs**     | `docker-compose logs -f kafka-producer` |
| **Kafka consumer logs**     | `docker-compose logs -f kafka-consumer` |

**Windows PowerShell:** If you see “`&&` is not a valid statement separator”, use `;` instead of `&&` between commands, or run the commands one by one.

---

## 9. Simulated mode shows zeros / “MongoDB disconnected”?

- **Simulated** mode uses **MongoDB Atlas** (or the same MongoDB container, but it starts **empty**).  
- **Option A:** Use Atlas for Sim: set `SIM_MONGO_URI` in `.env` to your Atlas connection string.  
- **Option B:** Seed the local DB:

  ```powershell
  docker-compose run --rm backend python -m src.db.seed_core --reset
  docker-compose run --rm backend python -m src.db.seed_timeseries --days 7
  ```

  Then restart:

  ```powershell
  docker-compose down
  docker-compose up -d --build
  ```

  Reload the app and check Simulated mode again.

---

## 10. 502 Bad Gateway or “Could not load model overview”

If the browser shows **502 (Bad Gateway)** for `/api/models/overview`, `/api/city/current`, `/api/analytics/...`, etc., the **frontend (Nginx) is proxying to the backend but the backend is not responding**. Common causes: backend not ready yet, backend crashed, or backend overloaded.

1. **Wait a minute after starting:** After `docker-compose up`, the backend may take 30–60 seconds to become ready (startup + healthcheck). The frontend is configured to wait for the backend to be healthy before starting.
2. **Check backend status:**  
   `docker-compose ps` → backend should be **Up** and **(healthy)**.
3. **Check backend logs:**  
   `docker-compose logs backend --tail 80`  
   Look for Python tracebacks or “Address already in use”.
4. **Restart backend:**  
   `docker-compose restart backend`  
   Wait ~30 s, then hard-refresh the app (Ctrl+Shift+R).
5. **Full restart:**  
   `docker-compose down` then `docker-compose up -d --build`  
   Then wait 1–2 minutes before opening http://localhost.

---

## 11. ERR_CONNECTION_RESET or API calls failing

If the browser shows **Failed to load resource: net::ERR_CONNECTION_RESET** for `/api/city/current`, `/api/city/processing-summary`, `/api/ai/recommendations`, etc., the **backend is closing the connection** (crash, timeout, or restart).

1. **Check backend is running:**  
   `docker-compose ps` → backend should be **Up**, not **Restarting**.
2. **Check backend logs:**  
   `docker-compose logs backend --tail 80`  
   Look for Python tracebacks, MongoDB errors, or "Address already in use". Fix any crash (e.g. syntax error, missing env).
3. **Restart backend:**  
   `docker-compose restart backend`  
   Wait ~10 s, then refresh the app.
4. **If backend keeps restarting:**  
   Rebuild: `docker-compose up -d --build backend` and check logs again. Ensure MongoDB and Neo4j are up (`docker-compose up -d mongodb neo4j`).

Once the backend stays **Up** and responds to [http://localhost:8000/api/health](http://localhost:8000/api/health), the frontend errors should stop.

---

## 12. Quick reference: what runs where

- **App (UI):** http://localhost  
- **API:** http://localhost:8000  
- **MongoDB:** localhost:27017 (local; Sim can use Atlas via `.env`)  
- **Neo4j Browser:** http://localhost:7474  
- **Kafka:** localhost:9092 (used by producer/consumer; you don’t open it in a browser)

---

**TL;DR:**  
1. Install & start **Docker Desktop**.  
2. `cd` into the project folder.  
3. `copy .env.example .env` (first time).  
4. Run **`docker-compose up --build`** (or `docker-compose up -d --build` for background).  
5. Open **http://localhost** and use the app.
