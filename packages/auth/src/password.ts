import { scrypt, randomBytes, timingSafeEqual, BinaryLike, ScryptOptions } from 'crypto';

const scryptAsync = (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
};

// OWASP Recommended Scrypt Parameters
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization
  maxmem: 32 * 1024 * 1024, // 32MB
};

/**
 * Hashes a plaintext password using salted scrypt with OWASP parameters.
 * Format: scrypt:N:r:p:salt:derivedKey (hex encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scryptAsync(
    password,
    salt,
    KEY_LENGTH,
    SCRYPT_OPTIONS
  )) as Buffer;

  return [
    'scrypt',
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString('hex'),
    derivedKey.toString('hex'),
  ].join(':');
}

/**
 * Verifies a plaintext password against a stored hash in constant time.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      return false;
    }

    const N = parseInt(parts[1] as string, 10);
    const r = parseInt(parts[2] as string, 10);
    const p = parseInt(parts[3] as string, 10);
    const salt = Buffer.from(parts[4] as string, 'hex');
    const expectedKey = Buffer.from(parts[5] as string, 'hex');

    const derivedKey = (await scryptAsync(password, salt, expectedKey.length, {
      N,
      r,
      p,
      maxmem: 32 * 1024 * 1024,
    })) as Buffer;

    return timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}
