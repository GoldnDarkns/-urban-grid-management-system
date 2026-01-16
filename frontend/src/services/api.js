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

// Data endpoints
export const dataAPI = {
  getStatus: () => api.get('/data/status'),
  getZones: () => api.get('/data/zones'),
  getZone: (zoneId) => api.get(`/data/zones/${zoneId}`),
  getHouseholds: (limit = 50, zoneId = null) => 
    api.get('/data/households', { params: { limit, zone_id: zoneId } }),
  getPolicies: () => api.get('/data/policies'),
  getGridEdges: () => api.get('/data/grid-edges'),
  getAlerts: (limit = 50, level = null) => 
    api.get('/data/alerts', { params: { limit, level } }),
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

// Health check (note: this endpoint is at /api/health, not under /api base)
export const healthCheck = () => axios.get('http://localhost:8000/api/health');

export default api;

