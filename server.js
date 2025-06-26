import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

// Configure dotenv to read from .env.local file
dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Caching system
const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const GRID_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for grid-based cache
const GRID_PRECISION = 0.1; // ~11km grid

// Cache statistics
const cacheStats = {
  requests: 0,
  hits: 0,
  misses: 0,
  apiCalls: 0,
  startTime: Date.now()
};

// Round coordinates to grid for location-based caching
function roundToGrid(coord, precision = GRID_PRECISION) {
  return Math.round(coord / precision) * precision;
}

// Generate cache key
function getCacheKey(lat, lon, type = 'exact') {
  if (type === 'grid') {
    const gridLat = roundToGrid(lat);
    const gridLon = roundToGrid(lon);
    return `grid_${gridLat}_${gridLon}`;
  }
  return `exact_${lat}_${lon}`;
}

// Check cache for data
function getCachedData(lat, lon) {
  const now = Date.now();
  
  // Try exact location first
  const exactKey = getCacheKey(lat, lon, 'exact');
  const exactData = cache.get(exactKey);
  if (exactData && (now - exactData.timestamp) < CACHE_DURATION) {
    cacheStats.hits++;
    // // // // console.log(`✅ Cache HIT (exact): ${lat},${lon}`);
    return { ...exactData.data, cached: true, cacheType: 'exact' };
  }
  
  // Try grid-based cache (nearby locations)
  const gridKey = getCacheKey(lat, lon, 'grid');
  const gridData = cache.get(gridKey);
  if (gridData && (now - gridData.timestamp) < GRID_CACHE_DURATION) {
    cacheStats.hits++;
    // // // // console.log(`✅ Cache HIT (grid): ${lat},${lon} -> ${gridKey}`);
    return { ...gridData.data, cached: true, cacheType: 'grid' };
  }
  
  cacheStats.misses++;
  // // // // console.log(`❌ Cache MISS: ${lat},${lon}`);
  return null;
}

// Store data in cache
function setCachedData(lat, lon, data) {
  const now = Date.now();
  
  // Store exact location
  const exactKey = getCacheKey(lat, lon, 'exact');
  cache.set(exactKey, {
    data: data,
    timestamp: now,
    location: { lat, lon }
  });
  
  // Store in grid cache
  const gridKey = getCacheKey(lat, lon, 'grid');
  cache.set(gridKey, {
    data: data,
    timestamp: now,
    location: { lat, lon }
  });
  
  // // // // console.log(`💾 Cached data: ${exactKey} and ${gridKey}`);
}

// Clean expired cache entries
function cleanCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of cache.entries()) {
    const maxAge = key.startsWith('grid_') ? GRID_CACHE_DURATION : CACHE_DURATION;
    if (now - value.timestamp > maxAge) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    // // // // console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
}

// Clean cache every 15 minutes
setInterval(cleanCache, 15 * 60 * 1000);

// Generate mock weather data when API is rate limited
function generateMockWeatherData(lat, lon) {
  const now = new Date();
  
  // Simple mock data that matches the expected structure
  const mockData = {
    "data": {
      "timelines": [
        {
          "timestep": "1d",
          "startTime": now.toISOString(),
          "endTime": new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          "intervals": [
            {
              "startTime": now.toISOString(),
              "values": {
                "temperature": 30,
                "temperatureApparent": 32,
                "humidity": 75,
                "windSpeed": 8,
                "windDirection": 180,
                "weatherCode": 1000,
                "precipitationProbability": 20,
                "precipitationType": 0,
                "pressureSurfaceLevel": 1013,
                "uvIndex": 6,
                "visibility": 15,
                "sunriseTime": new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
                "sunsetTime": new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString()
              }
            },
            {
              "startTime": new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              "values": {
                "temperature": 28,
                "temperatureApparent": 30,
                "humidity": 80,
                "windSpeed": 6,
                "windDirection": 200,
                "weatherCode": 1100,
                "precipitationProbability": 40,
                "precipitationType": 0,
                "pressureSurfaceLevel": 1015,
                "uvIndex": 5,
                "visibility": 12,
                "sunriseTime": new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString(),
                "sunsetTime": new Date(now.getTime() + 42 * 60 * 60 * 1000).toISOString()
              }
            }
          ]
        },
        {
          "timestep": "1h",
          "startTime": now.toISOString(),
          "endTime": new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          "intervals": []
        }
      ]
    },
    "mockData": true,
    "message": "Using mock data due to API rate limit"
  };

  // Generate 24 hours of hourly data
  for (let i = 0; i < 24; i++) {
    const date = new Date(now.getTime() + i * 60 * 60 * 1000);
    const hour = date.getHours();
    const isNight = hour < 6 || hour > 18;
    
    mockData.data.timelines[1].intervals.push({
      "startTime": date.toISOString(),
      "values": {
        "temperature": isNight ? 25 : 32,
        "temperatureApparent": isNight ? 27 : 35,
        "humidity": 70,
        "windSpeed": 5,
        "windDirection": 180,
        "weatherCode": isNight ? 1000 : 1100,
        "precipitationProbability": 30,
        "precipitationType": 0,
        "pressureSurfaceLevel": 1013,
        "uvIndex": isNight ? 0 : 6,
        "visibility": 15,
        "sunriseTime": new Date(date.getTime() - (hour - 6) * 60 * 60 * 1000).toISOString(),
        "sunsetTime": new Date(date.getTime() + (18 - hour) * 60 * 60 * 1000).toISOString()
      }
    });
  }

  return mockData;
}

// Tomorrow.io API proxy endpoint
app.get("/api/weather", async (req, res) => {
  try {
    const { lat, lon, fields, timesteps } = req.query;

    // Update request statistics
    cacheStats.requests++;

    // Log incoming request
    // // // // console.log(`🌤️  Weather request #${cacheStats.requests}:`, { lat, lon });

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.error("Invalid coordinates:", { lat, lon });
      return res.status(400).json({
        error: "Invalid coordinates. Please provide valid latitude and longitude values.",
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.error("Coordinates out of range:", { latitude, longitude });
      return res.status(400).json({
        error: "Coordinates out of valid range.",
      });
    }

    // Check cache first
    const cachedData = getCachedData(latitude, longitude);
    if (cachedData) {
      const cacheHitRate = ((cacheStats.hits / cacheStats.requests) * 100).toFixed(1);
      return res.json({
        ...cachedData,
        cacheHitRate: `${cacheHitRate}%`,
        requestNumber: cacheStats.requests
      });
    }

    const TOMORROW_API_KEY = process.env.TOMORROW_API_KEY;
    const TOMORROW_API_URL = "https://api.tomorrow.io/v4/timelines";

    // Validate API key
    if (!TOMORROW_API_KEY) {
      console.error("TOMORROW_API_KEY is not set in environment variables");
      return res.status(500).json({
        error: "Weather service configuration error. API key not found.",
      });
    }

    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      apikey: TOMORROW_API_KEY,
      location: `${latitude},${longitude}`,
      fields: fields || "temperature,precipitationProbability,precipitationType,weatherCode,humidity,windSpeed,temperatureApparent,visibility",
      timesteps: timesteps || "1h",
      startTime,
      endTime,
      units: "metric",
    });

    const url = `${TOMORROW_API_URL}?${params}`;
    // // // // console.log("🔄 API call:", url.replace(TOMORROW_API_KEY, "***"));

    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit hit - return mock data
        // // // // console.log("⚠️  Rate limit hit, returning mock weather data");
        const mockData = generateMockWeatherData(latitude, longitude);
        
        // Cache the mock data to reduce future API calls
        setCachedData(latitude, longitude, mockData);
        
        const cacheHitRate = ((cacheStats.hits / cacheStats.requests) * 100).toFixed(1);
        return res.json({
          ...mockData,
          cacheHitRate: `${cacheHitRate}%`,
          requestNumber: cacheStats.requests
        });
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error("Tomorrow.io API error:", errorData);
      throw new Error(errorData.message || "Failed to fetch weather data");
    }

    const data = await response.json();
    cacheStats.apiCalls++;

    // Cache the successful response
    setCachedData(latitude, longitude, data);

    // Log successful response
    // // // // console.log("✅ Weather data received and cached");

    const cacheHitRate = ((cacheStats.hits / cacheStats.requests) * 100).toFixed(1);
    res.json({
      ...data,
      cached: false,
      cacheHitRate: `${cacheHitRate}%`,
      requestNumber: cacheStats.requests,
      apiCallsToday: cacheStats.apiCalls
    });

  } catch (error) {
    console.error("Weather API Error:", error);

    // Send appropriate error response
    if (error.message.includes("Invalid coordinates")) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes("Failed to fetch")) {
      res.status(503).json({ error: "Weather service temporarily unavailable" });
    } else {
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
      });
    }
  }
});

// Cache statistics endpoint
app.get("/api/cache-stats", (req, res) => {
  const uptime = Math.floor((Date.now() - cacheStats.startTime) / 1000);
  const cacheHitRate = cacheStats.requests > 0 
    ? ((cacheStats.hits / cacheStats.requests) * 100).toFixed(1)
    : 0;
  
  const apiSavings = cacheStats.hits > 0 
    ? ((cacheStats.hits / (cacheStats.hits + cacheStats.apiCalls)) * 100).toFixed(1)
    : 0;

  res.json({
    uptime: `${Math.floor(uptime / 60)} minutes`,
    cache: {
      totalRequests: cacheStats.requests,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      hitRate: `${cacheHitRate}%`,
      apiCalls: cacheStats.apiCalls,
      apiSavings: `${apiSavings}%`,
      entriesCount: cache.size,
      maxEntries: 1000 // Theoretical max before cleanup
    },
    performance: {
      avgResponseTime: "< 50ms (cached)",
      apiResponseTime: "~500-2000ms",
      cacheDuration: `${CACHE_DURATION / 60000} minutes`,
      gridCacheDuration: `${GRID_CACHE_DURATION / 60000} minutes`,
      gridPrecision: `~${GRID_PRECISION * 111}km` // Rough km conversion
    },
    rateLimitProtection: {
      estimatedDailyCapacity: Math.floor(500 * (100 / (100 - parseFloat(cacheHitRate)))),
      currentApiUsage: cacheStats.apiCalls,
      remainingApiCalls: Math.max(0, 500 - cacheStats.apiCalls)
    }
  });
});

// Cache management endpoint (for debugging)
app.get("/api/cache-info", (req, res) => {
  const cacheEntries = Array.from(cache.entries()).map(([key, value]) => ({
    key,
    age: Math.floor((Date.now() - value.timestamp) / 1000),
    location: value.location,
    type: key.startsWith('grid_') ? 'grid' : 'exact'
  }));

  res.json({
    entries: cacheEntries,
    totalSize: cache.size,
    oldestEntry: cacheEntries.length > 0 
      ? Math.max(...cacheEntries.map(e => e.age))
      : 0
  });
});

// Clear cache endpoint (for testing)
app.post("/api/clear-cache", (req, res) => {
  const oldSize = cache.size;
  cache.clear();
  
  // Reset stats but keep uptime
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.requests = 0;
  cacheStats.apiCalls = 0;
  
  // // // // console.log(`🗑️  Cache cleared: ${oldSize} entries removed`);
  
  res.json({
    message: "Cache cleared successfully",
    entriesRemoved: oldSize,
    newSize: cache.size
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(port, () => {
  // // // // console.log(`🚀 Weather server running on port ${port}`);
  // // // // console.log(`📊 Cache stats: http://localhost:${port}/api/cache-stats`);
  // // // // console.log(`💾 Cache duration: ${CACHE_DURATION / 60000} minutes`);
  // // // // console.log(`🌍 Grid cache: ${GRID_CACHE_DURATION / 60000} minutes (~${GRID_PRECISION * 111}km grid)`);
  // // // // console.log("Environment:", process.env.NODE_ENV || "development");
});
