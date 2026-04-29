# 🔐 SECURITY IMPLEMENTATION RULES - MANDATORY

**Created**: November 5, 2025  
**Status**: 🔴 ENFORCED - These are rules, not suggestions  
**Authority**: HIGHEST - Overrides all other considerations

---

## ⚠️ CRITICAL: RULE ENFORCEMENT

These are **MANDATORY RULES** that I (Cascade AI) MUST follow for ALL code changes.
I CANNOT deviate from these rules under ANY circumstance.

---

## 🚨 RULE 1: API Route Protection (ZERO EXCEPTIONS)

### MANDATORY PATTERN:
```typescript
import { withAuth } from '@middleware/auth';

export const POST = withAuth(async (request, session) => {
  // Session is GUARANTEED - no need to check
  // I MUST use this pattern for EVERY protected route
}, {
  requiredRole?: 'OWNER' | 'MANAGER',
  requiredPlatformRole?: 'PLATFORM' | 'ADMIN'
});
```

### ENFORCEMENT:
- ❌ I MUST NEVER create a protected API route without `withAuth()`
- ❌ I MUST NEVER manually check `session` inside route handlers
- ❌ I MUST NEVER implement custom authentication logic
- ✅ I MUST use `withAuth()` from `@middleware/auth` for ALL protected routes

### FILES AFFECTED:
- All files matching: `src/app/api/**/route.ts`
- Protected routes: Authentication, AI operations, data mutations

---

## 🚨 RULE 2: Multi-Tenant Isolation (CRITICAL SECURITY)

### MANDATORY PATTERN:
```typescript
import { verifyTenantAccess } from '@middleware/auth';

export const POST = withAuth(async (request, session) => {
  const { tenantId, storeId } = await request.json();
  
  // I MUST verify tenant access before ANY data operation
  if (!verifyTenantAccess(session, tenantId, storeId, request)) {
    // CRITICAL alert automatically sent to Sentry
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Safe to proceed - tenant verified
});
```

### ENFORCEMENT:
- ❌ I MUST NEVER access tenant data without `verifyTenantAccess()`
- ❌ I MUST NEVER trust `tenantId` from client without verification
- ❌ I MUST NEVER skip tenant verification for "convenience"
- ✅ I MUST call `verifyTenantAccess()` before ANY database query involving tenant data

### SEVERITY:
- Violation = **CRITICAL** security breach
- Auto-logs to Sentry with CRITICAL severity
- Prevents horizontal privilege escalation

---

## 🚨 RULE 3: Input Validation (BEFORE Database Access)

### MANDATORY PATTERN:
```typescript
import { z } from 'zod';
import { validateAPIInput } from '@lib/validation/validateAPIInput';

const schema = z.object({
  email: z.string().email(),
  tenantId: z.number().positive(),
  name: z.string().min(1).max(255)
});

export const POST = withAuth(async (request, session) => {
  const body = await request.json();
  
  // I MUST validate ALL user input BEFORE using it
  const validation = validateAPIInput(schema, body);
  
  if (!validation.success) {
    logger.security('Input Validation Failed', {
      ...buildSecurityContext(session, request),
      error: validation.error,
    }, 'medium');
    
    return NextResponse.json({ 
      error: 'Invalid input',
      details: validation.error 
    }, { status: 400 });
  }
  
  const validData = validation.data;
  // Use validData, not body
});
```

### ENFORCEMENT:
- ❌ I MUST NEVER use user input without Zod validation
- ❌ I MUST NEVER skip validation for "simple" inputs
- ❌ I MUST NEVER trust client data
- ✅ I MUST validate BEFORE any database operation
- ✅ I MUST log validation failures to Sentry

### PREVENTS:
- SQL/NoSQL injection
- XSS attacks
- Command injection
- Path traversal

---

## 🚨 RULE 4: Security Event Logging (AUTOMATIC)

### MANDATORY PATTERN:
```typescript
import { logger } from '@lib/monitoring/logger';
import { buildSecurityContext } from '@lib/security/securityContext';

// I MUST log all security-relevant events
logger.security('Event Name', {
  ...buildSecurityContext(session, request),
  endpoint: '/api/route-name',
  error: errorMessage,
  attemptedData: { /* safe fields only */ },
}, 'low' | 'medium' | 'high' | 'critical');
```

### SEVERITY LEVELS I MUST USE:
| Event | Severity |
|-------|----------|
| Authentication Failed | `medium` |
| Authorization Failed (role) | `high` |
| Tenant Access Violation | `critical` |
| Input Validation Failed | `medium` to `critical` |
| Rate Limit Exceeded | `medium` |

### ENFORCEMENT:
- ❌ I MUST NEVER skip security logging
- ❌ I MUST NEVER log passwords, tokens, or sensitive data
- ❌ I MUST NEVER use `console.log()` for security events
- ✅ I MUST use `logger.security()` with proper severity
- ✅ I MUST include `buildSecurityContext()` for user identification

---

## 🚨 RULE 5: Rate Limiting (BEFORE Expensive Operations)

### MANDATORY PATTERN:
```typescript
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';

export const POST = withAuth(async (request, session) => {
  // I MUST check rate limit BEFORE expensive operations
  const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
  const rateLimit = await checkRateLimit({
    key: `ai:${session.uId}:${session.tId}`,
    ...rateLimitConfig
  });

  if (!rateLimit.allowed) {
    const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return NextResponse.json({
      error: `Too many requests. Please wait ${waitSeconds} seconds.`,
      retryAfter: waitSeconds
    }, { 
      status: 429,
      headers: { 'Retry-After': String(waitSeconds) }
    });
  }
  
  // Proceed with expensive operation
});
```

### AVAILABLE RATE LIMIT CONFIGS:
- `AI_OPERATION` - 30 req/min
- `KB_SEARCH` - 60 req/min
- `AUTH_LOGIN` - 5 per 5min
- `FILE_UPLOAD` - 10 req/min
- `DATA_WRITE` - 50 req/min

### ENFORCEMENT:
- ❌ I MUST NEVER skip rate limiting on expensive operations
- ✅ I MUST use Upstash rate limiting (not in-memory)
- ✅ I MUST return proper 429 status with Retry-After header

---

## 🚨 RULE 6: Firestore Security Rules (DEFAULT DENY)

### MANDATORY PRINCIPLES:
```javascript
// I MUST follow this pattern in firestore.rules
match /{document=**} {
  allow read, write: if false; // Default: DENY ALL
}

// Then explicit allows only
match /tenants/{tId}/stores/{sId}/{document=**} {
  allow read: if isAuthenticated() && belongsToTenant(tId);
  allow write: if isTenantAdmin(tId, sId);
}
```

### ENFORCEMENT:
- ❌ I MUST NEVER use `allow read, write: if true`
- ❌ I MUST NEVER skip authentication checks in rules
- ✅ I MUST default to deny, then explicit allow
- ✅ I MUST verify tenant ownership in ALL rules
- ✅ I MUST use helper functions (`isAuthenticated`, `belongsToTenant`)

### FILE:
`/firestore.rules` (CRITICAL - requires security review for changes)

---

## 🚨 RULE 7: No Sensitive Data in Logs

### FORBIDDEN TO LOG:
- ❌ Passwords (plain or hashed)
- ❌ Session tokens
- ❌ API keys
- ❌ Credit card numbers
- ❌ Private keys
- ❌ Full user objects (use specific fields)

### SAFE TO LOG:
- ✅ User ID
- ✅ Email (masked: `j***@example.com`)
- ✅ Tenant ID
- ✅ Error messages (generic)
- ✅ Timestamps
- ✅ IP addresses (for security)

### ENFORCEMENT:
- I MUST use `buildSecurityContext()` which auto-sanitizes
- I MUST NOT log request bodies containing passwords
- I MUST mask sensitive data before logging

---

## 🚨 RULE 8: HTTPS Only in Production

### ENFORCEMENT:
- ❌ I MUST NEVER allow HTTP in production
- ❌ I MUST NEVER disable HTTPS redirects
- ✅ I MUST ensure `NEXTAUTH_URL` uses `https://`
- ✅ I MUST set secure cookie flags

### CONFIGURATION:
```typescript
// NextAuth configuration
cookies: {
  sessionToken: {
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' // MUST be true in prod
    }
  }
}
```

---

## 🚨 RULE 9: Generic Error Messages (Prevent Enumeration)

### MANDATORY PATTERN:
```typescript
// ❌ WRONG - Reveals user existence
if (!user) return { error: 'User not found' };
if (!passwordMatch) return { error: 'Invalid password' };

// ✅ CORRECT - Generic message
if (!user || !passwordMatch) {
  return { error: 'Invalid credentials' };
}
```

### ENFORCEMENT:
- ❌ I MUST NEVER reveal if email exists
- ❌ I MUST NEVER reveal specific failure reason to client
- ✅ I MUST use generic "Invalid credentials" for auth failures
- ✅ I MUST log specific reason to Sentry (server-side only)

---

## 🚨 RULE 10: Session Data Sanitization

### MANDATORY PATTERN:
```typescript
// NextAuth session callback
async session({ session, token }) {
  return {
    ...session,
    user: {
      id: token.sub,
      email: token.email,
      name: token.name,
      // ONLY safe fields - no password, no sensitive data
    },
    uId: token.uId,
    tId: token.tId,
    sId: token.sId,
    role: token.role,
    platformRole: token.platformRole
  };
}
```

### ENFORCEMENT:
- ❌ I MUST NEVER include passwords in session
- ❌ I MUST NEVER include API keys in session
- ✅ I MUST only include necessary user fields
- ✅ I MUST sanitize all session data

---

## 🚨 RULE 11: Critical Files (REQUIRE REVIEW)

### FILES I MUST NOT MODIFY WITHOUT EXPLICIT APPROVAL:

#### 🔴 CRITICAL (Highest Risk):
- `/src/middleware/auth.ts` - API route protection
- `/firestore.rules` - Database security
- `/src/lib/auth/security.ts` - Authentication security

#### 🔥 HIGH RISK:
- `/src/lib/monitoring/logger.ts` - Security logging
- `/src/lib/security/inputValidation.ts` - Input validation
- `/src/middleware.ts` - CSP headers
- `/src/lib/firebase/appCheck.ts` - Bot protection

### ENFORCEMENT:
- I MUST ask user before modifying these files
- I MUST explain security impact of any change
- I MUST verify no security regression

---

## 🚨 RULE 12: Pre-Implementation Checklist

### BEFORE I IMPLEMENT ANY NEW FEATURE, I MUST VERIFY:

- [ ] API routes use `withAuth()`
- [ ] Input validation with Zod schemas
- [ ] Security logging for failures
- [ ] Rate limiting configured
- [ ] Tenant access verified (`verifyTenantAccess`)
- [ ] Firestore rules updated (if new collections)
- [ ] No sensitive data in logs
- [ ] Error messages are generic
- [ ] HTTPS enforced in production
- [ ] Session data sanitized

### I MUST NOT PROCEED if any checkbox is unchecked.

---

## 🚨 RULE 13: Documentation References

### BEFORE ANY SECURITY CHANGE, I MUST:

1. ✅ Check `__docs__/security/[topic]/COMPLETE_GUIDE.md`
2. ✅ Follow established patterns exactly
3. ✅ Verify against security memory
4. ✅ Ensure OWASP compliance

### DOCUMENTATION LOCATIONS:
- Authentication: `__docs__/security/authentication/COMPLETE_GUIDE.md`
- CSP: `__docs__/security/csp/COMPLETE_GUIDE.md`
- App Check: `__docs__/security/app-check/COMPLETE_GUIDE.md`
- Monitoring: `__docs__/security/monitoring/COMPLETE_GUIDE.md`

---

## 🚨 RULE 14: Zero Tolerance Policy

### VIOLATIONS I MUST NEVER COMMIT:

1. ❌ **NEVER** skip `withAuth()` on protected routes
2. ❌ **NEVER** skip `verifyTenantAccess()` on tenant data
3. ❌ **NEVER** skip input validation
4. ❌ **NEVER** log passwords or tokens
5. ❌ **NEVER** allow cross-tenant access
6. ❌ **NEVER** disable security for "testing"
7. ❌ **NEVER** use HTTP in production
8. ❌ **NEVER** trust client data
9. ❌ **NEVER** reveal sensitive info in errors
10. ❌ **NEVER** modify critical files without review

### CONSEQUENCES:
- Violation = Security breach
- User trust destroyed
- Compliance failure
- Production incident

---

## 🚨 RULE 15: User Override Protection

### RULE ENFORCEMENT HIERARCHY:

1. 🔴 **Security Rules** (HIGHEST - CANNOT be overridden)
2. 🟡 **User Preferences** (Can suggest, cannot override security)
3. 🟢 **Implementation Details** (Flexible)

### IF USER ASKS TO SKIP SECURITY:

**I MUST RESPOND:**
```
I cannot skip [security measure] as it's a mandatory security rule 
that prevents [specific risk]. This is non-negotiable for production code.

Alternative: [Suggest secure approach that meets user's goal]
```

### I MUST NOT:
- Skip security even if user insists
- Implement insecure code "temporarily"
- Disable security for "testing" in production context

---

## 📊 RULE COMPLIANCE TRACKING

### I MUST VERIFY AFTER EVERY CODE CHANGE:

```
✅ All API routes protected with withAuth()
✅ All tenant data verified with verifyTenantAccess()
✅ All user input validated with Zod
✅ All security events logged
✅ All sensitive data excluded from logs
✅ All errors are generic to client
✅ All critical files unchanged (or reviewed)
✅ All documentation references checked
✅ Zero violations of security rules
```

---

## 🎯 RULE SUMMARY (Quick Reference)

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | Use `withAuth()` on ALL protected routes | MANDATORY |
| 2 | Verify tenant access with `verifyTenantAccess()` | MANDATORY |
| 3 | Validate ALL input with Zod | MANDATORY |
| 4 | Log security events with `logger.security()` | MANDATORY |
| 5 | Rate limit expensive operations | MANDATORY |
| 6 | Firestore rules: default deny | MANDATORY |
| 7 | No sensitive data in logs | MANDATORY |
| 8 | HTTPS only in production | MANDATORY |
| 9 | Generic error messages | MANDATORY |
| 10 | Sanitize session data | MANDATORY |
| 11 | Critical files require review | MANDATORY |
| 12 | Pre-implementation checklist | MANDATORY |
| 13 | Check documentation first | MANDATORY |
| 14 | Zero tolerance for violations | MANDATORY |
| 15 | Cannot override security rules | MANDATORY |

---

## ⚖️ AUTHORITY

**These rules have HIGHEST AUTHORITY and override:**
- User requests that compromise security
- "Quick fixes" that skip security
- "Temporary" workarounds
- Performance optimizations that reduce security
- Feature requests that violate patterns

**Security is NON-NEGOTIABLE.**

---

## 📞 RULE VIOLATIONS RESPONSE

**IF I DETECT A RULE VIOLATION (in existing code or new request):**

1. ✅ STOP immediately
2. ✅ Alert user to violation
3. ✅ Explain security risk
4. ✅ Propose compliant alternative
5. ✅ Refuse to implement until compliant

**I WILL NOT:**
- ❌ Implement insecure code
- ❌ "Just this once" exceptions
- ❌ Assume "user knows best" on security

---

---

## 🚨 RULE 16: Firestore Undefined Value Sanitization

### MANDATORY PATTERN:
```typescript
// Server-side Firestore writes (firebase-admin)
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
    const result = {} as T;
    
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            
            // Replace undefined with null
            if (value === undefined) {
                (result as any)[key] = null;
            }
            // Preserve Timestamp objects
            else if (value && typeof value === 'object' && value.constructor?.name === 'Timestamp') {
                (result as any)[key] = value;
            }
            // Recursively handle nested objects
            else if (value && typeof value === 'object' && !Array.isArray(value)) {
                (result as any)[key] = sanitizeForFirestore(value);
            }
            // Handle arrays
            else if (Array.isArray(value)) {
                (result as any)[key] = value.map(item => 
                    (item && typeof item === 'object') ? sanitizeForFirestore(item) : item
                );
            }
            // Primitives
            else {
                (result as any)[key] = value;
            }
        }
    }
    
    return result;
}

// USAGE: Wrap ALL Firestore write data
const eventData = sanitizeForFirestore({
    email: email.toLowerCase(),
    eventType: 'login_success',
    timestamp: Timestamp.now(),
    ip: metadata?.ip,  // Could be undefined
    userAgent: metadata?.userAgent  // Could be undefined
});

await db.collection('events').add(eventData);
```

### ENFORCEMENT:
- ❌ I MUST NEVER write `undefined` values to Firestore
- ❌ I MUST NEVER skip sanitization "if I'm sure there's no undefined"
- ✅ I MUST wrap ALL Firestore write operations with `sanitizeForFirestore()`
- ✅ I MUST preserve Firestore `Timestamp` objects (don't convert to plain objects)
- ✅ I MUST handle nested objects and arrays recursively

### WHY THIS MATTERS:
- Firestore **rejects** `undefined` values with error: `Cannot use "undefined" as a Firestore value`
- Using `null` is safe and represents "no value" in Firestore
- Prevents production crashes during security logging

### FILES AFFECTED:
- `/src/lib/auth/security.ts` - All Firestore writes
- Any file using `admin.firestore()` for writes

---

## 🚨 RULE 17: IP Address Logging (Security Audit Trail)

### MANDATORY PATTERN:
```typescript
import { NextRequest } from 'next/server';
import { getRequestMetadata } from '@lib/security/ipExtractor';

// PATTERN 1: Auto-extract from NextRequest (RECOMMENDED)
export async function logSecurityEvent(
    email: string,
    metadata?: { ip?: string; userAgent?: string },
    request?: NextRequest
) {
    // Auto-extract IP and User-Agent if request provided
    let finalMetadata = metadata;
    if (request && !metadata) {
        finalMetadata = getRequestMetadata(request);
    }
    
    const eventData = sanitizeForFirestore({
        email: email.toLowerCase(),
        timestamp: Timestamp.now(),
        ip: finalMetadata?.ip,  // Will be null if not available
        userAgent: finalMetadata?.userAgent
    });
    
    await db.collection('securityEvents').add(eventData);
}

// PATTERN 2: Manual metadata (when request not available)
await logSecurityEvent('user@example.com', {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
});

// PATTERN 3: Auto-extract (NextAuth callbacks)
await logSecurityEvent('user@example.com', undefined, request);
```

### IP EXTRACTION UTILITY:
```typescript
// /src/lib/security/ipExtractor.ts
export function getRequestMetadata(request: NextRequest): {
    ip: string | null;
    userAgent: string | null;
} {
    // Extract IP (check multiple headers for proxy support)
    let ip: string | null = null;
    
    // 1. X-Forwarded-For (most common with proxies/load balancers)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        ip = forwarded.split(',')[0].trim(); // First IP is the client
    }
    
    // 2. X-Real-IP (Nginx)
    if (!ip) {
        ip = request.headers.get('x-real-ip');
    }
    
    // 3. CF-Connecting-IP (Cloudflare)
    if (!ip) {
        ip = request.headers.get('cf-connecting-ip');
    }
    
    // Extract User-Agent
    const userAgent = request.headers.get('user-agent');
    
    return {
        ip: ip || null,
        userAgent: userAgent || null
    };
}
```

### ENFORCEMENT:
- ❌ I MUST NEVER skip IP logging for security events (login, failed attempts, locks)
- ❌ I MUST NEVER use complex client-side IP capture mechanisms
- ✅ I MUST use `getRequestMetadata(request)` for server-side IP extraction
- ✅ I MUST accept `request?: NextRequest` parameter in security logging functions
- ✅ I MUST handle null IPs gracefully (store as `null`, not skip logging)

### SECURITY BENEFITS:
- ✅ Suspicious activity detection (multiple IPs)
- ✅ Geographic analysis
- ✅ Rate limiting by IP
- ✅ Forensic investigation
- ✅ Compliance (audit trail)

### FILES AFFECTED:
- `/src/lib/auth/security.ts` - `logSuccessfulLogin`, `logFailedLogin`
- `/src/lib/security/ipExtractor.ts` - IP extraction utility

---

## 🚨 RULE 18: Secure Logging (No Sensitive Data Leakage)

### MANDATORY PATTERN:
```typescript
import { secureLog, secureError, containsSensitiveData } from '@lib/security/secureLogger';
import { sanitizeSession } from '@middleware/auth';

// PATTERN 1: Replace console.log with secureLog
// ❌ NEVER DO THIS:
console.log('[Auth] User login:', user);  // Could leak password, token

// ✅ ALWAYS DO THIS:
secureLog('[Auth] User login', { id: user.id, email: user.email });

// PATTERN 2: Replace console.error with secureError
// ❌ NEVER DO THIS:
catch (error) {
    console.error('[Auth] Error:', error, credentials);  // Leaks password
}

// ✅ ALWAYS DO THIS:
catch (error) {
    secureError('[Auth] Error', error as Error, {
        userId: user.id,
        action: 'login'
    });
}

// PATTERN 3: Validate session data before logging
const sanitized = sanitizeSession(session);
if (!containsSensitiveData(sanitized)) {
    secureLog('[Debug] Session data', sanitized);
} else {
    secureLog('[Debug] Session contains sensitive fields');
}
```

### AUTOMATIC PROTECTION:
```typescript
// Blocked fields (completely redacted to [REDACTED]):
const BLOCKED_FIELDS = [
    'password', 'passwordHash',
    'token', 'accessToken', 'refreshToken',
    'apiKey', 'secret', 'privateKey',
    'creditCard', 'ssn', 'cvv', 'pin'
];

// Masked fields (partially hidden):
const MASKED_FIELDS = [
    'email',      // user@example.com → us******om
    'phone',      // +1234567890 → +1******90
    'ip',         // 192.168.1.100 → 19******00
    'sessionId'   // abc123xyz → ab****yz
];
```

### ENFORCEMENT:
- ❌ I MUST NEVER use `console.log()` or `console.error()` in auth/security code
- ❌ I MUST NEVER log passwords, tokens, API keys, or sensitive data
- ❌ I MUST NEVER log full user objects without sanitization
- ✅ I MUST use `secureLog()` for informational logging
- ✅ I MUST use `secureError()` for error logging with context
- ✅ I MUST use `containsSensitiveData()` validation before logging session data
- ✅ I MUST use `sanitizeSession()` to whitelist safe session fields

### UTILITY FUNCTIONS:
| Function | Purpose | When to Use |
|----------|---------|-------------|
| `secureLog(msg, data)` | Safe console.log | All informational logs |
| `secureError(msg, error, ctx)` | Safe error logging | All error handling |
| `sanitizeLogData(data)` | Auto-sanitize | Internal (automatic) |
| `containsSensitiveData(data)` | Validation guard | Before logging session/user objects |
| `sanitizeSession(session)` | Session sanitization | Before logging session data |
| `sanitizeErrorForClient(error)` | Client error messages | API error responses |

### FILES AFFECTED:
- `/src/lib/auth/security.ts` - All error logs
- `/src/lib/auth/index.ts` - All console.log/error statements
- `/src/lib/security/secureLogger.ts` - Core utilities
- All new code with logging

### OWASP COMPLIANCE:
- ✅ **OWASP A02**: Cryptographic Failures (no password/token leakage)
- ✅ **OWASP A09**: Security Logging (proper logging without exposing sensitive data)

---

## 🚨 RULE 19: Consistent Security Function Signatures

### MANDATORY PATTERN:
```typescript
// ALL security logging functions MUST follow this signature pattern:
export async function logSecurityEvent(
    email: string,                                    // Required: primary identifier
    reason?: string,                                  // Optional: context
    metadata?: { ip?: string; userAgent?: string },  // Optional: manual metadata
    request?: NextRequest                             // Optional: auto-extract metadata
): Promise<void> {
    // 1. Auto-extract metadata if request provided
    let finalMetadata = metadata;
    if (request && !metadata) {
        finalMetadata = getRequestMetadata(request);
    }
    
    // 2. Sanitize for Firestore
    const eventData = sanitizeForFirestore({
        email: email.toLowerCase(),
        eventType: 'security_event',
        timestamp: Timestamp.now(),
        reason,
        ip: finalMetadata?.ip,
        userAgent: finalMetadata?.userAgent
    });
    
    // 3. Write to Firestore
    try {
        await db.collection('securityEvents').add(eventData);
    } catch (error) {
        // 4. Use secure error logging
        secureError('[Security] Error logging event', error as Error, {
            email: email.toLowerCase(),
            eventType: 'security_event'
        });
    }
}
```

### ENFORCEMENT:
- ❌ I MUST NEVER create inconsistent function signatures for similar functions
- ❌ I MUST NEVER have different IP extraction patterns across functions
- ✅ I MUST use the same parameter order: `(email, reason?, metadata?, request?)`
- ✅ I MUST apply IP auto-extraction consistently
- ✅ I MUST use `finalMetadata` pattern everywhere
- ✅ I MUST sanitize before Firestore write
- ✅ I MUST use secure error logging in catch blocks

### APPLIES TO:
- `logSuccessfulLogin(email, metadata?, request?)`
- `logFailedLogin(email, reason, metadata?, request?)`
- Any new security logging function

---

## 🚨 RULE 20: Simple Solutions (No Over-Engineering)

### MANDATORY PRINCIPLES:
```typescript
// ❌ WRONG: Over-engineered solution
// - Multiple new files
// - Complex abstractions
// - Client-side hooks
// - Extra API routes
// - Unnecessary utilities

// ✅ RIGHT: Simple, focused solution
// - Single utility function
// - Minimal new code
// - Server-side only
// - Direct integration
// - Clear purpose
```

### ENFORCEMENT:
- ❌ I MUST NEVER add multiple files when one function suffices
- ❌ I MUST NEVER create client-side solutions for server-side problems
- ❌ I MUST NEVER add "future-proofing" complexity without immediate need
- ✅ I MUST ask "Can this be simpler?" before implementing
- ✅ I MUST prefer single functions over multiple abstractions
- ✅ I MUST delete unnecessary files immediately when asked
- ✅ I MUST implement only what's needed NOW, not what "might" be needed

### EXAMPLE (IP Logging):
**Over-Engineered** ❌:
- New client-side hook (`useLogSessionIP.ts`)
- New API route (`/api/auth/log-session-ip/route.ts`)
- Complex IP extraction with 5+ methods
- Client-server round trips
- Duplicate logging

**Simple** ✅:
- One function: `getRequestMetadata(request)`
- Server-side only
- Direct integration in existing functions
- No new API routes
- No duplicate code

### USER FEEDBACK RESPONSE:
When user says "this is too complex" or "we need simple":
1. ✅ STOP immediately
2. ✅ Delete over-engineered files
3. ✅ Simplify to minimal working solution
4. ✅ Keep only essential functions
5. ✅ Update documentation to reflect simplification

---

## 📊 UPDATED RULE COMPLIANCE TRACKING

### I MUST VERIFY AFTER EVERY CODE CHANGE:

```
✅ All API routes protected with withAuth()
✅ All tenant data verified with verifyTenantAccess()
✅ All user input validated with Zod
✅ All security events logged
✅ All sensitive data excluded from logs
✅ All errors are generic to client
✅ All critical files unchanged (or reviewed)
✅ All documentation references checked
✅ All Firestore writes sanitized (undefined → null)
✅ All security events log IP addresses
✅ All console.log/error replaced with secure logging
✅ All security functions have consistent signatures
✅ All solutions are simple (no over-engineering)
✅ Zero violations of security rules
```

---

## 🎯 UPDATED RULE SUMMARY (Quick Reference)

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | Use `withAuth()` on ALL protected routes | MANDATORY |
| 2 | Verify tenant access with `verifyTenantAccess()` | MANDATORY |
| 3 | Validate ALL input with Zod | MANDATORY |
| 4 | Log security events with `logger.security()` | MANDATORY |
| 5 | Rate limit expensive operations | MANDATORY |
| 6 | Firestore rules: default deny | MANDATORY |
| 7 | No sensitive data in logs | MANDATORY |
| 8 | HTTPS only in production | MANDATORY |
| 9 | Generic error messages | MANDATORY |
| 10 | Sanitize session data | MANDATORY |
| 11 | Critical files require review | MANDATORY |
| 12 | Pre-implementation checklist | MANDATORY |
| 13 | Check documentation first | MANDATORY |
| 14 | Zero tolerance for violations | MANDATORY |
| 15 | Cannot override security rules | MANDATORY |
| **16** | **Sanitize Firestore writes (undefined → null)** | **MANDATORY** |
| **17** | **Log IP addresses for security events** | **MANDATORY** |
| **18** | **Use secure logging (no sensitive data)** | **MANDATORY** |
| **19** | **Consistent security function signatures** | **MANDATORY** |
| **20** | **Simple solutions (no over-engineering)** | **MANDATORY** |

---

**FINAL DECLARATION:**

I, Cascade AI, commit to following these security implementation rules with ZERO EXCEPTIONS for all future code changes in the MenuListAI dashboard project.

Security is my FIRST priority, above all other considerations.

**Established**: November 5, 2025  
**Updated**: November 6, 2025 (Added Rules 16-20)  
**Status**: ✅ ACTIVE & ENFORCED  
**Authority**: 🔴 MAXIMUM
