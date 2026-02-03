import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2, AlertCircle, MapPin, FileText, Zap, ChevronDown, ChevronUp, History, Mic, MicOff, Type } from 'lucide-react';
import { agentAPI, cityAPI, voiceAPI } from '../services/api';

export default function ScenarioConsole() {
  const [sessionId, setSessionId] = useState(null);
  const [cityId, setCityId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clarifyingCount, setClarifyingCount] = useState(0);
  const [traceOpen, setTraceOpen] = useState(false);
  const [lastTrace, setLastTrace] = useState([]);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  // Phase 2e: Run Log
  const [runLogOpen, setRunLogOpen] = useState(false);
  const [runsList, setRunsList] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  // Phase 4: Voice — Text vs Voice mode; optional TTS for reply
  const [interactionMode, setInteractionMode] = useState('text');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakReply, setSpeakReply] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Current city for starting session
  useEffect(() => {
    cityAPI.getCurrentCity()
      .then((r) => setCityId(r.data?.city_id || null))
      .catch(() => setCityId(null));
  }, []);
  useEffect(() => {
    const onCityChanged = () => {
      cityAPI.getCurrentCity()
        .then((r) => setCityId(r.data?.city_id || null))
        .catch(() => setCityId(null));
    };
    window.addEventListener('ugms-city-changed', onCityChanged);
    window.addEventListener('ugms-city-processed', onCityChanged);
    return () => {
      window.removeEventListener('ugms-city-changed', onCityChanged);
      window.removeEventListener('ugms-city-processed', onCityChanged);
    };
  }, []);

  // Phase 4: Check if voice (Deepgram) is available
  useEffect(() => {
    voiceAPI.config()
      .then((r) => setVoiceEnabled(r.data?.enabled === true))
      .catch(() => setVoiceEnabled(false));
  }, []);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

  const startSession = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await agentAPI.start({ city_id: cityId || undefined });
      const data = res.data || res;
      setSessionId(data.session_id);
      setCityId(data.city_id || cityId);
      setMessages([]);
      setScenarioResult(null);
      setClarifyingCount(0);
      setLastTrace([]);
      inputRef.current?.focus();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const sendMessageFromText = async (text, options = {}) => {
    const t = (text || '').trim();
    if (!t || loading) return;
    if (!sessionId) {
      setError('Start a session first.');
      return;
    }
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: t }]);
    setLoading(true);
    try {
      const res = await agentAPI.message({
        session_id: sessionId,
        message: t,
        city_id: cityId || undefined,
      });
      const data = res.data || res;
      const reply = data.assistant_reply || '';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setScenarioResult(data.scenario_result || null);
      setLastTrace(Array.isArray(data.trace) ? data.trace : []);
      if (data.scenario_result?.clarifying_question) {
        setClarifyingCount((c) => Math.min(3, c + 1));
      } else {
        setClarifyingCount(0);
      }
      if (options.speakReply && reply && voiceEnabled) {
        try {
          const audioRes = await voiceAPI.synthesize(reply);
          const blob = audioRes.data;
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          audio.play().catch(() => {});
        } catch (_) { /* TTS failed silently */ }
      }
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to send message');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const sendMessage = async () => {
    const text = (input || '').trim();
    if (!text) return;
    setInput('');
    await sendMessageFromText(text, { speakReply });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startRecording = async () => {
    if (!sessionId) {
      setError('Start a session first.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 500) {
          setError('Recording too short. Try again.');
          return;
        }
        setError(null);
        setLoading(true);
        try {
          const res = await voiceAPI.transcribe(blob);
          const transcript = (res.data?.transcript || '').trim();
          if (transcript) {
            await sendMessageFromText(transcript, { speakReply });
          } else {
            setError('No speech detected. Try again.');
          }
        } catch (e) {
          setError(e.response?.data?.detail || e.message || 'Transcription failed.');
        } finally {
          setLoading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setError(null);
    } catch (e) {
      setError('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const loadRunLog = async () => {
    if (!sessionId) return;
    setRunLogOpen(true);
    setRunsLoading(true);
    setSelectedRun(null);
    try {
      const res = await agentAPI.getRuns(sessionId);
      setRunsList(res.data?.runs || []);
    } catch (_) {
      setRunsList([]);
    } finally {
      setRunsLoading(false);
    }
  };

  const loadRunDetail = async (runId) => {
    try {
      const res = await agentAPI.getRun(runId);
      setSelectedRun(res.data);
    } catch (_) {
      setSelectedRun(null);
    }
  };

  const sr = scenarioResult || {};
  const hypotheses = sr.hypotheses || [];
  const evidenceIds = sr.evidence_ids || [];
  const recommendedActions = sr.recommended_actions || [];
  const affectedZones = sr.affected_zones || [];
  const grid = sr.grid || {};

  return (
    <div className="scenario-console-page">
      <header className="scenario-console-header">
        <MessageSquare size={24} />
        <h1>Scenario Console</h1>
        <p>Ask about outages, AQI, traffic, or failures. Domain AI uses city state and grounding data (max 3 clarifying questions). Interact by text or voice (Phase 4).</p>
      </header>

      <div className="scenario-console-layout">
        {/* Left: Chat */}
        <section className="scenario-chat-panel">
          <div className="scenario-chat-toolbar">
            {!sessionId ? (
              <button
                type="button"
                className="scenario-btn scenario-btn-primary"
                onClick={startSession}
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="spin" /> : 'Start session'}
              </button>
            ) : (
              <div className="scenario-session-info">
                <span>Session active</span>
                {cityId && <span className="scenario-city-badge">{cityId}</span>}
                {clarifyingCount > 0 && (
                  <span className="scenario-clarifying-badge">Clarifying: {clarifyingCount}/3</span>
                )}
                <button
                  type="button"
                  className="scenario-btn scenario-btn-secondary"
                  onClick={loadRunLog}
                  title="View Run Log (Phase 2e)"
                >
                  <History size={16} /> View Run Log
                </button>
              </div>
            )}
          </div>
          {error && (
            <div className="scenario-error" role="alert">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div className="scenario-chat-messages">
            {messages.length === 0 && sessionId && (
              <div className="scenario-chat-placeholder">
                Type a scenario or question (e.g. &quot;My area has no power&quot;, &quot;AQI spike in Z_001&quot;).
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`scenario-msg scenario-msg-${m.role}`}>
                <span className="scenario-msg-role">{m.role === 'user' ? 'You' : 'AI'}</span>
                <div className="scenario-msg-content">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="scenario-msg scenario-msg-assistant">
                <span className="scenario-msg-role">AI</span>
                <div className="scenario-msg-content"><Loader2 size={18} className="spin" /> Thinking…</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {sessionId && (
            <>
              {/* Phase 4: Text vs Voice mode + optional Speak reply */}
              <div className="scenario-input-mode-row">
                <div className="scenario-mode-toggle" role="group" aria-label="Input mode">
                  <button
                    type="button"
                    className={`scenario-mode-btn ${interactionMode === 'text' ? 'active' : ''}`}
                    onClick={() => setInteractionMode('text')}
                    aria-pressed={interactionMode === 'text'}
                  >
                    <Type size={16} /> Text
                  </button>
                  {voiceEnabled && (
                    <button
                      type="button"
                      className={`scenario-mode-btn ${interactionMode === 'voice' ? 'active' : ''}`}
                      onClick={() => setInteractionMode('voice')}
                      aria-pressed={interactionMode === 'voice'}
                    >
                      <Mic size={16} /> Voice
                    </button>
                  )}
                </div>
                {voiceEnabled && (
                  <label className="scenario-speak-reply">
                    <input
                      type="checkbox"
                      checked={speakReply}
                      onChange={(e) => setSpeakReply(e.target.checked)}
                    />
                    <span>Speak reply</span>
                  </label>
                )}
              </div>
              {interactionMode === 'text' && (
                <div className="scenario-chat-input-row">
                  <input
                    id="scenario-console-message"
                    name="scenario-message"
                    ref={inputRef}
                    type="text"
                    className="scenario-input"
                    placeholder="Message or scenario…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-label="Message or scenario"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="scenario-btn scenario-btn-send"
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    aria-label="Send"
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
              {interactionMode === 'voice' && voiceEnabled && (
                <div className="scenario-voice-input-row">
                  {!isRecording ? (
                    <button
                      type="button"
                      className="scenario-btn scenario-btn-voice"
                      onClick={startRecording}
                      disabled={loading}
                      aria-label="Start recording"
                    >
                      <Mic size={20} /> Hold to talk (click to start)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="scenario-btn scenario-btn-voice recording"
                      onClick={stopRecording}
                      aria-label="Stop recording"
                    >
                      <MicOff size={20} /> Recording… Click to stop
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Right: Scenario result */}
        <section className="scenario-result-panel">
          <h2>Scenario result</h2>
          {sr.message && <p className="scenario-result-message">{sr.message}</p>}
          {grid && (grid.zone_count != null || grid.high_risk_count != null) && (
            <div className="scenario-grid-summary">
              <span>Zones: {grid.zone_count ?? 0}</span>
              <span>High risk: {grid.high_risk_count ?? 0}</span>
              <span>Alerts: {grid.alert_count ?? 0}</span>
            </div>
          )}
          {affectedZones.length > 0 && (
            <div className="scenario-block">
              <h3><MapPin size={16} /> Affected zones</h3>
              <ul className="scenario-zones-list">
                {affectedZones.map((z, i) => (
                  <li key={i}>{z}</li>
                ))}
              </ul>
            </div>
          )}
          {hypotheses.length > 0 && (
            <div className="scenario-block">
              <h3><FileText size={16} /> Hypotheses</h3>
              <ul className="scenario-hypotheses-list">
                {hypotheses.map((h, i) => (
                  <li key={i}>
                    {h.summary}
                    {h.confidence != null && <span className="scenario-confidence"> (confidence: {h.confidence})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {evidenceIds.length > 0 && (
            <div className="scenario-block">
              <h3>Evidence IDs</h3>
              <ul className="scenario-evidence-list">
                {evidenceIds.slice(0, 10).map((id, i) => (
                  <li key={i}><code>{id}</code></li>
                ))}
                {evidenceIds.length > 10 && <li>… and {evidenceIds.length - 10} more</li>}
              </ul>
            </div>
          )}
          {recommendedActions.length > 0 && (
            <div className="scenario-block">
              <h3><Zap size={16} /> Recommended actions</h3>
              <ul className="scenario-actions-list">
                {recommendedActions.map((a, i) => (
                  <li key={i}>
                    <strong>{a.name}</strong> — {a.description}
                    {a.eta_minutes != null && <span> ETA: {a.eta_minutes} min</span>}
                    {a.cost_estimate != null && <span> Cost: {a.cost_estimate}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!scenarioResult && messages.length === 0 && (
            <p className="scenario-result-empty">Start a session and send a message to see the scenario result here.</p>
          )}
          {!scenarioResult && messages.length > 0 && !loading && (
            <p className="scenario-result-empty">No scenario result for this message. The AI may have returned only text (see chat). If you see 502 or timeout, check that the backend is running.</p>
          )}
          {lastTrace.length > 0 && (
            <div className="scenario-trace">
              <button
                type="button"
                className="scenario-trace-toggle"
                onClick={() => setTraceOpen((o) => !o)}
                aria-expanded={traceOpen}
              >
                {traceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Run trace ({lastTrace.length} steps)
              </button>
              {traceOpen && (
                <ul className="scenario-trace-list">
                  {lastTrace.map((step, i) => (
                    <li key={i}>
                      <code>{step.step}</code>
                      {step.tool && <span> tool={step.tool}</span>}
                      {step.intent && <span> intent={step.intent}</span>}
                      {step.duration_ms != null && <span> {step.duration_ms}ms</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {runLogOpen && (
            <div className="scenario-run-log">
              <div className="scenario-run-log-header">
                <h3>Run Log (Phase 2e)</h3>
                <button type="button" className="scenario-btn scenario-btn-ghost" onClick={() => { setRunLogOpen(false); setSelectedRun(null); }}>Close</button>
              </div>
              {runsLoading ? (
                <p className="scenario-result-empty">Loading runs…</p>
              ) : runsList.length === 0 ? (
                <p className="scenario-result-empty">No runs for this session yet. Send a message to create a run.</p>
              ) : (
                <ul className="scenario-run-list">
                  {runsList.map((r) => (
                    <li key={r.run_id}>
                      <button type="button" className="scenario-run-item" onClick={() => loadRunDetail(r.run_id)}>
                        <span className="scenario-run-input">{(r.user_input || '').slice(0, 60)}{(r.user_input || '').length > 60 ? '…' : ''}</span>
                        <span className="scenario-run-meta">{r.created_at} · {r.trace_steps} steps</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedRun && (
                <div className="scenario-run-detail">
                  <h4>Run: {selectedRun.run_id?.slice(0, 8)}…</h4>
                  <p><strong>Input:</strong> {selectedRun.user_input}</p>
                  <p><strong>Reply:</strong> {(selectedRun.assistant_reply || '').slice(0, 300)}{(selectedRun.assistant_reply || '').length > 300 ? '…' : ''}</p>
                  <details>
                    <summary>Trace ({selectedRun.trace?.length || 0} steps)</summary>
                    <ul className="scenario-trace-list">
                      {(selectedRun.trace || []).map((step, i) => (
                        <li key={i}>
                          <code>{step.step}</code>
                          {step.tool && <span> tool={step.tool}</span>}
                          {step.intent && <span> intent={step.intent}</span>}
                          {step.duration_ms != null && <span> {step.duration_ms}ms</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .scenario-console-page { padding: 1rem; max-width: 1600px; margin: 0 auto; }
        .scenario-console-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .scenario-console-header h1 { margin: 0; font-size: 1.5rem; }
        .scenario-console-header p { margin: 0.25rem 0 0 0; color: var(--text-secondary, #888); font-size: 0.9rem; width: 100%; }
        .scenario-console-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; min-height: 480px; }
        @media (max-width: 900px) { .scenario-console-layout { grid-template-columns: 1fr; } }
        .scenario-chat-panel { display: flex; flex-direction: column; background: var(--bg-secondary, #1a1a2e); border-radius: 10px; border: 1px solid var(--border-color, #333); overflow: hidden; }
        .scenario-chat-toolbar { padding: 0.75rem; border-bottom: 1px solid var(--border-color, #333); display: flex; align-items: center; gap: 0.5rem; }
        .scenario-btn { padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem; }
        .scenario-btn-primary { background: var(--accent, #6366f1); color: #fff; }
        .scenario-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .scenario-btn-send { background: var(--accent, #6366f1); color: #fff; padding: 0.5rem; }
        .scenario-btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .scenario-session-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
        .scenario-city-badge { background: var(--bg-tertiary, #252540); padding: 0.2rem 0.5rem; border-radius: 4px; }
        .scenario-clarifying-badge { color: var(--warning, #f59e0b); }
        .scenario-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: rgba(239,68,68,0.15); border-radius: 6px; margin: 0.5rem; font-size: 0.85rem; color: #fca5a5; }
        .scenario-chat-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; min-height: 200px; }
        .scenario-chat-placeholder { color: var(--text-secondary, #888); font-size: 0.9rem; }
        .scenario-msg { display: flex; flex-direction: column; gap: 0.25rem; }
        .scenario-msg-user .scenario-msg-content { background: var(--accent, #6366f1); color: #fff; padding: 0.6rem; border-radius: 8px; max-width: 90%; align-self: flex-end; }
        .scenario-msg-assistant .scenario-msg-content { background: var(--bg-tertiary, #252540); padding: 0.6rem; border-radius: 8px; max-width: 90%; }
        .scenario-msg-role { font-size: 0.75rem; color: var(--text-secondary, #888); }
        .scenario-input-mode-row { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0.75rem; border-top: 1px solid var(--border-color, #333); flex-wrap: wrap; }
        .scenario-mode-toggle { display: flex; gap: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color, #333); }
        .scenario-mode-btn { padding: 0.4rem 0.75rem; background: var(--bg-secondary, #1a1a2e); color: var(--text-secondary, #94a3b8); border: none; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem; }
        .scenario-mode-btn:hover { background: var(--bg-tertiary, #252540); color: var(--text-primary, #e2e8f0); }
        .scenario-mode-btn.active { background: var(--accent, #6366f1); color: #fff; }
        .scenario-speak-reply { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--text-secondary, #94a3b8); cursor: pointer; }
        .scenario-speak-reply input { accent-color: var(--accent, #6366f1); }
        .scenario-voice-input-row { padding: 0.75rem; border-top: 1px solid var(--border-color, #333); }
        .scenario-btn-voice { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; background: var(--bg-secondary, #1a1a2e); border: 1px solid var(--border-color, #333); color: var(--text-primary, #e2e8f0); border-radius: 8px; font-size: 0.95rem; cursor: pointer; }
        .scenario-btn-voice:hover:not(:disabled) { background: var(--bg-tertiary, #252540); border-color: var(--accent, #6366f1); }
        .scenario-btn-voice.recording { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #fca5a5; animation: pulse-rec 1.2s ease-in-out infinite; }
        @keyframes pulse-rec { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
        .scenario-chat-input-row { display: flex; gap: 0.5rem; padding: 0.75rem; border-top: 1px solid var(--border-color, #333); }
        .scenario-input { flex: 1; padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border-color, #333); background: var(--bg-primary, #0f0f1a); color: var(--text-primary, #e2e8f0); font-size: 0.95rem; }
        .scenario-input:focus { outline: none; border-color: var(--accent, #6366f1); }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .scenario-result-panel { background: var(--bg-secondary, #1a1a2e); border-radius: 10px; border: 1px solid var(--border-color, #333); padding: 1rem; overflow-y: auto; }
        .scenario-result-panel h2 { margin: 0 0 0.75rem 0; font-size: 1.1rem; }
        .scenario-result-message { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary, #888); }
        .scenario-grid-summary { display: flex; gap: 1rem; margin-bottom: 0.75rem; font-size: 0.85rem; }
        .scenario-block { margin-bottom: 1rem; }
        .scenario-block h3 { margin: 0 0 0.5rem 0; font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem; }
        .scenario-zones-list, .scenario-hypotheses-list, .scenario-evidence-list, .scenario-actions-list { margin: 0; padding-left: 1.25rem; }
        .scenario-zones-list li, .scenario-hypotheses-list li, .scenario-evidence-list li, .scenario-actions-list li { margin-bottom: 0.35rem; font-size: 0.9rem; }
        .scenario-confidence { color: var(--text-secondary, #888); }
        .scenario-evidence-list code { font-size: 0.8rem; background: var(--bg-tertiary, #252540); padding: 0.15rem 0.35rem; border-radius: 4px; }
        .scenario-result-empty { color: var(--text-secondary, #888); font-size: 0.9rem; }
        .scenario-trace { margin-top: 1rem; border-top: 1px solid var(--border-color, #333); padding-top: 0.75rem; }
        .scenario-trace-toggle { background: none; border: none; color: var(--text-secondary, #888); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; padding: 0.25rem 0; }
        .scenario-trace-list { margin: 0.5rem 0 0 0; padding-left: 1.25rem; font-size: 0.8rem; }
        .scenario-trace-list li { margin-bottom: 0.25rem; }
        .scenario-btn-secondary { background: var(--bg-tertiary, #252540); color: var(--text-primary, #e2e8f0); border: 1px solid var(--border-color, #333); }
        .scenario-btn-ghost { background: transparent; color: var(--text-secondary, #888); }
        .scenario-run-log { margin-top: 1rem; padding: 1rem; border: 1px solid var(--border-color, #333); border-radius: 8px; background: var(--bg-primary, #0f0f1a); }
        .scenario-run-log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .scenario-run-log-header h3 { margin: 0; font-size: 0.95rem; }
        .scenario-run-list { list-style: none; margin: 0; padding: 0; }
        .scenario-run-item { display: block; width: 100%; text-align: left; padding: 0.5rem; border: none; border-radius: 6px; background: transparent; color: var(--text-primary); cursor: pointer; font-size: 0.85rem; }
        .scenario-run-item:hover { background: var(--bg-tertiary, #252540); }
        .scenario-run-input { display: block; margin-bottom: 0.25rem; }
        .scenario-run-meta { font-size: 0.75rem; color: var(--text-secondary, #888); }
        .scenario-run-detail { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, #333); font-size: 0.85rem; }
        .scenario-run-detail h4 { margin: 0 0 0.5rem 0; }
        .scenario-run-detail p { margin: 0.35rem 0; }
      `}</style>
    </div>
  );
}
