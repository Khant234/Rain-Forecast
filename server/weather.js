// server/weather.js
// Fetch rain forecast from Tomorrow.io API
require('dotenv').config();
const fetch = require('node-fetch');

const TOMORROW_API_KEY = process.env.TOMORROW_API_KEY;
const BASE_URL = 'https://api.tomorrow.io/v4/weather/forecast';

/**
 * Fetch rain forecast for a given location (lat, lon)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} - Rain forecast data
 */
async function getRainForecast(lat, lon) {
  if (!TOMORROW_API_KEY) {
    throw new Error('Tomorrow.io API key not set in environment variables');
  }
  const url = `${BASE_URL}?location=${lat},${lon}&apikey=${TOMORROW_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch weather data: ' + response.statusText);
    }
    return await response.json();
  } catch (error) {
    throw new Error('Failed to fetch weather data: ' + error.message);
  }
}

module.exports = { getRainForecast };
