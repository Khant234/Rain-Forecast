import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

const RainCountdown = ({ weatherData, language, darkMode }) => {
  const [timeToRain, setTimeToRain] = useState(null);
  const [rainDuration, setRainDuration] = useState(null);

  useEffect(() => {
    const calculateRainTiming = () => {
      // Use hourly data instead of minute data since we don't have minute data
      if (!weatherData || !Array.isArray(weatherData)) {
        return;
      }

      const intervals = weatherData;
      const now = new Date();

      // Find the next rain event
      let rainStartIndex = -1;
      let rainEndIndex = -1;

      for (let i = 0; i < intervals.length; i++) {
        const interval = intervals[i];
        const time = new Date(interval.startTime);

        if (time < now) continue;

        const isRaining =
          interval.values.precipitationType > 0 ||
          interval.values.precipitationProbability > 70;

        if (isRaining && rainStartIndex === -1) {
          rainStartIndex = i;
        } else if (!isRaining && rainStartIndex !== -1 && rainEndIndex === -1) {
          rainEndIndex = i - 1;
          break;
        }
      }

      if (rainStartIndex === -1) {
        setTimeToRain(null);
        setRainDuration(null);
        return;
      }

      // Calculate time until rain starts
      const rainStartTime = new Date(intervals[rainStartIndex].startTime);
      const timeUntilRain = Math.max(0, rainStartTime - now);

      // Calculate rain duration
      if (rainEndIndex === -1) rainEndIndex = intervals.length - 1;
      const rainEndTime = new Date(intervals[rainEndIndex].startTime);
      const duration = Math.max(0, rainEndTime - rainStartTime);

      setTimeToRain(timeUntilRain);
      setRainDuration(duration);
    };

    calculateRainTiming();
    const interval = setInterval(calculateRainTiming, 1000);
    return () => clearInterval(interval);
  }, [weatherData]);

  const formatTime = (ms) => {
    if (!ms) return null;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (language === "mm") {
      if (hours > 0) {
        return `${hours} နာရီ ${minutes} မိနစ်`;
      }
      return `${minutes} မိနစ်`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!timeToRain || !rainDuration) {
    return (
      <div
        className={`text-center p-3 sm:p-4 rounded-lg ${
          darkMode ? "bg-gray-800/50 text-white" : "bg-white/50 text-gray-800"
        } backdrop-blur-sm`}
      >
        <div className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2">
          {language === "mm" ? "မိုးရွာခြင်း" : "Rain Status"}
        </div>
        <div className="text-xs sm:text-sm">
          {language === "mm"
            ? "လတ်တလော မိုးရွာဖွယ်မရှိပါ"
            : "No rain expected soon"}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`text-center p-3 sm:p-4 rounded-lg ${
        darkMode ? "bg-gray-800/50 text-white" : "bg-white/50 text-gray-800"
      } backdrop-blur-sm`}
    >
      <div className="text-base sm:text-lg font-bold mb-3 sm:mb-4">
        {language === "mm" ? "မိုးရွာရန်ကျန်ချိန်" : "Time until Rain"}
      </div>

      <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mb-3 sm:mb-4">
        <Clock
          className={`w-4 h-4 sm:w-5 sm:h-5 ${
            darkMode ? "text-yellow-300" : "text-blue-600"
          }`}
        />
        <span className="text-xl sm:text-2xl font-mono">{formatTime(timeToRain)}</span>
      </div>

      <div
        className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
      >
        {language === "mm"
          ? `ခန့်မှန်းကြာချိန်: ${formatTime(rainDuration)}`
          : `Expected duration: ${formatTime(rainDuration)}`}
      </div>
    </div>
  );
};

export default RainCountdown;
