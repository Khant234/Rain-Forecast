import React, { useState, useEffect } from 'react';
import { Bell, BellOff, TestTube, Settings, Check, X, AlertTriangle } from 'lucide-react';
import { rainNotificationService } from '../services/notificationService';

const NotificationSettings = ({ language, darkMode, onClose }) => {
  const [settings, setSettings] = useState(rainNotificationService.getSettings());
  const [permissionStatus, setPermissionStatus] = useState(rainNotificationService.getPermissionStatus());
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // Update permission status when component mounts
    rainNotificationService.checkPermissionStatus().then(status => {
      setPermissionStatus(status);
    });
  }, []);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    rainNotificationService.updateSettings(newSettings);
  };

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const status = await rainNotificationService.requestPermission();
      setPermissionStatus(status);
      if (status === 'granted') {
        handleSettingChange('enabled', true);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      alert(language === 'mm' 
        ? 'အကြောင်းကြားချက်ခွင့်ပြုချက် ရယူ၍မရပါ။ ဘရောက်ဆာ ဆက်တင်များတွင် ခွင့်ပြုပါ။'
        : 'Failed to get notification permission. Please enable in browser settings.'
      );
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      await rainNotificationService.sendTestNotification(language);
      setTestResult('success');
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error('Test notification failed:', error);
      setTestResult('error');
      setTimeout(() => setTestResult(null), 3000);
    } finally {
      setIsSendingTest(false);
    }
  };

  const getPermissionStatusText = () => {
    if (language === 'mm') {
      switch (permissionStatus) {
        case 'granted': return 'ခွင့်ပြုထားသည်';
        case 'denied': return 'ပိတ်ထားသည်';
        case 'unsupported': return 'မပံ့ပိုးပါ';
        default: return 'မတောင်းခံရသေးပါ';
      }
    } else {
      switch (permissionStatus) {
        case 'granted': return 'Granted';
        case 'denied': return 'Denied';
        case 'unsupported': return 'Not Supported';
        default: return 'Not Requested';
      }
    }
  };

  const getPermissionStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted': return <Check className="w-4 h-4 text-green-500" />;
      case 'denied': return <X className="w-4 h-4 text-red-500" />;
      case 'unsupported': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4`}>
      <div className={`max-w-md w-full rounded-lg shadow-xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h2 className="text-lg font-semibold">
              {language === 'mm' ? 'မိုးရွာမည့် အကြောင်းကြားချက်' : 'Rain Notifications'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Permission Status */}
          <div className={`p-3 rounded-lg ${
            permissionStatus === 'granted' 
              ? 'bg-green-100 dark:bg-green-900' 
              : permissionStatus === 'denied'
              ? 'bg-red-100 dark:bg-red-900'
              : 'bg-yellow-100 dark:bg-yellow-900'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {getPermissionStatusIcon()}
              <span className="font-medium">
                {language === 'mm' ? 'ခွင့်ပြုချက်အခြေအနေ' : 'Permission Status'}
              </span>
            </div>
            <p className="text-sm">{getPermissionStatusText()}</p>
            
            {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
              <button
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                {isRequestingPermission 
                  ? (language === 'mm' ? 'တောင်းခံနေသည်...' : 'Requesting...')
                  : (language === 'mm' ? 'ခွင့်ပြုချက်တောင်းခံရန်' : 'Request Permission')
                }
              </button>
            )}
          </div>

          {/* Enable/Disable Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">
                {language === 'mm' ? 'အကြောင်းကြားချက်များ' : 'Enable Notifications'}
              </label>
              <p className="text-sm text-gray-500">
                {language === 'mm' ? 'မိုးရွာမည့်အခါ အကြောင်းကြားပါ' : 'Get alerts when rain is expected'}
              </p>
            </div>
            <button
              onClick={() => handleSettingChange('enabled', !settings.enabled)}
              disabled={permissionStatus !== 'granted'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enabled && permissionStatus === 'granted'
                  ? 'bg-blue-600' 
                  : 'bg-gray-300 dark:bg-gray-600'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enabled && permissionStatus === 'granted' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Rain Threshold */}
          <div>
            <label className="block font-medium mb-2">
              {language === 'mm' ? 'မိုးရွာနိုင်ခြေ အနိမ့်ဆုံး' : 'Rain Probability Threshold'}
            </label>
            <select
              value={settings.rainThreshold}
              onChange={(e) => handleSettingChange('rainThreshold', parseInt(e.target.value))}
              disabled={!settings.enabled || permissionStatus !== 'granted'}
              className={`w-full p-2 rounded border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              } disabled:opacity-50`}
            >
              <option value={30}>30% - {language === 'mm' ? 'နိမ့်သော အန္တရာယ်' : 'Low Risk'}</option>
              <option value={50}>50% - {language === 'mm' ? 'အလယ်အလတ် အန္တရာယ်' : 'Moderate Risk'}</option>
              <option value={70}>70% - {language === 'mm' ? 'မြင့်သော အန္တরာယ်' : 'High Risk'}</option>
              <option value={80}>80% - {language === 'mm' ? 'အလွန်မြင့်သော အန္တရာယ်' : 'Very High Risk'}</option>
            </select>
          </div>

          {/* Timing */}
          <div>
            <label className="block font-medium mb-2">
              {language === 'mm' ? 'ကြိုတင်အကြောင်းကြားချိန်' : 'Alert Timing'}
            </label>
            <select
              value={settings.timingMinutes}
              onChange={(e) => handleSettingChange('timingMinutes', parseInt(e.target.value))}
              disabled={!settings.enabled || permissionStatus !== 'granted'}
              className={`w-full p-2 rounded border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              } disabled:opacity-50`}
            >
              <option value={5}>{language === 'mm' ? '5 မိနစ်ကြိုတင်' : '5 minutes before'}</option>
              <option value={15}>{language === 'mm' ? '15 မိနစ်ကြိုတင်' : '15 minutes before'}</option>
              <option value={30}>{language === 'mm' ? '30 မিနစ်ကြိုတင်' : '30 minutes before'}</option>
              <option value={60}>{language === 'mm' ? '1 နာရီကြိုတင်' : '1 hour before'}</option>
            </select>
          </div>

          {/* Test Notification */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSendTest}
              disabled={!settings.enabled || permissionStatus !== 'granted' || isSendingTest}
              className="w-full flex items-center justify-center gap-2 p-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-4 h-4" />
              {isSendingTest 
                ? (language === 'mm' ? 'စမ်းသပ်နေသည်...' : 'Sending Test...')
                : (language === 'mm' ? 'စမ်းသပ်အကြောင်းကြားချက်' : 'Send Test Notification')
              }
            </button>
            
            {testResult && (
              <div className={`mt-2 p-2 rounded text-sm text-center ${
                testResult === 'success' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {testResult === 'success' 
                  ? (language === 'mm' ? '✅ စမ်းသပ်မှု အောင်မြင်ပါသည်' : '✅ Test notification sent successfully')
                  : (language === 'mm' ? '❌ စမ်းသပ်မှု မအောင်မြင်ပါ' : '❌ Test notification failed')
                }
              </div>
            )}
          </div>

          {/* Info */}
          <div className={`p-3 rounded-lg text-sm ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            <p>
              {language === 'mm' 
                ? '💡 အကြောင်းကြားချက်များသည် သင့်ရဲ့ GPS တည်နေရာအပေါ် အခြေခံ၍ မိုးရွာမည့်အချိန်ကို ကြိုတင်သတိပေးပါသည်။'
                : '💡 Notifications are based on your GPS location and will alert you when rain is expected in your area.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
