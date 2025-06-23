import React from 'react';

const ToggleSelector = ({ label, options, selectedValue, onSelect, darkMode }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
      <span className="font-semibold">{label}</span>
      <div className="flex rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
        {options && options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            aria-label={option.ariaLabel}
            aria-pressed={selectedValue === option.value}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectedValue === option.value
                ? 'bg-blue-500 text-white dark:bg-blue-600 dark:text-gray-100' // Selected state
                : 'hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300' // Unselected state
              }`}
          >
            {option.label}
          </button>
        ))}
        {!options && <div>No Options</div>}
      </div>
    </div>
  );
};

export default ToggleSelector;