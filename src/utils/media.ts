export function isVideoMedia(url?: string) {
  if (!url) return false;
  const raw = url.toLowerCase();
  if (raw.includes('video') || raw.includes('highlight')) return true;
  const cleaned = url.split('#')[0].split('?')[0];
  return /\.(mp4|webm|ogg|ogv|mov|m4v|hevc|3gp|3gpp)$/i.test(cleaned);
}

export function getFullPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('255')) return digits;
  if (digits.startsWith('0')) return '255' + digits.slice(1);
  return '255' + digits;
}
