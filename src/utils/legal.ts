export const SUPPORT_EMAIL = 'support@eventz.live';
export const SUPPORT_PHONE = '+255 758 536 000';
export const SUPPORT_PHONE_TEL = '+255758536000';

export const PRIVACY_POLICY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL || '/privacy';
export const TERMS_OF_SERVICE_URL = import.meta.env.VITE_TERMS_OF_SERVICE_URL || '/terms';
export const ACCOUNT_DELETION_URL = import.meta.env.VITE_ACCOUNT_DELETION_URL || '/delete-account';

export const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};
