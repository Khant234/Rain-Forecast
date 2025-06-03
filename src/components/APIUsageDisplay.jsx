import React, { useState, useEffect } from 'react';
import { apiTracker } from '../utils/apiUsageTracker';

const APIUsageDisplay = ({ darkMode }) => {
  const [usage, setUsage] = useState(null);
  
  useEffect(() => {
    const updateUsage = () => {
      const report = apiTracker.getReport();
      setUsage(report);
    };
    
    updateUsage();
    const interval = setInterval(updateUsage, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (!usage) return null;
  
  const getColorClass = (percentage) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  return (
    <div className={`fixed bottom-2 sm:bottom-4 right-2 sm:right-4 p-3 sm:p-4 rounded-lg shadow-lg ${
      darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    } max-w-[280px] sm:max-w-xs`}>
      <h3 className="text-sm sm:text-base font-bold mb-1.5 sm:mb-2">API Usage</h3>
      
      {/* Daily Usage */}
      <div className="mb-1.5 sm:mb-2">
        <div className="flex justify-between text-xs sm:text-sm">
          <span>Daily</span>
          <span className={getColorClass(usage.daily.percentage)}>
            {usage.daily.used}/{usage.daily.limit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1">
          <div 
            className={`h-1.5 sm:h-2 rounded-full ${
              usage.daily.percentage >= 90 ? 'bg-red-500' :
              usage.daily.percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usage.daily.percentage, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Hourly Usage */}
      <div className="mb-1.5 sm:mb-2">
        <div className="flex justify-between text-xs sm:text-sm">
          <span>Hourly</span>
          <span>{usage.hourly.used}/{usage.hourly.limit}</span>
        </div>
      </div>
      
      {/* Recommendations */}
      {usage.recommendations.length > 0 && (
        <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-gray-300 dark:border-gray-600">
          <p className="text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1">Tips:</p>
          {usage.recommendations.map((rec, idx) => (
            <p key={idx} className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
              • {rec}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default APIUsageDisplay;