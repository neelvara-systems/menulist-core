# 🌐 CORS Validation Implementation

**Last Updated**: November 14, 2025  
**Status**: ✅ Fully Implemented  
**Priority**: P0 (Critical)

---

## 📖 Overview

Cross-Origin Resource Sharing (CORS) validation prevents unauthorized domains from accessing your API endpoints, protecting against CSRF attacks and data theft.

### What's Implemented

| Feature                       | Status      | File                |
| ----------------------------- | ----------- | ------------------- |
| **Origin Validation**         | ✅ Complete | `corsValidation.ts` |
| **Allowed Origins Whitelist** | ✅ Complete | `corsValidation.ts` |
| **CORS Headers Management**   | ✅ Complete | `corsValidation.ts` |
| **Preflight Handling**        | ✅ Complete | `corsValidation.ts` |
| **HOC Wrapper**               | ✅ Complete | `withCORS()`        |
| **Security Logging**          | ✅ Complete | Integrated          |

---

## 🎯 OWASP Coverage

- ✅ **A01: Broken Access Control** - Prevents unauthorized origin access
- ✅ **A04: Insecure Design** - Secure-by-default CORS configuration
- ✅ **A05: Security Misconfiguration** - Proper CORS headers

---

## 🔐 Implementation Details

### File Location

```
/src/lib/security/corsValidation.ts
```

### Allowed Origins

```typescript
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];
```

**Configuration**:

- Production: `NEXT_PUBLIC_APP_URL` from environment
- Development: `localhost:3000` and `localhost:3001`
- Whitelist only, no wildcard `*`

---

## 🚀 Usage Patterns

### Pattern 1: HOC Wrapper (Recommended) ⭐

**Use Case**: Wrap entire API route for automatic CORS handling

```typescript
import { withCORS } from "@lib/security/corsValidation";

export const POST = withCORS(async (request: Request) => {
  // Your API logic here
  // CORS is automatically validated and headers added

  const data = await request.json();
  // Process data...

  return NextResponse.json({ success: true });
});
```

**Benefits**:

- ✅ Automatic origin validation
- ✅ Automatic headers addition
- ✅ Handles preflight OPTIONS requests
- ✅ One-line implementation

---

### Pattern 2: Manual Validation

**Use Case**: When you need fine-grained control

```typescript
import { validateCORS, addCORSHeaders } from "@lib/security/corsValidation";

export async function POST(request: Request) {
  // 1. Validate CORS
  const corsError = validateCORS(request);
  if (corsError) return corsError;

  // 2. Your API logic
  const data = await request.json();
  // Process data...

  // 3. Add CORS headers to response
  const response = NextResponse.json({ success: true });
  return addCORSHeaders(response, request);
}
```

**Benefits**:

- ✅ Full control over validation flow
- ✅ Custom error handling
- ✅ Conditional CORS application

---

### Pattern 3: Preflight Only

**Use Case**: Handle OPTIONS requests separately

```typescript
import { handleCORSPreflight } from "@lib/security/corsValidation";

export async function OPTIONS(request: Request) {
  return handleCORSPreflight(request);
}

export async function POST(request: Request) {
  // Your POST logic
}
```

**Benefits**:

- ✅ Explicit preflight handling
- ✅ Clearer separation of concerns

---

## 📋 Complete API Reference

### 1. `validateCORSOrigin(origin: string | null): boolean`

**Purpose**: Check if origin is in allowlist

```typescript
import { validateCORSOrigin } from "@lib/security/corsValidation";

const origin = request.headers.get("origin");
const isAllowed = validateCORSOrigin(origin);

if (!isAllowed) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**Returns**:

- `true` - Origin is allowed
- `false` - Origin is not allowed or missing

---

### 2. `validateCORS(request: Request): NextResponse | null`

**Purpose**: Validate CORS and return error response if invalid

```typescript
const corsError = validateCORS(request);
if (corsError) return corsError; // Returns 403 with logging
```

**Returns**:

- `null` - Valid origin, continue
- `NextResponse` - Invalid origin, return error (403)

**Security Logging**:

- Logs rejected origins to Sentry
- Includes IP, user agent, endpoint

---

### 3. `addCORSHeaders(response: NextResponse, request: Request): NextResponse`

**Purpose**: Add CORS headers to successful response

```typescript
const response = NextResponse.json(data);
return addCORSHeaders(response, request);
```

**Headers Added**:

```
Access-Control-Allow-Origin: [validated origin]
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Access-Control-Allow-Credentials: true
```

---

### 4. `handleCORSPreflight(request: Request): NextResponse`

**Purpose**: Handle preflight OPTIONS requests

```typescript
export async function OPTIONS(request: Request) {
  return handleCORSPreflight(request);
}
```

**Returns**:

- `204 No Content` with CORS headers
- Or `403 Forbidden` if origin invalid

---

### 5. `withCORS(handler): (request: Request) => Promise<NextResponse>`

**Purpose**: Higher-order function to wrap route handlers

```typescript
export const POST = withCORS(async (request: Request) => {
  // Your logic
  return NextResponse.json(data);
});
```

**Features**:

- ✅ Validates CORS before handler
- ✅ Adds headers to response
- ✅ Handles OPTIONS automatically
- ✅ Returns 403 on invalid origin

---

## 🛡️ Security Features

### 1. Origin Whitelist

**Approach**: Explicit allow list (no wildcards)

```typescript
// ✅ SECURE: Whitelist only
const ALLOWED_ORIGINS = ["https://menulist.ai", "https://app.menulist.ai"];

// ❌ INSECURE: Never use wildcards
// Access-Control-Allow-Origin: *
```

**Why**: Wildcard (`*`) allows ANY domain to access your API.

---

### 2. Security Logging

**What's Logged**:

- Rejected origin attempts
- IP address
- User agent
- Requested endpoint

**Example Log**:

```typescript
{
    event: 'CORS Validation Failed',
    origin: 'https://evil-site.com',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    endpoint: '/api/projects',
    method: 'POST'
}
```

**Destination**: Sentry (production)

---

### 3. Preflight Caching

**Max-Age**: 86400 seconds (24 hours)

```typescript
'Access-Control-Max-Age': '86400'
```

**Benefit**: Browser caches preflight responses, reducing OPTIONS requests by 99%

---

## 📊 Example Flows

### Success Flow

```
1. Browser sends OPTIONS (preflight)
   Origin: https://menulist.ai
   ↓
2. withCORS validates origin → ✅ Allowed
   ↓
3. Returns 204 with CORS headers
   ↓
4. Browser sends actual POST
   ↓
5. withCORS validates origin again → ✅ Allowed
   ↓
6. Executes API logic
   ↓
7. Returns response with CORS headers
```

---

### Rejection Flow

```
1. Browser sends POST
   Origin: https://evil-site.com
   ↓
2. withCORS validates origin → ❌ Not allowed
   ↓
3. Logs security event to Sentry
   ↓
4. Returns 403 Forbidden
   {
       error: 'Origin not allowed',
       severity: 'medium'
   }
```

---

## 🚨 Common Issues & Solutions

### Issue 1: CORS Error in Development

**Symptom**:

```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:3001'
has been blocked by CORS policy
```

**Solution**: Add dev origins to whitelist

```typescript
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001", // ← Add this
  "http://localhost:5173", // Vite dev server
].filter(Boolean) as string[];
```

---

### Issue 2: Preflight Fails with 403

**Symptom**: OPTIONS request returns 403

**Solution**: Use `withCORS()` which handles OPTIONS automatically

```typescript
// ❌ BAD: Manual handling misses OPTIONS
export async function POST(request: Request) {
  const corsError = validateCORS(request);
  if (corsError) return corsError;
  // ...
}

// ✅ GOOD: withCORS handles OPTIONS
export const POST = withCORS(async (request: Request) => {
  // ...
});
```

---

### Issue 3: Origin Not Sent

**Symptom**: Origin header is `null`

**Cause**: Same-origin requests don't send Origin header

**Solution**: Handle gracefully

```typescript
export function validateCORSOrigin(origin: string | null): boolean {
  // Allow same-origin (origin is null)
  if (!origin) return true;

  return ALLOWED_ORIGINS.includes(origin);
}
```

---

## 🧪 Testing

### Test 1: Valid Origin

```bash
curl -X POST http://localhost:3000/api/test \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Expected**: `200 OK` with CORS headers

---

### Test 2: Invalid Origin

```bash
curl -X POST http://localhost:3000/api/test \
  -H "Origin: https://evil-site.com" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Expected**: `403 Forbidden`

```json
{
  "error": "Origin not allowed"
}
```

---

### Test 3: Preflight Request

```bash
curl -X OPTIONS http://localhost:3000/api/test \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

**Expected**: `204 No Content` with headers:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Max-Age: 86400
```

---

## 📈 Production Checklist

Before deploying:

- [ ] Set `NEXT_PUBLIC_APP_URL` in production environment
- [ ] Remove dev origins (`localhost:*`) from whitelist
- [ ] Test with production domain
- [ ] Verify preflight caching works
- [ ] Check Sentry logs for rejected origins
- [ ] Test from different browsers (Chrome, Firefox, Safari)
- [ ] Test cross-domain requests
- [ ] Verify credentials are allowed if needed

---

## 🔗 Related Documentation

- [OWASP CORS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [ASSESSMENT-05-SECURITY.md](../../projects/ASSESSMENT-05-SECURITY.md#2-missing-cors-validation-) - Issue #2

---

## 📝 Migration Guide

### Migrating Existing Routes

**Before**:

```typescript
export async function POST(request: Request) {
  const data = await request.json();
  // Process data
  return NextResponse.json(result);
}
```

**After**:

```typescript
import { withCORS } from "@lib/security/corsValidation";

export const POST = withCORS(async (request: Request) => {
  const data = await request.json();
  // Process data
  return NextResponse.json(result);
});
```

**Time**: ~30 seconds per route

---

## 🎯 Best Practices

1. **Always Use withCORS()** ⭐

   - Simplest and most secure
   - Handles edge cases automatically

2. **Never Use Wildcard `*`**

   - Security vulnerability
   - Allows any domain to access API

3. **Keep Whitelist Minimal**

   - Only add necessary origins
   - Remove dev origins in production

4. **Monitor Rejected Origins**

   - Check Sentry logs regularly
   - Look for patterns (attacks)

5. **Test CORS in Staging**
   - Before production deployment
   - With actual production domains

---

**Status**: ✅ Production Ready  
**Coverage**: All API routes can use this implementation  
**Maintenance**: Review whitelist quarterly
