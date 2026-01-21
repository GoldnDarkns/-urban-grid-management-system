# Cost Breakdown: EC2 MongoDB + Local GPU Processing

## 💰 MONTHLY COST BREAKDOWN

### Year 1 (AWS Free Tier) - BEST CASE

| Component | Cost | Details |
|-----------|------|---------|
| **EC2 t2.micro Instance** | **$0** | 750 hours/month free (enough for 24/7) |
| **EBS Storage (20GB)** | **$2.00** | $0.10/GB/month × 20GB |
| **Data Transfer (In)** | **$0** | First 100GB/month free |
| **Data Transfer (Out)** | **$0** | First 100GB/month free |
| **Elastic IP** | **$0** | Free if attached to running instance |
| **Total Monthly** | **$2.00/month** | ✅ |

**Annual Cost Year 1: $24/year**

---

### After Year 1 (No Free Tier) - WORST CASE

| Component | Cost | Details |
|-----------|------|---------|
| **EC2 t2.micro Instance** | **$8.50** | On-demand pricing (1 vCPU, 1GB RAM) |
| **EBS Storage (20GB)** | **$2.00** | $0.10/GB/month × 20GB |
| **Data Transfer (In)** | **$0** | Free (data coming into AWS) |
| **Data Transfer (Out)** | **$0-5** | First 100GB free, then $0.09/GB |
| **Elastic IP** | **$0** | Free if attached to running instance |
| **Total Monthly** | **$10.50-15.50/month** | ✅ |

**Annual Cost After Year 1: $126-186/year**

---

## 📊 DETAILED COST ANALYSIS

### EC2 Instance Costs

#### Option 1: t2.micro (Recommended for Starting)
- **Free Tier:** 750 hours/month for 12 months
- **After Free Tier:** $0.0104/hour = **$7.49/month** (if running 24/7)
- **RAM:** 1GB (enough for MongoDB)
- **vCPU:** 1 (shared, burstable)
- **Best For:** Development, testing, small datasets

#### Option 2: t3.small (If You Need More Power)
- **Free Tier:** None
- **Cost:** $0.0208/hour = **$15.00/month** (if running 24/7)
- **RAM:** 2GB (better for MongoDB)
- **vCPU:** 2 (shared, burstable)
- **Best For:** Production, larger datasets

#### Option 3: t3.medium (If You Really Need Power)
- **Free Tier:** None
- **Cost:** $0.0416/hour = **$30.00/month** (if running 24/7)
- **RAM:** 4GB (plenty for MongoDB)
- **vCPU:** 2 (shared, burstable)
- **Best For:** High-traffic production

---

### EBS Storage Costs

| Storage Size | Monthly Cost | Best For |
|--------------|--------------|----------|
| **10GB** | **$1.00** | Testing, single city |
| **20GB** | **$2.00** | ⭐ Recommended: 10-50 cities |
| **50GB** | **$5.00** | 50-100 cities |
| **100GB** | **$10.00** | 100+ cities |

**Storage Pricing:** $0.10/GB/month (same across all regions)

---

### Data Transfer Costs

#### Inbound (Data Coming INTO AWS)
- **Cost:** **FREE** (always free)
- **Your Use Case:** Data ingestion, backups
- **Impact:** $0

#### Outbound (Data Going OUT of AWS)
- **First 100GB/month:** **FREE**
- **After 100GB:** $0.09/GB

**Typical Usage:**
- ML training data fetch: ~1-10GB/month
- API queries: ~1-5GB/month
- **Total: ~2-15GB/month** (well within free tier)

**Cost:** **$0/month** (unless you transfer > 100GB)

---

### Other Potential Costs

#### Elastic IP (Static IP Address)
- **Cost:** **FREE** if attached to running instance
- **Cost if not attached:** $0.005/hour = $3.60/month
- **Recommendation:** Always attach to instance = **$0**

#### CloudWatch Monitoring
- **Basic Monitoring:** **FREE** (5-minute intervals)
- **Detailed Monitoring:** $0.015/instance/hour = $10.80/month
- **Recommendation:** Use basic monitoring = **$0**

#### Backup Snapshots
- **Cost:** $0.05/GB/month (same as EBS storage)
- **Example:** 20GB snapshot = $1.00/month
- **Recommendation:** Optional, but recommended

---

## 💵 TOTAL COST SCENARIOS

### Scenario 1: Minimal Setup (Year 1)
```
EC2 t2.micro:        $0.00  (free tier)
EBS 20GB:            $2.00
Data Transfer:       $0.00  (within free tier)
Elastic IP:          $0.00  (attached)
───────────────────────────
TOTAL:               $2.00/month
ANNUAL:              $24.00/year
```

### Scenario 2: Minimal Setup (After Year 1)
```
EC2 t2.micro:        $8.50
EBS 20GB:            $2.00
Data Transfer:       $0.00  (within free tier)
Elastic IP:          $0.00  (attached)
───────────────────────────
TOTAL:               $10.50/month
ANNUAL:              $126.00/year
```

### Scenario 3: Production Setup (After Year 1)
```
EC2 t3.small:        $15.00
EBS 50GB:            $5.00
Data Transfer:       $0.00  (within free tier)
Elastic IP:          $0.00  (attached)
Backup Snapshots:    $2.50  (50GB monthly)
───────────────────────────
TOTAL:               $22.50/month
ANNUAL:              $270.00/year
```

### Scenario 4: High-Traffic Production
```
EC2 t3.medium:       $30.00
EBS 100GB:           $10.00
Data Transfer:       $5.00  (if > 100GB/month)
Elastic IP:          $0.00  (attached)
Backup Snapshots:    $5.00  (100GB monthly)
───────────────────────────
TOTAL:               $50.00/month
ANNUAL:              $600.00/year
```

---

## 🆚 COST COMPARISON WITH ALTERNATIVES

### Your Approach: EC2 + Local GPU
| Period | Monthly Cost | Annual Cost |
|--------|--------------|-------------|
| **Year 1** | **$2.00** | **$24.00** |
| **After Year 1** | **$10.50** | **$126.00** |

### Alternative 1: MongoDB Atlas M2
| Period | Monthly Cost | Annual Cost |
|--------|--------------|-------------|
| **Always** | **$9.00** | **$108.00** |

### Alternative 2: Self-Hosted MongoDB (Hetzner)
| Period | Monthly Cost | Annual Cost |
|--------|--------------|-------------|
| **Always** | **$5.00** | **$60.00** |

### Alternative 3: AWS GPU Instance (g4dn.xlarge)
| Period | Monthly Cost | Annual Cost |
|--------|--------------|-------------|
| **Always** | **$378.00** | **$4,536.00** |

### Alternative 4: DynamoDB (AWS)
| Period | Monthly Cost | Annual Cost |
|--------|--------------|-------------|
| **Year 1** | **$0-5.00** | **$0-60.00** |
| **After Year 1** | **$5-20.00** | **$60-240.00** |

---

## 💡 COST OPTIMIZATION TIPS

### 1. **Use Reserved Instances** (After Year 1)
- **Savings:** 30-50% off on-demand pricing
- **t2.micro Reserved (1 year):** $4.50/month (vs. $8.50 on-demand)
- **Savings:** $4/month = $48/year

### 2. **Stop Instance When Not Needed**
- **Cost:** $0 when stopped (only pay for EBS storage)
- **Use Case:** Development, testing
- **Savings:** Can reduce costs by 50-80% if not running 24/7

### 3. **Use Spot Instances** (Advanced)
- **Savings:** 70-90% off on-demand
- **Risk:** Can be terminated with 2-minute notice
- **Best For:** Non-critical workloads, batch processing

### 4. **Optimize Storage**
- Delete old/unused data
- Use compression
- Archive old data to S3 (cheaper: $0.023/GB/month)

### 5. **Monitor Data Transfer**
- Keep transfers under 100GB/month (free tier)
- Use compression for large transfers
- Cache data locally when possible

---

## 📈 COST PROJECTION BY USAGE

### Light Usage (1-5 cities, < 1M readings)
```
Year 1:  $2.00/month   = $24/year
Year 2+: $10.50/month  = $126/year
```

### Medium Usage (10-20 cities, 3-5M readings)
```
Year 1:  $2.00/month   = $24/year
Year 2+: $15.00/month  = $180/year (t3.small recommended)
```

### Heavy Usage (50+ cities, 10M+ readings)
```
Year 1:  $5.00/month   = $60/year (50GB storage)
Year 2+: $30.00/month  = $360/year (t3.medium + 50GB)
```

---

## 🎯 RECOMMENDED SETUP FOR YOUR PROJECT

### Starting Out (Multi-City Development)
```
EC2 Instance:     t2.micro (free tier) → $0/month
EBS Storage:     20GB → $2.00/month
Data Transfer:   < 100GB → $0/month
─────────────────────────────────────
TOTAL:            $2.00/month ($24/year)
```

### Production (10-20 Cities)
```
EC2 Instance:     t3.small → $15.00/month
EBS Storage:      50GB → $5.00/month
Data Transfer:    < 100GB → $0/month
Backup Snapshots: 50GB → $2.50/month
─────────────────────────────────────
TOTAL:            $22.50/month ($270/year)
```

---

## 💰 FINAL ANSWER

### What You'll Pay:

**Year 1 (Free Tier):**
- **$2.00/month** = **$24/year**
- Just EBS storage cost

**After Year 1:**
- **$10.50/month** = **$126/year**
- EC2 instance + EBS storage

**If You Upgrade to t3.small:**
- **$22.50/month** = **$270/year**
- Better performance, more storage, backups

---

## ✅ BOTTOM LINE

**Minimum Cost:** **$2/month** (year 1)  
**Typical Cost:** **$10.50/month** (after year 1)  
**Production Cost:** **$22.50/month** (recommended setup)

**vs. Alternatives:**
- MongoDB Atlas: $9/month (always)
- Hetzner VPS: $5/month (always)
- AWS GPU: $378/month (always)

**Your approach is the CHEAPEST option, especially in year 1!** 🎉

---

## 🚨 HIDDEN COSTS TO WATCH OUT FOR

### ❌ Things That Cost Extra (But You Can Avoid):

1. **Detailed CloudWatch Monitoring:** $10.80/month
   - **Solution:** Use basic (free) monitoring

2. **Unattached Elastic IP:** $3.60/month
   - **Solution:** Always attach to instance

3. **Data Transfer > 100GB:** $0.09/GB
   - **Solution:** Keep transfers under 100GB/month

4. **Multiple EBS Volumes:** $0.10/GB each
   - **Solution:** Use one volume, expand if needed

5. **Backup Snapshots:** $0.05/GB/month
   - **Solution:** Optional, but recommended for production

---

## 📋 COST CHECKLIST

Before Launching:
- [ ] Choose t2.micro (free tier eligible)
- [ ] Use 20GB EBS (enough to start)
- [ ] Attach Elastic IP (free)
- [ ] Use basic CloudWatch (free)
- [ ] Monitor data transfer (stay under 100GB)

After Launching:
- [ ] Monitor actual costs in AWS Billing Dashboard
- [ ] Set up billing alerts ($10, $20, $50 thresholds)
- [ ] Review costs monthly
- [ ] Optimize storage (delete unused data)

---

## 🎯 RECOMMENDATION

**Start with:**
- EC2 t2.micro (free tier)
- 20GB EBS storage
- **Total: $2/month**

**Upgrade when needed:**
- If performance is slow → t3.small ($15/month)
- If storage is full → Increase EBS (add $0.10/GB)
- If data transfer > 100GB → Optimize queries

**This gives you maximum value with minimum cost!** ✅
