/**
 * API Service for Urban Grid Management System
 * VITE_API_BASE_URL: set to /api when served behind Nginx (Docker); else localhost:8000/api for dev.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach mode header to every request so backend can switch DBs.
api.interceptors.request.use((config) => {
  try {
    const mode = (localStorage.getItem('ugms_mode') || 'city').toLowerCase();
    config.headers = config.headers || {};
    config.headers['X-Data-Mode'] = mode === 'sim' ? 'sim' : 'city';
  } catch (_) {}
  return config;
});

// Retry GET requests on 502/504 (backend busy during city processing)
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const config = err.config;
    if (!config || config.method?.toLowerCase() !== 'get') return Promise.reject(err);
    const status = err.response?.status;
    if (status !== 502 && status !== 504) return Promise.reject(err);
    const n = config.__retryCount ?? 0;
    if (n >= MAX_RETRIES) return Promise.reject(err);
    config.__retryCount = n + 1;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return api.request(config);
  }
);

// Data endpoints
export const dataAPI = {
  getStatus: (cityId = null) => api.get('/data/status', { params: cityId ? { city_id: cityId } : {} }),
  getZones: (cityId = null) => api.get('/data/zones', { params: cityId ? { city_id: cityId } : {} }),
  getZone: (zoneId) => api.get(`/data/zones/${zoneId}`),
  getHouseholds: (limit = 50, zoneId = null) => 
    api.get('/data/households', { params: { limit, zone_id: zoneId } }),
  getPolicies: () => api.get('/data/policies'),
  getGridEdges: () => api.get('/data/grid-edges'),
  getAlerts: (limit = 50, level = null, cityId = null) => 
    api.get('/data/alerts', { params: { limit, level, ...(cityId ? { city_id: cityId } : {}) } }),
  getConstraintEvents: () => api.get('/data/constraint-events'),
  getMeterReadingsSample: (limit = 100) => 
    api.get('/data/meter-readings/sample', { params: { limit } }),
  getAirClimateSample: (limit = 100) => 
    api.get('/data/air-climate/sample', { params: { limit } }),
  // Admin CRUD endpoints for MongoDB Atlas (Simulated mode only)
  getCollectionSample: (collectionName, limit = 50) =>
    api.get(`/data/collection/${collectionName}/sample`, { params: { limit } }),
  createDocument: (collectionName, document) =>
    api.post(`/data/collection/${collectionName}/create`, document),
  updateDocument: (collectionName, docId, document) =>
    api.put(`/data/collection/${collectionName}/update/${docId}`, document),
  deleteDocument: (collectionName, docId) =>
    api.delete(`/data/collection/${collectionName}/delete/${docId}`),
};

// Analytics endpoints
export const analyticsAPI = {
  getHourlyDemand: (zoneId = null, hours = 168, cityId = null) =>
    api.get('/analytics/demand/hourly', { params: { zone_id: zoneId, hours, ...(cityId ? { city_id: cityId } : {}) } }),
  getDemandByZone: () => api.get('/analytics/demand/by-zone'),
  getDailyAQI: (zoneId = null, days = 30) =>
    api.get('/analytics/aqi/daily', { params: { zone_id: zoneId, days } }),
  getAQIByZone: () => api.get('/analytics/aqi/by-zone'),
  getAlertsSummary: (cityId = null) =>
    api.get('/analytics/alerts/summary', { params: cityId ? { city_id: cityId } : {} }),
  getZoneRisk: () => api.get('/analytics/zone-risk'),
  getAnomalies: (threshold = 2.0, limit = 50, cityId = null, hours = 168) =>
    api.get('/analytics/anomalies', { params: { threshold, limit, ...(cityId ? { city_id: cityId, hours } : {}) } }),
  getCorrelation: () => api.get('/analytics/correlation'),
};

// Models endpoints
export const modelsAPI = {
  getOverview: () => api.get('/models/overview'),
  getLSTMDetails: () => api.get('/models/lstm'),
  getTFTDetails: () => api.get('/models/tft').catch(() => ({ data: null })),
  getTFTPrediction: () => api.get('/models/tft/prediction').catch(() => api.get('/models/lstm/prediction')),
  getAutoencoderDetails: () => api.get('/models/autoencoder'),
  getGNNDetails: () => api.get('/models/gnn'),
  getLSTMPrediction: () => api.get('/models/lstm/prediction'),
  getModelImage: (modelName, imageType) => 
    api.get(`/models/images/${modelName}/${imageType}`),
};

// Simulations endpoints
export const simulationsAPI = {
  saveSimulation: (data) => api.post('/simulations/save', data),
  listSimulations: (limit = 20, skip = 0) => 
    api.get('/simulations/list', { params: { limit, skip } }),
  getSimulation: (simulationId) => api.get(`/simulations/${simulationId}`),
  getSimulationAnalytics: (simulationId) => 
    api.get(`/simulations/${simulationId}/analytics`),
};

// Incidents endpoints
export const incidentsAPI = {
  getIncidents: (params = {}) => api.get('/incidents', { params }),
  getIncident: (incidentId) => api.get(`/incidents/${incidentId}`),
  createIncident: (description, zoneId, reporter) => 
    api.post('/incidents', null, { params: { description, zone_id: zoneId, reporter } }),
  getSummary: (days = 30) => api.get('/incidents/analytics/summary', { params: { days } }),
  getTrends: (days = 30) => api.get('/incidents/analytics/trends', { params: { days } }),
};

// Queries endpoints
export const queriesAPI = {
  listQueries: () => api.get('/queries/list'),
  executeQuery: (queryId, params = {}) => 
    api.get(`/queries/execute/${queryId}`, { params }),
  executeCrudQuery: (queryId, body) =>
    api.post(`/queries/execute/${queryId}`, body),
  createQuery: (queryData) => api.post('/queries/create', queryData),
  updateQuery: (queryId, queryData) => api.put(`/queries/update/${queryId}`, queryData),
  deleteQuery: (queryId) => api.delete(`/queries/delete/${queryId}`),
};

// AI Recommendations endpoints
export const aiAPI = {
  getRecommendations: (cityId = null) => api.get('/ai/recommendations', { params: cityId ? { city_id: cityId } : {} }),
  getSystemState: () => api.get('/ai/system-state'),
};

// City Selection endpoints
export const cityAPI = {
  listCities: () => api.get('/city/list'),
  getCurrentCity: () => api.get('/city/current'),
  selectCity: (cityId) => api.post(`/city/select/${cityId}`),
  processAllZones: (cityId = null) => 
    api.post('/city/process/all', null, { params: cityId ? { city_id: cityId } : {} }),
  processZone: (zoneId, lat, lon, cityId = null) =>
    api.post(`/city/process/zone/${zoneId}`, null, { 
      params: { lat, lon, ...(cityId ? { city_id: cityId } : {}) }
    }),
  processEIA: (cityId = null) =>
    api.post('/city/process/eia', null, { params: cityId ? { city_id: cityId } : {} }),
  getZoneCoordinates: (cityId = null) =>
    api.get('/city/zones/coordinates', { params: cityId ? { city_id: cityId } : {} }),
  getProcessedData: (cityId = null, zoneId = null, limit = 20) =>
    api.get('/city/processed-data', { 
      params: { 
        ...(cityId ? { city_id: cityId } : {}),
        ...(zoneId ? { zone_id: zoneId } : {}),
        limit
      }
    }),
  getProcessingSummary: (cityId = null) =>
    api.get('/city/processing-summary', { params: cityId ? { city_id: cityId } : {} }),
  getCosts: (cityId = null) =>
    api.get('/city/costs', { params: cityId ? { city_id: cityId } : {} }),
};

// Live APIs (311, etc.) – used in City mode
export const liveAPI = {
  get311Requests: (cityId = null, limit = 100, status = null) =>
    api.get('/live/311/requests', { params: { ...(cityId ? { city_id: cityId } : {}), limit, ...(status ? { status } : {}) } }),
};

// Live Stream (Kafka → MongoDB) – for Live Stream tab
export const liveStreamAPI = {
  getLiveStream: (limit = 100) => api.get('/live-stream', { params: { limit } }),
};

// Knowledge Graph (Neo4j) – risk reasoning and graph viz
export const kgAPI = {
  getStatus: () => api.get('/kg/status'),
  sync: (cityId) => api.post('/kg/sync', null, { params: cityId ? { city_id: cityId } : {} }),
  getRisk: (cityId, zoneId) => api.get('/kg/risk', { params: { city_id: cityId, zone_id: zoneId } }),
  getGraph: (cityId, limit = 200) => api.get('/kg/graph', { params: { city_id: cityId, limit } }),
  getNeo4jBrowserUrl: () => api.get('/kg/neo4j-browser-url'),
};

// Health check – use same base as other API calls (so Docker uses Nginx proxy)
export const healthCheck = () => api.get('/health');

export default api;

