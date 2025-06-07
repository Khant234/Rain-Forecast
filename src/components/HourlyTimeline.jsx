import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatRainChance,
  getRainChanceColorClass,
  normalizePrecipitationProbability,
} from "../utils/rainChanceFormatter";

const HourlyTimeline = ({ hourlyData = [], language, darkMode }) => {
  const scrollRef = React.useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -150 : 150;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!hourlyData || hourlyData.length === 0) {
    return null; // Don't render if there's no data
  }

  const getWeatherEmoji = (interval) => {
    const { precipitationType, precipitationProbability, weatherCode } =
      interval.values;

    // Use weather code as primary indicator
    if (weatherCode) {
      switch (weatherCode) {
        case 1000: // Clear
          return "☀️";
        case 1100: // Mostly Clear
        case 1101: // Partly Cloudy
          return "⛅";
        case 1102: // Mostly Cloudy
        case 1001: // Cloudy
          return "☁️";
        case 2000: // Fog
        case 2100: // Light Fog
          return "🌫️";
        case 4000: // Light Rain
          return "🌦️";
        case 4001: // Rain
        case 4200: // Heavy Rain
        case 4201: // Heavy Rain
          return "🌧️";
        case 5000: // Snow
        case 5001: // Flurries
        case 5100: // Light Snow
        case 5101: // Heavy Snow
          return "❄️";
        case 6000: // Freezing Drizzle
        case 6001: // Freezing Rain
        case 6200: // Light Freezing Rain
        case 6201: // Heavy Freezing Rain
          return "🌨️";
        case 7000: // Ice Pellets
        case 7101: // Heavy Ice Pellets
        case 7102: // Light Ice Pellets
          return "🧊";
        case 8000: // Thunderstorm
          return "⛈️";
        default:
          // Fallback to precipitation-based logic for unknown codes
          break;
      }
    }

    // Fallback: Only show rain icons for significant precipitation probability
    if (precipitationType > 0 && precipitationProbability > 60) return "🌧️";
    if (precipitationProbability > 70) return "🌦️";

    // Default to sunny for low precipitation probability
    return "☀️";
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => scroll("left")}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-0.5 sm:p-1 rounded-full 
          ${
            darkMode ? "bg-gray-800 text-yellow-300" : "bg-white text-blue-600"
          } 
          shadow-lg hover:scale-110 transition-transform`}
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div
        ref={scrollRef}
        className="overflow-x-auto flex space-x-2 sm:space-x-3 md:space-x-4 px-6 sm:px-8 py-3 sm:py-4"
        style={{
          scrollSnapType: "x mandatory",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {hourlyData.map((interval) => (
          <div
            key={interval.startTime}
            className={`flex-shrink-0 w-20 sm:w-24 p-2 sm:p-3 rounded-lg ${
              darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
            } shadow-md transition-all duration-300 hover:scale-105 
              ${
                interval.values.precipitationProbability > 50
                  ? darkMode
                    ? "ring-1 sm:ring-2 ring-yellow-300"
                    : "ring-1 sm:ring-2 ring-blue-500"
                  : ""
              }`}
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="text-center space-y-1 sm:space-y-2">
              <div className="text-xs sm:text-sm font-medium">
                {formatTime(interval.startTime)}
              </div>
              <div className="text-xl sm:text-2xl">
                {getWeatherEmoji(interval)}
              </div>
              <div className="text-xs sm:text-sm font-bold">
                {Math.round(interval.values.temperature)}°C
              </div>
              <div
                className={`text-[10px] sm:text-xs text-center ${getRainChanceColorClass(
                  interval.values.precipitationProbability,
                  darkMode
                )}`}
              >
                {formatRainChance(
                  interval.values.precipitationProbability,
                  language,
                  false,
                  "short"
                )}
              </div>
              <div
                className={`text-[9px] sm:text-[10px] text-center ${
                  darkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                {normalizePrecipitationProbability(
                  interval.values.precipitationProbability
                )}
                %
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-0.5 sm:p-1 rounded-full 
          ${
            darkMode ? "bg-gray-800 text-yellow-300" : "bg-white text-blue-600"
          } 
          shadow-lg hover:scale-110 transition-transform`}
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
};

export default HourlyTimeline;
