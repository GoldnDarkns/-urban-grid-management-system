import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import TronBackground from './components/TronBackground';
import Home from './pages/Home';
import Data from './pages/Data';
import Analytics from './pages/Analytics';
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
import CitySelect from './pages/CitySelect';
import AdminQueries from './pages/AdminQueries';
import { useAppMode } from './utils/useAppMode';
import WhatIf from './pages/WhatIf';

function AppLayout() {
  const location = useLocation();
  const { mode } = useAppMode();
  const isSelectCity = location.pathname === '/select-city';
  const hasCity = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('city_selected');

  if (isSelectCity) {
    return (
      <div className="app">
        <TronBackground />
        <CitySelect />
      </div>
    );
  }

  // In SIM mode, we don't require selecting a real city first.
  if (mode !== 'sim' && !hasCity) {
    return <Navigate to="/select-city" replace />;
  }

  return (
    <div className="app">
      <TronBackground />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/citymap" element={<CityMap />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/simulation3d" element={<Simulation3D />} />
          <Route path="/data" element={<Data />} />
          <Route path="/analytics" element={<Analytics />} />
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
          <Route path="/whatif" element={<WhatIf />} />
          <Route path="/admin/queries" element={<AdminQueries />} />
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
