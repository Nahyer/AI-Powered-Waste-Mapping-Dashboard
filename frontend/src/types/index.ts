export interface WasteHotspot {
  id: string;
  lat: number;
  lng: number;
  severity: number;
  timestamp: string;
}

export interface HotspotsData {
  points: WasteHotspot[];
}

export interface MapProps {
  hotspots: WasteHotspot[];
  showHeatmap?: boolean;
  center?: [number, number];
  zoom?: number;
}
