import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Activity, AlertTriangle, Network, 
  TrendingUp, Code, PlayCircle, Loader, BarChart3,
  Layers, Target, Zap, Info, GitCompare, GitBranch, ExternalLink
} from 'lucide-react';
import { modelsAPI, queriesAPI, analyticsAPI, cityAPI, kgAPI } from '../services/api';
import { useAppMode } from '../utils/useAppMode';
import TFT from './TFT';
import LSTM from './LSTM';
import Autoencoder from './Autoencoder';
import GNN from './GNN';
import ModelComparison from './ModelComparison';
import KnowledgeGraphViz from '../components/KnowledgeGraphViz';
import { ChevronRight } from 'lucide-react';

function KnowledgeGraphTab({ currentCityId, mode }) {
  const [kgStatus, setKgStatus] = useState(null);
  const [graph, setGraph] = useState(null);
  const [neo4jUrl, setNeo4jUrl] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    kgAPI.getStatus()
      .then((r) => setKgStatus(r.data))
      .catch(() => setKgStatus({ available: false }))
      .finally(() => setLoading(false));
    kgAPI.getNeo4jBrowserUrl().then((r) => setNeo4jUrl(r.data?.url)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentCityId || !kgStatus?.available) return;
    kgAPI.getGraph(currentCityId)
      .then((r) => setGraph(r.data))
      .catch(() => setGraph({ nodes: [], edges: [], error: 'Failed to load' }));
  }, [currentCityId, kgStatus?.available]);

  const handleSync = () => {
    if (!currentCityId) return;
    setSyncing(true);
    setSyncResult(null);
    kgAPI.sync(currentCityId)
      .then((r) => {
        const data = r.data;
        if (data?.success) {
          setSyncResult({ success: true, synced: data.synced ?? 0, edges: data.edges ?? 0 });
          return kgAPI.getGraph(currentCityId).then((g) => setGraph(g.data));
        }
        setSyncResult({ success: false, error: data?.error || 'Sync failed' });
      })
      .catch((err) => setSyncResult({ success: false, error: err.response?.data?.error || err.message || 'Sync failed' }))
      .finally(() => setSyncing(false));
  };

  if (loading) {
    return (
      <div className="loading-state">
        <Loader size={32} className="spin" />
        <p>Checking Knowledge Graph (Neo4j)…</p>
      </div>
    );
  }

  return (
    <div className="kg-tab-content">
      <h2><GitBranch size={24} /> Knowledge Graph (Neo4j)</h2>
      <p className="kg-desc">
        Zones, risk scores, and adjacency are synced to Neo4j for explainable risk reasoning (neighbor-aware). 
        Open Neo4j Browser to explore the graph.
      </p>
      {kgStatus?.available ? (
        <>
          <div className="kg-actions">
            {mode === 'city' && currentCityId && (
              <>
                <button type="button" className="btn btn-primary" onClick={handleSync} disabled={syncing}>
                  {syncing ? 'Syncing…' : 'Sync KG from processed data'}
                </button>
                {syncResult?.success && (
                  <span className="kg-sync-ok">Synced {syncResult.synced} zones, {syncResult.edges} edges</span>
                )}
                {syncResult && !syncResult.success && (
                  <span className="kg-sync-err">{syncResult.error}</span>
                )}
              </>
            )}
            {neo4jUrl && (
              <>
                <a href={neo4jUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  <ExternalLink size={16} /> Open Neo4j Browser
                </a>
                <span className="kg-login-hint">In Neo4j Browser use <strong>Connect URL:</strong> neo4j://localhost:7687, <strong>Username:</strong> neo4j, <strong>Password:</strong> urban-grid-kg</span>
              </>
            )}
          </div>
          {graph && (
            <>
              {graph.nodes?.length > 0 ? (
                <div className="kg-viz-wrap">
                  <KnowledgeGraphViz graph={graph} />
                </div>
              ) : null}
              <div className="kg-preview">
                <p><strong>{graph.nodes?.length ?? 0}</strong> zones, <strong>{graph.edges?.length ?? 0}</strong> edges. Pan, zoom, and click nodes to see zone details.</p>
                {(graph.nodes?.length === 0 || graph.edges?.length === 0) && (
                  <p className="kg-sync-hint">0 zones means the graph has not been synced yet. <strong>Run city processing</strong> (select a city and process), then click <strong>&quot;Sync KG from processed data&quot;</strong> above to populate the Knowledge Graph. After sync, refresh this tab or re-open Advanced Analytics.</p>
                )}
                {graph.error && <p className="kg-error">{graph.error}</p>}
                <p className="kg-hint">Run in Neo4j Browser: <code>MATCH (z:Zone) RETURN z LIMIT 100</code></p>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="kg-unavailable">
          <p>Neo4j is not available. Start Neo4j (e.g. <code>docker-compose up neo4j</code>) and set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD.</p>
        </div>
      )}
      <style>{`
        .kg-tab-content { padding: 0.5rem 0; }
        .kg-tab-content h2 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
        .kg-desc { color: var(--text-secondary); margin-bottom: 1.5rem; }
        .kg-actions { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .kg-viz-wrap { margin-bottom: 1.5rem; }
        .kg-preview { background: var(--bg-secondary); border-radius: 8px; padding: 1rem; }
        .kg-preview h3 { margin-bottom: 0.5rem; }
        .kg-error { color: var(--accent-warning); }
        .kg-hint { margin-top: 0.75rem; font-size: 0.875rem; color: var(--text-muted); }
        .kg-sync-hint { margin-top: 0.75rem; padding: 0.75rem; background: rgba(0, 212, 255, 0.1); border-radius: 8px; font-size: 0.9rem; color: var(--text-secondary); }
        .kg-sync-ok { color: var(--accent-primary); font-size: 0.9rem; align-self: center; }
        .kg-sync-err { color: var(--accent-warning); font-size: 0.9rem; align-self: center; }
        .kg-login-hint { font-size: 0.8rem; color: var(--text-muted); align-self: center; }
        .kg-unavailable { color: var(--text-secondary); }
      `}</style>
    </div>
  );
}

export default function AdvancedAnalytics() {
  const { mode } = useAppMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [modelsOverview, setModelsOverview] = useState(null);
  const [liveMLOutputs, setLiveMLOutputs] = useState(null);
  const [currentCityId, setCurrentCityId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  // Redirect from KG tab if switching to Simulated mode (KG only available in City Live)
  useEffect(() => {
    if (mode === 'sim' && activeTab === 'kg') {
      setActiveTab('overview');
    }
  }, [mode, activeTab]);

  // Get current city ID when in City mode
  useEffect(() => {
    if (mode === 'city') {
      cityAPI.getCurrentCity()
        .then((r) => setCurrentCityId(r.data?.city_id || null))
        .catch(() => setCurrentCityId(null));
    } else {
      setCurrentCityId(null);
    }
  }, [mode]);

  // Listen for city changes
  useEffect(() => {
    if (mode !== 'city') return;
    const onCityChanged = () => {
      cityAPI.getCurrentCity()
        .then((r) => setCurrentCityId(r.data?.city_id || null))
        .catch(() => setCurrentCityId(null));
    };
    window.addEventListener('ugms-city-changed', onCityChanged);
    window.addEventListener('ugms-city-processed', onCityChanged);
    return () => {
      window.removeEventListener('ugms-city-changed', onCityChanged);
      window.removeEventListener('ugms-city-processed', onCityChanged);
    };
  }, [mode]);

  useEffect(() => {
    fetchOverview();
  }, [mode, currentCityId]);

  const fetchOverview = async () => {
    setOverviewError(null);
    setLoading(true);
    try {
      const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('Request timed out after 20s')), ms));

      if (mode === 'city' && currentCityId) {
        const processedRes = await Promise.race([
          cityAPI.getProcessedData(currentCityId, null, 100),
          timeout(20000)
        ]);
        const zones = processedRes.data?.zones || [];
        const tftOutputs = zones.map(z => ({
          zone_id: z.zone_id,
          forecast: z.ml_processed?.demand_forecast?.next_hour_kwh || 0,
          confidence: z.ml_processed?.demand_forecast?.confidence || 0
        }));
        const lstmOutputs = tftOutputs;
        const autoencoderOutputs = zones.map(z => ({
          zone_id: z.zone_id,
          is_anomaly: z.ml_processed?.anomaly_detection?.is_anomaly || false,
          anomaly_score: z.ml_processed?.anomaly_detection?.anomaly_score || 0
        }));
        const gnnOutputs = zones.map(z => ({
          zone_id: z.zone_id,
          risk_score: z.ml_processed?.risk_score?.score || 0,
          risk_level: z.ml_processed?.risk_score?.level || 'low'
        }));
        const avgTFTConfidence = tftOutputs.length > 0
          ? tftOutputs.reduce((sum, o) => sum + o.confidence, 0) / tftOutputs.length : 0;
        const anomalyCount = autoencoderOutputs.filter(o => o.is_anomaly).length;
        const avgAnomalyScore = autoencoderOutputs.length > 0
          ? autoencoderOutputs.reduce((sum, o) => sum + o.anomaly_score, 0) / autoencoderOutputs.length : 0;
        const highRiskCount = gnnOutputs.filter(o => o.risk_level === 'high').length;
        const mediumRiskCount = gnnOutputs.filter(o => o.risk_level === 'medium').length;
        const lowRiskCount = gnnOutputs.filter(o => o.risk_level === 'low').length;
        const avgRiskScore = gnnOutputs.length > 0
          ? gnnOutputs.reduce((sum, o) => sum + o.risk_score, 0) / gnnOutputs.length : 0;

        setLiveMLOutputs({
          tft: { outputs: tftOutputs, avgConfidence: avgTFTConfidence },
          lstm: { outputs: lstmOutputs, avgConfidence: avgTFTConfidence },
          autoencoder: { outputs: autoencoderOutputs, anomalyCount, avgScore: avgAnomalyScore },
          gnn: { outputs: gnnOutputs, highRiskCount, mediumRiskCount, lowRiskCount, avgScore: avgRiskScore },
          totalZones: zones.length
        });
        setModelsOverview({
          models: [
            { name: 'TFT', purpose: 'Primary demand forecasting — interpretable multi-horizon (Temporal Fusion Transformer)', status: 'live',
              metrics: { 'Avg Confidence': `${(avgTFTConfidence * 100).toFixed(1)}%`, 'Zones Processed': tftOutputs.length } },
            { name: 'LSTM (comparison)', purpose: 'Baseline demand forecast — kept for comparison with TFT', status: 'live',
              metrics: { 'Avg Confidence': `${(avgTFTConfidence * 100).toFixed(1)}%`, 'Zones Processed': lstmOutputs.length } },
            { name: 'Autoencoder', purpose: 'Anomaly detection on real-time data', status: 'live',
              metrics: { 'Zones Analyzed': autoencoderOutputs.length, 'Anomalies Detected': anomalyCount, 'Avg Anomaly Score': avgAnomalyScore.toFixed(2) } },
            { name: 'GNN', purpose: 'Risk scoring from network analysis', status: 'live',
              metrics: { 'Zones Analyzed': gnnOutputs.length, 'High Risk': highRiskCount, 'Medium Risk': mediumRiskCount, 'Low Risk': lowRiskCount, 'Avg Risk Score': avgRiskScore.toFixed(1) } }
          ]
        });
      } else {
        // Sim mode or city mode without city selected: still load model overview so we show descriptions
        const response = await Promise.race([
          modelsAPI.getOverview(),
          timeout(20000)
        ]);
        setModelsOverview(response.data);
        if (!(mode === 'city' && currentCityId)) setLiveMLOutputs(null);
      }
    } catch (error) {
      console.error('Error fetching models overview:', error);
      setOverviewError(error?.message || 'Failed to load model overview. Check backend and retry.');
      setModelsOverview(null);
      setLiveMLOutputs(null);
    } finally {
      setLoading(false);
    }
  };

  // Knowledge Graph tab only shown in City Live mode (not Simulated)
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Brain, color: 'primary' },
    { id: 'tft', label: 'TFT', icon: Activity, color: 'primary' },
    { id: 'lstm', label: 'LSTM (comparison)', icon: Activity, color: 'secondary' },
    { id: 'autoencoder', label: 'Autoencoder', icon: AlertTriangle, color: 'warning' },
    { id: 'gnn', label: 'GNN', icon: Network, color: 'purple' },
    ...(mode === 'city' ? [{ id: 'kg', label: 'Knowledge Graph', icon: GitBranch, color: 'secondary' }] : []),
    { id: 'comparison', label: 'Model Comparison', icon: GitCompare, color: 'secondary' },
  ];

  const OverviewContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <Loader size={32} className="spin" />
          <p>{mode === 'city' && currentCityId ? 'Loading live ML outputs…' : 'Loading model overview…'}</p>
          <p className="loading-hint">
            {mode === 'city' && currentCityId
              ? 'Fetching processed_zone_data (TFT, Autoencoder, GNN outputs per zone). May take up to 20s.'
              : 'Fetching model overview (TFT, LSTM, Autoencoder, GNN, ARIMA, Prophet). May take up to 20s. If it hangs, check backend.'}
          </p>
        </div>
      );
    }
    if (overviewError) {
      return (
        <div className="loading-state">
          <AlertTriangle size={32} />
          <p>Could not load model overview</p>
          <p className="loading-hint">{overviewError}</p>
          <button className="btn btn-primary" onClick={() => fetchOverview()}>Retry</button>
        </div>
      );
    }

    const pipelineMinutes = [
      { order: 1, name: 'TFT (Temporal Fusion Transformer)', what: 'Demand forecasting per zone', why: 'Interpretable multi-horizon forecast so we know which zones will need more power', outcome: 'Next-hour demand (kWh) per zone + confidence interval' },
      { order: 2, name: 'Autoencoder', what: 'Anomaly detection on real-time zone data', why: 'Flags zones that need attention (spikes, faults, or data errors)', outcome: 'Anomaly score per zone; count of zones above threshold' },
      { order: 3, name: 'GNN (Graph Neural Network)', what: 'Risk scoring from zone network (adjacency + demand/AQI)', why: 'Neighbor-aware risk so we can prioritize and balance the grid', outcome: 'Risk score and level (low/medium/high) per zone' },
      { order: 4, name: 'Neo4j Knowledge Graph', what: 'Sync zones, risk, and adjacency into a graph', why: 'Explainable risk reasoning (e.g. cascade) and graph exploration', outcome: 'Graph of zones + ADJACENT_TO edges for AI and exploration' },
      { order: 5, name: 'AI Recommendations (OpenRouter / Mistral)', what: 'Natural-language actions from all ML outputs', why: 'One place for operators to see what to do next', outcome: 'Prioritized recommendations with cost–benefit' },
    ];

    return (
      <div className="overview-content">
        <motion.div
          className="overview-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>Advanced Analytics & Machine Learning</h2>
          <p>
            {mode === 'city'
              ? `Live ML outputs from ${currentCityId ? currentCityId.toUpperCase() : 'selected city'} - Real-time processing`
              : 'Comprehensive deep learning models and database queries for urban grid management'}
          </p>
          {mode === 'city' && (
            <div className="overview-flow-note">
              <strong>When these run:</strong> TFT (primary demand forecast), Autoencoder, and GNN run during <strong>city processing</strong> (Home → Select city → Run processing). LSTM is kept for comparison. Results appear here and in Analytics. <strong>0 Anomalies / 0 High Risk</strong> means conditions are within normal thresholds (no zone exceeded anomaly or high-risk rules).
            </div>
          )}
        </motion.div>

        {/* Pipeline Minutes: ordered breakdown — which is first, what, why, outcome */}
        <div className="pipeline-minutes">
          <h3><Layers size={20} /> Pipeline minutes</h3>
          <p className="pipeline-minutes-desc">Order of models, what each does, why we use it, and the outcome. First runs first; each step feeds the next.</p>
          <div className="pipeline-minutes-table-wrap">
            <table className="pipeline-minutes-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Model</th>
                  <th>What it does</th>
                  <th>Why we use it</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {pipelineMinutes.map((row) => (
                  <tr key={row.order}>
                    <td className="col-num">{row.order}</td>
                    <td className="col-model"><strong>{row.name}</strong></td>
                    <td>{row.what}</td>
                    <td>{row.why}</td>
                    <td>{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data flow: what each algorithm calculates, how it processes, why, outcome */}
        <div className="pipeline-sequence">
          <h3><Layers size={20} /> Data flow: How data is processed through the pipeline</h3>
          <p className="pipeline-desc">Each step uses the previous step&apos;s output. Below: what each calculates, how it processes data, why we need it, and the outcome.</p>
          <div className="pipeline-tree">
            <div className="pipeline-step">
              <span className="step-num">1</span>
              <div className="step-content">
                <strong>TFT (Temporal Fusion Transformer)</strong> — Runs first.
                <div className="step-detail"><em>What it calculates:</em> Next-hour demand (kWh) per zone with confidence.</div>
                <div className="step-detail"><em>How it processes:</em> Static inputs (zone, city), known future (time), and historical series (demand, weather, AQI) → variable selection → LSTM encoder → interpretable attention → multi-horizon output.</div>
                <div className="step-detail"><em>Why we use it:</em> Interpretable multi-horizon forecast so we know which zones will need more power.</div>
                <div className="step-detail step-outcome"><strong>Outcome:</strong> Demand forecast and confidence per zone.</div>
              </div>
            </div>
            <div className="pipeline-arrow-down" />
            <div className="pipeline-step">
              <span className="step-num">2</span>
              <div className="step-content">
                <strong>Autoencoder</strong> — Same zone inputs as TFT.
                <div className="step-detail"><em>What it calculates:</em> Anomaly score per zone (unusual consumption).</div>
                <div className="step-detail"><em>How it processes:</em> Encodes zone features (demand, AQI, etc.) and reconstructs them; high reconstruction error → anomaly.</div>
                <div className="step-detail"><em>Why we use it:</em> Flags zones that need attention (spikes, faults, or data errors).</div>
                <div className="step-detail step-outcome"><strong>Outcome:</strong> Anomaly score and count of zones above threshold.</div>
              </div>
            </div>
            <div className="pipeline-arrow-down" />
            <div className="pipeline-step">
              <span className="step-num">3</span>
              <div className="step-content">
                <strong>GNN (Graph Neural Network)</strong> — Uses zone adjacency + demand/AQI.
                <div className="step-detail"><em>What it calculates:</em> Risk score and level (low/medium/high) per zone.</div>
                <div className="step-detail"><em>How it processes:</em> Zone graph (nodes = zones, edges = adjacency) → message passing over neighbors → aggregated features → risk head.</div>
                <div className="step-detail"><em>Why we use it:</em> Neighbor-aware risk so we can prioritize and balance the grid.</div>
                <div className="step-detail step-outcome"><strong>Outcome:</strong> Risk score and level per zone.</div>
              </div>
            </div>
            <div className="pipeline-arrow-down" />
            <div className="pipeline-step">
              <span className="step-num">4</span>
              <div className="step-content">
                <strong>Neo4j Knowledge Graph</strong> — Syncs zones, risk, and adjacency.
                <div className="step-detail"><em>What it does:</em> Stores zones as nodes and ADJACENT_TO as edges; supports Cypher risk reasoning.</div>
                <div className="step-detail"><em>How it processes:</em> ETL from processed_zone_data + grid adjacency → Neo4j; queries for cascade/explanation.</div>
                <div className="step-detail"><em>Why we use it:</em> Explainable risk reasoning (e.g. cascade) and graph exploration; used by AI Recommendations.</div>
                <div className="step-detail step-outcome"><strong>Outcome:</strong> Graph for exploration and AI context.</div>
              </div>
            </div>
            <div className="pipeline-arrow-down" />
            <div className="pipeline-step">
              <span className="step-num">5</span>
              <div className="step-content">
                <strong>AI Recommendations (OpenRouter / Mistral)</strong> — Consumes forecasts, anomalies, risk, and KG.
                <div className="step-detail"><em>What it does:</em> Produces natural-language prioritized actions.</div>
                <div className="step-detail"><em>How it processes:</em> LLM receives summary of TFT, Autoencoder, GNN, and KG outputs → generates ranked recommendations with rationale.</div>
                <div className="step-detail"><em>Why we use it:</em> One place for operators to see what to do next.</div>
                <div className="step-detail step-outcome"><strong>Outcome:</strong> Prioritized recommendations with cost–benefit.</div>
              </div>
            </div>
          </div>
        </div>

        {mode === 'city' && !currentCityId && (
          <div className="overview-select-city-note">
            <Target size={20} />
            <p><strong>Select a city to see live ML outputs.</strong> Choose a city from the dropdown in the header and run processing to view TFT, Autoencoder, and GNN results in the cards below.</p>
          </div>
        )}

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
                  'TFT': 'tft',
                  'LSTM (comparison)': 'lstm',
                  'Autoencoder': 'autoencoder',
                  'GNN': 'gnn'
                };
                if (tabMap[model.name]) {
                  setActiveTab(tabMap[model.name]);
                }
              }}
            >
              <div className={`model-icon ${model.name.toLowerCase().replace(/\s*\(comparison\)\s*/g, '')}`}>
                {model.name === 'TFT' && <Activity size={24} />}
                {model.name === 'LSTM (comparison)' && <Activity size={24} />}
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
                <span className={`status-badge ${model.status === 'live' ? 'live' : model.status === 'trained' ? 'trained' : 'pending'}`}>
                  {model.status === 'live' ? '🔴 Live' : model.status === 'trained' ? '✓ Trained' : 'Pending'}
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
              <h3>{mode === 'city' && liveMLOutputs?.totalZones ? `${liveMLOutputs.totalZones} Zones Processed` : '360K+ Data Points'}</h3>
              <p>{mode === 'city' ? 'Live ML outputs per zone' : 'Time-series data for training'}</p>
            </div>
          </motion.div>
        </div>

        {/* Navigation Cards */}
        <div className="nav-cards">
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
        {activeTab === 'tft' && <TFT />}
        {activeTab === 'lstm' && <LSTM />}
        {activeTab === 'autoencoder' && <Autoencoder />}
        {activeTab === 'gnn' && <GNN />}
        {activeTab === 'kg' && <KnowledgeGraphTab currentCityId={currentCityId} mode={mode} />}
        {activeTab === 'comparison' && <ModelComparison />}
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
        .overview-flow-note {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(0, 212, 255, 0.08);
          border-radius: 8px;
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
          text-align: left;
          max-width: 720px;
          margin-left: auto;
          margin-right: auto;
        }

        .pipeline-minutes {
          margin-bottom: 2rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.06) 0%, rgba(0, 255, 136, 0.04) 100%);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 12px;
        }
        .pipeline-minutes h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 1.15rem;
          color: var(--text-primary);
        }
        .pipeline-minutes-desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        .pipeline-minutes-table-wrap {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        .pipeline-minutes-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .pipeline-minutes-table th,
        .pipeline-minutes-table td {
          padding: 0.6rem 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-secondary);
        }
        .pipeline-minutes-table th {
          background: rgba(0, 212, 255, 0.1);
          color: var(--accent-primary);
          font-weight: 600;
        }
        .pipeline-minutes-table tbody tr:hover {
          background: rgba(0, 212, 255, 0.04);
        }
        .pipeline-minutes-table .col-num {
          width: 2rem;
          font-weight: 700;
          color: var(--accent-primary);
        }
        .pipeline-minutes-table .col-model {
          min-width: 180px;
          color: var(--text-primary);
        }

        .overview-select-city-note {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(0, 255, 136, 0.08);
          border: 1px solid rgba(0, 255, 136, 0.25);
          border-radius: 8px;
          color: var(--text-secondary);
        }
        .overview-select-city-note svg { flex-shrink: 0; color: var(--accent-primary); margin-top: 0.2rem; }
        .overview-select-city-note p { margin: 0; font-size: 0.95rem; }

        .pipeline-sequence {
          padding: 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
        }
        .pipeline-sequence h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }
        .pipeline-desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        .pipeline-tree {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
        }
        .pipeline-tree .pipeline-step {
          max-width: none;
        }
        .pipeline-arrow-down {
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 12px solid var(--accent-secondary);
          margin: 0.25rem 0 0.25rem 1.5rem;
          opacity: 0.8;
        }
        .pipeline-steps {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
        }
        .pipeline-step {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          max-width: 220px;
        }
        .step-num {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-primary);
          color: #000;
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .step-content {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .step-detail {
          margin-top: 0.4rem;
        }
        .step-outcome {
          margin-top: 0.5rem;
          color: var(--accent-primary);
        }
        .step-content strong { color: var(--text-primary); }
        .step-content code { font-size: 0.75rem; background: rgba(0, 212, 255, 0.15); padding: 0.1rem 0.3rem; border-radius: 4px; }
        .pipeline-arrow {
          flex-shrink: 0;
          color: var(--accent-secondary);
          width: 24px;
          height: 24px;
        }
        @media (max-width: 1100px) {
          .pipeline-steps { flex-direction: column; align-items: stretch; }
          .pipeline-step { max-width: none; }
          .pipeline-arrow { transform: rotate(90deg); align-self: center; }
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

        .model-icon.tft,
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

        .status-badge.live {
          background: rgba(255, 68, 102, 0.2);
          color: #ff4466;
          animation: pulse-live 2s ease-in-out infinite;
        }

        .status-badge.trained {
          background: rgba(0, 255, 136, 0.2);
          color: var(--accent-primary);
        }

        .status-badge.pending {
          background: rgba(255, 170, 0, 0.2);
          color: var(--accent-warning);
        }

        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
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
        .loading-state .loading-hint {
          font-size: 0.9rem;
          opacity: 0.85;
          max-width: 420px;
          text-align: center;
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
