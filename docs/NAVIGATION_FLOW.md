# Navigation Flow - Logical User Journey

## 🗺️ Navigation Order (Left to Right)

The navigation bar is organized in a logical sequence that guides users through the system:

### **1. Home** (`/`)
**Purpose:** System overview and entry point
- Real-time statistics
- System architecture diagram
- Quick status indicators
- Feature overview

### **2. Guide** (`/guide`)
**Purpose:** Learn about the system
- Complete documentation
- Data flow explanation
- Page-by-page guide
- System outputs

### **3. Data** (`/data`)
**Purpose:** View raw data
- MongoDB collection explorer
- Zone details
- Alert history
- Grid structure

### **4. Analytics** (`/analytics`)
**Purpose:** Basic analytics and trends
- Real-time demand charts
- AQI analysis
- Correlation matrix
- Anomaly timeline

### **5. Advanced Analytics** (`/advanced-analytics`)
**Purpose:** Deep technical dive
- **All 5 ML Models:** LSTM, Autoencoder, GNN, ARIMA, Prophet
- **10 MongoDB Queries:** Execute and explore database queries
- Model comparison
- Technical details

### **6. AI Recommendations** (`/ai-recommendations`)
**Purpose:** Actionable intelligence (comes AFTER Advanced Analytics)
- **AI Synthesis:** Gemini AI analyzes all ML outputs
- Prioritized recommendations
- Cost-benefit analysis
- Simulation suggestions
- Confidence scores

### **7. Insights** (`/insights`)
**Purpose:** Rule-based recommendations
- Risk-based actions
- Alert summaries
- Anomaly insights

### **8. Incidents** (`/incidents`)
**Purpose:** Incident management
- NLP-powered classification
- Incident tracking
- Trend analysis

### **9. City Map** (`/citymap`)
**Purpose:** Geographic visualization
- Interactive 2D map
- Zone locations
- Risk visualization

### **10. 3D City** (`/simulation3d`)
**Purpose:** 3D visualization
- 3D city model
- Energy flow
- Risk propagation

### **11. Advanced Visualizations** (`/visualizations`)
**Purpose:** Advanced data viz
- Recovery timelines
- Heatmaps
- Network flow

### **12. Reports** (`/reports`)
**Purpose:** Generate reports
- Exportable reports
- Documentation

---

## 🔄 Logical Flow Explanation

### **Phase 1: Understanding (Home → Guide)**
- Start with overview
- Learn how the system works

### **Phase 2: Data Exploration (Data → Analytics)**
- View raw data
- See basic analytics

### **Phase 3: Deep Analysis (Advanced Analytics)**
- Explore ML models
- Execute MongoDB queries
- Understand technical details

### **Phase 4: Actionable Intelligence (AI Recommendations)**
- **After understanding the models**, get AI-synthesized recommendations
- Prioritized actions based on all ML outputs
- This is the **culmination** of all analysis

### **Phase 5: Operations (Insights → Incidents)**
- View insights
- Manage incidents

### **Phase 6: Visualization (City Map → 3D → Viz)**
- Geographic views
- 3D models
- Advanced visualizations

### **Phase 7: Documentation (Reports)**
- Generate reports

---

## ✅ Why This Order Makes Sense

1. **Home** - Entry point, overview
2. **Guide** - Learn before diving in
3. **Data** - See what data exists
4. **Analytics** - Understand patterns
5. **Advanced Analytics** - Deep technical dive (ML models, queries)
6. **AI Recommendations** - **Synthesized intelligence** (requires understanding from Advanced Analytics)
7. **Insights** - Additional rule-based insights
8. **Incidents** - Operational management
9. **City Map** - Geographic context
10. **3D City** - 3D visualization
11. **Viz** - Advanced visualizations
12. **Reports** - Documentation

**Key Point:** AI Recommendations comes **after** Advanced Analytics because:
- Users need to understand the ML models first
- AI Recommendations synthesizes outputs from those models
- It's the "final answer" that combines everything

---

## 🔧 Technical Implementation

- Navigation items are sorted by `order` property
- Guide page reflects the same order
- Data flow documentation updated
- All pages documented in sequence
