/**
 * Rain chance formatting utility
 * Converts precipitation probability percentages to more user-friendly descriptive labels
 */

/**
 * Normalize and round precipitation probability value
 * @param {number} percentage - Raw precipitation probability (may have many decimal places)
 * @returns {number} Rounded percentage (0-100)
 */
export const normalizePrecipitationProbability = (percentage) => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return 0;
  }

  // Ensure the value is within valid range and round to whole number
  return Math.max(0, Math.min(100, Math.round(percentage)));
};

/**
 * Format rain chance with descriptive labels
 * @param {number} percentage - Precipitation probability percentage (0-100)
 * @param {string} language - Language code ('en' or 'mm')
 * @param {boolean} showPercentage - Whether to show percentage alongside label
 * @param {string} format - Display format ('full', 'short', 'label-only')
 * @returns {string} Formatted rain chance string
 */
export const formatRainChance = (
  percentage,
  language = "en",
  showPercentage = true,
  format = "full"
) => {
  if (percentage === null || percentage === undefined || isNaN(percentage))
    return "";

  // Normalize and round percentage to whole number for display
  const roundedPercentage = normalizePrecipitationProbability(percentage);

  const ranges = {
    en: {
      veryLow: { min: 0, max: 20, label: "Very Low", short: "V.Low" },
      low: { min: 21, max: 40, label: "Low", short: "Low" },
      moderate: { min: 41, max: 60, label: "Moderate", short: "Mod" },
      high: { min: 61, max: 80, label: "High", short: "High" },
      veryHigh: { min: 81, max: 100, label: "Very High", short: "V.High" },
    },
    mm: {
      veryLow: { min: 0, max: 20, label: "အလွန်နည်း", short: "အလွန်နည်း" },
      low: { min: 21, max: 40, label: "နည်း", short: "နည်း" },
      moderate: { min: 41, max: 60, label: "အလယ်အလတ်", short: "အလယ်" },
      high: { min: 61, max: 80, label: "မြင့်", short: "မြင့်" },
      veryHigh: { min: 81, max: 100, label: "အလွန်မြင့်", short: "အလွန်မြင့်" },
    },
  };

  const currentRanges = ranges[language] || ranges.en;
  let rangeData = null;

  // Use rounded percentage for range determination
  for (const [key, range] of Object.entries(currentRanges)) {
    if (roundedPercentage >= range.min && roundedPercentage <= range.max) {
      rangeData = range;
      break;
    }
  }

  if (!rangeData) {
    // Fallback for edge cases
    rangeData = roundedPercentage > 50 ? currentRanges.high : currentRanges.low;
  }

  switch (format) {
    case "label-only":
      return rangeData.label;
    case "short":
      return showPercentage
        ? `${rangeData.short} (${roundedPercentage}%)`
        : rangeData.short;
    case "full":
    default:
      return showPercentage
        ? `${rangeData.label} (${roundedPercentage}%)`
        : rangeData.label;
  }
};

/**
 * Get explanatory text for rain chance
 * @param {number} percentage - Precipitation probability percentage (0-100)
 * @param {string} language - Language code ('en' or 'mm')
 * @returns {string} Explanatory text
 */
export const getRainChanceExplanation = (percentage, language = "en") => {
  if (percentage === null || percentage === undefined || isNaN(percentage))
    return "";

  if (language === "mm") {
    if (percentage <= 20) return "မိုးရွာနိုင်ခြေ အလွန်နည်းပါသည်";
    if (percentage <= 40) return "မိုးရွာနိုင်ခြေ နည်းပါသည်";
    if (percentage <= 60) return "မိုးရွာနိုင်ခြေ အလယ်အလတ်ရှိပါသည်";
    if (percentage <= 80) return "မိုးရွာနိုင်ခြေ မြင့်ပါသည်";
    return "မိုးရွာနိုင်ခြေ အလွန်မြင့်ပါသည်";
  } else {
    if (percentage <= 20) return "Rain is very unlikely";
    if (percentage <= 40) return "Rain is unlikely";
    if (percentage <= 60) return "Rain is possible";
    if (percentage <= 80) return "Rain is likely";
    return "Rain is very likely";
  }
};

/**
 * Get rain chance with contextual advice
 * @param {number} percentage - Precipitation probability percentage (0-100)
 * @param {string} language - Language code ('en' or 'mm')
 * @returns {string} Rain chance with advice
 */
export const getRainChanceWithAdvice = (percentage, language = "en") => {
  if (percentage === null || percentage === undefined || isNaN(percentage))
    return "";

  const label = formatRainChance(percentage, language, true, "full");

  if (language === "mm") {
    if (percentage <= 20) return `${label} - ထီးမလိုပါ`;
    if (percentage <= 40) return `${label} - ထီးယူသွားရန် မလိုအပ်ပါ`;
    if (percentage <= 60) return `${label} - ထီးယူသွားရန် စဉ်းစားပါ`;
    if (percentage <= 80) return `${label} - ထီးယူသွားပါ`;
    return `${label} - ထီးယူသွားရန် မမေ့ပါနှင့်`;
  } else {
    if (percentage <= 20) return `${label} - No umbrella needed`;
    if (percentage <= 40) return `${label} - Umbrella not necessary`;
    if (percentage <= 60) return `${label} - Consider bringing an umbrella`;
    if (percentage <= 80) return `${label} - Bring an umbrella`;
    return `${label} - Don't forget your umbrella`;
  }
};

/**
 * Get rain chance color class for styling
 * @param {number} percentage - Precipitation probability percentage (0-100)
 * @param {boolean} darkMode - Whether dark mode is active
 * @returns {string} CSS color class
 */
export const getRainChanceColorClass = (percentage, darkMode = false) => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return darkMode ? "text-gray-400" : "text-gray-600";
  }

  if (percentage <= 20) {
    return darkMode ? "text-green-300" : "text-green-600";
  } else if (percentage <= 40) {
    return darkMode ? "text-yellow-300" : "text-yellow-600";
  } else if (percentage <= 60) {
    return darkMode ? "text-orange-300" : "text-orange-600";
  } else if (percentage <= 80) {
    return darkMode ? "text-red-300" : "text-red-600";
  } else {
    return darkMode ? "text-red-200" : "text-red-700";
  }
};

/**
 * Get rain chance icon based on percentage
 * @param {number} percentage - Precipitation probability percentage (0-100)
 * @returns {string} Emoji icon
 */
export const getRainChanceIcon = (percentage) => {
  if (percentage === null || percentage === undefined || isNaN(percentage))
    return "❓";

  if (percentage <= 20) return "☀️";
  if (percentage <= 40) return "🌤️";
  if (percentage <= 60) return "⛅";
  if (percentage <= 80) return "🌦️";
  return "🌧️";
};
