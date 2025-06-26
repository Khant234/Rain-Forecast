// Weather API configuration
const USE_PROXY = false; // Disable proxy by default, enable direct API calls
const PROXY_URL = "/api/weather"; // Updated to use relative path that will be handled by Vite's proxy
const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_API_KEY;
const TOMORROW_API_URL = "https://api.tomorrow.io/v4/timelines";

// Enhanced error handling and fallback configuration
const API_CONFIG = {
  useProxy: false, // Start with direct API calls
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  timeout: 10000, // 10 seconds
  fallbackToCache: true,
  enableMockData: true,
};

console.log("Environment variables:", {
  VITE_TOMORROW_API_KEY: import.meta.env.VITE_TOMORROW_API_KEY,
  VITE_TOMORROW_IO_API_KEY: import.meta.env.VITE_TOMORROW_IO_API_KEY,
  VITE_OPENCAGE_API_KEY: import.meta.env.VITE_OPENCAGE_API_KEY,
  VITE_PROXY_URL: import.meta.env.VITE_PROXY_URL,
});

const TOMORROW_IO_API_KEY = import.meta.env.VITE_TOMORROW_IO_API_KEY;
const OPENCAGE_API_KEY = import.meta.env.VITE_OPENCAGE_API_KEY;

if (!TOMORROW_API_KEY) {
  throw new Error(
    "VITE_TOMORROW_API_KEY is not defined in the environment. Please add it to your .env.local file."
  );
}
if (!OPENCAGE_API_KEY || OPENCAGE_API_KEY === "your_opencage_api_key_here") {
  console.warn(
    "VITE_OPENCAGE_API_KEY is not configured. Geocoding features will be disabled."
  );
}

// Import API tracker (only used for direct API calls)
import { apiTracker } from "../utils/apiUsageTracker.js";

// Import persistent storage system
import {
  weatherStorage,
  locationStorage,
  generateLocationKey,
  storageUtils,
} from "./persistentStorage.js";
import {
  dataValidators,
  dataTransformers,
  errorHandlers,
} from "../utils/storageManager.js";

export const fetchWeatherData = async (...args) => {
  try {
    let lat, lon;

    if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      // Single object parameter
      lat = args[0].latitude || args[0].lat;
      lon = args[0].longitude || args[0].lon;
    } else if (args.length === 2) {
      // Two separate parameters
      lat = args[0];
      lon = args[1];
    } else {
      throw new Error("Invalid coordinates format");
    }

    // Validate coordinates
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Invalid coordinates provided");
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error("Coordinates out of valid range");
    }

    // // // // console.log("Fetching weather data for coordinates:", { lat, lon });

    // Check if we have cached data first
    const cacheKey = getCacheKey(lat, lon, "weather");
    const cachedData = weatherCache.get(cacheKey);
    const now = Date.now();

    // Use cached data if it's less than 30 minutes old
    if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
      // // // // console.log("Returning cached weather data");
      return cachedData.data;
    }

    try {
      // Add rate limiting before API calls
      await rateLimit();

      // Only fetch hourly data to reduce API calls
      const hourlyData = await fetchHourlyData(lat, lon);

      const result = {
        // Use null for minuteData since we're not fetching it anymore
        minuteData: null,
        hourlyData,
        timestamp: now,
      };

      // Cache the result
      weatherCache.set(cacheKey, {
        data: result,
        timestamp: now,
      });

      return result;
    } catch (error) {
      // If we have cached data and the API fails, return the cached data
      if (cachedData) {
        console.warn("Using cached data due to API error:", error.message);
        return cachedData.data;
      }
      throw error; // Re-throw if we don't have cached data
    }
  } catch (error) {
    console.error("Weather service error:", error);
    if (error.message.includes("Invalid coordinates")) {
      throw new Error("Please provide valid location coordinates");
    } else if (error.message.includes("Failed to fetch")) {
      throw new Error(
        "Unable to connect to weather service. Please check your internet connection."
      );
    } else {
      throw new Error(`Weather service error: ${error.message}`);
    }
  }
};

const fetchWeatherTimeline = async (lat, lon, timestep = "1h") => {
  const now = Date.now();
  const cacheKey = getCacheKey(lat, lon, timestep);

  // Return cached data if it's still valid
  if (
    weatherCache.data &&
    weatherCache.timestamp &&
    now - weatherCache.timestamp < CACHE_DURATION
  ) {
    // // // // console.log("Returning cached timeline data");
    return weatherCache.data.hourlyData; // Return hourly data from cache
  }

  // Use proxy if enabled
  if (USE_PROXY) {
    try {
      const proxyRequestUrl = new URL(PROXY_URL);
      proxyRequestUrl.searchParams.append("lat", lat);
      proxyRequestUrl.searchParams.append("lon", lon);

      // // // // console.log(`Fetching from proxy: ${proxyRequestUrl.toString()}`);
      const response = await fetch(proxyRequestUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Proxy error: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "Proxy response:",
        data.cached ? "CACHED" : "FRESH",
        `(${data.cacheHitRate || "N/A"})`
      );

      // Cache the successful response locally too
      weatherCache.set(cacheKey, {
        data,
        timestamp: now,
      });

      return data;
    } catch (error) {
      console.error("Proxy error:", error);
      // Fall back to direct API if proxy fails
      // // // // console.log("Falling back to direct API...");
    }
  }

  const fields = [
    "precipitationProbability",
    "precipitationType",
    "precipitationIntensity",
    "temperature",
    "temperatureApparent",
    "humidity",
    "windSpeed",
    "windDirection",
    "weatherCode",
    "visibility",
    "cloudCover",
  ];

  const currentDate = new Date();
  const startTime = currentDate.toISOString();
  const endTime = new Date(
    currentDate.getTime() + 24 * 60 * 60 * 1000
  ).toISOString(); // Next 24 hours

  try {
    const params = new URLSearchParams({
      apikey: TOMORROW_API_KEY,
      location: `${lat},${lon}`,
      fields: fields.join(","),
      timesteps: timestep,
      startTime,
      endTime,
      units: "metric",
    });

    // Check if we can make API call
    const usageStatus = apiTracker.trackCall();
    if (!usageStatus.canMakeCall) {
      console.warn("API limit reached:", usageStatus.warnings);
      throw new Error("API rate limit reached");
    }

    const response = await fetch(`${TOMORROW_API_URL}?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch ${timestep} data`);
    }

    // Display usage after successful call
    apiTracker.displayUsage();

    const data = await response.json();

    // Cache the successful response
    weatherCache.set(cacheKey, {
      data,
      timestamp: now,
    });

    return data;
  } catch (error) {
    // If we have cached data and the API fails, return the cached data
    if (weatherCache.data) {
      console.warn("Using cached data due to API error:", error.message);
      return weatherCache.data.hourlyData;
    }
    console.error(`Error fetching ${timestep} data:`, error);
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
};

const fetchMinuteData = () => null; // No longer used

const fetchHourlyData = async (lat, lon) => {
  try {
    return await fetchWeatherTimeline(lat, lon, "1h");
  } catch (error) {
    console.error("Failed to fetch hourly data:", error);
    throw error; // Re-throw to be handled by the caller
  }
};

// Cache configuration - increased to 6 hours to reduce API calls
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const PERSISTENT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for persistent storage
// Initial rate limit delay
const INITIAL_RATE_LIMIT_DELAY = 5000; // 5 seconds
let lastApiCallTime = 0;
let rateLimitDelay = INITIAL_RATE_LIMIT_DELAY; // Start with initial delay

// Exponential backoff helper
const exponentialBackoff = (attempts) => {
  const maxDelay = 60000; // 1 minute max delay
  const delay = Math.min(rateLimitDelay * Math.pow(2, attempts), maxDelay);
  rateLimitDelay = delay;
  return delay;
};

// Reset rate limit delay after successful request
const resetRateLimit = () => {
  rateLimitDelay = INITIAL_RATE_LIMIT_DELAY;
};

// Rate limiting helper with exponential backoff
const rateLimit = async (attempts = 0) => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;

  if (timeSinceLastCall < rateLimitDelay) {
    await new Promise((resolve) =>
      setTimeout(resolve, exponentialBackoff(attempts))
    );
  }
  lastApiCallTime = Date.now();
};

// Generate a cache key based on coordinates and timestep
const getCacheKey = (lat, lon, timestep) => `${lat},${lon},${timestep}`;

// Rain history storage
const RAIN_HISTORY_KEY = "rain_history";
const MAX_HISTORY_DAYS = 7;

export const saveRainHistory = (weatherData) => {
  try {
    const history = getRainHistory();
    const today = new Date().toISOString().split("T")[0];

    // Add today's data
    history[today] = {
      rainEvents: extractRainEvents(weatherData),
      totalPrecipitation: calculateTotalPrecipitation(weatherData),
      timestamp: Date.now(),
    };

    // Keep only last 7 days
    const dates = Object.keys(history).sort();
    while (dates.length > MAX_HISTORY_DAYS) {
      delete history[dates.shift()];
    }

    localStorage.setItem(RAIN_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving rain history:", error);
  }
};

export const getRainHistory = () => {
  try {
    const history = localStorage.getItem(RAIN_HISTORY_KEY);
    return history ? JSON.parse(history) : {};
  } catch (error) {
    console.error("Error reading rain history:", error);
    return {};
  }
};

const extractRainEvents = (weatherData) => {
  if (!weatherData?.hourlyData?.data?.timelines?.[0]?.intervals) return [];

  const intervals = weatherData.hourlyData.data.timelines[0].intervals;
  return intervals
    .filter(
      (interval) =>
        interval.values.precipitationType > 0 ||
        interval.values.precipitationProbability > 70
    )
    .map((interval) => ({
      ...interval,
      // Add a flag to indicate this is from hourly data
      isHourlyData: true,
    }));
};

const calculateTotalPrecipitation = (weatherData) => {
  if (!weatherData?.hourlyData?.data?.timelines?.[0]?.intervals) return 0;

  return weatherData.hourlyData.data.timelines[0].intervals.reduce(
    (total, interval) =>
      total + (interval.values.precipitationProbability || 0),
    0
  );
};

// In-memory cache for weather data
let weatherCache = {
  data: null,
  timestamp: 0,
  get: function (key) {
    return this[key];
  },
  set: function (key, value) {
    this[key] = value;
  },
};

// Fallback weather data for when API is unavailable
const generateFallbackData = (lat, lon) => {
  const now = new Date();
  const intervals = [];

  // Generate 24 hours of mock data
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const hour = time.getHours();

    // Simulate weather patterns
    const isNight = hour < 6 || hour > 18;
    const baseTemp = isNight ? 22 : 28;
    const rainChance = hour >= 14 && hour <= 17 ? 60 : 20; // Higher chance in afternoon

    intervals.push({
      startTime: time.toISOString(),
      values: {
        temperature: baseTemp + Math.random() * 4 - 2,
        humidity: 70 + Math.random() * 20,
        windSpeed: 5 + Math.random() * 10,
        precipitationProbability: rainChance + Math.random() * 20 - 10,
        precipitationType: rainChance > 50 ? 1 : 0,
        precipitationIntensity: rainChance > 50 ? 0.5 : 0,
        weatherCode: rainChance > 50 ? 4001 : isNight ? 1000 : 1100,
        temperatureApparent: baseTemp + Math.random() * 4 - 2,
        visibility: 10,
        cloudCover: rainChance > 50 ? 80 : 30,
        windDirection: 180 + Math.random() * 90,
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
          intervals,
        },
      ],
    },
  };
};

// Client-side cache
const clientCache = new Map();
const CLIENT_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// GPS Location Storage
const GPS_LOCATION_KEY = "user_gps_location";
const GPS_WEATHER_KEY = "user_gps_weather";
const GPS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for GPS weather data

// Generate cache key for client-side caching
function getClientCacheKey(lat, lon) {
  // Round to 2 decimal places for nearby location caching
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  return `${roundedLat}_${roundedLon}`;
}

// Check client-side cache
function getClientCachedData(lat, lon) {
  const key = getClientCacheKey(lat, lon);
  const cached = clientCache.get(key);

  if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_DURATION) {
    // // // // console.log("✅ Client cache hit:", key);
    return cached.data;
  }

  return null;
}

// Store data in client-side cache
function setClientCachedData(lat, lon, data) {
  const key = getClientCacheKey(lat, lon);
  clientCache.set(key, {
    data,
    timestamp: Date.now(),
  });

  // Clean old entries if cache gets too large
  if (clientCache.size > 50) {
    const entries = Array.from(clientCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 10 entries
    for (let i = 0; i < 10; i++) {
      clientCache.delete(entries[i][0]);
    }
  }

  // // // // console.log("💾 Client cached:", key);
}

// GPS Location Functions
// Check if GPS is available and permissions
export const checkGPSAvailability = async () => {
  if (!navigator.geolocation) {
    return { available: false, reason: "GPS not supported by browser" };
  }

  // Check if we're in a secure context
  const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";
  const isSecure = location.protocol === "https:" || isLocalhost;

  if (!isSecure) {
    return { available: false, reason: "Requires HTTPS or localhost" };
  }

  // Check permissions if available
  if (navigator.permissions) {
    try {
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });
      return {
        available: true,
        permission: permission.state,
        reason:
          permission.state === "denied" ? "Location permission denied" : null,
      };
    } catch (error) {
      // // // // console.log("Permission API not available, proceeding with GPS request");
    }
  }

  return { available: true, permission: "unknown" };
};

export const requestGPSLocation = async () => {
  return new Promise(async (resolve, reject) => {
    // Check GPS availability first
    const gpsCheck = await checkGPSAvailability();
    if (!gpsCheck.available) {
      reject(new Error(`GPS location not available: ${gpsCheck.reason}`));
      return;
    }

    if (gpsCheck.permission === "denied") {
      reject(
        new Error(
          "Location access was previously denied. Please enable location access in your browser settings and refresh the page."
        )
      );
      return;
    }

    // // // // console.log("🌍 Requesting GPS location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
          name: "Current Location",
        };

        // Store GPS location in localStorage
        localStorage.setItem(GPS_LOCATION_KEY, JSON.stringify(location));
        // // // // console.log("✅ GPS location obtained:", location);
        resolve(location);
      },
      (error) => {
        console.error("❌ GPS location error:", error);
        let errorMessage = "Unable to get your location. ";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage +=
              "Location access was denied. Please:\n• Click the location icon in your browser's address bar\n• Select 'Allow' for location access\n• Refresh the page and try again";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage +=
              "Location information is unavailable. This might be due to:\n• Poor GPS signal\n• Location services disabled on your device\n• Browser security restrictions\n\nTry moving to a location with better signal or use the search function instead.";
            break;
          case error.TIMEOUT:
            errorMessage +=
              "Location request timed out. Please:\n• Check your GPS signal\n• Make sure location services are enabled\n• Try again or use the search function";
            break;
          default:
            errorMessage +=
              "An unknown error occurred. Please try again or use the search function.";
            break;
        }

        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: false, // Try with lower accuracy first
        timeout: 15000, // 15 seconds timeout
        maximumAge: 10 * 60 * 1000, // Accept 10-minute old position
      }
    );
  });
};

// Fallback GPS request with lower accuracy requirements
export const requestGPSLocationFallback = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS location is not supported by this browser."));
      return;
    }

    // // // // console.log("🌍 Trying GPS with relaxed settings...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
          name: "Current Location (Approximate)",
        };

        localStorage.setItem(GPS_LOCATION_KEY, JSON.stringify(location));
        // // // // console.log("✅ GPS location obtained (fallback):", location);
        resolve(location);
      },
      (error) => {
        console.error("❌ GPS fallback also failed:", error);
        reject(
          new Error(
            "GPS location is not available. Please use the search function to find your city."
          )
        );
      },
      {
        enableHighAccuracy: false, // Lower accuracy
        timeout: 30000, // Longer timeout
        maximumAge: 30 * 60 * 1000, // Accept 30-minute old position
      }
    );
  });
};

export const getStoredGPSLocation = () => {
  try {
    const stored = localStorage.getItem(GPS_LOCATION_KEY);
    if (!stored) return null;

    const location = JSON.parse(stored);

    // Check if location is still valid (not older than 1 hour)
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - location.timestamp > oneHour) {
      // // // // console.log("🕐 Stored GPS location is too old, removing...");
      localStorage.removeItem(GPS_LOCATION_KEY);
      return null;
    }

    // // // // console.log("📍 Using stored GPS location:", location);
    return location;
  } catch (error) {
    console.error("Error reading stored GPS location:", error);
    localStorage.removeItem(GPS_LOCATION_KEY);
    return null;
  }
};

export const getStoredGPSWeather = () => {
  try {
    const stored = localStorage.getItem(GPS_WEATHER_KEY);
    if (!stored) return null;

    const weatherData = JSON.parse(stored);

    // Check if weather data is still valid
    if (Date.now() - weatherData.timestamp > GPS_CACHE_DURATION) {
      // // // // console.log("🕐 Stored GPS weather data is too old, removing...");
      localStorage.removeItem(GPS_WEATHER_KEY);
      return null;
    }

    // // // // console.log("🌤️ Using stored GPS weather data");
    return weatherData.data;
  } catch (error) {
    console.error("Error reading stored GPS weather:", error);
    localStorage.removeItem(GPS_WEATHER_KEY);
    return null;
  }
};

export const storeGPSWeather = (weatherData) => {
  try {
    const dataToStore = {
      data: weatherData,
      timestamp: Date.now(),
    };
    localStorage.setItem(GPS_WEATHER_KEY, JSON.stringify(dataToStore));
    // // // // console.log("💾 GPS weather data stored");
  } catch (error) {
    console.error("Error storing GPS weather data:", error);
  }
};

/**
 * Enhanced location storage using persistent storage system
 */
export const storeLocationWithPersistence = (locationData) => {
  try {
    // Store in new persistent storage system
    const success = locationStorage.storeLocationData(locationData);

    // Also store in legacy format for backward compatibility
    localStorage.setItem(
      GPS_LOCATION_KEY,
      JSON.stringify({
        ...locationData,
        timestamp: Date.now(),
      })
    );

    if (success) {
      // // // // console.log("📍 Location stored with persistence:", locationData.name);
    }

    return success;
  } catch (error) {
    console.error("Error storing location with persistence:", error);
    return false;
  }
};

/**
 * Enhanced location retrieval using persistent storage system
 */
export const getStoredLocationWithPersistence = () => {
  try {
    // Try new persistent storage first
    const persistentLocation = locationStorage.getLocationData();
    if (persistentLocation && persistentLocation.isFresh) {
      // // // // console.log("📍 Using fresh persistent location data");
      return persistentLocation;
    }

    // Fall back to legacy storage
    const legacyLocation = getStoredGPSLocation();
    if (legacyLocation) {
      // // // // console.log("📍 Using legacy location data");
      return legacyLocation;
    }

    return null;
  } catch (error) {
    console.error("Error retrieving stored location:", error);
    return null;
  }
};

export const clearStoredGPSData = () => {
  localStorage.removeItem(GPS_LOCATION_KEY);
  localStorage.removeItem(GPS_WEATHER_KEY);
  // // // // console.log("🗑️ GPS data cleared");
};

/**
 * Validate and fix UV index in all cached weather data
 */
export const validateCachedUVIndex = () => {
  // // // // console.log("🔍 Validating UV index in all cached weather data...");

  try {
    // Fix GPS weather data
    const gpsWeather = getStoredGPSWeather();
    if (gpsWeather) {
      const gpsLocation = getStoredGPSLocation();
      if (gpsLocation) {
        const correctedGPSWeather = validateAndFixUVIndex(
          gpsWeather,
          gpsLocation.lat,
          gpsLocation.lon
        );
        storeGPSWeather(correctedGPSWeather);
        // // // // console.log("✅ Fixed UV index in GPS weather data");
      }
    }

    // Fix client cache data
    const cacheKeys = Object.keys(clientCache);
    cacheKeys.forEach((key) => {
      const cached = clientCache[key];
      if (cached && cached.data) {
        // Extract lat/lon from cache key (format: "lat,lon")
        const [lat, lon] = key.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lon)) {
          const correctedData = validateAndFixUVIndex(cached.data, lat, lon);
          clientCache[key] = {
            ...cached,
            data: correctedData,
          };
          // // // // console.log(`✅ Fixed UV index in client cache for ${key}`);
        }
      }
    });

    // Fix persistent storage data
    const locations = weatherStorage.getAllWeatherLocations();
    locations.forEach((locationKey) => {
      const stored = weatherStorage.getWeatherData(locationKey);
      if (stored && stored.data) {
        // Extract lat/lon from location key (format: "lat_lon")
        const [lat, lon] = locationKey.split("_").map(Number);
        if (!isNaN(lat) && !isNaN(lon)) {
          const correctedData = validateAndFixUVIndex(stored.data, lat, lon);
          weatherStorage.storeWeatherData(locationKey, correctedData);
          console.log(
            `✅ Fixed UV index in persistent storage for ${locationKey}`
          );
        }
      }
    });

    // // // // console.log("✅ UV index validation completed for all cached data");
    return true;
  } catch (error) {
    console.error("❌ Error validating cached UV index:", error);
    return false;
  }
};

/**
 * Initialize and maintain the persistent storage system
 */
export const initializePersistentStorage = () => {
  try {
    // // // // console.log("🚀 Initializing persistent storage system...");

    // Perform storage maintenance
    storageUtils.performMaintenance();

    // Validate and fix UV index in existing cached data
    validateCachedUVIndex();

    // Log storage statistics
    const storageInfo = storageUtils.getStorageInfo();
    // // // // console.log("📊 Storage Info:", storageInfo);

    // Set up periodic maintenance (every 30 minutes)
    setInterval(() => {
      storageUtils.performMaintenance();
    }, 30 * 60 * 1000);

    // // // // console.log("✅ Persistent storage system initialized");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize persistent storage:", error);
    return false;
  }
};

/**
 * Get comprehensive weather data with all forecasts
 */
export const getComprehensiveWeatherData = async (lat, lon) => {
  try {
    const locationKey = generateLocationKey(lat, lon);

    // Check for cached comprehensive data
    const cachedData = weatherStorage.getWeatherData(locationKey);
    if (cachedData && cachedData.isFresh) {
      return cachedData.data;
    }

    // Fetch fresh data
    const rawData = await getWeatherData(lat, lon);

    // Transform to comprehensive format if needed
    if (dataValidators.isValidWeatherData(rawData)) {
      const location = {
        lat,
        lon,
        name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      };
      const transformedData = dataTransformers.transformWeatherData(
        rawData,
        location
      );

      // Store the transformed data
      weatherStorage.storeWeatherData(
        `${locationKey}_comprehensive`,
        transformedData
      );

      return transformedData;
    }

    return rawData;
  } catch (error) {
    console.error("Error getting comprehensive weather data:", error);

    // Try to return cached data as fallback
    const fallbackData = weatherStorage.getWeatherData(
      generateLocationKey(lat, lon)
    );
    if (fallbackData) {
      console.warn("Using cached data as fallback");
      return fallbackData.data;
    }

    throw error;
  }
};

// Mock GPS for testing when real GPS fails
export const useMockGPS = async (cityName = "Yangon") => {
  const mockLocations = {
    Yangon: { lat: 16.8661, lon: 96.1951, name: "Yangon, Myanmar (Mock GPS)" },
    Mandalay: {
      lat: 21.9588,
      lon: 96.0891,
      name: "Mandalay, Myanmar (Mock GPS)",
    },
    Bangkok: {
      lat: 13.7563,
      lon: 100.5018,
      name: "Bangkok, Thailand (Mock GPS)",
    },
    Singapore: { lat: 1.3521, lon: 103.8198, name: "Singapore (Mock GPS)" },
    "New York": {
      lat: 40.7128,
      lon: -74.006,
      name: "New York, USA (Mock GPS)",
    },
    London: { lat: 51.5074, lon: -0.1278, name: "London, UK (Mock GPS)" },
  };

  const location = mockLocations[cityName] || mockLocations["Yangon"];
  const mockGPSLocation = {
    ...location,
    accuracy: 100,
    timestamp: Date.now(),
  };

  // Store mock GPS location
  localStorage.setItem(GPS_LOCATION_KEY, JSON.stringify(mockGPSLocation));
  // // // // console.log("🎭 Mock GPS location set:", mockGPSLocation);

  return mockGPSLocation;
};

export const getWeatherData = async (lat, lon) => {
  const locationKey = generateLocationKey(lat, lon);

  // // // // console.log(`🌤️ Weather request for: ${lat}, ${lon} (key: ${locationKey})`);

  // Check persistent storage first
  const persistentData = weatherStorage.getWeatherData(locationKey);
  if (persistentData && persistentData.isFresh) {
    // // // // console.log("✅ Using fresh persistent data for:", locationKey);
    return persistentData.data;
  }

  // Check client-side cache as fallback
  const cachedData = getClientCachedData(lat, lon);
  if (cachedData) {
    // // // // console.log("✅ Using client cache for:", locationKey);
    return cachedData;
  }

  // If we have stale persistent data, return it immediately and fetch fresh data in background
  if (persistentData && persistentData.data) {
    console.log(
      "⚡ Using stale data, fetching fresh in background for:",
      locationKey
    );
    // Fetch fresh data in background (don't await)
    fetchFreshWeatherDataWithFallback(lat, lon, locationKey).catch((error) => {
      console.error("Background fetch failed:", error);
    });
    return persistentData.data;
  }

  // No cached data available, fetch fresh data with enhanced error handling
  return await fetchWeatherDataWithFallback(lat, lon, locationKey);
};

/**
 * Enhanced weather data fetching with multiple fallback strategies
 */
const fetchWeatherDataWithFallback = async (lat, lon, locationKey) => {
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
  const timesteps = ["1h", "1d"];
  const units = "metric";

  // Strategy 1: Try proxy first (if enabled)
  if (API_CONFIG.useProxy || USE_PROXY) {
    try {
      // // // // console.log("🔄 Attempting proxy request...");
      const proxyUrl = `/api/weather?lat=${lat}&lon=${lon}&fields=${fields.join(
        ","
      )}&timesteps=${timesteps.join(",")}&units=${units}`;

      const response = await fetch(proxyUrl, {
        timeout: API_CONFIG.timeout,
      });

      if (response.ok) {
        const data = await response.json();
        return await processWeatherData(data, lat, lon, locationKey);
      } else {
        console.warn(`Proxy failed with status: ${response.status}`);
        throw new Error(`Proxy error: ${response.status}`);
      }
    } catch (proxyError) {
      console.warn("Proxy request failed:", proxyError.message);
      // // // // console.log("🔄 Falling back to direct API...");
    }
  }

  // Strategy 2: Direct API call
  try {
    // // // // console.log("🔄 Attempting direct API request...");
    const data = await fetchDirectAPI(lat, lon, fields, timesteps, units);
    return await processWeatherData(data, lat, lon, locationKey);
  } catch (apiError) {
    console.error("Direct API failed:", apiError.message);

    // Strategy 3: Try to get any cached data as last resort
    const persistentData = weatherStorage.getWeatherData(locationKey);
    const cachedData = getClientCachedData(lat, lon);
    const fallbackData = persistentData?.data || cachedData;

    if (fallbackData) {
      console.warn("🔄 Using any available cached data as last resort");
      return fallbackData;
    }

    // Strategy 4: Generate mock data if enabled
    if (API_CONFIG.enableMockData) {
      console.warn("🎭 Generating mock weather data");
      return generateMockWeatherData(lat, lon);
    }

    // All strategies failed
    throw new Error(
      "Weather service is temporarily unavailable. Please try again later."
    );
  }
};

/**
 * Fetch fresh weather data in background with fallback
 */
const fetchFreshWeatherDataWithFallback = async (lat, lon, locationKey) => {
  try {
    const freshData = await fetchWeatherDataWithFallback(lat, lon, locationKey);
    // // // // console.log("🔄 Background refresh completed for:", locationKey);
    return freshData;
  } catch (error) {
    console.error("Background fetch failed:", error);
  }
};

/**
 * Direct API call to Tomorrow.io
 */
const fetchDirectAPI = async (lat, lon, fields, timesteps, units) => {
  if (!TOMORROW_API_KEY) {
    throw new Error("API key not configured");
  }

  const now = new Date();
  const startTime = now.toISOString();
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    apikey: TOMORROW_API_KEY,
    location: `${lat},${lon}`,
    fields: fields.join(","),
    timesteps: timesteps.join(","),
    startTime,
    endTime,
    units,
  });

  const url = `${TOMORROW_API_URL}?${params}`;
  // // // // console.log("🔄 Direct API call to:", url.replace(TOMORROW_API_KEY, "***"));

  const response = await fetch(url, {
    timeout: API_CONFIG.timeout,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (response.status === 401) {
      throw new Error("API authentication failed. Please check your API key.");
    } else if (response.status === 404) {
      throw new Error("Weather data not available for this location.");
    } else if (response.status >= 500) {
      throw new Error(
        "Weather service is temporarily unavailable. Please try again later."
      );
    } else {
      throw new Error(
        `Weather service error (${response.status}). Please try again.`
      );
    }
  }

  const data = await response.json();
  // // // // console.log("✅ Direct API data received");
  return data;
};

/**
 * Process and validate weather data
 */
const processWeatherData = async (data, lat, lon, locationKey) => {
  // Log cache information if available
  if (data.cached) {
    // // // // console.log(`🎯 Server cache hit (${data.cacheType}):`, data.cacheHitRate);
  } else {
    // // // // console.log("🔄 Fresh API data received");
  }

  // Check for the correct data structure
  const weatherData = data.data || data;
  if (
    !weatherData ||
    !weatherData.timelines ||
    !Array.isArray(weatherData.timelines)
  ) {
    console.error("Invalid data structure received:", data);
    throw new Error("Invalid weather data received from service.");
  }

  // Validate weather data
  if (!dataValidators.isValidWeatherData(weatherData)) {
    throw new Error("Invalid weather data received from API");
  }

  // Validate and fix UV index values
  const correctedWeatherData = validateAndFixUVIndex(weatherData, lat, lon);

  // Normalize precipitation probability values
  const normalizedWeatherData =
    normalizePrecipitationData(correctedWeatherData);

  // Store in persistent storage
  const success = weatherStorage.storeWeatherData(
    locationKey,
    normalizedWeatherData
  );
  if (!success) {
    console.warn("Failed to store weather data in persistent storage");
  }

  // Cache the data on client side as backup
  setClientCachedData(lat, lon, normalizedWeatherData);

  // If this is GPS location data, store it separately for persistence
  const storedGPSLocation = getStoredGPSLocation();
  if (
    storedGPSLocation &&
    Math.abs(storedGPSLocation.lat - lat) < 0.01 &&
    Math.abs(storedGPSLocation.lon - lon) < 0.01
  ) {
    storeGPSWeather(normalizedWeatherData);
  }

  return normalizedWeatherData;
};

/**
 * Get more accurate timezone offset for a given location
 */
export const getTimezoneOffset = (lat, lon) => {
  // Enhanced timezone calculation with known regional adjustments
  const baseOffset = lon / 15; // Basic longitude-based offset

  // Regional timezone adjustments for better accuracy
  const timezoneAdjustments = {
    // Myanmar: UTC+6:30
    myanmar: { latMin: 9, latMax: 29, lonMin: 92, lonMax: 102, offset: 6.5 },
    // India: UTC+5:30
    india: { latMin: 6, latMax: 37, lonMin: 68, lonMax: 97, offset: 5.5 },
    // China: UTC+8 (entire country)
    china: { latMin: 18, latMax: 54, lonMin: 73, lonMax: 135, offset: 8 },
    // Australia Central: UTC+9:30
    australiaCentral: {
      latMin: -39,
      latMax: -10,
      lonMin: 129,
      lonMax: 141,
      offset: 9.5,
    },
    // Nepal: UTC+5:45
    nepal: { latMin: 26, latMax: 31, lonMin: 80, lonMax: 89, offset: 5.75 },
  };

  // Check for regional timezone adjustments
  for (const [region, zone] of Object.entries(timezoneAdjustments)) {
    if (
      lat >= zone.latMin &&
      lat <= zone.latMax &&
      lon >= zone.lonMin &&
      lon <= zone.lonMax
    ) {
      // // // // console.log(`🌍 Using ${region} timezone offset: UTC+${zone.offset}`);
      return zone.offset;
    }
  }

  // Fall back to longitude-based calculation, rounded to nearest 0.5
  const roundedOffset = Math.round(baseOffset * 2) / 2;
  // // // // console.log(`🌍 Using longitude-based timezone offset: UTC+${roundedOffset}`);
  return roundedOffset;
};

/**
 * Validate UV index for a specific time and location (exported for testing)
 */
export const validateUVIndex = (uvIndex, timestamp, lat, lon) => {
  const timeInfo = isNighttime(timestamp, lat, lon);
  if (timeInfo.isNight) {
    return 0;
  }
  // During daytime, ensure UV index is within valid range (0-15)
  return Math.max(0, Math.min(15, Math.round(uvIndex || 0)));
};

/**
 * Check if a given time is nighttime for a specific location
 */
export const isNighttime = (timestamp, lat, lon) => {
  const date = new Date(timestamp);
  const utcHour = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();

  // Get timezone offset for the location
  const timezoneOffset = getTimezoneOffset(lat, lon);

  // Calculate local time with fractional hours
  const localTime = utcHour + utcMinutes / 60 + timezoneOffset;
  const localHour = ((localTime % 24) + 24) % 24; // Ensure positive result

  // Consider nighttime between 6 PM (18:00) and 6 AM (06:00)
  const isNight = localHour < 6 || localHour >= 18;

  return {
    isNight,
    localHour: Math.floor(localHour),
    localMinutes: Math.floor((localHour % 1) * 60),
    timezoneOffset,
  };
};

/**
 * Normalize precipitation probability values in weather data
 */
const normalizePrecipitationData = (weatherData) => {
  if (!weatherData || !weatherData.timelines) {
    return weatherData;
  }

  // // // // console.log("🔧 Normalizing precipitation probability values...");
  let normalizedCount = 0;

  // Process each timeline
  weatherData.timelines.forEach((timeline) => {
    if (timeline.intervals) {
      timeline.intervals.forEach((interval) => {
        if (
          interval.values &&
          typeof interval.values.precipitationProbability === "number"
        ) {
          const originalValue = interval.values.precipitationProbability;
          const normalizedValue = Math.max(
            0,
            Math.min(100, Math.round(originalValue))
          );

          if (normalizedValue !== originalValue) {
            console.log(
              `🔧 Normalized precipitation probability for ${interval.startTime}: ${originalValue} → ${normalizedValue}%`
            );
            interval.values.precipitationProbability = normalizedValue;
            normalizedCount++;
          }
        }
      });
    }
  });

  if (normalizedCount > 0) {
    console.log(
      `✅ Normalized ${normalizedCount} precipitation probability values`
    );
  }

  return weatherData;
};

/**
 * Validate and fix UV index values in weather data
 */
const validateAndFixUVIndex = (weatherData, lat, lon) => {
  if (!weatherData || !weatherData.timelines) {
    return weatherData;
  }

  // // // // console.log("🔍 Validating UV index values for location:", { lat, lon });
  let fixedCount = 0;

  // Process each timeline
  weatherData.timelines.forEach((timeline) => {
    if (timeline.intervals) {
      timeline.intervals.forEach((interval) => {
        if (interval.values && typeof interval.values.uvIndex === "number") {
          const originalUV = interval.values.uvIndex;
          const timeInfo = isNighttime(interval.startTime, lat, lon);

          // If it's nighttime, set UV index to 0
          if (timeInfo.isNight) {
            if (originalUV > 0) {
              console.log(
                `🌙 Fixed UV index for ${
                  interval.startTime
                }: ${originalUV} → 0 (nighttime at ${
                  timeInfo.localHour
                }:${timeInfo.localMinutes.toString().padStart(2, "0")} local)`
              );
              interval.values.uvIndex = 0;
              fixedCount++;
            }
          } else {
            // During daytime, ensure UV index is within valid range (0-15)
            const validUV = Math.max(0, Math.min(15, Math.round(originalUV)));
            if (validUV !== originalUV) {
              console.log(
                `☀️ Fixed UV index for ${
                  interval.startTime
                }: ${originalUV} → ${validUV} (range correction at ${
                  timeInfo.localHour
                }:${timeInfo.localMinutes.toString().padStart(2, "0")} local)`
              );
              interval.values.uvIndex = validUV;
              fixedCount++;
            }
          }
        }
      });
    }
  });

  if (fixedCount > 0) {
    console.log(
      `✅ Fixed ${fixedCount} UV index values for location ${lat}, ${lon}`
    );
  }

  return weatherData;
};

/**
 * Generate mock weather data for testing and fallback
 */
const generateMockWeatherData = (lat, lon) => {
  const now = new Date();
  const intervals = [];

  // // // // console.log(`🎭 Generating mock weather data for: ${lat}, ${lon}`);

  // Generate 24 hours of mock hourly data
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);

    // Use the same timezone logic as validation
    const timeInfo = isNighttime(time.toISOString(), lat, lon);
    const isNight = timeInfo.isNight;

    // Create more realistic temperature patterns
    // Temperature varies throughout the day in a sinusoidal pattern
    const hourOfDay = timeInfo.localHour + timeInfo.localMinutes / 60;
    const tempVariation = Math.sin(((hourOfDay - 6) * Math.PI) / 12) * 6; // Peak at 2 PM, lowest at 2 AM

    // Base temperature for the region
    const regionBaseTemp = lat > 20 ? 28 : 24; // Warmer for tropical regions
    const currentTemp =
      regionBaseTemp + tempVariation + (Math.random() * 2 - 1); // Small random variation (±1°C)

    // Simulate weather patterns based on time and location
    const rainChance =
      timeInfo.localHour >= 14 && timeInfo.localHour <= 17 ? 60 : 20; // Higher chance in afternoon

    // Generate UV index correctly based on day/night
    const uvIndex = isNight ? 0 : Math.floor(Math.random() * 11);

    intervals.push({
      startTime: time.toISOString(),
      values: {
        temperature: Math.round(currentTemp * 10) / 10, // Round to 1 decimal place
        temperatureApparent:
          Math.round((currentTemp + (Math.random() * 4 - 2)) * 10) / 10, // Feels like can vary ±2°C
        humidity: 60 + Math.random() * 30,
        windSpeed: 3 + Math.random() * 12,
        windDirection: Math.random() * 360,
        precipitationProbability: Math.round(
          Math.max(0, Math.min(100, rainChance + Math.random() * 30 - 15))
        ),
        precipitationType: rainChance > 50 ? 1 : 0,
        precipitationIntensity: rainChance > 50 ? 0.5 + Math.random() * 2 : 0,
        weatherCode: rainChance > 50 ? 4001 : isNight ? 1000 : 1100,
        visibility: 8 + Math.random() * 7,
        pressureSurfaceLevel: 1010 + Math.random() * 10,
        uvIndex: uvIndex,
        sunriseTime: new Date(
          time.getTime() - (timeInfo.localHour - 6) * 60 * 60 * 1000
        ).toISOString(),
        sunsetTime: new Date(
          time.getTime() + (18 - timeInfo.localHour) * 60 * 60 * 1000
        ).toISOString(),
      },
    });

    // Log UV index generation for debugging
    if (
      i < 5 ||
      isNight !== (i > 0 ? intervals[i - 1].values.uvIndex === 0 : false)
    ) {
      console.log(
        `🎭 Mock data ${time.toISOString().slice(11, 16)}: Local ${
          timeInfo.localHour
        }:${timeInfo.localMinutes.toString().padStart(2, "0")}, ${
          isNight ? "Night" : "Day"
        }, UV: ${uvIndex}`
      );
    }
  }

  // Generate daily data
  const dailyIntervals = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const baseTemp = lat > 20 ? 28 : 22;

    dailyIntervals.push({
      startTime: date.toISOString(),
      values: {
        temperatureMin: baseTemp - 5 + Math.random() * 3,
        temperatureMax: baseTemp + 5 + Math.random() * 5,
        weatherCodeMax: Math.random() > 0.7 ? 4001 : 1100,
        precipitationProbabilityMax: Math.random() * 80,
        humidityAvg: 65 + Math.random() * 20,
        windSpeedAvg: 5 + Math.random() * 10,
      },
    });
  }

  const mockData = {
    timelines: [
      {
        timestep: "1h",
        startTime: now.toISOString(),
        endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        intervals,
      },
      {
        timestep: "1d",
        startTime: now.toISOString(),
        endTime: new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        intervals: dailyIntervals,
      },
    ],
  };

  // // // // console.log("🎭 Generated mock weather data for:", { lat, lon });
  return mockData;
};

// Mock geocoding for common Myanmar cities and international cities
const mockGeocode = async (cityName) => {
  const cities = {
    // Myanmar cities
    yangon: { lat: 16.8661, lon: 96.1951, name: "Yangon, Myanmar" },
    mandalay: { lat: 21.9588, lon: 96.0891, name: "Mandalay, Myanmar" },
    naypyidaw: { lat: 19.7633, lon: 96.0785, name: "Naypyidaw, Myanmar" },
    bagan: { lat: 21.1717, lon: 94.8574, name: "Bagan, Myanmar" },
    taunggyi: { lat: 20.7833, lon: 97.0333, name: "Taunggyi, Myanmar" },
    mawlamyine: { lat: 16.4833, lon: 97.6167, name: "Mawlamyine, Myanmar" },
    pathein: { lat: 16.7833, lon: 94.7333, name: "Pathein, Myanmar" },
    monywa: { lat: 22.1167, lon: 95.1333, name: "Monywa, Myanmar" },
    meiktila: { lat: 20.8667, lon: 95.8667, name: "Meiktila, Myanmar" },
    myitkyina: { lat: 25.3833, lon: 97.4, name: "Myitkyina, Myanmar" },

    // International cities for testing
    bangkok: { lat: 13.7563, lon: 100.5018, name: "Bangkok, Thailand" },
    singapore: { lat: 1.3521, lon: 103.8198, name: "Singapore" },
    "kuala lumpur": {
      lat: 3.139,
      lon: 101.6869,
      name: "Kuala Lumpur, Malaysia",
    },
    jakarta: { lat: -6.2088, lon: 106.8456, name: "Jakarta, Indonesia" },
    manila: { lat: 14.5995, lon: 120.9842, name: "Manila, Philippines" },
    hanoi: { lat: 21.0285, lon: 105.8542, name: "Hanoi, Vietnam" },
    "phnom penh": { lat: 11.5564, lon: 104.9282, name: "Phnom Penh, Cambodia" },
    vientiane: { lat: 17.9757, lon: 102.6331, name: "Vientiane, Laos" },
    "new york": { lat: 40.7128, lon: -74.006, name: "New York, USA" },
    london: { lat: 51.5074, lon: -0.1278, name: "London, UK" },
    tokyo: { lat: 35.6762, lon: 139.6503, name: "Tokyo, Japan" },
    sydney: { lat: -33.8688, lon: 151.2093, name: "Sydney, Australia" },
  };

  const searchKey = cityName.toLowerCase().trim();

  // Direct match
  if (cities[searchKey]) {
    return cities[searchKey];
  }

  // Partial match
  for (const [key, value] of Object.entries(cities)) {
    if (key.includes(searchKey) || searchKey.includes(key)) {
      return value;
    }
  }

  // No match found
  return null;
};

export const geocodeCity = async (cityName) => {
  if (
    !OPENCAGE_API_KEY ||
    OPENCAGE_API_KEY === "your_opencage_api_key_here" ||
    OPENCAGE_API_KEY === "your_actual_opencage_api_key_here"
  ) {
    // Use mock geocoding for common cities
    // // // // console.log("Using mock geocoding service for:", cityName);
    return mockGeocode(cityName);
  }

  if (!cityName || cityName.trim().length === 0) {
    throw new Error("Please enter a valid city name.");
  }

  const GEOCODING_API_URL = `https://api.opencagedata.com/geocode/v1/json`;
  const url = `${GEOCODING_API_URL}?q=${encodeURIComponent(
    cityName.trim()
  )}&key=${OPENCAGE_API_KEY}&limit=1&no_annotations=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many search requests. Please try again later.");
      } else if (response.status === 401) {
        throw new Error("Location search service authentication failed.");
      } else if (response.status >= 500) {
        throw new Error("Location search service is temporarily unavailable.");
      } else {
        throw new Error(
          `Location search failed (${response.status}). Please try again.`
        );
      }
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry;
      return { lat, lon: lng, name: data.results[0].formatted };
    }

    // No results found
    return null;
  } catch (error) {
    console.error("Failed to geocode city:", error);

    // Re-throw with user-friendly messages
    if (error.message.includes("fetch")) {
      throw new Error(
        "Unable to connect to location search service. Please check your internet connection."
      );
    }

    // If it's already a user-friendly error, re-throw as is
    throw error;
  }
};
