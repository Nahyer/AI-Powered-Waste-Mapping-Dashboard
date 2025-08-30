// API service for communicating with the backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Hotspot {
  id: string;
  lat: number;
  lng: number;
  severity: number;
  timestamp: string;
  source?: string;
}

export interface Cluster {
  id: string;
  center_lat: number;
  center_lng: number;
  severity: number;
  count: number;
  members: string[];
  avg_severity: number;
  max_severity: number;
  timestamps: string[];
}

export interface Route {
  route_id: string;
  vehicle_id: string;
  total_locations: number;
  total_distance_km: number;
  total_time_minutes: number;
  estimated_completion_time?: string;
  locations: Array<{
    id: string;
    lat: number;
    lng: number;
    priority: number;
    estimated_time_minutes: number;
  }>;
  segments: Array<{
    from: { id: string; lat: number; lng: number };
    to: { id: string; lat: number; lng: number };
    distance_km: number;
    travel_time_minutes: number;
    cumulative_time_minutes: number;
  }>;
  summary: string;
}

export interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  severity: number;
  data?: any;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.detail || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Hotspot management
  async getHotspots(): Promise<{ hotspots: Hotspot[]; count: number }> {
    return this.request('/hotspots');
  }

  async addHotspot(hotspot: Omit<Hotspot, 'id' | 'timestamp'>): Promise<{
    message: string;
    hotspot: Hotspot;
    total_hotspots: number;
  }> {
    const hotspotWithTimestamp = {
      ...hotspot,
      id: `hotspot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    return this.request('/hotspots', {
      method: 'POST',
      body: JSON.stringify(hotspotWithTimestamp),
    });
  }

  async deleteHotspot(hotspotId: string): Promise<{
    message: string;
    remaining_hotspots: number;
  }> {
    return this.request(`/hotspots/${hotspotId}`, {
      method: 'DELETE',
    });
  }

  // Clustering
  async getClusters(): Promise<{ clusters: Cluster[]; count: number }> {
    return this.request('/clusters');
  }

  async createClusters(
    hotspots: Hotspot[],
    options?: { eps_km?: number; min_samples?: number }
  ): Promise<{
    clusters: Cluster[];
    analytics: any;
    parameters: { eps_km: number; min_samples: number };
  }> {
    return this.request('/clusters', {
      method: 'POST',
      body: JSON.stringify({
        hotspots,
        eps_km: options?.eps_km,
        min_samples: options?.min_samples,
      }),
    });
  }

  // Route optimization
  async getRoutes(): Promise<{ routes: Route[]; count: number }> {
    return this.request('/routes');
  }

  async optimizeRoutes(
    clusters: Cluster[],
    vehicles?: Array<{
      id: string;
      capacity: number;
      current_lat: number;
      current_lng: number;
      speed_kmh?: number;
    }>,
    maxLocationsPerRoute?: number
  ): Promise<{
    routes: Route[];
    summary: {
      total_routes: number;
      total_locations: number;
      total_distance_km: number;
      total_time_minutes: number;
    };
  }> {
    return this.request('/routes/optimize', {
      method: 'POST',
      body: JSON.stringify({
        clusters,
        vehicles,
        max_locations_per_route: maxLocationsPerRoute,
      }),
    });
  }

  // Alert management
  async getAlerts(): Promise<{ active_alerts: Alert[]; count: number }> {
    return this.request('/alerts');
  }

  async getAlertHistory(limit = 50): Promise<{
    alert_history: Alert[];
    count: number;
  }> {
    return this.request(`/alerts/history?limit=${limit}`);
  }

  async clearAlerts(): Promise<{ message: string }> {
    return this.request('/alerts', { method: 'DELETE' });
  }

  async updateAlertSettings(settings: {
    severity_threshold: number;
    simulation_interval: number;
  }): Promise<{ message: string; settings: any }> {
    return this.request('/alerts/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // Real-time alerts via Server-Sent Events
  createAlertStream(): EventSource {
    return new EventSource(`${API_BASE_URL}/alerts/stream`);
  }

  // Simulation control
  async startSimulation(intervalSeconds = 120): Promise<{
    message: string;
    interval_seconds: number;
    status: string;
  }> {
    return this.request(`/simulation/start?interval_seconds=${intervalSeconds}`, {
      method: 'POST',
    });
  }

  async stopSimulation(): Promise<{ message: string; status: string }> {
    return this.request('/simulation/stop', { method: 'POST' });
  }

  async getSimulationStatus(): Promise<{
    is_running: boolean;
    interval_seconds: number;
    status: string;
  }> {
    return this.request('/simulation/status');
  }

  // Data management
  async resetData(): Promise<{ message: string }> {
    return this.request('/data/reset', { method: 'POST' });
  }

  async loadSampleData(): Promise<{
    message: string;
    hotspots_count: number;
    clusters_count: number;
  }> {
    return this.request('/data/sample');
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    version: string;
    services: Record<string, string>;
    data_counts: Record<string, number>;
  }> {
    return this.request('/health');
  }

  // Utility method to check if backend is available
  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
