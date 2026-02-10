/**
 * DefiLlama Yields API Service
 * Fetches yield/APY data for DeFi pools per chain
 * Free API: https://yields.llama.fi
 */

const BASE_URL = 'https://yields.llama.fi';

// Cache
let poolsCache = null;
let poolsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all yield pools (cached)
 */
async function fetchAllPools() {
  const now = Date.now();
  if (poolsCache && (now - poolsCacheTime) < CACHE_TTL) {
    return poolsCache;
  }

  try {
    const response = await fetch(`${BASE_URL}/pools`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    poolsCache = data.data || [];
    poolsCacheTime = now;
    return poolsCache;
  } catch (error) {
    console.error('Error fetching yield pools:', error);
    return [];
  }
}

/**
 * Get top yield opportunities for a specific chain
 * @param {string} chainName - Chain name (e.g., 'Ethereum', 'Solana')
 * @param {number} limit - Max number of pools to return
 */
export async function fetchChainTopYields(chainName, limit = 5) {
  try {
    const pools = await fetchAllPools();

    // Filter for this chain, only TVL > $1M and reasonable APY
    const chainPools = pools
      .filter(pool =>
        pool.chain &&
        pool.chain.toLowerCase() === chainName.toLowerCase() &&
        pool.tvlUsd > 1000000 &&
        pool.apy > 0 &&
        pool.apy < 1000 // Filter out unrealistic APYs
      )
      .sort((a, b) => b.tvlUsd - a.tvlUsd) // Sort by TVL for safety
      .slice(0, limit);

    return chainPools.map(pool => ({
      pool: pool.pool,
      project: pool.project,
      symbol: pool.symbol,
      chain: pool.chain,
      apy: pool.apy,
      apyBase: pool.apyBase || 0,
      apyReward: pool.apyReward || 0,
      tvlUsd: pool.tvlUsd,
      stablecoin: pool.stablecoin || false,
    }));
  } catch (error) {
    console.error(`Error fetching yields for ${chainName}:`, error);
    return [];
  }
}

/**
 * Get aggregate yield stats for a chain
 * @param {string} chainName - Chain name
 */
export async function fetchChainYieldStats(chainName) {
  try {
    const pools = await fetchAllPools();

    const chainPools = pools.filter(pool =>
      pool.chain &&
      pool.chain.toLowerCase() === chainName.toLowerCase() &&
      pool.tvlUsd > 0
    );

    if (chainPools.length === 0) {
      return null;
    }

    const totalTvl = chainPools.reduce((sum, p) => sum + (p.tvlUsd || 0), 0);
    const apys = chainPools.filter(p => p.apy > 0 && p.apy < 1000).map(p => p.apy);
    const avgApy = apys.length > 0 ? apys.reduce((a, b) => a + b, 0) / apys.length : 0;

    // Weighted average APY (by TVL)
    const weightedSum = chainPools
      .filter(p => p.apy > 0 && p.apy < 1000)
      .reduce((sum, p) => sum + (p.apy * (p.tvlUsd || 0)), 0);
    const weightedAvgApy = totalTvl > 0 ? weightedSum / totalTvl : 0;

    return {
      poolCount: chainPools.length,
      totalYieldTvl: totalTvl,
      avgApy: avgApy,
      weightedAvgApy: weightedAvgApy,
      medianApy: apys.length > 0 ? apys.sort((a, b) => a - b)[Math.floor(apys.length / 2)] : 0,
    };
  } catch (error) {
    console.error(`Error fetching yield stats for ${chainName}:`, error);
    return null;
  }
}
