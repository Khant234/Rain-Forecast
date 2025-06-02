import { Route, Routes } from "react-router-dom";
import RainForecast from "./components/features/RainForecast/RainForecast";
import HourlyTimeline from "./components/features/Timeline/HourlyTimeline";
import { useTranslation } from "./hooks/useTranslation";
import { useNotification } from "./hooks/useNotification";
import { Sun, Moon, Bell } from "lucide-react";
import { useState } from "react";


function App() {
  const { t, toggleLanguage, language } = useTranslation();
  const { requestPermission, permission } = useNotification();
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">🌦️ {t("app.title")}</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={t(darkMode ? "darkMode.off" : "darkMode.on")}
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={requestPermission}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={t("notification.request")}
              disabled={permission === "denied"}
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={toggleLanguage}
              className="px-3 py-1 rounded-md text-sm font-medium bg-blue-100 dark:bg-blue-900"
            >
              {language === "mm" ? "English" : "မြန်မာ"}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          <RainForecast />
          <HourlyTimeline />
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t("app.poweredBy")} Tomorrow.io</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
