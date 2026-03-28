# 🔒 Security Action Checklist

## 🔴 Critical (Before Production)

### 1. Fix Firestore Security Rules
**Current Issue:** Public read access on changelog

**File:** `firestore.rules`

**Fix:**
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
    
    // Changelog - Require authentication
    match /tenants/{tId}/stores/{sId}/changelogPages/{pageId} {
      allow read: if request.auth != null 
        && request.auth.token.tenantId == tId;
      allow write: if isTenantAdmin(tId, sId);
    }
    
    // Add rules for other collections
    match /tenants/{tId}/stores/{sId}/{document=**} {
      allow read: if request.auth != null 
        && request.auth.token.tenantId == tId;
      allow write: if isTenantAdmin(tId, sId);
    }

    function isTenantAdmin(tId, sId) {
      return request.auth != null
        && request.auth.token.tenantId == tId
        && request.auth.token.admin == true
        && (request.auth.token.storeIds == null || request.auth.token.storeIds.has(sId));
    }
  }
}
```

**Deploy:**
```bash
firebase deploy --only firestore:rules
```

---

### 2. Add Input Validation Library

**Install Zod:**
```bash
npm install zod
```

**Create Validation Schema:**
```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod';

export const DescriptionSchema = z.object({
    itemsList: z.array(z.string()).min(1).max(100),
    targetLang: z.string().regex(/^[a-z]{2}$/),
    sourceLang: z.string().regex(/^[a-z]{2}$/),
    action: z.enum(['generate', 'translate']),
    contentLength: z.enum(['Small', 'Medium', 'Large']),
    projectId: z.string().optional(),
    fileId: z.string().optional()
});

export const TranslationSchema = z.object({
    text: z.string().min(1).max(10000),
    targetLang: z.string().regex(/^[a-z]{2}$/),
    sourceLang: z.string().regex(/^[a-z]{2}$/)
});
```

**Use in API Route:**
```typescript
// src/app/api/descriptions/route.ts
import { DescriptionSchema } from '@lib/validation/schemas';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const jsonData = await request.json();
        
        // ✅ Validate input
        const validated = DescriptionSchema.parse(jsonData);
        
        // Use validated data
        const { itemsList, targetLang, sourceLang } = validated;
        
        // ... rest of logic
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: 'Invalid input', 
                details: error.errors 
            }, { status: 400 });
        }
        // ... other error handling
    }
}
```

---

### 3. Fix CSP 'unsafe-inline'

**Current Issue:** CSP allows 'unsafe-inline' which reduces XSS protection

**File:** `src/middleware.ts`

**Option 1: Use Nonces (Recommended)**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const nonce = crypto.randomBytes(16).toString('base64');
    
    // Store nonce for use in HTML
    response.headers.set('x-nonce', nonce);
    
    const cspDirectives = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' https://vercel.live https://*.google.com`,
        `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
        // ... rest
    ];
    
    response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
    return response;
}
```

**Option 2: Test First with Report-Only**
```typescript
// Test without breaking app
response.headers.set(
    'Content-Security-Policy-Report-Only', 
    cspDirectives.join('; ')
);

// Add reporting endpoint
const cspDirectives = [
    // ... existing
    "report-uri /api/csp-report"
];
```

**Create CSP Report Endpoint:**
```typescript
// src/app/api/csp-report/route.ts
export async function POST(request: Request) {
    const report = await request.json();
    console.error('[CSP Violation]', report);
    return new Response('OK', { status: 200 });
}
```

---

## 🟡 High Priority (This Week)

### 4. Add Environment Variables Documentation

**Create `.env.example`:**
```bash
# Authentication
NEXTAUTH_SECRET=your-nextauth-secret-here-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase App Check (reCAPTCHA v3)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Sentry (Error Monitoring)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Payment (Razorpay/Stripe)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your-secret
STRIPE_SECRET_KEY=sk_test_xxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
```

**Add to `.gitignore`:**
```bash
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Keep example
!.env.example
```

---

### 5. Add Production Warning for App Check

**File:** `src/lib/firebase/appCheck.ts`

**Add after line 43:**
```typescript
if (!FEATURE_FLAGS.ENABLE_APP_CHECK) {
    console.log('🔧 App Check: Disabled via feature flag (ENABLE_APP_CHECK = false)');
    console.log('💡 To enable: Set ENABLE_APP_CHECK = true in src/config/features.ts');
    
    // ✅ Add this:
    if (process.env.NODE_ENV === 'production') {
        console.error('🚨 SECURITY WARNING: App Check is DISABLED in PRODUCTION!');
        console.error('🚨 Your Firebase APIs are NOT protected from bots and abuse!');
        console.error('🚨 This is a CRITICAL security risk. Enable App Check immediately.');
    }
    
    return null;
}
```

---

### 6. Add Request Size Limits

**File:** `next.config.js`

**Add:**
```javascript
const nextConfig = {
    // ... existing config
    
    // ✅ Add API size limits
    api: {
        bodyParser: {
            sizeLimit: '1mb' // Prevent large payload attacks
        },
        responseLimit: '4mb'
    },
    
    // ... rest of config
}
```

---

### 7. Validate reCAPTCHA Site Key Format

**File:** `src/lib/firebase/appCheck.ts`

**After line 46:**
```typescript
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// ✅ Add validation
if (recaptchaSiteKey) {
    if (!recaptchaSiteKey.startsWith('6L') || recaptchaSiteKey.length < 40) {
        console.error('❌ Invalid reCAPTCHA site key format');
        console.error('💡 Site keys start with "6L" and are 40+ characters');
        console.error('💡 Check: https://www.google.com/recaptcha/admin');
        return null;
    }
}

if (!recaptchaSiteKey) {
    // ... existing warning
}
```

---

## 🟢 Medium Priority (This Month)

### 8. Add Error Handling to App Check Init

**File:** `src/lib/firebase/firebaseClient.ts`

**Lines 23-27, update to:**
```typescript
// Initialize App Check (bot protection)
if (typeof window !== 'undefined') {
    import('./appCheck')
        .then(({ initAppCheck }) => {
            initAppCheck();
        })
        .catch(err => {
            console.error('[Firebase] App Check initialization failed:', err);
            // Don't throw - app should still work without App Check
        });
}
```

---

### 9. Add Security Headers to API Routes

**Create:** `src/lib/security/apiHeaders.ts`

```typescript
import { NextResponse } from 'next/server';

export function addSecurityHeaders(response: NextResponse): NextResponse {
    // Prevent MIME sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');
    
    // Prevent XSS
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // API-specific headers
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
    return response;
}
```

**Use in API routes:**
```typescript
import { addSecurityHeaders } from '@lib/security/apiHeaders';

export async function POST(request: Request) {
    // ... your logic
    
    const response = NextResponse.json({ data });
    return addSecurityHeaders(response);
}
```

---

### 10. Implement Stricter Password Requirements

**Create:** `src/lib/validation/password.ts`

```typescript
export function validatePassword(password: string): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}
```

---

## ✅ Quick Win Security Improvements

### 11. Add security.txt (Optional but Professional)

**Create:** `public/.well-known/security.txt`

```
Contact: security@yourdomain.com
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://yourdomain.com/.well-known/security.txt
```

---

### 12. Add Rate Limit Headers

**File:** `src/lib/rateLimit.ts`

**In checkRateLimit function, add:**
```typescript
return NextResponse.json(
    { error: 'Too many requests' },
    { 
        status: 429,
        headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(limit - currentCount),
            'X-RateLimit-Reset': String(resetTime),
            'Retry-After': String(retryAfter)
        }
    }
);
```

---

## 📋 Complete Checklist

```
Critical (Before Production):
├─ [ ] Fix Firestore security rules
├─ [ ] Add Zod input validation
└─ [ ] Fix CSP 'unsafe-inline' issue

High Priority (This Week):
├─ [ ] Create .env.example file
├─ [ ] Add production warning for App Check
├─ [ ] Add API request size limits
└─ [ ] Validate reCAPTCHA key format

Medium Priority (This Month):
├─ [ ] Add error handling to App Check init
├─ [ ] Add security headers to API routes
├─ [ ] Implement password strength requirements
└─ [ ] Add rate limit response headers

Quick Wins:
├─ [ ] Add security.txt file
└─ [ ] Add helpful console warnings

Future Enhancements:
├─ [ ] External security audit
├─ [ ] Penetration testing
├─ [ ] Automated security scanning (Snyk/SonarQube)
└─ [ ] Bug bounty program
```

---

**Status:** Ready to implement  
**Estimated Time:** 4-6 hours for critical items  
**Next Review:** After implementing critical fixes
