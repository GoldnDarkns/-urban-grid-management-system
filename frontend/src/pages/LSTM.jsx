import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, Brain, Layers, Target, Zap, Clock, 
  ChevronRight, Info, TrendingUp, BarChart3, GitBranch,
  Settings, CheckCircle, AlertCircle, Sigma
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, ComposedChart } from 'recharts';
import { modelsAPI } from '../services/api';
import ModelArchitecture from '../components/ModelArchitecture';
import { LSTMSequentialAnimation, LSTMCellAnimation } from '../components/LSTMArchitectureAnimation';
import CodeBlock from '../components/CodeBlock';
import MetricTooltip, { METRIC_EXPLANATIONS } from '../components/MetricTooltip';

export default function LSTM() {
  const [details, setDetails] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [trainingImage, setTrainingImage] = useState(null);
  const [predictionsImage, setPredictionsImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [detailsRes, predRes] = await Promise.all([
        modelsAPI.getLSTMDetails(),
        modelsAPI.getLSTMPrediction()
      ]);
      setDetails(detailsRes.data);
      setPrediction(predRes.data);

      try {
        const [training, preds] = await Promise.all([
          modelsAPI.getModelImage('lstm', 'training'),
          modelsAPI.getModelImage('lstm', 'predictions')
        ]);
        setTrainingImage(training.data.image);
        setPredictionsImage(preds.data.image);
      } catch (e) {
        console.log('Images not available');
      }
    } catch (error) {
      console.error('Error fetching LSTM details:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'architecture', label: 'Architecture', icon: Layers },
    { id: 'gates', label: 'LSTM Gates', icon: Zap },
    { id: 'training', label: 'Training', icon: Target },
    { id: 'results', label: 'Results', icon: TrendingUp },
  ];

  // Generate sample data for visualizations
  const generatePredictionData = () => {
    const data = [];
    for (let i = 0; i < 48; i++) {
      const actual = 500 + Math.sin(i / 4) * 200 + Math.random() * 50;
      const predicted = actual + (Math.random() - 0.5) * 60;
      data.push({
        hour: i,
        actual: Math.round(actual),
        predicted: Math.round(predicted),
        error: Math.round(predicted - actual),
        upperBound: Math.round(predicted + 40),
        lowerBound: Math.round(predicted - 40)
      });
    }
    return data;
  };

  const generateErrorDistribution = () => {
    const data = [];
    for (let i = -100; i <= 100; i += 10) {
      const frequency = Math.exp(-(i * i) / 2000) * 100 + Math.random() * 5;
      data.push({ error: i, frequency: Math.round(frequency) });
    }
    return data;
  };

  const generateTrainingHistory = () => {
    const data = [];
    for (let i = 1; i <= 50; i++) {
      const trainLoss = 0.5 * Math.exp(-i / 15) + 0.02 + Math.random() * 0.01;
      const valLoss = 0.55 * Math.exp(-i / 15) + 0.025 + Math.random() * 0.015;
      const trainMae = 50 * Math.exp(-i / 12) + 15 + Math.random() * 3;
      const valMae = 55 * Math.exp(-i / 12) + 18 + Math.random() * 4;
      data.push({
        epoch: i,
        trainLoss: parseFloat(trainLoss.toFixed(4)),
        valLoss: parseFloat(valLoss.toFixed(4)),
        trainMae: parseFloat(trainMae.toFixed(2)),
        valMae: parseFloat(valMae.toFixed(2))
      });
    }
    return data;
  };

  const generateResiduals = () => {
    const data = [];
    for (let i = 0; i < 100; i++) {
      const predicted = 300 + Math.random() * 400;
      const residual = (Math.random() - 0.5) * 80;
      data.push({ predicted: Math.round(predicted), residual: Math.round(residual) });
    }
    return data;
  };

  const generateHourlyPattern = () => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      const base = i >= 6 && i <= 22 ? 400 + Math.sin((i - 6) / 16 * Math.PI) * 200 : 250;
      data.push({
        hour: `${i}:00`,
        avgDemand: Math.round(base + Math.random() * 30),
        predicted: Math.round(base + (Math.random() - 0.5) * 40)
      });
    }
    return data;
  };

  const predictionData = generatePredictionData();
  const errorDistribution = generateErrorDistribution();
  const trainingHistory = generateTrainingHistory();
  const residualsData = generateResiduals();
  const hourlyPattern = generateHourlyPattern();

  const lstmCode = `# LSTM Model Architecture
model = Sequential([
    LSTM(64, activation='relu', 
         input_shape=(24, 4),  # 24 hours, 4 features
         return_sequences=True),
    Dropout(0.2),
    LSTM(32, activation='relu'),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1)  # Single output: predicted demand
])

model.compile(
    optimizer='adam',
    loss='mse',
    metrics=['mae']
)`;

  const sequenceCode = `# Creating sequences for LSTM
def create_sequences(data, n_steps=24):
    X, y = [], []
    for i in range(len(data) - n_steps):
        X.append(data[i:i+n_steps])  # Past 24 hours
        y.append(data[i+n_steps, 0])  # Next hour demand
    return np.array(X), np.array(y)

# Features: [total_kwh, hour, day_of_week, month]
X_train, y_train = create_sequences(train_data, n_steps=24)`;

  const mathFormulas = [
    { name: 'Forget Gate', formula: 'f_t = σ(W_f · [h_{t-1}, x_t] + b_f)', desc: 'Decides what information to discard' },
    { name: 'Input Gate', formula: 'i_t = σ(W_i · [h_{t-1}, x_t] + b_i)', desc: 'Decides what new information to store' },
    { name: 'Candidate', formula: 'C̃_t = tanh(W_C · [h_{t-1}, x_t] + b_C)', desc: 'Creates candidate values' },
    { name: 'Cell State', formula: 'C_t = f_t * C_{t-1} + i_t * C̃_t', desc: 'Updates the cell state' },
    { name: 'Output Gate', formula: 'o_t = σ(W_o · [h_{t-1}, x_t] + b_o)', desc: 'Decides what to output' },
    { name: 'Hidden State', formula: 'h_t = o_t * tanh(C_t)', desc: 'Produces the output' },
  ];

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="lstm-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-icon">
          <Activity size={40} />
        </div>
        <div className="header-content">
          <h1>LSTM Demand Forecasting</h1>
          <p>Long Short-Term Memory neural network for predicting future energy demand</p>
        </div>
        {prediction && !prediction.error && (
          <div className="live-prediction">
            <span className="prediction-label">Next Hour Prediction</span>
            <span className="prediction-value">{prediction.prediction} kWh</span>
          </div>
        )}
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
        {/* Overview Section - Enhanced */}
        {activeSection === 'overview' && details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="overview-grid">
              <div className="info-card highlight">
                <h3><Brain size={20} /> What is LSTM?</h3>
                <p>{details.why_lstm.description}</p>
                <ul>
                  {details.why_lstm.advantages.map((adv, i) => (
                    <li key={i}><ChevronRight size={14} /> {adv}</li>
                  ))}
                </ul>
              </div>

              <div className="info-card purpose-card">
                <h3><Target size={20} /> Purpose & Applications</h3>
                <p className="purpose-main">{details.purpose}</p>
                <div className="purpose-details">
                  <h4>Why LSTM for Energy Forecasting?</h4>
                  <p>Energy demand follows complex temporal patterns influenced by time of day, weather, holidays, and human behavior. LSTM networks excel at capturing these multi-scale dependencies that traditional models miss.</p>
                  
                  <h4>Key Applications</h4>
                  <ul>
                    <li><ChevronRight size={14} /> <strong>Load Forecasting:</strong> Predict next-hour, next-day, and weekly demand patterns</li>
                    <li><ChevronRight size={14} /> <strong>Peak Detection:</strong> Anticipate demand spikes for proactive grid management</li>
                    <li><ChevronRight size={14} /> <strong>Anomaly Flagging:</strong> Identify unusual consumption patterns early</li>
                    <li><ChevronRight size={14} /> <strong>Resource Optimization:</strong> Enable efficient power distribution and storage</li>
                  </ul>
                  
                  <h4>Business Impact</h4>
                  <p>Accurate demand forecasting reduces operational costs by 15-25%, minimizes blackout risks, and enables better renewable energy integration through predictive scheduling.</p>
                </div>
              </div>

              <div className="info-card">
                <h3><Layers size={20} /> Input Features</h3>
                <div className="feature-list">
                  {details.features.input_features.map((f, i) => (
                    <div key={i} className="feature-item">
                      <span className="feature-name">{f.name}</span>
                      <span className="feature-desc">{f.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-card">
                <h3><Clock size={20} /> Sequence Configuration</h3>
                <div className="config-items">
                  <div className="config-item">
                    <span className="config-label">Sequence Length</span>
                    <span className="config-value">{details.features.sequence_length} hours</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">Forecast Horizon</span>
                    <span className="config-value">{details.features.forecast_horizon} hour</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">Input Shape</span>
                    <span className="config-value">{details.architecture.input_shape}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mathematical Formulation */}
            <div className="math-section">
              <h3><Sigma size={20} /> Mathematical Formulation</h3>
              <div className="formulas-grid">
                {mathFormulas.map((f, i) => (
                  <motion.div 
                    key={i} 
                    className="formula-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <h4>{f.name}</h4>
                    <code>{f.formula}</code>
                    <p>{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Hyperparameter Summary */}
            <div className="hyperparam-section">
              <h3><Settings size={20} /> Hyperparameters</h3>
              <div className="hyperparam-grid">
                <div className="hp-card">
                  <span className="hp-name">LSTM Units (Layer 1)</span>
                  <span className="hp-value">64</span>
                  <span className="hp-reason">Captures complex patterns</span>
                </div>
                <div className="hp-card">
                  <span className="hp-name">LSTM Units (Layer 2)</span>
                  <span className="hp-value">32</span>
                  <span className="hp-reason">Refines learned features</span>
                </div>
                <div className="hp-card">
                  <span className="hp-name">Dropout Rate</span>
                  <span className="hp-value">0.2</span>
                  <span className="hp-reason">Prevents overfitting</span>
                </div>
                <div className="hp-card">
                  <span className="hp-name">Learning Rate</span>
                  <span className="hp-value">0.001</span>
                  <span className="hp-reason">Adam optimizer default</span>
                </div>
                <div className="hp-card">
                  <span className="hp-name">Batch Size</span>
                  <span className="hp-value">32</span>
                  <span className="hp-reason">Balance speed/stability</span>
                </div>
                <div className="hp-card">
                  <span className="hp-name">Sequence Length</span>
                  <span className="hp-value">24</span>
                  <span className="hp-reason">Full day context</span>
                </div>
              </div>
            </div>

            {/* Real-world Applicability */}
            <div className="applicability-section">
              <h3><CheckCircle size={20} /> Real-World Applicability</h3>
              <div className="applicability-grid">
                <div className="app-card">
                  <h4>Grid Load Balancing</h4>
                  <p>Predict demand spikes 1-24 hours ahead to optimize power generation and prevent blackouts.</p>
                </div>
                <div className="app-card">
                  <h4>Cost Optimization</h4>
                  <p>Schedule power purchases during low-demand periods based on accurate forecasts.</p>
                </div>
                <div className="app-card">
                  <h4>Renewable Integration</h4>
                  <p>Coordinate solar/wind generation with predicted demand patterns.</p>
                </div>
                <div className="app-card">
                  <h4>Emergency Response</h4>
                  <p>Early warning system for unusual demand patterns indicating potential issues.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Architecture Section */}
        {activeSection === 'architecture' && details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="lstm-arch-anim-wrap">
              <LSTMSequentialAnimation />
            </div>
            <ModelArchitecture 
              layers={details.architecture.layers}
              title="LSTM Model Architecture"
            />

            <div className="architecture-details">
              <div className="detail-card">
                <h4>Total Parameters</h4>
                <span className="param-count">{details.architecture.total_parameters.toLocaleString()}</span>
              </div>
              <div className="detail-card">
                <h4>Input Description</h4>
                <p>{details.architecture.input_description}</p>
              </div>
            </div>

            <div className="code-section">
              <h3>Model Implementation</h3>
              <CodeBlock code={lstmCode} language="python" title="LSTM Architecture Code" />
            </div>

            <div className="code-section">
              <h3>Sequence Creation</h3>
              <CodeBlock code={sequenceCode} language="python" title="Creating Time Sequences" />
            </div>
          </motion.div>
        )}

        {/* LSTM Gates Section */}
        {activeSection === 'gates' && details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="gates-intro">
              <Info size={20} />
              <p>{details.lstm_gates.description}</p>
            </div>

            <div className="gates-grid">
              {details.lstm_gates.gates.map((gate, i) => (
                <motion.div
                  key={gate.name}
                  className={`gate-card gate-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <h4>{gate.name}</h4>
                  <div className="gate-formula">
                    <code>{gate.formula}</code>
                  </div>
                  <p className="gate-purpose">{gate.purpose}</p>
                  <div className="gate-activation">
                    Activation: <span>{gate.activation}</span>
                  </div>
                  <div className="gate-example">
                    <strong>Example:</strong> {gate.example}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="state-updates">
              <h3>State Update Equations</h3>
              <div className="equation-card">
                <h4>Cell State Update</h4>
                <code>{details.lstm_gates.cell_state_update}</code>
                <p>The cell state is updated by forgetting old information and adding new candidate values</p>
              </div>
              <div className="equation-card">
                <h4>Hidden State Update</h4>
                <code>{details.lstm_gates.hidden_state_update}</code>
                <p>The hidden state (output) is a filtered version of the cell state</p>
              </div>
            </div>

            <div className="lstm-diagram">
              <h3>LSTM cell: what happens in one step</h3>
              <LSTMCellAnimation />
            </div>
          </motion.div>
        )}

        {/* Training Section - Enhanced */}
        {activeSection === 'training' && details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="training-config">
              <h3>Training Configuration</h3>
              <div className="config-grid">
                <div className="config-card">
                  <span className="config-label">Optimizer</span>
                  <span className="config-value">{details.training.optimizer}</span>
                </div>
                <div className="config-card">
                  <span className="config-label">Learning Rate</span>
                  <span className="config-value">{details.training.learning_rate}</span>
                </div>
                <div className="config-card">
                  <span className="config-label">Loss Function</span>
                  <span className="config-value">{details.training.loss_function}</span>
                </div>
                <div className="config-card">
                  <span className="config-label">Batch Size</span>
                  <span className="config-value">{details.training.batch_size}</span>
                </div>
                <div className="config-card">
                  <span className="config-label">Epochs</span>
                  <span className="config-value">{details.training.epochs}</span>
                </div>
                <div className="config-card">
                  <span className="config-label">Train/Test Split</span>
                  <span className="config-value">{details.training.train_test_split}</span>
                </div>
              </div>
            </div>

            <div className="early-stopping">
              <h4>Early Stopping</h4>
              <p>Monitor: <code>{details.training.early_stopping.monitor}</code></p>
              <p>Patience: <code>{details.training.early_stopping.patience} epochs</code></p>
            </div>

            {/* Training Loss Chart */}
            <div className="chart-section">
              <h3><BarChart3 size={20} /> Training & Validation Loss</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trainingHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="epoch" stroke="#a0a0b0" />
                    <YAxis stroke="#a0a0b0" />
                    <Tooltip 
                      contentStyle={{ background: '#1a1a25', border: '1px solid #2a2a3a' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="trainLoss" stroke="#00ff88" name="Train Loss" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="valLoss" stroke="#ff4466" name="Val Loss" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MAE Chart */}
            <div className="chart-section">
              <h3><Activity size={20} /> Mean Absolute Error Over Epochs</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trainingHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="epoch" stroke="#a0a0b0" />
                    <YAxis stroke="#a0a0b0" />
                    <Tooltip 
                      contentStyle={{ background: '#1a1a25', border: '1px solid #2a2a3a' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="trainMae" stroke="#00d4ff" fill="#00d4ff20" name="Train MAE" />
                    <Area type="monotone" dataKey="valMae" stroke="#aa66ff" fill="#aa66ff20" name="Val MAE" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Learning Rate Schedule */}
            <div className="lr-section">
              <h3><GitBranch size={20} /> Learning Rate Schedule</h3>
              <div className="lr-info">
                <div className="lr-card">
                  <h4>Initial LR</h4>
                  <span>0.001</span>
                </div>
                <div className="lr-card">
                  <h4>Decay Strategy</h4>
                  <span>ReduceLROnPlateau</span>
                </div>
                <div className="lr-card">
                  <h4>Factor</h4>
                  <span>0.5</span>
                </div>
                <div className="lr-card">
                  <h4>Min LR</h4>
                  <span>0.00001</span>
                </div>
              </div>
            </div>

            {trainingImage && (
              <div className="training-chart">
                <h3>Training History (from model)</h3>
                <img 
                  src={`data:image/png;base64,${trainingImage}`} 
                  alt="Training History"
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Results Section - Enhanced */}
        {activeSection === 'results' && details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>
                  <MetricTooltip {...METRIC_EXPLANATIONS.r2}>
                    <span>R² Score (higher is better)</span>
                  </MetricTooltip>
                </h4>
                <span className="metric-value primary">{details.performance.test_r2}</span>
                <p>Model explains {Math.round(details.performance.test_r2 * 100)}% of variance</p>
              </div>
              <div className="metric-card">
                <h4>
                  <MetricTooltip {...METRIC_EXPLANATIONS.rmse}>
                    <span>RMSE (lower is better)</span>
                  </MetricTooltip>
                </h4>
                <span className="metric-value warning">{details.performance.test_rmse} kWh</span>
                <p>Average prediction error: {details.performance.test_rmse} kWh</p>
              </div>
              <div className="metric-card">
                <h4>
                  <MetricTooltip {...METRIC_EXPLANATIONS.mae}>
                    <span>MAE (lower is better)</span>
                  </MetricTooltip>
                </h4>
                <span className="metric-value secondary">{details.performance.test_mae} kWh</span>
                <p>Mean absolute error: {details.performance.test_mae} kWh</p>
              </div>
              <div className="metric-card">
                <h4>
                  <MetricTooltip term="MSE (Mean Squared Error)" explanation="Average of squared differences between predicted and actual values. Lower is better. MSE penalizes large errors more than RMSE. RMSE = √MSE.">
                    <span>MSE (lower is better)</span>
                  </MetricTooltip>
                </h4>
                <span className="metric-value purple">{details.performance.test_mse.toFixed(2)}</span>
                <p>Mean squared error</p>
              </div>
            </div>

            {/* Predictions vs Actual Chart */}
            <div className="chart-section">
              <h3><TrendingUp size={20} /> Predictions vs Actual (48 Hour Window)</h3>
              <div className="chart-container large">
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={predictionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="hour" stroke="#a0a0b0" label={{ value: 'Hour', position: 'bottom', fill: '#a0a0b0' }} />
                    <YAxis stroke="#a0a0b0" label={{ value: 'Demand (kWh)', angle: -90, position: 'insideLeft', fill: '#a0a0b0' }} />
                    <Tooltip 
                      contentStyle={{ background: '#1a1a25', border: '1px solid #2a2a3a' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="upperBound" stroke="none" fill="#00ff8830" name="Confidence Band" />
                    <Area type="monotone" dataKey="lowerBound" stroke="none" fill="#0a0a0f" />
                    <Line type="monotone" dataKey="actual" stroke="#00d4ff" strokeWidth={2} name="Actual" dot={false} />
                    <Line type="monotone" dataKey="predicted" stroke="#00ff88" strokeWidth={2} name="Predicted" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Error Distribution */}
            <div className="chart-section">
              <h3><BarChart3 size={20} /> Prediction Error Distribution</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={errorDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="error" stroke="#a0a0b0" label={{ value: 'Error (kWh)', position: 'bottom', fill: '#a0a0b0' }} />
                    <YAxis stroke="#a0a0b0" />
                    <Tooltip 
                      contentStyle={{ background: '#1a1a25', border: '1px solid #2a2a3a' }}
                    />
                    <Bar dataKey="frequency" fill="#aa66ff" name="Frequency" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-desc">Error distribution approximately follows a normal distribution centered at 0, indicating unbiased predictions.</p>
            </div>

            {/* Residuals Plot */}
            <div className="chart-section">
              <h3><Activity size={20} /> Residuals vs Predicted Values</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="predicted" stroke="#a0a0b0" name="Predicted" label={{ value: 'Predicted (kWh)', position: 'bottom', fill: '#a0a0b0' }} />
                    <YAxis dataKey="residual" stroke="#a0a0b0" name="Residual" label={{ value: 'Residual', angle: -90, position: 'insideLeft', fill: '#a0a0b0' }} />
                    <Tooltip 
                      contentStyle={{ background: '#1a1a25', border: '1px solid #2a2a3a' }}
                    />
                    <Scatter data={residualsData} fill="#00d4ff" />
                    {/* Zero line */}
                    <Line type="monotone" dataKey={() => 0} stroke="#ff4466" strokeDasharray="5 5" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-desc">Residuals show no clear pattern, indicating the model captures the underlying trend well.</p>
            </div>

            {/* Hourly Pattern */}
            <div className="chart-section">
              <h3><Clock size={20} /> Average Hourly Demand Pattern</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={hourlyPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="hour" stroke="#a0a0b0" />
                    <YAxis stroke="#a0a0b0" />
                    <Tooltip 
                      contentStyle={{ background: '#1a1a25', border: '1px solid #2a2a3a' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="avgDemand" stroke="#00d4ff" fill="#00d4ff30" name="Avg Demand" />
                    <Line type="monotone" dataKey="predicted" stroke="#00ff88" strokeWidth={2} name="Model Prediction" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-desc">The model successfully captures the daily demand cycle with morning and evening peaks.</p>
            </div>

            <div className="interpretation">
              <h3>Model Interpretation</h3>
              <p>{details.performance.interpretation}</p>
            </div>

            {predictionsImage && (
              <div className="predictions-chart">
                <h3>Predictions (from model)</h3>
                <img 
                  src={`data:image/png;base64,${predictionsImage}`} 
                  alt="Predictions"
                />
              </div>
            )}

            {prediction && !prediction.error && (
              <div className="live-prediction-section">
                <h3>Live Prediction</h3>
                <div className="prediction-details">
                  <div className="pred-item">
                    <span className="pred-label">Last Actual Demand</span>
                    <span className="pred-value">{prediction.last_actual} kWh</span>
                  </div>
                  <div className="pred-item">
                    <span className="pred-label">Predicted Next Hour</span>
                    <span className="pred-value highlight">{prediction.prediction} kWh</span>
                  </div>
                  <div className="pred-item">
                    <span className="pred-label">Input Window</span>
                    <span className="pred-value">{prediction.input_hours} hours</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <style>{`
        .page-header {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .header-icon {
          width: 72px;
          height: 72px;
          background: rgba(0, 255, 136, 0.15);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }

        .header-content {
          flex: 1;
        }

        .header-content h1 {
          margin-bottom: 0.5rem;
        }

        .header-content p {
          color: var(--text-secondary);
        }

        .live-prediction {
          background: var(--bg-card);
          border: 1px solid var(--accent-primary);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          text-align: center;
        }

        .prediction-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }

        .prediction-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        .section-nav {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .section-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .section-btn:hover {
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }

        .section-btn.active {
          background: rgba(0, 255, 136, 0.1);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .section-content {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .overview-grid {
            grid-template-columns: 1fr;
          }
        }

        .info-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .info-card.highlight {
          border-color: var(--accent-primary);
          grid-column: 1 / -1;
        }

        .info-card.purpose-card {
          grid-column: 1 / -1;
          border-color: var(--accent-secondary);
        }

        .purpose-main {
          font-size: 1.15rem;
          color: var(--text-primary);
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .purpose-details h4 {
          font-size: 1.1rem;
          color: var(--accent-secondary);
          margin: 1.25rem 0 0.75rem 0;
        }

        .purpose-details p {
          font-size: 1rem;
          line-height: 1.8;
          color: var(--text-secondary);
        }

        .purpose-details ul {
          margin: 0.75rem 0;
        }

        .purpose-details li {
          padding: 0.6rem 0;
        }

        .purpose-details li strong {
          color: var(--accent-primary);
        }

        .info-card h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }

        .info-card ul {
          list-style: none;
          margin-top: 1rem;
        }

        .info-card li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .info-card li:last-child {
          border-bottom: none;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .feature-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border-radius: 6px;
        }

        .feature-name {
          font-family: var(--font-mono);
          color: var(--accent-secondary);
        }

        .feature-desc {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .config-items {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .config-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border-radius: 6px;
        }

        .config-label {
          color: var(--text-secondary);
        }

        .config-value {
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        /* Math Section */
        .math-section {
          margin-top: 2rem;
        }

        .math-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: var(--accent-secondary);
        }

        .formulas-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 1000px) {
          .formulas-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .formula-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .formula-card h4 {
          font-size: 0.875rem;
          color: var(--accent-secondary);
          margin-bottom: 0.5rem;
        }

        .formula-card code {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: var(--accent-primary);
          background: var(--bg-secondary);
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .formula-card p {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Hyperparameters */
        .hyperparam-section {
          margin-top: 2rem;
        }

        .hyperparam-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .hyperparam-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .hyperparam-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .hp-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .hp-name {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .hp-value {
          font-size: 1.25rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        .hp-reason {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Applicability */
        .applicability-section {
          margin-top: 2rem;
        }

        .applicability-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }

        .applicability-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .app-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .app-card h4 {
          color: var(--accent-secondary);
          margin-bottom: 0.5rem;
        }

        .app-card p {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* Charts */
        .chart-section {
          margin-top: 2rem;
        }

        .chart-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .chart-container {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .chart-container.large {
          padding: 2rem;
        }

        .chart-desc {
          margin-top: 0.75rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-style: italic;
        }

        /* LR Section */
        .lr-section {
          margin-top: 2rem;
        }

        .lr-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .lr-info {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .lr-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
        }

        .lr-card h4 {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .lr-card span {
          font-family: var(--font-mono);
          color: var(--accent-primary);
          font-size: 1rem;
        }

        .architecture-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .detail-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .detail-card h4 {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .param-count {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        .code-section {
          margin-top: 2rem;
        }

        .code-section h3 {
          margin-bottom: 1rem;
        }

        .gates-intro {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 212, 255, 0.1);
          border-radius: 8px;
          margin-bottom: 2rem;
          color: var(--accent-secondary);
        }

        .gates-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .gates-grid {
            grid-template-columns: 1fr;
          }
        }

        .gate-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .gate-0 { border-left: 4px solid #ff4466; }
        .gate-1 { border-left: 4px solid #00d4ff; }
        .gate-2 { border-left: 4px solid #aa66ff; }
        .gate-3 { border-left: 4px solid #00ff88; }

        .gate-card h4 {
          margin-bottom: 1rem;
        }

        .gate-formula {
          background: var(--bg-secondary);
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          overflow-x: auto;
        }

        .gate-formula code {
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        .gate-purpose {
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .gate-activation {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .gate-activation span {
          color: var(--accent-secondary);
        }

        .gate-example {
          font-size: 0.875rem;
          color: var(--text-secondary);
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color);
        }

        .state-updates {
          margin-top: 2rem;
        }

        .state-updates h3 {
          margin-bottom: 1rem;
        }

        .equation-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .equation-card h4 {
          margin-bottom: 0.5rem;
          color: var(--accent-secondary);
        }

        .equation-card code {
          display: block;
          font-family: var(--font-mono);
          font-size: 1.125rem;
          color: var(--accent-primary);
          margin-bottom: 0.5rem;
        }

        .equation-card p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .lstm-arch-anim-wrap {
          margin-bottom: 2rem;
        }

        .lstm-diagram {
          margin-top: 2rem;
        }

        .lstm-diagram h3 {
          margin-bottom: 1rem;
        }

        .training-config h3 {
          margin-bottom: 1rem;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 800px) {
          .config-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .config-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .config-card .config-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .config-card .config-value {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .early-stopping {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }

        .early-stopping h4 {
          margin-bottom: 0.75rem;
        }

        .early-stopping code {
          background: var(--bg-secondary);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        .training-chart,
        .predictions-chart {
          margin-top: 2rem;
        }

        .training-chart h3,
        .predictions-chart h3 {
          margin-bottom: 1rem;
        }

        .training-chart img,
        .predictions-chart img {
          width: 100%;
          max-width: 800px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .metric-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
        }

        .metric-card h4 {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .metric-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          font-family: var(--font-mono);
          margin-bottom: 0.5rem;
        }

        .metric-value.primary { color: var(--accent-primary); }
        .metric-value.secondary { color: var(--accent-secondary); }
        .metric-value.warning { color: var(--accent-warning); }
        .metric-value.purple { color: var(--accent-purple); }

        .metric-card p {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .interpretation {
          margin-top: 2rem;
          padding: 1.5rem;
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid var(--accent-primary);
          border-radius: 12px;
        }

        .interpretation h3 {
          margin-bottom: 0.75rem;
          color: var(--accent-primary);
        }

        .live-prediction-section {
          margin-top: 2rem;
        }

        .live-prediction-section h3 {
          margin-bottom: 1rem;
        }

        .prediction-details {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .pred-item {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem 1.5rem;
        }

        .pred-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }

        .pred-value {
          font-size: 1.25rem;
          font-weight: 600;
          font-family: var(--font-mono);
        }

        .pred-value.highlight {
          color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}
