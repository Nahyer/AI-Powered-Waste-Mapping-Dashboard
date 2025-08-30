"""
Agent 3 - Alerts & Notifications System
Handles real-time alerts for waste hotspot clustering and notifications.
"""

import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class AlertType(Enum):
    HIGH_SEVERITY = "high_severity"
    NEW_CLUSTER = "new_cluster"
    CLUSTER_UPDATED = "cluster_updated"
    SYSTEM_UPDATE = "system_update"


@dataclass
class Alert:
    id: str
    type: AlertType
    title: str
    message: str
    timestamp: str
    severity: int
    data: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        alert_dict = asdict(self)
        alert_dict['type'] = self.type.value
        return alert_dict


class AlertManager:
    def __init__(self):
        self.active_alerts: List[Alert] = []
        self.alert_history: List[Alert] = []
        self.subscribers: List[Any] = []  # SSE event generators
        self.severity_threshold = 5
        self.previous_clusters: List[Dict[str, Any]] = []

    def add_subscriber(self, subscriber):
        """Add a new SSE subscriber for real-time alerts."""
        self.subscribers.append(subscriber)

    def remove_subscriber(self, subscriber):
        """Remove an SSE subscriber."""
        if subscriber in self.subscribers:
            self.subscribers.remove(subscriber)

    async def broadcast_alert(self, alert: Alert):
        """Broadcast alert to all SSE subscribers."""
        alert_data = {
            "type": "alert",
            "payload": alert.to_dict(),
            "timestamp": alert.timestamp
        }
        
        # Add to active alerts
        self.active_alerts.append(alert)
        self.alert_history.append(alert)
        
        # Keep only last 50 active alerts
        if len(self.active_alerts) > 50:
            self.active_alerts = self.active_alerts[-50:]

        # Broadcast to all subscribers
        disconnected_subscribers = []
        for subscriber in self.subscribers:
            try:
                await subscriber.put(json.dumps(alert_data))
            except asyncio.CancelledError:
                disconnected_subscribers.append(subscriber)
                raise
            except Exception:
                # Mark subscriber for removal if disconnected
                disconnected_subscribers.append(subscriber)
        
        # Remove disconnected subscribers
        for subscriber in disconnected_subscribers:
            self.remove_subscriber(subscriber)

    async def check_cluster_alerts(self, new_clusters: List[Dict[str, Any]]):
        """Check for cluster-based alerts (high severity, new clusters)."""
        current_time = datetime.now().isoformat()
        
        # Check for high-severity clusters
        for cluster in new_clusters:
            if cluster.get('severity', 0) >= self.severity_threshold:
                cluster_id = cluster.get('id', 'unknown')
                timestamp = int(datetime.now().timestamp())
                alert = Alert(
                    id=f"high_severity_{cluster_id}_{timestamp}",
                    type=AlertType.HIGH_SEVERITY,
                    title="High Severity Cluster Detected",
                    message=(f"Cluster {cluster_id} has severity "
                             f"{cluster.get('severity', 0)} "
                             f"(≥{self.severity_threshold})"),
                    timestamp=current_time,
                    severity=cluster.get('severity', 0),
                    data=cluster
                )
                await self.broadcast_alert(alert)

        # Check for new clusters
        new_cluster_ids = {cluster.get('id') for cluster in new_clusters}
        previous_cluster_ids = {cluster.get('id')
                                for cluster in self.previous_clusters}
        
        newly_created_ids = new_cluster_ids - previous_cluster_ids
        
        for cluster_id in newly_created_ids:
            cluster = next((c for c in new_clusters
                            if c.get('id') == cluster_id), None)
            if cluster:
                timestamp = int(datetime.now().timestamp())
                alert = Alert(
                    id=f"new_cluster_{cluster_id}_{timestamp}",
                    type=AlertType.NEW_CLUSTER,
                    title="New Waste Cluster Detected",
                    message=(f"New cluster '{cluster_id}' with "
                             f"{cluster.get('count', 0)} hotspots "
                             f"(severity: {cluster.get('severity', 0)})"),
                    timestamp=current_time,
                    severity=cluster.get('severity', 0),
                    data=cluster
                )
                await self.broadcast_alert(alert)

        # Update previous clusters for next comparison
        self.previous_clusters = new_clusters.copy()

    async def send_system_update(self, message: str,
                                 data: Optional[Dict[str, Any]] = None):
        """Send a general system update alert."""
        alert = Alert(
            id=f"system_{int(datetime.now().timestamp())}",
            type=AlertType.SYSTEM_UPDATE,
            title="System Update",
            message=message,
            timestamp=datetime.now().isoformat(),
            severity=1,
            data=data
        )
        await self.broadcast_alert(alert)

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all currently active alerts."""
        return [alert.to_dict() for alert in self.active_alerts]

    def get_alert_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get alert history with optional limit."""
        return [alert.to_dict() for alert in self.alert_history[-limit:]]

    def clear_alerts(self):
        """Clear all active alerts."""
        self.active_alerts.clear()


# Global alert manager instance
alert_manager = AlertManager()


class SimulationManager:
    def __init__(self):
        self.is_running = False
        self.interval_seconds = 120
        self.simulation_task: Optional[asyncio.Task] = None
        
    async def start_simulation(self, interval_seconds: int = 120):
        """Start the hotspot simulation worker."""
        if self.is_running:
            return False
            
        self.interval_seconds = interval_seconds
        self.is_running = True
        self.simulation_task = asyncio.create_task(self._simulation_worker())
        
        await alert_manager.send_system_update(
            f"Simulation started with {interval_seconds}s intervals",
            {"interval_seconds": interval_seconds, "status": "started"}
        )
        return True

    async def stop_simulation(self):
        """Stop the hotspot simulation worker."""
        if not self.is_running:
            return False
            
        self.is_running = False
        if self.simulation_task:
            self.simulation_task.cancel()
            try:
                await self.simulation_task
            except asyncio.CancelledError:
                # Task was successfully cancelled
                pass
        
        await alert_manager.send_system_update(
            "Simulation stopped",
            {"status": "stopped"}
        )
        return True

    async def _simulation_worker(self):
        """Background worker that generates synthetic hotspots."""
        import random
        
        # San Francisco bay area coordinates for realistic simulation
        base_locations = [
            {"lat": 37.7749, "lng": -122.4194},  # SF Downtown
            {"lat": 37.7849, "lng": -122.4094},  # North Beach
            {"lat": 37.7649, "lng": -122.4294},  # Mission
            {"lat": 37.7549, "lng": -122.4394},  # Sunset
        ]
        
        try:
            while self.is_running:
                # Generate a synthetic hotspot
                base = random.choice(base_locations)
                
                # Add some randomness within ~300m radius
                lat_offset = random.uniform(-0.003, 0.003)
                lng_offset = random.uniform(-0.003, 0.003)
                
                synthetic_hotspot = {
                    "id": f"sim_{int(datetime.now().timestamp())}",
                    "lat": base["lat"] + lat_offset,
                    "lng": base["lng"] + lng_offset,
                    "severity": random.randint(1, 8),
                    "timestamp": datetime.now().isoformat(),
                    "source": "simulation"
                }
                
                # Notify about new simulated hotspot
                severity = synthetic_hotspot['severity']
                await alert_manager.send_system_update(
                    f"Simulated hotspot generated: severity {severity}",
                    synthetic_hotspot
                )
                
                # Wait for the next interval
                await asyncio.sleep(self.interval_seconds)
                
        except asyncio.CancelledError:
            # Simulation was cancelled, clean exit
            pass


# Global simulation manager instance
simulation_manager = SimulationManager()
