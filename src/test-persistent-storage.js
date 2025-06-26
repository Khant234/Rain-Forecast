/**
 * Test script for persistent storage system
 * Run this in browser console to test the storage functionality
 */

import { 
  weatherStorage, 
  locationStorage, 
  generateLocationKey,
  storageUtils 
} from './services/persistentStorage.js';

// Test data
const testLocation = {
  lat: 16.8661,
  lon: 96.1951,
  name: "Yangon, Myanmar",
  timestamp: Date.now()
};

const testWeatherData = {
  timelines: [{
    timestep: "1h",
    intervals: [{
      startTime: new Date().toISOString(),
      values: {
        temperature: 28,
        humidity: 75,
        windSpeed: 10,
        weatherCode: 1101,
        precipitationProbability: 30,
        precipitationType: 0,
        precipitationIntensity: 0
      }
    }]
  }]
};

// Test functions
export const testPersistentStorage = () => {
  // console.log('🧪 Testing Persistent Storage System...');
  
  try {
    // Test 1: Storage info
    // console.log('📊 Storage Info:', storageUtils.getStorageInfo());
    
    // Test 2: Location storage
    // console.log('📍 Testing location storage...');
    const locationSuccess = locationStorage.storeLocationData(testLocation);
    // console.log('Location store success:', locationSuccess);
    
    const retrievedLocation = locationStorage.getLocationData();
    // console.log('Retrieved location:', retrievedLocation);
    
    // Test 3: Weather data storage
    // console.log('🌤️ Testing weather data storage...');
    const locationKey = generateLocationKey(testLocation.lat, testLocation.lon);
    const weatherSuccess = weatherStorage.storeWeatherData(locationKey, testWeatherData);
    // console.log('Weather store success:', weatherSuccess);
    
    const retrievedWeather = weatherStorage.getWeatherData(locationKey);
    // console.log('Retrieved weather:', retrievedWeather);
    
    // Test 4: Cache freshness
    // console.log('⏰ Testing cache freshness...');
    // console.log('Weather data is fresh:', retrievedWeather?.isFresh);
    // console.log('Weather data age:', retrievedWeather?.age, 'ms');
    
    // Test 5: All locations
    // console.log('📍 All stored locations:', weatherStorage.getAllWeatherLocations());
    
    // Test 6: Storage maintenance
    // console.log('🔧 Testing storage maintenance...');
    storageUtils.performMaintenance();
    
    // console.log('✅ All tests completed successfully!');
    
    return {
      locationStorage: { success: locationSuccess, data: retrievedLocation },
      weatherStorage: { success: weatherSuccess, data: retrievedWeather },
      storageInfo: storageUtils.getStorageInfo()
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
};

// Test with mock data
export const testWithMockData = () => {
  // console.log('🎭 Testing with mock weather data...');
  
  const mockWeatherData = {
    timelines: [
      {
        timestep: "1h",
        intervals: Array.from({ length: 24 }, (_, i) => ({
          startTime: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
          values: {
            temperature: 25 + Math.random() * 10,
            humidity: 60 + Math.random() * 30,
            windSpeed: 5 + Math.random() * 15,
            weatherCode: Math.random() > 0.7 ? 4001 : 1101,
            precipitationProbability: Math.random() * 100,
            precipitationType: Math.random() > 0.8 ? 1 : 0,
            precipitationIntensity: Math.random() * 2
          }
        }))
      },
      {
        timestep: "1d",
        intervals: Array.from({ length: 7 }, (_, i) => ({
          startTime: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
          values: {
            temperatureMin: 20 + Math.random() * 5,
            temperatureMax: 30 + Math.random() * 8,
            weatherCodeMax: Math.random() > 0.6 ? 4001 : 1101,
            precipitationProbabilityMax: Math.random() * 100,
            humidityAvg: 65 + Math.random() * 20,
            windSpeedAvg: 8 + Math.random() * 10
          }
        }))
      }
    ]
  };
  
  const locations = [
    { lat: 16.8661, lon: 96.1951, name: "Yangon, Myanmar" },
    { lat: 21.9588, lon: 96.0891, name: "Mandalay, Myanmar" },
    { lat: 19.7633, lon: 96.0785, name: "Naypyidaw, Myanmar" }
  ];
  
  locations.forEach(location => {
    const locationKey = generateLocationKey(location.lat, location.lon);
    const success = weatherStorage.storeWeatherData(locationKey, mockWeatherData);
    // console.log(`Stored weather for ${location.name}:`, success);
  });
  
  // console.log('📊 Storage after mock data:', storageUtils.getStorageInfo());
  // console.log('📍 All locations:', weatherStorage.getAllWeatherLocations());
  
  return mockWeatherData;
};

// Test storage limits
export const testStorageLimits = () => {
  // console.log('🚫 Testing storage limits...');
  
  const largeData = {
    timelines: [{
      timestep: "1h",
      intervals: Array.from({ length: 1000 }, (_, i) => ({
        startTime: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
        values: {
          temperature: 25,
          humidity: 70,
          windSpeed: 10,
          weatherCode: 1101,
          precipitationProbability: 20,
          precipitationType: 0,
          precipitationIntensity: 0,
          // Add large data to test limits
          largeField: 'x'.repeat(10000) // 10KB of data
        }
      }))
    }]
  };
  
  const locationKey = generateLocationKey(0, 0);
  const success = weatherStorage.storeWeatherData(locationKey, largeData);
  // console.log('Large data storage success:', success);
  
  return success;
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testPersistentStorage = testPersistentStorage;
  window.testWithMockData = testWithMockData;
  window.testStorageLimits = testStorageLimits;
  
  // console.log('🧪 Persistent Storage Tests Available:');
  // console.log('- testPersistentStorage() - Basic functionality test');
  // console.log('- testWithMockData() - Test with realistic mock data');
  // console.log('- testStorageLimits() - Test storage limits and cleanup');
}

export default {
  testPersistentStorage,
  testWithMockData,
  testStorageLimits
};
