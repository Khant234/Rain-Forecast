/**
 * Enhanced Error Boundary and Error Display Components
 * Provides user-friendly error messages with retry options
 */

import React, { useState, useEffect } from "react";
import { RefreshCw, AlertTriangle, Wifi, WifiOff, Clock } from "lucide-react";

/**
 * Weather Service Error Display Component
 */
export const WeatherErrorDisplay = ({ 
  error, 
  onRetry, 
  isRetrying = false, 
  darkMode = false,
  language = "en" 
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);

  useEffect(() => {
    if (nextRetryIn > 0) {
      const timer = setTimeout(() => setNextRetryIn(nextRetryIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [nextRetryIn]);

  const getErrorInfo = (errorMessage) => {
    const message = errorMessage?.toLowerCase() || "";
    
    if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
      return {
        type: "network",
        icon: WifiOff,
        title: language === "mm" ? "အင်တာနက်ချိတ်ဆက်မှုပြဿနာ" : "Connection Problem",
        description: language === "mm" 
          ? "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ဆေးပြီး ပြန်လည်ကြိုးစားပါ"
          : "Please check your internet connection and try again",
        color: "red"
      };
    }
    
    if (message.includes("rate limit") || message.includes("429")) {
      return {
        type: "rateLimit",
        icon: Clock,
        title: language === "mm" ? "ဝန်ဆောင်မှုအကန့်အသတ်" : "Service Limit Reached",
        description: language === "mm"
          ? "ခဏစောင့်ပြီး ပြန်လည်ကြိုးစားပါ"
          : "Please wait a moment and try again",
        color: "yellow"
      };
    }
    
    if (message.includes("api key") || message.includes("401") || message.includes("authentication")) {
      return {
        type: "auth",
        icon: AlertTriangle,
        title: language === "mm" ? "ဝန်ဆောင်မှုပြဿနာ" : "Service Configuration Issue",
        description: language === "mm"
          ? "ဝန်ဆောင်မှုကို ပြင်ဆင်နေပါသည်"
          : "Service is being configured. Please try again later",
        color: "orange"
      };
    }
    
    if (message.includes("temporarily unavailable") || message.includes("500")) {
      return {
        type: "server",
        icon: AlertTriangle,
        title: language === "mm" ? "ဝန်ဆောင်မှုယာယီရပ်ဆိုင်း" : "Service Temporarily Unavailable",
        description: language === "mm"
          ? "ဝန်ဆောင်မှုကို ပြန်လည်ရရှိရန် ခဏစောင့်ပါ"
          : "The weather service is temporarily down. Please try again in a few minutes",
        color: "orange"
      };
    }
    
    // Default error
    return {
      type: "general",
      icon: AlertTriangle,
      title: language === "mm" ? "ရာသီဥတုအချက်အလက်ရယူ၍မရပါ" : "Unable to Load Weather Data",
      description: language === "mm"
        ? "ပြဿနာရှိနေပါသည်။ ပြန်လည်ကြိုးစားပါ"
        : "There was a problem loading weather data. Please try again",
      color: "red"
    };
  };

  const errorInfo = getErrorInfo(error?.message);
  const Icon = errorInfo.icon;

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setNextRetryIn(5); // 5 second cooldown
    onRetry();
  };

  const getColorClasses = (color) => {
    const colors = {
      red: {
        bg: darkMode ? "bg-red-900/20" : "bg-red-50",
        border: darkMode ? "border-red-800" : "border-red-200",
        icon: darkMode ? "text-red-400" : "text-red-500",
        text: darkMode ? "text-red-300" : "text-red-700",
        button: darkMode 
          ? "bg-red-800 hover:bg-red-700 text-red-100" 
          : "bg-red-600 hover:bg-red-700 text-white"
      },
      yellow: {
        bg: darkMode ? "bg-yellow-900/20" : "bg-yellow-50",
        border: darkMode ? "border-yellow-800" : "border-yellow-200",
        icon: darkMode ? "text-yellow-400" : "text-yellow-500",
        text: darkMode ? "text-yellow-300" : "text-yellow-700",
        button: darkMode 
          ? "bg-yellow-800 hover:bg-yellow-700 text-yellow-100" 
          : "bg-yellow-600 hover:bg-yellow-700 text-white"
      },
      orange: {
        bg: darkMode ? "bg-orange-900/20" : "bg-orange-50",
        border: darkMode ? "border-orange-800" : "border-orange-200",
        icon: darkMode ? "text-orange-400" : "text-orange-500",
        text: darkMode ? "text-orange-300" : "text-orange-700",
        button: darkMode 
          ? "bg-orange-800 hover:bg-orange-700 text-orange-100" 
          : "bg-orange-600 hover:bg-orange-700 text-white"
      }
    };
    return colors[color] || colors.red;
  };

  const colorClasses = getColorClasses(errorInfo.color);

  return (
    <div className={`
      rounded-lg border p-6 text-center max-w-md mx-auto
      ${colorClasses.bg} ${colorClasses.border}
    `}>
      <Icon className={`mx-auto mb-4 ${colorClasses.icon}`} size={48} />
      
      <h3 className={`text-lg font-semibold mb-2 ${colorClasses.text}`}>
        {errorInfo.title}
      </h3>
      
      <p className={`text-sm mb-4 ${colorClasses.text} opacity-90`}>
        {errorInfo.description}
      </p>
      
      {error?.message && (
        <details className="mb-4">
          <summary className={`text-xs cursor-pointer ${colorClasses.text} opacity-75`}>
            {language === "mm" ? "အသေးစိတ်" : "Technical Details"}
          </summary>
          <p className={`text-xs mt-2 font-mono ${colorClasses.text} opacity-60`}>
            {error.message}
          </p>
        </details>
      )}
      
      <div className="space-y-3">
        <button
          onClick={handleRetry}
          disabled={isRetrying || nextRetryIn > 0}
          className={`
            w-full px-4 py-2 rounded-lg font-medium transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${colorClasses.button}
          `}
        >
          {isRetrying ? (
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="animate-spin" size={16} />
              <span>{language === "mm" ? "ကြိုးစားနေသည်..." : "Retrying..."}</span>
            </div>
          ) : nextRetryIn > 0 ? (
            <span>
              {language === "mm" ? `${nextRetryIn} စက္ကန့်စောင့်ပါ` : `Wait ${nextRetryIn}s`}
            </span>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw size={16} />
              <span>
                {language === "mm" ? "ပြန်လည်ကြိုးစား" : "Try Again"}
                {retryCount > 0 && ` (${retryCount})`}
              </span>
            </div>
          )}
        </button>
        
        {errorInfo.type === "network" && (
          <div className={`text-xs ${colorClasses.text} opacity-75`}>
            <p className="mb-1">
              {language === "mm" ? "အကြံပြုချက်များ:" : "Suggestions:"}
            </p>
            <ul className="text-left space-y-1">
              <li>• {language === "mm" ? "WiFi သို့မဟုတ် မိုဘိုင်းဒေတာ စစ်ဆေးပါ" : "Check WiFi or mobile data"}</li>
              <li>• {language === "mm" ? "အင်တာနက်ချိတ်ဆက်မှု တည်ငြိမ်မှုစစ်ဆေးပါ" : "Verify internet connection stability"}</li>
              <li>• {language === "mm" ? "VPN ပိတ်ထားပါ" : "Disable VPN if active"}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Loading State Component
 */
export const WeatherLoadingDisplay = ({ 
  darkMode = false, 
  language = "en",
  message = null 
}) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const defaultMessage = language === "mm" 
    ? "ရာသီဥတုအချက်အလက်ရယူနေသည်" 
    : "Loading weather data";

  return (
    <div className="text-center py-8">
      <div className={`inline-flex items-center space-x-3 px-6 py-4 rounded-lg ${
        darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"
      }`}>
        <RefreshCw className="animate-spin" size={20} />
        <span className="font-medium">
          {message || defaultMessage}{dots}
        </span>
      </div>
    </div>
  );
};

/**
 * Offline Indicator Component
 */
export const OfflineIndicator = ({ darkMode = false, language = "en" }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm font-medium
      ${darkMode ? "bg-red-900 text-red-100" : "bg-red-600 text-white"}
    `}>
      <div className="flex items-center justify-center space-x-2">
        <WifiOff size={16} />
        <span>
          {language === "mm" 
            ? "အင်တာနက်ချိတ်ဆက်မှုမရှိပါ - သိမ်းဆည်းထားသောအချက်အလက်များကိုအသုံးပြုနေသည်"
            : "No internet connection - Using cached data"
          }
        </span>
      </div>
    </div>
  );
};

export default {
  WeatherErrorDisplay,
  WeatherLoadingDisplay,
  OfflineIndicator
};
