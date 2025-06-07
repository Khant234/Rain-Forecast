import React from "react";
import { format } from "date-fns";
import WeatherAnimation from "../../common/WeatherAnimation";
import { formatTemperature } from "../../../utils/weatherFormatter";

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
      <div className="text-center p-3 sm:p-4">
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          {language === "mm"
            ? "နာရီအလိုက် ခန့်မှန်းချက် မရရှိနိုင်ပါ"
            : "Hourly forecast not available"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="flex space-x-3 sm:space-x-4 p-3 sm:p-4 min-w-max">
        {hourlyData.map((hour, index) => (
          <div
            key={index}
            className="flex flex-col items-center space-y-1.5 sm:space-y-2 min-w-[80px] sm:min-w-[100px]"
          >
            <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
              {formatTime(hour.time)}
            </div>
            <div className="scale-75 sm:scale-100">
              <WeatherAnimation condition={hour.weatherCode} />
            </div>
            <div className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100">
              {language === "mm"
                ? `${formatTemperature(hour.temperature)}°C`
                : `${formatTemperature(hour.temperature)}°C`}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 text-center">
              {language === "mm"
                ? `မိုးရွာနိုင်ခြေ ${hour.precipitationProbability}%`
                : `${hour.precipitationProbability}% chance`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourlyTimeline;
