/**
 * Zone Name Formatter Utility
 * Converts technical zone IDs (Z_001, Z005) to user-friendly display names
 */

// Cache for zone data to avoid repeated API calls
let zoneCache = null;
let zoneCacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch zones from API and cache them
 */
async function fetchZones() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (zoneCache && zoneCacheTimestamp && (now - zoneCacheTimestamp) < CACHE_DURATION) {
    return zoneCache;
  }
  
  try {
    const response = await fetch('/api/data/zones');
    const data = await response.json();
    
    if (data.zones && Array.isArray(data.zones)) {
      // Create a map for quick lookup
      const zoneMap = {};
      data.zones.forEach(zone => {
        zoneMap[zone.id || zone._id] = zone;
      });
      
      zoneCache = zoneMap;
      zoneCacheTimestamp = now;
      return zoneMap;
    }
  } catch (error) {
    console.error('Error fetching zones:', error);
  }
  
  return zoneCache || {};
}

/**
 * Format zone ID to user-friendly name
 * @param {string} zoneId - Zone ID (e.g., "Z_001", "Z005")
 * @param {boolean} includeId - Whether to include ID in parentheses
 * @returns {string} Formatted zone name (e.g., "Downtown" or "Downtown (Z_001)")
 */
export async function formatZoneName(zoneId, includeId = false) {
  if (!zoneId) return 'Unknown Zone';
  
  const zones = await fetchZones();
  const zone = zones[zoneId];
  
  if (zone && zone.name) {
    return includeId ? `${zone.name} (${zoneId})` : zone.name;
  }
  
  // Fallback: format the ID nicely
  const cleanId = zoneId.replace(/^Z_?/, '').padStart(3, '0');
  return includeId ? `Zone ${cleanId} (${zoneId})` : `Zone ${cleanId}`;
}

/**
 * Format multiple zone IDs
 * @param {string[]} zoneIds - Array of zone IDs
 * @param {boolean} includeId - Whether to include ID in parentheses
 * @returns {Promise<string[]>} Array of formatted zone names
 */
export async function formatZoneNames(zoneIds, includeId = false) {
  if (!Array.isArray(zoneIds) || zoneIds.length === 0) return [];
  
  const zones = await fetchZones();
  
  return zoneIds.map(zoneId => {
    const zone = zones[zoneId];
    if (zone && zone.name) {
      return includeId ? `${zone.name} (${zoneId})` : zone.name;
    }
    const cleanId = zoneId.replace(/^Z_?/, '').padStart(3, '0');
    return includeId ? `Zone ${cleanId} (${zoneId})` : `Zone ${cleanId}`;
  });
}

/**
 * Get zone details by ID
 * @param {string} zoneId - Zone ID
 * @returns {Promise<object|null>} Zone object or null
 */
export async function getZoneDetails(zoneId) {
  const zones = await fetchZones();
  return zones[zoneId] || null;
}

/**
 * React hook for formatting zone names
 */
export function useZoneFormatter() {
  const [zones, setZones] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    fetchZones().then(zoneMap => {
      setZones(zoneMap);
      setLoading(false);
    });
  }, []);
  
  const formatZone = React.useCallback((zoneId, includeId = false) => {
    if (!zoneId) return 'Unknown Zone';
    
    const zone = zones[zoneId];
    if (zone && zone.name) {
      return includeId ? `${zone.name} (${zoneId})` : zone.name;
    }
    
    const cleanId = zoneId.replace(/^Z_?/, '').padStart(3, '0');
    return includeId ? `Zone ${cleanId} (${zoneId})` : `Zone ${cleanId}`;
  }, [zones]);
  
  const formatZones = React.useCallback((zoneIds, includeId = false) => {
    if (!Array.isArray(zoneIds)) return [];
    return zoneIds.map(id => formatZone(id, includeId));
  }, [formatZone]);
  
  return { formatZone, formatZones, zones, loading };
}
