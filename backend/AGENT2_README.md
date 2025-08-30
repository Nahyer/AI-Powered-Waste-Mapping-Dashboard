# Agent 2 - AI/ML Hotspot Clustering

## Overview
Agent 2 implements AI/ML clustering algorithms to group nearby waste reports into logical clusters. It provides intelligent hotspot detection using DBSCAN (preferred) or K-Means clustering algorithms.

## Features
- **DBSCAN Clustering**: Density-based clustering ideal for irregular cluster shapes
- **K-Means Clustering**: Fallback option with automatic k-selection
- **Dynamic Re-clustering**: Automatically recalculates when new hotspots are added
- **Severity Calculation**: Intelligent cluster severity based on constituent points
- **API Integration**: Seamless integration with `/clusters` endpoint

## Algorithms

### DBSCAN (Preferred)
- **Parameters**: eps=0.002 (~200m), min_samples=3
- **Advantages**: Finds clusters of arbitrary shape, handles noise points
- **Output**: Variable number of clusters based on data density

### K-Means (Fallback)
- **Parameters**: Auto-determined k using sqrt(n/2) heuristic
- **Advantages**: Guaranteed cluster formation, good for evenly distributed data
- **Output**: Fixed number of clusters

## API Endpoints

### GET /clusters
Returns clustered hotspot data using AI/ML algorithms.

**Response:**
```json
{
  "clusters": [
    {
      "id": "cluster_abc123",
      "centroid": {
        "lat": 37.7749,
        "lng": -122.4194
      },
      "severity": 8,
      "count": 5,
      "points": [
        {
          "id": "hotspot_1",
          "lat": 37.7749,
          "lng": -122.4194,
          "severity": 8
        }
      ]
    }
  ],
  "timestamp": "2025-08-30T12:00:00Z"
}
```

### POST /clusters/recalculate
Manually trigger cluster recalculation.

**Response:**
```json
{
  "ok": true,
  "clusters_count": 4,
  "timestamp": "2025-08-30T12:00:00Z"
}
```

## Clustering Logic

### Severity Calculation
Cluster severity is calculated using weighted average of constituent points:
- Higher severity points contribute more weight
- Recency bias can be applied (future enhancement)
- Result clamped to 1-10 scale

### Distance Metrics
- Uses geographic distance (lat/lng) for spatial clustering
- DBSCAN eps parameter tuned for urban waste management (~200m)
- Handles edge cases (single points, empty data)

## Installation & Dependencies

### Additional Requirements
```txt
scikit-learn==1.3.2
numpy==1.24.3
```

### Install
```powershell
pip install scikit-learn numpy
```

## Testing & Verification

### Manual Test Steps
1. **Start backend with clustering:**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --reload --port 8000
   ```

2. **Test clustering endpoint:**
   ```powershell
   curl http://localhost:8000/clusters
   ```

3. **Add hotspot and verify re-clustering:**
   ```powershell
   curl -X POST http://localhost:8000/hotspots -H "Content-Type: application/json" -d '{"lat": 37.7749, "lng": -122.4194, "severity": 8}'
   curl http://localhost:8000/clusters
   ```

### Run Test Script
```powershell
python test_clustering.py
```

## Algorithm Parameters

### DBSCAN Configuration
- **eps**: 0.002 degrees (~200 meters in lat/lng)
- **min_samples**: 3 points minimum for cluster formation
- **metric**: Euclidean distance on lat/lng coordinates

### K-Means Configuration  
- **k**: Auto-calculated as min(5, max(2, sqrt(n/2)))
- **init**: k-means++ for better centroid initialization
- **random_state**: 42 for reproducible results

## Integration Points

### With Agent 1 (Frontend)
- Frontend calls `/clusters` to get cluster data for heatmap visualization
- Cluster centroids used for marker placement and intensity

### With Agent 3 (Alerts)
- New cluster formation triggers alert events
- Severity threshold crossing (>=5) generates notifications

### With Agent 4 (Route Optimization)
- Cluster centroids fed into route optimization algorithm
- Optimized collection routes connect cluster centers

### With Agent 5 (Manual Submission)
- Manual hotspot submission triggers automatic re-clustering
- UI updates reflect new cluster formation in real-time

## Performance
- **DBSCAN**: O(n log n) with spatial indexing
- **K-Means**: O(ikn) where i=iterations, k=clusters, n=points
- **Memory**: O(n) for point storage and cluster results
- **Typical runtime**: <100ms for 50-100 hotspots

## Edge Cases Handled
- **Empty data**: Returns empty cluster list
- **Single point**: Creates individual cluster  
- **Insufficient points**: Falls back to individual clusters
- **Invalid coordinates**: Skips malformed data points
- **Duplicate points**: Handled naturally by clustering algorithms
