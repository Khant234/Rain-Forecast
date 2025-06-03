import { useState, useCallback } from "react";

const translations = {
  en: {
    "rain.intensity.light": "Light rain",
    "rain.intensity.moderate": "Moderate rain",
    "rain.intensity.heavy": "Heavy rain",
    "rain.ongoing": "Continues for {{minutes}} minutes",
    "tips.umbrella": "Take an umbrella ☔",
    "tips.shoes": "Wear waterproof shoes 👟",
    "tips.outdoor": "Avoid outdoor activities 🌧️",
    "location.detecting": "Detecting location...",
    "location.error": "Location error",
    "location.manual": "Enter location manually",
    "weather.loading": "Loading weather data...",
    "weather.error": "Error loading weather data",
    "weather.refresh": "Refresh",
    "notification.request": "Enable notifications",
    "notification.enabled": "Notifications enabled",
    "notification.disabled": "Notifications disabled",
    "darkMode.on": "Dark mode",
    "darkMode.off": "Light mode",
  },
  mm: {
    "rain.intensity.light": "မိုးဖွဲ",
    "rain.intensity.moderate": "မိုးအသင့်အတင့်",
    "rain.intensity.heavy": "မိုးသည်း",
    "rain.ongoing": "{{minutes}} မိနစ် ဆက်လက်ရွာသွန်းမည်",
    "tips.umbrella": "ထီးယူသွားပါ ☔",
    "tips.shoes": "ရေစိုခံဖိနပ်ဝတ်ပါ 👟",
    "tips.outdoor": "ပြင်ပခရီးရှောင်ပါ 🌧️",
    "location.detecting": "တည်နေရာရှာဖွေနေပါသည်...",
    "location.error": "တည်နေရာအမှား",
    "location.manual": "တည်နေရာကို ကိုယ်တိုင်ထည့်သွင်းရန်",
    "weather.loading": "မိုးလေဝသအချက်အလက်များ ရယူနေပါသည်...",
    "weather.error": "မိုးလေဝသအချက်အလက် ရယူ၍မရပါ",
    "weather.refresh": "ပြန်လည်ဖတ်ရန်",
    "notification.request": "အကြောင်းကြားချက်များ ဖွင့်ရန်",
    "notification.enabled": "အကြောင်းကြားချက်များ ဖွင့်ထားသည်",
    "notification.disabled": "အကြောင်းကြားချက်များ ပိတ်ထားသည်",
    "darkMode.on": "အမှောင်မုဒ်",
    "darkMode.off": "အလင်းမုဒ်",
  },
};

export const useTranslation = () => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem("language");
    return saved || "mm";
  });

  const toggleLanguage = useCallback(() => {
    const newLanguage = language === "mm" ? "en" : "mm";
    localStorage.setItem("language", newLanguage);
    setLanguage(newLanguage);
  }, [language]);

  const t = useCallback(
    (key, variables = {}) => {
      let text = translations[language][key] || key;

      // Replace variables in the text
      Object.entries(variables).forEach(([key, value]) => {
        text = text.replace(`{{${key}}}`, value);
      });

      return text;
    },
    [language]
  );

  return {
    language,
    toggleLanguage,
    t,
  };
};
