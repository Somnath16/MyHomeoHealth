// Service Worker for Push Notifications
const CACHE_NAME = 'homeo-health-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Push Event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    title: data.title || 'My Homeo Health',
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icon-32x32.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-32x32.png'
      }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    // Open the app and navigate to appointments
    event.waitUntil(
      clients.openWindow('/appointments')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background Sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'appointment-reminder') {
    event.waitUntil(
      // Handle background sync for appointment reminders
      syncAppointmentReminders()
    );
  }
});

async function syncAppointmentReminders() {
  try {
    // This would sync with the server when back online
    console.log('Syncing appointment reminders...');
  } catch (error) {
    console.error('Failed to sync appointment reminders:', error);
  }
}