/**
 * API Provider Manager
 * Manages multiple weather API providers with intelligent fallback mechanisms
 * Supports Tomorrow.io, OpenWeatherMap, and mock data fallbacks
 */

import openWeatherMapService from "../services/openWeatherMapService.js";
import { transformOpenWeatherMapData } from "./openWeatherMapTransformer.js";
import { dataValidators } from "./storageManager.js";

// Provider configuration
const PROVIDERS = {
  TOMORROW_IO: "tomorrow_io",
  OPENWEATHERMAP: "openweathermap",
  MOCK: "mock",
};

// Provider priority order (first = highest priority)
const DEFAULT_PROVIDER_ORDER = [
  PROVIDERS.TOMORROW_IO,
  PROVIDERS.OPENWEATHERMAP,
  PROVIDERS.MOCK,
];

// Provider status tracking
const providerStatus = {
  [PROVIDERS.TOMORROW_IO]: { available: true, lastError: null, errorCount: 0 },
  [PROVIDERS.OPENWEATHERMAP]: { available: true, lastError: null, errorCount: 0 },
  [PROVIDERS.MOCK]: { available: true, lastError: null, errorCount: 0 },
};

// Configuration
const CONFIG = {
  maxErrorsBeforeDisable: 3,
  providerCooldownTime: 5 * 60 * 1000, // 5 minutes
  fallbackTimeout: 10000, // 10 seconds per provider
};

/**
 * Check if a provider is currently available
 */
const isProviderAvailable = (provider) => {
  const status = providerStatus[provider];
  if (!status) return false;
  
  // If provider has too many errors, check if cooldown period has passed
  if (status.errorCount >= CONFIG.maxErrorsBeforeDisable) {
    const cooldownExpired = Date.now() - status.lastErrorTime > CONFIG.providerCooldownTime;
    if (cooldownExpired) {
      // Reset error count after cooldown
      status.errorCount = 0;
      status.available = true;
      console.log(`🔄 Provider ${provider} cooldown expired, re-enabling`);
    }
    return cooldownExpired;
  }
  
  return status.available;
};

/**
 * Mark provider as failed
 */
const markProviderFailed = (provider, error) => {
  const status = providerStatus[provider];
  if (status) {
    status.errorCount++;
    status.lastError = error.message;
    status.lastErrorTime = Date.now();
    
    if (status.errorCount >= CONFIG.maxErrorsBeforeDisable) {
      status.available = false;
      console.warn(`⚠️ Provider ${provider} disabled due to ${status.errorCount} consecutive errors`);
    }
  }
};

/**
 * Mark provider as successful
 */
const markProviderSuccess = (provider) => {
  const status = providerStatus[provider];
  if (status) {
    status.errorCount = 0;
    status.lastError = null;
    status.available = true;
  }
};

/**
 * Get available providers in priority order
 */
export const getAvailableProviders = () => {
  return DEFAULT_PROVIDER_ORDER.filter(provider => {
    if (provider === PROVIDERS.OPENWEATHERMAP) {
      return isProviderAvailable(provider) && openWeatherMapService.isOpenWeatherMapConfigured();
    }
    return isProviderAvailable(provider);
  });
};

/**
 * Fetch weather data from Tomorrow.io (existing implementation)
 */
const fetchFromTomorrowIO = async (lat, lon, fetchFunction) => {
  try {
    console.log("🌤️ Attempting to fetch from Tomorrow.io...");
    const data = await fetchFunction(lat, lon);
    markProviderSuccess(PROVIDERS.TOMORROW_IO);
    return {
      data,
      provider: PROVIDERS.TOMORROW_IO,
      success: true,
    };
  } catch (error) {
    console.error("❌ Tomorrow.io fetch failed:", error.message);
    markProviderFailed(PROVIDERS.TOMORROW_IO, error);
    throw error;
  }
};

/**
 * Fetch weather data from OpenWeatherMap
 */
const fetchFromOpenWeatherMap = async (lat, lon) => {
  try {
    console.log("🌤️ Attempting to fetch from OpenWeatherMap...");
    
    if (!openWeatherMapService.isOpenWeatherMapConfigured()) {
      throw new Error("OpenWeatherMap API not configured");
    }
    
    const owmData = await openWeatherMapService.fetchComprehensiveWeatherData(lat, lon);
    const transformedData = transformOpenWeatherMapData(owmData);
    
    markProviderSuccess(PROVIDERS.OPENWEATHERMAP);
    return {
      data: transformedData,
      provider: PROVIDERS.OPENWEATHERMAP,
      success: true,
    };
  } catch (error) {
    console.error("❌ OpenWeatherMap fetch failed:", error.message);
    markProviderFailed(PROVIDERS.OPENWEATHERMAP, error);
    throw error;
  }
};

/**
 * Fetch weather data from mock provider
 */
const fetchFromMock = async (lat, lon, mockFunction) => {
  try {
    console.log("🌤️ Attempting to fetch from mock data...");
    const data = await mockFunction(lat, lon);
    markProviderSuccess(PROVIDERS.MOCK);
    return {
      data,
      provider: PROVIDERS.MOCK,
      success: true,
    };
  } catch (error) {
    console.error("❌ Mock data fetch failed:", error.message);
    markProviderFailed(PROVIDERS.MOCK, error);
    throw error;
  }
};

/**
 * Fetch weather data with intelligent provider fallback
 */
export const fetchWeatherDataWithFallback = async (lat, lon, tomorrowIOFetch, mockDataFetch) => {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    throw new Error("No weather data providers available");
  }
  
  console.log(`🔄 Available providers: ${availableProviders.join(", ")}`);
  
  let lastError = null;
  
  for (const provider of availableProviders) {
    try {
      let result;
      
      switch (provider) {
        case PROVIDERS.TOMORROW_IO:
          result = await fetchFromTomorrowIO(lat, lon, tomorrowIOFetch);
          break;
          
        case PROVIDERS.OPENWEATHERMAP:
          result = await fetchFromOpenWeatherMap(lat, lon);
          break;
          
        case PROVIDERS.MOCK:
          result = await fetchFromMock(lat, lon, mockDataFetch);
          break;
          
        default:
          console.warn(`⚠️ Unknown provider: ${provider}`);
          continue;
      }
      
      // Validate the data before returning
      if (result.data && dataValidators.isValidWeatherData(result.data)) {
        console.log(`✅ Successfully fetched weather data from ${provider}`);
        return result;
      } else {
        throw new Error(`Invalid data structure from ${provider}`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Provider ${provider} failed: ${error.message}`);
      lastError = error;
      continue;
    }
  }
  
  // If all providers failed, throw the last error
  throw new Error(`All weather data providers failed. Last error: ${lastError?.message || "Unknown error"}`);
};

/**
 * Get provider status information
 */
export const getProviderStatus = () => {
  return {
    providers: { ...providerStatus },
    availableProviders: getAvailableProviders(),
    configuration: {
      tomorrowIO: {
        configured: true, // Assume configured if we reach this point
      },
      openWeatherMap: {
        configured: openWeatherMapService.isOpenWeatherMapConfigured(),
      },
      mock: {
        configured: true, // Always available
      },
    },
  };
};

/**
 * Reset provider status (useful for testing or manual recovery)
 */
export const resetProviderStatus = () => {
  Object.keys(providerStatus).forEach(provider => {
    providerStatus[provider] = {
      available: true,
      lastError: null,
      errorCount: 0,
    };
  });
  console.log("🔄 All provider statuses reset");
};

/**
 * Test all configured providers
 */
export const testAllProviders = async () => {
  const results = {};
  
  // Test Tomorrow.io (assume it's tested elsewhere)
  results[PROVIDERS.TOMORROW_IO] = {
    configured: true,
    available: isProviderAvailable(PROVIDERS.TOMORROW_IO),
    status: providerStatus[PROVIDERS.TOMORROW_IO],
  };
  
  // Test OpenWeatherMap
  if (openWeatherMapService.isOpenWeatherMapConfigured()) {
    try {
      const testResult = await openWeatherMapService.testOpenWeatherMapAPI();
      results[PROVIDERS.OPENWEATHERMAP] = {
        configured: true,
        available: testResult.success,
        status: testResult.success ? "Working" : testResult.error,
      };
    } catch (error) {
      results[PROVIDERS.OPENWEATHERMAP] = {
        configured: true,
        available: false,
        status: error.message,
      };
    }
  } else {
    results[PROVIDERS.OPENWEATHERMAP] = {
      configured: false,
      available: false,
      status: "API key not configured",
    };
  }
  
  // Mock is always available
  results[PROVIDERS.MOCK] = {
    configured: true,
    available: true,
    status: "Always available",
  };
  
  return results;
};

export default {
  PROVIDERS,
  fetchWeatherDataWithFallback,
  getAvailableProviders,
  getProviderStatus,
  resetProviderStatus,
  testAllProviders,
};
