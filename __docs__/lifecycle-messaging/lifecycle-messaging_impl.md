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
│  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  │
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

`functions/src/messaging/messagingEngine.ts` logs identifiers as presence/length metadata and caps source error name/code/status values before recording failure diagnostics. This applies to idempotency, store lookup, message-log write, owner-notification fallback, renewal/suspension reminder, retry, and digest failure paths without logging raw store, tenant, reference, recipient, subject, or source exception text.

Functions legacy lifecycle fail-closed follow-up (July 5, 2026): when the feature flag cannot be read, the engine still skips sending. When the idempotency or daily rate-limit read cannot be completed, it now logs `MESSAGING_IDEMPOTENCY_CHECK_FAILED` or `MESSAGING_RATE_LIMIT_CHECK_FAILED` with bounded identifier metadata and skips the legacy email send instead of sending optimistically. Retry-send exceptions now log `MESSAGING_RETRY_MARK_FAILED` before the original failed message is marked retried. Valid sends, duplicate skips, rate-limited skips, owner-notification migration fallback, SMTP send behavior, scheduler cadence, and message-log schema are unchanged.

Legacy lifecycle event/status diagnostics follow-up (July 5, 2026): `functions/src/messaging/messagingEngine.ts` no longer logs raw lifecycle `eventType` or message `status` values in Cloud Functions diagnostics; event type and delivery status values are logged as presence/length/type metadata only. The feature-disabled/no-template branches use that same bounded context. Stored `messageLogs.eventType` and `messageLogs.status` remain unchanged because they are part of idempotency, retry, and digest behavior.

Owner-notification migration flag-read follow-up (July 5, 2026): when the queue-first owner-notification processor cannot read `ops_config/system.ENABLE_LIFECYCLE_MESSAGING`, it still skips delivery before event creation, but now logs `owner_notification_lifecycle_flag_check_failed` with bounded source error metadata. Unknown trigger types in the owner-notification migration path are logged with trigger presence/length/type metadata only, and stored unknown-trigger events keep the stable skipped `unknown_trigger` update.

SMTP port fail-closed follow-up (July 5, 2026): `functions/src/messaging/providers/resend.ts` no longer falls back to port `587` when `SMTP_PORT` is absent, and the root app senders now share `src/lib/notifications/smtpConfig.ts` for the same explicit-port boundary. The Functions adapter and app-side senders in `src/lib/messaging/index.ts`, `src/lib/notifications/index.ts`, and `src/lib/owner-notifications/channels/email.ts` require `SMTP_HOST`, numeric `SMTP_PORT`, `SMTP_USER`, and non-empty `SMTP_PASS`; if `SMTP_PORT` is missing, malformed, or outside `1..65535`, they return not-configured without creating a transporter or attempting a send. The Functions adapter logs only bounded `hasPort` / `smtpPortValid` metadata. Raw host, user, password, recipient, subject, provider response, and exception text are not logged.

App-side notification fail-closed follow-up (July 5, 2026): `src/lib/messaging/index.ts` and `src/lib/notifications/index.ts` now skip sending when duplicate or rate-limit safety reads fail. The failure paths log bounded `lifecycle_message_duplicate_check_failed`, `lifecycle_message_rate_limit_check_failed`, `notification_duplicate_check_failed`, or `notification_rate_limit_check_failed` diagnostics and return the same duplicate/rate-limited control value used to stop a send. Valid SMTP sends, duplicate skips, normal rate-limit skips, message-log writes, owner-notification migration fallback, templates, and owner settings are unchanged.

Staleness lifecycle delivery diagnostics follow-up (July 5, 2026): `functions/src/analytics/stalenessCheck.ts` still writes the staleness detection row before attempting `MENU_STALE` lifecycle delivery. If that delivery call throws, the cooldown row remains in place and the nightly scan continues, but the catch now logs `STALENESS_LIFECYCLE_DELIVERY_FAILED` with bounded store, tenant, and reference presence-length metadata plus the fixed `keep_detection_cooldown_and_continue` fallback policy. Raw store IDs, tenant IDs, reference IDs, owner recipients, provider responses, and exception text are not logged.

Template output boundary follow-up (July 5, 2026): the Next and Functions lifecycle template mirrors (`src/lib/messaging/templates.ts` and `functions/src/messaging/templates.ts`) now strip control characters from subject/text values, escape all metadata before HTML output, validate email links as `http:`/`https:` before rendering, and include the missing `MENU_PUBLISH_FAILED` app-side template. Publish verification failure codes are mapped to fixed owner copy, so arbitrary `failureReason` strings cannot print into owner emails. Valid event routing, SMTP delivery, idempotency, rate limits, message logs, and owner-notification migration fallback are unchanged.

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
- [x] SMTP credentials in Firebase secrets (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
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
