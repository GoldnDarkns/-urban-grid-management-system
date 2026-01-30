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
# We support two "purposes":
# - SIM: simulated/demo dataset (typically MongoDB Atlas)
# - CITY: live city processing dataset (optionally local MongoDB for offline/dev)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "urban_grid_ai")

SIM_MONGO_URI = os.getenv("SIM_MONGO_URI", MONGO_URI)
SIM_MONGO_DB = os.getenv("SIM_MONGO_DB", MONGO_DB)

CITY_MONGO_URI = os.getenv("CITY_MONGO_URI", "mongodb://localhost:27017")
CITY_MONGO_DB = os.getenv("CITY_MONGO_DB", "urban_grid_city")

def _hide_uri_password(uri: str) -> str:
    if not uri:
        return uri
    if '@' not in uri:
        return uri
    uri_parts = uri.split('@')
    if len(uri_parts) != 2:
        return uri
    return uri_parts[0].split(':')[0] + ':***@' + uri_parts[1]

# Debug: Print loaded config (hide password)
print(f"Loaded SIM_MONGO_URI: {_hide_uri_password(SIM_MONGO_URI)}")
print(f"Loaded SIM_MONGO_DB: {SIM_MONGO_DB}")
print(f"Loaded CITY_MONGO_URI: {_hide_uri_password(CITY_MONGO_URI)}")
print(f"Loaded CITY_MONGO_DB: {CITY_MONGO_DB}")

# City Configuration
DEFAULT_CITY = "MetroCity"
DEFAULT_ZONES = 20
DEFAULT_HOUSEHOLDS = 500

# Validation: require at least one MongoDB URI so app can start (SIM or CITY or MONGO_URI)
if not (MONGO_URI or SIM_MONGO_URI or CITY_MONGO_URI):
    raise ValueError("Set at least one of MONGO_URI, SIM_MONGO_URI, or CITY_MONGO_URI in .env")

def get_config():
    """Return configuration dictionary."""
    return {
        "mongo_uri": MONGO_URI,
        "mongo_db": MONGO_DB,
        "default_city": DEFAULT_CITY,
        "default_zones": DEFAULT_ZONES,
        "default_households": DEFAULT_HOUSEHOLDS,
    }
