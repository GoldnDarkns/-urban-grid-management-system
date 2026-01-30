import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Radio,
  RefreshCw,
  Cloud,
  Car,
  Zap,
  AlertTriangle,
  FileText,
  Clock,
  Info,
  Activity,
} from 'lucide-react';
import { liveStreamAPI } from '../services/api';

const POLL_MS = 45000;
const TOPIC_CONFIG = {
  aqi_stream: { label: 'AQI', icon: Cloud, color: 'var(--accent-secondary)' },
  traffic_events: { label: 'Traffic', icon: Car, color: 'var(--accent-primary)' },
  power_demand: { label: 'Power', icon: Zap, color: 'var(--accent-warning)' },
  grid_alerts: { label: 'Grid Alerts', icon: AlertTriangle, color: 'var(--accent-danger)' },
  incident_text: { label: 'Incidents', icon: FileText, color: 'var(--accent-purple)' },
};

function formatAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function PayloadPreview({ payload, topic }) {
  if (!payload || typeof payload !== 'object') return <span className="muted">—</span>;
  const p = payload;
  if (topic === 'aqi_stream') {
    const aqi = p.aqi ?? p.pm25 ?? '—';
    return <><span className="value">{aqi}</span> AQI {p.zone_id && <span className="muted">({p.zone_id})</span>}</>;
  }
  if (topic === 'traffic_events') {
    const speed = p.current_speed ?? p.currentSpeed ?? '—';
    return <><span className="value">{speed}</span> km/h {p.zone_id && <span className="muted">({p.zone_id})</span>}</>;
  }
  if (topic === 'power_demand') {
    const kwh = p.kwh ?? p.total_kwh ?? p.demand ?? p.value;
    const state = p.state ?? p.region;
    if (kwh != null) return <><span className="value">{Number(kwh).toLocaleString()}</span> kWh {p.zone_id && <span className="muted">({p.zone_id})</span>}</>;
    return <><span className="muted">EIA</span> {state && <span className="value">{state}</span>}</>;
  }
  if (topic === 'incident_text') {
    const raw = p.raw || {};
    const desc = typeof raw === 'object' ? (raw.description || raw.complaint_type || raw.category || '—') : String(raw).slice(0, 80);
    return <span className="preview" title={typeof raw === 'object' ? JSON.stringify(raw).slice(0, 200) : ''}>{String(desc).slice(0, 60)}{String(desc).length > 60 ? '…' : ''}</span>;
  }
  if (topic === 'grid_alerts') {
    const al = p.alerts || [];
    if (al.length) {
      const first = al[0];
      const level = first?.level ?? first?.severity ?? 'alert';
      const msg = first?.message ?? first?.description ?? first?.type ?? `${al.length} alert(s)`;
      return <span className="value" title={msg}>{level}: {String(msg).slice(0, 40)}{String(msg).length > 40 ? '…' : ''}</span>;
    }
    return <span className="muted">heartbeat</span>;
  }
  return <span className="muted">—</span>;
}

export default function LiveStream() {
  const [data, setData] = useState({ ok: false, by_topic: {}, last_updated: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStream = useCallback(async (showLoading = true) => {
    try {
      setError(null);
      if (showLoading) setLoading(true);
      const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('Request timed out')), ms));
      const res = await Promise.race([liveStreamAPI.getLiveStream(80), timeout(15000)]);
      setData(res.data || { ok: false, by_topic: {}, last_updated: null });
    } catch (e) {
      setError(e?.message || 'Failed to load live stream');
      setData({ ok: false, by_topic: {}, last_updated: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStream(true);
  }, [fetchStream]);

  useEffect(() => {
    const t = setInterval(() => fetchStream(false), POLL_MS);
    return () => clearInterval(t);
  }, [fetchStream]);

  const lastUpdated = data?.last_updated;

  return (
    <div className="live-stream-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>
          <Radio size={28} />
          Live Stream
        </h1>
        <p>
          Kafka → Consumer → MongoDB. Data updates every ~45s. This tab auto-refreshes so you see the latest stream.
        </p>
        <div className="header-actions">
          <span className="live-badge">
            <span className="pulse" />
            LIVE
          </span>
          <span className="last-updated">
            <Clock size={14} />
            Last updated {formatAgo(lastUpdated)}
          </span>
          <button className="btn btn-secondary" onClick={() => fetchStream(true)}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="live-stream-error">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={() => fetchStream()}>Retry</button>
        </div>
      )}

      {/* Summary strip: total events and per-topic counts */}
      {!loading && data?.ok && Object.keys(data?.by_topic || {}).length > 0 && (
        <div className="live-stream-summary">
          <Activity size={18} />
          <span className="summary-total">
            {Object.values(data.by_topic).reduce((n, arr) => n + (arr?.length || 0), 0)} events total
          </span>
          <span className="summary-divider">·</span>
          {Object.entries(TOPIC_CONFIG).map(([topic, cfg]) => {
            const count = (data.by_topic[topic] || []).length;
            return (
              <span key={topic} className="summary-topic" style={{ color: cfg.color }}>
                {cfg.label} {count}
              </span>
            );
          })}
        </div>
      )}

      {/* About this stream */}
      <div className="live-stream-about">
        <Info size={16} />
        <div>
          <strong>Data flow:</strong> Kafka producer writes AQI, traffic, power (EIA), grid alerts, and incidents into topics; the consumer writes them into MongoDB (<code>kafka_live_feed</code>). This page shows the latest records per topic. <strong>Power</strong> = demand/kWh when available; <strong>Grid Alerts</strong> = heartbeat or alert details; <strong>Incidents</strong> = 311-style or incident text. Refresh or wait ~45s for new data.
        </div>
      </div>

      {loading && Object.keys(data?.by_topic || {}).length === 0 && !error ? (
        <div className="live-stream-loading">
          <div className="spinner" />
          <p>Loading live stream…</p>
          <p className="loading-hint">Fetching Kafka consumer data. Updates every ~45s. If no producers are running, you&apos;ll see &quot;No recent messages&quot; per topic.</p>
        </div>
      ) : (
        <div className="live-stream-grid">
          {Object.entries(TOPIC_CONFIG).map(([topic, cfg]) => {
            const records = (data?.by_topic || {})[topic] || [];
            const Icon = cfg.icon;
            return (
              <motion.section
                key={topic}
                className="live-stream-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * Object.keys(TOPIC_CONFIG).indexOf(topic) }}
              >
                <h3 style={{ color: cfg.color }}>
                  <Icon size={18} />
                  {cfg.label}
                  <span className="card-count">{records.length} event{records.length !== 1 ? 's' : ''}</span>
                </h3>
                <div className="live-feed">
                  {records.length === 0 ? (
                    <div className="muted">No recent messages</div>
                  ) : (
                    records.slice(0, 12).map((r, i) => (
                      <div key={i} className="feed-row">
                        <span className="ts">{formatAgo(r.ingested_at)}</span>
                        <PayloadPreview payload={r.payload} topic={topic} />
                      </div>
                    ))
                  )}
                </div>
              </motion.section>
            );
          })}
        </div>
      )}

      <style>{`
        .live-stream-page .header-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem; }
        .live-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 700; color: var(--accent-primary); }
        .live-badge .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-primary); animation: live-pulse 1.2s ease-in-out infinite; }
        @keyframes live-pulse { 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:0.5; transform:scale(1.2); } }
        .last-updated { font-size: 0.85rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.25rem; }
        .live-stream-error { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; background: rgba(255,68,102,0.15); border: 1px solid var(--accent-danger); color: var(--accent-danger); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .live-stream-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 280px; gap: 0.75rem; color: var(--text-secondary); }
        .live-stream-loading .loading-hint { font-size: 0.85rem; max-width: 400px; text-align: center; opacity: 0.85; }
        .live-stream-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
        .live-stream-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; }
        .live-stream-card h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 1rem; flex-wrap: wrap; }
        .live-stream-card .card-count { margin-left: auto; font-size: 0.75rem; font-weight: 500; color: var(--text-muted); }
        .live-stream-summary { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem 1rem; margin-bottom: 1rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; font-size: 0.9rem; }
        .live-stream-summary .summary-total { font-weight: 600; color: var(--accent-primary); }
        .live-stream-summary .summary-divider { color: var(--text-muted); }
        .live-stream-summary .summary-topic { font-weight: 500; }
        .live-stream-about { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; margin-bottom: 1rem; background: rgba(0, 212, 255, 0.06); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 10px; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; }
        .live-stream-about svg { flex-shrink: 0; color: var(--accent-secondary); margin-top: 0.2rem; }
        .live-stream-about code { background: rgba(0,0,0,0.2); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.8rem; }
        .live-feed { font-size: 0.85rem; max-height: 220px; overflow-y: auto; }
        .feed-row { display: flex; align-items: baseline; gap: 0.5rem; padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .feed-row .ts { color: var(--text-muted); min-width: 4rem; }
        .feed-row .value { color: var(--accent-primary); font-weight: 600; }
        .feed-row .muted { color: var(--text-muted); }
        .feed-row .preview { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
      `}</style>
    </div>
  );
}
