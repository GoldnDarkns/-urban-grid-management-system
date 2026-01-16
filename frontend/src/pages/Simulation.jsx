import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, FastForward, Rewind,
  Thermometer, Wind, Lock, Zap, CloudRain, PartyPopper,
  Factory, Flame, AlertTriangle, Clock, TrendingUp,
  TrendingDown, Activity, Shield, Lightbulb, ChevronRight,
  SkipBack, SkipForward, Info, Building2, Home as HomeIcon,
  Trees, Warehouse, Hospital, Droplets
} from 'lucide-react';

// City Districts with buildings
const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', x: 300, y: 150, type: 'commercial', buildings: 8 },
  { id: 'residential_north', name: 'North Residential', x: 150, y: 80, type: 'residential', buildings: 12 },
  { id: 'residential_south', name: 'South Residential', x: 150, y: 280, type: 'residential', buildings: 10 },
  { id: 'industrial', name: 'Industrial Zone', x: 500, y: 100, type: 'industrial', buildings: 6 },
  { id: 'medical', name: 'Medical District', x: 450, y: 250, type: 'medical', buildings: 4 },
  { id: 'residential_east', name: 'East Residential', x: 500, y: 320, type: 'residential', buildings: 8 },
  { id: 'park_district', name: 'Green Park Area', x: 300, y: 320, type: 'park', buildings: 2 },
  { id: 'tech_hub', name: 'Tech Hub', x: 100, y: 180, type: 'commercial', buildings: 5 },
];

// Generate zones within districts
const generateZones = () => {
  const zones = [];
  let zoneId = 1;
  
  DISTRICTS.forEach(district => {
    const numZones = district.buildings;
    for (let i = 0; i < numZones; i++) {
      const angle = (i / numZones) * Math.PI * 2;
      const radius = 30 + Math.random() * 20;
      zones.push({
        id: `Z_${String(zoneId).padStart(3, '0')}`,
        districtId: district.id,
        districtName: district.name,
        type: district.type,
        x: district.x + Math.cos(angle) * radius,
        y: district.y + Math.sin(angle) * radius,
        size: district.type === 'commercial' ? 'large' : district.type === 'industrial' ? 'medium' : 'small',
        population: Math.floor(5000 + Math.random() * 20000),
        baselineDemand: Math.floor(1000 + Math.random() * 4000),
        baselineAqi: Math.floor(40 + Math.random() * 60),
        hasHospital: district.type === 'medical',
        hasPowerPlant: district.type === 'industrial' && i === 0,
        hasWaterTreatment: district.id === 'industrial' && i === 1,
      });
      zoneId++;
    }
  });
  
  return zones;
};

const ZONES = generateZones();

// Scenario definitions
const SCENARIOS = {
  heatwave: {
    id: 'heatwave',
    name: 'Heatwave',
    icon: Thermometer,
    color: '#ff6b35',
    bgGradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
    description: 'Extreme heat (45°C+) causes massive AC surge. Residential areas hit hardest.',
    affectedTypes: ['residential', 'commercial'],
    effects: {
      demandMultiplier: 1.8,
      aqiIncrease: 35,
      riskIncrease: 40,
    },
    peakHour: 14,
    duration: 24,
    riskExplanation: [
      'AC units running at maximum capacity',
      'Transformer overload risk increases',
      'Peak demand exceeds normal by 80%',
      'Elderly population at health risk'
    ]
  },
  sandstorm: {
    id: 'sandstorm',
    name: 'Sandstorm',
    icon: Wind,
    color: '#d4a574',
    bgGradient: 'linear-gradient(135deg, #d4a574 0%, #c4956a 100%)',
    description: 'Severe dust storm blocks solar panels and creates health hazard.',
    affectedTypes: ['all'],
    effects: {
      demandMultiplier: 1.3,
      aqiIncrease: 180,
      riskIncrease: 55,
      solarReduction: 0.9,
    },
    peakHour: 10,
    duration: 12,
    riskExplanation: [
      'AQI reaches hazardous levels (300+)',
      'Solar generation drops 90%',
      'Visibility near zero - emergency services impacted',
      'Respiratory emergencies expected'
    ]
  },
  lockdown: {
    id: 'lockdown',
    name: 'City Lockdown',
    icon: Lock,
    color: '#6c5ce7',
    bgGradient: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
    description: 'Stay-at-home order shifts all activity to residential zones.',
    affectedTypes: ['residential', 'commercial'],
    effects: {
      residentialMultiplier: 1.5,
      commercialMultiplier: 0.3,
      aqiChange: -25,
      riskIncrease: 15,
    },
    peakHour: 12,
    duration: 48,
    riskExplanation: [
      'Residential load increases 50%',
      'Commercial demand drops 70%',
      'Grid needs rebalancing',
      'Home office equipment strain'
    ]
  },
  powerSurge: {
    id: 'powerSurge',
    name: 'Power Surge',
    icon: Zap,
    color: '#ffd93d',
    bgGradient: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 100%)',
    description: 'Electrical surge from lightning causes cascading failures.',
    affectedTypes: ['all'],
    effects: {
      demandMultiplier: 2.5,
      riskIncrease: 70,
      outageChance: 0.3,
    },
    peakHour: 0,
    duration: 6,
    riskExplanation: [
      'Instant demand spike of 150%',
      'Equipment damage likely',
      '30% chance of zone blackout',
      'Cascading failure risk'
    ]
  },
  flood: {
    id: 'flood',
    name: 'Flash Flood',
    icon: CloudRain,
    color: '#74b9ff',
    bgGradient: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
    description: 'Heavy rainfall floods low-lying areas, pump stations at max.',
    affectedTypes: ['residential', 'industrial'],
    effects: {
      demandMultiplier: 1.4,
      aqiChange: -20,
      riskIncrease: 50,
      outageChance: 0.25,
    },
    peakHour: 6,
    duration: 18,
    riskExplanation: [
      'Pump stations running 24/7',
      'Underground cables at risk',
      'Substation flooding possible',
      'Evacuation power needed'
    ]
  },
  festival: {
    id: 'festival',
    name: 'City Festival',
    icon: PartyPopper,
    color: '#fd79a8',
    bgGradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
    description: 'Major celebration with fireworks and decorative lighting.',
    affectedTypes: ['commercial', 'residential'],
    effects: {
      demandMultiplier: 1.35,
      aqiIncrease: 30,
      riskIncrease: 10,
    },
    peakHour: 21,
    duration: 8,
    riskExplanation: [
      'Decorative lighting surge',
      'Fireworks cause AQI spike',
      'Late night demand unusual',
      'Public gathering power needs'
    ]
  },
  plantFailure: {
    id: 'plantFailure',
    name: 'Plant Failure',
    icon: Factory,
    color: '#636e72',
    bgGradient: 'linear-gradient(135deg, #636e72 0%, #2d3436 100%)',
    description: 'Main power plant goes offline. Emergency protocols activated.',
    affectedTypes: ['all'],
    effects: {
      supplyReduction: 0.35,
      riskIncrease: 65,
      loadShedding: true,
    },
    peakHour: 0,
    duration: 24,
    riskExplanation: [
      'Supply reduced by 35%',
      'Rolling blackouts required',
      'Critical facilities prioritized',
      'Backup generators activated'
    ]
  },
  fire: {
    id: 'fire',
    name: 'Major Fire',
    icon: Flame,
    color: '#e74c3c',
    bgGradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    description: 'Large fire requires evacuation and emergency response.',
    affectedTypes: ['specific'],
    effects: {
      aqiIncrease: 200,
      riskIncrease: 80,
      evacuationZones: 3,
    },
    peakHour: 2,
    duration: 12,
    riskExplanation: [
      'Smoke creates AQI emergency',
      'Zones cut for safety',
      'Emergency services priority',
      'Evacuation centers powered'
    ]
  },
};

// Building component
const Building = ({ x, y, type, size, riskLevel, isAffected, intensity }) => {
  const getColor = () => {
    if (riskLevel === 'high') return '#ff4466';
    if (riskLevel === 'medium') return '#ffaa00';
    return '#00ff88';
  };

  const getSizeProps = () => {
    switch (size) {
      case 'large': return { width: 16, height: 28 };
      case 'medium': return { width: 12, height: 20 };
      default: return { width: 10, height: 14 };
    }
  };

  const { width, height } = getSizeProps();
  const color = getColor();

  return (
    <g>
      {/* Building shadow */}
      <rect
        x={x + 2}
        y={y + 2}
        width={width}
        height={height}
        fill="rgba(0,0,0,0.3)"
        rx={2}
      />
      
      {/* Building body */}
      <motion.rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#1a1a25"
        stroke={color}
        strokeWidth={isAffected ? 2 : 1}
        rx={2}
        animate={{
          stroke: color,
          filter: isAffected && riskLevel === 'high' 
            ? 'drop-shadow(0 0 8px ' + color + ')' 
            : 'none'
        }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Windows */}
      {Array.from({ length: Math.floor(height / 6) }).map((_, i) => (
        <motion.rect
          key={i}
          x={x + 3}
          y={y + 3 + i * 6}
          width={width - 6}
          height={3}
          fill={isAffected ? color : '#2a2a3a'}
          opacity={isAffected ? 0.8 : 0.5}
          animate={{
            fill: isAffected ? color : '#2a2a3a',
            opacity: isAffected ? [0.5, 1, 0.5] : 0.5
          }}
          transition={{ 
            duration: 1, 
            repeat: isAffected ? Infinity : 0 
          }}
        />
      ))}

      {/* Type indicator */}
      {type === 'medical' && (
        <text x={x + width/2} y={y - 3} textAnchor="middle" fontSize="8" fill="#ff4466">+</text>
      )}
      {type === 'industrial' && (
        <rect x={x + width/2 - 2} y={y - 6} width={4} height={6} fill="#636e72" />
      )}
    </g>
  );
};

// District component
const District = ({ district, zones, currentHour, scenario, intensity, isPlaying }) => {
  const getDistrictIcon = () => {
    switch (district.type) {
      case 'commercial': return Building2;
      case 'residential': return HomeIcon;
      case 'industrial': return Warehouse;
      case 'medical': return Hospital;
      case 'park': return Trees;
      default: return Building2;
    }
  };

  const Icon = getDistrictIcon();
  const districtZones = zones.filter(z => z.districtId === district.id);
  const avgRisk = districtZones.reduce((acc, z) => {
    if (z.riskLevel === 'high') return acc + 2;
    if (z.riskLevel === 'medium') return acc + 1;
    return acc;
  }, 0) / districtZones.length;

  const districtColor = avgRisk > 1.5 ? '#ff4466' : avgRisk > 0.5 ? '#ffaa00' : '#00ff88';

  return (
    <g>
      {/* District background */}
      <motion.ellipse
        cx={district.x}
        cy={district.y}
        rx={70}
        ry={55}
        fill={`${districtColor}10`}
        stroke={districtColor}
        strokeWidth={1}
        strokeDasharray="4 2"
        animate={{
          fill: `${districtColor}${isPlaying ? '20' : '10'}`,
        }}
      />
      
      {/* District label */}
      <text
        x={district.x}
        y={district.y - 45}
        textAnchor="middle"
        fill={districtColor}
        fontSize="9"
        fontWeight="600"
        fontFamily="Space Grotesk"
      >
        {district.name}
      </text>

      {/* Buildings */}
      {districtZones.map((zone, i) => (
        <Building
          key={zone.id}
          x={zone.x - 6}
          y={zone.y - 10}
          type={zone.type}
          size={zone.size}
          riskLevel={zone.riskLevel}
          isAffected={zone.isAffected}
          intensity={intensity}
        />
      ))}
    </g>
  );
};

export default function Simulation() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [intensity, setIntensity] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentHour, setCurrentHour] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [zones, setZones] = useState(ZONES.map(z => ({ 
    ...z, 
    riskLevel: 'low', 
    riskScore: 0,
    demand: z.baselineDemand,
    aqi: z.baselineAqi,
    isAffected: false
  })));
  const [selectedZone, setSelectedZone] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const intervalRef = useRef(null);

  const scenario = selectedScenario ? SCENARIOS[selectedScenario] : null;
  const duration = scenario?.duration || 24;

  // Time progression
  useEffect(() => {
    if (isPlaying && selectedScenario) {
      intervalRef.current = setInterval(() => {
        setCurrentHour(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 1;
        });
      }, 800 / speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, selectedScenario, speed, duration]);

  // Update zones when simulation progresses
  useEffect(() => {
    if (!scenario) {
      // Reset to baseline
      setZones(ZONES.map(z => ({ 
        ...z, 
        riskLevel: 'low', 
        riskScore: Math.floor(Math.random() * 15), // Low baseline risk
        demand: z.baselineDemand,
        aqi: z.baselineAqi,
        isAffected: false
      })));
      return;
    }

    const intensityFactor = intensity / 100;
    const progress = currentHour / duration;
    
    // Bell curve for effect intensity over time
    const effectCurve = Math.sin(progress * Math.PI);
    
    setZones(prev => prev.map(zone => {
      // Check if zone is affected by this scenario
      const isAffected = scenario.affectedTypes.includes('all') || 
                         scenario.affectedTypes.includes(zone.type);
      
      if (!isAffected || currentHour === 0) {
        return {
          ...zone,
          riskLevel: 'low',
          riskScore: zone.hasHospital ? 12 : Math.floor(Math.random() * 10),
          demand: zone.baselineDemand,
          aqi: zone.baselineAqi,
          isAffected: false,
          demandChange: 0,
          aqiChange: 0,
        };
      }

      // Calculate effects
      let demandMultiplier = 1;
      let aqiChange = 0;
      let riskIncrease = 0;

      if (scenario.effects.demandMultiplier) {
        demandMultiplier = 1 + (scenario.effects.demandMultiplier - 1) * effectCurve * intensityFactor;
      }
      if (scenario.effects.residentialMultiplier && zone.type === 'residential') {
        demandMultiplier = 1 + (scenario.effects.residentialMultiplier - 1) * effectCurve * intensityFactor;
      }
      if (scenario.effects.commercialMultiplier && zone.type === 'commercial') {
        demandMultiplier = 1 + (scenario.effects.commercialMultiplier - 1) * effectCurve * intensityFactor;
      }
      if (scenario.effects.aqiIncrease) {
        aqiChange = scenario.effects.aqiIncrease * effectCurve * intensityFactor;
      }
      if (scenario.effects.aqiChange) {
        aqiChange = scenario.effects.aqiChange * effectCurve * intensityFactor;
      }
      if (scenario.effects.riskIncrease) {
        riskIncrease = scenario.effects.riskIncrease * effectCurve * intensityFactor;
      }

      const newDemand = Math.round(zone.baselineDemand * demandMultiplier);
      const newAqi = Math.max(0, Math.round(zone.baselineAqi + aqiChange));
      const newRiskScore = Math.min(100, Math.round((zone.hasHospital ? 12 : 5) + riskIncrease));

      let riskLevel = 'low';
      if (newRiskScore >= 40) riskLevel = 'high';
      else if (newRiskScore >= 20) riskLevel = 'medium';

      return {
        ...zone,
        demand: newDemand,
        aqi: newAqi,
        riskScore: newRiskScore,
        riskLevel,
        isAffected: true,
        demandChange: Math.round((demandMultiplier - 1) * 100),
        aqiChange: Math.round(aqiChange),
      };
    }));
  }, [currentHour, selectedScenario, intensity]);

  const startSimulation = () => {
    if (!selectedScenario) return;
    setCurrentHour(0);
    setIsPlaying(true);
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentHour(0);
    setSelectedScenario(null);
  };

  // Stats
  const stats = {
    totalDemand: zones.reduce((acc, z) => acc + z.demand, 0),
    avgAqi: Math.round(zones.reduce((acc, z) => acc + z.aqi, 0) / zones.length),
    highRisk: zones.filter(z => z.riskLevel === 'high').length,
    mediumRisk: zones.filter(z => z.riskLevel === 'medium').length,
    lowRisk: zones.filter(z => z.riskLevel === 'low').length,
  };

  const baselineStats = {
    totalDemand: ZONES.reduce((acc, z) => acc + z.baselineDemand, 0),
    avgAqi: Math.round(ZONES.reduce((acc, z) => acc + z.baselineAqi, 0) / ZONES.length),
  };

  return (
    <div className="simulation-page">
      {/* Header */}
      <div className="sim-header">
        <div className="header-left">
          <AlertTriangle size={28} className="header-icon" />
          <div>
            <h1>Disaster Scenario Simulator</h1>
            <p>See how different events affect the city grid in real-time</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="mini-stat">
            <span className="stat-value green">{stats.lowRisk}</span>
            <span className="stat-label">Safe</span>
          </div>
          <div className="mini-stat">
            <span className="stat-value yellow">{stats.mediumRisk}</span>
            <span className="stat-label">Warning</span>
          </div>
          <div className="mini-stat">
            <span className="stat-value red">{stats.highRisk}</span>
            <span className="stat-label">Critical</span>
          </div>
        </div>
      </div>

      <div className="sim-layout">
        {/* Left - Scenario Selection */}
        <div className="scenarios-panel">
          <h3>Select Disaster Scenario</h3>
          <div className="scenario-list">
            {Object.values(SCENARIOS).map((s) => (
              <motion.button
                key={s.id}
                className={`scenario-btn ${selectedScenario === s.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedScenario(s.id);
                  setCurrentHour(0);
                  setIsPlaying(false);
                }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                style={{ '--sc-color': s.color }}
              >
                <div className="sc-icon" style={{ background: s.bgGradient }}>
                  <s.icon size={20} color="white" />
                </div>
                <div className="sc-info">
                  <span className="sc-name">{s.name}</span>
                  <span className="sc-desc">{s.description.substring(0, 45)}...</span>
                </div>
              </motion.button>
            ))}
          </div>

          {scenario && (
            <div className="controls">
              <div className="control-row">
                <label>Intensity</label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                />
                <span className="intensity-value">{intensity}%</span>
              </div>
              
              <button className="start-btn" onClick={startSimulation}>
                <Play size={18} />
                Start Simulation
              </button>
              
              <button className="reset-btn" onClick={resetSimulation}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Center - City Map */}
        <div className="city-panel">
          <div className="city-header">
            <h3>MetroCity Grid</h3>
            <div className="time-badge">
              <Clock size={14} />
              <span>Hour {currentHour} / {duration}</span>
            </div>
          </div>

          <svg viewBox="0 0 600 400" className="city-svg">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Road pattern */}
              <pattern id="roads" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="#0a0a0f"/>
                <line x1="50" y1="0" x2="50" y2="100" stroke="#1a1a25" strokeWidth="3"/>
                <line x1="0" y1="50" x2="100" y2="50" stroke="#1a1a25" strokeWidth="3"/>
              </pattern>
            </defs>

            {/* Background */}
            <rect width="100%" height="100%" fill="url(#roads)" />

            {/* Main roads */}
            <line x1="300" y1="0" x2="300" y2="400" stroke="#2a2a3a" strokeWidth="6"/>
            <line x1="0" y1="200" x2="600" y2="200" stroke="#2a2a3a" strokeWidth="6"/>
            <line x1="150" y1="0" x2="150" y2="400" stroke="#1f1f2e" strokeWidth="3"/>
            <line x1="450" y1="0" x2="450" y2="400" stroke="#1f1f2e" strokeWidth="3"/>

            {/* Districts */}
            {DISTRICTS.map(district => (
              <District
                key={district.id}
                district={district}
                zones={zones}
                currentHour={currentHour}
                scenario={scenario}
                intensity={intensity}
                isPlaying={isPlaying}
              />
            ))}

            {/* Power lines */}
            <g stroke="#ffaa0040" strokeWidth="1" strokeDasharray="8 4">
              <line x1="500" y1="100" x2="300" y2="150"/>
              <line x1="300" y1="150" x2="150" y2="80"/>
              <line x1="300" y1="150" x2="300" y2="320"/>
              <line x1="300" y1="150" x2="450" y2="250"/>
            </g>
          </svg>

          {/* Playback */}
          <div className="playback">
            <div className="playback-btns">
              <button onClick={() => setCurrentHour(0)}><SkipBack size={16}/></button>
              <button onClick={() => setCurrentHour(Math.max(0, currentHour - 1))}><Rewind size={16}/></button>
              <button className="play-btn" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause size={20}/> : <Play size={20}/>}
              </button>
              <button onClick={() => setCurrentHour(Math.min(duration, currentHour + 1))}><FastForward size={16}/></button>
              <button onClick={() => setCurrentHour(duration)}><SkipForward size={16}/></button>
            </div>
            
            <div className="timeline">
              <div className="timeline-track">
                <motion.div 
                  className="timeline-progress"
                  animate={{ width: `${(currentHour / duration) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentHour}
                onChange={(e) => setCurrentHour(Number(e.target.value))}
              />
            </div>

            <div className="speed-btns">
              {[0.5, 1, 2].map(s => (
                <button 
                  key={s} 
                  className={speed === s ? 'active' : ''}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="legend-item"><span className="dot green"></span> Safe</div>
            <div className="legend-item"><span className="dot yellow"></span> Warning</div>
            <div className="legend-item"><span className="dot red"></span> Critical</div>
            <div className="legend-item"><span className="icon">+</span> Hospital</div>
            <div className="legend-item"><span className="icon">▮</span> Industrial</div>
          </div>
        </div>

        {/* Right - Info Panel */}
        <div className="info-panel">
          {/* Scenario Info */}
          {scenario && (
            <div className="info-card scenario-info" style={{ borderColor: scenario.color }}>
              <div className="card-header" style={{ background: scenario.bgGradient }}>
                <scenario.icon size={20} color="white" />
                <span>{scenario.name}</span>
              </div>
              <p>{scenario.description}</p>
              
              <button 
                className="explain-btn"
                onClick={() => setShowExplanation(!showExplanation)}
              >
                <Info size={14} />
                {showExplanation ? 'Hide' : 'Show'} Risk Explanation
              </button>
              
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    className="explanation"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <h5>Why zones turn red:</h5>
                    <ul>
                      {scenario.riskExplanation.map((exp, i) => (
                        <li key={i}>{exp}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Impact Stats */}
          <div className="info-card stats-card">
            <h4>Impact Analysis</h4>
            
            <div className="stat-comparison">
              <div className="stat-item">
                <span className="label">Total Demand</span>
                <div className="values">
                  <span className="baseline">{baselineStats.totalDemand.toLocaleString()}</span>
                  <ChevronRight size={12} />
                  <span className={`current ${stats.totalDemand > baselineStats.totalDemand ? 'up' : 'down'}`}>
                    {stats.totalDemand.toLocaleString()}
                  </span>
                </div>
                <span className="change">
                  {stats.totalDemand > baselineStats.totalDemand ? '+' : ''}
                  {Math.round(((stats.totalDemand - baselineStats.totalDemand) / baselineStats.totalDemand) * 100)}%
                </span>
              </div>
              
              <div className="stat-item">
                <span className="label">Average AQI</span>
                <div className="values">
                  <span className="baseline">{baselineStats.avgAqi}</span>
                  <ChevronRight size={12} />
                  <span className={`current ${stats.avgAqi > baselineStats.avgAqi ? 'up' : 'down'}`}>
                    {stats.avgAqi}
                  </span>
                </div>
                <span className="change">
                  {stats.avgAqi > baselineStats.avgAqi ? '+' : ''}
                  {stats.avgAqi - baselineStats.avgAqi}
                </span>
              </div>
            </div>

            <div className="risk-bars">
              <div className="risk-bar">
                <div className="bar-fill red" style={{ width: `${(stats.highRisk / zones.length) * 100}%` }}/>
                <div className="bar-fill yellow" style={{ width: `${(stats.mediumRisk / zones.length) * 100}%` }}/>
                <div className="bar-fill green" style={{ width: `${(stats.lowRisk / zones.length) * 100}%` }}/>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {scenario && (
            <div className="info-card recs-card">
              <h4><Lightbulb size={16} /> Recommended Actions</h4>
              <ul>
                {scenario.riskExplanation.map((rec, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {rec}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* How Risk is Calculated */}
          <div className="info-card algorithm-card">
            <h4><Activity size={16} /> Risk Scoring Algorithm</h4>
            <div className="algorithm-steps">
              <div className="step">
                <span className="step-num">1</span>
                <span>Base score from zone type (Hospital +12)</span>
              </div>
              <div className="step">
                <span className="step-num">2</span>
                <span>+ Scenario effect × Intensity × Time curve</span>
              </div>
              <div className="step">
                <span className="step-num">3</span>
                <span>Score &lt;20 = Safe, 20-40 = Warning, &gt;40 = Critical</span>
              </div>
            </div>
            <div className="formula">
              <code>risk = base + (effect × intensity × sin(πt))</code>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .simulation-page {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 1.5rem;
        }

        .sim-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          color: var(--accent-warning);
        }

        .header-left h1 {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .header-left p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .header-stats {
          display: flex;
          gap: 1.5rem;
        }

        .mini-stat {
          text-align: center;
        }

        .mini-stat .stat-value {
          display: block;
          font-size: 1.75rem;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .mini-stat .stat-value.green { color: #00ff88; }
        .mini-stat .stat-value.yellow { color: #ffaa00; }
        .mini-stat .stat-value.red { color: #ff4466; }

        .mini-stat .stat-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .sim-layout {
          display: grid;
          grid-template-columns: 280px 1fr 300px;
          gap: 1.5rem;
          height: calc(100vh - 140px);
        }

        @media (max-width: 1300px) {
          .sim-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
        }

        /* Scenarios Panel */
        .scenarios-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem;
          overflow-y: auto;
        }

        .scenarios-panel h3 {
          font-size: 0.9rem;
          margin-bottom: 1rem;
          color: var(--text-secondary);
        }

        .scenario-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .scenario-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }

        .scenario-btn:hover {
          border-color: var(--sc-color);
        }

        .scenario-btn.selected {
          border-color: var(--sc-color);
          background: color-mix(in srgb, var(--sc-color) 10%, var(--bg-secondary));
        }

        .sc-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sc-info {
          flex: 1;
          min-width: 0;
        }

        .sc-name {
          display: block;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .sc-desc {
          display: block;
          font-size: 0.7rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .controls {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .control-row {
          margin-bottom: 1rem;
        }

        .control-row label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .control-row input[type="range"] {
          width: calc(100% - 50px);
          height: 6px;
          -webkit-appearance: none;
          background: var(--bg-secondary);
          border-radius: 3px;
        }

        .control-row input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: var(--accent-warning);
          border-radius: 50%;
          cursor: pointer;
        }

        .intensity-value {
          display: inline-block;
          width: 45px;
          text-align: right;
          font-family: var(--font-mono);
          color: var(--accent-warning);
        }

        .start-btn {
          width: 100%;
          padding: 0.875rem;
          background: var(--accent-primary);
          border: none;
          border-radius: 8px;
          color: var(--bg-primary);
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .start-btn:hover {
          filter: brightness(1.1);
        }

        .reset-btn {
          width: 100%;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        /* City Panel */
        .city-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .city-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .city-header h3 {
          font-size: 1rem;
        }

        .time-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          background: var(--bg-secondary);
          border-radius: 20px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--accent-secondary);
        }

        .city-svg {
          flex: 1;
          min-height: 350px;
        }

        .playback {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--border-color);
        }

        .playback-btns {
          display: flex;
          gap: 0.25rem;
        }

        .playback-btns button {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .playback-btns button:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .playback-btns .play-btn {
          width: 40px;
          height: 40px;
          background: var(--accent-primary);
          color: var(--bg-primary);
          border-color: var(--accent-primary);
        }

        .timeline {
          flex: 1;
          position: relative;
        }

        .timeline-track {
          height: 6px;
          background: var(--bg-secondary);
          border-radius: 3px;
          overflow: hidden;
        }

        .timeline-progress {
          height: 100%;
          background: var(--accent-primary);
          border-radius: 3px;
        }

        .timeline input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .speed-btns {
          display: flex;
          gap: 0.25rem;
        }

        .speed-btns button {
          padding: 0.25rem 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
        }

        .speed-btns button.active {
          background: var(--accent-primary);
          color: var(--bg-primary);
          border-color: var(--accent-primary);
        }

        .legend {
          display: flex;
          gap: 1rem;
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .legend .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend .dot.green { background: #00ff88; }
        .legend .dot.yellow { background: #ffaa00; }
        .legend .dot.red { background: #ff4466; }

        .legend .icon {
          font-size: 10px;
        }

        /* Info Panel */
        .info-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
        }

        .info-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 1rem;
        }

        .info-card h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .scenario-info .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          margin: -1rem -1rem 0.75rem;
          border-radius: 9px 9px 0 0;
          font-weight: 600;
          color: white;
        }

        .scenario-info p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .explain-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          width: 100%;
          justify-content: center;
        }

        .explain-btn:hover {
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }

        .explanation {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color);
          overflow: hidden;
        }

        .explanation h5 {
          font-size: 0.75rem;
          color: var(--accent-warning);
          margin-bottom: 0.5rem;
        }

        .explanation ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .explanation li {
          font-size: 0.75rem;
          color: var(--text-secondary);
          padding: 0.25rem 0;
          padding-left: 1rem;
          position: relative;
        }

        .explanation li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--accent-danger);
        }

        .stats-card .stat-comparison {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .stat-item {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
        }

        .stat-item .label {
          width: 100%;
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .stat-item .values {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-family: var(--font-mono);
          font-size: 0.875rem;
        }

        .stat-item .baseline {
          color: var(--text-muted);
        }

        .stat-item .current.up {
          color: var(--accent-danger);
        }

        .stat-item .current.down {
          color: var(--accent-primary);
        }

        .stat-item .change {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-left: auto;
        }

        .risk-bars {
          margin-top: 0.5rem;
        }

        .risk-bar {
          height: 10px;
          background: var(--bg-secondary);
          border-radius: 5px;
          display: flex;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          transition: width 0.5s ease;
        }

        .bar-fill.red { background: #ff4466; }
        .bar-fill.yellow { background: #ffaa00; }
        .bar-fill.green { background: #00ff88; }

        .recs-card ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .recs-card li {
          font-size: 0.8rem;
          color: var(--text-secondary);
          padding: 0.5rem 0;
          padding-left: 1rem;
          border-bottom: 1px solid var(--border-color);
          position: relative;
        }

        .recs-card li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--accent-primary);
        }

        .recs-card li:last-child {
          border-bottom: none;
        }

        .algorithm-card {
          border-color: var(--accent-purple);
        }

        .algorithm-card h4 {
          color: var(--accent-purple);
        }

        .algorithm-steps {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .step-num {
          width: 20px;
          height: 20px;
          background: var(--accent-purple);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .formula {
          padding: 0.5rem;
          background: var(--bg-secondary);
          border-radius: 6px;
        }

        .formula code {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}
