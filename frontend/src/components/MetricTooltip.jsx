import { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Educational tooltip component for metrics and technical terms
 */
export default function MetricTooltip({ term, explanation, children }) {
  const [show, setShow] = useState(false);

  return (
    <span className="metric-tooltip-container">
      {children}
      <span 
        className="tooltip-trigger"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <Info size={14} />
      </span>
      {show && (
        <div className="tooltip-content">
          <div className="tooltip-term">{term}</div>
          <div className="tooltip-explanation">{explanation}</div>
        </div>
      )}
      <style>{`
        .metric-tooltip-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .tooltip-trigger {
          cursor: help;
          color: var(--accent-secondary);
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .tooltip-trigger:hover {
          opacity: 1;
        }
        .tooltip-content {
          position: absolute;
          bottom: 100%;
          left: 0;
          margin-bottom: 0.5rem;
          padding: 0.75rem;
          background: rgba(10, 20, 30, 0.98);
          border: 1px solid var(--accent-primary);
          border-radius: 6px;
          min-width: 250px;
          max-width: 350px;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }
        .tooltip-term {
          font-weight: 700;
          color: var(--accent-primary);
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        .tooltip-explanation {
          color: var(--text-secondary);
          font-size: 0.85rem;
          line-height: 1.5;
        }
      `}</style>
    </span>
  );
}

// Pre-defined metric explanations
export const METRIC_EXPLANATIONS = {
  rmse: {
    term: "RMSE (Root Mean Squared Error)",
    explanation: "Measures the average magnitude of prediction errors. Lower is better. RMSE penalizes large errors more than small ones. A lower RMSE means predictions are closer to actual values."
  },
  mae: {
    term: "MAE (Mean Absolute Error)",
    explanation: "Average of absolute differences between predicted and actual values. Lower is better. MAE treats all errors equally, making it easier to interpret than RMSE."
  },
  r2: {
    term: "R² (R-squared / Coefficient of Determination)",
    explanation: "Measures how well the model explains the variance in data. Range: 0 to 1. Higher is better. R² = 1 means perfect fit, R² = 0 means model is no better than predicting the mean."
  },
  mape: {
    term: "MAPE (Mean Absolute Percentage Error)",
    explanation: "Average percentage error between predictions and actuals. Lower is better. MAPE is scale-independent, making it useful for comparing models across different datasets."
  },
  trainingTime: {
    term: "Training Time",
    explanation: "Time taken to train the model on the dataset. Lower is better for faster iteration, but longer training may improve accuracy. Balance depends on use case."
  },
  accuracy: {
    term: "Accuracy",
    explanation: "Percentage of correct predictions. Higher is better. For classification tasks, accuracy = (correct predictions / total predictions) × 100%."
  },
  anomalyRate: {
    term: "Anomaly Rate",
    explanation: "Percentage of data points flagged as anomalies. Typically 1-5% is normal. Too high suggests threshold is too sensitive; too low suggests missing real anomalies."
  }
};
