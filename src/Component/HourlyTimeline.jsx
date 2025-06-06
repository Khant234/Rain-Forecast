import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
const HourlyTimeline = ({ data, language, darkMode }) => {
  const scrollRef = React.useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -150 : 150;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!data?.hourlyData?.data?.timelines?.[0]?.intervals) {
    return null;
  }

  const intervals = data.hourlyData.data.timelines[0].intervals;

  const getWeatherEmoji = (interval) => {
    const { precipitationType, precipitationProbability } = interval.values;
    if (precipitationType > 0 || precipitationProbability > 70) return "🌧️";
    if (precipitationProbability > 30) return "🌦️";
    return "☀️";
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
      timeZone: "Asia/Yangon",
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
        className="overflow-x-auto hide-scrollbar flex space-x-2 sm:space-x-3 md:space-x-4 px-6 sm:px-8 py-3 sm:py-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {intervals.map((interval, index) => (
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
              <div className="text-xl sm:text-2xl">{getWeatherEmoji(interval)}</div>
              <div className="text-xs sm:text-sm font-bold">
                {Math.round(interval.values.temperature)}°C
              </div>
              <div
                className={`text-[10px] sm:text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {interval.values.precipitationProbability}%
                <br />
                {language === "mm" ? "မိုးရွာနိုင်ခြေ" : "Rain"}
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

      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default HourlyTimeline;
