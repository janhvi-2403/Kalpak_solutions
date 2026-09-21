# Security Baseline & Controls

## 1. Threat Mitigation Matrix

| Security Threat | Mitigation in Platform Foundation |
| :--- | :--- |
| **SQL Injection** | Parameterized queries enforced across all database queries via Prisma ORM and raw SQL prepared parameters. |
| **Cross-Site Scripting (XSS)** | React automatic output escaping; Helmet HTTP security headers (CSP, X-XSS-Protection); input sanitization filters (`sanitizeText`); sensitive tokens stored in `HttpOnly` cookies unreachable by JavaScript. |
| **Cross-Site Request Forgery (CSRF)** | `SameSite=Lax` cookies; HMAC-signed CSRF tokens generated per session via `/api/v1/auth/csrf` for state-modifying requests. |
| **Broken Access Control & IDOR** | PostgreSQL Row-Level Security (RLS) policies; multi-tenant database constraints; server-side verified TenantContext derived from session identity rather than client headers. |
| **Mass Assignment** | NestJS `ValidationPipe` configured with `whitelist: true` and `forbidNonWhitelisted: true`, rejecting requests containing unmapped properties. |
| **Sensitive Data Exposure** | Automatic field-level redaction in Pino logger (`password`, `token`, `secret`, `cookie`, `authorization`); hashed storage of session tokens (SHA-256) so a database leak does not expose active session tokens. |
| **Brute Force & Credential Stuffing** | Constant-time password verification using scrypt; generic error messages on authentication failures ("Invalid email or password"); ready for IP/user rate limiting. |
| **Improper Error Disclosure** | `GlobalExceptionFilter` intercepts all unhandled errors, transforming them into standardized RFC 7807 problem payloads without exposing internal database structures or server call stacks. |

---

## 2. Password Security Policy
* **Algorithm**: Salted `scrypt` key derivation function with OWASP-recommended parameters ($N=16384, r=8, p=1$, 32-byte cryptographically secure random salt, 64-byte derived key).
* **Storage Format**: `scrypt:16384:8:1:<hex_salt>:<hex_key>`
* **Verification**: Constant-time comparison using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
* **Complexity Rules**: Enforced minimum 8 characters, requiring at least one uppercase letter, one lowercase letter, one digit, and one special symbol.

---

## 3. Session Security
* Session tokens are 32 cryptographically random bytes (64 hexadecimal characters).
* Raw tokens are **never** stored in the database. Only a SHA-256 cryptographic digest is persisted (`session_token_hash`).
* Cookie attributes:
  - `HttpOnly: true` (prevents malicious client script access)
  - `Secure: true` in production (enforces HTTPS transmission)
  - `SameSite: Lax`
  - Strict time-to-live (`SESSION_TTL_HOURS`)
  - Instant server-side revocation capability via `revoked_at`.
