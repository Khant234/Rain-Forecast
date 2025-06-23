import React, { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { PlusCircle, XCircle } from 'lucide-react';

const EPSILON = 0.0001; // A small tolerance for floating point comparison

const LocationManager = ({ currentLocation, onSelectLocation }) => {
  const { settings, updateSettings } = useContext(SettingsContext);
  const { locations } = settings;

  const handleAddLocation = () => {
    // Prevent adding duplicates
    if (!locations.some(loc => Math.abs(loc.lat - currentLocation.lat) < EPSILON && Math.abs(loc.lon - currentLocation.lon) < EPSILON)) {
      // Ensure the currentLocation has a name property
      const newLocation = { ...currentLocation, name: currentLocation.name || `Location ${locations.length + 1}` };
      const newLocations = [...locations, newLocation];
      updateSettings({ locations: newLocations });
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    const newLocations = locations.filter(loc => 
        !(Math.abs(loc.lat - locationToRemove.lat) < EPSILON && Math.abs(loc.lon - locationToRemove.lon) < EPSILON)
    );
    updateSettings({ locations: newLocations });
  };

  return (
    <div className={`p-4 rounded-lg ${settings.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
      <h3 className=