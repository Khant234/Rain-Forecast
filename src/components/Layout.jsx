import React, { useContext } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { SettingsContext } from '../context/SettingsContext';
import { Settings as SettingsIcon } from 'lucide-react';

const Layout = () => {
  const { settings } = useContext(SettingsContext);
  const { theme } = settings;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      <header className={`p-4 shadow-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <nav className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Weather App</Link>
          <Link to="/settings" aria-label="Open settings">
            <SettingsIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`} />
          </Link>
        </nav>
      </header>
      
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 