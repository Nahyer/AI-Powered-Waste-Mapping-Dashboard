"""
Agent 2 - Clustering & Analytics Engine
Performs DBSCAN clustering on waste hotspots and provides analytics.
"""

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import math


@dataclass
class HotspotPoint:
    id: str
    lat: float
    lng: float
    severity: int
    timestamp: str
    cluster_id: Optional[int] = None


class ClusteringEngine:
    def __init__(self, eps_km: float = 0.5, min_samples: int = 2):
        """
        Initialize clustering engine.
        
        Args:
            eps_km: Maximum distance between points in kilometers
            min_samples: Minimum number of samples in a cluster
        """
        self.eps_km = eps_km
        self.min_samples = min_samples
        self.scaler = StandardScaler()
        self.last_clusters = []
        
    def haversine_distance(self, lat1: float, lon1: float, 
                          lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points 
        on the earth (specified in decimal degrees) in kilometers.
        """
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = (math.sin(dlat/2)**2 + 
             math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2)
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        return c * r

    def prepare_features(self, hotspots: List[HotspotPoint]) -> np.ndarray:
        """
        Prepare features for clustering including coordinates and severity.
        """
        if not hotspots:
            return np.array([]).reshape(0, 3)
            
        features = []
        for hotspot in hotspots:
            # Use lat, lng, and weighted severity
            features.append([
                hotspot.lat,
                hotspot.lng,
                hotspot.severity * 0.1  # Weight severity less than location
            ])
        
        return np.array(features)

    def custom_distance_metric(self, X: np.ndarray) -> np.ndarray:
        """
        Custom distance metric combining geographic distance with severity.
        """
        n_samples = len(X)
        distances = np.zeros((n_samples, n_samples))
        
        for i in range(n_samples):
            for j in range(i + 1, n_samples):
                # Geographic distance (Haversine)
                geo_dist = self.haversine_distance(
                    X[i][0], X[i][1], X[j][0], X[j][1]
                )
                
                # Severity difference (normalized)
                severity_diff = abs(X[i][2] - X[j][2]) * 10  # Convert back from scaled
                
                # Combined distance (weighted towards geography)
                combined_dist = geo_dist + (severity_diff * 0.1)
                
                distances[i][j] = combined_dist
                distances[j][i] = combined_dist
        
        return distances

    def perform_clustering(self, hotspots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Perform DBSCAN clustering on hotspots.
        
        Returns:
            List of cluster information with member hotspots
        """
        if not hotspots:
            return []

        # Convert to HotspotPoint objects
        hotspot_points = [
            HotspotPoint(
                id=h.get('id', ''),
                lat=float(h.get('lat', 0)),
                lng=float(h.get('lng', 0)),
                severity=int(h.get('severity', 0)),
                timestamp=h.get('timestamp', '')
            )
            for h in hotspots
        ]

        if len(hotspot_points) < self.min_samples:
            # Not enough points for clustering, return individual points as clusters
            clusters = []
            for i, hotspot in enumerate(hotspot_points):
                clusters.append({
                    'id': f'single_{i}',
                    'center_lat': hotspot.lat,
                    'center_lng': hotspot.lng,
                    'severity': hotspot.severity,
                    'count': 1,
                    'members': [hotspot.id],
                    'avg_severity': hotspot.severity,
                    'max_severity': hotspot.severity,
                    'timestamps': [hotspot.timestamp]
                })
            return clusters

        # Prepare features
        features = self.prepare_features(hotspot_points)
        
        # Perform DBSCAN clustering
        # Convert eps from km to approximate degrees (rough approximation)
        eps_degrees = self.eps_km / 111.0  # 1 degree ≈ 111 km
        
        dbscan = DBSCAN(eps=eps_degrees, min_samples=self.min_samples)
        cluster_labels = dbscan.fit_predict(features[:, :2])  # Only use lat/lng for clustering
        
        # Process clusters
        clusters = []
        unique_labels = set(cluster_labels)
        
        for label in unique_labels:
            if label == -1:  # Noise points
                continue
                
            # Get all points in this cluster
            cluster_mask = cluster_labels == label
            cluster_hotspots = [hotspot_points[i] for i in range(len(hotspot_points)) 
                              if cluster_mask[i]]
            
            if not cluster_hotspots:
                continue
            
            # Calculate cluster statistics
            latitudes = [h.lat for h in cluster_hotspots]
            longitudes = [h.lng for h in cluster_hotspots]
            severities = [h.severity for h in cluster_hotspots]
            
            center_lat = sum(latitudes) / len(latitudes)
            center_lng = sum(longitudes) / len(longitudes)
            avg_severity = sum(severities) / len(severities)
            max_severity = max(severities)
            
            cluster_info = {
                'id': f'cluster_{label}',
                'center_lat': center_lat,
                'center_lng': center_lng,
                'severity': round(avg_severity, 1),
                'count': len(cluster_hotspots),
                'members': [h.id for h in cluster_hotspots],
                'avg_severity': round(avg_severity, 1),
                'max_severity': max_severity,
                'timestamps': [h.timestamp for h in cluster_hotspots]
            }
            
            clusters.append(cluster_info)
        
        # Handle noise points as individual clusters
        noise_mask = cluster_labels == -1
        for i, is_noise in enumerate(noise_mask):
            if is_noise:
                hotspot = hotspot_points[i]
                clusters.append({
                    'id': f'noise_{i}',
                    'center_lat': hotspot.lat,
                    'center_lng': hotspot.lng,
                    'severity': hotspot.severity,
                    'count': 1,
                    'members': [hotspot.id],
                    'avg_severity': hotspot.severity,
                    'max_severity': hotspot.severity,
                    'timestamps': [hotspot.timestamp]
                })
        
        # Sort clusters by severity (descending)
        clusters.sort(key=lambda x: x['max_severity'], reverse=True)
        
        # Update last clusters for comparison
        self.last_clusters = clusters.copy()
        
        return clusters

    def get_cluster_analytics(self, clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate analytics from cluster data.
        """
        if not clusters:
            return {
                'total_clusters': 0,
                'total_hotspots': 0,
                'avg_cluster_size': 0,
                'severity_distribution': {'low': 0, 'medium': 0, 'high': 0},
                'largest_cluster': None,
                'most_severe_cluster': None
            }
        
        total_hotspots = sum(cluster['count'] for cluster in clusters)
        avg_cluster_size = total_hotspots / len(clusters) if clusters else 0
        
        # Severity distribution
        severity_dist = {'low': 0, 'medium': 0, 'high': 0}
        for cluster in clusters:
            severity = cluster['max_severity']
            if severity >= 8:
                severity_dist['high'] += 1
            elif severity >= 6:
                severity_dist['medium'] += 1
            else:
                severity_dist['low'] += 1
        
        # Find largest and most severe clusters
        largest_cluster = max(clusters, key=lambda x: x['count']) if clusters else None
        most_severe_cluster = max(clusters, key=lambda x: x['max_severity']) if clusters else None
        
        return {
            'total_clusters': len(clusters),
            'total_hotspots': total_hotspots,
            'avg_cluster_size': round(avg_cluster_size, 1),
            'severity_distribution': severity_dist,
            'largest_cluster': largest_cluster,
            'most_severe_cluster': most_severe_cluster,
            'analysis_timestamp': datetime.now().isoformat()
        }

    def detect_cluster_changes(self, new_clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect changes between current and previous clustering results.
        """
        if not self.last_clusters:
            return {
                'new_clusters': len(new_clusters),
                'removed_clusters': 0,
                'changed_clusters': 0,
                'severity_increases': [],
                'size_changes': []
            }
        
        # This is a simplified change detection
        # In a production system, you'd want more sophisticated matching
        changes = {
            'new_clusters': max(0, len(new_clusters) - len(self.last_clusters)),
            'removed_clusters': max(0, len(self.last_clusters) - len(new_clusters)),
            'changed_clusters': 0,
            'severity_increases': [],
            'size_changes': []
        }
        
        return changes


# Global clustering engine instance
clustering_engine = ClusteringEngine(eps_km=0.3, min_samples=2)


def cluster_hotspots(hotspots_data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Main function to cluster hotspots and return results with analytics.
    
    Args:
        hotspots_data: List of hotspot dictionaries
        
    Returns:
        Tuple of (clusters, analytics)
    """
    clusters = clustering_engine.perform_clustering(hotspots_data)
    analytics = clustering_engine.get_cluster_analytics(clusters)
    
    return clusters, analytics
