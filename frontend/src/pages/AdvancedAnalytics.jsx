import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Database, Activity, AlertTriangle, Network, 
  TrendingUp, Code, PlayCircle, Loader, BarChart3,
  Layers, Target, Zap, Info, GitCompare
} from 'lucide-react';
import { modelsAPI, queriesAPI, analyticsAPI } from '../services/api';
import LSTM from './LSTM';
import Autoencoder from './Autoencoder';
import GNN from './GNN';
import ModelComparison from './ModelComparison';
import MongoDBQueries from '../components/MongoDBQueries';
import { ChevronRight } from 'lucide-react';

export default function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [modelsOverview, setModelsOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const response = await modelsAPI.getOverview();
      setModelsOverview(response.data);
    } catch (error) {
      console.error('Error fetching models overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Brain, color: 'primary' },
    { id: 'lstm', label: 'LSTM', icon: Activity, color: 'primary' },
    { id: 'autoencoder', label: 'Autoencoder', icon: AlertTriangle, color: 'warning' },
    { id: 'gnn', label: 'GNN', icon: Network, color: 'purple' },
    { id: 'comparison', label: 'Model Comparison', icon: GitCompare, color: 'secondary' },
    { id: 'queries', label: 'MongoDB Queries', icon: Database, color: 'secondary' },
  ];

  const OverviewContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <Loader size={32} className="spin" />
          <p>Loading models overview...</p>
        </div>
      );
    }

    return (
      <div className="overview-content">
        <motion.div
          className="overview-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>Advanced Analytics & Machine Learning</h2>
          <p>Comprehensive deep learning models and database queries for urban grid management</p>
        </motion.div>

        {/* Models Grid */}
        <div className="models-grid">
          {modelsOverview?.models?.map((model, index) => (
            <motion.div
              key={model.name}
              className="model-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                const tabMap = {
                  'LSTM': 'lstm',
                  'Autoencoder': 'autoencoder',
                  'GNN': 'gnn'
                };
                if (tabMap[model.name]) {
                  setActiveTab(tabMap[model.name]);
                }
              }}
            >
              <div className={`model-icon ${model.name.toLowerCase()}`}>
                {model.name === 'LSTM' && <Activity size={24} />}
                {model.name === 'Autoencoder' && <AlertTriangle size={24} />}
                {model.name === 'GNN' && <Network size={24} />}
                {model.name === 'ARIMA' && <TrendingUp size={24} />}
                {model.name === 'Prophet' && <BarChart3 size={24} />}
              </div>
              <h3>{model.name}</h3>
              <p className="model-purpose">{model.purpose}</p>
              <div className="model-metrics">
                {model.metrics && Object.entries(model.metrics).map(([key, value]) => (
                  <div key={key} className="metric">
                    <span className="metric-label">{key}:</span>
                    <span className="metric-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="model-status">
                <span className={`status-badge ${model.status === 'trained' ? 'trained' : 'pending'}`}>
                  {model.status === 'trained' ? '✓ Trained' : 'Pending'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Database size={32} />
            <div className="stat-content">
              <h3>10 MongoDB Queries</h3>
              <p>3 Basic + 7 Advanced queries</p>
            </div>
          </motion.div>
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Brain size={32} />
            <div className="stat-content">
              <h3>5 ML Models</h3>
              <p>All models trained and ready</p>
            </div>
          </motion.div>
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Target size={32} />
            <div className="stat-content">
              <h3>360K+ Data Points</h3>
              <p>Time-series data for training</p>
            </div>
          </motion.div>
        </div>

        {/* Navigation Cards */}
        <div className="nav-cards">
          <motion.div
            className="nav-card"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('queries')}
          >
            <Database size={32} />
            <h4>MongoDB Queries</h4>
            <p>Execute and explore 10 meaningful database queries</p>
            <ChevronRight size={20} />
          </motion.div>
          <motion.div
            className="nav-card"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('comparison')}
          >
            <GitCompare size={32} />
            <h4>Model Comparison</h4>
            <p>Compare performance of all ML models</p>
            <ChevronRight size={20} />
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="advanced-analytics-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1><Brain size={32} /> Advanced Analytics</h1>
        <p>Deep Learning Models, Database Queries, and Advanced Analysis</p>
      </motion.div>

      {/* Tabs */}
      <div className="analytics-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`analytics-tab ${activeTab === tab.id ? 'active' : ''} ${tab.color}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="analytics-content">
        {activeTab === 'overview' && <OverviewContent />}
        {activeTab === 'lstm' && <LSTM />}
        {activeTab === 'autoencoder' && <Autoencoder />}
        {activeTab === 'gnn' && <GNN />}
        {activeTab === 'comparison' && <ModelComparison />}
        {activeTab === 'queries' && <MongoDBQueries />}
      </div>

      <style>{`
        .advanced-analytics-page {
          min-height: 100vh;
          padding-bottom: 4rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
          font-size: 2rem;
        }

        .page-header p {
          color: var(--text-secondary);
          font-size: 1.125rem;
        }

        .analytics-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
          overflow-x: auto;
        }

        .analytics-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .analytics-tab:hover {
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }

        .analytics-tab.active {
          background: var(--accent-primary);
          color: #000;
          border-color: var(--accent-primary);
          font-weight: 600;
        }

        .analytics-tab.active.primary {
          background: var(--accent-primary);
        }

        .analytics-tab.active.warning {
          background: var(--accent-warning);
        }

        .analytics-tab.active.purple {
          background: var(--accent-purple);
        }

        .analytics-tab.active.secondary {
          background: var(--accent-secondary);
        }

        .analytics-content {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
          min-height: 600px;
        }

        .overview-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .overview-header {
          text-align: center;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
        }

        .overview-header h2 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .overview-header p {
          color: var(--text-secondary);
        }

        .models-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .model-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .model-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.2);
        }

        .model-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .model-icon.lstm {
          background: rgba(0, 255, 136, 0.15);
          color: var(--accent-primary);
        }

        .model-icon.autoencoder {
          background: rgba(255, 170, 0, 0.15);
          color: var(--accent-warning);
        }

        .model-icon.gnn {
          background: rgba(170, 102, 255, 0.15);
          color: var(--accent-purple);
        }

        .model-card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .model-purpose {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .model-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .metric {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .metric-label {
          color: var(--text-secondary);
        }

        .metric-value {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .model-status {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.trained {
          background: rgba(0, 255, 136, 0.2);
          color: var(--accent-primary);
        }

        .status-badge.pending {
          background: rgba(255, 170, 0, 0.2);
          color: var(--accent-warning);
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-card svg {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .stat-content h3 {
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }

        .stat-content p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .nav-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .nav-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
          position: relative;
        }

        .nav-card:hover {
          border-color: var(--accent-primary);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.2);
        }

        .nav-card svg {
          color: var(--accent-primary);
        }

        .nav-card h4 {
          font-size: 1.25rem;
        }

        .nav-card p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .nav-card > svg:last-child {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          opacity: 0.5;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
          color: var(--text-secondary);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .analytics-tabs {
            flex-wrap: wrap;
          }

          .models-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
