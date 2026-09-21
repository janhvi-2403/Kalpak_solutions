# Authentication Strategy & Decision Log

## 1. Architectural Decision: Stateful Sessions vs. Stateless JWTs

### Decision
We selected **Stateful Database-Backed Sessions with Cryptographic Hashing and HttpOnly Cookies**, paired with Bearer token compatibility for headless/mobile clients.

### Rationale & Trade-off Analysis
Many modern web applications reach for stateless JSON Web Tokens (JWT) simply because they are common. In a multi-tenant B2B SaaS platform, stateless JWTs present severe operational and security drawbacks:
1. **Instant Revocation Requirement**: When a user's permissions change, a tenant is suspended, an employee is terminated, or a security incident occurs, session revocation must take effect immediately across all requests. Stateless JWTs cannot be revoked without maintaining a distributed blocklist—which negates their statelessness.
2. **XSS Vulnerability**: Storing JWTs in browser `localStorage` or `sessionStorage` leaves them vulnerable to exfiltration through XSS vulnerabilities. Storing session identifiers in `HttpOnly` cookies completely isolates them from malicious JavaScript execution.
3. **MFA State Management**: Multi-factor authentication requires an intermediate, strictly enforced challenge phase. Stateful sessions cleanly support an `mfa_verified: false` state where the session can only invoke the MFA verification endpoint.
4. **Token Storage Leak Safety**: By storing a SHA-256 hash of the session token in the database, even an unauthorized read access or backup leak of the `sessions` table does not compromise active tokens.

---

## 2. Authentication Flow

```
+--------+                 +-------------+                   +----------------+
| Client |                 |   API/Auth  |                   |  PostgreSQL DB |
+----+---+                 +------+------+                   +-------+--------+
     |                            |                                  |
     | 1. POST /auth/login        |                                  |
     | (email, password)          |                                  |
     +--------------------------->|                                  |
     |                            | 2. Find user & verify scrypt     |
     |                            +--------------------------------->|
     |                            | 3. User & active memberships     |
     |                            |<---------------------------------+
     |                            |                                  |
     |                            | 4. Generate random token         |
     |                            |    Compute SHA-256 hash          |
     |                            | 5. Insert Session (hash, TTL)    |
     |                            +--------------------------------->|
     |                            |                                  |
     | 6. Return response with    |                                  |
     |    Set-Cookie: HttpOnly    |                                  |
     |<---------------------------+                                  |
```

---

## 3. Multi-Factor Authentication (MFA / 2-Step Verification)
* **Standard**: RFC 6238 Time-Based One-Time Password (TOTP).
* **Secret Generation**: Cryptographically secure 160-bit random Base32 encoded secret.
* **Enrollment**: URI generation compatible with Google Authenticator, 1Password, Authy.
* **Backup Codes**: Generation of 10 cryptographically random single-use recovery codes.
* **Challenge Enforcement**: When `user.mfaEnabled === true`, the initial login sets `session.mfaVerified = false`. The `SessionAuthGuard` immediately blocks access to any endpoint unless decorated with `@AllowUnverifiedMfa()` (specifically `/auth/mfa/verify`).
