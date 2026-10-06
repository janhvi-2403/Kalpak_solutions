import { hashPassword, verifyPassword } from '../src/password';

describe('Password Hashing & Verification', () => {
  it('should hash a password into a valid OWASP Argon2id format', async () => {
    const password = 'SecurePassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('should successfully verify a correct password against its hash', async () => {
    const password = 'CorrectPassword99$';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'CorrectPassword99$';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword('WrongPassword123!', hash);
    expect(isValid).toBe(false);
  });

  it('should reject password shorter than 8 characters during hashing', async () => {
    await expect(hashPassword('short')).rejects.toThrow(
      'Password must be at least 8 characters long'
    );
  });
});
