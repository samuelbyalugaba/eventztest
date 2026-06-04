import { describe, expect, it } from 'vitest';

import { createHmacSha256Hex, verifyHmacSha256Signature } from './webhookSignature';

describe('webhook signatures', () => {
  it('accepts a matching HMAC SHA-256 signature', async () => {
    const payload = JSON.stringify({ event: 'payment.completed', reference: 'abc' });
    const signature = await createHmacSha256Hex(payload, 'secret');

    await expect(verifyHmacSha256Signature(payload, 'secret', signature)).resolves.toBe(true);
    await expect(verifyHmacSha256Signature(payload, 'secret', `sha256=${signature}`)).resolves.toBe(true);
  });

  it('rejects a missing or mismatched signature', async () => {
    const payload = JSON.stringify({ event: 'payment.completed' });

    await expect(verifyHmacSha256Signature(payload, 'secret', null)).resolves.toBe(false);
    await expect(verifyHmacSha256Signature(payload, 'secret', 'not-a-real-signature')).resolves.toBe(false);
  });
});
