// rain-alert.js
// In-app rain alert notifications using browser Notifications API

// 1. Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('This browser does not support notifications.');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// 2. Get user location (prompt for geolocation)
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Geolocation not supported');
    } else {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        err => {
          if (err.code === err.PERMISSION_DENIED) {
            reject('Location permission denied permanently');
          } else {
            reject('Location permission denied');
          }
        }
      );
    }
  });
}

// 3. Poll backend for rain forecast
async function checkRainForecast(lat, lon) {
  try {
    const res = await fetch(`/api/weather/${lat}/${lon}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    // Check for rain in next 6 hours
    const timelines = data.data?.timelines?.hourly || [];
    const rainSoon = timelines.some(t => {
      const precipProb = t.values?.precipitationProbability || 0;
      const precipType = t.values?.precipitationType || 0;
      // PrecipitationType: 1 = Rain
      return precipProb >= 50 && precipType === 1;
    });
    return rainSoon;
  } catch (err) {
    console.error('Rain forecast check failed:', err);
    return false;
  }
}

// 4. Show notification
function showRainNotification() {
  new Notification('Rain Alert', {
    body: 'Rain is predicted in your area soon! ☔',
    icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png',
  });
}

// 5. Main logic: request permission, get location, poll every 30 min
(async function setupRainAlerts() {
  const allowed = await requestNotificationPermission();
  if (!allowed) return;
  let location;
  try {
    location = await getUserLocation();
  } catch (err) {
    if (err === 'Location permission denied permanently') {
      alert('Location permission permanently denied. Rain alerts disabled.');
      return; // Stop polling if permission is permanently denied
    } else {
      alert('Location required for rain alerts.');
      return;
    }
  }
  async function poll() {
    const rain = await checkRainForecast(location.lat, location.lon);
    if (rain) showRainNotification();
  }
  poll(); // Initial check
  setInterval(poll, 30 * 60 * 1000); // Every 30 minutes
})();
