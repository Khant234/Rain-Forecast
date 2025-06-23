import { useState, useEffect } from 'react';
import { getWeatherData } from '../services/weatherService';

export const useWeather = (latitude, longitude) => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [nextRainEvent, setNextRainEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setIsLoading(true);
        const weatherData = await getWeatherData(latitude, longitude);
        
        if (weatherData?.hourlyData?.data?.timelines?.[0]?.intervals) {
          const intervals = weatherData.hourlyData.data.timelines[0].intervals;
          const current = intervals[0]?.values;
          
          if (current) {
            setCurrentWeather({
              temperature: Math.round(current.temperature != null ? current.temperature : 25),
              description: getWeatherDescription(current.weatherCode != null ? current.weatherCode : 1000),
              condition: getWeatherCondition(current.weatherCode != null ? current.weatherCode : 1000),
            });
          }

          // Find next rain event
          const nextRain = intervals.find(interval => 
            interval.values.precipitationProbability > 50 || 
            interval.values.precipitationIntensity > 0
          );

          if (nextRain) {
            setNextRainEvent({
              startTime: nextRain.startTime,
              precipitationProbability: nextRain.values.precipitationProbability || 0,
              weatherCode: nextRain.values.weatherCode || 4001,
            });
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [latitude, longitude]);

  return {
    currentWeather,
    nextRainEvent,
    isLoading,
    error,
  };
};

const getWeatherDescription = (code) => {
  const descriptions = {
    1000: "Clear",
    1100: "Mostly Clear",
    1101: "Partly Cloudy",
    1102: "Mostly Cloudy",
    1001: "Cloudy",
    2000: "Fog",
    2100: "Light Fog",
    3000: "Light Wind",
    3001: "Wind",
    3002: "Strong Wind",
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
  return descriptions[code] || "Unknown";
};

const getWeatherCondition = (code) => {
  const conditions = {
    1000: "sunny",
    1100: "partly-cloudy",
    1101: "partly-cloudy",
    1102: "cloudy",
    1001: "cloudy",
    2000: "fog",
    2100: "fog",
    3000: "windy",
    3001: "windy",
    3002: "windy",
    4000: "rain",
    4001: "rain",
    4200: "rain",
    4201: "rain",
    5000: "snow",
    5001: "snow",
    5100: "snow",
    5101: "snow",
    6000: "rain",
    6001: "rain",
    6200: "rain",
    6201: "rain",
    7000: "snow",
    7101: "snow",
    7102: "snow",
    8000: "thunderstorm",
  };
  return conditions[code] || "unknown";
};
