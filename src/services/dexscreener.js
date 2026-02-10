/**
 * DexScreener API Service
 * Fetches token price and trading data
 * Free API: https://api.dexscreener.com/latest/dex
 */

const BASE_URL = 'https://api.dexscreener.com/latest/dex';

// Map network names to DexScreener chain IDs
export const DEXSCREENER_CHAIN_MAP = {
  'Ethereum': 'ethereum',
  'Solana': 'solana',
  'Bitcoin': 'bitcoin',
  'BSC': 'bsc',
  'BNB Chain': 'bsc',
  'Avalanche': 'avalanche',
  'Polygon': 'polygon',
  'Arbitrum': 'arbitrum',
  'Optimism': 'optimism',
  'Base': 'base',
  'Sui': 'sui',
  'Tron': 'tron',
  'TON': 'ton',
  'Near': 'near',
  'Fantom': 'fantom',
  'Aptos': 'aptos',
  'Cronos': 'cronos',
  'Sei': 'sei',
  'Cardano': 'cardano',
  'Polkadot': 'polkadot',
  'Cosmos': 'cosmoshub',
};

/**
 * Fetch token data by address
 * @param {string} chain - Chain name (e.g., 'ethereum', 'bsc', 'solana')
 * @param {string} address - Token contract address
 */
export async function fetchTokenData(chain, address) {
  try {
    const response = await fetch(`${BASE_URL}/tokens/${address}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching DexScreener data:', error);
    return null;
  }
}

/**
 * Fetch pair data
 * @param {string} chain - Chain name
 * @param {string} token0Address - First token address
 * @param {string} token1Address - Second token address
 */
export async function fetchPairData(chain, token0Address, token1Address) {
  try {
    const response = await fetch(`${BASE_URL}/pairs/${chain}/${token0Address}/${token1Address}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching pair data:', error);
    return null;
  }
}

/**
 * Search for tokens
 * @param {string} query - Search query (token name, symbol, or address)
 */
export async function searchTokens(query) {
  try {
    const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching tokens:', error);
    return null;
  }
}

/**
 * Fetch token data by chain and address
 * @param {string} chainId - Chain ID (e.g., 'ethereum', 'bsc', 'solana')
 * @param {string} tokenAddress - Token contract address
 */
export async function fetchTokenByAddress(chainId, tokenAddress) {
  try {
    const response = await fetch(`${BASE_URL}/tokens/${tokenAddress}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    
    // Find the pair for the specific chain
    if (data.pairs && Array.isArray(data.pairs)) {
      const chainPair = data.pairs.find(pair => 
        pair.chainId === chainId || 
        pair.chainId?.toLowerCase() === chainId.toLowerCase()
      );
      
      if (chainPair) {
        return {
          price: chainPair.priceUsd || chainPair.priceNative || '0',
          priceChange24h: chainPair.priceChange?.h24 || 0,
          volume24h: chainPair.volume?.h24 || 0,
          liquidity: chainPair.liquidity?.usd || 0,
          fdv: chainPair.fdv || 0,
          pairAddress: chainPair.pairAddress,
          dexId: chainPair.dexId,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching token by address:', error);
    return null;
  }
}

/**
 * Get top pairs for a chain
 * @param {string} chainId - Chain ID
 */
export async function fetchTopPairs(chainId) {
  try {
    const response = await fetch(`${BASE_URL}/pairs/${chainId}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.pairs?.slice(0, 10) || []; // Top 10 pairs
  } catch (error) {
    console.error('Error fetching top pairs:', error);
    return null;
  }
}

/**
 * Get total DEX liquidity for a chain by aggregating top pairs
 * @param {string} chainId - Chain ID (e.g., 'ethereum', 'solana', 'bsc')
 */
export async function fetchChainTotalLiquidity(chainId) {
  try {
    const response = await fetch(`${BASE_URL}/pairs/${chainId}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    
    if (!data.pairs || !Array.isArray(data.pairs)) {
      return null;
    }
    
    // Aggregate liquidity from all pairs on this chain
    let totalLiquidity = 0;
    data.pairs.forEach(pair => {
      if (pair.liquidity?.usd) {
        totalLiquidity += parseFloat(pair.liquidity.usd) || 0;
      }
    });
    
    return {
      totalLiquidity,
      pairCount: data.pairs.length
    };
  } catch (error) {
    console.error(`Error fetching total liquidity for ${chainId}:`, error);
    return null;
  }
}
