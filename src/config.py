"""
Configuration module for Urban Grid Management System.
Loads environment variables and defines project constants.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "urban_grid_ai")

# City Configuration
DEFAULT_CITY = "MetroCity"
DEFAULT_ZONES = 20
DEFAULT_HOUSEHOLDS = 500

# Validation
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is required")

def get_config():
    """Return configuration dictionary."""
    return {
        "mongo_uri": MONGO_URI,
        "mongo_db": MONGO_DB,
        "default_city": DEFAULT_CITY,
        "default_zones": DEFAULT_ZONES,
        "default_households": DEFAULT_HOUSEHOLDS,
    }
