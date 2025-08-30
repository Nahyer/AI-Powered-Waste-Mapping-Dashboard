#!/usr/bin/env python3
"""
Test script for Agent 4 - Route Optimization & Display
Demonstrates the route optimization functionality with sample data.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from route_optimizer import optimize_route, Coordinate

def test_route_optimization():
    """Test the route optimization with sample cluster data."""
    print("🚛 Testing Agent 4 - Route Optimization & Display")
    print("=" * 50)
    
    # Sample cluster data (San Francisco area)
    sample_clusters = [
        {
            "id": "cluster_downtown",
            "centroid": {"lat": 37.7749, "lng": -122.4194},
            "severity": 8,
            "count": 15,
            "points": []
        },
        {
            "id": "cluster_mission",
            "centroid": {"lat": 37.7599, "lng": -122.4148},
            "severity": 6,
            "count": 10,
            "points": []
        },
        {
            "id": "cluster_castro",
            "centroid": {"lat": 37.7609, "lng": -122.4350},
            "severity": 9,
            "count": 20,
            "points": []
        },
        {
            "id": "cluster_haight",
            "centroid": {"lat": 37.7694, "lng": -122.4477},
            "severity": 7,
            "count": 12,
            "points": []
        },
        {
            "id": "cluster_north_beach",
            "centroid": {"lat": 37.8006, "lng": -122.4103},
            "severity": 5,
            "count": 8,
            "points": []
        }
    ]
    
    print(f"📍 Input: {len(sample_clusters)} cluster centroids")
    for cluster in sample_clusters:
        centroid = cluster['centroid']
        print(f"  - {cluster['id']}: ({centroid['lat']:.4f}, {centroid['lng']:.4f}) severity: {cluster['severity']}")
    
    print("\n🔍 Testing Route Optimization:")
    
    # Test 1: Basic route optimization
    print("\n1. Basic route optimization (no start point):")
    route_result = optimize_route(sample_clusters, apply_2opt=True)
    
    print(f"   ✅ Generated route with {len(route_result.route)} points")
    print(f"   📏 Total distance: {route_result.distance_meters:.1f} meters")
    print("   📋 Route order:")
    
    for point in route_result.route:
        print(f"     {point.order + 1}. {point.id} ({point.lat:.4f}, {point.lng:.4f})")
    
    # Test 2: Route with custom start point
    print("\n2. Route with custom start point:")
    start_point = Coordinate(lat=37.7849, lng=-122.4094)  # Near Financial District
    route_with_start = optimize_route(sample_clusters, start_point=start_point, apply_2opt=True)
    
    print(f"   🚩 Start point: ({start_point.lat:.4f}, {start_point.lng:.4f})")
    print(f"   ✅ Generated route with {len(route_with_start.route)} points")
    print(f"   📏 Total distance: {route_with_start.distance_meters:.1f} meters")
    print("   📋 Route order:")
    
    for point in route_with_start.route:
        print(f"     {point.order + 1}. {point.id} ({point.lat:.4f}, {point.lng:.4f})")
    
    # Test 3: Compare with and without 2-opt
    print("\n3. Comparing nearest-neighbor vs 2-opt optimization:")
    route_basic = optimize_route(sample_clusters, apply_2opt=False)
    route_optimized = optimize_route(sample_clusters, apply_2opt=True)
    
    improvement = route_basic.distance_meters - route_optimized.distance_meters
    improvement_percent = (improvement / route_basic.distance_meters) * 100 if route_basic.distance_meters > 0 else 0
    
    print(f"   📊 Nearest-neighbor only: {route_basic.distance_meters:.1f}m")
    print(f"   📊 With 2-opt improvement: {route_optimized.distance_meters:.1f}m")
    print(f"   📈 Improvement: {improvement:.1f}m ({improvement_percent:.1f}%)")
    
    print("\n✅ Agent 4 Route Optimization Test Complete!")
    print("\n🔗 API Integration:")
    print("   POST /route → Returns optimized route JSON")
    print("   Frontend can draw polyline using route coordinates")
    print("   Distance calculation helps estimate fuel savings")


if __name__ == "__main__":
    test_route_optimization()
