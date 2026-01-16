# Quick Fix: MongoDB Connection Issues

## ✅ Good News!
Your MongoDB connection **IS WORKING** when tested directly! The test script shows:
- ✓ Connection successful
- ✓ Database accessible  
- ✓ 8 collections found with data
- ✓ 216,000+ meter readings
- ✓ 20 zones, 500 households

## 🔧 The Problem
The backend server has a **stale/cached connection** that's failing. The connection works fine, but the server needs to be restarted.

## 🚀 Quick Fix Steps

### Step 1: Restart Backend Server

**Option A: Manual Restart**
1. Find the terminal window running the backend (uvicorn)
2. Press `Ctrl+C` to stop it
3. Restart with:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

**Option B: Kill and Restart (Windows PowerShell)**
```powershell
# Kill process on port 8000
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force

# Restart server
cd "W:\VS Code Projects\-urban-grid-management-system"
uvicorn backend.main:app --reload --port 8000
```

### Step 2: Verify Connection

Run the test script:
```bash
python test_mongodb_connection.py
```

You should see: `[SUCCESS] ALL TESTS PASSED`

### Step 3: Check API Endpoints

After restarting, test the API:
```bash
curl http://localhost:8000/api/data/status
```

Should return JSON with `"connected": true` instead of 500 error.

## 📋 MongoDB Atlas Checklist

Since your connection works, verify these settings:

### 1. IP Whitelist ✅
- Go to MongoDB Atlas → **Network Access**
- Make sure your IP is whitelisted OR `0.0.0.0/0` is allowed (for dev)

### 2. Database User ✅  
- Go to **Database Access**
- User: `alpha`
- Password: `1234` (verify this matches your `.env`)

### 3. Connection String ✅
Your `.env` should have:
```
MONGO_URI=mongodb+srv://alpha:1234@cluster1.knoaajk.mongodb.net/urban_grid_ai?appName=Cluster1&retryWrites=true&w=majority
MONGO_DB=urban_grid_ai
```

## 🐛 If Still Getting Errors

### Error: "bad auth : authentication failed"
**Fix:** Reset password in MongoDB Atlas and update `.env`

### Error: "No replica set members match selector"
**Fix:** 
1. Check IP whitelist in MongoDB Atlas
2. Add `0.0.0.0/0` temporarily for testing
3. Restart backend server

### Error: 500 Internal Server Error
**Fix:**
1. Restart backend server (most common fix)
2. Check server logs for specific error
3. Verify `.env` file is in project root

## 📝 Test Your Connection

Always test with:
```bash
python test_mongodb_connection.py
```

This will tell you exactly what's wrong if connection fails.

## 🎯 Next Steps

1. **Restart backend server** (this usually fixes it)
2. **Refresh browser** at http://localhost:5173
3. **Check System Status** - MongoDB should show "CONNECTED" (green)
4. **Check browser console** - should see no more 500 errors

Your MongoDB is working fine - just need to refresh the server connection!
