import React from 'react';

const ControlsPanel = ({ hotspots, selectedHotspot, onFilterChange, filters }) => {
  const severityLevels = [
    { label: 'All', value: 'all' },
    { label: 'Critical (90-100%)', value: 'critical' },
    { label: 'Very High (80-89%)', value: 'very-high' },
    { label: 'High (70-79%)', value: 'high' },
    { label: 'Medium (50-69%)', value: 'medium' },
    { label: 'Low (0-49%)', value: 'low' }
  ];

  const hotspotTypes = [...new Set(hotspots.map(hotspot => hotspot.type))];

  const getStats = () => {
    const total = hotspots.length;
    const critical = hotspots.filter(h => h.severity >= 90).length;
    const high = hotspots.filter(h => h.severity >= 70 && h.severity < 90).length;
    const medium = hotspots.filter(h => h.severity >= 50 && h.severity < 70).length;
    const low = hotspots.filter(h => h.severity < 50).length;

    return { total, critical, high, medium, low };
  };

  const stats = getStats();

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #dee2e6'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#495057' }}>Heatmap Controls</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {/* Severity Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            Filter by Severity:
          </label>
          <select
            value={filters.severity}
            onChange={(e) => onFilterChange('severity', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {severityLevels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            Filter by Type:
          </label>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Types</option>
            {hotspotTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Display */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            Hotspot Statistics:
          </label>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <div>Total: <strong>{stats.total}</strong></div>
            <div style={{ color: '#8B0000' }}>Critical: <strong>{stats.critical}</strong></div>
            <div style={{ color: '#FF0000' }}>High: <strong>{stats.high}</strong></div>
            <div style={{ color: '#FF8C00' }}>Medium: <strong>{stats.medium}</strong></div>
            <div style={{ color: '#32CD32' }}>Low: <strong>{stats.low}</strong></div>
          </div>
        </div>
      </div>

      {/* Selected Hotspot Info */}
      {selectedHotspot && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'white',
          border: '2px solid #007bff',
          borderRadius: '6px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Selected Hotspot</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <div><strong>Name:</strong> {selectedHotspot.name}</div>
            <div><strong>Severity:</strong> 
              <span style={{ color: selectedHotspot.severity >= 70 ? '#FF0000' : '#FF8C00' }}>
                {selectedHotspot.severity}% ({selectedHotspot.severity >= 90 ? 'Critical' : 
                selectedHotspot.severity >= 80 ? 'Very High' : 
                selectedHotspot.severity >= 70 ? 'High' : 
                selectedHotspot.severity >= 60 ? 'Medium-High' : 
                selectedHotspot.severity >= 50 ? 'Medium' : 
                selectedHotspot.severity >= 40 ? 'Low-Medium' : 
                selectedHotspot.severity >= 30 ? 'Low' : 'Very Low'})
              </span>
            </div>
            <div><strong>Type:</strong> {selectedHotspot.type}</div>
            <div><strong>Coordinates:</strong> {selectedHotspot.latitude.toFixed(4)}, {selectedHotspot.longitude.toFixed(4)}</div>
            <div><strong>Description:</strong> {selectedHotspot.description}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlsPanel;
