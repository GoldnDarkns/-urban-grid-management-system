import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Database, BarChart3, Brain, Activity, Network, 
  AlertTriangle, Zap, Map, GitCompare, Eye, FileText, 
  ArrowRight, CheckCircle, Info, TrendingUp, Target, DollarSign,
  Server, Layers, Code, BarChart, LineChart, ClipboardList, Box
} from 'lucide-react';
import { dataAPI, analyticsAPI, modelsAPI, cityAPI } from '../services/api';
import { useAppMode } from '../utils/useAppMode';
import StatCard from '../components/StatCard';

export default function Guide() {
  const { mode } = useAppMode();
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [currentCityId, setCurrentCityId] = useState(null);
  const [flowView, setFlowView] = useState('city'); // 'city' | 'sim' for Data Flow tab (independent of app mode)

  useEffect(() => {
    if (mode === 'city') {
      cityAPI.getCurrentCity().then((r) => setCurrentCityId(r.data?.city_id || null)).catch(() => setCurrentCityId(null));
    } else {
      setCurrentCityId(null);
    }
    setFlowView(mode); // Keep flow tab in sync with app mode when mode changes
  }, [mode]);

  useEffect(() => {
    if (mode !== 'city') return;
    const onCityChanged = () => {
      cityAPI.getCurrentCity().then((r) => setCurrentCityId(r.data?.city_id || null)).catch(() => setCurrentCityId(null));
    };
    window.addEventListener('ugms-city-changed', onCityChanged);
    window.addEventListener('ugms-city-processed', onCityChanged);
    return () => {
      window.removeEventListener('ugms-city-changed', onCityChanged);
      window.removeEventListener('ugms-city-processed', onCityChanged);
    };
  }, [mode]);

  useEffect(() => {
    fetchStats();
  }, [mode, currentCityId]);

  // Refetch stats when user switches to overview so data is always fresh (fixes "empty until I go back and forth")
  useEffect(() => {
    if (activeSection === 'overview') fetchStats();
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps -- fetchStats stable, intentional refetch on section change

  const fetchStats = async () => {
    try {
      const cityId = mode === 'city' ? currentCityId : null;
      const status = await dataAPI.getStatus(cityId);
      setDbStats(status.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'workflow', label: 'Data Flow', icon: ArrowRight },
    { id: 'pages', label: 'Pages Guide', icon: FileText },
    { id: 'outputs', label: 'Outputs', icon: Target },
  ];

  const pages = [
    {
      id: 'home',
      name: 'Home',
      path: '/',
      icon: Target,
      order: 1,
      description: mode === 'city' ? 'System overview with live city data and processing status' : 'System overview and dashboard with real-time statistics',
      purpose: 'Quick view of system health, data counts, and key metrics',
      dataSource: mode === 'city' ? 'processed_zone_data, weather_data, aqi_data, traffic_data (from CITY DB)' : 'MongoDB collections (zones, households, readings, alerts from SIM DB)',
      output: mode === 'city' ? 'Live statistics: processed zones, weather/AQI/traffic records, processing summary' : 'Live statistics: zones count, households count, readings count, alerts count',
      features: ['System status indicators', 'Quick stats cards', 'System architecture diagram', 'Feature overview']
    },
    {
      id: 'guide',
      name: 'Guide',
      path: '/guide',
      icon: BookOpen,
      order: 2,
      description: 'Complete system documentation and workflow guide',
      purpose: 'Learn how the system works, data flow, and how to use each page',
      dataSource: 'System documentation and MongoDB status',
      output: 'Workflow explanation, page-by-page guide, data flow diagrams',
      features: ['System overview', 'Data flow explanation', 'Pages guide', 'Outputs documentation']
    },
    {
      id: 'data',
      name: 'Data',
      path: '/data',
      icon: Database,
      order: 3,
      description: mode === 'city' ? 'City Data Explorer - view live processed data, weather, AQI, traffic records' : 'MongoDB data explorer - view all collections, zones, alerts, and grid structure',
      purpose: mode === 'city' ? 'Inspect live processed data from selected city stored in local MongoDB' : 'Inspect raw data stored in MongoDB Atlas',
      dataSource: mode === 'city' ? 'processed_zone_data, weather_data, aqi_data, traffic_data (from CITY DB)' : 'Direct MongoDB queries (zones, households, alerts, grid_edges collections from SIM DB)',
      output: mode === 'city' ? 'Zones processed (varies by city), weather/AQI/traffic records, collection indexes' : 'Collection counts, zone details, alert history, grid connectivity graph',
      features: mode === 'city' ? ['Processed zone data (zones vary by city)', 'Weather/AQI/Traffic records', 'Collection indexes', 'City-specific data'] : ['Collection overview with counts', 'Zone details table', 'Alerts timeline', 'Grid adjacency visualization']
    },
    {
      id: 'analytics',
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      order: 4,
      description: mode === 'city' ? 'Real-time analytics from live processed city data - demand forecasts, AQI, correlations, anomalies' : 'Real-time analytics, correlations, and anomaly detection from MongoDB data',
      purpose: 'Analyze energy demand patterns, AQI trends, and detect consumption anomalies',
      dataSource: mode === 'city' ? 'processed_zone_data (demand forecasts, AQI, anomalies from ML models)' : 'Aggregated MongoDB queries (hourly demand, AQI by zone, correlation matrix)',
      output: 'Charts showing demand trends, AQI distribution, correlation analysis, anomaly timeline',
      features: ['Real-time demand charts', 'Demand by zone comparison', 'AQI by zone', 'Correlation matrix', 'Anomaly detection timeline']
    },
    {
      id: 'advanced-analytics',
      name: 'Advanced Analytics',
      path: '/advanced-analytics',
      icon: Brain,
      order: 5,
      description: mode === 'city' ? 'Live ML outputs from real-time processing — TFT forecasts, Autoencoder anomalies, GNN risk scores' : 'Deep dive into ML models, MongoDB queries, and technical details',
      purpose: mode === 'city' ? 'View live ML model outputs processing real city data' : 'Explore TFT (primary), LSTM (comparison), Autoencoder, GNN, ARIMA, Prophet and execute 10 MongoDB queries',
      dataSource: mode === 'city' ? 'processed_zone_data.ml_processed (live outputs per zone)' : 'ML model outputs, MongoDB query results',
      output: mode === 'city' ? 'Live ML outputs, aggregated stats, real-time processing status' : 'Model architectures, training metrics, query results, model comparisons',
      features: mode === 'city' ? ['Live ML Outputs', 'Per-Zone Stats', 'Real-time Processing', 'City-Specific Results'] : ['ML Model Details', 'MongoDB Queries (10 queries)', 'Model Comparison', 'Technical Deep-dive']
    },
    {
      id: 'ai-recommendations',
      name: 'AI Recommendations',
      path: '/ai-recommendations',
      icon: Brain,
      order: 6,
      description: 'AI-powered actionable recommendations synthesized from all ML models',
      purpose: 'Get prioritized, intelligent recommendations based on all system data and ML predictions',
      dataSource: 'All ML model outputs, zone risk, alerts, anomalies, live API data (compiled and analyzed by OpenRouter LLM)',
      output: 'Prioritized recommendations with actions, cost-benefit analysis, confidence scores, simulation suggestions',
      features: ['AI Synthesis', 'Prioritized Actions', 'Cost-Benefit Analysis', 'Simulation Suggestions', 'Confidence Scores']
    },
    {
      id: 'insights',
      name: 'Insights',
      path: '/insights',
      icon: Zap,
      order: 7,
      description: 'Rule-based recommendations and insights from current system state',
      purpose: 'View insights based on risk scores, alerts, and anomalies',
      dataSource: 'Zone risk scores, alerts, anomalies from MongoDB',
      output: 'Recommendations for high-risk zones, emergency alerts, anomaly actions, AQI advisories',
      features: ['Risk-based recommendations', 'Alert summaries', 'Anomaly insights', 'Action items']
    },
    {
      id: 'incidents',
      name: 'Incidents',
      path: '/incidents',
      icon: ClipboardList,
      order: 8,
      description: 'Incident reports with NLP-powered classification and analysis',
      purpose: 'Manage and analyze incident reports with automatic categorization',
      dataSource: 'Incident reports with NLP processing (category, urgency, sentiment)',
      output: 'Incident list, categorization, urgency detection, entity extraction, trends',
      features: ['NLP Classification', 'Urgency Detection', 'Entity Extraction', 'Incident Trends']
    },
    {
      id: 'citymap',
      name: 'City Map',
      path: '/citymap',
      icon: Map,
      order: 9,
      description: mode === 'city' ? 'Interactive 2D city map with real zone coordinates and live risk scores' : 'Interactive 2D city map showing zones with real-time risk visualization',
      purpose: 'Visualize zone locations, connections, and risk levels on a city map',
      dataSource: mode === 'city' ? 'Zone coordinates from city selection, processed risk scores from processed_zone_data' : 'Zones, grid edges, zone risk scores from MongoDB',
      output: 'Interactive map with zone nodes, connections, risk colors, real-time updates',
      features: mode === 'city' ? ['Real city coordinates', 'Proximity-based grid edges', 'Live risk visualization', 'Zone details on click'] : ['Zone visualization', 'Grid connections', 'Risk color coding', 'Zone details on click']
    },
    {
      id: 'simulation3d',
      name: '3D City',
      path: '/simulation3d',
      icon: Box,
      order: 10,
      description: '3D visualization of synthetic city (Simulated mode only)',
      purpose: 'Visualize energy distribution and risk in 3D space using simulated data',
      dataSource: 'Synthetic Tron city model (not available in City Live mode)',
      output: '3D city model with buildings, energy particles, risk visualization',
      features: ['3D city rendering', 'Energy flow visualization', 'Risk propagation', 'Interactive camera'],
      note: mode === 'city' ? 'Not available in City Live mode - uses synthetic data' : ''
    },
    {
      id: 'visualizations',
      name: 'Advanced Visualizations',
      path: '/visualizations',
      icon: Eye,
      order: 11,
      description: 'Advanced data visualizations and interactive charts',
      purpose: 'Deep dive into data patterns with advanced visualizations',
      dataSource: 'All MongoDB collections',
      output: 'Interactive charts, heatmaps, network diagrams, time-series analysis',
      features: ['Advanced charts', 'Interactive filtering', 'Data exploration', 'Custom visualizations']
    },
    {
      id: 'reports',
      name: 'Reports',
      path: '/reports',
      icon: FileText,
      order: 12,
      description: 'Generate comprehensive reports on demand, AQI, alerts, and zone performance',
      purpose: 'Create exportable reports for analysis and documentation',
      dataSource: 'Aggregated data from all MongoDB collections',
      output: 'PDF/CSV reports with charts, metrics, recommendations',
      features: ['Demand reports', 'AQI reports', 'Alert summaries', 'Zone performance reports', 'Model performance reports']
    },
    {
      id: 'cost',
      name: 'Cost',
      path: '/cost',
      icon: DollarSign,
      order: 13,
      description: mode === 'city' ? 'Energy, CO₂, AQI, and 311 incident cost estimates for the selected city' : 'City Live only',
      purpose: 'View cost breakdown: forecast energy cost, carbon cost, AQI externality proxy, 311 incident cost',
      dataSource: mode === 'city' ? 'processed_zone_data, EIA retail price, cost_config, City 311 API' : 'N/A',
      output: 'Total estimated cost; Energy, CO₂, AQI, Incident cards with explanations',
      features: mode === 'city' ? ['Forecast energy cost', 'CO₂ cost', 'AQI cost (est.)', '311 incident cost (est.)', 'Configurable rates'] : ['Available in City Live mode only'],
      note: mode !== 'city' ? 'Switch to City Live and select a city to view costs.' : ''
    }
  ];

  const workflow = mode === 'city' ? [
    {
      step: 1,
      name: 'City Selection',
      description: 'User selects a city from dropdown (navbar → Active City). System configures zones with real coordinates (count varies by city: e.g. NYC 40, SF 12).',
      data: 'NYC, Chicago, LA, SF, Houston, Phoenix → zones per city (e.g. 40, 25, 35, 12, 25, 20)',
      icon: Map
    },
    {
      step: 2,
      name: 'Live API Fetching',
      description: 'BackgroundProcessor (every 5 minutes) fetches live data for each zone: Weather, AQI, Traffic, EIA, Census, 311',
      data: 'OpenWeatherMap, AirVisual, TomTom, EIA, Census, City 311, OpenStreetMap',
      icon: Server
    },
    {
      step: 3,
      name: 'ML Processing',
      description: 'For each zone: TFT (primary) forecasts demand, Autoencoder detects anomalies, GNN scores risk. LSTM kept for comparison. All use live API data.',
      data: 'TFT, LSTM (comparison), Autoencoder, GNN, ARIMA, Prophet → Processed per zone',
      icon: Brain
    },
    {
      step: 4,
      name: 'Local Storage',
      description: 'All processed data (raw API + ML outputs + recommendations) stored in local MongoDB (CITY DB)',
      data: 'processed_zone_data, weather_data, aqi_data, traffic_data (with city_id)',
      icon: Database
    },
    {
      step: 5,
      name: 'FastAPI Serving',
      description: 'FastAPI reads from local MongoDB and serves processed data to frontend. Mode-aware routing ensures correct database.',
      data: '/api/city/processed-data, /api/data/* (with X-Data-Mode header)',
      icon: Server
    },
    {
      step: 6,
      name: 'AI Recommendations',
      description: 'OpenRouter LLM analyzes all ML outputs, risk scores, alerts → generates prioritized recommendations',
      data: 'Prioritized actions, cost-benefit analysis, confidence scores, implementation steps',
      icon: Brain
    },
    {
      step: 7,
      name: 'Frontend Display',
      description: 'React dashboard displays live processed data, charts update every 30 seconds, all pages are mode-aware',
      data: 'Interactive charts, city map with real coordinates, live ML outputs, AI recommendations',
      icon: Eye
    }
  ] : [
    {
      step: 1,
      name: 'MongoDB Atlas Data',
      description: 'Historical demo dataset stored in MongoDB Atlas with time-series data',
      data: 'meter_readings, air_climate_readings, zones, households, alerts',
      icon: Database
    },
    {
      step: 2,
      name: 'Data Aggregation',
      description: 'FastAPI queries MongoDB Atlas and aggregates data for analysis',
      data: 'Hourly aggregations, zone metrics, correlation calculations',
      icon: Server
    },
    {
      step: 3,
      name: 'ML Model Inference',
      description: 'TFT (primary), LSTM (comparison), Autoencoder, GNN, ARIMA, Prophet use historical training data',
      data: 'Demand forecasts, anomaly scores, risk classifications, 10 MongoDB queries',
      icon: Brain
    },
    {
      step: 4,
      name: 'AI Synthesis (OpenRouter)',
      description: 'OpenRouter LLM analyzes ML outputs, risk, alerts → recommendations',
      data: 'Prioritized actions, cost-benefit analysis, confidence scores',
      icon: Brain
    },
    {
      step: 5,
      name: 'Frontend Display',
      description: 'React shows charts, training metrics, and simulated data visualizations',
      data: 'Interactive charts, model comparisons, historical data views',
      icon: Eye
    }
  ];

  const collections = dbStats?.collections || {};

  return (
    <div className="guide-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-icon primary">
          <BookOpen size={40} />
        </div>
        <div className="header-content">
          <h1>How It Works</h1>
          <p>Complete guide to the Urban Grid Management System - workflow, pages, and outputs</p>
        </div>
      </motion.div>

      {/* Section Navigation */}
      <div className="section-nav">
        {sections.map(section => (
          <button
            key={section.id}
            className={`section-btn ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <section.icon size={18} />
            {section.label}
          </button>
        ))}
      </div>

      <div className="content-area">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="overview-card highlight">
              <h2><Target size={24} /> System Purpose</h2>
              <p>
                The Urban Grid Management System is an intelligent platform for managing urban energy grids 
                with climate and constraint awareness. It uses deep learning models to forecast demand, 
                detect anomalies, and assess zone risks in real-time.
              </p>
              <div className="purpose-grid">
                <div className="purpose-item">
                  <CheckCircle size={20} />
                  <strong>Problem Solved:</strong> Unpredictable energy demand, grid overloads, poor air quality management
                </div>
                <div className="purpose-item">
                  <CheckCircle size={20} />
                  <strong>Solution:</strong> AI-powered forecasting, anomaly detection, and risk assessment
                </div>
                <div className="purpose-item">
                  <CheckCircle size={20} />
                  <strong>Output:</strong> Predictions, alerts, recommendations, and actionable insights
                </div>
              </div>
            </div>

            {mode === 'city' && !currentCityId && (
              <p className="guide-hint" style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Select a city from the navbar (Active City) to see city-specific stats.
              </p>
            )}
            <div className="stats-grid">
              {mode === 'city' ? (
                <>
                  <StatCard
                    value={collections.processed_zone_data?.distinct_zones ?? collections.processed_zone_data?.count ?? 0}
                    label="Zones (this city)"
                    icon={Map}
                    color="primary"
                  />
                  <StatCard
                    value={collections.processed_zone_data?.count || 0}
                    label="Processed Records"
                    icon={Activity}
                    color="secondary"
                  />
                  <StatCard
                    value={collections.weather_data?.count || 0}
                    label="Weather Records"
                    icon={Database}
                    color="warning"
                  />
                  <StatCard
                    value={collections.aqi_data?.count || 0}
                    label="AQI Records"
                    icon={Activity}
                    color="warning"
                  />
                  <StatCard
                    value={collections.traffic_data?.count || 0}
                    label="Traffic Records"
                    icon={AlertTriangle}
                    color="danger"
                  />
                </>
              ) : (
                <>
                  <StatCard
                    value={collections.zones?.count || 0}
                    label="Zones"
                    icon={Map}
                    color="secondary"
                  />
                  <StatCard
                    value={collections.households?.count || 0}
                    label="Households"
                    icon={Database}
                    color="primary"
                  />
                  <StatCard
                    value={Math.round((collections.meter_readings?.count || 0) / 1000)}
                    label="K Readings"
                    icon={Activity}
                    color="warning"
                    suffix="K"
                  />
                  <StatCard
                    value={collections.alerts?.count || 0}
                    label="Alerts"
                    icon={AlertTriangle}
                    color="danger"
                  />
                </>
              )}
            </div>

            <div className="info-cards-grid">
              <div className="info-card">
                <h3><Database size={20} /> Data Sources</h3>
                <p><strong>Dual Database System:</strong></p>
                <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                  <strong>Simulated → MongoDB Atlas.</strong> <strong>City Live → local MongoDB.</strong> This distinction is why the two modes run differently.
                </p>
                <ul>
                  <li><strong>City Live Mode:</strong> <strong>Local MongoDB</strong> stores processed data from live APIs. Zone count per city (e.g. NYC 40, Chicago 25, SF 12) with real coordinates.</li>
                  <li><strong>Simulated Mode:</strong> <strong>MongoDB Atlas</strong> demo dataset (500 households, 360K+ meter readings, 14K+ air/climate readings)</li>
                  <li><strong>Live APIs (City Mode):</strong> OpenWeatherMap (Weather), AirVisual (AQI), TomTom (Traffic), EIA (Energy), Census (Population), City 311 (Service Requests), OpenStreetMap (Infrastructure)</li>
                  <li><strong>Fallback datasets:</strong> When APIs fail or hit rate limits, the system uses local data: US_City_Temp_Data (weather), Kaggle AQI CSV, traffic_speed CSV, EIA xls/xlsx (electricity & CO₂)</li>
                  <li><strong>Processing:</strong> BackgroundProcessor runs every 5 minutes; zones processed in parallel. Data also streamed via Kafka to MongoDB</li>
                </ul>
              </div>

              <div className="info-card">
                <h3><Brain size={20} /> ML Models</h3>
                <p><strong>Demand &amp; Risk: TFT Primary, LSTM Comparison</strong></p>
                <ul>
                  <li><strong>TFT (Temporal Fusion Transformer):</strong> Primary demand forecasting — interpretable multi-horizon, variable selection, compatible with our mixed inputs (static zone, known future, historical series)</li>
                  <li><strong>LSTM (comparison):</strong> Baseline demand forecast kept to showcase TFT advantages (interpretability, multi-horizon, accuracy)</li>
                  <li><strong>Autoencoder:</strong> Real-time anomaly detection on processed zone data</li>
                  <li><strong>GNN:</strong> Live risk scoring combining AQI, traffic, and demand patterns</li>
                  <li><strong>ARIMA / Prophet:</strong> Statistical and seasonal forecasting</li>
                </ul>
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>In City Live:</strong> Models process data every 5 minutes. Results stored in <code>processed_zone_data</code> collection.
                </p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>In Simulated:</strong> Models show training metrics from historical dataset (RMSE, R² scores).
                </p>
              </div>

              <div className="info-card">
                <h3><Zap size={20} /> Key Features</h3>
                <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                  <strong>City Live page flow (order that makes sense):</strong>
                </p>
                <ol style={{ marginLeft: '1.25rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <li><strong>Home</strong> → Select city, run processing (zones + live APIs + ML)</li>
                  <li><strong>Data</strong> → View processed zone data, weather, AQI, traffic</li>
                  <li><strong>Analytics</strong> → Demand/AQI/anomaly charts</li>
                  <li><strong>Advanced Analytics</strong> → TFT, LSTM (comparison), Autoencoder, GNN outputs per zone</li>
                  <li><strong>AI Recs</strong> → Prioritized recommendations from ML</li>
                  <li><strong>Insights, Cost, City Map, etc.</strong> → Deeper dives</li>
                </ol>
                <ul>
                  <li><strong>Mode Switcher</strong> (navbar) → Toggle between "City Live" and "Simulated" modes</li>
                  <li><strong>City Selection</strong> (navbar → Active City) → Choose from NYC, Chicago, LA, SF, Houston, Phoenix</li>
                  <li><strong>Live API Integration:</strong> Weather, AQI, Traffic, EIA, Census, 311, Infrastructure (OpenStreetMap)</li>
                  <li><strong>API Fallbacks:</strong> Local CSV/Excel used when APIs fail (weather, AQI, traffic, EIA electricity & CO₂)</li>
                  <li><strong>Real-Time Processing:</strong> BackgroundProcessor runs every 5 minutes; zones processed in parallel; Kafka producer streams to MongoDB</li>
                  <li><strong>AI Recommendations:</strong> OpenRouter LLM synthesizes all ML outputs into prioritized actions</li>
                  <li><strong>Dynamic Pages:</strong> All pages adapt based on selected mode and city</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Workflow Section */}
        {activeSection === 'workflow' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <h2>Data Flow & System Architecture</h2>
            <div className="workflow-diagram">
              {workflow.map((step, index) => (
                <motion.div
                  key={step.step}
                  className="workflow-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="step-number">{step.step}</div>
                  <div className="step-icon">
                    <step.icon size={32} />
                  </div>
                  <h3>{step.name}</h3>
                  <p>{step.description}</p>
                  <div className="step-data">
                    <Info size={14} />
                    <span>{step.data}</span>
                  </div>
                  {index < workflow.length - 1 && (
                    <div className="workflow-arrow">
                      <ArrowRight size={24} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="architecture-explanation">
              <h3>How Data Flows Through the System</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Switch tabs to see City Live flow (live APIs + local MongoDB) or Simulated flow (MongoDB Atlas demo data).
              </p>
              <div className="mode-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className={flowView === 'city' ? 'active' : ''}
                  onClick={() => setFlowView('city')}
                  style={{ padding: '0.5rem 1rem', background: flowView === 'city' ? 'var(--accent-primary)' : 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: flowView === 'city' ? '#000' : 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  City Live Flow
                </button>
                <button
                  type="button"
                  className={flowView === 'sim' ? 'active' : ''}
                  onClick={() => setFlowView('sim')}
                  style={{ padding: '0.5rem 1rem', background: flowView === 'sim' ? 'var(--accent-primary)' : 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: flowView === 'sim' ? '#000' : 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Simulated Flow
                </button>
              </div>
              <div className="flow-details">
                {flowView === 'city' ? (
                  <>
                    <div className="flow-item">
                      <strong>1. City Selection:</strong>
                      <p>Select a city from <strong>Active City</strong> dropdown (navbar). System calculates zone coordinates for that city (e.g. NYC 40, Chicago 25, SF 12) and starts background processing.</p>
                    </div>
                    <div className="flow-item">
                      <strong>2. Live API Fetching (Every 5 Minutes):</strong>
                      <p><strong>BackgroundProcessor</strong> automatically fetches: Weather (OpenWeatherMap), AQI (AirVisual), Traffic (TomTom), EIA (Energy), Census (Population), City 311 (Service Requests), OpenStreetMap (Infrastructure). Data is fetched per zone.</p>
                    </div>
                    <div className="flow-item">
                      <strong>3. ML Processing:</strong>
                      <p>For each zone: <strong>TFT</strong> (Temporal Fusion Transformer) is the primary demand forecaster — interpretable, multi-horizon, suited to our mix of static zone data, known future inputs, and historical series. <strong>LSTM</strong> is kept for comparison. <strong>Autoencoder</strong> detects anomalies, <strong>GNN</strong> scores risk (AQI + traffic + demand), <strong>ARIMA/Prophet</strong> provide statistical forecasts.</p>
                    </div>
                    <div className="flow-item">
                      <strong>4. Local MongoDB Storage:</strong>
                      <p>All processed data stored in <strong>local MongoDB (CITY DB)</strong>: <code>processed_zone_data</code> (raw + ML outputs + recommendations), <code>weather_data</code>, <code>aqi_data</code>, <code>traffic_data</code>. Each document includes <code>city_id</code>.</p>
                    </div>
                    <div className="flow-item">
                      <strong>5. FastAPI Serving:</strong>
                      <p>FastAPI reads from CITY DB (mode-aware via <code>X-Data-Mode</code> header). Endpoints like <code>/api/city/processed-data</code> return live processed results.</p>
                    </div>
                    <div className="flow-item">
                      <strong>6. AI Recommendations:</strong>
                      <p><strong>OpenRouter LLM</strong> analyzes all ML outputs, risk scores, alerts, and live data → generates prioritized recommendations with cost-benefit analysis and implementation steps.</p>
                    </div>
                    <div className="flow-item">
                      <strong>7. Frontend Display:</strong>
                      <p>React dashboard displays live data. Pages auto-refresh every 30 seconds. All pages are mode-aware and show city-specific data.</p>
                    </div>
                    <div className="flow-item" style={{ borderLeftColor: '#ffaa00' }}>
                      <strong>🚀 Future: Kafka + Spark Streaming:</strong>
                      <p>Coming soon: Real-time streaming pipeline with Kafka (message broker) and Spark Structured Streaming for 40-50 second updates instead of 5-minute batches.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flow-item">
                      <strong>1. MongoDB Atlas Data:</strong>
                      <p>Historical demo dataset stored in MongoDB Atlas: 20 zones, 500 households, 360K+ meter readings, 14K+ air/climate readings.</p>
                    </div>
                    <div className="flow-item">
                      <strong>2. Data Aggregation:</strong>
                      <p>FastAPI queries MongoDB Atlas and aggregates data for analysis: hourly demand, AQI by zone, correlations.</p>
                    </div>
                    <div className="flow-item">
                      <strong>3. ML Model Inference:</strong>
                      <p>TFT (primary), LSTM (comparison), Autoencoder, GNN, ARIMA, Prophet use historical training data. Results show training metrics (RMSE, R²).</p>
                    </div>
                    <div className="flow-item">
                      <strong>4. AI Synthesis (OpenRouter):</strong>
                      <p>OpenRouter LLM analyzes ML outputs, risk, alerts → recommendations based on simulated data.</p>
                    </div>
                    <div className="flow-item">
                      <strong>5. Frontend Display:</strong>
                      <p>React shows charts, training metrics, and simulated data visualizations. Useful for testing and demonstration.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Pages Guide Section */}
        {activeSection === 'pages' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <h2>Pages Guide - What Each Tab Does</h2>
            <p className="section-intro">
              Use the <strong>nav tabs</strong> (left) to move between pages; <strong>Active City</strong> (right) to select NYC, Chicago, LA, etc. 
              Data is <strong>dynamic</strong>: MongoDB Atlas + live APIs (Weather, AQI, Traffic, EIA, 311). Hover nav links for tooltips.
            </p>

            <div className="pages-grid">
              {pages.sort((a, b) => a.order - b.order).map((page, index) => (
                <motion.div
                  key={page.id}
                  className="page-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="page-header-card">
                    <div className="page-order">{page.order}</div>
                    <div className="page-icon">
                      <page.icon size={24} />
                    </div>
                    <div className="page-title">
                      <h3>{page.name}</h3>
                      <span className="page-path">{page.path}</span>
                    </div>
                  </div>

                  <div className="page-content">
                    <p className="page-description">{page.description}</p>
                    
                    <div className="page-detail">
                      <strong><Target size={14} /> Purpose:</strong>
                      <p>{page.purpose}</p>
                    </div>

                    <div className="page-detail">
                      <strong><Database size={14} /> Data Source:</strong>
                      <p>{page.dataSource}</p>
                    </div>

                    <div className="page-detail">
                      <strong><TrendingUp size={14} /> Output:</strong>
                      <p>{page.output}</p>
                    </div>

                    <div className="page-features">
                      <strong>Features:</strong>
                      <ul>
                        {page.features.map((feature, i) => (
                          <li key={i}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Outputs Section */}
        {activeSection === 'outputs' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <h2>System Outputs & Results</h2>
            
            <div className="outputs-grid">
              <div className="output-card">
                <h3><Activity size={20} /> Demand Forecasts</h3>
                <p><strong>Source:</strong> TFT (primary), LSTM (comparison), ARIMA, Prophet models</p>
                <p><strong>Output:</strong> Next hour (and multi-horizon) energy demand prediction</p>
                <p><strong>Accuracy:</strong> TFT primary; LSTM comparison (RMSE: 64.27), Prophet (RMSE: 48.41)</p>
                <p><strong>Use Case:</strong> Plan energy generation, prevent overloads</p>
              </div>

              <div className="output-card">
                <h3><AlertTriangle size={20} /> Anomaly Detection</h3>
                <p><strong>Source:</strong> Autoencoder model</p>
                <p><strong>Output:</strong> Anomaly scores, flagged readings</p>
                <p><strong>Metrics:</strong> 5.33% anomaly rate, threshold: 0.026</p>
                <p><strong>Use Case:</strong> Detect equipment malfunctions, unauthorized usage</p>
              </div>

              <div className="output-card">
                <h3><Network size={20} /> Risk Scores</h3>
                <p><strong>Source:</strong> GNN model + rule-based calculation</p>
                <p><strong>Output:</strong> Zone risk levels (Low/Medium/High)</p>
                <p><strong>Current Status:</strong> {mode === 'city' ? (collections.processed_zone_data?.distinct_zones ?? collections.processed_zone_data?.count ?? 0) : (collections.zones?.count || 0)} zones</p>
                <p><strong>Use Case:</strong> Prioritize maintenance, allocate resources</p>
              </div>

              <div className="output-card">
                <h3><BarChart3 size={20} /> Analytics</h3>
                <p><strong>Source:</strong> MongoDB aggregations</p>
                <p><strong>Output:</strong> Demand trends, AQI analysis, correlations</p>
                <p><strong>Data Points:</strong> {mode === 'city'
                  ? `${(collections.processed_zone_data?.count || 0) + (collections.weather_data?.count || 0) + (collections.aqi_data?.count || 0) + (collections.traffic_data?.count || 0)} records analyzed`
                  : `${Math.round((collections.meter_readings?.count || 0) / 1000)}K readings analyzed`}
                </p>
                <p><strong>Use Case:</strong> Understand patterns, make data-driven decisions</p>
              </div>

              <div className="output-card">
                <h3><Brain size={20} /> AI Recommendations</h3>
                <p><strong>Source:</strong> Gemini AI synthesis of all ML models</p>
                <p><strong>Output:</strong> Prioritized, actionable recommendations with cost-benefit analysis</p>
                <p><strong>Input:</strong> All 5 ML model outputs, zone risk, alerts, anomalies, AQI status</p>
                <p><strong>Use Case:</strong> Get intelligent, synthesized actions based on complete system state</p>
              </div>

              <div className="output-card">
                <h3><Zap size={20} /> Insights</h3>
                <p><strong>Source:</strong> Risk scores, alerts, anomalies (rule-based)</p>
                <p><strong>Output:</strong> Actionable recommendations</p>
                <p><strong>Examples:</strong> Load balancing, health advisories, inspections</p>
                <p><strong>Use Case:</strong> Take immediate action on critical issues</p>
              </div>

              <div className="output-card">
                <h3><FileText size={20} /> Reports</h3>
                <p><strong>Source:</strong> All MongoDB collections</p>
                <p><strong>Output:</strong> PDF/CSV reports with charts and metrics</p>
                <p><strong>Types:</strong> Demand, AQI, Alerts, Zone Performance, Model Performance</p>
                <p><strong>Use Case:</strong> Documentation, compliance, stakeholder reports</p>
              </div>
            </div>

            <div className="output-summary">
              <h3>Real-Time Outputs from Your Database</h3>
              <div className="output-stats">
                <div className="output-stat">
                  <span className="stat-value">{mode === 'city' ? (collections.processed_zone_data?.distinct_zones ?? collections.processed_zone_data?.count ?? 0) : (collections.zones?.count || 0)}</span>
                  <span className="stat-label">Zones Monitored</span>
                </div>
                <div className="output-stat">
                  <span className="stat-value">{mode === 'city'
                    ? (collections.processed_zone_data?.count || 0) + (collections.weather_data?.count || 0) + (collections.aqi_data?.count || 0) + (collections.traffic_data?.count || 0)
                    : `${Math.round((collections.meter_readings?.count || 0) / 1000)}K`}
                  </span>
                  <span className="stat-label">Data Points Analyzed</span>
                </div>
                <div className="output-stat">
                  <span className="stat-value">{collections.alerts?.count ?? 0}</span>
                  <span className="stat-label">Alerts Generated</span>
                </div>
                <div className="output-stat">
                  <span className="stat-value">5</span>
                  <span className="stat-label">ML Models Active</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        .guide-page {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .header-icon {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-icon.primary {
          background: rgba(0, 255, 136, 0.15);
          color: var(--accent-primary);
        }

        .header-content h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .header-content p {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }

        .section-nav {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding: 0.5rem;
          background: var(--bg-card);
          border-radius: 10px;
          border: 1px solid var(--border-color);
        }

        .section-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .section-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .section-btn.active {
          background: var(--accent-primary);
          color: #000;
        }

        .section-content {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .overview-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .overview-card.highlight {
          border-color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.05);
        }

        .overview-card h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }

        .purpose-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .purpose-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .purpose-item svg {
          color: var(--accent-primary);
          flex-shrink: 0;
          margin-top: 0.2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .info-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .info-card h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: var(--accent-secondary);
        }

        .info-card ul {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0;
        }

        .info-card li {
          padding: 0.5rem 0;
          padding-left: 1.5rem;
          position: relative;
        }

        .info-card li:before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--accent-primary);
        }

        .workflow-diagram {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin: 2rem 0;
        }

        .workflow-step {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .step-number {
          position: absolute;
          top: -15px;
          left: 2rem;
          width: 40px;
          height: 40px;
          background: var(--accent-primary);
          color: #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.2rem;
        }

        .step-icon {
          margin: 1rem 0;
          color: var(--accent-secondary);
        }

        .step-data {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .workflow-arrow {
          position: absolute;
          bottom: -30px;
          color: var(--accent-primary);
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .architecture-explanation {
          margin-top: 3rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
        }

        .flow-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .flow-item {
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          border-left: 3px solid var(--accent-primary);
        }

        .pages-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .page-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .page-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.1);
        }

        .page-header-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .page-order {
          width: 40px;
          height: 40px;
          background: var(--accent-primary);
          color: #000;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.2rem;
        }

        .page-icon {
          color: var(--accent-secondary);
        }

        .page-title h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .page-path {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        .page-content {
          padding: 1.5rem;
        }

        .page-description {
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }

        .page-detail {
          margin: 1rem 0;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 6px;
        }

        .page-detail strong {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--accent-primary);
          margin-bottom: 0.5rem;
        }

        .page-features {
          margin-top: 1rem;
        }

        .page-features ul {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0;
        }

        .page-features li {
          padding: 0.25rem 0;
          padding-left: 1.5rem;
          position: relative;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .page-features li:before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--accent-primary);
        }

        .outputs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin: 2rem 0;
        }

        .output-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .output-card h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }

        .output-card p {
          margin: 0.5rem 0;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .output-card strong {
          color: var(--text-primary);
        }

        .output-summary {
          margin-top: 3rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
        }

        .output-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          margin-top: 1.5rem;
        }

        .output-stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--accent-primary);
          font-family: var(--font-display);
        }

        .stat-label {
          display: block;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.5rem;
        }

        .section-intro {
          color: var(--text-secondary);
          margin-bottom: 2rem;
          font-size: 1.05rem;
        }

        @media (max-width: 1200px) {
          .pages-grid {
            grid-template-columns: 1fr;
          }
          .outputs-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .purpose-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .info-cards-grid {
            grid-template-columns: 1fr;
          }
          .outputs-grid {
            grid-template-columns: 1fr;
          }
          .output-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
