/**
 * DefiLlama Stablecoins API Service
 * Fetches stablecoin data per chain
 * Free API: https://stablecoins.llama.fi
 */

const BASE_URL = 'https://stablecoins.llama.fi';

// Cache to avoid repeated calls
let stablecoinChainsCache = null;
let stablecoinCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch stablecoin market cap per chain
 * Returns stablecoin TVL for each chain
 */
export async function fetchStablecoinChains() {
  const now = Date.now();
  if (stablecoinChainsCache && (now - stablecoinCacheTime) < CACHE_TTL) {
    return stablecoinChainsCache;
  }

  try {
    const response = await fetch(`${BASE_URL}/stablecoinchains`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Build a map of chain name to stablecoin market cap
    const chainMap = {};
    if (Array.isArray(data)) {
      data.forEach(chain => {
        if (chain.name) {
          chainMap[chain.name] = {
            totalCirculatingUSD: chain.totalCirculatingUSD?.peggedUSD || 0,
            totalCirculating: chain.totalCirculatingUSD || {},
          };
        }
      });
    }

    stablecoinChainsCache = chainMap;
    stablecoinCacheTime = now;
    return chainMap;
  } catch (error) {
    console.error('Error fetching stablecoin chains:', error);
    return {};
  }
}

/**
 * Get stablecoin TVL for a specific chain
 * @param {string} chainName - The chain name (DefiLlama format)
 */
export async function fetchChainStablecoinTVL(chainName) {
  try {
    const chains = await fetchStablecoinChains();

    // Try direct match first, then case-insensitive
    let data = chains[chainName];
    if (!data) {
      const key = Object.keys(chains).find(
        k => k.toLowerCase() === chainName.toLowerCase()
      );
      if (key) data = chains[key];
    }

    return data ? data.totalCirculatingUSD : 0;
  } catch (error) {
    console.error(`Error fetching stablecoin TVL for ${chainName}:`, error);
    return 0;
  }
}

/**
 * Fetch top stablecoins globally
 */
export async function fetchTopStablecoins() {
  try {
    const response = await fetch(`${BASE_URL}/stablecoins?includePrices=true`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!data.peggedAssets) return [];

    return data.peggedAssets
      .filter(s => s.circulating?.peggedUSD > 0)
      .sort((a, b) => (b.circulating?.peggedUSD || 0) - (a.circulating?.peggedUSD || 0))
      .slice(0, 10)
      .map(s => ({
        name: s.name,
        symbol: s.symbol,
        circulating: s.circulating?.peggedUSD || 0,
        price: s.price || 1,
        logo: s.logo || null,
      }));
  } catch (error) {
    console.error('Error fetching top stablecoins:', error);
    return [];
  }
}
