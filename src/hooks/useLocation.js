import { useState, useEffect } from "react";

export const useLocation = () => {
  const [coordinates, setCoordinates] = useState(() => {
    const saved = localStorage.getItem("weatherAppCoordinates");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (validateCoordinates(parsed)) {
          return parsed;
        }
        // If coordinates are invalid, remove them
        localStorage.removeItem("weatherAppCoordinates");
      } catch (e) {
        localStorage.removeItem("weatherAppCoordinates");
      }
    }
    return null;
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const validateCoordinates = (coords) => {
    if (!coords || typeof coords !== "object") return false;

    const lat = parseFloat(coords.latitude || coords.lat);
    const lon = parseFloat(coords.longitude || coords.lon);

    if (isNaN(lat) || isNaN(lon)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;

    return true;
  };

  const saveCoordinates = (coords) => {
    try {
      const lat = parseFloat(coords.latitude || coords.lat);
      const lon = parseFloat(coords.longitude || coords.lon);

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid coordinates");
      }

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error("Coordinates out of valid range");
      }

      const newCoordinates = { lat, lon };
      localStorage.setItem(
        "weatherAppCoordinates",
        JSON.stringify(newCoordinates)
      );
      setCoordinates(newCoordinates);
    } catch (e) {
      console.error("Error saving coordinates:", e);
      setError("Invalid coordinates provided");
      localStorage.removeItem("weatherAppCoordinates");
      setCoordinates(null);
    }
  };

  const detectLocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        saveCoordinates(position.coords);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);

        // If we have stored coordinates, use them as fallback
        const saved = localStorage.getItem("weatherAppCoordinates");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (validateCoordinates(parsed)) {
              setCoordinates(parsed);
            } else {
              localStorage.removeItem("weatherAppCoordinates");
            }
          } catch (e) {
            localStorage.removeItem("weatherAppCoordinates");
          }
        }
      },
      { enableHighAccuracy: true }
    );
  };

  const setManualLocation = (lat, lon) => {
    saveCoordinates({ lat, lon });
  };

  // Detect location on mount if we don't have stored coordinates
  useEffect(() => {
    if (!coordinates) {
      detectLocation();
    } else {
      setIsLoading(false);
    }
  }, []);

  return {
    coordinates,
    error,
    isLoading,
    detectLocation,
    setManualLocation,
  };
};
