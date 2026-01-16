import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Network, Brain, Layers, Target, Zap, 
  ChevronRight, Info, GitBranch, MapPin
} from 'lucide-react';
import { modelsAPI, analyticsAPI, dataAPI } from '../services/api';
import CodeBlock from '../components/CodeBlock';

export default function GNN() {
  const [details, setDetails] = useState(null);
  const [zoneRisk, setZoneRisk] = useState([]);
  const [gridEdges, setGridEdges] = useState(null);
  const [trainingImage, setTrainingImage] = useState(null);
  const [riskImage, setRiskImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [detailsRes, riskRes, edgesRes] = await Promise.all([
        modelsAPI.getGNNDetails(),
        analyticsAPI.getZoneRisk(),
        dataAPI.getGridEdges()
      ]);
      setDetails(detailsRes.data);
      setZoneRisk(riskRes.data.data || []);
      setGridEdges(edgesRes.data);

      try {
        const [training, risk] = await Promise.all([
          modelsAPI.getModelImage('gnn', 'training'),
          modelsAPI.getModelImage('gnn', 'risk')
        ]);
        setTrainingImage(training.data.image);
        setRiskImage(risk.data.image);
      } catch (e) {
        console.log('Images not available');
      }
    } catch (error) {
      console.error('Error fetching GNN details:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'graph', label: 'Graph Structure', icon: GitBranch },
    { id: 'architecture', label: 'Architecture', icon: Layers },
    { id: 'message-passing', label: 'Message Passing', icon: Zap },
    { id: 'risk-scores', label: 'Risk Scores', icon: Target },
  ];

  const gnnCode = `# Graph Neural Network Model
class GNNModel(tf.keras.Model):
    def __init__(self, num_features, num_classes):
        super().__init__()
        # Graph Convolution Layers
        self.conv1 = GraphConvLayer(32, activation='relu')
        self.dropout1 = Dropout(0.3)
        self.conv2 = GraphConvLayer(16, activation='relu')
        self.dropout2 = Dropout(0.3)
        # Classification head
        self.dense = Dense(num_classes, activation='softmax')
    
    def call(self, inputs, training=False):
        x, adjacency = inputs
        
        # First graph convolution
        x = self.conv1(x, adjacency)
        x = self.dropout1(x, training=training)
        
        # Second graph convolution
        x = self.conv2(x, adjacency)
        x = self.dropout2(x, training=training)
        
        # Classify each node
        return self.dense(x)`;

  const graphConvCode = `# Graph Convolution Layer
class GraphConvLayer(tf.keras.layers.Layer):
    def __init__(self, units, activation='relu'):
        super().__init__()
        self.units = units
        self.activation = tf.keras.activations.get(activation)
    
    def build(self, input_shape):
        self.W = self.add_weight(
            shape=(input_shape[-1], self.units),
            initializer='glorot_uniform',
            name='weights'
        )
        self.b = self.add_weight(
            shape=(self.units,),
            initializer='zeros',
            name='bias'
        )
    
    def call(self, x, adjacency):
        # Message passing: aggregate neighbor features
        # H' = A * H * W + b
        h = tf.matmul(adjacency, x)  # Aggregate from neighbors
        h = tf.matmul(h, self.W) + self.b  # Transform
        return self.activation(h)`;

  const adjacencyNormCode = `# Adjacency Matrix Normalization
def normalize_adjacency(A):
    """
    Symmetric normalization: D^(-1/2) * A * D^(-1/2)
    This ensures stable gradient flow and equal neighbor weighting
    """
    # Add self-loops (each node connected to itself)
    A = A + np.eye(A.shape[0])
    
    # Compute degree matrix
    D = np.diag(np.sum(A, axis=1))
    
    # D^(-1/2)
    D_inv_sqrt = np.linalg.inv(np.sqrt(D))
    
    # Normalized adjacency
    A_norm = D_inv_sqrt @ A @ D_inv_sqrt
    
    return A_norm`;

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const highRiskZones = zoneRisk.filter(z => z.risk_level === 'high');
  const mediumRiskZones = zoneRisk.filter(z => z.risk_level === 'medium');

  return (
    <div className="gnn-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-icon purple">
          <Network size={40} />
        </div>
        <div className="header-content">
          <h1>GNN Zone Risk Scoring</h1>
          <p>Graph Neural Network for computing zone risk scores with network effects</p>
        </div>
        <div className="risk-summary">
          <div className="risk-stat high">
            <span className="risk-value">{highRiskZones.length}</span>
            <span className="risk-label">High Risk</span>
          </div>
          <div className="risk-stat medium">
            <span className="risk-value">{mediumRiskZones.length}</span>
            <span className="risk-label">Medium Risk</span>
          </div>
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
                <h3><Brain size={20} /> Why Graph Neural Networks?</h3>
                <p>{details.why_gnn.description}</p>
                <ul>
                  {details.why_gnn.advantages.map((adv, i) => (
                    <li key={i}><ChevronRight size={14} /> {adv}</li>
                  ))}
                </ul>
                <div className="key-insight">
                  <Info size={18} />
                  <p>{details.why_gnn.key_insight}</p>
                </div>
              </div>

              <div className="info-card">
                <h3><Target size={20} /> Purpose</h3>
                <p>{details.purpose}</p>
              </div>

              <div className="info-card">
                <h3><Layers size={20} /> Zone Features</h3>
                <div className="feature-list">
                  {details.features.zone_features.map((f, i) => (
                    <div key={i} className="feature-item">
                      <span className="feature-name">{f.name}</span>
                      <span className="feature-desc">{f.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-card">
                <h3><Zap size={20} /> Metric Features</h3>
                <div className="feature-list">
                  {details.features.metric_features.map((f, i) => (
                    <div key={i} className="feature-item">
                      <span className="feature-name">{f.name}</span>
                      <span className="feature-desc">{f.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="risk-classification">
              <h3>Risk Classification Levels</h3>
              <div className="risk-levels">
                {details.risk_classification.classes.map((cls, i) => (
                  <div key={i} className={`risk-level-card level-${cls.level}`}>
                    <span className="level-name">{cls.name}</span>
                    <span className="level-score">{cls.score_range}</span>
                    <p>{cls.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="risk-factors">
              <h3>Risk Score Factors</h3>
              <div className="factors-grid">
                {details.risk_classification.factors.map((factor, i) => (
                  <div key={i} className="factor-item">
                    <span className="factor-text">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Graph Structure Section */}
        {activeSection === 'graph' && details && gridEdges && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="graph-stats">
              <div className="graph-stat-card">
                <span className="stat-value">{details.graph_structure.nodes}</span>
                <span className="stat-label">Nodes (Zones)</span>
              </div>
              <div className="graph-stat-card">
                <span className="stat-value">{gridEdges.count}</span>
                <span className="stat-label">Edges</span>
              </div>
              <div className="graph-stat-card">
                <span className="stat-value">{details.graph_structure.adjacency_matrix}</span>
                <span className="stat-label">Adjacency Matrix</span>
              </div>
            </div>

            <div className="graph-info-cards">
              <div className="graph-info-card">
                <h4>Topology</h4>
                <p>{details.graph_structure.topology}</p>
              </div>
              <div className="graph-info-card">
                <h4>Normalization</h4>
                <p>{details.graph_structure.normalization}</p>
              </div>
            </div>

            <div className="graph-visualization">
              <h3>Zone Connectivity Graph</h3>
              <div className="graph-container">
                <svg viewBox="0 0 600 400" className="graph-svg">
                  {/* Draw edges first */}
                  {gridEdges.edges.slice(0, 30).map((edge, i) => {
                    const fromIdx = parseInt(edge.from_zone.split('_')[1]) - 1;
                    const toIdx = parseInt(edge.to_zone.split('_')[1]) - 1;
                    const fromX = 100 + (fromIdx % 5) * 100;
                    const fromY = 80 + Math.floor(fromIdx / 5) * 80;
                    const toX = 100 + (toIdx % 5) * 100;
                    const toY = 80 + Math.floor(toIdx / 5) * 80;
                    return (
                      <line
                        key={i}
                        x1={fromX}
                        y1={fromY}
                        x2={toX}
                        y2={toY}
                        stroke="#2a2a3a"
                        strokeWidth="1"
                      />
                    );
                  })}
                  {/* Draw nodes */}
                  {zoneRisk.slice(0, 20).map((zone, i) => {
                    const x = 100 + (i % 5) * 100;
                    const y = 80 + Math.floor(i / 5) * 80;
                    const color = zone.risk_level === 'high' ? '#ff4466' : 
                                  zone.risk_level === 'medium' ? '#ffaa00' : '#00ff88';
                    return (
                      <g key={zone.zone_id}>
                        <circle
                          cx={x}
                          cy={y}
                          r="25"
                          fill="#1a1a25"
                          stroke={color}
                          strokeWidth="2"
                        />
                        <text
                          x={x}
                          y={y + 4}
                          textAnchor="middle"
                          fill={color}
                          fontSize="10"
                          fontWeight="600"
                        >
                          Z{i + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="graph-legend">
                <div className="legend-item">
                  <span className="legend-dot high"></span>
                  High Risk
                </div>
                <div className="legend-item">
                  <span className="legend-dot medium"></span>
                  Medium Risk
                </div>
                <div className="legend-item">
                  <span className="legend-dot low"></span>
                  Low Risk
                </div>
              </div>
            </div>

            <div className="code-section">
              <h3>Adjacency Normalization</h3>
              <CodeBlock code={adjacencyNormCode} language="python" title="Symmetric Normalization" />
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
              <h3>GNN Architecture</h3>
              <div className="arch-layers">
                {details.architecture.layers.map((layer, i) => (
                  <motion.div
                    key={i}
                    className={`arch-layer-card ${layer.type.toLowerCase().replace(' ', '-')}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="layer-header">
                      <span className="layer-name">{layer.name}</span>
                      <span className="layer-type">{layer.type}</span>
                    </div>
                    {layer.shape && <div className="layer-detail">Shape: {layer.shape}</div>}
                    {layer.units && <div className="layer-detail">Units: {layer.units}</div>}
                    {layer.activation && <div className="layer-detail">Activation: {layer.activation}</div>}
                    {layer.rate && <div className="layer-detail">Rate: {layer.rate}</div>}
                    {layer.formula && <div className="layer-formula">{layer.formula}</div>}
                    <p className="layer-desc">{layer.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="code-section">
              <h3>GNN Model Implementation</h3>
              <CodeBlock code={gnnCode} language="python" title="GNN Model Class" />
            </div>

            <div className="code-section">
              <h3>Graph Convolution Layer</h3>
              <CodeBlock code={graphConvCode} language="python" title="Custom GCN Layer" />
            </div>
          </motion.div>
        )}

        {/* Message Passing Section */}
        {activeSection === 'message-passing' && details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="message-passing-intro">
              <Info size={24} />
              <div>
                <h3>Message Passing in GNNs</h3>
                <p>{details.message_passing.description}</p>
              </div>
            </div>

            <div className="mp-steps">
              <h3>Message Passing Steps</h3>
              {details.message_passing.steps.map((step, i) => (
                <motion.div
                  key={i}
                  className="mp-step"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                >
                  <div className="step-number">{i + 1}</div>
                  <div className="step-text">{step}</div>
                </motion.div>
              ))}
            </div>

            <div className="mp-formula">
              <h3>Mathematical Formulation</h3>
              <div className="formula-card">
                <div className="formula-main">
                  <code>{details.message_passing.formula}</code>
                </div>
                <div className="formula-terms">
                  {Object.entries(details.message_passing.where).map(([term, desc]) => (
                    <div key={term} className="term-item">
                      <code>{term}</code>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mp-visualization">
              <h3>Message Passing Visualization</h3>
              <div className="mp-visual-container">
                <svg viewBox="0 0 500 300" className="mp-svg">
                  {/* Central node */}
                  <circle cx="250" cy="150" r="35" fill="#1a1a25" stroke="#00ff88" strokeWidth="3" />
                  <text x="250" y="155" textAnchor="middle" fill="#00ff88" fontSize="14" fontWeight="600">
                    Zone i
                  </text>

                  {/* Neighbor nodes */}
                  {[
                    { x: 100, y: 80, label: 'N1' },
                    { x: 400, y: 80, label: 'N2' },
                    { x: 100, y: 220, label: 'N3' },
                    { x: 400, y: 220, label: 'N4' },
                  ].map((node, i) => (
                    <g key={i}>
                      {/* Arrow */}
                      <line
                        x1={node.x + (node.x < 250 ? 30 : -30)}
                        y1={node.y + (node.y < 150 ? 15 : -15)}
                        x2={250 + (node.x < 250 ? -35 : 35)}
                        y2={150 + (node.y < 150 ? -20 : 20)}
                        stroke="#00d4ff"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                      <circle cx={node.x} cy={node.y} r="25" fill="#1a1a25" stroke="#00d4ff" strokeWidth="2" />
                      <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#00d4ff" fontSize="12">
                        {node.label}
                      </text>
                    </g>
                  ))}

                  {/* Arrow marker definition */}
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff" />
                    </marker>
                  </defs>

                  {/* Labels */}
                  <text x="250" y="270" textAnchor="middle" fill="#a0a0b0" fontSize="12">
                    Zone i aggregates features from neighbors N1, N2, N3, N4
                  </text>
                </svg>
              </div>
            </div>

            <div className="two-hop-info">
              <h3>Two-Hop Information Flow</h3>
              <p>With 2 GNN layers, each zone receives information from neighbors up to 2 hops away:</p>
              <div className="hop-visual">
                <div className="hop-item">
                  <span className="hop-number">1st Layer</span>
                  <span className="hop-desc">Direct neighbors</span>
                </div>
                <div className="hop-arrow">→</div>
                <div className="hop-item">
                  <span className="hop-number">2nd Layer</span>
                  <span className="hop-desc">Neighbors of neighbors</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Risk Scores Section */}
        {activeSection === 'risk-scores' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="section-content"
          >
            <div className="risk-header">
              <h3><Target size={20} /> Zone Risk Assessment</h3>
              <p>Risk scores computed using GNN with network effects</p>
            </div>

            {riskImage && (
              <div className="risk-chart">
                <img 
                  src={`data:image/png;base64,${riskImage}`} 
                  alt="Risk Scores"
                />
              </div>
            )}

            <div className="risk-table-container">
              <table>
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Population</th>
                    <th>Priority</th>
                    <th>Critical Sites</th>
                    <th>Alerts</th>
                    <th>Risk Score</th>
                    <th>Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneRisk.map((zone, index) => (
                    <motion.tr
                      key={zone.zone_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`risk-row ${zone.risk_level}`}
                    >
                      <td>
                        <div className="zone-cell">
                          <MapPin size={14} />
                          {zone.zone_name}
                        </div>
                      </td>
                      <td>{zone.population?.toLocaleString()}</td>
                      <td>
                        <span className={`priority-badge p${zone.grid_priority}`}>
                          P{zone.grid_priority}
                        </span>
                      </td>
                      <td>
                        <div className="sites-cell">
                          {zone.critical_sites?.map(site => (
                            <span key={site} className="site-tag">{site}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="alert-count">
                          {zone.alert_count}
                          {zone.emergency_count > 0 && (
                            <span className="emergency-badge">
                              {zone.emergency_count} emg
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="risk-score">{zone.risk_score}</span>
                      </td>
                      <td>
                        <span className={`risk-badge ${zone.risk_level}`}>
                          {zone.risk_level}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
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

            {details && (
              <div className="performance-section">
                <h3>Model Performance</h3>
                <div className="performance-card">
                  <span className="perf-label">Classification Accuracy</span>
                  <span className="perf-value">{details.performance.accuracy}</span>
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

        .header-icon.purple {
          background: rgba(170, 102, 255, 0.15);
          color: var(--accent-purple);
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

        .risk-summary {
          display: flex;
          gap: 1rem;
        }

        .risk-stat {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          text-align: center;
        }

        .risk-stat.high {
          border-color: var(--accent-danger);
        }

        .risk-stat.medium {
          border-color: var(--accent-warning);
        }

        .risk-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .risk-stat.high .risk-value {
          color: var(--accent-danger);
        }

        .risk-stat.medium .risk-value {
          color: var(--accent-warning);
        }

        .risk-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
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
          border-color: var(--accent-purple);
          color: var(--text-primary);
        }

        .section-btn.active {
          background: rgba(170, 102, 255, 0.1);
          border-color: var(--accent-purple);
          color: var(--accent-purple);
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
          border-color: var(--accent-purple);
          grid-column: 1 / -1;
        }

        .info-card h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: var(--accent-purple);
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

        .key-insight {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(170, 102, 255, 0.1);
          border-radius: 8px;
          color: var(--accent-purple);
        }

        .key-insight p {
          margin: 0;
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
          font-size: 0.875rem;
        }

        .feature-desc {
          color: var(--text-secondary);
          font-size: 0.75rem;
        }

        .risk-classification {
          margin-top: 2rem;
        }

        .risk-classification h3 {
          margin-bottom: 1rem;
        }

        .risk-levels {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 800px) {
          .risk-levels {
            grid-template-columns: 1fr;
          }
        }

        .risk-level-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
        }

        .risk-level-card.level-0 {
          border-color: var(--accent-primary);
        }

        .risk-level-card.level-1 {
          border-color: var(--accent-warning);
        }

        .risk-level-card.level-2 {
          border-color: var(--accent-danger);
        }

        .level-name {
          display: block;
          font-weight: 600;
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }

        .level-0 .level-name { color: var(--accent-primary); }
        .level-1 .level-name { color: var(--accent-warning); }
        .level-2 .level-name { color: var(--accent-danger); }

        .level-score {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .risk-level-card p {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .risk-factors {
          margin-top: 2rem;
        }

        .risk-factors h3 {
          margin-bottom: 1rem;
        }

        .factors-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 800px) {
          .factors-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .factor-item {
          padding: 0.75rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--accent-secondary);
        }

        .graph-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .graph-stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-purple);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          color: var(--text-secondary);
        }

        .graph-info-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .graph-info-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .graph-info-card h4 {
          color: var(--accent-secondary);
          margin-bottom: 0.5rem;
        }

        .graph-visualization {
          margin-bottom: 2rem;
        }

        .graph-visualization h3 {
          margin-bottom: 1rem;
        }

        .graph-container {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
        }

        .graph-svg {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          display: block;
        }

        .graph-legend {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-top: 1rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-dot.high { background: var(--accent-danger); }
        .legend-dot.medium { background: var(--accent-warning); }
        .legend-dot.low { background: var(--accent-primary); }

        .architecture-visual {
          margin-bottom: 2rem;
        }

        .architecture-visual h3 {
          margin-bottom: 1rem;
        }

        .arch-layers {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .arch-layer-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .arch-layer-card.feature-input { border-left: 4px solid var(--accent-purple); }
        .arch-layer-card.graphconvlayer { border-left: 4px solid var(--accent-secondary); }
        .arch-layer-card.dropout { border-left: 4px solid var(--accent-warning); }
        .arch-layer-card.dense { border-left: 4px solid var(--accent-primary); }

        .layer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .layer-name {
          font-weight: 600;
        }

        .layer-type {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-secondary);
          padding: 0.25rem 0.5rem;
          background: rgba(0, 212, 255, 0.1);
          border-radius: 4px;
        }

        .layer-detail {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .layer-formula {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--accent-primary);
          padding: 0.5rem;
          background: var(--bg-secondary);
          border-radius: 4px;
          margin: 0.5rem 0;
        }

        .layer-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
        }

        .code-section {
          margin-top: 2rem;
        }

        .code-section h3 {
          margin-bottom: 1rem;
        }

        .message-passing-intro {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(170, 102, 255, 0.1);
          border: 1px solid var(--accent-purple);
          border-radius: 12px;
          margin-bottom: 2rem;
          color: var(--accent-purple);
        }

        .message-passing-intro h3 {
          margin-bottom: 0.5rem;
        }

        .message-passing-intro p {
          color: var(--text-secondary);
        }

        .mp-steps {
          margin-bottom: 2rem;
        }

        .mp-steps h3 {
          margin-bottom: 1rem;
        }

        .mp-step {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin-bottom: 0.75rem;
        }

        .step-number {
          width: 36px;
          height: 36px;
          background: var(--accent-purple);
          color: var(--bg-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .mp-formula {
          margin-bottom: 2rem;
        }

        .mp-formula h3 {
          margin-bottom: 1rem;
        }

        .formula-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .formula-main {
          text-align: center;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .formula-main code {
          font-family: var(--font-mono);
          font-size: 1.25rem;
          color: var(--accent-primary);
        }

        .formula-terms {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .term-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border-radius: 6px;
        }

        .term-item code {
          font-family: var(--font-mono);
          color: var(--accent-secondary);
        }

        .term-item span {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .mp-visualization {
          margin-bottom: 2rem;
        }

        .mp-visualization h3 {
          margin-bottom: 1rem;
        }

        .mp-visual-container {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
        }

        .mp-svg {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          display: block;
        }

        .two-hop-info {
          margin-bottom: 2rem;
        }

        .two-hop-info h3 {
          margin-bottom: 0.5rem;
        }

        .two-hop-info p {
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }

        .hop-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .hop-item {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem 1.5rem;
          text-align: center;
        }

        .hop-number {
          display: block;
          font-weight: 600;
          color: var(--accent-purple);
          margin-bottom: 0.25rem;
        }

        .hop-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .hop-arrow {
          font-size: 1.5rem;
          color: var(--accent-purple);
        }

        .risk-header {
          margin-bottom: 1.5rem;
        }

        .risk-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--accent-purple);
          margin-bottom: 0.5rem;
        }

        .risk-header p {
          color: var(--text-secondary);
        }

        .risk-chart {
          margin-bottom: 2rem;
        }

        .risk-chart img {
          width: 100%;
          max-width: 800px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .risk-table-container {
          overflow-x: auto;
        }

        .risk-row.high {
          background: rgba(255, 68, 102, 0.05);
        }

        .risk-row.medium {
          background: rgba(255, 170, 0, 0.05);
        }

        .zone-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .priority-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .priority-badge.p1 { background: rgba(255, 68, 102, 0.2); color: var(--accent-danger); }
        .priority-badge.p2 { background: rgba(255, 170, 0, 0.2); color: var(--accent-warning); }
        .priority-badge.p3 { background: rgba(0, 255, 136, 0.2); color: var(--accent-primary); }
        .priority-badge.p4 { background: rgba(0, 212, 255, 0.2); color: var(--accent-secondary); }
        .priority-badge.p5 { background: rgba(170, 102, 255, 0.2); color: var(--accent-purple); }

        .sites-cell {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .site-tag {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-secondary);
          border-radius: 3px;
        }

        .alert-count {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .emergency-badge {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          background: rgba(255, 68, 102, 0.2);
          color: var(--accent-danger);
          border-radius: 3px;
        }

        .risk-score {
          font-family: var(--font-mono);
          font-weight: 600;
        }

        .risk-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .risk-badge.high {
          background: rgba(255, 68, 102, 0.2);
          color: var(--accent-danger);
        }

        .risk-badge.medium {
          background: rgba(255, 170, 0, 0.2);
          color: var(--accent-warning);
        }

        .risk-badge.low {
          background: rgba(0, 255, 136, 0.2);
          color: var(--accent-primary);
        }

        .training-chart {
          margin-top: 2rem;
        }

        .training-chart h3 {
          margin-bottom: 1rem;
        }

        .training-chart img {
          width: 100%;
          max-width: 800px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .performance-section {
          margin-top: 2rem;
        }

        .performance-section h3 {
          margin-bottom: 1rem;
        }

        .performance-card {
          background: var(--bg-card);
          border: 1px solid var(--accent-purple);
          border-radius: 12px;
          padding: 1.5rem;
          display: inline-flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .perf-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .perf-value {
          font-size: 2rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-purple);
        }
      `}</style>
    </div>
  );
}

