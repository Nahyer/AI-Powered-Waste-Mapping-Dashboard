"""
Agent 4 - Route Optimization Engine
Optimizes collection routes for waste management based on clustered hotspots.
"""

import math
import random
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np
from dataclasses import dataclass


@dataclass
class Location:
    id: str
    lat: float
    lng: float
    priority: int = 1
    estimated_time_minutes: int = 15


@dataclass
class Vehicle:
    id: str
    capacity: int
    current_lat: float
    current_lng: float
    speed_kmh: float = 30.0


@dataclass
class RouteSegment:
    from_location: Location
    to_location: Location
    distance_km: float
    travel_time_minutes: int
    cumulative_time_minutes: int


class RouteOptimizer:
    def __init__(self):
        self.earth_radius_km = 6371.0
        
    def haversine_distance(self, lat1: float, lon1: float, 
                          lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula."""
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = (math.sin(dlat/2)**2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2)
        c = 2 * math.asin(math.sqrt(a))
        
        return self.earth_radius_km * c

    def calculate_travel_time(self, distance_km: float, 
                            speed_kmh: float = 30.0) -> int:
        """Calculate travel time in minutes."""
        if distance_km == 0:
            return 0
        travel_hours = distance_km / speed_kmh
        return int(travel_hours * 60)

    def create_distance_matrix(self, locations: List[Location]) -> np.ndarray:
        """Create a distance matrix for all locations."""
        n = len(locations)
        matrix = np.zeros((n, n))
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    distance = self.haversine_distance(
                        locations[i].lat, locations[i].lng,
                        locations[j].lat, locations[j].lng
                    )
                    matrix[i][j] = distance
                    
        return matrix

    def nearest_neighbor_tsp(self, distance_matrix: np.ndarray, 
                           start_index: int = 0) -> List[int]:
        """
        Solve TSP using nearest neighbor heuristic.
        Returns the order of indices to visit.
        """
        n = distance_matrix.shape[0]
        if n <= 1:
            return list(range(n))
            
        unvisited = set(range(n))
        current = start_index
        route = [current]
        unvisited.remove(current)
        
        while unvisited:
            nearest = min(unvisited, 
                         key=lambda x: distance_matrix[current][x])
            route.append(nearest)
            unvisited.remove(nearest)
            current = nearest
            
        return route

    def optimize_route_2opt(self, route: List[int], 
                           distance_matrix: np.ndarray, 
                           max_iterations: int = 100) -> List[int]:
        """Improve route using 2-opt optimization."""
        def calculate_total_distance(route_order):
            total = 0
            for i in range(len(route_order)):
                from_idx = route_order[i]
                to_idx = route_order[(i + 1) % len(route_order)]
                total += distance_matrix[from_idx][to_idx]
            return total
        
        best_route = route.copy()
        best_distance = calculate_total_distance(best_route)
        
        for iteration in range(max_iterations):
            improved = False
            for i in range(1, len(route) - 2):
                for j in range(i + 1, len(route)):
                    if j - i == 1:
                        continue
                    
                    # Create new route by reversing segment
                    new_route = route[:i] + route[i:j][::-1] + route[j:]
                    new_distance = calculate_total_distance(new_route)
                    
                    if new_distance < best_distance:
                        best_route = new_route
                        best_distance = new_distance
                        improved = True
                        
            if not improved:
                break
                
            route = best_route.copy()
            
        return best_route

    def create_route_segments(self, locations: List[Location], 
                            route_order: List[int],
                            vehicle: Vehicle) -> List[RouteSegment]:
        """Create detailed route segments with timing."""
        segments = []
        cumulative_time = 0
        
        # Add initial segment from vehicle to first location
        if route_order and route_order[0] < len(locations):
            first_location = locations[route_order[0]]
            initial_distance = self.haversine_distance(
                vehicle.current_lat, vehicle.current_lng,
                first_location.lat, first_location.lng
            )
            initial_travel_time = self.calculate_travel_time(
                initial_distance, vehicle.speed_kmh
            )
            cumulative_time += initial_travel_time
            
            # Virtual start location
            start_location = Location(
                id="start",
                lat=vehicle.current_lat,
                lng=vehicle.current_lng,
                estimated_time_minutes=0
            )
            
            segments.append(RouteSegment(
                from_location=start_location,
                to_location=first_location,
                distance_km=initial_distance,
                travel_time_minutes=initial_travel_time,
                cumulative_time_minutes=cumulative_time
            ))
            
            cumulative_time += first_location.estimated_time_minutes
        
        # Add segments between locations
        for i in range(len(route_order) - 1):
            from_idx = route_order[i]
            to_idx = route_order[i + 1]
            
            if from_idx >= len(locations) or to_idx >= len(locations):
                continue
                
            from_location = locations[from_idx]
            to_location = locations[to_idx]
            
            distance = self.haversine_distance(
                from_location.lat, from_location.lng,
                to_location.lat, to_location.lng
            )
            
            travel_time = self.calculate_travel_time(distance, vehicle.speed_kmh)
            cumulative_time += travel_time
            
            segments.append(RouteSegment(
                from_location=from_location,
                to_location=to_location,
                distance_km=distance,
                travel_time_minutes=travel_time,
                cumulative_time_minutes=cumulative_time
            ))
            
            cumulative_time += to_location.estimated_time_minutes
            
        return segments

    def optimize_collection_route(
        self, 
        clusters: List[Dict[str, Any]], 
        vehicle: Vehicle,
        max_locations: int = 10
    ) -> Dict[str, Any]:
        """
        Optimize collection route for given clusters and vehicle.
        
        Args:
            clusters: List of cluster information
            vehicle: Vehicle to optimize route for
            max_locations: Maximum number of locations to include
            
        Returns:
            Optimized route information
        """
        if not clusters:
            return {
                'route_id': f'route_{int(datetime.now().timestamp())}',
                'vehicle_id': vehicle.id,
                'total_locations': 0,
                'total_distance_km': 0.0,
                'total_time_minutes': 0,
                'segments': [],
                'summary': 'No clusters to visit'
            }
        
        # Convert clusters to locations, prioritizing by severity
        locations = []
        sorted_clusters = sorted(clusters, 
                               key=lambda x: x.get('max_severity', 0), 
                               reverse=True)
        
        for i, cluster in enumerate(sorted_clusters[:max_locations]):
            location = Location(
                id=cluster.get('id', f'cluster_{i}'),
                lat=cluster.get('center_lat', 0.0),
                lng=cluster.get('center_lng', 0.0),
                priority=cluster.get('max_severity', 1),
                estimated_time_minutes=min(30, cluster.get('count', 1) * 5)
            )
            locations.append(location)
        
        if len(locations) <= 1:
            if locations:
                loc = locations[0]
                distance = self.haversine_distance(
                    vehicle.current_lat, vehicle.current_lng,
                    loc.lat, loc.lng
                )
                travel_time = self.calculate_travel_time(distance, 
                                                       vehicle.speed_kmh)
                total_time = travel_time + loc.estimated_time_minutes
                
                return {
                    'route_id': f'route_{int(datetime.now().timestamp())}',
                    'vehicle_id': vehicle.id,
                    'total_locations': 1,
                    'total_distance_km': round(distance, 2),
                    'total_time_minutes': total_time,
                    'segments': [],
                    'locations': [
                        {
                            'id': loc.id,
                            'lat': loc.lat,
                            'lng': loc.lng,
                            'priority': loc.priority,
                            'estimated_time_minutes': loc.estimated_time_minutes
                        }
                    ],
                    'summary': f'Single location route: {distance:.1f}km, {total_time}min'
                }
            else:
                return {
                    'route_id': f'route_{int(datetime.now().timestamp())}',
                    'vehicle_id': vehicle.id,
                    'total_locations': 0,
                    'total_distance_km': 0.0,
                    'total_time_minutes': 0,
                    'segments': [],
                    'summary': 'No valid locations'
                }
        
        # Create distance matrix and optimize route
        distance_matrix = self.create_distance_matrix(locations)
        
        # Find best starting location (closest to vehicle)
        start_distances = [
            self.haversine_distance(vehicle.current_lat, vehicle.current_lng,
                                  loc.lat, loc.lng)
            for loc in locations
        ]
        start_index = start_distances.index(min(start_distances))
        
        # Optimize route
        initial_route = self.nearest_neighbor_tsp(distance_matrix, start_index)
        optimized_route = self.optimize_route_2opt(initial_route, 
                                                  distance_matrix)
        
        # Create detailed route segments
        segments = self.create_route_segments(locations, optimized_route, 
                                            vehicle)
        
        # Calculate totals
        total_distance = sum(segment.distance_km for segment in segments)
        total_time = (segments[-1].cumulative_time_minutes if segments 
                     else 0)
        
        # Create location list in visit order
        ordered_locations = []
        for idx in optimized_route:
            if idx < len(locations):
                loc = locations[idx]
                ordered_locations.append({
                    'id': loc.id,
                    'lat': loc.lat,
                    'lng': loc.lng,
                    'priority': loc.priority,
                    'estimated_time_minutes': loc.estimated_time_minutes
                })
        
        # Create segments info for response
        segments_info = []
        for segment in segments:
            segments_info.append({
                'from': {
                    'id': segment.from_location.id,
                    'lat': segment.from_location.lat,
                    'lng': segment.from_location.lng
                },
                'to': {
                    'id': segment.to_location.id,
                    'lat': segment.to_location.lat,
                    'lng': segment.to_location.lng
                },
                'distance_km': round(segment.distance_km, 2),
                'travel_time_minutes': segment.travel_time_minutes,
                'cumulative_time_minutes': segment.cumulative_time_minutes
            })
        
        return {
            'route_id': f'route_{int(datetime.now().timestamp())}',
            'vehicle_id': vehicle.id,
            'total_locations': len(locations),
            'total_distance_km': round(total_distance, 2),
            'total_time_minutes': total_time,
            'estimated_completion_time': datetime.fromtimestamp(
                datetime.now().timestamp() + total_time * 60
            ).isoformat(),
            'locations': ordered_locations,
            'segments': segments_info,
            'summary': (f'{len(locations)} stops, {total_distance:.1f}km, '
                       f'{total_time}min total')
        }


# Global route optimizer instance
route_optimizer = RouteOptimizer()


def optimize_collection_routes(
    clusters: List[Dict[str, Any]], 
    vehicles: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Optimize collection routes for multiple vehicles.
    
    Args:
        clusters: List of cluster information
        vehicles: List of vehicle information
        
    Returns:
        List of optimized routes for each vehicle
    """
    routes = []
    
    if not vehicles:
        # Default vehicle if none provided
        default_vehicle = Vehicle(
            id='default_vehicle',
            capacity=1000,
            current_lat=37.7749,  # San Francisco default
            current_lng=-122.4194,
            speed_kmh=25.0
        )
        vehicles = [default_vehicle]
    else:
        vehicles = [
            Vehicle(
                id=v.get('id', f'vehicle_{i}'),
                capacity=v.get('capacity', 1000),
                current_lat=v.get('current_lat', 37.7749),
                current_lng=v.get('current_lng', -122.4194),
                speed_kmh=v.get('speed_kmh', 25.0)
            )
            for i, v in enumerate(vehicles)
        ]
    
    # Simple distribution: divide clusters among vehicles
    clusters_per_vehicle = len(clusters) // len(vehicles)
    remainder = len(clusters) % len(vehicles)
    
    start_idx = 0
    for i, vehicle in enumerate(vehicles):
        # Calculate how many clusters this vehicle gets
        num_clusters = clusters_per_vehicle
        if i < remainder:
            num_clusters += 1
            
        end_idx = start_idx + num_clusters
        vehicle_clusters = clusters[start_idx:end_idx]
        
        route = route_optimizer.optimize_collection_route(
            vehicle_clusters, vehicle
        )
        routes.append(route)
        
        start_idx = end_idx
    
    return routes
