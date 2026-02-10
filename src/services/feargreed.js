/**
 * Fear & Greed Index API Service
 * Fetches crypto market sentiment data
 * Free API: https://api.alternative.me/fng/
 */

const BASE_URL = 'https://api.alternative.me/fng';

// Cache
let fngCache = null;
let fngCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (updates once a day anyway)

/**
 * Fetch current Fear & Greed Index
 * Returns value 0-100 and classification
 */
export async function fetchFearGreedIndex() {
  const now = Date.now();
  if (fngCache && (now - fngCacheTime) < CACHE_TTL) {
    return fngCache;
  }

  try {
    const response = await fetch(`${BASE_URL}/?limit=7&format=json`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const current = data.data[0];
    const previous = data.data.length > 1 ? data.data[1] : null;
    const weekAgo = data.data.length >= 7 ? data.data[6] : null;

    const result = {
      value: parseInt(current.value),
      classification: current.value_classification,
      timestamp: current.timestamp,
      previousValue: previous ? parseInt(previous.value) : null,
      previousClassification: previous ? previous.value_classification : null,
      weekAgoValue: weekAgo ? parseInt(weekAgo.value) : null,
      change24h: previous ? parseInt(current.value) - parseInt(previous.value) : null,
      change7d: weekAgo ? parseInt(current.value) - parseInt(weekAgo.value) : null,
    };

    fngCache = result;
    fngCacheTime = now;
    return result;
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    return null;
  }
}

/**
 * Get color for Fear & Greed value
 * @param {number} value - 0-100
 */
export function getFearGreedColor(value) {
  if (value <= 25) return '#ea3943'; // Extreme Fear - red
  if (value <= 45) return '#ea8c00'; // Fear - orange
  if (value <= 55) return '#f5d100'; // Neutral - yellow
  if (value <= 75) return '#16c784'; // Greed - green
  return '#16c784'; // Extreme Greed - bright green
}
