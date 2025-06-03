self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Weather Alert';
  const options = {
    body: data.body || 'Rain is expected soon!',
    icon: '/icon.png',
    badge: '/icon.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
