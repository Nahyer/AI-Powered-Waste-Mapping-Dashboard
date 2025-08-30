from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json
import os
from datetime import datetime
import uuid

from route_optimizer import optimize_route, RouteRequest, RouteResponse
from clustering import cluster_hotspots, recalculate_clusters_on_new_data

app = FastAPI(title="AI-Powered Waste Mapping Dashboard API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173"
    ],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for MVP
hotspots_data: List[Dict] = []
clusters_data: List[Dict] = []


# Load initial data if available
def load_initial_data():
    data_file = os.path.join(
        os.path.dirname(__file__), "..", "data", "hotspots.json"
    )
    if os.path.exists(data_file):
        with open(data_file, "r") as f:
            data = json.load(f)
            return data.get("points", [])
    return []


# Mock clusters data for testing route optimization
def generate_mock_clusters():
    """Generate mock cluster data for testing route optimization."""
    return [
        {
            "id": "cluster_1",
            "centroid": {"lat": 37.7749, "lng": -122.4194},
            "severity": 7,
            "count": 12,
            "points": []
        },
        {
            "id": "cluster_2",
            "centroid": {"lat": 37.7849, "lng": -122.4094},
            "severity": 5,
            "count": 8,
            "points": []
        },
        {
            "id": "cluster_3",
            "centroid": {"lat": 37.7649, "lng": -122.4294},
            "severity": 9,
            "count": 15,
            "points": []
        },
        {
            "id": "cluster_4",
            "centroid": {"lat": 37.7549, "lng": -122.4394},
            "severity": 6,
            "count": 10,
            "points": []
        }
    ]


def update_clusters():
    """Update clusters based on current hotspot data using Agent 2 clustering."""
    global clusters_data
    if hotspots_data:
        clusters_data = cluster_hotspots(hotspots_data, algorithm="dbscan")
    else:
        clusters_data = []


@app.on_event("startup")
async def startup_event():
    global hotspots_data, clusters_data
    hotspots_data = load_initial_data()
    # Use real clustering instead of mock data
    update_clusters()


@app.get("/")
async def root():
    return {
        "message": "AI-Powered Waste Mapping Dashboard API",
        "status": "running"
    }


@app.get("/hotspots")
async def get_hotspots():
    """Get all hotspot points."""
    return {"points": hotspots_data}


@app.post("/hotspots")
async def add_hotspot(hotspot: dict):
    """Add a new hotspot point and trigger re-clustering."""
    new_hotspot = {
        "id": str(uuid.uuid4()),
        "lat": hotspot["lat"],
        "lng": hotspot["lng"],
        "severity": hotspot["severity"],
        "timestamp": datetime.now().isoformat()
    }
    hotspots_data.append(new_hotspot)
    
    # Agent 2 - Trigger re-clustering when new data is added
    update_clusters()
    
    return {"ok": True, "point": new_hotspot}


@app.get("/clusters")
async def get_clusters():
    """Get clustered hotspot data using Agent 2 clustering algorithms."""
    return {
        "clusters": clusters_data,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/clusters/recalculate")
async def recalculate_clusters():
    """Manually trigger cluster recalculation."""
    update_clusters()
    return {
        "ok": True,
        "clusters_count": len(clusters_data),
        "timestamp": datetime.now().isoformat()
    }


@app.post("/route", response_model=RouteResponse)
async def generate_route(request: RouteRequest):
    """
    Generate optimal waste collection route.
    
    Agent 4 - Route Optimization & Display
    - Uses nearest-neighbor heuristic with optional 2-opt improvement
    - Returns ordered list of cluster centroids
    - Keeps runtime under 200ms
    """
    try:
        # Use current clusters or filter by requested cluster IDs
        clusters_to_route = clusters_data
        
        if request.clusterIds:
            # Filter clusters by requested IDs
            clusters_to_route = [
                cluster for cluster in clusters_data
                if cluster["id"] in request.clusterIds
            ]
        
        if not clusters_to_route:
            return RouteResponse(route=[], distance_meters=0.0)
        
        # Generate optimized route
        route_result = optimize_route(
            clusters=clusters_to_route,
            start_point=request.start,
            apply_2opt=True
        )
        
        return route_result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Route optimization failed: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "hotspots_count": len(hotspots_data),
        "clusters_count": len(clusters_data)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
