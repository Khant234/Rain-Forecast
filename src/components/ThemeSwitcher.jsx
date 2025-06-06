import React, { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { Sun, Moon } from 'lucide-react';

const ThemeSwitcher = () => {
  const { settings, updateSettings } = useContext(SettingsContext);

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
      <span className="font-semibold">Theme</span>
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
        className={`p-2 rounded-full transition-all ${
          settings.theme === 'dark'
            ? "bg-gray-800 text-yellow-400 hover:bg-gray-600"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
};

export default ThemeSwitcher; 