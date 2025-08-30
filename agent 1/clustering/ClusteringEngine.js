const DBSCAN = require('ml-dbscan');
const kmeans = require('ml-kmeans');
const hclust = require('ml-hclust');
const Matrix = require('ml-matrix');
const { euclidean } = require('ml-distance');
const _ = require('lodash');

class ClusteringEngine {
  constructor() {
    this.algorithms = {
      dbscan: this.runDBSCAN.bind(this),
      kmeans: this.runKMeans.bind(this),
      hierarchical: this.runHierarchicalClustering.bind(this)
    };
  }

  /**
   * Main clustering method that runs the specified algorithm
   * @param {Array} hotspots - Array of hotspot objects with coordinates
   * @param {Object} options - Clustering options
   * @returns {Object} Clustering results with centroids and assignments
   */
  async runClustering(hotspots, options = {}) {
    const {
      algorithm = 'dbscan',
      parameters = {},
      minClusterSize = 2,
      maxClusters = 10
    } = options;

    if (!this.algorithms[algorithm]) {
      throw new Error(`Unsupported clustering algorithm: ${algorithm}`);
    }

    // Prepare data for clustering
    const coordinates = this.prepareCoordinates(hotspots);
    
    if (coordinates.length < minClusterSize) {
      return this.createSingleClusterResult(hotspots);
    }

    try {
      console.log(`Running ${algorithm} clustering on ${coordinates.length} hotspots...`);
      
      const result = await this.algorithms[algorithm](coordinates, parameters, hotspots);
      
      // Post-process results
      const processedResult = this.postProcessClusters(result, hotspots, algorithm, parameters);
      
      console.log(`Clustering completed: ${processedResult.clusters.length} clusters found`);
      
      return processedResult;
      
    } catch (error) {
      console.error(`Clustering algorithm ${algorithm} failed:`, error);
      throw error;
    }
  }

  /**
   * Prepare coordinate data for clustering algorithms
   * @param {Array} hotspots - Array of hotspot objects
   * @returns {Array} Array of [longitude, latitude] coordinates
   */
  prepareCoordinates(hotspots) {
    return hotspots.map(hotspot => [
      hotspot.coordinates.coordinates[0], // longitude
      hotspot.coordinates.coordinates[1]  // latitude
    ]);
  }

  /**
   * Run DBSCAN clustering algorithm
   * @param {Array} coordinates - Array of [lng, lat] coordinates
   * @param {Object} parameters - DBSCAN parameters
   * @param {Array} hotspots - Original hotspot objects
   * @returns {Object} DBSCAN clustering results
   */
  runDBSCAN(coordinates, parameters, hotspots) {
    const {
      eps = 0.01,        // Default: ~1km in degrees
      minPoints = 2       // Minimum points to form cluster
    } = parameters;

    // Convert coordinates to matrix
    const matrix = new Matrix(coordinates);
    
    // Run DBSCAN
    const dbscan = new DBSCAN(matrix, {
      eps: eps,
      minPoints: minPoints,
      distance: euclidean
    });

    const clusters = dbscan.clusters;
    const noise = dbscan.noise;

    // Process results
    const clusterResults = this.processDBSCANResults(clusters, coordinates, hotspots, noise);
    
    return {
      algorithm: 'dbscan',
      parameters: { eps, minPoints },
      clusters: clusterResults,
      noise: noise,
      totalClusters: clusterResults.length
    };
  }

  /**
   * Run K-Means clustering algorithm
   * @param {Array} coordinates - Array of [lng, lat] coordinates
   * @param {Object} parameters - K-Means parameters
   * @param {Array} hotspots - Original hotspot objects
   * @returns {Object} K-Means clustering results
   */
  runKMeans(coordinates, parameters, hotspots) {
    const {
      k = Math.min(5, Math.ceil(coordinates.length / 3)), // Default: 5 or 1/3 of points
      iterations = 100,
      tolerance = 1e-4
    } = parameters;

    // Convert coordinates to matrix
    const matrix = new Matrix(coordinates);
    
    // Run K-Means
    const kmeansResult = kmeans(matrix, k, {
      maxIterations: iterations,
      tolerance: tolerance,
      seed: 42 // For reproducible results
    });

    // Process results
    const clusterResults = this.processKMeansResults(kmeansResult, coordinates, hotspots);
    
    return {
      algorithm: 'kmeans',
      parameters: { k, iterations, tolerance },
      clusters: clusterResults,
      totalClusters: clusterResults.length,
      converged: kmeansResult.converged
    };
  }

  /**
   * Run Hierarchical clustering algorithm
   * @param {Array} coordinates - Array of [lng, lat] coordinates
   * @param {Object} parameters - Hierarchical clustering parameters
   * @param {Array} hotspots - Original hotspot objects
   * @returns {Object} Hierarchical clustering results
   */
  runHierarchicalClustering(coordinates, parameters, hotspots) {
    const {
      distance = 'euclidean',
      linkage = 'ward',
      maxClusters = Math.min(8, Math.ceil(coordinates.length / 2))
    } = parameters;

    // Convert coordinates to matrix
    const matrix = new Matrix(coordinates);
    
    // Run Hierarchical clustering
    const hclustResult = hclust(matrix, {
      distance: distance,
      linkage: linkage
    });

    // Cut tree to get desired number of clusters
    const clusters = hclustResult.cut(maxClusters);
    
    // Process results
    const clusterResults = this.processHierarchicalResults(clusters, coordinates, hotspots);
    
    return {
      algorithm: 'hierarchical',
      parameters: { distance, linkage, maxClusters },
      clusters: clusterResults,
      totalClusters: clusterResults.length,
      dendrogram: hclustResult
    };
  }

  /**
   * Process DBSCAN clustering results
   * @param {Array} clusters - DBSCAN cluster assignments
   * @param {Array} coordinates - Original coordinates
   * @param {Array} hotspots - Original hotspot objects
   * @param {Array} noise - Noise points
   * @returns {Array} Processed cluster objects
   */
  processDBSCANResults(clusters, coordinates, hotspots, noise) {
    const clusterMap = new Map();
    
    // Group points by cluster
    clusters.forEach((clusterId, pointIndex) => {
      if (clusterId === -1) return; // Skip noise points
      
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, []);
      }
      clusterMap.get(clusterId).push(pointIndex);
    });

    // Create cluster objects
    const clusterResults = [];
    clusterMap.forEach((pointIndices, clusterId) => {
      const clusterPoints = pointIndices.map(i => coordinates[i]);
      const clusterHotspots = pointIndices.map(i => hotspots[i]);
      
      const centroid = this.calculateCentroid(clusterPoints);
      const radius = this.calculateClusterRadius(clusterPoints, centroid);
      
      clusterResults.push({
        id: clusterId,
        centroid: {
          type: 'Point',
          coordinates: [centroid[0], centroid[1]] // [lng, lat]
        },
        memberIndices: pointIndices,
        memberHotspots: clusterHotspots,
        radius: radius,
        size: pointIndices.length,
        algorithm: 'dbscan'
      });
    });

    return clusterResults;
  }

  /**
   * Process K-Means clustering results
   * @param {Object} kmeansResult - K-Means result object
   * @param {Array} coordinates - Original coordinates
   * @param {Array} hotspots - Original hotspot objects
   * @returns {Array} Processed cluster objects
   */
  processKMeansResults(kmeansResult, coordinates, hotspots) {
    const { clusters, centroids } = kmeansResult;
    
    const clusterResults = [];
    
    centroids.forEach((centroid, clusterId) => {
      const memberIndices = clusters.reduce((acc, cluster, index) => {
        if (cluster === clusterId) acc.push(index);
        return acc;
      }, []);
      
      if (memberIndices.length === 0) return;
      
      const clusterPoints = memberIndices.map(i => coordinates[i]);
      const clusterHotspots = memberIndices.map(i => hotspots[i]);
      
      const radius = this.calculateClusterRadius(clusterPoints, centroid);
      
      clusterResults.push({
        id: clusterId,
        centroid: {
          type: 'Point',
          coordinates: [centroid[0], centroid[1]] // [lng, lat]
        },
        memberIndices: memberIndices,
        memberHotspots: clusterHotspots,
        radius: radius,
        size: memberIndices.length,
        algorithm: 'kmeans'
      });
    });

    return clusterResults;
  }

  /**
   * Process Hierarchical clustering results
   * @param {Array} clusters - Hierarchical cluster assignments
   * @param {Array} coordinates - Original coordinates
   * @param {Array} hotspots - Original hotspot objects
   * @returns {Array} Processed cluster objects
   */
  processHierarchicalResults(clusters, coordinates, hotspots) {
    const clusterMap = new Map();
    
    // Group points by cluster
    clusters.forEach((clusterId, pointIndex) => {
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, []);
      }
      clusterMap.get(clusterId).push(pointIndex);
    });

    // Create cluster objects
    const clusterResults = [];
    clusterMap.forEach((pointIndices, clusterId) => {
      const clusterPoints = pointIndices.map(i => coordinates[i]);
      const clusterHotspots = pointIndices.map(i => hotspots[i]);
      
      const centroid = this.calculateCentroid(clusterPoints);
      const radius = this.calculateClusterRadius(clusterPoints, centroid);
      
      clusterResults.push({
        id: clusterId,
        centroid: {
          type: 'Point',
          coordinates: [centroid[0], centroid[1]] // [lng, lat]
        },
        memberIndices: pointIndices,
        memberHotspots: clusterHotspots,
        radius: radius,
        size: pointIndices.length,
        algorithm: 'hierarchical'
      });
    });

    return clusterResults;
  }

  /**
   * Calculate centroid of a cluster
   * @param {Array} points - Array of [lng, lat] coordinates
   * @returns {Array} Centroid coordinates [lng, lat]
   */
  calculateCentroid(points) {
    if (points.length === 0) return [0, 0];
    
    const sumLng = points.reduce((sum, point) => sum + point[0], 0);
    const sumLat = points.reduce((sum, point) => sum + point[1], 0);
    
    return [sumLng / points.length, sumLat / points.length];
  }

  /**
   * Calculate radius of a cluster from centroid
   * @param {Array} points - Array of [lng, lat] coordinates
   * @param {Array} centroid - Centroid coordinates [lng, lat]
   * @returns {number} Radius in meters
   */
  calculateClusterRadius(points, centroid) {
    if (points.length === 0) return 0;
    
    let maxDistance = 0;
    
    points.forEach(point => {
      const distance = this.calculateDistance(
        centroid[1], centroid[0], // lat, lng
        point[1], point[0]         // lat, lng
      );
      maxDistance = Math.max(maxDistance, distance);
    });
    
    return maxDistance;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
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
  }

  /**
   * Create single cluster result when not enough points
   * @param {Array} hotspots - Array of hotspot objects
   * @returns {Object} Single cluster result
   */
  createSingleClusterResult(hotspots) {
    if (hotspots.length === 0) {
      return {
        algorithm: 'none',
        parameters: {},
        clusters: [],
        totalClusters: 0
      };
    }

    const coordinates = this.prepareCoordinates(hotspots);
    const centroid = this.calculateCentroid(coordinates);
    const radius = this.calculateClusterRadius(coordinates, centroid);

    return {
      algorithm: 'single',
      parameters: {},
      clusters: [{
        id: 0,
        centroid: {
          type: 'Point',
          coordinates: [centroid[0], centroid[1]]
        },
        memberIndices: hotspots.map((_, i) => i),
        memberHotspots: hotspots,
        radius: radius,
        size: hotspots.length,
        algorithm: 'single'
      }],
      totalClusters: 1
    };
  }

  /**
   * Post-process clustering results
   * @param {Object} result - Raw clustering result
   * @param {Array} hotspots - Original hotspot objects
   * @param {string} algorithm - Algorithm used
   * @param {Object} parameters - Algorithm parameters
   * @returns {Object} Processed clustering result
   */
  postProcessClusters(result, hotspots, algorithm, parameters) {
    // Sort clusters by size (largest first)
    result.clusters.sort((a, b) => b.size - a.size);
    
    // Add metadata to each cluster
    result.clusters.forEach((cluster, index) => {
      cluster.name = `Cluster ${index + 1}`;
      cluster.algorithm = algorithm;
      cluster.parameters = parameters;
      
      // Calculate cluster statistics
      cluster.statistics = this.calculateClusterStatistics(cluster.memberHotspots);
      
      // Add priority level
      cluster.priorityLevel = this.calculatePriorityLevel(cluster.statistics);
    });

    return result;
  }

  /**
   * Calculate statistics for a cluster
   * @param {Array} memberHotspots - Hotspots in the cluster
   * @returns {Object} Cluster statistics
   */
  calculateClusterStatistics(memberHotspots) {
    if (memberHotspots.length === 0) {
      return {
        totalHotspots: 0,
        averageSeverity: 0,
        maxSeverity: 0,
        minSeverity: 0,
        totalWasteKg: 0,
        totalCO2Emissions: 0,
        priorityScore: 0
      };
    }

    const severities = memberHotspots.map(h => h.calculated_severity || h.base_severity);
    const wasteAmounts = memberHotspots.map(h => h.environmental_metrics?.estimated_waste_kg || 0);
    const co2Amounts = memberHotspots.map(h => h.environmental_metrics?.co2_emissions || 0);

    return {
      totalHotspots: memberHotspots.length,
      averageSeverity: _.mean(severities),
      maxSeverity: Math.max(...severities),
      minSeverity: Math.min(...severities),
      totalWasteKg: _.sum(wasteAmounts),
      totalCO2Emissions: _.sum(co2Amounts),
      priorityScore: this.calculateClusterPriorityScore(memberHotspots)
    };
  }

  /**
   * Calculate priority level for a cluster
   * @param {Object} statistics - Cluster statistics
   * @returns {string} Priority level
   */
  calculatePriorityLevel(statistics) {
    const score = statistics.priorityScore;
    
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Calculate priority score for a cluster
   * @param {Array} memberHotspots - Hotspots in the cluster
   * @returns {number} Priority score (0-100)
   */
  calculateClusterPriorityScore(memberHotspots) {
    let score = 0;
    
    memberHotspots.forEach(hotspot => {
      // Base score from severity
      const severity = hotspot.calculated_severity || hotspot.base_severity;
      score += severity * 2;
      
      // Bonus for critical waste types
      if (['medical', 'electronic', 'industrial'].includes(hotspot.waste_type)) {
        score += 10;
      }
      
      // Bonus for high environmental impact
      if (hotspot.environmental_metrics?.water_pollution_risk === 'critical') {
        score += 8;
      }
      if (hotspot.environmental_metrics?.air_quality_impact === 'critical') {
        score += 8;
      }
      
      // Bonus for recent reports
      if (hotspot.typical_reports && hotspot.typical_reports.length > 0) {
        const latestReport = Math.max(...hotspot.typical_reports.map(r => new Date(r.timestamp)));
        const daysSinceReport = (Date.now() - latestReport) / (1000 * 60 * 60 * 24);
        
        if (daysSinceReport <= 1) score += 5;
        else if (daysSinceReport <= 7) score += 3;
      }
    });
    
    return Math.min(100, Math.round(score));
  }
}

module.exports = ClusteringEngine; 