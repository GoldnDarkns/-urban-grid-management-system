import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Send, Loader, Zap, AlertTriangle, TrendingUp, Wind, Building2, X } from 'lucide-react';

export default function WhatIf() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const recognitionRef = useRef(null);
  // Google Gemini API key - hardcoded
  const GOOGLE_API_KEY = 'AIzaSyBjURtOB7L12peDsDPUW24jmVzQwIiC4oM';

  // Initialize Web Speech API (Whisper alternative - browser native)
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcriptText = event.results[0][0].transcript;
        setTranscript(transcriptText);
        setQuery(transcriptText);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn('Speech recognition not supported');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');
    setSimulationResult(null);

    try {
      // Parse the query to extract parameters
      const parsed = parseQuery(query);
      
      // Call Google Gemini API to get response
      const llmResponse = await callLLM(query, parsed);
      setResponse(llmResponse.text);

      // Run simulation if valid parameters extracted
      if (parsed.valid) {
        const simResult = runSimulation(parsed);
        setSimulationResult(simResult);
      }
    } catch (error) {
      console.error('Error processing query:', error);
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseQuery = (text) => {
    const lower = text.toLowerCase();
    const result = {
      valid: false,
      action: null,
      zone: null,
      value: null,
      unit: null,
      type: null
    };

    // Pattern: "add 1000 EVs to zone 5"
    const addPattern = /add\s+(\d+)\s*(evs?|electric\s+vehicles?|kw|kilowatts?|mw|megawatts?)\s+to\s+zone\s+(\d+)/i;
    const addMatch = text.match(addPattern);
    if (addMatch) {
      result.valid = true;
      result.action = 'add';
      result.value = parseInt(addMatch[1]);
      result.unit = addMatch[2].toLowerCase();
      result.zone = parseInt(addMatch[3]);
      result.type = addMatch[2].toLowerCase().includes('ev') ? 'ev' : 'power';
      return result;
    }

    // Pattern: "reduce solar by 30%"
    const reducePattern = /reduce\s+(solar|wind|power)\s+by\s+(\d+)%/i;
    const reduceMatch = text.match(reducePattern);
    if (reduceMatch) {
      result.valid = true;
      result.action = 'reduce';
      result.type = reduceMatch[1].toLowerCase();
      result.value = parseInt(reduceMatch[2]);
      result.unit = 'percent';
      return result;
    }

    // Pattern: "simulate blackout in downtown"
    const blackoutPattern = /simulate\s+(blackout|outage|power\s+cut)\s+in\s+(.+)/i;
    const blackoutMatch = text.match(blackoutPattern);
    if (blackoutMatch) {
      result.valid = true;
      result.action = 'blackout';
      result.zone = blackoutMatch[2].trim();
      return result;
    }

    // Pattern: "what if zone 5 demand increases by 50%"
    const increasePattern = /(what\s+if\s+)?zone\s+(\d+)\s+(demand|consumption)\s+increases?\s+by\s+(\d+)%/i;
    const increaseMatch = text.match(increasePattern);
    if (increaseMatch) {
      result.valid = true;
      result.action = 'increase';
      result.zone = parseInt(increaseMatch[2]);
      result.value = parseInt(increaseMatch[4]);
      result.unit = 'percent';
      result.type = 'demand';
      return result;
    }

    return result;
  };

  const callLLM = async (query, parsed) => {
    const systemPrompt = `You are an AI assistant for an Urban Grid Management System. 
Analyze the user's query about energy grid scenarios and provide:
1. A clear explanation of what the scenario means
2. Expected impacts on the grid
3. Recommendations

Be concise and technical. Format as plain text.`;

    const userPrompt = `User query: "${query}"
Parsed parameters: ${JSON.stringify(parsed)}

Provide analysis and recommendations.`;

    // Combine system prompt and user prompt for Gemini
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // Call Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Google API');
    }

    return { text: data.candidates[0].content.parts[0].text };
  };

  const runSimulation = (parsed) => {
    // Simulate the scenario
    const baseDemand = 500; // kW
    const baseAQI = 120;
    
    let newDemand = baseDemand;
    let newAQI = baseAQI;
    let affectedZones = [];
    let riskChange = 0;

    if (parsed.action === 'add' && parsed.type === 'ev') {
      // Each EV adds ~7kW charging load
      newDemand = baseDemand + (parsed.value * 7);
      affectedZones.push(`Zone ${parsed.zone}`);
      riskChange = parsed.value > 500 ? 25 : parsed.value > 200 ? 15 : 5;
    } else if (parsed.action === 'reduce' && parsed.type === 'solar') {
      const reduction = (baseDemand * parsed.value) / 100;
      newDemand = baseDemand - reduction;
      riskChange = parsed.value > 50 ? 30 : parsed.value > 25 ? 15 : 5;
    } else if (parsed.action === 'blackout') {
      newDemand = 0;
      riskChange = 100;
      affectedZones.push(parsed.zone);
    } else if (parsed.action === 'increase') {
      newDemand = baseDemand * (1 + parsed.value / 100);
      affectedZones.push(`Zone ${parsed.zone}`);
      riskChange = parsed.value > 50 ? 30 : parsed.value > 25 ? 15 : 5;
    }

    return {
      scenario: parsed.action,
      before: {
        demand: baseDemand,
        aqi: baseAQI,
        risk: 'low'
      },
      after: {
        demand: Math.round(newDemand),
        aqi: Math.round(newAQI + (riskChange * 0.5)),
        risk: riskChange > 50 ? 'high' : riskChange > 25 ? 'medium' : 'low'
      },
      affectedZones,
      riskChange,
      impact: riskChange > 50 ? 'critical' : riskChange > 25 ? 'high' : 'moderate'
    };
  };


  return (
    <div className="whatif-page container page">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1><Zap size={32} /> What-If Scenario Engine</h1>
          <p>Natural language queries powered by AI • Voice input supported</p>
        </div>
      </motion.div>

      <div className="whatif-layout">
        {/* Left Panel - Query Input */}
        <div className="query-panel">
          <h3>Query Interface</h3>
          
          {/* Voice Input */}
          <div className="voice-section">
            <h4>Voice Input</h4>
            <div className="voice-controls">
              <button
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={isListening ? stopListening : startListening}
                disabled={!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                {isListening ? 'Stop Recording' : 'Start Recording'}
              </button>
              {transcript && (
                <div className="transcript-box">
                  <p><strong>Heard:</strong> {transcript}</p>
                </div>
              )}
            </div>
          </div>

          {/* Text Input */}
          <div className="text-input-section">
            <h4>Text Input</h4>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Example: 'Add 1000 EVs to Zone 5' or 'What if solar drops by 30%?'"
              rows={4}
            />
            <button className="submit-btn" onClick={handleQuery} disabled={loading || !query.trim()}>
              {loading ? <Loader size={18} className="spinning" /> : <Send size={18} />}
              {loading ? 'Processing...' : 'Run Simulation'}
            </button>
          </div>

          {/* Example Queries */}
          <div className="examples">
            <h4>Example Queries</h4>
            <ul>
              <li onClick={() => setQuery('Add 1000 EVs to Zone 5')}>Add 1000 EVs to Zone 5</li>
              <li onClick={() => setQuery('Reduce solar by 30%')}>Reduce solar by 30%</li>
              <li onClick={() => setQuery('Simulate blackout in downtown')}>Simulate blackout in downtown</li>
              <li onClick={() => setQuery('What if Zone 3 demand increases by 50%')}>What if Zone 3 demand increases by 50%</li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="results-panel">
          {loading && (
            <div className="loading-state">
              <Loader size={48} className="spinning" />
              <p>Processing query with AI...</p>
            </div>
          )}

          {response && (
            <motion.div className="ai-response" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3><Zap size={20} /> AI Analysis</h3>
              <div className="response-text">{response}</div>
            </motion.div>
          )}

          {simulationResult && (
            <motion.div className="simulation-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3><TrendingUp size={20} /> Simulation Results</h3>
              
              <div className="comparison-grid">
                <div className="before-card">
                  <h4>Before</h4>
                  <div className="metric">
                    <span>Demand:</span>
                    <strong>{simulationResult.before.demand} kW</strong>
                  </div>
                  <div className="metric">
                    <span>AQI:</span>
                    <strong>{simulationResult.before.aqi}</strong>
                  </div>
                  <div className="metric">
                    <span>Risk:</span>
                    <span className={`badge ${simulationResult.before.risk}`}>{simulationResult.before.risk.toUpperCase()}</span>
                  </div>
                </div>

                <div className="arrow">→</div>

                <div className="after-card">
                  <h4>After</h4>
                  <div className="metric">
                    <span>Demand:</span>
                    <strong className={simulationResult.after.demand > simulationResult.before.demand ? 'increase' : 'decrease'}>
                      {simulationResult.after.demand} kW
                    </strong>
                  </div>
                  <div className="metric">
                    <span>AQI:</span>
                    <strong className={simulationResult.after.aqi > simulationResult.before.aqi ? 'increase' : 'decrease'}>
                      {simulationResult.after.aqi}
                    </strong>
                  </div>
                  <div className="metric">
                    <span>Risk:</span>
                    <span className={`badge ${simulationResult.after.risk}`}>{simulationResult.after.risk.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {simulationResult.affectedZones.length > 0 && (
                <div className="affected-zones">
                  <h4><Building2 size={16} /> Affected Zones</h4>
                  <div className="zone-tags">
                    {simulationResult.affectedZones.map((zone, i) => (
                      <span key={i} className="zone-tag">{zone}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className={`impact-alert ${simulationResult.impact}`}>
                <AlertTriangle size={18} />
                <div>
                  <strong>Impact Level: {simulationResult.impact.toUpperCase()}</strong>
                  <p>Risk change: {simulationResult.riskChange > 0 ? '+' : ''}{simulationResult.riskChange}%</p>
                </div>
              </div>
            </motion.div>
          )}

          {!loading && !response && !simulationResult && (
            <div className="empty-state">
              <Zap size={48} />
              <p>Enter a query to see AI-powered analysis and simulation results</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .whatif-page { padding: 1.5rem; }
        .page-header { margin-bottom: 2rem; }
        .page-header h1 { display: flex; align-items: center; gap: 0.75rem; font-size: 2rem; }
        .page-header p { color: var(--text-secondary); margin-top: 0.5rem; }

        .whatif-layout { display: grid; grid-template-columns: 400px 1fr; gap: 1.5rem; }
        @media (max-width: 1000px) { .whatif-layout { grid-template-columns: 1fr; } }

        .query-panel, .results-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .query-panel h3, .results-panel h3 { font-size: 1.1rem; margin-bottom: 1rem; color: var(--accent-secondary); }

        .voice-section, .text-input-section { margin-bottom: 1.5rem; }
        .voice-section h4, .text-input-section h4 { font-size: 0.9rem; margin-bottom: 0.75rem; }
        .mic-btn {
          width: 100%; padding: 1rem; background: var(--bg-secondary);
          border: 2px solid var(--accent-primary); border-radius: 8px;
          color: var(--accent-primary); font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: all 0.3s;
        }
        .mic-btn:hover { background: rgba(0, 255, 136, 0.1); }
        .mic-btn.listening { animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .transcript-box {
          margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-secondary);
          border: 1px solid var(--border-color); border-radius: 6px;
          font-size: 0.85rem;
        }

        textarea {
          width: 100%; padding: 0.75rem; background: var(--bg-secondary);
          border: 1px solid var(--border-color); border-radius: 6px;
          color: var(--text-primary); font-size: 0.9rem; font-family: var(--font-sans);
          resize: vertical; margin-bottom: 0.75rem;
        }
        .submit-btn {
          width: 100%; padding: 0.75rem; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border: none; border-radius: 6px; color: #000; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .examples h4 { font-size: 0.9rem; margin-bottom: 0.75rem; }
        .examples ul { list-style: none; padding: 0; }
        .examples li {
          padding: 0.6rem; margin-bottom: 0.5rem; background: var(--bg-secondary);
          border: 1px solid var(--border-color); border-radius: 6px;
          cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
        }
        .examples li:hover { border-color: var(--accent-primary); background: rgba(0, 255, 136, 0.05); }

        .loading-state {
          text-align: center; padding: 3rem; color: var(--text-secondary);
        }
        .ai-response { margin-bottom: 1.5rem; }
        .ai-response h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .response-text {
          padding: 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color);
          border-radius: 8px; line-height: 1.7; white-space: pre-wrap;
        }

        .simulation-result h3 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .comparison-grid {
          display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; margin-bottom: 1.5rem;
        }
        .before-card, .after-card {
          background: var(--bg-secondary); border: 1px solid var(--border-color);
          border-radius: 8px; padding: 1rem;
        }
        .before-card h4, .after-card h4 { font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--accent-secondary); }
        .metric {
          display: flex; justify-content: space-between; padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color);
        }
        .metric:last-child { border-bottom: none; }
        .metric span:first-child { color: var(--text-secondary); }
        .metric .increase { color: #ff4466; }
        .metric .decrease { color: #00ff88; }
        .arrow {
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; color: var(--accent-primary);
        }
        .badge {
          padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700;
        }
        .badge.low { background: rgba(0, 212, 255, 0.2); color: #00d4ff; }
        .badge.medium { background: rgba(255, 204, 0, 0.2); color: #ffcc00; }
        .badge.high { background: rgba(255, 68, 102, 0.2); color: #ff4466; }

        .affected-zones { margin-bottom: 1rem; }
        .affected-zones h4 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; margin-bottom: 0.75rem; }
        .zone-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .zone-tag {
          padding: 0.4rem 0.75rem; background: var(--bg-secondary);
          border: 1px solid var(--accent-primary); border-radius: 4px;
          font-size: 0.8rem; color: var(--accent-primary);
        }

        .impact-alert {
          display: flex; gap: 1rem; padding: 1rem; border-radius: 8px;
          border: 2px solid;
        }
        .impact-alert.moderate {
          background: rgba(255, 204, 0, 0.1); border-color: #ffcc00; color: #ffcc00;
        }
        .impact-alert.high {
          background: rgba(255, 170, 0, 0.1); border-color: #ffaa00; color: #ffaa00;
        }
        .impact-alert.critical {
          background: rgba(255, 68, 102, 0.1); border-color: #ff4466; color: #ff4466;
        }

        .empty-state {
          text-align: center; padding: 3rem; color: var(--text-secondary);
        }
        .empty-state svg { margin-bottom: 1rem; opacity: 0.5; }
      `}</style>
    </div>
  );
}

