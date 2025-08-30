# 🗑️ Agent 2: AI/ML Hotspot Clustering Backend

A powerful backend system that implements clustering algorithms to group nearby waste reports and provide intelligent hotspot analysis for waste management.

## 🚀 Features

### **Core Clustering Algorithms**
- **DBSCAN**: Density-based clustering for irregular-shaped clusters
- **K-Means**: Centroid-based clustering for spherical clusters  
- **Hierarchical**: Tree-based clustering for nested relationships

### **Smart Data Management**
- **Automatic Reclustering**: Triggers when new data exceeds threshold
- **Environmental Metrics**: Calculates waste impact, CO2 emissions, pollution risk
- **Geospatial Indexing**: Optimized location-based queries
- **Real-time Updates**: WebSocket-ready for live data streaming

### **RESTful API Endpoints**
- **`/api/clustering/clusters`**: Get clustered hotspot data
- **`/api/hotspots`**: Manage individual waste hotspots
- **`/api/clustering/statistics`**: Clustering performance metrics
- **`/api/hotspots/search/nearby`**: Geographic proximity search

## 🛠️ Installation

### Prerequisites
- Node.js 16+ 
- MongoDB 5+
- npm or yarn

### Setup Steps

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd waste-hotspot-clustering-backend
npm install
```

2. **Environment Configuration**
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/waste-hotspots

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Clustering Configuration
DEFAULT_CLUSTERING_ALGORITHM=dbscan
DEFAULT_DBSCAN_EPS=0.01
DEFAULT_DBSCAN_MIN_POINTS=2
```

3. **Start MongoDB**
```bash
# Start MongoDB service
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

4. **Run the Application**
```bash
# Development mode
npm run dev

# Production mode
npm start

# Run clustering manually
npm run cluster
```

## 📊 API Usage

### **Get Clustered Hotspots**
```bash
# Basic clustering with DBSCAN
GET /api/clustering/clusters?algorithm=dbscan&parameters[eps]=0.01&parameters[minPoints]=2

# K-Means clustering
GET /api/clustering/clusters?algorithm=kmeans&parameters[k]=5&parameters[iterations]=100

# Hierarchical clustering
GET /api/clustering/clusters?algorithm=hierarchical&parameters[maxClusters]=8
```

### **Create New Hotspot**
```bash
POST /api/hotspots
Content-Type: application/json

{
  "name": "CBD Market Waste",
  "coordinates": {
    "type": "Point",
    "coordinates": [36.8219, -1.2921]
  },
  "waste_type": "market_waste",
  "base_severity": 8.5,
  "description": "High accumulation of organic waste",
  "tags": ["organic", "high-traffic", "urgent"]
}
```

### **Force Reclustering**
```bash
POST /api/clustering/clusters
Content-Type: application/json

{
  "algorithm": "dbscan",
  "parameters": {
    "eps": 0.015,
    "minPoints": 3
  },
  "forceRecluster": true
}
```

## 🔧 Configuration

### **Clustering Parameters**

#### DBSCAN
- **`eps`**: Maximum distance between points (default: 0.01 ≈ 1km)
- **`minPoints`**: Minimum points to form cluster (default: 2)

#### K-Means
- **`k`**: Number of clusters (default: 5)
- **`iterations`**: Maximum iterations (default: 100)
- **`tolerance`**: Convergence tolerance (default: 1e-4)

#### Hierarchical
- **`distance`**: Distance metric (euclidean, manhattan, cosine)
- **`linkage`**: Linkage method (ward, single, complete, average)
- **`maxClusters`**: Maximum clusters to create (default: 8)

### **Environmental Impact Calculation**
```javascript
// Waste estimation
estimated_waste_kg = severity * 5.0

// CO2 emissions
co2_emissions = severity * 1.2

// Risk levels based on severity
if (severity >= 8) risk = 'critical'
else if (severity >= 6) risk = 'high'
else if (severity >= 4) risk = 'medium'
else risk = 'low'
```

## 📈 Data Models

### **Hotspot Schema**
```javascript
{
  name: String,
  coordinates: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  waste_type: String, // household, commercial, industrial, etc.
  base_severity: Number, // 0-10 scale
  typical_reports: [ReportSchema],
  environmental_metrics: {
    estimated_waste_kg: Number,
    co2_emissions: Number,
    water_pollution_risk: String,
    air_quality_impact: String
  },
  cluster_id: ObjectId,
  status: String,
  priority_level: String
}
```

### **Cluster Schema**
```javascript
{
  name: String,
  centroid: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  algorithm: String,
  parameters: Object,
  member_hotspots: [{
    hotspot_id: ObjectId,
    distance_from_centroid: Number,
    contribution_score: Number
  }],
  statistics: {
    totalHotspots: Number,
    averageSeverity: Number,
    priorityScore: Number
  },
  radius: Number,
  density: Number
}
```

## 🔄 Automatic Reclustering

The system automatically triggers reclustering when:

1. **New Data Threshold**: >10% new hotspots in 24 hours
2. **Manual Trigger**: POST to `/api/clustering/clusters` with `forceRecluster: true`
3. **Scheduled Jobs**: Configurable intervals (recommended: daily)

### **Reclustering Logic**
```javascript
// Check if reclustering is needed
const recentHotspots = await Hotspot.countDocuments({
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});

const totalHotspots = await Hotspot.countDocuments({ 
  status: { $ne: 'resolved' } 
});

// Trigger if significant new data
if (recentHotspots > totalHotspots * 0.1) {
  await triggerReclustering();
}
```

## 🧪 Testing

### **Run Tests**
```bash
npm test
```

### **Test Clustering**
```bash
# Test with sample data
curl -X POST http://localhost:5000/api/clustering/clusters \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"dbscan","parameters":{"eps":0.01,"minPoints":2}}'
```

### **Performance Testing**
```bash
# Test with large dataset
npm run cluster -- --test --size=1000 --algorithm=dbscan
```

## 📊 Monitoring & Analytics

### **Health Check**
```bash
GET /health
```

### **Clustering Statistics**
```bash
GET /api/clustering/statistics
```

### **Hotspot Summary**
```bash
GET /api/hotspots/statistics/summary
```

## 🚀 Production Deployment

### **Docker Deployment**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### **Environment Variables**
```env
NODE_ENV=production
MONGODB_URI=mongodb://production-db:27017/waste-hotspots
JWT_SECRET=your-production-secret
RATE_LIMIT_MAX_REQUESTS=50
```

### **Performance Optimization**
- **Database Indexing**: Geospatial and compound indexes
- **Caching**: Redis for frequently accessed clusters
- **Load Balancing**: Multiple instances behind nginx
- **Monitoring**: Prometheus + Grafana for metrics

## 🔗 Integration Examples

### **Frontend Integration**
```javascript
// Fetch clustered data
const response = await fetch('/api/clustering/clusters?algorithm=dbscan');
const { data } = await response.json();

// Display clusters on map
data.clusters.forEach(cluster => {
  L.circle(cluster.centroid.coordinates, {
    radius: cluster.radius,
    color: getPriorityColor(cluster.statistics.priorityScore)
  }).addTo(map);
});
```

### **Webhook Integration**
```javascript
// Configure webhook for new hotspots
POST /webhooks/hotspot-created
{
  "hotspot_id": "hotspot_123",
  "coordinates": [36.8219, -1.2921],
  "severity": 8.5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🐛 Troubleshooting

### **Common Issues**

1. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity

2. **Clustering Algorithm Fails**
   - Ensure sufficient data points (minimum 2)
   - Adjust algorithm parameters
   - Check coordinate format (longitude, latitude)

3. **Performance Issues**
   - Add database indexes
   - Reduce clustering frequency
   - Implement caching layer

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=clustering:* npm run dev

# Check clustering engine logs
console.log('Clustering data:', clusteringResult);
```

## 📚 API Documentation

Full API documentation available at `/api-docs` when running in development mode.

### **Swagger UI**
```bash
# Access interactive API docs
http://localhost:5000/api-docs
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Email**: support@wastewise.com

---

**Built with ❤️ for better waste management and environmental protection** 