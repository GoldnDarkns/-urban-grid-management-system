import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Shuffle array (new order each time) for fresh suggested queries on load/refresh
function shuffleSuggested(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
import { 
  Database, Plus, Edit2, Trash2, Save, X, AlertCircle, 
  CheckCircle, Code, FileText, Search, Filter, RefreshCw,
  Eye, EyeOff, Copy, ChevronDown, ChevronRight, Settings,
  Table, Layers, Server, Activity
} from 'lucide-react';
import { dataAPI, queriesAPI } from '../services/api';
import { useAppMode } from '../utils/useAppMode';

// MongoDB Query Code Templates
const QUERY_CODE_TEMPLATES = {
  1: {
    name: "Zones with Hospitals",
    code: `// Query 1: Zones with Hospitals
db.zones.find({
  "critical_sites": "hospital"
}).limit(10)

// Returns zones containing hospital infrastructure
// Fields: zone_id, name, priority, critical_sites[]`,
    pipeline: null
  },
  2: {
    name: "Top Zones by Priority",
    code: `// Query 2: Top Zones by Priority
db.zones.find({})
  .sort({ "grid_priority": -1 })
  .limit(10)

// Returns zones sorted by grid priority (highest first)
// Fields: zone_id, name, priority, population`,
    pipeline: null
  },
  3: {
    name: "Zone Adjacency",
    code: `// Query 3: Zone Adjacency
// Step 1: Get the zone
const zone = db.zones.findOne({ "_id": "Z_001" })

// Step 2: Get neighbors from grid_edges
db.grid_edges.find({ "from_zone": "Z_001" })

// Step 3: Get neighbor zone details
const neighborIds = edges.map(e => e.to_zone)
db.zones.find({ "_id": { "$in": neighborIds } })`,
    pipeline: null
  },
  4: {
    name: "Hourly Demand by Zone",
    code: `// Query 4: Hourly Demand by Zone (Aggregation)
db.meter_readings.aggregate([
  { "$match": { 
    "zone_id": "Z_001", 
    "ts": { "$gte": ISODate("2024-01-01") }
  }},
  { "$group": {
    "_id": {
      "year": { "$year": "$ts" },
      "month": { "$month": "$ts" },
      "day": { "$dayOfMonth": "$ts" },
      "hour": { "$hour": "$ts" }
    },
    "total_kwh": { "$sum": "$kwh" },
    "avg_kwh": { "$avg": "$kwh" },
    "reading_count": { "$sum": 1 }
  }},
  { "$sort": { "_id": 1 }},
  { "$limit": 24 }
])`,
    pipeline: true
  },
  5: {
    name: "AQI Threshold Violations",
    code: `// Query 5: AQI Threshold Violations (Aggregation)
db.air_climate_readings.aggregate([
  { "$match": { "aqi": { "$gte": 101 } }},
  { "$group": {
    "_id": "$zone_id",
    "violation_count": { "$sum": 1 },
    "max_aqi": { "$max": "$aqi" },
    "avg_aqi": { "$avg": "$aqi" }
  }},
  { "$sort": { "violation_count": -1 }},
  { "$limit": 10 }
])`,
    pipeline: true
  },
  6: {
    name: "Consumption Anomalies",
    code: `// Query 6: Consumption Anomalies
// Find households consuming > 2x their baseline

// Step 1: Get household baselines
const households = db.households.find().toArray()
const baselineMap = {}
households.forEach(h => {
  baselineMap[h._id] = h.baseline_kwh_daily / 24
})

// Step 2: Find anomalies in recent readings
db.meter_readings.find({
  "ts": { "$gte": new Date(Date.now() - 24*60*60*1000) }
}).forEach(reading => {
  const baseline = baselineMap[reading.household_id]
  if (reading.kwh > baseline * 2.0) {
    // This is an anomaly
    print(\`Anomaly: \${reading.household_id} - \${reading.kwh} kWh\`)
  }
})`,
    pipeline: false
  },
  7: {
    name: "Active Constraint Events",
    code: `// Query 7: Active Constraint Events
const now = new Date()
const weekAgo = new Date(now - 7*24*60*60*1000)

db.constraint_events.find({
  "$or": [
    { "end_ts": { "$gte": now } },      // Still active
    { "start_ts": { "$gte": weekAgo } }  // Recent
  ]
}).sort({ "start_ts": -1 }).limit(10)

// Returns events that are currently active or ended recently
// Fields: event_id, type, severity, reason, status, start_ts, end_ts`,
    pipeline: false
  },
  8: {
    name: "Zone Risk Factors",
    code: `// Query 8: Zone Risk Factors (Complex Aggregation)
// Calculate risk score for each zone based on:
// - Grid priority (x10)
// - Critical sites count (x15 each)
// - High AQI (>150: +30, >100: +15)
// - High demand (>2 kWh max: +20)

db.zones.find().forEach(zone => {
  let riskScore = zone.grid_priority * 10
  
  // Add critical sites bonus
  if (zone.critical_sites) {
    riskScore += zone.critical_sites.length * 15
  }
  
  // Get recent AQI for this zone
  const aqi = db.air_climate_readings.aggregate([
    { "$match": { "zone_id": zone._id }},
    { "$group": { "_id": null, "avg": { "$avg": "$aqi" }}}
  ]).toArray()[0]
  
  if (aqi && aqi.avg > 150) riskScore += 30
  else if (aqi && aqi.avg > 100) riskScore += 15
  
  print(\`Zone \${zone._id}: Risk Score = \${riskScore}\`)
})`,
    pipeline: true
  },
  9: {
    name: "Demand vs Temperature",
    code: `// Query 9: Demand vs Temperature Correlation
// Join meter_readings with air_climate_readings by hour

// Get hourly demand
const demand = db.meter_readings.aggregate([
  { "$match": { "ts": { "$gte": ISODate("2024-01-01") }}},
  { "$group": {
    "_id": { "day": { "$dayOfMonth": "$ts" }, "hour": { "$hour": "$ts" }},
    "total_kwh": { "$sum": "$kwh" }
  }},
  { "$sort": { "_id": 1 }}
]).toArray()

// Get hourly temperature
const temps = db.air_climate_readings.aggregate([
  { "$match": { "ts": { "$gte": ISODate("2024-01-01") }}},
  { "$group": {
    "_id": { "day": { "$dayOfMonth": "$ts" }, "hour": { "$hour": "$ts" }},
    "avg_temp": { "$avg": "$temperature_c" }
  }},
  { "$sort": { "_id": 1 }}
]).toArray()

// Join by hour key
// Returns: datetime, demand_kwh, temperature_c`,
    pipeline: true
  },
  10: {
    name: "Critical Infrastructure Status",
    code: `// Query 10: Critical Infrastructure Status Report
db.zones.find({
  "critical_sites": { "$exists": true, "$ne": [] }
}).forEach(zone => {
  // Get recent alerts
  const alerts = db.alerts.find({
    "zone_id": zone._id,
    "ts": { "$gte": new Date(Date.now() - 24*60*60*1000) }
  }).sort({ "ts": -1 }).limit(5).toArray()
  
  // Get latest AQI
  const aqi = db.air_climate_readings.findOne(
    { "zone_id": zone._id },
    { sort: { "ts": -1 }}
  )
  
  // Get 24h demand
  const demand = db.meter_readings.aggregate([
    { "$match": { 
      "zone_id": zone._id,
      "ts": { "$gte": new Date(Date.now() - 24*60*60*1000) }
    }},
    { "$group": { "_id": null, "total": { "$sum": "$kwh" }}}
  ]).toArray()[0]
  
  print(\`Zone: \${zone.name}\`)
  print(\`  Critical Sites: \${zone.critical_sites.join(', ')}\`)
  print(\`  Latest AQI: \${aqi?.aqi || 'N/A'}\`)
  print(\`  24h Demand: \${demand?.total || 0} kWh\`)
  print(\`  Recent Alerts: \${alerts.length}\`)
})`,
    pipeline: true
  }
};

export default function AdminData() {
  const { mode } = useAppMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [dbStatus, setDbStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Collections state
  const [collections, setCollections] = useState({});
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionData, setCollectionData] = useState([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  
  // Query code state
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [showCode, setShowCode] = useState({});
  
  // CRUD state
  const [editingDoc, setEditingDoc] = useState(null);
  const [newDocJson, setNewDocJson] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchQueries();
  }, [mode]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await dataAPI.getStatus();
      setDbStatus(response.data);
      setCollections(response.data.collections || {});
      setError(null);
    } catch (err) {
      setError('Failed to connect to MongoDB. Check your .env configuration.');
      setDbStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const fetchQueries = async () => {
    try {
      const response = await queriesAPI.listQueries();
      setQueries(response.data.queries || []);
    } catch (err) {
      console.error('Failed to load queries:', err);
    }
  };

  const fetchCollectionData = async (collectionName) => {
    setCollectionLoading(true);
    try {
      // Use the data API to get collection sample - sorted by newest first
      const response = await dataAPI.getCollectionSample(collectionName, 50);
      let docs = response.data.documents || [];
      
      // Sort by _id descending (newest first) - MongoDB ObjectIds are time-based
      // Also try to sort by 'ts' or 'created_at' if available
      docs = docs.sort((a, b) => {
        // Try timestamp fields first
        if (a.ts && b.ts) {
          return new Date(b.ts) - new Date(a.ts);
        }
        if (a.created_at && b.created_at) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        // Fall back to _id comparison (ObjectIds contain timestamp)
        const aId = String(a._id || a.id || '');
        const bId = String(b._id || b.id || '');
        return bId.localeCompare(aId);
      });
      
      setCollectionData(docs);
      setSelectedCollection(collectionName);
    } catch (err) {
      setError(`Failed to load ${collectionName} data`);
      setCollectionData([]);
    } finally {
      setCollectionLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!selectedCollection || !newDocJson.trim()) return;
    
    try {
      const doc = JSON.parse(newDocJson);
      const response = await dataAPI.createDocument(selectedCollection, doc);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setSuccess(`Document created in ${selectedCollection}`);
        setNewDocJson('');
        setShowCreateForm(false);
        fetchCollectionData(selectedCollection);
        fetchStatus(); // Refresh counts
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Invalid JSON format');
    }
  };

  const handleUpdateDocument = async (docId, updatedDoc) => {
    if (!selectedCollection) return;
    
    try {
      const response = await dataAPI.updateDocument(selectedCollection, docId, updatedDoc);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setSuccess(`Document updated in ${selectedCollection}`);
        setEditingDoc(null);
        fetchCollectionData(selectedCollection);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to update document');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!selectedCollection) return;
    if (!confirm(`Are you sure you want to delete this document?`)) return;
    
    try {
      const response = await dataAPI.deleteDocument(selectedCollection, docId);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setSuccess(`Document deleted from ${selectedCollection}`);
        fetchCollectionData(selectedCollection);
        fetchStatus(); // Refresh counts
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const toggleQueryCode = (queryId) => {
    setShowCode(prev => ({ ...prev, [queryId]: !prev[queryId] }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Server },
    { id: 'collections', label: 'Collections', icon: Database },
    { id: 'queries', label: 'Query Code', icon: Code },
    { id: 'crud', label: 'Data Editor', icon: Edit2 },
    { id: 'manage-queries', label: 'Manage Queries', icon: Plus },
  ];
  
  // Suggested queries for demo - with actual MongoDB code
  const SUGGESTED_QUERIES = [
    { 
      name: "High Energy Consumers", 
      description: "Find households consuming more than 5 kWh per reading", 
      type: "advanced", 
      collection: "meter_readings",
      code: `// High Energy Consumers Query
// Find meter readings where consumption exceeds 5 kWh

db.meter_readings.aggregate([
  { "$match": { "kwh": { "$gt": 5 } } },
  { "$group": {
    "_id": "$household_id",
    "total_high_readings": { "$sum": 1 },
    "max_kwh": { "$max": "$kwh" },
    "avg_kwh": { "$avg": "$kwh" }
  }},
  { "$sort": { "max_kwh": -1 } },
  { "$limit": 20 }
])

// Returns: household_id, count of high readings, max and avg consumption`
    },
    { 
      name: "Recent AQI Spikes", 
      description: "Find zones with AQI > 150 in the last 24 hours", 
      type: "advanced", 
      collection: "air_climate_readings",
      code: `// Recent AQI Spikes Query
// Find zones where AQI exceeded 150 (unhealthy level)

db.air_climate_readings.aggregate([
  { "$match": { 
    "aqi": { "$gt": 150 },
    "ts": { "$gte": new Date(Date.now() - 24*60*60*1000) }
  }},
  { "$group": {
    "_id": "$zone_id",
    "spike_count": { "$sum": 1 },
    "max_aqi": { "$max": "$aqi" },
    "latest_spike": { "$max": "$ts" }
  }},
  { "$sort": { "max_aqi": -1 } }
])

// Returns: zones with AQI spikes, count, max AQI, and latest timestamp`
    },
    { 
      name: "Critical Zone Status", 
      description: "Get status of zones with hospitals or schools", 
      type: "basic", 
      collection: "zones",
      code: `// Critical Zone Status Query
// Find zones containing critical infrastructure

db.zones.find({
  "$or": [
    { "critical_sites": "hospital" },
    { "critical_sites": "school" },
    { "critical_sites": "fire_station" }
  ]
}).sort({ "grid_priority": -1 })

// Returns: zones with hospitals, schools, or fire stations
// Sorted by grid priority (most critical first)`
    },
    { 
      name: "Peak Hour Demand", 
      description: "Aggregate demand during peak hours (6-9 PM)", 
      type: "advanced", 
      collection: "meter_readings",
      code: `// Peak Hour Demand Query
// Aggregate energy demand during peak hours (18:00 - 21:00)

db.meter_readings.aggregate([
  { "$project": {
    "zone_id": 1,
    "kwh": 1,
    "hour": { "$hour": "$ts" }
  }},
  { "$match": { "hour": { "$gte": 18, "$lte": 21 } } },
  { "$group": {
    "_id": "$zone_id",
    "peak_demand_kwh": { "$sum": "$kwh" },
    "reading_count": { "$sum": 1 },
    "avg_peak_kwh": { "$avg": "$kwh" }
  }},
  { "$sort": { "peak_demand_kwh": -1 } }
])

// Returns: zone-level peak hour demand statistics`
    },
    { 
      name: "Temperature Extremes", 
      description: "Find readings with temperature above 35°C or below 10°C", 
      type: "advanced", 
      collection: "air_climate_readings",
      code: `// Temperature Extremes Query
// Find climate readings with extreme temperatures

db.air_climate_readings.find({
  "$or": [
    { "temperature_c": { "$gt": 35 } },
    { "temperature_c": { "$lt": 10 } }
  ]
}).sort({ "ts": -1 }).limit(50)

// Alternative aggregation for summary:
db.air_climate_readings.aggregate([
  { "$match": {
    "$or": [
      { "temperature_c": { "$gt": 35 } },
      { "temperature_c": { "$lt": 10 } }
    ]
  }},
  { "$group": {
    "_id": "$zone_id",
    "extreme_count": { "$sum": 1 },
    "max_temp": { "$max": "$temperature_c" },
    "min_temp": { "$min": "$temperature_c" }
  }}
])`
    },
    { 
      name: "Multi-Zone Alerts", 
      description: "Find alerts affecting multiple zones simultaneously", 
      type: "advanced", 
      collection: "alerts",
      code: `// Multi-Zone Alerts Query
// Find alert patterns across zones

db.alerts.aggregate([
  { "$group": {
    "_id": {
      "type": "$type",
      "level": "$level",
      "hour": { "$hour": "$ts" }
    },
    "zones_affected": { "$addToSet": "$zone_id" },
    "alert_count": { "$sum": 1 }
  }},
  { "$match": { 
    "$expr": { "$gt": [{ "$size": "$zones_affected" }, 1] }
  }},
  { "$sort": { "alert_count": -1 } }
])

// Returns: alert types that affected multiple zones at the same time`
    },
    {
      name: "Latest AQI by Zone",
      description: "Get most recent air_climate_readings per zone (zone_id, aqi, pm25, ts)",
      type: "basic",
      collection: "air_climate_readings",
      code: `// Latest AQI by Zone - like in Atlas Data Explorer
db.air_climate_readings.find({})
  .sort({ "ts": -1 })
  .limit(25)

// Or one per zone:
db.air_climate_readings.aggregate([
  { "$sort": { "ts": -1 } },
  { "$group": {
    "_id": "$zone_id",
    "latest_aqi": { "$first": "$aqi" },
    "latest_ts": { "$first": "$ts" },
    "pm25": { "$first": "$pm25" },
    "temperature_c": { "$first": "$temperature_c" }
  }}
])`
    },
    {
      name: "Find Readings for Zone Z_001",
      description: "Simple find: air_climate_readings for one zone",
      type: "basic",
      collection: "air_climate_readings",
      code: `// Find by zone_id - example for Z_001
db.air_climate_readings.find({ "zone_id": "Z_001" })
  .sort({ "ts": -1 })
  .limit(20)

// Fields: _id, zone_id, ts, aqi, pm25, pm10, temperature_c, humidity_pct, wind_speed_kmh`
    },
    {
      name: "AQI Above 100",
      description: "Air quality readings where AQI exceeds 100 (moderate/unhealthy)",
      type: "basic",
      collection: "air_climate_readings",
      code: `// AQI above 100 - moderate to unhealthy
db.air_climate_readings.find({ "aqi": { "$gte": 101 } })
  .sort({ "aqi": -1, "ts": -1 })
  .limit(50)

// Same as typing in Atlas: { "aqi": { "$gte": 101 } }`
    },
    {
      name: "High PM2.5 Readings",
      description: "Readings with PM2.5 above 50 (poor air quality)",
      type: "advanced",
      collection: "air_climate_readings",
      code: `// High PM2.5 (particulate matter)
db.air_climate_readings.find({ "pm25": { "$gt": 50 } })
  .sort({ "pm25": -1 })
  .limit(30)

// Or aggregate by zone:
db.air_climate_readings.aggregate([
  { "$match": { "pm25": { "$gt": 50 } } },
  { "$group": {
    "_id": "$zone_id",
    "count": { "$sum": 1 },
    "max_pm25": { "$max": "$pm25" },
    "avg_pm25": { "$avg": "$pm25" }
  }},
  { "$sort": { "max_pm25": -1 } }
])`
    },
    {
      name: "Zone Demand Summary",
      description: "Total and average kWh per zone from meter_readings",
      type: "advanced",
      collection: "meter_readings",
      code: `// Demand summary per zone
db.meter_readings.aggregate([
  { "$group": {
    "_id": "$zone_id",
    "total_kwh": { "$sum": "$kwh" },
    "avg_kwh": { "$avg": "$kwh" },
    "reading_count": { "$sum": 1 },
    "max_kwh": { "$max": "$kwh" }
  }},
  { "$sort": { "total_kwh": -1 } },
  { "$limit": 20 }
])`
    },
    {
      name: "Alerts by Level",
      description: "Group alerts by level (info, warning, error)",
      type: "basic",
      collection: "alerts",
      code: `// Alerts grouped by level
db.alerts.aggregate([
  { "$group": {
    "_id": "$level",
    "count": { "$sum": 1 },
    "zones": { "$addToSet": "$zone_id" }
  }},
  { "$sort": { "count": -1 } }
])

// Or simple find: db.alerts.find({ "level": "warning" })`
    },
    {
      name: "Grid Edges for Zone",
      description: "Show which zones are connected (adjacency)",
      type: "basic",
      collection: "grid_edges",
      code: `// Edges from a zone (e.g. Z_001)
db.grid_edges.find({ "from_zone": "Z_001" })

// All edges (full topology):
db.grid_edges.find({}).limit(50)

// Fields: from_zone, to_zone, edge_type, capacity_mw`
    },
  ];

  // Shuffle suggested queries on each page load/refresh so "new" ones appear at top
  const suggestedQueriesToShow = useMemo(() => shuffleSuggested(SUGGESTED_QUERIES), []);

  // Query search state
  const [querySearch, setQuerySearch] = useState('');
  const [addingQuery, setAddingQuery] = useState(null);
  const [expandedQuery, setExpandedQuery] = useState(null);
  // Custom query form (for manual add / testing)
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customType, setCustomType] = useState('basic');
  const [customCollection, setCustomCollection] = useState('air_climate_readings');
  const [customCode, setCustomCode] = useState('');
  
  // Filter queries based on search - search through name, description, collection, AND query code
  const filteredQueries = queries.filter(q => {
    const searchLower = querySearch.toLowerCase();
    const nameMatch = q.name?.toLowerCase().includes(searchLower);
    const descMatch = q.description?.toLowerCase().includes(searchLower);
    const collectionMatch = q.collection?.toLowerCase().includes(searchLower);
    // Also search in query code template if available
    const codeTemplate = QUERY_CODE_TEMPLATES[q.id];
    const codeMatch = codeTemplate?.code?.toLowerCase().includes(searchLower);
    // Search in the query's own code field if it has one
    const queryCodeMatch = q.code?.toLowerCase().includes(searchLower);
    return nameMatch || descMatch || collectionMatch || codeMatch || queryCodeMatch;
  }).sort((a, b) => b.id - a.id); // Sort by ID descending (newest first)
  
  // Add suggested query (or custom query object)
  const handleAddSuggestedQuery = async (suggested) => {
    setAddingQuery(suggested.name);
    try {
      const payload = {
        name: suggested.name,
        description: suggested.description,
        type: suggested.type || 'basic',
        collection: suggested.collection,
        code: suggested.code || undefined
      };
      const response = await queriesAPI.createQuery(payload);
      if (response.data.success) {
        setSuccess(`Query "${suggested.name}" added! Saved to MongoDB Atlas (mongodb_queries).`);
        fetchQueries(); // Refresh the list
        setTimeout(() => setSuccess(null), 3000);
        setCustomName(''); setCustomDesc(''); setCustomCode('');
        setShowCustomForm(false);
      } else {
        setError(response.data.error || 'Failed to add query');
      }
    } catch (err) {
      setError('Failed to add query: ' + (err.response?.data?.error || err.message));
    } finally {
      setAddingQuery(null);
    }
  };

  const handleAddCustomQuery = () => {
    if (!customName.trim() || !customDesc.trim() || !customCollection.trim()) {
      setError('Name, description, and collection are required.');
      return;
    }
    handleAddSuggestedQuery({
      name: customName.trim(),
      description: customDesc.trim(),
      type: customType,
      collection: customCollection.trim(),
      code: customCode.trim() || undefined
    });
  };

  if (mode !== 'sim') {
    return (
      <div className="admin-data-page container page">
        <motion.div
          className="error-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={24} />
          <div>
            <h2>Admin Panel Unavailable</h2>
            <p>MongoDB Atlas data management is only available in <strong>Simulated</strong> mode.</p>
            <p>Please switch to Simulated mode using the mode switcher in the navbar.</p>
          </div>
        </motion.div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="admin-data-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1>
            <Database size={32} />
            MongoDB Atlas Admin
          </h1>
          <p>View, create, modify, and delete data in MongoDB Atlas (Simulated mode)</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStatus}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </motion.div>

      {/* Connection Status */}
      <div className={`connection-status ${dbStatus?.connected ? 'connected' : 'disconnected'}`}>
        <div className="status-indicator">
          {dbStatus?.connected ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{dbStatus?.connected ? 'Connected to MongoDB Atlas' : 'MongoDB Disconnected'}</span>
        </div>
        {dbStatus?.database && (
          <span className="db-name">Database: <code>{dbStatus.database}</code></span>
        )}
        {dbStatus?.error && (
          <span className="status-error">{dbStatus.error}</span>
        )}
      </div>

      {error && (
        <motion.div className="alert alert-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AlertCircle size={20} />
          {error}
          <button onClick={() => setError(null)}><X size={16} /></button>
        </motion.div>
      )}

      {success && (
        <motion.div className="alert alert-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overview-tab">
            <h3><Layers size={20} /> Collections Overview</h3>
            <p className="tab-desc">Summary of all collections in the MongoDB Atlas database</p>
            
            {loading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : (
              <div className="collections-grid">
                {Object.entries(collections).map(([name, info]) => (
                  <div key={name} className="collection-card" onClick={() => { setActiveTab('crud'); fetchCollectionData(name); }}>
                    <div className="collection-header">
                      <Table size={18} />
                      <h4>{name}</h4>
                    </div>
                    <div className="collection-stats">
                      <div className="stat">
                        <span className="stat-value">{info.count?.toLocaleString() || 0}</span>
                        <span className="stat-label">Documents</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{info.indexes?.length || 0}</span>
                        <span className="stat-label">Indexes</span>
                      </div>
                    </div>
                    {info.indexes && info.indexes.length > 0 && (
                      <div className="collection-indexes">
                        <span className="indexes-label">Indexes:</span>
                        <code>{info.indexes.join(', ')}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="collections-tab">
            <h3><Database size={20} /> Browse Collections</h3>
            <p className="tab-desc">Select a collection to view its data</p>
            
            <div className="collection-selector">
              {Object.keys(collections).map(name => (
                <button
                  key={name}
                  className={`collection-btn ${selectedCollection === name ? 'active' : ''}`}
                  onClick={() => fetchCollectionData(name)}
                >
                  <Table size={16} />
                  {name}
                  <span className="count">{collections[name]?.count || 0}</span>
                </button>
              ))}
            </div>

            {collectionLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : selectedCollection && (
              <div className="data-preview">
                <h4>{selectedCollection} ({collectionData.length} documents shown)</h4>
                <div className="data-table-wrap">
                  <pre className="data-json">
                    {JSON.stringify(collectionData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Query Code Tab */}
        {activeTab === 'queries' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="queries-tab">
            <h3><Code size={20} /> MongoDB Query Code</h3>
            <p className="tab-desc">View the MongoDB query code for each of the 10 meaningful queries</p>
            
            <div className="queries-list">
              {queries.map(query => (
                <div key={query.id} className="query-code-card">
                  <div className="query-header" onClick={() => toggleQueryCode(query.id)}>
                    <div className="query-info">
                      <span className="query-id">#{query.id}</span>
                      <h4>{query.name}</h4>
                      <span className={`query-type ${query.type}`}>{query.type}</span>
                    </div>
                    <div className="query-toggle">
                      {showCode[query.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                  <p className="query-description">{query.description}</p>
                  <div className="query-meta">
                    <span><Database size={14} /> {query.collection}</span>
                    {QUERY_CODE_TEMPLATES[query.id]?.pipeline && (
                      <span className="pipeline-badge">Aggregation Pipeline</span>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {showCode[query.id] && QUERY_CODE_TEMPLATES[query.id] && (
                      <motion.div
                        className="code-block"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <div className="code-header">
                          <span>MongoDB Shell / Compass</span>
                          <button 
                            className="copy-btn"
                            onClick={() => copyToClipboard(QUERY_CODE_TEMPLATES[query.id].code)}
                          >
                            <Copy size={14} />
                            Copy
                          </button>
                        </div>
                        <pre>{QUERY_CODE_TEMPLATES[query.id].code}</pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CRUD Tab */}
        {activeTab === 'crud' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="crud-tab">
            <h3><Edit2 size={20} /> Data Editor</h3>
            <p className="tab-desc">Create, read, update, and delete documents in MongoDB Atlas</p>
            
            <div className="collection-selector">
              {Object.keys(collections).map(name => (
                <button
                  key={name}
                  className={`collection-btn ${selectedCollection === name ? 'active' : ''}`}
                  onClick={() => fetchCollectionData(name)}
                >
                  <Table size={16} />
                  {name}
                  <span className="count">{collections[name]?.count || 0}</span>
                </button>
              ))}
            </div>

            {selectedCollection && (
              <>
                <div className="crud-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                  >
                    <Plus size={18} />
                    {showCreateForm ? 'Cancel' : 'Add Document'}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => fetchCollectionData(selectedCollection)}
                  >
                    <RefreshCw size={18} />
                    Refresh
                  </button>
                </div>

                {/* Create Form */}
                <AnimatePresence>
                  {showCreateForm && (
                    <motion.div
                      className="create-form"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <h4>Create New Document in {selectedCollection}</h4>
                      <textarea
                        value={newDocJson}
                        onChange={(e) => setNewDocJson(e.target.value)}
                        placeholder='{\n  "field": "value",\n  "number": 123\n}'
                        rows={10}
                      />
                      <div className="form-actions">
                        <button className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                          <X size={18} /> Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleCreateDocument}>
                          <Save size={18} /> Create Document
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Documents List */}
                {collectionLoading ? (
                  <div className="loading-container"><div className="spinner" /></div>
                ) : (
                  <div className="documents-list">
                    {collectionData.map((doc, idx) => {
                      const docId = doc._id || doc.id || idx;
                      const isEditing = editingDoc === docId;
                      
                      return (
                        <div key={docId} className="document-card">
                          <div className="doc-header">
                            <span className="doc-id">ID: {typeof docId === 'object' ? JSON.stringify(docId) : docId}</span>
                            <div className="doc-actions">
                              {isEditing ? (
                                <>
                                  <button 
                                    className="btn-icon"
                                    onClick={() => {
                                      try {
                                        const textarea = document.querySelector(`#doc-edit-${idx}`);
                                        const updated = JSON.parse(textarea.value);
                                        handleUpdateDocument(docId, updated);
                                      } catch (e) {
                                        setError('Invalid JSON');
                                      }
                                    }}
                                  >
                                    <Save size={16} />
                                  </button>
                                  <button className="btn-icon" onClick={() => setEditingDoc(null)}>
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button className="btn-icon" onClick={() => setEditingDoc(docId)}>
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    className="btn-icon danger"
                                    onClick={() => handleDeleteDocument(docId)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <button 
                                    className="btn-icon"
                                    onClick={() => copyToClipboard(JSON.stringify(doc, null, 2))}
                                  >
                                    <Copy size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {isEditing ? (
                            <textarea
                              id={`doc-edit-${idx}`}
                              className="doc-edit-textarea"
                              defaultValue={JSON.stringify(doc, null, 2)}
                              rows={15}
                            />
                          ) : (
                            <pre className="doc-content">
                              {JSON.stringify(doc, null, 2)}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                    {collectionData.length === 0 && (
                      <div className="empty-state">
                        <Database size={48} />
                        <p>No documents found in {selectedCollection}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {!selectedCollection && (
              <div className="empty-state">
                <Database size={48} />
                <p>Select a collection above to view and edit documents</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Manage Queries Tab */}
        {activeTab === 'manage-queries' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="manage-queries-tab">
            <h3><Plus size={20} /> Manage Queries</h3>
            <p className="tab-desc">Add new queries or search existing ones</p>
            
            {/* Search Bar */}
            <div className="query-search-bar">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search queries by name, description, or collection..."
                value={querySearch}
                onChange={(e) => setQuerySearch(e.target.value)}
              />
              {querySearch && (
                <button className="clear-search" onClick={() => setQuerySearch('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Add custom query (manual / test) */}
            <div className="custom-query-section">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCustomForm(!showCustomForm)}>
                <Plus size={18} />
                {showCustomForm ? 'Hide' : 'Add custom query manually'}
              </button>
              <AnimatePresence>
                {showCustomForm && (
                  <motion.div className="custom-query-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <p className="section-desc">Paste values below to add a query and verify it appears in Existing Queries and in MongoDB Atlas → urban_grid_ai → mongodb_queries.</p>
                    <label>Name <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. My AQI Test" /></label>
                    <label>Description <input type="text" value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} placeholder="e.g. Find AQI above 80" /></label>
                    <label>Type <select value={customType} onChange={(e) => setCustomType(e.target.value)}><option value="basic">basic</option><option value="advanced">advanced</option></select></label>
                    <label>Collection <select value={customCollection} onChange={(e) => setCustomCollection(e.target.value)}>
                      <option value="air_climate_readings">air_climate_readings</option>
                      <option value="meter_readings">meter_readings</option>
                      <option value="zones">zones</option>
                      <option value="alerts">alerts</option>
                      <option value="grid_edges">grid_edges</option>
                      <option value="households">households</option>
                      <option value="constraint_events">constraint_events</option>
                      <option value="policies">policies</option>
                    </select></label>
                    <label>Code (optional) <textarea value={customCode} onChange={(e) => setCustomCode(e.target.value)} placeholder="// db.air_climate_readings.find({})" rows={4} /></label>
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowCustomForm(false)}>Cancel</button>
                      <button type="button" className="btn btn-primary" onClick={handleAddCustomQuery} disabled={addingQuery || !customName.trim() || !customDesc.trim()}>
                        {addingQuery ? 'Adding...' : 'Add query'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Suggested Queries Section */}
            <div className="suggested-queries-section">
              <h4><Activity size={18} /> Suggested Queries (Click to Add)</h4>
              <p className="section-desc">Quick-add these demo queries. Order changes on each refresh so you see different suggestions. Added queries are saved to <strong>MongoDB Atlas</strong> in the <code>mongodb_queries</code> collection (Data Explorer → urban_grid_ai → mongodb_queries).</p>
              <div className="suggested-queries-grid">
                {suggestedQueriesToShow.map((sq, idx) => {
                  const alreadyExists = queries.some(q => q.name === sq.name);
                  return (
                    <div 
                      key={idx} 
                      className={`suggested-query-card ${alreadyExists ? 'exists' : ''} ${addingQuery === sq.name ? 'adding' : ''}`}
                      onClick={() => !alreadyExists && !addingQuery && handleAddSuggestedQuery(sq)}
                    >
                      <div className="sq-header">
                        <span className={`sq-type ${sq.type}`}>{sq.type}</span>
                        {alreadyExists && <span className="sq-exists">Already Added</span>}
                      </div>
                      <h5>{sq.name}</h5>
                      <p>{sq.description}</p>
                      <div className="sq-collection">
                        <Table size={14} />
                        {sq.collection}
                      </div>
                      {addingQuery === sq.name && (
                        <div className="sq-loading">Adding...</div>
                      )}
                      {!alreadyExists && !addingQuery && (
                        <div className="sq-add-hint">
                          <Plus size={14} /> Click to add
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Existing Queries List */}
            <div className="existing-queries-section">
              <h4><FileText size={18} /> Existing Queries ({filteredQueries.length})</h4>
              <p className="section-desc">All queries available in the system (default + user-created). Newest queries appear first. Click to expand and see full query code.</p>
              
              {filteredQueries.length === 0 ? (
                <div className="empty-state">
                  <Search size={48} />
                  <p>No queries match "{querySearch}"</p>
                </div>
              ) : (
                <div className="queries-list">
                  {filteredQueries.map(q => {
                    const isExpanded = expandedQuery === q.id;
                    const codeTemplate = QUERY_CODE_TEMPLATES[q.id];
                    const queryCode = q.code || codeTemplate?.code || `// Query ${q.id}: ${q.name}\ndb.${q.collection}.find({})`;
                    
                    return (
                      <div 
                        key={q.id} 
                        className={`query-list-item ${q.id > 15 ? 'user-created' : ''} ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => setExpandedQuery(isExpanded ? null : q.id)}
                      >
                        <div className="query-list-header">
                          <span className="query-id">#{q.id}</span>
                          <span className={`query-type ${q.type || 'basic'}`}>{q.type || 'basic'}</span>
                          {q.operation && q.operation !== 'read' && (
                            <span className={`query-operation ${q.operation}`}>{q.operation.toUpperCase()}</span>
                          )}
                          {q.id > 15 && <span className="user-badge">User Created</span>}
                          <span className="expand-icon">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </span>
                        </div>
                        <h5>{q.name}</h5>
                        <p>{q.description}</p>
                        <div className="query-list-meta">
                          <span><Table size={14} /> {q.collection}</span>
                          <span className="click-hint">{isExpanded ? 'Click to collapse' : 'Click to see query code'}</span>
                        </div>
                        
                        {/* Expanded Query Code Section */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              className="query-code-section"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="query-code-header">
                                <span><Code size={14} /> MongoDB Query Code</span>
                                <button 
                                  className="btn-copy"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(queryCode);
                                  }}
                                >
                                  <Copy size={14} /> Copy
                                </button>
                              </div>
                              <pre className="query-code-block">{queryCode}</pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .admin-data-page {
    padding: 2rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .page-header h1 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .page-header p {
    color: var(--text-secondary);
    margin-top: 0.5rem;
  }

  .connection-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .connection-status.connected {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid var(--accent-primary);
  }

  .connection-status.disconnected {
    background: rgba(255, 68, 102, 0.1);
    border: 1px solid var(--accent-danger);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .connection-status.connected .status-indicator {
    color: var(--accent-primary);
  }

  .connection-status.disconnected .status-indicator {
    color: var(--accent-danger);
  }

  .db-name {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .db-name code {
    background: var(--bg-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: var(--font-mono);
  }

  .status-error {
    font-size: 0.85rem;
    color: var(--accent-danger);
  }

  .error-banner {
    display: flex;
    gap: 1rem;
    padding: 2rem;
    background: rgba(255, 68, 102, 0.1);
    border: 1px solid var(--accent-danger);
    border-radius: 12px;
    color: var(--accent-danger);
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .alert button {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
  }

  .alert-error {
    background: rgba(255, 68, 102, 0.1);
    border: 1px solid var(--accent-danger);
    color: var(--accent-danger);
  }

  .alert-success {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid var(--accent-primary);
    color: var(--accent-primary);
  }

  .tab-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-secondary);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    border-color: var(--accent-primary);
    color: var(--text-primary);
  }

  .tab-btn.active {
    background: rgba(0, 255, 136, 0.1);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .tab-content {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    min-height: 400px;
  }

  .tab-content h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--accent-primary);
  }

  .tab-desc {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }

  /* Collections Grid */
  .collections-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .collection-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .collection-card:hover {
    border-color: var(--accent-primary);
    transform: translateY(-2px);
  }

  .collection-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .collection-header h4 {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.95rem;
  }

  .collection-stats {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--accent-primary);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .collection-indexes {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .collection-indexes code {
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }

  /* Collection Selector */
  .collection-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .collection-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .collection-btn:hover {
    border-color: var(--accent-secondary);
    color: var(--accent-secondary);
  }

  .collection-btn.active {
    background: rgba(0, 255, 136, 0.1);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .collection-btn .count {
    background: var(--bg-primary);
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }

  /* Query Code Cards */
  .queries-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .query-code-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .query-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .query-header:hover {
    background: rgba(0, 255, 136, 0.05);
  }

  .query-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .query-id {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--accent-primary);
    font-weight: 700;
  }

  .query-info h4 {
    margin: 0;
    font-size: 1rem;
  }

  .query-type {
    padding: 0.2rem 0.6rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .query-type.basic {
    background: rgba(0, 212, 255, 0.2);
    color: var(--accent-secondary);
  }

  .query-type.advanced {
    background: rgba(170, 102, 255, 0.2);
    color: var(--accent-purple);
  }

  .query-description {
    padding: 0 1.25rem;
    margin: 0 0 0.75rem 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .query-meta {
    display: flex;
    gap: 1rem;
    padding: 0 1.25rem 1rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .query-meta span {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pipeline-badge {
    background: rgba(255, 170, 0, 0.2);
    color: var(--accent-warning);
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
  }

  .code-block {
    border-top: 1px solid var(--border-color);
    overflow: hidden;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.25rem;
    background: var(--bg-primary);
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .copy-btn:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .code-block pre {
    margin: 0;
    padding: 1.25rem;
    background: #0a0a0f;
    color: #e0e0e0;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* CRUD Tab */
  .crud-actions {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .create-form {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    overflow: hidden;
  }

  .create-form h4 {
    margin: 0 0 1rem 0;
    color: var(--accent-primary);
  }

  .create-form textarea {
    width: 100%;
    padding: 1rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    resize: vertical;
    min-height: 200px;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .documents-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .document-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
  }

  .doc-id {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--accent-secondary);
  }

  .doc-actions {
    display: flex;
    gap: 0.35rem;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    border-color: var(--accent-secondary);
    color: var(--accent-secondary);
  }

  .btn-icon.danger:hover {
    border-color: var(--accent-danger);
    color: var(--accent-danger);
  }

  .doc-content {
    margin: 0;
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.5;
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
    color: var(--text-secondary);
  }

  .doc-edit-textarea {
    width: 100%;
    padding: 1rem;
    background: var(--bg-primary);
    border: none;
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    resize: vertical;
    min-height: 200px;
  }

  .data-preview h4 {
    margin-bottom: 1rem;
  }

  .data-table-wrap {
    max-height: 500px;
    overflow: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .data-json {
    margin: 0;
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: var(--text-muted);
    text-align: center;
  }

  .empty-state svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .btn-primary {
    background: var(--accent-primary);
    color: #000;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
  }

  .btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    border-color: var(--accent-secondary);
    color: var(--accent-secondary);
  }

  .loading-container {
    display: flex;
    justify-content: center;
    padding: 3rem;
  }

  @media (max-width: 768px) {
    .collections-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Manage Queries Tab */
  .manage-queries-tab h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .query-search-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .query-search-bar svg {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .query-search-bar input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 1rem;
    outline: none;
  }

  .query-search-bar input::placeholder {
    color: var(--text-muted);
  }

  .clear-search {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
  }

  .clear-search:hover {
    color: var(--text-primary);
  }

  .custom-query-section {
    margin-bottom: 2rem;
  }
  .custom-query-section .btn { margin-bottom: 0.75rem; }
  .custom-query-form {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem;
    overflow: hidden;
  }
  .custom-query-form label {
    display: block;
    margin-bottom: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  .custom-query-form label input,
  .custom-query-form label select,
  .custom-query-form label textarea {
    display: block;
    width: 100%;
    margin-top: 0.35rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.9rem;
  }
  .custom-query-form label textarea {
    font-family: var(--font-mono);
    resize: vertical;
  }
  .custom-query-form .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .suggested-queries-section,
  .existing-queries-section {
    margin-bottom: 2rem;
  }

  .suggested-queries-section h4,
  .existing-queries-section h4 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--accent-primary);
  }

  .section-desc {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .suggested-queries-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .suggested-query-card {
    background: var(--bg-secondary);
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .suggested-query-card:hover:not(.exists):not(.adding) {
    border-color: var(--accent-primary);
    background: rgba(0, 255, 136, 0.05);
    transform: translateY(-2px);
  }

  .suggested-query-card.exists {
    opacity: 0.6;
    cursor: not-allowed;
    border-style: solid;
  }

  .suggested-query-card.adding {
    opacity: 0.8;
    cursor: wait;
  }

  .sq-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .sq-type {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .sq-type.basic {
    background: rgba(0, 212, 255, 0.2);
    color: var(--accent-secondary);
  }

  .sq-type.advanced {
    background: rgba(255, 170, 0, 0.2);
    color: var(--accent-warning);
  }

  .sq-exists {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .suggested-query-card h5 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .suggested-query-card p {
    margin: 0 0 0.75rem 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .sq-collection {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .sq-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-primary);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.8rem;
    color: var(--accent-primary);
  }

  .sq-add-hint {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--accent-primary);
    margin-top: 0.5rem;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .suggested-query-card:hover:not(.exists) .sq-add-hint {
    opacity: 1;
  }

  .queries-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .query-list-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
  }

  .query-list-item.user-created {
    border-color: var(--accent-primary);
    border-left-width: 3px;
  }

  .query-list-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .query-id {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .query-type {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .query-type.basic {
    background: rgba(0, 212, 255, 0.2);
    color: var(--accent-secondary);
  }

  .query-type.advanced {
    background: rgba(255, 170, 0, 0.2);
    color: var(--accent-warning);
  }

  .query-type.crud {
    background: rgba(170, 102, 255, 0.2);
    color: #aa66ff;
  }

  .query-operation {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-weight: 600;
  }

  .query-operation.insert {
    background: rgba(0, 255, 136, 0.2);
    color: var(--accent-primary);
  }

  .query-operation.update {
    background: rgba(0, 212, 255, 0.2);
    color: var(--accent-secondary);
  }

  .query-operation.delete {
    background: rgba(255, 68, 102, 0.2);
    color: var(--accent-danger);
  }

  .user-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    background: rgba(0, 255, 136, 0.2);
    color: var(--accent-primary);
    margin-left: auto;
  }

  .query-list-item h5 {
    margin: 0 0 0.35rem 0;
    font-size: 0.95rem;
  }

  .query-list-item p {
    margin: 0 0 0.5rem 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .query-list-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .query-list-meta .click-hint {
    margin-left: auto;
    font-style: italic;
    opacity: 0.7;
  }

  .query-list-item {
    cursor: pointer;
    transition: all 0.2s;
  }

  .query-list-item:hover {
    border-color: var(--accent-primary);
    background: rgba(0, 255, 136, 0.02);
  }

  .query-list-item.expanded {
    border-color: var(--accent-primary);
    background: rgba(0, 255, 136, 0.05);
  }

  .expand-icon {
    margin-left: auto;
    color: var(--text-muted);
    transition: transform 0.2s;
  }

  .query-list-item.expanded .expand-icon {
    color: var(--accent-primary);
  }

  .query-code-section {
    margin-top: 1rem;
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
    overflow: hidden;
  }

  .query-code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .query-code-header span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--accent-secondary);
    font-weight: 600;
  }

  .btn-copy {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-copy:hover {
    background: var(--accent-primary);
    color: var(--bg-primary);
    border-color: var(--accent-primary);
  }

  .query-code-block {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-primary);
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 400px;
    overflow-y: auto;
  }

  /* Highlight newly created documents */
  .document-card.new-doc {
    border-color: var(--accent-primary);
    animation: pulse-new 2s ease-out;
  }

  @keyframes pulse-new {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(0, 255, 136, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 255, 136, 0);
    }
  }
`;
