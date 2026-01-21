import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import Guide from './pages/Guide';
import IncidentReports from './pages/IncidentReports';

function App() {
  return (
    <Router>
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
            <Route path="/guide" element={<Guide />} />
            <Route path="/incidents" element={<IncidentReports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
