# StockSense — Security Hardening Specification & Audit Report

This document provides the formal security specification, vulnerability findings, mitigation controls, and operational checklist for the StockSense application platform.

---

## 1. Authentication Security Baseline

- **Password Hashing**: Uses **Argon2id** (`memoryCost: 19456`, `timeCost: 2`) via Bun's native crypto implementation. Plaintext passwords are never logged, stored, or exposed in error responses.
- **JWT Tokens**: Signed with `HMAC-SHA256` using `config.jwt.secret`. Enforces expiration windows (default 7 days). Invalid or tampered tokens return HTTP `401 Unauthorized`.
- **OTP Security**: 6-digit numeric password reset OTPs generated using CSPRNG (`crypto.getRandomValues()`), stored as Argon2id hashes with 10-minute expiry windows and a maximum limit of 5 attempt failures.

---

## 2. Authorization & Role-Based Access Control (RBAC)

- **Protected API Routes**: All non-public routes (`/api/products`, `/api/receipts`, `/api/deliveries`, `/api/transfers`, `/api/adjustments`, `/api/warehouses`, `/api/ai/chat`) are protected by `authMiddleware`.
- **Role Permissions**: `requireRole("admin", "manager")` middleware attached to mutating resource endpoints (creating/updating/deleting warehouses, products, categories, UOMs, and inventory processing). Staff (`staff`) role users receive `HTTP 403 Forbidden` on unauthorized mutation attempts.
- **AI Tool Execution RBAC**: The AI Orchestrator inspects the authenticated user context before executing tools. Staff users cannot trigger inventory-mutating actions through conversational prompts.

---

## 3. Defense-in-Depth & Network Hardening

### 3.1 Security Headers
The backend server injects security response headers into every HTTP response:
- `X-Content-Type-Options: nosniff` (Prevents MIME-sniffing)
- `X-Frame-Options: DENY` (Prevents Clickjacking iframe embedding)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS enabled in production)

### 3.2 Request Body Size Limits
- Enforces a **10MB maximum request payload limit** (`HTTP 413 Payload Too Large`) to prevent memory-exhaustion Denial-of-Service attacks.

### 3.3 Rate Limiting
- **In-Memory Sliding Window Rate Limiter** ([backend/src/app/middleware/rate-limiter.ts](file:///d:/ODOO%20X%20GCTE/backend/src/app/middleware/rate-limiter.ts)) attached to brute-force sensitive endpoints:
  - `POST /api/auth/login`: Max 15 attempts / 15 min per IP.
  - `POST /api/auth/register`: Max 10 accounts / 1 hour per IP.
  - `POST /api/auth/forgot-password`, `/verify-otp`, `/reset-password`: Max 5 attempts / 15 min per IP.
  - `POST /api/ai/chat`: Max 30 prompts / 1 min per IP.

---

## 4. SQL Injection & Input Sanitation

- **Drizzle ORM Builder**: All queries use Drizzle ORM parameter binding (`eq()`, `and()`, `inArray()`). Zero dynamic string interpolation is used in SQL query execution.
- **AI Tool Sandbox**: AI tools pass parameters through Zod schemas (`listStockMovementsQuerySchema`, etc.). Arbitrary user SQL generation is strictly prohibited.

---

## 5. Security Test Suite (`bun test tests/security.test.ts`)

Automated tests in [backend/tests/security.test.ts](file:///d:/ODOO%20X%20GCTE/backend/tests/security.test.ts) verify:
1. `401 Unauthorized` on missing auth headers.
2. `401 Unauthorized` on tampered/invalid JWT tokens.
3. Attachment of security response headers (`X-Content-Type-Options`, `X-Frame-Options`).
4. `x-request-id` header echo for log correlation.
5. `413 Payload Too Large` on oversized request bodies.
6. `403 Forbidden` on unauthorized RBAC mutation attempts.
7. `400 Bad Request` sanitation on malformed JSON payloads.
8. `403 Forbidden` on staff user AI inventory action attempts.

---

## 6. Security Maintenance & Credential Rotation Checklist

1. **JWT Secret Rotation**: Rotate `JWT_SECRET` in environment configuration periodically or immediately upon suspect compromise.
2. **Database Credentials**: Use dedicated unprivileged database users in production rather than `postgres` superuser accounts.
3. **Groq API Keys**: Store `GEMINI_API_KEY` securely as an environment variable; never hardcode or log key strings.
