import React from "react";
import { Sun, Cloud, Wind, Droplets, Bell, BellOff } from "lucide-react";
import { rainNotificationService } from "../services/notificationService";

const CurrentWeatherCard = ({ weather, darkMode }) => {
  const notificationSettings = rainNotificationService.getSettings();
  const isNotificationEnabled =
    notificationSettings.enabled &&
    rainNotificationService.getPermissionStatus() === "granted";

  if (!weather) {
    return (
      <div
        className={`p-4 sm:p-6 rounded-xl shadow-lg transition-all duration-300 ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <div className="text-center p-8">Loading current weather...</div>
      </div>
    );
  }

  // Defensively destructure with default values
  const {
    location = "Unknown Location",
    temperature = "--",
    feelsLike = "--",
    condition = "No data",
    windSpeed = 0,
    humidity = 0,
    pressure = 0,
    uvIndex = 0,
  } = weather || {};

  // Simple icon selection based on condition
  const getWeatherIcon = (cond) => {
    const lowerCaseCondition = cond.toLowerCase();
    if (lowerCaseCondition.includes("cloud")) {
      return <Cloud className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400" />;
    }
    return <Sun className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-400" />;
  };

  return (
    <div
      className={`p-4 sm:p-6 rounded-xl shadow-lg transition-all duration-300 ${
        darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold">{location}</h2>
            {isNotificationEnabled && (
              <div className="flex items-center" title="Rain alerts enabled">
                <Bell className="w-4 h-4 text-green-500" />
                <span className="w-2 h-2 bg-green-500 rounded-full ml-1"></span>
              </div>
            )}
          </div>
          <p className="text-sm sm:text-base text-gray-400">{condition}</p>
        </div>
        <div className="text-right">{getWeatherIcon(condition)}</div>
      </div>

      <div className="mt-4 text-center">
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter">
          {Math.round(temperature)}°C
        </h1>
        <p className="text-sm sm:text-base text-gray-400 mt-1">
          Feels like {Math.round(feelsLike)}°C
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Wind className="w-5 h-5 text-blue-500" />
          <div>
            <p className="font-semibold">{windSpeed} km/h</p>
            <p className="text-gray-400">Wind</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Droplets className="w-5 h-5 text-cyan-500" />
          <div>
            <p className="font-semibold">{humidity}%</p>
            <p className="text-gray-400">Humidity</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Sun className="w-5 h-5 text-orange-500" />
          <div>
            <p className="font-semibold">{uvIndex}</p>
            <p className="text-gray-400">UV Index</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <p className="font-bold text-lg">{pressure} hPa</p>
          <p className="text-gray-400">Pressure</p>
        </div>
      </div>
    </div>
  );
};

export default CurrentWeatherCard;
