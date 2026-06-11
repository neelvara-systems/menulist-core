# Owner Notifications - Implementation Plan

**Status:** Implemented for MenuList lifecycle owner notifications, Answerlattice owner test notification, and internal ops tracking
**Last Reviewed:** June 11, 2026
**Date:** 2026-06-02
**Audience:** Developers

## Architecture Summary

Owner Notifications should be queue-first.

Trigger points do not send email or WhatsApp directly. They create an owner notification event with a product ID, trigger type, scope, reference ID, recipient role, and metadata. A central delivery worker resolves recipients, preferences, templates, formatting, channels, idempotency, rate limits, and logs.

This removes direct owner-facing SMTP sends from billing routes, schedulers, and product-specific support code for the implemented trigger set. WhatsApp is implemented as a guarded channel adapter and remains disabled by default until approved template/session rollout is configured.

WhatsApp recipients must be normalized to international digits before hashing, rate limiting, delivery logging, or Graph API calls. Recipient resolution uses the store/workspace `countryCode`, `dialCode`, canonical `phone`, local `phoneNumber`, notification settings WhatsApp number, and explicit recipient hints. Bare local Indian numbers default to `+91`; explicit `+...` / `00...` numbers override the stored/default country.

For MenuList, recipient and formatting context resolution reads canonical top-level `stores/{storeId}` first. A nested `tenants/{tenantId}/stores/{storeId}` fallback exists only for legacy compatibility; new MenuList owner-notification code must not depend on nested store documents.

Internal recovery is handled through a platform-only dashboard. It does not create owner-facing settings or live workflow notifications; it gives the platform team a bounded tracking surface for failed/partial/skipped events, retry, system send to a chosen destination, and manual handoff recording.

## Implemented Runtime

Implemented on June 2, 2026:

- Shared registry: `src/data/shared/ownerNotificationRegistry.ts`, copied byte-for-byte to `functions/src/sharedData/ownerNotificationRegistry.ts`.
- App core: `src/lib/owner-notifications/index.ts`.
- App recipient/formatting/templates/channels: `src/lib/owner-notifications/recipientResolver.ts`, `formatters.ts`, `templates/`, `channels/`.
- MenuList Functions processor: `functions/src/ownerNotifications/processor.ts`.
- MenuList Next lifecycle wrapper: `src/lib/messaging/index.ts`.
- MenuList Functions lifecycle wrapper: `functions/src/messaging/messagingEngine.ts`.
- Answerlattice owner test routing: `src/lib/notifications/index.ts` and `src/app/api/answerlattice/notifications/test/route.ts`.
- Billing trigger wiring: `src/app/api/razorpay/*`.
- Publish success/failure wiring: `functions/src/triggers/operations.ts`.
- Menu stale wiring: `functions/src/analytics/stalenessCheck.ts`.
- Platform dashboard: `src/app/(main)/ops/owner-notifications/page.tsx` and `src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx`.
- Platform API: `src/app/api/ops/owner-notifications/route.ts`.

The implementation processes events inline after writing `ownerNotificationEvents/{eventId}`. This keeps the queue-first audit model without adding a new Firestore trigger in this pass.

## Current Implementation Evidence

| Current system | Evidence | Migration meaning |
| --- | --- | --- |
| MenuList Functions lifecycle engine | `functions/src/messaging/messagingEngine.ts:157` | Replace direct send with enqueue or worker-backed send |
| MenuList Next lifecycle engine | `src/lib/messaging/index.ts:171` | Replace direct send with enqueue API/server helper |
| MenuList event docs | `__docs__/lifecycle-messaging/lifecycle-messaging_impl.md:104` | Existing eight events become registry entries |
| WhatsApp onboarding queue | `functions/src/messagingOnboarding/inboundQueue.ts:142` | Reuse provider model and delivery logging concepts |
| WhatsApp templates | `functions/src/messagingOnboarding/constants.ts:254` | Map conversational templates into channel registry |
| Answerlattice notification sender | `src/lib/notifications/index.ts:248` | Migrate owner/ticket email delivery to shared core where appropriate |
| Answerlattice workflow integrations | `functions-answerlattice/src/integrations/eventProcessor.ts:89` | Explicitly not part of owner notification core |
| MenuList desktop locale/currency settings | `src/components/templates/main-app/businessSettings/tabs/LocaleSettingsTab.tsx:90` | Server formatter must read store settings |
| MenuList mobile locale/currency save | `src/components/mobile/screens/MobileLocaleSettingsScreen.tsx:135` | Mobile changes must affect notifications too |
| Existing date/time formatter | `src/utils/dateTime/index.tsx:131` | Reuse concepts; add server-safe product formatter |

## Runtime Model

### Product-specific event creation

Every trigger uses one function:

```ts
enqueueOwnerNotification({
  productId: 'ML',
  triggerType: 'PAYMENT_FAILED',
  tenantId,
  storeId,
  referenceId: providerEventId,
  recipientRole: 'billing_owner',
  metadata,
});
```

### Central delivery worker

The worker:

1. Loads event by ID.
2. Validates registry entry.
3. Checks feature flags and product rollout state.
4. Resolves product scope.
5. Resolves recipients.
6. Resolves notification preferences and formatting settings.
7. Builds channel list.
8. Builds email/WhatsApp templates using formatted metadata.
9. Checks dedupe and rate limits.
10. Sends per channel.
11. Writes delivery logs.
12. Updates event status.

## Implemented File Structure

### Shared app-side files

```
src/data/shared/ownerNotificationRegistry.ts
src/lib/owner-notifications/
  index.ts
  types.ts
  recipientResolver.ts
  formatters.ts
  templates/
    menulist.ts
    answerlattice.ts
    index.ts
  channels/
    email.ts
    whatsapp.ts
```

### Cloud Functions mirror

Static shared data must follow the repo shared-data rule:

```
functions/src/sharedData/ownerNotificationRegistry.ts
functions/src/ownerNotifications/
  processor.ts
functions/src/utils/
  phoneNumber.ts
```

The registry file must be edited in `src/data/shared/` first and copied byte-for-byte to `functions/src/sharedData/`.

### Answerlattice Functions mirror

Answerlattice has its own Firebase project/functions package. Use separate constants and admin clients:

```
functions-answerlattice/src/ownerNotifications/
  processor.ts
  recipientResolver.ts
  preferenceResolver.ts
  templates.ts
  channels/
    email.ts
    whatsapp.ts
```

The first implementation migrates Answerlattice Next-side owner test notifications only. Answerlattice ticket/customer notification emails stay on the existing generic notification service, and workflow integrations remain separate.

## Internal Tracking Dashboard

Route: `/ops/owner-notifications`.

Access: `platformRole === 'PLATFORM'` only, enforced both by the page guard and `withAuth(..., { requiredPlatformRole: 'PLATFORM' })` on the API route.

The API is also feature-flag guarded: it returns `404` before Firestore reads or recovery writes when either `ENABLE_OWNER_NOTIFICATIONS` or `ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD` is disabled.

Capabilities:

- List recent or status-filtered owner notification events for MenuList or Answerlattice.
- Inspect one event, delivery attempts, and resolved recipient contact.
- Retry a failed, partial, or skipped event through the central processor.
- Open a prefilled email or WhatsApp Web message from the event row or detail drawer.
- Send a manual system event to an explicitly entered email or WhatsApp number.
- Record a manual handoff after the platform operator sends email or WhatsApp outside the system.

The prefilled Email/WhatsApp Web flow uses the same registered owner notification template that the automated channel uses. The API renders the template only in the selected-event detail response, and the dashboard lets the platform operator review/edit the destination, subject, and body before opening the external tool.

Manual system send writes a new owner notification event with `metadata.manualRecipientOverride === true`; the recipient resolver prefers the entered email or WhatsApp number only for that marked event. Normal event delivery still resolves recipients from owner/store/workspace notification settings. WhatsApp manual-send validation and manual-handoff recipient hashes use the same international-recipient normalizer used by automated delivery.

Manual handoff writes a delivery record with `deliveryMode: 'manual_handoff'`, masked/hashed destination, operator audit fields, and `manualHandoffAt` fields on the source event. The original event status is not silently changed, so failed events remain visible for review.

Cost constraints:

- Manual refresh only; no realtime listener.
- List reads are bounded by `scanLimit <= 90`.
- Count aggregations use one query per status.
- Delivery logs and resolved full recipient contact are loaded only after selecting an event.
- Prefilled manual message generation is template rendering only; it does not add Firestore reads beyond the selected-event detail read/scope read.
- No Firestore composite index or new scheduled function is required.

## Feature Flags

Add flags with default off unless current behavior is being preserved during migration:

| Flag | Purpose |
| --- | --- |
| `ENABLE_OWNER_NOTIFICATIONS` | Master gate for shared engine |
| `ENABLE_OWNER_NOTIFICATION_EMAIL` | Email channel gate |
| `ENABLE_OWNER_NOTIFICATION_WHATSAPP` | WhatsApp channel gate |
| `ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION` | MenuList lifecycle migration gate |
| `ENABLE_OWNER_NOTIFICATION_ANSWERLATTICE_MIGRATION` | Answerlattice migration gate |
| `ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD` | Internal platform dashboard gate |

Cloud Functions needs mirrored flags where function runtime cannot import app config.

## Firestore Collections

### MenuList project

```
ownerNotificationEvents/{eventId}
ownerNotificationDeliveries/{deliveryId}
ownerNotificationRateLimits/{key}
```

### Answerlattice project

```
ownerNotificationEvents/{eventId}
ownerNotificationDeliveries/{deliveryId}
ownerNotificationRateLimits/{key}
```

Use the same logical names in separate Firebase projects, or product-prefixed constants if both products write into one project for a specific runtime.

## Event Document

```ts
type OwnerNotificationEvent = {
  productId: 'ML' | 'AL';
  triggerType: string;
  tenantId: string;
  storeId?: string;
  workspaceId?: string;
  referenceId: string;
  dedupeKey: string;
  recipientRole: 'primary_owner' | 'billing_owner' | 'support_owner' | 'whatsapp_owner';
  requestedChannels?: Array<'email' | 'whatsapp'>;
  metadata: Record<string, unknown>;
  priority: 'critical' | 'required' | 'advisory' | 'conversational';
  status: 'pending' | 'processing' | 'delivered' | 'partial' | 'failed' | 'skipped';
  source: {
    runtime: 'next' | 'functions' | 'functions-answerlattice';
    path: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
};
```

## Delivery Document

```ts
type OwnerNotificationDelivery = {
  eventId: string;
  productId: 'ML' | 'AL';
  triggerType: string;
  channel: 'email' | 'whatsapp';
  recipientRole: string;
  recipientHash: string;
  recipientMasked: string;
  status: 'sent' | 'failed' | 'skipped' | 'rate_limited';
  subject?: string;
  templateKey: string;
  templateVersion: string;
  providerMessageId?: string;
  error?: string;
  attempt: number;
  createdAt: Timestamp;
  sentAt?: Timestamp;
  expiresAt?: Timestamp;
};
```

Do not store full WhatsApp numbers in logs. Store masked and hashed recipient values.

## Registry Entry

```ts
type OwnerNotificationRegistryEntry = {
  productId: 'ML' | 'AL';
  triggerType: string;
  priority: 'critical' | 'required' | 'advisory' | 'conversational';
  defaultChannels: Array<'email' | 'whatsapp'>;
  recipientRole: string;
  dedupeStrategy: 'per_reference' | 'per_day' | 'per_state_transition';
  quietHours: 'respect' | 'bypass';
  requiresWhatsAppConsent: boolean;
  templateKey: string;
  requiredMetadata: string[];
};
```

## Recipient Resolver

### MenuList

Resolution order:

1. Load store by tenant/store scope when possible.
2. For billing triggers, prefer `notificationSettings.billingEmail`.
3. Fallback to subscription email.
4. Fallback to `notificationSettings.primaryEmail`.
5. Fallback to contact/person/session email.
6. For WhatsApp, require verified owner notification number or active WhatsApp onboarding session user.

### Answerlattice

Resolution order:

1. Load Answerlattice workspace/store from Answerlattice Firebase.
2. Prefer `supportEmail` for support-readiness triggers.
3. Prefer workspace owner email for account/billing triggers.
4. For WhatsApp, require explicit workspace WhatsApp consent.

## Preference Resolver

The resolver returns:

```ts
{
  locale: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  currencyCode: string;
  currencySymbol: string;
  quietHoursEnabled: boolean;
  channelPreferences: {
    email: boolean;
    whatsapp: boolean;
  };
}
```

MenuList must read store fields already edited by desktop and mobile settings:

- `timeZone`
- `dateFormat`
- `timeFormat`
- `currencyCode`
- `currencySymbol`

## Formatter Contract

Add server-safe formatters that do not depend on browser cookies:

```ts
formatOwnerDate(value, preferences)
formatOwnerTime(value, preferences)
formatOwnerDateTime(value, preferences)
formatOwnerMoney(amount, preferences, options)
formatOwnerLink(url)
```

No notification template may call:

- `new Date(...).toLocaleDateString()`
- `new Date(...).toLocaleString()`
- raw `${currency} ${amount}`

## Channel Adapters

### Email

Use existing SMTP env vars:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

The email adapter should be product-neutral and receive fully rendered subject/html.

### WhatsApp

Use Meta WhatsApp Cloud provider logic compatible with existing messaging onboarding adapter.

WhatsApp sends outside the 24-hour conversation window require approved template messages. Conversational WhatsApp onboarding replies can continue to use session context where allowed.

## API Routes

### `POST /api/owner-notifications/enqueue`

Protected route for approved app-side trigger creation.

Security requirements:

- `withAuth()`
- Zod input validation
- Tenant/store/workspace access verification
- Rate limit before writes
- Metadata max size
- Allowed trigger registry validation
- Secure logging without sensitive values

### `POST /api/owner-notifications/test`

Owner/admin test route to verify email and WhatsApp channel readiness.

Security requirements:

- `withAuth()`
- Role check
- Tenant/store/workspace access
- Per-store/workspace test rate limit
- No arbitrary recipient unless platform admin

## Migration Build Order

This build order keeps existing owner messaging working while moving the architecture:

1. Add shared registry, types, formatters, and feature flags.
2. Add event and delivery collections with constants.
3. Add enqueue helper for Next runtime.
4. Add Cloud Functions processor for MenuList project.
5. Add email channel adapter and migrate current eight MenuList lifecycle events.
6. Add formatter migration for all date/money metadata.
7. Add WhatsApp channel adapter and migrate approved WhatsApp onboarding delivery logs.
8. Add missing MenuList triggers: publish failed, subscription cancelled/paused/resumed/upgraded, low credits, menu stale.
9. Add Answerlattice owner trigger registry and migrate notification test/support-readiness owner notices.
10. Decide whether Answerlattice ticket submitter emails should use shared delivery plumbing while remaining outside owner trigger classification.
11. Add delivery monitor/readiness UI only if needed for owner/admin support.

All capabilities should exist in the architecture from the first implementation and be controlled by flags, not postponed as redesign work.

## Current Trigger Migration Map

| Current trigger | Current source | New trigger |
| --- | --- | --- |
| `STORE_PUBLISHED` | `functions/src/triggers/operations.ts:125` | `MENU_PUBLISHED` |
| `PAYMENT_SUCCESS` | `src/app/api/razorpay/webhook/route.ts:501`, `src/app/api/razorpay/verify-subscription/route.ts:295` | `PAYMENT_SUCCESS` |
| `PAYMENT_FAILED` | `src/app/api/razorpay/webhook/route.ts:342` | `PAYMENT_FAILED` |
| `GRACE_PERIOD_STARTED` | `src/app/api/razorpay/webhook/route.ts:342` | `GRACE_PERIOD_STARTED` |
| `RENEWAL_REMINDER` | `functions/src/messaging/messagingEngine.ts:246` | `RENEWAL_REMINDER` |
| `SUSPENSION_WARNING` | `functions/src/messaging/messagingEngine.ts:292` | `SUSPENSION_WARNING` |
| `CREDIT_PURCHASE_SUCCESS` | `src/app/api/razorpay/verify-topup/route.ts:363` | `CREDIT_PURCHASE_SUCCESS` |
| `CREDITS_EXHAUSTED` | `src/lib/ai/capacityCheck.ts:214` | `CREDITS_EXHAUSTED` |
| WhatsApp preview ready | `functions/src/messagingOnboarding/extractionWatcher.ts:271` | `WHATSAPP_PREVIEW_READY` |
| WhatsApp publish confirmation | `functions/src/messagingOnboarding/intakeProcessor.ts:171` | `WHATSAPP_PUBLISHED` |
| Answerlattice notification test | `src/app/api/answerlattice/notifications/test/route.ts:86` | `ANSWERLATTICE_NOTIFICATION_TEST` |

## Missing Trigger Additions

| Trigger | Current evidence | Required change |
| --- | --- | --- |
| `SUBSCRIPTION_CANCELLED` | `src/app/api/razorpay/cancel-subscription/route.ts:155` updates state without lifecycle send | Add owner event after confirmed state update |
| `SUBSCRIPTION_PAUSED` | `src/app/api/razorpay/pause-subscription/route.ts:141` updates state without lifecycle send | Add owner event when policy allows pause |
| `SUBSCRIPTION_RESUMED` | `src/app/api/razorpay/resume-subscription/route.ts:140` updates state without lifecycle send | Add owner event when policy allows resume |
| `SUBSCRIPTION_UPGRADED` | `src/app/api/razorpay/upgrade-subscription/route.ts:150` expires old subscription | Add owner event after replacement activation is confirmed |
| `MENU_STALE` | `functions/src/analytics/stalenessCheck.ts:114` writes pending log but no sender consumes it | Replace pending log with owner notification enqueue |

## Security Plan

- Protected API routes use `withAuth()`.
- Every enqueue validates trigger type against registry.
- Tenant/store access is verified before reading preferences or writing events.
- Metadata is Zod-validated per trigger.
- WhatsApp numbers are never logged raw.
- Templates are code-owned, not owner-editable.
- Delivery failures never reveal SMTP, provider tokens, or internal routes to owners.
- Rate limits run before enqueue and before delivery.

## Verification Commands

Documentation-only pass does not require typecheck. Implementation pass should run:

```bash
npx tsc --noEmit --incremental false
cd functions && npx tsc --noEmit
```

If Answerlattice Functions are touched:

```bash
cd functions-answerlattice && npx tsc --noEmit
```

## Implementation Readiness Checklist

| Check | Status |
| --- | --- |
| Trigger classes defined | Ready |
| Product boundary defined | Ready |
| Email/WhatsApp channel policy defined | Ready |
| Current MenuList migration map defined | Ready |
| Missing MenuList triggers identified | Ready |
| Answerlattice boundary defined | Ready |
| Formatter gap identified | Ready |
| Firebase cost model defined | Ready |
| Security requirements defined | Ready |

## Open Engineering Questions

| Question | Default decision |
| --- | --- |
| Use direct send or queue-first? | Queue-first. |
| Single collection or product-specific collections? | Same logical collections in each product Firebase project. |
| Should Next route send WhatsApp directly? | No. Enqueue and let worker send. |
| Should existing `messageLogs` remain? | Keep during migration; eventually replace with delivery logs or backfill compatibility view. |
| Should owner notification templates live in Firestore? | No. Code registry only. |
