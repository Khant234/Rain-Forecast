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
                        width: `${((day.values.temperatureMax - day.values.temperatureMin) / 15) * 100}%`, 
                        marginLeft: `${(day.values.temperatureMin - 20) / 15 * 100}%`
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