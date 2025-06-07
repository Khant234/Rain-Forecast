// Load environment variables from .env.local file
require("dotenv").config({ path: "../.env.local" });

const express = require("express");
const cors = require("cors");
const NodeCache = require("node-cache");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration - Set to false to disable mock data and use only real API
const ENABLE_MOCK_DATA = process.env.ENABLE_MOCK_DATA === "true" || false;

// Enable CORS for your React app
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://your-app.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

// API keys configuration
const API_KEYS = [
  {
    key:
      process.env.TOMORROW_API_KEY ||
      process.env.TOMORROW_API_KEY_1 ||
      "REPLACE_WITH_YOUR_API_KEY",
    calls: { daily: 0, hourly: 0 },
    lastReset: { daily: Date.now(), hourly: Date.now() },
  },
  {
    key: process.env.TOMORROW_API_KEY_2 || "YOUR_SECOND_API_KEY_HERE",
    calls: { daily: 0, hourly: 0 },
    lastReset: { daily: Date.now(), hourly: Date.now() },
  },
].filter(
  (apiKey) =>
    apiKey.key &&
    apiKey.key !== "REPLACE_WITH_YOUR_API_KEY" &&
    apiKey.key !== "YOUR_SECOND_API_KEY_HERE"
);

// OpenWeatherMap API configuration
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const OPENWEATHERMAP_BASE_URL = "https://api.openweathermap.org/data/2.5";
const OPENWEATHERMAP_ONECALL_URL =
  "https://api.openweathermap.org/data/3.0/onecall";

console.log("API Configuration:", {
  tomorrowIO: API_KEYS.length > 0 ? "✅ Configured" : "❌ Missing",
  openWeatherMap: OPENWEATHERMAP_API_KEY ? "✅ Configured" : "❌ Missing",
});

// Multi-level cache (TTL in seconds)
const caches = {
  exact: new NodeCache({ stdTTL: 3600 }), // 1 hour
  grid5km: new NodeCache({ stdTTL: 7200 }), // 2 hours
  city: new NodeCache({ stdTTL: 14400 }), // 4 hours
};

// Statistics
const stats = {
  requests: 0,
  cacheHits: 0,
  apiCalls: 0,
  startTime: Date.now(),
  apiFailures: 0,
  lastApiFailure: null,
  consecutiveFailures: 0,
};

// API failure tracking for intelligent retry logic
const API_FAILURE_TRACKING = {
  maxConsecutiveFailures: 5,
  backoffMultiplier: 2,
  baseBackoffTime: 60000, // 1 minute
  maxBackoffTime: 1800000, // 30 minutes
  lastFailureTime: null,
  currentBackoffTime: 60000,
  isInBackoff: false,
};

// Check if API is in backoff period
function isApiInBackoff() {
  if (!API_FAILURE_TRACKING.isInBackoff) return false;

  const now = Date.now();
  const timeSinceLastFailure = now - API_FAILURE_TRACKING.lastFailureTime;

  if (timeSinceLastFailure >= API_FAILURE_TRACKING.currentBackoffTime) {
    // Backoff period has ended
    API_FAILURE_TRACKING.isInBackoff = false;
    console.log("🔄 API backoff period ended, resuming API calls");
    return false;
  }

  return true;
}

// Record API failure and update backoff
function recordApiFailure(errorType) {
  const now = Date.now();
  stats.apiFailures++;
  stats.lastApiFailure = now;
  stats.consecutiveFailures++;

  API_FAILURE_TRACKING.lastFailureTime = now;

  // Increase backoff time exponentially
  if (
    stats.consecutiveFailures >= API_FAILURE_TRACKING.maxConsecutiveFailures
  ) {
    API_FAILURE_TRACKING.isInBackoff = true;
    API_FAILURE_TRACKING.currentBackoffTime = Math.min(
      API_FAILURE_TRACKING.currentBackoffTime *
        API_FAILURE_TRACKING.backoffMultiplier,
      API_FAILURE_TRACKING.maxBackoffTime
    );

    console.log(
      `🚫 API failure threshold reached (${stats.consecutiveFailures} consecutive failures)`
    );
    console.log(
      `⏰ Entering backoff period: ${Math.round(
        API_FAILURE_TRACKING.currentBackoffTime / 60000
      )} minutes`
    );
    console.log(`🔍 Error type: ${errorType}`);
  }
}

// Record API success and reset failure tracking
function recordApiSuccess() {
  if (stats.consecutiveFailures > 0) {
    console.log(
      `✅ API call successful after ${stats.consecutiveFailures} failures`
    );
  }

  stats.consecutiveFailures = 0;
  API_FAILURE_TRACKING.currentBackoffTime =
    API_FAILURE_TRACKING.baseBackoffTime;
  API_FAILURE_TRACKING.isInBackoff = false;
}

// Get available API key
function getAvailableApiKey() {
  const now = Date.now();

  // Reset counters if needed
  API_KEYS.forEach((api) => {
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
  if (data) return { data, type: "exact" };

  // Try 5km grid
  const gridLat = roundToGrid(lat);
  const gridLon = roundToGrid(lon);
  const gridKey = `${gridLat}_${gridLon}`;
  data = caches.grid5km.get(gridKey);
  if (data) return { data, type: "5km grid" };

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
    "temperature",
    "temperatureApparent",
    "humidity",
    "windSpeed",
    "windDirection",
    "weatherCode",
    "precipitationProbability",
    "precipitationType",
    "pressureSurfaceLevel",
    "uvIndex",
    "visibility",
    "sunriseTime",
    "sunsetTime",
  ];

  const now = new Date();
  const params = new URLSearchParams({
    apikey: apiKey,
    location: `${lat},${lon}`,
    fields: fields.join(","),
    timesteps: "1h,1d",
    startTime: now.toISOString(),
    endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    units: "metric",
  });

  const response = await fetch(
    `https://api.tomorrow.io/v4/timelines?${params}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// Fetch from OpenWeatherMap
async function fetchFromOpenWeatherMap(lat, lon) {
  if (!OPENWEATHERMAP_API_KEY) {
    throw new Error("OpenWeatherMap API key not configured");
  }

  // Fetch current weather and forecast data
  const currentParams = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    appid: OPENWEATHERMAP_API_KEY,
    units: "metric",
  });

  const forecastParams = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    appid: OPENWEATHERMAP_API_KEY,
    units: "metric",
    exclude: "minutely,alerts",
  });

  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(`${OPENWEATHERMAP_BASE_URL}/weather?${currentParams}`),
    fetch(`${OPENWEATHERMAP_ONECALL_URL}?${forecastParams}`),
  ]);

  if (!currentResponse.ok) {
    const error = await currentResponse.json().catch(() => ({}));
    throw new Error(
      error.message ||
        `OpenWeatherMap current API error: ${currentResponse.status}`
    );
  }

  if (!forecastResponse.ok) {
    const error = await forecastResponse.json().catch(() => ({}));
    throw new Error(
      error.message ||
        `OpenWeatherMap forecast API error: ${forecastResponse.status}`
    );
  }

  const [currentData, forecastData] = await Promise.all([
    currentResponse.json(),
    forecastResponse.json(),
  ]);

  return {
    current: currentData,
    forecast: forecastData,
    source: "openweathermap",
    timestamp: Date.now(),
  };
}

// Generate mock weather data when API is unavailable
function generateMockWeatherData(lat, lon) {
  const now = new Date();
  const hourlyIntervals = [];
  const dailyIntervals = [];

  // Generate 24 hours of mock hourly data
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const hour = time.getHours();

    // Simulate realistic weather patterns for Myanmar
    const isNight = hour < 6 || hour > 18;
    const baseTemp = isNight ? 24 : 32; // Typical Myanmar temperatures
    const rainChance = hour >= 14 && hour <= 17 ? 70 : 25; // Higher chance in afternoon

    hourlyIntervals.push({
      startTime: time.toISOString(),
      values: {
        temperature: baseTemp + Math.random() * 6 - 3,
        temperatureApparent: baseTemp + Math.random() * 6 - 2,
        humidity: 65 + Math.random() * 25,
        windSpeed: 3 + Math.random() * 12,
        windDirection: 180 + Math.random() * 90,
        precipitationProbability: Math.max(
          0,
          Math.min(100, rainChance + Math.random() * 30 - 15)
        ),
        precipitationType: rainChance > 50 ? 1 : 0,
        precipitationIntensity: rainChance > 50 ? 0.3 + Math.random() * 0.7 : 0,
        weatherCode: rainChance > 50 ? 4001 : isNight ? 1000 : 1100,
        visibility: 8 + Math.random() * 7,
        pressureSurfaceLevel: 1010 + Math.random() * 10 - 5,
        uvIndex: isNight ? 0 : Math.floor(Math.random() * 8) + 3,
        sunriseTime: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          6,
          0
        ).toISOString(),
        sunsetTime: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          18,
          30
        ).toISOString(),
      },
    });
  }

  // Generate 7 days of mock daily data
  for (let i = 0; i < 7; i++) {
    const time = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);

    // Daily averages and ranges
    const avgTemp = 28 + Math.random() * 6 - 3; // 25-31°C average
    const tempRange = 8 + Math.random() * 4; // 8-12°C daily range
    const rainChance = 30 + Math.random() * 40; // 30-70% chance

    dailyIntervals.push({
      startTime: new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate()
      ).toISOString(),
      values: {
        temperature: avgTemp,
        temperatureAvg: avgTemp,
        temperatureMax: avgTemp + tempRange / 2,
        temperatureMin: avgTemp - tempRange / 2,
        temperatureApparent: avgTemp + 1,
        temperatureApparentAvg: avgTemp + 1,
        temperatureApparentMax: avgTemp + tempRange / 2 + 1,
        temperatureApparentMin: avgTemp - tempRange / 2 + 1,
        humidity: 70 + Math.random() * 20,
        humidityAvg: 70 + Math.random() * 20,
        humidityMax: 85 + Math.random() * 10,
        humidityMin: 55 + Math.random() * 15,
        windSpeed: 5 + Math.random() * 8,
        windSpeedAvg: 5 + Math.random() * 8,
        windSpeedMax: 10 + Math.random() * 10,
        windDirection: 180 + Math.random() * 90,
        precipitationProbability: rainChance,
        precipitationProbabilityAvg: rainChance,
        precipitationProbabilityMax: Math.min(100, rainChance + 20),
        precipitationType: rainChance > 50 ? 1 : 0,
        precipitationIntensity: rainChance > 50 ? 0.5 + Math.random() * 1 : 0,
        precipitationIntensityAvg:
          rainChance > 50 ? 0.5 + Math.random() * 1 : 0,
        precipitationIntensityMax: rainChance > 50 ? 1 + Math.random() * 2 : 0,
        weatherCode: rainChance > 60 ? 4001 : rainChance > 40 ? 1101 : 1100,
        weatherCodeMax: rainChance > 60 ? 4001 : rainChance > 40 ? 1101 : 1100,
        visibility: 10 + Math.random() * 5,
        visibilityAvg: 10 + Math.random() * 5,
        visibilityMin: 8 + Math.random() * 3,
        pressureSurfaceLevel: 1012 + Math.random() * 8 - 4,
        pressureSurfaceLevelAvg: 1012 + Math.random() * 8 - 4,
        pressureSurfaceLevelMax: 1015 + Math.random() * 5,
        pressureSurfaceLevelMin: 1008 + Math.random() * 5,
        uvIndex: Math.floor(Math.random() * 8) + 3,
        uvIndexAvg: Math.floor(Math.random() * 8) + 3,
        uvIndexMax: Math.floor(Math.random() * 3) + 8,
        sunriseTime: new Date(
          time.getFullYear(),
          time.getMonth(),
          time.getDate(),
          6,
          0
        ).toISOString(),
        sunsetTime: new Date(
          time.getFullYear(),
          time.getMonth(),
          time.getDate(),
          18,
          30
        ).toISOString(),
      },
    });
  }

  return {
    data: {
      timelines: [
        {
          timestep: "1h",
          startTime: now.toISOString(),
          endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          intervals: hourlyIntervals,
        },
        {
          timestep: "1d",
          startTime: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          ).toISOString(),
          endTime: new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          intervals: dailyIntervals,
        },
      ],
    },
  };
}

// Main weather endpoint - compatible with existing frontend
app.post("/api/weather", async (req, res) => {
  try {
    const lat = parseFloat(req.body.lat);
    const lon = parseFloat(req.body.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    stats.requests++;

    // Check cache first
    const cached = checkCache(lat, lon);
    if (cached) {
      stats.cacheHits++;
      console.log(`✅ Cache hit (${cached.type}): ${lat},${lon}`);
      return res.json({
        ...cached.data,
        cached: true,
        cacheType: cached.type,
        cacheHitRate:
          ((stats.cacheHits / stats.requests) * 100).toFixed(1) + "%",
      });
    }

    // Check if API is in backoff period
    if (isApiInBackoff()) {
      const backoffMinutes = Math.round(
        API_FAILURE_TRACKING.currentBackoffTime / 60000
      );

      if (ENABLE_MOCK_DATA) {
        console.log(
          `⏰ API in backoff period (${backoffMinutes} min remaining), using mock data`
        );

        // Generate mock weather data immediately
        const mockData = generateMockWeatherData(lat, lon);
        const formattedMockData = {
          hourlyData: mockData,
          minuteData: null,
          timestamp: Date.now(),
        };

        return res.json({
          ...formattedMockData,
          cached: false,
          mock: true,
          message: `API in backoff period (${backoffMinutes} min remaining). Using mock data.`,
          backoffRemaining: backoffMinutes,
        });
      } else {
        console.log(
          `⏰ API in backoff period (${backoffMinutes} min remaining), mock data disabled`
        );
        return res.status(503).json({
          error: "Weather service temporarily unavailable",
          message: `API is in backoff period. Please try again in ${backoffMinutes} minutes.`,
          retryAfter: backoffMinutes * 60,
          backoffRemaining: backoffMinutes,
        });
      }
    }

    // Get available API key
    const apiKey = getAvailableApiKey();
    if (!apiKey) {
      console.log("❌ All API keys exhausted");
      return res.status(429).json({
        error: "API rate limit reached. Please try again later.",
        retryAfter: 3600,
      });
    }

    // Fetch from API
    console.log(
      `🔄 API call for: ${lat},${lon} using key ending in ...${apiKey.key.slice(
        -4
      )}`
    );
    const data = await fetchFromTomorrowIO(lat, lon, apiKey.key);

    // Record successful API call
    recordApiSuccess();

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
      cacheHitRate: ((stats.cacheHits / stats.requests) * 100).toFixed(1) + "%",
    });
  } catch (error) {
    console.error("Error:", error.message);

    // Determine error type for better tracking
    let errorType = "unknown";
    if (
      error.message.includes("API error: 403") ||
      error.message.includes("Forbidden")
    ) {
      errorType = "403_forbidden";
    } else if (error.message.includes("API error: 429")) {
      errorType = "429_rate_limit";
    } else if (
      error.message.includes("blocked") ||
      error.message.includes("Cloudflare")
    ) {
      errorType = "cloudflare_blocked";
    } else if (
      error.message.includes("timeout") ||
      error.message.includes("ECONNRESET")
    ) {
      errorType = "network_timeout";
    }

    // Record API failure for intelligent retry logic
    recordApiFailure(errorType);

    // Handle API failures based on ENABLE_MOCK_DATA setting
    if (
      error.message.includes("API error: 403") ||
      error.message.includes("API error: 429") ||
      error.message.includes("blocked") ||
      error.message.includes("Forbidden") ||
      error.message.includes("Cloudflare")
    ) {
      if (ENABLE_MOCK_DATA) {
        console.log(`🎭 API ${errorType}, generating mock weather data`);

        // Generate mock weather data
        const mockData = generateMockWeatherData(req.body.lat, req.body.lon);

        // Format mock data to match frontend expectations
        const formattedMockData = {
          hourlyData: mockData,
          minuteData: null,
          timestamp: Date.now(),
        };

        return res.json({
          ...formattedMockData,
          cached: false,
          mock: true,
          message: `Using mock data due to API ${errorType}`,
          errorType: errorType,
          consecutiveFailures: stats.consecutiveFailures,
        });
      } else {
        console.log(
          `❌ API ${errorType}, mock data disabled - returning error`
        );

        // Return appropriate HTTP error status
        let statusCode = 500;
        let errorMessage = "Weather service unavailable";

        if (errorType === "403_forbidden") {
          statusCode = 403;
          errorMessage =
            "Weather API access forbidden. Please check your API key.";
        } else if (errorType === "429_rate_limit") {
          statusCode = 429;
          errorMessage =
            "Weather API rate limit exceeded. Please try again later.";
        } else if (errorType === "cloudflare_blocked") {
          statusCode = 403;
          errorMessage =
            "Weather API access blocked. Please check your API key or try again later.";
        }

        return res.status(statusCode).json({
          error: errorMessage,
          errorType: errorType,
          consecutiveFailures: stats.consecutiveFailures,
          message: "Mock data is disabled. Please configure a valid API key.",
          retryAfter: errorType === "429_rate_limit" ? 3600 : null,
        });
      }
    }

    // For other errors, always return error (no mock data)
    res.status(500).json({
      error: error.message,
      errorType: errorType,
      message: "An unexpected error occurred while fetching weather data.",
    });
  }
});

// OpenWeatherMap endpoint
app.post("/api/weather/openweathermap", async (req, res) => {
  try {
    const lat = parseFloat(req.body.lat);
    const lon = parseFloat(req.body.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    if (!OPENWEATHERMAP_API_KEY) {
      return res.status(503).json({
        error: "OpenWeatherMap API not configured",
        message: "OpenWeatherMap API key is not set on the server",
      });
    }

    stats.requests++;

    // Check cache first (reuse existing cache system)
    const cached = checkCache(lat, lon);
    if (cached && cached.data.source === "openweathermap") {
      stats.cacheHits++;
      console.log(`✅ OpenWeatherMap cache hit: ${lat},${lon}`);
      return res.json({
        ...cached.data,
        cached: true,
        cacheType: cached.type,
        cacheHitRate:
          ((stats.cacheHits / stats.requests) * 100).toFixed(1) + "%",
      });
    }

    // Fetch from OpenWeatherMap API
    console.log(`🌤️ OpenWeatherMap API call for: ${lat},${lon}`);
    const data = await fetchFromOpenWeatherMap(lat, lon);

    // Cache the response
    cacheData(lat, lon, data);

    // Return with metadata
    res.json({
      ...data,
      cached: false,
      provider: "openweathermap",
      cacheHitRate: ((stats.cacheHits / stats.requests) * 100).toFixed(1) + "%",
    });
  } catch (error) {
    console.error("OpenWeatherMap API Error:", error.message);

    // Return error response
    res.status(500).json({
      error: "Failed to fetch weather data from OpenWeatherMap",
      message: error.message,
      provider: "openweathermap",
    });
  }
});

// Stats endpoint
app.get("/api/stats", (req, res) => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const cacheHitRate =
    stats.requests > 0
      ? ((stats.cacheHits / stats.requests) * 100).toFixed(1)
      : 0;

  res.json({
    uptime: `${Math.floor(uptime / 60)} minutes`,
    stats: {
      totalRequests: stats.requests,
      cacheHits: stats.cacheHits,
      apiCalls: stats.apiCalls,
      apiFailures: stats.apiFailures,
      consecutiveFailures: stats.consecutiveFailures,
      cacheHitRate: cacheHitRate + "%",
      savingsRate:
        stats.cacheHits > 0
          ? (
              (stats.cacheHits / (stats.cacheHits + stats.apiCalls)) *
              100
            ).toFixed(1) + "%"
          : "0%",
      apiSuccessRate:
        stats.apiCalls > 0
          ? (
              ((stats.apiCalls - stats.apiFailures) / stats.apiCalls) *
              100
            ).toFixed(1) + "%"
          : "100%",
    },
    apiStatus: {
      isInBackoff: API_FAILURE_TRACKING.isInBackoff,
      backoffTimeRemaining: API_FAILURE_TRACKING.isInBackoff
        ? Math.round(
            (API_FAILURE_TRACKING.currentBackoffTime -
              (Date.now() - API_FAILURE_TRACKING.lastFailureTime)) /
              60000
          )
        : 0,
      currentBackoffTime: Math.round(
        API_FAILURE_TRACKING.currentBackoffTime / 60000
      ),
      lastFailure: stats.lastApiFailure
        ? new Date(stats.lastApiFailure).toISOString()
        : null,
    },
    apiKeys: API_KEYS.map((key, i) => ({
      id: i + 1,
      daily: `${key.calls.daily}/500`,
      hourly: `${key.calls.hourly}/25`,
      dailyRemaining: 500 - key.calls.daily,
      hourlyRemaining: 25 - key.calls.hourly,
    })),
    cache: {
      exact: caches.exact.keys().length,
      grid5km: caches.grid5km.keys().length,
    },
    estimatedUsers: Math.floor(stats.requests / 10),
    maxCapacity: Math.floor(1000 * (100 / (100 - parseFloat(cacheHitRate)))),
  });
});

// API diagnostics endpoint
app.get("/api/diagnostics", (req, res) => {
  const now = Date.now();
  const backoffRemaining = API_FAILURE_TRACKING.isInBackoff
    ? Math.max(
        0,
        API_FAILURE_TRACKING.currentBackoffTime -
          (now - API_FAILURE_TRACKING.lastFailureTime)
      )
    : 0;

  res.json({
    timestamp: new Date().toISOString(),
    apiStatus: {
      isHealthy:
        !API_FAILURE_TRACKING.isInBackoff && stats.consecutiveFailures < 3,
      isInBackoff: API_FAILURE_TRACKING.isInBackoff,
      backoffRemaining: Math.round(backoffRemaining / 60000),
      consecutiveFailures: stats.consecutiveFailures,
      totalFailures: stats.apiFailures,
      lastFailure: stats.lastApiFailure
        ? new Date(stats.lastApiFailure).toISOString()
        : null,
    },
    recommendations: {
      immediate: API_FAILURE_TRACKING.isInBackoff
        ? [
            `Wait ${Math.round(
              backoffRemaining / 60000
            )} minutes before API retry`,
          ]
        : stats.consecutiveFailures > 0
        ? ["Monitor API calls closely", "Consider using mock data fallback"]
        : ["API is functioning normally"],
      longTerm:
        stats.apiFailures > 10
          ? [
              "Consider obtaining new API keys",
              "Implement additional fallback data sources",
            ]
          : ["Current setup is stable"],
    },
    mockDataStatus: {
      available: true,
      quality: "High - realistic Myanmar weather patterns",
      coverage: "24-hour hourly + 7-day daily forecasts",
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    apiHealth:
      !API_FAILURE_TRACKING.isInBackoff && stats.consecutiveFailures < 3
        ? "healthy"
        : "degraded",
    mockDataFallback: "available",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Weather proxy server running on port ${PORT}`);
  console.log(`📊 Stats available at http://localhost:${PORT}/api/stats`);
  console.log(`🔑 Using ${API_KEYS.length} API keys`);
  console.log(`💾 Cache levels: exact (1h), grid5km (2h), city (4h)`);
});
