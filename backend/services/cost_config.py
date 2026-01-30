"""
Cost configuration for energy, CO2, AQI, and incident cost calculations.
Override via environment variables if needed.
"""
import os

# Carbon price: $/metric ton CO2 (EPA social cost / voluntary market range)
CARBON_PRICE_PER_TON_USD = float(os.getenv("COST_CARBON_PRICE_PER_TON", "50.0"))

# Fallback $/kWh when EIA retail price is unavailable
DEFAULT_PRICE_PER_KWH_USD = float(os.getenv("COST_DEFAULT_PRICE_PER_KWH", "0.12"))

# Approximate kg CO2 per kWh (US grid mix)
KG_CO2_PER_KWH = float(os.getenv("COST_KG_CO2_PER_KWH", "0.4"))

# Phase B: AQI – $ per AQI point above 50 per zone (health/externality proxy)
COST_PER_AQI_POINT_ABOVE_50 = float(os.getenv("COST_PER_AQI_POINT_ABOVE_50", "0.5"))

# Phase B: Incidents – $ per 311 request (response, admin, resolution proxy)
COST_PER_INCIDENT_DEFAULT = float(os.getenv("COST_PER_INCIDENT_DEFAULT", "50.0"))
