"""
Configuration module for Urban Grid Management System.
Loads environment variables and defines project constants.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Get project root directory (parent of src/)
project_root = Path(__file__).parent.parent

# Load environment variables from .env file in project root
env_path = project_root / '.env'
load_dotenv(dotenv_path=env_path)

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "urban_grid_ai")

# Debug: Print loaded config (hide password)
if MONGO_URI and '@' in MONGO_URI:
    uri_parts = MONGO_URI.split('@')
    if len(uri_parts) == 2:
        hidden_uri = uri_parts[0].split(':')[0] + ':***@' + uri_parts[1]
        print(f"Loaded MONGO_URI: {hidden_uri}")
    else:
        print(f"Loaded MONGO_URI: {MONGO_URI}")
else:
    print(f"Loaded MONGO_URI: {MONGO_URI}")
print(f"Loaded MONGO_DB: {MONGO_DB}")

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
