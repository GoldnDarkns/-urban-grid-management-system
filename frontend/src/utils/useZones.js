import { useState, useEffect } from 'react';
import { dataAPI } from '../services/api';

/**
 * React hook to fetch and format zone names
 */
export function useZones() {
  const [zones, setZones] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await dataAPI.getZones();
        if (response.data && response.data.zones) {
          const zoneMap = {};
          response.data.zones.forEach(zone => {
            zoneMap[zone.id || zone._id] = zone;
          });
          setZones(zoneMap);
        }
      } catch (error) {
        console.error('Error fetching zones:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, []);

  /**
   * Format zone ID to friendly name
   */
  const formatZoneName = (zoneId, includeId = false) => {
    if (!zoneId) return 'Unknown Zone';
    
    const zone = zones[zoneId];
    if (zone && zone.name) {
      return includeId ? `${zone.name} (${zoneId})` : zone.name;
    }
    
    // Fallback: format ID nicely
    const cleanId = zoneId.replace(/^Z_?/, '').padStart(3, '0');
    return includeId ? `Zone ${cleanId} (${zoneId})` : `Zone ${cleanId}`;
  };

  /**
   * Format multiple zone IDs
   */
  const formatZoneNames = (zoneIds, includeId = false) => {
    if (!Array.isArray(zoneIds)) return [];
    return zoneIds.map(id => formatZoneName(id, includeId));
  };

  /**
   * Get zone details
   */
  const getZone = (zoneId) => {
    return zones[zoneId] || null;
  };

  return {
    zones,
    loading,
    formatZoneName,
    formatZoneNames,
    getZone
  };
}
