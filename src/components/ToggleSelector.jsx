import React from 'react';

const ToggleSelector = ({
  label,
  options,
  selectedValue,
  onSelect,
  darkMode,
}) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
      <span className="font-semibold">{label}</span>
      <div className="flex rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            aria-label={option.ariaLabel}
            aria-pressed={selectedValue === option.value}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
              selectedValue === option.value ? 'bg-white dark:bg-gray-600' : ''
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToggleSelector; 