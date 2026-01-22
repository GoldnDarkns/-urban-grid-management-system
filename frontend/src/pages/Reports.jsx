import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Calendar, Filter, BarChart3,
  Activity, Wind, AlertTriangle, Building2, Zap,
  FileSpreadsheet, File, Clock, CheckCircle, Loader
} from 'lucide-react';
import { analyticsAPI, dataAPI, modelsAPI } from '../services/api';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const [generating, setGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [reportData, setReportData] = useState({
    demand: null,
    aqi: null,
    zones: null,
    models: null,
    alerts: null
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [demandRes, aqiRes, zonesRes, modelsRes, alertsRes] = await Promise.all([
        analyticsAPI.getHourlyDemand(null, 168).catch(() => ({ data: null })),
        analyticsAPI.getAQIByZone().catch(() => ({ data: null })),
        dataAPI.getZones().catch(() => ({ data: null })),
        modelsAPI.getOverview().catch(() => ({ data: null })),
        analyticsAPI.getAlertsSummary().catch(() => ({ data: null }))
      ]);
      
      setReportData({
        demand: demandRes.data,
        aqi: aqiRes.data,
        zones: zonesRes.data,
        models: modelsRes.data,
        alerts: alertsRes.data
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  const reportTypes = [
    {
      id: 'demand',
      name: 'Energy Demand Report',
      icon: Zap,
      color: '#00ff88',
      description: 'Comprehensive analysis of energy demand patterns, peak hours, and zone-wise consumption.',
      metrics: ['Total Consumption', 'Peak Demand', 'Average Load', 'Zone Breakdown']
    },
    {
      id: 'aqi',
      name: 'Air Quality Report',
      icon: Wind,
      color: '#00d4ff',
      description: 'Air quality index trends, pollution levels, and health impact assessment.',
      metrics: ['Average AQI', 'Hazardous Days', 'Zone Rankings', 'Pollutant Breakdown']
    },
    {
      id: 'alerts',
      name: 'Alerts & Incidents Report',
      icon: AlertTriangle,
      color: '#ffaa00',
      description: 'Summary of all alerts, anomalies, and incident responses during the period.',
      metrics: ['Total Alerts', 'By Severity', 'Response Times', 'Resolution Rate']
    },
    {
      id: 'zones',
      name: 'Zone Performance Report',
      icon: Building2,
      color: '#aa66ff',
      description: 'Individual zone analysis including risk scores, demand patterns, and recommendations.',
      metrics: ['Risk Scores', 'Efficiency Rating', 'Compliance', 'Recommendations']
    },
    {
      id: 'models',
      name: 'Model Performance Report',
      icon: Activity,
      color: '#ff4466',
      description: 'ML model accuracy metrics, prediction errors, and performance trends.',
      metrics: ['RMSE', 'MAE', 'R² Score', 'Prediction Accuracy']
    },
    {
      id: 'executive',
      name: 'Executive Summary',
      icon: BarChart3,
      color: '#66aaff',
      description: 'High-level overview for stakeholders with key metrics and insights.',
      metrics: ['KPIs', 'Trends', 'Highlights', 'Action Items']
    }
  ];

  const dateRanges = [
    { id: '24h', label: 'Last 24 Hours' },
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
    { id: 'custom', label: 'Custom Range' }
  ];

  const recentReports = [
    { name: 'Energy Demand Report', date: '2026-01-14', format: 'PDF', size: '2.4 MB' },
    { name: 'Weekly Executive Summary', date: '2026-01-12', format: 'PDF', size: '1.8 MB' },
    { name: 'Zone Performance Data', date: '2026-01-10', format: 'CSV', size: '856 KB' },
    { name: 'Alerts Summary', date: '2026-01-08', format: 'PDF', size: '1.2 MB' },
  ];

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    setGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Create downloadable content
    const report = reportTypes.find(r => r.id === selectedReport);
    const content = generateReportContent(report, dateRange);
    
    if (exportFormat === 'csv') {
      downloadCSV(content, report.name);
    } else {
      // For PDF, we'd normally use a library like jsPDF
      // For now, download as text
      downloadText(content, report.name);
    }
    
    setGenerating(false);
  };

  const generateReportContent = (report, range) => {
    const now = new Date();
    const header = `
================================================================================
                    URBAN GRID MANAGEMENT SYSTEM
                         ${report.name.toUpperCase()}
================================================================================
Generated: ${now.toLocaleString()}
Period: ${dateRanges.find(d => d.id === range)?.label || range}
--------------------------------------------------------------------------------

`;
    
    let content = header;
    
    if (report.id === 'demand') {
      // Use real demand data
      const demandData = reportData.demand?.data || [];
      const totalConsumption = demandData.reduce((sum, d) => sum + (d.total_kwh || 0), 0);
      const peakDemand = Math.max(...demandData.map(d => d.total_kwh || 0), 0);
      const avgLoad = demandData.length > 0 ? totalConsumption / demandData.length : 0;
      const loadFactor = peakDemand > 0 ? (avgLoad / peakDemand * 100) : 0;

      // Get zone-wise data
      const zoneData = reportData.zones?.zones || [];
      const zoneBreakdown = zoneData.slice(0, 5).map(zone => {
        const zoneDemand = demandData.filter(d => d.zone_id === zone._id);
        const zoneTotal = zoneDemand.reduce((sum, d) => sum + (d.total_kwh || 0), 0);
        const zonePeak = Math.max(...zoneDemand.map(d => d.total_kwh || 0), 0);
        return {
          id: zone._id,
          name: zone.name || zone._id,
          total: zoneTotal,
          peak: zonePeak,
          efficiency: zonePeak > 0 ? (zoneTotal / (zonePeak * 24) * 100) : 0
        };
      });

      content += `
ENERGY DEMAND SUMMARY
=====================

Total Consumption:     ${totalConsumption.toFixed(0)} kWh
Peak Demand:           ${peakDemand.toFixed(0)} kW
Average Load:          ${avgLoad.toFixed(0)} kW
Load Factor:           ${loadFactor.toFixed(1)}%

ZONE-WISE BREAKDOWN
-------------------
Zone ID     | Consumption (kWh) | Peak (kW) | Efficiency
------------|-------------------|-----------|------------
${zoneBreakdown.map(z => `${z.id.padEnd(11)} | ${z.total.toFixed(0).padStart(17)} | ${z.peak.toFixed(0).padStart(9)} | ${z.efficiency.toFixed(1).padStart(9)}%`).join('\n')}

PEAK HOURS ANALYSIS
-------------------
[Based on ${demandData.length} hours of data]

RECOMMENDATIONS
---------------
1. Consider load shifting from evening peak to off-peak hours
2. Monitor zones with high peak demand
3. Investigate anomalous consumption patterns
`;
    } else if (report.id === 'aqi') {
      // Use real AQI data
      const aqiData = reportData.aqi?.data || {};
      const aqiValues = Object.values(aqiData).map(z => z.avg_aqi || 0).filter(v => v > 0);
      const avgAQI = aqiValues.length > 0 ? aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length : 0;
      const maxAQI = Math.max(...aqiValues, 0);
      const hazardousDays = aqiValues.filter(v => v > 200).length;
      const goodDays = aqiValues.filter(v => v <= 50).length;

      // Zone rankings
      const zoneRankings = Object.entries(aqiData)
        .map(([zoneId, data]) => ({ zoneId, aqi: data.avg_aqi || 0 }))
        .sort((a, b) => a.aqi - b.aqi)
        .slice(0, 5);

      content += `
AIR QUALITY SUMMARY
===================

Average AQI:           ${avgAQI.toFixed(0)}
Max AQI Recorded:      ${maxAQI.toFixed(0)}
Hazardous Days:        ${hazardousDays}
Good Air Quality Days: ${goodDays}

ZONE RANKINGS (Best to Worst)
-----------------------------
${zoneRankings.map((z, i) => `${i + 1}. Zone ${z.zoneId} - Avg AQI: ${z.aqi.toFixed(0)}`).join('\n')}
`;
    } else if (report.id === 'models') {
      // Use real ML model metrics
      const models = reportData.models?.models || [];
      content += `
MODEL PERFORMANCE REPORT
========================

ML MODEL METRICS
----------------
${models.map(m => `
${m.name}
${'='.repeat(50)}
Type: ${m.type}
Status: ${m.status}
${m.metrics ? `
R² Score: ${m.metrics.r2_score !== null && m.metrics.r2_score !== undefined ? m.metrics.r2_score.toFixed(4) : 'N/A'}
RMSE: ${m.metrics.rmse ? m.metrics.rmse.toFixed(2) : 'N/A'}
MAE: ${m.metrics.mae ? m.metrics.mae.toFixed(2) : 'N/A'}
${m.metrics.mape ? `MAPE: ${m.metrics.mape.toFixed(2)}%` : ''}
` : 'Metrics not available'}
`).join('\n')}
`;
    } else if (report.id === 'alerts') {
      // Use real alerts data
      const alerts = reportData.alerts;
      const total = alerts?.total || 0;
      const byLevel = alerts?.by_level || {};
      
      content += `
ALERTS & INCIDENTS SUMMARY
===========================

Total Alerts:          ${total}
By Severity:
  Emergency:           ${byLevel.emergency || 0}
  Alert:               ${byLevel.alert || 0}
  Watch:               ${byLevel.watch || 0}

Generated by Urban Grid Management System
`;
    } else {
      content += `
REPORT DATA
===========

This report contains analysis for: ${report.name}
Metrics included: ${report.metrics.join(', ')}

Generated by Urban Grid Management System
For questions, contact: admin@urbangrid.system
`;
    }
    
    return content;
  };

  const downloadCSV = (content, name) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadText = (content, name) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1>
            <FileText size={32} />
            Reports & Export
          </h1>
          <p>Generate comprehensive reports and export data for analysis</p>
        </div>
      </motion.div>

      <div className="reports-layout">
        {/* Report Selection */}
        <div className="report-selection">
          <h3>Select Report Type</h3>
          <div className="report-grid">
            {reportTypes.map((report) => (
              <motion.div
                key={report.id}
                className={`report-card ${selectedReport === report.id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(report.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ '--report-color': report.color }}
              >
                <div className="report-icon" style={{ background: report.color }}>
                  <report.icon size={24} color="#000" />
                </div>
                <div className="report-info">
                  <h4>{report.name}</h4>
                  <p>{report.description}</p>
                  <div className="report-metrics">
                    {report.metrics.map((m, i) => (
                      <span key={i} className="metric-tag">{m}</span>
                    ))}
                  </div>
                </div>
                {selectedReport === report.id && (
                  <div className="selected-check">
                    <CheckCircle size={20} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="config-panel">
          <h3>Report Configuration</h3>
          
          <div className="config-section">
            <label><Calendar size={16} /> Date Range</label>
            <div className="date-options">
              {dateRanges.map((range) => (
                <button
                  key={range.id}
                  className={`date-btn ${dateRange === range.id ? 'active' : ''}`}
                  onClick={() => setDateRange(range.id)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className="config-section">
            <label><FileText size={16} /> Export Format</label>
            <div className="format-options">
              <button
                className={`format-btn ${exportFormat === 'pdf' ? 'active' : ''}`}
                onClick={() => setExportFormat('pdf')}
              >
                <File size={20} />
                <span>PDF Report</span>
              </button>
              <button
                className={`format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
                onClick={() => setExportFormat('csv')}
              >
                <FileSpreadsheet size={20} />
                <span>CSV Data</span>
              </button>
            </div>
          </div>

          <button 
            className="generate-btn"
            onClick={handleGenerateReport}
            disabled={!selectedReport || generating}
          >
            {generating ? (
              <>
                <Loader size={20} className="spin" />
                Generating...
              </>
            ) : (
              <>
                <Download size={20} />
                Generate & Download
              </>
            )}
          </button>

          {/* Recent Reports */}
          <div className="recent-reports">
            <h4><Clock size={16} /> Recent Reports</h4>
            <div className="recent-list">
              {recentReports.map((report, i) => (
                <div key={i} className="recent-item">
                  <div className="recent-info">
                    <span className="recent-name">{report.name}</span>
                    <span className="recent-date">{report.date}</span>
                  </div>
                  <div className="recent-meta">
                    <span className="recent-format">{report.format}</span>
                    <span className="recent-size">{report.size}</span>
                  </div>
                  <button className="download-btn">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Export Section */}
      <div className="quick-export">
        <h3>Quick Data Export</h3>
        <div className="export-buttons">
          <button className="export-btn" onClick={() => downloadCSV('zone_id,name,population,grid_priority\nZ_001,Downtown,15000,5\nZ_002,Industrial,8000,4', 'zones_data')}>
            <Building2 size={18} />
            Export Zones
          </button>
          <button className="export-btn" onClick={() => downloadCSV('timestamp,zone_id,total_kwh\n2026-01-15T00:00,Z_001,450\n2026-01-15T01:00,Z_001,420', 'meter_readings')}>
            <Zap size={18} />
            Export Meter Data
          </button>
          <button className="export-btn" onClick={() => downloadCSV('timestamp,zone_id,aqi,pm25,pm10\n2026-01-15,Z_001,85,42,65', 'aqi_data')}>
            <Wind size={18} />
            Export AQI Data
          </button>
          <button className="export-btn" onClick={() => downloadCSV('timestamp,zone_id,level,type,message\n2026-01-15T10:30,Z_003,warning,demand,High demand detected', 'alerts')}>
            <AlertTriangle size={18} />
            Export Alerts
          </button>
        </div>
      </div>

      <style>{`
        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: var(--text-secondary);
        }

        .reports-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 1000px) {
          .reports-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Report Selection */
        .report-selection h3,
        .config-panel h3 {
          font-size: 1rem;
          margin-bottom: 1rem;
          color: var(--accent-secondary);
        }

        .report-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (max-width: 700px) {
          .report-grid {
            grid-template-columns: 1fr;
          }
        }

        .report-card {
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .report-card:hover {
          border-color: var(--report-color);
        }

        .report-card.selected {
          border-color: var(--report-color);
          background: color-mix(in srgb, var(--report-color) 10%, var(--bg-card));
          box-shadow: 0 0 20px color-mix(in srgb, var(--report-color) 30%, transparent);
        }

        .report-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .report-info h4 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .report-info p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .report-metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .metric-tag {
          padding: 0.2rem 0.5rem;
          background: var(--bg-secondary);
          border-radius: 4px;
          font-size: 0.65rem;
          color: var(--text-secondary);
        }

        .selected-check {
          position: absolute;
          top: 1rem;
          right: 1rem;
          color: var(--report-color);
        }

        /* Config Panel */
        .config-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .config-section {
          margin-bottom: 1.5rem;
        }

        .config-section label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .date-options {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .date-btn {
          padding: 0.5rem 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .date-btn:hover {
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }

        .date-btn.active {
          background: rgba(0, 212, 255, 0.15);
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }

        .format-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .format-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .format-btn:hover {
          border-color: var(--accent-primary);
        }

        .format-btn.active {
          background: rgba(0, 255, 136, 0.1);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .format-btn span {
          font-size: 0.75rem;
        }

        .generate-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border: none;
          border-radius: 8px;
          color: #000;
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s;
          margin-bottom: 1.5rem;
        }

        .generate-btn:hover:not(:disabled) {
          box-shadow: 0 0 30px rgba(0, 255, 136, 0.4);
          transform: translateY(-2px);
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Recent Reports */
        .recent-reports h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .recent-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .recent-info {
          flex: 1;
        }

        .recent-name {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .recent-date {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .recent-meta {
          text-align: right;
        }

        .recent-format {
          display: block;
          font-size: 0.65rem;
          color: var(--accent-secondary);
          font-weight: 600;
        }

        .recent-size {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        .download-btn {
          padding: 0.5rem;
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .download-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        /* Quick Export */
        .quick-export {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .quick-export h3 {
          font-size: 1rem;
          margin-bottom: 1rem;
          color: var(--accent-secondary);
        }

        .export-buttons {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 800px) {
          .export-buttons {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .export-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.1);
        }
      `}</style>
    </div>
  );
}

