"use strict";
// ==============================================================================
// Sensitive Field Masking Rules
// Prevents accidental leakage of credentials, tokens, or PII into log sinks.
// ==============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDACTION_CENSOR = exports.REDACTION_PATHS = exports.SENSITIVE_FIELDS = void 0;
exports.SENSITIVE_FIELDS = [
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
exports.REDACTION_PATHS = [
    ...exports.SENSITIVE_FIELDS,
    ...exports.SENSITIVE_FIELDS.map((field) => `*.${field}`),
    ...exports.SENSITIVE_FIELDS.map((field) => `*.*.${field}`),
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-session-token"]',
    'res.headers["set-cookie"]',
];
exports.REDACTION_CENSOR = '[REDACTED]';
//# sourceMappingURL=redaction.js.map