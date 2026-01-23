/**
 * API Service for Urban Grid Management System
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

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
};

// Analytics endpoints
export const analyticsAPI = {
  getHourlyDemand: (zoneId = null, hours = 168) => 
    api.get('/analytics/demand/hourly', { params: { zone_id: zoneId, hours } }),
  getDemandByZone: () => api.get('/analytics/demand/by-zone'),
  getDailyAQI: (zoneId = null, days = 30) => 
    api.get('/analytics/aqi/daily', { params: { zone_id: zoneId, days } }),
  getAQIByZone: () => api.get('/analytics/aqi/by-zone'),
  getAlertsSummary: () => api.get('/analytics/alerts/summary'),
  getZoneRisk: () => api.get('/analytics/zone-risk'),
  getAnomalies: (threshold = 2.0, limit = 50) => 
    api.get('/analytics/anomalies', { params: { threshold, limit } }),
  getCorrelation: () => api.get('/analytics/correlation'),
};

// Models endpoints
export const modelsAPI = {
  getOverview: () => api.get('/models/overview'),
  getLSTMDetails: () => api.get('/models/lstm'),
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
};

// Health check (note: this endpoint is at /api/health, not under /api base)
export const healthCheck = () => axios.get('http://localhost:8000/api/health');

export default api;

