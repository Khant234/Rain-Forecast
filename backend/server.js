require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// Add request logging middleware
app.use((req, res, next) => {
//   // // // // console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   // // // // console.log('Request headers:', req.headers);
  next();
});

// Add CORS middleware with specific configuration
app.use(cors({
  origin: ['http://localhost:3000'], // Allow requests from your React app
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500
  });

  // Handle specific error cases
  if (err.response?.status === 403) {
    // Forbidden - likely geo-blocking
    res.status(403).json({
      error: 'Access Forbidden',
      message: 'This service may not be available in your region'
    });
  } else if (err.response?.status === 429) {
    // Rate limiting
    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Please try again later'
    });
  } else {
    // Generic error
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Weather API configuration
const TOMORROW_API_URL = "https://api.tomorrow.io/v4/timelines";
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_API_URL = process.env.OPENWEATHER_API_URL || "https://api.openweathermap.org/data/2.5/onecall";

// Transform OpenWeather API response to match Tomorrow.io format
const transformOpenWeatherData = (openWeatherData) => {
  const { current, hourly, daily } = openWeatherData;
  
  return {
    data: {
      timelines: [
        {
          intervals: hourly.map(interval => ({
            startTime: new Date(interval.dt * 1000).toISOString(),
            values: {
              temperature: interval.temp,
              temperatureApparent: interval.feels_like,
              precipitationProbability: interval.pop * 100,
              precipitationType: interval.weather[0].id >= 200 ? 1 : 0,
              humidity: interval.humidity,
              windSpeed: interval.wind_speed,
              windDirection: interval.wind_deg,
              weatherCode: interval.weather[0].id,
              visibility: interval.visibility / 1000, // Convert to km
              cloudCover: interval.clouds,
              pressure: interval.pressure
            }
          }))
        }
      ]
    }
  };
};
const TOMORROW_API_KEY = process.env.TOMORROW_API_KEY;

// Get cached data or null if not found
const getCachedData = (key) => {
  const cached = weatherCache.get(key);
  if (!cached) return null;
  
  // Check if cache is still valid
  const now = Date.now();
  if (now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Cache new data
const cacheData = (key, data) => {
  weatherCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Weather route
app.post('/weather', async (req, res) => {
  try {
    // Validate request body
    const { lat, lon } = req.body;
    
    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: 'Latitude and longitude are required'
      });
    }

    // Validate coordinates
    if (isNaN(lat) || isNaN(lon) || 
        lat < -90 || lat > 90 || 
        lon < -180 || lon > 180) {
      return res.status(400).json({ 
        error: 'Invalid coordinates',
        details: 'Latitude must be between -90 and 90, longitude between -180 and 180'
      });
    }

    // Create cache key
    const cacheKey = `${lat},${lon}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
//       // // // // console.log('Returning cached weather data for:', { lat, lon });
      return res.json(cachedData);
    }

    // Check API key
    if (!TOMORROW_API_KEY) {
      console.error('Missing API key');
      return res.status(500).json({
        error: 'Configuration error',
        details: 'API key not configured'
      });
    }

    // Tomorrow.io API configuration
    const fields = [
      "precipitationProbability",
      "precipitationType",
      "precipitationIntensity",
      "temperature",
      "temperatureApparent",
      "humidity",
      "windSpeed",
      "windDirection",
      "weatherCode",
      "visibility",
      "cloudCover",
      "pressure"
    ];

    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const params = {
      apikey: TOMORROW_API_KEY,
      location: `${lat},${lon}`,
      fields: fields.join(","),
      timesteps: "1h",
      startTime,
      endTime,
      units: "metric",
      timezone: "Asia/Yangon"
    };

//     // // // // console.log('Fetching weather data for:', { lat, lon });
//     // // // // console.log('API request params:', params);

    try {
      const response = await axios.get(TOMORROW_API_URL, {
        params,
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
//       // // // // console.log('Successfully fetched weather data');
      
      // Cache the data
      cacheData(cacheKey, response.data);
      
      res.json(response.data);
    } catch (apiError) {
      console.error('Tomorrow.io API error:', {
        message: apiError.message,
        code: apiError.code,
        status: apiError.response?.status,
        headers: apiError.response?.headers,
        data: apiError.response?.data
      });
      
      // Try OpenWeather API as fallback
      if (OPENWEATHER_API_KEY) {
        try {
//           // // // // console.log('Falling back to OpenWeather API');
          const openWeatherParams = {
            lat,
            lon,
            exclude: 'minutely,alerts',
            units: 'metric',
            appid: OPENWEATHER_API_KEY
          };
          
          const openWeatherResponse = await axios.get(OPENWEATHER_API_URL, {
            params: openWeatherParams,
            timeout: 10000
          });
          
          const transformedData = transformOpenWeatherData(openWeatherResponse.data);
//           // // // // console.log('Successfully fetched data from OpenWeather API');
          
          // Cache the transformed data
          cacheData(cacheKey, transformedData.data);
          
          return res.json(transformedData.data);
        } catch (fallbackError) {
          console.error('OpenWeather API error:', fallbackError);
          // If fallback fails, use cached data if available
          if (cachedData) {
//             // // // // console.log('Using cached data as last resort');
            return res.json(cachedData);
          }
        }
      }
      
      // Handle specific error cases
      if (apiError.response?.status === 403) {
        // Likely geo-blocking
        return res.status(403).json({
          error: 'Access Forbidden',
          message: 'This service may not be available in your region. Using OpenWeather API instead.'
        });
      } else if (apiError.response?.status === 429) {
        // Rate limit error
        console.warn('Rate limit hit. Using cached data if available');
        if (cachedData) {
          return res.json(cachedData);
        }
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          message: 'Please try again later'
        });
      } else if (apiError.response?.status === 401) {
        // Authentication error
        return res.status(401).json({ 
          error: 'Invalid API key',
          message: 'Please check your API key'
        });
      } else if (apiError.code === 'ECONNABORTED') {
        // Timeout error
        return res.status(504).json({
          error: 'Timeout',
          message: 'Request timed out. Please try again'
        });
      } else {
        // Other API errors
        return res.status(500).json({ 
          error: 'Failed to fetch weather data',
          details: apiError.message 
        });
      }
    }
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Start server
app.listen(port, () => {
//   // // // // console.log(`Server running on port ${port}`);
});
