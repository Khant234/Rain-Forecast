/**
 * OpenWeatherMap Data Transformer
 * Converts OpenWeatherMap API responses to Tomorrow.io compatible format
 * Includes Myanmar timezone conversion and data validation
 */

import { dataValidators } from "./storageManager.js";

/**
 * Convert OpenWeatherMap weather condition codes to Tomorrow.io weather codes
 * Reference: https://openweathermap.org/weather-conditions
 */
const mapWeatherCode = (owmCode, owmMain) => {
  // Map OpenWeatherMap codes to Tomorrow.io equivalent codes
  const weatherCodeMap = {
    // Clear
    800: 1000, // Clear sky
    
    // Clouds
    801: 1100, // Few clouds
    802: 1101, // Scattered clouds
    803: 1102, // Broken clouds
    804: 1001, // Overcast clouds
    
    // Rain
    500: 4000, // Light rain
    501: 4001, // Moderate rain
    502: 4001, // Heavy intensity rain
    503: 4001, // Very heavy rain
    504: 4001, // Extreme rain
    511: 6000, // Freezing rain
    520: 4000, // Light intensity shower rain
    521: 4001, // Shower rain
    522: 4001, // Heavy intensity shower rain
    531: 4001, // Ragged shower rain
    
    // Drizzle
    300: 4000, // Light intensity drizzle
    301: 4000, // Drizzle
    302: 4000, // Heavy intensity drizzle
    310: 4000, // Light intensity drizzle rain
    311: 4000, // Drizzle rain
    312: 4000, // Heavy intensity drizzle rain
    313: 4000, // Shower rain and drizzle
    314: 4000, // Heavy shower rain and drizzle
    321: 4000, // Shower drizzle
    
    // Thunderstorm
    200: 8000, // Thunderstorm with light rain
    201: 8000, // Thunderstorm with rain
    202: 8000, // Thunderstorm with heavy rain
    210: 8000, // Light thunderstorm
    211: 8000, // Thunderstorm
    212: 8000, // Heavy thunderstorm
    221: 8000, // Ragged thunderstorm
    230: 8000, // Thunderstorm with light drizzle
    231: 8000, // Thunderstorm with drizzle
    232: 8000, // Thunderstorm with heavy drizzle
    
    // Snow
    600: 5000, // Light snow
    601: 5001, // Snow
    602: 5001, // Heavy snow
    611: 6000, // Sleet
    612: 6000, // Light shower sleet
    613: 6000, // Shower sleet
    615: 5000, // Light rain and snow
    616: 5000, // Rain and snow
    620: 5000, // Light shower snow
    621: 5001, // Shower snow
    622: 5001, // Heavy shower snow
    
    // Atmosphere
    701: 2000, // Mist
    711: 2000, // Smoke
    721: 2000, // Haze
    731: 2000, // Sand/dust whirls
    741: 2100, // Fog
    751: 2000, // Sand
    761: 2000, // Dust
    762: 2000, // Volcanic ash
    771: 2000, // Squalls
    781: 2000, // Tornado
  };

  return weatherCodeMap[owmCode] || 1000; // Default to clear sky
};

/**
 * Convert OpenWeatherMap UV Index to validated range (0-15)
 */
const validateUVIndex = (uvIndex) => {
  if (uvIndex === null || uvIndex === undefined || isNaN(uvIndex)) {
    return 0;
  }
  
  const uv = parseFloat(uvIndex);
  return Math.max(0, Math.min(15, Math.round(uv)));
};

/**
 * Convert wind direction from degrees to cardinal direction
 */
const getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    return 0;
  }
  return parseFloat(degrees);
};

/**
 * Calculate precipitation probability from OpenWeatherMap data
 * OpenWeatherMap doesn't always provide precipitation probability,
 * so we estimate it based on weather conditions and humidity
 */
const calculatePrecipitationProbability = (weather, humidity, pop = null) => {
  // If precipitation probability is provided, use it
  if (pop !== null && pop !== undefined && !isNaN(pop)) {
    return Math.round(parseFloat(pop) * 100); // Convert from 0-1 to 0-100
  }

  // Estimate based on weather conditions
  const mainCondition = weather?.main?.toLowerCase() || "";
  const description = weather?.description?.toLowerCase() || "";

  if (mainCondition.includes("rain") || description.includes("rain")) {
    return Math.min(90, Math.max(60, humidity || 70));
  }
  
  if (mainCondition.includes("drizzle") || description.includes("drizzle")) {
    return Math.min(70, Math.max(40, humidity || 60));
  }
  
  if (mainCondition.includes("thunderstorm") || description.includes("thunderstorm")) {
    return Math.min(95, Math.max(70, humidity || 80));
  }
  
  if (mainCondition.includes("snow") || description.includes("snow")) {
    return Math.min(85, Math.max(50, humidity || 65));
  }

  // For other conditions, estimate based on humidity
  if (humidity > 80) return Math.min(30, humidity - 50);
  if (humidity > 60) return Math.min(20, humidity - 60);
  
  return Math.max(0, Math.min(10, humidity - 70));
};

/**
 * Convert OpenWeatherMap timestamp to Myanmar time
 */
const convertToMyanmarTime = (timestamp) => {
  const date = new Date(timestamp * 1000); // OpenWeatherMap uses Unix timestamp
  const myanmarOffset = 6.5 * 60 * 60 * 1000; // UTC+6.5 in milliseconds
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  const myanmarTime = new Date(utcTime + myanmarOffset);
  
  return myanmarTime.toISOString();
};

/**
 * Transform OpenWeatherMap current weather to Tomorrow.io format
 */
export const transformCurrentWeather = (owmData) => {
  if (!owmData || !owmData.main) {
    throw new Error("Invalid OpenWeatherMap current weather data");
  }

  const weather = owmData.weather?.[0] || {};
  const main = owmData.main;
  const wind = owmData.wind || {};
  const clouds = owmData.clouds || {};
  const sys = owmData.sys || {};

  // Calculate precipitation probability
  const precipitationProbability = calculatePrecipitationProbability(
    weather,
    main.humidity
  );

  const transformedData = {
    startTime: convertToMyanmarTime(owmData.dt),
    values: {
      temperature: dataValidators.isValidNumber(main.temp, -100, 100) ? main.temp : 25,
      temperatureApparent: dataValidators.isValidNumber(main.feels_like, -100, 100) ? main.feels_like : main.temp || 25,
      humidity: dataValidators.isValidNumber(main.humidity, 0, 100) ? Math.round(main.humidity) : 70,
      windSpeed: dataValidators.isValidNumber(wind.speed, 0, 200) ? wind.speed : 0,
      windDirection: getWindDirection(wind.deg),
      weatherCode: mapWeatherCode(weather.id, weather.main),
      visibility: dataValidators.isValidNumber(owmData.visibility, 0, 50000) ? owmData.visibility / 1000 : 10, // Convert m to km
      cloudCover: dataValidators.isValidNumber(clouds.all, 0, 100) ? clouds.all : 0,
      uvIndex: 0, // Will be updated from forecast data if available
      pressureSurfaceLevel: dataValidators.isValidNumber(main.pressure, 800, 1200) ? main.pressure : 1013,
      precipitationProbability,
      precipitationType: precipitationProbability > 20 ? 1 : 0, // 1 for rain, 0 for none
      precipitationIntensity: precipitationProbability > 50 ? 2 : precipitationProbability > 20 ? 1 : 0,
      sunriseTime: sys.sunrise ? convertToMyanmarTime(sys.sunrise) : null,
      sunsetTime: sys.sunset ? convertToMyanmarTime(sys.sunset) : null,
    },
  };

  console.log("🔄 Transformed OpenWeatherMap current weather data");
  return transformedData;
};

/**
 * Transform OpenWeatherMap hourly forecast to Tomorrow.io format
 */
export const transformHourlyForecast = (owmHourlyData) => {
  if (!Array.isArray(owmHourlyData)) {
    throw new Error("Invalid OpenWeatherMap hourly forecast data");
  }

  const transformedHourly = owmHourlyData.map((hour) => {
    const weather = hour.weather?.[0] || {};
    const precipitationProbability = calculatePrecipitationProbability(
      weather,
      hour.humidity,
      hour.pop
    );

    return {
      startTime: convertToMyanmarTime(hour.dt),
      values: {
        temperature: dataValidators.isValidNumber(hour.temp, -100, 100) ? hour.temp : 25,
        temperatureApparent: dataValidators.isValidNumber(hour.feels_like, -100, 100) ? hour.feels_like : hour.temp || 25,
        humidity: dataValidators.isValidNumber(hour.humidity, 0, 100) ? Math.round(hour.humidity) : 70,
        windSpeed: dataValidators.isValidNumber(hour.wind_speed, 0, 200) ? hour.wind_speed : 0,
        windDirection: getWindDirection(hour.wind_deg),
        weatherCode: mapWeatherCode(weather.id, weather.main),
        visibility: dataValidators.isValidNumber(hour.visibility, 0, 50000) ? hour.visibility / 1000 : 10,
        cloudCover: dataValidators.isValidNumber(hour.clouds, 0, 100) ? hour.clouds : 0,
        uvIndex: validateUVIndex(hour.uvi),
        pressureSurfaceLevel: dataValidators.isValidNumber(hour.pressure, 800, 1200) ? hour.pressure : 1013,
        precipitationProbability,
        precipitationType: precipitationProbability > 20 ? 1 : 0,
        precipitationIntensity: precipitationProbability > 50 ? 2 : precipitationProbability > 20 ? 1 : 0,
      },
    };
  });

  console.log(`🔄 Transformed ${transformedHourly.length} hourly forecast entries`);
  return transformedHourly;
};

/**
 * Transform OpenWeatherMap daily forecast to Tomorrow.io format
 */
export const transformDailyForecast = (owmDailyData) => {
  if (!Array.isArray(owmDailyData)) {
    throw new Error("Invalid OpenWeatherMap daily forecast data");
  }

  const transformedDaily = owmDailyData.map((day) => {
    const weather = day.weather?.[0] || {};
    const temp = day.temp || {};
    const precipitationProbability = calculatePrecipitationProbability(
      weather,
      day.humidity,
      day.pop
    );

    return {
      startTime: convertToMyanmarTime(day.dt),
      values: {
        temperature: dataValidators.isValidNumber(temp.day, -100, 100) ? temp.day : 25,
        temperatureApparent: dataValidators.isValidNumber(day.feels_like?.day, -100, 100) ? day.feels_like.day : temp.day || 25,
        temperatureMin: dataValidators.isValidNumber(temp.min, -100, 100) ? temp.min : 20,
        temperatureMax: dataValidators.isValidNumber(temp.max, -100, 100) ? temp.max : 30,
        humidity: dataValidators.isValidNumber(day.humidity, 0, 100) ? Math.round(day.humidity) : 70,
        windSpeed: dataValidators.isValidNumber(day.wind_speed, 0, 200) ? day.wind_speed : 0,
        windDirection: getWindDirection(day.wind_deg),
        weatherCode: mapWeatherCode(weather.id, weather.main),
        cloudCover: dataValidators.isValidNumber(day.clouds, 0, 100) ? day.clouds : 0,
        uvIndex: validateUVIndex(day.uvi),
        pressureSurfaceLevel: dataValidators.isValidNumber(day.pressure, 800, 1200) ? day.pressure : 1013,
        precipitationProbability,
        precipitationType: precipitationProbability > 20 ? 1 : 0,
        precipitationIntensity: precipitationProbability > 50 ? 2 : precipitationProbability > 20 ? 1 : 0,
        sunriseTime: day.sunrise ? convertToMyanmarTime(day.sunrise) : null,
        sunsetTime: day.sunset ? convertToMyanmarTime(day.sunset) : null,
      },
    };
  });

  console.log(`🔄 Transformed ${transformedDaily.length} daily forecast entries`);
  return transformedDaily;
};

/**
 * Transform comprehensive OpenWeatherMap data to Tomorrow.io format
 */
export const transformOpenWeatherMapData = (owmData) => {
  if (!owmData || (!owmData.current && !owmData.forecast)) {
    throw new Error("Invalid OpenWeatherMap comprehensive data");
  }

  const timelines = [];

  try {
    // Transform current weather if available
    if (owmData.current) {
      const currentData = transformCurrentWeather(owmData.current);
      
      // Create hourly timeline with current data as first entry
      timelines.push({
        timestep: "1h",
        startTime: currentData.startTime,
        endTime: currentData.startTime,
        intervals: [currentData],
      });
    }

    // Transform forecast data if available
    if (owmData.forecast) {
      // Hourly forecast
      if (owmData.forecast.hourly) {
        const hourlyData = transformHourlyForecast(owmData.forecast.hourly);
        
        if (timelines.length > 0) {
          // Merge with existing hourly timeline
          timelines[0].intervals = [...timelines[0].intervals, ...hourlyData];
          timelines[0].endTime = hourlyData[hourlyData.length - 1]?.startTime || timelines[0].endTime;
        } else {
          // Create new hourly timeline
          timelines.push({
            timestep: "1h",
            startTime: hourlyData[0]?.startTime,
            endTime: hourlyData[hourlyData.length - 1]?.startTime,
            intervals: hourlyData,
          });
        }
      }

      // Daily forecast
      if (owmData.forecast.daily) {
        const dailyData = transformDailyForecast(owmData.forecast.daily);
        
        timelines.push({
          timestep: "1d",
          startTime: dailyData[0]?.startTime,
          endTime: dailyData[dailyData.length - 1]?.startTime,
          intervals: dailyData,
        });
      }
    }

    const transformedData = {
      data: {
        timelines,
      },
      source: "openweathermap",
      timestamp: Date.now(),
    };

    console.log("✅ Successfully transformed OpenWeatherMap data to Tomorrow.io format");
    return transformedData;
  } catch (error) {
    console.error("❌ Failed to transform OpenWeatherMap data:", error);
    throw error;
  }
};

export default {
  transformCurrentWeather,
  transformHourlyForecast,
  transformDailyForecast,
  transformOpenWeatherMapData,
  mapWeatherCode,
  validateUVIndex,
  convertToMyanmarTime,
};
