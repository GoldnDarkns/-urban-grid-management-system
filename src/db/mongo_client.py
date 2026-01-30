"""
MongoDB client module for Urban Grid Management System.
Handles database connection and provides utility functions.
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import sys
from typing import Literal, Optional
from src.config import SIM_MONGO_URI, SIM_MONGO_DB, CITY_MONGO_URI, CITY_MONGO_DB

Purpose = Literal["sim", "city"]

_clients: dict[str, Optional[MongoClient]] = {"sim": None, "city": None}
_dbs = {"sim": None, "city": None}

def _get_uri_db(purpose: Purpose):
    if purpose == "city":
        return CITY_MONGO_URI, CITY_MONGO_DB
    return SIM_MONGO_URI, SIM_MONGO_DB

def reset_connection():
    """Reset MongoDB connection cache."""
    global _clients, _dbs
    for k, client in list(_clients.items()):
        if client:
            try:
                client.close()
            except Exception:
                pass
        _clients[k] = None
        _dbs[k] = None

def get_client(purpose: Purpose = "sim"):
    """Get or create a MongoDB client for the given purpose."""
    global _clients
    if _clients.get(purpose) is None:
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
            uri, db_name = _get_uri_db(purpose)
            _clients[purpose] = MongoClient(uri, **client_options)
            # Test connection with a simple operation
            _clients[purpose].admin.command('ping')
            # Verify database access
            _clients[purpose][db_name].list_collection_names()
            print(f"Successfully connected to MongoDB ({purpose}): {db_name}")
        except Exception as e:
            print(f"WARNING: Failed to connect to MongoDB")
            uri, _ = _get_uri_db(purpose)
            if '@' in uri:
                uri_parts = uri.split('@')
                if len(uri_parts) == 2:
                    hidden_uri = uri_parts[0].split(':')[0] + ':***@' + uri_parts[1]
                    print(f"URI: {hidden_uri}")
            print(f"Error details: {type(e).__name__}: {e}")
            # Reset client and allow the app to run
            _clients[purpose] = None
            # Don't raise - let safe_get_db handle it
            return None
    if _clients.get(purpose) is None:
        return None
    return _clients[purpose]

def get_db(purpose: Purpose = "sim"):
    """Get database instance for purpose."""
    global _dbs
    if _dbs.get(purpose) is None:
        try:
            client = get_client(purpose)
            if client is None:
                return None
            _, db_name = _get_uri_db(purpose)
            _dbs[purpose] = client[db_name]
        except Exception as e:
            print(f"Get_db exception: {type(e).__name__}: {str(e)[:100]}")
            return None
    if _dbs.get(purpose) is None:
        return None
    return _dbs[purpose]

def get_city_db():
    """Convenience for city (live) database."""
    # Prefer local CITY DB. If it isn't running, fall back to SIM so the app still works.
    db = get_db("city")
    if db is None:
        return get_db("sim")
    return db

def get_sim_db():
    """Convenience for sim (Atlas/demo) database."""
    return get_db("sim")

def ping(purpose: Purpose = "sim", timeout_ms: int = 30000):
    """Ping MongoDB server to verify connection. Use timeout_ms=5000 for fast status checks."""
    global _clients
    try:
        # First try existing client if it exists (only if we're not doing a quick check)
        if timeout_ms >= 10000 and _clients.get(purpose) is not None:
            try:
                result = _clients[purpose].admin.command('ping')
                return result.get('ok') == 1.0
            except Exception:
                _clients[purpose] = None
        
        # Create client with given timeout so status endpoint fails fast when DB is unreachable
        try:
            client_options = {
                'serverSelectionTimeoutMS': timeout_ms,
                'connectTimeoutMS': min(timeout_ms, 10000),
                'socketTimeoutMS': 30000,
                'retryWrites': True,
                'w': 'majority'
            }
            uri, _ = _get_uri_db(purpose)
            client = MongoClient(uri, **client_options)
            result = client.admin.command('ping')
            if timeout_ms >= 10000:
                _clients[purpose] = client
            else:
                client.close()
            return result.get('ok') == 1.0
        except Exception as e:
            _clients[purpose] = None
            print(f"MongoDB ping error: {e}")
            return False
    except Exception as e:
        _clients[purpose] = None
        return False

def close_connection():
    """Close MongoDB connection."""
    reset_connection()
