import React from "react";
import { useWeather } from "../../../hooks/useWeather";
import { useTranslation } from "../../../hooks/useTranslation";
import RainCountdown from "./RainCountdown";
import WeatherAnimation from "../../common/WeatherAnimation";

const RainForecast = () => {
  const { currentWeather, nextRainEvent, isLoading } = useWeather();
  const { t, language } = useTranslation();

  if (isLoading) {
    return (
      <div className="animate-pulse p-3 sm:p-4 bg-white/10 rounded-lg">
        <div className="h-6 sm:h-8 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
        <div className="h-4 sm:h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <WeatherAnimation condition={currentWeather?.condition} />
        <div className="flex-1 ml-3 sm:ml-4">
          <h2 className="text-base sm:text-lg font-semibold">
            {currentWeather?.temperature}°C
          </h2>
          <p className="text-xs sm:text-sm opacity-75">{currentWeather?.description}</p>
        </div>
      </div>

      {nextRainEvent && (
        <RainCountdown
          nextRain={nextRainEvent}
          language={language}
        />
      )}
    </div>
  );
};

export default RainForecast;
