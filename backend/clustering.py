from typing import List, Dict, Any, Tuple
import math
import uuid
from datetime import datetime
from dataclasses import dataclass
import numpy as np
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler


@dataclass
class HotspotPoint:
    """Data structure for individual hotspot points."""
    id: str
    lat: float
    lng: float
    severity: int
    timestamp: str


@dataclass 
class ClusterResult:
    """Data structure for clustering results."""
    id: str
    centroid: Dict[str, float]  # {"lat": float, "lng": float}
    severity: int
    count: int
    points: List[Dict[str, Any]]


def calculate_cluster_severity(points: List[HotspotPoint]) -> int:
    """
    Calculate cluster severity based on constituent points.
    Uses weighted average with recency bias.
    """
    if not points:
        return 1
    
    total_weighted_severity = 0
    total_weight = 0
    
    for point in points:
        # Weight by severity and recency (newer points get higher weight)
        severity_weight = point.severity
        # Simple recency weight - can be enhanced with actual time parsing
        recency_weight = 1.0  # For MVP, treat all points equally recent
        
        weight = severity_weight * recency_weight
        total_weighted_severity += point.severity * weight
        total_weight += weight
    
    if total_weight == 0:
        return int(sum(p.severity for p in points) / len(points))
    
    return min(10, max(1, int(total_weighted_severity / total_weight)))


def convert_to_cartesian(lat: float, lng: float) -> Tuple[float, float, float]:
    """Convert lat/lng to Cartesian coordinates for better clustering."""
    # Convert degrees to radians
    lat_rad = math.radians(lat)
    lng_rad = math.radians(lng)
    
    # Earth radius in km (for distance scaling)
    R = 6371.0
    
    # Convert to 3D Cartesian coordinates
    x = R * math.cos(lat_rad) * math.cos(lng_rad)
    y = R * math.cos(lat_rad) * math.sin(lng_rad)
    z = R * math.sin(lat_rad)
    
    return x, y, z


def convert_to_geographic(x: float, y: float, z: float) -> Tuple[float, float]:
    """Convert Cartesian coordinates back to lat/lng."""
    R = 6371.0
    
    lat_rad = math.asin(z / R)
    lng_rad = math.atan2(y, x)
    
    lat = math.degrees(lat_rad)
    lng = math.degrees(lng_rad)
    
    return lat, lng


def dbscan_clustering(points: List[HotspotPoint], eps: float = 0.002, min_samples: int = 3) -> List[ClusterResult]:
    """
    Perform DBSCAN clustering on hotspot points.
    
    Args:
        points: List of hotspot points to cluster
        eps: Maximum distance between samples (approx 200m at ~0.002 degrees)
        min_samples: Minimum samples in a neighborhood for a core point
    
    Returns:
        List of cluster results
    """
    if len(points) < min_samples:
        # If not enough points for clustering, return individual clusters
        return [
            ClusterResult(
                id=f"cluster_{point.id}",
                centroid={"lat": point.lat, "lng": point.lng},
                severity=point.severity,
                count=1,
                points=[{
                    "lat": point.lat,
                    "lng": point.lng, 
                    "severity": point.severity,
                    "id": point.id
                }]
            ) for point in points
        ]
    
    # Convert to coordinates suitable for clustering
    coordinates = np.array([[point.lat, point.lng] for point in points])
    
    # Perform DBSCAN clustering
    clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(coordinates)
    labels = clustering.labels_
    
    # Group points by cluster
    clusters = {}
    noise_points = []
    
    for i, label in enumerate(labels):
        if label == -1:  # Noise point
            noise_points.append(points[i])
        else:
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(points[i])
    
    results = []
    
    # Process clusters
    for cluster_id, cluster_points in clusters.items():
        if not cluster_points:
            continue
            
        # Calculate centroid
        centroid_lat = sum(p.lat for p in cluster_points) / len(cluster_points)
        centroid_lng = sum(p.lng for p in cluster_points) / len(cluster_points)
        
        # Calculate cluster severity
        cluster_severity = calculate_cluster_severity(cluster_points)
        
        results.append(ClusterResult(
            id=f"cluster_{uuid.uuid4().hex[:8]}",
            centroid={"lat": centroid_lat, "lng": centroid_lng},
            severity=cluster_severity,
            count=len(cluster_points),
            points=[{
                "lat": p.lat,
                "lng": p.lng,
                "severity": p.severity,
                "id": p.id
            } for p in cluster_points]
        ))
    
    # Handle noise points as individual clusters
    for noise_point in noise_points:
        results.append(ClusterResult(
            id=f"cluster_{noise_point.id}",
            centroid={"lat": noise_point.lat, "lng": noise_point.lng},
            severity=noise_point.severity,
            count=1,
            points=[{
                "lat": noise_point.lat,
                "lng": noise_point.lng,
                "severity": noise_point.severity,
                "id": noise_point.id
            }]
        ))
    
    return results


def kmeans_clustering(points: List[HotspotPoint], k: int = None) -> List[ClusterResult]:
    """
    Perform K-Means clustering on hotspot points.
    Fallback option if DBSCAN is not available.
    
    Args:
        points: List of hotspot points to cluster
        k: Number of clusters (auto-determined if None)
    
    Returns:
        List of cluster results
    """
    if len(points) < 2:
        return [
            ClusterResult(
                id=f"cluster_{point.id}",
                centroid={"lat": point.lat, "lng": point.lng},
                severity=point.severity,
                count=1,
                points=[{
                    "lat": point.lat,
                    "lng": point.lng,
                    "severity": point.severity,
                    "id": point.id
                }]
            ) for point in points
        ]
    
    # Auto-determine k using elbow method heuristic
    if k is None:
        k = min(5, max(2, int(math.sqrt(len(points) / 2))))
    
    # Convert to coordinates
    coordinates = np.array([[point.lat, point.lng] for point in points])
    
    # Perform K-Means clustering
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10).fit(coordinates)
    labels = kmeans.labels_
    centroids = kmeans.cluster_centers_
    
    # Group points by cluster
    clusters = {}
    for i, label in enumerate(labels):
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(points[i])
    
    results = []
    
    # Process clusters
    for cluster_id, cluster_points in clusters.items():
        if not cluster_points:
            continue
        
        # Use K-means centroid
        centroid_lat = centroids[cluster_id][0]
        centroid_lng = centroids[cluster_id][1]
        
        # Calculate cluster severity
        cluster_severity = calculate_cluster_severity(cluster_points)
        
        results.append(ClusterResult(
            id=f"cluster_{uuid.uuid4().hex[:8]}",
            centroid={"lat": centroid_lat, "lng": centroid_lng},
            severity=cluster_severity,
            count=len(cluster_points),
            points=[{
                "lat": p.lat,
                "lng": p.lng,
                "severity": p.severity,
                "id": p.id
            } for p in cluster_points]
        ))
    
    return results


def cluster_hotspots(points_data: List[Dict[str, Any]], algorithm: str = "dbscan") -> List[Dict[str, Any]]:
    """
    Main clustering function that processes hotspot data and returns clustered results.
    
    Args:
        points_data: List of hotspot dictionaries with id, lat, lng, severity, timestamp
        algorithm: Clustering algorithm ("dbscan" or "kmeans")
    
    Returns:
        List of cluster dictionaries in API format
    """
    # Convert to HotspotPoint objects
    points = []
    for point_data in points_data:
        try:
            points.append(HotspotPoint(
                id=point_data.get("id", str(uuid.uuid4())),
                lat=float(point_data["lat"]),
                lng=float(point_data["lng"]),
                severity=int(point_data.get("severity", 1)),
                timestamp=point_data.get("timestamp", datetime.now().isoformat())
            ))
        except (KeyError, ValueError, TypeError) as e:
            # Skip invalid points
            print(f"Skipping invalid point {point_data}: {e}")
            continue
    
    if not points:
        return []
    
    # Perform clustering
    if algorithm.lower() == "kmeans":
        clusters = kmeans_clustering(points)
    else:  # Default to DBSCAN
        clusters = dbscan_clustering(points)
    
    # Convert to API format
    return [
        {
            "id": cluster.id,
            "centroid": cluster.centroid,
            "severity": cluster.severity,
            "count": cluster.count,
            "points": cluster.points
        }
        for cluster in clusters
    ]


def recalculate_clusters_on_new_data(existing_points: List[Dict[str, Any]], 
                                   new_points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Recalculate clusters when new data points are added.
    This function is called when POST /hotspots receives new data.
    
    Args:
        existing_points: Current hotspot points
        new_points: Newly added hotspot points
    
    Returns:
        Updated cluster results
    """
    # Combine existing and new points
    all_points = existing_points + new_points
    
    # Perform fresh clustering on all data
    return cluster_hotspots(all_points, algorithm="dbscan")
