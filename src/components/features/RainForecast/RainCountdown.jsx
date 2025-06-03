import React from "react";
import { formatDistanceToNow } from "date-fns";
import WeatherAnimation from "../../common/WeatherAnimation";

const RainCountdown = ({ nextRain, language }) => {
  const formatTimeDistance = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
      });
    } catch (error) {
      console.error("Error formatting time distance:", error);
      return language === "mm" ? "အချိန်အတိအကျ မသိရှိရပါ" : "Time unknown";
    }
  };

  const formatMessage = (timeDistance) => {
    if (language === "mm") {
      // Manual translation for Burmese
      const translatedTime = timeDistance
        .replace("about", "ခန့်")
        .replace("in", "")
        .replace("minute", "မိနစ်")
        .replace("hour", "နာရီ")
        .replace("day", "ရက်")
        .replace("month", "လ")
        .replace("year", "နှစ်")
        .replace("s", "");
      return `မိုးရွာရန် ${translatedTime} ခန့်ကျန်ပါသည်`;
    }
    return `Rain expected ${timeDistance}`;
  };

  if (!nextRain) {
    return (
      <div className="text-center p-3 sm:p-4">
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          {language === "mm"
            ? "လက်ရှိတွင် မိုးရွာသွန်းမှု မရှိပါ"
            : "No rain expected at the moment"}
        </p>
      </div>
    );
  }

  const timeDistance = formatTimeDistance(nextRain.startTime);

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-4 p-3 sm:p-4">
      <div className="scale-90 sm:scale-100">
        <WeatherAnimation condition={nextRain.weatherCode} />
      </div>
      <div className="text-center">
        <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
          {formatMessage(timeDistance)}
        </p>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          {language === "mm"
            ? `မိုးရွာနိုင်ခြေ: ${nextRain.precipitationProbability}%`
            : `Probability: ${nextRain.precipitationProbability}%`}
        </p>
      </div>
    </div>
  );
};

export default RainCountdown;
