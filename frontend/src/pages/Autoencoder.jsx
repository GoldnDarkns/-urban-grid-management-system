import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, Brain, Layers, Target, Zap, 
  ChevronRight, Info, Search, ArrowDown, ArrowUp
} from 'lucide-react';
import { modelsAPI, analyticsAPI } from '../services/api';
import ModelArchitecture from '../components/ModelArchitecture';
import CodeBlock from '../components/CodeBlock';

export default function Autoencoder() {
  const [details, setDetails] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [trainingImage, setTrainingImage] = useState(null);
  const [reconstructionImage, setReconstructionImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [detailsRes, anomaliesRes] = await Promise.all([
        modelsAPI.getAutoencoderDetails(),
        analyticsAPI.getAnomalies(2.0, 20)
      ]);
      setDetails(detailsRes.data);
      setAnomalies(anomaliesRes.data.anomalies || []);

      try {
        const [training, reconstruction] = await Promise.all([
          modelsAPI.getModelImage('autoencoder', 'training'),
          modelsAPI.getModelImage('autoencoder', 'reconstruction')
        ]);
        setTrainingImage(training.data.image);
        setReconstructionImage(reconstruction.data.image);
      } catch (e) {
        console.log('Images not available');
      }
    } catch (error) {
      console.error('Error fetching autoencoder details:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'architecture', label: 'Architecture', icon: Layers },
    { id: 'how-it-works', label: 'How It Works', icon: Zap },
    { id: 'training', label: 'Training', icon: Target },
    { id: 'anomalies', label: 'Detected Anomalies', icon: AlertTriangle },
  ];

  const autoencoderCode = `# Autoencoder Architecture
model = Sequential([
    # Encoder
    Input(shape=(6,)),  # 6 input features
    Dense(16, activation='relu'),
    Dropout(0.2),
    Dense(8, activation='relu'),
    Dense(3, activation='relu'),  # Bottleneck (latent space)
    
    # Decoder
    Dense(8, activation='relu'),
    Dense(16, activation='relu'),
    Dropout(0.2),
    Dense(6, activation='linear')  # Reconstruct input
])

model.compile(optimizer='adam', loss='mse')`;

  const anomalyDetectionCode = `# Anomaly Detection Logic
def detect_anomalies(model, data, threshold_percentile=95):
    # Get reconstructions
    reconstructions = model.predict(data)
    
    # Calculate reconstruction error (MSE per sample)
    mse = np.mean(np.power(data - reconstructions, 2), axis=1)
    
    # Set threshold at 95th percentile
    threshold = np.percentile(mse, threshold_percentile)
    
    # Samples with error > threshold are anomalies
    anomalies = mse > threshold
    
    return anomalies, mse, threshold`;

  const cyclicalEncodingCode = `# Cyclical Feature Encoding
# Ensures hour 23 is close to hour 0 (circular continuity)

def encode_cyclical(value, max_value):
    sin_encoded = np.sin(2 * np.pi * value / max_value)
    cos_encoded = np.cos(2 * np.pi * value / max_value)
    return sin_encoded, cos_encoded

# Example: Hour 23 and Hour 0 are neighbors
hour_sin, hour_cos = encode_cyclical(hour, 24)
dow_sin, dow_cos = encode_cyclical(day_of_week, 7)`;

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="autoencoder-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-icon warning">
          <AlertTriangle size={40} />
        </div>
        <div className="header-content">
          <h1>Autoencoder Anomaly Detection</h1>
          <p>Unsupervised neural network for detecting unusual energy consumption patterns</p>
        </div>
        <div className="anomaly-summary">
          <span className="anomaly-label">Detected Anomalies</span>
          <span className="anomaly-value">{anomalies.length}</span>
        </div>
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
        {/* Overview Section */}
        {activeSection === 'overview' && details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="overview-grid">
              <div className="info-card highlight">
                <h3><Brain size={20} /> What is an Autoencoder?</h3>
                <p>{details.why_autoencoder.description}</p>
                <ul>
                  {details.why_autoencoder.advantages.map((adv, i) => (
                    <li key={i}><ChevronRight size={14} /> {adv}</li>
                  ))}
                </ul>
              </div>

              <div className="info-card">
                <h3><Target size={20} /> Purpose</h3>
                <p>{details.purpose}</p>
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
                <div className="cyclical-note">
                  <Info size={16} />
                  <span>{details.features.why_cyclical}</span>
                </div>
              </div>

              <div className="info-card">
                <h3><Zap size={20} /> Compression</h3>
                <div className="compression-visual">
                  <div className="compression-item">
                    <span className="comp-value">{details.architecture.input_dim}</span>
                    <span className="comp-label">Input Features</span>
                  </div>
                  <ArrowDown className="comp-arrow" />
                  <div className="compression-item bottleneck">
                    <span className="comp-value">{details.architecture.latent_dim}</span>
                    <span className="comp-label">Latent Space</span>
                  </div>
                  <ArrowUp className="comp-arrow" />
                  <div className="compression-item">
                    <span className="comp-value">{details.architecture.input_dim}</span>
                    <span className="comp-label">Output Features</span>
                  </div>
                </div>
                <div className="compression-ratio">
                  {details.architecture.compression_ratio}
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
            <div className="architecture-visual">
              <h3>Encoder-Decoder Architecture</h3>
              <div className="arch-flow">
                {/* Encoder */}
                <div className="arch-section encoder">
                  <h4>Encoder</h4>
                  <p>Compresses input to latent representation</p>
                  <div className="layer-stack">
                    {details.architecture.encoder.map((layer, i) => (
                      <motion.div
                        key={i}
                        className={`layer-block ${layer.name === 'Latent Space' ? 'bottleneck' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <span className="layer-name">{layer.name}</span>
                        {layer.units && <span className="layer-units">{layer.units} units</span>}
                        {layer.activation && <span className="layer-activation">{layer.activation}</span>}
                        {layer.rate && <span className="layer-rate">rate: {layer.rate}</span>}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Decoder */}
                <div className="arch-section decoder">
                  <h4>Decoder</h4>
                  <p>Reconstructs input from latent space</p>
                  <div className="layer-stack">
                    {details.architecture.decoder.map((layer, i) => (
                      <motion.div
                        key={i}
                        className="layer-block"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 + 0.5 }}
                      >
                        <span className="layer-name">{layer.name}</span>
                        {layer.units && <span className="layer-units">{layer.units} units</span>}
                        {layer.activation && <span className="layer-activation">{layer.activation}</span>}
                        {layer.rate && <span className="layer-rate">rate: {layer.rate}</span>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="code-section">
              <h3>Model Implementation</h3>
              <CodeBlock code={autoencoderCode} language="python" title="Autoencoder Architecture" />
            </div>

            <div className="code-section">
              <h3>Cyclical Feature Encoding</h3>
              <CodeBlock code={cyclicalEncodingCode} language="python" title="Time Feature Encoding" />
            </div>
          </motion.div>
        )}

        {/* How It Works Section */}
        {activeSection === 'how-it-works' && details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="how-it-works">
              <h3>Anomaly Detection Process</h3>
              <div className="process-steps">
                {details.why_autoencoder.how_it_works.map((step, i) => (
                  <motion.div
                    key={i}
                    className="process-step"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                  >
                    <div className="step-number">{i + 1}</div>
                    <div className="step-content">{step}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="anomaly-explanation">
              <h3>Why This Works</h3>
              <div className="explanation-grid">
                <div className="explanation-card normal">
                  <h4>Normal Data</h4>
                  <div className="explanation-visual">
                    <div className="data-point">Input</div>
                    <div className="arrow">→</div>
                    <div className="data-point">Encode</div>
                    <div className="arrow">→</div>
                    <div className="data-point">Decode</div>
                    <div className="arrow">→</div>
                    <div className="data-point match">≈ Input</div>
                  </div>
                  <p>Low reconstruction error because the model learned this pattern</p>
                </div>
                <div className="explanation-card anomaly">
                  <h4>Anomaly</h4>
                  <div className="explanation-visual">
                    <div className="data-point">Input</div>
                    <div className="arrow">→</div>
                    <div className="data-point">Encode</div>
                    <div className="arrow">→</div>
                    <div className="data-point">Decode</div>
                    <div className="arrow">→</div>
                    <div className="data-point mismatch">≠ Input</div>
                  </div>
                  <p>High reconstruction error because pattern was never learned</p>
                </div>
              </div>
            </div>

            <div className="threshold-section">
              <h3>Anomaly Threshold</h3>
              <div className="threshold-info">
                <div className="threshold-card">
                  <h4>Method</h4>
                  <p>{details.anomaly_detection.threshold_method}</p>
                </div>
                <div className="threshold-card">
                  <h4>Threshold Value</h4>
                  <span className="threshold-value">{details.anomaly_detection.threshold_value}</span>
                </div>
                <div className="threshold-card">
                  <h4>Interpretation</h4>
                  <p>{details.anomaly_detection.interpretation}</p>
                </div>
              </div>
            </div>

            <div className="code-section">
              <h3>Detection Algorithm</h3>
              <CodeBlock code={anomalyDetectionCode} language="python" title="Anomaly Detection Logic" />
            </div>
          </motion.div>
        )}

        {/* Training Section */}
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
                  <span className="config-label">Validation Split</span>
                  <span className="config-value">{details.training.validation_split * 100}%</span>
                </div>
              </div>
            </div>

            <div className="metrics-section">
              <h3>Performance Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <h4>Mean Reconstruction Error</h4>
                  <span className="metric-value primary">{details.performance.mean_reconstruction_error}</span>
                </div>
                <div className="metric-card">
                  <h4>Std Reconstruction Error</h4>
                  <span className="metric-value secondary">{details.performance.std_reconstruction_error}</span>
                </div>
                <div className="metric-card">
                  <h4>Anomaly Rate</h4>
                  <span className="metric-value warning">{details.performance.anomaly_rate}</span>
                </div>
                <div className="metric-card">
                  <h4>Top Anomaly Score</h4>
                  <span className="metric-value danger">{details.performance.top_anomaly_score}</span>
                </div>
              </div>
            </div>

            {trainingImage && (
              <div className="training-chart">
                <h3>Training History</h3>
                <img 
                  src={`data:image/png;base64,${trainingImage}`} 
                  alt="Training History"
                />
              </div>
            )}

            {reconstructionImage && (
              <div className="reconstruction-chart">
                <h3>Reconstruction Error Distribution</h3>
                <img 
                  src={`data:image/png;base64,${reconstructionImage}`} 
                  alt="Reconstruction Error"
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Anomalies Section */}
        {activeSection === 'anomalies' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="anomalies-header">
              <h3><AlertTriangle size={20} /> Detected Anomalies</h3>
              <p>Household readings with consumption significantly above baseline</p>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Household</th>
                    <th>Zone</th>
                    <th>Timestamp</th>
                    <th>Consumption (kWh)</th>
                    <th>Baseline (kWh)</th>
                    <th>Multiplier</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((anomaly, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="code">{anomaly.household_id}</td>
                      <td>{anomaly.zone_id}</td>
                      <td className="code">{anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : '-'}</td>
                      <td>
                        <span className="consumption-value">{anomaly.kwh}</span>
                      </td>
                      <td>{anomaly.baseline_hourly}</td>
                      <td>
                        <span className={`multiplier ${anomaly.multiplier > 5 ? 'severe' : anomaly.multiplier > 3 ? 'high' : 'moderate'}`}>
                          {anomaly.multiplier}x
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${anomaly.multiplier > 5 ? 'badge-danger' : anomaly.multiplier > 3 ? 'badge-warning' : 'badge-info'}`}>
                          {anomaly.multiplier > 5 ? 'Severe' : anomaly.multiplier > 3 ? 'High' : 'Moderate'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {anomalies.length === 0 && (
              <div className="no-anomalies">
                <Search size={48} />
                <p>No anomalies detected in recent data</p>
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

        .header-icon.warning {
          background: rgba(255, 170, 0, 0.15);
          color: var(--accent-warning);
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

        .anomaly-summary {
          background: var(--bg-card);
          border: 1px solid var(--accent-warning);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          text-align: center;
        }

        .anomaly-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }

        .anomaly-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-warning);
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
          border-color: var(--accent-warning);
          color: var(--text-primary);
        }

        .section-btn.active {
          background: rgba(255, 170, 0, 0.1);
          border-color: var(--accent-warning);
          color: var(--accent-warning);
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
          border-color: var(--accent-warning);
          grid-column: 1 / -1;
        }

        .info-card h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: var(--accent-warning);
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

        .cyclical-note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(0, 212, 255, 0.1);
          border-radius: 6px;
          font-size: 0.875rem;
          color: var(--accent-secondary);
        }

        .compression-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
        }

        .compression-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 2rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .compression-item.bottleneck {
          border-color: var(--accent-warning);
          background: rgba(255, 170, 0, 0.1);
        }

        .comp-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        .comp-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .comp-arrow {
          color: var(--accent-warning);
        }

        .compression-ratio {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--accent-secondary);
        }

        .architecture-visual {
          margin-bottom: 2rem;
        }

        .architecture-visual h3 {
          margin-bottom: 1rem;
        }

        .arch-flow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 800px) {
          .arch-flow {
            grid-template-columns: 1fr;
          }
        }

        .arch-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .arch-section.encoder {
          border-color: var(--accent-secondary);
        }

        .arch-section.decoder {
          border-color: var(--accent-primary);
        }

        .arch-section h4 {
          margin-bottom: 0.5rem;
        }

        .arch-section p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .layer-stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .layer-block {
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .layer-block.bottleneck {
          border-color: var(--accent-warning);
          background: rgba(255, 170, 0, 0.1);
        }

        .layer-name {
          font-weight: 600;
          flex: 1;
        }

        .layer-units {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-primary);
          padding: 0.2rem 0.5rem;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 4px;
        }

        .layer-activation {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-secondary);
        }

        .layer-rate {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-warning);
        }

        .how-it-works {
          margin-bottom: 2rem;
        }

        .process-steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .process-step {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }

        .step-number {
          width: 36px;
          height: 36px;
          background: var(--accent-warning);
          color: var(--bg-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
        }

        .anomaly-explanation {
          margin: 2rem 0;
        }

        .explanation-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 800px) {
          .explanation-grid {
            grid-template-columns: 1fr;
          }
        }

        .explanation-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .explanation-card.normal {
          border-color: var(--accent-primary);
        }

        .explanation-card.anomaly {
          border-color: var(--accent-danger);
        }

        .explanation-card h4 {
          margin-bottom: 1rem;
        }

        .explanation-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .data-point {
          padding: 0.5rem 1rem;
          background: var(--bg-tertiary);
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .data-point.match {
          background: rgba(0, 255, 136, 0.2);
          color: var(--accent-primary);
        }

        .data-point.mismatch {
          background: rgba(255, 68, 102, 0.2);
          color: var(--accent-danger);
        }

        .arrow {
          color: var(--text-muted);
        }

        .explanation-card p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .threshold-section {
          margin: 2rem 0;
        }

        .threshold-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 800px) {
          .threshold-info {
            grid-template-columns: 1fr;
          }
        }

        .threshold-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .threshold-card h4 {
          color: var(--text-secondary);
          font-size: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .threshold-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-warning);
        }

        .code-section {
          margin-top: 2rem;
        }

        .code-section h3 {
          margin-bottom: 1rem;
        }

        .training-config h3,
        .metrics-section h3 {
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

        .config-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .config-value {
          font-size: 1.125rem;
          font-weight: 600;
          font-family: var(--font-mono);
          color: var(--accent-primary);
        }

        .metrics-section {
          margin-top: 2rem;
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
          font-size: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .metric-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .metric-value.primary { color: var(--accent-primary); }
        .metric-value.secondary { color: var(--accent-secondary); }
        .metric-value.warning { color: var(--accent-warning); }
        .metric-value.danger { color: var(--accent-danger); }

        .training-chart,
        .reconstruction-chart {
          margin-top: 2rem;
        }

        .training-chart h3,
        .reconstruction-chart h3 {
          margin-bottom: 1rem;
        }

        .training-chart img,
        .reconstruction-chart img {
          width: 100%;
          max-width: 800px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .anomalies-header {
          margin-bottom: 1.5rem;
        }

        .anomalies-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--accent-warning);
          margin-bottom: 0.5rem;
        }

        .anomalies-header p {
          color: var(--text-secondary);
        }

        .consumption-value {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--accent-danger);
        }

        .multiplier {
          font-family: var(--font-mono);
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .multiplier.moderate {
          background: rgba(0, 212, 255, 0.2);
          color: var(--accent-secondary);
        }

        .multiplier.high {
          background: rgba(255, 170, 0, 0.2);
          color: var(--accent-warning);
        }

        .multiplier.severe {
          background: rgba(255, 68, 102, 0.2);
          color: var(--accent-danger);
        }

        .no-anomalies {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-secondary);
        }

        .no-anomalies svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .feature-item {
          display: flex;
          justify-content: space-between;
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
      `}</style>
    </div>
  );
}

