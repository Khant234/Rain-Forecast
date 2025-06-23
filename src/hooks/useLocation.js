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
        throw new Error(