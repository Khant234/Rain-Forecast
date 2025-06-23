// Proxy Server with Smart Caching
const express = require('express');
const NodeCache = require('node-cache');
const app = express();

// Multi-level cache system
const caches = {
  exact: new NodeCache({ stdTTL: 3600 }), // 1 hour for exact coordinates
  grid: new NodeCache({ stdTTL: 7200 }),   // 2 hours for grid squares
  city: new NodeCache({ stdTTL: 10800 })   // 3 hours for cities
};

// API call counter
let apiCallsToday = 0;
let apiCallsSaved = 0;

// Mock functions (replace with actual implementations)
async function fetchFromTomorrowIO(lat, lon) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Simulate API response
  return { temperature: Math.random() * 30, conditions: 'Sunny' };
}

async function getCityName(lat, lon) {
  // Simulate reverse geocoding delay
  await new Promise(resolve => setTimeout(resolve, 300));
  // Simulate reverse geocoding result
  return 'Example City';
}

// Smart weather endpoint
app.get('/api/weather/:lat/:lon', async (req, res) => {
  const { lat, lon } = req.params;
  const numLat = parseFloat(lat);
  const numLon = parseFloat(lon);

  // Try exact coordinates first
  const exactKey = `${lat}_${lon}`;
  let cachedData = caches.exact.get(exactKey);
  if (cachedData) {
    apiCallsSaved++;
    console.log(`✅ Exact cache hit! Saved calls: ${apiCallsSaved}`);
    return res.json({ ...cachedData, cacheType: 'exact' });
  }

  // Try 5km grid cache
  const gridLat = Math.round(numLat * 20) / 20;
  const gridLon = Math.round(numLon * 20) / 20;
  const gridKey = `${gridLat}_${gridLon}`;
  cachedData = caches.grid.get(gridKey);
  if (cachedData) {
    apiCallsSaved++;
    console.log(`✅ Grid cache hit! Saved calls: ${apiCallsSaved}`);
    caches.exact.set(exactKey, cachedData); // Promote to exact cache
    return res.json({ ...cachedData, cacheType: 'grid' });
  }

  // Try city cache (using reverse geocoding)
  try {
    const city = await getCityName(numLat, numLon);
    const cityKey = city.toLowerCase().replace(/\s+/g, '_');
    cachedData = caches.city.get(cityKey);
    if (cachedData) {
      apiCallsSaved++;
      console.log(`✅ City cache hit! Saved calls: ${apiCallsSaved}`);
      caches.grid.set(gridKey, cachedData); // Promote to grid cache
      caches.exact.set(exactKey, cachedData); // Promote to exact cache
      return res.json({ ...cachedData, cacheType: 'city' });
    }
    console.log(`🔄 Making API call #${++apiCallsToday} for ${city || gridKey}`);

    try {
      const weatherData = await fetchFromTomorrowIO(numLat, numLon);

      // Cache at all levels
      caches.exact.set(exactKey, weatherData);
      caches.grid.set(gridKey, weatherData);
      if (city) caches.city.set(cityKey, weatherData);

      res.json({ ...weatherData, cacheType: 'none', apiCall: true });
    } catch (apiError) {
      console.error("Error fetching weather data:", apiError);
      // Fallback to nearest cached data
      const nearestData = findNearestCachedData(numLat, numLon);
      if (nearestData) {
        apiCallsSaved++;
        return res.json({ ...nearestData, cacheType: 'nearest', approximate: true });
      }

      res.status(500).json({ error: 'Weather data unavailable' });
    }
  } catch (cityError) {
    console.error("Error getting city name:", cityError);
    // Fallback to grid cache or API call directly
        console.log(`🔄 Making API call #${++apiCallsToday} for ${gridKey}`);

    try {
      const weatherData = await fetchFromTomorrowIO(numLat, numLon);

      // Cache at all levels
      caches.exact.set(exactKey, weatherData);
      caches.grid.set(gridKey, weatherData);

      res.json({ ...weatherData, cacheType: 'none', apiCall: true });
    } catch (apiError) {
      console.error("Error fetching weather data:", apiError);
      // Fallback to nearest cached data
      const nearestData = findNearestCachedData(numLat, numLon);
      if (nearestData) {
        apiCallsSaved++;
        return res.json({ ...nearestData, cacheType: 'nearest', approximate: true });
      }

      res.status(500).json({ error: 'Weather data unavailable' });
    }

  }


});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const totalCalls = apiCallsToday + apiCallsSaved;
  const savingsRate = totalCalls === 0 ? '0.00%' : ((apiCallsSaved / totalCalls) * 100).toFixed(2) + '%';

  const stats = {
    apiCallsToday,
    apiCallsSaved,
    savingsRate,
    cacheStats: {
      exact: caches.exact.keys().length,
      grid: caches.grid.keys().length,
      city: caches.city.keys().length
    },
    estimatedDailyCalls: Math.round(apiCallsToday * (24 / new Date().getHours())),
    servableUsers: Math.round(500 / (Math.max(apiCallsToday, 1) / Math.max(apiCallsSaved, 1)))
  };

  res.json(stats);
});

// Find nearest cached data (within 10km)
function findNearestCachedData(lat, lon) {
  const allKeys = caches.grid.keys();
  let nearest = null;
  let minDistance = 10; // 10km max

  for (const key of allKeys) {
    const [cachedLat, cachedLon] = key.split('_').map(parseFloat);
    const distance = calculateDistance(lat, lon, cachedLat, cachedLon);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = caches.grid.get(key);
    }
  }

  return nearest;
}

// Calculate distance between coordinates (km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Reset daily counter at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    console.log(`📊 Daily Stats: ${apiCallsToday} API calls, ${apiCallsSaved} saved`);
    apiCallsToday = 0;
    apiCallsSaved = 0;
  }
}, 60000); // Check every minute

app.listen(3001, () => {
  console.log('🚀 Weather proxy server running on port 3001');
  console.log('📊 Stats available at http://localhost:3001/api/stats');
});