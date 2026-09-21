// ==============================================================================
// Sensitive Field Masking Rules
// Prevents accidental leakage of credentials, tokens, or PII into log sinks.
// ==============================================================================

export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'mfaSecret',
  'secret',
  'authorization',
  'cookie',
  'apiKey',
  'creditCard',
  'cvv',
];

export const REDACTION_PATHS = [
  ...SENSITIVE_FIELDS,
  ...SENSITIVE_FIELDS.map((field) => `*.${field}`),
  ...SENSITIVE_FIELDS.map((field) => `*.*.${field}`),
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-session-token"]',
  'res.headers["set-cookie"]',
];

export const REDACTION_CENSOR = '[REDACTED]';
