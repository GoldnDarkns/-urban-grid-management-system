import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Loader, CheckCircle2, Zap, Database, Brain, Wind, Activity,
  BarChart3, ArrowRight, Cloud, AlertCircle, Building2
} from 'lucide-react';
import { cityAPI } from '../services/api';

/** Fallback when /api/city/list fails (e.g. 504). Matches backend CityConfig. */
const FALLBACK_CITIES = [
  { id: 'nyc', name: 'New York City', state: 'NY', country: 'USA', population: 8336817 },
  { id: 'chicago', name: 'Chicago', state: 'IL', country: 'USA', population: 2693976 },
  { id: 'la', name: 'Los Angeles', state: 'CA', country: 'USA', population: 3898747 },
  { id: 'sf', name: 'San Francisco', state: 'CA', country: 'USA', population: 873965 },
  { id: 'houston', name: 'Houston', state: 'TX', country: 'USA', population: 2320268 },
  { id: 'phoenix', name: 'Phoenix', state: 'AZ', country: 'USA', population: 1680992 },
];

const STEP_LABELS = {
  selecting: 'Selecting city and configuring 20 zones...',
  processing: 'Fetching live APIs & running ML models (TFT, Autoencoder, GNN, ARIMA, Prophet)...',
  eia: 'Processing EIA energy data...',
  complete: 'Processing complete',
};

export default function CitySelect() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [zonesDone, setZonesDone] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await cityAPI.listCities();
        setCities(res.data.cities || []);
        setError(null);
      } catch (e) {
        setError(e.response?.status === 504 ? 'Backend took too long (504). Using fallback list — try selecting a city.' : 'Could not load cities');
        setCities(FALLBACK_CITIES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = async (cityId) => {
    setError(null);
    setProcessing(true);
    setStep('selecting');
    setZonesDone(0);

    try {
      const selectRes = await cityAPI.selectCity(cityId);
      const data = selectRes.data;

      if (data && data.success === false) {
        setError(data.error || 'City selection failed');
        setProcessing(false);
        return;
      }

      setSelectedCity({ city_id: data.city_id, name: data.name });
      setStep('processing');

      const processRes = await cityAPI.processAllZones(cityId);
      const sum = processRes.data?.summary || {};
      setZonesDone(sum.successful ?? 0);
      setSummary(prev => ({ ...prev, zones: sum }));

      setStep('eia');
      await cityAPI.processEIA(cityId).catch(() => {});

      setSummary(prev => ({
        ...prev,
        zones: processRes.data?.summary || prev?.zones,
        city_name: data.name,
        city_id: data.city_id,
      }));
      setStep('complete');
      try {
        window.dispatchEvent(new CustomEvent('ugms-city-changed', { detail: { city_id: data.city_id, name: data.name } }));
        window.dispatchEvent(new CustomEvent('ugms-city-processed', { detail: { city_id: data.city_id, summary: processRes.data?.summary } }));
      } catch (_) {}
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Processing failed');
      setStep(null);
    } finally {
      setProcessing(false);
    }
  };

  const enterDashboard = () => {
    if (selectedCity?.city_id) {
      sessionStorage.setItem('city_selected', selectedCity.city_id);
      try { localStorage.setItem('selected_city_id', selectedCity.city_id); } catch (_) {}
      navigate('/', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="city-select-page">
        <div className="city-select-hero">
          <h1>Urban Grid Management</h1>
          <p>Loading cities...</p>
          <Loader size={32} className="spinning" />
        </div>
      </div>
    );
  }

  return (
    <div className="city-select-page">
      <div className="city-select-inner">
        <motion.div
          className="city-select-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>Urban Grid Management</h1>
          <p className="subtitle">
            Choose a city first. We will fetch live data (Weather, AQI, Traffic, EIA, Census),
            run TFT (primary), Autoencoder, GNN, ARIMA, Prophet, and then the full dashboard
            will show analysis for that city.
          </p>
        </motion.div>

        {error && (
          <motion.div
            className="city-select-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}

        {!processing && !summary && (
          <motion.div
            className="city-select-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {cities.map((c) => (
              <motion.button
                key={c.id}
                className="city-card"
                onClick={() => handleSelect(c.id)}
                disabled={processing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MapPin size={24} />
                <span className="city-card-name">{c.name}</span>
                <span className="city-card-meta">{c.state}, {c.country} • {c.population?.toLocaleString?.() || '—'} people</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        <AnimatePresence>
          {processing && (
            <motion.div
              className="city-select-progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h3>Processing {selectedCity?.name || '…'}</h3>
              <div className="progress-steps">
                {['selecting', 'processing', 'eia', 'complete'].map((s) => (
                  <div
                    key={s}
                    className={`progress-step ${step === s ? 'active' : ''} ${['complete', 'eia'].includes(step) && ['selecting', 'processing'].includes(s) ? 'done' : ''}`}
                  >
                    {step === s && s !== 'complete' ? <Loader size={18} className="spinning" /> : <CheckCircle2 size={18} />}
                    <span>{STEP_LABELS[s]}</span>
                    {s === 'processing' && step === 'processing' && zonesDone > 0 && (
                      <span className="zones-done"> ({zonesDone} zones)</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!processing && summary && step === 'complete' && (
            <motion.div
              className="city-select-done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h3>What we processed</h3>
              <div className="processed-summary">
                <div className="ps-row">
                  <Database size={20} />
                  <span><strong>{summary.zones?.successful ?? 0}</strong> zones: live APIs (Weather, AQI, Traffic, Population, EIA)</span>
                </div>
                <div className="ps-row">
                  <Brain size={20} />
                  <span>ML: <strong>TFT</strong> demand forecast (LSTM comparison), <strong>Autoencoder</strong> anomalies, <strong>GNN</strong> risk, <strong>ARIMA</strong> & <strong>Prophet</strong> forecasts</span>
                </div>
                <div className="ps-row">
                  <BarChart3 size={20} />
                  <span>Data stored in MongoDB; used across Home, Data, Analytics, Advanced Analytics, AI Recommendations</span>
                </div>
              </div>
              <p className="where-see">You can see results on: <strong>Home</strong>, <strong>Data</strong>, <strong>Analytics</strong>, <strong>Advanced Analytics</strong>, and <strong>AI Recs</strong>.</p>
              <button className="btn-enter" onClick={enterDashboard}>
                Enter Dashboard
                <ArrowRight size={20} />
              </button>
              <button
                type="button"
                className="btn-change"
                onClick={() => { setSummary(null); setStep(null); setSelectedCity(null); }}
              >
                Choose a different city
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .city-select-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          z-index: 2;
        }
        .city-select-inner { max-width: 720px; width: 100%; }
        .city-select-hero {
          text-align: center;
          margin-bottom: 2rem;
        }
        .city-select-hero h1 {
          font-size: 1.75rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        .city-select-hero .subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .city-select-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255,80,80,0.15);
          border: 1px solid rgba(255,80,80,0.4);
          border-radius: 8px;
          color: #ff6b6b;
          margin-bottom: 1rem;
        }
        .city-select-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .city-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.25rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .city-card:hover { border-color: var(--primary); box-shadow: 0 0 20px rgba(0,255,136,0.15); }
        .city-card-name { font-weight: 600; font-size: 1.05rem; }
        .city-card-meta { font-size: 0.8rem; color: var(--text-secondary); }
        .city-select-progress {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
        }
        .city-select-progress h3 { margin-bottom: 1rem; color: var(--text-primary); }
        .progress-steps { display: flex; flex-direction: column; gap: 0.75rem; }
        .progress-step {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .progress-step.active { color: var(--primary); }
        .progress-step.done { color: var(--text-secondary); opacity: 0.8; }
        .progress-step .zones-done { color: var(--primary); }
        .city-select-done {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
        }
        .city-select-done h3 { margin-bottom: 1rem; color: var(--text-primary); }
        .processed-summary { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
        .ps-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .ps-row svg { flex-shrink: 0; color: var(--primary); }
        .where-see { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; }
        .btn-enter {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--primary);
          color: #000;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          margin-right: 0.75rem;
        }
        .btn-enter:hover { filter: brightness(1.1); }
        .btn-change {
          padding: 0.5rem 1rem;
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .btn-change:hover { border-color: var(--primary); color: var(--primary); }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
