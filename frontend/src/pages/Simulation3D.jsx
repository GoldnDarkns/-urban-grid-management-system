import { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { 
  Play, Pause, RotateCcw, Thermometer, Wind, Lock, Zap, CloudRain,
  Flame, AlertTriangle, ChevronRight, Lightbulb, X, Building2,
  Brain, TrendingUp, Activity, Save, BarChart3, CheckCircle
} from 'lucide-react';
import { simulationsAPI } from '../services/api';

// ==================== SCENARIOS ====================
const SCENARIOS = {
  heatwave: { id: 'heatwave', name: 'Heatwave', icon: Thermometer, color: '#ff6b35', particles: 'heat', riskIncrease: 60 },
  sandstorm: { id: 'sandstorm', name: 'Sandstorm', icon: Wind, color: '#d4a574', particles: 'sand', riskIncrease: 70 },
  lockdown: { id: 'lockdown', name: 'Lockdown', icon: Lock, color: '#6c5ce7', particles: null, riskIncrease: 30 },
  powerSurge: { id: 'powerSurge', name: 'Power Surge', icon: Zap, color: '#ffd93d', particles: 'electric', riskIncrease: 80 },
  flood: { id: 'flood', name: 'Flash Flood', icon: CloudRain, color: '#74b9ff', particles: 'rain', riskIncrease: 55 },
  fire: { id: 'fire', name: 'Major Fire', icon: Flame, color: '#e74c3c', particles: 'fire', riskIncrease: 85 },
};

// ==================== GENERATE TRON CITY ====================
const generateTronCity = () => {
  const buildings = [];
  let id = 0;

  // Downtown core - less dense
  for (let x = -8; x <= 8; x += 3) {
    for (let z = -8; z <= 8; z += 3) {
      if (Math.random() > 0.3) {
        const height = 8 + Math.random() * 20;
        buildings.push({
          id: id++, type: 'skyscraper', name: `Tower ${id}`,
          x: x + (Math.random() - 0.5) * 0.8, z: z + (Math.random() - 0.5) * 0.8,
          height, width: 1 + Math.random() * 0.8,
          critical: false, district: 'downtown'
        });
      }
    }
  }

  // Financial district - East
  for (let x = 15; x <= 30; x += 3) {
    for (let z = -12; z <= 12; z += 3) {
      if (Math.random() > 0.3) {
        buildings.push({
          id: id++, type: 'office', name: `Office ${id}`,
          x: x + (Math.random() - 0.5), z: z + (Math.random() - 0.5),
          height: 6 + Math.random() * 12, width: 1.2 + Math.random() * 0.8,
          critical: false, district: 'financial'
        });
      }
    }
  }

  // Tech campus - West
  for (let x = -30; x <= -15; x += 4) {
    for (let z = -10; z <= 10; z += 4) {
      if (Math.random() > 0.25) {
        buildings.push({
          id: id++, type: 'tech', name: `Tech ${id}`,
          x: x + (Math.random() - 0.5), z: z + (Math.random() - 0.5),
          height: 4 + Math.random() * 8, width: 2 + Math.random() * 1.5,
          critical: false, district: 'tech'
        });
      }
    }
  }

  // Residential North - less dense
  for (let x = -25; x <= 25; x += 4) {
    for (let z = 18; z <= 35; z += 4) {
      if (Math.random() > 0.4) {
        buildings.push({
          id: id++, type: 'residential', name: `Residence ${id}`,
          x: x + (Math.random() - 0.5) * 0.5, z: z + (Math.random() - 0.5) * 0.5,
          height: 2 + Math.random() * 5, width: 1 + Math.random() * 0.5,
          critical: false, district: 'residential_n'
        });
      }
    }
  }

  // Residential South - less dense
  for (let x = -25; x <= 25; x += 4) {
    for (let z = -35; z <= -18; z += 4) {
      if (Math.random() > 0.4) {
        buildings.push({
          id: id++, type: 'residential', name: `Residence ${id}`,
          x: x + (Math.random() - 0.5) * 0.5, z: z + (Math.random() - 0.5) * 0.5,
          height: 2 + Math.random() * 5, width: 1 + Math.random() * 0.5,
          critical: false, district: 'residential_s'
        });
      }
    }
  }

  // Industrial zone - Far South
  for (let x = -35; x <= -10; x += 5) {
    for (let z = -45; z <= -38; z += 4) {
      buildings.push({
        id: id++, type: 'factory', name: `Factory ${id}`,
        x: x + Math.random() * 2, z: z + Math.random() * 2,
        height: 3 + Math.random() * 4, width: 3 + Math.random() * 2,
        critical: false, district: 'industrial'
      });
    }
  }

  // CRITICAL INFRASTRUCTURE
  // Hospital complex
  buildings.push({ id: id++, type: 'hospital', name: 'Central Hospital', x: -18, z: -2, height: 8, width: 5, critical: true, district: 'medical' });
  buildings.push({ id: id++, type: 'hospital', name: 'Emergency Wing', x: -22, z: 0, height: 5, width: 3, critical: true, district: 'medical' });
  buildings.push({ id: id++, type: 'hospital', name: 'Research Center', x: -18, z: 3, height: 6, width: 3, critical: true, district: 'medical' });

  // Power stations
  buildings.push({ id: id++, type: 'power_plant', name: 'Power Station Alpha', x: 35, z: -25, height: 7, width: 6, critical: true, district: 'power' });
  buildings.push({ id: id++, type: 'power_plant', name: 'Substation Beta', x: -35, z: 25, height: 5, width: 4, critical: true, district: 'power' });
  buildings.push({ id: id++, type: 'power_plant', name: 'Solar Farm', x: 38, z: -30, height: 2, width: 8, critical: true, district: 'power' });

  // Water treatment
  buildings.push({ id: id++, type: 'water_plant', name: 'Water Treatment A', x: 35, z: 25, height: 4, width: 5, critical: true, district: 'utilities' });
  buildings.push({ id: id++, type: 'water_plant', name: 'Reservoir', x: 38, z: 30, height: 2, width: 6, critical: true, district: 'utilities' });

  // Airport
  buildings.push({ id: id++, type: 'airport', name: 'Terminal 1', x: -35, z: -30, height: 4, width: 12, critical: true, district: 'airport' });
  buildings.push({ id: id++, type: 'airport', name: 'Terminal 2', x: -35, z: -38, height: 4, width: 10, critical: true, district: 'airport' });
  buildings.push({ id: id++, type: 'control_tower', name: 'ATC Tower', x: -28, z: -34, height: 15, width: 1.5, critical: true, district: 'airport' });

  // Communication towers
  buildings.push({ id: id++, type: 'comm_tower', name: 'Main Comm', x: 0, z: 40, height: 25, width: 1, critical: true, district: 'comms' });
  buildings.push({ id: id++, type: 'comm_tower', name: 'Relay North', x: 25, z: 38, height: 18, width: 0.8, critical: true, district: 'comms' });
  buildings.push({ id: id++, type: 'comm_tower', name: 'Relay South', x: -25, z: -42, height: 18, width: 0.8, critical: true, district: 'comms' });
  buildings.push({ id: id++, type: 'data_center', name: 'Data Center', x: 5, z: 42, height: 5, width: 6, critical: true, district: 'comms' });

  // Commercial/Malls around downtown
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const r = 12 + Math.random() * 3;
    buildings.push({
      id: id++, type: 'commercial', name: `Mall ${i + 1}`,
      x: Math.cos(angle) * r, z: Math.sin(angle) * r,
      height: 3 + Math.random() * 3, width: 3 + Math.random() * 2,
      critical: false, district: 'commercial'
    });
  }

  // Parks (green spaces)
  buildings.push({ id: id++, type: 'park', name: 'Central Park', x: 0, z: 12, height: 0.2, width: 8, critical: false, district: 'parks' });
  buildings.push({ id: id++, type: 'park', name: 'Tech Park', x: -22, z: 0, height: 0.2, width: 5, critical: false, district: 'parks' });
  buildings.push({ id: id++, type: 'park', name: 'East Gardens', x: 22, z: 0, height: 0.2, width: 5, critical: false, district: 'parks' });

  return buildings;
};

const ALL_BUILDINGS = generateTronCity();

// ==================== WIREFRAME BUILDING ====================
function WireframeBuilding({ building, riskLevel, isAffected, onClick, isSelected }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const getColor = () => {
    if (building.critical) {
      if (riskLevel === 'high') return '#ff0066';
      if (riskLevel === 'medium') return '#ffaa00';
      return '#00ffff';
    }
    if (riskLevel === 'high') return '#ff4466';
    if (riskLevel === 'medium') return '#ffcc00';
    if (building.type === 'park') return '#00ff88';
    return '#00d4ff';
  };

  const color = getColor();
  const fillOpacity = building.type === 'park' ? 0.4 : 0.06;
  const edgeOpacity = hovered || isSelected ? 1 : 0.7;

  useFrame(() => {
    if (meshRef.current && (isAffected || (building.critical && riskLevel !== 'low'))) {
      const pulse = Math.sin(Date.now() * 0.005) * 0.05 + 1;
      meshRef.current.scale.y = pulse;
    }
  });

  const position = [building.x, building.height / 2, building.z];
  const size = [building.width, building.height, building.width * 0.8];

  const handleClick = (e) => { e.stopPropagation(); onClick(building); };
  const handlePointerOver = (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; };
  const handlePointerOut = () => { setHovered(false); document.body.style.cursor = 'default'; };

  const renderBuilding = () => {
    switch (building.type) {
      case 'hospital':
        return (
          <group position={position} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <mesh ref={meshRef}>
              <boxGeometry args={size} />
              <meshBasicMaterial color={color} transparent opacity={fillOpacity} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
              <lineBasicMaterial color={color} transparent opacity={edgeOpacity} />
            </lineSegments>
            <mesh position={[0, building.height / 2 + 0.3, building.width * 0.41]}>
              <boxGeometry args={[building.width * 0.4, 0.15, 0.05]} />
              <meshBasicMaterial color="#ff0000" />
            </mesh>
            <mesh position={[0, building.height / 2 + 0.3, building.width * 0.41]}>
              <boxGeometry args={[0.15, building.width * 0.4, 0.05]} />
              <meshBasicMaterial color="#ff0000" />
            </mesh>
          </group>
        );

      case 'power_plant':
        return (
          <group position={position} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <mesh ref={meshRef}>
              <boxGeometry args={size} />
              <meshBasicMaterial color="#ffff00" transparent opacity={fillOpacity} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
              <lineBasicMaterial color="#ffff00" transparent opacity={edgeOpacity} />
            </lineSegments>
            {[-1, 1].map((offset, i) => (
              <group key={i} position={[offset * building.width * 0.3, building.height / 2 + 1.5, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.4, 0.7, 3, 8]} />
                  <meshBasicMaterial color="#ffff00" transparent opacity={fillOpacity} />
                </mesh>
                <lineSegments>
                  <edgesGeometry args={[new THREE.CylinderGeometry(0.4, 0.7, 3, 8)]} />
                  <lineBasicMaterial color="#ffff00" transparent opacity={edgeOpacity} />
                </lineSegments>
              </group>
            ))}
          </group>
        );

      case 'water_plant':
        return (
          <group position={position} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <mesh ref={meshRef}>
              <cylinderGeometry args={[building.width / 2, building.width / 2, building.height, 16]} />
              <meshBasicMaterial color="#00aaff" transparent opacity={fillOpacity * 2} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.CylinderGeometry(building.width / 2, building.width / 2, building.height, 16)]} />
              <lineBasicMaterial color="#00aaff" transparent opacity={edgeOpacity} />
            </lineSegments>
          </group>
        );

      case 'control_tower':
      case 'comm_tower':
        return (
          <group position={position} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <mesh ref={meshRef}>
              <cylinderGeometry args={[0.2, 0.5, building.height, 6]} />
              <meshBasicMaterial color={color} transparent opacity={fillOpacity} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.CylinderGeometry(0.2, 0.5, building.height, 6)]} />
              <lineBasicMaterial color={color} transparent opacity={edgeOpacity} />
            </lineSegments>
            <mesh position={[0, building.height / 2 + 0.5, 0]}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial color="#ff0000" />
            </mesh>
          </group>
        );

      case 'park':
        return (
          <group position={[building.x, 0.1, building.z]} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <mesh>
              <boxGeometry args={[building.width, 0.2, building.width]} />
              <meshBasicMaterial color="#00ff88" transparent opacity={0.3} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(building.width, 0.2, building.width)]} />
              <lineBasicMaterial color="#00ff88" transparent opacity={0.6} />
            </lineSegments>
          </group>
        );

      default:
        return (
          <group position={position} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <mesh ref={meshRef}>
              <boxGeometry args={size} />
              <meshBasicMaterial color={color} transparent opacity={fillOpacity} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
              <lineBasicMaterial color={color} transparent opacity={edgeOpacity} />
            </lineSegments>
          </group>
        );
    }
  };

  return (
    <group>
      {renderBuilding()}
      {(hovered || isSelected) && (
        <Text position={[building.x, building.height + 2, building.z]} fontSize={0.8} color="#ffffff" anchorX="center" outlineWidth={0.05} outlineColor="#000000">
          {building.name}
        </Text>
      )}
    </group>
  );
}

// ==================== TRON CITY GROUND & ROADS ====================
function TronCityGround() {
  return (
    <group>
      {/* Base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshBasicMaterial color="#030810" />
      </mesh>
      
      {/* Main grid - fine */}
      <gridHelper args={[120, 120, '#00d4ff', '#051525']} position={[0, 0, 0]} />
      
      {/* Main grid - coarse */}
      <gridHelper args={[120, 24, '#00d4ff', '#0a2535']} position={[0, 0.01, 0]} />

      {/* === MAIN ROADS === */}
      {/* North-South Highway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[3, 120]} />
        <meshBasicMaterial color="#1a2a3a" />
      </mesh>
      {/* Highway center line - BRIGHT */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[0.15, 120]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      {/* Highway edge lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.4, 0.03, 0]}>
        <planeGeometry args={[0.1, 120]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.4, 0.03, 0]}>
        <planeGeometry args={[0.1, 120]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>

      {/* East-West Highway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[120, 3]} />
        <meshBasicMaterial color="#1a2a3a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[120, 0.15]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      {/* Highway edge lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 1.4]}>
        <planeGeometry args={[120, 0.1]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -1.4]}>
        <planeGeometry args={[120, 0.1]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>

      {/* Inner ring road - BRIGHT */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[13, 15, 48]} />
        <meshBasicMaterial color="#2a3a4a" />
      </mesh>
      {/* Ring road center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[13.8, 14.2, 48]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* Outer ring road - BRIGHT */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[35, 37, 64]} />
        <meshBasicMaterial color="#2a3a4a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[35.8, 36.2, 64]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* === SECONDARY ROADS === */}
      {/* Diagonal roads - BRIGHT */}
      {[45, 135, 225, 315].map((angle, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, (angle * Math.PI) / 180]} position={[0, 0.02, 0]}>
          <planeGeometry args={[2, 50]} />
          <meshBasicMaterial color="#1a2a3a" />
        </mesh>
      ))}

      {/* Grid streets - horizontal - BRIGHT */}
      {[-30, -20, -10, 10, 20, 30].map((z, i) => (
        <group key={`h${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
            <planeGeometry args={[80, 2]} />
            <meshBasicMaterial color="#1a2a3a" />
          </mesh>
          {/* Center line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, z]}>
            <planeGeometry args={[80, 0.1]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.8} />
          </mesh>
          {/* Street lights - brighter */}
          {Array.from({ length: 17 }, (_, j) => (
            <mesh key={j} position={[-40 + j * 5, 0.15, z]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial color="#00ffff" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Grid streets - vertical - BRIGHT */}
      {[-30, -20, -10, 10, 20, 30].map((x, i) => (
        <group key={`v${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
            <planeGeometry args={[2, 80]} />
            <meshBasicMaterial color="#1a2a3a" />
          </mesh>
          {/* Center line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, 0]}>
            <planeGeometry args={[0.1, 80]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.8} />
          </mesh>
          {/* Street lights - brighter */}
          {Array.from({ length: 17 }, (_, j) => (
            <mesh key={j} position={[x, 0.15, -40 + j * 5]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial color="#00ffff" />
            </mesh>
          ))}
        </group>
      ))}

      {/* === AIRPORT RUNWAY === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-35, 0.02, -45]}>
        <planeGeometry args={[30, 4]} />
        <meshBasicMaterial color="#2a2a3e" />
      </mesh>
      {/* Runway center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-35, 0.03, -45]}>
        <planeGeometry args={[30, 0.2]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      {/* Runway edge lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-35, 0.03, -43]}>
        <planeGeometry args={[30, 0.1]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-35, 0.03, -47]}>
        <planeGeometry args={[30, 0.1]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      {/* Runway lights - brighter */}
      {Array.from({ length: 15 }, (_, i) => (
        <mesh key={i} position={[-50 + i * 4, 0.2, -45]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}

      {/* === DISTRICT LABELS === */}
      <Text position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={2} color="#00d4ff" anchorX="center" transparent opacity={0.3}>
        DOWNTOWN
      </Text>
      <Text position={[22, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="#00d4ff" anchorX="center" transparent opacity={0.2}>
        FINANCIAL
      </Text>
      <Text position={[-22, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="#00d4ff" anchorX="center" transparent opacity={0.2}>
        TECH HUB
      </Text>
      <Text position={[0, 0.5, 28]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="#00d4ff" anchorX="center" transparent opacity={0.2}>
        RESIDENTIAL NORTH
      </Text>
      <Text position={[0, 0.5, -28]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="#00d4ff" anchorX="center" transparent opacity={0.2}>
        RESIDENTIAL SOUTH
      </Text>
    </group>
  );
}

// ==================== PARTICLE EFFECTS ====================
function ParticleEffects({ type }) {
  const particlesRef = useRef();
  const count = 800;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = Math.random() * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!particlesRef.current) return;
    const pos = particlesRef.current.geometry.attributes.position.array;
    
    for (let i = 0; i < count; i++) {
      if (type === 'rain') {
        pos[i * 3 + 1] -= 0.7;
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 50;
      } else if (type === 'sand') {
        pos[i * 3] += 0.3;
        pos[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.02;
        if (pos[i * 3] > 50) pos[i * 3] = -50;
      } else if (type === 'heat' || type === 'fire') {
        pos[i * 3 + 1] += 0.2;
        pos[i * 3] += Math.sin(Date.now() * 0.002 + i) * 0.02;
        if (pos[i * 3 + 1] > 50) pos[i * 3 + 1] = 0;
      } else if (type === 'electric') {
        pos[i * 3 + 1] += (Math.random() - 0.5) * 0.6;
        pos[i * 3] += (Math.random() - 0.5) * 0.4;
        if (pos[i * 3 + 1] > 50 || pos[i * 3 + 1] < 0) pos[i * 3 + 1] = Math.random() * 25;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const color = type === 'rain' ? '#00aaff' : type === 'sand' ? '#d4a574' : type === 'electric' ? '#ffff00' : '#ff6600';

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={type === 'rain' ? 0.12 : 0.2} transparent opacity={0.8} />
    </points>
  );
}

// ==================== MAIN COMPONENT ====================
export default function Simulation3D() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [intensity, setIntensity] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentHour, setCurrentHour] = useState(0);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingRisks, setBuildingRisks] = useState({});
  const [hourlyData, setHourlyData] = useState([]);
  const [simulationSaved, setSimulationSaved] = useState(false);
  const [algorithmRecommendations, setAlgorithmRecommendations] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const scenario = selectedScenario ? SCENARIOS[selectedScenario] : null;
  const duration = 24;

  useEffect(() => {
    if (isPlaying && selectedScenario) {
      const timer = setInterval(() => {
        setCurrentHour(prev => {
          if (prev >= duration) { 
            setIsPlaying(false);
            return duration; 
          }
          return prev + 1;
        });
      }, 500);
      return () => clearInterval(timer);
    }
  }, [isPlaying, selectedScenario, duration]);

  // Save simulation when it completes
  useEffect(() => {
    if (!isPlaying && currentHour === duration && hourlyData.length > 0 && !simulationSaved) {
      saveSimulationData();
    }
  }, [isPlaying, currentHour, duration, hourlyData.length, simulationSaved]);

  // Track hourly data
  useEffect(() => {
    if (!scenario || currentHour === 0) {
      setHourlyData([]);
      setSimulationSaved(false);
      setAlgorithmRecommendations(null);
      setShowAnalytics(false);
      return;
    }

    const progress = currentHour / duration;
    const effectCurve = Math.sin(progress * Math.PI);
    const intensityFactor = intensity / 100;

    // Calculate current hour stats
    const highRisk = Object.values(buildingRisks).filter(r => r.level === 'high').length;
    const mediumRisk = Object.values(buildingRisks).filter(r => r.level === 'medium').length;
    const lowRisk = Object.values(buildingRisks).filter(r => r.level === 'low').length;
    
    // Simulate demand and AQI based on scenario
    const baseDemand = 35000;
    const demandMultiplier = 1 + (scenario.riskIncrease / 100) * effectCurve * intensityFactor;
    const totalDemand = Math.round(baseDemand * demandMultiplier);
    
    const baseAQI = 60;
    const aqiChange = scenario.riskIncrease * 0.5 * effectCurve * intensityFactor;
    const avgAQI = Math.round(baseAQI + aqiChange);

    const hourData = {
      hour: currentHour,
      total_demand: totalDemand,
      avg_aqi: avgAQI,
      high_risk_zones: highRisk,
      medium_risk_zones: mediumRisk,
      low_risk_zones: lowRisk,
      total_zones: ALL_BUILDINGS.length
    };

    setHourlyData(prev => {
      const newData = [...prev];
      const existingIndex = newData.findIndex(d => d.hour === currentHour);
      if (existingIndex >= 0) {
        newData[existingIndex] = hourData;
      } else {
        newData.push(hourData);
      }
      return newData.sort((a, b) => a.hour - b.hour);
    });
  }, [currentHour, scenario, intensity, buildingRisks]);

  const saveSimulationData = async () => {
    if (!scenario || hourlyData.length === 0 || simulationSaved) return;

    const summary = {
      peak_demand: Math.max(...hourlyData.map(h => h.total_demand)),
      avg_demand: Math.round(hourlyData.reduce((sum, h) => sum + h.total_demand, 0) / hourlyData.length),
      peak_aqi: Math.max(...hourlyData.map(h => h.avg_aqi)),
      avg_aqi: Math.round(hourlyData.reduce((sum, h) => sum + h.avg_aqi, 0) / hourlyData.length),
      max_high_risk: Math.max(...hourlyData.map(h => h.high_risk_zones)),
      total_zones: ALL_BUILDINGS.length
    };

    const simulationData = {
      scenario_id: selectedScenario,
      scenario_name: scenario.name,
      intensity: intensity,
      duration: duration,
      timestamp: new Date().toISOString(),
      hourly_data: hourlyData,
      summary: summary
    };

    try {
      const response = await simulationsAPI.saveSimulation(simulationData);
      if (response.data && response.data.saved) {
        setSimulationSaved(true);
        setAlgorithmRecommendations(response.data.recommendations);
        setShowAnalytics(true);
      }
    } catch (error) {
      console.error('Failed to save simulation:', error);
      // Still show analytics even if save fails
      if (error.response && error.response.data && error.response.data.recommendations) {
        setAlgorithmRecommendations(error.response.data.recommendations);
        setShowAnalytics(true);
      }
    }
  };

  useEffect(() => {
    if (!scenario) { setBuildingRisks({}); return; }
    const progress = currentHour / duration;
    const effectCurve = Math.sin(progress * Math.PI);
    const intensityFactor = intensity / 100;

    const newRisks = {};
    ALL_BUILDINGS.forEach(b => {
      const baseRisk = b.critical ? 15 : 5;
      const increase = scenario.riskIncrease * effectCurve * intensityFactor;
      const score = Math.min(100, Math.round(baseRisk + increase + Math.random() * 10));
      let level = 'low';
      if (score >= 50) level = 'high';
      else if (score >= 25) level = 'medium';
      newRisks[b.id] = { score, level, isAffected: level !== 'low' };
    });
    setBuildingRisks(newRisks);
  }, [currentHour, selectedScenario, intensity, scenario]);

  const getRiskLevel = (id) => buildingRisks[id]?.level || 'low';
  const isAffected = (id) => buildingRisks[id]?.isAffected || false;

  const stats = {
    total: ALL_BUILDINGS.length,
    critical: ALL_BUILDINGS.filter(b => b.critical).length,
    highRisk: Object.values(buildingRisks).filter(r => r.level === 'high').length,
    mediumRisk: Object.values(buildingRisks).filter(r => r.level === 'medium').length,
  };

  return (
    <div className="sim3d-page">
      <div className="sim-header">
        <div className="header-left">
          <Building2 size={28} />
          <div>
            <h1>TRON CITY SIMULATOR</h1>
            <p>{stats.total} structures • {stats.critical} critical • Wireframe visualization</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat cyan"><span>{stats.critical}</span><label>Critical</label></div>
          <div className="stat blue"><span>{stats.total - stats.highRisk - stats.mediumRisk}</span><label>Safe</label></div>
          <div className="stat yellow"><span>{stats.mediumRisk}</span><label>Warning</label></div>
          <div className="stat red"><span>{stats.highRisk}</span><label>Danger</label></div>
        </div>
      </div>

      <div className="sim-layout">
        <div className="left-panel">
          <h3>DISASTER SCENARIOS</h3>
          <div className="scenario-list">
            {Object.values(SCENARIOS).map(s => (
              <button key={s.id} className={`scenario-btn ${selectedScenario === s.id ? 'active' : ''}`}
                onClick={() => { setSelectedScenario(s.id); setCurrentHour(0); setIsPlaying(false); }}
                style={{ '--sc-color': s.color }}>
                <div className="sc-icon" style={{ background: s.color }}><s.icon size={16} color="#000" /></div>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
          {scenario && (
            <div className="controls">
              <label>Intensity: {intensity}%</label>
              <input type="range" min="20" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))} />
              <button className="start-btn" onClick={() => { setCurrentHour(0); setIsPlaying(true); }}><Play size={16} /> START</button>
              <button className="reset-btn" onClick={() => { 
                setIsPlaying(false); 
                setCurrentHour(0); 
                setSelectedScenario(null); 
                setHourlyData([]);
                setSimulationSaved(false);
                setAlgorithmRecommendations(null);
                setShowAnalytics(false);
              }}><RotateCcw size={14} /> RESET</button>
            </div>
          )}
          <div className="legend">
            <h4>COLOR LEGEND</h4>
            <div><span className="dot cyan"></span> Critical (Safe)</div>
            <div><span className="dot blue"></span> Normal (Safe)</div>
            <div><span className="dot yellow"></span> Warning</div>
            <div><span className="dot red"></span> High Risk</div>
            <div><span className="dot green"></span> Parks</div>
          </div>
        </div>

        <div className="canvas-panel">
          <div className="canvas-header">
            <h3>TRON CITY - 3D WIREFRAME</h3>
            <div className="playback">
              <button onClick={() => setIsPlaying(!isPlaying)} disabled={!selectedScenario}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="timeline"><div className="progress" style={{ width: `${(currentHour / duration) * 100}%` }} /></div>
              <span>{currentHour}H / {duration}H</span>
            </div>
          </div>
          <div className="canvas-container">
            <Canvas camera={{ position: [60, 50, 60], fov: 50 }}>
              <ambientLight intensity={0.3} />
              <pointLight position={[0, 60, 0]} intensity={0.5} color="#00d4ff" />
              <TronCityGround />
              {ALL_BUILDINGS.map(b => (
                <WireframeBuilding key={b.id} building={b} riskLevel={getRiskLevel(b.id)} isAffected={isAffected(b.id)}
                  onClick={setSelectedBuilding} isSelected={selectedBuilding?.id === b.id} />
              ))}
              {scenario?.particles && isPlaying && <ParticleEffects type={scenario.particles} />}
              <OrbitControls enablePan enableZoom enableRotate autoRotate={!isPlaying} autoRotateSpeed={0.2} maxPolarAngle={Math.PI / 2.1} />
            </Canvas>
          </div>
        </div>

        <div className="right-panel">
          {selectedBuilding && (
            <div className="info-card">
              <div className="card-header"><h4>{selectedBuilding.name}</h4><button onClick={() => setSelectedBuilding(null)}><X size={14} /></button></div>
              <div className="card-body">
                <div className="row"><span>Type</span><strong>{selectedBuilding.type}</strong></div>
                <div className="row"><span>District</span><strong>{selectedBuilding.district}</strong></div>
                <div className="row"><span>Height</span><strong>{selectedBuilding.height.toFixed(1)}m</strong></div>
                <div className="row"><span>Critical</span><span className={`badge ${selectedBuilding.critical ? 'cyan' : ''}`}>{selectedBuilding.critical ? 'YES' : 'NO'}</span></div>
                <div className="row"><span>Status</span><span className={`badge ${getRiskLevel(selectedBuilding.id)}`}>{getRiskLevel(selectedBuilding.id).toUpperCase()}</span></div>
                <div className="row"><span>Risk</span><strong>{buildingRisks[selectedBuilding.id]?.score || 0}%</strong></div>
              </div>
              {selectedBuilding.critical && <div className="warning-box"><AlertTriangle size={12} /> Priority protection required</div>}
            </div>
          )}
          <div className="info-card">
            <h4><Lightbulb size={14} /> Controls</h4>
            <ul>
              <li><ChevronRight size={10} /> Drag to rotate view</li>
              <li><ChevronRight size={10} /> Scroll to zoom</li>
              <li><ChevronRight size={10} /> Click buildings for info</li>
              <li><ChevronRight size={10} /> Select scenario & START</li>
            </ul>
          </div>
          <div className="info-card">
            <h4><Building2 size={14} /> City Stats</h4>
            <ul>
              <li><ChevronRight size={10} /> {ALL_BUILDINGS.filter(b => b.type === 'skyscraper').length} Skyscrapers</li>
              <li><ChevronRight size={10} /> {ALL_BUILDINGS.filter(b => b.type === 'residential').length} Residences</li>
              <li><ChevronRight size={10} /> {ALL_BUILDINGS.filter(b => b.type === 'office' || b.type === 'tech').length} Offices</li>
              <li><ChevronRight size={10} /> {ALL_BUILDINGS.filter(b => b.critical).length} Critical Sites</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Analytics & Algorithm Recommendations Section */}
      <AnimatePresence>
        {showAnalytics && algorithmRecommendations && (
          <motion.div 
            className="analytics-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="analytics-header">
              <div>
                <h2><BarChart3 size={24} /> Simulation Analytics & Algorithm Recommendations</h2>
                <p>Analysis from LSTM, GNN, and Autoencoder models</p>
              </div>
              {simulationSaved && (
                <div className="saved-badge">
                  <CheckCircle size={16} />
                  <span>Saved to Database</span>
                </div>
              )}
            </div>

            <div className="analytics-grid">
              {/* Summary Stats */}
              <div className="analytics-card summary-card">
                <h3>Simulation Summary</h3>
                <div className="summary-stats">
                  <div className="summary-stat">
                    <span className="label">Peak Demand</span>
                    <span className="value">{Math.max(...hourlyData.map(h => h.total_demand)).toLocaleString()} kW</span>
                  </div>
                  <div className="summary-stat">
                    <span className="label">Avg Demand</span>
                    <span className="value">{Math.round(hourlyData.reduce((sum, h) => sum + h.total_demand, 0) / hourlyData.length).toLocaleString()} kW</span>
                  </div>
                  <div className="summary-stat">
                    <span className="label">Peak AQI</span>
                    <span className="value">{Math.max(...hourlyData.map(h => h.avg_aqi))}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="label">Max High Risk Zones</span>
                    <span className="value red">{Math.max(...hourlyData.map(h => h.high_risk_zones))}</span>
                  </div>
                </div>
              </div>

              {/* LSTM Recommendations */}
              <div className="analytics-card algorithm-card lstm-card">
                <div className="card-title">
                  <Brain size={20} />
                  <h3>{algorithmRecommendations.lstm.model}</h3>
                  <span className="confidence">Confidence: {(algorithmRecommendations.lstm.confidence * 100).toFixed(0)}%</span>
                </div>
                {algorithmRecommendations.lstm.forecast && (
                  <div className="forecast-box">
                    <strong>Forecast:</strong> {algorithmRecommendations.lstm.forecast.next_24h}
                    <br />
                    <small>Peak: {algorithmRecommendations.lstm.forecast.peak_hour} | Increase: {algorithmRecommendations.lstm.forecast.demand_increase}</small>
                  </div>
                )}
                <div className="recommendations-list">
                  {algorithmRecommendations.lstm.recommendations.map((rec, i) => (
                    <div key={i} className={`recommendation ${rec.priority}`}>
                      <div className="rec-header">
                        <span className={`priority-badge ${rec.priority}`}>{rec.priority.toUpperCase()}</span>
                        <strong>{rec.action}</strong>
                      </div>
                      <p>{rec.details}</p>
                      {rec.steps && rec.steps.length > 0 && (
                        <ul>
                          {rec.steps.map((step, j) => (
                            <li key={j}>{step}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* GNN Recommendations */}
              <div className="analytics-card algorithm-card gnn-card">
                <div className="card-title">
                  <Activity size={20} />
                  <h3>{algorithmRecommendations.gnn.model}</h3>
                  <span className="confidence">Confidence: {(algorithmRecommendations.gnn.confidence * 100).toFixed(0)}%</span>
                </div>
                {algorithmRecommendations.gnn.risk_analysis && (
                  <div className="risk-analysis-box">
                    <strong>Network Risk Analysis:</strong>
                    <div className="risk-details">
                      <div>Network Effect: <span className="highlight">{algorithmRecommendations.gnn.risk_analysis.network_effect}</span></div>
                      <div>Cascade Probability: <span className="highlight">{algorithmRecommendations.gnn.risk_analysis.cascade_probability}</span></div>
                    </div>
                  </div>
                )}
                <div className="recommendations-list">
                  {algorithmRecommendations.gnn.recommendations.map((rec, i) => (
                    <div key={i} className={`recommendation ${rec.priority}`}>
                      <div className="rec-header">
                        <span className={`priority-badge ${rec.priority}`}>{rec.priority.toUpperCase()}</span>
                        <strong>{rec.action}</strong>
                      </div>
                      <p>{rec.details}</p>
                      {rec.steps && rec.steps.length > 0 && (
                        <ul>
                          {rec.steps.map((step, j) => (
                            <li key={j}>{step}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Autoencoder Recommendations */}
              <div className="analytics-card algorithm-card autoencoder-card">
                <div className="card-title">
                  <TrendingUp size={20} />
                  <h3>{algorithmRecommendations.autoencoder.model}</h3>
                  <span className="confidence">Confidence: {(algorithmRecommendations.autoencoder.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="anomaly-score-box">
                  <strong>Anomaly Score:</strong>
                  <div className="score-bar">
                    <div 
                      className="score-fill" 
                      style={{ 
                        width: `${algorithmRecommendations.autoencoder.anomaly_score * 100}%`,
                        background: algorithmRecommendations.autoencoder.anomaly_score > 0.8 ? '#ff4466' : 
                                   algorithmRecommendations.autoencoder.anomaly_score > 0.6 ? '#ffaa00' : '#00ff88'
                      }}
                    />
                    <span className="score-value">{(algorithmRecommendations.autoencoder.anomaly_score * 100).toFixed(1)}%</span>
                  </div>
                  <small>{algorithmRecommendations.autoencoder.anomaly_score > 0.8 ? 'Severe Anomaly' : 
                          algorithmRecommendations.autoencoder.anomaly_score > 0.6 ? 'Moderate Anomaly' : 'Normal Pattern'}</small>
                </div>
                <div className="recommendations-list">
                  {algorithmRecommendations.autoencoder.recommendations.map((rec, i) => (
                    <div key={i} className={`recommendation ${rec.priority}`}>
                      <div className="rec-header">
                        <span className={`priority-badge ${rec.priority}`}>{rec.priority.toUpperCase()}</span>
                        <strong>{rec.action}</strong>
                      </div>
                      <p>{rec.details}</p>
                      {rec.steps && rec.steps.length > 0 && (
                        <ul>
                          {rec.steps.map((step, j) => (
                            <li key={j}>{step}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly Trends Chart */}
              <div className="analytics-card chart-card">
                <h3>Hourly Trends</h3>
                <div className="chart-container">
                  <div className="chart-legend">
                    <span className="legend-item"><span className="dot demand"></span> Demand (kW)</span>
                    <span className="legend-item"><span className="dot aqi"></span> AQI</span>
                    <span className="legend-item"><span className="dot risk"></span> High Risk Zones</span>
                  </div>
                  <div className="simple-chart">
                    {hourlyData.map((data, i) => (
                      <div key={i} className="chart-bar-group">
                        <div className="chart-bar demand-bar" style={{ height: `${(data.total_demand / 60000) * 100}%` }} />
                        <div className="chart-bar aqi-bar" style={{ height: `${(data.avg_aqi / 300) * 100}%` }} />
                        <div className="chart-bar risk-bar" style={{ height: `${(data.high_risk_zones / 20) * 100}%` }} />
                        <span className="chart-label">{data.hour}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .sim3d-page { min-height: 100vh; padding: 1.5rem; }
        .sim-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; margin-bottom: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .header-left svg { color: var(--accent-secondary); }
        .header-left h1 { font-size: 1.4rem; margin-bottom: 0.2rem; }
        .header-left p { color: var(--text-secondary); font-size: 0.9rem; }
        .header-stats { display: flex; gap: 1rem; }
        .stat { text-align: center; padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid; }
        .stat span { display: block; font-size: 1.6rem; font-weight: 700; font-family: var(--font-display); }
        .stat label { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; }
        .stat.cyan { border-color: #00ffff; } .stat.cyan span { color: #00ffff; }
        .stat.blue { border-color: #00d4ff; } .stat.blue span { color: #00d4ff; }
        .stat.yellow { border-color: #ffcc00; } .stat.yellow span { color: #ffcc00; }
        .stat.red { border-color: #ff4466; } .stat.red span { color: #ff4466; }
        .sim-layout { display: grid; grid-template-columns: 240px 1fr 260px; gap: 1.5rem; height: calc(100vh - 160px); }
        @media (max-width: 1200px) { .sim-layout { grid-template-columns: 1fr; height: auto; } }
        .left-panel, .right-panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; overflow-y: auto; }
        .left-panel h3 { font-size: 0.85rem; margin-bottom: 1rem; color: var(--accent-secondary); letter-spacing: 0.1em; }
        .scenario-list { display: flex; flex-direction: column; gap: 0.4rem; }
        .scenario-btn { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem; background: var(--bg-secondary); border: 2px solid transparent; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .scenario-btn:hover { border-color: var(--sc-color); }
        .scenario-btn.active { border-color: var(--sc-color); background: color-mix(in srgb, var(--sc-color) 15%, var(--bg-secondary)); }
        .sc-icon { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .scenario-btn span { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
        .controls { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .controls label { display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem; }
        .controls input[type="range"] { width: 100%; margin-bottom: 0.75rem; }
        .start-btn { width: 100%; padding: 0.6rem; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); border: none; border-radius: 6px; color: #000; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; margin-bottom: 0.4rem; font-size: 0.85rem; }
        .reset-btn { width: 100%; padding: 0.5rem; background: transparent; border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.8rem; }
        .legend { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); }
        .legend h4 { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; letter-spacing: 0.1em; }
        .legend > div { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary); padding: 0.3rem 0; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.cyan { background: #00ffff; } .dot.blue { background: #00d4ff; } .dot.yellow { background: #ffcc00; } .dot.red { background: #ff4466; } .dot.green { background: #00ff88; }
        .canvas-panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
        .canvas-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); }
        .canvas-header h3 { font-size: 0.9rem; color: var(--accent-secondary); }
        .playback { display: flex; align-items: center; gap: 0.6rem; }
        .playback button { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--accent-primary); border: none; border-radius: 50%; color: #000; cursor: pointer; }
        .playback button:disabled { opacity: 0.5; cursor: not-allowed; }
        .timeline { width: 100px; height: 5px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden; }
        .progress { height: 100%; background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); }
        .playback span { font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-secondary); }
        .canvas-container { flex: 1; min-height: 500px; }
        .info-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .card-header h4 { font-size: 0.9rem; }
        .card-header button { background: none; border: none; color: var(--text-muted); cursor: pointer; }
        .card-body .row { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.85rem; }
        .card-body .row:last-child { border-bottom: none; }
        .card-body .row span:first-child { color: var(--text-muted); }
        .card-body .row strong { text-transform: capitalize; }
        .badge { padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.7rem; font-weight: 700; }
        .badge.low { background: rgba(0,212,255,0.2); color: #00d4ff; }
        .badge.medium { background: rgba(255,204,0,0.2); color: #ffcc00; }
        .badge.high { background: rgba(255,68,102,0.2); color: #ff4466; }
        .badge.cyan { background: rgba(0,255,255,0.2); color: #00ffff; }
        .warning-box { margin-top: 0.5rem; padding: 0.4rem; background: rgba(255,68,102,0.1); border: 1px solid rgba(255,68,102,0.3); border-radius: 4px; display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #ff6688; }
        .info-card h4 { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--accent-secondary); margin-bottom: 0.5rem; }
        .info-card ul { list-style: none; padding: 0; margin: 0; }
        .info-card li { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-secondary); padding: 0.25rem 0; }
        .info-card li svg { color: var(--accent-primary); }
        .analytics-section { margin-top: 1.5rem; padding: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; }
        .analytics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
        .analytics-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.2rem; margin-bottom: 0.25rem; }
        .analytics-header p { color: var(--text-secondary); font-size: 0.9rem; }
        .saved-badge { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(0,255,136,0.1); border: 1px solid #00ff88; border-radius: 20px; color: #00ff88; font-size: 0.85rem; }
        .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
        .analytics-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; }
        .analytics-card h3 { font-size: 1rem; margin-bottom: 1rem; color: var(--accent-secondary); }
        .summary-card { grid-column: 1 / -1; }
        .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .summary-stat { display: flex; flex-direction: column; gap: 0.25rem; }
        .summary-stat .label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
        .summary-stat .value { font-size: 1.5rem; font-weight: 700; font-family: var(--font-mono); color: var(--accent-primary); }
        .summary-stat .value.red { color: #ff4466; }
        .algorithm-card { }
        .card-title { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .card-title h3 { margin: 0; flex: 1; }
        .confidence { font-size: 0.75rem; color: var(--text-muted); padding: 0.25rem 0.5rem; background: var(--bg-card); border-radius: 4px; }
        .forecast-box, .risk-analysis-box, .anomaly-score-box { padding: 0.75rem; background: var(--bg-card); border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem; }
        .forecast-box strong, .risk-analysis-box strong, .anomaly-score-box strong { display: block; margin-bottom: 0.5rem; }
        .risk-details { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .highlight { color: var(--accent-primary); font-weight: 600; }
        .anomaly-score-box { }
        .score-bar { position: relative; height: 24px; background: var(--bg-card); border-radius: 12px; overflow: hidden; margin: 0.5rem 0; }
        .score-fill { height: 100%; transition: width 0.5s; border-radius: 12px; }
        .score-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: 700; font-size: 0.75rem; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
        .recommendations-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .recommendation { padding: 0.75rem; background: var(--bg-card); border-left: 3px solid var(--border-color); border-radius: 4px; }
        .recommendation.high { border-left-color: #ffaa00; }
        .recommendation.critical { border-left-color: #ff4466; }
        .rec-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .priority-badge { font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 3px; font-weight: 700; text-transform: uppercase; }
        .priority-badge.high { background: rgba(255,170,0,0.2); color: #ffaa00; }
        .priority-badge.critical { background: rgba(255,68,102,0.2); color: #ff4466; }
        .recommendation p { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
        .recommendation ul { list-style: none; padding: 0; margin: 0; }
        .recommendation li { font-size: 0.8rem; color: var(--text-secondary); padding: 0.25rem 0; padding-left: 1rem; position: relative; }
        .recommendation li::before { content: '→'; position: absolute; left: 0; color: var(--accent-primary); }
        .chart-card { grid-column: 1 / -1; }
        .chart-container { }
        .chart-legend { display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.8rem; }
        .legend-item { display: flex; align-items: center; gap: 0.5rem; }
        .legend-item .dot { width: 10px; height: 10px; border-radius: 50%; }
        .legend-item .dot.demand { background: #00d4ff; }
        .legend-item .dot.aqi { background: #ffaa00; }
        .legend-item .dot.risk { background: #ff4466; }
        .simple-chart { display: flex; align-items: flex-end; gap: 0.5rem; height: 200px; padding: 1rem; background: var(--bg-card); border-radius: 6px; }
        .chart-bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; }
        .chart-bar { width: 100%; min-height: 2px; border-radius: 2px 2px 0 0; }
        .chart-bar.demand-bar { background: #00d4ff; opacity: 0.8; }
        .chart-bar.aqi-bar { background: #ffaa00; opacity: 0.8; }
        .chart-bar.risk-bar { background: #ff4466; opacity: 0.8; }
        .chart-label { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.5rem; }
      `}</style>
    </div>
  );
}
