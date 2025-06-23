// Tomorrow.io API configuration
const TOMORROW_API_KEY = "WP1YfdsbDqxBeOQFU1ERgQjVhbLGZf9U";
const TOMORROW_API_URL = "https://api.tomorrow.io/v4/timelines";

export const fetchWeatherData = async (...args) => {
  try {
    let lat, lon;

    if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      // Single object parameter
      lat = args[0].latitude || args[0].lat;
      lon = args[0].longitude || args[0].lon;
    } else if (args.length === 2) {
      // Two separate parameters
      lat = args[0];
      lon = args[1];
    } else {
      throw new Error(