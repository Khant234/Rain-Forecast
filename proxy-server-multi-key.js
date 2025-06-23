const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const API_KEYS = [
  process.env.TOMORROW_API_KEY_1,
  process.env.TOMORROW_API_KEY_2
];

let currentKeyIndex = 0;

app.get('/api/weather/:lat/:lon', async (req, res) => {
  const { lat, lon } = req.params;
  const apiKey = API_KEYS[currentKeyIndex];

  try {
    const response = await fetch(`https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&apikey=${apiKey}`);
    if (!response.ok) {
      console.error(`Error fetching weather data: ${response.status}`);
      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length; // Switch to next key
      return res.status(500).send('Weather data unavailable');
    }
    const weatherData = await response.json();
    res.json(weatherData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Weather data unavailable');
  }
});

app.listen(port, () => {
  console.log(`Weather proxy server running on port ${port}`);
});
