// Tomorrow.io API configuration
// This comment should be addressed: // This comment should be addressed: // TODO: Replace this hardcoded secret with an environment variable. secret with an environment variable.
// TODO: Replace this hardcoded secret with an environment variable.
// TODO: Replace this hardcoded secret with an environment variable.
const TOMORROW_API_KEY = "WP1YfdsbDqxBeOQFU1ERgQjVhbLGZf9U";
const TOMORROW_API_URL = "https://api.tomorrow.io/v4/timelines";

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
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      throw new Error("Invalid coordinates provided");
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error("Coordinates out of valid range");
    }

    // // // console.log("Fetching weather data for coordinates:", { lat, lon });

    // Check if we have cached data first
    const cacheKey = getCacheKey(lat, lon, 'weather');
    const cachedData = weatherCache.get(cacheKey);
    const now = Date.now();

    // Use cached data if it's less than 30 minutes old
    if (cachedData && (now - cachedData.timestamp < CACHE_DURATION)) {
      // // // // console.log('Returning cached weather data');');');
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
        timestamp: now
      });

      return result;
    } catch (error) {
      // If we have cached data and the API fails, return the cached data
      if (cachedData) {
        console.warn('Using cached data due to API error:', error.message);
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

const fetchWeatherTimeline = async (lat, lon, timestep = '1h') => {
  const now = Date.now();
  const cacheKey = getCacheKey(lat, lon, timestep);
  
  // Return cached data if it's still valid
  if (weatherCache.data && weatherCache.timestamp && (now - weatherCache.timestamp < CACHE_DURATION)) {
    // // // console.log('Returning cached timeline data');
    return weatherCache.data.hourlyData; // Return hourly data from cache
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
    "pressure"
  ];

  const currentDate = new Date();
  const startTime = currentDate.toISOString();
  const endTime = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Next 24 hours

  try {
    const params = new URLSearchParams({
      apikey: TOMORROW_API_KEY,
      location: `${lat},${lon}`,
      fields: fields.join(","),
      timesteps: timestep,
      startTime,
      endTime,
      units: "metric"
    });

    const response = await fetch(`${TOMORROW_API_URL}?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch ${timestep} data`);
    }

    const data = await response.json();
    
    // Cache the successful response
    weatherCache.set(cacheKey, {
      data,
      timestamp: now
    });
    
    return data;
  } catch (error) {
    // If we have cached data and the API fails, return the cached data
    if (weatherCache.data) {
      console.warn('Using cached data due to API error:', error.message);
      return weatherCache.data.hourlyData;
    }
    console.error(`Error fetching ${timestep} data:`, error);
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
};

const fetchMinuteData = () => null; // No longer used

const fetchHourlyData = async (lat, lon) => {
  try {
    return await fetchWeatherTimeline(lat, lon, '1h');
  } catch (error) {
    console.error('Failed to fetch hourly data:', error);
    throw error; // Re-throw to be handled by the caller
  }
};

// Cache configuration - increased to 1 hour
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
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
    await new Promise(resolve => setTimeout(resolve, exponentialBackoff(attempts)));
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
    .filter(interval => 
      (interval.values.precipitationType > 0 ||
      interval.values.precipitationProbability > 70)
    )
    .map(interval => ({
      ...interval,
      // Add a flag to indicate this is from hourly data
      isHourlyData: true
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
  timestamp: 0
};

export const getWeatherData = async (lat, lon) => {
  const now = Date.now();

  // Check cache first
  if (weatherCache.data && (now - weatherCache.timestamp < CACHE_DURATION)) {
    console.log('Returning cached weather data');
    return weatherCache.data;
  }

  try {
    // Add rate limiting before API calls
    await rateLimit(0); // Start with first attempt
    
    // Only fetch hourly data to reduce API calls
    const hourlyData = await fetchHourlyData(lat, lon);
    
    const data = {
      minuteData: null, // No longer used
      hourlyData,
      timestamp: now,
    };

    // Update cache
    weatherCache = {
      data,
      timestamp: now
    };

    // Save to rain history
    saveRainHistory(data);

    // Reset rate limit delay on successful request
    resetRateLimit();
    
    return data;
  } catch (error) {
    console.error('Error in getWeatherData:', error);
    if (error.message.includes('Failed to fetch weather data')) {
      // Handle rate limiting errors
      const attempts = (error.attempts || 0) + 1;
      if (attempts < 5) { // Limit to 5 attempts
        // // // console.log(`Retrying weather fetch (attempt ${attempts})...`);
        error.attempts = attempts;
        await rateLimit(attempts);
        return getWeatherData(lat, lon);
      }
    }
    if (weatherCache.data) {
      console.warn("Using stale cache data due to API error");
      return weatherCache.data;
    }
    throw error;
  }
};
