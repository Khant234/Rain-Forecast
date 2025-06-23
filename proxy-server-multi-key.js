// Multi-API Key Proxy Server with Load Balancing
const express = require('express');
const NodeCache = require('node-cache');

const app = express();

// Multiple API keys with tracking
const apiKeys = [
  {
    key: 'API_KEY_1',
    calls: { daily: 0, hourly: 0 },
    limits: { daily: 500, hourly: 25 },
    lastReset: { daily: Date.now(), hourly: Date.now() }
  },
  {
    key: 'API_KEY_2',
    calls: { daily: 0, hourly: 0 },
    limits: { daily: 500, hourly: 25 },
    lastReset: { daily: Date.now(), hourly: Date.now() }
  }
];

// Enhanced caching system
const caches = {
  exact: new NodeCache({ stdTTL: 3600 }),      // 1 hour
  grid5km: new NodeCache({ stdTTL: 7200 }),     // 2 hours  
  grid10km: new NodeCache({ stdTTL: 10800 }),   // 3 hours
  city: new NodeCache({ stdTTL: 14400 }),       // 4 hours
  region: new NodeCache({ stdTTL: 21600 })      // 6 hours
};

// Statistics
const stats = {
  totalRequests: 0,
  cacheHits: 0,
  apiCalls: 0,
  uniqueLocations: new Set(),
  peakHourRequests: new Array(24).fill(0)
};

// Get best available API key
function getBestApiKey() {
  // Reset counters if needed
  apiKeys.forEach(api => {
    const now = Date.now();
    
    // Reset hourly counter
    if (now - api.lastReset.hourly > 3600000) {
      api.calls.hourly = 0;
      api.lastReset.hourly = now;
    }
    
    // Reset daily counter
    if (now - api.lastReset.daily > 86400000) {
      api.calls.daily = 0;
      api.lastReset.daily = now;
    }
  });
  
  // Find key with most remaining capacity
  return apiKeys.reduce((best, current) => {
    const bestRemaining = (best.limits.daily - best.calls.daily) + 
                         (best.limits.hourly - best.calls.hourly) * 10;
    const currentRemaining = (current.limits.daily - current.calls.daily) + 
                            (current.limits.hourly - current.calls.hourly) * 10;
    
    return currentRemaining > bestRemaining ? current : best;
  });
}

// Multi-level cache check
async function checkAllCaches(lat, lon) {
  const checks = [
    // Level 1: Exact match
    { 
      key: `exact_${lat}_${lon}`,
      cache: 'exact',
      type: 'exact'
    },
    // Level 2: 1km grid (~0.01 degree)
    { 
      key: `grid1km_${Math.round(lat * 100) / 100}_${Math.round(lon * 100) / 100}`,
      cache: 'exact',
      type: '1km grid'
    },
    // Level 3: 5km grid (~0.05 degree)
    { 
      key: `grid5km_${Math.round(lat * 20) / 20}_${Math.round(lon * 20) / 20}`,
      cache: 'grid5km',
      type: '5km grid'
    },
    // Level 4: 10km grid (~0.1 degree)
    { 
      key: `grid10km_${Math.round(lat * 10) / 10}_${Math.round(lon * 10) / 10}`,
      cache: 'grid10km',
      type: '10km grid'
    }
  ];
  
  for (const check of checks) {
    const data = caches[check.cache].get(check.key);
    if (data) {
      return { data, cacheType: check.type };
    }
  }
  
  return null;
}

// Weather endpoint
app.get('/api/weather/:lat/:lon', async (req, res) => {
  const { lat, lon } = req.params;
  const numLat = parseFloat(lat);
  const numLon = parseFloat(lon);
  const hour = new Date().getHours();
  
  stats.totalRequests++;
  stats.peakHourRequests[hour]++;
  stats.uniqueLocations.add(`${Math.round(numLat * 10) / 10}_${Math.round(numLon * 10) / 10}`);
  
  // Check all cache levels
  const cached = await checkAllCaches(numLat, numLon);
  if (cached) {
    stats.cacheHits++;
    return res.json({
      ...cached.data,
      cached: true,
      cacheType: cached.cacheType,
      stats: {
        cacheHitRate: ((stats.cacheHits / stats.totalRequests) * 100).toFixed(2) + '%'
      }
    });
  }
  
  // No cache hit - use best API key
  const apiKey = getBestApiKey();
  
  if (apiKey.calls.hourly >= apiKey.limits.hourly || 
      apiKey.calls.daily >= apiKey.limits.daily) {
    // All keys exhausted - return nearest cached data
    const nearest = findNearestCache(numLat, numLon); // This needs to be implemented
    if (nearest) {
      stats.cacheHits++;
      return res.json({
        ...nearest,
        cached: true,
        cacheType: 'nearest neighbor',
        approximate: true
      });
    }
    
    const nextReset = Math.min(
        ...apiKeys.map(
            k => Math.min(k.lastReset.hourly + 3600000, k.lastReset.daily + 86400000) - Date.now()
        )
    );

    return res.status(429).json({
      error: 'API limit reached',
      nextReset: nextReset
    });
  }
  
  try {
    // Make API call
    stats.apiCalls++;
    apiKey.calls.hourly++;
    apiKey.calls.daily++;
    
    const weatherData = await fetchWeatherData(numLat, numLon, apiKey.key); // This needs to be implemented
    
    // Cache at multiple levels
    cacheAtAllLevels(numLat, numLon, weatherData);
    
    res.json({
      ...weatherData,
      cached: false,
      stats: {
        apiCallsToday: stats.apiCalls,
        cacheHitRate: ((stats.cacheHits / stats.totalRequests) * 100).toFixed(2) + '%'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cache at multiple granularities
function cacheAtAllLevels(lat, lon, data) {
  // Exact coordinates
  caches.exact.set(`exact_${lat}_${lon}`, data);
  
  // 1km grid
  caches.exact.set(
    `grid1km_${Math.round(lat * 100) / 100}_${Math.round(lon * 100) / 100}`, 
    data
  );
  
  // 5km grid
  caches.grid5km.set(
    `grid5km_${Math.round(lat * 20) / 20}_${Math.round(lon * 20) / 20}`, 
    data
  );
  
  // 10km grid
  caches.grid10km.set(
    `grid10km_${Math.round(lat * 10) / 10}_${Math.round(lon * 10) / 10}`, 
    data
  );
}

// Statistics endpoint
app.get('/api/stats', (req, res) => {
  const totalCapacity = apiKeys.reduce((sum, key) => sum + key.limits.daily, 0);
  const usedCapacity = apiKeys.reduce((sum, key) => sum + key.calls.daily, 0);
  const cacheHitRate = (stats.cacheHits / Math.max(stats.totalRequests, 1)) * 100;
  
  // Calculate maximum servable users
  const avgRequestsPerUser = 10; // Assume 10 requests per user per day
  const effectiveMultiplier = cacheHitRate / 10; // How many users per API call
  const maxUsers = Math.round(totalCapacity * effectiveMultiplier);
  
  res.json({
    apiKeys: apiKeys.map((k, i) => ({
      id: i + 1,
      daily: `${k.calls.daily}/${k.limits.daily}`,
      hourly: `${k.calls.hourly}/${k.limits.hourly}`,
      utilizationRate: ((k.calls.daily / k.limits.daily) * 100).toFixed(1) + '%'
    })),
    overall: {
      totalRequests: stats.totalRequests,
      apiCalls: stats.apiCalls,
      cacheHits: stats.cacheHits,
      cacheHitRate: cacheHitRate.toFixed(2) + '%',
      uniqueLocations: stats.uniqueLocations.size,
      capacityUsed: `${usedCapacity}/${totalCapacity}`,
      estimatedMaxUsers: maxUsers,
      currentUsers: Math.round(stats.totalRequests / avgRequestsPerUser)
    },
    peakHours: stats.peakHourRequests
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(p => `${p.hour}:00 (${p.count} requests)`)
  });
});

// Predictive pre-caching for popular areas
setInterval(() => {
  const popularGrids = Array.from(stats.uniqueLocations)
    .map(loc => {
      const [lat, lon] = loc.split('_').map(parseFloat);
      return { lat, lon, count: 1 };
    })
    .slice(0, 20); // Top 20 locations
  
  popularGrids.forEach(async ({ lat, lon }) => {
    const cached = await checkAllCaches(lat, lon);
    if (!cached) {
      // Pre-fetch during low usage hours
      const hour = new Date().getHours();
      if (hour >= 2 && hour <= 5) { // 2 AM - 5 AM
        console.log(`Pre-caching popular location: ${lat}, ${lon}`);
        // Make API call with least used key
        const apiKey = getBestApiKey();
        if (apiKey.calls.daily < apiKey.limits.daily * 0.8) {
          // Only pre-cache if we have 20% capacity remaining
          try {
            const data = await fetchWeatherData(lat, lon, apiKey.key); // This needs to be implemented
            cacheAtAllLevels(lat, lon, data);
            apiKey.calls.daily++;
            stats.apiCalls++;
          } catch (error) {
            console.error('Pre-cache error:', error);
          }
        }
      }
    });
}, 3600000); // Every hour

app.listen(3001, () => {
  console.log('🚀 Multi-key weather proxy running on port 3001');
  console.log('📊 Stats: http://localhost:3001/api/stats');
});

// Mock implementations - REPLACE with real functions
async function fetchWeatherData(lat, lon, apiKey) {
    // Replace with actual API call
    return { temperature: 20, conditions: 'Sunny', lat, lon };
}

function findNearestCache(lat, lon) {
    // Replace with actual nearest neighbor search
    return null; // Or return some cached data
}