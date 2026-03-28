# Lifecycle Messaging — Implementation

**Feature:** Lifecycle Messaging System  
**Author:** Cascade  
**Date:** Feb 20, 2026  
**Status:** Implementation Phase

---

## 1. Architecture — Two-Channel Messaging

MenuList has **two messaging channels** — both use the same SMTP infrastructure:

### Channel 1: EXTERNAL (to store owners / clients)

- **Purpose:** Payment confirmations, welcome emails, renewal reminders, credit alerts
- **Recipient:** Store owner's email (from store doc or subscription)
- **Function:** `sendLifecycleMessage()` in `src/lib/messaging/index.ts`
- **Features:** Idempotent, rate-limited (10/store/day), logged to `messageLogs`
- **Events:** STORE_PUBLISHED, PAYMENT_SUCCESS, PAYMENT_FAILED, RENEWAL_REMINDER, GRACE_PERIOD_STARTED, SUSPENSION_WARNING, CREDIT_PURCHASE_SUCCESS, CREDITS_EXHAUSTED

### Channel 2: INTERNAL (to founder / team)

- **Purpose:** Revenue notifications — someone bought a subscription or credit pack
- **Recipient:** Founder email (from `src/constants/internalRecipients.ts`) + Telegram alert
- **Function:** `sendInternalNotification()` in `src/lib/messaging/index.ts`
- **Features:** No idempotency (every sale notifies), no rate limit, Telegram push + email
- **Events:** INTERNAL_SUBSCRIPTION_PURCHASED, INTERNAL_CREDIT_PACK_PURCHASED, INTERNAL_SUBSCRIPTION_RENEWED

```
System Events (Razorpay webhook, publish, scheduler, credit consumption)
    ↓
┌───────────────────────────────────────────────┐
│ EXTERNAL: sendLifecycleMessage()              │
│  → To: store owner email                     │
│  → Idempotent, rate-limited, logged          │
│  → 8 event types                             │
├───────────────────────────────────────────────┤
│ INTERNAL: sendInternalNotification()          │
│  → To: founder email + Telegram              │
│  → Every sale notifies, no rate limit        │
│  → 3 event types (revenue only)              │
└──────────────┬────────────────────────────────┘
               ↓
┌───────────────────────────────────────────────┐
│ SMTP ADAPTER (nodemailer — free)              │
│  Gmail SMTP: 500/day personal, 2000/day WS   │
│  SMTP_HOST, SMTP_USER, SMTP_PASS             │
└───────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 Store Document — `notificationSettings` (new field)

Added to `StoreDataType`:

```typescript
notificationSettings?: {
  primaryEmail: string;       // Default: store.contactPersonEmail
  billingEmail?: string;      // Default: same as primaryEmail
  preferredChannel: 'email';  // Phase 1: email only
  consentedAt?: string;       // ISO 8601 — when owner agreed to receive messages
  quietHoursEnabled?: boolean; // Default: true — no non-critical msgs 9pm-9am local
};
```

### 2.2 Message Logs — `messageLogs/{docId}`

```typescript
{
  storeId: string;          // e.g., "123"
  tenantId: string;         // e.g., "456"
  eventType: string;        // e.g., "PAYMENT_SUCCESS"
  channel: 'email';         // Phase 1
  status: 'sent' | 'failed';
  recipientEmail: string;   // Who received it
  subject: string;          // Email subject
  referenceId: string;      // Idempotency: paymentId, subscriptionId, etc.
  providerMessageId?: string; // Resend message ID
  error?: string;           // If failed
  createdAt: Timestamp;
}
```

**Idempotency key:** `storeId + eventType + referenceId`  
Before sending, query: does a `sent` doc exist with this combo? If yes → skip.

### 2.3 Feature Flag

```typescript
// src/config/features.ts
ENABLE_LIFECYCLE_MESSAGING: false; // Default OFF
```

---

## 3. Message Events & Templates

### 3.1 Event Registry

| Event Type                | Trigger Source                            | Template           | Priority  |
| ------------------------- | ----------------------------------------- | ------------------ | --------- |
| `STORE_PUBLISHED`         | Publish flow (CF trigger)                 | Welcome            | important |
| `PAYMENT_SUCCESS`         | Razorpay webhook `subscription.charged`   | Payment Confirmed  | important |
| `PAYMENT_FAILED`          | Razorpay webhook `payment.failed`         | Payment Failed     | critical  |
| `RENEWAL_REMINDER`        | Master scheduler (3 days before renewsOn) | Renewal Reminder   | important |
| `GRACE_PERIOD_STARTED`    | Razorpay webhook `subscription.pending`   | Grace Started      | critical  |
| `SUSPENSION_WARNING`      | Master scheduler (7 days past due)        | Suspension Warning | critical  |
| `CREDIT_PURCHASE_SUCCESS` | Top-up payment webhook                    | Credits Added      | important |
| `CREDITS_EXHAUSTED`       | Credit consumption check                  | Credits Exhausted  | warning   |

### 3.2 Template Tone

All templates follow infrastructure tone:

- No exclamation marks
- No emojis in subject lines
- No marketing language
- Sender: `MenuList <system@menulist.ai>`
- Clean, minimal HTML with brand colors

---

## 4. File Inventory

### Cloud Functions (trigger + engine)

| File                                          | Purpose                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `functions/src/messaging/types.ts`            | Types for events, templates, logs                                  |
| `functions/src/messaging/messagingEngine.ts`  | Core: dispatch, idempotency, rate limit, logging                   |
| `functions/src/messaging/providers/resend.ts` | nodemailer SMTP adapter (file named resend.ts but uses nodemailer) |
| `functions/src/messaging/templates.ts`        | All email templates (subject + HTML body)                          |

### Frontend (types + entry point)

| File                                  | Purpose                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/messaging/index.ts`          | `sendLifecycleMessage()` (external) + `sendInternalNotification()` (internal) |
| `src/lib/messaging/templates.ts`      | External + internal email templates                                           |
| `src/constants/internalRecipients.ts` | Founder email, internal event types, two-channel docs                         |
| `src/types/platform/store.ts`         | `notificationSettings` field on `StoreDataType`                               |
| `src/config/features.ts`              | `ENABLE_LIFECYCLE_MESSAGING` flag                                             |

### Integration Points (existing files to modify)

| File                                                         | Change                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/app/api/razorpay/webhook/route.ts`                      | PAYMENT_SUCCESS, PAYMENT_FAILED, GRACE_PERIOD_STARTED — ✅ WIRED |
| `src/app/api/razorpay/verify-subscription/route.ts`          | PAYMENT_SUCCESS (first activation) — ✅ WIRED                    |
| `src/app/api/razorpay/verify-topup/route.ts`                 | CREDIT_PURCHASE_SUCCESS — ✅ WIRED                               |
| `src/lib/ai/capacityCheck.ts`                                | CREDITS_EXHAUSTED (when balance hits 0) — ✅ WIRED               |
| `functions/src/decisionBlocksScoring.ts`                     | RENEWAL_REMINDER + SUSPENSION_WARNING (nightly) — ✅ WIRED       |
| `functions/src/index.ts` (verifyMenuPublish)                 | STORE_PUBLISHED (first publish only) — ✅ WIRED                  |
| `src/components/mobile/screens/MobileDesignEditorScreen.tsx` | Mobile publish → health verify → STORE_PUBLISHED — ✅ WIRED      |
| `functions/src/constants/database.ts`                        | Add `MESSAGE_LOGS` collection constant                           |
| `src/constants/database.ts`                                  | Add `MESSAGE_LOGS` collection constant (frontend)                |

---

## 5. Security Checklist

- [x] No PII in logs (email masked in error logs)
- [x] SMTP credentials in Firebase secrets (SMTP_HOST, SMTP_USER, SMTP_PASS)
- [x] Rate limit: max 10 messages per store per 24h
- [x] Idempotency prevents duplicate billing confirmations
- [x] Feature flag defaults OFF (zero cost when disabled)
- [x] No user-editable templates (prevents injection)
- [x] Sender domain should have SPF/DKIM configured for deliverability

---

## 6. Implementation Phases

### Phase 1 — V1 (This Session)

- [x] Messaging engine with idempotency
- [x] nodemailer SMTP adapter (free, any SMTP server)
- [x] 8 message templates (infrastructure tone)
- [x] Feature flag (`ENABLE_LIFECYCLE_MESSAGING`)
- [x] Message log collection + Firestore indexes
- [x] Store notification settings type on StoreDataType
- [x] Frontend entry point for API routes (src/lib/messaging/)
- [x] Wire PAYMENT_SUCCESS into Razorpay webhook (`subscription.charged/activated`)
- [x] Wire PAYMENT_SUCCESS into verify-subscription route (first activation)
- [x] Wire PAYMENT_FAILED into Razorpay webhook (`payment.failed`, `subscription.halted`)
- [x] Wire GRACE_PERIOD_STARTED into Razorpay webhook (`subscription.pending`)
- [x] Wire STORE_PUBLISHED into verifyMenuPublish CF (first publish only, idempotent)
- [x] Wire CREDIT_PURCHASE_SUCCESS into verify-topup route
- [x] Wire CREDITS_EXHAUSTED into consumeAICapacity (capacityCheck.ts)
- [x] Wire RENEWAL_REMINDER + SUSPENSION_WARNING into nightly scheduler (decisionBlocksScoring.ts)
- [x] Wire health verification into mobile publish flow (was missing)
- [x] Two-channel architecture: external (clients) + internal (founder/team)
- [x] Internal notification templates (INTERNAL_SUBSCRIPTION_PURCHASED, INTERNAL_CREDIT_PACK_PURCHASED, INTERNAL_SUBSCRIPTION_RENEWED)
- [x] `sendInternalNotification()` function — email + Telegram push to founder
- [x] Founder email constants in `src/constants/internalRecipients.ts`
- [x] SMTP health check with critical Telegram alert on connection failure (once/day)
- [x] Failed message retry in nightly scheduler (max 1 retry per message, 24h window)
- [x] Daily messaging digest (sent/failed counts logged by scheduler)
- [x] Nightly scheduler completion summary via Telegram (dead man's switch pattern)
- [x] CRITICAL FIX: CF renewal/suspension scans used `collectionGroup()` instead of `collection()` — subscriptions are top-level

### Phase 2 — After 50+ Paying Stores

- [ ] WhatsApp adapter (reuse messaging onboarding pattern)
- [ ] SMTP bounce handling
- [ ] Notification preferences UI in Business Settings
- [ ] Channel health visibility
- [ ] Separate billing email field

---

## 7. Firebase Cost Estimation

See `lifecycle-messaging_firebase.md` for detailed breakdown.

**Summary at 50 stores:**

- Reads: ~300/month (idempotency checks + store info)
- Writes: ~150/month (message logs)
- SMTP: Free (Gmail SMTP or custom)
- **Total: ~₹0.05/month** (negligible)

---

_Last updated: Feb 20, 2026_
