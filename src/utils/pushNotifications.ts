import { supabase } from './supabase/client';

type PushKind = 'like' | 'comment' | 'follow';
export type PushPermissionState = NotificationPermission | 'unsupported';

export type PushSubscriptionState = {
  supported: boolean;
  configured: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
};

type PushSubscriptionJson = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

let cachedVapidPublicKey: string | null = null;
let vapidConfigRequest: Promise<string> | null = null;

const getEnvVapidPublicKey = () =>
  typeof import.meta.env.VITE_VAPID_PUBLIC_KEY === 'string'
    ? import.meta.env.VITE_VAPID_PUBLIC_KEY.trim()
    : '';

const fetchRuntimeVapidPublicKey = async () => {
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: { kind: 'config' },
  });

  if (error) return '';

  const payload = data as { configured?: boolean; publicKey?: unknown } | null;
  if (!payload?.configured || typeof payload.publicKey !== 'string') return '';

  return payload.publicKey.trim();
};

export const getVapidPublicKey = async () => {
  const envKey = getEnvVapidPublicKey();
  if (envKey) return envKey;

  if (cachedVapidPublicKey !== null) return cachedVapidPublicKey;

  vapidConfigRequest =
    vapidConfigRequest ||
    fetchRuntimeVapidPublicKey()
      .catch(() => '')
      .finally(() => {
        vapidConfigRequest = null;
      });

  const runtimeKey = await vapidConfigRequest;
  if (runtimeKey) cachedVapidPublicKey = runtimeKey;
  return runtimeKey;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const isPushNotificationSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const getPushPermission = (): PushPermissionState => {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

const waitForServiceWorkerRegistration = async () => {
  const timeoutMs = 8000;

  return await new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Notification service worker is not ready yet'));
    }, timeoutMs);

    navigator.serviceWorker.ready
      .then((registration) => {
        window.clearTimeout(timeoutId);
        resolve(registration);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const serializeSubscription = (subscription: PushSubscription): Required<PushSubscriptionJson> => {
  const json = subscription.toJSON() as PushSubscriptionJson;
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Push subscription is missing browser keys');
  }

  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
};

const savePushSubscription = async (userId: string, subscription: PushSubscription) => {
  const json = serializeSubscription(subscription);

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        enabled: true,
        last_used_at: new Date().toISOString(),
      } as {
        user_id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        user_agent: string;
        platform: string;
        enabled: boolean;
        last_used_at: string;
      },
      { onConflict: 'endpoint' }
    );

  if (error) throw error;
};

export const subscribeToPushNotifications = async (userId: string) => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported on this device');
  }

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    throw new Error('Push notification server keys are not configured yet');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const registration = await waitForServiceWorkerRegistration();
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await savePushSubscription(userId, subscription);
  return subscription;
};

export const syncExistingPushSubscription = async (userId: string) => {
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') return null;

  const registration = await waitForServiceWorkerRegistration().catch(() => null);
  if (!registration) return null;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;

  await savePushSubscription(userId, subscription);
  return subscription;
};

export const unsubscribeFromPushNotifications = async (userId: string) => {
  if (!isPushNotificationSupported()) return;

  const registration = await waitForServiceWorkerRegistration().catch(() => null);
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const { endpoint } = serializeSubscription(subscription);
  await subscription.unsubscribe();

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
};

export const sendSocialPushNotification = async (
  kind: PushKind,
  payload: { postId?: number; commentId?: number; targetUserId?: string }
) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await supabase.functions.invoke('send-push-notification', {
      body: { kind, ...payload },
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.warn('Failed to send push notification:', error);
  }
};

export const getPushSubscriptionState = async (): Promise<PushSubscriptionState> => {
  const supported = isPushNotificationSupported();
  const permission = getPushPermission();

  if (!supported) {
    return {
      supported: false,
      configured: false,
      permission,
      subscribed: false,
    };
  }

  const [publicKey, registration] = await Promise.all([
    getVapidPublicKey(),
    permission === 'granted' ? waitForServiceWorkerRegistration().catch(() => null) : Promise.resolve(null),
  ]);
  const subscription = registration ? await registration.pushManager.getSubscription() : null;

  return {
    supported,
    configured: Boolean(publicKey),
    permission,
    subscribed: Boolean(subscription),
  };
};
