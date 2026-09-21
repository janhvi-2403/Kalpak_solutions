import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  APP_NAME: z.string().default('kalpak-saas-platform'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),

  // PostgreSQL Connection
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://kalpak_user:kalpak_secure_password@localhost:5432/kalpak_saas_db?schema=public'),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),

  // Session & Security
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters long')
    .default('dev_session_secret_replace_in_production_min_32_characters_long'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  SESSION_COOKIE_NAME: z.string().default('kalpak_session'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // CSRF Protection
  CSRF_SECRET: z
    .string()
    .min(32, 'CSRF_SECRET must be at least 32 characters long')
    .default('dev_csrf_secret_replace_in_production_min_32_characters_long'),

  // MFA Configuration
  MFA_APP_NAME: z.string().default('Kalpak Solutions'),
  MFA_BACKUP_CODES_COUNT: z.coerce.number().int().positive().default(10),

  // Logging & Observability
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // CORS Configuration
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://127.0.0.1:3000')
    .transform((val) => val.split(',').map((origin) => origin.trim())),
});

export type EnvConfig = z.infer<typeof envSchema>;
