# 🔐 Webhook Security Implementation

**Last Updated**: November 15, 2025  
**Status**: Implementation guide; not current launch certification
**Priority**: P0 (Critical)

---

## Current Launch Boundary

Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md) and [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, current webhook-source review, QA/provider webhook smoke, secret setup evidence, replay/idempotency evidence for payment-affecting handlers, and deploy evidence for the target environment. This guide records implementation evidence; it is not production-launch approval.

---

## 📖 Overview

Webhooks allow third-party services to notify your application of events. However, they're a potential attack vector if not properly secured. This guide covers our comprehensive webhook security implementation.

### What's Implemented

| Feature                          | Status      | File                           |
| -------------------------------- | ----------- | ------------------------------ |
| **HMAC Signature Verification**  | ✅ Complete | `webhookValidation.ts`         |
| **Timing-Safe Comparison**       | ✅ Complete | Uses `timingSafeEqual`         |
| **Provider-Specific Validators** | ✅ Complete | Razorpay, Stripe, Generic      |
| **Raw Body Size Guard**          | ✅ Complete | Razorpay route rejects >256KB  |
| **Webhook Rate Limit**           | ✅ Complete | Shared `WEBHOOK` limiter       |
| **Security Logging**             | ✅ Complete | Integrated with `secureLogger` |
| **IP Validation**                | ✅ Ready    | `validateWebhookIP()`          |

---

## 🎯 OWASP Coverage

- ✅ **A02: Cryptographic Failures** - HMAC-SHA256 signature verification
- ✅ **A04: Insecure Design** - Prevents webhook spoofing
- ✅ **A07: Authentication Failures** - Validates webhook source
- ✅ **A09: Logging Failures** - Comprehensive security logging

---

## 🔐 Security Features

### 1. HMAC Signature Verification

All webhooks MUST be verified using HMAC (Hash-based Message Authentication Code):

```typescript
import { validateWebhookSignature } from "@lib/security/webhookValidation";

const isValid = validateWebhookSignature(
  requestBody, // Raw request body (string)
  signature, // Signature from headers
  secret, // Your webhook secret
  { algorithm: "sha256" }
);

if (!isValid) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
}
```

**How It Works:**

1. Service (Razorpay, Stripe, etc.) generates HMAC of payload using shared secret
2. Service sends payload + HMAC signature in header
3. We regenerate HMAC using same secret
4. Compare signatures using timing-safe comparison
5. Accept only if signatures match exactly

---

### 2. Timing-Safe Comparison

**Why It Matters:**

Regular string comparison (`===`) is vulnerable to timing attacks:

```typescript
// ❌ VULNERABLE to timing attacks
const isValid = generatedSignature === receivedSignature;
```

Attackers can measure response time to guess signature byte-by-byte.

**Our Solution:**

```typescript
// ✅ SECURE - constant-time comparison
const isValid = timingSafeEqual(
  Buffer.from(generatedSignature),
  Buffer.from(receivedSignature)
);
```

**Benefits:**

- Comparison always takes same time
- Prevents timing-based signature guessing
- Industry-standard cryptographic practice

---

### 3. Security Logging

All webhook validation attempts are logged securely:

```typescript
// Invalid signature
secureLog("[Webhook Validator] Invalid signature", {
  provider: "razorpay",
  signatureLength: signature.length,
});

// Validation error
secureError("[Webhook Validator] Validation error", error, {
  provider: "razorpay",
});
```

**What Gets Logged:**

- Provider name
- Signature length (not the actual signature)
- Validation result (success/failure)
- Error details (if any)

**What's NOT Logged:**

- Actual signatures (security risk)
- Webhook secrets (critical secret)
- Sensitive payload data (PII, payment details)

---

## 🚀 Usage Patterns

### Pattern 1: Razorpay Webhook

```typescript
// src/app/api/razorpay/webhook/route.ts
import { validateRazorpayWebhookSignature } from "@lib/razorpay/webhook-validator";

export async function POST(request: Request) {
  // 1. Get signature from header
  const signature = headers().get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Missing signature or secret" },
      { status: 400 }
    );
  }

  // 2. Reject oversized payloads and apply webhook rate limiting before body work.
  const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(request, RAZORPAY_WEBHOOK_MAX_BODY_BYTES);
  if (declaredBodyResponse) return declaredBodyResponse;

  const rateLimitResponse = await checkPublicRateLimit(request, 'WEBHOOK');
  if (rateLimitResponse) return rateLimitResponse;

  // 3. Get raw body with a stream size cap (IMPORTANT: must be raw string)
  const boundedBody = await readBoundedTextBody(request, RAZORPAY_WEBHOOK_MAX_BODY_BYTES);
  if (boundedBody.ok === false) return boundedBody.response;
  const requestBody = boundedBody.body;

  // 4. Validate signature
  const isValid = await validateRazorpayWebhookSignature(
    requestBody,
    signature,
    secret
  );

  if (!isValid) {
    logger.warn("Webhook signature validation failed", {
      reason: "Invalid signature",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // 4. Parse and process event
  const event = JSON.parse(requestBody);

  // Process webhook event...

  return NextResponse.json({ status: "ok" });
}
```

---

### Pattern 2: Stripe Webhook

**Stripe provides their own SDK with built-in verification:**

```typescript
// src/app/api/webhook/route.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  try {
    // Stripe SDK handles signature verification
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      endpointSecret
    );

    // Process event...
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
```

---

### Pattern 3: Generic Webhook (GitHub, Shopify, etc.)

```typescript
import { validateWebhookSignature } from "@lib/security/webhookValidation";

// GitHub webhook
export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256")!;
  const payload = await request.text();

  const isValid = validateWebhookSignature(
    payload,
    signature,
    process.env.GITHUB_WEBHOOK_SECRET!,
    {
      algorithm: "sha256",
      signaturePrefix: "sha256=", // GitHub adds this prefix
      provider: "github",
    }
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Process webhook...
}
```

---

## 📋 Complete API Reference

### `validateWebhookSignature()`

**Purpose**: Generic HMAC-based webhook validation

```typescript
function validateWebhookSignature(
  requestBody: string,
  receivedSignature: string,
  secret: string,
  options?: WebhookValidationOptions
): boolean;
```

**Options**:

```typescript
interface WebhookValidationOptions {
  algorithm?: "sha256" | "sha512" | "sha1" | "md5"; // Default: 'sha256'
  encoding?: "hex" | "base64"; // Default: 'hex'
  provider?: string; // For logging
  signaturePrefix?: string; // e.g., 'sha256='
}
```

**Returns**: `true` if valid, `false` if invalid

---

### `validateRazorpayWebhook()`

**Purpose**: Razorpay-specific validation

```typescript
function validateRazorpayWebhook(
  requestBody: string,
  signature: string,
  secret: string
): boolean;
```

**Example**:

```typescript
const isValid = validateRazorpayWebhook(
  await request.text(),
  headers().get("x-razorpay-signature")!,
  process.env.RAZORPAY_WEBHOOK_SECRET!
);
```

---

### `validateGitHubWebhook()`

**Purpose**: GitHub-specific validation

```typescript
function validateGitHubWebhook(
  requestBody: string,
  signature: string,
  secret: string
): boolean;
```

**Example**:

```typescript
const isValid = validateGitHubWebhook(
  await request.text(),
  headers().get("x-hub-signature-256")!,
  process.env.GITHUB_WEBHOOK_SECRET!
);
```

---

### `validateShopifyWebhook()`

**Purpose**: Shopify-specific validation (base64 encoding)

```typescript
function validateShopifyWebhook(
  requestBody: string,
  signature: string,
  secret: string
): boolean;
```

**Example**:

```typescript
const isValid = validateShopifyWebhook(
  await request.text(),
  headers().get("x-shopify-hmac-sha256")!,
  process.env.SHOPIFY_WEBHOOK_SECRET!
);
```

---

### `validateWebhookIP()`

**Purpose**: Additional security layer - verify source IP

```typescript
function validateWebhookIP(
  requestIP: string | null,
  allowedIPs: string[],
  provider?: string
): boolean;
```

**Example**:

```typescript
const RAZORPAY_IPS = ["13.234.176.64/27", "13.234.176.96/27"];

const isAllowed = validateWebhookIP(
  request.headers.get("x-forwarded-for"),
  RAZORPAY_IPS,
  "razorpay"
);
```

**Note**: IP validation is optional but recommended for extra security.

---

## 🛡️ Security Best Practices

### 1. Always Use HTTPS

```nginx
# ✅ GOOD
https://api.menulist.ai/webhook

# ❌ BAD
http://api.menulist.ai/webhook
```

**Why**: HTTP allows man-in-the-middle attacks to intercept webhooks.

---

### 2. Use Raw Request Body

```typescript
// ✅ CORRECT - Raw body for signature verification
const requestBody = await request.text();
const isValid = validateWebhookSignature(requestBody, signature, secret);

// ❌ WRONG - Parsed JSON breaks signature
const body = await request.json();
const isValid = validateWebhookSignature(
  JSON.stringify(body),
  signature,
  secret
);
```

**Why**: Signature is generated from exact raw bytes. JSON parsing/stringifying changes byte order.

---

### 3. Store Secrets Securely

```typescript
// ✅ GOOD - Environment variables
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

// ❌ BAD - Hardcoded secrets
const secret = "1a2b3c4d5e6f"; // Never do this!
```

**Environment Variables Required:**

```bash
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
```

---

### 4. Return Generic Errors

```typescript
// ✅ GOOD - Generic error
return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

// ❌ BAD - Leaks information
return NextResponse.json(
  {
    error: "Signature mismatch",
    expected: generatedSignature, // NEVER expose this!
    received: receivedSignature, // NEVER expose this!
  },
  { status: 403 }
);
```

**Why**: Prevents attackers from learning about your signature algorithm.

---

### 5. Log Security Events

```typescript
// ✅ GOOD - Log validation attempts
if (!isValid) {
  logger.warn("Webhook signature validation failed", {
    provider: "razorpay",
    endpoint: "/api/razorpay/webhook",
  });
}

// Track in Sentry for investigation
logger.security(
  "Invalid webhook signature",
  {
    provider: "razorpay",
    ip: request.headers.get("x-forwarded-for"),
  },
  "medium"
);
```

---

### 6. Implement Idempotency

```typescript
// Process webhook with idempotency
const eventId = event.id;

// Check if already processed
const exists = await checkEventProcessed(eventId);
if (exists) {
  return NextResponse.json({ status: "already_processed" });
}

// Process event
await processEvent(event);

// Mark as processed
await markEventProcessed(eventId);
```

**Why**: Webhooks can be sent multiple times. Idempotency prevents duplicate processing.

---

## 🧪 Testing Guide

### Test 1: Valid Signature

```bash
# Generate valid signature
SECRET="your_webhook_secret"
PAYLOAD='{"event":"test"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)

# Send request
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

**Expected**: `200 OK` - Webhook processed

---

### Test 2: Invalid Signature

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: invalid_signature_12345" \
  -d '{"event":"test"}'
```

**Expected**: `403 Forbidden` - Invalid signature

---

### Test 3: Missing Signature

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'
```

**Expected**: `400 Bad Request` - Missing signature

---

### Test 4: Replay Attack

```bash
# Send same webhook twice
curl -X POST http://localhost:3000/api/webhook \
  -H "x-webhook-signature: $SIGNATURE" \
  -d "$PAYLOAD"

# Send again with same signature
curl -X POST http://localhost:3000/api/webhook \
  -H "x-webhook-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

**Expected**:

- First request: `200 OK`
- Second request: `200 OK` with "already_processed" (if idempotency implemented)

---

## 🚨 Common Issues & Solutions

### Issue 1: Signature Validation Always Fails

**Symptoms**:

```
All webhooks return 403 Forbidden
Logs show "Invalid signature" for every request
```

**Possible Causes**:

1. Using wrong secret (dev vs prod)
2. Parsing body before validation
3. Wrong hashing algorithm
4. Wrong encoding (hex vs base64)

**Solution**:

```typescript
// ✅ Verify secret
console.log('Using secret:', process.env.RAZORPAY_WEBHOOK_SECRET?.substring(0, 4) + '...');

// ✅ Use raw body
const requestBody = await request.text();  // NOT request.json()

// ✅ Match provider's algorithm
{ algorithm: 'sha256' }  // Razorpay, GitHub
{ algorithm: 'sha256', encoding: 'base64' }  // Shopify
```

---

### Issue 2: Timing Attacks Not Prevented

**Symptoms**:

```
Using basic string comparison: ===
Potential security vulnerability
```

**Solution**:

```typescript
// ❌ WRONG - Vulnerable
const isValid = generatedSig === receivedSig;

// ✅ CORRECT - Timing-safe
const isValid = timingSafeEqual(
  Buffer.from(generatedSig),
  Buffer.from(receivedSig)
);
```

---

### Issue 3: Secrets Exposed in Logs

**Symptoms**:

```
Logs contain webhook secrets
Security audit flags exposed credentials
```

**Solution**:

```typescript
// ❌ NEVER log secrets
console.log("Secret:", secret);
console.log("Signature:", signature);

// ✅ Log safely
secureLog("Webhook validation", {
  provider: "razorpay",
  signatureLength: signature.length, // Length only, not value
});
```

---

## 📊 Security Metrics

### What to Monitor:

| Metric                 | Good Range | Alert If |
| ---------------------- | ---------- | -------- |
| **Valid Webhooks**     | >95%       | <90%     |
| **Invalid Signatures** | <5%        | >10%     |
| **Missing Signatures** | 0%         | >0%      |
| **Processing Errors**  | <1%        | >5%      |

### Sentry Filters:

```
type:webhook_security
severity:medium,high,critical
provider:razorpay,stripe,github
```

---

## 🔗 Provider Documentation

### Razorpay:

- [Webhook Documentation](https://razorpay.com/docs/webhooks/)
- [Signature Verification](https://razorpay.com/docs/webhooks/validate/)
- [Webhook Events](https://razorpay.com/docs/webhooks/supported-events/)

### Stripe:

- [Webhook Guide](https://stripe.com/docs/webhooks)
- [Signature Verification](https://stripe.com/docs/webhooks/signatures)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

### GitHub:

- [Webhook Documentation](https://docs.github.com/en/webhooks)
- [Securing Webhooks](https://docs.github.com/en/webhooks/securing)
- [Webhook Events](https://docs.github.com/en/webhooks/events)

---

## ✅ Production Checklist

Before deploying webhook handlers:

- [ ] Signature verification implemented for all webhooks
- [ ] Using timing-safe comparison (`timingSafeEqual`)
- [ ] Webhook secrets stored in environment variables
- [ ] Security logging enabled for validation failures
- [ ] HTTPS only (no HTTP webhooks)
- [ ] Raw request body used for signature verification
- [ ] Raw request body is size-bounded before JSON parsing or persistence
- [ ] Public webhook entrypoint has an endpoint-appropriate rate limit
- [ ] Generic error messages (no signature leaks)
- [ ] Idempotency implemented (prevent duplicate processing)
- [ ] IP validation configured (optional but recommended)
- [ ] Tested with valid/invalid signatures
- [ ] Sentry alerts configured for webhook failures
- [ ] Team aware of webhook security practices

---

**Status**: Implementation evidence documented; not current launch certification
**Coverage**: Razorpay, Stripe, GitHub, Shopify, Generic  
**Maintenance**: Review quarterly for provider updates
