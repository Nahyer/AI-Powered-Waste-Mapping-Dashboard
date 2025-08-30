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
  // Function to get color based on severity
  const getSeverityColor = (severity: number): string => {
    if (severity >= 8) return '#ff0000'; // Red for high severity
    if (severity >= 6) return '#ff8c00'; // Orange for medium severity
    if (severity >= 4) return '#ffd700'; // Yellow for low-medium severity
    return '#32cd32'; // Green for low severity
  };

  // Function to get radius based on severity
  const getSeverityRadius = (severity: number): number => {
    return Math.max(50, severity * 15);
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
    <div className={`w-full h-full min-h-[500px] rounded-lg overflow-hidden shadow-lg ${isAddingMode ? 'cursor-crosshair' : ''}`} style={{ zIndex: 1 }}>
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
              // Heatmap-style circles
              <Circle
                center={[hotspot.lat, hotspot.lng]}
                radius={getSeverityRadius(hotspot.severity)}
                pathOptions={{
                  color: getSeverityColor(hotspot.severity),
                  fillColor: getSeverityColor(hotspot.severity),
                  fillOpacity: 0.4,
                  weight: 2,
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
    </div>
  );
};

export default MapComponent;
