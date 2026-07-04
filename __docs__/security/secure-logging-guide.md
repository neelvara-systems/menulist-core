# 🔐 Secure Logging Best Practices

**Date**: November 6, 2025  
**Status**: ✅ **IMPLEMENTED**

---

## 🎯 **Overview**

This guide explains our secure logging implementation to **prevent sensitive data leakage** in application logs. All auth and security related code now uses secure logging utilities.

---

## 🚨 **The Problem**

Using direct `console.log()` / `console.error()` can accidentally leak sensitive data:

```typescript
// ❌ BAD - Can leak passwords, tokens, session data
console.log('User login:', user);
console.error('Auth error:', error, credentials);
```

**Risks:**
- Passwords, tokens, API keys logged in plain text
- PII (email, phone) exposed in logs
- Session data leaked
- Security vulnerabilities exposed

---

## ✅ **The Solution**

We've implemented **3-layer security** for all logging:

### **1. `secureLog()` - Safe console.log replacement**
```typescript
import { secureLog } from '@lib/security/secureLogger';

// ✅ GOOD - Automatically sanitizes sensitive fields
secureLog('[Auth] User login', { 
    email: 'user@example.com',
    password: 'secret123'  // Will be redacted to [REDACTED]
});

// Output: [Auth] User login { email: 'us******om', password: '[REDACTED]' }
```

### **2. `secureError()` - Safe error logging**
```typescript
import { secureError } from '@lib/security/secureLogger';

// ✅ GOOD - Sanitizes error context
secureError('[Auth] Login failed', error as Error, {
    email: 'user@example.com',
    token: 'abc123'  // Will be redacted
});
```

The error object itself is also bounded before console output: logs keep the error name, bounded code/status values, and message/stack presence-length metadata only. Raw exception messages and stack traces are not emitted by `secureError()` in development or production.

Secure logger context is bounded before console output as well. `sanitizeLogData()` normalizes sensitive field keys such as `api_key`, caps arbitrary string values, caps array/object breadth, and handles circular objects instead of printing unbounded payloads. Callers should still prefer purpose-built `*LogContext()` helpers for tenant IDs, URLs, provider IDs, and owner-entered text.

The app monitoring logger (`src/lib/monitoring/logger.ts`) uses the same central sanitizers for console output. `logger.info()`, `logger.warn()`, `logger.error()`, debug/trace/log, and security console paths must print sanitized payloads; Sentry breadcrumbs, context, tags, user metadata, and outbound events continue through the monitoring context sanitizer.

Sentry app-side metadata must stay bounded even when a caller accidentally passes a raw `Error`, route, email-like value, token-like value, tenant/store/user ID, or owner-entered name. `src/lib/monitoring/sentryShared.ts` summarizes sensitive strings, identifiers, paths, breadcrumb/event messages, and exception values before the client, server, or edge Sentry SDK sends an event. The monitoring logger also uses static breadcrumb titles for API calls, user actions, navigation, and business events, with dynamic values kept in sanitized context fields.

Firebase Functions monitoring follows the same boundary. `functions/src/lib/sentry.ts` sanitizes Functions Sentry user details, tags, processing contexts, breadcrumbs, AI-call context, capture extras, transactions, outbound events, and capped source error names. `functions/src/lib/logger.ts` routes central Firebase Logger output through those helpers before printing message titles, data payloads, or error/context payloads.

Fallback logging must not dump the original payload after another logger fails. For local file logs, `src/lib/logs/utils.ts` writes only in non-production and, if file append fails, emits a normalized `secureError()` with bounded metadata instead of printing the captured log message, provider response, request body, or stack.

Local runtime log files (`logs/*.log`) are ignored development artifacts and must not be committed. The local log helpers may recreate those files during non-production API work, but production readiness treats tracked runtime captures as a source hygiene failure because even bounded development logs can contain route context, provider status, user/project identifiers, or historical payload residue from older helper versions.

Local log helpers must sanitize `logFileName` before joining it with the local `logs/` directory. Slashes, backslashes, parent-directory dot runs, and empty/dot-only filenames are normalized so non-production diagnostics cannot write outside the local log directory even if a future caller passes an unsafe filename.

### **3. `containsSensitiveData()` - Validation guard**
```typescript
import { containsSensitiveData } from '@lib/security/secureLogger';

// ✅ GOOD - Check before logging
const logData = { session, token, email };
if (!containsSensitiveData(logData)) {
    secureLog('[Debug] Session data', logData);
} else {
    secureLog('[Debug] Session data contains sensitive fields');
}
```

---

## 🛡️ **Automatic Protection**

### **Blocked Fields (Never Logged)**
These fields are **completely redacted** to `[REDACTED]`:
- `password` / `passwordHash`
- `token` / `accessToken` / `refreshToken`
- `apiKey` / `secret` / `privateKey`
- `creditCard` / `ssn` / `cvv` / `pin`

### **Masked Fields (Partially Hidden)**
These fields show first/last 2 characters only:
- `email` → `us******om`
- `phone` → `+1******89`
- `ip` → `19******45`
- `sessionId` → `ab******yz`

### **Recursive Sanitization**
Works on nested objects and arrays:
```typescript
secureLog('[Auth] Complex data', {
    user: {
        email: 'user@example.com',
        auth: {
            token: 'secret123',
            apiKey: 'key456'
        }
    }
});

// Output: { user: { email: 'us******om', auth: { token: '[REDACTED]', apiKey: '[REDACTED]' } } }
```

---

## 📋 **Implementation Status**

### **✅ Fully Integrated Files**

| File | Status | Changes |
|------|--------|---------|
| `/lib/security/secureLogger.ts` | ✅ Done | `secureError()` and `sanitizeErrorForClient()` no longer emit raw exception messages or stacks |
| `/lib/auth/security.ts` | ✅ Done | All `console.error` → `secureError` |
| `/lib/auth/index.ts` | ✅ Done | NextAuth callback diagnostics use bounded auth codes with email/session presence-length metadata only; development fetched-user diagnostics use counts and presence/length metadata only |
| `/middleware/auth.ts` | ✅ Done | Auth wrapper CORS/auth/role/tenant/store security events use bounded route/session metadata, and catch diagnostics use bounded path/method metadata instead of raw `buildSecurityContext()` output, raw IPs, raw user agents, or raw account identifiers |
| `/app/api/auth/set-claims/route.ts` | ✅ Done | Uses bounded auth diagnostics for custom-claims, Firebase Auth sync, and Answerlattice auth-sync breadcrumbs |
| `/lib/cache/publicClientCache.ts` | ✅ Done | Public cache revalidation failures use dev-only bounded `secureError` context |
| `/lib/cache/swrLocalStorageProvider.ts` | ✅ Done | Owner dashboard SWR/localStorage cache failures use dev-only bounded `secureError` context without raw keys, prefixes, cached values, or browser exceptions |
| `/app/manifest.webmanifest/route.ts` | ✅ Done | Customer App manifest failures use bounded `secureError` context before the empty 404 fallback |
| `/app/client/[[...slug]]/page.tsx` | ✅ Done | Public menu multi-outlet and special-menu fallback diagnostics use bounded `secureError` context |
| `/app/client/obp/OBPAnalytics.tsx` | ✅ Done | OBP browser analytics failures use bounded `secureError` context without raw UTM/session/error dumps |
| `/app/client/error.tsx` | ✅ Done | Client menu error boundary logs only error name and digest presence/length |
| `/middleware/publicApi.ts` | ✅ Done | Public Turnstile verification logs provider HTTP, parse, and request failures with stable security codes plus bounded path/status metadata; provider JSON is capped before parsing |
| `/app/api/public/contact/route.ts` | ✅ Done | MenuList public contact failures use bounded security diagnostics with a normalized contact failure code, topic/phone/message/source-path/referrer length context, and source error name/code/status only |
| `/app/api/admin/subdomains/rename/route.ts` | ✅ Done | Platform subdomain rename failures log `admin_subdomain_rename_failed` with bounded operator/request metadata, and success security logs use bounded metadata while preserving required raw details only in the Firestore audit record |
| `/app/api/razorpay/*/route.ts`, `/lib/billing/billingAccess.ts` | ✅ Done | Authenticated Razorpay route security events and billing-permission failures use bounded user/request/product/subscription/order/payment/tenant/store metadata instead of raw `buildSecurityContext()` output or raw validation payload fields |
| `/app/api/onboarding/create-subscription/route.ts` | ✅ Done | New-user onboarding subscription security events use bounded route metadata plus bounded payment/onboarding fields instead of raw `buildSecurityContext()` output |
| Owner AI routes (`/app/api/business-copy`, `/app/api/campaigns/caption`, `/app/api/descriptions`, `/app/api/image-generation`, `/app/api/image-editing`, `/app/api/menu-card-export/design-advisor`, `/app/api/new-item-metadata`, `/app/api/reviews/suggest`, `/app/api/seo`, `/app/api/translations`) | ✅ Done | Protected owner AI validation, tenant-scope, and outlet-policy security events use bounded user/request metadata instead of raw `buildSecurityContext()` output; validation attempted data records bounded route metadata rather than raw item/project/job snippets |
| `/lib/ai-menu-manager/apiGuards.ts`, `/lib/ownerBusinessAssistant/server/apiGuards.ts` | ✅ Done | Shared Menu Manager and Business Health guard security events use bounded user/request metadata, hashed limiter keys, and bounded tenant/store/user scope metadata instead of raw `buildSecurityContext()` output |
| `/app/api/auth/access-status/route.ts`, `/app/api/auth/change-password/route.ts`, `/app/api/auth/switch-store/route.ts`, `/app/api/auth/claim-account/route.ts` | ✅ Done | Auth/session security events use bounded route metadata instead of raw `buildSecurityContext()` output; limiter keys and sensitive route diagnostics remain hashed or bounded |
| `/app/api/ops/safe-mode/route.ts`, `/app/api/ops/mute-alerts/route.ts` | ✅ Done | Platform Ops SAFE_MODE and alert-mute security events use bounded route metadata instead of raw `buildSecurityContext()` output; SAFE_MODE reason text is summarized as presence/length in security logs |
| `/app/api/ops/platform-notifications/route.ts`, `/app/api/ops/owner-notifications/route.ts` | ✅ Done | Platform and owner notification Ops query/rate-limit/action-validation security events use bounded route metadata, and invalid attempted action text is summarized instead of logged raw |
| `/app/api/ops/messaging-onboarding/route.ts` | ✅ Done | Messaging Onboarding Ops snapshot failures use bounded Ops diagnostics with operator/request-path presence metadata instead of raw `buildSecurityContext()` output or raw `logger.error()` context |
| `/app/api/reseller/onboard/route.ts`, `/app/api/reseller/renew/route.ts`, `/app/api/reseller/add-location-capacity/route.ts`, `/app/api/reseller/confirm-payment/route.ts`, `/app/api/reseller/manage/route.ts` | ✅ Done | Reseller mutation validation, profile, and authorization security events use bounded route metadata plus bounded reseller identifiers; platform reseller management success breadcrumbs use bounded reseller metadata and no raw `buildSecurityContext()` import/output |
| `/lib/permissions/server.ts`, `/lib/staffManagement/server.ts`, `/lib/userProfile/server.ts`, `/lib/analytics/googlePropertyAccess.ts` | ✅ Done | Shared MenuList permission, staff, profile, and Google Analytics property security events use bounded route/session metadata and length/count-only identifiers instead of raw `buildSecurityContext()` output |
| `/lib/signaldesk/apiGuards.ts` | ✅ Done | SignalDesk validation, authorization, rate-limit, and malformed-JSON security events use bounded route/session metadata plus endpoint/method/action/permission/feature presence-length fields instead of raw `buildSecurityContext()` output |
| `/app/api/growthos/actions/refresh/route.ts`, `/app/api/growthos/kits/generate/route.ts`, `/app/api/growthos/kits/export/route.ts`, `/app/api/growthos/reviews/suggest/route.ts` | ✅ Done | Growth Kits invalid-JSON, validation, and tenant-violation security events use bounded route/session metadata plus endpoint/method/validation-error/attempted-id presence-length fields instead of raw `buildSecurityContext()` output |
| `/lib/campaigncue/apiGuards.ts`, `/app/api/campaigncue/design-cue/turns/route.ts` | ✅ Done | CampaignCue tenant-violation, rate-limit, malformed-JSON, and Design Cue validation security events use bounded route/session metadata plus endpoint/method/scope/error presence-length fields instead of raw `buildSecurityContext()` output |
| `/lib/answerlattice/accessControl.ts`, `/app/api/answerlattice/readRateLimit.ts`, `/lib/answerlattice/knowledgeIntakeApi.ts`, `/lib/answerlattice/staffAccessServer.ts`, `/app/api/platform/answerlattice-intake/route.ts` | ✅ Done | Answerlattice access-control denials, protected read limits, Knowledge Intake limits, staff-management events, and platform intake-monitor limits use bounded route/session metadata plus presence-length fields instead of raw `buildSecurityContext()` output |
| `/lib/apiHelper/apiCallComposerClient.ts` | ✅ Done | Client DAL wrapper failures require an active session and log only normalized failure code, error name, and bounded argument summaries |
| `/lib/apiHelper/apiCallComposerClientWithoutLoader.ts` | ✅ Done | No-loader client DAL wrapper failures require an active session and use the same bounded DAL diagnostics |
| `/lib/apiHelper/apiCallComposerServer.ts` | ✅ Done | Server DAL wrapper failures use normalized `secureError` diagnostics while preserving ignored-session metadata |
| `/lib/errors/uiErrorMessages.ts` | ✅ Done | Client DAL toasts reject technical-looking exception text and use generic fallback copy |
| `/lib/debug/clientConsoleBuffer.ts` | ✅ Done | Failure-screen console snapshots serialize errors with bounded metadata only |
| `/lib/localLogs/localLogsTracker.ts` | ✅ Done | Browser log capture for tickets stores bounded error metadata instead of raw messages or stacks |
| `/lib/monitoring/sentryShared.ts` | ✅ Done | Sentry context, tag, user, breadcrumb, event, and exception metadata use bounded monitoring sanitizers |
| `/instrumentation-client.ts`, `/sentry.server.config.ts`, `/sentry.edge.config.ts` | ✅ Done | Sentry `beforeSend` applies the outbound event sanitizer after expected-error filtering |
| `/functions/src/lib/sentry.ts` | ✅ Done | Functions Sentry expected-error suppression and outbound metadata use structured, bounded context plus capped source error names instead of raw message/user/context payloads |
| `/functions/src/lib/logger.ts` | ✅ Done | Shared Functions logger sanitizes Firebase Logger message titles, data payloads, and error/context payloads |
| `/lib/firebase/firebaseDiagnostics.ts` | ✅ Done | Firebase bootstrap diagnostics log normalized failure codes, source error name/code/status, and bounded session/path metadata only |
| `/lib/firebase/firebaseClient.ts` | ✅ Done | App Check module-load and local Functions emulator failures use bounded Firebase bootstrap diagnostics |
| `/lib/firebase/appCheck.ts` | ✅ Done | App Check missing-key, initialize, and custom-provider failures use bounded diagnostics without raw hostnames or console styling payloads |
| `/lib/auth/firebaseAuthSync.ts` | ✅ Done | Auth sync helper throws coded generic bootstrap errors with numeric status context instead of raw status text |
| `/hooks/useFirebaseAuthSync.ts` | ✅ Done | Auth sync hook failures use bounded diagnostics and expose only generic sync errors to callers |
| `/providers/sessionProvider.tsx` | ✅ Done | Session-provider auth bootstrap failures use bounded diagnostics instead of raw logger errors or session debug console payloads |
| `/utils/usersUtils.ts` | ✅ Removed | Unused Firebase user helper deleted because it extracted `accessToken` and `refreshToken`; auth verifier guards against reintroduction |

### **🔧 Utility Functions**

| Function | Purpose | Status |
|----------|---------|--------|
| `secureLog()` | Safe console.log | ✅ Active |
| `secureError()` | Bounded error logging | ✅ Active |
| `sanitizeLogData()` | Data sanitization and bounded context | ✅ Active (internal) |
| `containsSensitiveData()` | Validation guard | ✅ Active |
| `sanitizeSession()` | Session sanitization | ✅ Active |
| `sanitizeErrorForClient()` | Generic client error messages | ✅ Available |

---

## 🎓 **Usage Examples**

### **Example 1: Auth Module**
```typescript
// ✅ /lib/auth/security.ts
export async function logFailedLogin(email: string, reason: string) {
    try {
        // ... logic ...
    } catch (error) {
        // ✅ Automatically sanitizes email field
        secureError('[Auth Security] Error logging failed login', error as Error, {
            email: email.toLowerCase(),
            reason
        });
    }
}
```

### **Example 2: NextAuth Callbacks**
```typescript
// ✅ /lib/auth/index.ts
try {
    dbUser = await addPlatformUser(newUser);
    logAuthDiagnostic('oauth_user_created', {
        ...getBoundedAuthStringContext('email', email),
        provider: 'google',
    });
} catch (error) {
    logAuthFailure('oauth_user_create_failed', error, {
        ...getBoundedAuthStringContext('email', email),
        provider: 'google',
    });
}
```

### **Example 3: Session Validation with Guard**
```typescript
// ✅ /lib/auth/index.ts
const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
for (const key of dangerousKeys) {
    if (key in dbUser) {
        logAuthDiagnostic('auth_session_dangerous_db_user_key_blocked', {
            key,
            ...getBoundedAuthStringContext('email', dbUser.email),
            ...getAuthSessionLogContext(session),
        });
        return session;
    }
}
```

### **Example 4: Middleware Security Logging**
```typescript
// ✅ /middleware/auth.ts
if (!session || !session.user) {
    logger.security('Authentication Failed', {
        ...getAuthMiddlewareSecurityContext(null, request, {
            reason: 'No valid session - authentication required',
        }),
    }, 'medium');
}
```

---

## 🔄 **Migration Checklist**

If you're adding new code or refactoring:

### **Before Writing Code:**
- [ ] Import secure logging utilities
- [ ] Plan what data will be logged
- [ ] Identify sensitive fields

### **When Writing Code:**
```typescript
// 1. Import secure utilities
import { secureLog, secureError, containsSensitiveData } from '@lib/security/secureLogger';

// 2. Replace console.log
- console.log('[Module] Info', data);
+ secureLog('[Module] Info', data);

// 3. Replace console.error
- console.error('[Module] Error:', error);
+ secureError('[Module] Error', error as Error, { context });

// 4. Add validation guards for session data
const sanitized = sanitizeSession(session);
if (!containsSensitiveData(sanitized)) {
    secureLog('[Debug] Session', sanitized);
}
```

### **After Writing Code:**
- [ ] Review all log statements
- [ ] Verify no direct `console.log/error`
- [ ] Test with sensitive data
- [ ] Confirm redaction works

---

## 🚀 **Testing Secure Logging**

### **Test 1: Blocked Fields**
```typescript
secureLog('[Test] User data', {
    email: 'test@example.com',
    password: 'secret123',
    token: 'abc456'
});

// Expected output:
// [Test] User data { email: 'te******om', password: '[REDACTED]', token: '[REDACTED]' }
```

### **Test 2: Nested Objects**
```typescript
secureLog('[Test] Nested', {
    user: {
        credentials: {
            apiKey: 'key123'
        }
    }
});

// Expected output:
// [Test] Nested { user: { credentials: { apiKey: '[REDACTED]' } } }
```

### **Test 3: Validation Guard**
```typescript
const unsafeData = { password: 'secret' };
console.log(containsSensitiveData(unsafeData)); // true

const safeData = { email: 'test@example.com' };
console.log(containsSensitiveData(safeData)); // false (email is masked, not blocked)
```

---

## 📊 **Benefits**

| Before | After |
|--------|-------|
| ❌ Passwords logged in plain text | ✅ All passwords redacted to `[REDACTED]` |
| ❌ Tokens exposed in logs | ✅ All tokens redacted |
| ❌ Full email addresses visible | ✅ Emails masked: `us******om` |
| ❌ IP addresses tracked | ✅ IPs masked: `19******45` |
| ❌ Manual sanitization required | ✅ Automatic for all logs |
| ❌ Inconsistent across codebase | ✅ Consistent everywhere |
| ❌ Raw exception messages or stacks in logs | ✅ Error diagnostics use bounded name/code/status and presence-length metadata |

---

## 🔒 **OWASP Compliance**

This implementation addresses:

### **OWASP A02: Cryptographic Failures**
- ✅ Never log passwords, tokens, API keys
- ✅ Mask PII (email, phone)
- ✅ Sanitize before logging

### **OWASP A09: Security Logging**
- ✅ Proper logging without exposing sensitive data
- ✅ Consistent security event logging
- ✅ Error context without raw messages or stack traces in any environment

---

## 📝 **Quick Reference**

### **Replace Console Logging:**
```typescript
// ❌ DON'T
console.log('User:', user);
console.error('Error:', error);

// ✅ DO
secureLog('User:', { id: user.id });
secureError('Error', error as Error, { userId: user.id });
```

### **Session Logging:**
```typescript
// ❌ DON'T
console.log('Session:', session);

// ✅ DO
const sanitized = sanitizeSession(session);
if (!containsSensitiveData(sanitized)) {
    secureLog('Session:', sanitized);
}
```

### **Error Handling:**
```typescript
// ❌ DON'T
catch (error) {
    console.error('Failed:', error, { password, token });
}

// ✅ DO
catch (error) {
    secureError('Failed', error as Error, { userId, action });
}
```

---

## 🎯 **Summary**

### **What Changed:**
1. ✅ All `console.log` → `secureLog()`
2. ✅ All `console.error` → `secureError()`
3. ✅ Added `containsSensitiveData()` validation guards
4. ✅ Added `sanitizeSession()` for session data

### **What's Protected:**
- ✅ Passwords, tokens, API keys (fully redacted)
- ✅ Email, phone, IP (partially masked)
- ✅ Session data (whitelisted fields)
- ✅ Bounded error name/code/status and message/stack presence-length metadata

### **Next Steps:**
- ✅ Use secure logging in all new code
- ✅ Review existing API routes for direct console usage
- ✅ Add to code review checklist

---

**Your application is now protected against sensitive data leakage in logs!** 🎉

For questions or updates, refer to `/src/lib/security/secureLogger.ts` for implementation details.
