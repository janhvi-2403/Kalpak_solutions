import { randomBytes, createHmac, createHash, timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to Base32 string (standard RFC 3548 / RFC 4648).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | (buffer[i] as number);
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer.
 */
export function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i] as string);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 TOTP secret key (20 bytes / 160 bits).
 */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * Generates an otpauth:// URI for authenticator app QR codes.
 */
export function getTotpUri(secret: string, accountName: string, issuer: string): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a high-quality Data URL (base64 image/png) for displaying TOTP setup QR code in frontend.
 */
export async function generateTotpQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

/**
 * Calculates the current TOTP token for a secret at a given timestamp.
 */
export function calculateTotp(secret: string, timestampMs: number = Date.now(), timeStepSec: number = 30): string {
  const epochStep = Math.floor(timestampMs / 1000 / timeStepSec);
  const key = base32Decode(secret);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(epochStep), 0);

  const hmac = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = (hmac[hmac.length - 1] as number) & 0x0f;
  const code =
    (((hmac[offset] as number) & 0x7f) << 24) |
    (((hmac[offset + 1] as number) & 0xff) << 16) |
    (((hmac[offset + 2] as number) & 0xff) << 8) |
    ((hmac[offset + 3] as number) & 0xff);

  const token = (code % 1000000).toString().padStart(6, '0');
  return token;
}

/**
 * Verifies a 6-digit TOTP code allowing +/- 1 time step window for clock skew.
 */
export function verifyTotp(token: string, secret: string, windowSteps: number = 1): boolean {
  if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
    return false;
  }

  const now = Date.now();
  const timeStepMs = 30 * 1000;

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const candidate = calculateTotp(secret, now + i * timeStepMs);
    if (candidate === token) {
      return true;
    }
  }

  return false;
}

/**
 * Hashes a backup code with SHA-256 for secure storage.
 */
export function hashBackupCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verifies a provided backup code against a list of stored SHA-256 backup code hashes.
 * Returns the matched hash if valid, or null if not found.
 */
export function verifyAndConsumeBackupCode(
  providedCode: string,
  storedHashes: string[]
): { valid: boolean; matchedHash: string | null } {
  if (!providedCode || !storedHashes || storedHashes.length === 0) {
    return { valid: false, matchedHash: null };
  }

  const providedHash = hashBackupCode(providedCode);
  const providedBuffer = Buffer.from(providedHash, 'hex');

  for (const storedHash of storedHashes) {
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (storedBuffer.length === providedBuffer.length && timingSafeEqual(storedBuffer, providedBuffer)) {
      return { valid: true, matchedHash: storedHash };
    }
  }

  return { valid: false, matchedHash: null };
}
