import { useState, useEffect, useCallback } from "react";
import { useLocation } from "./useLocation";
import { useNotification } from "./useNotification";
import { fetchWeatherData } from "../services/weatherService";

export const useWeather = () => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [nextRainEvent, setNextRainEvent] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { coordinates } = useLocation();
  const { sendNotification } = useNotification();

  const processWeatherData = useCallback(
    (data) => {
      if (!data?.data?.timelines?.[0]?.intervals) {
        throw new Error("Invalid weather data format");
      }

      const intervals = data.data.timelines[0].intervals;
      const current = intervals[0];

      // Process current weather
      setCurrentWeather({
        temperature: Math.round(current.values.temperature),
        condition: current.values.weatherCode,
        description: getWeatherDescription(current.values.weatherCode),
        humidity: Math.round(current.values.humidity || 0),
        windSpeed: Math.round(current.values.windSpeed || 0),
      });

      // Process hourly forecast
      const hourly = intervals.slice(0, 24).map((interval) => ({
        time: interval.startTime,
        temperature: Math.round(interval.values.temperature),
        hasRain:
          interval.values.precipitationProbability > 60 ||
          (interval.values.precipitationType > 0 &&
            interval.values.precipitationProbability > 50),
        precipProbability: interval.values.precipitationProbability,
      }));
      setHourlyForecast(hourly);

      // Find next rain event
      const nextRain = intervals.find(
        (interval) =>
          interval.values.precipitationProbability >= 70 ||
          (interval.values.precipitationProbability >= 40 &&
            interval.values.precipitationType > 0)
      );

      if (nextRain) {
        const rainEvent = {
          startTime: nextRain.startTime,
          intensity: getRainIntensity(nextRain.values.precipitationProbability),
          duration: 30, // Default duration in minutes
        };
        setNextRainEvent(rainEvent);

        // Send notification if rain is expected within 15 minutes
        const rainStartTime = new Date(nextRain.startTime);
        const timeUntilRain = (rainStartTime - new Date()) / (1000 * 60);
        if (timeUntilRain <= 15 && timeUntilRain > 0) {
          sendNotification({
            title: "🌧️ Rain Alert",
            body: `Rain expected at your location in ${Math.round(
              timeUntilRain
            )} minutes. ☔ Stay dry!`,
          });
        }
      } else {
        setNextRainEvent(null);
      }
    },
    [sendNotification]
  );

  const fetchWeather = useCallback(async () => {
    if (!coordinates) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchWeatherData(coordinates);
      processWeatherData(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching weather:", err);
    } finally {
      setIsLoading(false);
    }
  }, [coordinates, processWeatherData]);

  // Initial fetch and refresh every 5 minutes
  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  return {
    currentWeather,
    nextRainEvent,
    hourlyForecast,
    isLoading,
    error,
    refetch: fetchWeather,
  };
};

// Helper functions
const getWeatherDescription = (code) => {
  // Map weather codes to descriptions
  const descriptions = {
    1000: "Clear sky",
    1100: "Partly cloudy",
    1101: "Cloudy",
    4000: "Light rain",
    4001: "Rain",
    4200: "Heavy rain",
    // Add more mappings as needed
  };
  return descriptions[code] || "Unknown";
};

const getRainIntensity = (probability) => {
  if (probability >= 80) return "heavy";
  if (probability >= 50) return "moderate";
  return "light";
};
