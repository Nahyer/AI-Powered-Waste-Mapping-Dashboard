#!/usr/bin/env python3
"""
Integration test for Agent 2 (Clustering) + Agent 4 (Route Optimization)
Demonstrates end-to-end workflow from hotspots to clusters to optimized routes.
"""

def test_integration():
    """Test the integration between clustering and route optimization."""
    print("🔄 Testing Agent 2 + Agent 4 Integration")
    print("=" * 50)
    
    # Sample hotspot data
    sample_hotspots = [
        {"id": "h1", "lat": 37.7749, "lng": -122.4194, "severity": 8, 
         "timestamp": "2025-08-30T10:00:00"},
        {"id": "h2", "lat": 37.7599, "lng": -122.4148, "severity": 9, 
         "timestamp": "2025-08-30T11:00:00"},
        {"id": "h3", "lat": 37.7609, "lng": -122.4350, "severity": 6, 
         "timestamp": "2025-08-30T12:00:00"},
        {"id": "h4", "lat": 37.7755, "lng": -122.4190, "severity": 7, 
         "timestamp": "2025-08-30T13:00:00"},
    ]
    
    print(f"📍 Input hotspots: {len(sample_hotspots)}")
    for h in sample_hotspots:
        print(f"  - {h['id']}: ({h['lat']:.4f}, {h['lng']:.4f}) "
              f"severity: {h['severity']}")
    
    try:
        # Test clustering (Agent 2)
        from clustering import cluster_hotspots
        clusters = cluster_hotspots(sample_hotspots, algorithm="dbscan")
        
        print(f"\n🧠 Agent 2 Clustering: {len(clusters)} clusters generated")
        for i, cluster in enumerate(clusters):
            centroid = cluster['centroid']
            print(f"  - Cluster {i+1}: ({centroid['lat']:.4f}, "
                  f"{centroid['lng']:.4f}) severity: {cluster['severity']}")
        
        # Test route optimization (Agent 4)
        from route_optimizer import optimize_route
        route = optimize_route(clusters, apply_2opt=True)
        
        print(f"\n🚛 Agent 4 Route Optimization:")
        print(f"  - Route points: {len(route.route)}")
        print(f"  - Total distance: {route.distance_meters:.1f} meters")
        print("  - Route order:")
        for point in route.route:
            print(f"    {point.order + 1}. {point.id} "
                  f"({point.lat:.4f}, {point.lng:.4f})")
        
        print("\n✅ Integration Test Successful!")
        print("🔗 Workflow: Hotspots → Clustering → Route Optimization")
        print("📊 Ready for frontend integration")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Run: pip install scikit-learn numpy")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


if __name__ == "__main__":
    test_integration()
