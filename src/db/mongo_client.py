"""
MongoDB client module for Urban Grid Management System.
Handles database connection and provides utility functions.
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import sys
from src.config import MONGO_URI, MONGO_DB

_client = None
_db = None

def get_client():
    """Get or create MongoDB client instance."""
    global _client
    if _client is None:
        try:
            _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            # Test connection immediately
            _client.admin.command('ping')
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            print(f"ERROR: Failed to connect to MongoDB at {MONGO_URI}")
            print(f"Error details: {e}")
            print("\nPlease ensure:")
            print("1. MongoDB is running locally, or")
            print("2. Your MONGO_URI in .env is correct")
            sys.exit(1)
    return _client

def get_db():
    """Get database instance."""
    global _db
    if _db is None:
        client = get_client()
        _db = client[MONGO_DB]
    return _db

def ping():
    """Ping MongoDB server to verify connection."""
    try:
        client = get_client()
        result = client.admin.command('ping')
        return result.get('ok') == 1.0
    except Exception as e:
        print(f"Ping failed: {e}")
        return False

def close_connection():
    """Close MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
