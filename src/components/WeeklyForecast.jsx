import React from 'react';
import { Sun, Cloud, CloudRain } from 'lucide-react';

const WeeklyForecast = ({ dailyData = [], darkMode }) => {

  if (!dailyData || dailyData.length === 0) {
    return null;
  }

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getWeatherIcon = (weatherCode) => {
    if (weatherCode >= 4000) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (weatherCode >= 1100) return <Cloud className="w-8 h-8 text-gray-400" />;
    return <Sun className="w-8 h-8 text-yellow-400" />;
  };

  // Dynamically calculate the overall temperature range for the week for a more stable bar display
  const allTemps = dailyData.flatMap(d => [d.values.temperatureMin, d.values.temperatureMax]);
  const overallMin = Math.min(...allTemps);
  const overallMax = Math.max(...allTemps);
  const tempRange = Math.max(1, overallMax - overallMin); // Avoid division by zero

  return (
    <div className={`p-4 sm:p-6 rounded-xl shadow-lg transition-all duration-300 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <h3 className="text-lg font-bold mb-4">7-Day Forecast</h3>
      <div className="space-y-3">
        {dailyData.map((day, index) => (
          <div key={index} className="flex items-center justify-between">
            <p className="w-1/4 font-semibold">{getDayOfWeek(day.startTime)}</p>
            <div className="w-1/4 flex justify-center">
              {getWeatherIcon(day.values.weatherCodeMax)}
            </div>
            <p className="w-1/4 text-center">{Math.round(day.values.temperatureMin)}°</p>
            <div className="w-1/4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500" 
                    style={{ 
                        marginLeft: `${Math.max(0, (day.values.temperatureMin - overallMin) / tempRange * 100)}%`,
                        width: `${Math.min(100, (day.values.temperatureMax - day.values.temperatureMin) / tempRange * 100)}%`
                    }}
                ></div>
            </div>
            <p className="w-1/4 text-right font-semibold">{Math.round(day.values.temperatureMax)}°</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyForecast; 