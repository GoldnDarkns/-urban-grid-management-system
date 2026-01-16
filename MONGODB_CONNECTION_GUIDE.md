# MongoDB Atlas Connection Guide

## How to Check Your MongoDB Connection

### 1. Test Connection Using Python Script

Run the test script:
```bash
python test_mongodb_connection.py
```

This will test:
- Basic connection to MongoDB Atlas
- Database access
- Collection listing
- Data access

### 2. Check MongoDB Atlas Settings

#### A. Verify Connection String

1. Go to MongoDB Atlas Dashboard
2. Click **"Connect"** button on your cluster
3. Select **"Drivers"** or **"Connect your application"**
4. Copy the connection string
5. Make sure it matches your `.env` file format:
   ```
   MONGO_URI=mongodb+srv://<username>:<password>@cluster1.knoaajk.mongodb.net/?appName=Cluster1
   ```

#### B. Check Database User Credentials

1. Go to **"Database Access"** in MongoDB Atlas
2. Find your user (likely "alpha")
3. Click **"Edit"** to verify:
   - Username is correct
   - Password matches what's in your `.env` file
   - User has proper permissions (read/write to database)

#### C. Check IP Whitelist (CRITICAL!)

1. Go to **"Network Access"** in MongoDB Atlas
2. Check your IP whitelist:
   - Your current IP must be in the list
   - Or add `0.0.0.0/0` to allow all IPs (for development only!)
3. Click **"Add IP Address"** if needed
   - For development: Add `0.0.0.0/0` (allows all IPs)
   - For production: Add your specific IP address

#### D. Verify Database Name

1. Go to **"Database"** → **"Browse Collections"**
2. Verify the database name matches `urban_grid_ai` in your `.env`

### 3. Common Connection Issues

#### Issue: "bad auth : authentication failed"
**Solution:**
- Verify password in `.env` matches MongoDB Atlas user password
- Check username is correct (case-sensitive)
- Reset password in MongoDB Atlas if needed

#### Issue: "No replica set members match selector"
**Solution:**
- Check IP whitelist - your IP must be allowed
- Verify network connectivity
- Try adding `0.0.0.0/0` to IP whitelist temporarily

#### Issue: Connection timeout
**Solution:**
- Check internet connection
- Verify firewall isn't blocking MongoDB ports
- Check MongoDB Atlas cluster status

### 4. Update Your .env File

Your `.env` file should look like:
```
MONGO_URI=mongodb+srv://alpha:YOUR_PASSWORD@cluster1.knoaajk.mongodb.net/urban_grid_ai?appName=Cluster1&retryWrites=true&w=majority
MONGO_DB=urban_grid_ai
```

**Important:** Replace `YOUR_PASSWORD` with your actual MongoDB Atlas password.

### 5. Test Connection from Command Line

```bash
# Test connection
python test_mongodb_connection.py

# Or test directly
python -c "from src.db.mongo_client import ping; print('Connected!' if ping() else 'Failed!')"
```

### 6. Quick Fixes

**If connection fails:**

1. **Reset password in MongoDB Atlas:**
   - Go to Database Access
   - Edit user → Reset password
   - Update `.env` file with new password

2. **Add IP to whitelist:**
   - Go to Network Access
   - Add IP Address → Add Current IP Address
   - Or add `0.0.0.0/0` for development

3. **Verify connection string:**
   - Get fresh connection string from Atlas
   - Update `.env` file
   - Restart backend server

### 7. Restart Backend After Changes

After updating `.env` or MongoDB Atlas settings:
```bash
# Stop the backend server (Ctrl+C)
# Then restart it
uvicorn backend.main:app --reload --port 8000
```
