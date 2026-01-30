import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

const RISK_COLORS = {
  low: '#00ff88',
  medium: '#ffaa00',
  high: '#ff4466',
};
const DEFAULT_NODE_COLOR = '#00d4ff';
const EDGE_COLOR = 'rgba(0, 212, 255, 0.5)';
const EDGE_GLOW = '#00d4ff';

function projectLatLon(nodes, width, height, padding = 60) {
  const withCoords = nodes.filter((n) => n.lat != null && n.lon != null && Number.isFinite(n.lat) && Number.isFinite(n.lon));
  if (withCoords.length === 0) return null;
  const lats = withCoords.map((n) => n.lat);
  const lons = withCoords.map((n) => n.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const rangeLat = maxLat - minLat || 1;
  const rangeLon = maxLon - minLon || 1;
  const W = width - 2 * padding;
  const H = height - 2 * padding;
  const scale = Math.min(W / rangeLon, H / rangeLat);
  const midLon = (minLon + maxLon) / 2;
  const midLat = (minLat + maxLat) / 2;
  const ox = width / 2 - (midLon - minLon) * scale;
  const oy = height / 2 + (midLat - minLat) * scale;
  const toXY = (lat, lon) => ({
    x: ox + (lon - minLon) * scale,
    y: oy - (lat - minLat) * scale,
  });
  return toXY;
}

function forceLayout(nodes, edges, width, height, iterations = 80) {
  const idToIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const W = width * 0.8;
  const H = height * 0.8;
  const cx = width / 2;
  const cy = height / 2;
  let xs = nodes.map((_, i) => cx + (i % 5) * 80 - 160);
  let ys = nodes.map((_, i) => cy + Math.floor(i / 5) * 60 - 120);
  const k = 80;
  const repulsion = 1200;
  for (let iter = 0; iter < iterations; iter++) {
    const fx = new Float64Array(nodes.length);
    const fy = new Float64Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = xs[j] - xs[i];
        const dy = ys[j] - ys[i];
        const d = Math.hypot(dx, dy) || 0.01;
        const f = repulsion / (d * d);
        const ux = dx / d;
        const uy = dy / d;
        fx[i] -= ux * f;
        fy[i] -= uy * f;
        fx[j] += ux * f;
        fy[j] += uy * f;
      }
    }
    edges.forEach((e) => {
      const i = idToIndex.get(e.source);
      const j = idToIndex.get(e.target);
      if (i == null || j == null) return;
      const dx = xs[j] - xs[i];
      const dy = ys[j] - ys[i];
      const d = Math.hypot(dx, dy) || 0.01;
      const f = d * 0.02;
      const ux = dx / d;
      const uy = dy / d;
      fx[i] += ux * f;
      fy[i] += uy * f;
      fx[j] -= ux * f;
      fy[j] -= uy * f;
    });
    for (let i = 0; i < nodes.length; i++) {
      xs[i] = Math.max(40, Math.min(width - 40, xs[i] + fx[i] * 0.1));
      ys[i] = Math.max(40, Math.min(height - 40, ys[i] + fy[i] * 0.1));
    }
  }
  return nodes.map((_, i) => ({ x: xs[i], y: ys[i] }));
}

export default function KnowledgeGraphViz({ graph, className = '' }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [edgeAnimation, setEdgeAnimation] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];

  const layout = useMemo(() => {
    if (nodes.length === 0) return { positions: [], toXY: null };
    const { width, height } = dimensions;
    const toXY = projectLatLon(nodes, width, height);
    if (toXY) {
      const positions = nodes.map((n) =>
        n.lat != null && n.lon != null ? toXY(n.lat, n.lon) : { x: width / 2, y: height / 2 }
      );
      return { positions, toXY };
    }
    const positions = forceLayout(nodes, edges, width, height);
    return { positions, toXY: null };
  }, [nodes, edges, dimensions]);

  useEffect(() => {
    const t = setInterval(() => setEdgeAnimation((a) => (a + 0.03) % 1), 50);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.max(300, width), height: Math.max(300, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodeRadius = 10;
  const idToIndex = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || layout.positions.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimensions;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.clearRect(0, 0, width, height);

    const pos = (idx) => layout.positions[idx] || { x: width / 2, y: height / 2 };

    edges.forEach((edge, idx) => {
      const i = idToIndex.get(edge.source);
      const j = idToIndex.get(edge.target);
      if (i == null || j == null) return;
      const from = pos(i);
      const to = pos(j);
      const active = hoveredId === edge.source || hoveredId === edge.target || selectedId === edge.source || selectedId === edge.target;
      ctx.strokeStyle = active ? EDGE_GLOW : EDGE_COLOR;
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = (edgeAnimation * 12 + idx * 2) % 14;
      if (active) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = EDGE_GLOW;
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    });

    nodes.forEach((node, idx) => {
      const p = layout.positions[idx];
      if (!p) return;
      const id = node?.id;
      const isHovered = hoveredId === id;
      const isSelected = selectedId === id;
      const color = RISK_COLORS[node?.risk_level] || DEFAULT_NODE_COLOR;
      const pulse = isSelected ? 1 + Math.sin(edgeAnimation * Math.PI * 2) * 0.08 : 1;
      const r = nodeRadius * pulse;

      if (isHovered || isSelected) {
        ctx.shadowBlur = isSelected ? 24 : 18;
        ctx.shadowColor = color;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHovered || isSelected ? color : color + '99';
      ctx.fill();
      ctx.strokeStyle = color + (isSelected ? 'ff' : 'cc');
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (node?.label) {
        ctx.fillStyle = '#e0e8f0';
        ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(node.label).slice(0, 12), p.x, p.y + r + 14);
      }
    });
  };

  useEffect(() => {
    let rafId;
    const loop = () => {
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [hoveredId, selectedId, edgeAnimation, graph]);

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - position.x) / scale;
    const y = (e.clientY - rect.top - position.y) / scale;
    let found = null;
    layout.positions.forEach((p, i) => {
      const dx = x - p.x;
      const dy = y - p.y;
      if (dx * dx + dy * dy <= (nodeRadius * 2) ** 2) found = nodes[i]?.id ?? null;
    });
    setHoveredId(found);
  };

  const handleClick = (e) => {
    if (isDragging) return;
    setSelectedId(hoveredId && selectedId === hoveredId ? null : hoveredId);
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) : null;

  if (nodes.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`kg-viz-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '500px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        border: '1px solid rgba(0, 212, 255, 0.25)',
        borderRadius: '12px',
        cursor: hoveredId ? 'pointer' : isDragging ? 'grabbing' : 'grab',
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setHoveredId(null)}
      onClick={handleClick}
    >
      <div className="kg-viz-controls">
        <button type="button" onClick={() => setScale((s) => Math.min(s + 0.2, 3))} title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button type="button" onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))} title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
          title="Reset"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="kg-viz-zoom">{Math.round(scale * 100)}%</div>

      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'top left',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
        }}
      />

      <div className="kg-viz-legend">
        <span className="kg-legend-dot" style={{ background: RISK_COLORS.low, boxShadow: `0 0 10px ${RISK_COLORS.low}` }} /> Low
        <span className="kg-legend-dot" style={{ background: RISK_COLORS.medium, boxShadow: `0 0 10px ${RISK_COLORS.medium}` }} /> Medium
        <span className="kg-legend-dot" style={{ background: RISK_COLORS.high, boxShadow: `0 0 10px ${RISK_COLORS.high}` }} /> High
      </div>

      <AnimatePresence mode="wait">
        {selectedNode && (
          <motion.div
            key={selectedId}
            className="kg-viz-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button type="button" className="kg-viz-detail-close" onClick={(e) => { e.stopPropagation(); setSelectedId(null); }} aria-label="Close">
              <X size={16} />
            </button>
            <div className="kg-viz-detail-title">Zone {selectedNode.label ?? selectedNode.id}</div>
            <div className="kg-viz-detail-row">
              <span>Risk level</span>
              <span className="kg-viz-risk" data-level={selectedNode.risk_level}>
                {selectedNode.risk_level ?? '—'}
              </span>
            </div>
            <div className="kg-viz-detail-row">
              <span>Risk score</span>
              <span>{selectedNode.risk_score != null ? Number(selectedNode.risk_score).toFixed(1) : '—'}</span>
            </div>
            {selectedNode.lat != null && (
              <div className="kg-viz-detail-row">
                <span>Lat / Lon</span>
                <span>{Number(selectedNode.lat).toFixed(4)}, {Number(selectedNode.lon).toFixed(4)}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .kg-viz-container { box-shadow: 0 0 40px rgba(0, 212, 255, 0.08); }
        .kg-viz-controls {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          z-index: 10;
          display: flex;
          gap: 0.4rem;
          background: rgba(10, 15, 25, 0.92);
          padding: 0.4rem;
          border-radius: 8px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 212, 255, 0.2);
        }
        .kg-viz-controls button {
          background: transparent;
          border: 1px solid rgba(0, 212, 255, 0.3);
          color: #aabbcc;
          padding: 0.4rem;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .kg-viz-controls button:hover {
          color: #00d4ff;
          border-color: rgba(0, 212, 255, 0.6);
          box-shadow: 0 0 12px rgba(0, 212, 255, 0.25);
        }
        .kg-viz-zoom {
          position: absolute;
          bottom: 0.75rem;
          right: 0.75rem;
          z-index: 5;
          font-size: 0.75rem;
          color: rgba(170, 187, 204, 0.9);
          background: rgba(10, 15, 25, 0.8);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          border: 1px solid rgba(0, 212, 255, 0.15);
        }
        .kg-viz-legend {
          position: absolute;
          bottom: 0.75rem;
          left: 0.75rem;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 0.5rem 1rem;
          font-size: 0.7rem;
          color: rgba(170, 187, 204, 0.9);
        }
        .kg-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .kg-viz-detail {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          z-index: 15;
          min-width: 220px;
          background: rgba(10, 15, 25, 0.95);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 10px;
          padding: 1rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 0 24px rgba(0, 212, 255, 0.15);
        }
        .kg-viz-detail-close {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: none;
          border: none;
          color: #8899aa;
          cursor: pointer;
          padding: 0.25rem;
        }
        .kg-viz-detail-close:hover { color: #00d4ff; }
        .kg-viz-detail-title {
          font-weight: 600;
          color: #00d4ff;
          margin-bottom: 0.75rem;
          padding-right: 1.5rem;
        }
        .kg-viz-detail-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.35rem;
        }
        .kg-viz-detail-row span:last-child { color: #c0c8d0; }
        .kg-viz-risk[data-level="low"] { color: #00ff88; }
        .kg-viz-risk[data-level="medium"] { color: #ffaa00; }
        .kg-viz-risk[data-level="high"] { color: #ff4466; }
      `}</style>
    </div>
  );
}
