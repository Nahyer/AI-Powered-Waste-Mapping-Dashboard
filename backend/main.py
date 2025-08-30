"""
AI-Powered Waste Mapping Dashboard - Backend API
Main FastAPI application integrating clustering, alerts, and route optimization.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import json
import asyncio
import uuid
from datetime import datetime
import uvicorn

# Import our modules
from clustering import clustering_engine, cluster_hotspots
from alerts import alert_manager, simulation_manager, AlertType
from route_optimizer import route_optimizer, optimize_collection_routes, Vehicle

app = FastAPI(
    title="AI-Powered Waste Mapping Dashboard API",
    description="Backend API for waste hotspot clustering, alerts, and route optimization",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response validation
class HotspotData(BaseModel):
    id: str
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    severity: int = Field(..., ge=1, le=10)
    timestamp: str
    source: str = "user"

class ClusterRequest(BaseModel):
    hotspots: List[HotspotData]
    eps_km: Optional[float] = Field(0.3, gt=0, le=5)
    min_samples: Optional[int] = Field(2, ge=1, le=10)

class VehicleData(BaseModel):
    id: str
    capacity: int = Field(..., gt=0)
    current_lat: float = Field(..., ge=-90, le=90)
    current_lng: float = Field(..., ge=-180, le=180)
    speed_kmh: float = Field(30.0, gt=0, le=200)

class RouteRequest(BaseModel):
    clusters: List[Dict[str, Any]]
    vehicles: Optional[List[VehicleData]] = None
    max_locations_per_route: Optional[int] = Field(10, ge=1, le=20)

class AlertSettings(BaseModel):
    severity_threshold: int = Field(5, ge=1, le=10)
    simulation_interval: int = Field(120, ge=30, le=3600)

# In-memory storage for demo (in production, use a real database)
hotspots_storage: List[Dict[str, Any]] = []
clusters_storage: List[Dict[str, Any]] = []
routes_storage: List[Dict[str, Any]] = []

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "AI-Powered Waste Mapping Dashboard API",
        "version": "1.0.0",
        "endpoints": {
            "hotspots": "/hotspots",
            "clusters": "/clusters",
            "routes": "/routes",
            "alerts": "/alerts",
            "simulation": "/simulation"
        },
        "docs": "/docs",
        "timestamp": datetime.now().isoformat()
    }

# Hotspot Management Endpoints
@app.get("/hotspots")
async def get_hotspots():
    """Get all hotspots."""
    return {
        "hotspots": hotspots_storage,
        "count": len(hotspots_storage),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/hotspots")
async def add_hotspot(hotspot: HotspotData):
    """Add a new hotspot."""
    hotspot_dict = hotspot.model_dump()
    hotspot_dict["created_at"] = datetime.now().isoformat()
    hotspots_storage.append(hotspot_dict)
    
    # Trigger clustering update
    if len(hotspots_storage) >= 2:
        await update_clusters()
    
    # Check for alerts
    if hotspot.severity >= alert_manager.severity_threshold:
        await alert_manager.send_system_update(
            f"New high-severity hotspot reported: {hotspot.id} (severity: {hotspot.severity})",
            hotspot_dict
        )
    
    return {
        "message": "Hotspot added successfully",
        "hotspot": hotspot_dict,
        "total_hotspots": len(hotspots_storage)
    }

@app.delete("/hotspots/{hotspot_id}")
async def delete_hotspot(hotspot_id: str):
    """Delete a hotspot by ID."""
    global hotspots_storage
    original_count = len(hotspots_storage)
    hotspots_storage = [h for h in hotspots_storage if h.get('id') != hotspot_id]
    
    if len(hotspots_storage) == original_count:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    
    # Trigger clustering update
    await update_clusters()
    
    return {
        "message": f"Hotspot {hotspot_id} deleted successfully",
        "remaining_hotspots": len(hotspots_storage)
    }

# Clustering Endpoints
@app.get("/clusters")
async def get_clusters():
    """Get current clusters."""
    return {
        "clusters": clusters_storage,
        "count": len(clusters_storage),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/clusters")
async def create_clusters(request: ClusterRequest):
    """Create clusters from provided hotspots."""
    # Update clustering parameters if provided
    if request.eps_km:
        clustering_engine.eps_km = request.eps_km
    if request.min_samples:
        clustering_engine.min_samples = request.min_samples
    
    # Convert Pydantic models to dictionaries
    hotspots_data = [hotspot.model_dump() for hotspot in request.hotspots]
    
    # Perform clustering
    try:
        clusters, analytics = cluster_hotspots(hotspots_data)
        
        # Update storage
        global clusters_storage
        clusters_storage = clusters
        
        # Check for cluster-based alerts
        await alert_manager.check_cluster_alerts(clusters)
        
        return {
            "clusters": clusters,
            "analytics": analytics,
            "parameters": {
                "eps_km": clustering_engine.eps_km,
                "min_samples": clustering_engine.min_samples
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")

async def update_clusters():
    """Background function to update clusters when hotspots change."""
    if len(hotspots_storage) < 2:
        return
    
    try:
        clusters, analytics = cluster_hotspots(hotspots_storage)
        global clusters_storage
        clusters_storage = clusters
        
        # Check for alerts
        await alert_manager.check_cluster_alerts(clusters)
        
    except Exception as e:
        await alert_manager.send_system_update(
            f"Clustering update failed: {str(e)}"
        )

# Route Optimization Endpoints
@app.get("/routes")
async def get_routes():
    """Get current routes."""
    return {
        "routes": routes_storage,
        "count": len(routes_storage),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/routes/optimize")
async def optimize_routes(request: RouteRequest):
    """Optimize collection routes based on clusters."""
    try:
        # Convert Pydantic models to dictionaries for vehicles
        vehicles_data = []
        if request.vehicles:
            vehicles_data = [vehicle.model_dump() for vehicle in request.vehicles]
        
        # Optimize routes
        routes = optimize_collection_routes(request.clusters, vehicles_data)
        
        # Update storage
        global routes_storage
        routes_storage = routes
        
        # Send success alert
        await alert_manager.send_system_update(
            f"Routes optimized: {len(routes)} routes generated",
            {"total_routes": len(routes), "total_clusters": len(request.clusters)}
        )
        
        return {
            "routes": routes,
            "summary": {
                "total_routes": len(routes),
                "total_locations": sum(route.get('total_locations', 0) for route in routes),
                "total_distance_km": sum(route.get('total_distance_km', 0) for route in routes),
                "total_time_minutes": sum(route.get('total_time_minutes', 0) for route in routes)
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {str(e)}")

# Alert Management Endpoints
@app.get("/alerts")
async def get_alerts():
    """Get active alerts."""
    return {
        "active_alerts": alert_manager.get_active_alerts(),
        "count": len(alert_manager.active_alerts),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/alerts/history")
async def get_alert_history(limit: int = 50):
    """Get alert history."""
    return {
        "alert_history": alert_manager.get_alert_history(limit),
        "count": len(alert_manager.alert_history),
        "timestamp": datetime.now().isoformat()
    }

@app.delete("/alerts")
async def clear_alerts():
    """Clear all active alerts."""
    alert_manager.clear_alerts()
    return {
        "message": "All alerts cleared",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/alerts/settings")
async def update_alert_settings(settings: AlertSettings):
    """Update alert settings."""
    alert_manager.severity_threshold = settings.severity_threshold
    
    return {
        "message": "Alert settings updated",
        "settings": {
            "severity_threshold": alert_manager.severity_threshold,
            "simulation_interval": settings.simulation_interval
        },
        "timestamp": datetime.now().isoformat()
    }

# Server-Sent Events for Real-time Alerts
@app.get("/alerts/stream")
async def alert_stream():
    """Stream real-time alerts via Server-Sent Events."""
    async def event_stream():
        queue = asyncio.Queue()
        alert_manager.add_subscriber(queue)
        
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Alert stream connected'})}\n\n"
            
            while True:
                try:
                    # Wait for new alert with timeout
                    alert_data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {alert_data}\n\n"
                except asyncio.TimeoutError:
                    # Send heartbeat
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"
                    
        except asyncio.CancelledError:
            pass
        finally:
            alert_manager.remove_subscriber(queue)
    
    return StreamingResponse(
        event_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# Simulation Management Endpoints
@app.post("/simulation/start")
async def start_simulation(interval_seconds: int = 120):
    """Start hotspot simulation."""
    if interval_seconds < 30 or interval_seconds > 3600:
        raise HTTPException(status_code=400, detail="Interval must be between 30 and 3600 seconds")
    
    success = await simulation_manager.start_simulation(interval_seconds)
    
    if not success:
        raise HTTPException(status_code=409, detail="Simulation is already running")
    
    return {
        "message": "Simulation started successfully",
        "interval_seconds": interval_seconds,
        "status": "running"
    }

@app.post("/simulation/stop")
async def stop_simulation():
    """Stop hotspot simulation."""
    success = await simulation_manager.stop_simulation()
    
    if not success:
        raise HTTPException(status_code=409, detail="Simulation is not running")
    
    return {
        "message": "Simulation stopped successfully",
        "status": "stopped"
    }

@app.get("/simulation/status")
async def get_simulation_status():
    """Get simulation status."""
    return {
        "is_running": simulation_manager.is_running,
        "interval_seconds": simulation_manager.interval_seconds,
        "status": "running" if simulation_manager.is_running else "stopped",
        "timestamp": datetime.now().isoformat()
    }

# Data Management Endpoints
@app.post("/data/reset")
async def reset_data():
    """Reset all data (for demo purposes)."""
    global hotspots_storage, clusters_storage, routes_storage
    
    hotspots_storage.clear()
    clusters_storage.clear()
    routes_storage.clear()
    alert_manager.clear_alerts()
    
    await alert_manager.send_system_update("All data has been reset")
    
    return {
        "message": "All data reset successfully",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/data/sample")
async def load_sample_data():
    """Load sample data for demonstration."""
    sample_hotspots = [
        {
            "id": "hotspot_1",
            "lat": 37.7749,
            "lng": -122.4194,
            "severity": 8,
            "timestamp": "2025-08-30T10:00:00",
            "source": "sample"
        },
        {
            "id": "hotspot_2", 
            "lat": 37.7849,
            "lng": -122.4094,
            "severity": 6,
            "timestamp": "2025-08-30T10:15:00",
            "source": "sample"
        },
        {
            "id": "hotspot_3",
            "lat": 37.7649,
            "lng": -122.4294,
            "severity": 9,
            "timestamp": "2025-08-30T10:30:00",
            "source": "sample"
        },
        {
            "id": "hotspot_4",
            "lat": 37.7549,
            "lng": -122.4394,
            "severity": 7,
            "timestamp": "2025-08-30T10:45:00",
            "source": "sample"
        },
        {
            "id": "hotspot_5",
            "lat": 37.7749,
            "lng": -122.4100,
            "severity": 5,
            "timestamp": "2025-08-30T11:00:00",
            "source": "sample"
        }
    ]
    
    global hotspots_storage
    hotspots_storage = sample_hotspots
    
    # Trigger clustering
    await update_clusters()
    
    await alert_manager.send_system_update(
        f"Sample data loaded: {len(sample_hotspots)} hotspots"
    )
    
    return {
        "message": "Sample data loaded successfully",
        "hotspots_count": len(hotspots_storage),
        "clusters_count": len(clusters_storage),
        "timestamp": datetime.now().isoformat()
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "clustering": "active",
            "alerts": "active",
            "routes": "active",
            "simulation": "running" if simulation_manager.is_running else "stopped"
        },
        "data_counts": {
            "hotspots": len(hotspots_storage),
            "clusters": len(clusters_storage),
            "routes": len(routes_storage),
            "active_alerts": len(alert_manager.active_alerts)
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
