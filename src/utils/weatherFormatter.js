/**
 * Weather Data Formatting Utilities
 * Provides consistent formatting for weather values across the application
 */

/**
 * Format wind speed to display clean values
 * @param {number} windSpeed - Raw wind speed value
 * @returns {string} Formatted wind speed (e.g., "11.1" or "11")
 */
export const formatWindSpeed = (windSpeed) => {
  if (windSpeed === null || windSpeed === undefined || isNaN(windSpeed)) {
    return "0";
  }

  const speed = parseFloat(windSpeed);

  // If it's a whole number or very close to one, show as integer
  if (Math.abs(speed - Math.round(speed)) < 0.1) {
    return Math.round(speed).toString();
  }

  // Otherwise, show 1 decimal place maximum
  return speed.toFixed(1);
};

/**
 * Format humidity to display as whole number percentage
 * @param {number} humidity - Raw humidity value (0-100)
 * @returns {string} Formatted humidity (e.g., "74")
 */
export const formatHumidity = (humidity) => {
  if (humidity === null || humidity === undefined || isNaN(humidity)) {
    return "0";
  }

  return Math.round(parseFloat(humidity)).toString();
};

/**
 * Format UV Index to display as whole number (0-15 range)
 * @param {number} uvIndex - Raw UV index value
 * @returns {string} Formatted UV index (e.g., "0", "5", "11")
 */
export const formatUVIndex = (uvIndex) => {
  if (uvIndex === null || uvIndex === undefined || isNaN(uvIndex)) {
    return "0";
  }

  // Ensure UV index is within valid range (0-15) and is a whole number
  const uv = Math.max(0, Math.min(15, Math.round(parseFloat(uvIndex))));
  return uv.toString();
};

/**
 * Format pressure to display as whole number
 * @param {number} pressure - Raw pressure value in hPa
 * @returns {string} Formatted pressure (e.g., "1013")
 */
export const formatPressure = (pressure) => {
  if (pressure === null || pressure === undefined || isNaN(pressure)) {
    return "1013"; // Standard atmospheric pressure as fallback
  }

  return Math.round(parseFloat(pressure)).toString();
};

/**
 * Format temperature to display as whole number
 * @param {number|string} temperature - Raw temperature value
 * @returns {string} Formatted temperature (e.g., "25")
 */
export const formatTemperature = (temperature) => {
  // Handle null, undefined, empty string, or non-numeric values
  if (
    temperature === null ||
    temperature === undefined ||
    temperature === "" ||
    temperature === "--"
  ) {
    return "--";
  }

  // Convert to number and check if it's valid
  const numTemp = parseFloat(temperature);
  if (isNaN(numTemp) || !isFinite(numTemp)) {
    console.warn(`Invalid temperature value: ${temperature}`);
    return "--";
  }

  // Ensure temperature is within reasonable range (-100°C to 100°C)
  if (numTemp < -100 || numTemp > 100) {
    console.warn(`Temperature out of reasonable range: ${numTemp}°C`);
    return "--";
  }

  return Math.round(numTemp).toString();
};

/**
 * Format all weather values in an object
 * @param {object} weatherData - Object containing weather values
 * @returns {object} Object with formatted weather values
 */
export const formatWeatherData = (weatherData) => {
  if (!weatherData || typeof weatherData !== "object") {
    return weatherData;
  }

  const formatted = { ...weatherData };

  // Format individual properties if they exist
  if (formatted.windSpeed !== undefined) {
    formatted.windSpeed = formatWindSpeed(formatted.windSpeed);
  }

  if (formatted.humidity !== undefined) {
    formatted.humidity = formatHumidity(formatted.humidity);
  }

  if (formatted.uvIndex !== undefined) {
    formatted.uvIndex = formatUVIndex(formatted.uvIndex);
  }

  if (formatted.pressure !== undefined) {
    formatted.pressure = formatPressure(formatted.pressure);
  }

  if (formatted.temperature !== undefined) {
    formatted.temperature = formatTemperature(formatted.temperature);
  }

  if (formatted.feelsLike !== undefined) {
    formatted.feelsLike = formatTemperature(formatted.feelsLike);
  }

  return formatted;
};

/**
 * Get formatted weather value with unit
 * @param {number} value - Raw value
 * @param {string} type - Type of weather data ('wind', 'humidity', 'uv', 'pressure', 'temperature')
 * @param {boolean} includeUnit - Whether to include the unit in the result
 * @returns {string} Formatted value with or without unit
 */
export const getFormattedWeatherValue = (value, type, includeUnit = true) => {
  let formattedValue;
  let unit = "";

  switch (type) {
    case "wind":
      formattedValue = formatWindSpeed(value);
      unit = includeUnit ? " km/h" : "";
      break;
    case "humidity":
      formattedValue = formatHumidity(value);
      unit = includeUnit ? "%" : "";
      break;
    case "uv":
      formattedValue = formatUVIndex(value);
      unit = ""; // UV Index has no unit
      break;
    case "pressure":
      formattedValue = formatPressure(value);
      unit = includeUnit ? " hPa" : "";
      break;
    case "temperature":
      formattedValue = formatTemperature(value);
      unit = includeUnit ? "°C" : "";
      break;
    default:
      formattedValue = value?.toString() || "0";
      unit = "";
  }

  return formattedValue + unit;
};

export default {
  formatWindSpeed,
  formatHumidity,
  formatUVIndex,
  formatPressure,
  formatTemperature,
  formatWeatherData,
  getFormattedWeatherValue,
};
