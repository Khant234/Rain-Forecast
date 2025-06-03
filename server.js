import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Tomorrow.io API proxy endpoint
app.get("/api/weather", async (req, res) => {
  try {
    const { lat, lon, fields, timesteps } = req.query;

    // Log incoming request
    console.log("Weather request received:", { lat, lon, fields, timesteps });

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.error("Invalid coordinates:", { lat, lon });
      return res.status(400).json({
        error:
          "Invalid coordinates. Please provide valid latitude and longitude values.",
      });
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      console.error("Coordinates out of range:", { latitude, longitude });
      return res.status(400).json({
        error: "Coordinates out of valid range.",
      });
    }

    const TOMORROW_API_KEY =
      process.env.TOMORROW_API_KEY
    const TOMORROW_API_URL = "https://api.tomorrow.io/v4/timelines";

    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      apikey: TOMORROW_API_KEY,
      location: `${latitude},${longitude}`,
      fields:
        fields ||
        "temperature,precipitationProbability,precipitationType,weatherCode,humidity,windSpeed,temperatureApparent,visibility",
      timesteps: timesteps || "1h",
      startTime,
      endTime,
      units: "metric",
    });

    const url = `${TOMORROW_API_URL}?${params}`;
    console.log(
      "Calling Tomorrow.io API:",
      url.replace(TOMORROW_API_KEY, "API_KEY_HIDDEN")
    );

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Tomorrow.io API error:", data);
      throw new Error(data.message || "Failed to fetch weather data");
    }

    // Log successful response
    console.log("Weather data received successfully");

    res.json(data);
  } catch (error) {
    console.error("Weather API Error:", error);

    // Send appropriate error response
    if (error.message.includes("Invalid coordinates")) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes("Failed to fetch")) {
      res
        .status(503)
        .json({ error: "Weather service temporarily unavailable" });
    } else {
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log("Environment:", process.env.NODE_ENV || "development");
});
