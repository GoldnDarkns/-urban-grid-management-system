"""
FastAPI Backend for Urban Grid Management System.
Provides REST API endpoints for the React frontend.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# CRITICAL: Patch FastAPI's encoder BEFORE importing FastAPI
# This ensures our patch is used everywhere
from bson import ObjectId
import fastapi.encoders

def recursive_clean_objectid(obj, depth=0, max_depth=20):
    """Recursively clean ObjectIds from any structure"""
    if depth > max_depth:
        return str(obj) if obj is not None else None
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        if '$oid' in obj:
            return str(obj['$oid'])
        if '$date' in obj:
            return obj['$date']
        return {k: recursive_clean_objectid(v, depth+1, max_depth) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [recursive_clean_objectid(item, depth+1, max_depth) for item in obj]
    if hasattr(obj, 'isoformat') and callable(getattr(obj, 'isoformat')):
        try:
            return obj.isoformat()
        except:
            return str(obj)
    return obj

# Store original encoder
_original_jsonable_encoder = fastapi.encoders.jsonable_encoder

def patched_jsonable_encoder(obj, *args, **kwargs):
    """Patched jsonable_encoder that handles ObjectIds recursively"""
    try:
        # First, recursively clean all ObjectIds
        cleaned_obj = recursive_clean_objectid(obj)
        # Then use FastAPI's encoder on the cleaned object
        return _original_jsonable_encoder(cleaned_obj, *args, **kwargs)
    except (TypeError, ValueError) as e:
        # If encoder fails, try cleaning again and retry
        if "ObjectId" in str(e) or "not iterable" in str(e):
            try:
                cleaned_obj = recursive_clean_objectid(obj)
                return _original_jsonable_encoder(cleaned_obj, *args, **kwargs)
            except:
                return str(obj) if obj is not None else None
        raise
    except Exception as e:
        # For any other error, try to convert to string
        print(f"[patched_jsonable_encoder] Unexpected error: {e}")
        return str(obj) if obj is not None else None

# Replace FastAPI's encoder BEFORE FastAPI is used
fastapi.encoders.jsonable_encoder = patched_jsonable_encoder

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pymongo.errors import ConnectionFailure
import json

from backend.routes import data, models, analytics, simulations, incidents, queries, ai_recommendations, live_data, city_selection, live_stream, knowledge_graph

# CORS headers to add to ALL responses (including errors) so browser never blocks
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

def json_with_cors(status_code: int, content: dict):
    """Return JSONResponse with CORS headers so frontend never sees CORS block."""
    return JSONResponse(status_code=status_code, content=content, headers=dict(CORS_HEADERS))

# Custom JSON encoder to handle ObjectId
def custom_json_serializer(obj):
    """Custom JSON serializer for ObjectId and datetime"""
    if isinstance(obj, ObjectId):
        return str(obj)
    from datetime import datetime
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

app = FastAPI(
    title="Urban Grid Management System API",
    description="API for Climate- and Constraint-Aware Urban Grid & Emission Management System",
    version="1.0.0"
)

# Encoder already patched above before FastAPI import
print("[main.py] FastAPI JSON encoder patched to handle ObjectIds (patched before FastAPI import)")

# Custom middleware to convert ObjectIds in responses before FastAPI's encoder
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
import json

class ObjectIdMiddleware(BaseHTTPMiddleware):
    """Middleware to convert ObjectIds to strings in all responses"""
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            
            # Only process JSON responses that are JSONResponse (not Response with pre-encoded JSON)
            # Skip if it's already a Response with content (pre-encoded)
            if isinstance(response, JSONResponse):
                try:
                    # Get response body
                    if hasattr(response, 'body'):
                        body = response.body
                        if body:
                            # Parse JSON
                            data = json.loads(body.decode('utf-8'))
                            # Convert ObjectIds recursively
                            cleaned_data = self._clean_objectids(data)
                            # Re-encode
                            response.body = json.dumps(cleaned_data, default=str).encode('utf-8')
                except Exception as e:
                    # If conversion fails, log but don't break the response
                    print(f"[ObjectIdMiddleware] Error cleaning response: {e}")
            # For Response objects with pre-encoded JSON, don't touch them
            
            return response
        except Exception as e:
            # If middleware itself fails, return error response
            print(f"[ObjectIdMiddleware] Middleware error: {e}")
            return Response(
                content='{"error":"Middleware error"}',
                media_type="application/json",
                status_code=200,
                headers=dict(CORS_HEADERS)
            )
    
    def _clean_objectids(self, obj):
        """Recursively clean ObjectIds from response data"""
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, dict):
            if '$oid' in obj:
                return str(obj['$oid'])
            return {k: self._clean_objectids(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._clean_objectids(item) for item in obj]
        if hasattr(obj, 'isoformat') and callable(getattr(obj, 'isoformat')):
            return obj.isoformat()
        return obj

# Add ObjectId middleware BEFORE CORS middleware
app.add_middleware(ObjectIdMiddleware)

# CORS middleware for React frontend (Vite dev, Docker Nginx on :80)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
        "http://localhost", "http://localhost:80", "http://127.0.0.1", "http://127.0.0.1:80",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Exception handler for MongoDB connection errors
@app.exception_handler(ConnectionFailure)
async def mongodb_connection_exception_handler(request: Request, exc: ConnectionFailure):
    """Handle MongoDB connection failures gracefully."""
    error_msg = str(exc)
    if "authentication" in error_msg.lower() or "bad auth" in error_msg.lower():
        error_msg = "MongoDB authentication failed. Please check your .env file."
    elif "replica set" in error_msg.lower() or "timeout" in error_msg.lower():
        error_msg = "MongoDB connection timeout. IP whitelist change may still be propagating."
    return json_with_cors(200, {"error": error_msg, "connected": False})

# Handler for HTTPException (FastAPI's default exception)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTPException and check if it's MongoDB-related."""
    error_msg = str(exc.detail)
    error_lower = error_msg.lower()
    if any(k in error_lower for k in ["mongodb", "authentication", "bad auth", "replica set", "timeout", "connection"]):
        if "authentication" in error_lower or "bad auth" in error_lower:
            error_msg = "MongoDB authentication failed. Please check your .env file."
        elif "replica set" in error_lower or "timeout" in error_lower:
            error_msg = "MongoDB connection timeout. IP whitelist change may still be propagating."
        return json_with_cors(200, {"error": error_msg, "connected": False, "detail": error_msg})
    return json_with_cors(exc.status_code, {"detail": exc.detail})

# General exception handler: always 200 + error body (never 500) so CORS headers are sent
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions. Return 200 + error JSON so CORS works."""
    # CRITICAL: Don't try to serialize the exception object - just get the message
    try:
        error_msg = str(exc)
    except:
        error_msg = "Unknown error"
    error_lower = error_msg.lower()
    
    # Check if this is an ObjectId serialization error
    if "objectid" in error_lower and ("not iterable" in error_lower or "vars()" in error_lower):
        # This is the ObjectId serialization issue - return as Response to avoid serialization
        import traceback
        import json
        # Don't try to serialize the exception object - just log it
        try:
            print(f"[Exception Handler] ObjectId serialization error detected")
            print(f"[Exception Handler] Error message: {error_msg[:200]}")
        except:
            print(f"[Exception Handler] ObjectId serialization error (could not log details)")
        
        # Create completely clean error response (no ObjectIds possible)
        error_response = {
            "error": "Data serialization error. Please check backend logs.",
            "success": False,
            "detail": "ObjectId serialization failed",
            "path": str(request.url.path) if hasattr(request, 'url') else "unknown"
        }
        # Return as Response with pre-encoded JSON to avoid FastAPI's encoder
        try:
            response_json = json.dumps(error_response, default=str, ensure_ascii=False)
            return Response(
                content=response_json,
                media_type="application/json",
                status_code=200,
                headers=dict(CORS_HEADERS)
            )
        except Exception as json_err:
            # Even JSON encoding failed - return minimal response
            return Response(
                content='{"error":"Serialization error","success":false}',
                media_type="application/json",
                status_code=200,
                headers=dict(CORS_HEADERS)
            )
    
    if any(k in error_lower for k in ["mongodb", "authentication", "bad auth", "replica set", "timeout", "connection"]):
        if "authentication" in error_lower or "bad auth" in error_lower:
            error_msg = "MongoDB authentication failed. Please check your .env file."
        elif "replica set" in error_lower or "timeout" in error_lower:
            error_msg = "MongoDB connection timeout. IP whitelist change may still be propagating. Please wait 2-3 minutes."
        else:
            error_msg = "MongoDB connection failed. Please check your connection settings."
        return json_with_cors(200, {"error": error_msg, "connected": False, "data": None})
    return json_with_cors(200, {"error": error_msg, "success": False, "detail": error_msg})

# Include routers
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(models.router, prefix="/api/models", tags=["Models"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(simulations.router, prefix="/api/simulations", tags=["Simulations"])
app.include_router(incidents.router, prefix="/api", tags=["Incidents"])
app.include_router(queries.router, tags=["Queries"])
app.include_router(ai_recommendations.router, prefix="/api/ai", tags=["AI Recommendations"])
app.include_router(live_data.router, tags=["Live Data"])
app.include_router(city_selection.router, tags=["City Selection"])
app.include_router(live_stream.router)
app.include_router(knowledge_graph.router)


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "Urban Grid Management System API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "data": "/api/data",
            "models": "/api/models",
            "analytics": "/api/analytics"
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    # Use the existing connection pool for fast response
    try:
        from src.db.mongo_client import ping
        db_status = "connected" if ping() else "disconnected"
    except Exception as e:
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "database": db_status
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

