import React from "react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from 'react-i18next';
import WeatherAnimation from "../../common/WeatherAnimation";
import {
  formatRainChance,
  getRainChanceExplanation,
  getRainChanceColorClass,
} from "../../../utils/rainChanceFormatter";

const RainCountdown = ({ nextRain, language }) => {
  const { t } = useTranslation();

  const formatTimeDistance = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: language === 'mm' ? require('date-fns/locale/my') : undefined, // Burmese locale
      });
    } catch (error) {
      console.error("Error formatting time distance:", error);
      return t('timeUnknown', { ns: 'rainForecast' }); // i18n key
    }
  };

  const timeDistance = formatTimeDistance(nextRain.startTime);

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-4 p-3 sm:p-4">
      <div className="scale-90 sm:scale-100">
        <WeatherAnimation condition={nextRain.weatherCode} />
      </div>
      <div className="text-center">
        <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
          {t('rainExpected', { timeDistance, ns: 'rainForecast' })}
        </p>
        <p
          className={`text-xs sm:text-sm ${getRainChanceColorClass(
            nextRain.precipitationProbability,
            false
          )}`}
        >
          {t('probability', { rainChance: formatRainChance(
                nextRain.precipitationProbability,
                language,
                true,
                "full"
              ), ns: 'rainForecast' })}
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
