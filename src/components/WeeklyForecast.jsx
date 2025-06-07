import React from "react";
import { Sun, Cloud, CloudRain } from "lucide-react";
import { formatTemperature } from "../utils/weatherFormatter";

const WeeklyForecast = ({ dailyData = [], darkMode }) => {
  if (!dailyData || dailyData.length === 0) {
    return null;
  }

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const getWeatherIcon = (weatherCode) => {
    if (weatherCode >= 4000)
      return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (weatherCode >= 1100) return <Cloud className="w-8 h-8 text-gray-400" />;
    return <Sun className="w-8 h-8 text-yellow-400" />;
  };

  // Temperature range calculations removed - orange bar was confusing to users

  return (
    <div
      className={`p-4 sm:p-6 rounded-xl shadow-lg transition-all duration-300 ${
        darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
      }`}
    >
      <h3 className="text-lg font-bold mb-4">7-Day Forecast</h3>
      <div className="space-y-3">
        {dailyData.map((day, index) => (
          <div key={index} className="flex items-center justify-between">
            <p className="w-1/4 font-semibold">{getDayOfWeek(day.startTime)}</p>
            <div className="w-1/4 flex justify-center">
              {getWeatherIcon(day.values.weatherCodeMax)}
            </div>
            <p className="w-1/4 text-center">
              {formatTemperature(day.values.temperatureMin)}°
            </p>
            <div className="w-1/4 text-center">
              <span
                className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                /
              </span>
            </div>
            <p className="w-1/4 text-right font-semibold">
              {formatTemperature(day.values.temperatureMax)}°
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyForecast;
