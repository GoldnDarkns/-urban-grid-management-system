import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import mermaid from 'mermaid';

const mermaidDiagram = `
graph TB
    subgraph "Data Layer"
        MongoDB["MongoDB Atlas<br/>Time-Series Collections<br/>8 Collections<br/>360K+ Documents"]
        Collections["Collections:<br/>• zones<br/>• households<br/>• meter_readings<br/>• air_climate_readings<br/>• alerts<br/>• constraint_events<br/>• policies<br/>• grid_edges"]
        Indexes["Indexes:<br/>• Time-series indexes<br/>• Zone lookups<br/>• Graph indexes<br/>• Query optimization"]
    end
    
    subgraph "ML Layer"
        LSTM["LSTM Model<br/>Demand Forecasting<br/>TensorFlow/Keras<br/>RMSE: 64.27<br/>R²: 0.64"]
        Autoencoder["Autoencoder<br/>Anomaly Detection<br/>TensorFlow/Keras<br/>Anomaly Rate: 5.33%"]
        GNN["GNN Model<br/>Zone Risk Scoring<br/>TensorFlow/Keras<br/>Network Effects"]
        ARIMA["ARIMA<br/>Statistical Forecasting<br/>statsmodels"]
        Prophet["Prophet<br/>Seasonal Forecasting<br/>R²: 0.86"]
    end
    
    subgraph "API Layer"
        FastAPI["FastAPI Backend<br/>REST API<br/>30+ Endpoints"]
        Routes["Routes:<br/>• /api/data<br/>• /api/analytics<br/>• /api/models<br/>• /api/queries<br/>• /api/incidents"]
        RealTime["Real-time Processing<br/>• Data aggregation<br/>• Query execution<br/>• Model inference"]
    end
    
    subgraph "UI Layer"
        React["React Frontend<br/>14 Pages<br/>Interactive Components"]
        Charts["Visualizations:<br/>• Recharts<br/>• Three.js 3D<br/>• Interactive Maps"]
        Dashboard["Dashboard Features:<br/>• Real-time stats<br/>• Analytics views<br/>• ML model insights"]
    end
    
    MongoDB --> Collections
    Collections --> Indexes
    Indexes --> LSTM
    Indexes --> Autoencoder
    Indexes --> GNN
    Indexes --> ARIMA
    Indexes --> Prophet
    
    LSTM --> FastAPI
    Autoencoder --> FastAPI
    GNN --> FastAPI
    ARIMA --> FastAPI
    Prophet --> FastAPI
    
    FastAPI --> Routes
    Routes --> RealTime
    RealTime --> React
    
    React --> Charts
    React --> Dashboard
    
    style MongoDB fill:#00d4ff,stroke:#00d4ff,stroke-width:2px,color:#000
    style Collections fill:#00d4ff,stroke:#00d4ff,stroke-width:2px,color:#000
    style Indexes fill:#00d4ff,stroke:#00d4ff,stroke-width:2px,color:#000
    style LSTM fill:#00ff88,stroke:#00ff88,stroke-width:2px,color:#000
    style Autoencoder fill:#ffaa00,stroke:#ffaa00,stroke-width:2px,color:#000
    style GNN fill:#aa66ff,stroke:#aa66ff,stroke-width:2px,color:#000
    style ARIMA fill:#00ff88,stroke:#00ff88,stroke-width:2px,color:#000
    style Prophet fill:#00ff88,stroke:#00ff88,stroke-width:2px,color:#000
    style FastAPI fill:#ffaa00,stroke:#ffaa00,stroke-width:2px,color:#000
    style Routes fill:#ffaa00,stroke:#ffaa00,stroke-width:2px,color:#000
    style RealTime fill:#ffaa00,stroke:#ffaa00,stroke-width:2px,color:#000
    style React fill:#aa66ff,stroke:#aa66ff,stroke-width:2px,color:#000
    style Charts fill:#aa66ff,stroke:#aa66ff,stroke-width:2px,color:#000
    style Dashboard fill:#aa66ff,stroke:#aa66ff,stroke-width:2px,color:#000
`;

export default function ArchitectureDiagram({ isFullscreen = false, onToggleFullscreen }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const diagramRef = useRef(null);
  const mermaidRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#00ff88',
        primaryTextColor: '#000',
        primaryBorderColor: '#00d4ff',
        lineColor: '#00d4ff',
        secondaryColor: '#ffaa00',
        tertiaryColor: '#aa66ff'
      }
    });
    
    if (mermaidRef.current && mermaidDiagram) {
      const renderMermaid = async () => {
        try {
          const { svg } = await mermaid.render('architecture-diagram-' + Date.now(), mermaidDiagram);
          mermaidRef.current.innerHTML = svg;
        } catch (err) {
          console.error('Mermaid render error:', err);
          mermaidRef.current.innerHTML = '<p>Error rendering diagram</p>';
        }
      };
      renderMermaid();
    }
  }, []);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      className={`architecture-diagram-container ${isFullscreen ? 'fullscreen' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : '600px',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Controls */}
      <div 
        className="diagram-controls"
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 10,
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '0.5rem',
          borderRadius: '8px',
          backdropFilter: 'blur(10px)'
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleReset}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Reset View"
        >
          <RotateCcw size={18} />
        </button>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        )}
      </div>

      {/* Zoom indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          backdropFilter: 'blur(10px)'
        }}
      >
        Zoom: {Math.round(scale * 100)}%
      </div>

      {/* Diagram */}
      <div
        ref={diagramRef}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <div 
          ref={mermaidRef}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          className="mermaid-diagram"
        />
      </div>

      <style>{`
        .architecture-diagram-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          border-radius: 0;
        }
        
        .architecture-diagram-container svg {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}
