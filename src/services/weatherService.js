const USE_PROXY = false;
const PROXY_URL = "/api/weather";
const TOMORROW_API_KEY = import.meta.env.VITE_TOMORROW_API_KEY;
const TOMORROW_API_URL = "https://api.tomorrow.io/v4/timelines";

const API_CONFIG = {
  useProxy: USE_PROXY, 
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
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

import { apiTracker } from "../utils/apiUsageTracker.js";

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
      
      lat = args[0].latitude || args[0].lat;
      lon = args[0].longitude || args[0].lon;
    } else if (args.length === 2) {
      
      lat = args[0];
      lon = args[1];
    } else {
      throw new Error("Invalid coordinates format");
    }

    
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Invalid coordinates provided");
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error("Coordinates out of valid range");
    }

    console.log("Fetching weather data for coordinates:", { lat, lon });

    
    const cacheKey = getCacheKey(lat, lon, "weather");
    const cachedData = weatherCache.get(cacheKey);
    const now = Date.now();

    
    if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
      console.log("Returning cached weather data");
      return cachedData.data;
    }

    try {
      
      await rateLimit();

      
      const hourlyData = await fetchHourlyData(lat, lon);

      const result = {
        
        minuteData: null,
        hourlyData,
        timestamp: now,
      };

      
      weatherCache.set(cacheKey, {
        data: result,
        timestamp: now,
      });

      return result;
    } catch (error) {
      
      if (cachedData) {
        console.warn("Using cached data due to API error:", error.message);
        return cachedData.data;
      }
      throw error; 
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

  
  if (
    weatherCache.data &&
    weatherCache.timestamp &&
    now - weatherCache.timestamp < CACHE_DURATION
  ) {
    console.log("Returning cached timeline data");
    return weatherCache.data.hourlyData; 
  }

  
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

      
      weatherCache.set(cacheKey, {
        data,
        timestamp: now,
      });

      return data;
    } catch (error) {
      console.error("Proxy error:", error);
      
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
  ).toISOString(); 

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

    
    apiTracker.displayUsage();

    const data = await response.json();

    
    weatherCache.set(cacheKey, {
      data,
      timestamp: now,
    });

    return data;
  } catch (error) {
    
    if (weatherCache.data) {
      console.warn("Using cached data due to API error:", error.message);
      return weatherCache.data.hourlyData;
    }
    console.error(`Error fetching ${timestep} data:`, error);
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
};

const fetchMinuteData = () => null; 

const fetchHourlyData = async (lat, lon) => {
  try {
    return await fetchWeatherTimeline(lat, lon, "1h");
  } catch (error) {
    console.error("Failed to fetch hourly data:", error);
    throw error; 
  }
};


const CACHE_DURATION = 6 * 60 * 60 * 1000;
const PERSISTENT_CACHE_DURATION = 30 * 60 * 1000; 

const INITIAL_RATE_LIMIT_DELAY = 5000; 
let lastApiCallTime = 0;
let rateLimitDelay = INITIAL_RATE_LIMIT_DELAY; 


const exponentialBackoff = (attempts) => {
  const maxDelay = 60000; 
  const delay = Math.min(rateLimitDelay * Math.pow(2, attempts), maxDelay);
  rateLimitDelay = delay;
  return delay;
};


const resetRateLimit = () => {
  rateLimitDelay = INITIAL_RATE_LIMIT_DELAY;
};


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


const getCacheKey = (lat, lon, timestep) => `${lat},${lon},${timestep}`;


const RAIN_HISTORY_KEY = "rain_history";
const MAX_HISTORY_DAYS = 7;

export const saveRainHistory = (weatherData) => {
  try {
    const history = getRainHistory();
    const today = new Date().toISOString().split("T")[0];

    
    history[today] = {
      rainEvents: extractRainEvents(weatherData),
      totalPrecipitation: calculateTotalPrecipitation(weatherData),
      timestamp: Date.now(),
    };

    
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


let weatherCache = {
  data: null,
  timestamp: 0,
  cache: {},
  get: function (key) {
    return this.cache[key];
  },
  set: function (key, value) {
    this.cache[key] = value;
  },
};


const generateFallbackData = (lat, lon) => {
  const now = new Date();
  const intervals = [];

  
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const hour = time.getHours();

    
    const isNight = hour < 6 || hour > 18;
    const baseTemp = isNight ? 22 : 28;
    const rainChance = hour >= 14 && hour <= 17 ? 60 : 20; 

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


const clientCache = new Map();
const CLIENT_CACHE_DURATION = 10 * 60 * 1000; 


const GPS_LOCATION_KEY = "user_gps_location";
const GPS_WEATHER_KEY = "user_gps_weather";
const GPS_CACHE_DURATION = 30 * 60 * 1000; 


function getClientCacheKey(lat, lon) {
  
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  return `${roundedLat}_${roundedLon}`;
}


function getClientCachedData(lat, lon) {
  const key = getClientCacheKey(lat, lon);
  const cached = clientCache.get(key);

  if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_DURATION) {
    console.log("✅ Client cache hit:", key);
    return cached.data;
  }

  return null;
}


function setClientCachedData(lat, lon, data) {
  const key = getClientCacheKey(lat, lon);
  clientCache.set(key, {
    data,
    timestamp: Date.now(),
  });

  
  if (clientCache.size > 50) {
    const entries = Array.from(clientCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    
    for (let i = 0; i < 10; i++) {
      clientCache.delete(entries[i][0]);
    }
  }

  console.log("💾 Client cached:", key);
}



export const checkGPSAvailability = async () => {
  if (!navigator.geolocation) {
    return { available: false, reason: "GPS not supported by browser" };
  }

  
  const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";
  const isSecure = location.protocol === "https:" || isLocalhost;

  if (!isSecure) {
    return { available: false, reason: "Requires HTTPS or localhost" };
  }

  
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
        enableHighAccuracy: false, 
        timeout: 15000, 
        maximumAge: 10 * 60 * 1000, 
      }
    );
  });
};


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
        enableHighAccuracy: false, 
        timeout: 30000, 
        maximumAge: 30 * 60 * 1000, 
      }
    );
  });
};

export const getStoredGPSLocation = () => {
  try {
    const stored = localStorage.getItem(GPS_LOCATION_KEY);
    if (!stored) return null;

    const location = JSON.parse(stored);

    
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


export const storeLocationWithPersistence = (locationData) => {
  try {
    
    const success = locationStorage.storeLocationData(locationData);

    
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


export const getStoredLocationWithPersistence = () => {
  try {
    
    const persistentLocation = locationStorage.getLocationData();
    if (persistentLocation && persistentLocation.isFresh) {
      console.log("📍 Using fresh persistent location data");
      return persistentLocation;
    }

    
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


export const validateCachedUVIndex = () => {
  console.log("🔍 Validating UV index in all cached weather data...");

  try {
    
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
        console.log("✅ Fixed UV index in GPS weather data");
      }
    }

    
    const cacheKeys = Array.from(clientCache.keys());
    cacheKeys.forEach((key) => {
      const cached = clientCache.get(key);
      if (cached && cached.data) {
        
        const [roundedLat, roundedLon] = key.split("_").map(Number);
        if (!isNaN(roundedLat) && !isNaN(roundedLon)) {
          const correctedData = validateAndFixUVIndex(cached.data, roundedLat, roundedLon);
          clientCache.set(key, {
            ...cached,
            data: correctedData,
          });
          console.log(`✅ Fixed UV index in client cache for ${key}`);
        }
      }
    });

    
    const locations = weatherStorage.getAllWeatherLocations();
    locations.forEach((locationKey) => {
      const stored = weatherStorage.getWeatherData(locationKey);
      if (stored && stored.data) {
        
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


export const initializePersistentStorage = () => {
  try {
    console.log("🚀 Initializing persistent storage system...");

    
    storageUtils.performMaintenance();

    
    validateCachedUVIndex();

    
    const storageInfo = storageUtils.getStorageInfo();
    console.log("📊 Storage Info:", storageInfo);

    
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


export const getComprehensiveWeatherData = async (lat, lon) => {
  try {
    const locationKey = generateLocationKey(lat, lon);

    
    const cachedData = weatherStorage.getWeatherData(locationKey);
    if (cachedData && cachedData.isFresh) {
      return cachedData.data;
    }

    
    const rawData = await getWeatherData(lat, lon);

    
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

      
      weatherStorage.storeWeatherData(
        `${locationKey}_comprehensive`,
        transformedData
      );

      return transformedData;
    }

    return rawData;
  } catch (error) {
    console.error("Error getting comprehensive weather data:", error);

    
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
