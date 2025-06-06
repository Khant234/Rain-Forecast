import React, { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { PlusCircle, XCircle } from 'lucide-react';

const LocationManager = ({ currentLocation, onSelectLocation }) => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const { locations } = settings;

  const handleAddLocation = () => {
    // Prevent adding duplicates
    if (!locations.some(loc => loc.lat === currentLocation.lat && loc.lon === currentLocation.lon)) {
      const newLocations = [...locations, currentLocation];
      updateSettings({ locations: newLocations });
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    const newLocations = locations.filter(loc => !(loc.lat === locationToRemove.lat && loc.lon === locationToRemove.lon));
    updateSettings({ locations: newLocations });
  };

  return (
    <div className={`p-4 rounded-lg ${settings.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
      <h3 className="font-bold mb-3">Saved Locations</h3>
      <div className="space-y-2">
        {locations.map((loc, index) => (
          <div key={index} className="flex items-center justify-between p-2 rounded-md bg-gray-200 dark:bg-gray-600">
            <button onClick={() => onSelectLocation(loc)} className="text-left flex-grow">
              {loc.name}
            </button>
            <button onClick={() => handleRemoveLocation(loc)} className="ml-2 text-red-500">
              <XCircle size={18} />
            </button>
          </div>
        ))}
      </div>
      {currentLocation && (
        <button 
          onClick={handleAddLocation} 
          className="w-full mt-4 flex items-center justify-center p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
        >
          <PlusCircle size={18} className="mr-2" />
          Add Current Location
        </button>
      )}
    </div>
  );
};

export default LocationManager; 