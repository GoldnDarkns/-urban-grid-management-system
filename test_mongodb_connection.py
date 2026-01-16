"""
MongoDB Connection Test Script
Run this to test your MongoDB Atlas connection.
"""
import sys
import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.config import MONGO_URI, MONGO_DB

def test_connection():
    """Test MongoDB connection and display results."""
    print("=" * 60)
    print("MongoDB Connection Test")
    print("=" * 60)
    print(f"\nConnection String: {MONGO_URI.replace('1234', '***')}")
    print(f"Database Name: {MONGO_DB}")
    print("\n" + "-" * 60)
    
    try:
        # Test 1: Basic connection
        print("\n[1] Testing basic connection...")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
        result = client.admin.command('ping')
        print(f"[OK] Connection successful! Ping result: {result}")
        
        # Test 2: Database access
        print("\n[2] Testing database access...")
        db = client[MONGO_DB]
        print(f"[OK] Database '{MONGO_DB}' accessible")
        
        # Test 3: List collections
        print("\n[3] Listing collections...")
        collections = db.list_collection_names()
        if collections:
            print(f"[OK] Found {len(collections)} collections:")
            for coll in collections[:10]:
                count = db[coll].count_documents({})
                print(f"  - {coll}: {count:,} documents")
        else:
            print("[WARNING] No collections found (database may be empty)")
        
        # Test 4: Sample data
        print("\n[4] Testing data access...")
        if 'zones' in collections:
            zone_count = db.zones.count_documents({})
            print(f"[OK] Zones collection: {zone_count:,} documents")
        if 'households' in collections:
            household_count = db.households.count_documents({})
            print(f"[OK] Households collection: {household_count:,} documents")
        
        print("\n" + "=" * 60)
        print("[SUCCESS] ALL TESTS PASSED - MongoDB connection is working!")
        print("=" * 60)
        
        client.close()
        return True
        
    except ConnectionFailure as e:
        print(f"\n[ERROR] Connection Failure:")
        print(f"  Error: {str(e)}")
        print("\nPossible causes:")
        print("  1. Incorrect password in .env file")
        print("  2. IP address not whitelisted in MongoDB Atlas")
        print("  3. Network/firewall blocking connection")
        return False
        
    except ServerSelectionTimeoutError as e:
        print(f"\n[ERROR] Server Selection Timeout:")
        print(f"  Error: {str(e)}")
        print("\nPossible causes:")
        print("  1. Network connectivity issues")
        print("  2. MongoDB Atlas cluster is down")
        print("  3. Firewall blocking connection")
        return False
        
    except Exception as e:
        print(f"\n[ERROR] Unexpected Error:")
        print(f"  Type: {type(e).__name__}")
        print(f"  Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
