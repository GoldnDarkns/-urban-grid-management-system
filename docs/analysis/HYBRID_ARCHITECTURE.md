# Hybrid Architecture: EC2 MongoDB + Local GPU Processing

## 🎯 Your Proposed Architecture

**Cloud (AWS EC2):**
- MongoDB database (data storage)
- Small instance (t2.micro or t3.small)
- Just for data storage and API queries

**Local (Your Machine):**
- GPU for ML model training
- More RAM for data processing
- Faster processing power
- Model inference

---

## ✅ BENEFITS OF THIS APPROACH

### 1. **Cost Savings** 💰
- **EC2 t2.micro**: Free for 12 months, then ~$8/month
- **EBS Storage**: $0.10/GB/month (20GB = $2/month)
- **Total**: ~$10/month (after free tier)
- **vs. GPU instance on AWS**: $0.50-2/hour = $360-1440/month! 💸

### 2. **Performance** ⚡
- Your local GPU is likely faster than cloud GPU instances
- No network latency for ML processing
- Full control over hardware

### 3. **Flexibility** 🔧
- Train models when you want (no hourly charges)
- Use your GPU for other projects too
- No cloud GPU instance management

### 4. **Data Storage** 📦
- Cloud database = accessible from anywhere
- Automatic backups
- Can scale storage independently

---

## 🏗️ ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR LOCAL MACHINE                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ML Training/Inference (GPU)                    │  │
│  │  - TensorFlow/PyTorch                            │  │
│  │  - LSTM, Autoencoder, GNN models                 │  │
│  │  - Model training                                 │  │
│  │  - Batch predictions                             │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          │ API Calls                    │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  FastAPI Backend (Local)                         │  │
│  │  - Data fetching from EC2                        │  │
│  │  - Model inference                                │  │
│  │  - Results storage                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS (MongoDB Connection)
                          │
┌─────────────────────────────────────────────────────────┐
│                    AWS EC2 INSTANCE                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  MongoDB Database                               │  │
│  │  - Time-series data (meter_readings)            │  │
│  │  - Climate data (air_climate_readings)          │  │
│  │  - Zones, households, alerts                    │  │
│  │  - Indexed for fast queries                      │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  EBS Volume (20-50GB)                           │  │
│  │  - Database storage                             │  │
│  │  - Automatic backups                            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 COST BREAKDOWN

### AWS EC2 Costs:

**Year 1 (Free Tier):**
- EC2 t2.micro: **$0** (750 hours/month free)
- EBS Storage (20GB): **$2/month**
- Data Transfer: **$0** (first 100GB free)
- **Total: $2/month** ✅

**After Year 1:**
- EC2 t2.micro: **$8.50/month**
- EBS Storage (20GB): **$2/month**
- Data Transfer: **$0-5/month** (depends on usage)
- **Total: ~$10-15/month** ✅

**vs. GPU Instance on AWS:**
- g4dn.xlarge: **$0.526/hour = $378/month** 💸
- g5.xlarge: **$1.008/hour = $726/month** 💸

**Savings: $360-720/month by using local GPU!** 🎉

---

## 🚀 SETUP GUIDE

### Step 1: Setup MongoDB on EC2

#### 1.1 Launch EC2 Instance
```bash
# Go to AWS Console → EC2 → Launch Instance
# Choose:
- Instance Type: t2.micro (free tier eligible)
- AMI: Ubuntu 22.04 LTS
- Storage: 8GB (default) + Add 20GB EBS volume
- Security Group: Allow port 27017 from your IP only
- Key Pair: Create/download .pem file
```

#### 1.2 Connect to EC2
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update
sudo apt upgrade -y
```

#### 1.3 Install MongoDB
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 1.4 Secure MongoDB
```bash
# Create admin user
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "your-secure-password-here",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Create database user
use urban_grid_ai
db.createUser({
  user: "grid_user",
  pwd: "your-db-password-here",
  roles: [ { role: "readWrite", db: "urban_grid_ai" } ]
})

# Enable authentication
sudo nano /etc/mongod.conf
# Add:
security:
  authorization: enabled

net:
  bindIp: 0.0.0.0  # Allow external connections

# Restart MongoDB
sudo systemctl restart mongod
```

#### 1.5 Configure Security Group
```bash
# In AWS Console → EC2 → Security Groups
# Add Inbound Rule:
- Type: Custom TCP
- Port: 27017
- Source: Your IP address (for security)
# Or use: 0.0.0.0/0 (less secure, but easier for testing)
```

---

### Step 2: Update Local Code

#### 2.1 Update `.env` File
```bash
# .env file
MONGO_URI=mongodb://grid_user:your-db-password-here@your-ec2-ip:27017/urban_grid_ai?authSource=urban_grid_ai
MONGO_DB=urban_grid_ai
```

#### 2.2 Test Connection
```python
# test_connection.py
from src.db.mongo_client import get_db, ping

if ping():
    print("✅ Connected to EC2 MongoDB!")
    db = get_db()
    print(f"Database: {db.name}")
    print(f"Collections: {db.list_collection_names()}")
else:
    print("❌ Connection failed")
```

---

### Step 3: Data Migration (If Needed)

#### 3.1 Export from Current MongoDB
```bash
# If you have existing data
mongodump --uri="mongodb://localhost:27017/urban_grid_ai" --out=./backup
```

#### 3.2 Import to EC2 MongoDB
```bash
# Import to EC2
mongorestore --uri="mongodb://grid_user:password@ec2-ip:27017/urban_grid_ai?authSource=urban_grid_ai" ./backup/urban_grid_ai
```

---

### Step 4: Local ML Processing Setup

#### 4.1 Keep Models Local
```python
# src/models/lstm_demand_forecast.py
# Models stay on local machine
# Only fetch data from EC2 when needed

from src.db.mongo_client import get_db
import tensorflow as tf

def train_lstm_model():
    # Fetch training data from EC2
    db = get_db()
    data = list(db.meter_readings.find().limit(100000))
    
    # Process locally with GPU
    with tf.device('/GPU:0'):  # Use your local GPU
        # Training code here
        model = create_lstm_model()
        model.fit(...)
    
    # Save model locally
    model.save('src/models/lstm_model.h5')
    
    # Optionally: Store model metadata in EC2
    db.model_metadata.insert_one({
        "model_name": "lstm_demand_forecast",
        "version": "1.0",
        "trained_at": datetime.now(),
        "accuracy": 0.64
    })
```

#### 4.2 Inference Pipeline
```python
# backend/routes/models.py
from src.models.lstm_demand_forecast import load_model, predict

@router.get("/lstm/prediction")
async def get_lstm_prediction():
    # Fetch recent data from EC2
    db = get_db()
    recent_data = list(db.meter_readings.find().sort("ts", -1).limit(24))
    
    # Process locally with GPU
    model = load_model()  # Load from local disk
    prediction = model.predict(recent_data)  # Uses local GPU
    
    # Return prediction
    return {"prediction": prediction}
```

---

## ⚡ PERFORMANCE CONSIDERATIONS

### Data Transfer Speed

**Typical Speeds:**
- Local MongoDB: ~1000 MB/s (local disk)
- EC2 MongoDB: ~10-100 MB/s (depending on connection)

**Impact:**
- ✅ Small queries (< 1MB): Negligible difference
- ⚠️ Large queries (> 100MB): May take 1-10 seconds
- ❌ Very large queries (> 1GB): May take 10-60 seconds

**Optimization:**
- Use aggregation pipelines (process on EC2, return results)
- Fetch only needed fields (projection)
- Use indexes for fast queries
- Cache frequently accessed data locally

---

### Network Latency

**Typical Latency:**
- Local MongoDB: < 1ms
- EC2 MongoDB: 10-100ms (depending on distance)

**Impact:**
- ✅ Single queries: Acceptable (10-100ms)
- ⚠️ Many small queries: May add up
- ❌ Real-time dashboards: May feel slower

**Optimization:**
- Batch queries when possible
- Use connection pooling
- Cache results locally
- Consider Redis cache for frequently accessed data

---

## 🔒 SECURITY BEST PRACTICES

### 1. **Restrict Access**
```bash
# Security Group: Only allow your IP
# In AWS Console → Security Groups → Inbound Rules
# Source: Your IP address (not 0.0.0.0/0)
```

### 2. **Use Strong Passwords**
```bash
# Generate random password
openssl rand -base64 32
```

### 3. **Enable SSL/TLS** (Optional but Recommended)
```bash
# Generate certificates
# Configure MongoDB with SSL
# Update connection string with SSL options
```

### 4. **Regular Backups**
```bash
# Setup automated backups
# Use AWS EBS snapshots or mongodump
```

---

## 📊 DATA FLOW EXAMPLES

### Example 1: Training LSTM Model

```python
# 1. Fetch training data from EC2 (one-time, large transfer)
db = get_db()
training_data = list(db.meter_readings.find({
    "ts": {"$gte": start_date, "$lte": end_date}
}).limit(1000000))  # ~100MB transfer

# 2. Process locally with GPU (fast, no network)
with tf.device('/GPU:0'):
    model = train_lstm(training_data)  # Uses local GPU

# 3. Save model locally
model.save('models/lstm.h5')

# 4. Store metadata in EC2 (small transfer)
db.model_metadata.insert_one({
    "model": "lstm",
    "trained_at": datetime.now(),
    "accuracy": 0.64
})
```

**Time:**
- Data fetch: 5-10 seconds
- Training: 10-30 minutes (local GPU)
- Metadata save: < 1 second
- **Total: ~15-30 minutes** (vs. hours on CPU)

---

### Example 2: Real-time Prediction

```python
# 1. Fetch recent data from EC2 (small, fast)
db = get_db()
recent = list(db.meter_readings.find().sort("ts", -1).limit(24)  # ~1KB

# 2. Predict locally with GPU (fast)
model = load_model('models/lstm.h5')
prediction = model.predict(recent)  # < 1 second on GPU

# 3. Return to frontend
return {"prediction": prediction}
```

**Time:**
- Data fetch: 50-100ms
- Prediction: < 1 second (local GPU)
- **Total: ~1 second** (acceptable for real-time)

---

### Example 3: Batch Analytics

```python
# 1. Use MongoDB aggregation (process on EC2)
db = get_db()
results = list(db.meter_readings.aggregate([
    {"$match": {"zone_id": "Z_001"}},
    {"$group": {
        "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
        "total_kwh": {"$sum": "$kwh"}
    }},
    {"$sort": {"_id": 1}}
]))  # Processing happens on EC2, only results transferred

# 2. Process results locally if needed
# (e.g., for ML analysis)
```

**Time:**
- Aggregation on EC2: 1-5 seconds
- Data transfer: < 1 second (small results)
- **Total: ~2-6 seconds** (efficient!)

---

## 🎯 OPTIMIZATION STRATEGIES

### 1. **Use Aggregation Pipelines**
```python
# ✅ GOOD: Process on EC2, return results
results = db.meter_readings.aggregate([
    {"$match": {...}},
    {"$group": {...}},
    {"$sort": {...}}
])

# ❌ BAD: Fetch all data, process locally
all_data = list(db.meter_readings.find())  # Slow!
results = process_locally(all_data)
```

### 2. **Cache Frequently Accessed Data**
```python
# Use Redis or local cache for hot data
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_zone_info(zone_id):
    return db.zones.find_one({"_id": zone_id})
```

### 3. **Batch Operations**
```python
# ✅ GOOD: Batch insert
db.meter_readings.insert_many(readings)  # One network call

# ❌ BAD: Individual inserts
for reading in readings:
    db.meter_readings.insert_one(reading)  # Many network calls
```

### 4. **Use Projections**
```python
# ✅ GOOD: Fetch only needed fields
data = list(db.meter_readings.find(
    {},
    {"kwh": 1, "ts": 1}  # Only fetch these fields
))

# ❌ BAD: Fetch all fields
data = list(db.meter_readings.find())  # Fetches everything
```

---

## 🚨 POTENTIAL ISSUES & SOLUTIONS

### Issue 1: Network Latency
**Problem:** Queries feel slow compared to local MongoDB

**Solutions:**
- Use connection pooling (already in your code)
- Cache frequently accessed data
- Use aggregation pipelines (process on EC2)
- Consider Redis cache for hot data

---

### Issue 2: Data Transfer Costs
**Problem:** AWS charges for data transfer out (after free tier)

**Solutions:**
- First 100GB/month is free
- Use compression for large transfers
- Process data on EC2 when possible (aggregation)
- Cache results locally

**Cost:** $0.09/GB after first 100GB (usually not an issue)

---

### Issue 3: EC2 Instance Limits
**Problem:** t2.micro has limited CPU/RAM

**Solutions:**
- t2.micro is fine for MongoDB (not CPU-intensive)
- If needed, upgrade to t3.small ($15/month)
- Use EBS for storage (not instance storage)

---

### Issue 4: Connection Stability
**Problem:** Internet connection drops, MongoDB connection fails

**Solutions:**
- Your code already handles this (`safe_get_db()`)
- Add retry logic
- Use connection pooling with auto-reconnect

---

## 📋 CHECKLIST

### Setup Checklist:
- [ ] Launch EC2 t2.micro instance
- [ ] Install MongoDB on EC2
- [ ] Configure security group (port 27017)
- [ ] Create MongoDB users
- [ ] Update `.env` with EC2 connection string
- [ ] Test connection from local machine
- [ ] Migrate existing data (if any)
- [ ] Setup automated backups
- [ ] Test ML training with local GPU
- [ ] Test real-time predictions

---

## 💡 RECOMMENDED CONFIGURATION

### EC2 Instance:
- **Type:** t2.micro (free tier) or t3.small ($15/month)
- **Storage:** 20GB EBS volume ($2/month)
- **Security:** Only allow your IP on port 27017

### Local Machine:
- **GPU:** Use for ML training/inference
- **RAM:** Use for data processing
- **Cache:** Consider Redis for frequently accessed data

### Connection:
- **MongoDB URI:** `mongodb://user:pass@ec2-ip:27017/db`
- **Connection Pooling:** Enabled (already in your code)
- **Timeout:** 30 seconds (already configured)

---

## 🎯 FINAL RECOMMENDATION

**This hybrid approach is EXCELLENT for your use case!**

**Why:**
- ✅ Cost-effective ($2-10/month vs. $360+/month for GPU instance)
- ✅ Leverages your local GPU power
- ✅ Cloud database accessible from anywhere
- ✅ No code changes needed (same MongoDB)
- ✅ Scalable (can upgrade EC2 when needed)

**When to Consider Alternatives:**
- If you need 24/7 GPU processing → Consider AWS GPU instances
- If you need sub-millisecond latency → Consider local MongoDB
- If you have very high data transfer → Consider local MongoDB

**For now, this is the perfect setup!** 🚀
