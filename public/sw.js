self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = String(data.title || 'Weather Alert');
  const options = {
    body: String(data.body || 'Rain is expected soon!'),
    icon: '/icon.png',
    badge: '/icon.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});