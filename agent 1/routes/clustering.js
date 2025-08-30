const express = require('express');
const router = express.Router();
const ClusteringEngine = require('../clustering/ClusteringEngine');
const Hotspot = require('../models/Hotspot');
const Cluster = require('../models/Cluster');
const Joi = require('joi');

const clusteringEngine = new ClusteringEngine();

// Validation schemas
const clusteringOptionsSchema = Joi.object({
  algorithm: Joi.string().valid('dbscan', 'kmeans', 'hierarchical').default('dbscan'),
  parameters: Joi.object({
    // DBSCAN parameters
    eps: Joi.number().positive().default(0.01),
    minPoints: Joi.number().integer().min(2).default(2),
    
    // K-Means parameters
    k: Joi.number().integer().min(2).max(20).default(5),
    iterations: Joi.number().integer().min(10).max(1000).default(100),
    tolerance: Joi.number().positive().default(1e-4),
    
    // Hierarchical parameters
    distance: Joi.string().valid('euclidean', 'manhattan', 'cosine').default('euclidean'),
    linkage: Joi.string().valid('ward', 'single', 'complete', 'average').default('ward'),
    maxClusters: Joi.number().integer().min(2).max(20).default(8)
  }).default({}),
  minClusterSize: Joi.number().integer().min(1).default(2),
  maxClusters: Joi.number().integer().min(1).max(50).default(20),
  forceRecluster: Joi.boolean().default(false),
  includeNoise: Joi.boolean().default(false)
});

const hotspotFilterSchema = Joi.object({
  status: Joi.string().valid('active', 'cleared', 'monitoring', 'resolved', 'all').default('all'),
  waste_type: Joi.string().valid('household', 'commercial', 'industrial', 'street_litter', 'market_waste', 'construction', 'medical', 'electronic', 'all').default('all'),
  min_severity: Joi.number().min(0).max(10).default(0),
  max_severity: Joi.number().min(0).max(10).default(10),
  bounds: Joi.object({
    north: Joi.number().required(),
    south: Joi.number().required(),
    east: Joi.number().required(),
    west: Joi.number().required()
  }).optional(),
  limit: Joi.number().integer().min(1).max(1000).default(1000)
});

/**
 * @route   GET /api/clustering/clusters
 * @desc    Get clustered hotspot data
 * @access  Public
 */
router.get('/clusters', async (req, res) => {
  try {
    // Validate query parameters
    const { error: clusteringError, value: clusteringOptions } = clusteringOptionsSchema.validate(req.query);
    if (clusteringError) {
      return res.status(400).json({
        error: 'Invalid clustering parameters',
        details: clusteringError.details
      });
    }

    const { error: filterError, value: filterOptions } = hotspotFilterSchema.validate(req.query);
    if (filterError) {
      return res.status(400).json({
        error: 'Invalid filter parameters',
        details: filterError.details
      });
    }

    console.log('Clustering request received:', { clusteringOptions, filterOptions });

    // Check if we should use existing clusters or force reclustering
    if (!clusteringOptions.forceRecluster) {
      const existingClusters = await Cluster.find({
        algorithm: clusteringOptions.algorithm,
        status: 'active'
      }).populate('member_hotspots.hotspot_id');

      if (existingClusters.length > 0) {
        console.log('Returning existing clusters:', existingClusters.length);
        return res.json({
          success: true,
          message: 'Using existing clusters',
          data: {
            clusters: existingClusters,
            algorithm: clusteringOptions.algorithm,
            parameters: clusteringOptions.parameters,
            totalClusters: existingClusters.length,
            cached: true,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Fetch hotspots based on filters
    const hotspots = await fetchFilteredHotspots(filterOptions);
    
    if (hotspots.length === 0) {
      return res.json({
        success: true,
        message: 'No hotspots found matching criteria',
        data: {
          clusters: [],
          algorithm: clusteringOptions.algorithm,
          parameters: clusteringOptions.parameters,
          totalClusters: 0,
          cached: false,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log(`Running clustering on ${hotspots.length} hotspots...`);

    // Run clustering algorithm
    const clusteringResult = await clusteringEngine.runClustering(hotspots, clusteringOptions);

    // Save clusters to database
    const savedClusters = await saveClustersToDatabase(clusteringResult, hotspots);

    // Update hotspots with cluster assignments
    await updateHotspotClusterAssignments(savedClusters, hotspots);

    console.log(`Clustering completed successfully: ${savedClusters.length} clusters created`);

    res.json({
      success: true,
      message: 'Clustering completed successfully',
      data: {
        clusters: savedClusters,
        algorithm: clusteringOptions.algorithm,
        parameters: clusteringOptions.parameters,
        totalClusters: savedClusters.length,
        totalHotspots: hotspots.length,
        cached: false,
        timestamp: new Date().toISOString(),
        performance: {
          algorithm: clusteringOptions.algorithm,
          executionTime: clusteringResult.executionTime || 'N/A'
        }
      }
    });

  } catch (error) {
    console.error('Clustering error:', error);
    res.status(500).json({
      success: false,
      error: 'Clustering failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/clustering/clusters
 * @desc    Force reclustering of hotspots
 * @access  Public
 */
router.post('/clusters', async (req, res) => {
  try {
    const { error, value } = clusteringOptionsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid clustering parameters',
        details: error.details
      });
    }

    // Force reclustering
    value.forceRecluster = true;

    // Clear existing clusters
    await Cluster.deleteMany({ algorithm: value.algorithm });

    // Fetch all active hotspots
    const hotspots = await Hotspot.find({ status: { $ne: 'resolved' } });

    if (hotspots.length === 0) {
      return res.json({
        success: true,
        message: 'No hotspots found for clustering',
        data: {
          clusters: [],
          algorithm: value.algorithm,
          parameters: value.parameters,
          totalClusters: 0,
          cached: false,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log(`Forced reclustering on ${hotspots.length} hotspots...`);

    // Run clustering algorithm
    const clusteringResult = await clusteringEngine.runClustering(hotspots, value);

    // Save new clusters
    const savedClusters = await saveClustersToDatabase(clusteringResult, hotspots);

    // Update hotspot assignments
    await updateHotspotClusterAssignments(savedClusters, hotspots);

    res.json({
      success: true,
      message: 'Forced reclustering completed successfully',
      data: {
        clusters: savedClusters,
        algorithm: value.algorithm,
        parameters: value.parameters,
        totalClusters: savedClusters.length,
        totalHotspots: hotspots.length,
        cached: false,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Forced clustering error:', error);
    res.status(500).json({
      success: false,
      error: 'Forced clustering failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/clustering/clusters/:id
 * @desc    Get specific cluster details
 * @access  Public
 */
router.get('/clusters/:id', async (req, res) => {
  try {
    const cluster = await Cluster.findById(req.params.id)
      .populate('member_hotspots.hotspot_id')
      .populate('member_hotspots.hotspot_id.typical_reports');

    if (!cluster) {
      return res.status(404).json({
        success: false,
        error: 'Cluster not found'
      });
    }

    res.json({
      success: true,
      data: cluster
    });

  } catch (error) {
    console.error('Get cluster error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cluster',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/clustering/statistics
 * @desc    Get clustering statistics and performance metrics
 * @access  Public
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await Cluster.aggregate([
      {
        $group: {
          _id: '$algorithm',
          totalClusters: { $sum: 1 },
          avgClusterSize: { $avg: '$statistics.totalHotspots' },
          avgSeverity: { $avg: '$statistics.averageSeverity' },
          totalHotspots: { $sum: '$statistics.totalHotspots' },
          avgPriorityScore: { $avg: '$statistics.priorityScore' }
        }
      }
    ]);

    const totalHotspots = await Hotspot.countDocuments({ status: { $ne: 'resolved' } });
    const totalClusters = await Cluster.countDocuments({ status: 'active' });

    res.json({
      success: true,
      data: {
        algorithms: stats,
        summary: {
          totalHotspots,
          totalClusters,
          avgHotspotsPerCluster: totalHotspots / Math.max(totalClusters, 1)
        },
        timestamp: new Date().toISOString()
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
 * @route   DELETE /api/clustering/clusters/:id
 * @desc    Delete a specific cluster
 * @access  Public
 */
router.delete('/clusters/:id', async (req, res) => {
  try {
    const cluster = await Cluster.findById(req.params.id);
    
    if (!cluster) {
      return res.status(404).json({
        success: false,
        error: 'Cluster not found'
      });
    }

    // Remove cluster assignment from member hotspots
    await Hotspot.updateMany(
      { cluster_id: cluster._id },
      { $unset: { cluster_id: 1 } }
    );

    // Delete the cluster
    await Cluster.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Cluster deleted successfully'
    });

  } catch (error) {
    console.error('Delete cluster error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete cluster',
      message: error.message
    });
  }
});

// Helper functions

/**
 * Fetch hotspots based on filter criteria
 * @param {Object} filterOptions - Filter options
 * @returns {Array} Filtered hotspots
 */
async function fetchFilteredHotspots(filterOptions) {
  const query = {};

  // Status filter
  if (filterOptions.status !== 'all') {
    query.status = filterOptions.status;
  }

  // Waste type filter
  if (filterOptions.waste_type !== 'all') {
    query.waste_type = filterOptions.waste_type;
  }

  // Severity range filter
  if (filterOptions.min_severity > 0 || filterOptions.max_severity < 10) {
    query.base_severity = {};
    if (filterOptions.min_severity > 0) query.base_severity.$gte = filterOptions.min_severity;
    if (filterOptions.max_severity < 10) query.base_severity.$lte = filterOptions.max_severity;
  }

  // Geographic bounds filter
  if (filterOptions.bounds) {
    query.coordinates = {
      $geoWithin: {
        $box: [
          [filterOptions.bounds.west, filterOptions.bounds.south],
          [filterOptions.bounds.east, filterOptions.bounds.north]
        ]
      }
    };
  }

  return await Hotspot.find(query)
    .limit(filterOptions.limit)
    .sort({ base_severity: -1, createdAt: -1 });
}

/**
 * Save clustering results to database
 * @param {Object} clusteringResult - Clustering algorithm results
 * @param {Array} hotspots - Original hotspot data
 * @returns {Array} Saved cluster documents
 */
async function saveClustersToDatabase(clusteringResult, hotspots) {
  const clustersToSave = clusteringResult.clusters.map(cluster => {
    const memberHotspots = cluster.memberHotspots.map(hotspot => ({
      hotspot_id: hotspot._id,
      distance_from_centroid: cluster.radius,
      contribution_score: hotspot.calculated_severity || hotspot.base_severity
    }));

    return new Cluster({
      name: cluster.name,
      centroid: cluster.centroid,
      algorithm: clusteringResult.algorithm,
      parameters: clusteringResult.parameters,
      member_hotspots: memberHotspots,
      radius: cluster.radius,
      status: 'active',
      metadata: {
        algorithm_version: '1.0.0',
        confidence_score: 0.9
      }
    });
  });

  // Save all clusters
  const savedClusters = await Cluster.insertMany(clustersToSave);

  // Update statistics for each cluster
  for (const cluster of savedClusters) {
    await cluster.updateStatistics();
  }

  return savedClusters;
}

/**
 * Update hotspot cluster assignments
 * @param {Array} clusters - Saved cluster documents
 * @param {Array} hotspots - Original hotspot data
 */
async function updateHotspotClusterAssignments(clusters, hotspots) {
  const updateOperations = [];

  clusters.forEach(cluster => {
    cluster.member_hotspots.forEach(member => {
      updateOperations.push({
        updateOne: {
          filter: { _id: member.hotspot_id },
          update: { cluster_id: cluster._id }
        }
      });
    });
  });

  if (updateOperations.length > 0) {
    await Hotspot.bulkWrite(updateOperations);
  }
}

module.exports = router; 