# Rise Local Backend Security Audit Report

**Audit Date:** January 28, 2026
**Fixes Applied:** January 28, 2026
**Scope:** Login/Signup Workflows, Session Management, Admin Functions, Critical Backend Routes
**Auditor:** Claude Code Security Review

---

## Status: FIXES APPLIED

All critical and high-priority vulnerabilities identified in this audit have been remediated.
See commit `05c4e3a` for the security fixes.

---

## Executive Summary

This audit examines the Rise Local backend security posture, focusing on authentication, authorization, and critical business functions. The application uses **Replit Auth (OpenID Connect)** for authentication with **Express.js** and **PostgreSQL/Drizzle ORM**.

### Overall Risk Assessment: **MEDIUM-HIGH**

While the core authentication flow leverages a trusted identity provider (Replit OIDC), several authorization gaps and missing security controls present risks that should be addressed.

---

## Table of Contents

1. [Authentication Flow Analysis](#1-authentication-flow-analysis)
2. [Authorization & Access Control Issues](#2-authorization--access-control-issues)
3. [Session Management](#3-session-management)
4. [API Security Issues](#4-api-security-issues)
5. [Admin Functions Security](#5-admin-functions-security)
6. [Data Exposure Risks](#6-data-exposure-risks)
7. [Recommendations Summary](#7-recommendations-summary)

---

## 1. Authentication Flow Analysis

### Current Implementation

**File:** `server/replitAuth.ts`

The application uses Replit's OpenID Connect (OIDC) for authentication:

- **Login Endpoint:** `GET /api/login` - Initiates OIDC flow with Passport.js
- **Callback Endpoint:** `GET /api/callback` - Handles OIDC response
- **Logout Endpoint:** `GET /api/logout` - Ends session

### Strengths

- Uses battle-tested Passport.js with OIDC strategy
- Session stored in PostgreSQL (not memory)
- Cookies are `httpOnly: true` and `secure: true`
- Token refresh mechanism implemented in `isAuthenticated` middleware
- Role information stored in session and cookie (fallback pattern)

### Issues Found

#### ISSUE AUTH-1: Open Redirect Vulnerability (MEDIUM)
**Location:** `replitAuth.ts:125-133`, `replitAuth.ts:287-292`

```typescript
// returnTo is stored directly from user input
if (returnTo) {
  (req.session as any).returnTo = returnTo;
  res.cookie("return_to", returnTo, {...});
}
// Later used in redirect without validation
if (returnTo) {
  redirectUrl = returnTo;
}
return res.redirect(redirectUrl);
```

**Risk:** An attacker could craft a malicious link: `/api/login?returnTo=https://evil.com/phish` and after login, the user is redirected to an attacker-controlled site.

**Recommendation:** Validate `returnTo` is a relative path or matches allowed domains:
```typescript
function isValidReturnTo(url: string): boolean {
  try {
    // Only allow relative paths
    if (url.startsWith('/') && !url.startsWith('//')) return true;
    // Or validate against allowed domains
    const parsed = new URL(url, 'https://riselocal.com');
    return parsed.hostname === 'riselocal.com' ||
           parsed.hostname.endsWith('.riselocal.com');
  } catch {
    return false;
  }
}
```

#### ISSUE AUTH-2: Role Escalation via Cookie Manipulation (LOW-MEDIUM)
**Location:** `replitAuth.ts:112-122`, `replitAuth.ts:181`

```typescript
// Intended role stored in cookie as backup
res.cookie("intended_role", intendedRole, {...});
// Later retrieved and trusted
let intendedRole = (req.session as any).intendedRole || req.cookies.intended_role;
```

**Risk:** While the server does verify admin status from database, the intended_role cookie could potentially be manipulated. The code does check for existing roles before applying, but the fallback to cookies is concerning.

**Mitigation in Place:** Lines 204-230 check database for existing roles before applying intended_role. However, the cookie fallback pattern introduces unnecessary attack surface.

---

## 2. Authorization & Access Control Issues

### ISSUE AUTHZ-1: Missing Admin Check on User Update (HIGH)
**Location:** `routes.ts:4653-4661`

```typescript
app.patch("/api/users/:id", async (req, res) => {
  try {
    const validatedData = insertUserSchema.partial().parse(req.body);
    await storage.updateUser(req.params.id, validatedData);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Invalid user update data" });
  }
});
```

**Risk: CRITICAL** - This endpoint allows ANY unauthenticated user to update ANY user's data. No `isAuthenticated` middleware, no ownership check, no admin verification.

**Potential Exploit:**
```bash
curl -X PATCH https://riselocal.com/api/users/[victim-user-id] \
  -H "Content-Type: application/json" \
  -d '{"isAdmin": true, "role": "admin"}'
```

**Recommendation:** Add authentication and authorization:
```typescript
app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
  const userId = req.user.claims.sub;
  const targetId = req.params.id;
  const user = await storage.getUser(userId);

  // Only allow self-update or admin update
  if (userId !== targetId && !user?.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // ... rest of logic
});
```

### ISSUE AUTHZ-2: Missing Admin Check on User Delete (HIGH)
**Location:** `routes.ts:4663-4670`

```typescript
app.delete("/api/users/:id", async (req, res) => {
  try {
    await storage.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});
```

**Risk: CRITICAL** - Any unauthenticated user can delete ANY user account.

**Recommendation:** Restrict to admin-only with audit logging.

### ISSUE AUTHZ-3: Missing Auth on User Create (MEDIUM)
**Location:** `routes.ts:4621-4629`

```typescript
app.post("/api/users", async (req, res) => {
  try {
    const validatedData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(validatedData);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: "Invalid user data" });
  }
});
```

**Risk:** Allows unauthenticated user creation, which could enable mass account creation or spam. May be intentional for signup but exposes the full user schema including admin flags.

### ISSUE AUTHZ-4: Public User Data Leak (MEDIUM)
**Location:** `routes.ts:203-216`

```typescript
app.get('/api/users/:id', async (req, res) => {
  const user = await storage.getUser(req.params.id);
  // Return only non-sensitive user data
  const { password, ...publicUserData } = user;
  res.json(publicUserData);
});
```

**Risk:** This returns almost ALL user fields except password - including:
- Email address
- Phone number
- Role and admin status
- Stripe customer/subscription IDs
- Membership status and expiration
- Zip code

**Recommendation:** Use a strict allowlist of public fields:
```typescript
const publicFields = {
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  profileImageUrl: user.profileImageUrl,
};
```

### ISSUE AUTHZ-5: Vendor Signup Allows Unvalidated Data (MEDIUM)
**Location:** `routes.ts:4542-4562`

```typescript
app.post("/api/vendors/signup", isAuthenticated, async (req: any, res) => {
  const ownerId = req.user.claims.sub;
  const vendorData = req.body;

  await storage.updateUser(ownerId, { role: "vendor" });

  const vendor = await storage.createVendor({
    ...vendorData,
    ownerId,
    isVerified: vendorData.isFoundingMember || false, // USER CONTROLS VERIFICATION!
  });
});
```

**Risk:** User-provided `isFoundingMember` directly controls `isVerified` status. Attackers can set themselves as founding members and get auto-verified.

**Recommendation:** Never trust client input for verification status:
```typescript
const vendor = await storage.createVendor({
  ...vendorData,
  ownerId,
  isVerified: false, // Always start unverified
  isFoundingMember: false, // Set server-side based on count
});
```

---

## 3. Session Management

### Current Implementation

**File:** `server/replitAuth.ts:26-46`

```typescript
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
return session({
  secret: process.env.SESSION_SECRET!,
  store: sessionStore, // PostgreSQL
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    maxAge: sessionTtl,
  },
});
```

### Strengths

- Sessions stored in PostgreSQL (persistent, scalable)
- `httpOnly: true` prevents XSS session theft
- `secure: true` requires HTTPS
- 7-day expiration is reasonable

### Issues Found

#### ISSUE SESS-1: Missing SameSite Cookie Attribute (LOW-MEDIUM)
**Location:** `replitAuth.ts:40-44`

The session cookie does not set `sameSite` attribute.

**Recommendation:**
```typescript
cookie: {
  httpOnly: true,
  secure: true,
  maxAge: sessionTtl,
  sameSite: 'lax', // Prevents CSRF in most cases
}
```

#### ISSUE SESS-2: Token Storage in Session Object (LOW)
**Location:** `replitAuth.ts:48-56`

```typescript
function updateUserSession(user, tokens) {
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
}
```

Access and refresh tokens are stored directly in the session object. While the session is server-side, this means tokens are serialized to the database.

---

## 4. API Security Issues

### ISSUE API-1: Missing Rate Limiting (HIGH)
**All routes**

No rate limiting middleware is visible in the codebase. Critical endpoints like login, signup, and API calls are unprotected.

**Risk:**
- Brute force attacks on login
- Resource exhaustion via API abuse
- Credential stuffing attacks

**Recommendation:** Add rate limiting middleware:
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts'
});

app.use('/api/login', authLimiter);
```

### ISSUE API-2: CORS Configuration Missing (MEDIUM)
**File:** `server/index.ts`

No CORS middleware configuration was found. The application may accept requests from any origin.

### ISSUE API-3: Missing Input Validation on Several Routes (MEDIUM)
Several routes accept user input without validation beyond basic Zod schemas:

- `GET /api/vendors/search?q=` - No sanitization of search query
- `POST /api/messages` - No content sanitization
- Deal redemption endpoints - Limited validation

---

## 5. Admin Functions Security

### Current Implementation

Admin checks use this pattern:
```typescript
const isAdmin = adminUser?.isAdmin === true || adminUser?.role === 'admin';
```

### Issues Found

#### ISSUE ADMIN-1: Admin Sync Membership Has API Key Fallback (MEDIUM)
**Location:** `routes.ts:1632-1665`

```typescript
app.post("/api/admin/sync-membership", async (req: any, res) => {
  const providedApiKey = req.headers['x-admin-api-key'];

  if (providedApiKey) {
    if (providedApiKey !== adminApiKey) {
      return res.status(403).json({ error: "Invalid ADMIN_API_KEY" });
    }
    // API key auth succeeds - no further checks
  }
});
```

**Risk:** This endpoint accepts an API key for authentication, which:
- Could be leaked in logs or environment dumps
- Has no expiration or rotation
- Is a shared secret

**Recommendation:**
- Prefer session-based admin auth
- If API key needed, implement proper key management
- Add IP allowlisting for API key access

#### ISSUE ADMIN-2: Bulk Sync Processes All Users Sequentially (LOW)
**Location:** `routes.ts:1849-1919`

Processing happens in a loop which could:
- Timeout on large user bases
- Be interrupted mid-process

---

## 6. Data Exposure Risks

### ISSUE DATA-1: Stripe Webhook Logs Sensitive Data (MEDIUM)
**Location:** `routes.ts:3006-3021`

```typescript
console.log('[Stripe Webhook] Event received and verified', {
  customerId: eventObject.customer || null,
  customerEmail: eventObject.customer_email || null,
  metadata: eventObject.metadata || null,
});
```

Customer email and Stripe IDs are logged. If logs are not properly secured, this constitutes PII exposure.

### ISSUE DATA-2: Admin User List Exposes Stripe Data (LOW)
**Location:** `routes.ts:4585-4600`

The admin `/api/users` endpoint returns Stripe subscription IDs which could be used in social engineering attacks.

---

## 7. Recommendations Summary

### Critical Priority - FIXED ✅

| Issue | Location | Status |
|-------|----------|--------|
| AUTHZ-1 | `routes.ts:4653` | ✅ FIXED - Added `isAuthenticated` + admin check |
| AUTHZ-2 | `routes.ts:4663` | ✅ FIXED - Added `isAuthenticated` + admin check |
| AUTHZ-3 | `routes.ts:4621` | ✅ FIXED - Added `isAuthenticated` + admin check to POST /api/users |
| API-1 | Global | ✅ FIXED - Added rate limiting (10 req/15min login, 20 req/15min callback) |

### High Priority - FIXED ✅

| Issue | Location | Status |
|-------|----------|--------|
| AUTH-1 | `replitAuth.ts:125` | ✅ FIXED - Added `isValidReturnTo()` validation |
| AUTHZ-5 | `routes.ts:4554` | ✅ FIXED - Removed client control, always starts unverified |
| AUTHZ-4 | `routes.ts:203` | ✅ FIXED - Returns only id, name, profileImageUrl, isVendor |

### Medium Priority - FIXED ✅

| Issue | Location | Status |
|-------|----------|--------|
| SESS-1 | `replitAuth.ts:40` | ✅ FIXED - Added `sameSite: 'lax'` |

### Remaining Items (Lower Priority)

| Issue | Location | Recommendation |
|-------|----------|----------------|
| API-2 | Global | Configure CORS properly |
| ADMIN-1 | `routes.ts:1632` | Review API key authentication pattern |
| DATA-1 | `routes.ts:3006` | Sanitize PII from logs |
| AUTH-2 | `replitAuth.ts:181` | Remove cookie fallback for intended_role |
| SESS-2 | `replitAuth.ts:48` | Consider encrypting tokens in session |

---

## Password Reset Flow

**Note:** Rise Local uses Replit Auth (OIDC) which handles password management externally. There is no local password reset flow - users manage their credentials through Replit's identity system. This is a security positive as it delegates credential management to the identity provider.

Legacy password fields exist in the schema but are not actively used for authentication.

---

## Appendix: Files Reviewed

1. `server/replitAuth.ts` - Authentication middleware and OIDC setup
2. `server/routes.ts` - All API endpoints (~6500 lines)
3. `server/storage.ts` - Database access layer
4. `shared/schema.ts` - Database schema definitions
5. `client/src/pages/Auth.tsx` - Frontend auth page
6. `client/src/components/AuthBoundary.tsx` - Route protection
7. `client/src/hooks/useAuth.ts` - Auth state hook

---

*This audit represents a point-in-time review. Regular security assessments are recommended.*
