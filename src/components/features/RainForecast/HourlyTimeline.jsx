import React from "react";
import { format } from "date-fns";
import WeatherAnimation from "../../common/WeatherAnimation";
import {
  formatRainChance,
  getRainChanceColorClass,
} from "../../../utils/rainChanceFormatter";

const HourlyTimeline = ({ hourlyData, language }) => {
  const formatTime = (date) => {
    const formattedTime = format(new Date(date), "h:mm a");

    if (language === "mm") {
      // Convert to Burmese format
      return formattedTime
        .replace("AM", "နံနက်")
        .replace("PM", "ညနေ")
        .replace(/\d/g, (d) => {
          const burmeseNumerals = [
            "၀",
            "၁",
            "၂",
            "၃",
            "၄",
            "၅",
            "၆",
            "၇",
            "၈",
            "၉",
          ];
          return burmeseNumerals[parseInt(d)];
        });
    }
    return formattedTime;
  };

  if (!hourlyData || hourlyData.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600 dark:text-gray-300">
          {language === "mm"
            ? "နာရီအလိုက် ခန့်မှန်းချက် မရရှိနိုင်ပါ"
            : "Hourly forecast not available"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex space-x-4 p-4 min-w-max">
        {hourlyData.map((hour, index) => (
          <div
            key={index}
            className="flex flex-col items-center space-y-2 min-w-[100px]"
          >
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {formatTime(hour.time)}
            </div>
            <WeatherAnimation condition={hour.weatherCode} />
            <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {language === "mm"
                ? `${hour.temperature}°C`
                : `${hour.temperature}°C`}
            </div>
            <div
              className={`text-xs ${getRainChanceColorClass(
                hour.precipitationProbability,
                false
              )}`}
            >
              {language === "mm"
                ? `${formatRainChance(
                    hour.precipitationProbability,
                    language,
                    false,
                    "short"
                  )}`
                : `${formatRainChance(
                    hour.precipitationProbability,
                    language,
                    false,
                    "short"
                  )}`}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {hour.precipitationProbability}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourlyTimeline;
