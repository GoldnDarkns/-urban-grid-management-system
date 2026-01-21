"""
FastAPI Backend for Urban Grid Management System.
Provides REST API endpoints for the React frontend.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pymongo.errors import ConnectionFailure

from backend.routes import data, models, analytics, simulations, incidents

app = FastAPI(
    title="Urban Grid Management System API",
    description="API for Climate- and Constraint-Aware Urban Grid & Emission Management System",
    version="1.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    
    return JSONResponse(
        status_code=200,  # Return 200 with error in body instead of 500
        content={"error": error_msg, "connected": False}
    )

# Handler for HTTPException (FastAPI's default exception)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTPException and check if it's MongoDB-related."""
    error_msg = str(exc.detail)
    error_lower = error_msg.lower()
    
    # Check if it's a MongoDB-related error
    if any(keyword in error_lower for keyword in ["mongodb", "authentication", "bad auth", "replica set", "timeout", "connection"]):
        if "authentication" in error_lower or "bad auth" in error_lower:
            error_msg = "MongoDB authentication failed. Please check your .env file."
        elif "replica set" in error_lower or "timeout" in error_lower:
            error_msg = "MongoDB connection timeout. IP whitelist change may still be propagating."
        
        # Return 200 with error in body instead of 500
        return JSONResponse(
            status_code=200,
            content={"error": error_msg, "connected": False, "detail": error_msg}
        )
    
    # For other HTTPExceptions, return as normal
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# General exception handler for unhandled exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions gracefully."""
    error_msg = str(exc)
    error_lower = error_msg.lower()
    
    # Check if it's a MongoDB-related error
    if any(keyword in error_lower for keyword in ["mongodb", "authentication", "bad auth", "replica set", "timeout", "connection"]):
        if "authentication" in error_lower or "bad auth" in error_lower:
            error_msg = "MongoDB authentication failed. Please check your .env file."
        elif "replica set" in error_lower or "timeout" in error_lower:
            error_msg = "MongoDB connection timeout. IP whitelist change may still be propagating. Please wait 2-3 minutes."
        else:
            error_msg = "MongoDB connection failed. Please check your connection settings."
        
        # Return error response instead of 500 - use 200 with error in body
        return JSONResponse(
            status_code=200,
            content={"error": error_msg, "connected": False, "data": None}
        )
    
    # For other exceptions, return 500 as usual
    return JSONResponse(
        status_code=500,
        content={"error": error_msg}
    )

# Include routers
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(models.router, prefix="/api/models", tags=["Models"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(simulations.router, prefix="/api/simulations", tags=["Simulations"])
app.include_router(incidents.router, prefix="/api", tags=["Incidents"])


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

