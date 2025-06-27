/**
 * Storage Manager Utilities
 * Additional utilities for managing browser storage, data validation,
 * and error handling for the weather application.
 */

/**
 * Data validation functions
 */
export const dataValidators = {
  /**
   * Validate weather data structure
   */
  isValidWeatherData(data) {
    if (!data || typeof data !== "object") return false;

    // Check for required timelines structure
    if (!data.timelines || !Array.isArray(data.timelines)) return false;

    // Check for at least one timeline with intervals
    const hasValidTimeline = data.timelines.some(
      (timeline) =>
        timeline.intervals &&
        Array.isArray(timeline.intervals) &&
        timeline.intervals.length > 0
    );

    if (!hasValidTimeline) return false;

    // Validate first interval has required fields
    const firstInterval = data.timelines[0].intervals[0];
    if (!firstInterval || !firstInterval.values) return false;

    const requiredFields = [
      "temperature",
      "weatherCode",
      "precipitationProbability",
    ];
    const hasRequiredFields = requiredFields.every((field) =>
      firstInterval.values.hasOwnProperty(field)
    );

    return hasRequiredFields;
  },

  /**
   * Validate location data structure
   */
  isValidLocationData(data) {
    if (!data || typeof data !== "object") return false;

    const hasCoordinates =
      typeof data.lat === "number" && typeof data.lon === "number";
    const hasValidCoordinates =
      data.lat >= -90 && data.lat <= 90 && data.lon >= -180 && data.lon <= 180;

    return hasCoordinates && hasValidCoordinates;
  },

  /**
   * Validate timestamp freshness
   */
  isDataFresh(timestamp, maxAge) {
    if (!timestamp || typeof timestamp !== "number") return false;
    return Date.now() - timestamp < maxAge;
  },
};

/**
 * UV Index validation and correction utilities
 */
const uvIndexUtils = {
  /**
   * Determine if it's nighttime based on time and location
   */
  isNighttime(timestamp, lat, lon) {
    const date = new Date(timestamp);
    const hour = date.getUTCHours();

    // Simple approximation: adjust for longitude (rough timezone estimation)
    // Each 15 degrees of longitude ≈ 1 hour time difference
    const timezoneOffset = Math.round(lon / 15);
    const localHour = (hour + timezoneOffset + 24) % 24;

    // Consider it nighttime between 6 PM and 6 AM local time
    return localHour < 6 || localHour >= 18;
  },

  /**
   * Get more accurate nighttime determination using sunrise/sunset if available
   */
  isNighttimeAccurate(timestamp, sunriseTime, sunsetTime) {
    if (!sunriseTime || !sunsetTime) {
      return false; // If no sunrise/sunset data, don't override
    }

    const currentTime = new Date(timestamp);
    const sunrise = new Date(sunriseTime);
    const sunset = new Date(sunsetTime);

    // It's nighttime if current time is before sunrise or after sunset
    return currentTime < sunrise || currentTime > sunset;
  },

  /**
   * Validate and correct UV index based on time of day
   */
  validateUVIndex(
    uvIndex,
    timestamp,
    lat,
    lon,
    sunriseTime = null,
    sunsetTime = null
  ) {
    // If we have accurate sunrise/sunset times, use them
    if (sunriseTime && sunsetTime) {
      const isNight = this.isNighttimeAccurate(
        timestamp,
        sunriseTime,
        sunsetTime
      );
      if (isNight) {
        return 0;
      }
    } else {
      // Fall back to simple time-based calculation
      const isNight = this.isNighttime(timestamp, lat, lon);
      if (isNight) {
        return 0;
      }
    }

    // During daytime, ensure UV index is within valid range (0-11+)
    const validatedUV = Math.max(0, Math.min(15, Math.round(uvIndex || 0)));
    return validatedUV;
  },
};

/**
 * Data transformation functions
 */
export const dataTransformers = {
  /**
   * Transform raw API data to application format
   */
  transformWeatherData(rawData, location) {
    if (!dataValidators.isValidWeatherData(rawData)) {
      throw new Error("Invalid weather data structure");
    }

    const timelines = rawData.timelines;
    const hourlyTimeline = timelines.find((t) => t.timestep === "1h");
    const dailyTimeline = timelines.find((t) => t.timestep === "1d");

    if (!hourlyTimeline || !hourlyTimeline.intervals.length) {
      throw new Error("No hourly data available");
    }

    const currentInterval = hourlyTimeline.intervals[0];

    return {
      current: {
        location: location?.name || "Unknown Location",
        temperature: Math.round(currentInterval.values.temperature || 0),
        feelsLike: Math.round(
          currentInterval.values.temperatureApparent ||
            currentInterval.values.temperature ||
            0
        ),
        condition: this.getWeatherCondition(currentInterval.values.weatherCode),
        weatherCode: currentInterval.values.weatherCode,
        humidity: Math.round(currentInterval.values.humidity || 0),
        windSpeed: Math.round(currentInterval.values.windSpeed || 0),
        windDirection: currentInterval.values.windDirection || 0,
        pressure: Math.round(
          currentInterval.values.pressureSurfaceLevel || 1013
        ),
        uvIndex: uvIndexUtils.validateUVIndex(
          currentInterval.values.uvIndex,
          currentInterval.startTime,
          location?.lat || 0,
          location?.lon || 0,
          currentInterval.values.sunriseTime,
          currentInterval.values.sunsetTime
        ),
        visibility: Math.round(currentInterval.values.visibility || 10),
        rainChance: Math.round(
          currentInterval.values.precipitationProbability || 0
        ),
        precipitationType: currentInterval.values.precipitationType || 0,
        precipitationIntensity:
          currentInterval.values.precipitationIntensity || 0,
        coordinates: location ? { lat: location.lat, lon: location.lon } : null,
      },
      hourly: hourlyTimeline.intervals.slice(0, 24).map((interval) => ({
        startTime: interval.startTime,
        temperature: Math.round(interval.values.temperature || 0),
        weatherCode: interval.values.weatherCode,
        precipitationProbability: Math.round(
          interval.values.precipitationProbability || 0
        ),
        precipitationType: interval.values.precipitationType || 0,
        precipitationIntensity: interval.values.precipitationIntensity || 0,
        humidity: Math.round(interval.values.humidity || 0),
        windSpeed: Math.round(interval.values.windSpeed || 0),
        uvIndex: uvIndexUtils.validateUVIndex(
          interval.values.uvIndex,
          interval.startTime,
          location?.lat || 0,
          location?.lon || 0,
          interval.values.sunriseTime,
          interval.values.sunsetTime
        ),
      })),
      daily: dailyTimeline
        ? dailyTimeline.intervals.slice(0, 7).map((interval) => ({
            startTime: interval.startTime,
            temperatureMin: Math.round(
              interval.values.temperatureMin || interval.values.temperature || 0
            ),
            temperatureMax: Math.round(
              interval.values.temperatureMax || interval.values.temperature || 0
            ),
            weatherCodeMax:
              interval.values.weatherCodeMax || interval.values.weatherCode,
            precipitationProbabilityMax: Math.round(
              interval.values.precipitationProbabilityMax || 0
            ),
            humidityAvg: Math.round(interval.values.humidityAvg || 0),
            windSpeedAvg: Math.round(interval.values.windSpeedAvg || 0),
          }))
        : [],
      rainPredictions: this.extractRainPredictions(hourlyTimeline.intervals),
      metadata: {
        fetchTime: Date.now(),
        location: location,
        dataSource: "api",
        version: "2.0",
      },
    };
  },

  /**
   * Extract rain predictions from hourly data
   */
  extractRainPredictions(intervals) {
    const rainEvents = [];
    const now = new Date();

    for (const interval of intervals) {
      const startTime = new Date(interval.startTime);
      if (startTime <= now) continue; // Skip past events

      const precipProb = interval.values.precipitationProbability || 0;
      const precipType = interval.values.precipitationType || 0;

      // Consider it a rain event if probability > 50% or there's precipitation type
      if (precipProb > 50 || (precipType > 0 && precipProb > 30)) {
        rainEvents.push({
          startTime: interval.startTime,
          precipitationProbability: precipProb,
          precipitationType: precipType,
          precipitationIntensity: interval.values.precipitationIntensity || 0,
          weatherCode: interval.values.weatherCode,
          minutesUntilRain: Math.round((startTime - now) / (1000 * 60)),
        });
      }
    }

    return rainEvents;
  },

  /**
   * Get weather condition from weather code
   */
  getWeatherCondition(weatherCode) {
    const conditions = {
      1000: "Clear",
      1100: "Mostly Clear",
      1101: "Partly Cloudy",
      1102: "Mostly Cloudy",
      1001: "Cloudy",
      2000: "Fog",
      2100: "Light Fog",
      4000: "Drizzle",
      4001: "Rain",
      4200: "Light Rain",
      4201: "Heavy Rain",
      5000: "Snow",
      5001: "Flurries",
      5100: "Light Snow",
      5101: "Heavy Snow",
      6000: "Freezing Drizzle",
      6001: "Freezing Rain",
      6200: "Light Freezing Rain",
      6201: "Heavy Freezing Rain",
      7000: "Ice Pellets",
      7101: "Heavy Ice Pellets",
      7102: "Light Ice Pellets",
      8000: "Thunderstorm",
    };
    return conditions[weatherCode] || "Unknown";
  },
};

/**
 * Error handling utilities
 */
export const errorHandlers = {
  /**
   * Handle storage errors gracefully
   */
  handleStorageError(error, operation, key) {
    console.error(`Storage error during ${operation} for key ${key}:`, error);

    // Specific error handling
    if (error.name === "QuotaExceededError") {
      console.warn("Storage quota exceeded. Consider clearing old data.");
      return {
        success: false,
        error: "QUOTA_EXCEEDED",
        message: "Storage full",
      };
    }

    if (error.name === "SecurityError") {
      console.warn("Storage access denied. Private browsing mode?");
      return {
        success: false,
        error: "ACCESS_DENIED",
        message: "Storage access denied",
      };
    }

    if (error instanceof SyntaxError) {
      console.warn("Corrupted data found, removing...");
      return {
        success: false,
        error: "CORRUPTED_DATA",
        message: "Data corrupted",
      };
    }

    return { success: false, error: "UNKNOWN", message: error.message };
  },

  /**
   * Create fallback data when storage fails
   */
  createFallbackWeatherData(location) {
    const now = new Date();

    // Calculate appropriate UV index for current time
    const fallbackUVIndex = uvIndexUtils.validateUVIndex(
      5, // Default daytime UV index
      now.toISOString(),
      location?.lat || 0,
      location?.lon || 0
    );

    const fallbackInterval = {
      startTime: now.toISOString(),
      values: {
        temperature: 25,
        temperatureApparent: 27,
        humidity: 70,
        windSpeed: 5,
        weatherCode: 1101,
        precipitationProbability: 20,
        precipitationType: 0,
        precipitationIntensity: 0,
        pressureSurfaceLevel: 1013,
        uvIndex: fallbackUVIndex,
        visibility: 10,
      },
    };

    return {
      current: dataTransformers.transformWeatherData(
        {
          timelines: [
            {
              timestep: "1h",
              intervals: [fallbackInterval],
            },
          ],
        },
        location
      ).current,
      hourly: [],
      daily: [],
      rainPredictions: [],
      metadata: {
        fetchTime: Date.now(),
        location: location,
        dataSource: "fallback",
        version: "2.0",
      },
    };
  },
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitor = {
  /**
   * Measure storage operation performance
   */
  measureOperation(operation, operationFn) {
    const startTime = performance.now();
    const result = operationFn();
    const endTime = performance.now();

    console.log(
      `📊 Storage ${operation} took ${(endTime - startTime).toFixed(2)}ms`
    );
    return result;
  },

  /**
   * Log storage statistics
   */
  logStorageStats() {
    try {
      const used = this.getStorageUsage();
      const available = this.getAvailableStorage();
      const percentage = (used / (used + available)) * 100;

      console.log(
        `📊 Storage Usage: ${(used / 1024).toFixed(2)}KB (${percentage.toFixed(
          1
        )}%)`
      );
    } catch (error) {
// //       // // // // console.log("📊 Storage stats unavailable");
    }
  },

  getStorageUsage() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length;
      }
    }
    return total;
  },

  getAvailableStorage() {
    try {
      const testKey = "__storage_test__";
      const testData = "x".repeat(1024); // 1KB
      let available = 0;

      while (available < 10 * 1024 * 1024) {
        // Max 10MB test
        try {
          localStorage.setItem(testKey, testData.repeat(available / 1024));
          available += 1024;
        } catch (e) {
          localStorage.removeItem(testKey);
          break;
        }
      }

      localStorage.removeItem(testKey);
      return available;
    } catch (error) {
      return 0;
    }
  },
};

export default {
  dataValidators,
  dataTransformers,
  errorHandlers,
  performanceMonitor,
};
