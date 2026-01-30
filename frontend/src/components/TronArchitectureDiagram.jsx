import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

export default function TronArchitectureDiagram({ isFullscreen = false, onToggleFullscreen }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [clickedNode, setClickedNode] = useState(null);
  const [connectionAnimation, setConnectionAnimation] = useState(0);

  // Connections definition (static) - full flow including Kafka, Neo4j KG, Live Stream, City Map
  const connections = [
    // Data to ML
    { from: 'mongodb', to: 'forecast', fromLayer: 'data', toLayer: 'ml' },
    { from: 'indexes', to: 'anomaly', fromLayer: 'data', toLayer: 'ml' },
    { from: 'sources', to: 'risk', fromLayer: 'data', toLayer: 'ml' },
    { from: 'kafka', to: 'fastapi', fromLayer: 'data', toLayer: 'api' },
    // ML to API
    { from: 'forecast', to: 'fastapi', fromLayer: 'ml', toLayer: 'api' },
    { from: 'anomaly', to: 'fastapi', fromLayer: 'ml', toLayer: 'api' },
    { from: 'risk', to: 'fastapi', fromLayer: 'ml', toLayer: 'api' },
    { from: 'risk', to: 'ai', fromLayer: 'ml', toLayer: 'api' },
    { from: 'risk', to: 'kg_sync', fromLayer: 'ml', toLayer: 'api' },
    { from: 'mongodb', to: 'kg_sync', fromLayer: 'data', toLayer: 'api' },
    // API to UI
    { from: 'fastapi', to: 'dashboard', fromLayer: 'api', toLayer: 'ui' },
    { from: 'fastapi', to: 'livestream', fromLayer: 'api', toLayer: 'ui' },
    { from: 'fastapi', to: 'citymap', fromLayer: 'api', toLayer: 'ui' },
    { from: 'fastapi', to: 'visualizations', fromLayer: 'api', toLayer: 'ui' },
    { from: 'ai', to: 'recommendations', fromLayer: 'api', toLayer: 'ui' },
    { from: 'kg_sync', to: 'recommendations', fromLayer: 'api', toLayer: 'ui' },
  ];

  // Calculate centered positions for components
  const calculateCenteredLayout = (canvasWidth) => {
    const gap = 20; // Gap between components
    
    const layers = [
      {
        id: 'data',
        label: 'DATA SOURCES & INGESTION',
        y: 85,
        color: '#00d4ff',
        description: 'Real-time & Historical Data Collection',
        components: [
          { id: 'mongodb', label: 'MongoDB (Dual)', width: 180, height: 70, details: ['Atlas: Sim Data', 'Local: City Data', 'processed_zone_data, kafka_live_feed'] },
          { id: 'indexes', label: 'Optimized Indexes', width: 160, height: 70, details: ['10+ Indexes', 'Fast Queries', 'Real-time'] },
          { id: 'sources', label: 'Live APIs', width: 180, height: 70, details: ['OpenWeatherMap • AirVisual', 'TomTom • EIA • Census', 'City 311 • Fallbacks: CSV/XLSX'] },
          { id: 'kafka', label: 'Kafka Pipeline', width: 180, height: 70, details: ['Topics: AQI, Traffic, Power, Alerts, Incidents', 'Consumer → kafka_live_feed', 'Updates ~45s'] },
        ]
      },
      {
        id: 'ml',
        label: 'MACHINE LEARNING (5 Models)',
        y: 215,
        color: '#00ff88',
        description: 'TFT Primary, LSTM Comparison, Autoencoder, GNN, Neo4j KG',
        components: [
          { id: 'forecast', label: 'Demand Forecasting', width: 220, height: 72, details: ['TFT (primary) • LSTM (comparison)', 'ARIMA • Prophet', 'Live City Data, Every 5 Min'] },
          { id: 'anomaly', label: 'Anomaly Detection', width: 200, height: 72, details: ['Autoencoder', 'Per-Zone Detection', 'Threshold 2× baseline'] },
          { id: 'risk', label: 'Risk: GNN + Neo4j KG', width: 240, height: 72, details: ['GNN: Live Risk Scoring', 'Neo4j: Zones, Adjacency', 'Cypher Risk Reasoning'] },
        ]
      },
      {
        id: 'api',
        label: 'ANALYSIS & PROCESSING',
        y: 345,
        color: '#ffaa00',
        description: 'FastAPI, City Processing, Neo4j Sync, OpenRouter',
        components: [
          { id: 'fastapi', label: 'FastAPI Backend', width: 220, height: 68, details: ['30+ REST Endpoints', 'City process_all_zones', 'Mode-Aware (City/Sim)'] },
          { id: 'ai', label: 'AI Recommendations', width: 200, height: 68, details: ['OpenRouter LLM', 'All ML Outputs → Actions', 'OPENROUTER_API_KEY in .env'] },
          { id: 'kg_sync', label: 'Neo4j KG Sync', width: 200, height: 68, details: ['Sync from processed_zone_data', '/api/kg/sync, /api/kg/graph', 'After city processing'] },
        ]
      },
      {
        id: 'ui',
        label: 'DECISION SUPPORT & DASHBOARDS',
        y: 465,
        color: '#aa66ff',
        description: 'Real-time Dashboard, Analytics, Live Stream, City Map',
        components: [
          { id: 'dashboard', label: 'Dashboard & Home', width: 160, height: 68, details: ['City Selector', 'Key Metrics', 'Architecture (this diagram)'] },
          { id: 'recommendations', label: 'AI Recommendations', width: 160, height: 68, details: ['Prioritized Actions', 'Cost-Benefit', 'Simulations'] },
          { id: 'visualizations', label: 'Analytics', width: 160, height: 68, details: ['Heat Maps, Demand by Zone', 'Historical vs Real-time', 'Anomalies Timeline'] },
          { id: 'livestream', label: 'Live Stream', width: 140, height: 68, details: ['Kafka feed by topic', 'AQI, Traffic, Power', '~45s refresh'] },
          { id: 'citymap', label: 'City Map', width: 140, height: 68, details: ['2D Grid, Scrollable', 'TFT/LSTM, GNN, Cascade', 'Zone risk colors'] },
        ]
      }
    ];

    // Center each layer's components
    layers.forEach(layer => {
      const totalWidth = layer.components.reduce((sum, comp) => sum + comp.width, 0) + (gap * (layer.components.length - 1));
      let currentX = (canvasWidth - totalWidth) / 2;
      
      layer.components.forEach(comp => {
        comp.x = currentX;
        currentX += comp.width + gap;
      });
    });

    return layers;
  };

  // Clean, professional architecture layout - will be centered dynamically
  const [architecture, setArchitecture] = useState({
    title: "Urban Grid Management System",
    subtitle: "Climate & Constraint-Aware Energy Grid Intelligence",
    layers: [],
    connections: connections
  });

  // Animate connections
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionAnimation(prev => (prev + 0.02) % 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Use ref to store architecture to avoid re-render loops
  const architectureRef = useRef(null);

  // Initialize architecture layout once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centeredLayers = calculateCenteredLayout(rect.width);
    
    const arch = {
      title: "Urban Grid Management System",
      subtitle: "Climate & Constraint-Aware Energy Grid Intelligence",
      layers: centeredLayers,
      connections: connections
    };
    
    architectureRef.current = arch;
    setArchitecture(arch);
  }, []); // Empty deps - only run once

  // Separate effect for drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !architectureRef.current || architectureRef.current.layers.length === 0) return;
    
    const arch = architectureRef.current;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      
      // Draw title - smaller and cleaner
      ctx.fillStyle = '#00ff88';
      ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(arch.title, rect.width / 2, 22);
      
      ctx.fillStyle = '#88aacc';
      ctx.font = '400 11px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(arch.subtitle, rect.width / 2, 38);
      
      // Draw connections first (behind everything) with animation
      arch.connections.forEach((conn, idx) => {
        const fromLayer = arch.layers.find(l => l.id === conn.fromLayer);
        const toLayer = arch.layers.find(l => l.id === conn.toLayer);
        const fromNode = fromLayer?.components.find(n => n.id === conn.from);
        const toNode = toLayer?.components.find(n => n.id === conn.to);
        
        if (fromNode && toNode) {
          const x1 = fromNode.x + fromNode.width / 2;
          const y1 = fromLayer.y + fromNode.height;
          const x2 = toNode.x + toNode.width / 2;
          const y2 = toLayer.y;
          
          // Animated connection line with pulse effect
          const isActive = hoveredNode === conn.from || hoveredNode === conn.to;
          const opacity = isActive ? '80' : '40';
          const lineWidth = isActive ? 2 : 1.5;
          
          ctx.strokeStyle = fromLayer.color + opacity;
          ctx.lineWidth = lineWidth;
          
          // Animated dash pattern
          const dashOffset = connectionAnimation * 10;
          ctx.setLineDash([4, 3]);
          ctx.lineDashOffset = dashOffset + (idx * 2);
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Animated arrow head with glow
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const arrowSize = isActive ? 8 : 6;
          
          // Glow effect for active connections
          if (isActive) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = toLayer.color;
          }
          
          ctx.fillStyle = toLayer.color + (isActive ? 'ff' : '80');
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - arrowSize * Math.cos(angle - Math.PI / 6),
            y2 - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x2 - arrowSize * Math.cos(angle + Math.PI / 6),
            y2 - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      
      // Draw layers
      arch.layers.forEach(layer => {
        // Calculate center for layer label
        const firstComp = layer.components[0];
        const lastComp = layer.components[layer.components.length - 1];
        const layerCenterX = firstComp ? (firstComp.x + lastComp.x + lastComp.width) / 2 : rect.width / 2;
        
        // Layer label - centered above components
        ctx.fillStyle = layer.color;
        ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(layer.label, layerCenterX, layer.y - 25);
        
        ctx.fillStyle = '#8899aa';
        ctx.font = '400 10px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(layer.description, layerCenterX, layer.y - 12);
        
        // Draw components
        layer.components.forEach(component => {
          const isHovered = hoveredNode === component.id;
          const isClicked = clickedNode === component.id;
          
          // Pulse animation for clicked nodes
          const pulseScale = isClicked ? 1 + Math.sin(connectionAnimation * Math.PI * 2) * 0.02 : 1;
          const offsetX = (component.width * (pulseScale - 1)) / 2;
          const offsetY = (component.height * (pulseScale - 1)) / 2;
          
          // Glow effect for hovered/clicked
          if (isHovered || isClicked) {
            ctx.shadowBlur = isClicked ? 20 : 15;
            ctx.shadowColor = layer.color;
          }
          
          // Component background with gradient effect on hover
          if (isHovered || isClicked) {
            const gradient = ctx.createLinearGradient(
              component.x, layer.y,
              component.x + component.width, layer.y + component.height
            );
            gradient.addColorStop(0, layer.color + '15');
            gradient.addColorStop(1, layer.color + '25');
            ctx.fillStyle = gradient;
          } else {
            ctx.fillStyle = layer.color + '08';
          }
          ctx.fillRect(component.x - offsetX, layer.y - offsetY, component.width * pulseScale, component.height * pulseScale);
          
          // Border - enhanced on hover/click
          ctx.strokeStyle = layer.color + (isClicked ? 'ff' : isHovered ? 'cc' : '50');
          ctx.lineWidth = isClicked ? 3 : isHovered ? 2 : 1;
          ctx.strokeRect(component.x - offsetX, layer.y - offsetY, component.width * pulseScale, component.height * pulseScale);
          ctx.shadowBlur = 0;
          
          // Component label - smaller, cleaner
          ctx.fillStyle = layer.color;
          ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            component.label,
            component.x + component.width / 2,
            layer.y + 18
          );
          
          // Component details - smaller, more compact
          ctx.fillStyle = '#aabbcc';
          ctx.font = '400 9px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center';
          component.details.forEach((line, i) => {
            ctx.fillText(
              line,
              component.x + component.width / 2,
              layer.y + 32 + (i * 11)
            );
          });
        });
      });
    };

    draw();
    
    const interval = setInterval(() => {
      draw();
    }, 16); // 60fps for smooth animations
    
    return () => clearInterval(interval);
  }, [hoveredNode, clickedNode, connectionAnimation, scale, position]);

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - position.x) / scale;
    const y = (e.clientY - rect.top - position.y) / scale;

    let found = false;
    const arch = architectureRef.current;
    if (!arch) return;
    
    arch.layers.forEach(layer => {
      layer.components.forEach(component => {
        if (
          x >= component.x && x <= component.x + component.width &&
          y >= layer.y && y <= layer.y + component.height
        ) {
          setHoveredNode(component.id);
          found = true;
        }
      });
    });
    
    if (!found) {
      setHoveredNode(null);
    }
  };

  const handleClick = (e) => {
    if (!canvasRef.current || isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - position.x) / scale;
    const y = (e.clientY - rect.top - position.y) / scale;

    let found = false;
    const arch = architectureRef.current;
    if (!arch) return;
    
    arch.layers.forEach(layer => {
      layer.components.forEach(component => {
        if (
          x >= component.x && x <= component.x + component.width &&
          y >= layer.y && y <= layer.y + component.height
        ) {
          setClickedNode(clickedNode === component.id ? null : component.id);
          found = true;
        }
      });
    });
    
    if (!found) {
      setClickedNode(null);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div
      ref={containerRef}
      className={`tron-architecture-container ${isFullscreen ? 'fullscreen' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : '620px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '8px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Controls */}
      <div className="diagram-controls">
        <button onClick={handleZoomIn} title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={handleReset} title="Reset View">
          <RotateCcw size={16} />
        </button>
        {onToggleFullscreen && (
          <button onClick={onToggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>

      {/* Zoom indicator */}
      <div className="zoom-indicator">
        {Math.round(scale * 100)}%
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'top left',
          transition: isDragging ? 'none' : 'transform 0.2s ease'
        }}
      />

      {/* Legend - cleaner and smaller */}
      <div className="architecture-legend">
        <div className="legend-title">System Flow</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#00d4ff' }}></div>
            <span>Data</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#00ff88' }}></div>
            <span>AI Analysis</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ffaa00' }}></div>
            <span>Processing</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#aa66ff' }}></div>
            <span>Decision</span>
          </div>
        </div>
      </div>

      <style>{`
        .tron-architecture-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          border-radius: 0;
        }
        
        .diagram-controls {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          z-index: 10;
          display: flex;
          gap: 0.4rem;
          background: rgba(10, 15, 25, 0.95);
          padding: 0.4rem;
          border-radius: 6px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 212, 255, 0.2);
        }
        
        .diagram-controls button {
          background: transparent;
          border: 1px solid rgba(0, 212, 255, 0.2);
          color: #aabbcc;
          padding: 0.4rem;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .diagram-controls button:hover {
          border-color: #00ff88;
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
        }
        
        .zoom-indicator {
          position: absolute;
          bottom: 0.75rem;
          left: 0.75rem;
          z-index: 10;
          background: rgba(10, 15, 25, 0.95);
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          color: #aabbcc;
          font-size: 0.75rem;
          font-family: 'Segoe UI', system-ui, sans-serif;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .architecture-legend {
          position: absolute;
          bottom: 0.75rem;
          right: 0.75rem;
          z-index: 10;
          background: rgba(10, 15, 25, 0.95);
          padding: 0.75rem;
          border-radius: 6px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 212, 255, 0.2);
          min-width: 140px;
        }

        .legend-title {
          font-size: 0.7rem;
          color: #00ff88;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          font-weight: 600;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .legend-items {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #aabbcc;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
