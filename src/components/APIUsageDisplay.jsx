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
  
  const getHourlyColorClass = (percentage) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className={`fixed bottom-2 sm:bottom-4 right-2 sm:right-4 p-3 sm:p-4 rounded-lg shadow-lg ${
      darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    } max-w-[280px] sm:max-w-xs`}>
      <h3 className=