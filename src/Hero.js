import * as THREE from 'three'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { KawaseBlurPass, KernelSize } from 'postprocessing'
import { sphereFragmentShader, sphereVertexShader } from './sphereShader'
import { heroDepthFragmentShader, heroFragmentShader, heroVertexShader } from './heroShader'
import { floorFragmentShader, floorVertexShader } from './floorShader'
import { fetchAllNetworkAnalytics, fetchAllChains } from './services/defillama'
import { DAPP_PALETTE_THREE } from './dappPalette'

// Import CHAIN_NAME_MAP for reference
let CHAIN_NAME_MAP = null;
const ICONS_BASE_URL = 'https://icons.llama.fi';

// Helper function to format numbers (imported from service)
function formatNumber(num, decimals = 1) {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(decimals)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
}

const INSTANCES_COUNT = 5000;

// Base network configuration (will be enriched with real data)
// Logo sources - using multiple reliable CDNs
const LOGO_SOURCES = {
    Ethereum: [
        'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
        'https://icons.llama.fi/chains/rsz_ethereum.jpg',
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png'
    ],
    Solana: [
        'https://assets.coingecko.com/coins/images/4128/large/solana.png',
        'https://icons.llama.fi/chains/rsz_solana.jpg',
        'https://assets.trustwalletapp.com/blockchains/solana/info/logo.png'
    ],
    Bitcoin: [
        'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        'https://icons.llama.fi/chains/rsz_bitcoin.jpg',
        'https://assets.trustwalletapp.com/blockchains/bitcoin/info/logo.png'
    ],
    BSC: [
        'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
        'https://assets.trustwalletapp.com/blockchains/smartchain/info/logo.png',
        'https://icons.llama.fi/chains/rsz_binancecoin.jpg',
        'https://icons.llama.fi/chains/rsz_bsc.jpg'
    ],
    Avalanche: [
        'https://assets.coingecko.com/coins/images/12559/large/avalanche-avax-logo.png',
        'https://icons.llama.fi/chains/rsz_avalanche.jpg',
        'https://assets.trustwalletapp.com/blockchains/avalanchec/info/logo.png'
    ],
    Polygon: [
        'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
        'https://icons.llama.fi/chains/rsz_polygon.jpg',
        'https://assets.trustwalletapp.com/blockchains/polygon/info/logo.png'
    ],
    Arbitrum: [
        'https://assets.coingecko.com/coins/images/16547/large/arb.jpg',
        'https://icons.llama.fi/chains/rsz_arbitrum.jpg',
        'https://assets.trustwalletapp.com/blockchains/arbitrum/info/logo.png'
    ],
    Optimism: [
        'https://assets.coingecko.com/coins/images/25244/large/Optimism.png',
        'https://icons.llama.fi/chains/rsz_optimism.jpg',
        'https://assets.trustwalletapp.com/blockchains/optimism/info/logo.png'
    ],
    Base: [
        'https://assets.coingecko.com/asset_platforms/images/131/large/base.jpeg',
        'https://icons.llama.fi/chains/rsz_base.jpg',
        'https://assets.trustwalletapp.com/blockchains/base/info/logo.png'
    ],
    Sui: [
        'https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png',
        'https://icons.llama.fi/chains/rsz_sui.jpg'
    ],
    Cardano: [
        'https://assets.coingecko.com/coins/images/975/large/cardano.png',
        'https://icons.llama.fi/chains/rsz_cardano.jpg',
        'https://assets.trustwalletapp.com/blockchains/cardano/info/logo.png'
    ],
    Tron: [
        'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
        'https://icons.llama.fi/chains/rsz_tron.jpg',
        'https://assets.trustwalletapp.com/blockchains/tron/info/logo.png'
    ],
    TON: [
        'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png',
        'https://icons.llama.fi/chains/rsz_ton.jpg'
    ],
    Polkadot: [
        'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
        'https://icons.llama.fi/chains/rsz_polkadot.jpg',
        'https://assets.trustwalletapp.com/blockchains/polkadot/info/logo.png'
    ],
    Near: [
        'https://assets.coingecko.com/coins/images/10365/large/near.jpg',
        'https://icons.llama.fi/chains/rsz_near.jpg'
    ],
    Fantom: [
        'https://assets.coingecko.com/coins/images/4001/large/Fantom_round.png',
        'https://icons.llama.fi/chains/rsz_fantom.jpg',
        'https://assets.trustwalletapp.com/blockchains/fantom/info/logo.png'
    ],
    Cosmos: [
        'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
        'https://icons.llama.fi/chains/rsz_cosmos.jpg',
        'https://assets.trustwalletapp.com/blockchains/cosmos/info/logo.png'
    ],
    Aptos: [
        'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png',
        'https://icons.llama.fi/chains/rsz_aptos.jpg'
    ],
    Cronos: [
        'https://assets.coingecko.com/coins/images/7310/large/cro_token_logo.png',
        'https://icons.llama.fi/chains/rsz_cronos.jpg'
    ],
    Sei: [
        'https://assets.coingecko.com/coins/images/28205/large/Sei_Logo_-_Transparent.png',
        'https://icons.llama.fi/chains/rsz_sei.jpg'
    ],
};

const BASE_NETWORKS = [
    {
        name: "Ethereum",
        symbol: "ETH",
        est: "2015",
        color: new THREE.Color("#00f2ff"),
        pos: new THREE.Vector3(1, 1, 1).normalize(),
        logo: LOGO_SOURCES.Ethereum[0],
        logoFallbacks: LOGO_SOURCES.Ethereum.slice(1),
        stats: { wallets: "240M+", users: "1.2M", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "The leading Layer 1 for decentralized finance and institutional-grade smart contracts."
    },
    {
        name: "Solana",
        symbol: "SOL",
        est: "2020",
        color: new THREE.Color("#9945FF"),
        pos: new THREE.Vector3(-1, 0.5, 0.5).normalize(),
        logo: LOGO_SOURCES.Solana[0],
        logoFallbacks: LOGO_SOURCES.Solana.slice(1),
        stats: { wallets: "110M+", users: "2.4M", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Ultra-fast blockchain designed for consumer-scale decentralized applications and high-frequency trading."
    },
    {
        name: "Bitcoin",
        symbol: "BTC",
        est: "2009",
        color: new THREE.Color("#F7931A"),
        pos: new THREE.Vector3(0, -1, 1).normalize(),
        logo: LOGO_SOURCES.Bitcoin[0],
        logoFallbacks: LOGO_SOURCES.Bitcoin.slice(1),
        stats: { wallets: "460M+", users: "15M", tvl: "Loading...", dapps: "N/A" },
        spotlight: "The original decentralized digital currency, now evolving into a programmable asset layer via Ordinals."
    },
    {
        name: "BSC",
        symbol: "BNB",
        est: "2020",
        color: new THREE.Color("#F3BA2F"),
        pos: new THREE.Vector3(1, -0.5, -1).normalize(),
        logo: LOGO_SOURCES.BSC[0],
        logoFallbacks: LOGO_SOURCES.BSC.slice(1),
        stats: { wallets: "380M+", users: "3.8M", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Community-driven ecosystem with low fees, high throughput, and the largest DEX volume in crypto."
    },
    {
        name: "Avalanche",
        symbol: "AVAX",
        est: "2020",
        color: new THREE.Color("#E84142"),
        pos: new THREE.Vector3(-1, -1, -1).normalize(),
        logo: LOGO_SOURCES.Avalanche[0],
        logoFallbacks: LOGO_SOURCES.Avalanche.slice(1),
        stats: { wallets: "45M+", users: "850K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Blazingly fast, low cost, and eco-friendly platform for launching private and public decentralized applications."
    },
    {
        name: "Polygon",
        symbol: "POL",
        est: "2020",
        color: new THREE.Color("#8247E5"),
        pos: new THREE.Vector3(0.8, 0.3, -1).normalize(),
        logo: LOGO_SOURCES.Polygon[0],
        logoFallbacks: LOGO_SOURCES.Polygon.slice(1),
        geckoId: "matic-network",
        stats: { wallets: "220M+", users: "1.5M", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Ethereum's leading scaling solution with zkEVM technology, powering high-throughput DeFi and gaming ecosystems."
    },
    {
        name: "Arbitrum",
        symbol: "ARB",
        est: "2021",
        color: new THREE.Color("#28A0F0"),
        pos: new THREE.Vector3(-0.5, 1, -0.8).normalize(),
        logo: LOGO_SOURCES.Arbitrum[0],
        logoFallbacks: LOGO_SOURCES.Arbitrum.slice(1),
        geckoId: "arbitrum",
        stats: { wallets: "18M+", users: "800K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "The dominant Ethereum L2 optimistic rollup with the largest TVL, powering DeFi protocols like GMX and Radiant."
    },
    {
        name: "Optimism",
        symbol: "OP",
        est: "2021",
        color: new THREE.Color("#FF0420"),
        pos: new THREE.Vector3(0.3, -0.7, 1).normalize(),
        logo: LOGO_SOURCES.Optimism[0],
        logoFallbacks: LOGO_SOURCES.Optimism.slice(1),
        geckoId: "optimism",
        stats: { wallets: "12M+", users: "500K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Pioneer of the Superchain vision, an optimistic rollup powering a unified network of interoperable L2 chains."
    },
    {
        name: "Base",
        symbol: "ETH",
        est: "2023",
        color: new THREE.Color("#0052FF"),
        pos: new THREE.Vector3(-0.9, -0.3, 0.7).normalize(),
        logo: LOGO_SOURCES.Base[0],
        logoFallbacks: LOGO_SOURCES.Base.slice(1),
        geckoId: "ethereum",
        stats: { wallets: "10M+", users: "1.2M", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Coinbase-incubated L2 built on the OP Stack, rapidly growing into a hub for on-chain social and consumer apps."
    },
    {
        name: "Sui",
        symbol: "SUI",
        est: "2023",
        color: new THREE.Color("#4DA2FF"),
        pos: new THREE.Vector3(1, 0.7, 0.3).normalize(),
        logo: LOGO_SOURCES.Sui[0],
        logoFallbacks: LOGO_SOURCES.Sui.slice(1),
        geckoId: "sui",
        stats: { wallets: "8M+", users: "400K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Move-based L1 with parallel transaction execution and object-centric data model for sub-second finality."
    },
    {
        name: "Cardano",
        symbol: "ADA",
        est: "2017",
        color: new THREE.Color("#0033AD"),
        pos: new THREE.Vector3(-0.6, 0.8, -0.5).normalize(),
        logo: LOGO_SOURCES.Cardano[0],
        logoFallbacks: LOGO_SOURCES.Cardano.slice(1),
        geckoId: "cardano",
        stats: { wallets: "4M+", users: "300K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Peer-reviewed, research-driven blockchain with the Ouroboros proof-of-stake protocol and Plutus smart contracts."
    },
    {
        name: "Tron",
        symbol: "TRX",
        est: "2017",
        color: new THREE.Color("#FF060A"),
        pos: new THREE.Vector3(0.5, -1, -0.5).normalize(),
        logo: LOGO_SOURCES.Tron[0],
        logoFallbacks: LOGO_SOURCES.Tron.slice(1),
        geckoId: "tron",
        stats: { wallets: "230M+", users: "2M", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "The world's largest USDT settlement layer, processing billions in daily stablecoin transfers with near-zero fees."
    },
    {
        name: "TON",
        symbol: "TON",
        est: "2018",
        color: new THREE.Color("#0098EA"),
        pos: new THREE.Vector3(-0.3, -0.5, -1).normalize(),
        logo: LOGO_SOURCES.TON[0],
        logoFallbacks: LOGO_SOURCES.TON.slice(1),
        geckoId: "the-open-network",
        stats: { wallets: "50M+", users: "5M", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Telegram-integrated blockchain bringing crypto to 900M+ messenger users through seamless in-app mini-apps."
    },
    {
        name: "Polkadot",
        symbol: "DOT",
        est: "2020",
        color: new THREE.Color("#E6007A"),
        pos: new THREE.Vector3(0.7, 0.5, -0.7).normalize(),
        logo: LOGO_SOURCES.Polkadot[0],
        logoFallbacks: LOGO_SOURCES.Polkadot.slice(1),
        geckoId: "polkadot",
        stats: { wallets: "5M+", users: "200K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Multi-chain interoperability protocol connecting specialized parachains through shared security and cross-chain messaging."
    },
    {
        name: "Near",
        symbol: "NEAR",
        est: "2020",
        color: new THREE.Color("#00C1DE"),
        pos: new THREE.Vector3(-1, 0.2, -0.3).normalize(),
        logo: LOGO_SOURCES.Near[0],
        logoFallbacks: LOGO_SOURCES.Near.slice(1),
        geckoId: "near",
        stats: { wallets: "12M+", users: "500K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Sharded L1 with chain abstraction and account aggregation, pioneering seamless multi-chain user experiences."
    },
    {
        name: "Fantom",
        symbol: "FTM",
        est: "2019",
        color: new THREE.Color("#1969FF"),
        pos: new THREE.Vector3(0.4, 0.9, 0.6).normalize(),
        logo: LOGO_SOURCES.Fantom[0],
        logoFallbacks: LOGO_SOURCES.Fantom.slice(1),
        geckoId: "fantom",
        stats: { wallets: "3M+", users: "150K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "DAG-based smart contract platform evolving into Sonic, targeting sub-second finality with 10K+ TPS."
    },
    {
        name: "Cosmos",
        symbol: "ATOM",
        est: "2019",
        color: new THREE.Color("#6F7390"),
        pos: new THREE.Vector3(-0.8, -0.8, 0.3).normalize(),
        logo: LOGO_SOURCES.Cosmos[0],
        logoFallbacks: LOGO_SOURCES.Cosmos.slice(1),
        geckoId: "cosmos",
        stats: { wallets: "2M+", users: "200K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "The Internet of Blockchains, enabling sovereign app-chains connected via IBC protocol for seamless interoperability."
    },
    {
        name: "Aptos",
        symbol: "APT",
        est: "2022",
        color: new THREE.Color("#2DD8A3"),
        pos: new THREE.Vector3(0.6, -0.4, 0.8).normalize(),
        logo: LOGO_SOURCES.Aptos[0],
        logoFallbacks: LOGO_SOURCES.Aptos.slice(1),
        geckoId: "aptos",
        stats: { wallets: "5M+", users: "300K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Move-based L1 from ex-Meta engineers, achieving 160K TPS with Block-STM parallel execution engine."
    },
    {
        name: "Cronos",
        symbol: "CRO",
        est: "2021",
        color: new THREE.Color("#002D74"),
        pos: new THREE.Vector3(0.2, 0.6, -1).normalize(),
        logo: LOGO_SOURCES.Cronos[0],
        logoFallbacks: LOGO_SOURCES.Cronos.slice(1),
        geckoId: "crypto-com-chain",
        stats: { wallets: "5M+", users: "100K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Crypto.com's EVM-compatible chain bridging 100M+ exchange users to DeFi with CRO-powered ecosystem."
    },
    {
        name: "Sei",
        symbol: "SEI",
        est: "2023",
        color: new THREE.Color("#9B1B30"),
        pos: new THREE.Vector3(-0.4, 0.4, 1).normalize(),
        logo: LOGO_SOURCES.Sei[0],
        logoFallbacks: LOGO_SOURCES.Sei.slice(1),
        geckoId: "sei-network",
        stats: { wallets: "3M+", users: "200K", tvl: "Loading...", dapps: "Loading..." },
        spotlight: "Purpose-built for trading with parallelized EVM, twin-turbo consensus, and native order matching engine."
    },
];

// Export networks with a function to update them
export let NETWORKS = [...BASE_NETWORKS];

function Hero({ onSelect, selectedNetwork, dappNodes, onSelectDapp, selectedDapp, onHover }) {
    const [width, height] = useThree((state) => [state.size.width, state.size.height]);
    const dpr = useThree((state) => state.viewport.dpr);
    const [networks, setNetworks] = useState(BASE_NETWORKS);

    // Fetch real analytics data and additional networks on mount
    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                // Fetch analytics for base networks
                const analytics = await fetchAllNetworkAnalytics();
                console.log('Analytics loaded:', analytics);

                // Fetch all available chains to potentially add more networks
                const allChains = await fetchAllChains();
                console.log('All chains fetched:', allChains.length);

                // Fetch TVL data separately for market share calculation
                const defillamaModule = await import('./services/defillama');
                const tvlData = await defillamaModule.fetchChainTVL();
                const chainNameMap = defillamaModule.CHAIN_NAME_MAP || {};

                // Update base networks with real data
                const updatedBaseNetworks = BASE_NETWORKS.map(network => {
                    const analyticsData = analytics[network.name];
                    const chainInfo = chainNameMap[network.name];
                    const defillamaName = chainInfo?.defillamaName || network.name;
                    const chainTvlData = tvlData[network.name] || tvlData[defillamaName];
                    const rawTvl = chainTvlData?.tvl || analyticsData?.tvl || 0;

                    // CRITICAL: Preserve ALL original network properties, especially color and pos
                    const updated = {
                        ...network, // This preserves color, pos, name, symbol, est, etc.
                        stats: {
                            ...network.stats,
                            tvl: analyticsData?.tvlFormatted || formatNumber(rawTvl),
                            dapps: analyticsData?.dapps || network.stats.dapps,
                        },
                        // Only update logo if we have a new one, otherwise keep original
                        logo: analyticsData?.logo || network.logo,
                        logoFallbacks: network.logoFallbacks || [],
                        marketShare: analyticsData?.marketShare || 0,
                        marketShareFormatted: analyticsData?.marketShareFormatted || '0.0%',
                        // Use geckoId from chainInfo first (most reliable), then analytics, then original
                        geckoId: chainInfo?.geckoId || analyticsData?.geckoId || network.geckoId,
                        rawTvl: rawTvl, // Store raw TVL for market share calculation
                    };

                    // CRITICAL: Ensure color and pos are ALWAYS preserved (clone to avoid reference issues)
                    if (network.color) {
                        updated.color = network.color.clone();
                    }
                    if (network.pos) {
                        updated.pos = network.pos.clone();
                    }

                    // Debug log to verify colors are preserved
                    console.log(`Updated ${network.name}:`, {
                        hasColor: !!updated.color,
                        colorValue: updated.color?.getHexString(),
                        originalColor: network.color?.getHexString(),
                        geckoId: updated.geckoId
                    });

                    return updated;
                });

                // Create additional networks from top chains not in BASE_NETWORKS
                const baseNetworkNames = new Set(BASE_NETWORKS.map(n => n.name));
                const additionalNetworks = [];

                // Generate positions for additional networks using fibonacci sphere
                const generatePosition = (index, total) => {
                    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
                    const y = 1 - (index / (total - 1)) * 2;
                    const radius = Math.sqrt(1 - y * y);
                    const theta = goldenAngle * index;
                    return new THREE.Vector3(
                        Math.cos(theta) * radius,
                        y,
                        Math.sin(theta) * radius
                    ).normalize();
                };

                // Helper function to generate logo URLs with fallbacks for any chain
                const generateLogoUrls = (chainName, geckoId) => {
                    const logos = [];

                    // Try CoinGecko API (most reliable)
                    if (geckoId) {
                        // CoinGecko uses different formats, try common ones
                        logos.push(`https://assets.coingecko.com/coins/images/${geckoId}/large/${geckoId}.png`);
                        // Alternative CoinGecko format
                        logos.push(`https://assets.coingecko.com/coins/images/${geckoId}/large.png`);
                    }

                    // DefiLlama icons
                    if (geckoId) {
                        logos.push(`${ICONS_BASE_URL}/chains/rsz_${geckoId}.jpg`);
                    }
                    logos.push(`${ICONS_BASE_URL}/chains/rsz_${chainName.toLowerCase().replace(/\s+/g, '-')}.jpg`);

                    // Trust Wallet (for common chains)
                    const trustWalletMap = {
                        'Polygon': 'polygon',
                        'Arbitrum': 'arbitrum',
                        'Optimism': 'optimism',
                        'Base': 'base',
                        'zkSync': 'zksync',
                        'Starknet': 'starknet',
                        'Linea': 'linea',
                        'Scroll': 'scroll',
                        'Mantle': 'mantle',
                        'Blast': 'blast'
                    };
                    const twKey = trustWalletMap[chainName];
                    if (twKey) {
                        logos.push(`https://assets.trustwalletapp.com/blockchains/${twKey}/info/logo.png`);
                    }

                    // Return first logo as primary, rest as fallbacks
                    return logos.length > 0 ? {
                        logo: logos[0],
                        logoFallbacks: logos.slice(1)
                    } : { logo: null, logoFallbacks: [] };
                };

                allChains.forEach((chain, index) => {
                    if (!baseNetworkNames.has(chain.name) && chain.tvl > 100000000) { // > $100M TVL
                        const posIndex = BASE_NETWORKS.length + additionalNetworks.length;
                        const pos = generatePosition(posIndex, 20);

                        // Generate a color based on chain name hash
                        const hash = chain.name.split('').reduce((acc, char) => {
                            return char.charCodeAt(0) + ((acc << 5) - acc);
                        }, 0);
                        const hue = Math.abs(hash % 360);
                        const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.5);

                        // Generate logos with fallbacks
                        const logoData = generateLogoUrls(chain.name, chain.geckoId);
                        // Combine API logo with generated fallbacks
                        const allLogos = chain.logo
                            ? [chain.logo, ...(chain.logoFallbacks || []), ...logoData.logoFallbacks]
                            : [logoData.logo, ...logoData.logoFallbacks].filter(Boolean);
                        const primaryLogo = allLogos[0] || null;
                        const fallbacks = allLogos.slice(1);

                        additionalNetworks.push({
                            name: chain.name,
                            symbol: chain.tokenSymbol || chain.name.substring(0, 3).toUpperCase(),
                            est: "N/A",
                            color: color,
                            pos: pos,
                            stats: {
                                wallets: "N/A",
                                users: "N/A",
                                tvl: formatNumber(chain.tvl),
                                dapps: "N/A",
                            },
                            logo: primaryLogo,
                            logoFallbacks: fallbacks,
                            marketShare: 0, // Will be calculated
                            geckoId: chain.geckoId,
                            rawTvl: chain.tvl, // Store raw TVL for market share calculation
                            spotlight: `${chain.name} blockchain network.`,
                        });
                    }
                });

                // Combine base and additional networks
                const allNetworks = [...updatedBaseNetworks, ...additionalNetworks];

                // Calculate total TVL from ALL chains in DefiLlama (not just our networks)
                // This gives accurate market share based on the entire DeFi ecosystem
                const allChainTvl = Object.values(tvlData).reduce((sum, chain) => {
                    return sum + (chain?.tvl || 0);
                }, 0);

                console.log('Total TVL from all chains (for market share):', allChainTvl);

                // Recalculate market share for all networks using total TVL from all chains
                allNetworks.forEach(net => {
                    const rawTvl = net.rawTvl || 0;
                    if (allChainTvl > 0 && rawTvl > 0) {
                        net.marketShare = (rawTvl / allChainTvl) * 100;
                        net.marketShareFormatted = `${net.marketShare.toFixed(1)}%`;
                        console.log(`${net.name}: TVL=${rawTvl}, Market Share=${net.marketShare.toFixed(1)}% (of ${allChainTvl})`);
                    } else {
                        net.marketShare = 0;
                        net.marketShareFormatted = '0.0%';
                    }
                });

                setNetworks(allNetworks);
                NETWORKS = allNetworks; // Update exported constant
                console.log('Total networks loaded:', allNetworks.length);
            } catch (error) {
                console.error('Failed to load analytics:', error);
                // Keep default values on error
                setNetworks(BASE_NETWORKS);
            }
        };

        loadAnalytics();
    }, []);

    const sphere1Ref = useRef(null);
    const sphere2Ref = useRef(null);
    const sphere3Ref = useRef(null);
    const sphere4Ref = useRef(null);
    const isDraggingRef = useRef(false);
    const pointerDownPosRef = useRef(null);

    // Dynamic color buffer refs for dApp sub-continent animation
    const colorAttrRef = useRef(null);
    const positionsArrayRef = useRef(null);
    const baseColorsRef = useRef(null);
    const targetColorsRef = useRef(null);
    const currentColorsRef = useRef(null);
    const dappModeRef = useRef(false);
    const flashesRef = useRef([]);
    const networkMapRef = useRef(null);
    const lastFlashTimeRef = useRef(0.5);
    const flashNetworkIndexRef = useRef(0);

    const [sphereGeometry, setSphereGeometry] = useState(null);
    const [sphereMaterial, setSphereMaterial] = useState(null);

    const lightPosition = new THREE.Vector3(-1, 0.8, 0.25).normalize().multiplyScalar(5);

    const noise = useTexture("/bnoise.png");
    noise.wrapS = THREE.RepeatWrapping;
    noise.wrapT = THREE.RepeatWrapping;
    const matcap = useTexture("/glass.png");

    const uniforms = useState(() => (Object.assign({
        u_scale: { value: 0.08 },
        u_lightPosition: { value: lightPosition },
        u_noiseTexture: { value: noise },
        u_noiseTexelSize: { value: new THREE.Vector2(1 / 128, 1 / 128) },
        u_noiseCoordOffset: { value: new THREE.Vector2(0, 0) },
        u_color: { value: new THREE.Color("#B2B8BB") },
        u_sphere1Position: { value: new THREE.Vector3(0, 0, 0) },
        u_sphere2Position: { value: new THREE.Vector3(0, 0, 0) },
        u_sphere3Position: { value: new THREE.Vector3(0, 0, 0) },
        u_sphere4Position: { value: new THREE.Vector3(0, 0, 0) },
        u_hotContinentPos: { value: BASE_NETWORKS[0].pos.clone() },
        u_hotColor: { value: BASE_NETWORKS[0].color.clone() },
        u_hotBeamIntensity: { value: 1.0 },
        u_flashColor: { value: new THREE.Color(0, 0, 0) },
        u_flashIntensity: { value: 0.0 },
        ...THREE.UniformsUtils.merge([THREE.UniformsLib.lights]),
    })))[0]

    const uniformsSphere = useState(() => (Object.assign({
        u_lightPosition: { value: lightPosition },
        u_noiseTexture: { value: noise },
        u_sceneTexture: { value: null },
        u_resolution: { value: new THREE.Vector2() },
        u_matcap: { value: null },
        ...THREE.UniformsUtils.merge([THREE.UniformsLib.lights]),
    })))[0]

    const geometry = useMemo(() => {
        // Use current networks state for market share data
        const networksForGeometry = networks.length > 0 ? networks : BASE_NETWORKS;
        const refGeometry = new THREE.CapsuleGeometry(1, 4, 4, 16);
        refGeometry.computeBoundingBox();

        const geometry = new THREE.InstancedBufferGeometry();
        for (let id in refGeometry.attributes) {
            geometry.setAttribute(id, refGeometry.attributes[id]);
        }
        geometry.setIndex(refGeometry.index);

        const positionsArray = new Float32Array(INSTANCES_COUNT * 3);
        const quaternionsArray = new Float32Array(INSTANCES_COUNT * 4);
        const colorsArray = new Float32Array(INSTANCES_COUNT * 3);
        const networkMap = new Uint16Array(INSTANCES_COUNT);

        const sphereRadius = 2.0;
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const up = new THREE.Vector3(0, 1, 0);
        const tempPos = new THREE.Vector3();
        const tempQuat = new THREE.Quaternion();

        for (let i = 0, i3 = 0, i4 = 0; i < INSTANCES_COUNT; i++, i3 += 3, i4 += 4) {
            // Fibonacci distribution on unit sphere
            const ny = 1 - (i / (INSTANCES_COUNT - 1)) * 2;
            const r = Math.sqrt(1 - ny * ny);
            const theta = goldenAngle * i;
            const nx = Math.cos(theta) * r;
            const nz = Math.sin(theta) * r;

            // Simple sphere - no deformation
            const x = nx * sphereRadius;
            const y = ny * sphereRadius;
            const z = nz * sphereRadius;

            positionsArray[i3] = x;
            positionsArray[i3 + 1] = y;
            positionsArray[i3 + 2] = z;

            // Outward direction for spike orientation
            tempPos.set(-x, -y, -z).normalize();
            tempQuat.setFromUnitVectors(up, tempPos);

            quaternionsArray[i4] = tempQuat.x;
            quaternionsArray[i4 + 1] = tempQuat.y;
            quaternionsArray[i4 + 2] = tempQuat.z;
            quaternionsArray[i4 + 3] = tempQuat.w;

            // Track closest network using angular position on unit sphere
            const instanceVec = new THREE.Vector3(nx, ny, nz);
            let closestNetworkIdx = 0;
            let maxDot = -1;
            for (let n = 0; n < networksForGeometry.length; n++) {
                const dot = instanceVec.dot(networksForGeometry[n].pos);
                if (dot > maxDot) {
                    maxDot = dot;
                    closestNetworkIdx = n;
                }
            }
            networkMap[i] = closestNetworkIdx;

            // Dark metallic base with very subtle variation per region
            const base = 0.08 + Math.random() * 0.03;
            const finalColor = new THREE.Color(base, base, base + 0.005);

            colorsArray[i3] = finalColor.r;
            colorsArray[i3 + 1] = finalColor.g;
            colorsArray[i3 + 2] = finalColor.b;
        }
        networkMapRef.current = networkMap;

        geometry.setAttribute(
            "a_instancePos",
            new THREE.InstancedBufferAttribute(positionsArray, 3),
        );
        geometry.setAttribute(
            "a_instanceQuaternions",
            new THREE.InstancedBufferAttribute(quaternionsArray, 4),
        );
        const colorAttr = new THREE.InstancedBufferAttribute(colorsArray, 3);
        geometry.setAttribute("a_instanceColor", colorAttr);

        // Store refs for dynamic color animation
        colorAttrRef.current = colorAttr;
        positionsArrayRef.current = new Float32Array(positionsArray);
        baseColorsRef.current = new Float32Array(colorsArray);
        targetColorsRef.current = new Float32Array(colorsArray);
        currentColorsRef.current = new Float32Array(colorsArray);
        dappModeRef.current = false;

        return geometry;
    }, [networks]);

    // Compute dApp target colors when entering dApp mode
    useEffect(() => {
        if (!positionsArrayRef.current || !targetColorsRef.current || !baseColorsRef.current) return;

        if (selectedNetwork && dappNodes && dappNodes.length > 0) {
            // Entering dApp mode - compute sub-continent colors
            const positions = positionsArrayRef.current;
            const target = targetColorsRef.current;
            const networkPos = selectedNetwork.pos;
            const sphereRadius = 2.0;
            const muted = new THREE.Color('#0a0a0a');
            const dark = new THREE.Color('#111');
            const tempVec = new THREE.Vector3();

            for (let i = 0, i3 = 0; i < INSTANCES_COUNT; i++, i3 += 3) {
                const x = positions[i3];
                const y = positions[i3 + 1];
                const z = positions[i3 + 2];

                tempVec.set(x, y, z).normalize();
                const dotNetwork = tempVec.dot(networkPos);

                if (dotNetwork > 0.45) {
                    // Within network region - find closest dApp node
                    let closestDapp = dappNodes[0];
                    let maxDot = -Infinity;
                    for (const dapp of dappNodes) {
                        const d = tempVec.dot(dapp.pos);
                        if (d > maxDot) {
                            maxDot = d;
                            closestDapp = dapp;
                        }
                    }

                    // Color intensity - more muted for metallic look
                    const proximity = Math.max(0, (dotNetwork - 0.45) / 0.55);
                    const tvlBoost = 0.3 + closestDapp.tvlShare * 1.5;
                    const intensity = Math.min(0.6, proximity * tvlBoost);

                    const c = dark.clone().lerp(closestDapp.color, intensity * 0.4);
                    target[i3] = c.r;
                    target[i3 + 1] = c.g;
                    target[i3 + 2] = c.b;
                } else {
                    // Outside network region - muted
                    target[i3] = muted.r;
                    target[i3 + 1] = muted.g;
                    target[i3 + 2] = muted.b;
                }
            }
            dappModeRef.current = true;
        } else {
            // Revert to base network colors
            if (baseColorsRef.current && targetColorsRef.current) {
                targetColorsRef.current.set(baseColorsRef.current);
            }
            dappModeRef.current = false;
        }
    }, [selectedNetwork, dappNodes]);

    const blurPass = useMemo(() => new KawaseBlurPass({ kernelSize: KernelSize.VERY_SMALL }), []);
    const blurRT = useMemo(
        () => {
            const rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
            rt.texture.minFilter = THREE.LinearFilter;
            rt.texture.magFilter = THREE.LinearFilter;
            return rt;
        }, []
    );

    useEffect(() => {
        let _width = Math.floor(width >> 1);
        let _height = Math.floor(height >> 1);
        blurRT.setSize(_width * dpr, _height * dpr);
        blurPass.setSize(_width * dpr, _height * dpr);
        uniformsSphere.u_resolution.value.set(_width * dpr, _height * dpr);
    }, [blurRT, blurPass, width, height, dpr, uniformsSphere])

    const handlePointerDown = (event) => {
        // Track pointer down position to detect drags
        if (event.point) {
            pointerDownPosRef.current = event.point.clone();
            isDraggingRef.current = false;
        }
    }

    const handleClick = (event) => {
        // Only process if this wasn't a drag
        if (isDraggingRef.current) {
            return;
        }

        // Prevent any camera movement/zoom
        event.stopPropagation();
        event.nativeEvent?.stopPropagation();

        if (!event.point) {
            return;
        }

        // Convert world click point to local space of the mesh
        // This ensures correct detection even when the sphere is shifted/rotated
        const localPoint = event.point.clone();
        event.object.worldToLocal(localPoint);
        const pos = localPoint.normalize();

        // dApp mode: if we have a selected network and dApp nodes, check dApp clicks first
        if (selectedNetwork && dappNodes && dappNodes.length > 0) {
            const dotWithNetwork = pos.dot(selectedNetwork.pos);

            if (dotWithNetwork > 0.45) {
                // Within network region - find closest dApp
                let closestDapp = null;
                let maxDappDot = -Infinity;
                for (const dapp of dappNodes) {
                    const d = pos.dot(dapp.pos);
                    if (d > maxDappDot) {
                        maxDappDot = d;
                        closestDapp = dapp;
                    }
                }

                if (closestDapp && onSelectDapp) {
                    onSelectDapp(closestDapp);
                }
                return;
            } else {
                // Clicked outside network region - deselect everything
                if (onSelect) onSelect(null);
                return;
            }
        }

        // Network mode: standard network detection
        let closest = null;
        let maxDot = -Infinity;
        const minDotThreshold = 0.7;

        for (const net of networks) {
            const dot = pos.dot(net.pos);
            if (dot > maxDot) {
                maxDot = dot;
                closest = net;
            }
        }

        // Only select if we have a close enough match and it's an actual click
        if (closest && maxDot >= minDotThreshold && onSelect) {
            // If clicking the same network that's already selected, deselect it
            if (selectedNetwork && selectedNetwork.name === closest.name) {
                onSelect(null);
            } else {
                onSelect(closest);
            }
        }
    }

    const handlePointerMove = (event) => {
        // If pointer moved significantly, it's a drag
        if (pointerDownPosRef.current && event.point) {
            const distance = pointerDownPosRef.current.distanceTo(event.point);
            if (distance > 0.1) {
                isDraggingRef.current = true;
            }
        }

        // Hover detection for tooltips
        if (event.point && onHover && !isDraggingRef.current) {
            const localPoint = event.point.clone();
            event.object.worldToLocal(localPoint);
            const pos = localPoint.normalize();

            // dApp mode hover
            if (selectedNetwork && dappNodes && dappNodes.length > 0) {
                const dotWithNetwork = pos.dot(selectedNetwork.pos);
                if (dotWithNetwork > 0.45) {
                    let closestDapp = null;
                    let maxDot = -Infinity;
                    for (const dapp of dappNodes) {
                        const d = pos.dot(dapp.pos);
                        if (d > maxDot) {
                            maxDot = d;
                            closestDapp = dapp;
                        }
                    }
                    if (closestDapp) {
                        onHover({
                            name: closestDapp.name,
                            type: closestDapp.category || 'Protocol',
                            color: closestDapp.colorHex,
                            screenX: event.nativeEvent?.clientX || 0,
                            screenY: event.nativeEvent?.clientY || 0,
                        });
                        return;
                    }
                }
            }

            // Nothing hovered (network hover disabled)
            onHover(null);
        }
    }

    const handlePointerUp = () => {
        pointerDownPosRef.current = null;
    }

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        const configs = [
            { speed: 0.35, phase: Math.PI / 1.1, plane: 'yz', dir: 1 },
            { speed: 0.25, phase: Math.PI / 3.4, plane: 'xz', dir: -1 },
            { speed: 0.18, phase: Math.PI / 2.2, plane: 'yz', dir: 1 },
            { speed: 0.4, phase: Math.PI / 1.7, plane: 'xy', dir: -1 },
        ];
        const radius = 2.4;

        const updateSphere = (ref, uniform, config) => {
            if (ref.current) {
                const angle = config.dir * config.speed * time + config.phase;
                let pos;
                if (config.plane === 'xy') pos = [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
                else if (config.plane === 'xz') pos = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
                else pos = [0, Math.cos(angle) * radius, Math.sin(angle) * radius];

                ref.current.position.set(...pos);
                uniform.value.copy(ref.current.position);
            }
        };

        updateSphere(sphere1Ref, uniforms.u_sphere1Position, configs[0]);
        updateSphere(sphere2Ref, uniforms.u_sphere2Position, configs[1]);
        updateSphere(sphere3Ref, uniforms.u_sphere3Position, configs[2]);
        updateSphere(sphere4Ref, uniforms.u_sphere4Position, configs[3]);

        // Dynamic color lerping for dApp mode transitions + network flash effects
        if (colorAttrRef.current && currentColorsRef.current && targetColorsRef.current) {
            const current = currentColorsRef.current;
            const target = targetColorsRef.current;
            let needsUpdate = false;

            for (let i = 0; i < current.length; i++) {
                const diff = target[i] - current[i];
                if (Math.abs(diff) > 0.001) {
                    current[i] += diff * 0.06;
                    needsUpdate = true;
                }
            }

            // Flash scheduling - cycle through ALL networks (only when not in dApp mode)
            // Localized flashes: each network flashes only its region
            if (!dappModeRef.current && networks.length > 0) {
                if (time > lastFlashTimeRef.current) {
                    // Cycle sequentially through networks so every color is seen
                    const netIdx = flashNetworkIndexRef.current % networks.length;
                    flashNetworkIndexRef.current = netIdx + 1;
                    flashesRef.current.push({
                        networkIdx: netIdx,
                        startTime: time,
                        duration: 0.4, // Shorter duration
                        color: networks[netIdx].color,
                    });
                    // Less frequent flashes: 0.8-1.5 seconds between flashes
                    lastFlashTimeRef.current = time + 0.8 + Math.random() * 0.7;
                }
                flashesRef.current = flashesRef.current.filter(f => time - f.startTime < f.duration);
                
                // Disable global shader flash - we'll use localized attribute-based flashes only
                uniforms.u_flashIntensity.value = 0.0;
            } else {
                flashesRef.current = [];
                uniforms.u_flashIntensity.value = 0.0;
            }

            // Apply flash overlays to attribute buffer
            const hasFlashes = flashesRef.current.length > 0;
            if (hasFlashes || needsUpdate) {
                const attr = colorAttrRef.current.array;

                if (hasFlashes) {
                    attr.set(current);
                    const nMap = networkMapRef.current;

                    for (const flash of flashesRef.current) {
                        const elapsed = time - flash.startTime;
                        const progress = elapsed / flash.duration;
                        let intensity;
                        // Lightning: instant strike, brief peak, rapid decay
                        if (progress < 0.05) intensity = progress / 0.05;
                        else if (progress < 0.12) intensity = 1.0;
                        else intensity = Math.pow(1.0 - (progress - 0.12) / 0.88, 2.0);
                        intensity = Math.max(0, intensity) * 0.5; // Reduced intensity

                        const cr = flash.color.r * intensity;
                        const cg = flash.color.g * intensity;
                        const cb = flash.color.b * intensity;

                        // Flash the entire orb with the network's color
                        for (let i = 0, i3 = 0; i < INSTANCES_COUNT; i++, i3 += 3) {
                            attr[i3] = Math.min(1.0, attr[i3] + cr);
                            attr[i3 + 1] = Math.min(1.0, attr[i3 + 1] + cg);
                            attr[i3 + 2] = Math.min(1.0, attr[i3 + 2] + cb);
                        }
                    }
                } else {
                    attr.set(current);
                }

                colorAttrRef.current.needsUpdate = true;
            }
        }

        // Update hot continent effect
        if (selectedDapp && selectedDapp.pos) {
            uniforms.u_hotContinentPos.value.copy(selectedDapp.pos);
            uniforms.u_hotColor.value.copy(selectedDapp.color);
            uniforms.u_hotBeamIntensity.value = 0.4 + 0.3 * Math.sin(time * 1.5);
        } else {
            const activeNet = selectedNetwork || networks[Math.floor((time / 6) % networks.length)];
            uniforms.u_hotContinentPos.value.copy(activeNet.pos);
            uniforms.u_hotColor.value.copy(activeNet.color);
            uniforms.u_hotBeamIntensity.value = 0.3 + 0.3 * Math.sin(time * 0.8);
        }

        uniforms.u_noiseCoordOffset.value.set(Math.random(), Math.random());
        uniformsSphere.u_matcap.value = matcap;
    })

    return (
        <>
            <directionalLight
                castShadow
                position={[lightPosition.x, lightPosition.y, lightPosition.z]}
                shadow-camera-left={-3}
                shadow-camera-right={3}
                shadow-camera-top={3}
                shadow-camera-bottom={-3}
                shadow-camera-near={0.1}
                shadow-camera-far={20}
                shadow-bias={-0.0001}
                shadow-mapSize={[1024, 1024]}
            />
            {/* Base sphere removed - was causing visible circle artifact */}
            {/* Transparent click detection sphere - must be before other meshes for proper raycasting */}
            <mesh
                renderOrder={10}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerMissed={() => {
                    // Clicking empty space - deselect if something is selected
                    if (selectedNetwork && onSelect) {
                        onSelect(null);
                    }
                    if (onHover) onHover(null);
                }}
            >
                <sphereGeometry args={[3.2, 48, 48]} />
                <meshBasicMaterial
                    transparent
                    opacity={0}
                    depthWrite={false}
                    depthTest={false}
                    side={THREE.DoubleSide}
                    visible={false}
                />
            </mesh>
            <mesh
                geometry={geometry}
                renderOrder={0}
                receiveShadow
                castShadow
                onAfterRender={(gl) => {
                    const currentRT = gl.getRenderTarget();
                    if (!currentRT) return;
                    blurPass.render(gl, currentRT, blurRT);
                    gl.setRenderTarget(currentRT);
                    uniformsSphere.u_sceneTexture.value = blurRT.texture;
                }}
            >
                <shaderMaterial
                    vertexShader={heroVertexShader}
                    fragmentShader={heroFragmentShader}
                    uniforms={uniforms}
                    lights={true}
                />
                <shaderMaterial
                    attach="customDepthMaterial"
                    vertexShader={heroVertexShader}
                    fragmentShader={heroDepthFragmentShader}
                    uniforms={uniforms}
                    defines={{ IS_DEPTH: true }}
                />
            </mesh>

            {/* Invisible influence group */}
            <group>
                <mesh ref={sphere1Ref} visible={false}>
                    <sphereGeometry args={[0.3, 32, 32]} ref={setSphereGeometry} />
                </mesh>
                <mesh ref={sphere2Ref} visible={false} geometry={sphereGeometry} />
                <mesh ref={sphere3Ref} visible={false} geometry={sphereGeometry} />
                <mesh ref={sphere4Ref} visible={false} geometry={sphereGeometry} />
            </group>

            <mesh rotation-x={-Math.PI / 2} position={[4, -3, -1.5]} >
                <planeGeometry args={[8, 8]} />
                <shaderMaterial
                    vertexShader={floorVertexShader}
                    fragmentShader={floorFragmentShader}
                    uniforms={uniforms}
                    lights={true}
                    transparent={true}
                />
            </mesh>
        </>
    )
}

export default Hero;