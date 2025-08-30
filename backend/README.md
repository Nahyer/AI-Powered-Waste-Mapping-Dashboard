# Agent 4 - Route Optimization & Display

## Overview
Agent 4 implements the route optimization feature for the AI-Powered Waste Mapping Dashboard. It provides an API endpoint that generates optimal waste collection routes using nearest-neighbor heuristic with optional 2-opt improvement.

## Features
- `/route` endpoint that accepts cluster data and returns optimized route
- Nearest-neighbor algorithm for initial route generation
- Optional 2-opt improvement for route optimization
- Configurable starting point for routes
- Distance calculation using Haversine formula
- Runtime kept under 200ms as per requirements

## API Contract

### POST /route
Generates optimal waste collection route from cluster centroids.

**Request Body:**
```json
{
  "start": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "clusterIds": ["cluster_1", "cluster_2"]
}
```

**Response:**
```json
{
  "route": [
    {
      "id": "cluster_1",
      "lat": 37.7749,
      "lng": -122.4194,
      "order": 0
    },
    {
      "id": "cluster_2", 
      "lat": 37.7849,
      "lng": -122.4094,
      "order": 1
    }
  ],
  "distance_meters": 1250.5
}
```

## Algorithm Details

### Nearest-Neighbor Heuristic
1. Start from specified point or first cluster
2. Find nearest unvisited cluster
3. Move to nearest cluster and mark as visited
4. Repeat until all clusters visited
5. Calculate total distance

### 2-Opt Improvement (Optional)
- Applied when route has 4+ points and time budget allows
- Swaps edges if it reduces total distance
- Single pass implementation for speed
- Improves route quality while staying under 200ms limit

## Installation & Setup

### Prerequisites
- Python 3.8+
- FastAPI
- Uvicorn

### Install Dependencies
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Run Backend
```powershell
uvicorn backend.main:app --reload --port 8000
```

## Testing & Verification

### Manual Test Steps
1. **Start backend:**
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --reload --port 8000
   ```

2. **Test route generation:**
   ```powershell
   curl -X POST http://localhost:8000/route -H "Content-Type: application/json" -d "{}"
   ```

3. **Verify route optimization:**
   - Check that route contains all cluster centroids
   - Verify distance calculation is reasonable
   - Confirm response time is under 200ms

### Additional Tests
- Test with custom start point
- Test with filtered cluster IDs
- Test with single cluster (edge case)
- Test with empty cluster list

## Files Structure
```
backend/
├── main.py              # FastAPI app with /route endpoint
├── route_optimizer.py   # Route optimization algorithms
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## Dependencies
- `fastapi==0.104.1` - Web framework
- `uvicorn==0.24.0` - ASGI server
- `pydantic==2.5.0` - Data validation
- `python-multipart==0.0.6` - Form data support

## Integration Notes
- Frontend should call `/route` endpoint when "Generate Optimal Route" button is clicked
- Route response can be used to draw polyline on Leaflet map
- Clusters data comes from Agent 2 (clustering endpoint)
- Route coordinates are in lat/lng format ready for mapping libraries

## Performance
- Algorithm complexity: O(n²) for nearest-neighbor, O(n²) for 2-opt
- Target runtime: <200ms for typical cluster counts (5-20 clusters)
- Memory usage: O(n) for storing route and distance calculations
