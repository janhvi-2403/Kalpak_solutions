import { randomBytes, createHash } from 'crypto';

/**
 * Generates a cryptographically random session token (32 bytes / 64 hex characters).
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Computes a deterministic SHA-256 hash of a session token for storage.
 * Only the hashed token is stored in the database to mitigate credential exposure.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a set of cryptographically random one-time backup codes for MFA recovery.
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8-character alphanumeric code formatted as XXXX-XXXX
    const raw = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}
