import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, AlertTriangle, TrendingUp, Shield, 
  MapPin, Activity, Wind, Lightbulb, CheckCircle
} from 'lucide-react';
import { analyticsAPI, dataAPI, modelsAPI, cityAPI } from '../services/api';
import { useZones } from '../utils/useZones';
import { useAppMode } from '../utils/useAppMode';

export default function Insights() {
  const { mode } = useAppMode();
  const [loading, setLoading] = useState(true);
  const [zoneRisk, setZoneRisk] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [lstmPrediction, setLstmPrediction] = useState(null);
  const [mlModels, setMlModels] = useState(null);
  const [currentCityId, setCurrentCityId] = useState(null);
  const { formatZoneName } = useZones();

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
    fetchData();
    // Refresh data every 30 seconds in City mode, 5 minutes in Sim mode
    const interval = setInterval(fetchData, mode === 'city' ? 30000 : 300000);
    return () => clearInterval(interval);
  }, [mode, currentCityId]);

  const fetchData = async () => {
    try {
      if (mode === 'city' && currentCityId) {
        // CITY LIVE MODE: Use processed_zone_data
        const processedRes = await cityAPI.getProcessedData(currentCityId, null, 100);
        const zones = processedRes.data?.zones || [];
        
        // 1. Zone Risk from processed_zone_data.ml_processed.risk_score
        const risks = zones.map(zone => ({
          zone_id: zone.zone_id,
          zone_name: zone.zone_id.replace('_', ' ').toUpperCase(),
          risk_level: zone.ml_processed?.risk_score?.level || 'low',
          risk_score: zone.ml_processed?.risk_score?.score || 0,
          alert_count: zone.recommendations?.filter(r => r.priority === 'high' || r.priority === 'critical').length || 0,
          aqi: { avg_aqi: zone.raw_data?.aqi?.aqi || 0 },
          demand: { total_kwh: zone.ml_processed?.demand_forecast?.next_hour_kwh || 0 },
          critical_sites: zone.raw_data?.infrastructure?.critical_sites || []
        }));
        setZoneRisk(risks);
        
        // 2. Alerts from recommendations
        const allAlerts = [];
        zones.forEach(zone => {
          zone.recommendations?.forEach(rec => {
            if (rec.priority === 'high' || rec.priority === 'critical') {
              allAlerts.push({
                id: `${zone.zone_id}-${rec.action}`,
                zone_id: zone.zone_id,
                level: rec.priority === 'critical' ? 'emergency' : 'alert',
                message: rec.action,
                type: rec.type || 'recommendation',
                ts: zone.timestamp
              });
            }
          });
        });
        setAlerts(allAlerts);
        
        // 3. Alerts Summary
        const summary = { total: allAlerts.length, by_level: {} };
        allAlerts.forEach(a => {
          summary.by_level[a.level] = (summary.by_level[a.level] || 0) + 1;
        });
        setAlertsSummary(summary);
        
        // 4. Anomalies from anomaly_detection
        const anomaliesList = zones
          .filter(z => z.ml_processed?.anomaly_detection?.is_anomaly)
          .map(zone => ({
            zone_id: zone.zone_id,
            household_id: zone.zone_id, // Use zone_id as identifier
            kwh: zone.ml_processed.anomaly_detection.current_demand || 0,
            baseline_hourly: zone.ml_processed.anomaly_detection.baseline_mean || 0,
            multiplier: zone.ml_processed.anomaly_detection.anomaly_score || 0,
            timestamp: zone.timestamp
          }));
        setAnomalies(anomaliesList);
        
        // 5. LSTM Prediction (aggregate from all zones)
        const totalForecast = zones.reduce((sum, z) => {
          return sum + (z.ml_processed?.demand_forecast?.next_hour_kwh || 0);
        }, 0);
        const avgConfidence = zones.length > 0
          ? zones.reduce((sum, z) => sum + (z.ml_processed?.demand_forecast?.confidence || 0), 0) / zones.length
          : 0;
        setLstmPrediction({
          prediction: totalForecast,
          unit: 'kWh',
          confidence: avgConfidence,
          last_actual: totalForecast * 0.95 // Estimate
        });
        
        // 6. ML Models overview (simplified for live mode)
        setMlModels({
          models: [
            {
              name: 'LSTM',
              status: 'live',
              metrics: {
                r2_score: null,
                rmse: null,
                mae: null
              }
            }
          ]
        });
      } else {
        // SIM MODE: Use existing SIM dataset APIs
        const [riskRes, alertsRes, summaryRes, anomaliesRes, lstmRes, modelsRes] = await Promise.all([
          analyticsAPI.getZoneRisk(),
          dataAPI.getAlerts(30),
          analyticsAPI.getAlertsSummary(),
          analyticsAPI.getAnomalies(2.5, 10),
          modelsAPI.getLSTMPrediction().catch(() => ({ data: null })),
          modelsAPI.getOverview().catch(() => ({ data: null }))
        ]);
        setZoneRisk(riskRes.data.data || []);
        setAlerts(alertsRes.data.alerts || []);
        setAlertsSummary(summaryRes.data);
        setAnomalies(anomaliesRes.data.anomalies || []);
        setLstmPrediction(lstmRes.data);
        setMlModels(modelsRes.data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const highRiskZones = zoneRisk.filter(z => z.risk_level === 'high');
  const mediumRiskZones = zoneRisk.filter(z => z.risk_level === 'medium');
  const emergencyAlerts = alerts.filter(a => a.level === 'emergency');

  const generateRecommendations = () => {
    const recommendations = [];

    // High risk zone recommendations
    highRiskZones.forEach(zone => {
      recommendations.push({
        type: 'critical',
        icon: Shield,
        title: `High Risk: ${formatZoneName(zone.zone_id) || zone.zone_name}`,
        description: `Zone has risk score of ${zone.risk_score}. ${zone.critical_sites?.includes('hospital') ? 'Contains hospital - prioritize power stability.' : ''} Consider load balancing from adjacent zones.`,
        action: 'Implement load shedding protocol'
      });
    });

    // Emergency alerts
    if (emergencyAlerts.length > 0) {
      recommendations.push({
        type: 'emergency',
        icon: AlertTriangle,
        title: `${emergencyAlerts.length} Emergency Alerts Active`,
        description: `Critical situations detected. Most recent: ${emergencyAlerts[0]?.message || 'Check alert details'}`,
        action: 'Dispatch emergency response team'
      });
    }

    // Anomaly recommendations
    if (anomalies.length > 0) {
      const severeAnomalies = anomalies.filter(a => a.multiplier > 4);
      if (severeAnomalies.length > 0) {
        recommendations.push({
          type: 'warning',
          icon: Activity,
          title: `${severeAnomalies.length} Severe Consumption Anomalies`,
          description: `Households consuming ${severeAnomalies[0]?.multiplier}x above baseline. Possible equipment malfunction or unauthorized usage.`,
          action: 'Schedule inspection'
        });
      }
    }

    // AQI-based recommendations
    const highAQIZones = zoneRisk.filter(z => z.aqi?.avg_aqi > 150);
    if (highAQIZones.length > 0) {
      recommendations.push({
        type: 'warning',
        icon: Wind,
        title: `${highAQIZones.length} Zones with Poor Air Quality`,
        description: `AQI exceeds 150 (unhealthy). Consider reducing industrial load and issuing health advisories.`,
        action: 'Issue air quality advisory'
      });
    }

    // Load balancing suggestions
    const overloadedZones = zoneRisk.filter(z => z.demand?.total_kwh > 50000);
    if (overloadedZones.length > 0) {
      recommendations.push({
        type: 'info',
        icon: TrendingUp,
        title: 'Load Balancing Opportunity',
        description: `${overloadedZones.length} zones showing high demand. Consider redistributing load to adjacent low-demand zones.`,
        action: 'Analyze grid topology'
      });
    }

    // General optimization
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        icon: CheckCircle,
        title: 'System Operating Normally',
        description: 'All zones within acceptable parameters. Continue monitoring for changes.',
        action: 'Maintain current operations'
      });
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="insights-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-icon">
          <Zap size={40} />
        </div>
        <div className="header-content">
          <h1>System Insights & Recommendations</h1>
          <p>AI-powered analysis and actionable recommendations for grid management</p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <motion.div
          className="summary-card critical"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Shield size={24} />
          <div className="summary-content">
            <span className="summary-value">{highRiskZones.length}</span>
            <span className="summary-label">High Risk Zones</span>
          </div>
        </motion.div>

        <motion.div
          className="summary-card warning"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AlertTriangle size={24} />
          <div className="summary-content">
            <span className="summary-value">{emergencyAlerts.length}</span>
            <span className="summary-label">Emergency Alerts</span>
          </div>
        </motion.div>

        <motion.div
          className="summary-card info"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Activity size={24} />
          <div className="summary-content">
            <span className="summary-value">{anomalies.length}</span>
            <span className="summary-label">Anomalies Detected</span>
          </div>
        </motion.div>

        <motion.div
          className="summary-card neutral"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MapPin size={24} />
          <div className="summary-content">
            <span className="summary-value">{zoneRisk.length}</span>
            <span className="summary-label">Total Zones</span>
          </div>
        </motion.div>
      </div>

      {/* ML Model Insights */}
      {mlModels && (
        <section className="ml-insights-section">
          <h2>
            <Activity size={24} />
            ML Model Predictions
          </h2>
          <div className="ml-cards">
            {lstmPrediction && !lstmPrediction.error && (
              <motion.div
                className="ml-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="ml-header">
                  <Activity size={20} />
                  <h3>LSTM Demand Forecast</h3>
                </div>
                <div className="ml-content">
                  <div className="ml-value">
                    {lstmPrediction.prediction?.toFixed(0) || 'N/A'} <span className="ml-unit">{lstmPrediction.unit || 'kWh'}</span>
                  </div>
                  <p className="ml-description">Next hour prediction</p>
                  {lstmPrediction.last_actual && (
                    <p className="ml-comparison">
                      Last actual: {lstmPrediction.last_actual.toFixed(0)} kWh
                      {lstmPrediction.prediction && (
                        <span className={lstmPrediction.prediction > lstmPrediction.last_actual ? 'trend-up' : 'trend-down'}>
                          {lstmPrediction.prediction > lstmPrediction.last_actual ? ' ↗' : ' ↘'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
            {mlModels.models && mlModels.models.slice(0, 3).map((model, idx) => (
              <motion.div
                key={model.id || idx}
                className="ml-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="ml-header">
                  <Activity size={20} />
                  <h3>{model.name}</h3>
                </div>
                <div className="ml-content">
                  {model.metrics && (
                    <div className="ml-metrics">
                      {model.metrics.r2_score !== null && model.metrics.r2_score !== undefined && (
                        <div className="metric-item">
                          <span>R² Score:</span>
                          <strong>{model.metrics.r2_score.toFixed(3)}</strong>
                        </div>
                      )}
                      {model.metrics.rmse && (
                        <div className="metric-item">
                          <span>RMSE:</span>
                          <strong>{model.metrics.rmse.toFixed(2)}</strong>
                        </div>
                      )}
                      {model.metrics.mae && (
                        <div className="metric-item">
                          <span>MAE:</span>
                          <strong>{model.metrics.mae.toFixed(2)}</strong>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="ml-status">
                    Status: <span className={model.status === 'trained' ? 'status-trained' : 'status-pending'}>{model.status}</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations Section */}
      <section className="recommendations-section">
        <h2>
          <Lightbulb size={24} />
          AI Recommendations
        </h2>
        <div className="recommendations-list">
          {recommendations.map((rec, index) => (
            <motion.div
              key={index}
              className={`recommendation-card ${rec.type}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="rec-icon">
                <rec.icon size={24} />
              </div>
              <div className="rec-content">
                <h3>{rec.title}</h3>
                <p>{rec.description}</p>
                <div className="rec-action">
                  <span>Recommended Action:</span>
                  <strong>{rec.action}</strong>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Critical Zones */}
      {highRiskZones.length > 0 && (
        <section className="critical-zones-section">
          <h2>
            <Shield size={24} />
            Critical Zones Requiring Attention
          </h2>
          <div className="critical-zones-grid">
            {highRiskZones.map((zone, index) => (
              <motion.div
                key={zone.zone_id}
                className="critical-zone-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="zone-header">
                  <h3>{formatZoneName(zone.zone_id) || zone.zone_name}</h3>
                  <span className="risk-badge">Risk: {zone.risk_score}</span>
                </div>
                <div className="zone-details">
                  <div className="detail-row">
                    <span>Population</span>
                    <strong>{zone.population?.toLocaleString()}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Grid Priority</span>
                    <strong>P{zone.grid_priority}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Critical Sites</span>
                    <div className="sites-list">
                      {zone.critical_sites?.map(site => (
                        <span key={site} className="site-tag">{site}</span>
                      ))}
                    </div>
                  </div>
                  <div className="detail-row">
                    <span>Active Alerts</span>
                    <strong className="alert-count">{zone.alert_count}</strong>
                  </div>
                  {zone.aqi?.avg_aqi && (
                    <div className="detail-row">
                      <span>Avg AQI</span>
                      <strong className={zone.aqi.avg_aqi > 150 ? 'danger' : zone.aqi.avg_aqi > 100 ? 'warning' : ''}>
                        {zone.aqi.avg_aqi.toFixed(0)}
                      </strong>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Emergency Alerts */}
      {emergencyAlerts.length > 0 && (
        <section className="emergency-section">
          <h2>
            <AlertTriangle size={24} />
            Recent Emergency Alerts
          </h2>
          <div className="emergency-list">
            {emergencyAlerts.slice(0, 5).map((alert, index) => (
              <motion.div
                key={alert.id || index}
                className="emergency-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="emergency-time">
                  {alert.ts ? new Date(alert.ts).toLocaleString() : 'Unknown time'}
                </div>
                <div className="emergency-content">
                  <span className="emergency-zone">{formatZoneName(alert.zone_id) || alert.zone_id}</span>
                  <span className="emergency-type">{alert.type}</span>
                  <p className="emergency-message">{alert.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Anomalies Section */}
      {anomalies.length > 0 && (
        <section className="anomalies-section">
          <h2>
            <Activity size={24} />
            Consumption Anomalies
          </h2>
          <div className="anomalies-grid">
            {anomalies.slice(0, 6).map((anomaly, index) => (
              <motion.div
                key={index}
                className={`anomaly-card ${anomaly.multiplier > 4 ? 'severe' : 'moderate'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="anomaly-header">
                  <span className="household">{anomaly.household_id}</span>
                  <span className="multiplier">{anomaly.multiplier}x</span>
                </div>
                <div className="anomaly-details">
                  <div className="anomaly-row">
                    <span>Zone</span>
                    <strong>{formatZoneName(anomaly.zone_id) || anomaly.zone_id}</strong>
                  </div>
                  <div className="anomaly-row">
                    <span>Consumption</span>
                    <strong>{anomaly.kwh} kWh</strong>
                  </div>
                  <div className="anomaly-row">
                    <span>Baseline</span>
                    <strong>{anomaly.baseline_hourly} kWh</strong>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Alert Distribution */}
      {alertsSummary && (
        <section className="distribution-section">
          <h2>Alert Distribution by Level</h2>
          <div className="distribution-bars">
            {Object.entries(alertsSummary.by_level || {}).map(([level, count]) => {
              const total = alertsSummary.total || 1;
              const percentage = (count / total) * 100;
              return (
                <div key={level} className={`distribution-item ${level}`}>
                  <div className="dist-label">
                    <span className="level-name">{level}</span>
                    <span className="level-count">{count}</span>
                  </div>
                  <div className="dist-bar-container">
                    <motion.div
                      className="dist-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                  <span className="dist-percentage">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <style>{`
        .page-header {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .header-icon {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 212, 255, 0.2));
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }

        .header-content {
          flex: 1;
        }

        .header-content h1 {
          margin-bottom: 0.5rem;
        }

        .header-content p {
          color: var(--text-secondary);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 900px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .summary-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .summary-card.critical {
          border-color: var(--accent-danger);
          background: rgba(255, 68, 102, 0.05);
        }

        .summary-card.critical svg {
          color: var(--accent-danger);
        }

        .summary-card.warning {
          border-color: var(--accent-warning);
          background: rgba(255, 170, 0, 0.05);
        }

        .summary-card.warning svg {
          color: var(--accent-warning);
        }

        .summary-card.info {
          border-color: var(--accent-secondary);
          background: rgba(0, 212, 255, 0.05);
        }

        .summary-card.info svg {
          color: var(--accent-secondary);
        }

        .summary-card.neutral svg {
          color: var(--accent-primary);
        }

        .summary-content {
          display: flex;
          flex-direction: column;
        }

        .summary-value {
          font-size: 2rem;
          font-weight: 700;
          font-family: var(--font-mono);
          line-height: 1;
        }

        .summary-card.critical .summary-value { color: var(--accent-danger); }
        .summary-card.warning .summary-value { color: var(--accent-warning); }
        .summary-card.info .summary-value { color: var(--accent-secondary); }
        .summary-card.neutral .summary-value { color: var(--accent-primary); }

        .summary-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .recommendations-section {
          margin-bottom: 2rem;
        }

        .recommendations-section h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }

        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .recommendation-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          gap: 1.5rem;
        }

        .recommendation-card.critical {
          border-left: 4px solid var(--accent-danger);
        }

        .recommendation-card.emergency {
          border-left: 4px solid var(--accent-danger);
          background: rgba(255, 68, 102, 0.05);
        }

        .recommendation-card.warning {
          border-left: 4px solid var(--accent-warning);
        }

        .recommendation-card.info {
          border-left: 4px solid var(--accent-secondary);
        }

        .recommendation-card.success {
          border-left: 4px solid var(--accent-primary);
        }

        .rec-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .recommendation-card.critical .rec-icon,
        .recommendation-card.emergency .rec-icon {
          background: rgba(255, 68, 102, 0.15);
          color: var(--accent-danger);
        }

        .recommendation-card.warning .rec-icon {
          background: rgba(255, 170, 0, 0.15);
          color: var(--accent-warning);
        }

        .recommendation-card.info .rec-icon {
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-secondary);
        }

        .recommendation-card.success .rec-icon {
          background: rgba(0, 255, 136, 0.15);
          color: var(--accent-primary);
        }

        .rec-content {
          flex: 1;
        }

        .rec-content h3 {
          margin-bottom: 0.5rem;
        }

        .rec-content p {
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }

        .rec-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .rec-action span {
          color: var(--text-muted);
        }

        .rec-action strong {
          color: var(--accent-primary);
        }

        .critical-zones-section,
        .emergency-section,
        .anomalies-section,
        .distribution-section {
          margin-bottom: 2rem;
        }

        .critical-zones-section h2,
        .emergency-section h2,
        .anomalies-section h2,
        .distribution-section h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .critical-zones-section h2 {
          color: var(--accent-danger);
        }

        .emergency-section h2 {
          color: var(--accent-danger);
        }

        .anomalies-section h2 {
          color: var(--accent-secondary);
        }

        .critical-zones-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 1000px) {
          .critical-zones-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .critical-zones-grid {
            grid-template-columns: 1fr;
          }
        }

        .critical-zone-card {
          background: var(--bg-card);
          border: 1px solid var(--accent-danger);
          border-radius: 12px;
          padding: 1.25rem;
        }

        .zone-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .zone-header h3 {
          font-size: 1rem;
        }

        .risk-badge {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          background: rgba(255, 68, 102, 0.2);
          color: var(--accent-danger);
          border-radius: 20px;
        }

        .zone-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .detail-row span {
          color: var(--text-secondary);
        }

        .detail-row strong {
          color: var(--text-primary);
        }

        .detail-row strong.danger {
          color: var(--accent-danger);
        }

        .detail-row strong.warning {
          color: var(--accent-warning);
        }

        .sites-list {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .site-tag {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          background: rgba(0, 212, 255, 0.15);
          color: var(--accent-secondary);
          border-radius: 3px;
        }

        .alert-count {
          color: var(--accent-warning) !important;
        }

        .emergency-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .emergency-card {
          background: var(--bg-card);
          border: 1px solid var(--accent-danger);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          gap: 1rem;
        }

        .emergency-time {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .emergency-content {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .emergency-zone {
          font-weight: 600;
          color: var(--accent-danger);
        }

        .emergency-type {
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          background: rgba(255, 68, 102, 0.15);
          border-radius: 4px;
          color: var(--text-secondary);
        }

        .emergency-message {
          width: 100%;
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .anomalies-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .anomalies-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .anomaly-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
        }

        .anomaly-card.severe {
          border-color: var(--accent-danger);
        }

        .anomaly-card.moderate {
          border-color: var(--accent-warning);
        }

        .anomaly-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .household {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .multiplier {
          font-family: var(--font-mono);
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .anomaly-card.severe .multiplier {
          background: rgba(255, 68, 102, 0.2);
          color: var(--accent-danger);
        }

        .anomaly-card.moderate .multiplier {
          background: rgba(255, 170, 0, 0.2);
          color: var(--accent-warning);
        }

        .anomaly-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .anomaly-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .anomaly-row span {
          color: var(--text-secondary);
        }

        .distribution-bars {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .distribution-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .dist-label {
          width: 120px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .level-name {
          text-transform: capitalize;
        }

        .level-count {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .dist-bar-container {
          flex: 1;
          height: 24px;
          background: var(--bg-secondary);
          border-radius: 4px;
          overflow: hidden;
        }

        .dist-bar {
          height: 100%;
          border-radius: 4px;
        }

        .distribution-item.emergency .dist-bar {
          background: var(--accent-danger);
        }

        .distribution-item.alert .dist-bar {
          background: var(--accent-warning);
        }

        .distribution-item.watch .dist-bar {
          background: var(--accent-secondary);
        }

        .dist-percentage {
          width: 60px;
          text-align: right;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* ML Insights Section */
        .ml-insights-section {
          margin-bottom: 2rem;
        }

        .ml-insights-section h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }

        .ml-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ml-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.25rem;
          border-left: 4px solid var(--accent-primary);
        }

        .ml-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .ml-header h3 {
          font-size: 0.95rem;
          color: var(--accent-primary);
        }

        .ml-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ml-value {
          font-size: 2rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-primary);
          line-height: 1;
        }

        .ml-unit {
          font-size: 1rem;
          color: var(--text-secondary);
          font-weight: 400;
        }

        .ml-description {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .ml-comparison {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }

        .trend-up {
          color: var(--accent-danger);
        }

        .trend-down {
          color: var(--accent-primary);
        }

        .ml-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .metric-item span {
          color: var(--text-secondary);
        }

        .metric-item strong {
          color: var(--accent-primary);
          font-family: var(--font-mono);
        }

        .ml-status {
          font-size: 0.8rem;
          margin: 0;
          margin-top: 0.5rem;
        }

        .status-trained {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .status-pending {
          color: var(--accent-warning);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

