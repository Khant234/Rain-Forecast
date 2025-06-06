import React, { useEffect, useState, useContext } from "react";
import {
  Sun,
  Moon,
  Wind,
  Droplets,
  ThermometerSun,
  Clock,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { SettingsContext } from '../context/SettingsContext';
import { getWeatherData, geocodeCity } from "../services/weatherService";
import SearchBar from './SearchBar';
import CurrentWeatherCard from './CurrentWeatherCard';
import HourlyTimeline from './HourlyTimeline';
import WeeklyForecast from './WeeklyForecast';

function Home() {
  const { settings, updateSettings, setCurrentLocation } = useContext(SettingsContext);
  const { theme: darkMode, language, currentLocation: location } = settings;

  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  
  const [currentWeather, setCurrentWeather] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  
  const [locationError, setLocationError] = useState(null);

  // Function to convert weather code to condition description
  const getWeatherCondition = (weatherCode) => {
    const conditions = {
      1000: "Clear", 1100: "Mostly Clear", 1101: "Partly Cloudy", 1102: "Mostly Cloudy",
      1001: "Cloudy", 2000: "Fog", 2100: "Light Fog", 4000: "Drizzle",
      4001: "Rain", 4200: "Light Rain", 4201: "Heavy Rain", 5000: "Snow",
      5001: "Flurries", 5100: "Light Snow", 5101: "Heavy Snow", 8000: "Thunderstorm"
    };
    return conditions[weatherCode] || "Unknown";
  };

  const handleSearch = async (cityName) => {
    setLoading(true);
    setLocationError(null);
    const newLocation = await geocodeCity(cityName);

    if (newLocation) {
      setCurrentLocation(newLocation);
    } else {
      setLocationError(`Could not find location: "${cityName}". Please try another search.`);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchWeather = async () => {
      if (!location) return;

      setApiLoading(true);
      setLoading(true);
      setLocationError(null);
      
      const data = await getWeatherData(location.lat, location.lon);
      
      if (data && data.timelines) {
        const { timelines } = data;
        const current = timelines.daily[0].values;
        
        setCurrentWeather({
          location: location.name,
          temperature: current.temperatureAvg,
          feelsLike: current.temperatureApparentAvg,
          condition: getWeatherCondition(current.weatherCodeMax),
          windSpeed: current.windSpeedAvg,
          humidity: current.humidityAvg,
          pressure: Math.round(current.pressureSurfaceLevelAvg),
          uvIndex: Math.round(current.uvIndexMax),
        });

        setHourlyData(timelines.hourly);
        setDailyData(timelines.daily);

      } else {
        setLocationError("Could not fetch weather data. Please try again.");
        setCurrentWeather(null);
        setHourlyData([]);
        setDailyData([]);
      }
      
      setApiLoading(false);
      setLoading(false);
    };

    fetchWeather();
  }, [location]);

  const handleRefresh = () => {
    // Creating a new object reference to re-trigger the useEffect hook
    setCurrentLocation(loc => ({ ...loc })); 
  };

  const toggleDarkMode = () => updateSettings({ theme: darkMode === 'dark' ? 'light' : 'dark' });
  const toggleLanguage = () => updateSettings({ language: language === 'mm' ? 'en' : 'mm' });

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode === 'dark' ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}>
      <div className="container mx-auto p-4 max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{language === 'mm' ? 'မိုးလေဝသ' : 'Weather'}</h1>
          <div>
            <button onClick={toggleLanguage} className="p-2 rounded-full hover:bg-gray-700">{language === 'mm' ? 'EN' : 'MM'}</button>
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-700">{darkMode === 'dark' ? <Sun /> : <Moon />}</button>
          </div>
        </div>

        <div className="mb-6">
          <SearchBar darkMode={darkMode === 'dark'} onSearch={handleSearch} />
        </div>

        {apiLoading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
          </div>
        )}
        
        {locationError && <div className="text-center p-8 text-red-500">{locationError}</div>}
        
        {!apiLoading && !locationError && (
          <div className="space-y-6">
            <CurrentWeatherCard weather={currentWeather} darkMode={darkMode === 'dark'} />
            <HourlyTimeline hourlyData={hourlyData} language={language} darkMode={darkMode === 'dark'} />
            <WeeklyForecast dailyData={dailyData} darkMode={darkMode === 'dark'} />
          </div>
        )}

        <div className="text-center mt-6">
          <button onClick={handleRefresh} disabled={apiLoading} className={`p-2 rounded-full ${apiLoading ? 'animate-spin' : ''}`}>
            <RefreshCw />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
