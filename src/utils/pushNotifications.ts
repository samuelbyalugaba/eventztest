import { supabase } from './supabase/client';

type PushKind = 'like' | 'comment' | 'follow';

type PushSubscriptionJson = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

const getVapidPublicKey = () =>
  typeof import.meta.env.VITE_VAPID_PUBLIC_KEY === 'string'
    ? import.meta.env.VITE_VAPID_PUBLIC_KEY.trim()
    : '';

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

export const getPushPermission = () => {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
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
      },
      { onConflict: 'endpoint' }
    );

  if (error) throw error;
};

export const subscribeToPushNotifications = async (userId: string) => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported on this device');
  }

  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    throw new Error('Push notifications are not configured yet');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const registration = await navigator.serviceWorker.ready;
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

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;

  await savePushSubscription(userId, subscription);
  return subscription;
};

export const unsubscribeFromPushNotifications = async (userId: string) => {
  if (!isPushNotificationSupported()) return;

  const registration = await navigator.serviceWorker.ready;
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
  } catch {
    // Push delivery is best-effort and should not block the user action.
  }
};
