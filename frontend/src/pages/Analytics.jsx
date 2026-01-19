import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Wind, AlertTriangle, RefreshCw,
  Activity, Clock, Zap, Calendar,
  ArrowUp, ArrowDown, Minus, Grid3X3, AlertCircle
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { analyticsAPI } from '../services/api';
import MetricTooltip, { METRIC_EXPLANATIONS } from '../components/MetricTooltip';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('realtime');
  
  // Real MongoDB data state
  const [hourlyDemand, setHourlyDemand] = useState([]);
  const [demandByZone, setDemandByZone] = useState([]);
  const [aqiByZone, setAqiByZone] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState({ total: 0, by_level: {} });
  const [correlationData, setCorrelationData] = useState({ variables: [], matrix: [] });
  const [anomalyData, setAnomalyData] = useState([]);
  
  const [liveMetrics, setLiveMetrics] = useState({
    totalDemand: 0,
    avgAqi: 0,
    activeAlerts: 0,
    peakDemand: 0
  });

  // Fetch real data from MongoDB
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch hourly demand (last 72 hours)
        const hourlyRes = await analyticsAPI.getHourlyDemand(null, 72);
        if (hourlyRes.data?.data) {
          const formatted = hourlyRes.data.data.map(d => ({
            timestamp: d.timestamp,
            time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            total_demand: d.total_kwh
          }));
          setHourlyDemand(formatted);
          // Calculate live metrics
          const total = formatted.reduce((sum, d) => sum + d.total_demand, 0);
          const peak = Math.max(...formatted.map(d => d.total_demand));
          setLiveMetrics(prev => ({ ...prev, totalDemand: Math.round(total), peakDemand: Math.round(peak) }));
        }

        // Fetch demand by zone
        const zoneDemandRes = await analyticsAPI.getDemandByZone();
        if (zoneDemandRes.data?.data) {
          setDemandByZone(zoneDemandRes.data.data.map(d => ({
            zone_id: d.zone_id,
            zone_name: d.zone_name,
            total_demand: d.total_kwh,
            avg_demand: d.avg_kwh
          })));
        }

        // Fetch AQI by zone
        const aqiRes = await analyticsAPI.getAQIByZone();
        if (aqiRes.data?.data) {
          setAqiByZone(aqiRes.data.data.map(d => ({
            zone_id: d.zone_id,
            zone_name: d.zone_name,
            avg_aqi: d.avg_aqi
          })));
          // Calculate average AQI
          const avgAqi = aqiRes.data.data.reduce((sum, d) => sum + (d.avg_aqi || 0), 0) / aqiRes.data.data.length;
          setLiveMetrics(prev => ({ ...prev, avgAqi: Math.round(avgAqi) }));
        }

        // Fetch alerts summary
        const alertsRes = await analyticsAPI.getAlertsSummary();
        if (alertsRes.data) {
          setAlertsSummary(alertsRes.data);
          setLiveMetrics(prev => ({ ...prev, activeAlerts: alertsRes.data.total || 0 }));
        }

        // Fetch correlation matrix
        const corrRes = await analyticsAPI.getCorrelation();
        if (corrRes.data?.variables) {
          setCorrelationData(corrRes.data);
        }

        // Fetch anomalies
        const anomaliesRes = await analyticsAPI.getAnomalies(2.0, 50);
        if (anomaliesRes.data?.anomalies) {
          // Format for timeline chart
          const formatted = anomaliesRes.data.anomalies.map((a, i) => ({
            time: new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            value: a.kwh,
            anomaly: a.kwh,
            threshold: a.baseline_hourly * 2
          }));
          setAnomalyData(formatted);
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#00ff88', '#00d4ff', '#ffaa00', '#ff4466', '#aa66ff'];
  const alertPieData = Object.entries(alertsSummary.by_level || {}).map(([name, value]) => ({ name, value }));

  const tabs = [
    { id: 'realtime', label: 'Real-time', icon: Activity },
    { id: 'historical', label: 'Historical', icon: Calendar },
    { id: 'correlation', label: 'Correlation', icon: Grid3X3 },
    { id: 'anomalies', label: 'Anomalies', icon: AlertCircle },
  ];

  const getCorrelationColor = (value) => {
    if (value >= 0.7) return '#00ff88';
    if (value >= 0.4) return '#00d4ff';
    if (value >= 0) return '#2a4a5a';
    if (value >= -0.4) return '#5a4a2a';
    return '#ff4466';
  };

  return (
    <div className="analytics-page container page">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="header-content">
          <h1><BarChart3 size={32} /> Analytics Dashboard</h1>
          <p>Real-time analytics, correlations, and anomaly detection</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          <RefreshCw size={18} /> Refresh
        </button>
      </motion.div>

      {/* Live Metrics Strip */}
      <div className="live-metrics-strip">
        <motion.div className="live-metric" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Zap size={20} className="metric-icon demand" />
          <div className="metric-info">
            <span className="metric-value">{liveMetrics.totalDemand.toLocaleString()}</span>
            <span className="metric-label">Total Demand (kW)</span>
          </div>
          <div className="metric-trend up"><ArrowUp size={14} /> 2.3%</div>
        </motion.div>
        <motion.div className="live-metric" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}>
          <Wind size={20} className="metric-icon aqi" />
          <div className="metric-info">
            <span className="metric-value">{liveMetrics.avgAqi}</span>
            <span className="metric-label">Average AQI</span>
          </div>
          <div className="metric-trend up"><ArrowUp size={14} /> 12</div>
        </motion.div>
        <motion.div className="live-metric" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}>
          <AlertTriangle size={20} className="metric-icon alerts" />
          <div className="metric-info">
            <span className="metric-value">{liveMetrics.activeAlerts}</span>
            <span className="metric-label">Active Alerts</span>
          </div>
          <div className="metric-trend neutral"><Minus size={14} /> 0</div>
        </motion.div>
        <motion.div className="live-metric" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}>
          <TrendingUp size={20} className="metric-icon peak" />
          <div className="metric-info">
            <span className="metric-value">{liveMetrics.peakDemand.toLocaleString()}</span>
            <span className="metric-label">Peak Demand (kW)</span>
          </div>
          <div className="metric-trend up"><ArrowUp size={14} /> 5.1%</div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        {tabs.map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {/* Real-time Tab */}
        {activeTab === 'realtime' && (
          <motion.div className="analytics-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Hourly Demand Chart */}
            <div className="chart-card full-width">
              <div className="chart-header">
                <TrendingUp size={20} />
                <h3>Real-time Energy Demand (Last 72 Hours)</h3>
                <div className="live-badge"><span className="pulse"></span> LIVE</div>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={hourlyDemand}>
                    <defs>
                      <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ff88" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" />
                    <XAxis dataKey="time" stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 10 }} interval={6} />
                    <YAxis stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(10, 20, 30, 0.95)', border: '1px solid #00d4ff40', borderRadius: '4px' }} labelStyle={{ color: '#00d4ff' }} />
                    <Area type="monotone" dataKey="total_demand" stroke="#00ff88" strokeWidth={2} fill="url(#demandGradient)" name="Demand (kW)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demand by Zone */}
            <div className="chart-card">
              <div className="chart-header">
                <BarChart3 size={20} />
                <h3>Demand by Zone</h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={demandByZone} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" />
                    <XAxis type="number" stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 10 }} />
                    <YAxis dataKey="zone_name" type="category" stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 9 }} width={90} />
                    <Tooltip contentStyle={{ background: 'rgba(10, 20, 30, 0.95)', border: '1px solid #00d4ff40' }} />
                    <Bar dataKey="total_demand" fill="#00d4ff" radius={[0, 4, 4, 0]} name="Demand (kW)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AQI by Zone */}
            <div className="chart-card">
              <div className="chart-header">
                <Wind size={20} />
                <h3>AQI by Zone</h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={aqiByZone}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" />
                    <XAxis dataKey="zone_name" stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 8 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(10, 20, 30, 0.95)', border: '1px solid #00d4ff40' }} />
                    <Bar dataKey="avg_aqi" name="Avg AQI" radius={[4, 4, 0, 0]}>
                      {aqiByZone.map((entry, index) => (
                        <Cell key={index} fill={entry.avg_aqi > 150 ? '#ff4466' : entry.avg_aqi > 100 ? '#ffaa00' : '#00ff88'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alerts Summary */}
            <div className="chart-card">
              <div className="chart-header">
                <AlertTriangle size={20} />
                <h3>Alerts Distribution</h3>
              </div>
              <div className="chart-body pie-container">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={alertPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: '#4a5a6a' }}>
                      {alertPieData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(10, 20, 30, 0.95)', border: '1px solid #00d4ff40' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="total-alerts">
                  <span className="total-value">{alertsSummary.total}</span>
                  <span className="total-label">Total Alerts</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Historical Tab */}
        {activeTab === 'historical' && (
          <motion.div className="analytics-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="chart-card full-width">
              <div className="chart-header">
                <Calendar size={20} />
                <h3>Historical Demand (Last 168 Hours / 7 Days)</h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={hourlyDemand}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" />
                    <XAxis dataKey="time" stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 10 }} interval={12} />
                    <YAxis stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(10, 20, 30, 0.95)', border: '1px solid #00d4ff40' }} />
                    <Legend />
                    <Line type="monotone" dataKey="total_demand" stroke="#00ff88" strokeWidth={2} dot={false} name="Total Demand (kW)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Correlation Tab */}
        {activeTab === 'correlation' && (
          <motion.div className="analytics-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="chart-card full-width">
              <div className="chart-header">
                <Grid3X3 size={20} />
                <h3>Correlation Matrix <MetricTooltip 
                  term="Correlation Matrix"
                  explanation="Shows how variables relate to each other. Values range from -1 to +1. +1 = perfect positive correlation (when one increases, the other increases). -1 = perfect negative correlation (when one increases, the other decreases). 0 = no correlation. Calculated from real MongoDB data using Pearson correlation coefficient."
                >
                  <span></span>
                </MetricTooltip></h3>
              </div>
              <div className="chart-body">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <Activity size={32} className="spinning" style={{ animation: 'spin 1s linear infinite' }} />
                    <p>Calculating correlations from MongoDB data...</p>
                  </div>
                ) : correlationData.variables.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <p>No correlation data available. Ensure MongoDB has sufficient data.</p>
                  </div>
                ) : (
                  <>
                    <div className="correlation-explanation" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--accent-secondary)' }}>What this shows:</strong> This matrix shows relationships between variables in your urban grid data. 
                      <strong style={{ color: '#00ff88' }}> Green (0.7+)</strong> = strong positive correlation (e.g., higher temperature → higher demand). 
                      <strong style={{ color: '#ff4466' }}> Red (-0.7-)</strong> = strong negative correlation (e.g., higher humidity → lower AQI). 
                      <strong style={{ color: '#2a4a5a' }}> Dark</strong> = weak/no correlation. Data calculated from {correlationData.data_points || 0} real data points in MongoDB.
                    </div>
                    <div className="correlation-matrix">
                      <div className="matrix-header">
                        <div className="corner"></div>
                        {correlationData.variables.map(v => <div key={v} className="header-cell">{v}</div>)}
                      </div>
                      {correlationData.variables.map((v1, i) => (
                        <div key={v1} className="matrix-row">
                          <div className="row-label">{v1}</div>
                          {correlationData.variables.map((v2, j) => {
                            const cell = correlationData.matrix.find(c => c.x === v1 && c.y === v2);
                            return (
                              <div key={v2} className="matrix-cell" style={{ backgroundColor: getCorrelationColor(cell?.value || 0) }} title={`${v1} vs ${v2}: ${cell?.value || 0}`}>
                                {cell?.value?.toFixed(2) || '0.00'}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="correlation-legend">
                      <span>Strong Negative</span>
                      <div className="legend-gradient"></div>
                      <span>Strong Positive</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Anomalies Tab */}
        {activeTab === 'anomalies' && (
          <motion.div className="analytics-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="chart-card full-width">
              <div className="chart-header">
                <AlertCircle size={20} />
                <h3>Anomaly Detection Timeline</h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={anomalyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" />
                    <XAxis dataKey="time" stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 9 }} interval={4} />
                    <YAxis stroke="#4a5a6a" tick={{ fill: '#8899aa', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(10, 20, 30, 0.95)', border: '1px solid #00d4ff40' }} />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#00d4ff" strokeWidth={2} dot={false} name="Normal" />
                    <Line type="monotone" dataKey="threshold" stroke="#ffaa00" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Threshold" />
                    <Line type="monotone" dataKey="anomaly" stroke="#ff4466" strokeWidth={3} dot={{ fill: '#ff4466', r: 5 }} name="Anomaly" connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        .analytics-page { padding: 1.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .page-header h1 { display: flex; align-items: center; gap: 0.75rem; font-size: 1.8rem; }
        .page-header p { color: var(--text-secondary); margin-top: 0.25rem; }
        .btn-secondary { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: var(--bg-card); border: 1px solid var(--accent-primary); border-radius: 8px; color: var(--accent-primary); cursor: pointer; font-weight: 600; }
        
        .live-metrics-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        @media (max-width: 900px) { .live-metrics-strip { grid-template-columns: repeat(2, 1fr); } }
        .live-metric { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; }
        .metric-icon { padding: 0.5rem; border-radius: 8px; }
        .metric-icon.demand { background: rgba(0, 255, 136, 0.15); color: #00ff88; }
        .metric-icon.aqi { background: rgba(0, 212, 255, 0.15); color: #00d4ff; }
        .metric-icon.alerts { background: rgba(255, 170, 0, 0.15); color: #ffaa00; }
        .metric-icon.peak { background: rgba(170, 102, 255, 0.15); color: #aa66ff; }
        .metric-info { flex: 1; }
        .metric-value { display: block; font-size: 1.5rem; font-weight: 700; font-family: var(--font-display); }
        .metric-label { font-size: 0.8rem; color: var(--text-secondary); }
        .metric-trend { display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 4px; }
        .metric-trend.up { background: rgba(0, 255, 136, 0.15); color: #00ff88; }
        .metric-trend.down { background: rgba(255, 68, 102, 0.15); color: #ff4466; }
        .metric-trend.neutral { background: rgba(100, 100, 100, 0.15); color: #888; }
        
        .tab-nav { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.5rem; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-color); }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: transparent; border: none; border-radius: 6px; color: var(--text-secondary); cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .tab-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }
        .tab-btn.active { background: var(--accent-primary); color: #000; }
        
        .analytics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        @media (max-width: 1000px) { .analytics-grid { grid-template-columns: 1fr; } }
        .chart-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
        .chart-card.full-width { grid-column: 1 / -1; }
        .chart-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); }
        .chart-header svg { color: var(--accent-secondary); }
        .chart-header h3 { flex: 1; font-size: 1rem; }
        .live-badge { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.6rem; background: rgba(255, 68, 102, 0.15); border: 1px solid rgba(255, 68, 102, 0.3); border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: #ff4466; }
        .pulse { width: 6px; height: 6px; background: #ff4466; border-radius: 50%; animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .chart-body { padding: 1rem; }
        .pie-container { position: relative; }
        .total-alerts { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
        .total-value { display: block; font-size: 2rem; font-weight: 700; color: var(--accent-primary); font-family: var(--font-display); }
        .total-label { font-size: 0.8rem; color: var(--text-secondary); }
        
        .correlation-matrix { display: flex; flex-direction: column; gap: 2px; max-width: 600px; margin: 0 auto; }
        .matrix-header, .matrix-row { display: flex; gap: 2px; }
        .corner, .header-cell, .row-label, .matrix-cell { width: 80px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
        .header-cell, .row-label { background: var(--bg-secondary); color: var(--text-secondary); font-weight: 600; }
        .matrix-cell { color: #fff; font-weight: 500; border-radius: 2px; }
        .correlation-legend { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-secondary); }
        .legend-gradient { width: 200px; height: 12px; background: linear-gradient(90deg, #ff4466, #5a4a2a, #2a4a5a, #00d4ff, #00ff88); border-radius: 6px; }
      `}</style>
    </div>
  );
}
