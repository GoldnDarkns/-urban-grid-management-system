import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, Play, Pause, RotateCcw, Zap, Wind, AlertTriangle,
  Activity, Network, ChevronRight, Info, Settings, 
  FastForward, SkipForward
} from 'lucide-react';
import { analyticsAPI, dataAPI, cityAPI } from '../services/api';
import { useAppMode } from '../utils/useAppMode';

// Zone positions in a 5x4 grid layout (for SIM mode)
const ZONE_POSITIONS_SIM = [
  { id: 'Z_001', x: 120, y: 80 },
  { id: 'Z_002', x: 240, y: 80 },
  { id: 'Z_003', x: 360, y: 80 },
  { id: 'Z_004', x: 480, y: 80 },
  { id: 'Z_005', x: 600, y: 80 },
  { id: 'Z_006', x: 120, y: 180 },
  { id: 'Z_007', x: 240, y: 180 },
  { id: 'Z_008', x: 360, y: 180 },
  { id: 'Z_009', x: 480, y: 180 },
  { id: 'Z_010', x: 600, y: 180 },
  { id: 'Z_011', x: 120, y: 280 },
  { id: 'Z_012', x: 240, y: 280 },
  { id: 'Z_013', x: 360, y: 280 },
  { id: 'Z_014', x: 480, y: 280 },
  { id: 'Z_015', x: 600, y: 280 },
  { id: 'Z_016', x: 120, y: 380 },
  { id: 'Z_017', x: 240, y: 380 },
  { id: 'Z_018', x: 360, y: 380 },
  { id: 'Z_019', x: 480, y: 380 },
  { id: 'Z_020', x: 600, y: 380 },
];

// Helper: Convert lat/lon coordinates to SVG positions
const latLonToSVG = (lat, lon, bounds) => {
  if (!bounds || !bounds.minLat || !bounds.maxLat) return { x: 0, y: 0 };
  const { minLat, maxLat, minLon, maxLon } = bounds;
  const x = ((lon - minLon) / (maxLon - minLon)) * 720;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 460; // Invert Y axis
  return { x: Math.max(0, Math.min(720, x)), y: Math.max(0, Math.min(460, y)) };
};

// Energy particle component
const EnergyParticle = ({ startX, startY, endX, endY, delay, duration, color }) => {
  return (
    <motion.circle
      r="3"
      fill={color}
      filter="url(#glow)"
      initial={{ cx: startX, cy: startY, opacity: 0 }}
      animate={{
        cx: [startX, endX],
        cy: [startY, endY],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

// Ripple effect for anomalies
const RippleEffect = ({ cx, cy, color }) => {
  return (
    <>
      {[0, 0.5, 1].map((delay, i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          fill="none"
          stroke={color}
          strokeWidth="2"
          initial={{ r: 25, opacity: 0.8 }}
          animate={{ r: 60, opacity: 0 }}
          transition={{
            duration: 2,
            delay: delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
};

export default function CityMap() {
  const { mode } = useAppMode();
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [zoneRisk, setZoneRisk] = useState([]);
  const [gridEdges, setGridEdges] = useState([]);
  const [zonePositions, setZonePositions] = useState([]);
  const [currentCityId, setCurrentCityId] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationMode, setSimulationMode] = useState('realtime'); // realtime, lstm, gnn, cascade
  const [cascadeSource, setCascadeSource] = useState(null);
  const [cascadeStep, setCascadeStep] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [lstmStep, setLstmStep] = useState(0);
  const [gnnStep, setGnnStep] = useState(0);
  const svgRef = useRef(null);

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
    fetchData();
  }, [mode, currentCityId]);

  const fetchData = async () => {
    try {
      if (mode === 'city' && currentCityId) {
        // CITY LIVE MODE: Get zones from city coordinates and processed data
        const [coordsRes, processedRes] = await Promise.all([
          cityAPI.getZoneCoordinates(currentCityId),
          cityAPI.getProcessedData(currentCityId, null, 100)
        ]);
        
        const coords = coordsRes.data?.zones || [];
        const processedZones = processedRes.data?.zones || [];
        
        // Calculate bounds for coordinate conversion
        if (coords.length > 0) {
          const lats = coords.map(z => z.lat);
          const lons = coords.map(z => z.lon);
          const bounds = {
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats),
            minLon: Math.min(...lons),
            maxLon: Math.max(...lons)
          };
          
          // Convert coordinates to SVG positions
          const positions = coords.map(zone => ({
            id: zone.zone_id,
            x: latLonToSVG(zone.lat, zone.lon, bounds).x,
            y: latLonToSVG(zone.lat, zone.lon, bounds).y
          }));
          setZonePositions(positions);
        } else {
          // Fallback: use SIM positions if no coordinates
          setZonePositions(ZONE_POSITIONS_SIM);
        }
        
        // Set zones from coordinates
        setZones(coords.map(z => ({ id: z.zone_id, name: z.zone_id.replace('_', ' ').toUpperCase() })));
        
        // Extract risk scores from processed data
        const risks = processedZones.map(zone => ({
          zone_id: zone.zone_id,
          risk_level: zone.ml_processed?.risk_score?.level || 'low',
          risk_score: zone.ml_processed?.risk_score?.score || 0,
          alert_count: zone.recommendations?.filter(r => r.priority === 'high' || r.priority === 'critical').length || 0
        }));
        setZoneRisk(risks);
        
        // Generate grid edges based on zone proximity (simple grid for now)
        const edges = [];
        for (let i = 0; i < coords.length; i++) {
          for (let j = i + 1; j < coords.length; j++) {
            const z1 = coords[i];
            const z2 = coords[j];
            const dist = Math.sqrt(Math.pow(z1.lat - z2.lat, 2) + Math.pow(z1.lon - z2.lon, 2));
            // Connect zones within 0.05 degrees (roughly 5km)
            if (dist < 0.05) {
              edges.push({ from_zone: z1.zone_id, to_zone: z2.zone_id });
            }
          }
        }
        setGridEdges(edges);
      } else {
        // SIM MODE: Use existing SIM dataset
        const [zonesRes, riskRes, edgesRes] = await Promise.all([
          dataAPI.getZones(),
          analyticsAPI.getZoneRisk(),
          dataAPI.getGridEdges()
        ]);
        setZones(zonesRes.data.zones || []);
        setZoneRisk(riskRes.data.data || []);
        setGridEdges(edgesRes.data.edges || []);
        setZonePositions(ZONE_POSITIONS_SIM);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to SIM positions on error
      setZonePositions(ZONE_POSITIONS_SIM);
    } finally {
      setLoading(false);
    }
  };

  // Get zone data by ID
  const getZoneData = (zoneId) => {
    const risk = zoneRisk.find(z => z.zone_id === zoneId);
    const zone = zones.find(z => z.id === zoneId);
    return { ...zone, ...risk };
  };

  // Get risk color
  const getRiskColor = (zoneId) => {
    const data = getZoneData(zoneId);
    if (!data) return '#00ff88';
    if (data.risk_level === 'high') return '#ff4466';
    if (data.risk_level === 'medium') return '#ffaa00';
    return '#00ff88';
  };

  // Get zone position
  const getZonePosition = (zoneId) => {
    return zonePositions.find(z => z.id === zoneId) || { x: 0, y: 0 };
  };

  // Get neighbors of a zone
  const getNeighbors = (zoneId) => {
    return gridEdges
      .filter(e => e.from_zone === zoneId)
      .map(e => e.to_zone);
  };

  // Cascade simulation
  useEffect(() => {
    if (simulationMode === 'cascade' && cascadeSource && isPlaying) {
      const timer = setInterval(() => {
        setCascadeStep(prev => (prev + 1) % 5);
      }, 1500 / speed);
      return () => clearInterval(timer);
    }
  }, [simulationMode, cascadeSource, isPlaying, speed]);

  // LSTM animation
  useEffect(() => {
    if (simulationMode === 'lstm' && isPlaying) {
      const timer = setInterval(() => {
        setLstmStep(prev => (prev + 1) % 28); // 24 input + 4 processing steps
      }, 500 / speed);
      return () => clearInterval(timer);
    }
  }, [simulationMode, isPlaying, speed]);

  // GNN animation
  useEffect(() => {
    if (simulationMode === 'gnn' && isPlaying) {
      const timer = setInterval(() => {
        setGnnStep(prev => (prev + 1) % 6);
      }, 1000 / speed);
      return () => clearInterval(timer);
    }
  }, [simulationMode, isPlaying, speed]);

  // Get cascade affected zones
  const getCascadeAffected = () => {
    if (!cascadeSource) return new Set();
    const affected = new Set([cascadeSource]);
    
    if (cascadeStep >= 1) {
      getNeighbors(cascadeSource).forEach(n => affected.add(n));
    }
    if (cascadeStep >= 2) {
      getNeighbors(cascadeSource).forEach(n => {
        getNeighbors(n).forEach(nn => affected.add(nn));
      });
    }
    if (cascadeStep >= 3) {
      // 3-hop
      const hop2 = new Set();
      getNeighbors(cascadeSource).forEach(n => {
        getNeighbors(n).forEach(nn => hop2.add(nn));
      });
      hop2.forEach(n => {
        getNeighbors(n).forEach(nn => affected.add(nn));
      });
    }
    
    return affected;
  };

  const startCascade = (zoneId) => {
    setCascadeSource(zoneId);
    setCascadeStep(0);
    setSimulationMode('cascade');
    setIsPlaying(true);
  };

  const resetSimulation = () => {
    setCascadeSource(null);
    setCascadeStep(0);
    setLstmStep(0);
    setGnnStep(0);
    setSimulationMode('realtime');
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const cascadeAffected = getCascadeAffected();

  return (
    <div className="citymap-page">
      <div className="map-header">
        <div className="header-left">
          <Map size={32} />
          <div>
            <h1>MetroCity Grid Visualization</h1>
            <p>Interactive city grid with real-time energy flow and risk propagation</p>
          </div>
        </div>
        <div className="header-controls">
          <div className="mode-selector">
            <button 
              className={`mode-btn ${simulationMode === 'realtime' ? 'active' : ''}`}
              onClick={() => { resetSimulation(); setSimulationMode('realtime'); }}
            >
              <Zap size={16} /> Real-time
            </button>
            <button 
              className={`mode-btn ${simulationMode === 'lstm' ? 'active' : ''}`}
              onClick={() => { resetSimulation(); setSimulationMode('lstm'); }}
            >
              <Activity size={16} /> TFT / LSTM
            </button>
            <button 
              className={`mode-btn ${simulationMode === 'gnn' ? 'active' : ''}`}
              onClick={() => { resetSimulation(); setSimulationMode('gnn'); }}
            >
              <Network size={16} /> GNN
            </button>
            <button 
              className={`mode-btn ${simulationMode === 'cascade' ? 'active' : ''}`}
              onClick={() => setSimulationMode('cascade')}
            >
              <AlertTriangle size={16} /> Cascade
            </button>
          </div>
          <div className="playback-controls">
            <button onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={resetSimulation}>
              <RotateCcw size={20} />
            </button>
            <div className="speed-control">
              <span>Speed:</span>
              <button 
                className={speed === 0.5 ? 'active' : ''} 
                onClick={() => setSpeed(0.5)}
              >0.5x</button>
              <button 
                className={speed === 1 ? 'active' : ''} 
                onClick={() => setSpeed(1)}
              >1x</button>
              <button 
                className={speed === 2 ? 'active' : ''} 
                onClick={() => setSpeed(2)}
              >2x</button>
            </div>
          </div>
        </div>
      </div>

      <div className="map-container">
        <div className="map-main">
          <div className="map-svg-wrapper">
          <svg 
            ref={svgRef}
            viewBox="0 0 720 460" 
            className="city-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Glow filter */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Stronger glow */}
              <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              {/* Gradient for edges */}
              <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3"/>
                <stop offset="50%" stopColor="#00ff88" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#00ff88" stopOpacity="0.3"/>
              </linearGradient>
            </defs>

            {/* Background grid */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a25" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Draw edges */}
            {gridEdges.map((edge, i) => {
              const from = getZonePosition(edge.from_zone);
              const to = getZonePosition(edge.to_zone);
              const isHighlighted = simulationMode === 'cascade' && 
                cascadeAffected.has(edge.from_zone) && cascadeAffected.has(edge.to_zone);
              
              return (
                <g key={i}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isHighlighted ? '#ff4466' : '#2a2a3a'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    opacity={0.6}
                  />
                  
                  {/* Energy particles on edges */}
                  {isPlaying && simulationMode === 'realtime' && (
                    <>
                      <EnergyParticle
                        startX={from.x}
                        startY={from.y}
                        endX={to.x}
                        endY={to.y}
                        delay={i * 0.2}
                        duration={2 / speed}
                        color="#00ff88"
                      />
                      <EnergyParticle
                        startX={to.x}
                        startY={to.y}
                        endX={from.x}
                        endY={from.y}
                        delay={i * 0.2 + 1}
                        duration={2 / speed}
                        color="#00d4ff"
                      />
                    </>
                  )}

                  {/* Cascade flow */}
                  {simulationMode === 'cascade' && isHighlighted && isPlaying && (
                    <EnergyParticle
                      startX={from.x}
                      startY={from.y}
                      endX={to.x}
                      endY={to.y}
                      delay={0}
                      duration={1 / speed}
                      color="#ff4466"
                    />
                  )}
                </g>
              );
            })}

            {/* Draw zones */}
            {zonePositions && zonePositions.length > 0 ? zonePositions.map((pos, i) => {
              const zoneData = getZoneData(pos.id);
              const riskColor = getRiskColor(pos.id);
              const isSelected = selectedZone === pos.id;
              const isCascadeSource = cascadeSource === pos.id;
              const isCascadeAffected = cascadeAffected.has(pos.id);
              const isGnnActive = simulationMode === 'gnn' && gnnStep >= 2;
              
              let displayColor = riskColor;
              let scale = 1;
              let showRipple = false;

              if (simulationMode === 'cascade') {
                if (isCascadeSource) {
                  displayColor = '#ff4466';
                  scale = 1.2;
                  showRipple = true;
                } else if (isCascadeAffected) {
                  displayColor = cascadeStep >= 3 ? '#ff4466' : 
                                 cascadeStep >= 2 ? '#ff6644' : '#ffaa00';
                  scale = 1.1;
                }
              }

              return (
                <g 
                  key={pos.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedZone(pos.id);
                    if (simulationMode === 'cascade') {
                      startCascade(pos.id);
                    }
                  }}
                >
                  {/* Ripple effect for cascade source */}
                  {showRipple && <RippleEffect cx={pos.x} cy={pos.y} color="#ff4466" />}

                  {/* Zone circle */}
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={25}
                    fill="#0a0a0f"
                    stroke={displayColor}
                    strokeWidth={isSelected ? 4 : 2}
                    filter={isSelected || isCascadeSource ? "url(#strongGlow)" : "url(#glow)"}
                    animate={{ 
                      scale: scale,
                      strokeWidth: isSelected ? 4 : 2 
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                  />

                  {/* Zone label */}
                  <text
                    x={pos.x}
                    y={pos.y + 5}
                    textAnchor="middle"
                    fill={displayColor}
                    fontSize="12"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Z{i + 1}
                  </text>

                  {/* Risk indicator */}
                  {zoneData?.risk_level === 'high' && simulationMode === 'realtime' && (
                    <motion.circle
                      cx={pos.x + 20}
                      cy={pos.y - 20}
                      r={6}
                      fill="#ff4466"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}

                  {/* Critical site indicators */}
                  {zoneData?.critical_sites?.includes('hospital') && (
                    <text x={pos.x - 25} y={pos.y - 20} fontSize="14">🏥</text>
                  )}
                </g>
              );
            }) : null}

            {/* GNN Message Passing Animation */}
            {simulationMode === 'gnn' && selectedZone && (
              <g className="gnn-animation">
                {gnnStep >= 1 && getNeighbors(selectedZone).map((neighbor, i) => {
                  const from = getZonePosition(neighbor);
                  const to = getZonePosition(selectedZone);
                  return (
                    <motion.g key={i}>
                      <motion.line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#aa66ff"
                        strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                      <EnergyParticle
                        startX={from.x}
                        startY={from.y}
                        endX={to.x}
                        endY={to.y}
                        delay={i * 0.1}
                        duration={0.8 / speed}
                        color="#aa66ff"
                      />
                    </motion.g>
                  );
                })}
                
                {gnnStep >= 3 && (
                  <motion.circle
                    cx={getZonePosition(selectedZone).x}
                    cy={getZonePosition(selectedZone).y}
                    r={35}
                    fill="none"
                    stroke="#aa66ff"
                    strokeWidth="3"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </g>
            )}
          </svg>
          </div>

          {/* Legend */}
          <div className="map-legend">
            <h4>Legend</h4>
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
            <div className="legend-item">
              <span className="legend-icon">🏥</span>
              Hospital
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="side-panel">
          {/* Mode Info */}
          <div className="panel-section mode-info">
            <h3>
              {simulationMode === 'realtime' && <><Zap size={18} /> Real-time Mode</>}
              {simulationMode === 'lstm' && <><Activity size={18} /> TFT / LSTM Demand Prediction</>}
              {simulationMode === 'gnn' && <><Network size={18} /> GNN Message Passing</>}
              {simulationMode === 'cascade' && <><AlertTriangle size={18} /> Risk Cascade</>}
            </h3>
            <p>
              {simulationMode === 'realtime' && 'Showing live energy flow between zones. Particles represent power distribution through the grid.'}
              {simulationMode === 'lstm' && 'Visualizing how TFT/LSTM process 24 hours of historical data to predict next hour demand. TFT is our primary model; LSTM is kept for comparison.'}
              {simulationMode === 'gnn' && 'Click a zone to see how GNN aggregates neighbor features for risk scoring.'}
              {simulationMode === 'cascade' && 'Click any zone to simulate a failure and watch risk propagate through the network.'}
            </p>
          </div>

          {/* TFT / LSTM Animation Panel */}
          {simulationMode === 'lstm' && (
            <div className="panel-section lstm-panel">
              <h4>TFT / LSTM Demand Processing</h4>
              <div className="lstm-visualization">
                <div className="lstm-input">
                  <span>Input Sequence (24h)</span>
                  <div className="lstm-bars">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="lstm-bar"
                        animate={{
                          backgroundColor: lstmStep > i ? '#00ff88' : '#2a2a3a',
                          height: lstmStep > i ? `${30 + Math.random() * 40}%` : '20%'
                        }}
                        transition={{ duration: 0.2 }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="lstm-flow">
                  <motion.div 
                    className="lstm-cell"
                    animate={{ 
                      borderColor: lstmStep >= 24 ? '#00ff88' : '#2a2a3a',
                      boxShadow: lstmStep >= 24 ? '0 0 20px rgba(0, 255, 136, 0.5)' : 'none'
                    }}
                  >
                    <span>LSTM</span>
                    <span className="cell-detail">64 units</span>
                  </motion.div>
                  <ChevronRight className="flow-arrow" />
                  <motion.div 
                    className="lstm-cell"
                    animate={{ 
                      borderColor: lstmStep >= 25 ? '#00ff88' : '#2a2a3a',
                      boxShadow: lstmStep >= 25 ? '0 0 20px rgba(0, 255, 136, 0.5)' : 'none'
                    }}
                  >
                    <span>LSTM</span>
                    <span className="cell-detail">32 units</span>
                  </motion.div>
                  <ChevronRight className="flow-arrow" />
                  <motion.div 
                    className="lstm-cell output"
                    animate={{ 
                      borderColor: lstmStep >= 26 ? '#00ff88' : '#2a2a3a',
                      boxShadow: lstmStep >= 26 ? '0 0 20px rgba(0, 255, 136, 0.5)' : 'none'
                    }}
                  >
                    <span>Dense</span>
                    <span className="cell-detail">Prediction</span>
                  </motion.div>
                </div>

                <motion.div 
                  className="lstm-output"
                  animate={{ 
                    opacity: lstmStep >= 27 ? 1 : 0.3,
                    scale: lstmStep >= 27 ? 1 : 0.9
                  }}
                >
                  <span>Predicted Demand</span>
                  <span className="output-value">
                    {lstmStep >= 27 ? '847.3 kWh' : '---'}
                  </span>
                </motion.div>
              </div>
            </div>
          )}

          {/* GNN Animation Panel */}
          {simulationMode === 'gnn' && (
            <div className="panel-section gnn-panel">
              <h4>GNN Message Passing</h4>
              <div className="gnn-steps">
                <motion.div 
                  className={`gnn-step ${gnnStep >= 0 ? 'active' : ''}`}
                  animate={{ opacity: gnnStep >= 0 ? 1 : 0.4 }}
                >
                  <span className="step-num">1</span>
                  <span>Gather neighbor features</span>
                </motion.div>
                <motion.div 
                  className={`gnn-step ${gnnStep >= 2 ? 'active' : ''}`}
                  animate={{ opacity: gnnStep >= 2 ? 1 : 0.4 }}
                >
                  <span className="step-num">2</span>
                  <span>Aggregate messages</span>
                </motion.div>
                <motion.div 
                  className={`gnn-step ${gnnStep >= 4 ? 'active' : ''}`}
                  animate={{ opacity: gnnStep >= 4 ? 1 : 0.4 }}
                >
                  <span className="step-num">3</span>
                  <span>Update node representation</span>
                </motion.div>
                <motion.div 
                  className={`gnn-step ${gnnStep >= 5 ? 'active' : ''}`}
                  animate={{ opacity: gnnStep >= 5 ? 1 : 0.4 }}
                >
                  <span className="step-num">4</span>
                  <span>Classify risk level</span>
                </motion.div>
              </div>
              {selectedZone && (
                <div className="gnn-result">
                  <span>Selected: {selectedZone}</span>
                  <span>Neighbors: {getNeighbors(selectedZone).length}</span>
                </div>
              )}
            </div>
          )}

          {/* Cascade Panel */}
          {simulationMode === 'cascade' && (
            <div className="panel-section cascade-panel">
              <h4>Risk Cascade Simulation</h4>
              {cascadeSource ? (
                <>
                  <div className="cascade-info">
                    <span>Source: {cascadeSource}</span>
                    <span>Step: {cascadeStep + 1}/5</span>
                    <span>Affected: {cascadeAffected.size} zones</span>
                  </div>
                  <div className="cascade-timeline">
                    {['Initial', 'Hop 1', 'Hop 2', 'Hop 3', 'Critical'].map((label, i) => (
                      <motion.div 
                        key={i}
                        className={`timeline-step ${cascadeStep >= i ? 'active' : ''}`}
                        animate={{ 
                          backgroundColor: cascadeStep >= i ? '#ff4466' : '#2a2a3a'
                        }}
                      >
                        {label}
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="cascade-hint">Click any zone on the map to start a cascade simulation</p>
              )}
            </div>
          )}

          {/* Selected Zone Info */}
          {selectedZone && (
            <div className="panel-section zone-info">
              <h4>Zone Details: {selectedZone}</h4>
              {(() => {
                const data = getZoneData(selectedZone);
                return data ? (
                  <div className="zone-details">
                    <div className="detail-row">
                      <span>Name</span>
                      <strong>{data.zone_name || data.name}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Population</span>
                      <strong>{data.population?.toLocaleString()}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Risk Level</span>
                      <span className={`risk-badge ${data.risk_level}`}>
                        {data.risk_level}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span>Risk Score</span>
                      <strong>{data.risk_score}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Alerts</span>
                      <strong>{data.alert_count}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Connected To</span>
                      <strong>{getNeighbors(selectedZone).length} zones</strong>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Risk Scoring Explanation */}
          <div className="panel-section risk-explain">
            <h4><Info size={16} /> How Risk is Calculated</h4>
            <div className="risk-formula">
              <div className="formula-step">
                <span className="step-badge">1</span>
                <span>Base: Hospital zones get +12 points</span>
              </div>
              <div className="formula-step">
                <span className="step-badge">2</span>
                <span>AQI &gt;200 adds +15, &gt;300 adds +25</span>
              </div>
              <div className="formula-step">
                <span className="step-badge">3</span>
                <span>Emergency alerts add +10 to +20</span>
              </div>
              <div className="formula-step">
                <span className="step-badge">4</span>
                <span>High priority grid adds +4 to +8</span>
              </div>
            </div>
            <div className="risk-thresholds">
              <div className="threshold low">
                <span className="dot"></span>
                <span>Safe: Score &lt; 20</span>
              </div>
              <div className="threshold medium">
                <span className="dot"></span>
                <span>Warning: Score 20-39</span>
              </div>
              <div className="threshold high">
                <span className="dot"></span>
                <span>Critical: Score ≥ 40</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .citymap-page {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 1rem 2rem 2rem;
        }

        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-left svg {
          color: var(--accent-primary);
        }

        .header-left h1 {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .header-left p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .header-controls {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .mode-selector {
          display: flex;
          gap: 0.25rem;
          background: var(--bg-secondary);
          padding: 0.25rem;
          border-radius: 8px;
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .mode-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .mode-btn.active {
          background: var(--accent-primary);
          color: var(--bg-primary);
        }

        .playback-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .playback-controls button {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .playback-controls button:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .speed-control {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: 0.5rem;
        }

        .speed-control span {
          color: var(--text-secondary);
          font-size: 0.75rem;
          margin-right: 0.25rem;
        }

        .speed-control button {
          width: auto;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .speed-control button.active {
          background: var(--accent-primary);
          color: var(--bg-primary);
          border-color: var(--accent-primary);
        }

        .map-container {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 1.5rem;
        }

        @media (max-width: 1100px) {
          .map-container {
            grid-template-columns: 1fr;
          }
        }

        .map-main {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: visible;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .map-svg-wrapper {
          overflow: auto;
          max-height: 75vh;
          min-height: 360px;
          flex: 1;
          border-radius: 0 0 12px 12px;
        }

        .city-svg {
          width: 100%;
          height: auto;
          min-width: 720px;
          min-height: 460px;
          display: block;
          background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
        }

        .map-legend {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          background: rgba(10, 10, 15, 0.9);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .map-legend h4 {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .legend-dot.high { background: #ff4466; }
        .legend-dot.medium { background: #ffaa00; }
        .legend-dot.low { background: #00ff88; }

        .legend-icon {
          font-size: 12px;
        }

        .side-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .panel-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.25rem;
        }

        .panel-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          margin-bottom: 0.75rem;
          color: var(--accent-primary);
        }

        .panel-section h4 {
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
          color: var(--text-primary);
        }

        .panel-section p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .mode-info {
          border-color: var(--accent-primary);
        }

        /* LSTM Panel */
        .lstm-panel {
          border-color: var(--accent-primary);
        }

        .lstm-visualization {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .lstm-input span {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 0.5rem;
        }

        .lstm-bars {
          display: flex;
          gap: 2px;
          height: 60px;
          align-items: flex-end;
        }

        .lstm-bar {
          flex: 1;
          background: var(--border-color);
          border-radius: 2px;
          min-height: 10px;
        }

        .lstm-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .lstm-cell {
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .lstm-cell span {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .lstm-cell .cell-detail {
          font-size: 0.7rem;
          color: var(--text-secondary);
          font-weight: 400;
        }

        .lstm-cell.output {
          border-color: var(--accent-secondary);
        }

        .flow-arrow {
          color: var(--text-muted);
        }

        .lstm-output {
          text-align: center;
          padding: 1rem;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .lstm-output span {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .output-value {
          font-size: 1.5rem !important;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-primary) !important;
          margin-top: 0.25rem;
        }

        /* GNN Panel */
        .gnn-panel {
          border-color: var(--accent-purple);
        }

        .gnn-steps {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .gnn-step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.3s ease;
        }

        .gnn-step.active {
          background: rgba(170, 102, 255, 0.15);
        }

        .step-num {
          width: 24px;
          height: 24px;
          background: var(--border-color);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .gnn-step.active .step-num {
          background: var(--accent-purple);
          color: white;
        }

        .gnn-result {
          margin-top: 1rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        /* Cascade Panel */
        .cascade-panel {
          border-color: var(--accent-danger);
        }

        .cascade-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .cascade-timeline {
          display: flex;
          gap: 0.25rem;
        }

        .timeline-step {
          flex: 1;
          padding: 0.5rem 0.25rem;
          text-align: center;
          font-size: 0.65rem;
          background: var(--border-color);
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .timeline-step.active {
          color: white;
        }

        .cascade-hint {
          color: var(--text-muted);
          font-style: italic;
        }

        /* Zone Info */
        .zone-info {
          border-color: var(--accent-secondary);
        }

        .zone-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .detail-row span:first-child {
          color: var(--text-secondary);
        }

        .risk-badge {
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
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

        /* Risk Explanation Panel */
        .risk-explain {
          border-color: var(--accent-secondary);
        }

        .risk-explain h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .risk-formula {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .formula-step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .step-badge {
          width: 20px;
          height: 20px;
          background: var(--accent-secondary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .risk-thresholds {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .threshold {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
        }

        .threshold .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .threshold.low .dot { background: #00ff88; }
        .threshold.medium .dot { background: #ffaa00; }
        .threshold.high .dot { background: #ff4466; }
      `}</style>
    </div>
  );
}

