import { useEffect, useState } from 'react';
import { messaging, getToken, onMessage } from '../firebase';
import api from '../api/axios';

const VAPID_KEY = 'BAObvHevgbEIefy0FFhcYcvSF247mejwM9jE-zJ7_aQzG_yDuKy0oq2G2HnljqFv0CK1qyHMdLnGLOgLMfYAZ1Y';

export default function useFcmToken() {
  const [fcmToken, setFcmToken] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!('Notification' in window)) return;

    Notification.requestPermission().then(async (permission) => {
      if (permission === 'granted') {
        try {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            setFcmToken(token);
            await api.post('/fcm-token', { token, platform: 'web' });
          }
        } catch (err) {
          console.error('Erreur récupération token FCM', err);
        }
      }
    });

    const unsubscribe = onMessage(messaging, (payload) => {
      setNotification(payload.notification);
    });

    return () => unsubscribe();
  }, []);

  return { fcmToken, notification };
}