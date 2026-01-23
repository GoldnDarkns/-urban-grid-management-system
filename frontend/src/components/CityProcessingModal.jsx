import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Loader2, X, MapPin, Globe, Cloud, Wind, 
  Activity, Brain, Zap, Database, AlertCircle, Minimize2, Maximize2
} from 'lucide-react';

const PROCESSING_STEPS = [
  { id: 'selecting', label: 'Selecting City', icon: MapPin, description: 'Initializing city configuration' },
  { id: 'zones', label: 'Calculating Zones', icon: Globe, description: 'Dividing city into 20 zones' },
  { id: 'geocoding', label: 'Reverse Geocoding', icon: MapPin, description: 'Fetching real neighborhood names (this may take 20-25 seconds)' },
  { id: 'weather', label: 'Fetching Weather Data', icon: Cloud, description: 'Getting current weather from OpenWeatherMap' },
  { id: 'aqi', label: 'Fetching AQI Data', icon: Wind, description: 'Getting air quality from AirVisual API' },
  { id: 'traffic', label: 'Fetching Traffic Data', icon: Activity, description: 'Getting traffic patterns from TomTom' },
  { id: 'lstm', label: 'LSTM Forecasting', icon: Brain, description: 'Running demand prediction model' },
  { id: 'autoencoder', label: 'Anomaly Detection', icon: AlertCircle, description: 'Detecting unusual patterns' },
  { id: 'gnn', label: 'GNN Risk Scoring', icon: Brain, description: 'Calculating zone risk scores' },
  { id: 'arima', label: 'ARIMA Analysis', icon: Activity, description: 'Statistical forecasting' },
  { id: 'prophet', label: 'Prophet Forecasting', icon: Zap, description: 'Seasonal trend analysis' },
  { id: 'recommendations', label: 'AI Recommendations', icon: Brain, description: 'Generating prioritized recommendations' },
  { id: 'eia', label: 'Energy Grid Data', icon: Database, description: 'Processing EIA electricity data' },
  { id: 'complete', label: 'Complete!', icon: CheckCircle2, description: 'All processing finished' }
];

export default function CityProcessingModal({ isOpen, onClose, cityName, progress }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [failedSteps, setFailedSteps] = useState(new Set());
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setCompletedSteps(new Set());
      setFailedSteps(new Set());
      return;
    }

    // Update progress based on progress prop
    if (progress) {
      const { stage, message, error } = progress;
      
      // Map progress stages to step indices
      const stageMap = {
        'selecting': 0,
        'zones': 1,
        'geocoding': 2,
        'weather': 3,
        'aqi': 4,
        'traffic': 5,
        'lstm': 6,
        'autoencoder': 7,
        'gnn': 8,
        'arima': 9,
        'prophet': 10,
        'recommendations': 11,
        'eia': 12,
        'complete': 13,
        'error': -1
      };

      const stepIndex = stageMap[stage] ?? -1;
      
      if (stepIndex >= 0) {
        setCurrentStep(stepIndex);
        
        // Mark previous steps as completed
        for (let i = 0; i < stepIndex; i++) {
          setCompletedSteps(prev => new Set([...prev, i]));
        }
        
        if (error) {
          setFailedSteps(prev => new Set([...prev, stepIndex]));
        } else if (stage === 'complete') {
          // Mark all steps as completed
          setCompletedSteps(new Set(Array.from({ length: PROCESSING_STEPS.length }, (_, i) => i)));
        }
      }
    }
  }, [isOpen, progress]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="city-processing-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isMinimized ? undefined : onClose}
      >
          <motion.div
          className={`city-processing-modal ${isMinimized ? 'minimized' : ''}`}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ 
            scale: isMinimized ? 0.85 : 1, 
            opacity: 1, 
            y: 0
          }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-title-section">
              <h2>Processing {cityName || 'City'}</h2>
              {!isMinimized && (
                <p className="modal-subtitle">Setting up zones and fetching live data...</p>
              )}
              {isMinimized && (
                <p className="modal-subtitle-minimized">
                  {completedSteps.size} of {PROCESSING_STEPS.length} tasks completed
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="modal-minimize" 
                onClick={() => setIsMinimized(!isMinimized)} 
                aria-label={isMinimized ? "Maximize" : "Minimize"}
                title={isMinimized ? "Maximize" : "Minimize to continue in background"}
              >
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
              <button className="modal-close" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="modal-content">
              <div className="progress-steps">
                {PROCESSING_STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = completedSteps.has(index);
                const isFailed = failedSteps.has(index);
                const isPending = index > currentStep;

                const StepIcon = step.icon;
                let iconElement = null;

                if (isCompleted) {
                  iconElement = <CheckCircle2 size={20} className="step-icon step-icon-completed" />;
                } else if (isFailed) {
                  iconElement = <AlertCircle size={20} className="step-icon step-icon-failed" />;
                } else if (isActive) {
                  iconElement = <Loader2 size={20} className="step-icon step-icon-active spinning" />;
                } else {
                  iconElement = <StepIcon size={20} className="step-icon step-icon-pending" />;
                }

                return (
                  <motion.div
                    key={step.id}
                    className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFailed ? 'failed' : ''} ${isPending ? 'pending' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="step-indicator">
                      {iconElement}
                      {index < PROCESSING_STEPS.length - 1 && (
                        <div className={`step-connector ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`} />
                      )}
                    </div>
                    <div className="step-content">
                      <div className="step-label">{step.label}</div>
                      <div className="step-description">{step.description}</div>
                      {isActive && progress?.message && (
                        <motion.div
                          className="step-message"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {progress.message}
                        </motion.div>
                      )}
                      {isFailed && progress?.error && (
                        <motion.div
                          className="step-error"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {progress.error}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              </div>
            </div>
          )}

          {!isMinimized && (
            <div className="modal-footer">
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: `${((completedSteps.size + (currentStep < PROCESSING_STEPS.length - 1 ? 0.5 : 0)) / PROCESSING_STEPS.length) * 100}%` 
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="progress-text">
                  {completedSteps.size} of {PROCESSING_STEPS.length} tasks completed
                </div>
              </div>
            </div>
          )}
          
          {isMinimized && (
            <div className="modal-minimized-content">
              <div className="minimized-progress-bar">
                <motion.div
                  className="minimized-progress-fill"
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: `${((completedSteps.size + (currentStep < PROCESSING_STEPS.length - 1 ? 0.5 : 0)) / PROCESSING_STEPS.length) * 100}%` 
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="minimized-status">
                {PROCESSING_STEPS[currentStep]?.label || 'Processing...'}
              </div>
            </div>
          )}

          <style>{`
          .city-processing-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
          }

          .city-processing-modal {
            background: linear-gradient(135deg, rgba(5, 10, 20, 0.98), rgba(10, 20, 40, 0.98));
            border: 2px solid rgba(0, 255, 136, 0.3);
            border-radius: 20px;
            box-shadow: 
              0 0 40px rgba(0, 255, 136, 0.3),
              0 20px 60px rgba(0, 0, 0, 0.5);
            max-width: 700px;
            width: 100%;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            margin: auto;
            position: relative;
          }

          .city-processing-modal.minimized {
            max-width: 400px;
            width: auto;
            min-width: 350px;
            max-height: 120px;
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            margin: 0;
          }

          .modal-header {
            padding: 24px;
            border-bottom: 1px solid rgba(0, 255, 136, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-shrink: 0;
          }

          .modal-title-section h2 {
            margin: 0 0 8px 0;
            font-size: 1.75rem;
            font-weight: 700;
            color: #ffffff;
            text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
            background: linear-gradient(135deg, #00ff88, #00d4ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .modal-subtitle {
            margin: 0;
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
          }

          .modal-subtitle-minimized {
            margin: 0;
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
          }

          .modal-actions {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .modal-minimize,
          .modal-close {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: var(--text-primary);
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-minimize:hover,
          .modal-close:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(0, 255, 136, 0.5);
            color: #00ff88;
            transform: scale(1.1);
          }

          .modal-content {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 255, 136, 0.3) transparent;
          }

          .modal-content::-webkit-scrollbar {
            width: 8px;
          }

          .modal-content::-webkit-scrollbar-track {
            background: transparent;
          }

          .modal-content::-webkit-scrollbar-thumb {
            background: rgba(0, 255, 136, 0.3);
            border-radius: 4px;
          }

          .modal-content::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 255, 136, 0.5);
          }

          .progress-steps {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .progress-step {
            display: flex;
            gap: 16px;
            padding: 12px;
            border-radius: 12px;
            transition: all 0.3s;
          }

          .progress-step.active {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid rgba(0, 255, 136, 0.3);
          }

          .progress-step.completed {
            opacity: 0.8;
          }

          .progress-step.failed {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 0, 0, 0.3);
          }

          .step-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }

          .step-icon {
            width: 40px;
            height: 40px;
            padding: 10px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .step-icon-pending {
            color: var(--text-secondary);
            background: rgba(255, 255, 255, 0.05);
          }

          .step-icon-active {
            color: #00ff88;
            background: rgba(0, 255, 136, 0.2);
          }

          .step-icon-completed {
            color: #00ff88;
            background: rgba(0, 255, 136, 0.2);
          }

          .step-icon-failed {
            color: #ff4444;
            background: rgba(255, 68, 68, 0.2);
          }

          .spinning {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .step-connector {
            width: 2px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            margin-top: 4px;
            transition: all 0.3s;
          }

          .step-connector.completed {
            background: linear-gradient(180deg, #00ff88, rgba(0, 255, 136, 0.3));
          }

          .step-connector.active {
            background: linear-gradient(180deg, #00ff88, rgba(255, 255, 255, 0.1));
            animation: pulse-connector 1.5s ease-in-out infinite;
          }

          @keyframes pulse-connector {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }

          .step-content {
            flex: 1;
          }

          .step-label {
            font-size: 1.1rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 6px;
            text-shadow: 0 0 5px rgba(0, 255, 136, 0.3);
          }

          .step-description {
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.85);
            margin-bottom: 8px;
            font-weight: 500;
          }

          .step-message {
            font-size: 0.9rem;
            color: #00ff88;
            font-style: italic;
            margin-top: 6px;
            font-weight: 600;
            text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
          }

          .step-error {
            font-size: 0.9rem;
            color: #ff6666;
            margin-top: 6px;
            font-weight: 600;
            text-shadow: 0 0 8px rgba(255, 102, 102, 0.5);
          }

          .modal-minimized-content {
            padding: 16px 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .minimized-progress-bar {
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
          }

          .minimized-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            border-radius: 3px;
            transition: width 0.3s ease;
          }

          .minimized-status {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            text-align: center;
          }

          .modal-footer {
            padding: 24px;
            border-top: 1px solid rgba(0, 255, 136, 0.2);
          }

          .progress-bar-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
          }

          .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            border-radius: 4px;
            transition: width 0.3s ease;
          }

          .progress-text {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.9);
            text-align: center;
            font-weight: 500;
          }
        `}</style>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
