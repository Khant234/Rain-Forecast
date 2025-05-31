import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Sun,
  Moon,
  Wind,
  Droplets,
  ThermometerSun,
  RefreshCw,
  Bell,
} from "lucide-react";
import Lottie from "lottie-react";
import "./Home.css";

function Home() {
  const TOMORROW_API_KEY = "FRhDRE45xUZhgyWLA1Zjwy5xkgQWlS7y";
  const TOMORROW_API_URL = "https://api.tomorrow.io/v4/timelines";
  const METEOSOURCE_API_KEY = "3e1rsx9rssl4153ga0048xs9yscowakqoqpg2ojz"; // Replace with your API key
  const METEOSOURCE_API_URL = "https://www.meteosource.com/api/v1/free";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const RATE_LIMIT_DURATION = 60 * 1000; // 1 minute

  const [forecastMessage, setForecastMessage] = useState("နေရာယူနေပါသည်...");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [myanmarTime, setMyanmarTime] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("mm"); // "mm" = Burmese (default), "en" = English
  const [weatherDetails, setWeatherDetails] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [coordinates, setCoordinates] = useState(() => {
    const saved = localStorage.getItem("weatherAppCoordinates");
    return saved ? JSON.parse(saved) : null;
  });
  const [lastWeatherState, setLastWeatherState] = useState(null);
  const [animationData, setAnimationData] = useState(null);
  const animationCache = useRef({});

  // Add new state for rate limiting
  const [lastApiCall, setLastApiCall] = useState(() => {
    const saved = localStorage.getItem("lastApiCall");
    return saved ? parseInt(saved) : 0;
  });

  // Add notification permission state
  const [notificationPermission, setNotificationPermission] =
    useState("default");

  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      setShowNotifications(Notification.permission === "granted");
    }
  }, []);

  // Add weather condition translations
  const weatherConditions = {
    // OpenWeather conditions
    "clear sky": {
      mm: "ကောင်းကင်ကြည်လင်သည်",
      icon: "☀️",
    },
    "few clouds": {
      mm: "တိမ်အနည်းငယ်ရှိသည်",
      icon: "🌤️",
    },
    "scattered clouds": {
      mm: "တိမ်တိုက်များ ကွဲပြားနေသည်",
      icon: "⛅",
    },
    "broken clouds": {
      mm: "တိမ်တိုက်များ ပြန့်ကျဲနေသည်",
      icon: "☁️",
    },
    "overcast clouds": {
      mm: "တိမ်ထူထပ်နေသည်",
      icon: "☁️",
    },
    "light rain": {
      mm: "မိုးဖွဲများရွာသွန်းနေသည်",
      icon: "🌧️",
    },
    "moderate rain": {
      mm: "မိုးအသင့်အတင့်ရွာသွန်းနေသည်",
      icon: "🌧️",
    },
    "heavy rain": {
      mm: "မိုးသည်းထန်စွာရွာသွန်းနေသည်",
      icon: "⛈️",
    },
    thunderstorm: {
      mm: "မိုးသက်မုန်တိုင်းများရှိသည်",
      icon: "⛈️",
    },
    mist: {
      mm: "မြူများထူထပ်နေသည်",
      icon: "🌫️",
    },
    haze: {
      mm: "မြူမှုန်များရှိသည်",
      icon: "🌫️",
    },
  };

  const getWeatherDescription = (condition) => {
    const lowerCondition = condition.toLowerCase();
    // Try to find exact match
    const exactMatch = weatherConditions[lowerCondition];
    if (exactMatch) {
      return {
        description: language === "mm" ? exactMatch.mm : condition,
        icon: exactMatch.icon,
      };
    }

    // If no exact match, try to find partial match
    for (const [key, value] of Object.entries(weatherConditions)) {
      if (lowerCondition.includes(key)) {
        return {
          description: language === "mm" ? value.mm : condition,
          icon: value.icon,
        };
      }
    }

    // Default return if no match found
    return {
      description: condition,
      icon: "🌤️",
    };
  };

  useEffect(() => {
    // Check if API key is configured
    if (!TOMORROW_API_KEY || TOMORROW_API_KEY.trim() === "") {
      setErrorMessage(
        "API key not configured. Please add your Tomorrow.io API key."
      );
      setLoading(false);
      return;
    }

    // If we have stored coordinates, use them immediately
    if (coordinates) {
      success(coordinates);
    } else {
      getForecast();
    }
  }, [language]); // Re-fetch forecast on language change

  useEffect(() => {
    const updateTime = () => {
      const nowMyanmar = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Yangon",
      });
      const formattedTime = new Date(nowMyanmar).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setMyanmarTime(formattedTime);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const error = () => {
    setForecastMessage(
      language === "mm"
        ? "⚠️ GPS ခွင့်မရှိပါ။"
        : "⚠️ Permission denied for GPS."
    );
    setLoading(false);

    // If we have stored coordinates, use them as fallback
    if (coordinates) {
      success(coordinates);
    }
  };

  const getForecast = () => {
    if (!navigator.geolocation) {
      setForecastMessage(
        language === "mm"
          ? "❌ ဂျီအိုလိုကေးရှင်း မပံ့ပိုးပါ။"
          : "❌ Geolocation is not supported."
      );
      setLoading(false);
      return;
    }

    // If we have stored coordinates, use them directly
    if (coordinates) {
      setForecastMessage(
        language === "mm"
          ? "📍 မိုးလေဝသ ခန့်မှန်းနေပါသည်..."
          : "📍 Getting weather data..."
      );
      success(coordinates);
      return;
    }

    // If no stored coordinates, request new location
    setForecastMessage(
      language === "mm" ? "📍 နေရာယူနေပါသည်..." : "📍 Getting your location..."
    );
    navigator.geolocation.getCurrentPosition(success, error);
  };

  const convertToMyanmarTime = (utcSeconds) => {
    const utcDate = new Date(utcSeconds * 1000);
    return new Date(
      utcDate.toLocaleString("en-US", { timeZone: "Asia/Yangon" })
    );
  };

  const formatSingleForecast = (item, lang = "mm") => {
    const myanmarDate = convertToMyanmarTime(item.dt);
    const startTime = new Date(myanmarDate.getTime() - 90 * 60000);
    const endTime = new Date(myanmarDate.getTime() + 30 * 60000);

    const start = startTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const end = endTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const desc = item.weather[0].description;
    const capitalDesc = desc.charAt(0).toUpperCase() + desc.slice(1);

    if (lang === "mm") {
      return (
        `🌧️ မိုးရွာနိုင်ပါသည်\n` +
        `🕒 အချိန်: ${start} – ${end} (မြန်မာစံတော်ချိန်)\n` +
        `🌂 အခြေအနေ: ${capitalDesc}\n\n` +
        `💡 အကြံပြုချက်များ:\n` +
        `• ထီးယူသင့်သည် ☔\n` +
        `• ပြင်ပခရီးစဉ်ရှောင်ပါ 🚫🏞️\n` +
        `• ရေစိုခံဖိနပ်ဝတ်ပါ 👟`
      );
    }

    // English fallback
    return (
      `🌧️ Rain expected\n` +
      `🕒 Time: ${start} – ${end} (MMT)\n` +
      `🌂 Condition: ${capitalDesc}\n\n` +
      `💡 Tips:\n` +
      `• Carry an umbrella ☔\n` +
      `• Avoid outdoor plans 🚫🏞️\n` +
      `• Wear waterproof shoes 👟`
    );
  };

  // Function to check if we can make an API call
  const canMakeApiCall = () => {
    const now = Date.now();
    return now - lastApiCall >= RATE_LIMIT_DURATION;
  };

  // Function to update last API call time
  const updateLastApiCall = () => {
    const now = Date.now();
    setLastApiCall(now);
    localStorage.setItem("lastApiCall", now.toString());
  };

  const fetchTomorrowData = async (lat, lon) => {
    try {
      // Check rate limiting
      if (!canMakeApiCall()) {
        const waitTime = Math.ceil(
          (RATE_LIMIT_DURATION - (Date.now() - lastApiCall)) / 1000
        );
        throw new Error(
          language === "mm"
            ? `API ကန့်သတ်ချက်ကြောင့် ${waitTime} စက္ကန့်စောင့်ဆိုင်းပေးပါ။`
            : `Please wait ${waitTime} seconds due to API rate limit.`
        );
      }

      // Check cache first
      const cachedData = getCachedWeather();
      if (cachedData) {
        console.log("Using cached weather data");
        return cachedData;
      }

      console.log("Starting Tomorrow.io API call with coordinates:", {
        lat,
        lon,
      });

      const fields = [
        "precipitationProbability",
        "precipitationType",
        "temperature",
        "weatherCode",
        "humidity",
        "windSpeed",
        "temperatureApparent",
        "visibility",
      ];
      const timesteps = ["30m"];
      const now = new Date();
      const startTime = now.toISOString();
      const endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

      const params = new URLSearchParams({
        apikey: TOMORROW_API_KEY,
        location: `${lat},${lon}`,
        fields: fields.join(","),
        timesteps: timesteps.join(","),
        startTime,
        endTime,
        units: "metric",
      });

      const url = `${TOMORROW_API_URL}?${params}`;
      console.log(
        "Tomorrow.io API URL:",
        url.replace(TOMORROW_API_KEY, "API_KEY_HIDDEN")
      );

      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Tomorrow.io API error status:", res.status);
        console.error("Tomorrow.io API error text:", errorText);

        // Handle specific error codes
        if (res.status === 429) {
          updateLastApiCall(); // Update rate limit timestamp
          throw new Error(
            language === "mm"
              ? "API ကန့်သတ်ချက်ရောက်ရှိသွားပါပြီ။ ခဏစောင့်ပြီး ပြန်လည်ကြိုးစားပါ။"
              : "API rate limit reached. Please try again later."
          );
        } else if (res.status === 401) {
          throw new Error(
            language === "mm"
              ? "API Key မှားယွင်းနေပါသည်။"
              : "Invalid API key. Please check your configuration."
          );
        } else if (res.status === 403) {
          throw new Error(
            language === "mm"
              ? "API အသုံးပြုခွင့် ပိတ်ပင်ခံထားရပါသည်။"
              : "API access forbidden. Please check your subscription."
          );
        }

        throw new Error(
          language === "mm"
            ? "မိုးလေဝသ အချက်အလက်များ ရယူရာတွင် အမှားရှိနေပါသည်။"
            : `API error: ${res.status}`
        );
      }

      const data = await res.json();
      console.log("Tomorrow.io data received:", data);

      if (!data.data?.timelines?.[0]?.intervals) {
        console.error("Invalid Tomorrow.io data structure:", data);
        throw new Error(
          language === "mm"
            ? "ရရှိသော ဒေတာပုံစံ မှားယွင်းနေပါသည်။"
            : "Invalid data format received from API"
        );
      }

      // Cache the successful response
      cacheWeatherData(data);

      // Update rate limit timestamp on successful call
      updateLastApiCall();

      return data;
    } catch (error) {
      console.error("Tomorrow.io fetch error:", error);
      console.error("Error stack:", error.stack);
      throw error; // Re-throw to handle in the calling function
    }
  };

  // Add Meteosource API fetch function
  const fetchMeteosourceData = async (lat, lon) => {
    try {
      console.log("Fetching Meteosource data as fallback");

      const params = new URLSearchParams({
        lat: lat,
        lon: lon,
        key: METEOSOURCE_API_KEY,
        units: "metric", // Use metric units
      });

      // Get current weather data
      const url = `${METEOSOURCE_API_URL}/point?${params}`;
      console.log(
        "Meteosource API URL:",
        url.replace(METEOSOURCE_API_KEY, "API_KEY_HIDDEN")
      );

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Meteosource API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Meteosource data received:", data);

      // Transform Meteosource data to match Tomorrow.io format
      const transformedData = {
        data: {
          timelines: [
            {
              intervals: [
                {
                  values: {
                    temperature: data.current.temperature,
                    humidity: data.current.humidity,
                    windSpeed: data.current.wind.speed,
                    temperatureApparent: data.current.feels_like,
                    visibility: data.current.visibility / 1000, // Convert to km
                    precipitationType: getPrecipitationType(
                      data.current.summary
                    ),
                    precipitationProbability:
                      data.current.precipitation.probability || 0,
                    weatherCode: getWeatherCode(data.current.summary),
                  },
                  startTime: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      };

      // Cache the transformed data
      cacheWeatherData(transformedData);

      return transformedData;
    } catch (error) {
      console.error("Meteosource fetch error:", error);
      return null;
    }
  };

  // Helper function to determine precipitation type from Meteosource summary
  const getPrecipitationType = (summary) => {
    const lowerSummary = summary.toLowerCase();
    if (lowerSummary.includes("rain")) return 1;
    if (lowerSummary.includes("snow")) return 2;
    if (lowerSummary.includes("sleet")) return 3;
    return 0;
  };

  // Helper function to map Meteosource weather summary to a weather code
  const getWeatherCode = (summary) => {
    const lowerSummary = summary.toLowerCase();
    // Map common weather conditions to codes
    if (lowerSummary.includes("clear")) return 1000;
    if (lowerSummary.includes("sunny")) return 1000;
    if (lowerSummary.includes("partly cloudy")) return 1100;
    if (lowerSummary.includes("cloudy")) return 1001;
    if (lowerSummary.includes("rain")) return 4001;
    if (lowerSummary.includes("thunderstorm")) return 8000;
    if (lowerSummary.includes("snow")) return 5001;
    if (lowerSummary.includes("fog")) return 2000;
    return 1000; // Default to clear sky if no match
  };

  const success = async (position) => {
    let lat, lon;

    try {
      if (position.coords) {
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      } else {
        lat = position.lat;
        lon = position.lon;
      }

      console.log("Processing weather data for coordinates:", { lat, lon });

      // Update stored coordinates if needed
      const currentCoords = coordinates;
      if (
        !currentCoords ||
        Math.abs(currentCoords.lat - lat) > 0.0001 ||
        Math.abs(currentCoords.lon - lon) > 0.0001
      ) {
        const newCoordinates = { lat, lon };
        localStorage.setItem(
          "weatherAppCoordinates",
          JSON.stringify(newCoordinates)
        );
        setCoordinates(newCoordinates);
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        // Try Tomorrow.io API first
        const tomorrowData = await fetchTomorrowData(lat, lon);
        if (tomorrowData) {
          console.log("Successfully fetched Tomorrow.io data");
          processWeatherData(tomorrowData);
          return;
        }

        // If Tomorrow.io fails, try Meteosource
        console.log("Tomorrow.io failed, trying Meteosource");
        const meteosourceData = await fetchMeteosourceData(lat, lon);
        if (meteosourceData) {
          console.log("Successfully fetched Meteosource data");
          processWeatherData(meteosourceData);
          setErrorMessage(
            language === "mm"
              ? "Tomorrow.io API ချို့ယွင်းမှုကြောင့် Meteosource မှ ဒေတာကို အသုံးပြုထားပါသည်။"
              : "Using Meteosource data due to Tomorrow.io API issues."
          );
          return;
        }

        // If both APIs fail, try cached data
        const cachedData = getCachedWeather();
        if (cachedData) {
          console.log("Using cached data as last resort");
          processWeatherData(cachedData);
          setErrorMessage(
            language === "mm"
              ? "API ချို့ယွင်းမှုကြောင့် သိမ်းဆည်းထားသော ဒေတာကို အသုံးပြုထားပါသည်။"
              : "Using cached data due to API issues."
          );
          return;
        }

        // If everything fails
        throw new Error(
          language === "mm"
            ? "မိုးလေဝသ အချက်အလက်များ မရရှိနိုင်ပါ။"
            : "Weather data unavailable from all sources."
        );
      } catch (err) {
        console.error("Weather fetch error:", err);
        setErrorMessage(err.message);
        setForecastMessage(
          language === "mm"
            ? "⚠️ မိုးလေဝသ အချက်အလက် မရရှိနိုင်ပါ။ ခဏစောင့်ပြီး ပြန်လည်ကြိုးစားပါ။"
            : "⚠️ Weather data unavailable. Please try again later."
        );
      }
    } catch (err) {
      console.error("Location processing error:", err);
      setErrorMessage(
        language === "mm"
          ? "တည်နေရာ အချက်အလက် ရယူရာတွင် အမှားရှိနေပါသည်။"
          : "Error processing location data."
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to check if cached data is still valid
  const isValidCache = (cachedData) => {
    if (!cachedData) return false;
    const now = new Date().getTime();
    return now - cachedData.timestamp < CACHE_DURATION;
  };

  // Function to get cached weather data
  const getCachedWeather = () => {
    const cached = localStorage.getItem("weatherCache");
    if (!cached) return null;

    const parsedCache = JSON.parse(cached);
    if (!isValidCache(parsedCache)) {
      localStorage.removeItem("weatherCache");
      return null;
    }

    return parsedCache.data;
  };

  // Function to cache weather data
  const cacheWeatherData = (data) => {
    const cacheData = {
      data: data,
      timestamp: new Date().getTime(),
    };
    localStorage.setItem("weatherCache", JSON.stringify(cacheData));
  };

  // Add formatTomorrowForecast function
  const formatTomorrowForecast = (
    interval,
    lang = "mm",
    isCurrentInterval = false
  ) => {
    const startTime = new Date(interval.startTime);
    const formattedTime = startTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const temp = Math.round(interval.values.temperature);
    const precipProb = Math.round(interval.values.precipitationProbability);
    const windSpeed = Math.round(interval.values.windSpeed);
    const humidity = Math.round(interval.values.humidity);

    if (lang === "mm") {
      return isCurrentInterval
        ? `🌧️ လက်ရှိ မိုးရွာသွန်းမှု\n` +
            `🕒 အချိန်: ${formattedTime} (မြန်မာစံတော်ချိန်)\n` +
            `🌡️ အပူချိန်: ${temp}°C\n` +
            `💨 လေတိုက်နှုန်း: ${windSpeed} m/s\n` +
            `💧 စိုထိုင်းဆ: ${humidity}%\n` +
            `🌂 မိုးရွာနိုင်ခြေ: ${precipProb}%\n\n` +
            `💡 အကြံပြုချက်များ:\n` +
            `• ထီးယူသွားပါရန် ☔\n` +
            `• ရေစိုခံဖိနပ်ဝတ်ပါ 👟`
        : `🌧️ မိုးရွာနိုင်ပါသည်\n` +
            `🕒 အချိန်: ${formattedTime} (မြန်မာစံတော်ချိန်)\n` +
            `🌡️ အပူချိန်: ${temp}°C\n` +
            `💨 လေတိုက်နှုန်း: ${windSpeed} m/s\n` +
            `💧 စိုထိုင်းဆ: ${humidity}%\n` +
            `🌂 မိုးရွာနိုင်ခြေ: ${precipProb}%\n\n` +
            `💡 အကြံပြုချက်များ:\n` +
            `• ထီးယူသွားပါရန် ☔\n` +
            `• ရေစိုခံဖိနပ်ဝတ်ပါ 👟`;
    }

    // English format
    return isCurrentInterval
      ? `🌧️ Current Rain Conditions\n` +
          `🕒 Time: ${formattedTime} (MMT)\n` +
          `🌡️ Temperature: ${temp}°C\n` +
          `💨 Wind Speed: ${windSpeed} m/s\n` +
          `💧 Humidity: ${humidity}%\n` +
          `🌂 Rain Probability: ${precipProb}%\n\n` +
          `💡 Tips:\n` +
          `• Take an umbrella ☔\n` +
          `• Wear waterproof shoes 👟`
      : `🌧️ Rain Expected\n` +
          `🕒 Time: ${formattedTime} (MMT)\n` +
          `🌡️ Temperature: ${temp}°C\n` +
          `💨 Wind Speed: ${windSpeed} m/s\n` +
          `💧 Humidity: ${humidity}%\n` +
          `🌂 Rain Probability: ${precipProb}%\n\n` +
          `💡 Tips:\n` +
          `• Take an umbrella ☔\n` +
          `• Wear waterproof shoes 👟`;
  };

  const processWeatherData = (data) => {
    if (!data.data?.timelines?.[0]?.intervals) {
      throw new Error("Invalid data format received from API");
    }

    // Check for weather changes that need notifications
    checkWeatherChanges(data);

    const intervals = data.data.timelines[0].intervals;
    const currentInterval = intervals[0];
    const futureIntervals = intervals.slice(1);

    // Store additional weather details
    setWeatherDetails({
      temperature: Math.round(currentInterval.values.temperature),
      humidity: Math.round(currentInterval.values.humidity || 0),
      windSpeed: Math.round(currentInterval.values.windSpeed || 0),
      feelsLike: Math.round(
        currentInterval.values.temperatureApparent ||
          currentInterval.values.temperature
      ),
      visibility: Math.round(currentInterval.values.visibility || 0),
      precipitationType: currentInterval.values.precipitationType || 0,
      precipitationProbability:
        currentInterval.values.precipitationProbability || 0,
    });

    setLastUpdated(new Date());

    // Check current conditions first
    if (currentInterval.values.precipitationType > 0) {
      const formattedMessage = formatTomorrowForecast(
        currentInterval,
        language,
        true
      );
      setForecastMessage(formattedMessage);
      return;
    }

    // Then check future intervals for rain
    const nextRainInterval = futureIntervals.find((interval) => {
      const precipProb = interval.values.precipitationProbability;
      const precipType = interval.values.precipitationType;
      return precipProb >= 70 || (precipProb >= 40 && precipType > 0);
    });

    if (nextRainInterval) {
      const formattedMessage = formatTomorrowForecast(
        nextRainInterval,
        language,
        false
      );
      setForecastMessage(formattedMessage);
    } else {
      // Check if there's any chance of rain
      const anyRainChance = futureIntervals.some(
        (interval) => interval.values.precipitationProbability >= 30
      );

      // Format the current conditions when no rain is expected
      const currentConditions =
        language === "mm"
          ? `☀️ လက်ရှိ မိုးလေဝသ\n` +
            `🕒 အချိန်: ${new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })} (မြန်မာစံတော်ချိန်)\n` +
            `🌡️ အပူချိန်: ${Math.round(
              currentInterval.values.temperature
            )}°C\n` +
            `💨 လေတိုက်နှုန်း: ${Math.round(
              currentInterval.values.windSpeed || 0
            )} m/s\n` +
            `💧 စိုထိုင်းဆ: ${Math.round(
              currentInterval.values.humidity || 0
            )}%\n\n` +
            (anyRainChance
              ? `⚠️ နောက် ၃၀ မိနစ်အတွင်း မိုးအနည်းငယ်ရွာနိုင်ပါသည်။\n💡 အကြံပြုချက်: ထီးယူဆောင်သွားပါရန်။`
              : `✨ နောက် ၃၀ မိနစ်အတွင်း မိုးရွာဖွယ်မရှိပါ။\n💡 အကြံပြုချက်: ပြင်ပလှုပ်ရှားမှုများ လုပ်နိုင်ပါသည်။`)
          : `☀️ Current Weather\n` +
            `🕒 Time: ${new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })} (MMT)\n` +
            `🌡️ Temperature: ${Math.round(
              currentInterval.values.temperature
            )}°C\n` +
            `💨 Wind Speed: ${Math.round(
              currentInterval.values.windSpeed || 0
            )} m/s\n` +
            `💧 Humidity: ${Math.round(
              currentInterval.values.humidity || 0
            )}%\n\n` +
            (anyRainChance
              ? `⚠️ Slight chance of rain in next 30 minutes.\n💡 Tip: Consider taking an umbrella.`
              : `✨ No rain expected in next 30 minutes.\n💡 Tip: Good time for outdoor activities!`);

      setForecastMessage(currentConditions);
    }
  };

  // Toggle language handler
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "mm" ? "en" : "mm"));
  };

  // Add a function to clear stored location
  const clearStoredLocation = () => {
    localStorage.removeItem("weatherAppCoordinates");
    setCoordinates(null);
    getForecast(); // Get fresh coordinates
  };

  // Function to format the last updated time
  const getLastUpdatedText = () => {
    if (!lastUpdated) return "";
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000); // difference in seconds

    if (language === "mm") {
      if (diff < 60) return `${diff} စက္ကန့်က`;
      if (diff < 3600) return `${Math.floor(diff / 60)} မိနစ်က`;
      return `${Math.floor(diff / 3600)} နာရီက`;
    } else {
      if (diff < 60) return `${diff} seconds ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
      return `${Math.floor(diff / 3600)} hours ago`;
    }
  };

  // Function to request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setErrorMessage(
        language === "mm"
          ? "သင့်ဘရောင်ဇာသည် နိုတီဖီကေးရှင်းကို မထောက်ပံ့ပါ။"
          : "Your browser does not support notifications."
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setShowNotifications(permission === "granted");

      if (permission === "granted") {
        // Send test notification
        new Notification(language === "mm" ? "မိုးလေဝသ အက်ပ်" : "Weather App", {
          body:
            language === "mm"
              ? "နိုတီဖီကေးရှင်း စတင်အသုံးပြုနိုင်ပါပြီ။"
              : "Notifications are now enabled.",
          icon: "/weather-icon.png",
        });
      } else if (permission === "denied") {
        setErrorMessage(
          language === "mm"
            ? "နိုတီဖီကေးရှင်း ခွင့်ပြုချက် ငြင်းပယ်ခံရပါသည်။ ဘရောင်ဇာ settings တွင် ပြန်လည်ခွင့်ပြုနိုင်ပါသည်။"
            : "Notification permission was denied. You can enable it in browser settings."
        );
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setErrorMessage(
        language === "mm"
          ? "နိုတီဖီကေးရှင်း ခွင့်ပြုချက် တောင်းခံရာတွင် အမှားရှိနေပါသည်။"
          : "Error requesting notification permission."
      );
    }
  };

  // Function to send weather notification
  const sendWeatherNotification = useCallback(
    (title, message, options = {}) => {
      if (
        !("Notification" in window) ||
        !showNotifications ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      try {
        const notificationOptions = {
          body: message,
          icon: "/weather-icon.png",
          badge: "/weather-icon.png",
          timestamp: Date.now(),
          vibrate: [200, 100, 200],
          ...options,
        };

        const notification = new Notification(title, notificationOptions);

        // Add click handler to focus the app window
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    },
    [showNotifications]
  );

  // Function to check weather changes and send notifications
  const checkWeatherChanges = useCallback(
    (data) => {
      if (!data?.data?.timelines?.[0]?.intervals?.[0]) return;

      const currentInterval = data.data.timelines[0].intervals[0];
      const precipProb = currentInterval.values.precipitationProbability;
      const precipType = currentInterval.values.precipitationType;
      const temp = Math.round(currentInterval.values.temperature);

      // Create current weather state object
      const currentState = {
        isRaining: precipType > 0,
        highRainProb: precipProb >= 70,
        temperature: temp,
      };

      // If this is the first weather check, just save the state
      if (!lastWeatherState) {
        setLastWeatherState(currentState);
        return;
      }

      // Check for significant changes
      if (!lastWeatherState.isRaining && currentState.isRaining) {
        // It started raining
        sendWeatherNotification(
          language === "mm" ? "🌧️ မိုးရွာသွန်းမှု သတိပေးချက်" : "🌧️ Rain Alert",
          language === "mm"
            ? `ယခု မိုးစရွာနေပါပြီ။ အပူချိန်: ${temp}°C`
            : `It has started raining. Temperature: ${temp}°C`,
          { tag: "rain-start" } // Prevent duplicate notifications
        );
      } else if (!lastWeatherState.highRainProb && currentState.highRainProb) {
        // High probability of rain
        sendWeatherNotification(
          language === "mm"
            ? "⚠️ မိုးရွာနိုင်ခြေ သတိပေးချက်"
            : "⚠️ Rain Warning",
          language === "mm"
            ? `မကြာမီ မိုးရွာနိုင်ပါသည်။ မိုးရွာနိုင်ခြေ: ${precipProb}%`
            : `High chance of rain soon. Probability: ${precipProb}%`,
          { tag: "rain-warning" }
        );
      }

      // Check for significant temperature changes (more than 5 degrees)
      if (
        Math.abs(currentState.temperature - lastWeatherState.temperature) >= 5
      ) {
        const isWarmer =
          currentState.temperature > lastWeatherState.temperature;
        sendWeatherNotification(
          language === "mm"
            ? "🌡️ အပူချိန်ပြောင်းလဲမှု"
            : "🌡️ Temperature Change",
          language === "mm"
            ? `အပူချိန် ${
                isWarmer ? "တိုးလာ" : "လျော့သွား"
              }ပါသည်။ လက်ရှိ ${temp}°C`
            : `Temperature has ${
                isWarmer ? "increased" : "decreased"
              }. Now ${temp}°C`,
          { tag: "temperature-change" }
        );
      }

      // Update last weather state
      setLastWeatherState(currentState);
    },
    [lastWeatherState, language, sendWeatherNotification]
  );

  // Handle manual refresh
  const handleRefresh = () => {
    if (loading) return;
    getForecast();
  };

  // Update the Last Updated Time display component
  const LastUpdatedDisplay = () => (
    <div
      className={`text-xs ${
        darkMode ? "text-gray-400" : "text-gray-600"
      } text-center transition-colors duration-300`}
    >
      {lastUpdated && (
        <div className="space-y-1">
          <span className="inline-flex items-center space-x-1">
            <RefreshCw className="w-3 h-3" />
            <span>
              {language === "mm" ? "နောက်ဆုံးအသစ်ပြင်ချိန်" : "Last updated"}:{" "}
              {getLastUpdatedText()}
            </span>
          </span>
          <div className="text-xs opacity-75">
            {language === "mm" ? "အသုံးပြုသည့် API: " : "Data source: "}
            <span
              className={`font-medium ${
                darkMode ? "text-yellow-300" : "text-blue-600"
              }`}
            >
              Tomorrow.io
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // Update notification button UI
  const NotificationButton = () => (
    <button
      onClick={requestNotificationPermission}
      className={`transition-all duration-300 relative ${
        darkMode ? "text-yellow-300" : "text-blue-600"
      } ${showNotifications ? "opacity-100" : "opacity-50"}`}
      aria-label={
        showNotifications ? "Notifications enabled" : "Enable notifications"
      }
      title={
        showNotifications ? "Notifications enabled" : "Enable notifications"
      }
      disabled={notificationPermission === "denied"}
    >
      <Bell className="w-5 h-5" />
      {notificationPermission === "denied" && (
        <span className="absolute -top-1 -right-1 text-red-500 text-xs">
          ⛔
        </span>
      )}
    </button>
  );

  // Add weather animation imports
  const loadAnimation = async (animationName) => {
    try {
      // Check if animation is already cached
      if (animationCache.current[animationName]) {
        return animationCache.current[animationName];
      }

      // Import animation based on name
      const animation = await import(`../animations/${animationName}.json`);
      animationCache.current[animationName] = animation.default;
      return animation.default;
    } catch (error) {
      console.error(`Error loading animation ${animationName}:`, error);
      return null;
    }
  };

  // Function to determine which animation to show based on weather
  const getWeatherAnimation = async (weatherData) => {
    if (!weatherData?.values) return "clear";

    const { precipitationType, precipitationProbability, temperature } =
      weatherData.values;
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 18;

    // Determine weather condition
    if (precipitationType > 0 || precipitationProbability > 70) {
      return "rain";
    } else if (temperature <= 0) {
      return "snow";
    } else if (isNight) {
      return "night";
    } else {
      return "clear";
    }
  };

  // Update animation when weather data changes
  useEffect(() => {
    const updateAnimation = async () => {
      if (!weatherDetails) return;

      const animationName = await getWeatherAnimation({
        values: {
          precipitationType: weatherDetails.precipitationType || 0,
          precipitationProbability:
            weatherDetails.precipitationProbability || 0,
          temperature: weatherDetails.temperature || 20,
        },
      });

      const newAnimation = await loadAnimation(animationName);
      if (newAnimation) {
        setAnimationData(newAnimation);
      }
    };

    updateAnimation();
  }, [weatherDetails]);

  return (
    <div
      className={`${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br from-blue-100 via-white to-blue-100"
      } min-h-screen flex items-center justify-center px-4 py-8 transition-all duration-500`}
    >
      <div
        className={`${
          darkMode
            ? "bg-gray-800 shadow-lg shadow-blue-500/10"
            : "bg-white/90 shadow-lg shadow-blue-500/20"
        } rounded-2xl p-6 w-full max-w-md space-y-6 transition-all duration-300 backdrop-blur-sm`}
      >
        {/* Header with Controls */}
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h1
              className={`text-2xl font-bold ${
                darkMode ? "text-yellow-300" : "text-blue-600"
              } transition-colors duration-300`}
            >
              🌤️ Today's Forecast
            </h1>
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                className={`transition-all duration-300 ${
                  darkMode ? "text-yellow-300" : "text-blue-600"
                } ${
                  loading
                    ? "animate-spin cursor-not-allowed opacity-50"
                    : "hover:scale-110"
                }`}
                aria-label="Refresh Weather"
                title="Refresh weather data"
                disabled={loading}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <NotificationButton />
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`transition-all duration-300 ${
                  darkMode ? "text-yellow-300" : "text-blue-600"
                }`}
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={toggleLanguage}
                className={`transition-all duration-300 px-3 py-1 rounded-md font-semibold text-sm ${
                  darkMode
                    ? "bg-yellow-300/10 text-yellow-300 border border-yellow-300/50 hover:bg-yellow-300/20"
                    : "bg-blue-600/10 text-blue-600 border border-blue-600/50 hover:bg-blue-600/20"
                }`}
                aria-label="Toggle Language"
              >
                {language === "mm" ? "English" : "မြန်မာ"}
              </button>
            </div>
          </div>

          {/* Last Updated Time */}
          <LastUpdatedDisplay />
        </div>

        {/* Location Info */}
        {coordinates && (
          <div
            className={`text-xs ${
              darkMode ? "text-gray-400" : "text-gray-600"
            } text-center transition-colors duration-300`}
          >
            <span className="inline-flex items-center justify-center space-x-2">
              <span>
                📍{" "}
                {language === "mm"
                  ? "သိမ်းဆည်းထားသော တည်နေရာ"
                  : "Saved location"}
              </span>
              <button
                onClick={clearStoredLocation}
                className={`transition-all duration-300 ${
                  darkMode ? "text-yellow-300" : "text-blue-600"
                } hover:underline`}
              >
                {language === "mm" ? "ပြောင်းမည်" : "Change"}
              </button>
            </span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div
            className={`transition-all duration-300 ${
              darkMode
                ? "bg-red-900/50 text-red-100 border border-red-800"
                : "bg-red-50 text-red-700 border border-red-200"
            } rounded-lg p-4 text-sm`}
          >
            {errorMessage}
          </div>
        )}

        {/* Weather Animation */}
        <div className="flex justify-center items-center w-32 h-32 mx-auto relative">
          {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-200 h-32 w-32"></div>
            </div>
          ) : animationData ? (
            <Lottie
              animationData={animationData}
              loop={true}
              autoplay={true}
              style={{ width: "100%", height: "100%" }}
              className={`${
                darkMode ? "filter brightness-90" : ""
              } drop-shadow-xl rounded-full`}
              rendererSettings={{
                preserveAspectRatio: "xMidYMid slice",
                transparent: true,
              }}
            />
          ) : (
            <div className="text-4xl">🌤️</div>
          )}
        </div>

        {/* Forecast Message */}
        <div
          className={`${
            darkMode
              ? "bg-gray-700/50 text-white border border-gray-600"
              : "bg-blue-50/50 text-gray-800 border border-blue-200"
          } rounded-lg p-4 whitespace-pre-line font-medium text-sm transition-all duration-300`}
        >
          {forecastMessage}
        </div>

        {/* Time Display */}
        <div
          className={`text-center text-xs font-mono ${
            darkMode ? "text-gray-400" : "text-gray-600"
          } transition-colors duration-300`}
        >
          🕒 Myanmar Time:{" "}
          <span
            className={`font-semibold ${
              darkMode ? "text-yellow-300" : "text-blue-700"
            }`}
          >
            {myanmarTime}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Home;
