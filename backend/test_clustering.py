#!/usr/bin/env python3
"""
Test script for Agent 2 - AI/ML Hotspot Clustering
Demonstrates the clustering functionality with sample data.
"""

import sys
import os
import json
sys.path.append(os.path.dirname(__file__))

from clustering import cluster_hotspots, HotspotPoint
from datetime import datetime


def test_clustering_algorithms():
    """Test the clustering algorithms with sample hotspot data."""
    print("🧠 Testing Agent 2 - AI/ML Hotspot Clustering")
    print("=" * 50)
    
    # Sample hotspot data (San Francisco area with realistic clustering scenarios)
    sample_hotspots = [
        # Downtown cluster
        {"id": "h1", "lat": 37.7749, "lng": -122.4194, "severity": 8, "timestamp": "2025-08-30T10:00:00"},
        {"id": "h2", "lat": 37.7759, "lng": -122.4184, "severity": 6, "timestamp": "2025-08-30T10:15:00"},
        {"id": "h3", "lat": 37.7739, "lng": -122.4204, "severity": 7, "timestamp": "2025-08-30T10:30:00"},
        
        # Mission cluster  
        {"id": "h4", "lat": 37.7599, "lng": -122.4148, "severity": 9, "timestamp": "2025-08-30T11:00:00"},
        {"id": "h5", "lat": 37.7609, "lng": -122.4138, "severity": 5, "timestamp": "2025-08-30T11:15:00"},
        {"id": "h6", "lat": 37.7589, "lng": -122.4158, "severity": 8, "timestamp": "2025-08-30T11:30:00"},
        
        # Castro cluster
        {"id": "h7", "lat": 37.7609, "lng": -122.4350, "severity": 6, "timestamp": "2025-08-30T12:00:00"},
        {"id": "h8", "lat": 37.7619, "lng": -122.4340, "severity": 7, "timestamp": "2025-08-30T12:15:00"},
        
        # Isolated point (should form its own cluster or be noise)
        {"id": "h9", "lat": 37.8006, "lng": -122.4103, "severity": 4, "timestamp": "2025-08-30T13:00:00"},
        
        # Additional points for more robust testing
        {"id": "h10", "lat": 37.7755, "lng": -122.4190, "severity": 9, "timestamp": "2025-08-30T13:30:00"},
        {"id": "h11", "lat": 37.7595, "lng": -122.4152, "severity": 7, "timestamp": "2025-08-30T14:00:00"},
    ]
    
    print(f"📍 Input: {len(sample_hotspots)} hotspot points")
    for hotspot in sample_hotspots:
        print(f"  - {hotspot['id']}: ({hotspot['lat']:.4f}, {hotspot['lng']:.4f}) severity: {hotspot['severity']}")
    
    print("\n🔍 Testing DBSCAN Clustering:")
    
    # Test DBSCAN clustering
    dbscan_clusters = cluster_hotspots(sample_hotspots, algorithm="dbscan")
    print(f"   ✅ Generated {len(dbscan_clusters)} clusters using DBSCAN")
    
    for i, cluster in enumerate(dbscan_clusters):
        centroid = cluster['centroid']
        print(f"   📊 Cluster {i+1} (ID: {cluster['id'][:12]}...):")
        print(f"       🎯 Centroid: ({centroid['lat']:.4f}, {centroid['lng']:.4f})")
        print(f"       ⚡ Severity: {cluster['severity']}")
        print(f"       📈 Point count: {cluster['count']}")
        print(f"       📋 Points: {[p['id'] for p in cluster['points']]}")
    
    print("\n🔍 Testing K-Means Clustering:")
    
    # Test K-Means clustering
    kmeans_clusters = cluster_hotspots(sample_hotspots, algorithm="kmeans")
    print(f"   ✅ Generated {len(kmeans_clusters)} clusters using K-Means")
    
    for i, cluster in enumerate(kmeans_clusters):
        centroid = cluster['centroid']
        print(f"   📊 Cluster {i+1} (ID: {cluster['id'][:12]}...):")
        print(f"       🎯 Centroid: ({centroid['lat']:.4f}, {centroid['lng']:.4f})")
        print(f"       ⚡ Severity: {cluster['severity']}")
        print(f"       📈 Point count: {cluster['count']}")
        print(f"       📋 Points: {[p['id'] for p in cluster['points']]}")
    
    # Test edge cases
    print("\n🧪 Testing Edge Cases:")
    
    # Test with minimal data
    minimal_data = [sample_hotspots[0], sample_hotspots[1]]
    minimal_clusters = cluster_hotspots(minimal_data, algorithm="dbscan")
    print(f"   📊 Minimal data (2 points): {len(minimal_clusters)} clusters")
    
    # Test with single point
    single_data = [sample_hotspots[0]]
    single_clusters = cluster_hotspots(single_data, algorithm="dbscan")
    print(f"   📊 Single point: {len(single_clusters)} clusters")
    
    # Test with empty data
    empty_clusters = cluster_hotspots([], algorithm="dbscan")
    print(f"   📊 Empty data: {len(empty_clusters)} clusters")
    
    print("\n📊 Performance Comparison:")
    print(f"   🔹 DBSCAN produced {len(dbscan_clusters)} clusters")
    print(f"   🔹 K-Means produced {len(kmeans_clusters)} clusters")
    
    # Calculate total severity for comparison
    dbscan_total_severity = sum(c['severity'] * c['count'] for c in dbscan_clusters)
    kmeans_total_severity = sum(c['severity'] * c['count'] for c in kmeans_clusters)
    
    print(f"   🔹 DBSCAN total weighted severity: {dbscan_total_severity}")
    print(f"   🔹 K-Means total weighted severity: {kmeans_total_severity}")
    
    print("\n✅ Agent 2 AI/ML Clustering Test Complete!")
    print("\n🔗 API Integration:")
    print("   GET /clusters → Returns clustered hotspot data")
    print("   POST /hotspots → Triggers automatic re-clustering")
    print("   POST /clusters/recalculate → Manual cluster recalculation")
    print("   Clustering adapts to new data dynamically")
    
    # Export sample results for other agents
    sample_output = {
        "dbscan_clusters": dbscan_clusters,
        "kmeans_clusters": kmeans_clusters,
        "sample_hotspots": sample_hotspots,
        "timestamp": datetime.now().isoformat()
    }
    
    with open("clustering_test_results.json", "w") as f:
        json.dump(sample_output, f, indent=2)
    
    print(f"\n💾 Test results saved to 'clustering_test_results.json'")


if __name__ == "__main__":
    test_clustering_algorithms()
