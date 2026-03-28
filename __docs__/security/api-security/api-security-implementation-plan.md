# 🔐 API Security Implementation Plan

## ✅ Routes Classification

### **🎯 Priority 1: Client-Facing AI Routes (MUST SECURE)**

| Route | Status | Cost | Schema |
|-------|--------|------|--------|
| `/api/descriptions` | ✅ DONE | High | DescriptionRequestSchema |
| `/api/translations` | ⏳ TODO | High | TranslationRequestSchema |
| `/api/new-item-metadata` | ⏳ TODO | High | NewItemMetadataRequestSchema |
| `/api/image-generation` | ⏳ TODO | Very High | ImageGenerationRequestSchema |
| `/api/image-editing` | ⏳ TODO | Very High | ImageEditingRequestSchema |
| `/api/image-processor` | ⏳ TODO | High | FileUploadRequestSchema |
| `/api/image-generation/batch-trigger` | ⏳ TODO | Very High | BatchImageGenerationRequestSchema |

**Why Priority 1:**
- ✅ Called directly from client/frontend
- ✅ Expensive AI operations (cost money)
- ✅ High risk of abuse
- ✅ Need input validation + Sentry logging

---

### **🎯 Priority 2: Payment Routes (MUST SECURE)**

| Route | Status | Risk | Schema |
|-------|--------|------|--------|
| `/api/razorpay/create-subscription` | ⏳ TODO | Critical | CreateSubscriptionRequestSchema |
| `/api/razorpay/verify-subscription` | ⏳ TODO | Critical | VerifyPaymentRequestSchema |
| `/api/razorpay/verify-topup` | ⏳ TODO | Critical | VerifyPaymentRequestSchema |
| `/api/razorpay/cancel-subscription` | ⏳ TODO | High | CancelSubscriptionRequestSchema |
| `/api/razorpay/create-topup-order` | ⏳ TODO | High | (needs schema) |
| `/api/razorpay/upgrade-subscription` | ⏳ TODO | High | (needs schema) |

**Why Priority 2:**
- ✅ Called from client
- ✅ Money/payment involved
- ✅ Fraud risk
- ✅ Need strict validation

---

### **🎯 Priority 3: Search/Help Routes (SHOULD SECURE)**

| Route | Status | Risk | Schema |
|-------|--------|------|--------|
| `/api/helpCenter/search-kb` | ⏳ TODO | Medium | (already has validation) |
| `/api/helpCenter/search-kb-stream` | ⏳ TODO | Medium | (already has validation) |
| `/api/helpCenter/article-embedding` | ⏳ TODO | Low | (needs schema) |

**Why Priority 3:**
- ✅ Called from client
- ✅ AI operations (cost)
- ✅ Less critical than P1/P2

---

### **⏭️ Skip These (Not Client-Facing)**

| Route | Reason to Skip |
|-------|----------------|
| `/api/auth/[...nextauth]` | NextAuth internal handling |
| `/api/auth/set-claims` | ✅ Already has validation |
| `/api/csp-report` | ✅ Already secured |
| `/api/razorpay/webhook` | External webhook (Razorpay → Server) |
| `/api/webhook` | External webhook |
| `/api/subscriptions/*` | Stripe routes (if used) |
| `/api/image-generation/batch-generation` | Internal/server-side only |
| `/api/analytics/*` | Internal/dashboard only |
| `/api/test/*` | Test routes |
| `/api/sentry-example-api` | Test route |

---

## 🚀 Implementation Order

### **Today (1 hour):**
1. ✅ Translations API
2. ✅ New Item Metadata API
3. ✅ Image Generation API
4. ✅ Image Editing API

### **Tomorrow (30 min):**
5. ✅ Image Processor API
6. ✅ Batch Trigger API

### **This Week (30 min):**
7. ✅ Payment routes (all 6)

---

## 📝 Pattern to Apply

```typescript
// 1. Import dependencies
import { logger } from "@lib/monitoring/logger";
import { validateAPIInput } from "@lib/security/inputValidation";
import { [SchemaName] } from "@lib/validation/apiSchemas";

// 2. After auth & rate limiting, add validation:
const rawData = await request.json();
const validation = validateAPIInput([SchemaName], rawData);

if (!validation.success) {
    const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
    
    // Log to Sentry
    logger.security('Input Validation Failed', {
        endpoint: '/api/[route-name]',
        userId: userId,
        error: errorMsg,
        attemptedData: {
            // Safe fields only (no sensitive data)
        },
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
    }, 'medium');
    
    return NextResponse.json({ 
        error: 'Invalid input', 
        details: errorMsg 
    }, { status: 400 });
}

const validated = validation.data;
// Use validated.* instead of rawData.*
```

---

## 📊 Progress Tracker

```
Total Client-Facing Routes: 13
✅ Secured: 1 (descriptions)
⏳ Remaining: 12

Progress: 8% Complete
```

**Time Estimate:** 2 hours total to secure all routes
