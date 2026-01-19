import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, Server, MapPin, Home, FileText, 
  GitBranch, AlertTriangle, Activity, RefreshCw 
} from 'lucide-react';
import { dataAPI } from '../services/api';
import StatCard from '../components/StatCard';

export default function Data() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dbStatus, setDbStatus] = useState(null);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [gridEdges, setGridEdges] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [status, zonesData, alertsData, edges] = await Promise.all([
        dataAPI.getStatus(),
        dataAPI.getZones(),
        dataAPI.getAlerts(20),
        dataAPI.getGridEdges()
      ]);
      setDbStatus(status.data);
      setZones(zonesData.data.zones);
      setAlerts(alertsData.data.alerts);
      setGridEdges(edges.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Database },
    { id: 'zones', label: 'Zones', icon: MapPin },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'graph', label: 'Grid Graph', icon: GitBranch },
  ];

  const collections = dbStatus?.collections || {};

  return (
    <div className="data-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>
          <Database size={32} />
          MongoDB Data Explorer
        </h1>
        <p>Explore the urban grid database collections and data</p>
        <button className="btn btn-secondary" onClick={fetchData}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : (
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="stats-grid">
                <StatCard
                  value={collections.zones?.count || 0}
                  label="Zones"
                  icon={MapPin}
                  color="secondary"
                  delay={0.1}
                />
                <StatCard
                  value={collections.households?.count || 0}
                  label="Households"
                  icon={Home}
                  color="primary"
                  delay={0.2}
                />
                <StatCard
                  value={collections.policies?.count || 0}
                  label="Policies"
                  icon={FileText}
                  color="purple"
                  delay={0.3}
                />
                <StatCard
                  value={collections.grid_edges?.count || 0}
                  label="Grid Edges"
                  icon={GitBranch}
                  color="secondary"
                  delay={0.4}
                />
              </div>

              <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
                <StatCard
                  value={collections.meter_readings?.count || 0}
                  label="Meter Readings"
                  icon={Activity}
                  color="primary"
                  delay={0.5}
                />
                <StatCard
                  value={collections.air_climate_readings?.count || 0}
                  label="Climate Readings"
                  icon={Server}
                  color="secondary"
                  delay={0.6}
                />
                <StatCard
                  value={collections.alerts?.count || 0}
                  label="Alerts"
                  icon={AlertTriangle}
                  color="danger"
                  delay={0.7}
                />
                <StatCard
                  value={collections.constraint_events?.count || 0}
                  label="Constraint Events"
                  icon={FileText}
                  color="warning"
                  delay={0.8}
                />
              </div>

              <div className="collections-detail">
                <h3>Collection Indexes</h3>
                <div className="collections-grid">
                  {Object.entries(collections).map(([name, info]) => (
                    <div key={name} className="collection-card">
                      <h4>{name}</h4>
                      <div className="collection-count">{(info.count || 0).toLocaleString()} documents</div>
                      <div className="collection-indexes">
                        <span className="index-label">Indexes:</span>
                        {(info.indexes || []).map(idx => (
                          <span key={idx} className="index-badge">{idx}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Zones Tab */}
          {activeTab === 'zones' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Zone ID</th>
                      <th>Name</th>
                      <th>Population</th>
                      <th>Grid Priority</th>
                      <th>Critical Sites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((zone, index) => (
                      <motion.tr
                        key={zone.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="code">{zone.id}</td>
                        <td>{zone.name}</td>
                        <td>{zone.population_est?.toLocaleString()}</td>
                        <td>
                          <span className={`priority-badge priority-${zone.grid_priority}`}>
                            P{zone.grid_priority}
                          </span>
                        </td>
                        <td>
                          <div className="critical-sites">
                            {zone.critical_sites?.map(site => (
                              <span key={site} className="site-badge">{site}</span>
                            ))}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Zone</th>
                      <th>Level</th>
                      <th>Type</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, index) => (
                      <motion.tr
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="code">
                          {new Date(alert.ts || alert.created_at).toLocaleString()}
                        </td>
                        <td>{alert.zone_id}</td>
                        <td>
                          <span className={`badge badge-${
                            alert.level === 'emergency' ? 'danger' : 
                            alert.level === 'alert' ? 'warning' : 'info'
                          }`}>
                            {alert.level}
                          </span>
                        </td>
                        <td>{alert.type}</td>
                        <td>{alert.message}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Graph Tab */}
          {activeTab === 'graph' && gridEdges && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="graph-info">
                <div className="graph-stat">
                  <span className="graph-stat-value">{zones.length}</span>
                  <span className="graph-stat-label">Nodes (Zones)</span>
                </div>
                <div className="graph-stat">
                  <span className="graph-stat-value">{gridEdges.count}</span>
                  <span className="graph-stat-label">Edges (Connections)</span>
                </div>
              </div>

              <div className="adjacency-list">
                <h3>Zone Adjacency</h3>
                <div className="adjacency-grid">
                  {Object.entries(gridEdges.adjacency || {}).map(([zone, neighbors]) => (
                    <div key={zone} className="adjacency-item">
                      <span className="zone-name">{zone}</span>
                      <span className="arrow">→</span>
                      <span className="neighbors">
                        {neighbors.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .page-header p {
          width: 100%;
          color: var(--text-secondary);
          margin-top: -0.5rem;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 8px 8px 0 0;
          transition: all 0.2s ease;
        }

        .tab:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .tab.active {
          color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .collections-detail {
          margin-top: 2rem;
        }

        .collections-detail h3 {
          margin-bottom: 1rem;
        }

        .collections-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (max-width: 800px) {
          .collections-grid {
            grid-template-columns: 1fr;
          }
        }

        .collection-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .collection-card h4 {
          font-family: var(--font-mono);
          color: var(--accent-primary);
          margin-bottom: 0.5rem;
        }

        .collection-count {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .collection-indexes {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .index-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .index-badge {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: var(--bg-secondary);
          border-radius: 4px;
          color: var(--text-secondary);
        }

        .priority-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .priority-1 { background: rgba(255, 68, 102, 0.2); color: var(--accent-danger); }
        .priority-2 { background: rgba(255, 170, 0, 0.2); color: var(--accent-warning); }
        .priority-3 { background: rgba(0, 255, 136, 0.2); color: var(--accent-primary); }
        .priority-4 { background: rgba(0, 212, 255, 0.2); color: var(--accent-secondary); }
        .priority-5 { background: rgba(170, 102, 255, 0.2); color: var(--accent-purple); }

        .critical-sites {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .site-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-secondary);
          border-radius: 4px;
        }

        .graph-info {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .graph-stat {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .graph-stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        .graph-stat-label {
          color: var(--text-secondary);
        }

        .adjacency-list h3 {
          margin-bottom: 1rem;
        }

        .adjacency-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 800px) {
          .adjacency-grid {
            grid-template-columns: 1fr;
          }
        }

        .adjacency-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-family: var(--font-mono);
          font-size: 0.875rem;
        }

        .zone-name {
          color: var(--accent-secondary);
          font-weight: 600;
        }

        .arrow {
          color: var(--accent-primary);
        }

        .neighbors {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

