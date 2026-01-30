import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, AlertTriangle, TrendingUp, Filter, RefreshCw,
  Clock, MapPin, User, Tag, Activity, BarChart3, PieChart,
  Search, Calendar, Zap, Shield, Wind, AlertCircle, CheckCircle,
  Brain, MessageSquare, GitBranch, Layers, Info, PenSquare, Cpu, Send
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { incidentsAPI, dataAPI, liveAPI, cityAPI } from '../services/api';
import { useAppMode } from '../utils/useAppMode';
import CodeBlock from '../components/CodeBlock';

const URGENCY_COLORS = {
  critical: '#ff4466',
  high: '#ff8800',
  medium: '#ffaa00',
  low: '#00d4ff'
};

const STATUS_COLORS = {
  open: '#ff4466',
  investigating: '#ffaa00',
  resolved: '#00ff88'
};

const CATEGORY_ICONS = {
  transformer_fault: Zap,
  voltage_issue: Activity,
  outage: AlertCircle,
  high_demand: TrendingUp,
  pollution_complaint: Wind,
  safety_hazard: Shield,
  equipment_failure: AlertTriangle,
  cable_damage: FileText,
  weather_damage: Wind
};

function map311ToIncidents(requests) {
  if (!Array.isArray(requests)) return [];
  return requests.map((r) => ({
    id: String(r.request_id || r.id || ''),
    zone_id: null,
    zone_name: r.location?.address || '—',
    description: r.description || r.type || '—',
    status: (r.status || 'unknown').toLowerCase(),
    timestamp: r.created_date || new Date().toISOString(),
    reporter: '311',
    nlp_analysis: {
      category: (r.type || 'other').toLowerCase().replace(/\s+/g, '_'),
      urgency: 'medium',
      summary: r.description || r.type || '',
      category_confidence: 0,
      sentiment: 'neutral',
      entities: {}
    },
    source: r.source || '311'
  }));
}

function compute311Summary(incidents) {
  const total = incidents.length;
  const statuses = {};
  const categories = {};
  const urgencies = { critical: 0, high: 0, medium: 0, low: 0 };
  incidents.forEach((i) => {
    const s = (i.status || 'unknown').toLowerCase();
    statuses[s] = (statuses[s] || 0) + 1;
    const cat = i.nlp_analysis?.category || 'other';
    categories[cat] = (categories[cat] || 0) + 1;
    urgencies[i.nlp_analysis?.urgency || 'medium'] = (urgencies[i.nlp_analysis?.urgency] || 0) + 1;
  });
  statuses.resolved = statuses.resolved ?? statuses.closed ?? 0;
  return { total, statuses, categories, urgencies, sentiments: {} };
}

export default function IncidentReports() {
  const { mode } = useAppMode();
  const [currentCityId, setCurrentCityId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastNlpRefresh, setLastNlpRefresh] = useState(null);
  
  // Report Incident: form, submit, live NLP view
  const [reportForm, setReportForm] = useState({ description: '', zone_id: '', reporter: 'citizen_report' });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportLiveStep, setReportLiveStep] = useState(null); // null=idle, 0=sending, 1–6=classify,urgency,entity,sentiment,summary,done
  const [reportResult, setReportResult] = useState(null);
  const [reportError, setReportError] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    zone_id: '',
    category: '',
    urgency: '',
    status: '',
    search: '',
    days: 30
  });

  useEffect(() => {
    if (mode !== 'city') return;
    cityAPI.getCurrentCity().then((r) => setCurrentCityId(r.data?.city_id || null)).catch(() => setCurrentCityId(null));
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
    if (mode === 'city' && (activeTab === 'report' || activeTab === 'trends')) {
      setActiveTab('overview');
    }
  }, [mode, activeTab]);

  useEffect(() => {
    fetchData();
  }, [filters.days, mode, currentCityId]);

  // Auto-refresh when on NLP tab for live feel (Sim only; City 311 has no NLP)
  useEffect(() => {
    if (activeTab !== 'nlp' || mode === 'city') return;
    const iv = setInterval(fetchData, 45000);
    return () => clearInterval(iv);
  }, [activeTab, filters.days, mode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (mode === 'city' && !currentCityId) {
        setLoading(false);
        return;
      }
      if (mode === 'city' && currentCityId) {
        // City Live: fetch 311 requests, map to incident-like shape
        const res = await liveAPI.get311Requests(currentCityId, 100, filters.status || null);
        const requests = res.data?.requests || [];
        const mapped = map311ToIncidents(requests);
        setIncidents(mapped);
        setSummary(compute311Summary(mapped));
        setTrends([]);
        const zRes = await cityAPI.getZoneCoordinates(currentCityId).catch(() => ({ data: { zones: [] } }));
        setZones(zRes.data?.zones || []);
      } else if (mode === 'sim') {
        // Simulated: use incident_reports + NLP
        const incidentsRes = await incidentsAPI.getIncidents({
          limit: 100,
          ...filters,
          days: filters.days
        });
        if (incidentsRes.data?.incidents) setIncidents(incidentsRes.data.incidents);
        const summaryRes = await incidentsAPI.getSummary(filters.days);
        if (summaryRes.data) setSummary(summaryRes.data);
        const trendsRes = await incidentsAPI.getTrends(filters.days);
        if (trendsRes.data?.trends) setTrends(trendsRes.data.trends);
        const zonesRes = await dataAPI.getZones();
        if (zonesRes.data?.zones) setZones(zonesRes.data.zones);
      } else {
        setIncidents([]);
        setSummary(null);
        setTrends([]);
        setZones([]);
      }
    } catch (error) {
      console.error('Error fetching incident data:', error);
    } finally {
      setLoading(false);
      setLastNlpRefresh(new Date());
    }
  };

  const isCityMode = mode === 'city';
  const filteredIncidents = incidents.filter(inc => {
    if (!isCityMode && filters.zone_id && inc.zone_id !== filters.zone_id) return false;
    if (filters.category && inc.nlp_analysis?.category !== filters.category) return false;
    if (filters.urgency && inc.nlp_analysis?.urgency !== filters.urgency) return false;
    if (filters.status && inc.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matches = 
        inc.description?.toLowerCase().includes(searchLower) ||
        inc.zone_name?.toLowerCase().includes(searchLower) ||
        inc.nlp_analysis?.summary?.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }
    return true;
  });

  const categoryData = summary?.categories ? 
    Object.entries(summary.categories).map(([name, value]) => ({ name, value })) : [];
  const urgencyData = summary?.urgencies ? 
    Object.entries(summary.urgencies).map(([name, value]) => ({ name, value })) : [];
  const statusData = summary?.statuses ? 
    Object.entries(summary.statuses).map(([name, value]) => ({ name, value })) : [];

  // NLP tab: derived live metrics
  const nlpProcessed = summary?.total ?? 0;
  const withNlp = incidents.filter(i => i.nlp_analysis?.category_confidence != null);
  const avgConfidence = withNlp.length
    ? (withNlp.reduce((s, i) => s + (i.nlp_analysis.category_confidence || 0), 0) / withNlp.length * 100).toFixed(1)
    : '—';
  const categoriesDetected = Object.keys(summary?.categories || {}).length;
  const totalForSent = summary?.total || 1;
  const negativePct = ((summary?.sentiments?.negative || 0) / totalForSent * 100).toFixed(1);
  const allEquip = [].concat(...incidents.map(i => i.nlp_analysis?.entities?.equipment || []));
  const entityEquipment = Object.entries(
    allEquip.reduce((o, e) => { o[e] = (o[e] || 0) + 1; return o; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  const allZones = [].concat(...incidents.map(i => i.nlp_analysis?.entities?.zones || []));
  const entityZones = Object.entries(
    allZones.reduce((o, z) => { o[z] = (o[z] || 0) + 1; return o; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  const recentNlp = incidents.filter(i => i.nlp_analysis).slice(0, 5);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'list', label: 'All Incidents', icon: FileText },
    ...(!isCityMode ? [{ id: 'report', label: 'Report Incident', icon: PenSquare }] : []),
    { id: 'nlp', label: isCityMode ? 'NLP (311 only)' : 'NLP Analysis', icon: Activity },
    { id: 'pipeline', label: 'Pipeline & Procedure', icon: GitBranch },
    { id: 'nlp-engine', label: 'NLP Engine', icon: Cpu },
    ...(!isCityMode ? [{ id: 'trends', label: 'Trends', icon: TrendingUp }] : [])
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryLabel = (category) => {
    return category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const handleReportSubmit = () => {
    if (!reportForm.description.trim()) { setReportError('Please enter a description.'); return; }
    if (!reportForm.zone_id) { setReportError('Please select a zone.'); return; }
    setReportError(null);
    setReportSubmitting(true);
    setReportLiveStep(0);
    setReportResult(null);
    incidentsAPI.createIncident(reportForm.description.trim(), reportForm.zone_id, reportForm.reporter)
      .then((res) => {
        const inc = res.data;
        setReportResult(inc);
        setReportSubmitting(false);
        setReportLiveStep(1);
        fetchData();
        [2, 3, 4, 5, 6].forEach((s, i) => { setTimeout(() => setReportLiveStep(s), (i + 1) * 520); });
      })
      .catch((err) => {
        setReportSubmitting(false);
        setReportLiveStep(null);
        setReportError(err?.response?.data?.detail || err?.message || 'Failed to submit.');
      });
  };

  const resetReportForm = () => {
    setReportForm({ description: '', zone_id: '', reporter: 'citizen_report' });
    setReportResult(null);
    setReportLiveStep(null);
    setReportError(null);
  };

  const REPORT_REPORTERS = [
    { value: 'citizen_report', label: 'Citizen / Public' },
    { value: 'field_technician', label: 'Field technician' },
    { value: 'manual_submission', label: 'Manual (operator)' },
    { value: 'dispatch_center', label: 'Dispatch center' },
    { value: 'automated_monitoring', label: 'Automated' }
  ];

  return (
    <div className="incident-reports-page container page">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="header-content">
          <h1><FileText size={32} /> Incident Reports</h1>
          <p>
            {isCityMode
              ? `City 311 service requests${currentCityId ? ` for ${currentCityId.toUpperCase()}` : ''} — live data`
              : 'NLP-powered incident analysis, classification, and tracking'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          <RefreshCw size={18} /> Refresh
        </button>
      </motion.div>

      {/* Why NLP — Goals & Rationale */}
      <motion.div className="why-nlp-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="why-nlp-header">
          <Brain size={22} />
          <h3>Why We Use NLP — Goals & Rationale</h3>
        </div>
        <div className="why-nlp-grid">
          <div className="why-nlp-item">
            <strong>Our goal</strong>
            <p>Turn raw, free-form incident reports into structured, actionable intelligence so operators can prioritize and respond faster—without manually reading and tagging every submission.</p>
          </div>
          <div className="why-nlp-item">
            <strong>Why we use NLP</strong>
            <p>Reports arrive as natural language. We need automatic classification, urgency scoring, entity extraction, and sentiment. Manual tagging doesn’t scale at volume and slows response when it matters most.</p>
          </div>
          <div className="why-nlp-item">
            <strong>Purpose</strong>
            <p>Faster triage, fewer missed critical events, a consistent taxonomy across all reports, and better resource allocation so crews and assets go where they’re needed first.</p>
          </div>
          <div className="why-nlp-item">
            <strong>Why it makes sense</strong>
            <p>Incidents are high-volume and time-sensitive. NLP gives consistency, speed, and 24/7 automation without a human bottleneck. The same report gets the same structure every time, so dashboards and analytics stay reliable.</p>
          </div>
          <div className="why-nlp-item">
            <strong>Why it matters</strong>
            <p>Saves operator time, reduces human error in triage, improves audit trails, and helps focus crews on what’s most critical—especially when AQI, demand, or zone risk make context matter.</p>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      {summary && (
        <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
            <div className="stat-icon" style={{ background: 'rgba(0, 255, 136, 0.1)' }}>
              <FileText size={24} color="#00ff88" />
            </div>
            <div className="stat-value">{summary.total || 0}</div>
            <div className="stat-label">Total Incidents</div>
          </motion.div>
          <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
            <div className="stat-icon" style={{ background: 'rgba(255, 68, 102, 0.1)' }}>
              <AlertTriangle size={24} color="#ff4466" />
            </div>
            <div className="stat-value">{summary.urgencies?.critical || 0}</div>
            <div className="stat-label">Critical</div>
          </motion.div>
          <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
            <div className="stat-icon" style={{ background: 'rgba(255, 170, 0, 0.1)' }}>
              <Clock size={24} color="#ffaa00" />
            </div>
            <div className="stat-value">{summary.statuses?.open || 0}</div>
            <div className="stat-label">Open</div>
          </motion.div>
          <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
            <div className="stat-icon" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
              <CheckCircle size={24} color="#00d4ff" />
            </div>
            <div className="stat-value">{summary.statuses?.resolved || 0}</div>
            <div className="stat-label">Resolved</div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section" style={{ 
        background: 'rgba(0, 255, 136, 0.05)', 
        padding: '1.5rem', 
        borderRadius: '12px',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} />
          <strong>Filters:</strong>
        </div>
        {!isCityMode && (
        <select 
          value={filters.zone_id} 
          onChange={(e) => setFilters({...filters, zone_id: e.target.value})}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)' }}
        >
          <option value="">All Zones</option>
          {zones.map(z => (
            <option key={z.zone_id || z.id || z._id} value={z.zone_id || z.id || z._id}>{z.name || z.zone_id || z.id}</option>
          ))}
        </select>
        )}
        <select 
          value={filters.category} 
          onChange={(e) => setFilters({...filters, category: e.target.value})}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)' }}
        >
          <option value="">All Categories</option>
          {categoryData.map(c => (
            <option key={c.name} value={c.name}>{getCategoryLabel(c.name)}</option>
          ))}
        </select>
        <select 
          value={filters.urgency} 
          onChange={(e) => setFilters({...filters, urgency: e.target.value})}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)' }}
        >
          <option value="">All Urgencies</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select 
          value={filters.status} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)' }}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>
        <input
          type="text"
          placeholder="Search incidents..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          style={{ 
            padding: '0.5rem', 
            borderRadius: '8px', 
            border: '1px solid rgba(0, 255, 136, 0.3)',
            minWidth: '200px'
          }}
        />
        <select 
          value={filters.days} 
          onChange={(e) => setFilters({...filters, days: parseInt(e.target.value)})}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)' }}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Tabs - match Analytics / rest of site */}
      <div className="incident-tab-nav">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`incident-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Category Distribution */}
            {categoryData.length > 0 && (
              <div className="chart-card">
                <h3><PieChart size={20} /> Incidents by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.substring(0, 15)} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#00ff88', '#00d4ff', '#ffaa00', '#ff8800', '#ff4466', '#aa66ff'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Urgency Distribution */}
            {urgencyData.length > 0 && (
              <div className="chart-card">
                <h3><AlertTriangle size={20} /> Incidents by Urgency</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={urgencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 136, 0.1)" />
                    <XAxis dataKey="name" stroke="#00d4ff" />
                    <YAxis stroke="#00d4ff" />
                    <Tooltip contentStyle={{ background: '#0a1929', border: '1px solid #00ff88' }} />
                    <Bar dataKey="value" fill="#00ff88" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Zones */}
          {summary?.top_zones && summary.top_zones.length > 0 && (
            <div className="chart-card">
              <h3><MapPin size={20} /> Top Zones by Incident Count</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.top_zones}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 136, 0.1)" />
                  <XAxis dataKey="zone_name" stroke="#00d4ff" />
                  <YAxis stroke="#00d4ff" />
                  <Tooltip contentStyle={{ background: '#0a1929', border: '1px solid #00ff88' }} />
                  <Bar dataKey="count" fill="#00d4ff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* List Tab */}
      {activeTab === 'list' && (
        <div className="tab-content">
          <div className="incidents-list">
            {filteredIncidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                No incidents found matching your filters.
              </div>
            ) : (
              filteredIncidents.map((incident, idx) => {
                const CategoryIcon = CATEGORY_ICONS[incident.nlp_analysis?.category] || FileText;
                return (
                  <motion.div
                    key={incident.id || idx}
                    className="incident-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{
                      background: 'rgba(0, 255, 136, 0.05)',
                      border: `2px solid ${URGENCY_COLORS[incident.nlp_analysis?.urgency] || '#00d4ff'}`,
                      borderRadius: '12px',
                      padding: '1.5rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <CategoryIcon size={20} color={URGENCY_COLORS[incident.nlp_analysis?.urgency] || '#00d4ff'} />
                          <h3 style={{ margin: 0, color: '#00ff88' }}>
                            {incident.nlp_analysis?.summary || 'Incident Report'}
                          </h3>
                        </div>
                        <p style={{ color: '#aaa', margin: '0.5rem 0' }}>{incident.description}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span 
                          style={{
                            background: URGENCY_COLORS[incident.nlp_analysis?.urgency] || '#00d4ff',
                            color: '#000',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}
                        >
                          {incident.nlp_analysis?.urgency || 'low'}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa' }}>
                        <MapPin size={16} />
                        <span>{incident.zone_name || incident.zone_id}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa' }}>
                        <Tag size={16} />
                        <span>{getCategoryLabel(incident.nlp_analysis?.category)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa' }}>
                        <Clock size={16} />
                        <span>{formatDate(incident.timestamp)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa' }}>
                        <User size={16} />
                        <span>{incident.reporter || 'Unknown'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span 
                          style={{
                            background: STATUS_COLORS[incident.status] || '#888',
                            color: '#000',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}
                        >
                          {incident.status || 'open'}
                        </span>
                      </div>
                    </div>

                    {/* NLP Analysis Details */}
                    {incident.nlp_analysis && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem', 
                        background: 'rgba(0, 212, 255, 0.1)', 
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 212, 255, 0.3)'
                      }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#00d4ff', fontSize: '0.9rem' }}>NLP Analysis:</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <div><strong>Category:</strong> {getCategoryLabel(incident.nlp_analysis.category)}</div>
                          <div><strong>Confidence:</strong> {(incident.nlp_analysis.category_confidence * 100).toFixed(0)}%</div>
                          <div><strong>Sentiment:</strong> {incident.nlp_analysis.sentiment}</div>
                          {incident.nlp_analysis.entities?.zones?.length > 0 && (
                            <div><strong>Zones:</strong> {incident.nlp_analysis.entities.zones.join(', ')}</div>
                          )}
                          {incident.nlp_analysis.entities?.equipment?.length > 0 && (
                            <div><strong>Equipment:</strong> {incident.nlp_analysis.entities.equipment.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Report Incident Tab — submit form + live NLP processing view */}
      {activeTab === 'report' && (
        <motion.div className="tab-content report-tab-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="report-layout">
            {/* Form */}
            <div className="report-form-card">
              <h3><PenSquare size={20} /> Submit Incident</h3>
              <p className="report-form-desc">Submit a report; the NLP engine will classify, detect urgency, extract entities, and analyze sentiment in real time.</p>
              <div className="report-form">
                <label>Description <span className="req">*</span></label>
                <textarea
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  placeholder="e.g. Transformer overheating near Z_012. Smell of burning. Power flickering in the block."
                  rows={4}
                  disabled={reportSubmitting}
                />
                <label>Zone <span className="req">*</span></label>
                <select
                  value={reportForm.zone_id}
                  onChange={(e) => setReportForm({ ...reportForm, zone_id: e.target.value })}
                  disabled={reportSubmitting}
                >
                  <option value="">Select zone</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name || z.id}</option>
                  ))}
                </select>
                <label>Reporter</label>
                <select
                  value={reportForm.reporter}
                  onChange={(e) => setReportForm({ ...reportForm, reporter: e.target.value })}
                  disabled={reportSubmitting}
                >
                  {REPORT_REPORTERS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {reportError && <div className="report-form-err">{reportError}</div>}
                <button
                  type="button"
                  className="report-submit-btn"
                  onClick={handleReportSubmit}
                  disabled={reportSubmitting || !reportForm.description.trim() || !reportForm.zone_id}
                >
                  {reportSubmitting ? <><RefreshCw size={18} className="spin" /> Sending…</> : <><Send size={18} /> Submit</>}
                </button>
              </div>
            </div>

            {/* Live NLP processing view */}
            <div className="report-live-card">
              <h3><Activity size={20} /> NLP Processing</h3>
              <p className="report-live-desc">Steps run in order. After submit, results appear step by step.</p>
              {reportLiveStep == null && !reportResult && (
                <div className="report-live-idle">
                  <div className="report-live-idle-icon"><PenSquare size={32} /></div>
                  <p>Submit a report to see the NLP pipeline process it live.</p>
                </div>
              )}
              {(reportLiveStep !== null || reportResult) && (
                <div className="report-live-steps">
                  {[
                    { step: 0, label: 'Sending to API', key: 'send', data: null },
                    { step: 1, label: 'Classification', key: 'classify', data: () => reportResult?.nlp_analysis && `Category: ${getCategoryLabel(reportResult.nlp_analysis.category)} • Confidence: ${((reportResult.nlp_analysis.category_confidence ?? 0) * 100).toFixed(0)}%` },
                    { step: 2, label: 'Urgency detection', key: 'urgency', data: () => reportResult?.nlp_analysis && `Urgency: ${reportResult.nlp_analysis.urgency}` },
                    { step: 3, label: 'Entity extraction', key: 'entity', data: () => reportResult?.nlp_analysis?.entities && [reportResult.nlp_analysis.entities.zones?.length ? `Zones: ${reportResult.nlp_analysis.entities.zones.join(', ')}` : null, reportResult.nlp_analysis.entities.equipment?.length ? `Equipment: ${reportResult.nlp_analysis.entities.equipment.join(', ')}` : null].filter(Boolean).join(' • ') || '—' },
                    { step: 4, label: 'Sentiment analysis', key: 'sentiment', data: () => reportResult?.nlp_analysis && `Sentiment: ${reportResult.nlp_analysis.sentiment}` },
                    { step: 5, label: 'Summary', key: 'summary', data: () => reportResult?.nlp_analysis?.summary || '—' },
                    { step: 6, label: 'Complete', key: 'done', data: () => reportResult?.id ? `Incident ${reportResult.id} created.` : null }
                  ].map(({ step, label, key, data }) => {
                    const isActive = reportLiveStep === step;
                    const isDone = reportLiveStep !== null && reportLiveStep > step;
                    const isWaiting = reportLiveStep !== null && reportLiveStep < step;
                    const d = typeof data === 'function' ? data() : data;
                    return (
                      <motion.div
                        key={key}
                        className={`report-live-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isWaiting ? 'waiting' : ''}`}
                        initial={isActive ? { x: 8, opacity: 0.8 } : {}}
                        animate={isActive ? { x: 0, opacity: 1 } : {}}
                      >
                        <div className="report-live-step-num">{isDone ? <CheckCircle size={16} /> : step + 1}</div>
                        <div className="report-live-step-body">
                          <strong>{label}</strong>
                          {isActive && reportSubmitting && step === 0 && <span className="report-live-pulse"> …</span>}
                          {d && (isDone || isActive) && <span className="report-live-data">{d}</span>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              {reportResult && reportLiveStep === 6 && (
                <div className="report-live-done">
                  <div className="report-live-done-card">
                    <h4>Created incident</h4>
                    <p><strong>Summary:</strong> {reportResult.nlp_analysis?.summary || '—'}</p>
                    <p><strong>Category:</strong> {getCategoryLabel(reportResult.nlp_analysis?.category)} • <strong>Urgency:</strong> {reportResult.nlp_analysis?.urgency} • <strong>Sentiment:</strong> {reportResult.nlp_analysis?.sentiment}</p>
                    <div className="report-live-done-actions">
                      <button type="button" className="report-done-btn primary" onClick={() => { setActiveTab('list'); resetReportForm(); }}>View in All Incidents</button>
                      <button type="button" className="report-done-btn secondary" onClick={resetReportForm}>Submit another</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* NLP Analysis Tab - premium, live, aligned with site */}
      {activeTab === 'nlp' && (
        <motion.div className="tab-content nlp-tab-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Live metrics strip */}
          <div className="nlp-live-strip">
            <motion.div className="nlp-metric" whileHover={{ scale: 1.02 }}>
              <Brain size={20} className="nlp-metric-icon processed" />
              <div className="nlp-metric-info">
                <span className="nlp-metric-value">{nlpProcessed}</span>
                <span className="nlp-metric-label">Processed ({filters.days}d)</span>
              </div>
            </motion.div>
            <motion.div className="nlp-metric" whileHover={{ scale: 1.02 }}>
              <Shield size={20} className="nlp-metric-icon confidence" />
              <div className="nlp-metric-info">
                <span className="nlp-metric-value">{avgConfidence}{avgConfidence !== '—' ? '%' : ''}</span>
                <span className="nlp-metric-label">Avg Confidence</span>
              </div>
            </motion.div>
            <motion.div className="nlp-metric" whileHover={{ scale: 1.02 }}>
              <BarChart3 size={20} className="nlp-metric-icon categories" />
              <div className="nlp-metric-info">
                <span className="nlp-metric-value">{categoriesDetected}</span>
                <span className="nlp-metric-label">Categories Detected</span>
              </div>
            </motion.div>
            <motion.div className="nlp-metric" whileHover={{ scale: 1.02 }}>
              <MessageSquare size={20} className="nlp-metric-icon sentiment" />
              <div className="nlp-metric-info">
                <span className="nlp-metric-value">{negativePct}%</span>
                <span className="nlp-metric-label">Negative Sentiment</span>
              </div>
            </motion.div>
            <div className="nlp-live-badge">
              <span className="nlp-pulse" />
              LIVE · {lastNlpRefresh ? lastNlpRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
            </div>
          </div>

          {/* What we're doing: pipeline */}
          <div className="nlp-pipeline-card">
            <div className="nlp-pipeline-header">
              <Brain size={22} />
              <h3>What We&apos;re Doing: NLP Processing Pipeline</h3>
              <div className="nlp-badge">Domain-tailored</div>
            </div>
            <p className="nlp-pipeline-desc">
              Every incident is analyzed in real time by our <strong>domain-specific NLP engine</strong>. 
              We use energy & grid terminology, live zone metrics (AQI, demand, risk), and entity extraction 
              to classify, prioritize, and summarize reports—so operators see structured insights instantly.
            </p>
            <p className="nlp-pipeline-steps-line">
              Steps: <strong>Classification</strong> → <strong>Urgency</strong> → <strong>Entity extraction</strong> → <strong>Sentiment</strong> → <strong>Auto-summary</strong> → <strong>Context enrichment</strong>. Full procedure, diagram, and code →
              <button type="button" className="nlp-cta-link" onClick={() => setActiveTab('pipeline')}>
                <GitBranch size={14} /> Pipeline & Procedure
              </button>
            </p>
          </div>

          {/* Charts row: Sentiment + Category from NLP */}
          <div className="nlp-charts-row">
            {summary?.sentiments && Object.keys(summary.sentiments).length > 0 && (
              <div className="nlp-chart-card">
                <div className="nlp-chart-header">
                  <MessageSquare size={18} />
                  <h3>Sentiment Distribution</h3>
                </div>
                <div className="nlp-chart-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <RechartsPieChart>
                      <Pie
                        data={Object.entries(summary.sentiments).map(([n, v]) => ({ name: n, value: v }))}
                        cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                        paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {Object.entries(summary.sentiments).map(([n], i) => (
                          <Cell key={n} fill={['#ff4466', '#00ff88', '#00d4ff'][i % 3]} stroke="rgba(10,15,25,0.9)" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(10,20,30,0.95)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {categoryData.length > 0 && (
              <div className="nlp-chart-card">
                <div className="nlp-chart-header">
                  <BarChart3 size={18} />
                  <h3>Categories (NLP Classified)</h3>
                </div>
                <div className="nlp-chart-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis type="number" stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={100} tickFormatter={v => (v || '').replace(/_/g, ' ').slice(0, 12)} />
                      <Tooltip contentStyle={{ background: 'rgba(10,20,30,0.95)', border: '1px solid var(--border-color)', borderRadius: '8px' }} formatter={(v) => [v, 'Count']} labelFormatter={l => getCategoryLabel(l)} />
                      <Bar dataKey="value" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Entity extraction + Recent processed */}
          <div className="nlp-bottom-row">
            <div className="nlp-entities-card">
              <div className="nlp-chart-header">
                <Tag size={18} />
                <h3>Entity Extraction (Live)</h3>
              </div>
              <div className="nlp-entities-body">
                <div className="nlp-entity-group">
                  <span className="nlp-entity-label">Equipment</span>
                  {entityEquipment.length > 0 ? (
                    <div className="nlp-tags">
                      {entityEquipment.map(e => (
                        <span key={e.name} className="nlp-tag">{e.name} <em>{e.count}</em></span>
                      ))}
                    </div>
                  ) : (
                    <p className="nlp-empty">No equipment extracted yet. Add incidents with terms like transformer, cable, feeder.</p>
                  )}
                </div>
                <div className="nlp-entity-group">
                  <span className="nlp-entity-label">Zones</span>
                  {entityZones.length > 0 ? (
                    <div className="nlp-tags">
                      {entityZones.map(z => (
                        <span key={z.name} className="nlp-tag">{z.name} <em>{z.count}</em></span>
                      ))}
                    </div>
                  ) : (
                    <p className="nlp-empty">No zone refs (Z_XXX) in text yet.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="nlp-recent-card">
              <div className="nlp-chart-header">
                <Zap size={18} />
                <h3>Recently Processed</h3>
              </div>
              <div className="nlp-recent-body">
                {recentNlp.length > 0 ? recentNlp.map((inc, i) => (
                  <div key={inc.id || i} className="nlp-recent-item">
                    <div className="nlp-recent-summary">{inc.nlp_analysis?.summary || inc.description?.slice(0, 40) || '—'}</div>
                    <div className="nlp-recent-meta">
                      <span className="nlp-meta-cat">{getCategoryLabel(inc.nlp_analysis?.category)}</span>
                      <span className="nlp-meta-conf">{(inc.nlp_analysis?.category_confidence ?? 0) * 100}%</span>
                      <span className={`nlp-meta-sent ${inc.nlp_analysis?.sentiment}`}>{inc.nlp_analysis?.sentiment || '—'}</span>
                    </div>
                  </div>
                )) : (
                  <p className="nlp-empty">No NLP-processed incidents in this period. Create one from All Incidents.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pipeline & Procedure Tab — LSTM/GNN-style */}
      {activeTab === 'pipeline' && (
        <motion.div className="tab-content pipe-tab-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="pipe-intro">
            <Info size={22} />
            <div>
              <h3>NLP Pipeline & Procedure</h3>
              <p>Our domain-specific NLP engine runs the same procedure for every incident: classification, urgency, entity extraction, sentiment, and auto-summary—fused with real-time zone context. Below is the full pipeline, implementation, and domain resources. For a one-page technical spec (approach, limitations, upgrades) see <strong>NLP Engine</strong>.</p>
            </div>
          </div>

          {/* Pipeline steps (GNN message-passing style) */}
          <div className="pipe-steps">
            <h3><GitBranch size={18} /> Pipeline Steps</h3>
            {[
              { n: 1, title: 'Text input & context', desc: 'Raw incident description + optional context: zone_risk_level, current_aqi, has_hospital, recent_alerts, grid_priority.' },
              { n: 2, title: 'Classification', desc: 'Keyword scoring over ENERGY_KEYWORDS (9 categories). Score = matches / len(keywords); confidence = min(score * 2, 1.0). Best category wins; fallback: "other".' },
              { n: 3, title: 'Urgency detection', desc: 'Text: URGENCY_KEYWORDS (critical +4, high +2, medium +1). Context: zone_risk (high +2, med +1), AQI>200 +2, AQI>150 +1, hospital +1, alerts>5 +1. Thresholds: ≥6→critical, ≥4→high, ≥2→medium, else low.' },
              { n: 4, title: 'Entity extraction', desc: 'Zones: regex \\bZ_\\d{3}\\b. Equipment: token match on transformer, feeder, cable, line, substation, meter, switch, breaker. Time: \\d+ (times|hours|days|weeks), "since morning", etc. Counts: \\d+ (outages|incidents|failures).' },
              { n: 5, title: 'Sentiment analysis', desc: 'Negative vs positive keyword counts. Negative: failure, broken, outage, problem, damage, critical, urgent, overheating. Positive: resolved, fixed, working, normal, stable. Majority wins; else neutral.' },
              { n: 6, title: 'Auto-summary', desc: 'Category-based template (e.g. "Transformer issue", "Voltage problem") + zone_name or extracted Z_XXX. One line for dashboards.' },
              { n: 7, title: 'Output', desc: 'Dict: category, category_confidence, urgency, sentiment, entities {zones, equipment, time_phrases, counts}, summary, processed_at.' }
            ].map((s, i) => (
              <motion.div key={s.n} className="pipe-step" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <div className="pipe-step-num">{s.n}</div>
                <div className="pipe-step-text">
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pipeline diagram (SVG) */}
          <div className="pipe-diagram">
            <h3><Layers size={18} /> Pipeline Flow</h3>
            <div className="pipe-diagram-svg">
              <svg viewBox="0 0 700 120" className="pipe-svg">
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="var(--accent-secondary)" />
                  </marker>
                </defs>
                <rect x="10" y="35" width="75" height="50" rx="6" fill="var(--bg-card)" stroke="var(--accent-primary)" strokeWidth="1.5" />
                <text x="47" y="65" textAnchor="middle" fill="var(--accent-primary)" fontSize="9">Input</text>
                <line x1="85" y1="60" x2="115" y2="60" stroke="var(--accent-secondary)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <rect x="120" y="35" width="85" height="50" rx="6" fill="var(--bg-card)" stroke="#00d4ff" strokeWidth="1.5" />
                <text x="162" y="65" textAnchor="middle" fill="#00d4ff" fontSize="8">Classify</text>
                <line x1="205" y1="60" x2="235" y2="60" stroke="var(--accent-secondary)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <rect x="240" y="35" width="85" height="50" rx="6" fill="var(--bg-card)" stroke="#ffaa00" strokeWidth="1.5" />
                <text x="282" y="65" textAnchor="middle" fill="#ffaa00" fontSize="8">Urgency</text>
                <line x1="325" y1="60" x2="355" y2="60" stroke="var(--accent-secondary)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <rect x="360" y="35" width="75" height="50" rx="6" fill="var(--bg-card)" stroke="#00ff88" strokeWidth="1.5" />
                <text x="397" y="65" textAnchor="middle" fill="#00ff88" fontSize="8">Entity</text>
                <line x1="435" y1="60" x2="465" y2="60" stroke="var(--accent-secondary)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <rect x="470" y="35" width="75" height="50" rx="6" fill="var(--bg-card)" stroke="#aa66ff" strokeWidth="1.5" />
                <text x="507" y="65" textAnchor="middle" fill="#aa66ff" fontSize="8">Sentiment</text>
                <line x1="545" y1="60" x2="575" y2="60" stroke="var(--accent-secondary)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <rect x="580" y="35" width="80" height="50" rx="6" fill="var(--bg-card)" stroke="var(--accent-primary)" strokeWidth="1.5" />
                <text x="620" y="65" textAnchor="middle" fill="var(--accent-primary)" fontSize="8">Summary</text>
                <line x1="660" y1="60" x2="685" y2="60" stroke="var(--accent-secondary)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <text x="692" y="64" fill="var(--text-muted)" fontSize="10">Out</text>
              </svg>
            </div>
          </div>

          {/* Implementation: process_incident + classify + urgency + entities + sentiment */}
          <div className="pipe-code-section">
            <h3>Implementation</h3>
            <CodeBlock code={`def process_incident(text: str, context: Optional[Dict] = None, zone_name: Optional[str] = None) -> Dict:
    """Complete NLP processing pipeline for an incident report."""
    classification = classify_incident(text)
    urgency = detect_urgency(text, context)
    entities = extract_entities(text)
    sentiment = analyze_sentiment(text)
    summary = generate_summary(text, classification["category"], zone_name)
    return {
        "category": classification["category"],
        "category_confidence": classification["confidence"],
        "urgency": urgency,
        "sentiment": sentiment,
        "entities": entities,
        "summary": summary,
        "processed_at": datetime.utcnow().isoformat()
    }`} language="python" title="process_incident — Pipeline Orchestrator" />
            <CodeBlock code={`def classify_incident(text: str) -> Dict:
    text_lower = text.lower()
    scores = {}
    for category, keywords in ENERGY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score / len(keywords)
    if not scores:
        return {"category": "other", "confidence": 0.3}
    cat = max(scores, key=scores.get)
    conf = min(scores[cat] * 2, 1.0)
    return {"category": cat, "confidence": round(conf, 2)}`} language="python" title="classify_incident — Domain Keyword Scoring" />
            <CodeBlock code={`def detect_urgency(text: str, context: Optional[Dict] = None) -> str:
    urgency_score = 0
    for level, keywords in URGENCY_KEYWORDS.items():
        for kw in keywords:
            if kw in text.lower():
                if level == "critical": urgency_score += 4
                elif level == "high": urgency_score += 2
                elif level == "medium": urgency_score += 1
                break
    if context:
        if context.get("zone_risk_level") == "high": urgency_score += 2
        elif context.get("zone_risk_level") == "medium": urgency_score += 1
        if context.get("current_aqi", 0) > 200: urgency_score += 2
        elif context.get("current_aqi", 0) > 150: urgency_score += 1
        if context.get("has_hospital"): urgency_score += 1
        if context.get("recent_alerts", 0) > 5: urgency_score += 1
    if urgency_score >= 6: return "critical"
    if urgency_score >= 4: return "high"
    if urgency_score >= 2: return "medium"
    return "low"`} language="python" title="detect_urgency — Text + Context Hybrid" />
            <CodeBlock code={`def extract_entities(text: str) -> Dict[str, List[str]]:
    entities = {"zones": [], "equipment": [], "time_phrases": [], "counts": []}
    entities["zones"] = list(set(re.findall(r'\\bZ_\\d{3}\\b', text, re.I)))
    for kw in ["transformer", "feeder", "cable", "line", "substation", "meter", "switch", "breaker"]:
        if kw in text.lower():
            entities["equipment"].append(kw)
    # time_phrases: \\d+ (times|hours|days), "since morning", etc.
    # counts: \\d+ (outages|incidents|failures)
    return entities`} language="python" title="extract_entities — Zones, Equipment, Time, Counts" />
            <CodeBlock code={`def analyze_sentiment(text: str) -> str:
    neg = ["failure", "broken", "outage", "problem", "damage", "critical", "urgent", "overheating"]
    pos = ["resolved", "fixed", "working", "normal", "stable", "good", "success"]
    n = sum(1 for kw in neg if kw in text.lower())
    p = sum(1 for kw in pos if kw in text.lower())
    if n > p: return "negative"
    if p > n: return "positive"
    return "neutral"`} language="python" title="analyze_sentiment — Keyword-Based" />
          </div>

          {/* Input/Output schema */}
          <div className="pipe-schema">
            <h3>Input / Output Schema</h3>
            <div className="pipe-schema-grid">
              <div className="pipe-schema-card">
                <h4>Input</h4>
                <table>
                  <tbody>
                    <tr><td><code>text</code></td><td>str — incident description</td></tr>
                    <tr><td><code>context</code></td><td>dict — zone_risk_level, current_aqi, has_hospital, recent_alerts, grid_priority</td></tr>
                    <tr><td><code>zone_name</code></td><td>str — for summary</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="pipe-schema-card">
                <h4>Output</h4>
                <table>
                  <tbody>
                    <tr><td><code>category</code></td><td>str — one of 9 + "other"</td></tr>
                    <tr><td><code>category_confidence</code></td><td>float 0–1</td></tr>
                    <tr><td><code>urgency</code></td><td>low | medium | high | critical</td></tr>
                    <tr><td><code>sentiment</code></td><td>positive | negative | neutral</td></tr>
                    <tr><td><code>entities</code></td><td>{'{ zones, equipment, time_phrases, counts }'}</td></tr>
                    <tr><td><code>summary</code></td><td>str — one-line</td></tr>
                    <tr><td><code>processed_at</code></td><td>ISO datetime</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Domain resources: ENERGY_KEYWORDS, URGENCY_KEYWORDS */}
          <div className="pipe-resources">
            <h3>Domain Resources</h3>
            <div className="pipe-resources-grid">
              <div className="pipe-res-card">
                <h4>ENERGY_KEYWORDS (9 categories)</h4>
                <div className="pipe-kw-list">
                  {['transformer_fault', 'voltage_issue', 'outage', 'high_demand', 'pollution_complaint', 'safety_hazard', 'equipment_failure', 'cable_damage', 'weather_damage'].map(c => (
                    <div key={c} className="pipe-kw-row"><code>{c}</code><span>{c.replace(/_/g, ' ')}</span></div>
                  ))}
                </div>
                <p className="pipe-kw-note">Each category has 5–9 domain terms (e.g. transformer, overheating, outage, aqi, fire, cable, storm).</p>
              </div>
              <div className="pipe-res-card">
                <h4>URGENCY_KEYWORDS (4 levels)</h4>
                <div className="pipe-kw-list">
                  <div className="pipe-kw-row"><code>critical</code><span>+4 — urgent, emergency, fire, hospital</span></div>
                  <div className="pipe-kw-row"><code>high</code><span>+2 — asap, severe, damage, overheating</span></div>
                  <div className="pipe-kw-row"><code>medium</code><span>+1 — monitor, investigate, concern</span></div>
                  <div className="pipe-kw-row"><code>low</code><span>+0 — routine, maintenance, advisory</span></div>
                </div>
                <p className="pipe-kw-note">Context adds: zone_risk (high +2, med +1), AQI&gt;200 +2, AQI&gt;150 +1, hospital +1, recent_alerts&gt;5 +1.</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* NLP Engine Tab — AI-engineer-facing technical spec */}
      {activeTab === 'nlp-engine' && (
        <motion.div className="tab-content nlp-engine-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="engine-overview">
            <h2><Cpu size={24} /> NLP Engine — Technical Spec</h2>
            <p className="engine-lead">Specification for AI/NLP engineers: what we use, how it works, and what to expect. For implementation, code, and domain resources see <strong>Pipeline & Procedure</strong>.</p>
          </div>

          <div className="engine-spec-grid">
            <div className="engine-card highlight">
              <h3>What we use</h3>
              <p><strong>Approach:</strong> Domain-specific <strong>rule-based NLP</strong> (keyword matching + context).</p>
              <p><strong>Not used:</strong> No BERT, GPT, or transformer models. No trainable neural nets for text. No external NLP APIs.</p>
              <p><strong>Implementation:</strong> <code>src/nlp/incident_processor.py</code> — pure Python, <code>re</code> and dicts. Invoked server-side on <code>POST /incidents</code>.</p>
            </div>
            <div className="engine-card">
              <h3>Why this choice</h3>
              <ul>
                <li><strong>Interpretable:</strong> Every label comes from explicit rules and keywords; easy to debug and tune.</li>
                <li><strong>No training data:</strong> No need for labeled incident corpora or GPU.</li>
                <li><strong>Fast & cheap:</strong> No model load; runs in-memory on each request.</li>
                <li><strong>Domain-fit:</strong> Energy/grid terms are curated; works for our taxonomy out of the box.</li>
              </ul>
            </div>
            <div className="engine-card">
              <h3>Classification</h3>
              <p><strong>Method:</strong> Exact substring match over <code>ENERGY_KEYWORDS</code> (9 categories, 5–9 terms each).</p>
              <p><strong>Scoring:</strong> <code>score[c] = (matches in text) / len(keywords[c])</code>; <code>confidence = min(score * 2, 1.0)</code>. Best category wins; fallback <code>"other"</code> if no match.</p>
              <p><strong>Categories:</strong> transformer_fault, voltage_issue, outage, high_demand, pollution_complaint, safety_hazard, equipment_failure, cable_damage, weather_damage.</p>
            </div>
            <div className="engine-card">
              <h3>Urgency</h3>
              <p><strong>Method:</strong> Hybrid: text keywords (<code>URGENCY_KEYWORDS</code>) + context (zone risk, AQI, hospital, recent_alerts).</p>
              <p><strong>Points:</strong> critical +4, high +2, medium +1 per keyword hit; context: zone_risk high +2/med +1, AQI&gt;200 +2, &gt;150 +1, hospital +1, alerts&gt;5 +1.</p>
              <p><strong>Thresholds:</strong> ≥6→critical, ≥4→high, ≥2→medium, else low.</p>
            </div>
            <div className="engine-card">
              <h3>Entity extraction</h3>
              <p><strong>Zones:</strong> <code>r'\bZ_\d{3}\b'</code>.</p>
              <p><strong>Equipment:</strong> Token-in-text: transformer, feeder, cable, line, substation, meter, switch, breaker.</p>
              <p><strong>Time:</strong> <code>\d+ (times|hours|days|weeks)</code>, &quot;since morning&quot;, &quot;last week&quot;, etc.</p>
              <p><strong>Counts:</strong> <code>\d+ (outages|incidents|failures)</code>.</p>
            </div>
            <div className="engine-card">
              <h3>Sentiment</h3>
              <p><strong>Method:</strong> Two keyword sets (negative / positive). Count matches; majority wins; else neutral.</p>
              <p><strong>Negative:</strong> failure, broken, outage, problem, damage, critical, urgent, overheating.</p>
              <p><strong>Positive:</strong> resolved, fixed, working, normal, stable, good, success.</p>
            </div>
            <div className="engine-card">
              <h3>Input / Output</h3>
              <p><strong>In:</strong> <code>text: str</code>, <code>context: dict</code>{' (zone_risk_level, current_aqi, has_hospital, recent_alerts, grid_priority)'}, <code>zone_name: str</code>.</p>
              <p><strong>Out:</strong> category, category_confidence, urgency, sentiment, entities (zones, equipment, time_phrases, counts), summary, processed_at. See <strong>Pipeline & Procedure</strong> for full schema and code.</p>
            </div>
            <div className="engine-card warn">
              <h3>Limitations</h3>
              <ul>
                <li>English-only; no multi-language.</li>
                <li>No NER for arbitrary equipment IDs or person/org names.</li>
                <li>No semantic similarity; paraphrases can be missed.</li>
                <li>Keywords are static; new term needs code change.</li>
              </ul>
            </div>
            <div className="engine-card">
              <h3>Possible upgrades</h3>
              <ul>
                <li>Fine-tuned BERT/DistilBERT for classification and sentiment.</li>
                <li>NER or regex expansion for equipment IDs and asset codes.</li>
                <li>Multi-language: translate or language-specific keyword sets.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && trends.length > 0 && (
        <div className="tab-content">
          <div className="chart-card">
            <h3><TrendingUp size={20} /> Incident Trends Over Time</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 136, 0.1)" />
                <XAxis dataKey="date" stroke="#00d4ff" />
                <YAxis stroke="#00d4ff" />
                <Tooltip contentStyle={{ background: '#0a1929', border: '1px solid #00ff88' }} />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#00ff88" strokeWidth={2} name="Total Incidents" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          <RefreshCw size={32} className="spinning" style={{ animation: 'spin 1s linear infinite' }} />
          <p>Loading incident data...</p>
        </div>
      )}

      <style>{`
        .why-nlp-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem 1.75rem; margin-bottom: 1.5rem; }
        .why-nlp-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
        .why-nlp-header svg { color: var(--accent-secondary); flex-shrink: 0; }
        .why-nlp-header h3 { font-size: 1.15rem; margin: 0; color: var(--text-primary); font-family: var(--font-display); }
        .why-nlp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem 1.5rem; }
        @media (max-width: 800px) { .why-nlp-grid { grid-template-columns: 1fr; } }
        .why-nlp-item { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem; }
        .why-nlp-item strong { display: block; font-size: 0.9rem; color: var(--accent-primary); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .why-nlp-item p { margin: 0; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; }

        .incident-tab-nav { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.5rem; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-color); }
        .incident-tab-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: transparent; border: none; border-radius: 6px; color: var(--text-secondary); cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; }
        .incident-tab-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }
        .incident-tab-btn.active { background: var(--accent-primary); color: #000; }

        .nlp-live-strip { display: grid; grid-template-columns: repeat(4, 1fr) auto; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
        @media (max-width: 900px) { .nlp-live-strip { grid-template-columns: repeat(2, 1fr); } }
        .nlp-metric { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; }
        .nlp-metric-icon { padding: 0.5rem; border-radius: 8px; flex-shrink: 0; }
        .nlp-metric-icon.processed { background: rgba(0, 255, 136, 0.15); color: var(--accent-primary); }
        .nlp-metric-icon.confidence { background: rgba(0, 212, 255, 0.15); color: var(--accent-secondary); }
        .nlp-metric-icon.categories { background: rgba(170, 102, 255, 0.15); color: var(--accent-purple); }
        .nlp-metric-icon.sentiment { background: rgba(255, 68, 102, 0.15); color: var(--accent-danger); }
        .nlp-metric-info { flex: 1; min-width: 0; }
        .nlp-metric-value { display: block; font-size: 1.5rem; font-weight: 700; font-family: var(--font-display); color: var(--text-primary); }
        .nlp-metric-label { font-size: 0.8rem; color: var(--text-secondary); }
        .nlp-live-badge { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; background: rgba(255, 68, 102, 0.12); border: 1px solid rgba(255, 68, 102, 0.35); border-radius: 6px; font-size: 0.75rem; font-weight: 700; color: #ff4466; }
        .nlp-pulse { width: 6px; height: 6px; background: #ff4466; border-radius: 50%; animation: nlp-pulse 1.2s infinite; }
        @keyframes nlp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        .nlp-pipeline-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem 1.75rem; margin-bottom: 1.5rem; }
        .nlp-pipeline-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
        .nlp-pipeline-header svg { color: var(--accent-secondary); }
        .nlp-pipeline-header h3 { flex: 1; font-size: 1.1rem; margin: 0; color: var(--text-primary); }
        .nlp-badge { padding: 0.25rem 0.6rem; background: rgba(0, 255, 136, 0.15); border: 1px solid rgba(0, 255, 136, 0.4); border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: var(--accent-primary); text-transform: uppercase; }
        .nlp-pipeline-desc { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; margin-bottom: 0.5rem; }
        .nlp-pipeline-steps-line { margin: 0 0 0.5rem 0; font-size: 0.95rem; color: var(--text-secondary); }
        .nlp-cta-link { display: inline-flex; align-items: center; gap: 0.35rem; background: none; border: none; color: var(--accent-primary); cursor: pointer; font-weight: 600; font-size: inherit; padding: 0; margin-left: 0.25rem; }
        .nlp-cta-link:hover { text-decoration: underline; }

        .nlp-charts-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
        @media (max-width: 900px) { .nlp-charts-row { grid-template-columns: 1fr; } }
        .nlp-chart-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
        .nlp-chart-header { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); }
        .nlp-chart-header svg { color: var(--accent-secondary); }
        .nlp-chart-header h3 { font-size: 1rem; margin: 0; color: var(--text-primary); }
        .nlp-chart-body { padding: 1rem; }

        .nlp-bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 900px) { .nlp-bottom-row { grid-template-columns: 1fr; } }
        .nlp-entities-card, .nlp-recent-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
        .nlp-entities-body, .nlp-recent-body { padding: 1rem 1.25rem; }
        .nlp-entity-group { margin-bottom: 1rem; }
        .nlp-entity-group:last-child { margin-bottom: 0; }
        .nlp-entity-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; }
        .nlp-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .nlp-tag { padding: 0.35rem 0.75rem; background: rgba(0, 212, 255, 0.12); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 6px; font-size: 0.85rem; color: var(--accent-secondary); }
        .nlp-tag em { margin-left: 0.35rem; font-style: normal; opacity: 0.8; font-size: 0.8rem; }
        .nlp-empty { font-size: 0.9rem; color: var(--text-muted); margin: 0.5rem 0 0 0; }
        .nlp-recent-item { padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); }
        .nlp-recent-item:last-child { border-bottom: none; }
        .nlp-recent-summary { font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.35rem; }
        .nlp-recent-meta { display: flex; gap: 0.75rem; font-size: 0.8rem; flex-wrap: wrap; }
        .nlp-meta-cat { color: var(--accent-secondary); }
        .nlp-meta-conf { color: var(--accent-primary); }
        .nlp-meta-sent.negative { color: #ff4466; }
        .nlp-meta-sent.positive { color: #00ff88; }
        .nlp-meta-sent.neutral { color: var(--text-muted); }

        .pipe-intro { display: flex; align-items: flex-start; gap: 1rem; padding: 1.25rem; background: rgba(0, 212, 255, 0.1); border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 1.5rem; }
        .pipe-intro svg { color: var(--accent-secondary); flex-shrink: 0; }
        .pipe-intro h3 { font-size: 1.1rem; margin: 0 0 0.5rem 0; color: var(--text-primary); }
        .pipe-intro p { margin: 0; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; }

        .pipe-steps { margin-bottom: 1.5rem; }
        .pipe-steps h3, .pipe-diagram h3, .pipe-code-section h3, .pipe-schema h3, .pipe-resources h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--accent-secondary); font-size: 1rem; }
        .pipe-step { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.75rem; }
        .pipe-step-num { width: 32px; height: 32px; background: var(--accent-primary); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
        .pipe-step-text { display: flex; flex-direction: column; gap: 0.35rem; }
        .pipe-step-text strong { color: var(--text-primary); }
        .pipe-step-text span { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; }

        .pipe-diagram { margin-bottom: 1.5rem; }
        .pipe-diagram-svg { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; overflow-x: auto; }
        .pipe-svg { width: 100%; min-width: 600px; display: block; }

        .pipe-code-section { margin-bottom: 1.5rem; }
        .pipe-code-section h3 { margin-bottom: 0.75rem; }
        .pipe-code-section .code-block-container { margin-bottom: 1rem; }

        .pipe-schema { margin-bottom: 1.5rem; }
        .pipe-schema-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        @media (max-width: 700px) { .pipe-schema-grid { grid-template-columns: 1fr; } }
        .pipe-schema-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.25rem; }
        .pipe-schema-card h4 { font-size: 0.95rem; color: var(--accent-primary); margin: 0 0 0.75rem 0; }
        .pipe-schema-card table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .pipe-schema-card td { padding: 0.4rem 0.5rem 0.4rem 0; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); }
        .pipe-schema-card td:first-child { color: var(--accent-secondary); font-family: var(--font-mono); font-size: 0.8rem; white-space: nowrap; }

        .pipe-resources { margin-bottom: 1rem; }
        .pipe-resources-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        @media (max-width: 800px) { .pipe-resources-grid { grid-template-columns: 1fr; } }
        .pipe-res-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.25rem; }
        .pipe-res-card h4 { font-size: 0.95rem; color: var(--accent-secondary); margin: 0 0 0.75rem 0; }
        .pipe-kw-list { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem; }
        .pipe-kw-row { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
        .pipe-kw-row code { color: var(--accent-primary); font-size: 0.8rem; min-width: 140px; }
        .pipe-kw-row span { color: var(--text-secondary); }
        .pipe-kw-note { margin: 0; font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; }

        .report-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 900px) { .report-layout { grid-template-columns: 1fr; } }
        .report-form-card, .report-live-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; }
        .report-form-card h3, .report-live-card h3 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.75rem 0; color: var(--accent-primary); font-size: 1.05rem; }
        .report-form-desc, .report-live-desc { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5; }
        .report-form { display: flex; flex-direction: column; gap: 0.75rem; }
        .report-form label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
        .report-form .req { color: var(--accent-danger); }
        .report-form textarea, .report-form select { padding: 0.65rem 0.9rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 0.95rem; }
        .report-form textarea { resize: vertical; min-height: 90px; }
        .report-form-err { padding: 0.5rem; background: rgba(255, 68, 102, 0.15); border: 1px solid rgba(255, 68, 102, 0.4); border-radius: 6px; color: #ff4466; font-size: 0.9rem; }
        .report-submit-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: var(--accent-primary); color: #000; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; margin-top: 0.5rem; }
        .report-submit-btn:hover:not(:disabled) { filter: brightness(1.1); }
        .report-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .report-submit-btn .spin { animation: spin 1s linear infinite; }
        .report-live-idle { text-align: center; padding: 2rem; color: var(--text-muted); }
        .report-live-idle-icon { opacity: 0.5; margin-bottom: 0.75rem; }
        .report-live-steps { display: flex; flex-direction: column; gap: 0.5rem; }
        .report-live-step { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.65rem 0.9rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; }
        .report-live-step.waiting { opacity: 0.5; }
        .report-live-step.active { border-color: var(--accent-primary); background: rgba(0, 255, 136, 0.08); }
        .report-live-step.done { border-color: rgba(0, 255, 136, 0.4); }
        .report-live-step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--border-color); color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
        .report-live-step.done .report-live-step-num { background: var(--accent-primary); color: #000; }
        .report-live-step-body { display: flex; flex-direction: column; gap: 0.2rem; }
        .report-live-step-body strong { font-size: 0.9rem; color: var(--text-primary); }
        .report-live-data { font-size: 0.85rem; color: var(--accent-secondary); }
        .report-live-pulse { animation: nlp-pulse 0.8s infinite; }
        .report-live-done { margin-top: 1rem; }
        .report-live-done-card { padding: 1rem; background: rgba(0, 255, 136, 0.1); border: 1px solid var(--accent-primary); border-radius: 10px; }
        .report-live-done-card h4 { margin: 0 0 0.5rem 0; color: var(--accent-primary); }
        .report-live-done-card p { margin: 0.35rem 0; font-size: 0.9rem; color: var(--text-secondary); }
        .report-live-done-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
        .report-done-btn { padding: 0.6rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
        .report-done-btn.primary { background: var(--accent-primary); color: #000; border: none; }
        .report-done-btn.secondary { background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); }

        .engine-overview { margin-bottom: 1.5rem; }
        .engine-overview h2 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem 0; font-size: 1.35rem; color: var(--accent-primary); }
        .engine-lead { margin: 0; font-size: 1rem; color: var(--text-secondary); }
        .engine-spec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        @media (max-width: 900px) { .engine-spec-grid { grid-template-columns: 1fr; } }
        .engine-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; }
        .engine-card.highlight { border-color: var(--accent-secondary); }
        .engine-card.warn { border-color: var(--accent-warning); }
        .engine-card h3 { font-size: 1rem; color: var(--accent-secondary); margin: 0 0 0.6rem 0; }
        .engine-card p, .engine-card li { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0.4rem 0; }
        .engine-card ul { margin: 0.5rem 0 0 1rem; padding: 0; }
        .engine-card code { background: var(--bg-secondary); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; color: var(--accent-primary); }
      `}</style>
    </div>
  );
}
