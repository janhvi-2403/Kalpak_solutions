import { hash, verify } from '@node-rs/argon2';
import { scrypt, timingSafeEqual, BinaryLike, ScryptOptions } from 'crypto';

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

// OWASP Recommended Argon2id Parameters
const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 parallel threads
  outputLen: 32,
};

/**
 * Hashes a plaintext password using Argon2id with OWASP-recommended parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored Argon2id or legacy scrypt hash in constant time.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) {
    return false;
  }

  try {
    // Check if hash is standard Argon2 format ($argon2id$...)
    if (storedHash.startsWith('$argon2')) {
      return await verify(storedHash, password);
    }

    // Fallback: Legacy scrypt verification
    const parts = storedHash.split(':');
    if (parts.length === 6 && parts[0] === 'scrypt') {
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
    }

    return false;
  } catch {
    return false;
  }
}
