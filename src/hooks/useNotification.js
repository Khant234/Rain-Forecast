import { useState, useEffect, useCallback } from "react";

export const useNotification = () => {
  const [permission, setPermission] = useState("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error("Notifications are not supported in this browser");
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      throw error;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    ({ title, body, icon = "/weather-icon.png", ...options }) => {
      if (!isSupported || permission !== "granted") {
        return;
      }

      try {
        const notification = new Notification(title, {
          body,
          icon,
          badge: icon,
          timestamp: Date.now(),
          vibrate: [200, 100, 200],
          ...options,
        });

        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        // Handle click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    },
    [isSupported, permission]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
};
