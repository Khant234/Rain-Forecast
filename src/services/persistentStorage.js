/**
 * Persistent Storage Service for Weather Data
 * Provides comprehensive browser storage for weather data with intelligent caching,
 * data validation, and graceful error handling.
 */

// Storage keys
const STORAGE_KEYS = {
  WEATHER_DATA: 'weather_data_v2',
  LOCATION_DATA: 'location_data_v2',
  USER_PREFERENCES: 'user_preferences_v2',
  NOTIFICATION_SETTINGS: 'notification_settings_v2',
  CACHE_METADATA: 'cache_metadata_v2'
};

// Cache duration policies (in milliseconds)
const CACHE_DURATIONS = {
  WEATHER_DATA: 30 * 60 * 1000,      // 30 minutes
  LOCATION_DATA: 60 * 60 * 1000,     // 1 hour
  USER_PREFERENCES: 7 * 24 * 60 * 60 * 1000, // 7 days
  NOTIFICATION_SETTINGS: 30 * 24 * 60 * 60 * 1000, // 30 days
  STALE_THRESHOLD: 5 * 60 * 1000     // 5 minutes (for background refresh)
};

// Storage quota limits
const STORAGE_LIMITS = {
  MAX_WEATHER_ENTRIES: 5,
  MAX_TOTAL_SIZE: 5 * 1024 * 1024,   // 5MB
  CLEANUP_THRESHOLD: 0.8              // Clean up when 80% full
};

/**
 * Storage utility functions
 */
class StorageManager {
  constructor() {
    this.isAvailable = this.checkStorageAvailability();
    this.storageType = this.determineStorageType();
  }

  checkStorageAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available, falling back to sessionStorage');
      try {
        const test = '__storage_test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
      } catch (e) {
        console.error('No storage available');
        return false;
      }
    }
  }

  determineStorageType() {
    try {
      localStorage.setItem('__test__', '__test__');
      localStorage.removeItem('__test__');
      return localStorage;
    } catch (e) {
      return sessionStorage;
    }
  }

  getItem(key) {
    if (!this.isAvailable) return null;
    try {
      const item = this.storageType.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      this.removeItem(key); // Remove corrupted data
      return null;
    }
  }

  setItem(key, value) {
    if (!this.isAvailable) return false;
    try {
      const serialized = JSON.stringify(value);
      
      // Check storage quota before writing
      if (this.checkStorageQuota(serialized.length)) {
        this.storageType.setItem(key, serialized);
        this.updateCacheMetadata(key, serialized.length);
        return true;
      } else {
        console.warn('Storage quota exceeded, cleaning up...');
        this.cleanupStorage();
        // Try again after cleanup
        if (this.checkStorageQuota(serialized.length)) {
          this.storageType.setItem(key, serialized);
          this.updateCacheMetadata(key, serialized.length);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`Error writing to storage (${key}):`, error);
      if (error.name === 'QuotaExceededError') {
        this.cleanupStorage();
        return this.setItem(key, value); // Retry once
      }
      return false;
    }
  }

  removeItem(key) {
    if (!this.isAvailable) return;
    try {
      this.storageType.removeItem(key);
      this.updateCacheMetadata(key, 0, true);
    } catch (error) {
      console.error(`Error removing from storage (${key}):`, error);
    }
  }

  checkStorageQuota(newDataSize) {
    try {
      const used = this.getStorageUsage();
      return (used + newDataSize) < STORAGE_LIMITS.MAX_TOTAL_SIZE;
    } catch (error) {
      return true; // Assume it's okay if we can't check
    }
  }

  getStorageUsage() {
    let total = 0;
    for (let key in this.storageType) {
      if (this.storageType.hasOwnProperty(key)) {
        total += this.storageType[key].length;
      }
    }
    return total;
  }

  updateCacheMetadata(key, size, isRemoval = false) {
    const metadata = this.getItem(STORAGE_KEYS.CACHE_METADATA) || {};
    if (isRemoval) {
      delete metadata[key];
    } else {
      metadata[key] = {
        size,
        lastAccessed: Date.now()
      };
    }
    this.setItem(STORAGE_KEYS.CACHE_METADATA, metadata);
  }

  cleanupStorage() {
    // // console.log('🧹 Cleaning up storage...');
    const metadata = this.getItem(STORAGE_KEYS.CACHE_METADATA) || {};
    
    // Sort by last accessed time (oldest first)
    const entries = Object.entries(metadata)
      .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest entries until we're under the threshold
    const currentUsage = this.getStorageUsage();
    const targetUsage = STORAGE_LIMITS.MAX_TOTAL_SIZE * STORAGE_LIMITS.CLEANUP_THRESHOLD;
    
    let removedSize = 0;
    for (const [key, data] of entries) {
      if (currentUsage - removedSize <= targetUsage) break;
      
      // Don't remove critical data
      if (!key.includes('weather_data') && !key.includes('location_data')) {
        this.removeItem(key);
        removedSize += data.size;
      }
    }
    
    // // console.log(`🧹 Cleaned up ${removedSize} bytes`);
  }
}

// Create singleton instance
const storage = new StorageManager();

/**
 * Weather Data Storage Functions
 */
export const weatherStorage = {
  /**
   * Store complete weather dataset
   */
  storeWeatherData(locationKey, weatherData) {
    const dataToStore = {
      locationKey,
      data: weatherData,
      timestamp: Date.now(),
      version: '2.0'
    };
    
    const success = storage.setItem(`${STORAGE_KEYS.WEATHER_DATA}_${locationKey}`, dataToStore);
    if (success) {
      // // console.log('💾 Weather data stored for:', locationKey);
    }
    return success;
  },

  /**
   * Retrieve weather data for a location
   */
  getWeatherData(locationKey) {
    const stored = storage.getItem(`${STORAGE_KEYS.WEATHER_DATA}_${locationKey}`);
    if (!stored) return null;

    const age = Date.now() - stored.timestamp;
    
    // Return data with freshness info
    return {
      data: stored.data,
      timestamp: stored.timestamp,
      age,
      isFresh: age < CACHE_DURATIONS.WEATHER_DATA,
      isStale: age > CACHE_DURATIONS.STALE_THRESHOLD,
      locationKey: stored.locationKey
    };
  },

  /**
   * Check if weather data exists and is fresh
   */
  hasValidWeatherData(locationKey) {
    const stored = this.getWeatherData(locationKey);
    return stored && stored.isFresh;
  },

  /**
   * Get all stored weather data locations
   */
  getAllWeatherLocations() {
    const locations = [];
    for (let i = 0; i < storage.storageType.length; i++) {
      const key = storage.storageType.key(i);
      if (key && key.startsWith(STORAGE_KEYS.WEATHER_DATA)) {
        const locationKey = key.replace(`${STORAGE_KEYS.WEATHER_DATA}_`, '');
        locations.push(locationKey);
      }
    }
    return locations;
  },

  /**
   * Clear old weather data
   */
  clearOldWeatherData() {
    const locations = this.getAllWeatherLocations();
    const now = Date.now();
    
    locations.forEach(locationKey => {
      const stored = this.getWeatherData(locationKey);
      if (stored && (now - stored.timestamp) > CACHE_DURATIONS.WEATHER_DATA * 2) {
        storage.removeItem(`${STORAGE_KEYS.WEATHER_DATA}_${locationKey}`);
        // // console.log('🗑️ Removed old weather data for:', locationKey);
      }
    });
  }
};

/**
 * Location Data Storage Functions
 */
export const locationStorage = {
  storeLocationData(locationData) {
    const dataToStore = {
      ...locationData,
      timestamp: Date.now(),
      version: '2.0'
    };
    
    const success = storage.setItem(STORAGE_KEYS.LOCATION_DATA, dataToStore);
    if (success) {
      // // console.log('📍 Location data stored:', locationData.name || 'Unknown');
    }
    return success;
  },

  getLocationData() {
    const stored = storage.getItem(STORAGE_KEYS.LOCATION_DATA);
    if (!stored) return null;

    const age = Date.now() - stored.timestamp;
    
    return {
      ...stored,
      age,
      isFresh: age < CACHE_DURATIONS.LOCATION_DATA
    };
  },

  clearLocationData() {
    storage.removeItem(STORAGE_KEYS.LOCATION_DATA);
    // // console.log('🗑️ Location data cleared');
  }
};

/**
 * Generate location key for caching
 */
export const generateLocationKey = (lat, lon) => {
  // Round to 2 decimal places for nearby location caching
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  return `${roundedLat}_${roundedLon}`;
};

/**
 * Utility functions
 */
export const storageUtils = {
  getStorageInfo() {
    return {
      isAvailable: storage.isAvailable,
      storageType: storage.storageType === localStorage ? 'localStorage' : 'sessionStorage',
      usage: storage.getStorageUsage(),
      limit: STORAGE_LIMITS.MAX_TOTAL_SIZE,
      usagePercentage: (storage.getStorageUsage() / STORAGE_LIMITS.MAX_TOTAL_SIZE) * 100
    };
  },

  clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
      storage.removeItem(key);
    });
    
    // Clear weather data for all locations
    weatherStorage.getAllWeatherLocations().forEach(locationKey => {
      storage.removeItem(`${STORAGE_KEYS.WEATHER_DATA}_${locationKey}`);
    });
    
    // // console.log('🗑️ All persistent data cleared');
  },

  performMaintenance() {
    // // console.log('🔧 Performing storage maintenance...');
    weatherStorage.clearOldWeatherData();
    storage.cleanupStorage();
    // // console.log('✅ Storage maintenance completed');
  }
};

export default {
  weatherStorage,
  locationStorage,
  generateLocationKey,
  storageUtils,
  CACHE_DURATIONS
};
