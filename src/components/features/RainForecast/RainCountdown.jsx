import React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { enUS, mm } from 'date-fns/locale'
import WeatherAnimation from "../../common/WeatherAnimation";
import {
  formatRainChance,
  getRainChanceExplanation,
  getRainChanceColorClass,
} from "../../../utils/rainChanceFormatter";

const RainCountdown = ({ nextRain, language }) => {
  const formatTimeDistance = (date) => {
    try {
      const parsedDate = parseISO(date);
      const locale = language === 'mm' ? mm : enUS
      return formatDistanceToNow(
          parsedDate,
        {
          addSuffix: true,
          locale: locale,
        }
      );
    } catch (error) {
      console.error("Error formatting time distance:", error);
      return language === "mm" ? "အချိန်အတိအကျ မသိရှိရပါ" : "Time unknown";
    }
  };

  const formatMessage = (timeDistance) => {
    if (language === "mm") {
      // Manual translation for Burmese - Consider using proper i18n
      return `မိုးရွာရန် ${timeDistance} ခန့်ကျန်ပါသည်`;
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
        <p
          className={`text-xs sm:text-sm ${getRainChanceColorClass(
            nextRain.precipitationProbability,
            false
          )}`}
        >
          {language === "mm"
            ? `မိုးရွာနိုင်ခြေ: ${formatRainChance(
                nextRain.precipitationProbability,
                language,
                true,
                "full"
              )}`
            : `Probability: ${formatRainChance(
                nextRain.precipitationProbability,
                language,
                true,
                "full"
              )}`}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {getRainChanceExplanation(
            nextRain.precipitationProbability,
            language
          )}
        </p>
      </div>
    </div>
  );
};

export default RainCountdown;
