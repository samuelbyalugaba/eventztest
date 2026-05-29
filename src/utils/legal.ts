export const SUPPORT_EMAIL = 'support@eventz.co.tz';

export const PRIVACY_POLICY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL || '/privacy';
export const TERMS_OF_SERVICE_URL = import.meta.env.VITE_TERMS_OF_SERVICE_URL || '/terms';

export const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};
