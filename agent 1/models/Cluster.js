const mongoose = require('mongoose');

const clusterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  centroid: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  algorithm: {
    type: String,
    enum: ['dbscan', 'kmeans', 'hierarchical', 'manual'],
    required: true
  },
  parameters: {
    // DBSCAN parameters
    eps: Number,           // Maximum distance between points
    minPoints: Number,     // Minimum points to form cluster
    
    // K-Means parameters
    k: Number,             // Number of clusters
    iterations: Number,    // Maximum iterations
    
    // Hierarchical parameters
    distance: String,      // Distance metric
    linkage: String        // Linkage method
  },
  member_hotspots: [{
    hotspot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotspot',
      required: true
    },
    distance_from_centroid: Number, // Distance in meters
    contribution_score: Number      // How much this hotspot contributes to cluster severity
  }],
  statistics: {
    total_hotspots: {
      type: Number,
      default: 0
    },
    average_severity: {
      type: Number,
      default: 0
    },
    max_severity: {
      type: Number,
      default: 0
    },
    min_severity: {
      type: Number,
      default: 0
    },
    total_waste_kg: {
      type: Number,
      default: 0
    },
    total_co2_emissions: {
      type: Number,
      default: 0
    },
    priority_score: {
      type: Number,
      default: 0
    }
  },
  boundaries: {
    // Bounding box of the cluster
    north: Number,  // Northernmost latitude
    south: Number,  // Southernmost latitude
    east: Number,   // Easternmost longitude
    west: Number    // Westernmost longitude
  },
  radius: {
    type: Number,  // Radius in meters from centroid
    required: true
  },
  density: {
    type: Number,  // Hotspots per square kilometer
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'monitoring', 'resolved', 'archived'],
    default: 'active'
  },
  tags: [String],
  metadata: {
    created_at: {
      type: Date,
      default: Date.now
    },
    last_updated: {
      type: Date,
      default: Date.now
    },
    algorithm_version: String,
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    },
    notes: String
  }
}, {
  timestamps: true
});

// Geospatial index for centroid queries
clusterSchema.index({ centroid: '2dsphere' });

// Index for efficient clustering queries
clusterSchema.index({ algorithm: 1, status: 1, 'statistics.priority_score': -1 });

// Virtual for cluster area (approximate)
clusterSchema.virtual('area_km2').get(function() {
  if (this.radius) {
    return Math.PI * Math.pow(this.radius / 1000, 2);
  }
  return 0;
});

// Method to update cluster statistics
clusterSchema.methods.updateStatistics = async function() {
  const Hotspot = mongoose.model('Hotspot');
  
  // Get all member hotspots
  const hotspotIds = this.member_hotspots.map(member => member.hotspot_id);
  const hotspots = await Hotspot.find({ _id: { $in: hotspotIds } });
  
  if (hotspots.length === 0) {
    this.statistics = {
      total_hotspots: 0,
      average_severity: 0,
      max_severity: 0,
      min_severity: 0,
      total_waste_kg: 0,
      total_co2_emissions: 0,
      priority_score: 0
    };
    return this.save();
  }
  
  // Calculate statistics
  const severities = hotspots.map(h => h.calculated_severity);
  const wasteAmounts = hotspots.map(h => h.environmental_metrics.estimated_waste_kg);
  const co2Amounts = hotspots.map(h => h.environmental_metrics.co2_emissions);
  
  this.statistics = {
    total_hotspots: hotspots.length,
    average_severity: severities.reduce((a, b) => a + b, 0) / severities.length,
    max_severity: Math.max(...severities),
    min_severity: Math.min(...severities),
    total_waste_kg: wasteAmounts.reduce((a, b) => a + b, 0),
    total_co2_emissions: co2Amounts.reduce((a, b) => a + b, 0),
    priority_score: this.calculatePriorityScore(hotspots)
  };
  
  // Update boundaries
  this.updateBoundaries(hotspots);
  
  // Update density
  this.density = hotspots.length / this.area_km2;
  
  return this.save();
};

// Method to calculate priority score
clusterSchema.methods.calculatePriorityScore = function(hotspots) {
  let score = 0;
  
  hotspots.forEach(hotspot => {
    // Base score from severity
    score += hotspot.calculated_severity * 10;
    
    // Bonus for critical waste types
    if (['medical', 'electronic', 'industrial'].includes(hotspot.waste_type)) {
      score += 20;
    }
    
    // Bonus for high environmental impact
    if (hotspot.environmental_metrics.water_pollution_risk === 'critical') {
      score += 15;
    }
    if (hotspot.environmental_metrics.air_quality_impact === 'critical') {
      score += 15;
    }
    
    // Bonus for recent reports
    const daysSinceLastReport = (Date.now() - Math.max(...hotspot.typical_reports.map(r => r.timestamp))) / (1000 * 60 * 60 * 24);
    if (daysSinceLastReport <= 1) score += 10;
    else if (daysSinceLastReport <= 7) score += 5;
  });
  
  return Math.round(score);
};

// Method to update cluster boundaries
clusterSchema.methods.updateBoundaries = function(hotspots) {
  if (hotspots.length === 0) return;
  
  const lats = hotspots.map(h => h.coordinates.coordinates[1]);
  const lngs = hotspots.map(h => h.coordinates.coordinates[0]);
  
  this.boundaries = {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
  
  // Calculate radius as distance from centroid to farthest point
  const centroid = this.centroid.coordinates;
  let maxDistance = 0;
  
  hotspots.forEach(hotspot => {
    const distance = this.calculateDistance(
      centroid[1], centroid[0],
      hotspot.coordinates.coordinates[1], hotspot.coordinates.coordinates[0]
    );
    maxDistance = Math.max(maxDistance, distance);
  });
  
  this.radius = maxDistance;
};

// Helper method to calculate distance between two points (Haversine formula)
clusterSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Pre-save middleware to update metadata
clusterSchema.pre('save', function(next) {
  this.metadata.last_updated = new Date();
  next();
});

module.exports = mongoose.model('Cluster', clusterSchema); 