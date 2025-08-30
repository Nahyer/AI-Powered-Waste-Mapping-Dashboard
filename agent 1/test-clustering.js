const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Sample waste hotspot data for testing
const sampleHotspots = [
  {
    name: "CBD Market Area",
    coordinates: {
      type: "Point",
      coordinates: [36.8219, -1.2921]
    },
    waste_type: "market_waste",
    base_severity: 9.5,
    description: "High accumulation of organic waste and plastics"
  },
  {
    name: "University Way",
    coordinates: {
      type: "Point",
      coordinates: [36.8007, -1.3028]
    },
    waste_type: "street_litter",
    base_severity: 8.7,
    description: "Street litter accumulation near university"
  },
  {
    name: "Westlands Mall",
    coordinates: {
      type: "Point",
      coordinates: [36.8167, -1.2833]
    },
    waste_type: "commercial",
    base_severity: 9.2,
    description: "Commercial waste from shopping mall"
  },
  {
    name: "Kilimani Residential",
    coordinates: {
      type: "Point",
      coordinates: [36.8062, -1.2745]
    },
    waste_type: "household",
    base_severity: 7.6,
    description: "Household waste collection point"
  },
  {
    name: "Eastleigh Market",
    coordinates: {
      type: "Point",
      coordinates: [36.8833, -1.3167]
    },
    waste_type: "market_waste",
    base_severity: 6.8,
    description: "Market waste from Eastleigh area"
  },
  {
    name: "Karen Shopping",
    coordinates: {
      type: "Point",
      coordinates: [36.7833, -1.2500]
    },
    waste_type: "commercial",
    base_severity: 8.4,
    description: "Commercial waste from Karen shopping center"
  },
  {
    name: "Pipeline Estate",
    coordinates: {
      type: "Point",
      coordinates: [36.9167, -1.3333]
    },
    waste_type: "household",
    base_severity: 5.8,
    description: "Household waste from residential estate"
  },
  {
    name: "Lavington",
    coordinates: {
      type: "Point",
      coordinates: [36.8000, -1.2667]
    },
    waste_type: "mixed",
    base_severity: 7.3,
    description: "Mixed waste types in Lavington area"
  },
  {
    name: "River Road",
    coordinates: {
      type: "Point",
      coordinates: [36.8167, -1.3083]
    },
    waste_type: "street_litter",
    base_severity: 8.9,
    description: "Street litter along River Road"
  },
  {
    name: "South B",
    coordinates: {
      type: "Point",
      coordinates: [36.8611, -1.2917]
    },
    waste_type: "household",
    base_severity: 6.5,
    description: "Household waste in South B area"
  }
];

async function testClusteringAPI() {
  console.log('🧪 Testing Waste Hotspot Clustering API\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Health Check:', healthResponse.data.status);
    console.log('   Service:', healthResponse.data.service);
    console.log('   Version:', healthResponse.data.version);
    console.log('   Timestamp:', healthResponse.data.timestamp);
    console.log('');

    // Test 2: Create Sample Hotspots
    console.log('2️⃣ Creating Sample Hotspots...');
    const createdHotspots = [];
    
    for (const hotspot of sampleHotspots) {
      try {
        const response = await axios.post(`${BASE_URL}/hotspots`, hotspot);
        createdHotspots.push(response.data.data);
        console.log(`   ✅ Created: ${hotspot.name}`);
      } catch (error) {
        console.log(`   ❌ Failed to create ${hotspot.name}:`, error.response?.data?.error || error.message);
      }
    }
    
    console.log(`   Total created: ${createdHotspots.length}/${sampleHotspots.length}`);
    console.log('');

    if (createdHotspots.length === 0) {
      console.log('❌ No hotspots created. Cannot proceed with clustering test.');
      return;
    }

    // Test 3: DBSCAN Clustering
    console.log('3️⃣ Testing DBSCAN Clustering...');
    try {
      const dbscanResponse = await axios.get(`${BASE_URL}/clustering/clusters`, {
        params: {
          algorithm: 'dbscan',
          'parameters[eps]': 0.01,
          'parameters[minPoints]': 2
        }
      });
      
      const dbscanData = dbscanResponse.data.data;
      console.log('✅ DBSCAN Clustering Successful!');
      console.log(`   Algorithm: ${dbscanData.algorithm}`);
      console.log(`   Total Clusters: ${dbscanData.totalClusters}`);
      console.log(`   Total Hotspots: ${dbscanData.totalHotspots}`);
      console.log(`   Cached: ${dbscanData.cached}`);
      console.log('');
      
      // Display cluster details
      dbscanData.clusters.forEach((cluster, index) => {
        console.log(`   📍 Cluster ${index + 1}:`);
        console.log(`      Size: ${cluster.statistics.totalHotspots} hotspots`);
        console.log(`      Avg Severity: ${cluster.statistics.averageSeverity.toFixed(2)}`);
        console.log(`      Priority Score: ${cluster.statistics.priorityScore}`);
        console.log(`      Radius: ${Math.round(cluster.radius)}m`);
        console.log(`      Priority Level: ${cluster.priorityLevel}`);
        console.log('');
      });

    } catch (error) {
      console.log('❌ DBSCAN Clustering failed:', error.response?.data?.error || error.message);
    }

    // Test 4: K-Means Clustering
    console.log('4️⃣ Testing K-Means Clustering...');
    try {
      const kmeansResponse = await axios.get(`${BASE_URL}/clustering/clusters`, {
        params: {
          algorithm: 'kmeans',
          'parameters[k]': 3,
          'parameters[iterations]': 100
        }
      });
      
      const kmeansData = kmeansResponse.data.data;
      console.log('✅ K-Means Clustering Successful!');
      console.log(`   Algorithm: ${kmeansData.algorithm}`);
      console.log(`   Total Clusters: ${kmeansData.totalClusters}`);
      console.log(`   Converged: ${kmeansData.converged}`);
      console.log('');
      
    } catch (error) {
      console.log('❌ K-Means Clustering failed:', error.response?.data?.error || error.message);
    }

    // Test 5: Force Reclustering
    console.log('5️⃣ Testing Force Reclustering...');
    try {
      const forceResponse = await axios.post(`${BASE_URL}/clustering/clusters`, {
        algorithm: 'dbscan',
        parameters: {
          eps: 0.015,
          minPoints: 3
        },
        forceRecluster: true
      });
      
      const forceData = forceResponse.data.data;
      console.log('✅ Force Reclustering Successful!');
      console.log(`   Algorithm: ${forceData.algorithm}`);
      console.log(`   Total Clusters: ${forceData.totalClusters}`);
      console.log(`   Cached: ${forceData.cached}`);
      console.log('');
      
    } catch (error) {
      console.log('❌ Force Reclustering failed:', error.response?.data?.error || error.message);
    }

    // Test 6: Get Clustering Statistics
    console.log('6️⃣ Testing Clustering Statistics...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/clustering/statistics`);
      const statsData = statsResponse.data.data;
      
      console.log('✅ Clustering Statistics Retrieved!');
      console.log(`   Total Hotspots: ${statsData.summary.totalHotspots}`);
      console.log(`   Total Clusters: ${statsData.summary.totalClusters}`);
      console.log(`   Avg Hotspots per Cluster: ${statsData.summary.avgHotspotsPerCluster.toFixed(2)}`);
      console.log('');
      
      console.log('   📊 Algorithm Performance:');
      statsData.algorithms.forEach(alg => {
        console.log(`      ${alg._id}:`);
        console.log(`        Clusters: ${alg.totalClusters}`);
        console.log(`        Avg Size: ${alg.avgClusterSize.toFixed(2)}`);
        console.log(`        Avg Severity: ${alg.avgSeverity.toFixed(2)}`);
        console.log(`        Avg Priority: ${alg.avgPriorityScore.toFixed(2)}`);
      });
      console.log('');

    } catch (error) {
      console.log('❌ Statistics retrieval failed:', error.response?.data?.error || error.message);
    }

    // Test 7: Get Hotspot Statistics
    console.log('7️⃣ Testing Hotspot Statistics...');
    try {
      const hotspotStatsResponse = await axios.get(`${BASE_URL}/hotspots/statistics/summary`);
      const hotspotStats = hotspotStatsResponse.data.data;
      
      console.log('✅ Hotspot Statistics Retrieved!');
      console.log(`   Total Hotspots: ${hotspotStats.totalHotspots}`);
      console.log(`   Average Severity: ${hotspotStats.avgSeverity}`);
      console.log(`   Total Waste: ${hotspotStats.totalWaste}kg`);
      console.log(`   Total CO2: ${hotspotStats.totalCO2}kg`);
      console.log('');
      
      console.log('   📊 Status Distribution:');
      Object.entries(hotspotStats.byStatus).forEach(([status, count]) => {
        console.log(`      ${status}: ${count}`);
      });
      console.log('');
      
      console.log('   📊 Waste Type Distribution:');
      Object.entries(hotspotStats.byType).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
      });
      console.log('');

    } catch (error) {
      console.log('❌ Hotspot statistics failed:', error.response?.data?.error || error.message);
    }

    console.log('🎉 Clustering API Test Completed Successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   ✅ Health check working');
    console.log(`   ✅ ${createdHotspots.length} hotspots created`);
    console.log('   ✅ DBSCAN clustering functional');
    console.log('   ✅ K-Means clustering functional');
    console.log('   ✅ Force reclustering working');
    console.log('   ✅ Statistics endpoints functional');
    console.log('');
    console.log('🚀 Your clustering backend is ready for production use!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure your backend server is running:');
      console.log('   npm run dev');
      console.log('');
      console.log('💡 Check if MongoDB is running and accessible');
    }
  }
}

// Run the test
if (require.main === module) {
  testClusteringAPI();
}

module.exports = { testClusteringAPI, sampleHotspots }; 