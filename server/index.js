const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your React app
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://your-app.vercel.app'],
  credentials: true
}));

app.use(express.json());

// Your 2 API keys
const API_KEYS = [
  {
    key: process.env.TOMORROW_API_KEY_1 || 'WP1YfdsbDqxBeOQFU1ERgQjVhbLGZf9U',
    calls: { daily: 0, hourly: 0 },
    lastReset: { daily: Date.now(), hourly: Date.now() }
  },
  {
    key: process.env.TOMORROW_API_KEY_2 || 'YOUR_SECOND_API_KEY_HERE',
    calls: { daily: 0, hourly: 0 },
    lastReset: { daily: Date.now(), hourly: Date.now() }
  }
];

// Multi-level cache (TTL in seconds)
const caches = {
  exact: new NodeCache({ stdTTL: 3600 }),      // 1 hour
  grid5km: new NodeCache({ stdTTL: 7200 }),     // 2 hours
  city: new NodeCache({ stdTTL: 14400 })        // 4 hours
};

// Statistics
const stats = {
  requests: 0,
  cacheHits: 0,
  apiCalls: 0,
  startTime: Date.now()
};

// Get available API key
function getAvailableApiKey() {
  const now = Date.now();
  
  // Reset counters if needed
  API_KEYS.forEach(api => {
    if (now - api.lastReset.hourly > 3600000) {
      api.calls.hourly = 0;
      api.lastReset.hourly = now;
    }
    if (now - api.lastReset.daily > 86400000) {
      api.calls.daily = 0;
      api.lastReset.daily = now;
    }
  });
  
  // Find key with available capacity
  for (const api of API_KEYS) {
    if (api.calls.hourly < 25 && api.calls.daily < 500) {
      return api;
    }
  }
  
  return null; // All keys exhausted
}

// Round coordinates to grid
function roundToGrid(coord, precision = 20) {
  return Math.round(coord * precision) / precision;
}

// Check all cache levels
function checkCache(lat, lon) {
  // Try exact match
  const exactKey = `${lat}_${lon}`;
  let data = caches.exact.get(exactKey);
  if (data) return { data, type: 'exact' };
  
  // Try 5km grid
  const gridLat = roundToGrid(lat);
  const gridLon = roundToGrid(lon);
  const gridKey = `${gridLat}_${gridLon}`;
  data = caches.grid5km.get(gridKey);
  if (data) return { data, type: '5km grid' };
  
  return null;
}

// Cache data at multiple levels
function cacheData(lat, lon, data) {
  // Exact coordinates
  caches.exact.set(`${lat}_${lon}`, data);
  
  // 5km grid
  const gridLat = roundToGrid(lat);
  const gridLon = roundToGrid(lon);
  caches.grid5km.set(`${gridLat}_${gridLon}`, data);
}

// Fetch from Tomorrow.io
async function fetchFromTomorrowIO(lat, lon, apiKey) {
  const fields = [
    "temperature", "temperatureApparent", "humidity", "windSpeed",
    "windDirection", "weatherCode", "precipitationProbability", "precipitationType",
    "pressureSurfaceLevel", "uvIndex", "visibility", "sunriseTime", "sunsetTime"
  ];
  
  const now = new Date();
  const params = new URLSearchParams({
    apikey: apiKey,
    location: `${lat},${lon}`,
    fields: fields.join(","),
    timesteps: "1h,1d",
    startTime: now.toISOString(),
    endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    units: "metric"
  });
  
  const response = await fetch(`https://api.tomorrow.io/v4/timelines?${params}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }
  
  return response.json();
}

// Main weather endpoint - compatible with existing frontend
app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    
    stats.requests++;
    
    // Check cache first
    const cached = checkCache(lat, lon);
    if (cached) {
      stats.cacheHits++;
      // // // // // console.log(`✅ Cache hit (${cached.type}): ${lat},${lon}`);
      return res.json({
        ...cached.data,
        cached: true,
        cacheType: cached.type,
        cacheHitRate: ((stats.cacheHits / stats.requests) * 100).toFixed(1) + '%'
      });
    }
    
    // Get available API key
    const apiKey = getAvailableApiKey();
    if (!apiKey) {
      // // // // // console.log('❌ All API keys exhausted');
      return res.status(429).json({ 
        error: 'API rate limit reached. Please try again later.',
        retryAfter: 3600 
      });
    }
    
    // Fetch from API
    // // // // // console.log(`🔄 API call for: ${lat},${lon} using key ending in ...${apiKey.key.slice(-4)}`);
    const data = await fetchFromTomorrowIO(lat, lon, apiKey.key);
    
    // Update counters
    apiKey.calls.hourly++;
    apiKey.calls.daily++;
    stats.apiCalls++;
    
    // Cache the response
    cacheData(lat, lon, data);
    
    // Return with metadata
    res.json({
      ...data,
      cached: false,
      apiCallsToday: stats.apiCalls,
      cacheHitRate: ((stats.cacheHits / stats.requests) * 100).toFixed(1) + '%'
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const cacheHitRate = stats.requests > 0 
    ? ((stats.cacheHits / stats.requests) * 100).toFixed(1)
    : 0;
  
  res.json({
    uptime: `${Math.floor(uptime / 60)} minutes`,
    stats: {
      totalRequests: stats.requests,
      cacheHits: stats.cacheHits,
      apiCalls: stats.apiCalls,
      cacheHitRate: cacheHitRate + '%',
      savingsRate: stats.cacheHits > 0 
        ? ((stats.cacheHits / (stats.cacheHits + stats.apiCalls)) * 100).toFixed(1) + '%'
        : '0%'
    },
    apiKeys: API_KEYS.map((key, i) => ({
      id: i + 1,
      daily: `${key.calls.daily}/500`,
      hourly: `${key.calls.hourly}/25`,
      dailyRemaining: 500 - key.calls.daily,
      hourlyRemaining: 25 - key.calls.hourly
    })),
    cache: {
      exact: caches.exact.keys().length,
      grid5km: caches.grid5km.keys().length
    },
    estimatedUsers: Math.floor(stats.requests / 10),
    maxCapacity: Math.floor(1000 * (100 / (100 - parseFloat(cacheHitRate))))
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  // // // // // console.log(`🚀 Weather proxy server running on port ${PORT}`);
  // // // // // console.log(`📊 Stats available at http://localhost:${PORT}/api/stats`);
  // // // // // console.log(`🔑 Using ${API_KEYS.length} API keys`);
  // // // // // console.log(`💾 Cache levels: exact (1h), grid5km (2h), city (4h)`);
});