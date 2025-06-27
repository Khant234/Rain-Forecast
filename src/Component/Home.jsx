import React, { useEffect, useState } from "react";
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
import {
  getWeatherData,
  initializePersistentStorage,
  storeLocationWithPersistence,
  getStoredLocationWithPersistence,
} from "../services/weatherService";
import HourlyTimeline from "./HourlyTimeline"; // Assuming this is already created
import {
  formatRainChance,
  getRainChanceExplanation,
  getRainChanceColorClass,
  getRainChanceIcon,
} from "../utils/rainChanceFormatter";

function Home() {
  const [loading, setLoading] = useState(true);

  // Initialize persistent storage and request notification permission on first load
  useEffect(() => {
    // Initialize persistent storage system
    initializePersistentStorage();

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);
  const [apiLoading, setApiLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("mm");
  const [weatherData, setWeatherData] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nextRainTime, setNextRainTime] = useState(null);
  const [rainCountdown, setRainCountdown] = useState("");

  // Send notification if rain is predicted soon
  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      rainCountdown &&
      (rainCountdown === "Raining now" ||
        rainCountdown === "မိုးရွာနေပါပြီ" ||
        rainCountdown.includes(":"))
    ) {
      new Notification("Rain Alert", {
        body:
          language === "mm"
            ? "မိုးရွာမည်ဖြစ်သည်။ ထီးယူသွားပါ။"
            : "Rain is expected soon in your area!",
        icon: "/icon.png",
      });
    }
  }, [rainCountdown, language]);

  // Function to convert weather code to emoji
  const getWeatherEmoji = (condition) => {
    switch (condition) {
      case "Clear":
        return "☀️";
      case "Mostly Clear":
        return "🌤️";
      case "Partly Cloudy":
        return "⛅";
      case "Mostly Cloudy":
        return "🌥️";
      case "Cloudy":
        return "☁️";
      case "Fog":
      case "Light Fog":
        return "🌫️";
      case "Drizzle":
        return "🌦️";
      case "Rain":
      case "Light Rain":
        return "🌧️";
      case "Heavy Rain":
        return "⛈️";
      case "Snow":
      case "Flurries":
      case "Light Snow":
      case "Heavy Snow":
        return "❄️";
      case "Thunderstorm":
        return "⛈️";
      default:
        return "🌡️";
    }
  };

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
      6000: "Freezing Drizzle",
      6001: "Freezing Rain",
      6200: "Light Freezing Rain",
      6201: "Heavy Freezing Rain",
      7000: "Ice Pellets",
      7101: "Heavy Ice Pellets",
      7102: "Light Ice Pellets",
      8000: "Thunderstorm",
    };
    return conditions[weatherCode] || "Unknown";
  };

  // Load stored location using persistent storage
  const loadStoredLocation = () => {
    try {
      // Try new persistent storage first
      const persistentLocation = getStoredLocationWithPersistence();
      if (persistentLocation && persistentLocation.isFresh) {
        return persistentLocation;
      }

      // Fall back to legacy localStorage
      const stored = localStorage.getItem("weatherAppLocation");
      if (stored) {
        const parsed = JSON.parse(stored);
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (parsed.timestamp && parsed.timestamp > oneHourAgo) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error loading stored location:", error);
    }
    return null;
  };

  // Store GPS location using persistent storage
  const storeLocation = (lat, lon, cityName) => {
    try {
      const locationData = {
        lat,
        lon,
        cityName,
        name: cityName,
        timestamp: Date.now(),
      };

      // Store using new persistent storage system
      const success = storeLocationWithPersistence(locationData);

      // Also store in legacy format for backward compatibility
      localStorage.setItem("weatherAppLocation", JSON.stringify(locationData));

      if (success) {
        // console.log("📍 Location stored successfully:", cityName);
      }
    } catch (error) {
      console.error("Error storing location:", error);
    }
  };

  // Function to get city name from coordinates
  const getCityFromCoordinates = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      return (
        data.city ||
        data.locality ||
        data.principalSubdivision ||
        data.countryName ||
        "Unknown Location"
      );
    } catch {
      return `Location: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }
  };

  // Request GPS location
  useEffect(() => {
    const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
    const fetchWeatherForLocation = async (latitude, longitude, cityName) => {
      setApiLoading(true);
      try {
        const weatherResponse = await getWeatherData(latitude, longitude);
        if (weatherResponse?.hourlyData?.data?.timelines?.[0]?.intervals) {
          const intervals =
            weatherResponse.hourlyData.data.timelines[0].intervals;
          const currentInterval = intervals[0];
          let nextRainInterval = null;
          for (const interval of intervals) {
            if (
              interval.values.precipitationProbability > 60 ||
              (interval.values.precipitationType > 0 &&
                interval.values.precipitationProbability > 50)
            ) {
              nextRainInterval = interval;
              break;
            }
          }
          let nextRainTimeToStore = null;
          if (nextRainInterval) {
            setNextRainTime(new Date(nextRainInterval.startTime));
            nextRainTimeToStore = nextRainInterval.startTime;
          } else {
            setNextRainTime(null);
            nextRainTimeToStore = null;
          }
          const weatherObj = {
            temperature: Math.round(currentInterval.values.temperature || 0),
            humidity: Math.round(currentInterval.values.humidity || 0),
            windSpeed: Math.round(currentInterval.values.windSpeed || 0),
            rainChance: Math.round(
              currentInterval.values.precipitationProbability || 0
            ),
            condition: getWeatherCondition(currentInterval.values.weatherCode),
            location: cityName,
            coordinates: { lat: latitude, lon: longitude },
            precipitationType: currentInterval.values.precipitationType || 0,
            precipitationIntensity:
              currentInterval.values.precipitationIntensity || 0,
          };
          setWeatherData(weatherObj);
          try {
            localStorage.setItem(
              "lastWeatherData",
              JSON.stringify({
                data: weatherObj,
                intervals,
                timestamp: Date.now(),
              })
            );
          } catch (e) {}
        }
      } catch (error) {
        try {
          const cached = localStorage.getItem("lastWeatherData");
          if (cached) {
            const { data, intervals, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
              setWeatherData(data);
              let nextRain = null;
              if (intervals && Array.isArray(intervals)) {
                const now = new Date();
                for (const interval of intervals) {
                  if (
                    (interval.values.precipitationProbability > 60 ||
                      (interval.values.precipitationType > 0 &&
                        interval.values.precipitationProbability > 50)) &&
                    new Date(interval.startTime) > now
                  ) {
                    nextRain = new Date(interval.startTime);
                    break;
                  }
                }
              }
              setNextRainTime(nextRain);
              setLoading(false);
              setApiLoading(false);
              return;
            }
          }
          setWeatherData({
            temperature: 28,
            humidity: 75,
            windSpeed: 12,
            rainChance: 40,
            condition: "Partly Cloudy",
            location: cityName,
            coordinates: { lat: latitude, lon: longitude },
          });
        } catch (e) {
          setWeatherData({
            temperature: 28,
            humidity: 75,
            windSpeed: 12,
            rainChance: 40,
            condition: "Partly Cloudy",
            location: cityName,
            coordinates: { lat: latitude, lon: longitude },
          });
        }
      }
      setLoading(false);
      setApiLoading(false);
    };
    const storedLocation = loadStoredLocation();
    if (storedLocation) {
      setLocation({
        lat: storedLocation.lat,
        lon: storedLocation.lon,
        cityName: storedLocation.cityName,
      });
      setLoading(false);
      try {
        const cached = localStorage.getItem("lastWeatherData");
        if (cached) {
          const { data, intervals, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setWeatherData(data);
            let nextRain = null;
            if (intervals && Array.isArray(intervals)) {
              const now = new Date();
              for (const interval of intervals) {
                if (
                  (interval.values.precipitationProbability > 60 ||
                    (interval.values.precipitationType > 0 &&
                      interval.values.precipitationProbability > 50)) &&
                  new Date(interval.startTime) > now
                ) {
                  nextRain = new Date(interval.startTime);
                  break;
                }
              }
            }
            setNextRainTime(nextRain);
            return;
          }
        }
      } catch (e) {}
      fetchWeatherForLocation(
        storedLocation.lat,
        storedLocation.lon,
        storedLocation.cityName
      );
    }
    if (navigator.geolocation) {
      if (!storedLocation) {
        setLoading(true);
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const cityName = await getCityFromCoordinates(latitude, longitude);
          setLocation({ lat: latitude, lon: longitude, cityName });
          setLocationError(null);
          storeLocation(latitude, longitude, cityName);
          if (!storedLocation) {
            await fetchWeatherForLocation(latitude, longitude, cityName);
          } else {
            fetchWeatherForLocation(latitude, longitude, cityName);
          }
        },
        (error) => {
          setLocationError(
            language === "mm"
              ? "တည်နေရာ ရယူ၍မရပါ။ GPS ဖွင့်ထားကြောင်း သေချာပါစေ။"
              : "Unable to get location. Please ensure GPS is enabled."
          );
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError(
        language === "mm"
          ? "သင့်ဘရောင်ဇာသည် တည်နေရာ ဝန်ဆောင်မှုကို မပံ့ပိုးပါ။"
          : "Your browser doesn't support geolocation."
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      if (nextRainTime) {
        const timeDiff = nextRainTime - now;
        if (timeDiff > 0) {
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor(
            (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
          if (hours > 24) {
            const days = Math.floor(hours / 24);
            setRainCountdown(
              language === "mm" ? `${days} ရက်အတွင်း` : `In ${days} days`
            );
          } else {
            setRainCountdown(
              `${hours.toString().padStart(2, "0")}:${minutes
                .toString()
                .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            );
          }
        } else {
          setRainCountdown(
            language === "mm" ? "မိုးရွာနေပါပြီ" : "Raining now"
          );
        }
      } else if (weatherData) {
        setRainCountdown(language === "mm" ? "မိုးမရွာပါ" : "No rain");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [nextRainTime, language]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleLanguage = () => setLanguage(language === "mm" ? "en" : "mm");

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br from-blue-50 via-white to-blue-50"
      }`}
    >
      <div className="container mx-auto px-2 py-4 sm:py-6 md:py-8 max-w-md">
        <div
          className={`rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 mb-6 transition-all ${
            darkMode
              ? "bg-gray-800/70 backdrop-blur"
              : "bg-white/95 backdrop-blur"
          }`}
        >
          {/* Floating toggles */}
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-all ${
                darkMode
                  ? "bg-gray-700 text-yellow-400 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } shadow-sm`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={toggleLanguage}
              className={`px-3 py-1 rounded-full font-medium text-xs transition-all ${
                darkMode
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } shadow-sm`}
            >
              {language === "mm" ? "EN" : "MM"}
            </button>
          </div>
          {/* City Name and Condition */}
          {weatherData?.location && (
            <div className="flex flex-col items-center mb-2">
              <div
                className={`text-base font-semibold ${
                  darkMode ? "text-gray-200" : "text-gray-700"
                }`}
              >
                {weatherData.location}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">
                  {getWeatherEmoji(weatherData.condition)}
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {weatherData.condition}
                </span>
              </div>
            </div>
          )}
          {/* Large Temperature */}
          <div className="flex flex-col items-center my-6">
            <div
              className={`text-6xl sm:text-7xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {weatherData?.temperature ?? "--"}°
            </div>
          </div>
          {/* Rain Countdown and Probability */}
          <div className="flex flex-col items-center mb-6">
            <div
              className={`text-xs mb-1 ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {language === "mm" ? "မိုးရွာမည့်အချိန်" : "Next Rain In"}
            </div>
            <div
              className={`text-2xl font-mono font-bold mb-1 ${
                darkMode ? "text-blue-200" : "text-blue-700"
              }`}
            >
              {rainCountdown ||
                (weatherData
                  ? language === "mm"
                    ? "မိုးမရွာပါ (နောက် ၂၄ နာရီအတွင်း)"
                    : "No rain in the next 24 hours"
                  : "--:--:--")}
            </div>
            <div
              className={`text-xs ${getRainChanceColorClass(
                weatherData?.rainChance,
                darkMode
              )}`}
            >
              {weatherData?.rainChance !== null &&
              weatherData?.rainChance !== undefined
                ? formatRainChance(
                    weatherData.rainChance,
                    language,
                    true,
                    "full"
                  )
                : ""}
            </div>
            {weatherData?.rainChance !== null &&
              weatherData?.rainChance !== undefined && (
                <div
                  className={`text-xs mt-1 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {getRainChanceExplanation(weatherData.rainChance, language)}
                </div>
              )}
          </div>
          {/* Weather Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className={`flex flex-col items-center p-2 rounded-xl ${
                darkMode ? "bg-gray-700/40" : "bg-gray-50"
              }`}
            >
              <ThermometerSun className="mb-1 text-orange-500" size={18} />
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "mm" ? "အပူချိန်" : "Temp"}
              </div>
              <div
                className={`text-base font-semibold ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {weatherData?.temperature}°C
              </div>
            </div>
            <div
              className={`flex flex-col items-center p-2 rounded-xl ${
                darkMode ? "bg-gray-700/40" : "bg-gray-50"
              }`}
            >
              <Droplets className="mb-1 text-blue-500" size={18} />
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "mm" ? "စိုထိုင်းဆ" : "Humidity"}
              </div>
              <div
                className={`text-base font-semibold ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {weatherData?.humidity}%
              </div>
            </div>
            <div
              className={`flex flex-col items-center p-2 rounded-xl ${
                darkMode ? "bg-gray-700/40" : "bg-gray-50"
              }`}
            >
              <Wind className="mb-1 text-blue-500" size={18} />
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "mm" ? "လေ" : "Wind"}
              </div>
              <div
                className={`text-base font-semibold ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {weatherData?.windSpeed} km/h
              </div>
            </div>
            <div
              className={`flex flex-col items-center p-2 rounded-xl ${
                darkMode ? "bg-gray-700/40" : "bg-gray-50"
              }`}
            >
              <Droplets className="mb-1 text-cyan-500" size={18} />
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "mm" ? "မိုးရွာနိုင်ခြေ" : "Rain Chance"}
              </div>
              <div
                className={`text-sm font-semibold text-center ${getRainChanceColorClass(
                  weatherData?.rainChance,
                  darkMode
                )}`}
              >
                {weatherData?.rainChance !== null &&
                weatherData?.rainChance !== undefined
                  ? formatRainChance(
                      weatherData.rainChance,
                      language,
                      false,
                      "short"
                    )
                  : "--"}
              </div>
              <div
                className={`text-xs text-center ${
                  darkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                {weatherData?.rainChance !== null &&
                weatherData?.rainChance !== undefined
                  ? `${weatherData.rainChance}%`
                  : ""}
              </div>
            </div>
          </div>
        </div>
        <div
          className={`text-center text-xs sm:text-sm md:text-base ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {language === "mm"
            ? "မြန်မာနိုင်ငံ မိုးလေဝသ အချက်အလက်"
            : "Myanmar Weather Information"}
        </div>
      </div>
    </div>
  );
}

export default Home;
