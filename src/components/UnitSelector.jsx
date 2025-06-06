import React, { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import ToggleSelector from './ToggleSelector';

const UnitSelector = () => {
  const { settings, updateSettings } = useContext(SettingsContext);

  const unitOptions = [
    { value: 'metric', label: '°C', ariaLabel: 'Set units to Celsius' },
    { value: 'imperial', label: '°F', ariaLabel: 'Set units to Fahrenheit' },
  ];

  return (
    <ToggleSelector
      label="Temperature Units"
      options={unitOptions}
      selectedValue={settings.units}
      onSelect={(unit) => updateSettings({ units: unit })}
      darkMode={settings.theme === 'dark'}
    />
  );
};

export default UnitSelector; 