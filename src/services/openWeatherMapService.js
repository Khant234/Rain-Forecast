/**
 * OpenWeatherMap API Service
 * Provides comprehensive weather data from OpenWeatherMap API as an alternative to Tomorrow.io
 * Includes Myanmar timezone conversion, data validation, and error handling
 */

// OpenWeatherMap API configuration
const OPENWEATHERMAP_API_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
const OPENWEATHERMAP_BASE_URL = "https://api.openweathermap.org/data/2.5";
const OPENWEATHERMAP_ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";

// API configuration
const API_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  timeout: 10000, // 10 seconds
  units: "metric", // Celsius, m/s, hPa
};

// Cache for API responses
const openWeatherCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

console.log("OpenWeatherMap API Configuration:", {
  VITE_OPENWEATHERMAP_API_KEY: OPENWEATHERMAP_API_KEY ? "✅ Configured" : "❌ Missing",
});

/**
 * Check if OpenWeatherMap API is configured
 */
export const isOpenWeatherMapConfigured = () => {
  return OPENWEATHERMAP_API_KEY && OPENWEATHERMAP_API_KEY !== "your_openweathermap_api_key_here";
};

/**
 * Generate cache key for location
 */
const generateCacheKey = (lat, lon, endpoint) => {
  return `owm_${endpoint}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
};

/**
 * Check if cached data is still valid
 */
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
};

/**
 * Fetch current weather data from OpenWeatherMap
 */
export const fetchCurrentWeather = async (lat, lon) => {
  if (!isOpenWeatherMapConfigured()) {
    throw new Error("OpenWeatherMap API key not configured");
  }

  const cacheKey = generateCacheKey(lat, lon, "current");
  const cachedData = openWeatherCache.get(cacheKey);

  if (isCacheValid(cachedData)) {
    console.log("🎯 Using cached OpenWeatherMap current weather data");
    return cachedData.data;
  }

  const url = `${OPENWEATHERMAP_BASE_URL}/weather`;
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    appid: OPENWEATHERMAP_API_KEY,
    units: API_CONFIG.units,
  });

  try {
    console.log("🌤️ Fetching current weather from OpenWeatherMap...");
    const response = await fetch(`${url}?${params}`, {
      timeout: API_CONFIG.timeout,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `OpenWeatherMap API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the response
    openWeatherCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    console.log("✅ Successfully fetched current weather from OpenWeatherMap");
    return data;
  } catch (error) {
    console.error("❌ OpenWeatherMap current weather fetch failed:", error);
    
    // Return cached data if available, even if stale
    if (cachedData) {
      console.warn("🔄 Using stale cached data due to API error");
      return cachedData.data;
    }
    
    throw error;
  }
};

/**
 * Fetch forecast data from OpenWeatherMap OneCall API
 */
export const fetchForecastData = async (lat, lon) => {
  if (!isOpenWeatherMapConfigured()) {
    throw new Error("OpenWeatherMap API key not configured");
  }

  const cacheKey = generateCacheKey(lat, lon, "forecast");
  const cachedData = openWeatherCache.get(cacheKey);

  if (isCacheValid(cachedData)) {
    console.log("🎯 Using cached OpenWeatherMap forecast data");
    return cachedData.data;
  }

  const url = OPENWEATHERMAP_ONECALL_URL;
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    appid: OPENWEATHERMAP_API_KEY,
    units: API_CONFIG.units,
    exclude: "minutely,alerts", // Exclude minutely and alerts to reduce response size
  });

  try {
    console.log("🌤️ Fetching forecast data from OpenWeatherMap OneCall...");
    const response = await fetch(`${url}?${params}`, {
      timeout: API_CONFIG.timeout,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `OpenWeatherMap OneCall API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the response
    openWeatherCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    console.log("✅ Successfully fetched forecast data from OpenWeatherMap");
    return data;
  } catch (error) {
    console.error("❌ OpenWeatherMap forecast fetch failed:", error);
    
    // Return cached data if available, even if stale
    if (cachedData) {
      console.warn("🔄 Using stale cached data due to API error");
      return cachedData.data;
    }
    
    throw error;
  }
};

/**
 * Fetch comprehensive weather data (current + forecast)
 */
export const fetchComprehensiveWeatherData = async (lat, lon) => {
  try {
    console.log("🌤️ Fetching comprehensive weather data from OpenWeatherMap...");
    
    // Fetch both current and forecast data
    const [currentData, forecastData] = await Promise.all([
      fetchCurrentWeather(lat, lon),
      fetchForecastData(lat, lon),
    ]);

    const comprehensiveData = {
      current: currentData,
      forecast: forecastData,
      timestamp: Date.now(),
      source: "openweathermap",
    };

    console.log("✅ Successfully fetched comprehensive weather data from OpenWeatherMap");
    return comprehensiveData;
  } catch (error) {
    console.error("❌ Failed to fetch comprehensive weather data from OpenWeatherMap:", error);
    throw error;
  }
};

/**
 * Clear OpenWeatherMap cache
 */
export const clearOpenWeatherMapCache = () => {
  openWeatherCache.clear();
  console.log("🧹 OpenWeatherMap cache cleared");
};

/**
 * Get cache statistics
 */
export const getOpenWeatherMapCacheStats = () => {
  const entries = Array.from(openWeatherCache.entries());
  const validEntries = entries.filter(([, entry]) => isCacheValid(entry));
  
  return {
    totalEntries: entries.length,
    validEntries: validEntries.length,
    staleEntries: entries.length - validEntries.length,
    cacheSize: openWeatherCache.size,
  };
};

/**
 * Test OpenWeatherMap API connectivity
 */
export const testOpenWeatherMapAPI = async () => {
  if (!isOpenWeatherMapConfigured()) {
    return {
      success: false,
      error: "OpenWeatherMap API key not configured",
    };
  }

  try {
    // Test with a known location (London)
    const testLat = 51.5074;
    const testLon = -0.1278;
    
    await fetchCurrentWeather(testLat, testLon);
    
    return {
      success: true,
      message: "OpenWeatherMap API is working correctly",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  fetchCurrentWeather,
  fetchForecastData,
  fetchComprehensiveWeatherData,
  isOpenWeatherMapConfigured,
  clearOpenWeatherMapCache,
  getOpenWeatherMapCacheStats,
  testOpenWeatherMapAPI,
};
