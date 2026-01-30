import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Zap, AlertTriangle, TrendingUp, Shield, 
  Activity, Wind, Lightbulb, CheckCircle, RefreshCw,
  PlayCircle, Target, DollarSign, BarChart3, Clock,
  ArrowRight, Info, MapPin, Users, Building2, AlertCircle
} from 'lucide-react';
import { aiAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { useZones } from '../utils/useZones';
import { useAppMode } from '../utils/useAppMode';
import { cityAPI } from '../services/api';

export default function AIRecommendations() {
  const { mode } = useAppMode();
  const [recommendations, setRecommendations] = useState([]);
  const [systemState, setSystemState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [errorSuggestion, setErrorSuggestion] = useState(null);
  const [selectedRec, setSelectedRec] = useState(null);
  const [currentCityId, setCurrentCityId] = useState(null);
  const { formatZoneName, formatZoneNames, getZone } = useZones();

  // Get current city ID when in City mode
  useEffect(() => {
    if (mode === 'city') {
      cityAPI.getCurrentCity()
        .then((r) => setCurrentCityId(r.data?.city_id || null))
        .catch(() => setCurrentCityId(null));
    } else {
      setCurrentCityId(null);
    }
  }, [mode]);

  // Listen for city changes
  useEffect(() => {
    if (mode !== 'city') return;
    const onCityChanged = () => {
      cityAPI.getCurrentCity()
        .then((r) => setCurrentCityId(r.data?.city_id || null))
        .catch(() => setCurrentCityId(null));
    };
    window.addEventListener('ugms-city-changed', onCityChanged);
    window.addEventListener('ugms-city-processed', onCityChanged);
    return () => {
      window.removeEventListener('ugms-city-changed', onCityChanged);
      window.removeEventListener('ugms-city-processed', onCityChanged);
    };
  }, [mode]);

  useEffect(() => {
    fetchRecommendations();
  }, [mode, currentCityId]);

  const tryParseRawRecommendations = (rawResponse) => {
    if (!rawResponse) return null;
    
    // If raw_response is already an array, return it directly
    if (Array.isArray(rawResponse)) {
      return rawResponse.length > 0 ? rawResponse : null;
    }
    
    // If raw_response is already an object with recommendations
    if (typeof rawResponse === 'object' && rawResponse !== null) {
      if (rawResponse.recommendations) {
        return Array.isArray(rawResponse.recommendations) ? rawResponse.recommendations : [rawResponse.recommendations];
      }
      if (rawResponse.priority !== undefined || rawResponse.action_type) {
        return [rawResponse];
      }
    }
    
    // If it's a string, try to parse it
    if (typeof rawResponse !== 'string') return null;
    
    let text = rawResponse.trim();
    
    // Remove markdown code blocks if present
    if (text.includes('```json')) {
      const parts = text.split('```json');
      if (parts[1]) text = parts[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      const parts = text.split('```');
      if (parts[1]) text = parts[1].split('```')[0].trim();
    }
    if (!text) return null;
    
    // Find JSON start if there's leading text
    if (!(text.startsWith('[') || text.startsWith('{'))) {
      const startBracket = text.indexOf('[');
      const startBrace = text.indexOf('{');
      const start = startBracket === -1 ? startBrace : (startBrace === -1 ? startBracket : Math.min(startBracket, startBrace));
      if (start !== -1) {
        text = text.slice(start);
      }
    }
    
    // Try to fix truncated JSON - find last complete object in array
    const fixTruncatedJson = (jsonStr) => {
      if (!jsonStr.startsWith('[')) return jsonStr;
      
      // Find all complete objects (matching { and })
      let depth = 0;
      let lastCompleteEnd = -1;
      let inString = false;
      let escape = false;
      
      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (escape) { escape = false; continue; }
        if (char === '\\') { escape = true; continue; }
        if (char === '"' && !escape) { inString = !inString; continue; }
        if (inString) continue;
        
        if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 0) lastCompleteEnd = i;
        }
      }
      
      // If we found complete objects, truncate after the last one and close array
      if (lastCompleteEnd > 0 && depth > 0) {
        return jsonStr.slice(0, lastCompleteEnd + 1) + ']';
      }
      
      return jsonStr;
    };
    
    // First try parsing as-is
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && parsed.recommendations) return Array.isArray(parsed.recommendations) ? parsed.recommendations : [parsed.recommendations];
      if (parsed && typeof parsed === 'object') return [parsed];
      return null;
    } catch (e) {
      // Try fixing truncated JSON
      try {
        const fixed = fixTruncatedJson(text);
        const parsed = JSON.parse(fixed);
        console.log('Parsed truncated JSON, got', Array.isArray(parsed) ? parsed.length : 1, 'recommendations');
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      } catch (e2) {
        console.error('Failed to parse even after fixing:', e2.message);
      }
      return null;
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiAPI.getRecommendations(mode === 'city' ? currentCityId : null);
      console.log('AI API response:', response.data);
      
      // First, try to use recommendations if they exist and are non-empty
      if (response.data.recommendations && response.data.recommendations.length > 0) {
        setRecommendations(response.data.recommendations);
        setSystemState(response.data.system_state || null);
        setError(null);
        setErrorSuggestion(null);
        return;
      }
      
      // If there's an error but also raw_response, try to parse it
      if (response.data.error && response.data.raw_response) {
        console.log('Attempting to parse raw_response...');
        const parsed = tryParseRawRecommendations(response.data.raw_response);
        if (parsed && parsed.length > 0) {
          console.log('Successfully parsed', parsed.length, 'recommendations from raw_response');
          setRecommendations(parsed);
          setSystemState(response.data.system_state || null);
          setError(null);
          setErrorSuggestion(null);
          return;
        }
        console.log('Failed to parse raw_response');
      }
      
      // If there's an error, show it
      if (response.data.error) {
        setError(response.data.error);
        setErrorSuggestion(response.data.suggestion || null);
        if (response.data.raw_response) console.log('Raw AI response:', response.data.raw_response);
      } else {
        // No error but also no recommendations
        setErrorSuggestion(null);
        setRecommendations([]);
        setSystemState(response.data.system_state);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch AI recommendations');
      setErrorSuggestion(err.response?.data?.suggestion || null);
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  };

  const getActionIcon = (actionType) => {
    const icons = {
      load_balancing: Activity,
      demand_response: TrendingUp,
      aqi_mitigation: Wind,
      emergency: AlertTriangle,
      preventive: Shield,
      simulation: PlayCircle,
    };
    return icons[actionType] || Lightbulb;
  };

  const getActionColor = (actionType) => {
    const colors = {
      load_balancing: 'primary',
      demand_response: 'warning',
      aqi_mitigation: 'secondary',
      emergency: 'danger',
      preventive: 'purple',
      simulation: 'primary',
    };
    return colors[actionType] || 'primary';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      immediate: 'danger',
      high: 'warning',
      medium: 'primary',
      low: 'secondary',
    };
    return colors[urgency] || 'secondary';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'var(--accent-primary)';
    if (confidence >= 0.6) return 'var(--accent-warning)';
    return 'var(--accent-secondary)';
  };

  if (loading) {
    return (
      <div className="ai-recommendations-page container page">
        <div className="loading-container" style={{ minHeight: '80vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div className="spinner" />
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Analyzing System State...</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Compiling ML model outputs and generating recommendations</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-recommendations-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <div>
            <h1><Brain size={32} /> AI Recommendations</h1>
            <p>Intelligent, actionable recommendations synthesized from all ML models and system data</p>
          </div>
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
            Refresh Analysis
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          className="error-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle size={20} />
          <div>
            <strong>Error:</strong> {error}
            {errorSuggestion && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.95 }}>
                {errorSuggestion}
              </p>
            )}
            {error.includes('JSON') && !errorSuggestion && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                The AI response couldn't be parsed. Check console for raw response.
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* System State Summary */}
      {systemState && (
        <motion.div
          className="system-summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3>Current System State</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <Activity size={24} />
              <div>
                <div className="summary-value">
                  {systemState.zone_risk?.filter(z => z.risk_level === 'high').length || 0}
                </div>
                <div className="summary-label">High Risk Zones</div>
              </div>
            </div>
            <div className="summary-card">
              <AlertTriangle size={24} />
              <div>
                <div className="summary-value">
                  {systemState.alerts?.filter(a => a.level === 'emergency').length || 0}
                </div>
                <div className="summary-label">Emergency Alerts</div>
              </div>
            </div>
            <div className="summary-card">
              <Activity size={24} />
              <div>
                <div className="summary-value">
                  {systemState.anomalies?.length || 0}
                </div>
                <div className="summary-label">Anomalies Detected</div>
              </div>
            </div>
            <div className="summary-card">
              <Wind size={24} />
              <div>
                <div className="summary-value">
                  {systemState.zone_risk?.filter(z => z.aqi?.avg_aqi > 150).length || 0}
                </div>
                <div className="summary-label">Zones with High AQI</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommendations List */}
      <div className="recommendations-section">
        <h2>
          <Target size={24} />
          Prioritized Recommendations
        </h2>
        
        {recommendations.length === 0 ? (
          <div className="no-recommendations">
            <Brain size={48} />
            <p>No recommendations available. The system may be operating normally.</p>
          </div>
        ) : (
          <div className="recommendations-grid">
            {recommendations.map((rec, index) => {
              const ActionIcon = getActionIcon(rec.action_type);
              const actionColor = getActionColor(rec.action_type);
              const urgencyColor = getUrgencyColor(rec.urgency);
              
              return (
                <motion.div
                  key={index}
                  className={`recommendation-card ${actionColor} ${selectedRec === index ? 'selected' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedRec(selectedRec === index ? null : index)}
                >
                  <div className="rec-header">
                    <div className="rec-priority">
                      <span className="priority-number">{rec.priority || index + 1}</span>
                      <span className="priority-label">Priority</span>
                    </div>
                    <div className={`urgency-badge ${urgencyColor}`}>
                      {rec.urgency || 'medium'}
                    </div>
                  </div>

                  <div className="rec-content">
                    <div className="rec-icon">
                      <ActionIcon size={32} />
                    </div>
                    <h3>{rec.title || `Recommendation ${index + 1}`}</h3>
                    <p className="rec-description">
                      {rec.description || 'No description available'}
                    </p>

                    {rec.affected_zones && rec.affected_zones.length > 0 && (
                      <div className="rec-zones">
                        <strong>
                          <MapPin size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                          Affected Zones ({rec.affected_zones.length}):
                        </strong>
                        <div className="zones-list">
                          {rec.affected_zones.map((zoneId, i) => {
                            const zone = getZone(zoneId);
                            return (
                              <span key={i} className="zone-tag" title={zoneId}>
                                {formatZoneName(zoneId)}
                                {zone && zone.population_est && (
                                  <span className="zone-population">
                                    <Users size={10} /> {zone.population_est.toLocaleString()}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                        {rec.affected_zones.length > 0 && (
                          <div className="zones-summary">
                            {(() => {
                              const zonesData = rec.affected_zones.map(id => getZone(id)).filter(Boolean);
                              const totalPop = zonesData.reduce((sum, z) => sum + (z.population_est || 0), 0);
                              const criticalSites = new Set();
                              zonesData.forEach(z => {
                                (z.critical_sites || []).forEach(site => criticalSites.add(site));
                              });
                              return (
                                <>
                                  {totalPop > 0 && (
                                    <span className="summary-item">
                                      <Users size={12} /> Total Population: {totalPop.toLocaleString()}
                                    </span>
                                  )}
                                  {criticalSites.size > 0 && (
                                    <span className="summary-item">
                                      <Building2 size={12} /> Critical Sites: {Array.from(criticalSites).join(', ')}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {rec.expected_impact && (
                      <div className="rec-impact">
                        <strong>
                          <TrendingUp size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                          Expected Impact:
                        </strong>
                        <p>{rec.expected_impact}</p>
                      </div>
                    )}

                    {rec.implementation_steps && Array.isArray(rec.implementation_steps) && rec.implementation_steps.length > 0 && (
                      <div className="rec-steps">
                        <strong>
                          <ArrowRight size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                          Implementation Steps:
                        </strong>
                        <ol className="steps-list">
                          {rec.implementation_steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {rec.risks && (
                      <div className="rec-risks">
                        <strong>
                          <AlertCircle size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                          Potential Risks:
                        </strong>
                        <p>{rec.risks}</p>
                      </div>
                    )}

                    {rec.timeline && (
                      <div className="rec-timeline">
                        <strong>
                          <Clock size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                          Estimated Timeline:
                        </strong>
                        <p>{rec.timeline}</p>
                      </div>
                    )}
                  </div>

                  <div className="rec-footer">
                    <div className="rec-metrics">
                      {rec.confidence !== undefined && (
                        <div className="metric">
                          <Target size={16} />
                          <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                          <div className="confidence-bar">
                            <div
                              className="confidence-fill"
                              style={{
                                width: `${rec.confidence * 100}%`,
                                backgroundColor: getConfidenceColor(rec.confidence)
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {rec.cost_estimate && (
                        <div className="metric">
                          <DollarSign size={16} />
                          <span>Cost: {rec.cost_estimate}</span>
                        </div>
                      )}
                    </div>

                    {rec.suggested_simulation && (
                      <Link
                        to="/simulation3d"
                        className="simulation-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PlayCircle size={16} />
                        Run Simulation: {rec.suggested_simulation}
                      </Link>
                    )}
                  </div>

                  {selectedRec === index && (
                    <motion.div
                      className="rec-details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <div className="details-content">
                        <h4>
                          <Info size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />
                          Detailed Analysis
                        </h4>
                        <div className="details-grid">
                          {rec.affected_zones && rec.affected_zones.length > 0 && (
                            <div className="detail-section">
                              <h5>Zone Details</h5>
                              {rec.affected_zones.map((zoneId, i) => {
                                const zone = getZone(zoneId);
                                return zone ? (
                                  <div key={i} className="zone-detail-item">
                                    <strong>{formatZoneName(zoneId)}</strong>
                                    <div className="zone-detail-metrics">
                                      <span>Population: {zone.population_est?.toLocaleString() || 'N/A'}</span>
                                      <span>Priority: P{zone.grid_priority || 'N/A'}</span>
                                      {zone.critical_sites && zone.critical_sites.length > 0 && (
                                        <span>Critical: {zone.critical_sites.join(', ')}</span>
                                      )}
                                    </div>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                          {rec.ml_models_used && (
                            <div className="detail-section">
                              <h5>ML Models Used</h5>
                              <p>{Array.isArray(rec.ml_models_used) ? rec.ml_models_used.join(', ') : rec.ml_models_used}</p>
                            </div>
                          )}
                          {rec.data_sources && (
                            <div className="detail-section">
                              <h5>Data Sources</h5>
                              <p>{Array.isArray(rec.data_sources) ? rec.data_sources.join(', ') : rec.data_sources}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .ai-recommendations-page {
          min-height: 100vh;
          padding-bottom: 4rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
          font-size: 2rem;
        }

        .page-header p {
          color: var(--text-secondary);
          font-size: 1.125rem;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent-primary);
          color: #000;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }


        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid var(--accent-danger);
          border-radius: 12px;
          color: var(--accent-danger);
          margin-bottom: 2rem;
        }

        .system-summary {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .system-summary h3 {
          margin-bottom: 1.5rem;
          color: var(--accent-primary);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }

        .summary-card svg {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .summary-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--accent-primary);
          line-height: 1;
        }

        .summary-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .recommendations-section {
          margin-top: 2rem;
        }

        .recommendations-section h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .recommendation-card {
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .recommendation-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.2);
        }

        .recommendation-card.selected {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.2);
        }

        .recommendation-card.primary {
          border-left: 4px solid var(--accent-primary);
        }

        .recommendation-card.warning {
          border-left: 4px solid var(--accent-warning);
        }

        .recommendation-card.secondary {
          border-left: 4px solid var(--accent-secondary);
        }

        .recommendation-card.danger {
          border-left: 4px solid var(--accent-danger);
        }

        .recommendation-card.purple {
          border-left: 4px solid var(--accent-purple);
        }

        .rec-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .rec-priority {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .priority-number {
          font-size: 2rem;
          font-weight: 700;
          color: var(--accent-primary);
          line-height: 1;
        }

        .priority-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .urgency-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .urgency-badge.immediate,
        .urgency-badge.danger {
          background: rgba(255, 68, 68, 0.2);
          color: var(--accent-danger);
        }

        .urgency-badge.high,
        .urgency-badge.warning {
          background: rgba(255, 170, 0, 0.2);
          color: var(--accent-warning);
        }

        .urgency-badge.medium,
        .urgency-badge.primary {
          background: rgba(0, 255, 136, 0.2);
          color: var(--accent-primary);
        }

        .urgency-badge.low,
        .urgency-badge.secondary {
          background: rgba(0, 212, 255, 0.2);
          color: var(--accent-secondary);
        }

        .rec-content {
          margin-bottom: 1rem;
        }

        .rec-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(0, 255, 136, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }

        .rec-content h3 {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .rec-description {
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .rec-zones {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(0, 212, 255, 0.05);
          border-radius: 8px;
          border-left: 3px solid var(--accent-secondary);
        }

        .rec-zones strong {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
          color: var(--accent-secondary);
          font-size: 0.95rem;
        }

        .zones-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .zone-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.9rem;
          background: rgba(0, 212, 255, 0.15);
          border: 1px solid var(--accent-secondary);
          border-radius: 6px;
          font-size: 0.85rem;
          color: var(--accent-secondary);
          font-weight: 500;
        }

        .zone-population {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          opacity: 0.8;
          margin-left: 0.25rem;
        }

        .zones-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(0, 212, 255, 0.2);
          font-size: 0.85rem;
        }

        .summary-item {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--text-secondary);
        }

        .rec-steps, .rec-risks, .rec-timeline {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(255, 170, 0, 0.05);
          border-radius: 6px;
          border-left: 2px solid var(--accent-warning);
        }

        .rec-steps strong, .rec-risks strong, .rec-timeline strong {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
          color: var(--accent-warning);
          font-size: 0.9rem;
        }

        .steps-list {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          color: var(--text-secondary);
        }

        .steps-list li {
          margin-bottom: 0.4rem;
          line-height: 1.6;
        }

        .rec-impact {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .rec-impact strong {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .rec-impact p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .rec-footer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .rec-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .metric {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .metric svg {
          color: var(--accent-primary);
        }

        .confidence-bar {
          flex: 1;
          height: 4px;
          background: var(--bg-secondary);
          border-radius: 2px;
          overflow: hidden;
          margin-left: 0.5rem;
        }

        .confidence-fill {
          height: 100%;
          transition: width 0.3s;
        }

        .simulation-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--accent-primary);
          color: #000;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .simulation-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
        }

        .rec-details {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 2px solid var(--border-color);
        }

        .details-content {
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .details-content h4 {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          color: var(--accent-primary);
          font-size: 1.1rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .detail-section {
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          border-left: 3px solid var(--accent-secondary);
        }

        .detail-section h5 {
          color: var(--accent-secondary);
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }

        .zone-detail-item {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .zone-detail-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .zone-detail-item strong {
          display: block;
          color: var(--accent-primary);
          margin-bottom: 0.5rem;
        }

        .zone-detail-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .zone-detail-metrics span {
          display: block;
        }

        .rec-details-old {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px solid var(--border-color);
        }

        .details-content h4 {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          color: var(--accent-primary);
          font-size: 1.1rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .detail-section {
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          border-left: 3px solid var(--accent-secondary);
        }

        .detail-section h5 {
          color: var(--accent-secondary);
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }

        .zone-detail-item {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .zone-detail-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .zone-detail-item strong {
          display: block;
          color: var(--accent-primary);
          margin-bottom: 0.5rem;
        }

        .zone-detail-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .zone-detail-metrics span {
          display: block;
        }

        .no-recommendations {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .no-recommendations svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .recommendations-grid {
            grid-template-columns: 1fr;
          }

          .header-content {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
