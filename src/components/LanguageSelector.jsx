import React, { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import ToggleSelector from './ToggleSelector';

const LanguageSelector = () => {
  const { settings, updateSettings } = useContext(SettingsContext);

  const languageOptions = [
    { value: 'en', label: 'EN', ariaLabel: 'Set language to English' },
    { value: 'mm', label: 'MM', ariaLabel: 'Set language to Burmese' },
  ];

  return (
    <ToggleSelector
      label="Language"
      options={languageOptions}
      selectedValue={settings.language}
      onSelect={(lang) => updateSettings({ language: lang })}
      darkMode={settings.theme === 'dark'}
    />
  );
};

export default LanguageSelector; 