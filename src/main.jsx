import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home'; // Assuming Home.jsx is the main page component
import Settings from './pages/Settings';
import { SettingsProvider } from './context/SettingsContext';
import './index.css';

// A placeholder for the dynamic location page
const LocationDetails = () => <div>Location Details Page</div>;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="location/:city" element={<LocationDetails />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  </React.StrictMode>
);
