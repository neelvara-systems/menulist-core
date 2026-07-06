# Owner Notifications - Implementation Plan

**Status:** Implemented for MenuList lifecycle owner notifications, Answerlattice owner test notification, and internal ops tracking
**Last Reviewed:** June 30, 2026
**Date:** 2026-06-02
**Audience:** Developers

## Architecture Summary

Owner Notifications should be queue-first.

Trigger points do not send email or WhatsApp directly. They create an owner notification event with a product ID, trigger type, scope, reference ID, recipient role, and metadata. A central delivery worker resolves recipients, preferences, templates, formatting, channels, idempotency, rate limits, and logs.

This removes direct owner-facing SMTP sends from billing routes, schedulers, and product-specific support code for the implemented trigger set. WhatsApp is implemented as a guarded channel adapter and remains disabled by default until approved template/session rollout is configured.

WhatsApp recipients must be normalized to international digits before hashing, rate limiting, delivery logging, or Graph API calls. Recipient resolution uses the store/workspace `countryCode`, `dialCode`, canonical `phone`, local `phoneNumber`, notification settings WhatsApp number, and explicit recipient hints. Bare local Indian numbers default to `+91`; explicit `+...` / `00...` numbers override the stored/default country.

WhatsApp Graph API endpoint identifiers must be URL-encoded before building the `/messages` path. This applies to the shared app-side WhatsApp channel and the MenuList Functions owner-notification processor; message bodies, templates, recipient normalization, and delivery logs remain unchanged. The app-side channel must not read raw Graph API response bodies as text; it parses successful JSON responses only to keep a bounded string provider message ID. App-side Graph API sends use manual redirect handling so a provider 3xx response is treated as a send failure instead of forwarding the owner-notification request to a redirected target.

For MenuList, recipient and formatting context resolution reads canonical top-level `stores/{storeId}` first. A nested `tenants/{tenantId}/stores/{storeId}` fallback exists only for legacy compatibility; new MenuList owner-notification code must not depend on nested store documents.

Internal recovery is handled through a platform-only dashboard. It does not create owner-facing settings or live workflow notifications; it gives the platform team a bounded tracking surface for failed/partial/skipped events, retry, system send to a chosen destination, and manual handoff recording.

June 28 follow-up, updated July 5: the MenuList Next lifecycle wrapper (`src/lib/messaging/index.ts`) keeps the same feature-flag, SMTP send, owner-notification migration fallback, message-log write, and internal revenue alert surfaces, but duplicate-check and rate-limit read failures now fail closed by skipping the send. Those catch paths use bounded `logNotificationFailure` diagnostics instead of silent catches. Store, tenant, reference, recipient, and subject values are logged as presence/length metadata only.

July 5 SMTP follow-up: app-side owner-notification email delivery (`src/lib/owner-notifications/channels/email.ts`) uses `src/lib/notifications/smtpConfig.ts`, the same explicit SMTP config helper used by root lifecycle and generic notification sends. Missing, malformed, or out-of-range `SMTP_PORT` returns `smtp_not_configured` before a transporter is created; valid SMTP credentials, templates, recipient resolution, delivery rows, WhatsApp delivery, and recovery tooling are unchanged.

July 5 template-output follow-up: MenuList owner notification templates now normalize owner-visible text, strip control characters from subject/text values, validate rendered email links as `http:`/`https:`, and map publish-health failure codes plus `menulist.menu_stale` reason metadata to fixed owner copy before rendering. Arbitrary `metadata.failureReason` and `metadata.reason` text are no longer printed into owner-facing email or manual handoff copy. The lifecycle template mirrors in `src/lib/messaging/templates.ts` and `functions/src/messaging/templates.ts` use the same HTML metadata escaping and email-link validation boundary, preserving existing delivery, dedupe, rate-limit, and recovery behavior.

July 5 Answerlattice template-output follow-up: Answerlattice owner notification templates now use the same bounded app-side rendering boundary for owner-visible metadata. Product/workspace/source/topic text is normalized and capped, action links render only when they parse as `http:` or `https:`, and widget/source-sync/high-priority failure metadata maps to fixed owner copy before email/text output. Arbitrary `metadata.failureReason` and `metadata.reason` strings are no longer printed into Answerlattice owner notification bodies.

July 6 recipient-scope document-ID follow-up: `src/lib/owner-notifications/recipientResolver.ts` validates app-side recipient lookup scope before store/workspace reads. Answerlattice owner-test/workspace recipient lookup uses `normalizeOwnerNotificationRecipientDocumentId()` before `stores/{workspaceId}` reads in the Answerlattice Firestore project. MenuList recipient lookup uses `normalizeMenuListOwnerNotificationScopeDocumentId()` for exact positive numeric tenant/store document IDs before top-level `stores/{storeId}` reads, tenant ownership comparison, or legacy `tenants/{tenantId}/stores/{storeId}` reads. Malformed, reserved, whitespace-mutated, path-shaped, decimal, zero, negative, unsafe, or nonnumeric MenuList scope IDs return an empty recipient scope before delivery channels run.

June 29 follow-up: the disabled legacy facade at `src/lib/notifications/notificationService.ts` still throws `LegacyNotificationServiceDisabledError` for `createNotification`, `sendEmailNotification`, and `sendSlackNotification`, but blocked-call breadcrumbs now use bounded notification diagnostics instead of the generic logger. This preserves the migration guard and adds no delivery path.

June 28 follow-up: the MenuList Functions publish verification trigger (`functions/src/triggers/operations.ts`) keeps lifecycle success/failure messages fire-and-forget, but failed message imports/sends now log stable `OPERATIONS_VERIFY_MENU_PUBLISH_*_MESSAGE_*` codes with bounded store/tenant/requester/public URL metadata instead of silent catches.

June 29 follow-up: the MenuList app-side WhatsApp channel and Functions owner-notification processor still treat malformed or oversized successful WhatsApp Graph API response JSON as a non-blocking provider-message-ID miss, but they now log `whatsapp_response_parse_failed` with response status and bounded source error metadata before continuing. They do not persist raw provider response bodies or change delivery status semantics.

June 29 follow-up: the platform dashboard now parses `/api/ops/owner-notifications` load and recovery-action responses through `src/lib/ops/ownerNotificationClientResponse.ts`. Browser response bodies are capped at 256KB and must match the snapshot/action envelopes before table/detail state or success copy changes. Rejected, oversized, malformed, or invalid responses show fixed platform failure copy and log bounded `owner_notification_monitor_response_*` diagnostics.

June 30 follow-up: the platform dashboard message-copy action now uses the shared runtime clipboard helper. Prefilled Email/WhatsApp copied feedback waits for Clipboard API success or acknowledged textarea fallback success, and failed copy diagnostics include clipboard/fallback support booleans with bounded destination, subject, body, channel, product, status, and selected-event metadata only.

June 30 follow-up: platform dashboard load and recovery-action requests now use no-store cache policy, same-origin credentials, and manual redirect handling before response parsing. Auth or API redirects are treated as failed monitor responses instead of being followed by the browser.

June 30 follow-up: route-side query validation, rate-limit, and recovery-action validation security logs use bounded route metadata instead of raw session/request context. Invalid attempted action text is summarized as presence/length metadata.

June 30 follow-up: the legacy fire-and-forget `src/lib/notifications/client.ts` trigger now posts `/api/notifications/send` with no-store cache, same-origin credentials, and manual redirect handling. It still never blocks the source operation; in non-production only, rejected responses log `notification_trigger_response_rejected` with bounded notification payload metadata and response status.

July 1 follow-up, updated July 6: Source gate: `npm run verify:owner-notifications-boundary` locks the queue-first registry mirror, platform-only ops route admission, bounded monitor response parsing, app/Functions recipient resolution, app-side recipient-scope document-ID admission, WhatsApp provider-response boundaries, lifecycle template output escaping, fixed publish-failure owner copy, retention cleanup registration, and docs parity. It is source-only and does not replace browser QA, SMTP/WhatsApp provider smoke, Firebase deploy, Vercel deploy, or live Firestore certification.

July 5 follow-up: `functions/src/ownerNotifications/processor.ts` now logs `owner_notification_lifecycle_flag_check_failed` when the runtime `ops_config/system.ENABLE_LIFECYCLE_MESSAGING` read fails and keeps the existing fail-closed skip. Unknown MenuList triggers are logged with trigger presence/length/type metadata only; stored unknown-trigger events are still marked skipped with the stable `unknown_trigger` code. Raw trigger strings, event IDs, tenant IDs, store IDs, recipient data, provider responses, and exception text are not logged.

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

The platform dashboard treats stored event/delivery errors as display summaries only. The API returns compact local codes or stored-text presence/length summaries, and `ownerNotificationMonitor/index.tsx` applies a local display guard before rendering error fields so long stored provider/error text cannot print even if an older or regressed response reaches the browser. Raw event IDs and resolved recipient contact values remain available only where required for retry, manual send, and manual handoff actions.

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

The API is also feature-flag guarded: it returns `404` before Firestore reads or recovery writes when either `ENABLE_OWNER_NOTIFICATIONS` or `ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD` is disabled. POST recovery actions apply a per-operator limiter with HMAC-hashed key material and reject bodies above 8KB before event reads, retry processing, manual send enqueueing, or manual handoff writes.

Capabilities:

- List recent or status-filtered owner notification events for MenuList or Answerlattice.
- Inspect one event, delivery attempts, and resolved recipient contact.
- Retry a failed, partial, or skipped event through the central processor.
- Open a prefilled email or WhatsApp Web message from the event row or detail drawer.
- Send a manual system event to an explicitly entered email or WhatsApp number.
- Record a manual handoff after the platform operator sends email or WhatsApp outside the system.

The prefilled Email/WhatsApp Web flow uses the same registered owner notification template that the automated channel uses. The API renders the template only in the selected-event detail response, and the dashboard lets the platform operator review/edit the destination, subject, and body before opening the external tool. WhatsApp Web opens check the returned browser window and log `owner_notification_monitor_whatsapp_open_failed` with bounded destination/message/link presence-length metadata only when the browser blocks or rejects the handoff; raw recipient numbers and message bodies are not logged directly. Message copy feedback waits for Clipboard API success or an acknowledged textarea fallback, and failed copy diagnostics include clipboard/fallback support booleans without logging raw recipient numbers or message bodies.

Dashboard load/action responses are parsed by the shared owner-notification client response helper. The helper caps JSON at 256KB, validates event rows, delivery rows, selected event detail, resolved recipient shape, manual template shape, cost counters, and action acknowledgements, and logs bounded parse/rejected/invalid diagnostics before the component shows fixed platform failure copy.

July 5 ops event-id follow-up: `/api/ops/owner-notifications` now validates selected and recovery `eventId` values as a simple Firestore document ID at route admission and re-normalizes them inside the detail/action helpers before direct event reads, delivery detail queries, retry, manual send, or manual handoff writes. `getDetail()`, `loadRawEvent()`, `runManualSend()`, `recordManualHandoff()`, and the POST action dispatcher use the local normalized `eventId`; path-shaped IDs, `.`/`..`, and reserved `__*__` IDs fail before Firestore document path composition.

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
- MenuList Functions processor delivery failures store stable local codes only. WhatsApp Graph API response bodies are logged as response length/status metadata, unexpected processor failures log source error name/code/status, and event IDs are logged as presence/length metadata. The app-side WhatsApp channel does not materialize raw Graph API response text and keeps only bounded provider message IDs after successful JSON parsing.
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
