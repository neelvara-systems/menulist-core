# 🔐 Authentication & Authorization - Complete Guide

**Last Updated**: July 13, 2026
**Status**: Security implementation guide; not current launch certification

> **Current-source note:** This broad guide includes retained historical examples. For the current signup, claim, first workspace, Razorpay handoff, custom-claim, session-refresh, and returning-owner flow, use [Auth and Onboarding](../../auth-onboarding/README.md) and current source. Historical snippets do not override current security helpers or the seven-day NextAuth session contract.

---

## Current Launch Boundary

Current security launch approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md) and [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, current auth route/source review against the mandatory security rules, QA/staging index deploy evidence for required indexes, auth browser/API smoke, and no sensitive logging or tenant-isolation regression. This guide records implementation patterns; it is not production-launch approval.

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Implementation Details](#implementation-details)
5. [Security Features](#security-features)
6. [Usage Guide](#usage-guide)
7. [Monitoring & Logging](#monitoring--logging)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

MenuListAI uses an authentication system with security controls documented here:

- ✅ **NextAuth.js** for session management
- ✅ **Firebase Auth** for credential verification
- ✅ **Rate limiting** to prevent brute force
- ✅ **Account lockout** after failed attempts
- ✅ **Role-based access control** (RBAC)
- ✅ **Multi-tenant isolation**
- ✅ **Comprehensive security logging**

### Key Statistics
- **14 protected API routes** refactored with `withAuth()`
- **112 lines of code removed** (eliminated duplication)
- **100% authentication failure logging** coverage
- **5 security event types** tracked to Sentry

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER LOGIN ATTEMPT                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Check Account Lockout Status                            │
│     - Query authSecurityEvents collection                    │
│     - Check for recent account_locked events                 │
│     - If locked → Return error with time remaining           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Validate User Account                                   │
│     - Query Firestore for user record                        │
│     - Check isVerified === true                              │
│     - Check active === true                                  │
│     - If invalid → Log failure, return error                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Verify Password with Firebase                           │
│     - Call Firebase signInWithEmailAndPassword()             │
│     - Success → Log successful login, return user            │
│     - Failure → Log failed attempt                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Check for Auto-Lock Trigger                             │
│     - Count failed attempts in last 15 minutes               │
│     - If >= 5 attempts → Create account_locked event         │
│     - Lock duration: 15 minutes                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Create NextAuth Session                                 │
│     - Generate session token                                 │
│     - Add custom claims (platformRole, role, tId, sId)       │
│     - Return secure session cookie                           │
└─────────────────────────────────────────────────────────────┘
```

### Database Collections

#### **authSecurityEvents**
Tracks all authentication security events:

```typescript
{
  email: string;                 // Normalized (lowercase)
  eventType: 'login_success' | 'login_failed' | 'account_locked' | 'account_unlocked';
  timestamp: Timestamp;
  ip?: string;                   // Client IP address
  userAgent?: string;            // Browser information
  reason?: string;               // e.g., 'invalid_password', 'invalid_account'
}
```

**Indexes Required**:
- `email` + `timestamp` (descending) - For lockout checks
- `eventType` + `timestamp` (descending) - For admin dashboard

---

## Core Features

### 1. Rate Limiting

**Configuration**:
```typescript
const MAX_FAILED_ATTEMPTS = 5;              // Trigger lockout
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
```

**How It Works**:
- Tracks failed login attempts per email
- Counts attempts within 15-minute window
- Automatic lockout after 5 failed attempts

**Implementation**:
```typescript
// lib/auth/security.ts
export async function checkAccountLock(email: string): Promise<{
  isLocked: boolean;
  remainingTime?: number;
  failedAttempts: number;
}> {
  const db = firebaseAdmin.firestore();
  const since = new Date(Date.now() - LOCKOUT_DURATION_MS);
  
  // Check for active lock
  const lockEvents = await db
    .collection('authSecurityEvents')
    .where('email', '==', email.toLowerCase())
    .where('eventType', '==', 'account_locked')
    .where('timestamp', '>', Timestamp.fromDate(since))
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();
    
  if (!lockEvents.empty) {
    const lockEvent = lockEvents.docs[0].data();
    const lockTime = lockEvent.timestamp.toMillis();
    const remainingTime = LOCKOUT_DURATION_MS - (Date.now() - lockTime);
    
    if (remainingTime > 0) {
      return {
        isLocked: true,
        remainingTime,
        failedAttempts: lockEvent.failedAttempts || MAX_FAILED_ATTEMPTS
      };
    }
  }
  
  return { isLocked: false, failedAttempts: 0 };
}
```

---

### 2. Account Lockout

**Trigger Conditions**:
- 5 failed login attempts within 15 minutes

**Lockout Duration**:
- 15 minutes automatic
- Can be manually unlocked by admin

**User Experience**:
```
"Account temporarily locked due to multiple failed login attempts.
Please try again in 12 minutes and 34 seconds."
```

**Implementation**:
```typescript
// After detecting 5th failed attempt
await logAccountLock(email, failedAttempts, { ip, userAgent });

// Creates event:
{
  email: email.toLowerCase(),
  eventType: 'account_locked',
  timestamp: Timestamp.now(),
  failedAttempts: 5,
  ip: clientIP,
  userAgent: browserInfo
}
```

---

### 3. Role-Based Access Control (RBAC)

#### Platform Roles
```typescript
type PlatformRole = 'USER' | 'ADMIN' | 'PLATFORM';
```

- **USER**: Normal tenant/store users
- **ADMIN**: Tenant administrators
- **PLATFORM**: Platform-wide administrators

#### Store Roles
```typescript
type StoreRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER';
```

- **OWNER**: Full store access
- **MANAGER**: Manage operations
- **STAFF**: Limited access
- **VIEWER**: Read-only

#### Current persisted platform authorization

`withAuth(..., { requiredPlatformRole: 'PLATFORM' })` is the fast signed-session admission gate. It is not sufficient by itself for routes that expose platform-wide private data or perform platform recovery mutations because a signed session can remain usable briefly after the underlying user record is downgraded, disabled, blocked, deleted, or revoked.

High-risk platform routes must therefore:

1. Apply their per-operator rate limiter before the authorization read.
2. Require every supplied root/nested session user-ID alias to normalize exactly and agree, then read that exact `users/{userId}` document through `src/lib/auth/currentPlatformUser.ts`.
3. Require exact document/user/email identity, `platformRole === 'PLATFORM'`, `active === true`, `isVerified === true`, no block/delete/auth-disable state, and revocation timestamps no newer than the session issuance timestamp. Negative lifecycle/block markers are fail-closed: only absent, `null`, or explicit boolean `false` is treated as unblocked/enabled; malformed legacy strings or objects cannot retain platform authority.
4. Return generic `403 Forbidden` before platform data reads, provider calls, or writes when that current check fails.
5. Never fall back to an email query or another user document when the canonical user document is missing.

This adds one bounded direct Firestore read per protected operation. Current ops implementations include SAFE_MODE, alert mute, platform-notification tracking/recovery, owner-notification tracking/recovery, and report-lead access. Their source and behavioral gates are `npm run verify:ops-current-authorization-boundary`, `npm run test:current-platform-user`, and `npm run test:current-platform-user:emulator`.

#### Usage Example
```typescript
// Platform admin only
export const GET = withAuth(async (req, session) => {
  // Only PLATFORM role reaches here
  return NextResponse.json({ adminData: 'secret' });
}, { requiredPlatformRole: 'PLATFORM' });

// Store owner only
export const DELETE = withAuth(async (req, session) => {
  // Only OWNER role reaches here
  return NextResponse.json({ deleted: true });
}, { requiredRole: 'OWNER' });
```

---

### 4. Multi-Tenant Isolation

**Critical Feature**: Prevents horizontal privilege escalation

```typescript
export function verifyTenantAccess(
  session: any,
  requestedTenantId: string,
  requestedStoreId?: string,
  request?: NextRequest
): boolean {
  const sessionTenantId = session?.tId || session?.user?.tenantId;
  const sessionStoreId = session?.sId || session?.user?.storeId;
  
  // Tenant mismatch = CRITICAL security violation
  if (requestedTenantId !== sessionTenantId) {
    if (request) {
      // Log CRITICAL alert to Sentry
      logger.security('Horizontal Privilege Escalation Attempt - Tenant', {
        userId: session.user?.id,
        email: session.user?.email,
        sessionTenantId,
        attemptedTenantId: requestedTenantId,
        endpoint: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for'),
      }, 'critical');
    }
    return false;
  }
  
  // Store mismatch (if specified)
  if (requestedStoreId && requestedStoreId !== sessionStoreId) {
    if (request) {
      logger.security('Horizontal Privilege Escalation Attempt - Store', {
        userId: session.user?.id,
        sessionStoreId,
        attemptedStoreId: requestedStoreId,
        endpoint: request.nextUrl.pathname,
      }, 'critical');
    }
    return false;
  }
  
  return true;
}
```

---

## Implementation Details

### withAuth() Middleware

**File**: `src/middleware/auth.ts`

The `withAuth()` function wraps API routes to provide automatic authentication:

```typescript
export function withAuth(
  handler: AuthenticatedHandler,
  options?: {
    requiredRole?: string;
    requiredPlatformRole?: 'ADMIN' | 'USER' | 'PLATFORM';
  }
) {
  return async (request: NextRequest, context?: { params: any }) => {
    try {
      // Get session from NextAuth
      const session = await getServerSession(authOptions);
      
      // Check authentication
      if (!session || !session.user) {
        logger.security('Authentication Failed', {
          ...buildSecurityContext(null, request),
          endpoint: request.nextUrl.pathname,
          error: 'No valid session - authentication required',
          method: request.method,
        }, 'medium');
        
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Check platform role if specified
      if (options?.requiredPlatformRole) {
        if (session.platformRole !== options.requiredPlatformRole) {
          logger.security('Authorization Failed - Platform Role', {
            ...buildSecurityContext(session, request),
            endpoint: request.nextUrl.pathname,
            required: options.requiredPlatformRole,
            actual: session.platformRole,
          }, 'high');
          
          return NextResponse.json(
            { error: 'Forbidden', message: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }
      
      // Check store role if specified
      if (options?.requiredRole) {
        if (session.role !== options.requiredRole) {
          logger.security('Authorization Failed - Store Role', {
            ...buildSecurityContext(session, request),
            endpoint: request.nextUrl.pathname,
            required: options.requiredRole,
            actual: session.role,
          }, 'high');
          
          return NextResponse.json(
            { error: 'Forbidden', message: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }
      
      // Call handler with guaranteed session
      return await handler(request, session, context?.params);
    } catch (error) {
      secureError('[Auth Middleware] Error', error as Error, {
        path: request.nextUrl.pathname,
        method: request.method
      });
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  };
}
```

### Refactored Routes (14/14 Complete)

All API routes now use `withAuth()`:

**AI Operations**:
1. `/api/descriptions` - Description generation
2. `/api/translations` - Multi-language translation
3. `/api/new-item-metadata` - AI metadata generation
4. `/api/image-generation` - Image creation
5. `/api/image-editing` - Image modification
6. `/api/image-processor` - Image processing
7. `/api/image-generation/batch-trigger` - Batch operations

**Payment Operations**:
8. `/api/razorpay/create-subscription`
9. `/api/razorpay/verify-subscription`
10. `/api/razorpay/verify-topup`
11. `/api/razorpay/cancel-subscription`
12. `/api/razorpay/create-topup-order`
13. `/api/razorpay/upgrade-subscription`

**Auth Operations**:
14. `/api/auth/set-claims`

---

## Security Features

### 1. Generic Error Messages
Prevents user enumeration:

```typescript
// ❌ BAD: Reveals which emails exist
return { error: 'Email not found' };

// ✅ GOOD: Generic message
return { error: 'Invalid email or password' };
```

### 2. Secure Session Cookies

```typescript
// NextAuth configuration
cookies: {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      httpOnly: true,      // Prevent XSS
      sameSite: 'lax',     // CSRF protection
      path: '/',
      secure: process.env.NODE_ENV === 'production' // HTTPS only
    }
  }
}
```

### 3. Session Sanitization

```typescript
// Remove sensitive data before sending to client
callbacks: {
  session: async ({ session, token }) => {
    if (session.user) {
      session.user.id = token.uid as string;
      session.tId = token.tenantId as string;
      session.sId = token.storeId as string;
      session.role = token.role as string;
      session.platformRole = token.platformRole as string;
      
      // Never expose: password, tokens, API keys
    }
    return session;
  }
}
```

---

## Monitoring & Logging

### Security Events Tracked

| Event Type | Severity | Trigger | Sentry Alert |
|------------|----------|---------|--------------|
| **Authentication Failed** | MEDIUM | No session | Yes |
| **Platform Role Failed** | HIGH | Wrong platform role | Yes |
| **Store Role Failed** | HIGH | Wrong store role | Yes |
| **Tenant Access Violation** | CRITICAL | Cross-tenant attempt | Yes + Email |
| **Store Access Violation** | CRITICAL | Cross-store attempt | Yes + Email |

### Sentry Integration

All authentication events include:

```typescript
{
  userId: session.user?.id,
  email: session.user?.email,
  tenantId: session.tId,
  storeId: session.sId,
  userAgent: request.headers.get('user-agent'),
  ip: request.headers.get('x-forwarded-for'),
  endpoint: request.nextUrl.pathname,
  method: request.method,
  error: 'Detailed error message',
  // Additional context based on event type
}
```

### Dashboard Queries

**Get Security Summary**:
```typescript
import { getSecuritySummary } from '@lib/auth/security';

const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h
const summary = await getSecuritySummary(since);

console.log({
  totalAttempts: summary.totalAttempts,
  failedAttempts: summary.failedAttempts,
  lockedAccounts: summary.lockedAccounts,
  suspiciousIPs: summary.suspiciousIPs  // IPs with 10+ failures
});
```

---

## Usage Guide

### Protect an API Route

```typescript
import { withAuth } from '@middleware/auth';

// Basic protection (authenticated users only)
export const GET = withAuth(async (request, session) => {
  // session is guaranteed to exist here
  const userId = session.user.id;
  const tenantId = session.tId;
  
  // Your logic here
  return NextResponse.json({ data: 'protected' });
});
```

### Require Platform Role

```typescript
// Platform admin only
export const POST = withAuth(async (request, session) => {
  // Only PLATFORM role can access
  return NextResponse.json({ adminData: 'secret' });
}, { requiredPlatformRole: 'PLATFORM' });
```

### Require Store Role

```typescript
// Store owner only
export const DELETE = withAuth(async (request, session) => {
  // Only OWNER role can delete
  return NextResponse.json({ deleted: true });
}, { requiredRole: 'OWNER' });
```

### Verify Tenant Access

```typescript
import { withAuth, verifyTenantAccess } from '@middleware/auth';

export const POST = withAuth(async (request, session) => {
  const { tenantId, storeId } = await request.json();
  
  // Verify user owns this tenant/store
  if (!verifyTenantAccess(session, tenantId, storeId, request)) {
    // CRITICAL alert sent to Sentry automatically!
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Safe to proceed
  return NextResponse.json({ success: true });
});
```

---

## Testing

### Test Account Lockout

```bash
# Make 5 failed login attempts
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}'
done

# 6th attempt should show lockout message
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'

# Expected: "Account temporarily locked... try again in X minutes"
```

### Test Authentication Failure Logging

```bash
# Without auth token - should trigger MEDIUM severity log
curl -X POST http://localhost:3000/api/descriptions \
  -H "Content-Type: application/json"

# Check Sentry for "Authentication Failed" event
```

### Test Authorization Failure

```bash
# Normal user trying admin route - should trigger HIGH severity log
curl -X POST http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=NORMAL_USER_TOKEN"

# Check Sentry for "Authorization Failed" event
```

### Manual Unlock Account

```typescript
// Development only - unlock specific account
const db = firebaseAdmin.firestore();
await db.collection('authSecurityEvents')
  .where('email', '==', 'user@example.com')
  .where('eventType', '==', 'account_locked')
  .get()
  .then(snapshot => {
    snapshot.docs.forEach(doc => doc.ref.delete());
  });
```

---

## Production Deployment

### Checklist

- [ ] **Firestore Indexes**: Deploy required indexes
- [ ] **Security Rules**: Update Firestore rules
- [ ] **Environment Variables**: Set in Vercel
- [ ] **Sentry Integration**: Enable for monitoring
- [ ] **Alert Configuration**: Set up email/Slack alerts
- [ ] **Test All Routes**: Verify auth protection
- [ ] **Monitor First 24h**: Check for issues

### Deploy Firestore Indexes

```bash
# Deploy indexes from the active Firebase config to QA first
npm run verify:env-targets
firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json
```

Production index deploy requires QA evidence and explicit production approval.

### Firestore Security Rules

Add to `firestore.rules`:

```javascript
// Auth security events - server-side only
match /authSecurityEvents/{eventId} {
  // Only Cloud Functions can read/write
  allow read, write: if false;
}
```

### Environment Variables (Vercel)

Required in production:

```bash
NEXTAUTH_SECRET=<generate-strong-secret>
NEXTAUTH_URL=https://your-domain.com
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
```

Generate secret:
```bash
openssl rand -base64 32
```

---

## Troubleshooting

### User Can't Login (Locked Out)

**Check Status**:
```typescript
import { checkAccountLock } from '@lib/auth/security';
const status = await checkAccountLock('user@example.com');
console.log(status); // { isLocked, remainingTime, failedAttempts }
```

**Manual Unlock**:
```typescript
const db = firebaseAdmin.firestore();
await db.collection('authSecurityEvents')
  .where('email', '==', 'user@example.com')
  .where('eventType', '==', 'account_locked')
  .get()
  .then(snapshot => snapshot.docs.forEach(doc => doc.ref.delete()));
```

### Session Not Persisting

Check:
1. Cookies enabled in browser
2. `NEXTAUTH_URL` matches domain
3. `secure` cookie setting matches environment
4. No cookie conflicts (clear browser cookies)

### Role Not Working

Check:
1. User record has correct role in Firestore
2. Session callback adds role to token
3. No typos in role names (case-sensitive)
4. Session refreshed after role update

### Cross-Tenant Access Allowed

This is CRITICAL - investigate immediately:
1. Check Sentry for "Horizontal Privilege Escalation" alerts
2. Verify `verifyTenantAccess()` is called
3. Check session has correct `tId` and `sId`
4. Review route implementation

---

## Performance & Costs

### Firestore Operations per Login

**Successful Login**:
- 2-3 reads (check lockout status, get user)
- 1 write (log success event)

**Failed Login**:
- 2-3 reads (check lockout, count failures)
- 1-2 writes (log failure + potential lock)

### Cost Optimization

**Auto-Cleanup Old Events**:
```typescript
// Run daily via Cloud Function
const db = firebaseAdmin.firestore();
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

const oldEvents = await db
  .collection('authSecurityEvents')
  .where('timestamp', '<', Timestamp.fromMillis(thirtyDaysAgo))
  .get();

const batch = db.batch();
oldEvents.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();

console.log(`Deleted ${oldEvents.size} old security events`);
```

---

## Best Practices

1. ✅ **Never log passwords** or sensitive credentials
2. ✅ **Use generic error messages** to prevent enumeration
3. ✅ **Monitor security events** regularly
4. ✅ **Set up alerts** for critical violations
5. ✅ **Test lockout behavior** before production
6. ✅ **Document unlock procedures** for support
7. ✅ **Regularly review** failed login patterns
8. ✅ **Keep dependencies updated** (NextAuth, Firebase)
9. ✅ **Use HTTPS only** in production
10. ✅ **Enable MFA** for admin accounts (future)

---

## Future Enhancements

- [ ] CAPTCHA after 3 failed attempts
- [ ] Email notifications on account lockout
- [ ] 2FA/MFA support
- [ ] Passwordless magic link authentication
- [ ] Admin security dashboard UI
- [ ] Real-time alerts (Slack/Email)
- [ ] Geolocation-based anomaly detection
- [ ] Session activity tracking
- [ ] Device fingerprinting
- [ ] IP reputation checking

---

## Related Documentation

- **CSP Guide**: `../csp/complete-guide.md`
- **Monitoring Guide**: `../monitoring/complete-guide.md`
- **OWASP Status**: `../owasp/IMPLEMENTATION_STATUS.md`
- **Deployment**: `../../deployment/PRODUCTION_GUIDE.md`

---

## Summary

Documented authentication controls include:
- Automatic brute force protection
- Role-based access control
- Multi-tenant isolation
- Comprehensive security logging
- Security-event test coverage expectations
- Sentry logging integration points

Historical implementation note: 14 API routes were documented as protected and 112 lines removed in the November 2025 review. Reconfirm the current route inventory before launch.

---

**Last Reviewed**: November 5, 2025  
**Next Review**: February 5, 2026  
**Status**: Security implementation guide; not current launch certification
