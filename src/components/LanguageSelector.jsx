import React, { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';

const LanguageSelector = () => {
  const { settings, updateSettings } = useContext(SettingsContext);

  const setLanguage = (language) => {
    updateSettings({ language: language });
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
      <span className="font-semibold">Language</span>
      <div className="flex rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
            settings.language === 'en' ? 'bg-white dark:bg-gray-600' : ''
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('mm')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
            settings.language === 'mm' ? 'bg-white dark:bg-gray-600' : ''
          }`}
        >
          MM
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector; 