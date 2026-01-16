import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Database, BarChart3, Brain, 
  Activity, Network, Zap, Box, FileText, Eye, AlertTriangle, GitCompare, Map
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/citymap', label: 'City Map', icon: Map },
  { path: '/simulation3d', label: '3D City', icon: Box },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/lstm', label: 'LSTM', icon: Activity },
  { path: '/autoencoder', label: 'Autoencoder', icon: AlertTriangle },
  { path: '/gnn', label: 'GNN', icon: Network },
  { path: '/comparison', label: 'Compare', icon: GitCompare },
  { path: '/visualizations', label: 'Viz', icon: Eye },
  { path: '/data', label: 'Data', icon: Database },
  { path: '/reports', label: 'Reports', icon: FileText },
];

export default function Navbar() {
  const location = useLocation();

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

      <div className="nav-links">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`nav-link ${location.pathname === path ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
            {location.pathname === path && <div className="active-indicator"></div>}
          </Link>
        ))}
      </div>

      <div className="nav-status">
        <div className="status-dot"></div>
        <span>SYSTEM ONLINE</span>
      </div>

      <style>{`
        .navbar {
          background: rgba(5, 10, 20, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
          padding: 0.75rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
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
        }

        .brand-icon-container {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
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
        }

        .brand-title {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: 0.2em;
        }

        .brand-subtitle {
          font-family: var(--font-display);
          font-size: 0.55rem;
          color: var(--accent-secondary);
          text-transform: uppercase;
          letter-spacing: 0.3em;
          opacity: 0.8;
        }

        .nav-links {
          display: flex;
          gap: 0.25rem;
        }

        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          color: var(--text-secondary);
          text-decoration: none;
          font-family: var(--font-display);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }

        .nav-link:hover {
          color: var(--accent-secondary);
          background: rgba(0, 212, 255, 0.1);
          border-color: rgba(0, 212, 255, 0.3);
        }

        .nav-link.active {
          color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.1);
          border-color: var(--accent-primary);
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.2);
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

        .nav-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-display);
          font-size: 0.65rem;
          color: var(--accent-primary);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--accent-primary);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--accent-primary);
          animation: pulse-glow 2s ease-in-out infinite;
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

        @media (max-width: 1200px) {
          .nav-link span {
            display: none;
          }
          .nav-link {
            padding: 0.6rem;
          }
          .nav-status span {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 0.5rem 1rem;
          }
          .brand-subtitle {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
