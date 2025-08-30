const express = require('express');
const router = express.Router();
const Hotspot = require('../models/Hotspot');
const Cluster = require('../models/Cluster');
const Joi = require('joi');

// Validation schemas
const hotspotSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(200),
  coordinates: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required()
  }).required(),
  waste_type: Joi.string().valid('household', 'commercial', 'industrial', 'street_litter', 'market_waste', 'construction', 'medical', 'electronic').required(),
  base_severity: Joi.number().min(0).max(10).required(),
  description: Joi.string().max(1000).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object({
    created_by: Joi.string().optional(),
    source: Joi.string().valid('user_report', 'sensor', 'ai_detection', 'manual_entry').default('user_report'),
    confidence_score: Joi.number().min(0).max(1).default(0.8)
  }).optional()
});

const reportSchema = Joi.object({
  reporter_id: Joi.string().required(),
  description: Joi.string().required().max(500),
  photo_url: Joi.string().uri().optional(),
  severity_score: Joi.number().min(0).max(10).default(5),
  location_accuracy: Joi.number().min(0).max(100).default(80)
});

/**
 * @route   GET /api/hotspots
 * @desc    Get all hotspots with optional filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      status = 'all',
      waste_type = 'all',
      min_severity = 0,
      max_severity = 10,
      cluster_id,
      bounds,
      limit = 100,
      page = 1,
      sort_by = 'base_severity',
      sort_order = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (status !== 'all') query.status = status;
    if (waste_type !== 'all') query.waste_type = waste_type;
    if (cluster_id) query.cluster_id = cluster_id;

    // Severity range
    if (min_severity > 0 || max_severity < 10) {
      query.base_severity = {};
      if (min_severity > 0) query.base_severity.$gte = parseFloat(min_severity);
      if (max_severity < 10) query.base_severity.$lte = parseFloat(max_severity);
    }

    // Geographic bounds
    if (bounds) {
      try {
        const boundsObj = JSON.parse(bounds);
        if (boundsObj.north && boundsObj.south && boundsObj.east && boundsObj.west) {
          query.coordinates = {
            $geoWithin: {
              $box: [
                [boundsObj.west, boundsObj.south],
                [boundsObj.east, boundsObj.north]
              ]
            }
          };
        }
      } catch (e) {
        console.warn('Invalid bounds parameter:', bounds);
      }
    }

    // Build sort object
    const sort = {};
    sort[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const hotspots = await Hotspot.find(query)
      .populate('cluster_id', 'name centroid radius')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Hotspot.countDocuments(query);

    res.json({
      success: true,
      data: {
        hotspots,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          status,
          waste_type,
          min_severity,
          max_severity,
          cluster_id,
          bounds
        }
      }
    });

  } catch (error) {
    console.error('Get hotspots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hotspots',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/hotspots/:id
 * @desc    Get specific hotspot by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const hotspot = await Hotspot.findById(req.params.id)
      .populate('cluster_id', 'name centroid radius statistics');

    if (!hotspot) {
      return res.status(404).json({
        success: false,
        error: 'Hotspot not found'
      });
    }

    res.json({
      success: true,
      data: hotspot
    });

  } catch (error) {
    console.error('Get hotspot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hotspot',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/hotspots
 * @desc    Create new hotspot
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = hotspotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    // Create hotspot
    const hotspot = new Hotspot(value);
    await hotspot.save();

    // Update environmental metrics
    await hotspot.updateEnvironmentalMetrics();

    // Check if this hotspot should trigger reclustering
    await checkAndTriggerReclustering();

    res.status(201).json({
      success: true,
      message: 'Hotspot created successfully',
      data: hotspot
    });

  } catch (error) {
    console.error('Create hotspot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create hotspot',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/hotspots/:id
 * @desc    Update existing hotspot
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = hotspotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    const hotspot = await Hotspot.findByIdAndUpdate(
      req.params.id,
      { ...value, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!hotspot) {
      return res.status(404).json({
        success: false,
        error: 'Hotspot not found'
      });
    }

    // Update environmental metrics
    await hotspot.updateEnvironmentalMetrics();

    // Check if update should trigger reclustering
    await checkAndTriggerReclustering();

    res.json({
      success: true,
      message: 'Hotspot updated successfully',
      data: hotspot
    });

  } catch (error) {
    console.error('Update hotspot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hotspot',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/hotspots/:id
 * @desc    Delete hotspot
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const hotspot = await Hotspot.findByIdAndDelete(req.params.id);

    if (!hotspot) {
      return res.status(404).json({
        success: false,
        error: 'Hotspot not found'
      });
    }

    // Remove from cluster if assigned
    if (hotspot.cluster_id) {
      await Cluster.findByIdAndUpdate(
        hotspot.cluster_id,
        {
          $pull: { member_hotspots: { hotspot_id: hotspot._id } }
        }
      );
    }

    res.json({
      success: true,
      message: 'Hotspot deleted successfully'
    });

  } catch (error) {
    console.error('Delete hotspot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete hotspot',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/hotspots/:id/reports
 * @desc    Add report to hotspot
 * @access  Public
 */
router.post('/:id/reports', async (req, res) => {
  try {
    // Validate report
    const { error, value } = reportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    const hotspot = await Hotspot.findById(req.params.id);
    if (!hotspot) {
      return res.status(404).json({
        success: false,
        error: 'Hotspot not found'
      });
    }

    // Add report
    hotspot.typical_reports.push(value);
    await hotspot.save();

    // Update environmental metrics
    await hotspot.updateEnvironmentalMetrics();

    // Check if new report should trigger reclustering
    await checkAndTriggerReclustering();

    res.json({
      success: true,
      message: 'Report added successfully',
      data: hotspot
    });

  } catch (error) {
    console.error('Add report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add report',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/hotspots/statistics/summary
 * @desc    Get hotspot statistics summary
 * @access  Public
 */
router.get('/statistics/summary', async (req, res) => {
  try {
    const stats = await Hotspot.aggregate([
      {
        $group: {
          _id: null,
          totalHotspots: { $sum: 1 },
          avgSeverity: { $avg: '$base_severity' },
          totalWaste: { $sum: '$environmental_metrics.estimated_waste_kg' },
          totalCO2: { $sum: '$environmental_metrics.co2_emissions' },
          byStatus: {
            $push: '$status'
          },
          byType: {
            $push: '$waste_type'
          },
          bySeverity: {
            $push: '$base_severity'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        success: true,
        data: {
          totalHotspots: 0,
          avgSeverity: 0,
          totalWaste: 0,
          totalCO2: 0,
          byStatus: {},
          byType: {},
          bySeverity: {}
        }
      });
    }

    const stat = stats[0];

    // Process status distribution
    const statusCount = stat.byStatus.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Process waste type distribution
    const typeCount = stat.byType.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Process severity distribution
    const severityRanges = {
      '0-2': 0, '3-5': 0, '6-8': 0, '9-10': 0
    };
    stat.bySeverity.forEach(severity => {
      if (severity <= 2) severityRanges['0-2']++;
      else if (severity <= 5) severityRanges['3-5']++;
      else if (severity <= 8) severityRanges['6-8']++;
      else severityRanges['9-10']++;
    });

    res.json({
      success: true,
      data: {
        totalHotspots: stat.totalHotspots,
        avgSeverity: Math.round(stat.avgSeverity * 100) / 100,
        totalWaste: Math.round(stat.totalWaste * 100) / 100,
        totalCO2: Math.round(stat.totalCO2 * 100) / 100,
        byStatus: statusCount,
        byType: typeCount,
        bySeverity: severityRanges
      }
    });

  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/hotspots/search/nearby
 * @desc    Find hotspots near a specific location
 * @access  Public
 */
router.get('/search/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const hotspots = await Hotspot.find({
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    })
    .limit(parseInt(limit))
    .populate('cluster_id', 'name centroid radius');

    res.json({
      success: true,
      data: {
        hotspots,
        searchParams: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius: parseInt(radius),
          limit: parseInt(limit)
        },
        totalFound: hotspots.length
      }
    });

  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

// Helper function to check if reclustering should be triggered
async function checkAndTriggerReclustering() {
  try {
    // Check if we have enough new data to warrant reclustering
    const recentHotspots = await Hotspot.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    const totalHotspots = await Hotspot.countDocuments({ status: { $ne: 'resolved' } });

    // Trigger reclustering if we have significant new data (>10% of total)
    if (recentHotspots > totalHotspots * 0.1) {
      console.log('Significant new data detected, triggering reclustering...');
      
      // This would typically trigger a background job or webhook
      // For now, we'll just log it
      // In production, you might want to use a job queue like Bull or Agenda
    }
  } catch (error) {
    console.error('Error checking reclustering trigger:', error);
  }
}

module.exports = router; 