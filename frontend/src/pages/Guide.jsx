import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Database, BarChart3, Brain, Activity, Network, 
  AlertTriangle, Zap, Map, GitCompare, Eye, FileText, 
  ArrowRight, CheckCircle, Info, TrendingUp, Target,
  Server, Layers, Code, BarChart, LineChart, ClipboardList, Box
} from 'lucide-react';
import { dataAPI, analyticsAPI, modelsAPI } from '../services/api';
import StatCard from '../components/StatCard';

export default function Guide() {
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const status = await dataAPI.getStatus();
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
      description: 'System overview and dashboard with real-time statistics',
      purpose: 'Quick view of system health, data counts, and key metrics',
      dataSource: 'MongoDB collections (zones, households, readings, alerts)',
      output: 'Live statistics: zones count, households count, readings count, alerts count',
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
      description: 'MongoDB data explorer - view all collections, zones, alerts, and grid structure',
      purpose: 'Inspect raw data stored in MongoDB Atlas',
      dataSource: 'Direct MongoDB queries (zones, households, alerts, grid_edges collections)',
      output: 'Collection counts, zone details, alert history, grid connectivity graph',
      features: ['Collection overview with counts', 'Zone details table', 'Alerts timeline', 'Grid adjacency visualization']
    },
    {
      id: 'analytics',
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      order: 4,
      description: 'Real-time analytics, correlations, and anomaly detection from MongoDB data',
      purpose: 'Analyze energy demand patterns, AQI trends, and detect consumption anomalies',
      dataSource: 'Aggregated MongoDB queries (hourly demand, AQI by zone, correlation matrix)',
      output: 'Charts showing demand trends, AQI distribution, correlation analysis, anomaly timeline',
      features: ['Real-time demand charts (72 hours)', 'Demand by zone comparison', 'AQI by zone', 'Correlation matrix', 'Anomaly detection timeline']
    },
    {
      id: 'advanced-analytics',
      name: 'Advanced Analytics',
      path: '/advanced-analytics',
      icon: Brain,
      order: 5,
      description: 'Deep dive into ML models, MongoDB queries, and technical details',
      purpose: 'Explore all 5 ML models (LSTM, Autoencoder, GNN, ARIMA, Prophet) and execute 10 MongoDB queries',
      dataSource: 'ML model outputs, MongoDB query results',
      output: 'Model architectures, training metrics, query results, model comparisons',
      features: ['ML Model Details', 'MongoDB Queries (10 queries)', 'Model Comparison', 'Technical Deep-dive']
    },
    {
      id: 'ai-recommendations',
      name: 'AI Recommendations',
      path: '/ai-recommendations',
      icon: Brain,
      order: 6,
      description: 'AI-powered actionable recommendations synthesized from all ML models',
      purpose: 'Get prioritized, intelligent recommendations based on all system data and ML predictions',
      dataSource: 'All ML model outputs, zone risk, alerts, anomalies, AQI status (compiled and analyzed by Gemini AI)',
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
      description: 'Interactive 2D city map showing zones with real-time risk visualization',
      purpose: 'Visualize zone locations, connections, and risk levels on a city map',
      dataSource: 'Zones, grid edges, zone risk scores from MongoDB',
      output: 'Interactive map with zone nodes, connections, risk colors, real-time updates',
      features: ['Zone visualization', 'Grid connections', 'Risk color coding', 'Zone details on click']
    },
    {
      id: 'simulation3d',
      name: '3D City',
      path: '/simulation3d',
      icon: Box,
      order: 10,
      description: '3D visualization of the city with energy flow and risk propagation',
      purpose: 'Visualize energy distribution and risk in 3D space',
      dataSource: 'Zones, demand data, risk scores from MongoDB',
      output: '3D city model with buildings, energy particles, risk visualization',
      features: ['3D city rendering', 'Energy flow visualization', 'Risk propagation', 'Interactive camera']
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
    }
  ];

  const workflow = [
    {
      step: 1,
      name: 'Data Collection',
      description: 'MongoDB Atlas stores time-series data from meters and sensors',
      data: 'meter_readings, air_climate_readings, zones, households, alerts',
      icon: Database
    },
    {
      step: 2,
      name: 'Data Processing',
      description: 'FastAPI backend aggregates and processes data from MongoDB',
      data: 'Hourly aggregations, zone metrics, correlation calculations',
      icon: Server
    },
    {
      step: 3,
      name: 'ML Model Inference',
      description: '5 trained models (LSTM, Autoencoder, GNN, ARIMA, Prophet) make predictions',
      data: 'Demand forecasts, anomaly scores, risk classifications, statistical forecasts',
      icon: Brain
    },
    {
      step: 4,
      name: 'Analytics & Advanced Analysis',
      description: 'Backend calculates analytics, executes MongoDB queries, and processes ML outputs',
      data: 'Demand trends, AQI analysis, risk scores, anomaly detection, 10 MongoDB queries',
      icon: BarChart3
    },
    {
      step: 5,
      name: 'AI Synthesis',
      description: 'Gemini AI analyzes all ML outputs and system state to generate recommendations',
      data: 'Prioritized actions, cost-benefit analysis, confidence scores, simulation suggestions',
      icon: Brain
    },
    {
      step: 6,
      name: 'Frontend Display',
      description: 'React frontend displays data, charts, visualizations, and AI recommendations',
      data: 'Interactive charts, maps, model details, prioritized recommendations',
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

            <div className="stats-grid">
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
            </div>

            <div className="info-cards-grid">
              <div className="info-card">
                <h3><Database size={20} /> Data Source</h3>
                <p>All data comes from <strong>MongoDB Atlas</strong> cloud database:</p>
                <ul>
                  <li>20 zones with population and critical sites</li>
                  <li>500 households with baseline consumption</li>
                  <li>360,000+ meter readings (hourly energy consumption)</li>
                  <li>14,400+ air/climate readings (AQI, temperature, humidity)</li>
                  <li>50 alerts (emergency, warning, watch levels)</li>
                  <li>50 grid edges (zone connectivity)</li>
                </ul>
              </div>

              <div className="info-card">
                <h3><Brain size={20} /> ML Models</h3>
                <p>Three trained deep learning models:</p>
                <ul>
                  <li><strong>LSTM:</strong> Demand forecasting (RMSE: 64.27, R²: 0.64)</li>
                  <li><strong>Autoencoder:</strong> Anomaly detection (5.33% anomaly rate)</li>
                  <li><strong>GNN:</strong> Zone risk scoring (95%+ accuracy)</li>
                  <li><strong>ARIMA:</strong> Statistical forecasting (RMSE: 88.82)</li>
                  <li><strong>Prophet:</strong> Seasonal forecasting (RMSE: 48.41, best performance)</li>
                </ul>
              </div>

              <div className="info-card">
                <h3><Zap size={20} /> Key Features</h3>
                <ul>
                  <li>Real-time data from MongoDB Atlas</li>
                  <li>Interactive charts and visualizations</li>
                  <li>AI-powered predictions and recommendations</li>
                  <li>Anomaly detection and alerting</li>
                  <li>Zone risk assessment with network effects</li>
                  <li>Model performance comparison</li>
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
              <div className="flow-details">
                <div className="flow-item">
                  <strong>1. MongoDB Atlas → Backend:</strong>
                  <p>FastAPI queries MongoDB for time-series data, zones, alerts</p>
                </div>
                <div className="flow-item">
                  <strong>2. Backend Processing:</strong>
                  <p>Data is aggregated (hourly demand, daily AQI), correlations calculated, risk scores computed</p>
                </div>
                <div className="flow-item">
                  <strong>3. ML Model Inference:</strong>
                  <p>Trained models make predictions (LSTM), detect anomalies (Autoencoder), classify risk (GNN)</p>
                </div>
                <div className="flow-item">
                  <strong>4. API Endpoints:</strong>
                  <p>Backend exposes REST APIs: /api/data, /api/analytics, /api/models, /api/ai/recommendations</p>
                </div>
                <div className="flow-item">
                  <strong>5. AI Synthesis (Gemini):</strong>
                  <p>Gemini AI analyzes all ML model outputs, risk scores, alerts, and anomalies to generate prioritized, actionable recommendations</p>
                </div>
                <div className="flow-item">
                  <strong>6. Frontend Display:</strong>
                  <p>React fetches from APIs and displays interactive charts, maps, AI recommendations, and visualizations</p>
                </div>
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
              Navigate through each page to understand its purpose, data source, and outputs. 
              All data is <strong>dynamic</strong> and comes from your MongoDB Atlas database.
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
                <p><strong>Source:</strong> LSTM, ARIMA, Prophet models</p>
                <p><strong>Output:</strong> Next hour energy demand prediction</p>
                <p><strong>Accuracy:</strong> LSTM (RMSE: 64.27), Prophet (RMSE: 48.41 - best)</p>
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
                <p><strong>Current Status:</strong> {collections.zones?.count || 0} zones, all currently Low Risk</p>
                <p><strong>Use Case:</strong> Prioritize maintenance, allocate resources</p>
              </div>

              <div className="output-card">
                <h3><BarChart3 size={20} /> Analytics</h3>
                <p><strong>Source:</strong> MongoDB aggregations</p>
                <p><strong>Output:</strong> Demand trends, AQI analysis, correlations</p>
                <p><strong>Data Points:</strong> {Math.round((collections.meter_readings?.count || 0) / 1000)}K readings analyzed</p>
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
                  <span className="stat-value">{collections.zones?.count || 0}</span>
                  <span className="stat-label">Zones Monitored</span>
                </div>
                <div className="output-stat">
                  <span className="stat-value">{Math.round((collections.meter_readings?.count || 0) / 1000)}K</span>
                  <span className="stat-label">Data Points Analyzed</span>
                </div>
                <div className="output-stat">
                  <span className="stat-value">{collections.alerts?.count || 0}</span>
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
