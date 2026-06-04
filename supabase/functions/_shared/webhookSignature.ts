const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const normalizeSignature = (signature: string) =>
  signature
    .trim()
    .replace(/^sha256=/i, '')
    .replace(/^hmac-sha256=/i, '');

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

export const createHmacSha256Hex = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(new Uint8Array(signature));
};

export const verifyHmacSha256Signature = async (
  payload: string,
  secret: string,
  signature: string | null,
) => {
  if (!secret || !signature) return false;

  const expected = await createHmacSha256Hex(payload, secret);
  return constantTimeEqual(expected, normalizeSignature(signature));
};

export const getWebhookSignatureHeader = (headers: Pick<Headers, 'get'>) =>
  headers.get('x-snippe-signature') ||
  headers.get('x-webhook-signature') ||
  headers.get('signature');
