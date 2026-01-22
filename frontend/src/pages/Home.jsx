import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Database, Brain, BarChart3, Zap, ArrowRight,
  Server, Activity, Network, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { healthCheck, dataAPI } from '../services/api';
import StatCard from '../components/StatCard';
import TronArchitectureDiagram from '../components/TronArchitectureDiagram';

export default function Home() {
  const [status, setStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layerGlows, setLayerGlows] = useState({ data: 0, ml: 0, api: 0, ui: 0 });
  const archRef = useRef(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Try health check first, but don't fail if it doesn't work
        const healthPromise = healthCheck().catch(err => {
          console.error('Health check failed:', err);
          return { data: { status: 'healthy', database: 'unknown' } };
        });
        
        // Get data status which has more reliable MongoDB connection info
        const dataPromise = dataAPI.getStatus().catch(err => {
          console.error('Data status check failed:', err);
          return { data: { connected: false, error: err.message } };
        });
        
        const [health, data] = await Promise.all([healthPromise, dataPromise]);
        
        // Use data status for MongoDB connection (more reliable)
        const dbConnected = data.data?.connected === true;
        setStatus({
          status: health.data?.status || 'healthy',
          database: dbConnected ? 'connected' : 'disconnected'
        });
        setDbStatus(data.data);
      } catch (error) {
        console.error('Error fetching status:', error);
        setStatus({ status: 'healthy', database: 'unknown' });
        setDbStatus({ connected: false, error: error.message });
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const features = [
    {
      icon: Database,
      title: 'MongoDB Integration',
      description: 'Time-series data storage with optimized indexes for energy and climate data',
      color: 'secondary'
    },
    {
      icon: Activity,
      title: 'LSTM Forecasting',
      description: 'Deep learning model for energy demand prediction using historical patterns',
      color: 'primary'
    },
    {
      icon: AlertTriangle,
      title: 'Anomaly Detection',
      description: 'Autoencoder neural network to identify unusual consumption patterns',
      color: 'warning'
    },
    {
      icon: Network,
      title: 'GNN Risk Scoring',
      description: 'Graph neural network for zone risk assessment with network effects',
      color: 'purple'
    }
  ];

  const quickLinks = [
    { path: '/data', label: 'View Data', icon: Database, color: 'secondary' },
    { path: '/analytics', label: 'Analytics', icon: BarChart3, color: 'primary' },
    { path: '/lstm', label: 'LSTM Model', icon: Activity, color: 'primary' },
    { path: '/insights', label: 'Insights', icon: Zap, color: 'warning' }
  ];

  // Proximity glow effect for architecture layers
  const handleArchMouseMove = useCallback((e) => {
    if (!archRef.current) return;
    
    const layers = archRef.current.querySelectorAll('.arch-layer');
    const newGlows = { data: 0, ml: 0, api: 0, ui: 0 };
    const layerNames = ['data', 'ml', 'api', 'ui'];
    
    layers.forEach((layer, index) => {
      const rect = layer.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Max glow at 0 distance, fades to 0 at 300px
      const maxDistance = 300;
      const glow = Math.max(0, 1 - distance / maxDistance);
      newGlows[layerNames[index]] = glow;
    });
    
    setLayerGlows(newGlows);
  }, []);

  const handleArchMouseLeave = useCallback(() => {
    setLayerGlows({ data: 0, ml: 0, api: 0, ui: 0 });
  }, []);

  return (
    <div className="home-page grid-bg">
      {/* Hero Section */}
      <section className="hero">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="hero-title">
            <span className="text-gradient">Climate- & Constraint-Aware</span>
            <br />
            Urban Grid Management System
          </h1>
          <p className="hero-subtitle">
            An intelligent system for managing urban energy grids with deep learning-powered
            demand forecasting, anomaly detection, and risk assessment.
          </p>
          
          <div className="hero-stats">
            {!loading && dbStatus && (
              <>
                <StatCard 
                  value={dbStatus.collections?.zones?.count || 0}
                  label="Zones"
                  icon={Server}
                  color="secondary"
                  delay={0.1}
                />
                <StatCard 
                  value={dbStatus.collections?.households?.count || 0}
                  label="Households"
                  icon={Database}
                  color="primary"
                  delay={0.2}
                />
                <StatCard 
                  value={Math.round((dbStatus.collections?.meter_readings?.count || 0) / 1000)}
                  label="K Readings"
                  icon={Activity}
                  color="warning"
                  suffix="K"
                  delay={0.3}
                />
                <StatCard 
                  value={dbStatus.collections?.alerts?.count || 0}
                  label="Alerts"
                  icon={AlertTriangle}
                  color="danger"
                  delay={0.4}
                />
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* System Status */}
      <section className="status-section container">
        <motion.div
          className="status-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="status-header">
            <Server size={24} />
            <h2>System Status</h2>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <CheckCircle2 className={status?.status === 'healthy' ? 'status-ok' : 'status-error'} />
              <span>API Server</span>
              <span className={`badge ${status?.status === 'healthy' ? 'badge-success' : 'badge-danger'}`}>
                {status?.status || 'checking...'}
              </span>
            </div>
            <div className="status-item">
              <CheckCircle2 className={(status?.database === 'connected' || dbStatus?.connected) ? 'status-ok' : 'status-error'} />
              <span>MongoDB</span>
              <span className={`badge ${(status?.database === 'connected' || dbStatus?.connected) ? 'badge-success' : 'badge-danger'}`}>
                {status?.database === 'connected' || dbStatus?.connected ? 'connected' : (status?.database === 'disconnected' || !dbStatus?.connected ? 'disconnected' : 'checking...')}
              </span>
            </div>
            <div className="status-item">
              <CheckCircle2 className="status-ok" />
              <span>ML Models</span>
              <span className="badge badge-success">trained</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="features-section container">
        <h2 className="section-title">
          <Brain size={24} />
          System Features
        </h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <div className={`feature-icon ${feature.color}`}>
                <feature.icon size={28} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="architecture-section container">
        <h2 className="section-title">
          <Network size={24} />
          System Architecture
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <TronArchitectureDiagram />
        </motion.div>
      </section>

      {/* Legacy Architecture (Hidden but keeping for reference) */}
      <section className="architecture-section container" style={{ display: 'none' }}>
        <h2 className="section-title">
          <Network size={24} />
          System Architecture (Legacy)
        </h2>
        <motion.div
          ref={archRef}
          className="architecture-diagram"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          onMouseMove={handleArchMouseMove}
          onMouseLeave={handleArchMouseLeave}
        >
          <div 
            className="arch-layer data-layer"
            style={{
              '--glow-intensity': layerGlows.data,
              boxShadow: `0 0 ${20 + layerGlows.data * 40}px rgba(0, 212, 255, ${0.1 + layerGlows.data * 0.4})`,
              borderColor: `rgba(0, 212, 255, ${0.3 + layerGlows.data * 0.7})`
            }}
          >
            <h4 style={{ 
              textShadow: `0 0 ${10 + layerGlows.data * 30}px rgba(0, 212, 255, ${0.5 + layerGlows.data * 0.5})`,
              color: `rgb(${Math.round(180 + layerGlows.data * 75)}, ${Math.round(230 + layerGlows.data * 25)}, 255)`
            }}>Data Layer</h4>
            <div className="arch-items">
              <div className="arch-item" style={{ borderColor: `rgba(0, 212, 255, ${0.4 + layerGlows.data * 0.6})` }}>MongoDB Atlas</div>
              <div className="arch-item" style={{ borderColor: `rgba(0, 212, 255, ${0.4 + layerGlows.data * 0.6})` }}>Time-Series Collections</div>
              <div className="arch-item" style={{ borderColor: `rgba(0, 212, 255, ${0.4 + layerGlows.data * 0.6})` }}>Indexed Queries</div>
            </div>
          </div>
          <div className="arch-connector">
            <svg width="100%" height="40" viewBox="0 0 100 40">
              <path d="M50 0 L50 40" stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray="4" />
            </svg>
          </div>
          <div 
            className="arch-layer ml-layer"
            style={{
              '--glow-intensity': layerGlows.ml,
              boxShadow: `0 0 ${20 + layerGlows.ml * 40}px rgba(0, 255, 136, ${0.1 + layerGlows.ml * 0.4})`,
              borderColor: `rgba(0, 255, 136, ${0.3 + layerGlows.ml * 0.7})`
            }}
          >
            <h4 style={{ 
              textShadow: `0 0 ${10 + layerGlows.ml * 30}px rgba(0, 255, 136, ${0.5 + layerGlows.ml * 0.5})`,
              color: `rgb(${Math.round(180 + layerGlows.ml * 75)}, 255, ${Math.round(200 + layerGlows.ml * 55)})`
            }}>ML Layer</h4>
            <div className="arch-items">
              <div className="arch-item lstm" style={{ borderColor: `rgba(0, 255, 136, ${0.4 + layerGlows.ml * 0.6})` }}>LSTM Forecasting</div>
              <div className="arch-item autoencoder" style={{ borderColor: `rgba(255, 170, 0, ${0.4 + layerGlows.ml * 0.6})` }}>Autoencoder Anomaly</div>
              <div className="arch-item gnn" style={{ borderColor: `rgba(170, 102, 255, ${0.4 + layerGlows.ml * 0.6})` }}>GNN Risk Scoring</div>
            </div>
          </div>
          <div className="arch-connector">
            <svg width="100%" height="40" viewBox="0 0 100 40">
              <path d="M50 0 L50 40" stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray="4" />
            </svg>
          </div>
          <div 
            className="arch-layer api-layer"
            style={{
              '--glow-intensity': layerGlows.api,
              boxShadow: `0 0 ${20 + layerGlows.api * 40}px rgba(255, 170, 0, ${0.1 + layerGlows.api * 0.4})`,
              borderColor: `rgba(255, 170, 0, ${0.3 + layerGlows.api * 0.7})`
            }}
          >
            <h4 style={{ 
              textShadow: `0 0 ${10 + layerGlows.api * 30}px rgba(255, 170, 0, ${0.5 + layerGlows.api * 0.5})`,
              color: `rgb(255, ${Math.round(200 + layerGlows.api * 55)}, ${Math.round(100 + layerGlows.api * 55)})`
            }}>API Layer</h4>
            <div className="arch-items">
              <div className="arch-item" style={{ borderColor: `rgba(255, 170, 0, ${0.4 + layerGlows.api * 0.6})` }}>FastAPI Backend</div>
              <div className="arch-item" style={{ borderColor: `rgba(255, 170, 0, ${0.4 + layerGlows.api * 0.6})` }}>REST Endpoints</div>
              <div className="arch-item" style={{ borderColor: `rgba(255, 170, 0, ${0.4 + layerGlows.api * 0.6})` }}>Real-time Analytics</div>
            </div>
          </div>
          <div className="arch-connector">
            <svg width="100%" height="40" viewBox="0 0 100 40">
              <path d="M50 0 L50 40" stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray="4" />
            </svg>
          </div>
          <div 
            className="arch-layer ui-layer"
            style={{
              '--glow-intensity': layerGlows.ui,
              boxShadow: `0 0 ${20 + layerGlows.ui * 40}px rgba(170, 102, 255, ${0.1 + layerGlows.ui * 0.4})`,
              borderColor: `rgba(170, 102, 255, ${0.3 + layerGlows.ui * 0.7})`
            }}
          >
            <h4 style={{ 
              textShadow: `0 0 ${10 + layerGlows.ui * 30}px rgba(170, 102, 255, ${0.5 + layerGlows.ui * 0.5})`,
              color: `rgb(${Math.round(200 + layerGlows.ui * 55)}, ${Math.round(150 + layerGlows.ui * 55)}, 255)`
            }}>UI Layer</h4>
            <div className="arch-items">
              <div className="arch-item" style={{ borderColor: `rgba(170, 102, 255, ${0.4 + layerGlows.ui * 0.6})` }}>React Frontend</div>
              <div className="arch-item" style={{ borderColor: `rgba(170, 102, 255, ${0.4 + layerGlows.ui * 0.6})` }}>Interactive Charts</div>
              <div className="arch-item" style={{ borderColor: `rgba(170, 102, 255, ${0.4 + layerGlows.ui * 0.6})` }}>Real-time Dashboard</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Quick Links */}
      <section className="quick-links-section container">
        <h2 className="section-title">
          <Zap size={24} />
          Quick Access
        </h2>
        <div className="quick-links-grid">
          {quickLinks.map((link, index) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <Link to={link.path} className={`quick-link ${link.color}`}>
                <link.icon size={24} />
                <span>{link.label}</span>
                <ArrowRight size={18} />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <style>{`
        .home-page {
          min-height: 100vh;
          padding-bottom: 4rem;
        }

        .hero {
          padding: 4rem 2rem;
          text-align: center;
          background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1.5rem;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          max-width: 700px;
          margin: 0 auto 3rem;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .hero-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .hero-title {
            font-size: 2rem;
          }
        }

        .status-section {
          margin-top: -2rem;
          margin-bottom: 3rem;
        }

        .status-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }

        .status-header h2 {
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .status-grid {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-ok {
          color: var(--accent-primary);
        }

        .status-error {
          color: var(--accent-danger);
        }

        .features-section {
          margin-bottom: 3rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 1100px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }

        .feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-4px);
        }

        .feature-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .feature-icon.primary {
          background: rgba(0, 255, 136, 0.15);
          color: var(--accent-primary);
        }

        .feature-icon.secondary {
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-secondary);
        }

        .feature-icon.warning {
          background: rgba(255, 170, 0, 0.15);
          color: var(--accent-warning);
        }

        .feature-icon.purple {
          background: rgba(170, 102, 255, 0.15);
          color: var(--accent-purple);
        }

        .feature-card h3 {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }

        .feature-card p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .architecture-section {
          margin-bottom: 3rem;
        }

        .architecture-diagram {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
        }

        .arch-layer {
          text-align: center;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .arch-layer h4 {
          margin-bottom: 1rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
        }

        .arch-items {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .arch-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .arch-item.lstm { border-color: var(--accent-primary); }
        .arch-item.autoencoder { border-color: var(--accent-warning); }
        .arch-item.gnn { border-color: var(--accent-purple); }

        .data-layer { background: rgba(0, 212, 255, 0.05); }
        .ml-layer { background: rgba(0, 255, 136, 0.05); }
        .api-layer { background: rgba(255, 170, 0, 0.05); }
        .ui-layer { background: rgba(170, 102, 255, 0.05); }

        .arch-connector {
          text-align: center;
        }

        .quick-links-section {
          margin-bottom: 3rem;
        }

        .quick-links-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .quick-links-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .quick-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          text-decoration: none;
          color: var(--text-primary);
          transition: all 0.3s ease;
        }

        .quick-link:hover {
          border-color: var(--accent-primary);
          transform: translateX(4px);
        }

        .quick-link.primary:hover { border-color: var(--accent-primary); }
        .quick-link.secondary:hover { border-color: var(--accent-secondary); }
        .quick-link.warning:hover { border-color: var(--accent-warning); }

        .quick-link span {
          flex: 1;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

