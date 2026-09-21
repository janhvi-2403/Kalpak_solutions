"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'staging', 'production']).default('development'),
    APP_NAME: zod_1.z.string().default('kalpak-saas-platform'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    WEB_PORT: zod_1.z.coerce.number().int().positive().default(3000),
    API_BASE_URL: zod_1.z.string().url().default('http://localhost:4000'),
    WEB_BASE_URL: zod_1.z.string().url().default('http://localhost:3000'),
    // PostgreSQL Connection
    DATABASE_URL: zod_1.z
        .string()
        .min(1, 'DATABASE_URL is required')
        .default('postgresql://kalpak_user:kalpak_secure_password@localhost:5432/kalpak_saas_db?schema=public'),
    DATABASE_POOL_MIN: zod_1.z.coerce.number().int().nonnegative().default(2),
    DATABASE_POOL_MAX: zod_1.z.coerce.number().int().positive().default(10),
    // Redis Configuration
    REDIS_HOST: zod_1.z.string().default('localhost'),
    REDIS_PORT: zod_1.z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: zod_1.z.string().optional().default(''),
    REDIS_DB: zod_1.z.coerce.number().int().nonnegative().default(0),
    // Session & Security
    SESSION_SECRET: zod_1.z
        .string()
        .min(32, 'SESSION_SECRET must be at least 32 characters long')
        .default('dev_session_secret_replace_in_production_min_32_characters_long'),
    SESSION_TTL_HOURS: zod_1.z.coerce.number().int().positive().default(24),
    SESSION_COOKIE_NAME: zod_1.z.string().default('kalpak_session'),
    COOKIE_DOMAIN: zod_1.z.string().default('localhost'),
    COOKIE_SECURE: zod_1.z
        .string()
        .transform((val) => val === 'true')
        .default('false'),
    // CSRF Protection
    CSRF_SECRET: zod_1.z
        .string()
        .min(32, 'CSRF_SECRET must be at least 32 characters long')
        .default('dev_csrf_secret_replace_in_production_min_32_characters_long'),
    // MFA Configuration
    MFA_APP_NAME: zod_1.z.string().default('Kalpak Solutions'),
    MFA_BACKUP_CODES_COUNT: zod_1.z.coerce.number().int().positive().default(10),
    // Logging & Observability
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    LOG_PRETTY: zod_1.z
        .string()
        .transform((val) => val === 'true')
        .default('false'),
    // CORS Configuration
    CORS_ALLOWED_ORIGINS: zod_1.z
        .string()
        .default('http://localhost:3000,http://127.0.0.1:3000')
        .transform((val) => val.split(',').map((origin) => origin.trim())),
});
//# sourceMappingURL=schema.js.map