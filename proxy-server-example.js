// Proxy Server with Smart Caching
const express = require('express');
const NodeCache = require('node-cache');
const app = express();
const fetch = require('node-fetch');

// Multi-level cache system
const caches = {
  exact: new NodeCache({ stdTTL: 3600 }), // 1 hour for exact coordinates
  grid: new NodeCache({ stdTTL: 7200 }),   // 2 hours for grid squares
  city: new NodeCache({ stdTTL: 10800 })   // 3 hours for cities
};

// API call counter
let apiCallsToday = 0;
let apiCallsSaved = 0;

// Function to fetch weather data from Tomorrow.io (replace with your actual API key)
async function fetchFromTomorrowIO(lat, lon) {
  const apiKey = 'YOUR_TOMORROWIO_API_KEY'; // Replace with your actual API key
  const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${apiKey}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data from Tomorrow.io:', error);
    throw error;
  }
}

// Mock function for reverse geocoding (replace with a real geocoding service)
async function getCityName(lat, lon) {
  // Replace this with a call to a geocoding service like OpenCage, Nominatim, etc.
  // This is just a placeholder.
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate a city name based on coordinates (for demonstration purposes)
      if (lat > 40 && lat < 50 && lon > -80 && lon < -70) {
        resolve('New York');
      } else if (lat > 30 && lat < 40 && lon > -90 && lon < -80) {
        resolve('Atlanta');
      } else {
        resolve('Unknown City');
      }
    }, 500);
  });
}

// Smart weather endpoint
app.get('/api/weather/:lat/:lon', async (req, res) => {
  const { lat, lon } = req.params;
  const numLat = parseFloat(lat);
  const numLon = parseFloat(lon);

  if (isNaN(numLat) || isNaN(numLon)) {
    return res.status(400).json({ error: 'Invalid latitude or longitude' });
  }
  
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
  } catch (error) {
    console.error("Error getting city name:", error);
  }
  
  // No cache hit - make API call
  try {
    const city = await getCityName(numLat, numLon);
    console.log(`🔄 Making API call #${++apiCallsToday} for ${city}`);
  } catch(error) {
    console.log(`🔄 Making API call #${++apiCallsToday} for ${gridKey}`);
  }
  
  try {
    const weatherData = await fetchFromTomorrowIO(numLat, numLon);
    
    // Cache at all levels
    caches.exact.set(exactKey, weatherData);
    caches.grid.set(gridKey, weatherData);
    try {
      const city = await getCityName(numLat, numLon);
      const cityKey = city.toLowerCase().replace(/\s+/g, '_');
      if (city) caches.city.set(cityKey, weatherData);
    } catch (error) {
      console.error("Error getting city name for caching:", error);
    }
    
    res.json({ ...weatherData, cacheType: 'none', apiCall: true });
  } catch (error) {
    // Fallback to nearest cached data
    const nearestData = findNearestCachedData(numLat, numLon);
    if (nearestData) {
      apiCallsSaved++;
      return res.json({ ...nearestData, cacheType: 'nearest', approximate: true });
    }
    
    res.status(500).json({ error: 'Weather data unavailable' });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const stats = {
    apiCallsToday,
    apiCallsSaved,
    savingsRate: ((apiCallsSaved / (apiCallsToday + apiCallsSaved)) * 100).toFixed(2) + '%',
    cacheStats: {
      exact: caches.exact.keys().length,
      grid: caches.grid.keys().length,
      city: caches.city.keys().length
    },
    estimatedDailyCalls: Math.round(apiCallsToday * (24 / Math.max(new Date().getHours(), 1))),
    servableUsers: Math.round(500 / ((apiCallsToday + 1) / Math.max(apiCallsSaved + 1, 1)))
  };
  
  res.json(stats);
});

// Find nearest cached data (within 10km)
function findNearestCachedData(lat, lon) {
    let nearest = null;
    let minDistance = 10; // 10km max

    // Get all keys from all caches.
    const allKeys = [...caches.grid.keys(), ...caches.city.keys(), ...caches.exact.keys()];

    for (const key of allKeys) {
        let cachedLat, cachedLon;

        // Determine which cache the key belongs to and parse coordinates accordingly
        if (caches.grid.has(key)) {
            [cachedLat, cachedLon] = key.split('_').map(parseFloat);
        } else if (caches.city.has(key) || caches.exact.has(key)) {
            // For city and exact, assume the key is the city/exact key
            continue; // Skip city/exact cache entries; distance calculation not applicable
        } else {
            continue;
        }

        const distance = calculateDistance(lat, lon, cachedLat, cachedLon);

        if (distance < minDistance) {
            minDistance = distance;
            // Retrieve data from the appropriate cache
            if (caches.grid.has(key)) {
                nearest = caches.grid.get(key);
            } else if (caches.city.has(key)) {
                nearest = caches.city.get(key);
            } else if (caches.exact.has(key)) {
                nearest = caches.exact.get(key);
            }
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