# 🌐 IP Address Logging - Simple Guide

**Last Updated**: November 6, 2025  
**Status**: ✅ **READY TO USE**

---

## 📝 **What We Have**

### **1. IP Extraction Utility**
**File**: `/src/lib/security/ipExtractor.ts` (50 lines)

**Single function** that extracts IP and User-Agent from request:

```typescript
import { getRequestMetadata } from '@lib/security/ipExtractor';

// Usage:
const metadata = getRequestMetadata(request);
// Returns: { ip: '203.0.113.1', userAgent: 'Mozilla/5.0...' }
```

**What it does**:
- ✅ Checks `X-Forwarded-For` header (proxies/load balancers)
- ✅ Checks `X-Real-IP` header (Nginx)
- ✅ Checks `CF-Connecting-IP` header (Cloudflare)
- ✅ Returns `null` if no IP found

---

### **2. Updated Security Logging**
**File**: `/src/lib/auth/security.ts`

Your existing security functions now accept optional `metadata` parameter:

```typescript
// All these functions accept metadata:
await logSuccessfulLogin(email, metadata);
await logFailedLogin(email, 'invalid_password', metadata);
await lockAccount(email, metadata);
```

**Stores in Firestore**: `authSecurityEvents` collection

---

## 🎯 **How to Use**

### **In Protected API Routes** (Recommended)

When you have access to the `request` object:

```typescript
import { withAuth } from '@middleware/auth';
import { getRequestMetadata } from '@lib/security/ipExtractor';
import { logSuccessfulLogin } from '@lib/auth/security';

export const POST = withAuth(async (request, session) => {
    // Extract IP from request
    const metadata = getRequestMetadata(request);
    
    // Use in your logging
    await logSuccessfulLogin(session.user.email, metadata);
    
    return NextResponse.json({ success: true });
});
```

---

### **Without Request Access** (NextAuth Callbacks)

When you DON'T have request (e.g., OAuth callbacks):

```typescript
// Just log with null IP
await logSuccessfulLogin(email);

// Firestore stores: { email, eventType, timestamp, ip: null, userAgent: null }
```

**This is fine!** The IP will be captured on the next authenticated request anyway.

---

## 📊 **Firestore Structure**

### **With IP** (from protected API route):
```json
{
  "email": "user@example.com",
  "eventType": "login_success",
  "timestamp": Timestamp(2025-11-06 05:30:00),
  "ip": "203.0.113.1",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)..."
}
```

### **Without IP** (from NextAuth callback):
```json
{
  "email": "user@example.com",
  "eventType": "login_success",
  "timestamp": Timestamp(2025-11-06 05:30:00),
  "ip": null,
  "userAgent": null
}
```

Both are valid! ✅

---

## ✅ **Summary**

### **What's Included:**
1. ✅ Simple IP extraction utility (1 function, 50 lines)
2. ✅ Updated security logging functions (accept metadata)
3. ✅ Sanitization to prevent Firestore errors (undefined → null)

### **How to Use:**
```typescript
// When you have request:
const metadata = getRequestMetadata(request);
await logSuccessfulLogin(email, metadata);

// When you don't have request:
await logSuccessfulLogin(email); // Logs with null IP
```

### **No Complex Setup Required:**
- ❌ No client-side hooks needed
- ❌ No extra API endpoints
- ❌ No automatic capture logic
- ✅ Just extract IP when you have access to request

---

**That's it! Simple and effective.** 🎉
