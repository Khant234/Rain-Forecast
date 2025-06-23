// Test the mock data generation function
function generateMockWeatherData(lat, lon) {
  const now = new Date();
  
  // Simple mock data that matches the expected structure
  const mockData = {
    "data": {
      "timelines": [
        {
          "timestep": "1d",
          "startTime": now.toISOString(),
          "endTime": new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          "intervals": [
            {
              "startTime": now.toISOString(),
              "values": {
                "temperature": 30,
                "temperatureApparent": 32,
                "humidity": 75,
                "windSpeed": 8,
                "windDirection": 180,
                "weatherCode": 1000,
                "precipitationProbability": 20,
                "precipitationType": 0,
                "pressureSurfaceLevel": 1013,
                "uvIndex": 6,
                "visibility": 15,
                "sunriseTime": new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0).toISOString(),
                "sunsetTime": new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0).toISOString()
              }
            }
          ]
        },
        {
          "timestep": "1h",
          "startTime": now.toISOString(),
          "endTime": new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          "intervals": []
        }
      ]
    },
    "mockData": true,
    "message": "Using mock data due to API rate limit"
  };

  // Generate 3 hours of hourly data for testing
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getTime() + i * 60 * 60 * 1000);
    const hour = date.getHours();
    const isNight = hour < 6 || hour > 18;
    
    mockData.data.timelines[1].intervals.push({
      "startTime": date.toISOString(),
      "values": {
        "temperature": isNight ? 25 : 32,
        "temperatureApparent": isNight ? 27 : 35,
        "humidity": 70,
        "windSpeed": 5,
        "windDirection": 180,
        "weatherCode": isNight ? 1000 : 1100,
        "precipitationProbability": 30,
        "precipitationType": 0,
        "pressureSurfaceLevel": 1013,
        "uvIndex": isNight ? 0 : 6,
        "visibility": 15,
        "sunriseTime": new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6, 0, 0).toISOString(),
        "sunsetTime": new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0, 0).toISOString()
      }
    });
  }

  return mockData;
}

// Test the function
const testData = generateMockWeatherData(16.8409, 96.1735);
console.log("Mock data structure test:");
console.log("Has data:", !!testData.data);
console.log("Has timelines:", !!testData.data.timelines);
console.log("Timelines count:", testData.data.timelines.length);
console.log("Daily intervals:", testData.data.timelines[0].intervals.length);
console.log("Hourly intervals:", testData.data.timelines[1].intervals.length);
console.log("Is mock data:", testData.mockData);

// Test JSON serialization
try {
  const jsonString = JSON.stringify(testData);
  console.log("JSON serialization: SUCCESS");
  console.log("JSON length:", jsonString.length);
  
  // Test parsing back
  const parsed = JSON.parse(jsonString);
  console.log("JSON parsing: SUCCESS");
  console.log("Parsed has data:", !!parsed.data);
} catch (error) {
  console.error("JSON error:", error.message);
}