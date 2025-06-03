import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";

const WeatherAnimation = ({ condition }) => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        let animationName = "clear";

        // Map weather codes to animation names
        switch (condition) {
          case 1000: // Clear
            animationName = "clear";
            break;
          case 1100: // Mostly Clear
          case 1101: // Partly Cloudy
            animationName = "partly-cloudy";
            break;
          case 4000: // Light Rain
            animationName = "light-rain";
            break;
          case 4001: // Rain
          case 4200: // Heavy Rain
            animationName = "heavy-rain";
            break;
          default:
            animationName = "clear";
        }

        // Import animation dynamically
        const animation = await import(
          `../../assets/animations/${animationName}.json`
        );
        setAnimationData(animation.default);
      } catch (error) {
        console.error("Error loading weather animation:", error);
        // Fallback to emoji if animation fails to load
        setAnimationData(null);
      }
    };

    loadAnimation();
  }, [condition]);

  if (!animationData) {
    // Fallback to emoji if no animation is loaded
    return (
      <div className="text-3xl sm:text-4xl w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
        {getWeatherEmoji(condition)}
      </div>
    );
  }

  return (
    <div className="w-12 h-12 sm:w-16 sm:h-16">
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: "100%", height: "100%" }}
        className="drop-shadow-xl"
      />
    </div>
  );
};

// Helper function to get weather emoji based on condition code
const getWeatherEmoji = (code) => {
  switch (code) {
    case 1000: // Clear
      return "☀️";
    case 1100: // Mostly Clear
    case 1101: // Partly Cloudy
      return "⛅";
    case 4000: // Light Rain
      return "🌦️";
    case 4001: // Rain
      return "🌧️";
    case 4200: // Heavy Rain
      return "⛈️";
    default:
      return "🌤️";
  }
};

export default WeatherAnimation;
