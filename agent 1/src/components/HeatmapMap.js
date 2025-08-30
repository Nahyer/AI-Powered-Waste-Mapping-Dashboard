import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const HeatmapMap = ({ hotspots }) => {
  const [map, setMap] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  // Calculate center of all hotspots
  const calculateCenter = () => {
    if (hotspots.length === 0) return [40.7128, -74.0060]; // Default to NYC
    
    const avgLat = hotspots.reduce((sum, spot) => sum + spot.latitude, 0) / hotspots.length;
    const avgLng = hotspots.reduce((sum, spot) => sum + spot.longitude, 0) / hotspots.length;
    
    return [avgLat, avgLng];
  };

  // Get color based on severity (darker = higher severity)
  const getColorBySeverity = (severity) => {
    if (severity >= 90) return '#8B0000'; // Dark red
    if (severity >= 80) return '#FF0000'; // Red
    if (severity >= 70) return '#FF4500'; // Orange-red
    if (severity >= 60) return '#FF8C00'; // Dark orange
    if (severity >= 50) return '#FFA500'; // Orange
    if (severity >= 40) return '#FFD700'; // Gold
    if (severity >= 30) return '#FFFF00'; // Yellow
    if (severity >= 20) return '#ADFF2F'; // Green-yellow
    return '#32CD32'; // Lime green
  };

  // Get radius based on severity
  const getRadiusBySeverity = (severity) => {
    return Math.max(5, severity / 2); // Scale radius with severity
  };

  // Get severity level description
  const getSeverityLevel = (severity) => {
    if (severity >= 90) return 'Critical';
    if (severity >= 80) return 'Very High';
    if (severity >= 70) return 'High';
    if (severity >= 60) return 'Medium-High';
    if (severity >= 50) return 'Medium';
    if (severity >= 40) return 'Low-Medium';
    if (severity >= 30) return 'Low';
    return 'Very Low';
  };

  return (
    <div style={{ height: '600px', width: '100%', position: 'relative' }}>
      <MapContainer
        center={calculateCenter()}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        whenCreated={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {hotspots.map((hotspot) => (
          <CircleMarker
            key={hotspot.id}
            center={[hotspot.latitude, hotspot.longitude]}
            radius={getRadiusBySeverity(hotspot.severity)}
            fillColor={getColorBySeverity(hotspot.severity)}
            color="#000"
            weight={1}
            opacity={0.8}
            fillOpacity={0.7}
            eventHandlers={{
              click: () => setSelectedHotspot(hotspot),
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: getColorBySeverity(hotspot.severity) }}>
                  {hotspot.name}
                </h3>
                <p style={{ margin: '4px 0' }}>
                  <strong>Severity:</strong> {hotspot.severity}% ({getSeverityLevel(hotspot.severity)})
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Type:</strong> {hotspot.type}
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Coordinates:</strong> {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Description:</strong> {hotspot.description}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        zIndex: 1000
      }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Severity Legend</h4>
        {[100, 80, 60, 40, 20].map((severity) => (
          <div key={severity} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: getColorBySeverity(severity),
              marginRight: '8px',
              borderRadius: '50%'
            }}></div>
            <span style={{ fontSize: '12px' }}>
              {severity}% - {getSeverityLevel(severity)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeatmapMap;
