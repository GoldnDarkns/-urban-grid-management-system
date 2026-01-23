import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw, CheckCircle2, Loader } from 'lucide-react';
import { cityAPI } from '../services/api';
import CityProcessingModal from './CityProcessingModal';

export default function CitySelector({ onCityChange, onProcessingStart, onProcessingComplete }) {
  const [cities, setCities] = useState([]);
  const [currentCity, setCurrentCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCities();
    fetchCurrentCity();
  }, []);

  const fetchCities = async () => {
    try {
      const res = await cityAPI.listCities();
      setCities(res.data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentCity = async () => {
    try {
      const res = await cityAPI.getCurrentCity();
      setCurrentCity(res.data);
      if (onCityChange) {
        onCityChange(res.data);
      }
    } catch (error) {
      console.error('Error fetching current city:', error);
    }
  };

  const handleCitySelect = async (cityId) => {
    const selectedCity = cities.find(c => c.id === cityId);
    setProcessing(true);
    setProcessingStatus({ 
      message: 'Initializing city selection...', 
      stage: 'selecting',
      cityName: selectedCity?.name 
    });
    
    try {
      // Step 1: Selecting city
      setProcessingStatus({ 
        message: 'Selecting city and initializing configuration...', 
        stage: 'selecting',
        cityName: selectedCity?.name 
      });
      
      const selectRes = await cityAPI.selectCity(cityId);
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
      
      // Step 3: Reverse geocoding (happens during zone calculation)
      setProcessingStatus({ 
        message: 'Fetching real neighborhood names from coordinates...', 
        stage: 'geocoding',
        cityName: data.name 
      });
      
      // Wait a bit to show geocoding step (it happens in backend)
      await new Promise(resolve => setTimeout(resolve, 500));

      setCurrentCity(data);
      setIsOpen(false);
      if (onCityChange) onCityChange(data);
      try {
        window.dispatchEvent(new CustomEvent('ugms-city-changed', { detail: { city_id: data.city_id, name: data.name } }));
      } catch (_) {}

      if (onProcessingStart) onProcessingStart();

      // Process all zones (this does all the API fetching and ML processing)
      // Update progress as we go
      let processRes = { data: { summary: { successful: 0 } } };
      try {
        // Start processing - show API fetching steps
        setProcessingStatus({ 
          message: 'Fetching weather data from OpenWeatherMap...', 
          stage: 'weather',
          cityName: data.name 
        });
        await new Promise(resolve => setTimeout(resolve, 800));

        setProcessingStatus({ 
          message: 'Fetching air quality data from AirVisual...', 
          stage: 'aqi',
          cityName: data.name 
        });
        await new Promise(resolve => setTimeout(resolve, 800));

        setProcessingStatus({ 
          message: 'Fetching traffic data from TomTom...', 
          stage: 'traffic',
          cityName: data.name 
        });
        await new Promise(resolve => setTimeout(resolve, 800));

        // Start actual processing (this will take time)
        const processPromise = cityAPI.processAllZones(cityId);
        
        // Show ML processing steps while waiting
        setTimeout(() => {
          setProcessingStatus({ 
            message: 'Running LSTM model for demand forecasting...', 
            stage: 'lstm',
            cityName: data.name 
          });
        }, 1000);

        setTimeout(() => {
          setProcessingStatus({ 
            message: 'Running Autoencoder for anomaly detection...', 
            stage: 'autoencoder',
            cityName: data.name 
          });
        }, 2000);

        setTimeout(() => {
          setProcessingStatus({ 
            message: 'Running GNN for zone risk scoring...', 
            stage: 'gnn',
            cityName: data.name 
          });
        }, 3000);

        setTimeout(() => {
          setProcessingStatus({ 
            message: 'Running ARIMA for statistical forecasting...', 
            stage: 'arima',
            cityName: data.name 
          });
        }, 4000);

        setTimeout(() => {
          setProcessingStatus({ 
            message: 'Running Prophet for seasonal analysis...', 
            stage: 'prophet',
            cityName: data.name 
          });
        }, 5000);

        processRes = await processPromise;
      } catch (err) {
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

      // Step 12: AI Recommendations
      setProcessingStatus({ 
        message: 'Generating AI-powered recommendations...', 
        stage: 'recommendations',
        cityName: data.name 
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 13: EIA Data
      setProcessingStatus({ 
        message: 'Processing EIA energy grid data...', 
        stage: 'eia',
        cityName: data.name 
      });
      
      await cityAPI.processEIA(cityId).catch((err) => console.error('EIA processing error:', err));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 14: Complete
      setProcessingStatus({
        message: `Successfully processed ${processRes.data?.summary?.successful ?? 0} zones`,
        stage: 'complete',
        data: processRes.data,
        cityName: data.name
      });

      if (onProcessingComplete) onProcessingComplete(processRes.data);
      try {
        window.dispatchEvent(new CustomEvent('ugms-city-processed', { detail: { city_id: processRes.data?.city_id, summary: processRes.data?.summary } }));
      } catch (_) {}

      setTimeout(() => {
        setProcessingStatus(null);
        setProcessing(false);
      }, 3000);
    } catch (error) {
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
    
    try {
      setProcessing(true);
      setProcessingStatus({ 
        message: 'Refreshing data and reprocessing...', 
        stage: 'processing' 
      });

      if (onProcessingStart) {
        onProcessingStart();
      }

      const processRes = await cityAPI.processAllZones(currentCity.city_id);
      
      setProcessingStatus({
        message: `✅ Updated ${processRes.data.summary?.successful || 0} zones`,
        stage: 'complete',
        data: processRes.data
      });

      if (onProcessingComplete) {
        onProcessingComplete(processRes.data);
      }

      setTimeout(() => {
        setProcessingStatus(null);
        setProcessing(false);
      }, 3000);

    } catch (error) {
      console.error('Error refreshing:', error);
      setProcessingStatus({
        message: `❌ Error: ${error.response?.data?.detail || error.message}`,
        stage: 'error'
      });
      setProcessing(false);
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
        onClose={() => {
          if (processingStatus?.stage === 'complete' || processingStatus?.stage === 'error') {
            setProcessing(false);
            setProcessingStatus(null);
          }
        }}
        cityName={processingStatus?.cityName || currentCity?.name}
        progress={processingStatus}
      />
    </div>
  );
}
