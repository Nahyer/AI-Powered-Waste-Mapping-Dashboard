from typing import List, Optional, Dict, Any
import math
import time
from pydantic import BaseModel


class Coordinate(BaseModel):
    lat: float
    lng: float


class RoutePoint(BaseModel):
    id: str
    lat: float
    lng: float
    order: int


class RouteRequest(BaseModel):
    start: Optional[Coordinate] = None
    clusterIds: Optional[List[str]] = None


class RouteResponse(BaseModel):
    route: List[RoutePoint]
    distance_meters: float


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth (specified in decimal degrees).
    Returns distance in meters using the Haversine formula.
    """
    # Convert decimal degrees to radians
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    return c * r


def nearest_neighbor_route(clusters: List[Dict], start_point: Optional[Coordinate] = None) -> RouteResponse:
    """
    Generate optimal route using nearest-neighbor heuristic.
    Optionally starts from a specified point, otherwise starts from first cluster.
    """
    if not clusters:
        return RouteResponse(route=[], distance_meters=0.0)
    
    # Extract cluster centroids
    points = []
    for cluster in clusters:
        centroid = cluster['centroid']
        points.append({
            'id': cluster['id'],
            'lat': centroid['lat'],
            'lng': centroid['lng']
        })
    
    if len(points) == 1:
        return RouteResponse(
            route=[RoutePoint(id=points[0]['id'], lat=points[0]['lat'], lng=points[0]['lng'], order=0)],
            distance_meters=0.0
        )
    
    # Determine starting point
    if start_point:
        current = {'id': 'start', 'lat': start_point.lat, 'lng': start_point.lng}
        unvisited = points[:]
    else:
        current = points[0]
        unvisited = points[1:]
    
    route = []
    total_distance = 0.0
    order = 0
    
    # Add starting point to route if it's not a cluster
    if start_point:
        route.append(RoutePoint(id=current['id'], lat=current['lat'], lng=current['lng'], order=order))
        order += 1
    else:
        route.append(RoutePoint(id=current['id'], lat=current['lat'], lng=current['lng'], order=order))
        order += 1
    
    # Nearest neighbor algorithm
    while unvisited:
        nearest_point = None
        min_distance = float('inf')
        
        # Find nearest unvisited point
        for point in unvisited:
            distance = calculate_distance(current['lat'], current['lng'], point['lat'], point['lng'])
            if distance < min_distance:
                min_distance = distance
                nearest_point = point
        
        # Move to nearest point
        current = nearest_point
        unvisited.remove(nearest_point)
        total_distance += min_distance
        
        route.append(RoutePoint(id=current['id'], lat=current['lat'], lng=current['lng'], order=order))
        order += 1
    
    return RouteResponse(route=route, distance_meters=total_distance)


def two_opt_improvement(route_points: List[RoutePoint]) -> RouteResponse:
    """
    Apply 2-opt improvement to the route.
    This is a simple local optimization that swaps edges if it improves the total distance.
    """
    if len(route_points) < 4:
        # 2-opt requires at least 4 points to be effective
        total_distance = 0.0
        for i in range(len(route_points) - 1):
            total_distance += calculate_distance(
                route_points[i].lat, route_points[i].lng,
                route_points[i + 1].lat, route_points[i + 1].lng
            )
        return RouteResponse(route=route_points, distance_meters=total_distance)
    
    points = [(p.lat, p.lng, p.id) for p in route_points]
    n = len(points)
    improved = True
    
    # Perform one pass of 2-opt improvement
    while improved:
        improved = False
        for i in range(1, n - 1):
            for j in range(i + 1, n):
                if j - i == 1:
                    continue  # Skip adjacent edges
                
                # Calculate current distance
                current_dist = (
                    calculate_distance(points[i-1][0], points[i-1][1], points[i][0], points[i][1]) +
                    calculate_distance(points[j-1][0], points[j-1][1], points[j][0], points[j][1])
                )
                
                # Calculate distance after swap
                new_dist = (
                    calculate_distance(points[i-1][0], points[i-1][1], points[j-1][0], points[j-1][1]) +
                    calculate_distance(points[i][0], points[i][1], points[j][0], points[j][1])
                )
                
                if new_dist < current_dist:
                    # Reverse the order of points between i and j-1
                    points[i:j] = points[i:j][::-1]
                    improved = True
                    break
            if improved:
                break
    
    # Calculate final distance and create route
    optimized_route = []
    total_distance = 0.0
    
    for idx, (lat, lng, point_id) in enumerate(points):
        optimized_route.append(RoutePoint(id=point_id, lat=lat, lng=lng, order=idx))
        if idx < len(points) - 1:
            next_lat, next_lng, _ = points[idx + 1]
            total_distance += calculate_distance(lat, lng, next_lat, next_lng)
    
    return RouteResponse(route=optimized_route, distance_meters=total_distance)


def optimize_route(clusters: List[Dict], start_point: Optional[Coordinate] = None, apply_2opt: bool = True) -> RouteResponse:
    """
    Main route optimization function.
    Uses nearest-neighbor heuristic with optional 2-opt improvement.
    """
    start_time = time.time()
    
    # Generate initial route using nearest-neighbor
    initial_route = nearest_neighbor_route(clusters, start_point)
    
    # Apply 2-opt improvement if requested and we have enough time
    if apply_2opt and len(initial_route.route) >= 4:
        elapsed = time.time() - start_time
        if elapsed < 0.15:  # Keep under 200ms total as per requirements
            optimized_route = two_opt_improvement(initial_route.route)
            return optimized_route
    
    return initial_route
