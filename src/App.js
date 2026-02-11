import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import usePostprocessing from './usePostprocessing'
import Background from './Background'
import Hero, { NETWORKS } from './Hero'
import { DAPP_PALETTE_HEX, DAPP_PALETTE_THREE } from './dappPalette'
import './styles.css'

function ShiftGroup({ children, shifted, onPositionUpdate }) {
  const groupRef = useRef();
  const LOCKED_POSITION = -2.5;
  const CENTER_POSITION = 0;

  // Set position IMMEDIATELY and SYNCHRONOUSLY when shifted changes
  // useLayoutEffect runs before browser paint, ensuring position is set before render
  useLayoutEffect(() => {
    if (!groupRef.current) return;

    if (shifted) {
      // Set position synchronously before any render
      groupRef.current.position.x = LOCKED_POSITION;
      groupRef.current.matrixWorldNeedsUpdate = true;
      if (onPositionUpdate) {
        onPositionUpdate(LOCKED_POSITION);
      }
    }
  }, [shifted, onPositionUpdate]);

  // ABSOLUTE LOCK: Force position EVERY SINGLE FRAME when shifted
  // This is the FINAL authority - runs after everything else
  // NO CONDITIONS - just FORCE IT
  useFrame(() => {
    if (!groupRef.current) return;

    // When shifted is true, ALWAYS set position to LOCKED_POSITION
    // Don't check current value, don't check anything - just SET IT
    if (shifted) {
      groupRef.current.position.x = LOCKED_POSITION;
      groupRef.current.matrixWorldNeedsUpdate = true;

      if (onPositionUpdate) {
        onPositionUpdate(LOCKED_POSITION);
      }
      return;
    }

    // Only animate back to center if not shifted
    const currentX = groupRef.current.position.x;
    const diff = Math.abs(CENTER_POSITION - currentX);

    if (diff > 0.001) {
      groupRef.current.position.x += (CENTER_POSITION - currentX) * 0.06;
      groupRef.current.matrixWorldNeedsUpdate = true;
    } else {
      groupRef.current.position.x = CENTER_POSITION;
      groupRef.current.matrixWorldNeedsUpdate = true;
    }

    if (onPositionUpdate) {
      onPositionUpdate(groupRef.current.position.x);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function RotationGroup({ children, targetNetwork, selectedNetwork }) {
  const groupRef = useRef();
  const targetQ = useRef(new THREE.Quaternion());

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Determine target rotation
    const network = selectedNetwork || targetNetwork;

    if (network) {
      // Rotate so network.pos points to (0, 0, 1) (Camera default direction)
      const from = network.pos.clone().normalize();
      const to = new THREE.Vector3(0, 0, 1);
      const q = new THREE.Quaternion();
      q.setFromUnitVectors(from, to);
      targetQ.current.copy(q);
    }

    // Smoothly interpolate
    groupRef.current.quaternion.slerp(targetQ.current, delta * 3.0);
  });

  return <group ref={groupRef}>{children}</group>;
}

function BounceGroup({ children }) {
  const groupRef = useRef();
  const { gl } = useThree();
  const stateRef = useRef({
    y: 0,
    velocity: 0,
    isDown: false,
    prevScreenY: 0,
    prevTime: 0,
    screenVelocity: 0,
  });

  useEffect(() => {
    const canvas = gl.domElement;

    const onDown = (e) => {
      stateRef.current.isDown = true;
      stateRef.current.prevScreenY = e.clientY;
      stateRef.current.prevTime = performance.now();
      stateRef.current.screenVelocity = 0;
    };

    const onMove = (e) => {
      if (!stateRef.current.isDown) return;
      const now = performance.now();
      const dt = (now - stateRef.current.prevTime) / 1000;
      if (dt > 0.001) {
        stateRef.current.screenVelocity = -(e.clientY - stateRef.current.prevScreenY) / dt;
      }
      stateRef.current.prevScreenY = e.clientY;
      stateRef.current.prevTime = now;
    };

    const onUp = () => {
      if (!stateRef.current.isDown) return;
      stateRef.current.isDown = false;
      const flingVelocity = stateRef.current.screenVelocity * 0.0006;
      if (Math.abs(flingVelocity) > 0.05) {
        stateRef.current.velocity += Math.max(-3, Math.min(3, flingVelocity));
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const s = stateRef.current;

    if (!s.isDown) {
      const spring = -15 * s.y;
      const damping = -4.5 * s.velocity;
      s.velocity += (spring + damping) * delta;
      s.y += s.velocity * delta;

      if (Math.abs(s.y) < 0.0005 && Math.abs(s.velocity) < 0.005) {
        s.y = 0;
        s.velocity = 0;
      }
    }

    groupRef.current.position.y = s.y;
  });

  return <group ref={groupRef}>{children}</group>;
}

function Scene({ onSelect, selectedNetwork, onOrbitStart, onScreenPositionUpdate, onShiftPositionUpdate, shiftX, targetNetwork, dappNodes, onSelectDapp, selectedDapp, onHover }) {
  usePostprocessing();
  const controlsRef = useRef();
  const { camera } = useThree();
  const animationRef = useRef(null);

  // Reset Camera to standard position when a network is selected or targeted
  useEffect(() => {
    if (selectedNetwork || targetNetwork) {
      const startPos = camera.position.clone();
      const targetPos = new THREE.Vector3(0, 0, 6);
      const startTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0);
      const endTarget = new THREE.Vector3(0, 0, 0);

      let startTime = Date.now();
      let duration = 1500;

      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(startPos, targetPos, ease);
        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(startTarget, endTarget, ease);
          controlsRef.current.update();
        }
        camera.lookAt(0, 0, 0);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    }
  }, [selectedNetwork, targetNetwork, camera]);

  // Enforce rigid camera radius 6 logic
  useFrame(() => {
    const currentRadius = camera.position.length();
    if (Math.abs(currentRadius - 6) > 0.1 && !selectedNetwork && !targetNetwork) {
      const direction = camera.position.clone().normalize();
      camera.position.copy(direction.multiplyScalar(6));
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) controlsRef.current.update();
    }
  });

  return (
    <>
      <BounceGroup>
        <ShiftGroup
          key="shift-group-permanent"
          shifted={!!selectedNetwork}
          onPositionUpdate={onShiftPositionUpdate}
        >
          <RotationGroup targetNetwork={targetNetwork} selectedNetwork={selectedNetwork}>
            <Hero onSelect={onSelect} selectedNetwork={selectedNetwork} dappNodes={dappNodes} onSelectDapp={onSelectDapp} selectedDapp={selectedDapp} onHover={onHover} />
            {selectedNetwork && (
              <NetworkScreenPosition
                network={selectedNetwork}
                onPositionUpdate={onScreenPositionUpdate}
              />
            )}
          </RotationGroup>
        </ShiftGroup>
      </BounceGroup>
      <Background />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableRotate={!selectedNetwork}
        onStart={() => onOrbitStart && onOrbitStart()}
        enableDamping={false}
      />
    </>
  )
}

function NetworkScreenPosition({ network, onPositionUpdate }) {
  const { camera, size } = useThree();
  const markerRef = useRef();

  useFrame(() => {
    if (!network || !onPositionUpdate || !markerRef.current) return;

    const worldPos = new THREE.Vector3();
    markerRef.current.getWorldPosition(worldPos);

    const vector = worldPos.clone();
    vector.project(camera);

    if (vector.z > 1) return;

    const x = (vector.x * 0.5 + 0.5) * size.width;
    const y = (vector.y * -0.5 + 0.5) * size.height;

    onPositionUpdate({ x, y });
  });

  return <group ref={markerRef} position={network.pos.clone().multiplyScalar(2.0)} />;
}

// Mini sparkline chart component
function Sparkline({ data, color, width = 120, height = 32 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = color || (isPositive ? '#4ade80' : '#f87171');

  return (
    <svg width={width} height={height} className="sparkline-chart">
      <defs>
        <linearGradient id={`grad-${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#grad-${lineColor.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Fear & Greed gauge component
function FearGreedGauge({ value, classification }) {
  if (value === null || value === undefined) return null;
  let color = '#ea3943';
  if (value > 25) color = '#ea8c00';
  if (value > 45) color = '#f5d100';
  if (value > 55) color = '#16c784';
  if (value > 75) color = '#16c784';

  return (
    <div className="fear-greed-gauge">
      <div className="gauge-value" style={{ color }}>{value}</div>
      <div className="gauge-label">{classification}</div>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function StatsCard({ network, onClose, screenPosition, selectedDapp, onBackFromDapp, onSelectDapp, dappNodes }) {
  const [detailedData, setDetailedData] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [dexScreenerData, setDexScreenerData] = useState(null);
  const [stablecoinData, setStablecoinData] = useState(null);
  const [yieldData, setYieldData] = useState(null);
  const [fearGreedData, setFearGreedData] = useState(null);
  const [topYields, setTopYields] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (network) {
      const cacheKey = network.name;
      const cached = networkDataCache.get(cacheKey);

      // Check if we have cached data (and it's not too old - 5 minutes)
      const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
      const isCacheValid = cached && (Date.now() - cached.fetchedAt) < CACHE_MAX_AGE;

      if (isCacheValid) {
        console.log(`Using cached data for ${network.name}`);
        setDetailedData(cached.detailedData);
        setPriceData(cached.priceData);
        setHistoricalData(cached.historicalData);
        setStablecoinData(cached.stablecoinData || null);
        setYieldData(cached.yieldData || null);
        setFearGreedData(cached.fearGreedData || null);
        setTopYields(cached.topYields || null);
        if (cached.dexScreenerData && cached.dexScreenerData.totalLiquidity > 0) {
          setDexScreenerData({
            liquidity: cached.dexScreenerData.totalLiquidity,
            pairCount: cached.dexScreenerData.pairCount
          });
        } else {
          setDexScreenerData(null);
        }
        setLoading(false);
        return;
      }

      setLoading(true);

      const defillamaPromise = import('./services/defillama').then((module) => {
        return module.fetchNetworkDetails(network.name);
      });

      const coingeckoPromise = import('./services/coingecko').then((module) => {
        return module.fetchNetworkCoinData(network.name, network.geckoId);
      }).catch(err => {
        console.error('Error loading CoinGecko module:', err);
        return null;
      });

      const historicalPromise = network.geckoId
        ? import('./services/coingecko').then((module) => {
          return module.fetchHistoricalPrice(network.geckoId, 7);
        }).catch(() => null)
        : Promise.resolve(null);

      const dexscreenerPromise = import('./services/dexscreener').then(async (module) => {
        const chainIdMap = module.DEXSCREENER_CHAIN_MAP || {};
        const chainId = chainIdMap[network.name] || network.name.toLowerCase();

        const liquidityData = await module.fetchChainTotalLiquidity(chainId).catch(() => null);

        if (liquidityData && liquidityData.totalLiquidity > 0) {
          return {
            totalLiquidity: liquidityData.totalLiquidity,
            pairCount: liquidityData.pairCount
          };
        }

        const searchResult = await module.searchTokens(network.symbol || network.name).catch(() => null);
        if (searchResult?.pairs && searchResult.pairs.length > 0) {
          let totalLiquidity = 0;
          searchResult.pairs.slice(0, 10).forEach(pair => {
            if (pair.liquidity?.usd) {
              totalLiquidity += parseFloat(pair.liquidity.usd) || 0;
            }
          });

          if (totalLiquidity > 0) {
            return { totalLiquidity, pairCount: searchResult.pairs.length };
          }
        }

        return null;
      }).catch(() => null);

      // Fetch stablecoin TVL for this chain
      const stablecoinPromise = import('./services/stablecoins').then(async (module) => {
        return module.fetchChainStablecoinTVL(network.name);
      }).catch(() => 0);

      // Fetch yield stats for this chain
      const yieldPromise = import('./services/yields').then(async (module) => {
        return module.fetchChainYieldStats(network.name);
      }).catch(() => null);

      // Fetch top yields for this chain
      const topYieldsPromise = import('./services/yields').then(async (module) => {
        return module.fetchChainTopYields(network.name, 3);
      }).catch(() => null);

      // Fetch Fear & Greed Index (global)
      const fearGreedPromise = import('./services/feargreed').then(async (module) => {
        return module.fetchFearGreedIndex();
      }).catch(() => null);

      Promise.all([
        defillamaPromise,
        coingeckoPromise,
        historicalPromise,
        dexscreenerPromise,
        stablecoinPromise,
        yieldPromise,
        topYieldsPromise,
        fearGreedPromise
      ])
        .then(([defillamaData, coingeckoData, historicalPriceData, dexscreenerResult, stablecoinTvl, yieldStats, topYieldsData, fearGreed]) => {
          setDetailedData(defillamaData);
          setPriceData(coingeckoData);
          setHistoricalData(historicalPriceData);
          setStablecoinData(stablecoinTvl);
          setYieldData(yieldStats);
          setTopYields(topYieldsData);
          setFearGreedData(fearGreed);

          if (dexscreenerResult && dexscreenerResult.totalLiquidity > 0) {
            setDexScreenerData({
              liquidity: dexscreenerResult.totalLiquidity,
              pairCount: dexscreenerResult.pairCount
            });
          } else {
            setDexScreenerData(null);
          }

          networkDataCache.set(cacheKey, {
            detailedData: defillamaData,
            priceData: coingeckoData,
            historicalData: historicalPriceData,
            dexScreenerData: dexscreenerResult,
            stablecoinData: stablecoinTvl,
            yieldData: yieldStats,
            topYields: topYieldsData,
            fearGreedData: fearGreed,
            fetchedAt: Date.now()
          });

          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading data:', err);
          setLoading(false);
        });
    } else {
      setDetailedData(null);
      setPriceData(null);
      setHistoricalData(null);
      setDexScreenerData(null);
      setStablecoinData(null);
      setYieldData(null);
      setTopYields(null);
      setFearGreedData(null);
      setActiveTab('overview');
    }
  }, [network]);

  if (!network) return null;

  // Calculate connector line properties
  let lineStyle = {};
  if (screenPosition) {
    const cardRightPercent = 3; // 3% from right
    const cardWidth = 380;
    const cardRight = (window.innerWidth * cardRightPercent) / 100;
    const cardLeft = window.innerWidth - cardRight - cardWidth;

    // Clamp to viewport with some margin
    const margin = 50;
    const startX = Math.max(-margin, Math.min(screenPosition.x, window.innerWidth + margin));
    const endX = cardLeft;
    const centerY = Math.max(-margin, Math.min(screenPosition.y, window.innerHeight + margin));

    // Only show line if:
    // 1. Start is to the left of the card (with some margin)
    // 2. Position is within reasonable bounds (allowing some margin for smooth transitions)
    // 3. Line would have positive length
    if (startX < endX - 20 && startX > -100 && centerY > -100 && centerY < window.innerHeight + 100) {
      const lineLength = Math.max(0, endX - startX - 20); // 20px gap before card

      if (lineLength > 0) {
        lineStyle = {
          left: `${startX}px`,
          top: `${centerY}px`,
          width: `${lineLength}px`,
          transform: 'translateY(-50%)',
        };
      }
    }
  }

  return (
    <>
      {/* Dynamic connector line */}
      {screenPosition && Object.keys(lineStyle).length > 0 && (
        <div className="connector-line" style={lineStyle} />
      )}

      <div className="glass-card visible" style={{ '--network-color': selectedDapp ? selectedDapp.colorHex : network.color.getStyle(), '--network-color-low': (selectedDapp ? selectedDapp.colorHex : network.color.getStyle()) + '33' }}>
        <button className="close-btn" onClick={onClose}>&times;</button>

        {/* dApp detail view */}
        {selectedDapp ? (
          <>
            <button className="back-btn" onClick={() => { onBackFromDapp(); setActiveTab('dapps'); }}>
              &larr; Back to {network.name}
            </button>
            <div className="card-header">
              {selectedDapp.logo ? (
                <img src={selectedDapp.logo} alt={selectedDapp.name} className="network-icon-img" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="network-icon" style={{ background: selectedDapp.colorHex }} />
              )}
              <div>
                <h2 className="card-title">{selectedDapp.name}</h2>
                <p className="card-subtitle">
                  <span className="category-badge">{selectedDapp.category}</span>
                  {' on '}{network.name}
                </p>
              </div>
            </div>

            <div className="stat-grid">
              <div className="stat-item">
                <div className="stat-label">TVL</div>
                <div className="stat-value">
                  {selectedDapp.tvl >= 1e9
                    ? `$${(selectedDapp.tvl / 1e9).toFixed(2)}B`
                    : selectedDapp.tvl >= 1e6
                      ? `$${(selectedDapp.tvl / 1e6).toFixed(1)}M`
                      : `$${(selectedDapp.tvl / 1e3).toFixed(0)}K`
                  }
                </div>
                <div className="stat-subtext">
                  {(selectedDapp.tvlShare * 100).toFixed(1)}% of {network.name} TVL
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Category</div>
                <div className="stat-value">{selectedDapp.category}</div>
              </div>
              {selectedDapp.url && (
                <a href={selectedDapp.url} target="_blank" rel="noopener noreferrer" className="dapp-external-link">
                  View on DefiLlama &rarr;
                </a>
              )}
            </div>

            <div className="spotlight-box">
              <div className="spotlight-title">Protocol on {network.name}</div>
              <div className="spotlight-content">
                {selectedDapp.name} is a {selectedDapp.category.toLowerCase()} protocol with{' '}
                {selectedDapp.tvl >= 1e9
                  ? `$${(selectedDapp.tvl / 1e9).toFixed(2)}B`
                  : selectedDapp.tvl >= 1e6
                    ? `$${(selectedDapp.tvl / 1e6).toFixed(1)}M`
                    : `$${(selectedDapp.tvl / 1e3).toFixed(0)}K`
                } in total value locked, representing {(selectedDapp.tvlShare * 100).toFixed(1)}% of the {network.name} ecosystem.
              </div>
            </div>
          </>
        ) : (
        <>
        <div className="card-header">
          {network.logo ? (
            <LogoImage
              network={network}
              className="network-icon-img"
              fallbackClassName="network-icon"
            />
          ) : (
            <div className="network-icon" />
          )}
          <div>
            <h2 className="card-title">{network.name} ({network.symbol})</h2>
            <p className="card-subtitle">est. {network.est} {network.marketShareFormatted && `• ${network.marketShareFormatted} market share`}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card-tabs">
          <button
            className={`card-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          {dappNodes && dappNodes.length > 0 && (
            <button
              className={`card-tab ${activeTab === 'dapps' ? 'active' : ''}`}
              onClick={() => setActiveTab('dapps')}
            >
              Dapps
              <span className="tab-count">{dappNodes.length}</span>
            </button>
          )}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
        <>
        {/* Fear & Greed Index - global market sentiment */}
        {fearGreedData && (
          <div className="sentiment-section">
            <FearGreedGauge value={fearGreedData.value} classification={fearGreedData.classification} />
            {fearGreedData.change24h !== null && (
              <div className="sentiment-change">
                <span className={fearGreedData.change24h >= 0 ? 'positive' : 'negative'}>
                  {fearGreedData.change24h >= 0 ? '+' : ''}{fearGreedData.change24h} (24h)
                </span>
                {fearGreedData.change7d !== null && (
                  <span className={fearGreedData.change7d >= 0 ? 'positive' : 'negative'}>
                    {fearGreedData.change7d >= 0 ? '+' : ''}{fearGreedData.change7d} (7d)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="stat-grid">
          {/* Price with sparkline */}
          {priceData?.market_data?.current_price?.usd && (
            <div className="stat-item">
              <div className="stat-label">Price ({network.symbol})</div>
              <div className="stat-price-row">
                <div className="stat-value">
                  ${priceData.market_data.current_price.usd.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                </div>
                {historicalData?.prices && (
                  <Sparkline
                    data={historicalData.prices.map(p => p[1])}
                    color={network.color.getStyle()}
                  />
                )}
              </div>
              <div className="price-changes">
                {priceData.market_data.price_change_percentage_24h !== undefined && (
                  <span className={priceData.market_data.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}>
                    {priceData.market_data.price_change_percentage_24h >= 0 ? '+' : ''}
                    {priceData.market_data.price_change_percentage_24h.toFixed(2)}% 24h
                  </span>
                )}
                {priceData.market_data.price_change_percentage_7d !== undefined && (
                  <span className={priceData.market_data.price_change_percentage_7d >= 0 ? 'positive' : 'negative'}>
                    {priceData.market_data.price_change_percentage_7d >= 0 ? '+' : ''}
                    {priceData.market_data.price_change_percentage_7d.toFixed(2)}% 7d
                  </span>
                )}
                {priceData.market_data.price_change_percentage_30d !== undefined && (
                  <span className={priceData.market_data.price_change_percentage_30d >= 0 ? 'positive' : 'negative'}>
                    {priceData.market_data.price_change_percentage_30d >= 0 ? '+' : ''}
                    {priceData.market_data.price_change_percentage_30d.toFixed(2)}% 30d
                  </span>
                )}
              </div>
              {priceData.market_data.market_cap?.usd && (
                <div className="stat-subtext">
                  Market Cap: ${priceData.market_data.market_cap.usd >= 1e12
                    ? `${(priceData.market_data.market_cap.usd / 1e12).toFixed(2)}T`
                    : `${(priceData.market_data.market_cap.usd / 1e9).toFixed(2)}B`
                  }
                  {priceData.market_data.market_cap_rank && (
                    <span className="rank-badge"> #{priceData.market_data.market_cap_rank}</span>
                  )}
                </div>
              )}
              {priceData.market_data.fully_diluted_valuation?.usd && (
                <div className="stat-subtext">
                  FDV: ${priceData.market_data.fully_diluted_valuation.usd >= 1e12
                    ? `${(priceData.market_data.fully_diluted_valuation.usd / 1e12).toFixed(2)}T`
                    : `${(priceData.market_data.fully_diluted_valuation.usd / 1e9).toFixed(2)}B`
                  }
                </div>
              )}
            </div>
          )}
          <div className="stat-item">
            <div className="stat-label">Total TVL</div>
            <div className="stat-value">{loading ? 'Loading...' : (network.stats.tvl || '$0.0')}</div>
            <div className="tvl-details">
              {network.marketShareFormatted && (
                <div className="stat-subtext">{network.marketShareFormatted} market share</div>
              )}
              {priceData?.market_data?.market_cap?.usd && network.rawTvl > 0 && (
                <div className="stat-subtext">
                  TVL/MCap: {((network.rawTvl / priceData.market_data.market_cap.usd) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
          {detailedData?.dexVolume24h > 0 && (
            <div className="stat-item">
              <div className="stat-label">DEX Volume</div>
              <div className="stat-value">{detailedData.dexVolume24hFormatted}</div>
              <div className="stat-subtext-row">
                {detailedData.dexChange1d !== 0 && (
                  <span className={detailedData.dexChange1d > 0 ? 'positive' : 'negative'}>
                    {detailedData.dexChange1d > 0 ? '+' : ''}{detailedData.dexChange1d.toFixed(1)}% 24h
                  </span>
                )}
                {detailedData.dexVolume7d > 0 && (
                  <span className="stat-subtext">7d: {detailedData.dexVolume7dFormatted}</span>
                )}
              </div>
            </div>
          )}
          {detailedData?.fees24h > 0 && (
            <div className="stat-item">
              <div className="stat-label">Fees & Revenue</div>
              <div className="stat-value">{detailedData.fees24hFormatted} <span className="stat-period">24h fees</span></div>
              {detailedData.revenue24h > 0 && (
                <div className="stat-subtext">Revenue: {detailedData.revenue24hFormatted}
                  {detailedData.fees24h > 0 && detailedData.revenue24h > 0 && (
                    <span> ({((detailedData.revenue24h / detailedData.fees24h) * 100).toFixed(0)}% of fees)</span>
                  )}
                </div>
              )}
              {detailedData.fees7d > 0 && (
                <div className="stat-subtext">7d fees: {detailedData.fees7dFormatted}</div>
              )}
            </div>
          )}
          {priceData?.market_data?.total_volume?.usd && (
            <div className="stat-item">
              <div className="stat-label">24h Trading Volume</div>
              <div className="stat-value">
                ${priceData.market_data.total_volume.usd >= 1e9
                  ? `${(priceData.market_data.total_volume.usd / 1e9).toFixed(2)}B`
                  : `${(priceData.market_data.total_volume.usd / 1e6).toFixed(1)}M`
                }
              </div>
              {priceData.market_data.market_cap?.usd && priceData.market_data.total_volume.usd > 0 && (
                <div className="stat-subtext">
                  Vol/MCap: {((priceData.market_data.total_volume.usd / priceData.market_data.market_cap.usd) * 100).toFixed(2)}%
                </div>
              )}
            </div>
          )}
          {priceData?.market_data?.circulating_supply && (
            <div className="stat-item">
              <div className="stat-label">Supply</div>
              <div className="stat-value">
                {priceData.market_data.circulating_supply > 1e9
                  ? `${(priceData.market_data.circulating_supply / 1e9).toFixed(2)}B ${network.symbol}`
                  : priceData.market_data.circulating_supply > 1e6
                    ? `${(priceData.market_data.circulating_supply / 1e6).toFixed(2)}M ${network.symbol}`
                    : `${priceData.market_data.circulating_supply.toLocaleString()} ${network.symbol}`
                }
              </div>
              {priceData.market_data.max_supply && (
                <div className="stat-subtext">
                  Max: {priceData.market_data.max_supply > 1e9
                    ? `${(priceData.market_data.max_supply / 1e9).toFixed(1)}B`
                    : priceData.market_data.max_supply > 1e6
                      ? `${(priceData.market_data.max_supply / 1e6).toFixed(1)}M`
                      : priceData.market_data.max_supply.toLocaleString()
                  }
                  {' '}({((priceData.market_data.circulating_supply / priceData.market_data.max_supply) * 100).toFixed(1)}% circulating)
                </div>
              )}
              {!priceData.market_data.max_supply && priceData.market_data.total_supply && (
                <div className="stat-subtext">
                  Total: {priceData.market_data.total_supply > 1e9
                    ? `${(priceData.market_data.total_supply / 1e9).toFixed(1)}B`
                    : `${(priceData.market_data.total_supply / 1e6).toFixed(1)}M`
                  }
                </div>
              )}
            </div>
          )}
          {priceData?.market_data?.ath?.usd && (
            <div className="stat-item">
              <div className="stat-label">All-Time High</div>
              <div className="stat-value">
                ${priceData.market_data.ath.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              {priceData.market_data.ath_change_percentage?.usd && (
                <div className="stat-subtext negative">
                  {priceData.market_data.ath_change_percentage.usd.toFixed(1)}% from ATH
                </div>
              )}
              {priceData.market_data.ath_date?.usd && (
                <div className="stat-subtext">
                  {new Date(priceData.market_data.ath_date.usd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          )}
          {/* Stablecoin TVL */}
          {stablecoinData > 0 && (
            <div className="stat-item">
              <div className="stat-label">Stablecoin TVL</div>
              <div className="stat-value">
                {stablecoinData >= 1e9
                  ? `$${(stablecoinData / 1e9).toFixed(2)}B`
                  : `$${(stablecoinData / 1e6).toFixed(1)}M`
                }
              </div>
              {network.rawTvl > 0 && (
                <div className="stat-subtext">
                  {((stablecoinData / network.rawTvl) * 100).toFixed(1)}% of total TVL
                </div>
              )}
            </div>
          )}
          {detailedData?.bridgeVolume24h > 0 && (
            <div className="stat-item">
              <div className="stat-label">Bridge Volume</div>
              <div className="stat-value">{detailedData.bridgeVolume24hFormatted} <span className="stat-period">24h</span></div>
              {detailedData.bridgeCount > 0 && (
                <div className="stat-subtext">{detailedData.bridgeCount} bridges</div>
              )}
              {detailedData.bridgeVolume7d > 0 && (
                <div className="stat-subtext">7d: {detailedData.bridgeVolume7dFormatted}</div>
              )}
            </div>
          )}
          {detailedData?.tvlChange1d !== undefined && detailedData.tvlChange1d !== 0 && (
            <div className="stat-item">
              <div className="stat-label">TVL Changes</div>
              <div className={`stat-value ${detailedData.tvlChange1d >= 0 ? 'positive' : 'negative'}`}>
                {detailedData.tvlChange1d >= 0 ? '+' : ''}{detailedData.tvlChange1d.toFixed(2)}% <span className="stat-period">24h</span>
              </div>
              {detailedData.tvlChange7d !== undefined && detailedData.tvlChange7d !== 0 && (
                <div className={`stat-subtext ${detailedData.tvlChange7d >= 0 ? 'positive' : 'negative'}`}>
                  {detailedData.tvlChange7d >= 0 ? '+' : ''}{detailedData.tvlChange7d.toFixed(2)}% (7d)
                </div>
              )}
            </div>
          )}
          {dexScreenerData?.liquidity && dexScreenerData.liquidity > 0 && (
            <div className="stat-item">
              <div className="stat-label">Total DEX Liquidity</div>
              <div className="stat-value">
                {dexScreenerData.liquidity >= 1e9
                  ? `$${(dexScreenerData.liquidity / 1e9).toFixed(2)}B`
                  : dexScreenerData.liquidity >= 1e6
                    ? `$${(dexScreenerData.liquidity / 1e6).toFixed(1)}M`
                    : `$${(dexScreenerData.liquidity / 1e3).toFixed(0)}K`
                }
              </div>
              {dexScreenerData.pairCount && (
                <div className="stat-subtext">{dexScreenerData.pairCount.toLocaleString()} pairs</div>
              )}
            </div>
          )}
          {/* Yield Stats */}
          {yieldData && yieldData.poolCount > 0 && (
            <div className="stat-item">
              <div className="stat-label">DeFi Yields</div>
              <div className="stat-value">{yieldData.weightedAvgApy.toFixed(2)}% <span className="stat-period">avg APY</span></div>
              <div className="stat-subtext">{yieldData.poolCount.toLocaleString()} pools tracked</div>
              {yieldData.medianApy > 0 && (
                <div className="stat-subtext">Median: {yieldData.medianApy.toFixed(2)}%</div>
              )}
            </div>
          )}
          {priceData?.community_data?.twitter_followers && (
            <div className="stat-item">
              <div className="stat-label">Community</div>
              <div className="stat-value">
                {priceData.community_data.twitter_followers > 1000000
                  ? `${(priceData.community_data.twitter_followers / 1000000).toFixed(1)}M`
                  : priceData.community_data.twitter_followers > 1000
                    ? `${(priceData.community_data.twitter_followers / 1000).toFixed(1)}K`
                    : priceData.community_data.twitter_followers.toLocaleString()
                } <span className="stat-period">followers</span>
              </div>
              {priceData.community_data.reddit_subscribers > 0 && (
                <div className="stat-subtext">
                  Reddit: {priceData.community_data.reddit_subscribers > 1e6
                    ? `${(priceData.community_data.reddit_subscribers / 1e6).toFixed(1)}M`
                    : priceData.community_data.reddit_subscribers > 1e3
                      ? `${(priceData.community_data.reddit_subscribers / 1e3).toFixed(0)}K`
                      : priceData.community_data.reddit_subscribers.toLocaleString()
                  } subscribers
                </div>
              )}
            </div>
          )}
          {priceData?.developer_data?.forks && (
            <div className="stat-item">
              <div className="stat-label">Developer Activity</div>
              <div className="stat-value">
                {priceData.developer_data.stars || 0} stars
              </div>
              <div className="stat-subtext">
                {priceData.developer_data.forks} forks
                {priceData.developer_data.subscribers > 0 && ` / ${priceData.developer_data.subscribers} watchers`}
              </div>
              {priceData.developer_data.commit_count_4_weeks > 0 && (
                <div className="stat-subtext">
                  {priceData.developer_data.commit_count_4_weeks} commits (4wk)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Yield Opportunities */}
        {topYields && topYields.length > 0 && (
          <div className="yields-section">
            <div className="yields-header">
              <h3 className="yields-title">Top Yield Opportunities</h3>
            </div>
            <div className="yields-list">
              {topYields.map((pool, idx) => (
                <div key={idx} className="yield-item">
                  <div className="yield-info">
                    <div className="yield-name">{pool.project}</div>
                    <div className="yield-symbol">{pool.symbol}</div>
                  </div>
                  <div className="yield-stats">
                    <div className="yield-apy">{pool.apy.toFixed(2)}%</div>
                    <div className="yield-tvl">
                      {pool.tvlUsd >= 1e9
                        ? `$${(pool.tvlUsd / 1e9).toFixed(1)}B`
                        : pool.tvlUsd >= 1e6
                          ? `$${(pool.tvlUsd / 1e6).toFixed(0)}M`
                          : `$${(pool.tvlUsd / 1e3).toFixed(0)}K`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="spotlight-box">
          <div className="spotlight-title">Project Spotlight</div>
          <div className="spotlight-content">{network.spotlight}</div>
        </div>
        </>
        )}

        {/* Dapps Tab */}
        {activeTab === 'dapps' && dappNodes && dappNodes.length > 0 && (
          <div className="dapps-tab-content">
            {groupDappsByCategory(dappNodes).map((group) => (
              <div key={group.name} className="dapp-tab-group">
                <div className="dapp-tab-group-header">
                  <span className="dapp-tab-group-name">{group.name}</span>
                  <span className="dapp-tab-group-count">{group.dapps.length}</span>
                </div>
                {group.dapps.map((dapp, idx) => (
                  <div
                    key={idx}
                    className="dapp-tab-item"
                    onClick={() => onSelectDapp && onSelectDapp(dapp)}
                  >
                    <span className="legend-swatch" style={{ background: dapp.colorHex }} />
                    {dapp.logo && (
                      <img src={dapp.logo} alt={dapp.name} className="dapp-tab-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                    <div className="dapp-tab-info">
                      <div className="dapp-tab-name">{dapp.name}</div>
                    </div>
                    <div className="dapp-tab-right">
                      <div className="dapp-tab-tvl">
                        {dapp.tvl >= 1e9
                          ? `$${(dapp.tvl / 1e9).toFixed(2)}B`
                          : dapp.tvl >= 1e6
                            ? `$${(dapp.tvl / 1e6).toFixed(1)}M`
                            : `$${(dapp.tvl / 1e3).toFixed(0)}K`
                        }
                      </div>
                      <div className="dapp-tab-share">{(dapp.tvlShare * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        </>
        )}
      </div>
    </>
  )
}

// Component to handle logo loading with fallbacks
function LogoImage({ network, className, fallbackClassName }) {
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const fallbackRef = useRef(null);

  const logos = network.logoFallbacks
    ? [network.logo, ...network.logoFallbacks]
    : [network.logo];

  const currentLogo = logos[currentLogoIndex];

  const handleError = () => {
    if (currentLogoIndex < logos.length - 1) {
      // Try next fallback
      setCurrentLogoIndex(currentLogoIndex + 1);
    } else {
      // All logos failed, show colored square
      setShowFallback(true);
    }
  };

  if (showFallback || !currentLogo) {
    return (
      <div
        ref={fallbackRef}
        className={fallbackClassName}
        style={{
          backgroundColor: network.color.getStyle()
        }}
      />
    );
  }

  return (
    <>
      <div
        ref={fallbackRef}
        className={fallbackClassName}
        style={{
          backgroundColor: network.color.getStyle(),
          display: 'none'
        }}
      />
      <img
        src={currentLogo}
        alt={network.name}
        className={className}
        onError={handleError}
        onLoad={() => {
          // Ensure colored square stays hidden when logo loads
          if (fallbackRef.current) {
            fallbackRef.current.style.display = 'none';
          }
        }}
      />
    </>
  );
}

// Collect all searchable protocols from cache
function getAllProtocols() {
  const protocols = [];
  const seen = new Set();
  for (const [networkName, data] of networkDataCache.entries()) {
    if (data?.detailedData?.topProtocols) {
      data.detailedData.topProtocols.forEach(p => {
        const key = `${p.name}-${networkName}`;
        if (!seen.has(key)) {
          seen.add(key);
          protocols.push({
            name: p.name,
            tvl: p.tvl || 0,
            category: p.category || 'DeFi',
            logo: p.logo,
            slug: p.slug,
            url: p.url,
            networkName,
            type: 'protocol',
          });
        }
      });
    }
  }
  return protocols;
}

function SearchBar({ onSearch, onSearchDapp }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [networkResults, setNetworkResults] = useState([]);
  const [protocolResults, setProtocolResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tvlRange: 'all',
    marketShare: 'all',
    establishment: 'all',
  });
  const searchRef = useRef(null);
  const filterRef = useRef(null);

  // Comprehensive search across networks + protocols
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    // Network results
    let filtered = [...NETWORKS];
    if (term) {
      filtered = filtered.filter(network =>
        network.name.toLowerCase().includes(term) ||
        network.symbol.toLowerCase().includes(term)
      );
    } else {
      if (filters.tvlRange !== 'all') {
        filtered = filtered.filter(network => {
          const tvl = network.rawTvl || 0;
          if (filters.tvlRange === 'high') return tvl >= 1e9;
          if (filters.tvlRange === 'medium') return tvl >= 1e8 && tvl < 1e9;
          if (filters.tvlRange === 'low') return tvl < 1e8;
          return true;
        });
      }
      if (filters.marketShare !== 'all') {
        const sortedByShare = [...filtered].sort((a, b) => (b.marketShare || 0) - (a.marketShare || 0));
        const top10Count = Math.ceil(sortedByShare.length * 0.1);
        const top25Count = Math.ceil(sortedByShare.length * 0.25);
        if (filters.marketShare === 'top10') {
          const top10Networks = new Set(sortedByShare.slice(0, top10Count).map(n => n.name));
          filtered = filtered.filter(n => top10Networks.has(n.name));
        } else if (filters.marketShare === 'top25') {
          const top25Networks = new Set(sortedByShare.slice(0, top25Count).map(n => n.name));
          filtered = filtered.filter(n => top25Networks.has(n.name));
        }
      }
      if (filters.establishment !== 'all') {
        filtered = filtered.filter(network => {
          const year = parseInt(network.est);
          if (isNaN(year)) return filters.establishment === 'all';
          const currentYear = new Date().getFullYear();
          const age = currentYear - year;
          if (filters.establishment === 'recent') return age <= 5;
          if (filters.establishment === 'established') return age > 5;
          return true;
        });
      }
    }

    // Protocol results (only when searching)
    let protoResults = [];
    if (term) {
      const allProtocols = getAllProtocols();
      protoResults = allProtocols.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.networkName && p.networkName.toLowerCase().includes(term))
      ).sort((a, b) => (b.tvl || 0) - (a.tvl || 0)).slice(0, 8);
    }

    setNetworkResults(term ? filtered.slice(0, 5) : filtered.slice(0, 10));
    setProtocolResults(protoResults);
  }, [searchTerm, filters]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target) &&
        searchRef.current && !searchRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilters]);

  const handleSelect = (network) => {
    setSearchTerm('');
    setShowSuggestions(false);
    setShowFilters(false);
    onSearch(network);
  };

  const handleSelectProtocol = (protocol) => {
    setSearchTerm('');
    setShowSuggestions(false);
    setShowFilters(false);
    if (onSearchDapp) onSearchDapp(protocol);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (networkResults.length > 0) {
        handleSelect(networkResults[0]);
      } else if (protocolResults.length > 0) {
        handleSelectProtocol(protocolResults[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowFilters(false);
      searchRef.current?.blur();
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setShowSuggestions(true);
  };

  const clearFilters = () => {
    setFilters({ tvlRange: 'all', marketShare: 'all', establishment: 'all' });
  };

  const hasActiveFilters = filters.tvlRange !== 'all' ||
    filters.marketShare !== 'all' ||
    filters.establishment !== 'all';

  const hasResults = networkResults.length > 0 || protocolResults.length > 0;

  return (
    <div className="search-container">
      <div className="search-input-wrapper" ref={filterRef}>
        <div className="search-input-container">
          <input
            ref={searchRef}
            type="text"
            className="search-input"
            placeholder="Search networks, protocols, categories..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setSearchTerm(value);
              if (value.trim() !== '') {
                setShowFilters(false);
                setShowSuggestions(true);
              } else {
                setShowFilters(true);
                setShowSuggestions(false);
              }
            }}
            onFocus={() => {
              if (searchTerm.trim() === '') {
                setShowFilters(true);
              } else {
                setShowFilters(false);
                setShowSuggestions(true);
              }
              if (searchTerm.trim() !== '' || hasActiveFilters) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setShowSuggestions(false);
                setShowFilters(false);
              }, 200);
            }}
            onKeyDown={handleKeyDown}
          />
          {hasActiveFilters && (
            <button
              className="clear-filters-btn"
              onClick={(e) => { e.stopPropagation(); clearFilters(); }}
              title="Clear filters"
            >
              ×
            </button>
          )}
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-header">
              <span className="filters-title">Filters</span>
              {hasActiveFilters && (
                <button className="filters-clear-btn" onClick={clearFilters}>Clear all</button>
              )}
            </div>
            <div className="filter-group">
              <div className="filter-label">TVL Range</div>
              <div className="filter-options">
                <button className={`filter-option ${filters.tvlRange === 'high' ? 'active' : ''}`} onClick={() => handleFilterChange('tvlRange', filters.tvlRange === 'high' ? 'all' : 'high')}>High (≥$1B)</button>
                <button className={`filter-option ${filters.tvlRange === 'medium' ? 'active' : ''}`} onClick={() => handleFilterChange('tvlRange', filters.tvlRange === 'medium' ? 'all' : 'medium')}>Medium ($100M-$1B)</button>
                <button className={`filter-option ${filters.tvlRange === 'low' ? 'active' : ''}`} onClick={() => handleFilterChange('tvlRange', filters.tvlRange === 'low' ? 'all' : 'low')}>Low (&lt;$100M)</button>
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-label">Market Share</div>
              <div className="filter-options">
                <button className={`filter-option ${filters.marketShare === 'top10' ? 'active' : ''}`} onClick={() => handleFilterChange('marketShare', filters.marketShare === 'top10' ? 'all' : 'top10')}>Top 10%</button>
                <button className={`filter-option ${filters.marketShare === 'top25' ? 'active' : ''}`} onClick={() => handleFilterChange('marketShare', filters.marketShare === 'top25' ? 'all' : 'top25')}>Top 25%</button>
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-label">Establishment</div>
              <div className="filter-options">
                <button className={`filter-option ${filters.establishment === 'recent' ? 'active' : ''}`} onClick={() => handleFilterChange('establishment', filters.establishment === 'recent' ? 'all' : 'recent')}>Recent (≤5 years)</button>
                <button className={`filter-option ${filters.establishment === 'established' ? 'active' : ''}`} onClick={() => handleFilterChange('establishment', filters.establishment === 'established' ? 'all' : 'established')}>Established (&gt;5 years)</button>
              </div>
            </div>
          </div>
        )}

        {showSuggestions && hasResults && (
          <div className="search-suggestions">
            {networkResults.length > 0 && (
              <>
                <div className="search-section-header">Networks</div>
                {networkResults.map((network, index) => (
                  <div
                    key={`net-${index}`}
                    className="search-suggestion-item"
                    onClick={() => handleSelect(network)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {network.logo ? (
                      <LogoImage network={network} className="suggestion-icon-img" fallbackClassName="suggestion-icon" />
                    ) : (
                      <div className="suggestion-icon" style={{ backgroundColor: network.color.getStyle() }} />
                    )}
                    <div className="suggestion-info">
                      <div className="suggestion-name">{network.name}</div>
                      <div className="suggestion-symbol">{network.symbol}</div>
                    </div>
                    {network.rawTvl > 0 && (
                      <div className="suggestion-tvl">
                        {network.rawTvl >= 1e9 ? `$${(network.rawTvl / 1e9).toFixed(1)}B` : `$${(network.rawTvl / 1e6).toFixed(0)}M`}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            {protocolResults.length > 0 && (
              <>
                <div className="search-section-header">Protocols</div>
                {protocolResults.map((protocol, index) => (
                  <div
                    key={`proto-${index}`}
                    className="search-suggestion-item"
                    onClick={() => handleSelectProtocol(protocol)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {protocol.logo ? (
                      <img src={protocol.logo} alt={protocol.name} className="suggestion-icon-img" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="suggestion-icon" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    )}
                    <div className="suggestion-info">
                      <div className="suggestion-name">{protocol.name}</div>
                      <div className="suggestion-symbol">{protocol.networkName} &middot; {protocol.category}</div>
                    </div>
                    {protocol.tvl > 0 && (
                      <div className="suggestion-tvl">
                        {protocol.tvl >= 1e9 ? `$${(protocol.tvl / 1e9).toFixed(1)}B` : protocol.tvl >= 1e6 ? `$${(protocol.tvl / 1e6).toFixed(0)}M` : `$${(protocol.tvl / 1e3).toFixed(0)}K`}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Data cache for network details - pre-fetched on load
const networkDataCache = new Map();

// Pre-fetch data for all networks
async function preFetchNetworkData() {
  console.log('Pre-fetching network data...');
  const networksToFetch = [...NETWORKS];

  // Fetch data for all networks in parallel (with rate limiting)
  const fetchPromises = networksToFetch.map(async (network, index) => {
    // Stagger requests slightly to avoid overwhelming APIs
    await new Promise(resolve => setTimeout(resolve, index * 50));

    try {
      const [defillamaModule, coingeckoModule, dexscreenerModule, stablecoinsModule, yieldsModule, feargreedModule] = await Promise.all([
        import('./services/defillama'),
        import('./services/coingecko').catch(() => null),
        import('./services/dexscreener').catch(() => null),
        import('./services/stablecoins').catch(() => null),
        import('./services/yields').catch(() => null),
        import('./services/feargreed').catch(() => null),
      ]);

      const cacheKey = network.name;

      // Fetch all data in parallel for this network
      const [defillamaData, coingeckoData, historicalData, dexscreenerData, stablecoinData, yieldData, topYieldsData, fearGreedData] = await Promise.allSettled([
        defillamaModule.fetchNetworkDetails(network.name),
        coingeckoModule?.fetchNetworkCoinData(network.name, network.geckoId) || Promise.resolve(null),
        network.geckoId && coingeckoModule?.fetchHistoricalPrice(network.geckoId, 7) || Promise.resolve(null),
        dexscreenerModule ? (async () => {
          const chainIdMap = dexscreenerModule.DEXSCREENER_CHAIN_MAP || {
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
          };
          const chainId = chainIdMap[network.name] || network.name.toLowerCase();

          try {
            // Try fetchChainTotalLiquidity first (more accurate)
            if (dexscreenerModule.fetchChainTotalLiquidity) {
              const liquidityData = await dexscreenerModule.fetchChainTotalLiquidity(chainId).catch(() => null);
              if (liquidityData && liquidityData.totalLiquidity > 0) {
                return {
                  totalLiquidity: liquidityData.totalLiquidity,
                  pairCount: liquidityData.pairCount
                };
              }
            }

            // Fallback: search for tokens
            const searchResult = await dexscreenerModule.searchTokens(network.symbol || network.name).catch(() => null);
            if (searchResult?.pairs && searchResult.pairs.length > 0) {
              let totalLiquidity = 0;
              searchResult.pairs.slice(0, 10).forEach(pair => {
                if (pair.liquidity?.usd) {
                  totalLiquidity += parseFloat(pair.liquidity.usd) || 0;
                }
              });
              if (totalLiquidity > 0) {
                return {
                  totalLiquidity,
                  pairCount: searchResult.pairs.length
                };
              }
            }
          } catch (e) {
            return null;
          }
          return null;
        })() : Promise.resolve(null),
        stablecoinsModule?.fetchChainStablecoinTVL(network.name) || Promise.resolve(0),
        yieldsModule?.fetchChainYieldStats(network.name) || Promise.resolve(null),
        yieldsModule?.fetchChainTopYields(network.name, 3) || Promise.resolve(null),
        feargreedModule?.fetchFearGreedIndex() || Promise.resolve(null),
      ]);

      // Store in cache
      networkDataCache.set(cacheKey, {
        detailedData: defillamaData.status === 'fulfilled' ? defillamaData.value : null,
        priceData: coingeckoData.status === 'fulfilled' ? coingeckoData.value : null,
        historicalData: historicalData.status === 'fulfilled' ? historicalData.value : null,
        dexScreenerData: dexscreenerData.status === 'fulfilled' ? dexscreenerData.value : null,
        stablecoinData: stablecoinData.status === 'fulfilled' ? stablecoinData.value : 0,
        yieldData: yieldData.status === 'fulfilled' ? yieldData.value : null,
        topYields: topYieldsData.status === 'fulfilled' ? topYieldsData.value : null,
        fearGreedData: fearGreedData.status === 'fulfilled' ? fearGreedData.value : null,
        fetchedAt: Date.now()
      });

      console.log(`✓ Cached data for ${network.name}`);
    } catch (error) {
      console.error(`Error pre-fetching data for ${network.name}:`, error);
    }
  });

  await Promise.allSettled(fetchPromises);
  console.log(`Pre-fetching complete. Cached ${networkDataCache.size} networks.`);
}

// Map DefiLlama categories to display groups
const CATEGORY_GROUP_MAP = {
  'CEX': 'CEXs',
  'Dexes': 'DEXs',
  'Dexs': 'DEXs',
  'DEX': 'DEXs',
  'Lending': 'Lending',
  'CDP': 'Lending',
  'NFT Marketplace': 'NFTs',
  'NFT Lending': 'NFTs',
  'NFT': 'NFTs',
  'Gaming': 'GameFi',
  'GameFi': 'GameFi',
  'Prediction Market': 'GameFi',
  'Wallet': 'Wallets',
  'Liquid Staking': 'Staking',
  'Restaking': 'Staking',
  'Staking': 'Staking',
  'Bridge': 'Bridges',
  'Cross Chain': 'Bridges',
};

const CATEGORY_ORDER = ['DEXs', 'Lending', 'Staking', 'Bridges', 'CEXs', 'NFTs', 'GameFi', 'Wallets', 'Other'];

function getCategoryGroup(rawCategory) {
  return CATEGORY_GROUP_MAP[rawCategory] || 'Other';
}

function groupDappsByCategory(dapps) {
  const groups = {};
  dapps.forEach(dapp => {
    const group = getCategoryGroup(dapp.category);
    if (!groups[group]) groups[group] = [];
    groups[group].push(dapp);
  });
  // Sort by CATEGORY_ORDER
  return CATEGORY_ORDER
    .filter(cat => groups[cat] && groups[cat].length > 0)
    .map(cat => ({ name: cat, dapps: groups[cat] }));
}

// Compute dApp node positions within a network's spherical cap
function computeDappNodes(network, protocols) {
  if (!network || !protocols || protocols.length === 0) return [];

  const networkPos = network.pos.clone().normalize();
  const maxSpread = 0.4; // radians

  // Sort by TVL descending - largest dApp gets center
  const sorted = [...protocols].sort((a, b) => (b.tvl || 0) - (a.tvl || 0)).slice(0, 20);
  const totalTvl = sorted.reduce((sum, p) => sum + (p.tvl || 0), 0);

  // Generate an orthonormal basis on the spherical cap
  const up = new THREE.Vector3(0, 1, 0);
  let tangent = new THREE.Vector3().crossVectors(up, networkPos);
  if (tangent.length() < 0.01) {
    tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), networkPos);
  }
  tangent.normalize();
  const bitangent = new THREE.Vector3().crossVectors(networkPos, tangent).normalize();

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return sorted.map((protocol, i) => {
    const tvlShare = totalTvl > 0 ? (protocol.tvl || 0) / totalTvl : 1 / sorted.length;

    // Spiral distribution: center for largest, outward for smaller
    let pos;
    if (i === 0) {
      pos = networkPos.clone();
    } else {
      const r = maxSpread * Math.sqrt(i / sorted.length);
      const theta = goldenAngle * i;
      const offset = tangent.clone().multiplyScalar(Math.cos(theta) * r)
        .add(bitangent.clone().multiplyScalar(Math.sin(theta) * r));
      pos = networkPos.clone().add(offset).normalize();
    }

    const colorIdx = i % DAPP_PALETTE_THREE.length;

    return {
      name: protocol.name,
      category: protocol.category || 'DeFi',
      tvl: protocol.tvl || 0,
      tvlShare,
      pos,
      color: DAPP_PALETTE_THREE[colorIdx].clone(),
      colorHex: DAPP_PALETTE_HEX[colorIdx],
      logo: protocol.logo,
      slug: protocol.slug,
      url: protocol.url || (protocol.slug ? `https://defillama.com/protocol/${protocol.slug}` : null),
    };
  });
}

// Hover tooltip component
function HoverTooltip({ hoveredItem }) {
  if (!hoveredItem) return null;

  return (
    <div
      className="hover-tooltip"
      style={{
        left: `${hoveredItem.screenX + 16}px`,
        top: `${hoveredItem.screenY - 12}px`,
      }}
    >
      <span className="tooltip-dot" style={{ background: hoveredItem.color }} />
      <span className="tooltip-name">{hoveredItem.name}</span>
      <span className="tooltip-type">{hoveredItem.type}</span>
    </div>
  );
}

export default function App() {
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [screenPosition, setScreenPosition] = useState(null);
  const [shiftX, setShiftX] = useState(0);
  const [targetNetwork, setTargetNetwork] = useState(null);
  const [cacheReady, setCacheReady] = useState(false);
  const [selectedDapp, setSelectedDapp] = useState(null);
  const [dappNodes, setDappNodes] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const pendingDappRef = useRef(null);

  // Mobile detection for adaptive rendering - more reliable
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768 && 'ontouchstart' in window)
  );

  // Pre-fetch data when networks are loaded
  useEffect(() => {
    let mounted = true;
    let checkInterval = null;

    // Check periodically for networks to be loaded
    const startPreFetch = () => {
      if (NETWORKS.length > 0 && NETWORKS[0].name !== undefined) {
        console.log(`Starting pre-fetch for ${NETWORKS.length} networks...`);
        preFetchNetworkData().then(() => {
          if (mounted) {
            setCacheReady(true);
            console.log('Network data cache ready!');
          }
        });
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      }
    };

    // Try immediately
    startPreFetch();

    // If networks aren't ready, check every 500ms
    if (NETWORKS.length === 0 || NETWORKS[0].name === undefined) {
      checkInterval = setInterval(startPreFetch, 500);
    }

    return () => {
      mounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  // Compute dApp nodes when a network is selected
  useEffect(() => {
    let cancelled = false;

    if (selectedNetwork) {
      const cacheKey = selectedNetwork.name;
      const cached = networkDataCache.get(cacheKey);

      if (cached?.detailedData?.topProtocols && cached.detailedData.topProtocols.length > 0) {
        const nodes = computeDappNodes(selectedNetwork, cached.detailedData.topProtocols);
        if (!cancelled) {
          setDappNodes(nodes);
        }
      } else {
        // Try to fetch data if not cached yet
        import('./services/defillama').then(module => {
          return module.fetchNetworkDetails(selectedNetwork.name);
        }).then(data => {
          if (!cancelled && data?.topProtocols) {
            const nodes = computeDappNodes(selectedNetwork, data.topProtocols);
            setDappNodes(nodes);
          }
        }).catch(() => {
          if (!cancelled) setDappNodes(null);
        });
      }
    } else {
      setDappNodes(null);
      setSelectedDapp(null);
    }

    return () => { cancelled = true; };
  }, [selectedNetwork]);

  // Auto-select dApp when dappNodes are computed after a search-driven navigation
  useEffect(() => {
    if (pendingDappRef.current && dappNodes && dappNodes.length > 0) {
      const name = pendingDappRef.current;
      const match = dappNodes.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (match) {
        setSelectedDapp(match);
      }
      pendingDappRef.current = null;
    }
  }, [dappNodes]);

  const handleSelectDapp = useCallback((dapp) => {
    setSelectedDapp(dapp);
  }, []);

  const handleBackFromDapp = useCallback(() => {
    setSelectedDapp(null);
  }, []);

  const handleHover = useCallback((item) => {
    setHoveredItem(item);
  }, []);

  const handleOrbitStart = useCallback(() => {
    // When user starts orbiting, close the box and recenter the sphere
    setSelectedNetwork(null);
    setScreenPosition(null);
    setSelectedDapp(null);
    setDappNodes(null);
    setHoveredItem(null);
    // Reset shift position to ensure sphere recenters
    setShiftX(0);
  }, []);

  const handleScreenPositionUpdate = useCallback((position) => {
    setScreenPosition(position);
  }, []);

  const handleShiftPositionUpdate = useCallback((x) => {
    setShiftX(x);
  }, []);

  const handleSearch = useCallback((network) => {
    setTargetNetwork(network);
    setTimeout(() => {
      setSelectedNetwork(network);
      setTargetNetwork(null);
    }, 100);
  }, []);

  const handleSearchDapp = useCallback((protocol) => {
    const network = NETWORKS.find(n => n.name === protocol.networkName);
    if (!network) return;
    pendingDappRef.current = protocol.name;
    setTargetNetwork(network);
    setTimeout(() => {
      setSelectedNetwork(network);
      setTargetNetwork(null);
    }, 100);
  }, []);

  useEffect(() => {
    if (!selectedNetwork) {
      setScreenPosition(null);
    }
  }, [selectedNetwork]);

  return (
    <div className="app-container">
      <SearchBar onSearch={handleSearch} onSearchDapp={handleSearchDapp} />
      <Canvas
        dpr={isMobile ? [1, 1] : [1, 1.5]}
        camera={{ position: [0, 0, 6], near: 0.1, far: 30, fov: 60 }}
        gl={{
          powerPreference: "high-performance",
          antialias: false,
          stencil: false,
          alpha: false,
        }}
        shadows={!isMobile}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene
          onSelect={setSelectedNetwork}
          selectedNetwork={selectedNetwork}
          onOrbitStart={handleOrbitStart}
          onScreenPositionUpdate={handleScreenPositionUpdate}
          onShiftPositionUpdate={handleShiftPositionUpdate}
          shiftX={shiftX}
          targetNetwork={targetNetwork}
          dappNodes={dappNodes}
          onSelectDapp={handleSelectDapp}
          selectedDapp={selectedDapp}
          onHover={handleHover}
        />
      </Canvas>

      <StatsCard
        network={selectedNetwork}
        onClose={() => { setSelectedNetwork(null); setSelectedDapp(null); }}
        screenPosition={screenPosition}
        selectedDapp={selectedDapp}
        onBackFromDapp={handleBackFromDapp}
        onSelectDapp={handleSelectDapp}
        dappNodes={dappNodes}
      />

      <HoverTooltip hoveredItem={hoveredItem} />
    </div>
  )
}
