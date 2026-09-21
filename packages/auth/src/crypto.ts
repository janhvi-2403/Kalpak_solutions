import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function deriveKey(secretKey: string): Buffer {
  return createHash('sha256').update(secretKey).digest();
}

/**
 * Encrypts a plaintext secret (such as a TOTP base32 key) using AES-256-GCM.
 * Output format: "enc:v1:<hex-iv>:<hex-tag>:<hex-ciphertext>"
 */
export function encryptSecret(plaintext: string, secretKey: string): string {
  if (!plaintext) {
    return '';
  }
  const key = deriveKey(secretKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 * Falls back safely if the string is unencrypted plaintext for backwards compatibility.
 */
export function decryptSecret(ciphertext: string, secretKey: string): string {
  if (!ciphertext) {
    return '';
  }
  if (!ciphertext.startsWith('enc:v1:')) {
    // Unencrypted legacy fallback
    return ciphertext;
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted secret format');
  }

  const iv = Buffer.from(parts[2] as string, 'hex');
  const authTag = Buffer.from(parts[3] as string, 'hex');
  const encryptedText = parts[4] as string;

  const key = deriveKey(secretKey);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
