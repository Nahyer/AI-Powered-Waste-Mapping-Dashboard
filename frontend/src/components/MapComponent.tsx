import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { WasteHotspot } from '../types';
import 'leaflet/dist/leaflet.css';

interface MapComponentProps {
  hotspots: WasteHotspot[];
  showHeatmap?: boolean;
  center?: [number, number];
  zoom?: number;
  onHotspotClick?: (hotspot: WasteHotspot) => void;
  onMapClick?: (lat: number, lng: number) => void;
  isAddingMode?: boolean;
}

// Component to handle map clicks
const MapClickHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void; isAddingMode?: boolean }> = ({ 
  onMapClick, 
  isAddingMode 
}) => {
  useMapEvents({
    click: (e) => {
      if (isAddingMode && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({
  hotspots,
  showHeatmap = false,
  center = [37.7749, -122.4194], // Default to San Francisco
  zoom = 13,
  onHotspotClick,
  onMapClick,
  isAddingMode = false
}) => {
  // Enhanced heatmap color scheme from Agent 1
  const getSeverityColor = (severity: number): string => {
    // Convert severity to percentage scale for Agent 1 compatibility
    const severityPercent = severity * 10;
    
    if (severityPercent >= 90) return '#8B0000'; // Dark red
    if (severityPercent >= 80) return '#FF0000'; // Red
    if (severityPercent >= 70) return '#FF4500'; // Orange-red
    if (severityPercent >= 60) return '#FF8C00'; // Dark orange
    if (severityPercent >= 50) return '#FFA500'; // Orange
    if (severityPercent >= 40) return '#FFD700'; // Gold
    if (severityPercent >= 30) return '#FFFF00'; // Yellow
    if (severityPercent >= 20) return '#ADFF2F'; // Green-yellow
    return '#32CD32'; // Lime green
  };

  // Enhanced radius calculation from Agent 1
  const getSeverityRadius = (severity: number): number => {
    const severityPercent = severity * 10;
    return Math.max(30, severityPercent / 2); // Scale radius with severity
  };

  // Get severity CSS class for popup titles
  const getSeverityClass = (severity: number): string => {
    const severityPercent = severity * 10;
    if (severityPercent >= 90) return 'severity-critical';
    if (severityPercent >= 80) return 'severity-very-high';
    if (severityPercent >= 70) return 'severity-high';
    if (severityPercent >= 60) return 'severity-medium-high';
    if (severityPercent >= 50) return 'severity-medium';
    if (severityPercent >= 40) return 'severity-low-medium';
    if (severityPercent >= 30) return 'severity-low';
    return 'severity-very-low';
  };

  // Get severity level description from Agent 1
  const getSeverityLevel = (severity: number): string => {
    const severityPercent = severity * 10;
    if (severityPercent >= 90) return 'Critical';
    if (severityPercent >= 80) return 'Very High';
    if (severityPercent >= 70) return 'High';
    if (severityPercent >= 60) return 'Medium-High';
    if (severityPercent >= 50) return 'Medium';
    if (severityPercent >= 40) return 'Low-Medium';
    if (severityPercent >= 30) return 'Low';
    return 'Very Low';
  };

  // Custom marker icon based on severity
  const createCustomIcon = (severity: number) => {
    const color = getSeverityColor(severity);
    return divIcon({
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
        ">
          ${severity}
        </div>
      `,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  return (
    <div className={`w-full h-full min-h-[500px] rounded-lg overflow-hidden shadow-lg map-container ${isAddingMode ? 'cursor-crosshair' : ''}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        className={`h-full w-full ${isAddingMode ? 'cursor-crosshair' : ''}`}
        style={{ minHeight: '500px', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={onMapClick} isAddingMode={isAddingMode} />
        
        {hotspots.map((hotspot) => (
          <div key={hotspot.id}>
            {showHeatmap ? (
              // Enhanced heatmap-style circles with Agent 1 styling
              <Circle
                center={[hotspot.lat, hotspot.lng]}
                radius={getSeverityRadius(hotspot.severity)}
                pathOptions={{
                  color: '#000',
                  fillColor: getSeverityColor(hotspot.severity),
                  fillOpacity: 0.7,
                  weight: 1,
                  opacity: 0.8,
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className={`font-bold text-lg mb-2 ${getSeverityClass(hotspot.severity)}`}>
                      {hotspot.id}
                    </h3>
                    <p className="text-sm mb-1">
                      <strong>Severity:</strong> {hotspot.severity}/10 ({getSeverityLevel(hotspot.severity)})
                    </p>
                    <p className="text-sm mb-1">
                      <strong>Location:</strong> {hotspot.lat.toFixed(4)}, {hotspot.lng.toFixed(4)}
                    </p>
                    <p className="text-sm">
                      <strong>Time:</strong> {new Date(hotspot.timestamp).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Circle>
            ) : (
              // Regular markers
              <Marker
                position={[hotspot.lat, hotspot.lng]}
                icon={createCustomIcon(hotspot.severity)}
                eventHandlers={{
                  click: () => onHotspotClick?.(hotspot),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">{hotspot.id}</h3>
                    <p className="text-sm">
                      <strong>Severity:</strong> {hotspot.severity}/10
                    </p>
                    <p className="text-sm">
                      <strong>Location:</strong> {hotspot.lat.toFixed(4)}, {hotspot.lng.toFixed(4)}
                    </p>
                    <p className="text-sm">
                      <strong>Time:</strong> {new Date(hotspot.timestamp).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </div>
        ))}
      </MapContainer>

      {/* Enhanced Legend from Agent 1 - only show when in heatmap mode */}
      {showHeatmap && (
        <div className="heatmap-legend">
          <h4 className="font-bold mb-2 text-sm">Severity Legend</h4>
          {[10, 8, 6, 4, 2].map((severity) => (
            <div key={severity} className="flex items-center mb-1">
              <div 
                className="heatmap-legend-dot"
                style={{ backgroundColor: getSeverityColor(severity) }}
              />
              <span className="text-xs">
                {severity}/10 - {getSeverityLevel(severity)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapComponent;
