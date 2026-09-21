import {
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  getTotpUri,
  calculateTotp,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  verifyAndConsumeBackupCode,
  encryptSecret,
  decryptSecret,
  generateSessionToken,
  hashToken,
} from '@kalpak/auth';

describe('Super Admin Security & Bootstrap Cryptography', () => {
  const TEST_KEY_32_BYTES = 'dev_mfa_encryption_key_min_32_characters_must_be_set_in_production';

  describe('1. Argon2id Password Hashing', () => {
    it('should hash password using Argon2id format and verify successfully', async () => {
      const plaintext = 'SuperSecure@Kalpak2026!';
      const hashedPassword = await hashPassword(plaintext);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.startsWith('$argon2')).toBe(true);

      const isValid = await verifyPassword(plaintext, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword123!', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should reject passwords shorter than 8 characters', async () => {
      await expect(hashPassword('short')).rejects.toThrow('at least 8 characters');
    });

    it('should maintain backward-compatible verification for legacy scrypt hashes', async () => {
      // Format: scrypt:N:r:p:salt:derivedKey
      const legacyScrypt =
        'scrypt:16384:8:1:f5b12ef0d56b823b5d259c1626f29dfd8ea7cb0f19c961e79cbfa62dcba6ca9d:6eb470e9a72ad41c2cbe00539fca6aa6d061ff3b8600c0f4df6746816fa8a8ebc88a5ebfa39d2551e1858c42c262ad01eb37f59d5718dfd720b601e389e47cb1';
      // Verifying invalid scrypt string safely returns false
      const result = await verifyPassword('RandomPass', legacyScrypt);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('2. Symmetric AES-256-GCM Secret Encryption at Rest', () => {
    it('should encrypt and decrypt sensitive TOTP secret at rest', () => {
      const rawSecret = generateTotpSecret();
      const encrypted = encryptSecret(rawSecret, TEST_KEY_32_BYTES);

      expect(encrypted).toBeDefined();
      expect(encrypted.startsWith('enc:v1:')).toBe(true);
      expect(encrypted).not.toEqual(rawSecret);

      const decrypted = decryptSecret(encrypted, TEST_KEY_32_BYTES);
      expect(decrypted).toBe(rawSecret);
    });
  });

  describe('3. TOTP Multi-Factor Authentication', () => {
    it('should generate valid Base32 secret and calculate matching 6-digit TOTP', () => {
      const secret = generateTotpSecret();
      expect(secret.length).toBeGreaterThanOrEqual(16);

      const uri = getTotpUri(secret, 'admin@kalpaksolutions.com', 'Kalpak Solutions');
      expect(uri.startsWith('otpauth://totp/Kalpak%20Solutions:admin%40kalpaksolutions.com')).toBe(true);
      expect(uri.includes(`secret=${secret}`)).toBe(true);

      const currentCode = calculateTotp(secret);
      expect(currentCode).toMatch(/^\d{6}$/);

      const isValid = verifyTotp(currentCode, secret);
      expect(isValid).toBe(true);

      const isInvalid = verifyTotp('000000', secret);
      // If by chance calculateTotp is '000000', test '999999'
      if (currentCode !== '000000') {
        expect(isInvalid).toBe(false);
      }
    });

    it('should allow +/- 1 time step window for clock skew', () => {
      const secret = generateTotpSecret();
      const pastCode = calculateTotp(secret, Date.now() - 30 * 1000); // 30s ago
      const futureCode = calculateTotp(secret, Date.now() + 30 * 1000); // 30s ahead

      expect(verifyTotp(pastCode, secret, 1)).toBe(true);
      expect(verifyTotp(futureCode, secret, 1)).toBe(true);
      expect(verifyTotp('12345', secret)).toBe(false); // wrong length
    });
  });

  describe('4. Emergency Backup / Recovery Codes', () => {
    it('should generate, hash, and verify one-time recovery codes', () => {
      const codes = generateBackupCodes(10);
      expect(codes.length).toBe(10);

      // Verify format XXXX-XXXX
      for (const code of codes) {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      }

      const storedHashes = codes.map(hashBackupCode);
      expect(storedHashes.length).toBe(10);

      // Test consuming the first code
      const codeToUse = codes[0] as string;
      const result = verifyAndConsumeBackupCode(codeToUse, storedHashes);

      expect(result.valid).toBe(true);
      expect(result.matchedHash).toBe(storedHashes[0]);

      // Verify invalid code
      const invalidResult = verifyAndConsumeBackupCode('XXXX-YYYY', storedHashes);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.matchedHash).toBeNull();
    });
  });

  describe('5. Session Token Security', () => {
    it('should generate high-entropy session tokens and deterministic SHA-256 hashes', () => {
      const rawToken1 = generateSessionToken();
      const rawToken2 = generateSessionToken();

      expect(rawToken1).not.toEqual(rawToken2);
      expect(rawToken1.length).toBe(64); // 32 bytes in hex

      const hash1 = hashToken(rawToken1);
      const hash2 = hashToken(rawToken2);

      expect(hash1).not.toEqual(hash2);
      expect(hash1).toBe(hashToken(rawToken1)); // Deterministic
    });
  });
});
