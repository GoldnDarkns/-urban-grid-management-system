import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import TronBackground from './components/TronBackground';
import Home from './pages/Home';
import Data from './pages/Data';
import Analytics from './pages/Analytics';
import TFT from './pages/TFT';
import LSTM from './pages/LSTM';
import Autoencoder from './pages/Autoencoder';
import GNN from './pages/GNN';
import Insights from './pages/Insights';
import CityMap from './pages/CityMap';
import Simulation from './pages/Simulation';
import Simulation3D from './pages/Simulation3D';
import ModelComparison from './pages/ModelComparison';
import Reports from './pages/Reports';
import AdvancedViz from './pages/AdvancedViz';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import AIRecommendations from './pages/AIRecommendations';
import Guide from './pages/Guide';
import IncidentReports from './pages/IncidentReports';
import AdminQueries from './pages/AdminQueries';
import AdminData from './pages/AdminData';
import Cost from './pages/Cost';
import LiveStream from './pages/LiveStream';
import ScenarioConsole from './pages/ScenarioConsole';
import ScenarioBank from './pages/ScenarioBank';
function AppLayout() {
  // Main app first: always Home + Navbar. City select/change via dropdown + processing popup.
  return (
    <div className="app">
      <TronBackground />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/select-city" element={<Navigate to="/" replace />} />
          <Route path="/citymap" element={<CityMap />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/simulation3d" element={<Simulation3D />} />
          <Route path="/data" element={<Data />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/tft" element={<TFT />} />
          <Route path="/lstm" element={<LSTM />} />
          <Route path="/autoencoder" element={<Autoencoder />} />
          <Route path="/gnn" element={<GNN />} />
          <Route path="/comparison" element={<ModelComparison />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/visualizations" element={<AdvancedViz />} />
          <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
          <Route path="/ai-recommendations" element={<AIRecommendations />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/incidents" element={<IncidentReports />} />
          <Route path="/cost" element={<Cost />} />
          <Route path="/live-stream" element={<LiveStream />} />
          <Route path="/scenario-console" element={<ScenarioConsole />} />
          <Route path="/scenario-bank" element={<ScenarioBank />} />
          <Route path="/admin/queries" element={<AdminQueries />} />
          <Route path="/admin/data" element={<AdminData />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/select-city" element={<AppLayout />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
