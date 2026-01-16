import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, Clock, Map, GitCompare, Network, Play, Pause, 
  RotateCcw, ChevronRight, Zap, AlertTriangle, TrendingUp, Info
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';

// ==================== RECOVERY TIMELINE ====================
function RecoveryTimeline() {
  const [scenario, setScenario] = useState('heatwave');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentHour, setCurrentHour] = useState(0);
  
  const scenarios = {
    heatwave: { name: 'Heatwave', peakHour: 12, recoveryStart: 18, fullRecovery: 36, color: '#ff6b35' },
    flood: { name: 'Flash Flood', peakHour: 6, recoveryStart: 12, fullRecovery: 48, color: '#74b9ff' },
    powerSurge: { name: 'Power Surge', peakHour: 2, recoveryStart: 4, fullRecovery: 12, color: '#ffd93d' },
    sandstorm: { name: 'Sandstorm', peakHour: 8, recoveryStart: 16, fullRecovery: 30, color: '#d4a574' },
  };

  const currentScenario = scenarios[scenario];
  const totalHours = currentScenario.fullRecovery + 6;

  // Generate timeline data
  const timelineData = useMemo(() => {
    const data = [];
    for (let h = 0; h <= totalHours; h++) {
      let impact = 0;
      let recovery = 0;
      
      if (h <= currentScenario.peakHour) {
        // Rising impact
        impact = (h / currentScenario.peakHour) * 100;
      } else if (h <= currentScenario.recoveryStart) {
        // Sustained impact
        impact = 100 - ((h - currentScenario.peakHour) / (currentScenario.recoveryStart - currentScenario.peakHour)) * 20;
      } else if (h <= currentScenario.fullRecovery) {
        // Recovery phase
        impact = 80 * (1 - (h - currentScenario.recoveryStart) / (currentScenario.fullRecovery - currentScenario.recoveryStart));
        recovery = 100 - impact;
      } else {
        // Full recovery
        impact = 0;
        recovery = 100;
      }
      
      data.push({
        hour: h,
        impact: Math.round(impact),
        recovery: Math.round(recovery),
        phase: h <= currentScenario.peakHour ? 'Escalation' : 
               h <= currentScenario.recoveryStart ? 'Peak Impact' : 
               h <= currentScenario.fullRecovery ? 'Recovery' : 'Restored'
      });
    }
    return data;
  }, [scenario, currentScenario, totalHours]);

  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setCurrentHour(prev => {
          if (prev >= totalHours) {
            setIsPlaying(false);
            return totalHours;
          }
          return prev + 1;
        });
      }, 200);
      return () => clearInterval(timer);
    }
  }, [isPlaying, totalHours]);

  const currentData = timelineData[currentHour] || timelineData[0];

  return (
    <div className="viz-section recovery-timeline">
      <div className="section-header">
        <h3><Clock size={20} /> Recovery Timeline</h3>
        <p>Visualize disaster impact and recovery phases over time</p>
      </div>

      <div className="scenario-selector">
        {Object.entries(scenarios).map(([key, s]) => (
          <button
            key={key}
            className={`scenario-btn ${scenario === key ? 'active' : ''}`}
            onClick={() => { setScenario(key); setCurrentHour(0); setIsPlaying(false); }}
            style={{ '--sc-color': s.color }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="timeline-chart">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="impactGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentScenario.color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={currentScenario.color} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="recoveryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
            <XAxis dataKey="hour" stroke="#667788" tick={{ fill: '#667788', fontSize: 11 }} />
            <YAxis stroke="#667788" tick={{ fill: '#667788', fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ background: 'rgba(10,15,25,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8 }}
              labelStyle={{ color: '#00d4ff' }}
            />
            <Area type="monotone" dataKey="impact" stroke={currentScenario.color} fill="url(#impactGrad)" name="Impact %" />
            <Area type="monotone" dataKey="recovery" stroke="#00ff88" fill="url(#recoveryGrad)" name="Recovery %" />
            {/* Current time marker */}
            <Line 
              type="monotone" 
              dataKey={() => currentHour} 
              stroke="#ffffff" 
              strokeWidth={2} 
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Current time indicator */}
        <div 
          className="time-marker" 
          style={{ left: `${(currentHour / totalHours) * 100}%` }}
        />
      </div>

      <div className="timeline-controls">
        <button className="ctrl-btn" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="ctrl-btn" onClick={() => { setCurrentHour(0); setIsPlaying(false); }}>
          <RotateCcw size={18} />
        </button>
        <input 
          type="range" 
          min="0" 
          max={totalHours} 
          value={currentHour} 
          onChange={(e) => setCurrentHour(Number(e.target.value))}
          className="time-slider"
        />
        <span className="time-label">T+{currentHour}h</span>
      </div>

      <div className="phase-indicators">
        <div className={`phase ${currentData.phase === 'Escalation' ? 'active' : ''}`}>
          <span className="phase-dot" style={{ background: '#ff4466' }}></span>
          Escalation
        </div>
        <ChevronRight size={14} />
        <div className={`phase ${currentData.phase === 'Peak Impact' ? 'active' : ''}`}>
          <span className="phase-dot" style={{ background: currentScenario.color }}></span>
          Peak Impact
        </div>
        <ChevronRight size={14} />
        <div className={`phase ${currentData.phase === 'Recovery' ? 'active' : ''}`}>
          <span className="phase-dot" style={{ background: '#ffaa00' }}></span>
          Recovery
        </div>
        <ChevronRight size={14} />
        <div className={`phase ${currentData.phase === 'Restored' ? 'active' : ''}`}>
          <span className="phase-dot" style={{ background: '#00ff88' }}></span>
          Restored
        </div>
      </div>

      <div className="current-stats">
        <div className="stat">
          <span className="stat-label">Impact Level</span>
          <span className="stat-value" style={{ color: currentScenario.color }}>{currentData.impact}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Recovery Progress</span>
          <span className="stat-value" style={{ color: '#00ff88' }}>{currentData.recovery}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Current Phase</span>
          <span className="stat-value">{currentData.phase}</span>
        </div>
      </div>
    </div>
  );
}

// ==================== HEATMAP OVERLAY ====================
function HeatmapOverlay() {
  const [metric, setMetric] = useState('demand');
  const [hoveredZone, setHoveredZone] = useState(null);
  const canvasRef = useRef(null);

  const metrics = {
    demand: { 
      name: 'Energy Demand', 
      colorHigh: '#ff4466', 
      colorLow: '#00ff88',
      unit: 'kW',
      description: 'Shows energy consumption intensity across the city grid. Red zones indicate high demand areas (commercial/industrial), green zones show lower consumption (residential).',
      insights: [
        'Downtown core shows highest demand due to commercial activity',
        'Industrial zones have consistent high consumption',
        'Residential areas show lower but steady demand patterns'
      ]
    },
    aqi: { 
      name: 'Air Quality', 
      colorHigh: '#ff6b35', 
      colorLow: '#00d4ff',
      unit: 'AQI',
      description: 'Air Quality Index distribution. Lower values (blue) indicate cleaner air, higher values (orange/red) show pollution hotspots near industrial areas.',
      insights: [
        'Industrial zones show elevated AQI levels',
        'Green spaces and parks improve surrounding air quality',
        'Traffic corridors contribute to localized pollution'
      ]
    },
    risk: { 
      name: 'Risk Level', 
      colorHigh: '#ff0044', 
      colorLow: '#00ff88',
      unit: '%',
      description: 'Combined risk score based on infrastructure criticality, demand patterns, and environmental factors. Higher risk zones require priority attention.',
      insights: [
        'Critical infrastructure zones have elevated baseline risk',
        'Areas with aging grid infrastructure show higher risk',
        'Zones with backup power have lower overall risk'
      ]
    },
  };

  // Generate zone data with more meaningful patterns
  const zones = useMemo(() => {
    const data = [];
    const gridSize = 8;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const distFromCenter = Math.sqrt(Math.pow(x - gridSize/2, 2) + Math.pow(y - gridSize/2, 2));
        const isIndustrial = (x < 2 && y > 5);
        const isDowntown = (distFromCenter < 2);
        const isResidential = (x > 5 || y < 2);
        
        let baseValue;
        let zoneName;
        let zoneType;
        
        if (metric === 'demand') {
          baseValue = isDowntown ? 70 + Math.random() * 30 : 
                     isIndustrial ? 60 + Math.random() * 25 :
                     isResidential ? 20 + Math.random() * 25 :
                     35 + Math.random() * 30;
          zoneType = isDowntown ? 'Commercial' : isIndustrial ? 'Industrial' : isResidential ? 'Residential' : 'Mixed';
        } else if (metric === 'aqi') {
          baseValue = isIndustrial ? 120 + Math.random() * 60 :
                     isDowntown ? 80 + Math.random() * 40 :
                     40 + Math.random() * 40;
          zoneType = isIndustrial ? 'Industrial' : isDowntown ? 'Commercial' : 'Residential';
        } else {
          baseValue = isDowntown ? 40 + Math.random() * 35 :
                     isIndustrial ? 50 + Math.random() * 30 :
                     15 + Math.random() * 25;
          zoneType = isDowntown ? 'High Priority' : isIndustrial ? 'Industrial' : 'Standard';
        }
        
        zoneName = `Zone ${String.fromCharCode(65 + y)}${x + 1}`;
        
        data.push({
          x, y,
          value: Math.round(baseValue),
          name: zoneName,
          type: zoneType
        });
      }
    }
    return data;
  }, [metric]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const cellW = width / 8;
    const cellH = height / 8;

    // Clear
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, width, height);

    // Draw heatmap
    zones.forEach(zone => {
      const normalizedValue = Math.min(1, zone.value / 100);
      const m = metrics[metric];
      
      // Interpolate color
      const r1 = parseInt(m.colorLow.slice(1,3), 16);
      const g1 = parseInt(m.colorLow.slice(3,5), 16);
      const b1 = parseInt(m.colorLow.slice(5,7), 16);
      const r2 = parseInt(m.colorHigh.slice(1,3), 16);
      const g2 = parseInt(m.colorHigh.slice(3,5), 16);
      const b2 = parseInt(m.colorHigh.slice(5,7), 16);
      
      const r = Math.round(r1 + (r2 - r1) * normalizedValue);
      const g = Math.round(g1 + (g2 - g1) * normalizedValue);
      const b = Math.round(b1 + (b2 - b1) * normalizedValue);
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
      ctx.fillRect(zone.x * cellW + 2, zone.y * cellH + 2, cellW - 4, cellH - 4);
      
      // Border
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(zone.x * cellW + 2, zone.y * cellH + 2, cellW - 4, cellH - 4);
    });

    // Grid overlay
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellH);
      ctx.lineTo(width, i * cellH);
      ctx.stroke();
    }
  }, [zones, metric, metrics]);

  const currentMetric = metrics[metric];

  return (
    <div className="viz-section heatmap-overlay">
      <div className="section-header">
        <h3><Map size={20} /> Heatmap Overlay</h3>
        <p>Spatial distribution of metrics across the city grid</p>
      </div>

      <div className="metric-selector">
        {Object.entries(metrics).map(([key, m]) => (
          <button
            key={key}
            className={`metric-btn ${metric === key ? 'active' : ''}`}
            onClick={() => setMetric(key)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="heatmap-layout">
        <div className="heatmap-container">
          <canvas ref={canvasRef} width={400} height={400} />
          <div className="heatmap-legend">
            <span>Low</span>
            <div className="legend-gradient" style={{ 
              background: `linear-gradient(90deg, ${currentMetric.colorLow}, ${currentMetric.colorHigh})`
            }} />
            <span>High</span>
          </div>
        </div>

        <div className="heatmap-info">
          <div className="info-box description">
            <h4><Info size={16} /> What You're Seeing</h4>
            <p>{currentMetric.description}</p>
          </div>

          <div className="info-box insights">
            <h4><TrendingUp size={16} /> Key Insights</h4>
            <ul>
              {currentMetric.insights.map((insight, i) => (
                <li key={i}><ChevronRight size={14} /> {insight}</li>
              ))}
            </ul>
          </div>

          <div className="info-box stats">
            <h4><Activity size={16} /> Grid Statistics</h4>
            <div className="stat-row">
              <span>Highest Value:</span>
              <strong style={{ color: currentMetric.colorHigh }}>
                {Math.max(...zones.map(z => z.value))} {currentMetric.unit}
              </strong>
            </div>
            <div className="stat-row">
              <span>Lowest Value:</span>
              <strong style={{ color: currentMetric.colorLow }}>
                {Math.min(...zones.map(z => z.value))} {currentMetric.unit}
              </strong>
            </div>
            <div className="stat-row">
              <span>Average:</span>
              <strong>
                {Math.round(zones.reduce((a, z) => a + z.value, 0) / zones.length)} {currentMetric.unit}
              </strong>
            </div>
            <div className="stat-row">
              <span>Total Zones:</span>
              <strong>{zones.length}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ZONE COMPARISON ====================
function ZoneComparison() {
  const [zone1, setZone1] = useState('downtown');
  const [zone2, setZone2] = useState('industrial');

  const zoneData = {
    downtown: { name: 'Downtown', demand: 2450, aqi: 85, risk: 35, population: 45000, efficiency: 78 },
    industrial: { name: 'Industrial', demand: 3200, aqi: 120, risk: 55, population: 12000, efficiency: 65 },
    residential: { name: 'Residential', demand: 1800, aqi: 65, risk: 25, population: 85000, efficiency: 82 },
    medical: { name: 'Medical District', demand: 1950, aqi: 55, risk: 40, population: 8000, efficiency: 90 },
    airport: { name: 'Airport', demand: 2800, aqi: 95, risk: 45, population: 5000, efficiency: 72 },
  };

  const z1 = zoneData[zone1];
  const z2 = zoneData[zone2];

  const comparisonMetrics = [
    { key: 'demand', label: 'Demand (kW)', max: 4000 },
    { key: 'aqi', label: 'AQI', max: 200 },
    { key: 'risk', label: 'Risk Score', max: 100 },
    { key: 'efficiency', label: 'Efficiency %', max: 100 },
  ];

  return (
    <div className="viz-section zone-comparison">
      <div className="section-header">
        <h3><GitCompare size={20} /> Zone Comparison</h3>
        <p>Side-by-side analysis of two zones</p>
      </div>

      <div className="zone-selectors">
        <div className="zone-select">
          <label>Zone A</label>
          <select value={zone1} onChange={(e) => setZone1(e.target.value)}>
            {Object.entries(zoneData).map(([key, z]) => (
              <option key={key} value={key}>{z.name}</option>
            ))}
          </select>
        </div>
        <div className="vs-badge">VS</div>
        <div className="zone-select">
          <label>Zone B</label>
          <select value={zone2} onChange={(e) => setZone2(e.target.value)}>
            {Object.entries(zoneData).map(([key, z]) => (
              <option key={key} value={key}>{z.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="comparison-bars">
        {comparisonMetrics.map(m => {
          const v1 = z1[m.key];
          const v2 = z2[m.key];
          const p1 = (v1 / m.max) * 100;
          const p2 = (v2 / m.max) * 100;
          const winner = v1 < v2 ? 'left' : v1 > v2 ? 'right' : 'tie';
          
          return (
            <div key={m.key} className="comparison-row">
              <div className="bar-container left">
                <span className={`value ${winner === 'left' ? 'winner' : ''}`}>{v1}</span>
                <div className="bar">
                  <div className="bar-fill left" style={{ width: `${p1}%` }} />
                </div>
              </div>
              <div className="metric-label">{m.label}</div>
              <div className="bar-container right">
                <div className="bar">
                  <div className="bar-fill right" style={{ width: `${p2}%` }} />
                </div>
                <span className={`value ${winner === 'right' ? 'winner' : ''}`}>{v2}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="zone-cards">
        <div className="zone-card">
          <h4 style={{ color: '#00d4ff' }}>{z1.name}</h4>
          <p>Population: {z1.population.toLocaleString()}</p>
        </div>
        <div className="zone-card">
          <h4 style={{ color: '#aa66ff' }}>{z2.name}</h4>
          <p>Population: {z2.population.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// ==================== NETWORK FLOW ====================
function NetworkFlow() {
  const canvasRef = useRef(null);
  const [flowType, setFlowType] = useState('energy');

  const flowTypes = {
    energy: { name: 'Energy Flow', color: '#00ff88' },
    data: { name: 'Data Flow', color: '#00d4ff' },
    alerts: { name: 'Alert Propagation', color: '#ff4466' },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    let animationId;
    let time = 0;

    // Define nodes
    const nodes = [
      { id: 'power', x: width * 0.1, y: height * 0.5, label: 'Power Plant', size: 25 },
      { id: 'sub1', x: width * 0.3, y: height * 0.3, label: 'Substation A', size: 18 },
      { id: 'sub2', x: width * 0.3, y: height * 0.7, label: 'Substation B', size: 18 },
      { id: 'dist1', x: width * 0.55, y: height * 0.2, label: 'Downtown', size: 20 },
      { id: 'dist2', x: width * 0.55, y: height * 0.5, label: 'Industrial', size: 20 },
      { id: 'dist3', x: width * 0.55, y: height * 0.8, label: 'Residential', size: 20 },
      { id: 'end1', x: width * 0.85, y: height * 0.25, label: 'Hospital', size: 15 },
      { id: 'end2', x: width * 0.85, y: height * 0.5, label: 'Factory', size: 15 },
      { id: 'end3', x: width * 0.85, y: height * 0.75, label: 'Homes', size: 15 },
    ];

    // Define edges
    const edges = [
      { from: 'power', to: 'sub1', flow: 100 },
      { from: 'power', to: 'sub2', flow: 80 },
      { from: 'sub1', to: 'dist1', flow: 60 },
      { from: 'sub1', to: 'dist2', flow: 40 },
      { from: 'sub2', to: 'dist2', flow: 30 },
      { from: 'sub2', to: 'dist3', flow: 50 },
      { from: 'dist1', to: 'end1', flow: 60 },
      { from: 'dist2', to: 'end2', flow: 70 },
      { from: 'dist3', to: 'end3', flow: 50 },
    ];

    const draw = () => {
      time += 0.02;
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, width, height);

      const color = flowTypes[flowType].color;

      // Draw edges with animated flow
      edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        // Base line
        ctx.strokeStyle = `rgba(${hexToRgb(color)}, 0.2)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();

        // Animated particles along the edge
        const particleCount = Math.ceil(edge.flow / 20);
        for (let i = 0; i < particleCount; i++) {
          const t = ((time * 0.5 + i / particleCount) % 1);
          const px = fromNode.x + (toNode.x - fromNode.x) * t;
          const py = fromNode.y + (toNode.y - fromNode.y) * t;
          
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow
          const glow = ctx.createRadialGradient(px, py, 0, px, py, 10);
          glow.addColorStop(0, `rgba(${hexToRgb(color)}, 0.5)`);
          glow.addColorStop(1, `rgba(${hexToRgb(color)}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        // Glow
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 2);
        glow.addColorStop(0, `rgba(${hexToRgb(color)}, 0.3)`);
        glow.addColorStop(1, `rgba(${hexToRgb(color)}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Node circle
        ctx.fillStyle = '#0a0f19';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.size + 15);
      });

      animationId = requestAnimationFrame(draw);
    };

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [flowType, flowTypes]);

  return (
    <div className="viz-section network-flow">
      <div className="section-header">
        <h3><Network size={20} /> Network Flow Animation</h3>
        <p>Visualize energy, data, and alert propagation through the grid</p>
      </div>

      <div className="flow-selector">
        {Object.entries(flowTypes).map(([key, f]) => (
          <button
            key={key}
            className={`flow-btn ${flowType === key ? 'active' : ''}`}
            onClick={() => setFlowType(key)}
            style={{ '--flow-color': f.color }}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="network-container">
        <canvas ref={canvasRef} width={600} height={350} />
      </div>

      <div className="flow-legend">
        <div className="legend-item">
          <span className="node-icon source"></span>
          Source Nodes
        </div>
        <div className="legend-item">
          <span className="node-icon relay"></span>
          Distribution
        </div>
        <div className="legend-item">
          <span className="node-icon end"></span>
          End Points
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function AdvancedViz() {
  const [activeTab, setActiveTab] = useState('recovery');

  const tabs = [
    { id: 'recovery', label: 'Recovery Timeline', icon: Clock },
    { id: 'heatmap', label: 'Heatmap', icon: Map },
    { id: 'comparison', label: 'Zone Compare', icon: GitCompare },
    { id: 'network', label: 'Network Flow', icon: Network },
  ];

  return (
    <div className="advanced-viz-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1><Activity size={32} /> Advanced Visualizations</h1>
        <p>Interactive data visualizations for in-depth analysis</p>
      </motion.div>

      <div className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="viz-content">
        {activeTab === 'recovery' && <RecoveryTimeline />}
        {activeTab === 'heatmap' && <HeatmapOverlay />}
        {activeTab === 'comparison' && <ZoneComparison />}
        {activeTab === 'network' && <NetworkFlow />}
      </div>

      <style>{`
        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: var(--text-secondary);
        }

        .tab-nav {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          font-family: var(--font-display);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab-btn:hover {
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }

        .tab-btn.active {
          background: rgba(0, 255, 136, 0.1);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.2);
        }

        /* Section styles */
        .viz-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
        }

        .section-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        /* Recovery Timeline */
        .scenario-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .scenario-btn {
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scenario-btn:hover {
          border-color: var(--sc-color);
          color: var(--sc-color);
        }

        .scenario-btn.active {
          background: color-mix(in srgb, var(--sc-color) 20%, var(--bg-secondary));
          border-color: var(--sc-color);
          color: var(--sc-color);
        }

        .timeline-chart {
          position: relative;
          margin-bottom: 1rem;
        }

        .time-marker {
          position: absolute;
          bottom: 30px;
          width: 2px;
          height: calc(100% - 50px);
          background: #ffffff;
          box-shadow: 0 0 10px #ffffff;
          pointer-events: none;
          transition: left 0.2s;
        }

        .timeline-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ctrl-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 50%;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .ctrl-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .time-slider {
          flex: 1;
        }

        .time-label {
          font-family: var(--font-mono);
          color: var(--accent-secondary);
          min-width: 60px;
        }

        .phase-indicators {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .phase {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          border-radius: 4px;
          transition: all 0.3s;
        }

        .phase.active {
          background: rgba(0, 212, 255, 0.1);
          color: var(--text-primary);
        }

        .phase-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .current-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .current-stats .stat {
          text-align: center;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .current-stats .stat-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .current-stats .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-display);
        }

        /* Heatmap */
        .metric-selector {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .metric-btn {
          padding: 0.75rem 1.25rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .metric-btn:hover {
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
          transform: translateY(-2px);
        }

        .metric-btn.active {
          background: rgba(0, 212, 255, 0.2);
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
        }

        .heatmap-layout {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 900px) {
          .heatmap-layout {
            grid-template-columns: 1fr;
          }
        }

        .heatmap-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .heatmap-container canvas {
          border: 2px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 0 30px rgba(0, 212, 255, 0.1);
        }

        .heatmap-legend {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 1rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .legend-gradient {
          width: 180px;
          height: 16px;
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.2);
        }

        .heatmap-info {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .info-box {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 1.25rem;
        }

        .info-box h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          color: var(--accent-secondary);
          margin-bottom: 0.75rem;
        }

        .info-box p {
          font-size: 1rem;
          line-height: 1.7;
          color: var(--text-secondary);
        }

        .info-box ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .info-box li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.95rem;
          color: var(--text-secondary);
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color);
        }

        .info-box li:last-child {
          border-bottom: none;
        }

        .info-box li svg {
          color: var(--accent-primary);
          flex-shrink: 0;
          margin-top: 0.2rem;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 0.6rem 0;
          border-bottom: 1px solid var(--border-color);
          font-size: 1rem;
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-row span {
          color: var(--text-muted);
        }

        .stat-row strong {
          font-family: var(--font-mono);
        }

        /* Zone Comparison */
        .zone-selectors {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .zone-select {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .zone-select label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .zone-select select {
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.9rem;
          min-width: 150px;
        }

        .vs-badge {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 50px;
          font-weight: 700;
          font-family: var(--font-display);
          color: #000;
        }

        .comparison-bars {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .comparison-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 1rem;
        }

        .bar-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .bar-container.left {
          flex-direction: row-reverse;
        }

        .bar {
          flex: 1;
          height: 20px;
          background: var(--bg-secondary);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          transition: width 0.5s ease;
        }

        .bar-fill.left {
          background: linear-gradient(90deg, var(--accent-secondary), #00d4ff88);
          margin-left: auto;
        }

        .bar-fill.right {
          background: linear-gradient(90deg, #aa66ff88, var(--accent-purple));
        }

        .bar-container .value {
          font-family: var(--font-mono);
          font-size: 0.9rem;
          min-width: 50px;
        }

        .bar-container.left .value {
          text-align: right;
          color: var(--accent-secondary);
        }

        .bar-container.right .value {
          text-align: left;
          color: var(--accent-purple);
        }

        .value.winner {
          font-weight: 700;
        }

        .metric-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          min-width: 100px;
        }

        .zone-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .zone-card {
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          text-align: center;
        }

        .zone-card h4 {
          margin-bottom: 0.5rem;
        }

        .zone-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        /* Network Flow */
        .flow-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .flow-btn {
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .flow-btn:hover {
          border-color: var(--flow-color);
          color: var(--flow-color);
        }

        .flow-btn.active {
          background: color-mix(in srgb, var(--flow-color) 15%, var(--bg-secondary));
          border-color: var(--flow-color);
          color: var(--flow-color);
        }

        .network-container {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .network-container canvas {
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }

        .flow-legend {
          display: flex;
          justify-content: center;
          gap: 2rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .node-icon {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--accent-primary);
        }

        .node-icon.source {
          background: var(--accent-primary);
        }

        .node-icon.relay {
          background: transparent;
        }

        .node-icon.end {
          width: 10px;
          height: 10px;
        }
      `}</style>
    </div>
  );
}

