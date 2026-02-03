import { useState, useEffect } from 'react';
import { ListChecks, Plus, Play, Loader2, AlertCircle, Trash2, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { scenariosAPI, cityAPI } from '../services/api';

export default function ScenarioBank() {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cityId, setCityId] = useState(null);
  const [runLoading, setRunLoading] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInput, setNewInput] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [newCityId, setNewCityId] = useState('');

  useEffect(() => {
    cityAPI.getCurrentCity()
      .then((r) => setCityId(r.data?.city_id || null))
      .catch(() => setCityId(null));
  }, []);
  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = () => {
    setLoading(true);
    setError(null);
    scenariosAPI.list()
      .then((r) => setScenarios(r.data?.scenarios || []))
      .catch((e) => {
        setError(e.response?.data?.detail || e.message || 'Failed to load scenarios');
        setScenarios([]);
      })
      .finally(() => setLoading(false));
  };

  const runOne = (id) => {
    setRunLoading(id);
    setError(null);
    scenariosAPI.run(id, cityId || undefined)
      .then(() => loadScenarios())
      .catch((e) => setError(e.response?.data?.detail || e.message || 'Run failed'))
      .finally(() => setRunLoading(null));
  };

  const runAll = () => {
    setBatchLoading(true);
    setError(null);
    setBatchResult(null);
    scenariosAPI.runBatch({ city_id: cityId || undefined })
      .then((r) => setBatchResult(r.data))
      .catch((e) => setError(e.response?.data?.detail || e.message || 'Batch run failed'))
      .finally(() => {
        setBatchLoading(false);
        loadScenarios();
      });
  };

  const addScenario = () => {
    const name = newName.trim();
    const input_message = newInput.trim();
    if (!name || !input_message) {
      setError('Name and input message are required.');
      return;
    }
    setError(null);
    scenariosAPI.create({
      name,
      description: newDescription.trim() || undefined,
      input_message,
      city_id: newCityId.trim() || undefined,
      expected_outcome: (() => {
        const t = newExpected.trim();
        if (!t) return undefined;
        if (t.startsWith('{')) {
          try { return JSON.parse(t); } catch { return t; }
        }
        return t;
      })(),
    })
      .then(() => {
        setShowAdd(false);
        setNewName('');
        setNewDescription('');
        setNewInput('');
        setNewExpected('');
        setNewCityId('');
        loadScenarios();
      })
      .catch((e) => setError(e.response?.data?.detail || e.message || 'Create failed'));
  };

  const deleteScenario = (id) => {
    if (!window.confirm('Delete this scenario?')) return;
    setError(null);
    scenariosAPI.delete(id)
      .then(() => loadScenarios())
      .catch((e) => setError(e.response?.data?.detail || e.message || 'Delete failed'));
  };

  const outcomeIcon = (outcome) => {
    if (outcome === 'pass') return <CheckCircle size={18} className="outcome-pass" />;
    if (outcome === 'fail') return <XCircle size={18} className="outcome-fail" />;
    return <HelpCircle size={18} className="outcome-unknown" />;
  };

  return (
    <div className="scenario-bank-page">
      <header className="scenario-bank-header">
        <ListChecks size={24} />
        <h1>Scenario Bank</h1>
        <p>Curated scenarios for regression testing. Run one or run all and see pass/fail (Phase 3a).</p>
      </header>

      {cityId && (
        <p className="scenario-bank-city">Running with city: <strong>{cityId}</strong></p>
      )}

      {error && (
        <div className="scenario-bank-error" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="scenario-bank-toolbar">
        <button
          type="button"
          className="scenario-bank-btn primary"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={18} /> Add scenario
        </button>
        <button
          type="button"
          className="scenario-bank-btn"
          onClick={runAll}
          disabled={batchLoading || scenarios.length === 0}
        >
          {batchLoading ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
          Run all
        </button>
      </div>

      {batchResult && (
        <div className="scenario-bank-batch-summary">
          <h3>Batch result</h3>
          <p>Pass: <strong className="outcome-pass">{batchResult.summary?.pass ?? 0}</strong> · Fail: <strong className="outcome-fail">{batchResult.summary?.fail ?? 0}</strong> · Unknown: <strong className="outcome-unknown">{batchResult.summary?.unknown ?? 0}</strong></p>
          <ul>
            {(batchResult.results || []).map((r, i) => (
              <li key={i}>
                {outcomeIcon(r.outcome)} {r.scenario_name} — {r.outcome}
                {r.evaluation_notes && ` (${r.evaluation_notes})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAdd && (
        <div className="scenario-bank-form">
          <h3>New scenario</h3>
          <label>Name <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Power outage" /></label>
          <label>Description <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Optional" /></label>
          <label>Input message (sent to agent) <input type="text" value={newInput} onChange={(e) => setNewInput(e.target.value)} placeholder="e.g. I have no power" /></label>
          <label>Expected outcome (optional): text to look for in reply, or JSON e.g. {`{"contains": "outage", "has_actions": true}`} <input type="text" value={newExpected} onChange={(e) => setNewExpected(e.target.value)} placeholder="e.g. outage or {\"has_actions\": true}" /></label>
          <label>City ID (optional) <input type="text" value={newCityId} onChange={(e) => setNewCityId(e.target.value)} placeholder="e.g. nyc" /></label>
          <div className="scenario-bank-form-actions">
            <button type="button" className="scenario-bank-btn primary" onClick={addScenario}>Create</button>
            <button type="button" className="scenario-bank-btn" onClick={() => { setShowAdd(false); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="scenario-bank-loading"><Loader2 size={20} className="spin" /> Loading scenarios…</p>
      ) : scenarios.length === 0 ? (
        <p className="scenario-bank-empty">No scenarios yet. Add one to run against the agent and record pass/fail.</p>
      ) : (
        <ul className="scenario-bank-list">
          {scenarios.map((s) => (
            <li key={s.id} className="scenario-bank-item">
              <div className="scenario-bank-item-main">
                <span className="scenario-bank-item-name">{s.name}</span>
                {s.last_run_outcome != null && (
                  <span className="scenario-bank-item-outcome">
                    {outcomeIcon(s.last_run_outcome)} {s.last_run_outcome}
                    {s.last_run_at && ` · ${new Date(s.last_run_at).toLocaleString()}`}
                  </span>
                )}
              </div>
              <p className="scenario-bank-item-input">“{s.input_message}”</p>
              {s.expected_outcome != null && (
                <p className="scenario-bank-item-expected">Expected: {typeof s.expected_outcome === 'string' ? s.expected_outcome : JSON.stringify(s.expected_outcome)}</p>
              )}
              <div className="scenario-bank-item-actions">
                <button
                  type="button"
                  className="scenario-bank-btn small"
                  onClick={() => runOne(s.id)}
                  disabled={runLoading !== null}
                >
                  {runLoading === s.id ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
                  Run
                </button>
                <button
                  type="button"
                  className="scenario-bank-btn small danger"
                  onClick={() => deleteScenario(s.id)}
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .scenario-bank-page { padding: 1rem; max-width: 900px; margin: 0 auto; }
        .scenario-bank-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .scenario-bank-header h1 { margin: 0; font-size: 1.5rem; }
        .scenario-bank-header p { margin: 0.25rem 0 0 0; color: var(--text-secondary, #888); font-size: 0.9rem; width: 100%; }
        .scenario-bank-city { margin: 0 0 0.75rem; font-size: 0.9rem; color: var(--text-secondary); }
        .scenario-bank-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: rgba(239,68,68,0.15); border: 1px solid #ef4444; border-radius: 8px; margin-bottom: 1rem; color: #fca5a5; }
        .scenario-bank-toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .scenario-bank-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.75rem; background: var(--bg-secondary, #1a1a2e); border: 1px solid var(--border-color, #333); color: var(--text-primary); border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
        .scenario-bank-btn:hover:not(:disabled) { background: var(--bg-tertiary, #252540); border-color: var(--accent, #6366f1); }
        .scenario-bank-btn.primary { background: var(--accent, #6366f1); border-color: var(--accent); color: #fff; }
        .scenario-bank-btn.small { padding: 0.35rem 0.5rem; font-size: 0.8rem; }
        .scenario-bank-btn.danger { color: #f87171; }
        .scenario-bank-btn.danger:hover:not(:disabled) { border-color: #ef4444; }
        .scenario-bank-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .scenario-bank-batch-summary { padding: 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; }
        .scenario-bank-batch-summary h3 { margin: 0 0 0.5rem; font-size: 1rem; }
        .scenario-bank-batch-summary ul { margin: 0.5rem 0 0; padding-left: 1.25rem; font-size: 0.9rem; }
        .outcome-pass { color: #22c55e; }
        .outcome-fail { color: #ef4444; }
        .outcome-unknown { color: #94a3b8; }
        .scenario-bank-form { padding: 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; }
        .scenario-bank-form h3 { margin: 0 0 0.75rem; }
        .scenario-bank-form label { display: block; margin-bottom: 0.5rem; font-size: 0.85rem; }
        .scenario-bank-form input { width: 100%; max-width: 480px; padding: 0.4rem; margin-top: 0.2rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); }
        .scenario-bank-form-actions { margin-top: 0.75rem; display: flex; gap: 0.5rem; }
        .scenario-bank-loading, .scenario-bank-empty { color: var(--text-secondary); padding: 1rem 0; }
        .scenario-bank-list { list-style: none; margin: 0; padding: 0; }
        .scenario-bank-item { padding: 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.75rem; }
        .scenario-bank-item-main { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .scenario-bank-item-name { font-weight: 600; }
        .scenario-bank-item-outcome { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; }
        .scenario-bank-item-input { margin: 0.35rem 0 0; font-size: 0.9rem; color: var(--text-secondary); }
        .scenario-bank-item-expected { margin: 0.25rem 0 0; font-size: 0.8rem; color: var(--text-secondary); }
        .scenario-bank-item-actions { margin-top: 0.5rem; display: flex; gap: 0.5rem; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
