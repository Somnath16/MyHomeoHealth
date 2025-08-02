import { useState, useEffect } from 'react';

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      // Get current permission status
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default'
      });

      // Get existing subscription
      getExistingSubscription();
    }
  }, []);

  const getExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      
      if (existingSub) {
        const subData = {
          endpoint: existingSub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(existingSub.getKey('p256dh')),
            auth: arrayBufferToBase64(existingSub.getKey('auth'))
          }
        };
        setSubscription(subData);
      }
    } catch (error) {
      console.error('Error getting existing subscription:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications are not supported');
      return false;
    }

    setIsLoading(true);
    
    try {
      const result = await Notification.requestPermission();
      
      const newPermission = {
        granted: result === 'granted',
        denied: result === 'denied',
        default: result === 'default'
      };
      
      setPermission(newPermission);
      setIsLoading(false);
      
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setIsLoading(false);
      return false;
    }
  };

  const subscribeToPush = async (): Promise<PushSubscription | null> => {
    if (!permission.granted) {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    setIsLoading(true);

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await registration.update();
      
      // Wait for service worker to be ready
      const readyRegistration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const pushSubscription = await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey())
      });

      const subData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth'))
        }
      };

      setSubscription(subData);
      setIsLoading(false);

      // Send subscription to server
      await saveSubscriptionToServer(subData);
      
      return subData;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setIsLoading(false);
      return null;
    }
  };

  const unsubscribeFromPush = async (): Promise<boolean> => {
    if (!subscription) return true;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        await removeSubscriptionFromServer(subscription);
      }
      
      setSubscription(null);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setIsLoading(false);
      return false;
    }
  };

  const showTestNotification = async (title: string, body: string) => {
    if (!permission.granted) return false;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png'
      });
      
      // Use vibration API separately if available
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      return true;
    } catch (error) {
      console.error('Error showing test notification:', error);
      return false;
    }
  };

  return {
    permission,
    subscription,
    isSupported,
    isLoading,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    showTestNotification
  };
};

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getVapidPublicKey(): string {
  // This should be your VAPID public key
  // For demo purposes, using a placeholder - in production this should come from environment variables
  return 'BFxrUzuS5YzP0R8K8qwYlqFrp-Q4jFkKbV7lQrKzOZqQYJUvKY8YqAeK2xZ7oK3p1QoP4Y2kZ8Y7J1QKzOZqQY';
}

async function saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    console.error('Error saving subscription to server:', error);
  }
}

async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (error) {
    console.error('Error removing subscription from server:', error);
  }
}