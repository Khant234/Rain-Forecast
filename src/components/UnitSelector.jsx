import React, { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';

const UnitSelector = () => {
  const { settings, updateSettings } = useContext(SettingsContext);

  const setUnits = (unit) => {
    updateSettings({ units: unit });
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
      <span className="font-semibold">Temperature Units</span>
      <div className="flex rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
        <button
          onClick={() => setUnits('metric')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
            settings.units === 'metric' ? 'bg-white dark:bg-gray-600' : ''
          }`}
        >
          °C
        </button>
        <button
          onClick={() => setUnits('imperial')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
            settings.units === 'imperial' ? 'bg-white dark:bg-gray-600' : ''
          }`}
        >
          °F
        </button>
      </div>
    </div>
  );
};

export default UnitSelector; 