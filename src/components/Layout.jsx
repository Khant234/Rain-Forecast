import React, { useContext } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { SettingsContext } from '../context/SettingsContext';
import { Settings as SettingsIcon } from 'lucide-react';

const Layout = () => {
  const { settings } = useContext(SettingsContext);
  const { theme: darkMode } = settings;

  return (
    <div className={`min-h-screen ${darkMode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      <header className={`p-4 shadow-md ${darkMode === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Weather App</Link>
          <Link to="/settings">
            <SettingsIcon className={`w-6 h-6 ${darkMode === 'dark' ? 'text-white' : 'text-gray-800'}`} />
          </Link>
        </div>
      </header>
      
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 