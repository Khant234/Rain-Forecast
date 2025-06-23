// Rain Alert Notification Service
const NOTIFICATION_SETTINGS_KEY = "rain_notification_settings";
const NOTIFICATION_HISTORY_KEY = "rain_notification_history";

// Default notification settings
const DEFAULT_SETTINGS = {
  enabled: false,
  rainThreshold: 70, // percentage
  timingMinutes: 15, // minutes before rain
  language: "en",
  testMode: false,
};

// Notification cooldown to prevent spam (30 minutes)
const NOTIFICATION_COOLDOWN = 30 * 60 * 1000;

// Function to sanitize text to prevent XSS
function sanitizeText(text) {
  const cleanText = String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return cleanText;
}

export class RainNotificationService {
  constructor() {
    this.settings = this.loadSettings();
    this.notificationHistory = this.loadNotificationHistory();
    this.permissionStatus = "default";
    this.checkPermissionStatus();
  }

  // Load notification settings from localStorage
  loadSettings() {
    try {
      const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return stored
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
        : DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Error loading notification settings:", error);
      return DEFAULT_SETTINGS;
    }
  }

  // Save notification settings to localStorage
  saveSettings(newSettings) {
    try {
      // Validate settings before saving
      if (!this.validateSettings(newSettings)) {
        console.error("Invalid notification settings provided.");
        return;
      }

      this.settings = { ...this.settings, ...newSettings };
      localStorage.setItem(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify(this.settings)
      );
      console.log("📱 Notification settings saved:", this.settings);
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  }

  // Validate notification settings
  validateSettings(settings) {
    // Add validation rules here as needed
    if (typeof settings !== 'object' || settings === null) {
      return false;
    }

    return true;
  }

  // Load notification history
  loadNotificationHistory() {
    try {
      const stored = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading notification history:", error);
      return [];
    }
  }

  // Save notification to history
  saveNotificationToHistory(notification) {
    try {
      this.notificationHistory.push({
        ...notification,
        timestamp: Date.now(),
      });

      // Keep only last 50 notifications
      if (this.notificationHistory.length > 50) {
        this.notificationHistory = this.notificationHistory.slice(-50);
      }

      localStorage.setItem(
        NOTIFICATION_HISTORY_KEY,
        JSON.stringify(this.notificationHistory)
      );
    } catch (error) {
      console.error("Error saving notification history:", error);
    }
  }

  // Check current permission status
  async checkPermissionStatus() {
    if (!("Notification" in window)) {
      this.permissionStatus = "unsupported";
      return "unsupported";
    }

    this.permissionStatus = Notification.permission;
    return this.permissionStatus;
  }

  // Request notification permission
  async requestPermission() {
    if (!("Notification" in window)) {
      throw new Error("Notifications are not supported in this browser");
    }

    if (Notification.permission === "granted") {
      this.permissionStatus = "granted";
      return "granted";
    }

    if (Notification.permission === "denied") {
      this.permissionStatus = "denied";
      throw new Error(
        "Notifications are blocked. Please enable them in browser settings."
      );
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;

      if (permission === "granted") {
        console.log("✅ Notification permission granted");
        return "granted";
      } else {
        throw new Error("Notification permission denied");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      throw error;
    }
  }

  // Check if we should send notification (cooldown logic)
  shouldSendNotification(rainEvent) {
    try {
      const now = Date.now();
      const eventKey = `${Math.round(rainEvent.lat)}_${Math.round(
        rainEvent.lon
      )}_${rainEvent.startTime}`;

      // Check if we've already sent a notification for this event recently
      const recentNotification = this.notificationHistory.find(
        (notification) =>
          notification.eventKey === eventKey &&
          now - notification.timestamp < NOTIFICATION_COOLDOWN
      );

      return !recentNotification;
    } catch (error) {
      console.error("Error checking notification status:", error);
      return false;
    }
  }

  // Get weather emoji based on precipitation data
  getWeatherEmoji(precipitationType, precipitationProbability) {
    try {
      // Only show rain icons for significant precipitation probability
      if (precipitationType > 0 && precipitationProbability > 60) return "🌧️";
      if (precipitationProbability > 70) return "🌦️";
      return "☀️";
    } catch (error) {
      console.error("Error getting weather emoji:", error);
      return "☀️"; // Default emoji in case of error
    }
  }

  // Format time until rain
  formatTimeUntilRain(minutes, language = "en") {
    try {
      if (minutes < 1) {
        return language === "mm" ? "ယခုပင်" : "now";
      }

      if (minutes < 60) {
        return language === "mm"
          ? `${Math.round(minutes)} မိနစ်အတွင်း`
          : `in ${Math.round(minutes)} minutes`;
      }

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);

      if (language === "mm") {
        return remainingMinutes > 0
          ? `${hours} နာရီ ${remainingMinutes} မိနစ်အတွင်း`
          : `${hours} နာရီအတွင်း`;
      } else {
        return remainingMinutes > 0
          ? `in ${hours}h ${remainingMinutes}m`
          : `in ${hours} hour${hours > 1 ? "s" : ""}`;
      }
    } catch (error) {
      console.error("Error formatting time until rain:", error);
      return ""; // Return an empty string or default value
    }
  }

  // Get actionable advice based on rain probability and timing
  getActionableAdvice(
    precipitationProbability,
    minutesUntilRain,
    language = "en"
  ) {
    try {
      if (language === "mm") {
        if (minutesUntilRain <= 5) {
          return precipitationProbability > 80
            ? "ချက်ချင်း အမိုးအကာရှာပါ"
            : "ထီးကို အသင့်ပြင်ထားပါ";
        } else if (minutesUntilRain <= 15) {
          return precipitationProbability > 80
            ? "ထီးယူသွားပါ"
            : "ထီးကို စဉ်းစားပါ";
        } else {
          return "မိုးရွာနိုင်သည်ကို သတိပြုပါ";
        }
      } else {
        if (minutesUntilRain <= 5) {
          return precipitationProbability > 80
            ? "Seek shelter immediately"
            : "Get your umbrella ready";
        } else if (minutesUntilRain <= 15) {
          return precipitationProbability > 80
            ? "Bring an umbrella"
            : "Consider bringing an umbrella";
        } else {
          return "Plan accordingly for possible rain";
        }
      }
    } catch (error) {
      console.error("Error getting actionable advice:", error);
      return ""; // Default advice in case of error
    }
  }

  // Create notification content
  createNotificationContent(rainEvent, language = "en") {
    try {
      const { precipitationProbability, minutesUntilRain, precipitationType } = rainEvent;
      const emoji = this.getWeatherEmoji(
        precipitationType,
        precipitationProbability
      );
      const timeText = this.formatTimeUntilRain(minutesUntilRain, language);
      const advice = this.getActionableAdvice(
        precipitationProbability,
        minutesUntilRain,
        language
      );

      // Sanitize potentially unsafe strings
      const safePrecipitationProbability = sanitizeText(precipitationProbability);
      const safeTimeText = sanitizeText(timeText);
      const safeAdvice = sanitizeText(advice);

      if (language === "mm") {
        return {
          title: `${emoji} မိုးရွာမည်ဖြစ်သည်`,
          body: `မိုးရွာနိုင်ခြေ: ${safePrecipitationProbability} %\n${safeTimeText}\n${safeAdvice}`,
          icon: "/icons/icon-144x144.png",
          tag: "rain-alert",
          requireInteraction: true,
        };
      } else {
        return {
          title: `${emoji} Rain Alert`,
          body: `${safePrecipitationProbability} % chance of rain ${safeTimeText}\n${safeAdvice}`,
          icon: "/icons/icon-144x144.png",
          tag: "rain-alert",
          requireInteraction: true,
        };
      }
    } catch (error) {
      console.error("Error creating notification content:", error);
      return null; // Or a default notification object
    }
  }

  // Send rain notification
  async sendRainNotification(rainEvent) {
    if (!this.settings.enabled) {
      console.log("📱 Notifications disabled");
      return false;
    }

    if (this.permissionStatus !== "granted") {
      console.log("📱 Notification permission not granted");
      return false;
    }

    if (!this.shouldSendNotification(rainEvent)) {
      console.log("📱 Notification cooldown active");
      return false;
    }

    try {
      const content = this.createNotificationContent(
        rainEvent,
        this.settings.language
      );

      if (!content) {
        console.warn("Notification content is null, not sending notification");
        return false;
      }

      const notification = new Notification(content.title, content);

      // Save to history
      const eventKey = `${Math.round(rainEvent.lat)}_${Math.round(
        rainEvent.lon
      )}_${rainEvent.startTime}`;
      this.saveNotificationToHistory({
        ...content,
        eventKey,
        rainEvent,
      });

      console.log("📱 Rain notification sent:", content);
      return true;
    } catch (error) {
      console.error("Error sending notification:", error);
      return false;
    }
  }

  // Send test notification
  async sendTestNotification(language = "en") {
    if (this.permissionStatus !== "granted") {
      throw new Error("Notification permission not granted");
    }

    const testEvent = {
      precipitationProbability: 85,
      minutesUntilRain: 12,
      precipitationType: 1,
      lat: 16.8661,
      lon: 96.1951,
      startTime: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
    };

    const content = this.createNotificationContent(testEvent, language);

    if (!content) {
      console.warn("Test notification content is null, not sending notification");
      return false;
    }

    content.title =
      language === "mm"
        ? "🧪 စမ်းသပ်မှု - " + content.title
        : "🧪 Test - " + content.title;

    try {
      new Notification(content.title, content);
      console.log("📱 Test notification sent");
      return true;
    } catch (error) {
      console.error("Error sending test notification:", error);
      throw error;
    }
  }

  // Get current settings
  getSettings() {
    return { ...this.settings };
  }

  // Update settings
  updateSettings(newSettings) {
    this.saveSettings(newSettings);
  }

  // Get permission status
  getPermissionStatus() {
    return this.permissionStatus;
  }

  // Clear notification history
  clearHistory() {
    this.notificationHistory = [];
    localStorage.removeItem(NOTIFICATION_HISTORY_KEY);
    console.log("📱 Notification history cleared");
  }
}

// Export singleton instance
export const rainNotificationService = new RainNotificationService();