import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Zap, Activity, Wind, AlertTriangle, RefreshCw,
  Info, Loader2
} from 'lucide-react';
import { cityAPI } from '../services/api';
import { useAppMode } from '../utils/useAppMode';

export default function Cost() {
  const { mode } = useAppMode();
  const [loading, setLoading] = useState(true);
  const [currentCityId, setCurrentCityId] = useState(null);
  const [cityName, setCityName] = useState('');
  const [costs, setCosts] = useState({
    energy_usd: 0,
    co2_usd: 0,
    aqi_usd: 0,
    incident_usd: 0,
    total_usd: 0,
    price_per_kwh: 0,
    total_kwh: 0,
    incident_count: 0,
    source: 'default'
  });

  useEffect(() => {
    if (mode === 'city') {
      cityAPI.getCurrentCity()
        .then((r) => {
          setCurrentCityId(r.data?.city_id || null);
          setCityName(r.data?.name || r.data?.city_id || '');
        })
        .catch(() => {
          setCurrentCityId(null);
          setCityName('');
        });
    } else {
      setCurrentCityId(null);
      setCityName('');
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'city') return;
    const onCityChanged = () => {
      cityAPI.getCurrentCity()
        .then((r) => {
          setCurrentCityId(r.data?.city_id || null);
          setCityName(r.data?.name || r.data?.city_id || '');
        })
        .catch(() => {
          setCurrentCityId(null);
          setCityName('');
        });
    };
    window.addEventListener('ugms-city-changed', onCityChanged);
    window.addEventListener('ugms-city-processed', onCityChanged);
    return () => {
      window.removeEventListener('ugms-city-changed', onCityChanged);
      window.removeEventListener('ugms-city-processed', onCityChanged);
    };
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    const fetchCosts = async () => {
      if (mode !== 'city' || !currentCityId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await cityAPI.getCosts(currentCityId);
        if (cancelled) return;
        const d = res?.data || {};
        setCosts({
          energy_usd: d.energy_usd ?? 0,
          co2_usd: d.co2_usd ?? 0,
          aqi_usd: d.aqi_usd ?? 0,
          incident_usd: d.incident_usd ?? 0,
          total_usd: d.total_usd ?? 0,
          price_per_kwh: d.price_per_kwh ?? 0,
          total_kwh: d.total_kwh ?? 0,
          incident_count: d.incident_count ?? 0,
          source: d.source ?? 'default'
        });
      } catch (e) {
        if (!cancelled) setCosts((prev) => ({ ...prev, total_usd: 0 }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCosts();
    const interval = setInterval(fetchCosts, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mode, currentCityId]);

  if (mode !== 'city') {
    return (
      <div className="cost-page container page">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1><DollarSign size={32} /> Cost & Economics</h1>
          <p>City-level cost estimates (energy, CO₂, AQI, 311 incidents)</p>
        </motion.div>
        <motion.div
          className="cost-sim-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Info size={24} />
          <p>Costs are available only in <strong>City Live</strong> mode. Switch to City Live and select a city to view energy, CO₂, AQI, and incident cost estimates.</p>
        </motion.div>
      </div>
    );
  }

  if (!currentCityId) {
    return (
      <div className="cost-page container page">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1><DollarSign size={32} /> Cost & Economics</h1>
          <p>City-level cost estimates for the selected city</p>
        </motion.div>
        <motion.div
          className="cost-sim-message cost-select-city"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Info size={24} />
          <div>
            <p>Select a city to view cost breakdown (energy, CO₂, AQI, 311 incidents).</p>
            <p className="cost-cta">Use the city dropdown in the navigation bar, or click below to open city selection.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.dispatchEvent(new CustomEvent('ugms-open-city-selector'))}
            >
              Open city selection
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const cards = [
    {
      key: 'energy',
      icon: Zap,
      label: 'Forecast Energy Cost',
      value: `$${(costs.energy_usd ?? 0).toFixed(2)}`,
      sub: costs.total_kwh != null ? `${costs.total_kwh.toLocaleString()} kWh @ $${(costs.price_per_kwh ?? 0).toFixed(4)}/kWh` : null,
      desc: 'Estimated cost from ML demand forecast × EIA retail electricity price.'
    },
    {
      key: 'co2',
      icon: Activity,
      label: 'CO₂ Cost (est.)',
      value: `$${(costs.co2_usd ?? 0).toFixed(2)}`,
      sub: null,
      desc: 'Carbon cost from forecast consumption × kg CO₂/kWh × carbon price.'
    },
    {
      key: 'aqi',
      icon: Wind,
      label: 'AQI Cost (est.)',
      value: `$${(costs.aqi_usd ?? 0).toFixed(2)}`,
      sub: null,
      desc: 'Health/externality proxy: $ per AQI point above 50, summed over zones.'
    },
    {
      key: 'incident',
      icon: AlertTriangle,
      label: '311 Incident Cost (est.)',
      value: `$${(costs.incident_usd ?? 0).toFixed(2)}`,
      sub: costs.incident_count != null ? `${costs.incident_count} requests × $50/request` : null,
      desc: 'Estimated response/admin cost: recent 311 requests × cost per incident.'
    }
  ];

  return (
    <div className="cost-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1><DollarSign size={32} /> Cost & Economics</h1>
          <p>
            {cityName ? `Cost breakdown for ${cityName}` : `Cost breakdown for ${currentCityId}`} — Energy, CO₂, AQI, 311 incidents
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          {loading ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
          Refresh
        </button>
      </motion.div>

      {/* Total */}
      <motion.div
        className="cost-total-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="cost-total-label">Total Estimated Cost</div>
        <div className="cost-total-value">
          {loading ? <Loader2 size={28} className="spin" /> : `$${(costs.total_usd ?? 0).toFixed(2)}`}
        </div>
        {costs.source === 'eia' && (
          <div className="cost-total-note">Electricity price from EIA; other factors from config.</div>
        )}
      </motion.div>

      {/* Metric cards */}
      <div className="cost-cards-grid">
        {cards.map((c, i) => (
          <motion.div
            key={c.key}
            className="cost-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <div className="cost-card-header">
              <c.icon size={22} className={`cost-icon ${c.key}`} />
              <span className="cost-card-label">{c.label}</span>
            </div>
            <div className="cost-card-value">{loading ? '—' : c.value}</div>
            {c.sub && <div className="cost-card-sub">{c.sub}</div>}
            <p className="cost-card-desc">{c.desc}</p>
          </motion.div>
        ))}
      </div>

      <style>{`
        .cost-page .page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .cost-page .header-content h1 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.25rem 0; font-size: 1.5rem; }
        .cost-page .header-content p { margin: 0; color: var(--text-secondary); font-size: 0.95rem; }
        .cost-sim-message {
          display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem;
          background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.25); border-radius: 12px;
          color: var(--text-secondary);
        }
        .cost-sim-message svg { flex-shrink: 0; color: var(--accent-primary); }
        .cost-select-city .cost-cta { margin: 0.5rem 0 1rem 0; font-size: 0.9rem; }
        .cost-select-city .btn { margin-top: 0.5rem; }
        .cost-total-card {
          background: linear-gradient(135deg, rgba(0,255,136,0.12) 0%, rgba(0,212,255,0.08) 100%);
          border: 1px solid rgba(0,255,136,0.3); border-radius: 12px;
          padding: 1.5rem 2rem; margin-bottom: 1.5rem; text-align: center;
        }
        .cost-total-label { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
        .cost-total-value { font-size: 2rem; font-weight: 700; color: #00ff88; }
        .cost-total-note { font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem; }
        .cost-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
        .cost-card {
          background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px;
          padding: 1.25rem;
        }
        .cost-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .cost-icon.energy { color: #00ff88; }
        .cost-icon.co2 { color: #00d4ff; }
        .cost-icon.aqi { color: #00d4ff; }
        .cost-icon.incident { color: #ffaa00; }
        .cost-card-label { font-size: 0.9rem; color: var(--text-secondary); }
        .cost-card-value { font-size: 1.4rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; }
        .cost-card-sub { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
        .cost-card-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.35; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
