import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

/**
 * Generates an HMAC-signed CSRF token tied to a session ID.
 */
export function generateCsrfToken(sessionId: string, csrfSecret: string): string {
  const nonce = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', csrfSecret)
    .update(`${sessionId}:${nonce}`)
    .digest('hex');
  return `${nonce}.${signature}`;
}

/**
 * Validates an incoming CSRF token against the active session ID.
 */
export function validateCsrfToken(token: string, sessionId: string, csrfSecret: string): boolean {
  if (!token || !sessionId || !csrfSecret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [nonce, signature] = parts;
  if (!nonce || !signature) return false;

  const expectedSignature = createHmac('sha256', csrfSecret)
    .update(`${sessionId}:${nonce}`)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}
