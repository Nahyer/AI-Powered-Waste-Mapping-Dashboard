import React, { useState, useEffect } from 'react';
import MapComponent from './MapComponent';
import HotspotSubmissionForm from './HotspotSubmissionForm';
import ToastContainer, { type ToastNotification } from './ToastContainer';
import LoadingSpinner from './LoadingSpinner';
import StatsCard from './StatsCard';
import type { WasteHotspot } from '../types';
import { apiService } from '../services/api';

interface DashboardProps {
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const [hotspots, setHotspots] = useState<WasteHotspot[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<WasteHotspot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [clickLocation, setClickLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [realTimeAlerts, setRealTimeAlerts] = useState<EventSource | null>(null);

  // Load hotspot data from backend
  useEffect(() => {
    const loadHotspots = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if backend is available
        const isAvailable = await apiService.isBackendAvailable();
        setBackendConnected(isAvailable);
        
        if (isAvailable) {
          // Load hotspots from backend
          const response = await apiService.getHotspots();
          setHotspots(response.hotspots);
          
          addNotification({
            type: 'success',
            title: 'Connected to Backend',
            message: `Loaded ${response.hotspots.length} hotspots from server`
          });
        } else {
          // Fallback to local data and sample data
          setError('Backend service unavailable. Using sample data.');
          
          try {
            const response = await fetch('/data/hotspots.json');
            if (!response.ok) throw new Error('Failed to load local data');
            const data = await response.json();
            setHotspots(data.points || []);
          } catch {
            // Use hardcoded sample data as last resort
            setHotspots([
              {
                id: "hotspot_1",
                lat: 37.7749,
                lng: -122.4194,
                severity: 8,
                timestamp: "2025-08-30T10:00:00"
              },
              {
                id: "hotspot_2", 
                lat: 37.7849,
                lng: -122.4094,
                severity: 6,
                timestamp: "2025-08-30T10:15:00"
              },
              {
                id: "hotspot_3",
                lat: 37.7649,
                lng: -122.4294,
                severity: 9,
                timestamp: "2025-08-30T10:30:00"
              },
              {
                id: "hotspot_4",
                lat: 37.7549,
                lng: -122.4394,
                severity: 7,
                timestamp: "2025-08-30T10:45:00"
              },
              {
                id: "hotspot_5",
                lat: 37.7749,
                lng: -122.4100,
                severity: 5,
                timestamp: "2025-08-30T11:00:00"
              }
            ]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        
        // Fallback to sample data
        setHotspots([
          {
            id: "hotspot_1",
            lat: 37.7749,
            lng: -122.4194,
            severity: 8,
            timestamp: "2025-08-30T10:00:00"
          },
          {
            id: "hotspot_2", 
            lat: 37.7849,
            lng: -122.4094,
            severity: 6,
            timestamp: "2025-08-30T10:15:00"
          },
          {
            id: "hotspot_3",
            lat: 37.7649,
            lng: -122.4294,
            severity: 9,
            timestamp: "2025-08-30T10:30:00"
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHotspots();
    
    // Set up real-time alerts if backend is available
    const setupRealTimeAlerts = async () => {
      try {
        if (await apiService.isBackendAvailable()) {
          const eventSource = apiService.createAlertStream();
          setRealTimeAlerts(eventSource);
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'alert') {
                addNotification({
                  type: data.payload.type === 'high_severity' ? 'error' : 'info',
                  title: data.payload.title,
                  message: data.payload.message
                });
              }
            } catch (e) {
              console.log('Received non-JSON message:', event.data);
            }
          };
          
          eventSource.onerror = () => {
            console.log('Alert stream disconnected');
            eventSource.close();
            setRealTimeAlerts(null);
          };
        }
      } catch (err) {
        console.log('Failed to setup real-time alerts:', err);
      }
    };
    
    setupRealTimeAlerts();
    
    // Cleanup function
    return () => {
      if (realTimeAlerts) {
        realTimeAlerts.close();
      }
    };
  }, []);

  // Update hotspot submission to use backend
  const handleSubmitHotspot = async (hotspotData: Omit<WasteHotspot, 'id' | 'timestamp'>) => {
    try {
      if (backendConnected) {
        // Submit to backend
        const response = await apiService.addHotspot({
          lat: hotspotData.lat,
          lng: hotspotData.lng,
          severity: hotspotData.severity,
          source: 'user'
        });
        
        // Update local state
        setHotspots(prev => [...prev, response.hotspot]);
        
        addNotification({
          type: 'success',
          title: 'Hotspot Reported Successfully',
          message: `New waste hotspot "${response.hotspot.id}" has been added to the server.`
        });
      } else {
        // Fallback to local state only
        const newHotspot: WasteHotspot = {
          ...hotspotData,
          id: `hotspot_${Date.now()}`,
          timestamp: new Date().toISOString()
        };

        setHotspots(prev => [...prev, newHotspot]);
        
        addNotification({
          type: 'warning',
          title: 'Hotspot Added Locally',
          message: `New waste hotspot "${newHotspot.id}" added locally. Backend unavailable.`
        });
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Failed to Add Hotspot',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      });
      return;
    }
    
    setShowSubmissionForm(false);
    setClickLocation(null);
    setIsAddingMode(false);
  };

  const handleCancelSubmission = () => {
    setShowSubmissionForm(false);
    setClickLocation(null);
    setIsAddingMode(false);
  };

  const handleHotspotClick = (hotspot: WasteHotspot) => {
    setSelectedHotspot(hotspot);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setClickLocation({ lat, lng });
    setShowSubmissionForm(true);
    setIsAddingMode(false);
  };

  const addNotification = (notification: Omit<ToastNotification, 'id'>) => {
    const newNotification: ToastNotification = {
      ...notification,
      id: Date.now().toString()
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const toggleAddingMode = () => {
    setIsAddingMode(!isAddingMode);
    if (isAddingMode) {
      addNotification({
        type: 'info',
        title: 'Adding Mode Disabled',
        message: 'Click mode turned off. You can now interact with existing hotspots normally.'
      });
    } else {
      addNotification({
        type: 'info',
        title: 'Adding Mode Enabled',
        message: 'Click anywhere on the map to add a new waste hotspot.'
      });
    }
  };

  const getSeverityStats = () => {
    const total = hotspots.length;
    const high = hotspots.filter(h => h.severity >= 8).length;
    const medium = hotspots.filter(h => h.severity >= 6 && h.severity < 8).length;
    const low = hotspots.filter(h => h.severity < 6).length;
    const avgSeverity = total > 0 ? (hotspots.reduce((sum, h) => sum + h.severity, 0) / total).toFixed(1) : '0';
    
    return { total, high, medium, low, avgSeverity };
  };

  const stats = getSeverityStats();

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner 
            size="large" 
            message="Loading waste mapping data..."
            className="text-center"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                AI-Powered Waste Mapping Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Real-time waste hotspot monitoring and visualization
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleAddingMode}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  isAddingMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {isAddingMode ? 'Cancel Adding' : 'Add Hotspot'}
              </button>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  showHeatmap
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {showHeatmap ? 'Show Markers' : 'Show Heatmap'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              <strong>Note:</strong> {error}. Using sample data for demonstration.
            </p>
          </div>
        )}

        {/* Adding Mode Banner */}
        {isAddingMode && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-800 font-medium">
                  Click anywhere on the map to add a new waste hotspot
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  You can cancel this mode by clicking the "Cancel Adding" button above
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <StatsCard
            title="Total Hotspots"
            value={stats.total}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatsCard
            title="High Severity"
            value={stats.high}
            color="red"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.134 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
          />
          <StatsCard
            title="Medium Severity"
            value={stats.medium}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Low Severity"
            value={stats.low}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Average Severity"
            value={stats.avgSeverity}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </div>

        {/* Map and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Waste Hotspot {showHeatmap ? 'Heatmap' : 'Map'}
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleString()}
                  </div>
                </div>
              </div>
              <MapComponent
                hotspots={hotspots}
                showHeatmap={showHeatmap}
                onHotspotClick={handleHotspotClick}
                onMapClick={handleMapClick}
                isAddingMode={isAddingMode}
              />
            </div>
          </div>

          {/* Details Panel */}
          <div className="space-y-4">
            {/* Legend */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Severity Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-sm">High (8-10)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded-full mr-3"></div>
                  <span className="text-sm">Medium (6-7)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm">Low-Medium (4-5)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm">Low (1-3)</span>
                </div>
              </div>
            </div>

            {/* Selected Hotspot Details */}
            {selectedHotspot && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Hotspot Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">ID:</span> {selectedHotspot.id}
                  </div>
                  <div>
                    <span className="font-medium">Severity:</span> {selectedHotspot.severity}/10
                  </div>
                  <div>
                    <span className="font-medium">Location:</span><br />
                    <span className="text-sm text-gray-600">
                      {selectedHotspot.lat.toFixed(4)}, {selectedHotspot.lng.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span><br />
                    <span className="text-sm text-gray-600">
                      {new Date(selectedHotspot.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Hotspots List */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Hotspots</h3>
              <div className="max-h-64 overflow-y-auto">
                {hotspots
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 10)
                  .map((hotspot) => {
                    const getSeverityBadgeColor = (severity: number) => {
                      if (severity >= 8) return 'bg-red-100 text-red-800';
                      if (severity >= 6) return 'bg-orange-100 text-orange-800';
                      return 'bg-green-100 text-green-800';
                    };

                    return (
                      <button
                        key={hotspot.id}
                        className={`w-full text-left p-2 mb-2 rounded transition-colors ${
                          selectedHotspot?.id === hotspot.id
                            ? 'bg-blue-100 border border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => handleHotspotClick(hotspot)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{hotspot.id}</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadgeColor(hotspot.severity)}`}
                          >
                            {hotspot.severity}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(hotspot.timestamp).toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Manual Hotspot Submission Form */}
      {showSubmissionForm && (
        <HotspotSubmissionForm
          onSubmit={handleSubmitHotspot}
          onCancel={handleCancelSubmission}
          defaultLocation={clickLocation || undefined}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </div>
  );
};

export default Dashboard;
