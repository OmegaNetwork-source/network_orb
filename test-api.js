/**
 * Test script to verify DefiLlama API endpoints
 * Run with: node test-api.js
 */

const BASE_URLS = [
  'https://api.llama.fi',
  'https://defillama.com',
];

async function testEndpoint(baseUrl, endpoint) {
  try {
    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data, url, status: response.status };
    } else {
      const text = await response.text();
      return { success: false, status: response.status, text: text.substring(0, 200), url };
    }
  } catch (error) {
    return { success: false, error: error.message, url };
  }
}

async function testAPI() {
  console.log('=== Testing DefiLlama API ===\n');

  // Test different base URLs and endpoints
  const endpoints = [
    '/api/v2/chains',
    '/v2/chains',
    '/chains',
    '/api/chains',
  ];

  console.log('1. Testing Chain TVL endpoints\n');
  let workingEndpoint = null;
  
  for (const baseUrl of BASE_URLS) {
    console.log(`\nBase URL: ${baseUrl}`);
    for (const endpoint of endpoints) {
      const result = await testEndpoint(baseUrl, endpoint);
      if (result.success) {
        console.log(`  ✓ SUCCESS: ${endpoint}`);
        const data = result.data;
        if (Array.isArray(data) && data.length > 0) {
          console.log(`    Found ${data.length} chains`);
          console.log(`    Sample: ${data[0].name} - TVL: $${(data[0].tvl || 0).toLocaleString()}`);
          console.log(`    Sample keys: ${Object.keys(data[0]).join(', ')}`);
          
          // Check for our networks
          const ourNetworks = ['Ethereum', 'Solana', 'Bitcoin', 'BSC', 'Avalanche'];
          console.log(`\n    Looking for our networks:`);
          ourNetworks.forEach(networkName => {
            const found = data.find(c => c.name === networkName);
            if (found) {
              console.log(`      ✓ ${networkName}: TVL = $${(found.tvl || 0).toLocaleString()}`);
            } else {
              console.log(`      ✗ ${networkName}: NOT FOUND`);
              // Try to find similar names
              const similar = data.filter(c => 
                c.name && (
                  c.name.toLowerCase().includes(networkName.toLowerCase()) ||
                  networkName.toLowerCase().includes(c.name.toLowerCase())
                )
              );
              if (similar.length > 0) {
                console.log(`        Similar: ${similar.map(s => s.name).join(', ')}`);
              }
            }
          });
          
          workingEndpoint = { baseUrl, endpoint, data };
          break;
        }
      } else {
        console.log(`  ✗ ${endpoint}: ${result.status || result.error}`);
      }
    }
    if (workingEndpoint) break;
  }

  // Test Protocols endpoint
  console.log('\n\n2. Testing Protocols endpoints\n');
  
  const protocolEndpoints = [
    '/api/protocols',
    '/protocols',
  ];

  for (const baseUrl of BASE_URLS) {
    console.log(`\nBase URL: ${baseUrl}`);
    for (const endpoint of protocolEndpoints) {
      const result = await testEndpoint(baseUrl, endpoint);
      if (result.success) {
        console.log(`  ✓ SUCCESS: ${endpoint}`);
        const data = result.data;
        if (Array.isArray(data) && data.length > 0) {
          console.log(`    Found ${data.length} protocols`);
          
          // Count protocols per chain
          const chainCounts = {};
          data.forEach(protocol => {
            if (protocol.chains && Array.isArray(protocol.chains)) {
              protocol.chains.forEach(chain => {
                chainCounts[chain] = (chainCounts[chain] || 0) + 1;
              });
            }
          });
          
          console.log(`\n    Protocol counts for our networks:`);
          const ourNetworks = ['Ethereum', 'Solana', 'Bitcoin', 'BSC', 'Avalanche'];
          ourNetworks.forEach(networkName => {
            const count = chainCounts[networkName] || 0;
            console.log(`      ${networkName}: ${count} protocols`);
          });
          break;
        }
      }
    }
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  if (workingEndpoint) {
    console.log(`✓ Working endpoint: ${workingEndpoint.baseUrl}${workingEndpoint.endpoint}`);
    console.log(`  Use this in your code!`);
  } else {
    console.log('✗ No working endpoint found');
    console.log('  The API might require authentication or the endpoints have changed');
  }
}

// Run the test
testAPI().catch(console.error);
