const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter_id: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    required: true
  },
  photo_url: String,
  severity_score: {
    type: Number,
    min: 0,
    max: 10,
    default: 5
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'cleared', 'false_alarm'],
    default: 'pending'
  },
  location_accuracy: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  }
});

const hotspotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
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
  waste_type: {
    type: String,
    enum: ['household', 'commercial', 'industrial', 'street_litter', 'market_waste', 'construction', 'medical', 'electronic'],
    required: true
  },
  base_severity: {
    type: Number,
    min: 0,
    max: 10,
    required: true
  },
  description: String,
  typical_reports: [reportSchema],
  environmental_metrics: {
    estimated_waste_kg: {
      type: Number,
      default: 0
    },
    co2_emissions: {
      type: Number,
      default: 0
    },
    water_pollution_risk: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    air_quality_impact: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }
  },
  cluster_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'cleared', 'monitoring', 'resolved'],
    default: 'active'
  },
  last_cleared: Date,
  priority_level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  tags: [String],
  metadata: {
    created_by: String,
    source: {
      type: String,
      enum: ['user_report', 'sensor', 'ai_detection', 'manual_entry'],
      default: 'user_report'
    },
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    }
  }
}, {
  timestamps: true
});

// Geospatial index for efficient location-based queries
hotspotSchema.index({ coordinates: '2dsphere' });

// Compound index for clustering queries
hotspotSchema.index({ cluster_id: 1, status: 1, base_severity: -1 });

// Virtual for calculated severity (base + reports)
hotspotSchema.virtual('calculated_severity').get(function() {
  if (!this.typical_reports || this.typical_reports.length === 0) {
    return this.base_severity;
  }
  
  const reportSeverity = this.typical_reports.reduce((sum, report) => sum + report.severity_score, 0);
  const averageReportSeverity = reportSeverity / this.typical_reports.length;
  
  // Weighted average: 70% base severity, 30% report severity
  return (this.base_severity * 0.7) + (averageReportSeverity * 0.3);
});

// Method to update environmental metrics
hotspotSchema.methods.updateEnvironmentalMetrics = function() {
  const severity = this.calculated_severity;
  
  // Estimate waste based on severity
  this.environmental_metrics.estimated_waste_kg = severity * 5; // 5kg per severity point
  
  // Estimate CO2 emissions (rough calculation)
  this.environmental_metrics.co2_emissions = severity * 1.2; // 1.2kg CO2 per severity point
  
  // Update risk levels based on severity
  if (severity >= 8) {
    this.environmental_metrics.water_pollution_risk = 'critical';
    this.environmental_metrics.air_quality_impact = 'critical';
  } else if (severity >= 6) {
    this.environmental_metrics.water_pollution_risk = 'high';
    this.environmental_metrics.air_quality_impact = 'high';
  } else if (severity >= 4) {
    this.environmental_metrics.water_pollution_risk = 'medium';
    this.environmental_metrics.air_quality_impact = 'medium';
  } else {
    this.environmental_metrics.water_pollution_risk = 'low';
    this.environmental_metrics.air_quality_impact = 'low';
  }
  
  return this.save();
};

// Pre-save middleware to update environmental metrics
hotspotSchema.pre('save', function(next) {
  if (this.isModified('base_severity') || this.isModified('typical_reports')) {
    this.updateEnvironmentalMetrics();
  }
  next();
});

module.exports = mongoose.model('Hotspot', hotspotSchema); 