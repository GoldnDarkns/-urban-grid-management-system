# Free NoSQL Database Alternatives for Multi-City Data

## Current Limitation
- **MongoDB Atlas Free Tier**: 512MB storage (insufficient for multi-city)

---

## 🆓 FREE NOSQL DATABASE OPTIONS

### 1. **MongoDB Atlas (Self-Service Upgrade)**
**Storage:** 512MB free → $9/month for 2GB (M2 cluster)
- **Pros:** Same codebase, easy migration, managed service
- **Cons:** Not truly "free" but very cheap
- **Best For:** Quick scaling without code changes

---

### 2. **Self-Hosted MongoDB** ⭐ RECOMMENDED
**Storage:** Unlimited (depends on your server)
**Cost:** $5-20/month for VPS with 20-100GB storage

**Providers:**
- **DigitalOcean Droplet**: $6/month (1GB RAM, 25GB SSD)
- **Linode**: $5/month (1GB RAM, 25GB SSD)
- **Vultr**: $6/month (1GB RAM, 25GB SSD)
- **Hetzner**: €4.15/month (2GB RAM, 20GB SSD) - Best value!

**Setup:**
```bash
# Install MongoDB on Ubuntu
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
```

**Pros:**
- ✅ Truly unlimited storage (limited by server)
- ✅ Full control
- ✅ No per-GB pricing
- ✅ Can scale vertically (upgrade server)
- ✅ Same MongoDB code (no code changes needed)

**Cons:**
- ❌ Need to manage backups yourself
- ❌ Need to handle updates
- ❌ Need to secure it yourself

**Best For:** Long-term cost savings, full control

---

### 3. **Firebase Firestore (Google)**
**Storage:** 1GB free, then $0.18/GB/month
**Reads:** 50K/day free, then $0.06 per 100K
**Writes:** 20K/day free, then $0.18 per 100K

**Pros:**
- ✅ Generous free tier (1GB)
- ✅ Real-time updates built-in
- ✅ Easy to use
- ✅ Good for time-series data

**Cons:**
- ❌ Different query language (not MongoDB)
- ❌ Requires code changes
- ❌ Can get expensive with high read/write volume
- ❌ Less flexible than MongoDB

**Best For:** Real-time apps, if you're willing to rewrite queries

---

### 4. **Supabase (PostgreSQL-based, but NoSQL-like)**
**Storage:** 500MB free, then $0.125/GB/month
**Database Size:** 500MB free tier

**Pros:**
- ✅ PostgreSQL with JSON support (NoSQL-like)
- ✅ Real-time subscriptions
- ✅ Good free tier
- ✅ Open source

**Cons:**
- ❌ Not pure NoSQL (PostgreSQL)
- ❌ Requires code changes
- ❌ Smaller free tier than some options

**Best For:** If you want SQL + NoSQL hybrid

---

### 5. **PlanetScale (MySQL with JSON)**
**Storage:** 5GB free tier
**Pros:** Large free tier
**Cons:** MySQL-based, not NoSQL

---

### 6. **CouchDB (Self-Hosted)**
**Storage:** Unlimited (depends on server)
**Cost:** Free (self-hosted)

**Pros:**
- ✅ Free and open source
- ✅ Good for document storage
- ✅ Built-in replication

**Cons:**
- ❌ Different query model (map-reduce)
- ❌ Requires significant code changes
- ❌ Less popular (smaller community)

**Best For:** If you want to learn a different NoSQL database

---

### 7. **RavenDB (Self-Hosted)**
**Storage:** Unlimited (community edition)
**Cost:** Free (community edition)

**Pros:**
- ✅ Free community edition
- ✅ Good for .NET (but works with Python)
- ✅ ACID transactions

**Cons:**
- ❌ Different query language
- ❌ Requires code changes
- ❌ Less popular than MongoDB

---

### 8. **Amazon DocumentDB (AWS)**
**Storage:** No free tier, starts at $200/month
**Pros:** MongoDB-compatible
**Cons:** Expensive, not free

---

### 9. **Azure Cosmos DB**
**Storage:** 5GB free tier (first 12 months)
**Request Units:** 400 RU/s free
**Pros:** Large free tier initially
**Cons:** Expensive after free tier, requires Azure account

---

### 10. **Redis (In-Memory, but can persist)**
**Storage:** Limited by RAM
**Cost:** Free (self-hosted)
**Pros:** Very fast, good for caching
**Cons:** Not ideal for large document storage, primarily in-memory

---

### 11. **AWS NoSQL Options** ⭐ AWS-SPECIFIC

#### A. **Amazon DocumentDB (MongoDB-Compatible)**
**Free Tier:** ❌ None (starts at $200/month)
**Storage:** $0.10/GB/month
**Instance:** $0.277/hour (~$200/month minimum)

**Pros:**
- ✅ MongoDB-compatible (minimal code changes)
- ✅ Managed service
- ✅ High availability built-in
- ✅ Automatic backups

**Cons:**
- ❌ Very expensive (starts at $200/month)
- ❌ No free tier
- ❌ Overkill for your use case

**Best For:** Enterprise production with high availability requirements

---

#### B. **Amazon DynamoDB** ⭐ AWS RECOMMENDED
**Free Tier:** ✅ 25GB storage + 25 RCU + 25 WCU (Always Free)
**Storage:** $0.25/GB/month after free tier
**Read/Write:** $1.25 per million reads, $1.25 per million writes

**Free Tier Details:**
- **25GB storage** (permanently free)
- **25 Read Capacity Units (RCU)** per month
- **25 Write Capacity Units (WCU)** per month
- **2.5M stream read requests** per month
- **Valid forever** (not just 12 months!)

**Pros:**
- ✅ Generous free tier (25GB!)
- ✅ Serverless (pay per use)
- ✅ Very fast (single-digit millisecond latency)
- ✅ Automatic scaling
- ✅ Built-in backup and restore
- ✅ No server management

**Cons:**
- ❌ Different data model (key-value + document)
- ❌ Different query language (not MongoDB queries)
- ❌ Requires significant code changes
- ❌ Can get expensive with high read/write volume
- ❌ Less flexible than MongoDB for complex queries

**Best For:** High-traffic applications, serverless architectures

**Cost Example (10 cities, 3.6M readings):**
- Storage: 1GB = $0.25/month (first 25GB free)
- Reads: ~100K/month = Free (within 25 RCU)
- Writes: ~50K/month = Free (within 25 WCU)
- **Total: ~$0.25/month** (if within free tier limits)

---

#### C. **Amazon Keyspaces (Cassandra-Compatible)**
**Free Tier:** ❌ None
**Storage:** $0.30/GB/month
**Read/Write:** Pay per request

**Pros:**
- ✅ Wide-column database
- ✅ Good for time-series data
- ✅ Managed service

**Cons:**
- ❌ No free tier
- ❌ Different data model
- ❌ Requires code changes
- ❌ More expensive than DynamoDB

**Best For:** Very large-scale time-series data

---

#### D. **Amazon Neptune (Graph Database)**
**Free Tier:** ❌ None
**Storage:** $0.10/GB/month
**Instance:** Starts at $0.25/hour (~$180/month)

**Pros:**
- ✅ Graph database (good for zone relationships)
- ✅ Gremlin/SPARQL query languages

**Cons:**
- ❌ No free tier
- ❌ Very expensive
- ❌ Overkill for your use case

**Best For:** Complex graph relationships (not your use case)

---

#### E. **MongoDB on AWS EC2 (Self-Hosted)**
**Free Tier:** ✅ 750 hours/month for 12 months (t2.micro)
**Storage:** EBS volumes: $0.10/GB/month
**After Free Tier:** t2.micro = ~$8/month

**Setup:**
- Launch EC2 instance (t2.micro free for 12 months)
- Install MongoDB yourself
- Attach EBS volume for storage

**Pros:**
- ✅ Free for 12 months (t2.micro)
- ✅ Same MongoDB (no code changes)
- ✅ Full control
- ✅ Can use larger instances when needed

**Cons:**
- ❌ Free tier only 12 months
- ❌ Need to manage MongoDB yourself
- ❌ t2.micro is small (1GB RAM, limited performance)

**Best For:** Testing, development, short-term projects

**Cost After Free Tier:**
- t2.micro: ~$8/month (1GB RAM)
- t3.small: ~$15/month (2GB RAM)
- EBS Storage: $0.10/GB/month (20GB = $2/month)
- **Total: ~$10-17/month** (after free tier)

---

#### F. **AWS Amplify DataStore (DynamoDB-based)**
**Free Tier:** ✅ 5GB storage + 1M requests/month
**Storage:** $0.25/GB/month after free tier

**Pros:**
- ✅ Free tier (5GB)
- ✅ Easy setup with Amplify
- ✅ Real-time sync

**Cons:**
- ❌ Requires Amplify framework
- ❌ Different data model
- ❌ Requires code changes

**Best For:** Mobile/web apps using Amplify

---

## ☁️ AWS-SPECIFIC SUMMARY

### Best AWS Options for Your Project:

#### 1. **DynamoDB** ⭐ BEST AWS OPTION
**Free Tier:** 25GB storage (permanently free!)
**Monthly Cost:** ~$0-5/month (if within free tier)
**Code Changes:** Major (different query language)

**Why Consider:**
- ✅ 25GB free storage (50x more than MongoDB Atlas free tier!)
- ✅ Serverless (no server management)
- ✅ Very fast
- ✅ Automatic scaling

**Why Skip:**
- ❌ Requires rewriting all MongoDB queries
- ❌ Different data model (key-value + document)
- ❌ Learning curve

**Verdict:** Great if you're willing to rewrite code, otherwise skip

---

#### 2. **MongoDB on EC2** ⭐ BEST FOR MONGODB
**Free Tier:** 12 months free (t2.micro)
**Monthly Cost:** $0 (first year), then ~$10-17/month
**Code Changes:** None (same MongoDB!)

**Setup:**
- Launch EC2 t2.micro (free for 12 months)
- Install MongoDB
- Attach EBS volume (20GB = $2/month)

**Why Consider:**
- ✅ Free for 12 months
- ✅ Same MongoDB (no code changes)
- ✅ Full control
- ✅ Can upgrade instance when needed

**Why Skip:**
- ❌ Free tier only 12 months
- ❌ Need to manage MongoDB yourself
- ❌ t2.micro is small (1GB RAM)

**Verdict:** Good for testing/development, but Hetzner is cheaper long-term

---

#### 3. **DocumentDB** ❌ TOO EXPENSIVE
**Free Tier:** None
**Monthly Cost:** $200+/month minimum
**Code Changes:** Minimal (MongoDB-compatible)

**Verdict:** Skip - way too expensive for your use case

---

### AWS Cost Comparison:

| AWS Option | Free Tier | Monthly Cost | Code Changes | Verdict |
|------------|-----------|--------------|--------------|---------|
| **DynamoDB** | 25GB forever | $0-5 | Major ❌ | Consider if willing to rewrite |
| **MongoDB on EC2** | 12 months | $0 (year 1), $10-17 (after) | None ✅ | Good for testing |
| **DocumentDB** | None | $200+ | Minimal ✅ | Too expensive ❌ |

---

## 🏆 TOP RECOMMENDATIONS

### For Your Use Case (Multi-City Time-Series Data):

#### Option 1: Self-Hosted MongoDB ⭐ BEST VALUE
**Why:**
- No code changes needed
- Unlimited storage (limited by server)
- $5-10/month for 25-50GB storage
- Full control

**Setup:**
1. Get VPS (Hetzner, DigitalOcean, Linode)
2. Install MongoDB
3. Update connection string in `.env`
4. Done!

**Cost:** $5-10/month for 25-50GB

---

#### Option 2: MongoDB Atlas M2 Cluster
**Why:**
- Easiest migration (just upgrade)
- Managed service (no maintenance)
- 2GB storage for $9/month

**Cost:** $9/month for 2GB (can scale up)

---

#### Option 3: Firebase Firestore
**Why:**
- 1GB free (double MongoDB free tier)
- Real-time updates built-in
- Good for time-series

**Cons:**
- Requires rewriting all queries
- Different data model
- Can get expensive with high usage

**Cost:** Free for 1GB, then $0.18/GB/month

---

## 💰 COST COMPARISON (10 Cities, ~3.6M Readings)

| Database | Setup Cost | Monthly Cost | Storage | Code Changes |
|----------|------------|--------------|---------|--------------|
| **Self-Hosted MongoDB** | $0 | $5-10 | 25-50GB | None ✅ |
| **MongoDB Atlas M2** | $0 | $9 | 2GB | None ✅ |
| **MongoDB Atlas M5** | $0 | $57 | 5GB | None ✅ |
| **Firebase Firestore** | $0 | ~$10-20 | 1GB free + pay | Major ❌ |
| **Supabase** | $0 | ~$5-10 | 500MB free + pay | Major ❌ |
| **Azure Cosmos** | $0 | Free (12mo) | 5GB free | Major ❌ |

---

## 🚀 RECOMMENDED APPROACH

### Phase 1: Self-Hosted MongoDB (Immediate)
1. Get Hetzner VPS (€4.15/month = ~$5/month)
   - 2GB RAM, 20GB SSD
   - Perfect for starting out
2. Install MongoDB
3. Update `.env` with new connection string
4. Migrate data (or start fresh)

**Total Cost:** $5/month for 20GB storage

### Phase 2: Scale Up (When Needed)
- Upgrade to larger VPS (4GB RAM, 50GB SSD = $10/month)
- Or add more VPS instances for sharding
- Or migrate to MongoDB Atlas if you want managed service

---

## 📋 SETUP GUIDE: Self-Hosted MongoDB

### Step 1: Get VPS
**Recommended:** Hetzner (best value)
- Go to: https://www.hetzner.com/cloud
- Create account
- Create Cloud Server:
  - Location: Choose closest to you
  - Image: Ubuntu 22.04
  - Type: CX11 (2GB RAM, 20GB SSD) - €4.15/month
  - SSH Key: Add your public key

### Step 2: Install MongoDB
```bash
# SSH into your server
ssh root@your-server-ip

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Configure firewall (allow MongoDB port)
sudo ufw allow 27017
```

### Step 3: Secure MongoDB
```bash
# Create admin user
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "your-secure-password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Enable authentication
sudo nano /etc/mongod.conf
# Add:
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

### Step 4: Update Your Code
```bash
# Update .env file
MONGO_URI=mongodb://admin:your-secure-password@your-server-ip:27017/?authSource=admin
MONGO_DB=urban_grid_ai
```

### Step 5: Setup Backups (Important!)
```bash
# Install mongodump
# Already included with MongoDB

# Create backup script
nano /root/backup-mongo.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/mongo-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://admin:password@localhost:27017/urban_grid_ai?authSource=admin" --out="$BACKUP_DIR/$DATE"
# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

```bash
chmod +x /root/backup-mongo.sh

# Add to crontab (daily backup at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup-mongo.sh
```

---

## 🔒 SECURITY BEST PRACTICES

1. **Change Default Port** (optional but recommended)
   ```bash
   # Edit /etc/mongod.conf
   net:
     port: 27017  # Change to something else
   ```

2. **Firewall Rules**
   ```bash
   # Only allow your application server IP
   sudo ufw allow from YOUR_APP_SERVER_IP to any port 27017
   ```

3. **Use Strong Passwords**
   - Generate random passwords
   - Don't use default credentials

4. **Enable SSL/TLS** (for production)
   ```bash
   # Generate certificates
   # Configure in mongod.conf
   ```

---

## 📊 STORAGE ESTIMATES

### Current Data (1 City):
- Meter readings: ~360K documents
- Climate readings: ~14K documents
- **Total:** ~374K documents ≈ 50-100MB

### Projected (10 Cities):
- Meter readings: ~3.6M documents
- Climate readings: ~140K documents
- **Total:** ~3.74M documents ≈ 500MB-1GB

### Projected (50 Cities):
- Meter readings: ~18M documents
- Climate readings: ~700K documents
- **Total:** ~18.7M documents ≈ 2.5-5GB

**Conclusion:** 20GB VPS can handle 50+ cities easily!

---

## 🎯 FINAL RECOMMENDATION

**For your multi-city project:**

1. **Start with Self-Hosted MongoDB on Hetzner**
   - €4.15/month (~$5/month)
   - 20GB storage (enough for 50+ cities)
   - No code changes needed
   - Full control

2. **When you outgrow it:**
   - Upgrade to larger VPS (50GB = $10/month)
   - Or migrate to MongoDB Atlas M5 ($57/month for managed service)

**Why Self-Hosted:**
- ✅ Cheapest option
- ✅ Unlimited storage (within server limits)
- ✅ No code changes
- ✅ Full control
- ✅ Can scale vertically easily

**Why NOT other NoSQL databases:**
- ❌ Require major code rewrites
- ❌ Different query languages
- ❌ Learning curve
- ❌ Less community support for your use case

---

## 🚀 QUICK START

**Option A: Self-Hosted (Recommended)**
1. Get Hetzner VPS: https://www.hetzner.com/cloud
2. Follow setup guide above
3. Update `.env` file
4. Done! ($5/month, 20GB storage)

**Option B: MongoDB Atlas Upgrade**
1. Go to MongoDB Atlas dashboard
2. Click "Upgrade" on your cluster
3. Select M2 ($9/month, 2GB)
4. Done! (No code changes)

**Which should you choose?**
- **Self-Hosted** if you want cheapest + most storage
- **Atlas M2** if you want managed service + no maintenance

I can help you set up either option!
