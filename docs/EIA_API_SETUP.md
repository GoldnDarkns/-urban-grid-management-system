# EIA API Setup Guide

## Overview

The U.S. Energy Information Administration (EIA) provides free API access to energy data. According to the [EIA API Documentation](https://www.eia.gov/opendata/documentation.php), you need to:

1. **Register for an API key** at https://www.eia.gov/opendata/register.php
2. **Use the API key** in all requests

## API Endpoints We're Using

### 1. Electricity Operational Data
- **Route:** `/v2/electricity/electric-power-operational-data/data/`
- **Purpose:** Get electricity generation, consumption, cost data by state
- **Example:** Monthly electricity generation and consumption by state

### 2. State CO2 Emissions
- **Route:** `/v2/seds/data/` (State Energy Data System)
- **Purpose:** Get state-level CO2 emissions data
- **Note:** EIA recommends using `/v2/seds/` instead of deprecated `/v2/co2-emissions/` route

### 3. International Consumption
- **Route:** `/v2/international/data/`
- **Purpose:** Get country-level energy consumption data
- **Example:** Petroleum, natural gas, electricity consumption by country

## How to Get Your API Key

1. Visit: https://www.eia.gov/opendata/register.php
2. Fill out the registration form
3. Accept the Terms of Service
4. You'll receive an API key via email

## Setting Up the API Key

### Option 1: Environment Variable (Recommended)

Create a `.env` file in the project root:

```bash
EIA_API_KEY=your_api_key_here
```

### Option 2: Direct in Code (For Testing)

Update `backend/services/eia_service.py`:

```python
EIA_API_KEY = "your_api_key_here"
```

### Option 3: Pass at Runtime

The `EIAService` class accepts an API key in the constructor:

```python
eia_service = EIAService(api_key="your_api_key_here")
```

## API Usage Examples

### Get Electricity Data for California

```python
from backend.services.eia_service import EIAService

eia = EIAService(api_key="your_key")
data = eia.get_electricity_operational_data(
    state="CA",
    frequency="monthly",
    limit=12
)
```

### Get CO2 Emissions for New York

```python
data = eia.get_state_co2_emissions(
    state="NY",
    frequency="annual",
    limit=10
)
```

### Get International Consumption for USA

```python
data = eia.get_international_consumption(
    country="USA",
    product="electricity",
    frequency="monthly",
    limit=12
)
```

## API Response Format

All EIA API responses follow this structure:

```json
{
  "response": {
    "total": 1000,
    "dateFormat": "YYYY-MM",
    "frequency": "monthly",
    "data": [
      {
        "period": "2024-01",
        "stateid": "CA",
        "generation": 25000,
        "total-consumption": 30000,
        "cost": 0.15
      }
    ]
  }
}
```

## Rate Limits

- **Maximum rows per request:** 5,000 (JSON) or 300 (XML)
- **No official rate limit** mentioned, but be respectful
- Use pagination (`offset` and `length`) for large datasets

## Troubleshooting

### "EIA API key not provided"
- Make sure you've set the `EIA_API_KEY` environment variable or passed it to the service

### "404 Not Found"
- Check that your API key is valid
- Verify the route path is correct
- Check that the data series exists for your filters

### "400 Bad Request"
- Check your parameter format (dates should be YYYY-MM for monthly, YYYY for annual)
- Verify facet values are valid (state codes, country codes, etc.)

## References

- [EIA API Documentation](https://www.eia.gov/opendata/documentation.php)
- [EIA API Registration](https://www.eia.gov/opendata/register.php)
- [EIA API v2.1.0 Documentation](https://www.eia.gov/opendata/documentation.php)
