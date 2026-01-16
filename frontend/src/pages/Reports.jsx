import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Calendar, Filter, BarChart3,
  Activity, Wind, AlertTriangle, Building2, Zap,
  FileSpreadsheet, File, Clock, CheckCircle, Loader
} from 'lucide-react';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const [generating, setGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

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
      content += `
ENERGY DEMAND SUMMARY
=====================

Total Consumption:     ${(Math.random() * 50000 + 100000).toFixed(0)} kWh
Peak Demand:           ${(Math.random() * 2000 + 3000).toFixed(0)} kW
Average Load:          ${(Math.random() * 500 + 800).toFixed(0)} kW
Load Factor:           ${(Math.random() * 20 + 70).toFixed(1)}%

ZONE-WISE BREAKDOWN
-------------------
Zone ID     | Consumption (kWh) | Peak (kW) | Efficiency
------------|-------------------|-----------|------------
Z_001       | ${(Math.random() * 5000 + 8000).toFixed(0)}           | ${(Math.random() * 200 + 300).toFixed(0)}      | ${(Math.random() * 15 + 80).toFixed(1)}%
Z_002       | ${(Math.random() * 5000 + 8000).toFixed(0)}           | ${(Math.random() * 200 + 300).toFixed(0)}      | ${(Math.random() * 15 + 80).toFixed(1)}%
Z_003       | ${(Math.random() * 5000 + 8000).toFixed(0)}           | ${(Math.random() * 200 + 300).toFixed(0)}      | ${(Math.random() * 15 + 80).toFixed(1)}%
Z_004       | ${(Math.random() * 5000 + 8000).toFixed(0)}           | ${(Math.random() * 200 + 300).toFixed(0)}      | ${(Math.random() * 15 + 80).toFixed(1)}%
Z_005       | ${(Math.random() * 5000 + 8000).toFixed(0)}           | ${(Math.random() * 200 + 300).toFixed(0)}      | ${(Math.random() * 15 + 80).toFixed(1)}%

PEAK HOURS ANALYSIS
-------------------
Morning Peak:  07:00 - 09:00 (${(Math.random() * 500 + 2500).toFixed(0)} kW avg)
Evening Peak:  18:00 - 21:00 (${(Math.random() * 500 + 2800).toFixed(0)} kW avg)
Off-Peak:      02:00 - 05:00 (${(Math.random() * 200 + 400).toFixed(0)} kW avg)

RECOMMENDATIONS
---------------
1. Consider load shifting from evening peak to off-peak hours
2. Zone Z_003 shows potential for demand response programs
3. Investigate anomalous consumption in Zone Z_005
`;
    } else if (report.id === 'aqi') {
      content += `
AIR QUALITY SUMMARY
===================

Average AQI:           ${(Math.random() * 50 + 80).toFixed(0)}
Max AQI Recorded:      ${(Math.random() * 100 + 150).toFixed(0)}
Hazardous Days:        ${Math.floor(Math.random() * 5)}
Good Air Quality Days: ${Math.floor(Math.random() * 10 + 15)}

POLLUTANT BREAKDOWN
-------------------
Pollutant   | Average | Max   | Trend
------------|---------|-------|--------
PM2.5       | ${(Math.random() * 30 + 40).toFixed(1)}    | ${(Math.random() * 50 + 80).toFixed(1)}  | Stable
PM10        | ${(Math.random() * 40 + 60).toFixed(1)}    | ${(Math.random() * 60 + 100).toFixed(1)}  | Decreasing
NO2         | ${(Math.random() * 20 + 30).toFixed(1)}    | ${(Math.random() * 30 + 50).toFixed(1)}  | Increasing
SO2         | ${(Math.random() * 10 + 15).toFixed(1)}    | ${(Math.random() * 15 + 25).toFixed(1)}  | Stable
CO          | ${(Math.random() * 1 + 0.5).toFixed(2)}     | ${(Math.random() * 1 + 1).toFixed(2)}   | Stable
O3          | ${(Math.random() * 30 + 40).toFixed(1)}    | ${(Math.random() * 40 + 60).toFixed(1)}  | Seasonal

ZONE RANKINGS (Best to Worst)
-----------------------------
1. Zone Z_012 - Avg AQI: ${(Math.random() * 20 + 50).toFixed(0)}
2. Zone Z_008 - Avg AQI: ${(Math.random() * 20 + 60).toFixed(0)}
3. Zone Z_015 - Avg AQI: ${(Math.random() * 20 + 70).toFixed(0)}
...
18. Zone Z_003 - Avg AQI: ${(Math.random() * 30 + 110).toFixed(0)}
19. Zone Z_007 - Avg AQI: ${(Math.random() * 30 + 120).toFixed(0)}
20. Zone Z_019 - Avg AQI: ${(Math.random() * 30 + 130).toFixed(0)}
`;
    } else {
      content += `
REPORT DATA
===========

This report contains analysis for: ${report.name}
Metrics included: ${report.metrics.join(', ')}

[Detailed data would be included here based on actual database queries]

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

