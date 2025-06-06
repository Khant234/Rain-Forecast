import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ darkMode, onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setQuery(''); // Clear input after search
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a city..."
        className={`w-full py-2 pl-10 pr-4 rounded-lg shadow-md transition-all duration-300
                    ${darkMode ? 'bg-gray-800 text-white placeholder-gray-400' : 'bg-white text-gray-800 placeholder-gray-500'}
                    focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-300' : 'focus:ring-blue-500'}`}
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>
      <button type="submit" className="absolute inset-y-0 right-0 px-4 flex items-center bg-transparent sr-only">
        Search
      </button>
    </form>
  );
};

export default SearchBar; 