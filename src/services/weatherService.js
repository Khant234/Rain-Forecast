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

    console.log("Fetching weather data for coordinates:", { lat, lon });

    // Check if we have cached data first
    const cacheKey = getCacheKey(lat, lon, "weather");
    const cachedData = weatherCache.get(cacheKey);
    const now = Date.now();

    // Use cached data if it's less than 30 minutes old
    if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
      console.log("Returning cached weather data");
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
    console.log("Returning cached timeline data");
    return weatherCache.data.hourlyData; // Return hourly data from cache
  }

  // Use proxy if enabled
  if (USE_PROXY) {
    try {
      const proxyRequestUrl = new URL(PROXY_URL);
      proxyRequestUrl.searchParams.append("lat", lat);
      proxyRequestUrl.searchParams.append("lon", lon);

      console.log(`Fetching from proxy: ${proxyRequestUrl.toString()}`);
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
      console.log("Falling back to direct API...");
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
    console.log("✅ Client cache hit:", key);
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

  console.log("💾 Client cached:", key);
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
      console.log("Permission API not available, proceeding with GPS request");
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

    console.log("🌍 Requesting GPS location...");

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
        console.log("✅ GPS location obtained:", location);
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

    console.log("🌍 Trying GPS with relaxed settings...");

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
        console.log("✅ GPS location obtained (fallback):", location);
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
      console.log("🕐 Stored GPS location is too old, removing...");
      localStorage.removeItem(GPS_LOCATION_KEY);
      return null;
    }

    console.log("📍 Using stored GPS location:", location);
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
      console.log("🕐 Stored GPS weather data is too old, removing...");
      localStorage.removeItem(GPS_WEATHER_KEY);
      return null;
    }

    console.log("🌤️ Using stored GPS weather data");
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
    console.log("💾 GPS weather data stored");
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
      console.log("📍 Location stored with persistence:", locationData.name);
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
      console.log("📍 Using fresh persistent location data");
      return persistentLocation;
    }

    // Fall back to legacy storage
    const legacyLocation = getStoredGPSLocation();
    if (legacyLocation) {
      console.log("📍 Using legacy location data");
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
  console.log("🗑️ GPS data cleared");
};

/**
 * Validate and fix UV index in all cached weather data
 */
export const validateCachedUVIndex = () => {
  console.log("🔍 Validating UV index in all cached weather data...");

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
        storeGPSWeather({data:correctedGPSWeather});
        console.log("✅ Fixed UV index in GPS weather data");
      }
    }

    // Fix client cache data
    clientCache.forEach((cached, key) => {
      if (cached && cached.data) {
        // Extract lat/lon from cache key (format: "lat_lon")
        const [lat, lon] = key.split("_").map(Number);
        if (!isNaN(lat) && !isNaN(lon)) {
          const correctedData = validateAndFixUVIndex(cached.data, lat, lon);
          clientCache.set(key, {
            ...cached,
            data: correctedData,
          });
          console.log(`✅ Fixed UV index in client cache for ${key}`);
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

    console.log("✅ UV index validation completed for all cached data");
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
    console.log("🚀 Initializing persistent storage system...");

    // Perform storage maintenance
    storageUtils.performMaintenance();

    // Validate and fix UV index in existing cached data
    validateCachedUVIndex();

    // Log storage statistics
    const storageInfo = storageUtils.getStorageInfo();
    console.log("📊 Storage Info:", storageInfo);

    // Set up periodic maintenance (every 30 minutes)
    setInterval(() => {
      storageUtils.performMaintenance();
    }, 30 * 60 * 1000);

    console.log("✅ Persistent storage system initialized");
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
    console