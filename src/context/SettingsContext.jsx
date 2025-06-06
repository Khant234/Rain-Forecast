import React, { createContext, useState, useEffect } from 'react';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
        const storedSettings = localStorage.getItem('weatherAppSettings');
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            // Ensure a default location exists if the stored one is faulty
            if (!parsed.currentLocation) {
                parsed.currentLocation = { lat: 16.8409, lon: 96.1735, name: "Yangon" };
            }
            return parsed;
        }
    } catch (e) {
        // If parsing fails, return default state
        console.error("Failed to parse settings from localStorage", e);
    }
    return {
      theme: 'dark',
      language: 'en',
      units: 'metric',
      locations: [],
      currentLocation: { lat: 16.8409, lon: 96.1735, name: "Yangon" },
    };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('weatherAppSettings', JSON.stringify(settings));
    } catch (error) {
      console.error("Could not save settings to localStorage:", error);
    }
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings,
    }));
  };

  const setCurrentLocation = (location) => {
    updateSettings({ currentLocation: location });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, setCurrentLocation }}>
      {children}
    </SettingsContext.Provider>
  );
}; 