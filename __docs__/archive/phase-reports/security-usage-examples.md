# Security Features - Usage Examples

## 🎯 Quick Reference Guide

### **1. Protect API Routes (A01: Access Control)**

```typescript
// src/app/api/my-endpoint/route.ts
import { withAuth, verifyTenantAccess } from '@middleware/auth';
import { NextRequest, NextResponse } from 'next/server';

// ✅ CORRECT: Protected route
export const GET = withAuth(async (request: NextRequest, session) => {
    // session is guaranteed to exist
    // Automatic 401 if user not authenticated
    
    const data = {
        userId: session.uId,
        tenantId: session.tId,
        storeId: session.sId
    };
    
    return NextResponse.json({ data });
});

// ✅ CORRECT: Platform admin only
import { withPlatformAuth } from '@middleware/auth';

export const POST = withPlatformAuth(async (request, session) => {
    // Only users with platformRole='PLATFORM' can access
    // Automatic 403 if insufficient permissions
    
    return NextResponse.json({ success: true });
});

// ❌ WRONG: Unprotected route
export const GET = async (request: NextRequest) => {
    // Anyone can access this - SECURITY VULNERABILITY!
};
```

---

### **2. Verify Tenant/Store Access (A01: Horizontal Privilege Escalation Prevention)**

```typescript
import { withAuth, verifyTenantAccess } from '@middleware/auth';

export const GET = withAuth(async (request, session, params) => {
    const { tenantId, storeId } = params;
    
    // ✅ CRITICAL: Always verify user owns the resource
    if (!verifyTenantAccess(session, tenantId, storeId)) {
        return NextResponse.json(
            { error: 'Forbidden: You do not have access to this resource' },
            { status: 403 }
        );
    }
    
    // Safe to proceed
    const data = await getDataForTenant(tenantId, storeId);
    return NextResponse.json({ data });
});

// ❌ WRONG: No ownership verification
export const GET = withAuth(async (request, session, params) => {
    const { tenantId } = params;
    // User from tenant A can access tenant B data!
    const data = await getDataForTenant(tenantId);
});
```

---

### **3. Validate User Input (A03: Injection Prevention)**

```typescript
import { validateAPIInput, sanitizeString } from '@lib/security/inputValidation';
import { z } from 'zod';

// Define validation schema
const createItemSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500),
    price: z.number().positive(),
    email: z.string().email()
});

export const POST = withAuth(async (request, session) => {
    const body = await request.json();
    
    // ✅ CORRECT: Validate before using
    const validation = validateAPIInput(createItemSchema, body);
    
    if (!validation.success) {
        return NextResponse.json(
            { error: validation.error },
            { status: 400 }
        );
    }
    
    // Safe to use validated data
    const { name, description, price, email } = validation.data;
    
    // Additional sanitization for strings
    const safeName = sanitizeString(name);
    
    return NextResponse.json({ success: true });
});

// ❌ WRONG: Direct use of user input
export const POST = withAuth(async (request, session) => {
    const body = await request.json();
    // XSS, injection vulnerable!
    await db.collection('items').add(body);
});
```

---

### **4. Secure Logging (A02: Prevent Sensitive Data Exposure)**

```typescript
import { secureLog, secureError } from '@lib/security/secureLogger';

export const POST = withAuth(async (request, session) => {
    try {
        const body = await request.json();
        
        // ✅ CORRECT: Sanitized logging
        secureLog('User action', {
            userId: session.uId,
            email: session.user.email,  // Automatically masked
            action: 'create_item',
            itemName: body.name
        });
        // Logs: { userId: '123', email: 'us***@ex.com', ... }
        
        // ✅ CORRECT: Secure error logging
        const result = await dangerousOperation();
        
    } catch (error) {
        secureError('Operation failed', error as Error, {
            userId: session.uId,
            // password field automatically redacted
        });
    }
});

// ❌ WRONG: Logging sensitive data
export const POST = withAuth(async (request, session) => {
    const body = await request.json();
    
    // NEVER log passwords, tokens, API keys!
    console.log('User login:', {
        email: session.user.email,
        password: body.password,  // ❌ SECURITY BREACH!
        apiKey: process.env.API_KEY  // ❌ SECRET EXPOSED!
    });
});
```

---

### **5. Sanitize Firestore Queries (A03: NoSQL Injection)**

```typescript
import { sanitizeFirestoreQuery } from '@lib/security/inputValidation';

export const GET = withAuth(async (request, session) => {
    const { searchParams } = new URL(request.url);
    const filters = Object.fromEntries(searchParams);
    
    // ✅ CORRECT: Sanitize query parameters
    const safeFilters = sanitizeFirestoreQuery(filters);
    
    const db = firebaseAdmin.firestore();
    let query = db.collection('items');
    
    for (const [key, value] of Object.entries(safeFilters)) {
        query = query.where(key, '==', value);
    }
    
    const results = await query.get();
    return NextResponse.json({ results: results.docs.map(d => d.data()) });
});

// ❌ WRONG: Direct query from user input
export const GET = withAuth(async (request, session) => {
    const { searchParams } = new URL(request.url);
    
    // NoSQL injection vulnerable!
    const query = db.collection('items')
        .where(searchParams.get('field'), '==', searchParams.get('value'));
});
```

---

### **6. Validate File Uploads (A03: File Upload Security)**

```typescript
import { fileUploadSchema } from '@lib/security/inputValidation';

export const POST = withAuth(async (request, session) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // ✅ CORRECT: Validate file
    const validation = validateAPIInput(fileUploadSchema, {
        name: file.name,
        size: file.size,
        type: file.type
    });
    
    if (!validation.success) {
        return NextResponse.json(
            { error: 'Invalid file' },
            { status: 400 }
        );
    }
    
    // Safe to upload
    const buffer = await file.arrayBuffer();
    // ... upload to storage
});

// ❌ WRONG: No file validation
export const POST = withAuth(async (request, session) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Could be malware, wrong type, too large!
    await storage.upload(file);
});
```

---

### **7. Prevent SSRF (A10: Server-Side Request Forgery)**

```typescript
import { validateURL } from '@lib/security/inputValidation';

export const POST = withAuth(async (request, session) => {
    const { imageUrl } = await request.json();
    
    // ✅ CORRECT: Validate URL before fetching
    const allowedDomains = [
        'firebasestorage.googleapis.com',
        'storage.googleapis.com',
        'cdn.example.com'
    ];
    
    if (!validateURL(imageUrl, allowedDomains)) {
        return NextResponse.json(
            { error: 'Invalid URL' },
            { status: 400 }
        );
    }
    
    // Safe to fetch
    const response = await fetch(imageUrl);
    const data = await response.json();
    
    return NextResponse.json({ data });
});

// ❌ WRONG: Fetching user-provided URLs
export const POST = withAuth(async (request, session) => {
    const { url } = await request.json();
    
    // Could access internal services, localhost, private IPs!
    const response = await fetch(url);  // ❌ SSRF VULNERABILITY
});
```

---

### **8. Sanitize Error Messages (A02: Information Disclosure)**

```typescript
import { sanitizeErrorForClient } from '@lib/security/secureLogger';

export const POST = withAuth(async (request, session) => {
    try {
        const result = await riskyOperation();
        return NextResponse.json({ result });
        
    } catch (error) {
        // ✅ CORRECT: Sanitize errors for client
        const clientError = sanitizeErrorForClient(error as Error);
        
        // Log full error server-side
        secureError('Operation failed', error as Error, {
            userId: session.uId
        });
        
        // Send generic error to client
        return NextResponse.json(
            { error: clientError.message },
            { status: 500 }
        );
    }
});

// ❌ WRONG: Exposing internal errors
export const POST = withAuth(async (request, session) => {
    try {
        const result = await riskyOperation();
    } catch (error) {
        // Exposes stack traces, file paths, internals!
        return NextResponse.json(
            { error: error.message, stack: error.stack },
            { status: 500 }
        );
    }
});
```

---

## 🚨 Common Security Mistakes to Avoid

### **1. Unprotected API Routes**
```typescript
// ❌ BAD
export async function GET(request: NextRequest) {
    // Anyone can call this!
}

// ✅ GOOD
export const GET = withAuth(async (request, session) => {
    // Protected
});
```

### **2. Missing Tenant Verification**
```typescript
// ❌ BAD
export const GET = withAuth(async (request, session, { params }) => {
    return getDataForTenant(params.tenantId);
    // User can access ANY tenant!
});

// ✅ GOOD
export const GET = withAuth(async (request, session, { params }) => {
    if (!verifyTenantAccess(session, params.tenantId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return getDataForTenant(params.tenantId);
});
```

### **3. Logging Sensitive Data**
```typescript
// ❌ BAD
console.log('User data:', { email, password, token });

// ✅ GOOD
secureLog('User action', { userId, action });
```

### **4. No Input Validation**
```typescript
// ❌ BAD
const { name } = await request.json();
await db.collection('items').doc(name).set({ ... });

// ✅ GOOD
const validation = validateAPIInput(schema, await request.json());
if (!validation.success) return error();
await db.collection('items').doc(validation.data.name).set({ ... });
```

---

## 📋 Security Checklist for Every API Route

Before deploying:

- [ ] Route wrapped with `withAuth()` or `withPlatformAuth()`
- [ ] Tenant/store access verified with `verifyTenantAccess()`
- [ ] All user inputs validated with Zod schema
- [ ] No sensitive data in logs (use `secureLog()`)
- [ ] Errors sanitized for client (use `sanitizeErrorForClient()`)
- [ ] File uploads validated
- [ ] External URLs validated
- [ ] Rate limiting considered for expensive operations

---

**Remember:** Security is not optional. Every endpoint is a potential attack vector.

**When in doubt:** Deny access. It's easier to grant access later than to fix a breach.
