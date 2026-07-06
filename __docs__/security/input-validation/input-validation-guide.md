# 🔒 Input Validation Implementation Guide

## ✅ What's Done

1. **Created Schemas:** `/src/lib/validation/apiSchemas.ts` with 10+ validation schemas
2. **Example Implementation:** `/src/app/api/descriptions/route.ts` now has validation

## 📋 Routes That Need Validation

### Priority 1 - AI Operations (Cost Money) 🔴

1. ✅ `/api/descriptions` - **DONE**
2. ⏳ `/api/translations` - Use `TranslationRequestSchema`
3. ⏳ `/api/new-item-metadata` - Use `NewItemMetadataRequestSchema`
4. ⏳ `/api/image-generation` - Use `ImageGenerationRequestSchema`
5. ⏳ `/api/image-editing` - Use `ImageEditingRequestSchema`
6. ⏳ `/api/image-generation/batch-trigger` - Use `BatchImageGenerationRequestSchema`

### Priority 2 - Payment Operations 🟡

7. ⏳ `/api/razorpay/create-subscription` - Use `CreateSubscriptionRequestSchema`
8. ⏳ `/api/razorpay/verify-subscription` - Use `VerifyPaymentRequestSchema`
9. ⏳ `/api/razorpay/verify-topup` - Use `VerifyPaymentRequestSchema`
10. ⏳ `/api/razorpay/cancel-subscription` - Use `CancelSubscriptionRequestSchema`

### Priority 3 - File Operations 🟢

11. ⏳ `/api/image-processor` - Use `FileUploadRequestSchema`

---

## 🎯 Pattern to Follow

### **Step 1: Import the schema and validator**

```typescript
import { validateAPIInput } from "@lib/security/inputValidation";
import { TranslationRequestSchema } from "@lib/validation/apiSchemas";
```

### **Step 2: Replace direct JSON parsing**

**Before:**
```typescript
const jsonData = await request.json();
const { inputJson, targetLang, sourceLang } = jsonData;

if (!inputJson || !targetLang || !sourceLang) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
}
```

**After:**
```typescript
const rawData = await request.json();
const validation = validateAPIInput(TranslationRequestSchema, rawData);

if (!validation.success) {
    return NextResponse.json({ 
        error: 'Invalid input'
    }, { status: 400 });
}

const { inputJson, targetLang, sourceLang } = validation.data;
```

### **Step 3: Use validated data**

```typescript
// Now you have type-safe, validated data
// All dangerous characters are blocked
// All formats are validated
```

### Shared Validation Diagnostics

Shared input and file validators use `src/lib/security/securityDiagnostics.ts` for internal diagnostics. Do not log raw query keys, uploaded file contents, base64 payloads, MIME strings, token-bearing objects, or raw exception messages with `console.*`. Use bounded presence/length metadata and generic caller-facing failure text.

`validateAPIInput()` returns generic `Invalid input` failure text. It must not expose raw Zod issue paths or schema messages through API `details`; routes that need more specific owner copy should return fixed local messages outside the shared validator.

### Owner-visible UI Error Copy Boundary

Shared owner-visible exception copy uses `getSafeUiErrorMessage()` from `src/lib/errors/uiErrorMessages.ts`. By default, this helper returns the fixed fallback copy after applying the length, technical-shape, provider, URL/API, session, authorization, and stack filters. Short plain `Error.message` strings are not displayed unless the caller explicitly passes `{ allowTrustedPlainText: true }`.

Only deterministic local validation-copy sources may opt into `allowTrustedPlainText`. The current allowed opt-ins are custom drag-and-drop file validators and Menu Correctness Engine Publish-Gate validation messages; both still pass through the same technical-shape filters first. DAL, API, provider, Firestore, Auth, payment, Storage, browser fetch, and route exception paths must not opt into trusted plain text. They should keep fixed fallback copy and bounded internal diagnostics.

### CSV Export Output Sanitization

CSV and Excel-style browser exports must route cells through `escapeCSVValue()` from `src/utils/exportUtils.ts`. This helper is the shared CSV export output sanitizer: it preserves numeric values, quotes comma/newline/quote characters, and prefixes spreadsheet-active string cells with a leading apostrophe before CSV quoting.

Do not reimplement private CSV escaping inside feature components. Formula-like string values that start with `=`, `+`, `-`, `@`, tab, carriage return, newline, or those prefixes after leading whitespace must be neutralized before download so customer, owner, support, or analytics text cannot become an executable spreadsheet formula.

---

## 🚀 Quick Implementation

### Example: Translations API

File: `/src/app/api/translations/route.ts`

```typescript
import { validateAPIInput } from "@lib/security/inputValidation";
import { TranslationRequestSchema } from "@lib/validation/apiSchemas";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Rate limiting
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 VALIDATE INPUT
        const rawData = await request.json();
        const validation = validateAPIInput(TranslationRequestSchema, rawData);
        
        if (!validation.success) {
            return NextResponse.json({ 
                error: 'Invalid input'
            }, { status: 400 });
        }

        const { inputJson, targetLang, sourceLang, action } = validation.data;
        
        // Continue with AI logic...
    } catch (error) {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
```

---

## 🎯 Benefits

### What Validation Prevents:

1. **SQL/NoSQL Injection** ❌ Blocked
2. **XSS Attacks** ❌ Blocked
3. **Command Injection** ❌ Blocked
4. **Type Confusion** ❌ Blocked
5. **Buffer Overflows** ❌ Blocked
6. **Invalid Data Types** ❌ Blocked

### What You Get:

- ✅ Type-safe data
- ✅ Validated formats (emails, IDs, language codes)
- ✅ Length limits enforced
- ✅ Character restrictions applied
- ✅ Clear error messages
- ✅ OWASP A03 compliance

---

## ⏱️ Time to Complete

- Per route: ~5 minutes
- Total for 10 routes: ~1 hour

---

## 🧪 Testing

### Valid Request (Should Work):
```bash
curl -X POST https://your-api.com/api/descriptions \
  -H "Content-Type: application/json" \
  -d '{
    "itemsList": ["Pizza", "Burger"],
    "targetLang": "en",
    "sourceLang": "es",
    "action": "generate",
    "contentLength": "Medium"
  }'
```

### Invalid Request (Should Fail):
```bash
curl -X POST https://your-api.com/api/descriptions \
  -H "Content-Type: application/json" \
  -d '{
    "itemsList": ["<script>alert(1)</script>"],
    "targetLang": "INVALID",
    "sourceLang": "../etc/passwd",
    "action": "DROP TABLE users",
    "contentLength": "TooLarge"
  }'

# Response: 400 Bad Request
# { "error": "Invalid input", "details": "targetLang: Invalid language code format" }
```

---

## 📊 Progress Tracker

```
Input Validation Status:
├─ ✅ Descriptions API (1/11)
├─ ⏳ Translations API (0/11)
├─ ⏳ New Item Metadata API (0/11)
├─ ⏳ Image Generation API (0/11)
├─ ⏳ Image Editing API (0/11)
├─ ⏳ Batch Operations (0/11)
├─ ⏳ Payment APIs (0/11)
└─ ⏳ File Upload (0/11)

Total: 9% Complete (1/11)
```

---

## 🎓 Next Steps

1. Apply pattern to `/api/translations` (Priority 1)
2. Apply pattern to `/api/image-generation` (Priority 1)
3. Continue with remaining AI routes
4. Then payment routes
5. Finally file upload routes

**Goal:** 100% of API routes validated before production deployment
