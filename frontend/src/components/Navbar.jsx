import { useState, useRef, useEffect, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Database, BarChart3, Brain, 
  Activity, Network, Zap, Box, FileText, Eye, AlertTriangle, GitCompare, Map, BookOpen, ClipboardList,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import CitySelector from './CitySelector';
import ModeSwitcher from './ModeSwitcher';
import { useAppMode } from '../utils/useAppMode';

const CITY_NAV = [
  // Core Pages
  { path: '/', label: 'Home', icon: Home, order: 1, group: 'core', tooltip: 'System overview, architecture, real-time stats' },
  { path: '/guide', label: 'Guide', icon: BookOpen, order: 2, group: 'core', tooltip: 'How the system works, data flow, page guide' },
  { path: '/data', label: 'Data', icon: Database, order: 3, group: 'core', tooltip: 'MongoDB collections, zones, alerts' },
  // Analytics Group
  { path: '/analytics', label: 'Analytics', icon: BarChart3, order: 4, group: 'analytics', tooltip: 'Demand, AQI, correlations, anomalies' },
  { path: '/advanced-analytics', label: 'Advanced', icon: Brain, order: 5, group: 'analytics', tooltip: 'ML models (LSTM, GNN, etc.) & MongoDB queries' },
  { path: '/ai-recommendations', label: 'AI Recs', icon: Brain, order: 6, group: 'analytics', tooltip: 'AI-powered prioritized recommendations' },
  { path: '/insights', label: 'Insights', icon: Zap, order: 7, group: 'analytics', tooltip: 'Forecasts, alerts, anomalies' },
  // Visualization
  { path: '/citymap', label: 'City Map', icon: Map, order: 8, group: 'viz', tooltip: '2D zone map with real city coordinates' },
  { path: '/visualizations', label: 'Viz', icon: Eye, order: 9, group: 'viz', tooltip: 'Heatmaps, zone comparison' },
  // Management
  { path: '/incidents', label: 'Incidents', icon: ClipboardList, order: 10, group: 'mgmt', tooltip: 'City 311 service requests & tracking' },
  { path: '/reports', label: 'Reports', icon: FileText, order: 11, group: 'mgmt', tooltip: 'Generate & export reports' },
];

const SIM_NAV = [
  // Core Pages
  { path: '/', label: 'Home', icon: Home, order: 1, group: 'core', tooltip: 'Simulated dataset overview' },
  { path: '/guide', label: 'Guide', icon: BookOpen, order: 2, group: 'core', tooltip: 'System guide and documentation' },
  { path: '/data', label: 'Data', icon: Database, order: 3, group: 'core', tooltip: 'MongoDB collections explorer' },
  // Analytics Group
  { path: '/analytics', label: 'Analytics', icon: BarChart3, order: 4, group: 'analytics', tooltip: 'Demand, AQI, correlations, anomalies' },
  { path: '/advanced-analytics', label: 'Advanced', icon: Brain, order: 5, group: 'analytics', tooltip: 'ML models (LSTM, GNN, etc.) & MongoDB queries' },
  { path: '/ai-recommendations', label: 'AI Recs', icon: Brain, order: 6, group: 'analytics', tooltip: 'AI-powered prioritized recommendations' },
  { path: '/insights', label: 'Insights', icon: Zap, order: 7, group: 'analytics', tooltip: 'Forecasts, alerts, anomalies' },
  // Visualization
  { path: '/citymap', label: '2D Grid', icon: Map, order: 8, group: 'viz', tooltip: '2D zone grid visualization' },
  { path: '/simulation', label: 'Disaster Sim', icon: Zap, order: 9, group: 'viz', tooltip: 'Disaster scenario simulation' },
  { path: '/simulation3d', label: '3D', icon: Box, order: 10, group: 'viz', tooltip: '3D simulation view' },
  { path: '/visualizations', label: 'Viz', icon: Eye, order: 11, group: 'viz', tooltip: 'Heatmaps, zone comparison' },
  // Note: LSTM, Autoencoder, GNN, and Compare are now inside Advanced Analytics page, not separate nav items
  // Management
  { path: '/admin/queries', label: 'Admin', icon: Database, order: 16, group: 'mgmt', tooltip: 'Manage MongoDB queries (admin)' },
  { path: '/reports', label: 'Reports', icon: FileText, order: 17, group: 'mgmt', tooltip: 'Export simulated reports' },
];

export default function Navbar() {
  const { mode } = useAppMode();
  const location = useLocation();
  const navLinksRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const navItems = (mode === 'sim' ? SIM_NAV : CITY_NAV);

  const scroll = (dir) => {
    const el = navLinksRef.current;
    if (!el) return;
    const step = 200;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  const onNavScroll = () => {
    const el = navLinksRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    onNavScroll();
    const t = setTimeout(onNavScroll, 100);
    window.addEventListener('resize', onNavScroll);
    return () => { clearTimeout(t); window.removeEventListener('resize', onNavScroll); };
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="brand-icon-container">
          <Brain className="brand-icon" />
          <div className="brand-glow"></div>
        </div>
        <span className="brand-text">
          <span className="text-gradient brand-title">URBAN GRID</span>
          <span className="brand-subtitle">MANAGEMENT SYSTEM</span>
        </span>
      </div>

      <div className="nav-mode">
        <ModeSwitcher />
      </div>

      <div className="nav-slider">
        <button
          type="button"
          className="nav-slider-btn left"
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          aria-label="Scroll nav left"
        >
          <ChevronLeft size={18} />
        </button>
        <div
          ref={navLinksRef}
          className="nav-links"
          onScroll={onNavScroll}
        >
          {navItems.sort((a, b) => (a.order || 999) - (b.order || 999)).map(({ path, label, icon: Icon, tooltip, group }, index, array) => {
            const prevGroup = index > 0 ? array[index - 1]?.group : null;
            const showDivider = group && group !== prevGroup && index > 0;
            return (
              <Fragment key={path}>
                {showDivider && <div className="nav-group-divider" />}
                <Link
                  to={path}
                  className={`nav-link ${location.pathname === path ? 'active' : ''}`}
                  title={tooltip}
                  data-group={group}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {location.pathname === path && <div className="active-indicator"></div>}
                </Link>
              </Fragment>
            );
          })}
        </div>
        <button
          type="button"
          className="nav-slider-btn right"
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          aria-label="Scroll nav right"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="nav-divider" aria-hidden="true" />

      {mode === 'city' && (
        <div className="nav-context">
          <span className="nav-context-label">Active City</span>
          <div className="nav-city-selector">
            <CitySelector onProcessingComplete={(data) => { if (data?.city_id && typeof sessionStorage !== 'undefined') sessionStorage.setItem('city_selected', data.city_id); }} />
            <Link to="/select-city" className="nav-change-city" title="Choose a different city and reprocess">Change city</Link>
          </div>
        </div>
      )}

      <div className="nav-status">
        <div className="status-dot"></div>
        <span>SYSTEM ONLINE</span>
      </div>

      <style>{`
        .navbar {
          background: rgba(5, 10, 20, 0.98);
          backdrop-filter: blur(30px);
          border-bottom: 1px solid rgba(0, 212, 255, 0.15);
          padding: 0.5rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          box-sizing: border-box;
          min-height: 56px;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
        }

        .navbar::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(0, 212, 255, 0.5) 20%, 
            rgba(0, 255, 136, 0.5) 50%, 
            rgba(0, 212, 255, 0.5) 80%, 
            transparent
          );
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
          min-width: fit-content;
        }

        .nav-mode {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .brand-icon-container {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .brand-icon {
          color: var(--accent-primary);
          width: 28px;
          height: 28px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 0 10px var(--accent-primary));
        }

        .brand-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(0, 255, 136, 0.3) 0%, transparent 70%);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
          white-space: nowrap;
        }

        .brand-title {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.15em;
        }

        .brand-subtitle {
          font-family: var(--font-display);
          font-size: 0.5rem;
          color: var(--accent-secondary);
          text-transform: uppercase;
          letter-spacing: 0.25em;
          opacity: 0.8;
        }

        .nav-slider {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex: 1;
          min-width: 0;
        }

        .nav-slider-btn {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 4px;
          color: var(--accent-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-slider-btn:hover:not(:disabled) {
          background: rgba(0, 212, 255, 0.2);
          border-color: var(--accent-secondary);
          color: var(--accent-primary);
        }

        .nav-slider-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .nav-links {
          display: flex;
          gap: 0.3rem;
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
          min-width: 0;
          align-items: center;
          padding: 0.25rem 0;
        }

        .nav-links::-webkit-scrollbar {
          display: none;
        }

        .nav-group-divider {
          width: 1px;
          height: 20px;
          background: linear-gradient(180deg, transparent, rgba(0, 212, 255, 0.25), transparent);
          flex-shrink: 0;
          margin: 0 0.15rem;
        }

        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          color: var(--text-secondary);
          text-decoration: none;
          font-family: var(--font-display);
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
          white-space: nowrap;
          flex-shrink: 0;
          min-height: 32px;
        }

        .nav-link:hover {
          color: var(--accent-secondary);
          background: rgba(0, 212, 255, 0.1);
          border-color: rgba(0, 212, 255, 0.3);
        }

        .nav-link.active {
          color: var(--accent-primary);
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 212, 255, 0.1));
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.15), inset 0 0 10px rgba(0, 255, 136, 0.05);
        }

        .active-indicator {
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 2px;
          background: var(--accent-primary);
          box-shadow: 0 0 10px var(--accent-primary);
        }

        .nav-divider {
          width: 1px;
          height: 32px;
          background: linear-gradient(180deg, transparent, rgba(0, 212, 255, 0.4), transparent);
          flex-shrink: 0;
          margin: 0 0.5rem;
        }

        .nav-context {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }

        .nav-context-label {
          font-family: var(--font-display);
          font-size: 0.5rem;
          color: var(--accent-secondary);
          letter-spacing: 0.15em;
          text-transform: uppercase;
          opacity: 0.8;
        }

        .nav-city-selector {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .nav-change-city {
          font-size: 0.55rem;
          color: var(--accent-secondary);
          opacity: 0.8;
          text-decoration: none;
        }
        .nav-change-city:hover { color: var(--accent-primary); text-decoration: underline; }

        .nav-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-display);
          font-size: 0.6rem;
          color: var(--accent-primary);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--accent-primary);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--accent-primary);
          animation: pulse-glow 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @media (max-width: 1400px) {
          .brand-title {
            font-size: 0.9rem;
          }
          .nav-link {
            font-size: 0.6rem;
            padding: 0.5rem 0.55rem;
          }
        }

        @media (max-width: 1200px) {
          .navbar {
            padding: 0.75rem 1rem;
            gap: 1rem;
          }
          .nav-link span {
            display: none;
          }
          .nav-link {
            padding: 0.6rem;
            min-width: 40px;
            justify-content: center;
          }
          .nav-status span {
            display: none;
          }
          .brand-text {
            display: none;
          }
          .nav-context-label {
            display: none;
          }
          .nav-divider {
            margin: 0 0.25rem;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 0.5rem 0.75rem;
            gap: 0.75rem;
          }
          .brand-icon-container {
            width: 32px;
            height: 32px;
          }
          .brand-icon {
            width: 20px;
            height: 20px;
          }
          .nav-link {
            padding: 0.5rem;
            min-width: 36px;
          }
        }
      `}</style>
    </nav>
  );
}
