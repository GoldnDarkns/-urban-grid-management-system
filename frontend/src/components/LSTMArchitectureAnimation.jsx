import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SEQUENTIAL_LAYERS = [
  { type: 'input', label: 'Input', spec: '24×4', desc: 'Sequence (hours × features)', color: 'var(--accent-purple)' },
  { type: 'lstm', label: 'LSTM 1', spec: '64 units', activation: 'tanh', color: 'var(--accent-secondary)' },
  { type: 'dropout', label: 'Dropout 1', spec: 'rate 0.2', color: 'var(--accent-warning)' },
  { type: 'lstm', label: 'LSTM 2', spec: '32 units', activation: 'tanh', color: 'var(--accent-secondary)' },
  { type: 'dropout', label: 'Dropout 2', spec: 'rate 0.2', color: 'var(--accent-warning)' },
  { type: 'dense', label: 'Dense 1', spec: '16 units', activation: 'relu', color: 'var(--accent-primary)' },
  { type: 'output', label: 'Output', spec: '1 unit', activation: 'linear', color: 'var(--accent-primary)' },
];

export function LSTMSequentialAnimation() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIndex((i) => (i + 1) % SEQUENTIAL_LAYERS.length);
    }, 750);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="lstm-seq-anim">
      <div className="lstm-seq-title">Information flow: Input → Layers → Output</div>
      <div className="lstm-seq-flow">
        {SEQUENTIAL_LAYERS.map((layer, i) => (
          <div key={i} className="lstm-seq-node">
            <motion.div
              className={`lstm-seq-box ${layer.type} ${activeIndex === i ? 'active' : ''}`}
              style={{ ['--layer-color']: layer.color }}
              animate={activeIndex === i ? { boxShadow: ['0 0 12px var(--layer-color), 0 0 24px var(--layer-color)', '0 0 20px var(--layer-color), 0 0 40px var(--layer-color)', '0 0 12px var(--layer-color), 0 0 24px var(--layer-color)'] } : {}}
              transition={{ duration: 0.75, repeat: activeIndex === i ? Infinity : 0, repeatType: 'reverse' }}
            >
              <div className="lstm-seq-box-label">{layer.label}</div>
              <div className="lstm-seq-box-type">{layer.type.toUpperCase()}</div>
              <div className="lstm-seq-box-spec">{layer.spec}</div>
              {layer.activation && <div className="lstm-seq-box-activation">{layer.activation}</div>}
            </motion.div>
            {i < SEQUENTIAL_LAYERS.length - 1 && (
              <div className="lstm-seq-arrow-wrap">
                <svg className="lstm-seq-arrow" viewBox="0 0 50 24" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`arr-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
                      <stop offset="50%" stopColor="var(--accent-primary)" stopOpacity="1" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  <line x1="2" y1="12" x2="38" y2="12" stroke="var(--border-color)" strokeWidth="2" />
                  <motion.line
                    x1="2" y1="12" x2="38" y2="12"
                    stroke={`url(#arr-grad-${i})`}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    initial={{ strokeDashoffset: 10 }}
                    animate={activeIndex === i ? { strokeDashoffset: [10, -10] } : { strokeDashoffset: 10 }}
                    transition={{ duration: 0.6, repeat: activeIndex === i ? Infinity : 0, repeatType: 'loop' }}
                  />
                  <path d="M40 12 L34 8 M40 12 L34 16" stroke="var(--accent-primary)" strokeWidth="2" fill="none" />
                </svg>
                {activeIndex === i && (
                  <motion.div
                    className="lstm-seq-dot"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="lstm-seq-legend">
        <span><i style={{ background: 'var(--accent-purple)'}} /> Input</span>
        <span><i style={{ background: 'var(--accent-secondary)'}} /> LSTM</span>
        <span><i style={{ background: 'var(--accent-warning)'}} /> Dropout</span>
        <span><i style={{ background: 'var(--accent-primary)'}} /> Dense / Output</span>
      </div>
      <style>{`
        .lstm-seq-anim {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem 1rem;
          overflow-x: auto;
        }
        .lstm-seq-title {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .lstm-seq-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          min-width: max-content;
          padding: 0.5rem 0;
        }
        .lstm-seq-node {
          display: flex;
          align-items: center;
        }
        .lstm-seq-box {
          min-width: 100px;
          max-width: 120px;
          padding: 0.75rem 0.5rem;
          border-radius: 10px;
          border: 2px solid var(--border-color);
          background: var(--bg-secondary);
          text-align: center;
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .lstm-seq-box.active {
          border-color: var(--layer-color);
        }
        .lstm-seq-box-label { font-weight: 600; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 0.2rem; }
        .lstm-seq-box-type { font-family: var(--font-mono); font-size: 0.65rem; color: var(--layer-color); margin-bottom: 0.15rem; }
        .lstm-seq-box-spec { font-size: 0.7rem; color: var(--text-secondary); }
        .lstm-seq-box-activation { font-size: 0.65rem; color: var(--text-muted); margin-top: 0.15rem; }
        .lstm-seq-arrow-wrap { position: relative; width: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .lstm-seq-arrow { width: 44px; height: 24px; overflow: visible; }
        .lstm-seq-dot {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--accent-primary);
          box-shadow: 0 0 12px var(--accent-primary);
          animation: lstm-dot-pulse 0.75s ease-in-out infinite;
        }
        @keyframes lstm-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        .lstm-seq-legend {
          display: flex;
          justify-content: center;
          gap: 1.25rem;
          margin-top: 1rem;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .lstm-seq-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 0.35rem; vertical-align: middle; }
      `}</style>
    </div>
  );
}

// --- LSTM Cell: clear step-by-step flow, no dimming, plain-English labels ---
const STEPS = [
  '① Forget: what to drop from old memory C_{t-1}',
  '② Input + Candidate: what new info to add',
  '③ Add (⊕): new memory C_t = (drop) + (add)',
  '④ Output: h_t = output gate ⊙ tanh(C_t)',
  '⑤ Out: C_t to next timestep, h_t is the output',
];

export function LSTMCellAnimation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="lstm-cell-anim">
      <div className="lstm-cell-how">
        <strong>How it works:</strong> At each timestep, the LSTM gets the current input <strong>X_t</strong> and the previous <strong>h_{'{t-1}'}</strong> and <strong>C_{'{t-1}'}</strong>. The <strong>forget</strong> gate decides what to drop from old memory, the <strong>input</strong> and <strong>candidate</strong> gates decide what to add, the <strong>add (⊕)</strong> combines them into the new <strong>C_t</strong>, and the <strong>output</strong> gate filters C_t to produce <strong>h_t</strong>. All four gates use the combined <strong>[h_{'{t-1}'}, x_t]</strong> as input.
      </div>
      <div className="lstm-cell-step">Current step: {STEPS[step]}</div>
      <svg className={`lstm-cell-svg lstm-step-${step}`} viewBox="0 0 800 460" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="lstm-cell-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(0,212,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,255,136,0.04)" />
          </linearGradient>
        </defs>

        <rect x="90" y="50" width="610" height="360" rx="14" fill="url(#lstm-cell-bg)" stroke="var(--accent-secondary)" strokeWidth="2" />

        {/* ─── INPUTS (left); labels clearly above/below symbols, no overlap) ─── */}
        <g>
          <text x="28" y="72" fill="var(--accent-primary)" fontSize="13" fontFamily="var(--font-mono)">C_{'{t-1}'}</text>
          <text x="28" y="88" fill="var(--text-muted)" fontSize="10">old memory</text>
          <line x1="70" y1="76" x2="105" y2="76" stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray="5 3" />
        </g>
        <g>
          <text x="28" y="220" fill="var(--accent-secondary)" fontSize="13" fontFamily="var(--font-mono)">h_{'{t-1}'}</text>
          <text x="28" y="236" fill="var(--text-muted)" fontSize="10">prev. output</text>
          <line x1="70" y1="224" x2="105" y2="224" stroke="var(--accent-secondary)" strokeWidth="2" strokeDasharray="5 3" />
        </g>
        <g>
          <text x="28" y="364" fill="var(--accent-purple)" fontSize="13" fontFamily="var(--font-mono)">X_t</text>
          <text x="28" y="380" fill="var(--text-muted)" fontSize="10">current input</text>
          <line x1="70" y1="368" x2="105" y2="368" stroke="var(--accent-purple)" strokeWidth="2" strokeDasharray="5 3" />
        </g>
        <g>
          <rect x="115" y="348" width="75" height="28" rx="6" fill="rgba(0,212,255,0.1)" stroke="var(--accent-secondary)" strokeWidth="1" strokeDasharray="3 2" />
          <text x="152" y="366" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">[h,x] → all 4 gates</text>
        </g>

        {/* ─── ① FORGET (animates when step===0) ─── */}
        <g className={`lstm-hi lstm-hi-0 ${step === 0 ? 'lstm-hi-on' : ''}`}>
          <line x1="105" y1="76" x2="248" y2="76" stroke="var(--accent-primary)" strokeWidth="2" />
          <text x="118" y="92" fill="var(--accent-warning)" fontSize="11" fontWeight="600">①</text>
          <rect x="120" y="96" width="80" height="48" rx="8" fill="var(--bg-card)" stroke="#ff4466" strokeWidth="2" />
          <text x="160" y="120" fill="#ff4466" fontSize="17" textAnchor="middle" fontWeight="600">σ</text>
          <text x="160" y="136" fill="var(--text-muted)" fontSize="11" textAnchor="middle">forget gate</text>
          <line x1="200" y1="144" x2="256" y2="86" stroke="#ff4466" strokeWidth="1.5" />
          <circle cx="272" cy="76" r="18" fill="var(--bg-card)" stroke="var(--accent-warning)" strokeWidth="2" />
          <text x="264" y="82" fill="var(--accent-warning)" fontSize="15" textAnchor="middle">⊙</text>
          <text x="272" y="98" fill="var(--text-muted)" fontSize="10" textAnchor="middle">drop from C_{'{t-1}'}</text>
        </g>

        {/* ─── ② INPUT + CANDIDATE (animates when step===1) ─── */}
        <g className={`lstm-hi lstm-hi-1 ${step === 1 ? 'lstm-hi-on' : ''}`}>
          <text x="118" y="214" fill="var(--accent-warning)" fontSize="11" fontWeight="600">②</text>
          <rect x="120" y="216" width="80" height="48" rx="8" fill="var(--bg-card)" stroke="#00d4ff" strokeWidth="2" />
          <text x="160" y="240" fill="#00d4ff" fontSize="17" textAnchor="middle" fontWeight="600">σ</text>
          <text x="160" y="256" fill="var(--text-muted)" fontSize="11" textAnchor="middle">input gate</text>
          <rect x="120" y="296" width="80" height="48" rx="8" fill="var(--bg-card)" stroke="#aa66ff" strokeWidth="2" />
          <text x="160" y="318" fill="#aa66ff" fontSize="14" textAnchor="middle" fontWeight="600">tanh</text>
          <text x="160" y="334" fill="var(--text-muted)" fontSize="11" textAnchor="middle">candidate</text>
          <line x1="200" y1="264" x2="256" y2="286" stroke="#00d4ff" strokeWidth="1.5" />
          <line x1="200" y1="344" x2="256" y2="306" stroke="#aa66ff" strokeWidth="1.5" />
          <circle cx="272" cy="296" r="18" fill="var(--bg-card)" stroke="var(--accent-warning)" strokeWidth="2" />
          <text x="264" y="302" fill="var(--accent-warning)" fontSize="15" textAnchor="middle">⊙</text>
          <text x="272" y="318" fill="var(--text-muted)" fontSize="10" textAnchor="middle">add to memory</text>
        </g>

        {/* ─── ③ ADD: C_t (animates when step===2) ─── */}
        <g className={`lstm-hi lstm-hi-2 ${step === 2 ? 'lstm-hi-on' : ''}`}>
          <line x1="290" y1="76" x2="342" y2="170" stroke="var(--accent-primary)" strokeWidth="2" />
          <line x1="290" y1="296" x2="342" y2="202" stroke="var(--accent-primary)" strokeWidth="2" />
          <circle cx="360" cy="186" r="20" fill="var(--bg-card)" stroke="var(--accent-primary)" strokeWidth="2" />
          <text x="348" y="192" fill="var(--accent-primary)" fontSize="18" textAnchor="middle">⊕</text>
          <text x="360" y="218" fill="var(--text-muted)" fontSize="11" textAnchor="middle">③ new C_t</text>
          <line x1="380" y1="186" x2="418" y2="186" stroke="var(--accent-primary)" strokeWidth="2" />
        </g>

        {/* ─── C_t split to tanh (418→106) ─── */}
        <line x1="418" y1="186" x2="418" y2="106" stroke="var(--accent-primary)" strokeWidth="2" />

        {/* ─── ⑤ C_t output path (animates when step===4) ─── */}
        <g className={`lstm-hi lstm-hi-4 ${step === 4 ? 'lstm-hi-on' : ''}`}>
          <line x1="418" y1="186" x2="565" y2="186" stroke="var(--accent-primary)" strokeWidth="2" />
          <line x1="565" y1="186" x2="565" y2="92" stroke="var(--accent-primary)" strokeWidth="2" />
          <line x1="565" y1="92" x2="608" y2="92" stroke="var(--accent-primary)" strokeWidth="2" />
          <text x="628" y="98" fill="var(--accent-primary)" fontSize="13" fontFamily="var(--font-mono)">C_t</text>
          <text x="628" y="110" fill="var(--text-muted)" fontSize="9">→ next step</text>
        </g>

        {/* ─── ④ OUTPUT GATE + tanh(C_t) → h_t (animates when step===3) ─── */}
        <g className={`lstm-hi lstm-hi-3 ${step === 3 ? 'lstm-hi-on' : ''}`}>
          <line x1="418" y1="106" x2="456" y2="106" stroke="var(--accent-primary)" strokeWidth="2" />
          <rect x="456" y="86" width="64" height="40" rx="8" fill="var(--bg-card)" stroke="var(--accent-primary)" strokeWidth="2" />
          <text x="488" y="112" fill="var(--accent-primary)" fontSize="13" textAnchor="middle" fontWeight="600">tanh</text>
          <line x1="520" y1="106" x2="535" y2="218" stroke="var(--accent-primary)" strokeWidth="2" />
          <line x1="535" y1="218" x2="560" y2="218" stroke="var(--accent-primary)" strokeWidth="2" />
          <rect x="438" y="208" width="80" height="48" rx="8" fill="var(--bg-card)" stroke="#00ff88" strokeWidth="2" />
          <text x="478" y="232" fill="#00ff88" fontSize="17" textAnchor="middle" fontWeight="600">σ</text>
          <text x="478" y="248" fill="var(--text-muted)" fontSize="11" textAnchor="middle">output gate</text>
          <text x="432" y="200" fill="var(--accent-warning)" fontSize="11" fontWeight="600">④</text>
          <line x1="518" y1="232" x2="562" y2="218" stroke="#00ff88" strokeWidth="1.5" />
          <circle cx="578" cy="218" r="18" fill="var(--bg-card)" stroke="var(--accent-warning)" strokeWidth="2" />
          <text x="570" y="224" fill="var(--accent-warning)" fontSize="15" textAnchor="middle">⊙</text>
          <text x="578" y="245" fill="var(--text-muted)" fontSize="10" textAnchor="middle">h_t</text>
        </g>

        {/* ─── ⑤ h_t output (animates when step===4) ─── */}
        <g className={`lstm-hi lstm-hi-4 ${step === 4 ? 'lstm-hi-on' : ''}`}>
          <line x1="596" y1="218" x2="720" y2="218" stroke="#00ff88" strokeWidth="2" />
          <text x="738" y="224" fill="#00ff88" fontSize="13" fontFamily="var(--font-mono)">h_t</text>
          <text x="738" y="236" fill="var(--text-muted)" fontSize="9">output</text>
        </g>

        <text x="400" y="412" fill="var(--text-secondary)" fontSize="11" textAnchor="middle" fontStyle="italic">h_t = o_t ⊙ tanh(C_t)  —  hidden output = output gate × tanh(new memory)</text>
      </svg>
      <div className="lstm-cell-legend">
        <span><i style={{ background: '#ff4466' }} /> Forget σ</span>
        <span><i style={{ background: '#00d4ff' }} /> Input σ</span>
        <span><i style={{ background: '#aa66ff' }} /> Candidate tanh</span>
        <span><i style={{ background: '#00ff88' }} /> Output σ</span>
        <span><i style={{ background: 'var(--accent-warning)' }} /> ⊙ multiply</span>
        <span><i style={{ background: 'var(--accent-primary)' }} /> ⊕ add</span>
      </div>
      <style>{`
        .lstm-cell-anim {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 1.5rem;
        }
        .lstm-cell-how {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(0,212,255,0.06);
          border-radius: 8px;
          border-left: 3px solid var(--accent-secondary);
        }
        .lstm-cell-how strong { color: var(--accent-primary); }
        .lstm-cell-step {
          text-align: center;
          font-size: 0.85rem;
          color: var(--accent-primary);
          margin-bottom: 0.75rem;
          font-family: var(--font-mono);
        }
        .lstm-cell-svg {
          width: 100%;
          min-width: 520px;
          max-width: 920px;
          margin: 0 auto;
          display: block;
        }
        .lstm-hi-0.lstm-hi-on { filter: drop-shadow(0 0 12px #ff4466); }
        .lstm-hi-1.lstm-hi-on { filter: drop-shadow(0 0 12px #00d4ff); }
        .lstm-hi-2.lstm-hi-on { filter: drop-shadow(0 0 12px #00d4ff); }
        .lstm-hi-3.lstm-hi-on { filter: drop-shadow(0 0 12px #00ff88); }
        .lstm-hi-4.lstm-hi-on { filter: drop-shadow(0 0 12px #00d4ff); }
        .lstm-cell-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem 1.5rem;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .lstm-cell-legend i {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 3px;
          margin-right: 0.4rem;
          vertical-align: middle;
        }
      `}</style>
    </div>
  );
}
