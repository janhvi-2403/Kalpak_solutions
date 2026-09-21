import * as dotenv from 'dotenv';
import * as path from 'path';
import { envSchema, EnvConfig } from './schema';

// Find root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export function validateConfig(customEnv?: Record<string, unknown>): EnvConfig {
  const envToValidate = customEnv || process.env;
  const result = envSchema.safeParse(envToValidate);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(
      `[CRITICAL CONFIG ERROR] Invalid application environment configuration:\n${errorDetails}\nPlease check your .env file against .env.example.`
    );
  }

  return result.data;
}

let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateConfig();
  }
  return cachedConfig;
}

export * from './schema';
