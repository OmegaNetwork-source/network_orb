/**
 * CoinGecko API Service
 * Fetches cryptocurrency market data
 * Free API: https://api.coingecko.com/api/v3
 * Note: Free tier has rate limits (10-50 calls/minute)
 */

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Map network names to CoinGecko IDs
const COINGECKO_IDS = {
  'Ethereum': 'ethereum',
  'Solana': 'solana',
  'Bitcoin': 'bitcoin',
  'BSC': 'binancecoin',
  'BNB Chain': 'binancecoin',
  'Avalanche': 'avalanche-2',
  'Polygon': 'matic-network',
  'Arbitrum': 'arbitrum',
  'Optimism': 'optimism',
  'Base': 'ethereum',
  'Sui': 'sui',
  'Cardano': 'cardano',
  'Tron': 'tron',
  'TON': 'the-open-network',
  'Polkadot': 'polkadot',
  'Near': 'near',
  'Fantom': 'fantom',
  'Cosmos': 'cosmos',
  'Aptos': 'aptos',
  'Cronos': 'crypto-com-chain',
  'Sei': 'sei-network',
};

/**
 * Fetch simple price data for multiple coins
 * @param {Array<string>} coinIds - Array of CoinGecko coin IDs
 * @param {Array<string>} vsCurrencies - Array of vs currencies (default: ['usd'])
 */
export async function fetchSimplePrices(coinIds, vsCurrencies = ['usd']) {
  try {
    const ids = coinIds.join(',');
    const vs = vsCurrencies.join(',');
    const response = await fetch(`${BASE_URL}/simple/price?ids=${ids}&vs_currencies=${vs}&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching CoinGecko prices:', error);
    return null;
  }
}

/**
 * Fetch coin data by ID
 * @param {string} coinId - CoinGecko coin ID
 */
export async function fetchCoinData(coinId) {
  try {
    const response = await fetch(`${BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching coin data:', error);
    return null;
  }
}

/**
 * Fetch historical price data (7 days, 30 days, 1 year)
 * @param {string} coinId - CoinGecko coin ID
 * @param {number} days - Number of days (default: 7)
 */
export async function fetchHistoricalPrice(coinId, days = 7) {
  try {
    const response = await fetch(`${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching historical price:', error);
    return null;
  }
}

/**
 * Fetch trending coins
 */
export async function fetchTrendingCoins() {
  try {
    const response = await fetch(`${BASE_URL}/search/trending`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trending coins:', error);
    return null;
  }
}

/**
 * Fetch market data for multiple coins
 * @param {Array<string>} coinIds - Array of CoinGecko coin IDs
 * @param {Object} options - Additional options (order, per_page, etc.)
 */
export async function fetchMarketData(coinIds, options = {}) {
  try {
    const ids = coinIds.join(',');
    const params = new URLSearchParams({
      vs_currency: 'usd',
      ids,
      order: options.order || 'market_cap_desc',
      per_page: options.per_page || 100,
      page: options.page || 1,
      sparkline: options.sparkline || false,
      price_change_percentage: options.price_change_percentage || '24h',
    });
    
    const response = await fetch(`${BASE_URL}/coins/markets?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching market data:', error);
    return null;
  }
}

/**
 * Get CoinGecko ID for a network
 */
export function getCoinGeckoId(networkName) {
  return COINGECKO_IDS[networkName] || null;
}

/**
 * Fetch data for a specific network
 * @param {string} networkName - Network name
 * @param {string} geckoId - Optional CoinGecko ID (from DefiLlama data)
 */
export async function fetchNetworkCoinData(networkName, geckoId = null) {
  // Try to use provided geckoId first (most reliable), then fall back to mapping
  let coinId = geckoId;
  
  // If geckoId is provided, use it directly
  if (!coinId) {
    coinId = getCoinGeckoId(networkName);
  }
  
  // Validate the coinId - ensure it's not undefined or empty
  if (!coinId || coinId.trim() === '') {
    console.warn(`No valid CoinGecko ID found for ${networkName}. Provided geckoId: ${geckoId}`);
    return null;
  }
  
  try {
    console.log(`Fetching CoinGecko data for ${networkName} (ID: ${coinId})`);
    const data = await fetchCoinData(coinId);
    if (data && data.market_data) {
      console.log(`Successfully fetched price data for ${networkName}: $${data.market_data.current_price?.usd}`);
    } else {
      console.warn(`CoinGecko data for ${networkName} (ID: ${coinId}) missing market_data`);
    }
    return data;
  } catch (error) {
    console.error(`Error fetching CoinGecko data for ${networkName} (ID: ${coinId}):`, error);
    return null;
  }
}
