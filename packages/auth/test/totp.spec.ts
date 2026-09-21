import { generateTotpSecret, calculateTotp, verifyTotp, getTotpUri } from '../src/totp';

describe('TOTP / Multi-Factor Authentication', () => {
  it('should generate a valid Base32 secret string', () => {
    const secret = generateTotpSecret();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThanOrEqual(16);
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it('should generate and verify a valid TOTP token', () => {
    const secret = generateTotpSecret();
    const token = calculateTotp(secret);

    expect(token).toHaveLength(6);
    expect(/^\d{6}$/.test(token)).toBe(true);

    const isValid = verifyTotp(token, secret);
    expect(isValid).toBe(true);
  });

  it('should reject invalid or malformed tokens', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp('000000', secret)).toBe(false);
    expect(verifyTotp('invalid', secret)).toBe(false);
  });

  it('should construct a valid otpauth URI for authenticator QR codes', () => {
    const secret = generateTotpSecret();
    const uri = getTotpUri(secret, 'user@kalpak.com', 'Kalpak Solutions');

    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('secret=');
    expect(uri).toContain('issuer=Kalpak%20Solutions');
  });
});
