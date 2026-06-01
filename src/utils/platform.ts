type CapacitorLike = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const getCapacitor = (): CapacitorLike | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorLike }).Capacitor;
};

export const isNativeAndroid = () => {
  const capacitor = getCapacitor();
  return capacitor?.getPlatform?.() === 'android';
};

export const isNativeCapacitor = () => {
  const capacitor = getCapacitor();
  const platform = capacitor?.getPlatform?.();
  return capacitor?.isNativePlatform?.() === true || (platform === 'android' || platform === 'ios');
};

export const isPaidVirtualAccessAllowed = () => {
  if (!isNativeAndroid()) return true;
  return import.meta.env.VITE_ENABLE_ANDROID_PAID_VIRTUAL_ACCESS === 'true';
};

export const ANDROID_PAID_VIRTUAL_ACCESS_NOTICE =
  'Paid virtual access is disabled in this Android build until Google Play Billing or an approved payment model is configured.';
