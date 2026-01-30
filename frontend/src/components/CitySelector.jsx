import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cityAPI, liveStreamAPI } from '../services/api';
import CityProcessingModal from './CityProcessingModal';

const FALLBACK_CITIES = [
  { id: 'nyc', name: 'New York City', state: 'NY', country: 'USA', population: 8336817, num_zones: 40 },
  { id: 'chicago', name: 'Chicago', state: 'IL', country: 'USA', population: 2693976, num_zones: 25 },
  { id: 'la', name: 'Los Angeles', state: 'CA', country: 'USA', population: 3898747, num_zones: 35 },
  { id: 'sf', name: 'San Francisco', state: 'CA', country: 'USA', population: 873965, num_zones: 12 },
  { id: 'houston', name: 'Houston', state: 'TX', country: 'USA', population: 2320268, num_zones: 25 },
  { id: 'phoenix', name: 'Phoenix', state: 'AZ', country: 'USA', population: 1680992, num_zones: 20 },
];

export default function CitySelector({ onCityChange, onProcessingStart, onProcessingComplete }) {
  const [cities, setCities] = useState([]);
  const [currentCity, setCurrentCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const processingCancelledRef = useRef(false);

  useEffect(() => {
    fetchCities();
    fetchCurrentCity();
  }, []);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener('ugms-open-city-selector', open);
    return () => window.removeEventListener('ugms-open-city-selector', open);
  }, []);

  const fetchCities = async () => {
    try {
      const res = await cityAPI.listCities();
      setCities(res.data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities(FALLBACK_CITIES);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentCity = async () => {
    try {
      const res = await cityAPI.getCurrentCity();
      const data = res.data;
      const current = data?.selected && data?.city_id ? data : null;
      setCurrentCity(current);
      if (onCityChange) onCityChange(current);
    } catch (e) {
      console.error('Error fetching current city:', e);
      setCurrentCity(null);
    }
  };

  const handleCloseModal = () => {
    processingCancelledRef.current = true;
    setProcessing(false);
    setProcessingStatus(null);
  };

  const handleCitySelect = async (cityId) => {
    processingCancelledRef.current = false;
    const selectedCity = cities.find(c => c.id === cityId);
    setProcessing(true);
    setProcessingStatus({ 
      message: 'Initializing city selection...', 
      stage: 'selecting',
      cityName: selectedCity?.name 
    });
    
    try {
      // Step 1: Selecting city (backend returns in <1s; show hint if slow)
      setProcessingStatus({ 
        message: 'Selecting city and initializing configuration...', 
        stage: 'selecting',
        cityName: selectedCity?.name 
      });
      const slowSelectHint = setTimeout(() => {
        setProcessingStatus(prev => prev?.stage === 'selecting' ? { ...prev, message: 'Taking longer than usual—please wait...' } : prev);
      }, 8000);
      const selectRes = await cityAPI.selectCity(cityId);
      clearTimeout(slowSelectHint);
      if (processingCancelledRef.current) return;
      const data = selectRes.data;

      if (data && data.success === false) {
        setProcessingStatus({
          message: `City selection failed: ${data.error || data.message}`,
          stage: 'error',
          error: data.error || data.message,
          cityName: selectedCity?.name
        });
        setTimeout(() => {
          setProcessing(false);
          setProcessingStatus(null);
        }, 5000);
        return;
      }

      // Step 2: Zones calculated (happens in selectCity)
      setProcessingStatus({ 
        message: `Calculated ${data.zones_configured || 0} zones`, 
        stage: 'zones',
        cityName: data.name 
      });
      if (processingCancelledRef.current) return;

      setCurrentCity(data);
      setIsOpen(false);
      if (onCityChange) onCityChange(data);

      if (onProcessingStart) onProcessingStart();

      let processRes = { data: { summary: { successful: 0 }, city_id: data.city_id } };
      try {
        // Step 3: Process all zones (real work: Weather, AQI, Traffic, ML, store)
        setProcessingStatus({ 
          message: 'Fetching live data (Weather, AQI, Traffic) and running ML per zone...', 
          stage: 'processing',
          cityName: data.name 
        });
        if (processingCancelledRef.current) return;
        processRes = await cityAPI.processAllZones(cityId);
        if (processingCancelledRef.current) return;
        
        // Check for DB errors in response
        if (processRes.data?.error && processRes.data?.error.includes("MongoDB")) {
          setProcessingStatus({
            message: `Database error: ${processRes.data.error}. Data was NOT saved.`,
            stage: 'error',
            error: processRes.data.error,
            cityName: data.name
          });
          setTimeout(() => {
            setProcessing(false);
            setProcessingStatus(null);
          }, 8000);
          return;
        }
        
        if (processRes.data?.db_status && processRes.data.db_status !== 'connected') {
          setProcessingStatus({
            message: `Warning: Database status: ${processRes.data.db_status}. Some data may not have been saved.`,
            stage: 'error',
            error: `DB status: ${processRes.data.db_status}`,
            cityName: data.name
          });
          setTimeout(() => {
            setProcessing(false);
            setProcessingStatus(null);
          }, 8000);
          return;
        }
      } catch (err) {
        if (processingCancelledRef.current) return;
        console.error('Process all zones error:', err);
        setProcessingStatus({
          message: `Processing failed: ${err.response?.data?.error || err.message || 'Unknown error'}`,
          stage: 'error',
          error: err.response?.data?.error || err.message,
          cityName: data.name
        });
        setTimeout(() => {
          setProcessing(false);
          setProcessingStatus(null);
        }, 5000);
        return;
      }

      // Step 4: Verify Kafka live feed (read-only check; pipeline runs separately)
      setProcessingStatus({ 
        message: 'Verifying Kafka live feed availability...', 
        stage: 'kafka',
        cityName: data.name 
      });
      if (processingCancelledRef.current) return;
      try {
        await Promise.race([
          liveStreamAPI.getLiveStream(5),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
        ]);
      } catch (_) {
        // Non-blocking: Kafka may not be running; continue
      }
      if (processingCancelledRef.current) return;

      // Step 5: EIA data
      setProcessingStatus({ 
        message: 'Processing EIA energy grid data...', 
        stage: 'eia',
        cityName: data.name 
      });
      await cityAPI.processEIA(cityId).catch((err) => console.error('EIA processing error:', err));
      if (processingCancelledRef.current) return;

      // Step 6: Complete – fire events only now so tabs refetch and see data immediately
      setProcessingStatus({
        message: `Successfully processed ${processRes.data?.summary?.successful ?? 0} zones`,
        stage: 'complete',
        data: processRes.data,
        cityName: data.name
      });

      if (onProcessingComplete) onProcessingComplete(processRes.data);
      try {
        window.dispatchEvent(new CustomEvent('ugms-city-changed', { detail: { city_id: data.city_id, name: data.name } }));
        window.dispatchEvent(new CustomEvent('ugms-city-processed', { detail: { city_id: processRes.data?.city_id ?? data.city_id, summary: processRes.data?.summary } }));
      } catch (_) {}

      setTimeout(() => {
        if (processingCancelledRef.current) return;
        setProcessingStatus(null);
        setProcessing(false);
      }, 3000);
    } catch (error) {
      if (processingCancelledRef.current) return;
      console.error('Error selecting city:', error);
      setProcessingStatus({
        message: `Error: ${error.response?.data?.error || error.response?.data?.detail || error.message || 'Network error'}`,
        stage: 'error',
        error: error.response?.data?.error || error.response?.data?.detail || error.message,
        cityName: selectedCity?.name
      });
      setTimeout(() => {
        setProcessing(false);
        setProcessingStatus(null);
      }, 5000);
    }
  };

  const handleRefresh = async () => {
    if (!currentCity) return;
    processingCancelledRef.current = false;
    const cid = currentCity.city_id;
    const cname = currentCity.name;

    try {
      setProcessing(true);
      setProcessingStatus({ message: 'Refreshing: processing all zones...', stage: 'processing', cityName: cname });
      if (onProcessingStart) onProcessingStart();

      const processRes = await cityAPI.processAllZones(cid);
      if (processingCancelledRef.current) return;

      setProcessingStatus({ message: 'Verifying Kafka live feed...', stage: 'kafka', cityName: cname });
      try {
        await Promise.race([
          liveStreamAPI.getLiveStream(5),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
        ]);
      } catch (_) {}
      if (processingCancelledRef.current) return;

      setProcessingStatus({ message: 'Processing EIA data...', stage: 'eia', cityName: cname });
      await cityAPI.processEIA(cid).catch(() => {});
      if (processingCancelledRef.current) return;

      setProcessingStatus({
        message: `Updated ${processRes.data?.summary?.successful ?? 0} zones`,
        stage: 'complete',
        data: processRes.data,
        cityName: cname
      });
      if (onProcessingComplete) onProcessingComplete(processRes.data);
      try {
        window.dispatchEvent(new CustomEvent('ugms-city-processed', { detail: { city_id: cid, summary: processRes.data?.summary } }));
      } catch (_) {}

      setTimeout(() => {
        if (processingCancelledRef.current) return;
        setProcessingStatus(null);
        setProcessing(false);
      }, 3000);
    } catch (error) {
      if (processingCancelledRef.current) return;
      console.error('Error refreshing:', error);
      setProcessingStatus({
        message: `Error: ${error.response?.data?.error ?? error.response?.data?.detail ?? error.message}`,
        stage: 'error',
        cityName: cname
      });
      setTimeout(() => { setProcessing(false); setProcessingStatus(null); }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="city-selector">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="city-selector">
      <div className="city-selector-header">
        <div className="city-selector-dropdown">
          <button
            className="city-selector-button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={processing}
          >
            <MapPin size={18} />
            <span>{currentCity?.name || 'Select City'}</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.div>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="city-selector-menu"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {cities.map((city) => (
                  <button
                    key={city.id}
                    className={`city-selector-item ${
                      currentCity?.city_id === city.id ? 'active' : ''
                    }`}
                    onClick={() => handleCitySelect(city.id)}
                    disabled={processing}
                  >
                    <div>
                      <div className="city-name">{city.name}</div>
                      <div className="city-details">
                        {city.state}, {city.country} • {city.population.toLocaleString()} people
                      </div>
                    </div>
                    {currentCity?.city_id === city.id && (
                      <CheckCircle2 size={16} className="check-icon" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {currentCity && (
          <button
            className="city-refresh-button"
            onClick={handleRefresh}
            disabled={processing}
            title="Refresh and reprocess all zones"
          >
            <RefreshCw size={18} className={processing ? 'spinning' : ''} />
          </button>
        )}
      </div>

      <CityProcessingModal
        isOpen={processing}
        onClose={handleCloseModal}
        cityName={processingStatus?.cityName || currentCity?.name}
        progress={processingStatus}
      />
    </div>
  );
}
