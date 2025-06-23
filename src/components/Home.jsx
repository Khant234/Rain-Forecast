import React, { useEffect, useState, useContext, useCallback } from "react";
import { Sun, Moon, Wind, Droplets, ThermometerSun, Clock, RefreshCw, MapPin, Bell, BellOff } from "lucide-react";
import { SettingsContext } from "../context/SettingsContext";
import {
  getWeatherData,
  geocodeCity,
  requestGPSLocation,
  requestGPSLocationFallback,
  checkGPSAvailability,
  getStoredGPSLocation,
  getStoredGPSWeather,
  clearStoredGPSData,
  useMockGPS,
  initializePersistentStorage,
  storeLocationWithPersistence,
  getStoredLocationWithPersistence
} from "../services/weatherService";
import useRainAlerts from "../hooks/useRainAlerts";
import NotificationSettings from "./NotificationSettings";
import { rainNotificationService } from "../services/notificationService";
import SearchBar from "./SearchBar";
import CurrentWeatherCard from "./CurrentWeatherCard";
import HourlyTimeline from "./HourlyTimeline";
import WeeklyForecast from "./WeeklyForecast";
import RainCountdown from "./RainCountdown";

function Home() {
  const { settings, updateSettings, setCurrentLocation } = useContext(SettingsContext);
  const { theme: darkMode, language, currentLocation: location } = settings;

  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);

  const [currentWeather, setCurrentWeather] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);

  const [locationError, setLocationError] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [usingGPS, setUsingGPS] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("default");

  // Initialize rain alerts hook
  const rainAlerts = useRainAlerts(hourlyData, location, language);

  // Check notification permission status
  useEffect(() => {
    const checkNotificationStatus = async () => {
      const status = await rainNotificationService.checkPermissionStatus();
      setNotificationStatus(status);
    };
    checkNotificationStatus();
  }, []);

  // Function to convert weather code to condition description
  const getWeatherCondition = (weatherCode) => {
    const conditions = {
      1000: "Clear",
      1100: "Mostly Clear",
      1101: "Partly Cloudy",
      1102: "Mostly Cloudy",
      1001: "Cloudy",
      2000: "Fog",
      2100: "Light Fog",
      4000: "Drizzle",
      4001: "Rain",
      4200: "Light Rain",
      4201: "Heavy Rain",
      5000: "Snow",
      5001: "Flurries",
      5100: "Light Snow",
      5101: "Heavy Snow",
      8000: "Thunderstorm"
    };
    return conditions[weatherCode] || "Unknown";
  };

  const handleSearch = async (cityName) => {
    setLoading(true);
    setLocationError(null);
    setWeatherError(null);
    setUsingGPS(false); // Switch off GPS mode when searching

    try {
      const newLocation = await geocodeCity(cityName);

      if (newLocation) {
        setCurrentLocation(newLocation);
      } else {
        setLocationError(`Could not find location: \"${cityName}\". Please try another search.`);
        setLoading(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setLocationError(`Search failed: ${error.message}`);
      setLoading(false);
    }
  };

  const handleGPSRequest = async () => {
    setGpsLoading(true);
    setLocationError(null);
    setWeatherError(null);

    try {
      // Try primary GPS method first
      const gpsLocation = await requestGPSLocation();
      setCurrentLocation(gpsLocation);
      setUsingGPS(true);
      console.log("GPS location set:", gpsLocation);
    } catch (error) {
      console.error("Primary GPS failed:", error);

      // Try fallback method with relaxed settings
      try {
        console.log("Trying fallback GPS method...");
        const fallbackLocation = await requestGPSLocationFallback();
        setCurrentLocation(fallbackLocation);
        setUsingGPS(true);
        console.log("Fallback GPS location set:", fallbackLocation);
      } catch (fallbackError) {
        console.error("Fallback GPS also failed:", fallbackError);

        // Show error with option to use mock GPS
        setLocationError(`GPS location failed: ${fallbackError.message}\n\nThis might be due to:\n• Location services disabled\n• Poor GPS signal\n• Browser security restrictions\n\nYou can:\n• Enable location services and try again\n• Use the search function to find your city\n• Use mock GPS for testing (Yangon location)`);
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const handleMockGPS = async () => {
    setGpsLoading(true);
    setLocationError(null);
    setWeatherError(null);

    try {
      const mockLocation = await useMockGPS("Yangon");
      setCurrentLocation(mockLocation);
      setUsingGPS(true);
      console.log("Mock GPS location set:", mockLocation);
    } catch (error) {
      console.error("Mock GPS failed:", error);
      setLocationError(`Mock GPS failed: ${error.message}`);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleClearGPSData = () => {
    clearStoredGPSData();
    setUsingGPS(false);
    setLocationError(null);
    setWeatherError(null);
    // Reset to default location or prompt for new location
    setCurrentLocation(null);
  };

  const handleGPSDebug = async () => {
    try {
      const gpsStatus = await checkGPSAvailability();
      const debugInfo = `GPS Debug Info:\n• Available: ${gpsStatus.available}\n• Permission: ${gpsStatus.permission || "unknown"}\n• Reason: ${gpsStatus.reason || "none"}\n• Protocol: ${window.location.protocol}\n• Hostname: ${window.location.hostname}\n• Browser: ${navigator.userAgent.split(" ")[0]}`;

      console.log(debugInfo);
      alert(debugInfo);
    } catch (error) {
      console.error("GPS debug error:", error);
      alert(`GPS Debug Error: ${error.message}`);
    }
  };

  // Check for stored GPS data on component mount
  useEffect(() => {
    // Initialize persistent storage system
    initializePersistentStorage();

    // Check for stored location using new persistent storage first
    const storedLocation = getStoredLocationWithPersistence() || getStoredGPSLocation();
    if (storedLocation && !location) {
      console.log("Found stored location, using it...");
      setCurrentLocation(storedLocation);
      setUsingGPS(true);

      // Check if we have stored weather data for this GPS location
      const storedWeather = getStoredGPSWeather();
      if (storedWeather) {
        console.log("Found stored GPS weather data, using it...");
        // Process stored weather data similar to fresh data
        if (storedWeather && storedWeather.timelines && Array.isArray(storedWeather.timelines)) {
          const { timelines } = storedWeather;

          const dailyTimeline = timelines.find((t) => t.timestep === "1d");
          const hourlyTimeline = timelines.find((t) => t.timestep === "1h");

          if (dailyTimeline && dailyTimeline.intervals && dailyTimeline.intervals.length > 0) {
            const current = dailyTimeline.intervals[0].values;

            setCurrentWeather({
              location: storedLocation.name,
              temperature: current.temperature || current.temperatureAvg,
              feelsLike: current.temperatureApparent || current.temperatureApparentAvg,
              condition: getWeatherCondition(current.weatherCode || current.weatherCodeMax),
              windSpeed: current.windSpeed || current.windSpeedAvg,
              humidity: current.humidity || current.humidityAvg,
              pressure: Math.round(current.pressureSurfaceLevel || current.pressureSurfaceLevelAvg || 1013),
              uvIndex: Math.round(current.uvIndex || current.uvIndexMax || 0)
            });
          }

          setHourlyData(hourlyTimeline ? hourlyTimeline.intervals : []);
          setDailyData(dailyTimeline ? dailyTimeline.intervals : []);
          setLoading(false);
        }
      }
    }
  }, []); // Run only once on mount

  const fetchWeather = useCallback(async (loc) => {
    if (!loc) return;

    setApiLoading(true);
    setLoading(true);
    setLocationError(null);
    setWeatherError(null);

    try {
      const data = await getWeatherData(loc.lat, loc.lon);

      if (data && data.timelines && Array.isArray(data.timelines)) {
        const { timelines } = data;

        // Find daily and hourly timelines
        const dailyTimeline = timelines.find((t) => t.timestep === "1d");
        const hourlyTimeline = timelines.find((t) => t.timestep === "1h");

        if (dailyTimeline && dailyTimeline.intervals && dailyTimeline.intervals.length > 0) {
          const current = dailyTimeline.intervals[0].values;

          setCurrentWeather({
            location: loc.name,
            temperature: current.temperature || current.temperatureAvg,
            feelsLike: current.temperatureApparent || current.temperatureApparentAvg,
            condition: getWeatherCondition(current.weatherCode || current.weatherCodeMax),
            windSpeed: current.windSpeed || current.windSpeedAvg,
            humidity: current.humidity || current.humidityAvg,
            pressure: current.pressureSurfaceLevel !== undefined ? Math.round(current.pressureSurfaceLevel) : current.pressureSurfaceLevelAvg !== undefined ? Math.round(current.pressureSurfaceLevelAvg) : 1013,
            uvIndex: Math.round(current.uvIndex || current.uvIndexMax || 0)
          });
        }

        setHourlyData(hourlyTimeline ? hourlyTimeline.intervals : []);
        setDailyData(dailyTimeline ? dailyTimeline.intervals : []);
      } else {
        setWeatherError("Could not fetch weather data. Please try again.");
        setCurrentWeather(null);
        setHourlyData([]);
        setDailyData([]);
      }

      setApiLoading(false);
      setLoading(false);
    } catch (error) {
      console.error("Weather fetch error:", error);
      setWeatherError(`Weather service error: ${error.message}`);
      setCurrentWeather(null);
      setHourlyData([]);
      setDailyData([]);
      setApiLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!location) return;

    fetchWeather(location);
  }, [location, fetchWeather]);

  const handleRefresh = () => {
    setWeatherError(null);
    setLocationError(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const toggleDarkMode = () => updateSettings({ theme: darkMode === "dark" ? "light" : "dark" });
  const toggleLanguage = () => updateSettings({ language: language === "mm" ? "en" : "mm" });

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${darkMode === "dark" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}
    >
      <div className="container mx-auto p-4 max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            {language === "mm" ? "မိုးလေဝသ" : "Weather"}
          </h1>
          <div className="flex items-center">
            {/* Notification Status Indicator */}
            <button
              onClick={() => setShowNotificationSettings(true)}
              className={`p-2 rounded-full hover:bg-gray-700 relative ${notificationStatus === "granted" ? "text-green-500" : notificationStatus === "denied" ? "text-red-500" : "text-gray-500"}`}
              title={language === "mm" ? "မိုးရွာမည့် အကြောင်းကြားချက်" : "Rain Notifications"}
            >
              {notificationStatus === "granted" ? <Bell /> : <BellOff />}
              {rainNotificationService.getSettings().enabled && notificationStatus === "granted" && <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>}
            </button>

            <button onClick={toggleLanguage} className="p-2 rounded-full hover:bg-gray-700">
              {language === "mm" ? "EN" : "MM"}
            </button>
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-700">
              {darkMode === "dark" ? <Sun /> : <Moon />}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <SearchBar darkMode={darkMode === "dark"} onSearch={handleSearch} />
        </div>

        {/* GPS Controls */}
        <div className="mb-6 flex gap-2 justify-center flex-wrap">
          <button
            onClick={handleGPSRequest}
            disabled={gpsLoading || apiLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${usingGPS ? "bg-green-600 text-white" : darkMode === "dark" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <MapPin size={16} />
            {gpsLoading ? "Getting Location..." : usingGPS ? "Using GPS Location" : "Use My Location"}
          </button>

          {usingGPS && (
            <button
              onClick={handleClearGPSData}
              className={`px-3 py-2 rounded-lg transition-colors ${darkMode === "dark" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
              title="Clear GPS data and choose new location"
            >
              ✕
            </button>
          )}

          {/* Debug and Mock GPS buttons - for troubleshooting */}
          <button
            onClick={handleGPSDebug}
            className={`px-3 py-2 rounded-lg transition-colors text-xs ${darkMode === "dark" ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-400 hover:bg-gray-500 text-white"}`}
            title="Debug GPS status"
          >
            🔍 Debug
          </button>

          <button
            onClick={handleMockGPS}
            disabled={gpsLoading}
            className={`px-3 py-2 rounded-lg transition-colors text-xs ${darkMode === "dark" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"} disabled:opacity-50`}
            title="Use mock GPS (Yangon) for testing"
          >
            🎭 Mock
          </button>
        </div>

        {apiLoading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
          </div>
        )}

        {locationError && (
          <div className="text-center p-8">
            <div className="text-red-500 mb-4 whitespace-pre-line">
              {locationError}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => setLocationError(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleGPSRequest}
                disabled={gpsLoading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {gpsLoading ? "Getting GPS..." : "Retry GPS"}
              </button>
              <button
                onClick={handleMockGPS}
                disabled={gpsLoading}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-50"
                title="Use mock GPS location (Yangon) for testing"
              >
                🎭 Mock GPS
              </button>
            </div>
          </div>
        )}

        {weatherError && (
          <div className="text-center p-8">
            <div className="text-red-500 mb-4">{weatherError}</div>
            <button
              onClick={handleRefresh}
              disabled={apiLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {apiLoading ? "Retrying..." : "Retry"}
            </button>
          </div>
        )}

        {!apiLoading && !locationError && !weatherError && (
          <div className="space-y-6">
            {/* GPS Status Indicator */}
            {usingGPS && currentWeather && (
              <div
                className={`text-center p-2 rounded-lg text-sm ${darkMode === "dark" ? "bg-green-800 text-green-200" : "bg-green-100 text-green-800"}`}
              >
                📍 Using your current location • Data auto-refreshes every 30 minutes
              </div>
            )}

            <CurrentWeatherCard weather={currentWeather} darkMode={darkMode === "dark"} />
            <RainCountdown weatherData={hourlyData} language={language} darkMode={darkMode === "dark"} />
            <HourlyTimeline hourlyData={hourlyData} language={language} darkMode={darkMode === "dark"} />
            <WeeklyForecast dailyData={dailyData} darkMode={darkMode === "dark"} />
          </div>
        )}

        <div className="text-center mt-6">
          <button onClick={handleRefresh} disabled={apiLoading} className={`p-2 rounded-full ${apiLoading ? "animate-spin" : ""}`}>
            <RefreshCw />
          </button>
        </div>
      </div>

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <NotificationSettings
          language={language}
          darkMode={darkMode === "dark"}
          onClose={() => {
            setShowNotificationSettings(false);
            // Refresh notification status after settings change
            rainNotificationService.checkPermissionStatus().then((status) => {
              setNotificationStatus(status);
            });
          }}
        />
      )}
    </div>
  );
}

export default Home;
