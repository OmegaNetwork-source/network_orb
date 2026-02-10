/**
 * DefiLlama API Service
 * Fetches real-time blockchain analytics data
 * Note: Free endpoints use api.llama.fi, Pro endpoints use pro-api.llama.fi
 */

const BASE_URL = 'https://api.llama.fi'; // Free API base URL
const ICONS_BASE_URL = 'https://icons.llama.fi';

// Map our network names to DefiLlama chain names and metadata
// Note: BSC might be listed as "BSC" or "BNB Chain" in DefiLlama
export const CHAIN_NAME_MAP = {
  'Ethereum': {
    defillamaName: 'Ethereum',
    geckoId: 'ethereum',
    iconPath: 'chains/rsz_ethereum.jpg',
    altNames: ['Ethereum']
  },
  'Solana': {
    defillamaName: 'Solana',
    geckoId: 'solana',
    iconPath: 'chains/rsz_solana.jpg',
    altNames: ['Solana']
  },
  'Bitcoin': {
    defillamaName: 'Bitcoin',
    geckoId: 'bitcoin',
    iconPath: 'chains/rsz_bitcoin.jpg',
    altNames: ['Bitcoin']
  },
  'BSC': {
    defillamaName: 'BSC',
    geckoId: 'binancecoin',
    iconPath: 'chains/rsz_bsc.jpg',
    altNames: ['BSC', 'BNB Chain', 'Binance']
  },
  'Avalanche': {
    defillamaName: 'Avalanche',
    geckoId: 'avalanche-2',
    iconPath: 'chains/rsz_avalanche.jpg',
    altNames: ['Avalanche']
  },
  'Polygon': {
    defillamaName: 'Polygon',
    geckoId: 'matic-network',
    iconPath: 'chains/rsz_polygon.jpg',
    altNames: ['Polygon', 'Matic']
  },
  'Arbitrum': {
    defillamaName: 'Arbitrum',
    geckoId: 'arbitrum',
    iconPath: 'chains/rsz_arbitrum.jpg',
    altNames: ['Arbitrum', 'Arbitrum One']
  },
  'Optimism': {
    defillamaName: 'Optimism',
    geckoId: 'optimism',
    iconPath: 'chains/rsz_optimism.jpg',
    altNames: ['Optimism', 'OP Mainnet']
  },
  'Base': {
    defillamaName: 'Base',
    geckoId: 'ethereum',
    iconPath: 'chains/rsz_base.jpg',
    altNames: ['Base']
  },
  'Sui': {
    defillamaName: 'Sui',
    geckoId: 'sui',
    iconPath: 'chains/rsz_sui.jpg',
    altNames: ['Sui']
  },
  'Cardano': {
    defillamaName: 'Cardano',
    geckoId: 'cardano',
    iconPath: 'chains/rsz_cardano.jpg',
    altNames: ['Cardano']
  },
  'Tron': {
    defillamaName: 'Tron',
    geckoId: 'tron',
    iconPath: 'chains/rsz_tron.jpg',
    altNames: ['Tron', 'TRON']
  },
  'TON': {
    defillamaName: 'TON',
    geckoId: 'the-open-network',
    iconPath: 'chains/rsz_ton.jpg',
    altNames: ['TON', 'The Open Network']
  },
  'Polkadot': {
    defillamaName: 'Polkadot',
    geckoId: 'polkadot',
    iconPath: 'chains/rsz_polkadot.jpg',
    altNames: ['Polkadot']
  },
  'Near': {
    defillamaName: 'Near',
    geckoId: 'near',
    iconPath: 'chains/rsz_near.jpg',
    altNames: ['Near', 'NEAR', 'Aurora']
  },
  'Fantom': {
    defillamaName: 'Fantom',
    geckoId: 'fantom',
    iconPath: 'chains/rsz_fantom.jpg',
    altNames: ['Fantom', 'Sonic']
  },
  'Cosmos': {
    defillamaName: 'CosmosHub',
    geckoId: 'cosmos',
    iconPath: 'chains/rsz_cosmos.jpg',
    altNames: ['Cosmos', 'CosmosHub', 'Cosmos Hub']
  },
  'Aptos': {
    defillamaName: 'Aptos',
    geckoId: 'aptos',
    iconPath: 'chains/rsz_aptos.jpg',
    altNames: ['Aptos']
  },
  'Cronos': {
    defillamaName: 'Cronos',
    geckoId: 'crypto-com-chain',
    iconPath: 'chains/rsz_cronos.jpg',
    altNames: ['Cronos']
  },
  'Sei': {
    defillamaName: 'Sei',
    geckoId: 'sei-network',
    iconPath: 'chains/rsz_sei.jpg',
    altNames: ['Sei']
  },
};

/**
 * Format large numbers for display
 */
function formatNumber(num, decimals = 1) {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(decimals)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
  return `$${num.toFixed(decimals)}`;
}

/**
 * Format number with suffix (M+, K+, etc.)
 */
function formatCount(num) {
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M+`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K+`;
  return `${Math.round(num)}+`;
}

/**
 * Get network logo URL
 */
export function getNetworkLogo(networkName) {
  const chainInfo = CHAIN_NAME_MAP[networkName];
  if (!chainInfo) return null;
  return `${ICONS_BASE_URL}/${chainInfo.iconPath}`;
}

/**
 * Fetch chain TVL data
 */
export async function fetchChainTVL() {
  try {
    console.log('Fetching chain TVL from:', `${BASE_URL}/v2/chains`);
    const response = await fetch(`${BASE_URL}/v2/chains`);
    
    if (!response.ok) {
      console.error('TVL API response not OK:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('TVL data received:', data?.length, 'chains');
    
    // Create a map of chain name to TVL and other data
    const tvlMap = {};
    if (Array.isArray(data)) {
      data.forEach(chain => {
        if (chain.name && chain.tvl !== undefined) {
          tvlMap[chain.name] = {
            tvl: chain.tvl || 0,
            tokenSymbol: chain.tokenSymbol,
            geckoId: chain.gecko_id,
            chainId: chain.chainId,
          };
        }
      });
    }
    
    return tvlMap;
  } catch (error) {
    console.error('Error fetching chain TVL:', error);
    return {};
  }
}

/**
 * Calculate market share percentages from TVL data
 * @param {Object} tvlData - Map of chain names to TVL data
 * @param {Array} networks - Optional array of networks to calculate for (if not provided, uses CHAIN_NAME_MAP)
 */
export function calculateMarketShare(tvlData, networks = null) {
  // If networks array provided, use it; otherwise use CHAIN_NAME_MAP
  const networksToProcess = networks || Object.keys(CHAIN_NAME_MAP);
  
  // Calculate total TVL across all networks
  const totalTVL = networksToProcess.reduce((sum, network) => {
    const networkName = typeof network === 'string' ? network : network.name;
    const defillamaName = CHAIN_NAME_MAP[networkName]?.defillamaName || networkName;
    const chainData = tvlData[defillamaName];
    const tvl = chainData?.tvl || 0;
    return sum + tvl;
  }, 0);
  
  const marketShare = {};
  networksToProcess.forEach(network => {
    const networkName = typeof network === 'string' ? network : network.name;
    const defillamaName = CHAIN_NAME_MAP[networkName]?.defillamaName || networkName;
    const chainData = tvlData[defillamaName];
    const tvl = chainData?.tvl || 0;
    marketShare[networkName] = {
      percentage: totalTVL > 0 ? (tvl / totalTVL) * 100 : 0,
      tvl,
      totalTVL,
    };
  });
  
  return marketShare;
}

/**
 * Fetch all protocols to count dapps per chain
 */
export async function fetchProtocols() {
  try {
    console.log('Fetching protocols from:', `${BASE_URL}/protocols`);
    const response = await fetch(`${BASE_URL}/protocols`);
    
    if (!response.ok) {
      console.error('Protocols API response not OK:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const protocols = await response.json();
    console.log('Protocols data received:', protocols?.length, 'protocols');
    
    if (!Array.isArray(protocols)) {
      console.error('Protocols data is not an array:', protocols);
      return { counts: {}, categories: {} };
    }
    
    // Count protocols per chain and get category breakdown
    const chainProtocolCount = {};
    const chainCategories = {};
    
    protocols.forEach(protocol => {
      if (protocol.chains && Array.isArray(protocol.chains)) {
        protocol.chains.forEach(chain => {
          // Check if this chain is in our known networks
          const chainInfo = Object.values(CHAIN_NAME_MAP).find(c => c.defillamaName === chain);
          if (chainInfo) {
            const networkName = Object.keys(CHAIN_NAME_MAP).find(
              key => CHAIN_NAME_MAP[key].defillamaName === chain
            );
            if (networkName) {
              chainProtocolCount[networkName] = (chainProtocolCount[networkName] || 0) + 1;
              
              // Track categories
              if (protocol.category) {
                if (!chainCategories[networkName]) {
                  chainCategories[networkName] = {};
                }
                chainCategories[networkName][protocol.category] = 
                  (chainCategories[networkName][protocol.category] || 0) + 1;
              }
            }
          } else {
            // Also count for any chain (for dynamic network creation)
            chainProtocolCount[chain] = (chainProtocolCount[chain] || 0) + 1;
          }
        });
      }
    });
    
    return { counts: chainProtocolCount, categories: chainCategories };
  } catch (error) {
    console.error('Error fetching protocols:', error);
    return { counts: {}, categories: {} };
  }
}

/**
 * Fetch DEX volume data for a chain
 */
export async function fetchChainDEXVolume(chainName) {
  try {
    const chainInfo = CHAIN_NAME_MAP[chainName];
    const defillamaChainName = chainInfo?.defillamaName || chainName;
    const response = await fetch(`${BASE_URL}/overview/dexs/${defillamaChainName}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`);
    if (!response.ok) {
      // Some chains might not have DEX data, return null gracefully
      return null;
    }
    const data = await response.json();
    
    return {
      volume24h: data.totalVolume || 0,
      volume7d: data.totalVolume7d || 0,
      change_1d: data.change_1d || 0,
      change_7d: data.change_7d || 0,
      protocolCount: data.protocols?.length || 0,
      protocols: data.protocols || [],
    };
  } catch (error) {
    console.error(`Error fetching DEX volume for ${chainName}:`, error);
    return null;
  }
}

/**
 * Fetch fees data for a chain
 */
export async function fetchChainFees(chainName) {
  try {
    const chainInfo = CHAIN_NAME_MAP[chainName];
    const defillamaChainName = chainInfo?.defillamaName || chainName;
    const response = await fetch(`${BASE_URL}/overview/fees/${defillamaChainName}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    
    return {
      fees24h: data.totalFees24h || 0,
      fees7d: data.totalFees7d || 0,
      revenue24h: data.totalRevenue24h || 0,
      revenue7d: data.totalRevenue7d || 0,
      change_1d: data.change_1d || 0,
      change_7d: data.change_7d || 0,
    };
  } catch (error) {
    console.error(`Error fetching fees for ${chainName}:`, error);
    return null;
  }
}

/**
 * Fetch bridge volume data for a chain
 */
export async function fetchChainBridgeVolume(chainName) {
  try {
    const chainInfo = CHAIN_NAME_MAP[chainName];
    const defillamaChainName = chainInfo?.defillamaName || chainName;
    const response = await fetch(`${BASE_URL}/bridges/${defillamaChainName}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    
    // Calculate total bridge volume
    let totalVolume24h = 0;
    let totalVolume7d = 0;
    let totalVolume30d = 0;
    
    if (data.bridges && Array.isArray(data.bridges)) {
      data.bridges.forEach(bridge => {
        totalVolume24h += bridge.volume24h || 0;
        totalVolume7d += bridge.volume7d || 0;
        totalVolume30d += bridge.volume30d || 0;
      });
    }
    
    return {
      volume24h: totalVolume24h,
      volume7d: totalVolume7d,
      volume30d: totalVolume30d,
      bridgeCount: data.bridges?.length || 0,
    };
  } catch (error) {
    console.error(`Error fetching bridge volume for ${chainName}:`, error);
    return null;
  }
}

/**
 * Fetch historical TVL data for a chain (last 30 days)
 */
export async function fetchChainHistoricalTVL(chainName) {
  try {
    const chainInfo = CHAIN_NAME_MAP[chainName];
    const defillamaChainName = chainInfo?.defillamaName || chainName;
    const response = await fetch(`${BASE_URL}/v2/historicalChainTvl/${defillamaChainName}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    
    if (data && Array.isArray(data) && data.length > 0) {
      const latest = data[data.length - 1];
      const dayAgo = data.length > 1 ? data[data.length - 2] : latest;
      const weekAgo = data.length > 7 ? data[data.length - 8] : latest;
      
      const change1d = dayAgo && latest ? ((latest.tvl - dayAgo.tvl) / dayAgo.tvl) * 100 : 0;
      const change7d = weekAgo && latest ? ((latest.tvl - weekAgo.tvl) / weekAgo.tvl) * 100 : 0;
      
      return {
        currentTVL: latest.tvl || 0,
        change1d,
        change7d,
        dataPoints: data.length,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching historical TVL for ${chainName}:`, error);
    return null;
  }
}

/**
 * Get all available chains from DefiLlama
 */
export async function fetchAllChains() {
  try {
    const response = await fetch(`${BASE_URL}/v2/chains`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Filter chains with significant TVL (> $1M) and return top chains
    const significantChains = (data || [])
      .filter(chain => chain.tvl && chain.tvl > 1000000)
      .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
      .slice(0, 20); // Top 20 chains
    
    return significantChains.map(chain => {
      // Generate multiple logo sources for better reliability
      const logos = [];
      if (chain.gecko_id) {
        // DefiLlama icon (primary)
        logos.push(`${ICONS_BASE_URL}/chains/rsz_${chain.gecko_id}.jpg`);
        // Alternative DefiLlama format
        logos.push(`${ICONS_BASE_URL}/chains/rsz_${chain.name.toLowerCase().replace(/\s+/g, '-')}.jpg`);
      }
      
      return {
        name: chain.name,
        tvl: chain.tvl || 0,
        tokenSymbol: chain.tokenSymbol,
        geckoId: chain.gecko_id,
        chainId: chain.chainId,
        logo: logos[0] || null,
        logoFallbacks: logos.slice(1),
      };
    });
  } catch (error) {
    console.error('Error fetching all chains:', error);
    return [];
  }
}

/**
 * Get comprehensive analytics for all networks
 */
export async function fetchAllNetworkAnalytics() {
  try {
    console.log('Fetching all network analytics...');
    const [tvlData, protocolData] = await Promise.all([
      fetchChainTVL(),
      fetchProtocols(),
    ]);
    
    console.log('TVL data keys:', Object.keys(tvlData));
    console.log('Sample TVL data:', Object.entries(tvlData).slice(0, 5));
    console.log('Protocol counts:', protocolData.counts);
    
    const protocolCounts = protocolData.counts || {};
    const marketShare = calculateMarketShare(tvlData);
    
    const analytics = {};
    
    // Process each network
    Object.keys(CHAIN_NAME_MAP).forEach(networkName => {
      const chainInfo = CHAIN_NAME_MAP[networkName];
      const defillamaChainName = chainInfo.defillamaName;
      
      // Try multiple ways to find the chain data (including alt names)
      let chainData = tvlData[networkName] || tvlData[defillamaChainName];
      if (!chainData && chainInfo.altNames) {
        for (const altName of chainInfo.altNames) {
          if (tvlData[altName]) {
            chainData = tvlData[altName];
            break;
          }
        }
      }
      const tvl = chainData?.tvl || 0;
      
      // Try to find protocol count
      const dappCount = protocolCounts[networkName] || 
                       protocolCounts[defillamaChainName] || 
                       (protocolData.counts && protocolData.counts[defillamaChainName]) || 
                       0;
      
      const share = marketShare[networkName] || { percentage: 0 };
      
      console.log(`Processing ${networkName}:`, { 
        defillamaName: defillamaChainName,
        foundInTvl: !!chainData,
        tvl, 
        dappCount, 
        share: share.percentage 
      });
      
      analytics[networkName] = {
        tvl,
        tvlFormatted: tvl > 0 ? formatNumber(tvl) : '$0.0',
        dapps: dappCount > 0 ? formatCount(dappCount) : 'N/A',
        dappCount,
        marketShare: share.percentage,
        marketShareFormatted: `${share.percentage.toFixed(1)}%`,
        logo: getNetworkLogo(networkName),
        geckoId: chainInfo.geckoId,
      };
    });
    
    console.log('Final analytics:', analytics);
    return analytics;
  } catch (error) {
    console.error('Error fetching network analytics:', error);
    console.error('Error stack:', error.stack);
    return {};
  }
}

/**
 * Fetch top protocols for a specific chain
 */
export async function fetchChainProtocols(chainName) {
  try {
    // Try to get DefiLlama chain name from map, otherwise use the network name directly
    const chainInfo = CHAIN_NAME_MAP[chainName];
    let defillamaChainName = chainInfo?.defillamaName || chainName;
    
    // If network name doesn't match, try to find it in the chain list
    if (!chainInfo) {
      const chainData = await fetchChainTVL();
      // Check if chainName exists in the TVL data
      if (chainData[chainName]) {
        defillamaChainName = chainName;
      } else {
        // Try to find a match (case-insensitive)
        const match = Object.keys(chainData).find(
          key => key.toLowerCase() === chainName.toLowerCase()
        );
        if (match) {
          defillamaChainName = match;
        }
      }
    }
    
    const response = await fetch(`${BASE_URL}/protocols`);
    if (!response.ok) {
      return [];
    }
    
    const allProtocols = await response.json();
    
    // Filter protocols that are on this chain and sort by TVL
    const chainProtocols = allProtocols
      .filter(protocol => 
        protocol.chains && 
        Array.isArray(protocol.chains) && 
        protocol.chains.includes(defillamaChainName)
      )
      .map(protocol => ({
        name: protocol.name,
        tvl: protocol.tvl || 0,
        category: protocol.category || 'Other',
        slug: protocol.slug,
        logo: protocol.logo || null,
        url: protocol.url || null,
        description: protocol.description || null,
      }))
      .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
      .slice(0, 20); // Top 20 protocols
    
    return chainProtocols;
  } catch (error) {
    console.error(`Error fetching protocols for ${chainName}:`, error);
    return [];
  }
}

/**
 * Get detailed analytics for a specific network
 * Works for all networks, not just those in CHAIN_NAME_MAP
 */
export async function fetchNetworkDetails(networkName) {
  try {
    const chainInfo = CHAIN_NAME_MAP[networkName];
    // Use chain name from map if available, otherwise use network name directly
    let defillamaChainName = chainInfo?.defillamaName || networkName;
    
    // Fetch all data
    const [tvlData, protocolData, topProtocols] = await Promise.all([
      fetchChainTVL(),
      fetchProtocols(),
      fetchChainProtocols(networkName),
    ]);
    
    // Try to find chain data - check multiple possible names
    let chainData = tvlData[networkName] || tvlData[defillamaChainName];
    if (!chainData && chainInfo?.altNames) {
      for (const altName of chainInfo.altNames) {
        if (tvlData[altName]) {
          chainData = tvlData[altName];
          defillamaChainName = altName;
          break;
        }
      }
    }
    
    // If still not found, try case-insensitive match
    if (!chainData) {
      const match = Object.keys(tvlData).find(
        key => key.toLowerCase() === networkName.toLowerCase() ||
               key.toLowerCase() === defillamaChainName.toLowerCase()
      );
      if (match) {
        chainData = tvlData[match];
        defillamaChainName = match;
      }
    }
    
    const tvl = chainData?.tvl || 0;
    const protocolCounts = protocolData.counts || {};
    const dappCount = protocolCounts[networkName] || protocolCounts[defillamaChainName] || topProtocols.length || 0;
    
    // Get categories from protocols
    const categories = {};
    topProtocols.forEach(protocol => {
      const category = protocol.category || 'Other';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    // Try to fetch DEX, fees, bridge, and historical data (may not be available for all chains)
    let dexData = null;
    let feesData = null;
    let bridgeData = null;
    let historicalData = null;
    
    try {
      dexData = await fetchChainDEXVolume(networkName);
    } catch (e) {
      console.log(`No DEX data for ${networkName}`);
    }
    
    try {
      feesData = await fetchChainFees(networkName);
    } catch (e) {
      console.log(`No fees data for ${networkName}`);
    }
    
    try {
      bridgeData = await fetchChainBridgeVolume(networkName);
    } catch (e) {
      console.log(`No bridge data for ${networkName}`);
    }
    
    try {
      historicalData = await fetchChainHistoricalTVL(networkName);
    } catch (e) {
      console.log(`No historical TVL data for ${networkName}`);
    }
    
    // Organize protocols by category
    const protocolsByCategory = {};
    topProtocols.forEach(protocol => {
      const category = protocol.category || 'Other';
      if (!protocolsByCategory[category]) {
        protocolsByCategory[category] = [];
      }
      protocolsByCategory[category].push(protocol);
    });
    
    return {
      tvl,
      tvlFormatted: formatNumber(tvl),
      dapps: dappCount > 0 ? formatCount(dappCount) : '0',
      dappCount,
      categories,
      topProtocols,
      protocolsByCategory,
      dexVolume24h: dexData?.volume24h || 0,
      dexVolume24hFormatted: dexData ? formatNumber(dexData.volume24h) : 'N/A',
      dexVolume7d: dexData?.volume7d || 0,
      dexVolume7dFormatted: dexData ? formatNumber(dexData.volume7d) : 'N/A',
      dexChange1d: dexData?.change_1d || 0,
      dexChange7d: dexData?.change_7d || 0,
      fees24h: feesData?.fees24h || 0,
      fees24hFormatted: feesData ? formatNumber(feesData.fees24h) : 'N/A',
      fees7d: feesData?.fees7d || 0,
      fees7dFormatted: feesData ? formatNumber(feesData.fees7d) : 'N/A',
      revenue24h: feesData?.revenue24h || 0,
      revenue24hFormatted: feesData ? formatNumber(feesData.revenue24h) : 'N/A',
      revenue7d: feesData?.revenue7d || 0,
      revenue7dFormatted: feesData ? formatNumber(feesData.revenue7d) : 'N/A',
      bridgeVolume24h: bridgeData?.volume24h || 0,
      bridgeVolume24hFormatted: bridgeData ? formatNumber(bridgeData.volume24h) : 'N/A',
      bridgeVolume7d: bridgeData?.volume7d || 0,
      bridgeVolume7dFormatted: bridgeData ? formatNumber(bridgeData.volume7d) : 'N/A',
      bridgeCount: bridgeData?.bridgeCount || 0,
      tvlChange1d: historicalData?.change1d || 0,
      tvlChange7d: historicalData?.change7d || 0,
      logo: chainInfo ? getNetworkLogo(networkName) : null,
      geckoId: chainInfo?.geckoId || null,
    };
  } catch (error) {
    console.error(`Error fetching details for ${networkName}:`, error);
    // Return minimal data instead of null so UI can still show something
    return {
      tvl: 0,
      tvlFormatted: '$0.0',
      dapps: '0',
      dappCount: 0,
      categories: {},
      topProtocols: [],
      protocolsByCategory: {},
      dexVolume24h: 0,
      dexVolume24hFormatted: 'N/A',
      fees24h: 0,
      fees24hFormatted: 'N/A',
      revenue24h: 0,
      revenue24hFormatted: 'N/A',
      logo: null,
      geckoId: null,
    };
  }
}
