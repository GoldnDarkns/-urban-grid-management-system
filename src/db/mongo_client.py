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

def reset_connection():
    """Reset MongoDB connection cache."""
    global _client, _db
    if _client:
        try:
            _client.close()
        except:
            pass
    _client = None
    _db = None

def get_client():
    """Get or create MongoDB client instance."""
    global _client
    if _client is None:
        try:
            # For MongoDB Atlas, use minimal options - let the URI handle connection params
            # Increase timeouts for better reliability
            client_options = {
                'serverSelectionTimeoutMS': 30000,  # 30 seconds
                'connectTimeoutMS': 30000,
                'socketTimeoutMS': 30000,
                'retryWrites': True,
                'w': 'majority'
            }
            # Create fresh client
            _client = MongoClient(MONGO_URI, **client_options)
            # Test connection with a simple operation
            _client.admin.command('ping')
            # Verify database access
            _client[MONGO_DB].list_collection_names()
            print(f"Successfully connected to MongoDB: {MONGO_DB}")
        except Exception as e:
            print(f"WARNING: Failed to connect to MongoDB")
            if '@' in MONGO_URI:
                uri_parts = MONGO_URI.split('@')
                if len(uri_parts) == 2:
                    hidden_uri = uri_parts[0].split(':')[0] + ':***@' + uri_parts[1]
                    print(f"URI: {hidden_uri}")
            print(f"Error details: {type(e).__name__}: {e}")
            # Reset client and allow the app to run
            _client = None
            # Don't raise - let safe_get_db handle it
            return None
    if _client is None:
        return None
    return _client

def get_db():
    """Get database instance."""
    global _db
    if _db is None:
        try:
            client = get_client()
            if client is None:
                return None
            _db = client[MONGO_DB]
        except Exception as e:
            print(f"Get_db exception: {type(e).__name__}: {str(e)[:100]}")
            return None
    if _db is None:
        return None
    return _db

def ping():
    """Ping MongoDB server to verify connection."""
    global _client
    try:
        # First try existing client if it exists
        if _client is not None:
            try:
                result = _client.admin.command('ping')
                return result.get('ok') == 1.0
            except Exception:
                # Existing client failed, reset it and try fresh connection
                _client = None
        
        # Try to create a fresh client
        try:
            # Add retryWrites and other options for better Atlas compatibility
            client_options = {
                'serverSelectionTimeoutMS': 30000,  # 30 seconds for server context
                'connectTimeoutMS': 30000,
                'socketTimeoutMS': 30000,
                'retryWrites': True,
                'w': 'majority'
            }
            client = MongoClient(MONGO_URI, **client_options)
            result = client.admin.command('ping')
            _client = client
            return result.get('ok') == 1.0
        except Exception as e:
            # Reset client on failure
            _client = None
            print(f"MongoDB ping error: {e}")
            return False
    except Exception as e:
        _client = None
        return False

def close_connection():
    """Close MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
