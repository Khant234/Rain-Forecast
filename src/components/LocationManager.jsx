import React, { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { PlusCircle, XCircle } from 'lucide-react';

const LocationManager = ({ currentLocation, onSelectLocation }) => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const { locations } = settings;

  const handleAddLocation = () => {
    const EPSILON = 0.0001; // A small tolerance for floating point comparison
    // Prevent adding duplicates
    if (!locations.some(loc => Math.abs(loc.lat - currentLocation.lat) < EPSILON && Math.abs(loc.lon - currentLocation.lon) < EPSILON)) {
      const newLocations = [...locations, currentLocation];
      updateSettings({ locations: newLocations });
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    const EPSILON = 0.0001;
    const newLocations = locations.filter(loc => 
        !(Math.abs(loc.lat - locationToRemove.lat) < EPSILON && Math.abs(loc.lon - locationToRemove.lon) < EPSILON)
    );
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