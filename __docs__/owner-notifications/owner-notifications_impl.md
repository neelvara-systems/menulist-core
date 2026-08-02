# Owner Notifications - Implementation Plan

**Status:** Implemented for MenuList lifecycle owner notifications, Answerlattice owner test notification, and internal ops tracking
**Last Reviewed:** July 28, 2026
**Date:** 2026-07-28
**Audience:** Developers

> **Launch boundary:** Not current launch certification or deploy approval. This implementation plan is source-gated owner-notification runtime evidence only; owner-notification release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:owner-notifications-boundary`, SMTP/WhatsApp provider smoke where enabled, authenticated owner settings/status QA for the target owner surface, platform recovery monitor browser QA, target Firebase deploy evidence where Functions logic changes, target Vercel deploy evidence where app routes change, and production-host smoke.

July 10 transactional tenant-boundary follow-up: app and MenuList Functions delivery now share the byte-identical pure contract in `src/data/shared/ownerNotificationDeliveryBoundary.ts` and `functions/src/sharedData/ownerNotificationDeliveryBoundary.ts`. It admits exact Firestore document identity, exact positive numeric MenuList scope, bounded control-free references, and only `pending` or bounded `failed` processing attempts. Event creation uses a direct-ID Firestore transaction with `create`; event processing uses a second transaction to claim `processingAttempt` before any recipient read, rate-limit mutation, or provider call. Concurrent delivery, delivered/partial/skipped re-entry, and retries after the second processing attempt fail closed.

July 21 retry/digest product-boundary follow-up: MenuList Functions retry now queries `ownerNotificationEvents` by exact `productId == ML`, `status == failed`, and `updatedAt >= 24h`, with ascending order and limit 20. Digest totals use product-scoped aggregate counts over `ownerNotificationDeliveries.productId + status + createdAt`. This prevents Answerlattice rows in a shared Firebase project from consuming the retry window, being mutated by the retry bookkeeping path, or contributing to MenuList delivery totals. The matching composite indexes are in `firestore.indexes.json`. App and Functions delivery-log writes transactionally preserve the first `createdAt`, add `lastAttemptAt`, and write the claimed event `processingAttempt`.

July 28 persisted-boundary and ambiguous-delivery correction: app and Functions processors project every stored event through the byte-identical runtime contract before scope reads, counters, templates, or provider calls. The contract proves exact product/scope identity, deterministic dedupe, registry fields, bounded metadata/source, Firestore timestamps, processing attempts, and total event size. Persisted rate-limit counters likewise require exact product/date/scope-or-recipient identity, a non-negative safe-integer count, and a Firestore timestamp; malformed rows fail closed instead of being numerically coerced. A deterministic delivery row is transactionally claimed as `sending` before SMTP or WhatsApp is invoked and finalized only when the same event, product, channel, recipient hash, attempt, `createdAt`, and `sending` state still match. A terminal row converges without a provider replay. A pre-existing `sending` row is deliberately treated as an ambiguous provider outcome and is never automatically resent; this is duplicate prevention with explicit reconciliation, not provider-level exactly-once delivery.

August 1 platform-recovery correction: the ops route projects selected, manual-send and manual-handoff source events through that same persisted-event boundary before scope resolution, templates or writes. Manual send stores an immutable fingerprint over action ID, source event, product, channel, normalized destination and reason. A deterministic replay reads the existing event before processing; an exact match resumes/converges, while any changed effect dimension returns 409 without a provider call. Disabled product migration/runtime admission returns 503 instead of an empty successful action. All GET/POST/auth/error responses are private, no-store and nosniff. Limiter-provider outages omit quota/reset metadata; real exhaustion retains bounded retry evidence.

July 29 formatter follow-up: owner/store locale tags are verified with the
server `Intl` runtime before they enter date or money formatting. An invalid
hyphenated tag falls back to `en-IN` just like an absent or unsupported
setting, so malformed legacy settings cannot abort notification rendering or
delivery.

The Functions retry path also queries at most 20 exact-MenuList `processing` events whose `processingStartedAt` is at least 15 minutes old. Each row is transactionally re-read and revalidated before being moved to terminal `failed` with the stable `owner_notification_processing_outcome_ambiguous` code and an error diagnostic. This makes a crashed post-claim execution visible without guessing whether the provider accepted the message.

Retry bookkeeping is part of the persisted event boundary. `retryCount` admits only exact `0` or `1`, `retriedAt` must be a Firestore timestamp and cannot exist without `retryCount: 1`, and the bounded failed-event query projects the complete row before attempting it. After processing, a transaction re-reads the event and records the retry only when the deterministic event/registry identity still matches, the second processing attempt has settled, and another worker has not already recorded it. Raw or stale query data cannot consume the retry budget or mutate a non-owning claim.

MenuList app-created event and delivery documents now receive 30-day `expiresAt` timestamps, and app-created rate-limit documents receive 2-day timestamps. The consolidated maintenance scheduler separately cleans up at most 50 legacy MenuList rows per owner-notification collection and run when those rows predate the same cutoff and lack `expiresAt`; Answerlattice rows and current/future rows are preserved.

Recipient resolution now treats scope as mandatory delivery authority. MenuList canonical stores must carry the matching `tenantId` or legacy `tId`; nested legacy stores may omit the redundant tenant field but cannot contradict their parent tenant. Answerlattice uses `workspaceId` (with `storeId` only as legacy compatibility) and verifies the workspace document's tenant before returning recipient data. Missing or mismatched scope records the stable `scope_not_found_or_mismatch` event code and makes no provider call. Caller hints are destination inputs only for platform-authorized events marked `metadata.manualRecipientOverride === true`; normal lifecycle events cannot send to hint-only email or WhatsApp recipients. The Functions processor applies the same canonical/nested MenuList tenant checks and does not use stored recipient hints as delivery destinations.

July 28 persisted-alias follow-up: recipient resolution does not prefer one compatibility alias over another. Every supplied Answerlattice workspace `tenantId`/`tId`, MenuList canonical store tenant alias, and app lifecycle store/tenant alias must normalize to the same exact scope. Canonical MenuList stores must also agree with their requested `storeId`/`sId`; tenant-nested legacy stores may omit redundant aliases but cannot contradict the authenticated parent. Conflicts return no recipient and cause no provider effect.

The affected MenuList QA Functions deployment was attempted on July 28 for customer analytics, decision-block scoring/nightly scheduling, maintenance, and summary backfill, but Firebase CLI authentication failed before predeploy or upload. No remote revision changed; the Functions-side shared alias projector remains locally source/build verified pending an authenticated deploy.

The Next.js and Functions legacy lifecycle fallbacks use the same deterministic SHA-256 `messageLogs` claim over store, event, and reference before SMTP. This closes the query-before-send race if the migrated queue path is unavailable. Store daily-rate counters now include tenant and store identity. `npm run test:owner-notification-delivery-boundaries`, `npm run verify:owner-notifications-boundary`, and `npm run verify:menulist-api-tenant-safety` are the local regression gates; provider smoke and target deploy evidence remain required.

July 16 end-to-end correction: the shared delivery boundary now rejects event JSON above 128KB and gives explicit revoked/denied/inactive/withdrawn WhatsApp consent precedence over stale legacy booleans. App and Functions WhatsApp sends use manual redirects plus 15-second aborts; SMTP transports use bounded connection/greeting/socket timeouts and retain only normalized provider message IDs. Repeated publish-verification failures dedupe by store and UTC day. The owner header no longer renders fake order activity; owner notification delivery remains external and platform recovery remains internal.

## Architecture Summary

Owner Notifications should be queue-first.

Trigger points do not send email or WhatsApp directly. They create an owner notification event with a product ID, trigger type, scope, reference ID, recipient role, and bounded metadata. A central delivery worker resolves authoritative recipients, existing formatting fields, templates, enabled channels, idempotency, rate limits, and logs. Preferred-channel and quiet-hours fields are registry policy metadata; they are not a current scheduling subsystem.

This removes direct owner-facing SMTP sends from billing routes, schedulers, and product-specific support code for the implemented trigger set. WhatsApp is implemented as a guarded channel adapter and remains disabled by default until approved template/session rollout is configured.

WhatsApp recipients must be normalized to international digits before hashing, rate limiting, delivery logging, or Graph API calls. Recipient resolution uses the store/workspace `countryCode`, `dialCode`, canonical `phone`, local `phoneNumber`, notification settings WhatsApp number, and explicit recipient hints. Bare local Indian numbers default to `+91`; explicit `+...` / `00...` numbers override the stored/default country.

WhatsApp Graph API endpoint identifiers must be URL-encoded before building the `/messages` path. This applies to the shared app-side WhatsApp channel and the MenuList Functions owner-notification processor; message bodies, templates, recipient normalization, and delivery logs remain unchanged. The app-side channel must not read raw Graph API response bodies as text; it parses successful JSON responses only to keep a bounded string provider message ID. App-side Graph API sends use manual redirect handling so a provider 3xx response is treated as a send failure instead of forwarding the owner-notification request to a redirected target.

For MenuList, recipient and formatting context resolution reads canonical top-level `stores/{storeId}` first. A nested `tenants/{tenantId}/stores/{storeId}` fallback exists only for legacy compatibility; new MenuList owner-notification code must not depend on nested store documents.

Internal recovery is handled through a platform-only dashboard. It does not create owner-facing settings or live workflow notifications; it gives the platform team a bounded tracking surface for failed/partial/skipped events, retry, system send to a chosen destination, and manual handoff recording.

June 28 follow-up, updated July 5: the MenuList Next lifecycle wrapper (`src/lib/messaging/index.ts`) keeps the same feature-flag, SMTP send, owner-notification migration fallback, message-log write, and internal revenue alert surfaces, but duplicate-check and rate-limit read failures now fail closed by skipping the send. Those catch paths use bounded `logNotificationFailure` diagnostics instead of silent catches. Store, tenant, reference, recipient, and subject values are logged as presence/length metadata only.

July 5 SMTP follow-up: app-side owner-notification email delivery (`src/lib/owner-notifications/channels/email.ts`) uses `src/lib/notifications/smtpConfig.ts`, the same explicit SMTP config helper used by root lifecycle and generic notification sends. Missing, malformed, or out-of-range `SMTP_PORT` returns `smtp_not_configured` before a transporter is created; valid SMTP credentials, templates, recipient resolution, delivery rows, WhatsApp delivery, and recovery tooling are unchanged.

July 5 template-output follow-up: MenuList owner notification templates now normalize owner-visible text, strip control characters from subject/text values, validate rendered email links as `http:`/`https:`, and map publish-health failure codes plus `menulist.menu_stale` reason metadata to fixed owner copy before rendering. Arbitrary `metadata.failureReason` and `metadata.reason` text are no longer printed into owner-facing email or manual handoff copy. The lifecycle template mirrors in `src/lib/messaging/templates.ts` and `functions/src/messaging/templates.ts` use the same HTML metadata escaping and email-link validation boundary, preserving existing delivery, dedupe, rate-limit, and recovery behavior.

July 29 URL-boundary follow-up: MenuList and Answerlattice owner templates and
both lifecycle mirrors require credential-free HTTP(S) links. Parsed URLs with
a username or password are omitted before HTML/text rendering; ordinary
credential-free links retain the existing behavior.

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

July 1 follow-up, updated July 22: Source gate: `npm run verify:owner-notifications-boundary` locks the queue-first registry mirror, platform-only ops route admission, bounded monitor response parsing, app/Functions recipient resolution, app-side recipient-scope document-ID admission, WhatsApp provider-response boundaries, lifecycle template output escaping, fixed publish-failure owner copy, exact-`ML` retention cleanup registration, and docs parity. The real maintenance emulator also proves expired `ML` rows are deleted while colliding expired `AL` rows remain. This does not replace browser QA, SMTP/WhatsApp provider smoke, Firebase deploy, Vercel deploy, or live Firestore certification.

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

July 21 ops authorization/cost follow-up: both GET and POST keep signed platform-role admission, then use a fail-closed HMAC-keyed limiter before one exact current `users/{uId}` authorization read. Current identity, email, platform role, active/verified lifecycle, block/delete/auth-disable state, issuance, and revocation must all pass before owner-notification Firestore or provider work. GET performs one product-scoped newest-first event query capped at 90, so sister-product rows cannot consume the bounded window or contribute to counts. Selected-event delivery detail is likewise constrained by exact product before the event-ID predicate, newest-first order, and 12-row limit. Scope resolution reports its exact zero/one/two document reads. Manual handoff transactionally re-reads the source event and commits its delivery row plus event marker together; deleted or cross-product source events return `404` without orphan or recreation. Full resolved recipient contact remains deliberately available only in selected-event detail for the platform recovery flow and is normalized/bounded before serialization.

Independent retry/data-integrity follow-up: retry returns `404` for missing/product-mismatched events and `409` when the processor cannot claim the event; `partial`, `skipped`, active, terminal, and exhausted-attempt events are not announced as successful retries. Persisted invalid event status, delivery status/channel, or recipient role is serialized as explicit `invalid` state instead of being relabeled as pending, failed, email, or primary owner. Delivery detail is ordered by `createdAt DESC` before the 12-row limit. Manual send and handoff require a stable bounded `actionId`; manual send derives its queue reference from it and binds that reference to an immutable action fingerprint, while manual handoff derives a deterministic transaction-created delivery row and compares every effect field. An identical response retry converges; action-ID reuse with changed payload returns 409 rather than acknowledging or creating another effect. Recipient scope reads are counted as each successful read completes, including a canonical miss followed by a failing legacy fallback; selected detail exposes a fixed `recipient_resolution_failed` code when that partial path fails.

## Current Implementation Evidence

| Current system | Evidence | Migration meaning |
| --- | --- | --- |
| MenuList Functions lifecycle engine | `functions/src/messaging/messagingEngine.ts:157` | Replace direct send with enqueue or worker-backed send |
| MenuList Next lifecycle engine | `src/lib/messaging/index.ts:171` | Replace direct send with enqueue API/server helper |
| MenuList event docs | `__docs__/lifecycle-messaging/lifecycle-messaging_impl.md:104` | Existing eight events become registry entries |
| WhatsApp onboarding queue | `functions/src/messagingOnboarding/inboundQueue.ts:403` | Separate conversational session/outbound-delivery state; do not duplicate it into the owner-notification ledger |
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
6. Resolves existing recipient and formatting settings; no owner preference scheduler is implied.
7. Builds channel list.
8. Builds email/WhatsApp templates using formatted metadata.
9. Checks dedupe and rate limits.
10. Transactionally claims each deterministic delivery row as `sending`.
11. Calls the provider only after the claim.
12. Finalizes only the matching claim as sent, failed, skipped, or rate-limited; an existing `sending` claim is an observable ambiguous outcome and is not replayed automatically.
13. Updates event status.

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

Access: signed `platformRole === 'PLATFORM'` admission is enforced by the page guard and `withAuth`; the API then re-proves the exact current persisted platform user before private reads, provider calls, or writes.

The API is also feature-flag guarded: it returns `404` before Firestore reads or recovery writes when either `ENABLE_OWNER_NOTIFICATIONS` or `ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD` is disabled. GET and POST apply separate per-operator fail-closed limiters with HMAC-hashed key material. POST rejects bodies above 8KB before event reads, retry processing, manual send enqueueing, or manual handoff writes.

Capabilities:

- List recent or status-filtered owner notification events for MenuList or Answerlattice.
- Inspect one event, delivery attempts, and resolved recipient contact.
- Retry only a claimable failed event through the central processor. Partial, skipped, processing, delivered, malformed, and exhausted-attempt rows fail closed.
- Open a prefilled email or WhatsApp Web message from the event row or detail drawer.
- Send a manual system event to an explicitly entered email or WhatsApp number.
- Record a manual handoff after the platform operator sends email or WhatsApp outside the system.

The prefilled Email/WhatsApp Web flow uses the same registered owner notification template that the automated channel uses. The API renders the template only in the selected-event detail response, and the dashboard lets the platform operator review/edit the destination, subject, and body before opening the external tool. WhatsApp Web opens check the returned browser window and log `owner_notification_monitor_whatsapp_open_failed` with bounded destination/message/link presence-length metadata only when the browser blocks or rejects the handoff; raw recipient numbers and message bodies are not logged directly. Message copy feedback waits for Clipboard API success or an acknowledged textarea fallback, and failed copy diagnostics include clipboard/fallback support booleans without logging raw recipient numbers or message bodies.

Dashboard load/action responses are parsed by the shared owner-notification client response helper. The helper caps JSON at 256KB, validates event rows, delivery rows, selected event detail, resolved recipient shape, manual template shape, cost counters, and action acknowledgements, and logs bounded parse/rejected/invalid diagnostics before the component shows fixed platform failure copy.

July 5 ops event-id follow-up: `/api/ops/owner-notifications` now validates selected and recovery `eventId` values as a simple Firestore document ID at route admission and re-normalizes them inside the detail/action helpers before direct event reads, delivery detail queries, retry, manual send, or manual handoff writes. `getDetail()`, `loadRawEvent()`, `runManualSend()`, `recordManualHandoff()`, and the POST action dispatcher use the local normalized `eventId`; path-shaped IDs, `.`/`..`, and reserved `__*__` IDs fail before Firestore document path composition.

Manual system send writes a new owner notification event with `metadata.manualRecipientOverride === true`; the recipient resolver prefers the entered email or WhatsApp number only for that marked event. Normal event delivery still resolves recipients from owner/store/workspace notification settings. WhatsApp manual-send validation and manual-handoff recipient hashes use the same international-recipient normalizer used by automated delivery.

Manual handoff transactionally writes a delivery record with `deliveryMode: 'manual_handoff'`, masked/hashed destination, current operator audit fields, and `manualHandoffAt` fields on the existing source event. The original event status is not silently changed, so failed events remain visible for review; deletion/product drift cannot leave a partial delivery or recreate an event.

Cost constraints:

- Manual refresh only; no realtime listener.
- List reads are bounded by `scanLimit <= 90`.
- Counts are derived from the same product-scoped recent scan; no collection-wide aggregation query is used.
- Delivery logs and resolved full recipient contact are loaded only after selecting an event.
- Prefilled manual message generation is template rendering only; it does not add Firestore reads beyond the selected-event detail read/scope read.
- No additional Firestore composite index or scheduled function is required.

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
  status: 'sending' | 'sent' | 'failed' | 'skipped' | 'rate_limited';
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

## API And Runtime Entry Points

There is intentionally no generic `/api/owner-notifications/enqueue` or `/api/owner-notifications/test` route. Arbitrary owner-trigger enqueueing would widen recipient and metadata authority.

- MenuList Functions lifecycle sources call `sendLifecycleMessage()` and the Functions owner-notification processor.
- Approved Next.js server sources call `enqueueOwnerNotification()` directly.
- Answerlattice notification testing remains protected by `POST /api/answerlattice/notifications/test` and its product/tenant authorization.
- Platform recovery uses `GET|POST /api/ops/owner-notifications`, protected by signed platform admission, current persisted platform authorization, fail-closed rate limits, bounded bodies, product scope, and stable action IDs.

## Migration Build Order

This build order keeps existing owner messaging working while moving the architecture:

1. Add shared registry, types, formatters, and feature flags.
2. Add event and delivery collections with constants.
3. Add enqueue helper for Next runtime.
4. Add Cloud Functions processor for MenuList project.
5. Add email channel adapter and migrate current eight MenuList lifecycle events.
6. Add formatter migration for all date/money metadata.
7. Add the guarded WhatsApp lifecycle channel adapter. Keep conversational messaging-onboarding telemetry in its own bounded session/event ledger.
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

## Closed Trigger Additions

`SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_RESUMED`, `SUBSCRIPTION_UPGRADED`, and `MENU_STALE` are wired in the current Razorpay and analytics source paths. `CREDITS_LOW` remains a registry-reserved advisory trigger with no automatic source because MenuList does not introduce low-balance owner nudges; `CREDITS_EXHAUSTED` is the active capacity-stop notice.

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
