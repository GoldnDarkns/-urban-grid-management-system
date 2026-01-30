import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, Clock, Map, GitCompare, Network, Play, Pause, 
  RotateCcw, ChevronRight, Zap, AlertTriangle, TrendingUp, Info,
  Database, Code, PlayCircle, Loader
} from 'lucide-react';
import { queriesAPI, analyticsAPI, dataAPI, cityAPI } from '../services/api';
import { useAppMode } from '../utils/useAppMode';
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
  const { mode } = useAppMode();
  const [currentCityId, setCurrentCityId] = useState(null);
  const [metric, setMetric] = useState('demand');
  const [hoveredZone, setHoveredZone] = useState(null);
  const [realData, setRealData] = useState({ zones: [], demand: [], aqi: [], risk: [] });
  const canvasRef = useRef(null);

  useEffect(() => {
    if (mode === 'city') {
      cityAPI.getCurrentCity().then((r) => setCurrentCityId(r.data?.city_id || null)).catch(() => setCurrentCityId(null));
    } else {
      setCurrentCityId(null);
    }
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
    fetchRealData();
  }, [mode, currentCityId]);

  const fetchRealData = async () => {
    try {
      if (mode === 'city' && !currentCityId) return;
      if (mode === 'city' && currentCityId) {
        const [processedRes, zoneCoordsRes] = await Promise.all([
          cityAPI.getProcessedData(currentCityId, null, 100).catch(() => ({ data: { zones: [] } })),
          cityAPI.getZoneCoordinates(currentCityId).catch(() => ({ data: { zones: [] } }))
        ]);
        const zones = processedRes.data?.zones || [];
        const zoneCoords = zoneCoordsRes.data?.zones || [];
        const zoneNameMap = new Map(zoneCoords.map((z) => [z.zone_id, z.name || z.zone_id]));
        const zonesList = (zoneCoords.length ? zoneCoords : zones).map((z) => ({
          _id: z.zone_id || z._id,
          name: zoneNameMap.get(z.zone_id) || z.name || z.zone_id,
          zone_type: 'Standard'
        }));
        const demand = zones.map((z) => {
          const kwh = z.ml_processed?.demand_forecast?.next_hour_kwh ?? 0;
          return { zone_id: z.zone_id, avg_kwh: kwh, total_kwh: kwh };
        });
        const aqi = {};
        zones.forEach((z) => {
          const v = z.raw_data?.aqi?.aqi ?? z.ml_processed?.aqi_prediction?.next_hour_aqi ?? 0;
          if (z.zone_id) aqi[z.zone_id] = { avg_aqi: v };
        });
        const risk = zones.map((z) => ({
          zone_id: z.zone_id,
          risk_score: z.ml_processed?.risk_score?.score ?? 0
        }));
        setRealData({ zones: zonesList, demand, aqi, risk });
        return;
      }
      const [zonesRes, demandRes, aqiRes, riskRes] = await Promise.all([
        dataAPI.getZones().catch(() => ({ data: { zones: [] } })),
        analyticsAPI.getDemandByZone().catch(() => ({ data: { data: [] } })),
        analyticsAPI.getAQIByZone().catch(() => ({ data: { data: {} } })),
        analyticsAPI.getZoneRisk().catch(() => ({ data: { data: [] } }))
      ]);
      setRealData({
        zones: zonesRes.data.zones || [],
        demand: demandRes.data.data || [],
        aqi: aqiRes.data.data || {},
        risk: riskRes.data.data || []
      });
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    }
  };

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

  // Generate zone data from real ML outputs
  const zones = useMemo(() => {
    const data = [];
    const realZones = realData.zones.slice(0, 64); // Limit to 64 zones for 8x8 grid
    const gridSize = 8;
    
    realZones.forEach((zone, idx) => {
      const x = idx % gridSize;
      const y = Math.floor(idx / gridSize);
      
      let value = 0;
      let zoneName = zone.name || zone._id;
      let zoneType = zone.zone_type || 'Standard';
      
      if (metric === 'demand') {
        // Use real demand data
        const zoneDemand = realData.demand.find(d => d.zone_id === zone._id);
        value = zoneDemand ? (zoneDemand.avg_kwh || zoneDemand.total_kwh || 0) : 0;
      } else if (metric === 'aqi') {
        // Use real AQI data
        const zoneAQI = realData.aqi[zone._id];
        value = zoneAQI ? (zoneAQI.avg_aqi || 0) : 50; // Default to moderate
      } else if (metric === 'risk') {
        // Use real risk scores from GNN/analytics
        const zoneRisk = realData.risk.find(r => r.zone_id === zone._id);
        value = zoneRisk ? (zoneRisk.risk_score || 0) : 20; // Default to low risk
      }
      
      data.push({
        x, y,
        value: Math.round(value),
        name: zoneName,
        type: zoneType,
        zoneId: zone._id
      });
    });
    
    // Fill remaining slots if we have fewer than 64 zones
    while (data.length < 64) {
      const idx = data.length;
      const x = idx % gridSize;
      const y = Math.floor(idx / gridSize);
      data.push({
        x, y,
        value: 0,
        name: `Zone ${idx + 1}`,
        type: 'Empty'
      });
    }
    
    return data;
  }, [metric, realData]);

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
  const { mode } = useAppMode();
  const [currentCityId, setCurrentCityId] = useState(null);
  const [zone1, setZone1] = useState(null);
  const [zone2, setZone2] = useState(null);
  const [zonesData, setZonesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode === 'city') {
      cityAPI.getCurrentCity().then((r) => setCurrentCityId(r.data?.city_id || null)).catch(() => setCurrentCityId(null));
    } else {
      setCurrentCityId(null);
    }
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
    fetchZonesData();
  }, [mode, currentCityId]);

  const fetchZonesData = async () => {
    try {
      if (mode === 'city' && !currentCityId) {
        setLoading(false);
        return;
      }
      if (mode === 'city' && currentCityId) {
        const [processedRes, zoneCoordsRes] = await Promise.all([
          cityAPI.getProcessedData(currentCityId, null, 100).catch(() => ({ data: { zones: [] } })),
          cityAPI.getZoneCoordinates(currentCityId).catch(() => ({ data: { zones: [] } }))
        ]);
        const zones = processedRes.data?.zones || [];
        const zoneCoords = zoneCoordsRes.data?.zones || [];
        const zoneNameMap = new Map(zoneCoords.map((z) => [z.zone_id, z.name || z.zone_id]));
        const zonesList = (zoneCoords.length ? zoneCoords : zones).map((z) => ({
          _id: z.zone_id || z._id,
          name: zoneNameMap.get(z.zone_id) || z.name || z.zone_id,
          population_est: 0
        }));
        const demand = zones.map((z) => {
          const kwh = z.ml_processed?.demand_forecast?.next_hour_kwh ?? 0;
          return { zone_id: z.zone_id, avg_kwh: kwh, total_kwh: kwh };
        });
        const aqi = {};
        zones.forEach((z) => {
          const v = z.raw_data?.aqi?.aqi ?? z.ml_processed?.aqi_prediction?.next_hour_aqi ?? 0;
          if (z.zone_id) aqi[z.zone_id] = { avg_aqi: v };
        });
        const risk = zones.map((z) => ({
          zone_id: z.zone_id,
          risk_score: z.ml_processed?.risk_score?.score ?? 0
        }));
        const combined = zonesList.slice(0, 10).map((zone) => {
          const zoneDemand = demand.find((d) => d.zone_id === zone._id);
          const zoneAQI = aqi[zone._id];
          const zoneRisk = risk.find((r) => r.zone_id === zone._id);
          const d = zoneDemand ? (zoneDemand.avg_kwh || zoneDemand.total_kwh || 0) : 0;
          return {
            id: zone._id,
            name: zone.name || zone._id,
            demand: d,
            aqi: zoneAQI ? (zoneAQI.avg_aqi || 0) : 0,
            risk: zoneRisk ? (zoneRisk.risk_score || 0) : 0,
            population: zone.population_est || 0,
            efficiency: d ? Math.min(100, (d / 100) * 100) : 0
          };
        });
        setZonesData(combined);
        if (combined.length >= 2) {
          setZone1(combined[0].id);
          setZone2(combined[1].id);
        }
        setLoading(false);
        return;
      }
      const [zonesRes, demandRes, aqiRes, riskRes] = await Promise.all([
        dataAPI.getZones().catch(() => ({ data: { zones: [] } })),
        analyticsAPI.getDemandByZone().catch(() => ({ data: { data: [] } })),
        analyticsAPI.getAQIByZone().catch(() => ({ data: { data: {} } })),
        analyticsAPI.getZoneRisk().catch(() => ({ data: { data: [] } }))
      ]);
      const zones = zonesRes.data.zones || [];
      const demand = demandRes.data.data || [];
      const aqi = aqiRes.data.data || {};
      const risk = riskRes.data.data || [];
      const combined = zones.slice(0, 10).map((zone) => {
        const zoneDemand = demand.find((d) => d.zone_id === zone._id);
        const zoneAQI = aqi[zone._id];
        const zoneRisk = risk.find((r) => r.zone_id === zone._id);
        return {
          id: zone._id,
          name: zone.name || zone._id,
          demand: zoneDemand ? (zoneDemand.avg_kwh || zoneDemand.total_kwh || 0) : 0,
          aqi: zoneAQI ? (zoneAQI.avg_aqi || 0) : 0,
          risk: zoneRisk ? (zoneRisk.risk_score || 0) : 0,
          population: zone.population_est || 0,
          efficiency: zoneDemand && zoneDemand.avg_kwh ? Math.min(100, (zoneDemand.avg_kwh / 100) * 100) : 0
        };
      });
      setZonesData(combined);
      if (combined.length >= 2) {
        setZone1(combined[0].id);
        setZone2(combined[1].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching zone comparison data:', error);
      setLoading(false);
    }
  };

  const zoneData = zonesData.reduce((acc, zone) => {
    acc[zone.id] = zone;
    return acc;
  }, {});

  const z1 = zone1 ? zoneData[zone1] : null;
  const z2 = zone2 ? zoneData[zone2] : null;

  if (loading) {
    return (
      <div className="viz-section zone-comparison">
        <div className="section-header">
          <h3><GitCompare size={20} /> Zone Comparison</h3>
          <p>Loading zone data...</p>
        </div>
      </div>
    );
  }

  if (!z1 || !z2 || zonesData.length === 0) {
    return (
      <div className="viz-section zone-comparison">
        <div className="section-header">
          <h3><GitCompare size={20} /> Zone Comparison</h3>
          <p>Select two zones to compare</p>
        </div>
      </div>
    );
  }

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
          <select value={zone1 || ''} onChange={(e) => setZone1(e.target.value)}>
            {zonesData.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
        <div className="vs-badge">VS</div>
        <div className="zone-select">
          <label>Zone B</label>
          <select value={zone2 || ''} onChange={(e) => setZone2(e.target.value)}>
            {zonesData.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
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

// ==================== MONGODB QUERIES ====================
// Query code templates for display
const QUERY_CODES = {
  // READ queries (1-10)
  1: `db.zones.find({ "critical_sites": "hospital" }).limit(10)`,
  2: `db.zones.find({}).sort({ "grid_priority": -1 }).limit(10)`,
  3: `db.grid_edges.find({ "from_zone": "Z_001" })`,
  4: `db.meter_readings.aggregate([
  { "$match": { "zone_id": "Z_001", "ts": { "$gte": ISODate() } }},
  { "$group": { "_id": { "hour": { "$hour": "$ts" }}, "total_kwh": { "$sum": "$kwh" }}}
])`,
  5: `db.air_climate_readings.aggregate([
  { "$match": { "aqi": { "$gte": 101 } }},
  { "$group": { "_id": "$zone_id", "violation_count": { "$sum": 1 }, "max_aqi": { "$max": "$aqi" }}}
])`,
  6: `// Find households with consumption > 2x baseline
db.meter_readings.find({ "kwh": { "$gt": baseline * 2 } })`,
  7: `db.constraint_events.find({
  "$or": [{ "end_ts": { "$gte": now } }, { "start_ts": { "$gte": weekAgo } }]
}).sort({ "start_ts": -1 })`,
  8: `// Calculate risk score per zone based on priority, critical sites, AQI, demand
db.zones.aggregate([...riskCalculationPipeline])`,
  9: `// Join meter_readings with air_climate_readings by hour
db.meter_readings.aggregate([...demandTempCorrelation])`,
  10: `db.zones.find({ "critical_sites": { "$exists": true, "$ne": [] } })`,
  // CRUD queries (11-15)
  11: `// INSERT new meter reading
db.meter_readings.insertOne({
  "zone_id": "Z_001",
  "household_id": "H_001", 
  "kwh": 1.5,
  "ts": ISODate("2024-01-15T10:00:00Z")
})`,
  12: `// UPDATE meter reading - change kWh value
db.meter_readings.updateOne(
  { "zone_id": "Z_001", "household_id": "H_001" },
  { "$set": { "kwh": 2.5 } }
)`,
  13: `// INSERT new AQI reading
db.air_climate_readings.insertOne({
  "zone_id": "Z_001",
  "aqi": 85,
  "temperature_c": 25.5,
  "humidity": 60,
  "ts": ISODate("2024-01-15T10:00:00Z")
})`,
  14: `// UPDATE AQI reading - change AQI and temperature
db.air_climate_readings.updateOne(
  { "zone_id": "Z_001" },
  { "$set": { "aqi": 120, "temperature_c": 28.0 } }
)`,
  15: `// DELETE old readings (older than 168 hours)
db.meter_readings.deleteMany({
  "ts": { "$lt": ISODate("cutoff_time") },
  "zone_id": "Z_001"  // optional filter
})`
};

function MongoDBQueries() {
  const { mode } = useAppMode();
  const [currentCityId, setCurrentCityId] = useState(null);
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ zone_id: 'Z_001', limit: 10, hours: 24 });
  const [showCode, setShowCode] = useState(false);
  
  // CRUD form state
  const [crudForm, setCrudForm] = useState({
    zone_id: 'Z_001',
    household_id: 'H_001',
    kwh: 1.5,
    new_kwh: 2.5,
    aqi: 85,
    new_aqi: 120,
    temperature_c: 25.5,
    new_temperature_c: 28.0,
    humidity: 60,
    hours_old: 168,
    collection: 'meter_readings'
  });

  useEffect(() => {
    if (mode === 'city') {
      cityAPI.getCurrentCity().then((r) => setCurrentCityId(r.data?.city_id || null)).catch(() => setCurrentCityId(null));
    } else {
      setCurrentCityId(null);
    }
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
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      const response = await queriesAPI.listQueries();
      setQueries(response.data.queries || []);
    } catch (err) {
      setError('Failed to load queries');
      console.error(err);
    }
  };

  const executeQuery = async (queryId) => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // CRUD queries (11-15) use POST with body
      if (queryId >= 11 && queryId <= 15) {
        let body = {};
        
        if (queryId === 11) {
          // INSERT Meter Reading
          body = {
            zone_id: crudForm.zone_id,
            household_id: crudForm.household_id,
            kwh: parseFloat(crudForm.kwh),
            ts: new Date().toISOString()
          };
        } else if (queryId === 12) {
          // UPDATE Meter Reading
          body = {
            zone_id: crudForm.zone_id,
            household_id: crudForm.household_id,
            new_kwh: parseFloat(crudForm.new_kwh)
          };
        } else if (queryId === 13) {
          // INSERT AQI Reading
          body = {
            zone_id: crudForm.zone_id,
            aqi: parseInt(crudForm.aqi),
            temperature_c: parseFloat(crudForm.temperature_c),
            humidity: parseInt(crudForm.humidity),
            ts: new Date().toISOString()
          };
        } else if (queryId === 14) {
          // UPDATE AQI Reading
          body = {
            zone_id: crudForm.zone_id,
            new_aqi: parseInt(crudForm.new_aqi),
            new_temperature_c: parseFloat(crudForm.new_temperature_c)
          };
        } else if (queryId === 15) {
          // DELETE Old Readings
          body = {
            collection: crudForm.collection,
            hours_old: parseInt(crudForm.hours_old),
            zone_id: crudForm.zone_id
          };
        }
        
        const response = await queriesAPI.executeCrudQuery(queryId, body);
        setResults(response.data);
      } else {
        // READ queries (1-10) use GET with params
        const queryParams = { ...params };
        if (queryId === 3 || queryId === 4) {
          queryParams.zone_id = params.zone_id;
        }
        if (queryId === 4 || queryId === 9) {
          queryParams.hours = params.hours;
        }
        if (queryId !== 3 && queryId !== 4 && queryId !== 9) {
          queryParams.limit = params.limit;
        }
        if (mode === 'city' && currentCityId) {
          queryParams.city_id = currentCityId;
        }
        
        const response = await queriesAPI.executeQuery(queryId, queryParams);
        setResults(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute query');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const basicQueries = queries.filter(q => q.type === 'basic');
  const advancedQueries = queries.filter(q => q.type === 'advanced');
  const crudQueries = queries.filter(q => q.type === 'crud');

  return (
    <div className="viz-section mongodb-queries">
      <div className="section-header">
        <h3><Database size={20} /> MongoDB Queries</h3>
        <p>Execute READ queries (1-10) and CRUD operations (11-15) on MongoDB Atlas</p>
      </div>

      <div className="queries-layout">
        <div className="queries-sidebar">
          <h4>Available Queries</h4>
          
          <div className="query-group">
            <h5>READ - Basic (3)</h5>
            {basicQueries.map(query => (
              <div
                key={query.id}
                className={`query-item ${selectedQuery?.id === query.id ? 'active' : ''}`}
                onClick={() => setSelectedQuery(query)}
              >
                <div className="query-number">{query.id}</div>
                <div className="query-info">
                  <div className="query-name">{query.name}</div>
                  <div className="query-desc">{query.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="query-group">
            <h5>READ - Advanced (7)</h5>
            {advancedQueries.map(query => (
              <div
                key={query.id}
                className={`query-item ${selectedQuery?.id === query.id ? 'active' : ''}`}
                onClick={() => setSelectedQuery(query)}
              >
                <div className="query-number">{query.id}</div>
                <div className="query-info">
                  <div className="query-name">{query.name}</div>
                  <div className="query-desc">{query.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="query-group crud-group">
            <h5>CRUD Operations (5)</h5>
            {crudQueries.map(query => (
              <div
                key={query.id}
                className={`query-item crud ${selectedQuery?.id === query.id ? 'active' : ''} ${query.operation}`}
                onClick={() => setSelectedQuery(query)}
              >
                <div className={`query-number ${query.operation}`}>{query.id}</div>
                <div className="query-info">
                  <div className="query-name">{query.name}</div>
                  <div className="query-desc">{query.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="queries-main">
          {selectedQuery ? (
            <>
              <div className="query-header">
                <div>
                  <h4>Query {selectedQuery.id}: {selectedQuery.name}</h4>
                  <p>{selectedQuery.description}</p>
                  <div className="query-meta">
                    <span>Collection: {selectedQuery.collection}</span>
                    <span>Type: {selectedQuery.type}</span>
                  </div>
                </div>
                <div className="query-actions">
                  <button
                    className="code-toggle-btn"
                    onClick={() => setShowCode(!showCode)}
                  >
                    <Code size={18} />
                    {showCode ? 'Hide Code' : 'Show Code'}
                  </button>
                  <button
                    className="execute-btn"
                    onClick={() => executeQuery(selectedQuery.id)}
                    disabled={loading}
                  >
                    {loading ? <Loader size={18} className="spin" /> : <PlayCircle size={18} />}
                    Execute Query
                  </button>
                </div>
              </div>

              {showCode && QUERY_CODES[selectedQuery.id] && (
                <div className="query-code-display">
                  <div className="code-header">
                    <span><Code size={14} /> MongoDB Query Code</span>
                  </div>
                  <pre>{QUERY_CODES[selectedQuery.id]}</pre>
                </div>
              )}

              {/* READ query params (1-10) */}
              {(selectedQuery.id === 3 || selectedQuery.id === 4) && selectedQuery.id <= 10 && (
                <div className="query-params">
                  <label>
                    Zone ID:
                    <input
                      type="text"
                      value={params.zone_id}
                      onChange={(e) => setParams({ ...params, zone_id: e.target.value })}
                      placeholder="Z_001"
                    />
                  </label>
                </div>
              )}
              {selectedQuery.id === 4 && (
                <div className="query-params">
                  <label>
                    Hours:
                    <input
                      type="number"
                      value={params.hours}
                      onChange={(e) => setParams({ ...params, hours: parseInt(e.target.value) || 24 })}
                      min="1"
                      max="168"
                    />
                  </label>
                </div>
              )}
              {selectedQuery.id <= 10 && selectedQuery.id !== 3 && selectedQuery.id !== 4 && selectedQuery.id !== 9 && (
                <div className="query-params">
                  <label>
                    Limit:
                    <input
                      type="number"
                      value={params.limit}
                      onChange={(e) => setParams({ ...params, limit: parseInt(e.target.value) || 10 })}
                      min="1"
                      max="100"
                    />
                  </label>
                </div>
              )}

              {/* CRUD query forms (11-15) */}
              {selectedQuery.id === 11 && (
                <div className="crud-form">
                  <h5>INSERT Meter Reading</h5>
                  <div className="crud-form-grid">
                    <label>
                      Zone ID:
                      <input type="text" value={crudForm.zone_id} onChange={(e) => setCrudForm({...crudForm, zone_id: e.target.value})} />
                    </label>
                    <label>
                      Household ID:
                      <input type="text" value={crudForm.household_id} onChange={(e) => setCrudForm({...crudForm, household_id: e.target.value})} />
                    </label>
                    <label>
                      kWh (Energy):
                      <input type="number" step="0.1" value={crudForm.kwh} onChange={(e) => setCrudForm({...crudForm, kwh: e.target.value})} />
                    </label>
                  </div>
                </div>
              )}

              {selectedQuery.id === 12 && (
                <div className="crud-form">
                  <h5>UPDATE Meter Reading</h5>
                  <div className="crud-form-grid">
                    <label>
                      Zone ID:
                      <input type="text" value={crudForm.zone_id} onChange={(e) => setCrudForm({...crudForm, zone_id: e.target.value})} />
                    </label>
                    <label>
                      Household ID (optional):
                      <input type="text" value={crudForm.household_id} onChange={(e) => setCrudForm({...crudForm, household_id: e.target.value})} />
                    </label>
                    <label>
                      New kWh Value:
                      <input type="number" step="0.1" value={crudForm.new_kwh} onChange={(e) => setCrudForm({...crudForm, new_kwh: e.target.value})} />
                    </label>
                  </div>
                </div>
              )}

              {selectedQuery.id === 13 && (
                <div className="crud-form">
                  <h5>INSERT AQI Reading</h5>
                  <div className="crud-form-grid">
                    <label>
                      Zone ID:
                      <input type="text" value={crudForm.zone_id} onChange={(e) => setCrudForm({...crudForm, zone_id: e.target.value})} />
                    </label>
                    <label>
                      AQI Value:
                      <input type="number" value={crudForm.aqi} onChange={(e) => setCrudForm({...crudForm, aqi: e.target.value})} />
                    </label>
                    <label>
                      Temperature (°C):
                      <input type="number" step="0.1" value={crudForm.temperature_c} onChange={(e) => setCrudForm({...crudForm, temperature_c: e.target.value})} />
                    </label>
                    <label>
                      Humidity (%):
                      <input type="number" value={crudForm.humidity} onChange={(e) => setCrudForm({...crudForm, humidity: e.target.value})} />
                    </label>
                  </div>
                </div>
              )}

              {selectedQuery.id === 14 && (
                <div className="crud-form">
                  <h5>UPDATE AQI Reading</h5>
                  <div className="crud-form-grid">
                    <label>
                      Zone ID:
                      <input type="text" value={crudForm.zone_id} onChange={(e) => setCrudForm({...crudForm, zone_id: e.target.value})} />
                    </label>
                    <label>
                      New AQI Value:
                      <input type="number" value={crudForm.new_aqi} onChange={(e) => setCrudForm({...crudForm, new_aqi: e.target.value})} />
                    </label>
                    <label>
                      New Temperature (°C):
                      <input type="number" step="0.1" value={crudForm.new_temperature_c} onChange={(e) => setCrudForm({...crudForm, new_temperature_c: e.target.value})} />
                    </label>
                  </div>
                </div>
              )}

              {selectedQuery.id === 15 && (
                <div className="crud-form">
                  <h5>DELETE Old Readings</h5>
                  <div className="crud-form-grid">
                    <label>
                      Collection:
                      <select value={crudForm.collection} onChange={(e) => setCrudForm({...crudForm, collection: e.target.value})}>
                        <option value="meter_readings">meter_readings (Energy)</option>
                        <option value="air_climate_readings">air_climate_readings (AQI)</option>
                      </select>
                    </label>
                    <label>
                      Zone ID (optional):
                      <input type="text" value={crudForm.zone_id} onChange={(e) => setCrudForm({...crudForm, zone_id: e.target.value})} />
                    </label>
                    <label>
                      Delete older than (hours):
                      <input type="number" value={crudForm.hours_old} onChange={(e) => setCrudForm({...crudForm, hours_old: e.target.value})} />
                    </label>
                  </div>
                  <p className="crud-warning">⚠️ This will permanently delete data from MongoDB Atlas!</p>
                </div>
              )}

              {error && (
                <div className="query-error">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}

              {results && (
                <div className={`query-results ${results.success ? 'success' : ''}`}>
                  <div className="results-header">
                    <h5>{results.success ? '✓ Operation Successful' : 'Results'}</h5>
                    <span className="results-count">
                      {results.count !== undefined ? `${results.count} records` : 
                       results.success ? results.operation?.toUpperCase() : ''}
                    </span>
                  </div>
                  {results.message && (
                    <div className="results-message">{results.message}</div>
                  )}
                  <div className="results-content">
                    <pre>{JSON.stringify(results.results || results.document || results, null, 2)}</pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-query-selected">
              <Database size={48} />
              <p>Select a query from the list to execute it</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .mongodb-queries {
          padding: 2rem;
        }
        .queries-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
          margin-top: 2rem;
        }
        .queries-sidebar {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          max-height: 80vh;
          overflow-y: auto;
        }
        .queries-sidebar h4 {
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }
        .query-group {
          margin-bottom: 2rem;
        }
        .query-group h5 {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .query-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .query-item:hover {
          border-color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.05);
        }
        .query-item.active {
          border-color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.1);
        }
        .query-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-primary);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }
        .query-info {
          flex: 1;
        }
        .query-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .query-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .queries-main {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
        }
        .query-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .query-header h4 {
          margin-bottom: 0.5rem;
        }
        .query-header p {
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .query-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .execute-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent-primary);
          color: #000;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .execute-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
        }
        .execute-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .query-actions {
          display: flex;
          gap: 0.75rem;
        }
        .code-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .code-toggle-btn:hover {
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }
        .query-code-display {
          background: #0a0a0f;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }
        .query-code-display .code-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .query-code-display pre {
          margin: 0;
          padding: 1rem;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          line-height: 1.6;
          color: #00ff88;
          overflow-x: auto;
          white-space: pre-wrap;
        }
        .query-params {
          margin-bottom: 1rem;
        }
        .query-params label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
        .query-params input {
          padding: 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          width: 150px;
        }
        .query-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid var(--accent-danger);
          border-radius: 8px;
          color: var(--accent-danger);
          margin-bottom: 1rem;
        }
        .query-results {
          margin-top: 1.5rem;
        }
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .results-count {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .results-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          max-height: 500px;
          overflow: auto;
        }
        .results-content pre {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-primary);
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .no-query-selected {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: var(--text-secondary);
        }
        .no-query-selected p {
          margin-top: 1rem;
        }
        /* CRUD Styles */
        .crud-group h5 {
          color: var(--accent-warning) !important;
        }
        .query-item.crud {
          border-color: rgba(255, 170, 0, 0.3);
        }
        .query-item.crud:hover {
          border-color: var(--accent-warning);
          background: rgba(255, 170, 0, 0.05);
        }
        .query-item.crud.active {
          border-color: var(--accent-warning);
          background: rgba(255, 170, 0, 0.1);
        }
        .query-number.insert {
          background: var(--accent-primary);
        }
        .query-number.update {
          background: var(--accent-secondary);
        }
        .query-number.delete {
          background: var(--accent-danger);
        }
        .crud-form {
          background: rgba(255, 170, 0, 0.05);
          border: 1px solid rgba(255, 170, 0, 0.3);
          border-radius: 8px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .crud-form h5 {
          margin: 0 0 1rem 0;
          color: var(--accent-warning);
          font-size: 1rem;
        }
        .crud-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        .crud-form label {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .crud-form input,
        .crud-form select {
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }
        .crud-form input:focus,
        .crud-form select:focus {
          outline: none;
          border-color: var(--accent-warning);
        }
        .crud-warning {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(255, 68, 102, 0.1);
          border-radius: 6px;
          font-size: 0.85rem;
          color: var(--accent-danger);
        }
        .query-results.success {
          border: 1px solid var(--accent-primary);
          border-radius: 8px;
          padding: 1rem;
          background: rgba(0, 255, 136, 0.05);
        }
        .query-results.success .results-header h5 {
          color: var(--accent-primary);
        }
        .results-message {
          padding: 0.75rem 1rem;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: var(--accent-primary);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1200px) {
          .queries-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function AdvancedViz() {
  const { mode } = useAppMode();
  const [activeTab, setActiveTab] = useState('recovery');

  // MongoDB Queries tab is only available in Simulated mode
  const tabs = [
    { id: 'recovery', label: 'Recovery Timeline', icon: Clock },
    { id: 'heatmap', label: 'Heatmap', icon: Map },
    { id: 'comparison', label: 'Zone Compare', icon: GitCompare },
    { id: 'network', label: 'Network Flow', icon: Network },
    ...(mode === 'sim' ? [{ id: 'queries', label: 'MongoDB Queries', icon: Database }] : []),
  ];

  // If user was on queries tab and switched to city mode, reset to recovery
  useEffect(() => {
    if (mode === 'city' && activeTab === 'queries') {
      setActiveTab('recovery');
    }
  }, [mode, activeTab]);

  return (
    <div className="advanced-viz-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1><Activity size={32} /> Advanced Visualizations</h1>
        <p>Interactive data visualizations for in-depth analysis</p>
        <div className="viz-disclaimer">
          <Info size={16} />
          <span><strong>Recovery Timeline</strong> uses scenario-based demos (heatwave, flood, etc.). <strong>Heatmap</strong>, <strong>Zone Compare</strong>, and <strong>Network Flow</strong> use live data (processed_zone_data / Analytics API). Select a city and run processing to see dynamic data there.</span>
        </div>
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
        {activeTab === 'queries' && mode === 'sim' && <MongoDBQueries />}
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

        .viz-disclaimer {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(0, 212, 255, 0.08);
          border: 1px solid rgba(0, 212, 255, 0.25);
          border-radius: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .viz-disclaimer svg { flex-shrink: 0; color: var(--accent-secondary); margin-top: 2px; }

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

