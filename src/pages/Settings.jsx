import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SettingsContext } from '../context/SettingsContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import UnitSelector from '../components/UnitSelector';
import LanguageSelector from '../components/LanguageSelector';
import LocationManager from '../components/LocationManager';

const Settings = () => {
  const { settings, setCurrentLocation } = useContext(SettingsContext);
  const { theme: darkMode, currentLocation } = settings;
  const navigate = useNavigate();

  const handleSelectLocation = (location) => {
    setCurrentLocation(location);
    navigate('/'); // Navigate back to home to see the change
  };

  return (
    <div className={`p-4 sm:p-6 ${darkMode === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="space-y-4">
        <ThemeSwitcher />
        <UnitSelector />
        <LanguageSelector />
        <LocationManager 
            currentLocation={currentLocation}
            onSelectLocation={handleSelectLocation}
        />
      </div>

      <div className="mt-8 text-center">
        <Link to="/" className="text-blue-500 hover:underline">
          &larr; Back to Weather
        </Link>
      </div>
    </div>
  );
};

export default Settings; 