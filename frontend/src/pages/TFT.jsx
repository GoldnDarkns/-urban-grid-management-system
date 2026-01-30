import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Brain, Layers, Target, Zap, Clock, GitCompare,
  ChevronRight, Info, TrendingUp, BarChart3, CheckCircle,
  Settings, AlertCircle, Sigma
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { modelsAPI } from '../services/api';

export default function TFT() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    (modelsAPI.getTFTPrediction ? modelsAPI.getTFTPrediction() : modelsAPI.getLSTMPrediction())
      .then((res) => setPrediction(res?.data))
      .catch(() => setPrediction(null))
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'how-it-works', label: 'How TFT Works', icon: Info },
    { id: 'why-tft', label: 'Why TFT for Our Task', icon: Target },
    { id: 'vs-lstm', label: 'TFT vs LSTM', icon: GitCompare },
    { id: 'architecture', label: 'Architecture', icon: Layers },
    { id: 'tft-flow', label: 'TFT Data Flow', icon: Zap },
    { id: 'training', label: 'Training', icon: Settings },
    { id: 'results', label: 'Results', icon: TrendingUp },
  ];

  const hourlyPattern = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    demand: Math.round(400 + Math.sin((i - 6) / 8) * 150 + (i >= 8 && i <= 20 ? 80 : 0)),
  }));

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="tft-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-icon">
          <Activity size={40} />
        </div>
        <div className="header-content">
          <h1>TFT Demand Forecasting</h1>
          <p>Temporal Fusion Transformer — interpretable multi-horizon time series forecasting for urban energy demand</p>
        </div>
        {prediction && !prediction.error && (
          <div className="live-prediction">
            <span className="prediction-label">Next Hour (TFT)</span>
            <span className="prediction-value">{prediction.prediction} kWh</span>
          </div>
        )}
      </motion.div>

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
        {activeSection === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-content">
            <div className="overview-grid">
              <div className="info-card highlight">
                <h3><Brain size={20} /> What is TFT?</h3>
                <p>
                  The <strong>Temporal Fusion Transformer (TFT)</strong> is an attention-based architecture that combines high-performance multi-horizon forecasting with <strong>interpretable</strong> insights into temporal dynamics. It handles complex mixtures of inputs: static covariates (e.g. zone ID), known future inputs (e.g. time of day), and historical time series (demand, weather, AQI) without assuming how they interact.
                </p>
                <ul>
                  <li><ChevronRight size={14} /> <strong>Variable selection</strong> — learns which features matter</li>
                  <li><ChevronRight size={14} /> <strong>Multi-horizon</strong> — predicts next hour, next day, or week in one model</li>
                  <li><ChevronRight size={14} /> <strong>Interpretable attention</strong> — see which past time steps drive predictions</li>
                  <li><ChevronRight size={14} /> <strong>Gating & residual connections</strong> — stable training and better accuracy</li>
                </ul>
              </div>
              <div className="info-card">
                <h3><Layers size={20} /> Key Components</h3>
                <div className="feature-list">
                  <div className="feature-item"><span className="feature-name">Recurrent layers</span><span className="feature-desc">Local temporal processing</span></div>
                  <div className="feature-item"><span className="feature-name">Self-attention</span><span className="feature-desc">Long-term dependencies</span></div>
                  <div className="feature-item"><span className="feature-name">Variable selection</span><span className="feature-desc">Relevant features per input type</span></div>
                  <div className="feature-item"><span className="feature-name">Gating layers</span><span className="feature-desc">Suppress unnecessary components</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'how-it-works' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-content how-it-works-section">
            <div className="how-intro">
              <h3><Brain size={20} /> How TFT Works — The 4 Key Features</h3>
              <p>TFT is a state-of-the-art deep learning model for time series forecasting. Here's what makes it special and how each component contributes to accurate, interpretable predictions.</p>
            </div>

            <div className="how-grid">
              {/* 1. Handles Multiple Inputs */}
              <div className="how-card">
                <div className="how-card-header">
                  <span className="how-num">1</span>
                  <h4>Handles Multiple Inputs</h4>
                </div>
                <p className="how-desc">TFT works with three types of inputs simultaneously, unlike simpler models that only use past values:</p>
                <div className="how-inputs-list">
                  <div className="how-input-item">
                    <span className="input-type past">Past Time-Series</span>
                    <span className="input-example">Historical demand, weather, AQI readings</span>
                  </div>
                  <div className="how-input-item">
                    <span className="input-type future">Future Known Inputs</span>
                    <span className="input-example">Holidays, promotions, time of day, day of week</span>
                  </div>
                  <div className="how-input-item">
                    <span className="input-type static">Static Information</span>
                    <span className="input-example">Zone ID, city, infrastructure type, region</span>
                  </div>
                </div>
                <div className="how-benefit">
                  <Zap size={16} />
                  <span>This allows TFT to understand context that simpler models miss — like knowing demand will spike on a holiday.</span>
                </div>
              </div>

              {/* 2. Uses Attention Mechanism */}
              <div className="how-card">
                <div className="how-card-header">
                  <span className="how-num">2</span>
                  <h4>Uses Attention Mechanism</h4>
                </div>
                <p className="how-desc">Like GPT focuses on important words in a sentence, TFT focuses on important <strong>time steps</strong>:</p>
                <div className="attention-visual">
                  <div className="attention-row">
                    <span className="time-label">Past Days</span>
                    <div className="attention-bars">
                      <div className="attn-bar" style={{ height: '30%' }}><span>Mon</span></div>
                      <div className="attn-bar" style={{ height: '45%' }}><span>Tue</span></div>
                      <div className="attn-bar" style={{ height: '20%' }}><span>Wed</span></div>
                      <div className="attn-bar highlight" style={{ height: '90%' }}><span>Thu</span></div>
                      <div className="attn-bar highlight" style={{ height: '85%' }}><span>Fri</span></div>
                      <div className="attn-bar" style={{ height: '40%' }}><span>Sat</span></div>
                      <div className="attn-bar" style={{ height: '35%' }}><span>Sun</span></div>
                    </div>
                  </div>
                  <p className="attention-caption">Higher bars = more attention. TFT learns that Thursday & Friday matter most for predicting Monday demand.</p>
                </div>
                <div className="how-questions">
                  <div className="question-item"><ChevronRight size={14} /> Which past days matter most?</div>
                  <div className="question-item"><ChevronRight size={14} /> Which weeks influence the forecast?</div>
                  <div className="question-item"><ChevronRight size={14} /> Are recent hours more important than last week?</div>
                </div>
              </div>

              {/* 3. Variable Selection Network */}
              <div className="how-card">
                <div className="how-card-header">
                  <span className="how-num">3</span>
                  <h4>Variable Selection Network</h4>
                </div>
                <p className="how-desc">TFT automatically learns which features are important and which are irrelevant — no manual feature engineering needed:</p>
                <div className="variable-selection-visual">
                  <div className="var-item important">
                    <span className="var-name">Promotion</span>
                    <div className="var-bar"><div className="var-fill" style={{ width: '95%' }}></div></div>
                    <span className="var-pct">95%</span>
                  </div>
                  <div className="var-item important">
                    <span className="var-name">Hour of Day</span>
                    <div className="var-bar"><div className="var-fill" style={{ width: '88%' }}></div></div>
                    <span className="var-pct">88%</span>
                  </div>
                  <div className="var-item">
                    <span className="var-name">Past Demand</span>
                    <div className="var-bar"><div className="var-fill" style={{ width: '75%' }}></div></div>
                    <span className="var-pct">75%</span>
                  </div>
                  <div className="var-item">
                    <span className="var-name">AQI</span>
                    <div className="var-bar"><div className="var-fill" style={{ width: '45%' }}></div></div>
                    <span className="var-pct">45%</span>
                  </div>
                  <div className="var-item low">
                    <span className="var-name">Temperature</span>
                    <div className="var-bar"><div className="var-fill" style={{ width: '20%' }}></div></div>
                    <span className="var-pct">20%</span>
                  </div>
                </div>
                <div className="how-example">
                  <Info size={16} />
                  <span><strong>Example:</strong> Promotion may matter more than temperature for retail energy demand. TFT discovers this automatically.</span>
                </div>
              </div>

              {/* 4. Interpretable Forecasting */}
              <div className="how-card">
                <div className="how-card-header">
                  <span className="how-num">4</span>
                  <h4>Interpretable Forecasting</h4>
                </div>
                <p className="how-desc">Unlike black-box LSTMs, TFT can <strong>explain</strong> its predictions:</p>
                <div className="interpretability-list">
                  <div className="interp-item">
                    <BarChart3 size={18} />
                    <div>
                      <strong>Feature Importance</strong>
                      <span>See which inputs drove the prediction (e.g., "demand was high because of holiday")</span>
                    </div>
                  </div>
                  <div className="interp-item">
                    <Clock size={18} />
                    <div>
                      <strong>Time-Step Attention</strong>
                      <span>See which past time steps the model focused on (e.g., "looked at last Monday")</span>
                    </div>
                  </div>
                  <div className="interp-item">
                    <Sigma size={18} />
                    <div>
                      <strong>Contribution of Each Input</strong>
                      <span>Quantify how much each variable contributed to the final forecast</span>
                    </div>
                  </div>
                </div>
                <div className="how-benefit">
                  <CheckCircle size={16} />
                  <span>This interpretability is critical for grid operators who need to explain decisions to regulators and stakeholders.</span>
                </div>
              </div>
            </div>

            <div className="how-summary">
              <h4><CheckCircle size={18} /> Summary: Why These 4 Features Matter</h4>
              <p>TFT combines <strong>multi-input handling</strong>, <strong>attention</strong>, <strong>variable selection</strong>, and <strong>interpretability</strong> into one model. This means:</p>
              <ul>
                <li><ChevronRight size={14} /> More accurate forecasts because it uses all relevant context</li>
                <li><ChevronRight size={14} /> Automatic feature importance — no manual tuning</li>
                <li><ChevronRight size={14} /> Explainable predictions for compliance and trust</li>
                <li><ChevronRight size={14} /> State-of-the-art performance on time series benchmarks</li>
              </ul>
            </div>
          </motion.div>
        )}

        {activeSection === 'why-tft' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-content">
            <div className="info-card purpose-card">
              <h3><Target size={20} /> Why We Use TFT for Urban Grid Management</h3>
              <p className="purpose-main">Urban energy demand is driven by time of day, weather, AQI, traffic, and zone-level static factors. TFT is built for exactly this mix of inputs and horizons.</p>
              <div className="purpose-details">
                <h4>Task compatibility</h4>
                <ul>
                  <li><ChevronRight size={14} /> <strong>Static covariates:</strong> Zone ID, city, infrastructure type — TFT has dedicated static input processing.</li>
                  <li><ChevronRight size={14} /> <strong>Known future inputs:</strong> Hour of day, day of week, holidays — TFT uses these in the decoder for multi-horizon forecasts.</li>
                  <li><ChevronRight size={14} /> <strong>Historical series:</strong> Past demand, weather, AQI, traffic — TFT’s variable selection identifies which matter most.</li>
                </ul>
                <h4>Why TFT over alternatives</h4>
                <p>Unlike pure RNNs/LSTMs, TFT provides variable importance and temporal attention, so grid operators can see <em>why</em> a forecast is high or low. This is critical for compliance and operational trust. It also typically outperforms LSTM and statistical baselines on multi-horizon benchmarks.</p>
                <h4>Business impact</h4>
                <p>Accurate, interpretable demand forecasts reduce operational costs, support peak shaving and renewable integration, and enable explainable decisions for regulators and stakeholders.</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'vs-lstm' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-content">
            <div className="comparison-intro">
              <Info size={20} />
              <p>We keep <strong>LSTM</strong> in the pipeline as a comparison baseline. Here’s why TFT is our primary choice for demand forecasting.</p>
            </div>
            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Aspect</th>
                    <th>TFT (Primary)</th>
                    <th>LSTM (Comparison)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><strong>Interpretability</strong></td><td>Variable importance + temporal attention</td><td>Largely black-box</td></tr>
                  <tr><td><strong>Input types</strong></td><td>Static, known future, historical — explicit handling</td><td>Single sequence; no explicit static/future split</td></tr>
                  <tr><td><strong>Multi-horizon</strong></td><td>One model, multiple horizons</td><td>Typically one horizon per setup</td></tr>
                  <tr><td><strong>Variable selection</strong></td><td>Built-in; learns which features matter</td><td>Manual or implicit</td></tr>
                  <tr><td><strong>Long-range dependencies</strong></td><td>Self-attention across time</td><td>Gated recurrence only</td></tr>
                  <tr><td><strong>Benchmarks</strong></td><td>State-of-the-art on many TS benchmarks</td><td>Strong but often behind TFT</td></tr>
                </tbody>
              </table>
            </div>
            <div className="applicability-section">
              <h3><CheckCircle size={20} /> Summary</h3>
              <p>TFT is our primary demand forecasting model because it matches our task (mixed inputs, multi-horizon, need for interpretability) and delivers better accuracy and explainability. LSTM remains available in Advanced Analytics for direct comparison and validation.</p>
            </div>
          </motion.div>
        )}

        {activeSection === 'architecture' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-content">
            <div className="info-card">
              <h3><Layers size={20} /> TFT Architecture</h3>
              <p>Inputs are split into <strong>static</strong> (zone/city), <strong>known future</strong> (time features), and <strong>historical</strong> (past demand, weather, AQI). Each passes through variable selection → LSTM/GRU for encoding → interpretable self-attention → gated residual layers → multi-horizon output.</p>
              <div className="tft-arch-blocks">
                <div className="tft-block input"><strong>INPUT</strong><br/>Static · Known future · Historical</div>
                <div className="tft-arrow">→</div>
                <div className="tft-block vs"><strong>Variable Selection</strong><br/>Learns which inputs matter</div>
                <div className="tft-arrow">→</div>
                <div className="tft-block lstm"><strong>LSTM Encoder</strong><br/>Processes past sequence</div>
                <div className="tft-arrow">→</div>
                <div className="tft-block grn"><strong>GRN</strong><br/>Gated Residual Network</div>
                <div className="tft-arrow">→</div>
                <div className="tft-block attn"><strong>Interpretable Attention</strong><br/>Which time steps matter</div>
                <div className="tft-arrow">→</div>
                <div className="tft-block out"><strong>OUTPUT</strong><br/>Multi-horizon + quantiles</div>
              </div>
              <div className="config-items">
                <div className="config-item"><span className="config-label">Hidden size</span><span className="config-value">64</span></div>
                <div className="config-item"><span className="config-label">Attention heads</span><span className="config-value">4</span></div>
                <div className="config-item"><span className="config-label">Dropout</span><span className="config-value">0.1</span></div>
                <div className="config-item"><span className="config-label">Max horizon</span><span className="config-value">24–168 (configurable)</span></div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'tft-flow' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-content">
            <div className="info-card tft-flow-card">
              <h3><Zap size={20} /> TFT: What Happens in One Forward Pass</h3>
              <p className="flow-intro">At each step, TFT receives <strong>static</strong> (zone, city), <strong>known future</strong> (hour, day), and <strong>historical</strong> (past demand, weather, AQI). Variable selection weights each input; the LSTM encodes the past; attention picks which time steps matter; GRN combines; output heads produce multi-horizon forecasts (and quantiles).</p>
              <div className="tft-flow-diagram">
                <div className="flow-row inputs">
                  <span className="flow-label">C<sub>s</sub></span>
                  <div className="flow-box static">Static (zone, city)</div>
                  <span className="flow-label">X<sub>future</sub></span>
                  <div className="flow-box future">Known future (time)</div>
                  <span className="flow-label">X<sub>past</sub></span>
                  <div className="flow-box past">Historical (demand, AQI, …)</div>
                </div>
                <div className="flow-arrow-down">↓</div>
                <div className="flow-row">
                  <div className="flow-box wide vs">Variable Selection (σ) — weights per variable</div>
                </div>
                <div className="flow-arrow-down">↓</div>
                <div className="flow-row">
                  <div className="flow-box wide lstm">LSTM Encoder — hidden state over time</div>
                </div>
                <div className="flow-arrow-down">↓</div>
                <div className="flow-row">
                  <div className="flow-box wide attn">Interpretable Multi-Head Attention — which past steps matter</div>
                </div>
                <div className="flow-arrow-down">↓</div>
                <div className="flow-row">
                  <div className="flow-box wide grn">Gated Residual Network (GRN) — combine + gate</div>
                </div>
                <div className="flow-arrow-down">↓</div>
                <div className="flow-row">
                  <div className="flow-box out">Output: ŷ (multi-horizon, quantiles)</div>
                </div>
              </div>
              <div className="flow-legend">
                <span><span className="leg static"></span> Static</span>
                <span><span className="leg future"></span> Known future</span>
                <span><span className="leg past"></span> Historical</span>
                <span><span className="leg vs"></span> Variable selection</span>
                <span><span className="leg lstm"></span> LSTM</span>
                <span><span className="leg attn"></span> Attention</span>
                <span><span className="leg grn"></span> GRN</span>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'training' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-content">
            <div className="info-card">
              <h3><Settings size={20} /> TFT Training</h3>
              <p>TFT is trained with quantile loss over multiple horizons so the model outputs uncertainty (e.g. 10th, 50th, 90th percentile).</p>
              <div className="config-items">
                <div className="config-item"><span className="config-label">Optimizer</span><span className="config-value">Adam</span></div>
                <div className="config-item"><span className="config-label">Learning rate</span><span className="config-value">1e-3</span></div>
                <div className="config-item"><span className="config-label">Loss</span><span className="config-value">Quantile (multi-horizon)</span></div>
                <div className="config-item"><span className="config-label">Epochs</span><span className="config-value">100</span></div>
                <div className="config-item"><span className="config-label">Batch size</span><span className="config-value">64</span></div>
                <div className="config-item"><span className="config-label">Dropout</span><span className="config-value">0.1</span></div>
              </div>
              <p className="training-note">Variable selection and attention are trained end-to-end; we can inspect weights after training to see which inputs and time steps the model uses most.</p>
            </div>
          </motion.div>
        )}

        {activeSection === 'results' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-content">
            <div className="chart-section">
              <h3><TrendingUp size={20} /> Example Hourly Demand Pattern (TFT captures this)</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={hourlyPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="hour" stroke="#a0a0b0" />
                    <YAxis stroke="#a0a0b0" />
                    <Tooltip contentStyle={{ background: '#1a1a25', border: '1px solid #2a2a3a' }} />
                    <Area type="monotone" dataKey="demand" stroke="#00ff88" fill="#00ff8830" name="Demand (kWh)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {prediction && !prediction.error && (
              <div className="live-prediction-section">
                <h3>Live TFT Prediction</h3>
                <div className="prediction-details">
                  <div className="pred-item">
                    <span className="pred-label">Last Actual</span>
                    <span className="pred-value">{prediction.last_actual} kWh</span>
                  </div>
                  <div className="pred-item">
                    <span className="pred-label">Next Hour (TFT)</span>
                    <span className="pred-value highlight">{prediction.prediction} kWh</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <style>{`
        .tft-page .page-header { display: flex; align-items: flex-start; gap: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .tft-page .header-icon { width: 72px; height: 72px; background: rgba(0, 255, 136, 0.15); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: var(--accent-primary); }
        .tft-page .header-content { flex: 1; }
        .tft-page .header-content h1 { margin-bottom: 0.5rem; }
        .tft-page .header-content p { color: var(--text-secondary); }
        .tft-page .live-prediction { background: var(--bg-card); border: 1px solid var(--accent-primary); border-radius: 12px; padding: 1rem 1.5rem; text-align: center; }
        .tft-page .prediction-label { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
        .tft-page .prediction-value { font-size: 1.5rem; font-weight: 700; font-family: var(--font-mono); color: var(--accent-primary); }
        .tft-page .section-nav { display: flex; gap: 0.5rem; margin-bottom: 2rem; overflow-x: auto; padding-bottom: 0.5rem; }
        .tft-page .section-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-secondary); cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .tft-page .section-btn:hover { border-color: var(--accent-primary); color: var(--text-primary); }
        .tft-page .section-btn.active { background: rgba(0, 255, 136, 0.1); border-color: var(--accent-primary); color: var(--accent-primary); }
        .tft-page .overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        @media (max-width: 900px) { .tft-page .overview-grid { grid-template-columns: 1fr; } }
        .tft-page .info-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; }
        .tft-page .info-card.highlight { border-color: var(--accent-primary); grid-column: 1 / -1; }
        .tft-page .info-card.purpose-card { grid-column: 1 / -1; border-color: var(--accent-secondary); }
        .tft-page .info-card h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--accent-primary); }
        .tft-page .info-card ul { list-style: none; margin-top: 1rem; }
        .tft-page .info-card li { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); }
        .tft-page .info-card li:last-child { border-bottom: none; }
        .tft-page .purpose-main { font-size: 1.15rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
        .tft-page .purpose-details h4 { font-size: 1.1rem; color: var(--accent-secondary); margin: 1.25rem 0 0.75rem 0; }
        .tft-page .purpose-details p, .tft-page .purpose-details ul { margin: 0.75rem 0; color: var(--text-secondary); }
        .tft-page .feature-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .tft-page .feature-item { display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg-secondary); border-radius: 6px; }
        .tft-page .feature-name { font-family: var(--font-mono); color: var(--accent-secondary); }
        .tft-page .feature-desc { color: var(--text-secondary); font-size: 0.875rem; }
        .tft-page .config-items { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
        .tft-page .config-item { display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg-secondary); border-radius: 6px; }
        .tft-page .config-label { color: var(--text-secondary); }
        .tft-page .config-value { font-family: var(--font-mono); color: var(--accent-primary); }
        .tft-page .comparison-intro { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: rgba(0, 212, 255, 0.1); border-radius: 8px; margin-bottom: 1.5rem; color: var(--accent-secondary); }
        .tft-page .comparison-table-wrap { overflow-x: auto; margin-bottom: 1.5rem; }
        .tft-page .comparison-table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: 8px; overflow: hidden; }
        .tft-page .comparison-table th, .tft-page .comparison-table td { padding: 0.75rem 1rem; border: 1px solid var(--border-color); text-align: left; }
        .tft-page .comparison-table th { background: var(--bg-secondary); color: var(--accent-primary); }
        .tft-page .comparison-table td:first-child { font-weight: 500; }
        .tft-page .comparison-table td:nth-child(2) { color: var(--accent-primary); }
        .tft-page .applicability-section { margin-top: 1.5rem; padding: 1rem; background: rgba(0, 255, 136, 0.08); border-radius: 8px; }
        .tft-page .applicability-section h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; color: var(--accent-primary); }
        .tft-page .chart-section { margin-top: 1.5rem; }
        .tft-page .chart-section h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .tft-page .chart-container { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; }
        .tft-page .live-prediction-section { margin-top: 2rem; }
        .tft-page .prediction-details { display: flex; gap: 2rem; flex-wrap: wrap; }
        .tft-page .pred-item { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.5rem; }
        .tft-page .pred-label { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
        .tft-page .pred-value { font-size: 1.25rem; font-weight: 600; font-family: var(--font-mono); }
        .tft-page .pred-value.highlight { color: var(--accent-primary); }
        .tft-page .tft-arch-blocks { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 1.5rem 0; }
        .tft-page .tft-block { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; text-align: center; min-width: 100px; }
        .tft-page .tft-block.input { background: rgba(170, 102, 255, 0.2); border: 1px solid #aa66ff; color: #aa66ff; }
        .tft-page .tft-block.vs { background: rgba(255, 68, 102, 0.15); border: 1px solid #ff4466; color: #ff4466; }
        .tft-page .tft-block.lstm { background: rgba(0, 212, 255, 0.15); border: 1px solid #00d4ff; color: #00d4ff; }
        .tft-page .tft-block.grn { background: rgba(255, 170, 0, 0.15); border: 1px solid #ffaa00; color: #ffaa00; }
        .tft-page .tft-block.attn { background: rgba(0, 255, 136, 0.15); border: 1px solid #00ff88; color: #00ff88; }
        .tft-page .tft-block.out { background: rgba(0, 255, 136, 0.25); border: 1px solid #00ff88; color: #00ff88; }
        .tft-page .tft-arrow { color: var(--text-secondary); font-size: 1.25rem; }
        .tft-page .tft-flow-card { max-width: 100%; }
        .tft-page .flow-intro { margin-bottom: 1.5rem; color: var(--text-secondary); line-height: 1.6; }
        .tft-page .tft-flow-diagram { background: var(--bg-secondary); border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border-color); }
        .tft-page .flow-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.75rem; margin: 0.5rem 0; }
        .tft-page .flow-row.inputs { gap: 0.5rem; }
        .tft-page .flow-label { font-size: 0.8rem; color: var(--text-muted); margin-right: 0.25rem; }
        .tft-page .flow-box { padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; }
        .tft-page .flow-box.static { background: rgba(170, 102, 255, 0.2); border: 1px solid #aa66ff; }
        .tft-page .flow-box.future { background: rgba(0, 212, 255, 0.2); border: 1px solid #00d4ff; }
        .tft-page .flow-box.past { background: rgba(255, 170, 0, 0.2); border: 1px solid #ffaa00; }
        .tft-page .flow-box.vs { background: rgba(255, 68, 102, 0.15); border: 1px solid #ff4466; }
        .tft-page .flow-box.lstm { background: rgba(0, 212, 255, 0.15); border: 1px solid #00d4ff; }
        .tft-page .flow-box.attn { background: rgba(0, 255, 136, 0.15); border: 1px solid #00ff88; }
        .tft-page .flow-box.grn { background: rgba(255, 170, 0, 0.15); border: 1px solid #ffaa00; }
        .tft-page .flow-box.out { background: rgba(0, 255, 136, 0.25); border: 1px solid #00ff88; }
        .tft-page .flow-box.wide { min-width: 280px; text-align: center; }
        .tft-page .flow-arrow-down { text-align: center; color: var(--accent-primary); font-size: 1.25rem; margin: 0.25rem 0; }
        .tft-page .flow-legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-secondary); }
        .tft-page .flow-legend .leg { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 0.35rem; vertical-align: middle; }
        .tft-page .flow-legend .leg.static { background: #aa66ff; }
        .tft-page .flow-legend .leg.future { background: #00d4ff; }
        .tft-page .flow-legend .leg.past { background: #ffaa00; }
        .tft-page .flow-legend .leg.vs { background: #ff4466; }
        .tft-page .flow-legend .leg.lstm { background: #00d4ff; }
        .tft-page .flow-legend .leg.attn { background: #00ff88; }
        .tft-page .flow-legend .leg.grn { background: #ffaa00; }
        .tft-page .training-note { margin-top: 1rem; font-size: 0.9rem; color: var(--text-secondary); }

        /* How It Works Section */
        .tft-page .how-it-works-section { max-width: 100%; }
        .tft-page .how-intro { margin-bottom: 2rem; }
        .tft-page .how-intro h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; color: var(--accent-primary); }
        .tft-page .how-intro p { color: var(--text-secondary); font-size: 1.05rem; }
        .tft-page .how-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        @media (max-width: 1000px) { .tft-page .how-grid { grid-template-columns: 1fr; } }
        .tft-page .how-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; transition: border-color 0.2s; }
        .tft-page .how-card:hover { border-color: var(--accent-primary); }
        .tft-page .how-card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .tft-page .how-num { width: 32px; height: 32px; background: var(--accent-primary); color: var(--bg-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; }
        .tft-page .how-card h4 { margin: 0; font-size: 1.1rem; color: var(--text-primary); }
        .tft-page .how-desc { color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5; }
        .tft-page .how-inputs-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
        .tft-page .how-input-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: 6px; }
        .tft-page .input-type { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 4px; text-transform: uppercase; }
        .tft-page .input-type.past { background: rgba(255, 170, 0, 0.2); color: #ffaa00; }
        .tft-page .input-type.future { background: rgba(0, 212, 255, 0.2); color: #00d4ff; }
        .tft-page .input-type.static { background: rgba(170, 102, 255, 0.2); color: #aa66ff; }
        .tft-page .input-example { font-size: 0.85rem; color: var(--text-secondary); }
        .tft-page .how-benefit { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.75rem; background: rgba(0, 255, 136, 0.08); border-radius: 6px; font-size: 0.9rem; color: var(--text-secondary); }
        .tft-page .how-benefit svg { flex-shrink: 0; color: var(--accent-primary); margin-top: 0.1rem; }
        .tft-page .attention-visual { margin: 1rem 0; }
        .tft-page .attention-row { display: flex; align-items: flex-end; gap: 0.5rem; }
        .tft-page .time-label { font-size: 0.75rem; color: var(--text-muted); writing-mode: vertical-rl; transform: rotate(180deg); }
        .tft-page .attention-bars { display: flex; align-items: flex-end; gap: 0.35rem; height: 80px; flex: 1; }
        .tft-page .attn-bar { width: 100%; background: rgba(0, 212, 255, 0.3); border-radius: 4px 4px 0 0; display: flex; align-items: flex-end; justify-content: center; transition: background 0.2s; }
        .tft-page .attn-bar.highlight { background: var(--accent-primary); }
        .tft-page .attn-bar span { font-size: 0.65rem; color: var(--text-muted); padding-bottom: 0.25rem; }
        .tft-page .attention-caption { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; font-style: italic; }
        .tft-page .how-questions { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
        .tft-page .question-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); }
        .tft-page .question-item svg { color: var(--accent-secondary); flex-shrink: 0; }
        .tft-page .variable-selection-visual { display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0; }
        .tft-page .var-item { display: flex; align-items: center; gap: 0.75rem; }
        .tft-page .var-name { width: 100px; font-size: 0.85rem; color: var(--text-secondary); }
        .tft-page .var-bar { flex: 1; height: 16px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden; }
        .tft-page .var-fill { height: 100%; background: linear-gradient(90deg, var(--accent-primary), #00d4ff); border-radius: 4px; transition: width 0.5s; }
        .tft-page .var-item.important .var-fill { background: linear-gradient(90deg, var(--accent-primary), #00ff88); }
        .tft-page .var-item.low .var-fill { background: linear-gradient(90deg, #555, #777); }
        .tft-page .var-pct { width: 40px; font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted); text-align: right; }
        .tft-page .how-example { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.75rem; background: rgba(0, 212, 255, 0.08); border-radius: 6px; font-size: 0.9rem; color: var(--text-secondary); margin-top: 1rem; }
        .tft-page .how-example svg { flex-shrink: 0; color: var(--accent-secondary); margin-top: 0.1rem; }
        .tft-page .interpretability-list { display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; }
        .tft-page .interp-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; }
        .tft-page .interp-item svg { flex-shrink: 0; color: var(--accent-primary); margin-top: 0.2rem; }
        .tft-page .interp-item div { display: flex; flex-direction: column; gap: 0.25rem; }
        .tft-page .interp-item strong { font-size: 0.95rem; color: var(--text-primary); }
        .tft-page .interp-item span { font-size: 0.85rem; color: var(--text-secondary); }
        .tft-page .how-summary { background: rgba(0, 255, 136, 0.08); border: 1px solid rgba(0, 255, 136, 0.25); border-radius: 12px; padding: 1.5rem; }
        .tft-page .how-summary h4 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; color: var(--accent-primary); }
        .tft-page .how-summary p { color: var(--text-secondary); margin-bottom: 1rem; }
        .tft-page .how-summary ul { list-style: none; margin: 0; }
        .tft-page .how-summary li { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; color: var(--text-secondary); }
        .tft-page .how-summary li svg { color: var(--accent-primary); flex-shrink: 0; }
      `}</style>
    </div>
  );
}
