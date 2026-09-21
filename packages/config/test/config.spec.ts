import { envSchema } from '../src/schema';

describe('Environment Configuration Validation', () => {
  it('should validate valid environment configuration successfully', () => {
    const validConfig = {
      NODE_ENV: 'development',
      PORT: '4000',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      SESSION_SECRET: 'a_very_long_secure_secret_that_is_at_least_32_characters_long',
      CSRF_SECRET: 'another_very_long_secure_secret_at_least_32_chars_long',
    };

    const parsed = envSchema.safeParse(validConfig);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.PORT).toBe(4000);
      expect(parsed.data.NODE_ENV).toBe('development');
    }
  });

  it('should reject SESSION_SECRET that is too short', () => {
    const invalidConfig = {
      SESSION_SECRET: 'short_secret',
    };

    const parsed = envSchema.safeParse(invalidConfig);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.path[0]);
      expect(issues).toContain('SESSION_SECRET');
    }
  });
});
