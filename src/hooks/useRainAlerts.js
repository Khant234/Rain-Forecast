import { useEffect, useCallback, useRef } from 'react';
import { rainNotificationService } from '../services/notificationService';

export const useRainAlerts = (weatherData, location, language) => {
  const lastCheckRef = useRef(null);
  const processedEventsRef = useRef(new Set());

  // Process weather data and check for rain alerts
  const checkForRainAlerts = useCallback(async () => {
    if (!weatherData || !location || !Array.isArray(weatherData)) {
      return;
    }

    const settings = rainNotificationService.getSettings();
    if (!settings.enabled || rainNotificationService.getPermissionStatus() !== 'granted') {
      return;
    }

    const now = new Date();
    const alertWindowMs = settings.timingMinutes * 60 * 1000; // Convert to milliseconds

    try {
      // Find rain events within the alert window
      const upcomingRainEvents = weatherData
        .filter(interval => {
          const intervalTime = new Date(interval.startTime);
          const timeDiff = intervalTime - now;
          
          // Check if this interval is within our alert window
          if (timeDiff < 0 || timeDiff > alertWindowMs) {
            return false;
          }

          // Check if rain probability meets threshold
          const precipProb = interval.values.precipitationProbability || 0;
          if (precipProb < settings.rainThreshold) {
            return false;
          }

          // Create unique event ID to prevent duplicate notifications
          const eventId = `${interval.startTime}_${precipProb}_${Math.round(location.lat)}_${Math.round(location.lon)}`;
          
          // Skip if we've already processed this event
          if (processedEventsRef.current.has(eventId)) {
            return false;
          }

          return true;
        })
        .map(interval => {
          const intervalTime = new Date(interval.startTime);
          const minutesUntilRain = (intervalTime - now) / (1000 * 60);
          
          return {
            startTime: interval.startTime,
            precipitationProbability: interval.values.precipitationProbability || 0,
            precipitationType: interval.values.precipitationType || 0,
            minutesUntilRain: Math.max(0, minutesUntilRain),
            lat: location.lat,
            lon: location.lon,
            eventId: `${interval.startTime}_${interval.values.precipitationProbability}_${Math.round(location.lat)}_${Math.round(location.lon)}`
          };
        });

      // Send notifications for new rain events
      for (const rainEvent of upcomingRainEvents) {
        try {
          const notificationSent = await rainNotificationService.sendRainNotification(rainEvent);
          
          if (notificationSent) {
            // Mark this event as processed
            processedEventsRef.current.add(rainEvent.eventId);
            // // // // console.log('🌧️ Rain alert sent for event:', rainEvent);
          }
        } catch (error) {
          console.error('Error sending rain notification:', error);
        }
      }

      // Clean up old processed events (older than 2 hours)
      const twoHoursAgo = now - (2 * 60 * 60 * 1000);
      const currentEvents = new Set();
      
      for (const eventId of processedEventsRef.current) {
        const eventTime = new Date(eventId.split('_')[0]);
        if (eventTime > twoHoursAgo) {
          currentEvents.add(eventId);
        }
      }
      
      processedEventsRef.current = currentEvents;

    } catch (error) {
      console.error('Error checking for rain alerts:', error);
    }
  }, [weatherData, location, language]);

  // Update notification language when app language changes
  useEffect(() => {
    const settings = rainNotificationService.getSettings();
    if (settings.language !== language) {
      rainNotificationService.updateSettings({ language });
    }
  }, [language]);

  // Check for rain alerts when weather data changes
  useEffect(() => {
    const currentCheck = Date.now();
    
    // Prevent too frequent checks (minimum 30 seconds between checks)
    if (lastCheckRef.current && (currentCheck - lastCheckRef.current) < 30000) {
      return;
    }

    lastCheckRef.current = currentCheck;
    checkForRainAlerts();
  }, [checkForRainAlerts]);

  // Set up periodic checking (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkForRainAlerts();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [checkForRainAlerts]);

  // Return utility functions for manual control
  return {
    checkForRainAlerts,
    sendTestNotification: (testLanguage = language) => 
      rainNotificationService.sendTestNotification(testLanguage),
    getNotificationSettings: () => rainNotificationService.getSettings(),
    updateNotificationSettings: (newSettings) => 
      rainNotificationService.updateSettings(newSettings),
    getPermissionStatus: () => rainNotificationService.getPermissionStatus(),
    requestPermission: () => rainNotificationService.requestPermission()
  };
};

export default useRainAlerts;
