# MenuList SMB Data Map

**Status:** Internal audit document; P0/P1/P2 storage controls implemented 2026-06-14
**Product scope:** MenuList only
**Created:** 2026-06-14
**Primary evidence:** [Evidence appendix](./smb-data-inventory_evidence.md)

## 1. Scope

This document answers: what data MenuList stores or tracks for SMB users, where it lives, when it is written, how it is written, and why it exists.

Included:

- owner identity, auth, phone OTP, onboarding, tenant, store, outlet, and subscription records;
- projects, menu files, extracted menu truth, public summaries, publish state, and customer-facing menu state;
- public menu, official business page, customer app, and screen/customer analytics;
- MOL events, menu snapshots, drift metrics, extraction learning, store-truth confidence, staleness messaging, owner-control usage, and internal telemetry;
- menu-health-monitor, menu-trust-signals, menu-correctness-engine, and menu-command-center behavior;
- AI operation logs, menu extraction jobs, menu link import artifacts, image generation jobs, public menu drafts, and business copy/review reply AI accounting;
- guest feedback, Business Health, owner business assistant threads/events/actions/feedback/drafts;
- payment, billing, notification, POS delivery, compliance, review-state, integration, and operational monitoring records.

Excluded:

- Answerlattice data, because Answerlattice has separate product constants, Firebase clients, functions, and rules.
- General local development log files and non-Firestore console output, except where those logs are part of an audited runtime path.
- Third-party provider storage outside MenuList, such as Razorpay, Google, WhatsApp/Meta, email providers, and Firebase-managed Auth internals. The MenuList-side records for those integrations are included.

## 2. Core identifiers

Most MenuList Firestore records use this identity shape:

| Identifier | Meaning |
| --- | --- |
| `tId` / `tenantId` | MenuList tenant/business account identity. |
| `sId` / `storeId` | Store/outlet identity under a tenant. |
| `uId` / `userId` | Owner/platform user identity. |
| `projectId` | Menu/project/menu-output identity. |
| `pId` / `productId` | Product discriminator. For MenuList this is usually `ML`; `AL`/Answerlattice is out of scope for this document. |

## 3. Storage atlas

This table is the compact map. Detailed behavior follows in later sections.

| Storage target | Data stored/tracked | Written when | Why it exists |
| --- | --- | --- | --- |
| `users` | Owner profile, email/phone fields, tenant/store bindings, roles, onboarding state, phone login fields. | Signup, onboarding, phone OTP login/profile update, reseller onboarding. | Auth, ownership, tenant access, contact identity. |
| `tenants` | Business account identity, business name/type/category/industry, email, tenant key/subdomain, active/verified flags, stores list, onboarding source. | Onboarding, outlet creation, reseller/manual setup. | Business account root and multi-store grouping. |
| `stores` | Store name, tenant name, business type/category/industry, contact email/phone, timezone, business day end, languages, roles, subdomain, working hours, notification settings, GBP/POS/health fields. | Onboarding, store settings, publish verification, integrations, POS delivery, outlet flows. | Store-level operational truth and public routing. |
| `platformSummary/summary` | Platform counters such as tenant/store/project totals. | Onboarding and publish/pipeline flows. | Avoid scanning primary collections for global counts. |
| `platformSummary/storesSummary` | Store discovery/routing summary keyed by store, including active/public metadata used by public surfaces and functions. | Onboarding, publish, operations triggers, billing reconciliation, outlet changes. | Public routing, scheduler breadth, low-read summaries. |
| `platformSummary/projects_{sId}` | Project/menu summaries for a store. | Project creation/update/publish, public draft claim, multi-outlet propagation. | Public menu/OBP routing and project listing without scanning project docs. |
| `projects/{tId}/{sId}/{projectId}` | Menu/project truth: files, extracted items/categories/languages, settings, active/publish state, special menus, decision blocks, metadata, `_mce`. | Menu extraction, editor save, command center apply/save, publish, public draft claim, multi-outlet propagation. | Canonical menu/business output truth. |
| `analytics/*` | Daily/summary/dashboard aggregate customer analytics counters and maps. | Public menu/OBP/customer app events; scheduled aggregation. | Owner analytics, Business Health, public output intelligence. |
| `menuChangeLog/{tId}/{sId}` | Compact `MENU_REVISION_SUMMARY` events by default, plus publish events and detailed item/category/price/availability/extraction corrections only when detailed MOL mode is enabled. | Project updates, publishes, pricing/PDF helpers, extraction corrections, multi-outlet propagation. | Internal menu operating memory, drift metrics, extraction learning, with default O(1) write shape per save/update. |
| `menuChangeLog/{autoId}` | Legacy/divergent multi-outlet MOL shape may exist historically; new multi-outlet writes use the nested DAL. | Historical data only after 2026-06-14 implementation. | Kept visible for migration/audit awareness. |
| `menuSnapshots/{tId}/{sId}` | Snapshot of menu item/category state with `expiresAt`, retention window, item id/name/price/category/active/available/tags, category id/name/active, counts/languages. | Project publish and feature-gated snapshot creation. | Short-term point-in-time menu history for internal monitoring and comparisons. |
| `menuItemState/{tId}/{sId}/{projectId}/metrics/{itemId}` | Per-item derived drift metrics: price-change count, availability-change count, correction counts, first/last seen/update/change timestamps. | Nightly drift metric aggregation from MOL logs. | Internal stability/correctness monitoring. |
| `ownerControlUsage/{tId}_{sId}` | Owner control usage counts by control type/month and last-used timestamps. | Owner uses selected controls in editor/settings/decision blocks. | Authority maturation and Business Health source evidence. |
| `platformSummary/extractionLearning` | Aggregated correction rates, correction fields, confidence calibration. | Scheduled extraction-learning aggregation over MOL correction events. | Improve extraction quality and detect recurring correction patterns. |
| `platformSummary/storeTruthConfidence` | Per-store truth confidence, stale flags, extraction correction context. | Scheduled store-truth confidence aggregation. | Staleness detection and internal health scoring. |
| `insights/authority_maturation_YYYY-MM-DD` | Store authority maturity phases derived from owner-control usage. | Scheduled authority-maturation job. | Product/internal maturity insight. |
| `systemTelemetry/*` | Function/task telemetry, MOL cost telemetry, scheduler/runtime result summaries. | Cloud Functions and analytics jobs. | Operational monitoring and cost visibility. |
| `systemAlerts` | Health/error/performance/security/usage alerts with severity, metadata, acknowledgement state. | Health monitor failures, notification failures, monitoring rules. | Platform operator visibility and incident handling. |
| `systemHealth` | Time-limited health reports by tenant/store/day with component status. | Health-check functions. | Platform health monitoring with 7-day TTL. |
| `schedulerRunLogs` | Meaningful scheduler run summaries, failures, activity, compact details, expiry. | Consolidated MenuList maintenance scheduler and hourly decision scheduler. | Time-bounded operational audit without logging empty maintenance runs. |
| `menulistAiOperations/{tId}/{sId}` | AI operation accounting: action, tokens, model, cost/charge, units, scope, status, and compact response/accounting metadata by default. Raw provider details are detailed-mode only and expire. | Menu extraction, business copy, review reply suggestion, image/AI actions using shared accounting. | Billing, cost control, owner/platform AI operation history without permanent provider payload storage. |
| `menuImageProcessingJobs` | Extraction/import job state, input file/artifact metadata, processing summaries, quality/confidence summaries, short-lived raw batch response metadata, token/credit accounting, and detail-retention metadata. | Menu image upload, menu link import, public menu draft extraction, re-extraction. | Async extraction workflow and owner preview/result handling; completed auto-saved job details are pruned after the configured detail window. |
| `menuLinkImportArtifacts` | Imported link artifact metadata: source/final URL, content hash/type, storage path, text preview, redirect count. | Menu link import. | Traceability and repeatability for URL-based menu import. |
| Firebase Storage `menuLinkImports/...` | Source artifact file captured from menu link import. | Menu link import. | Stable source file for extraction. |
| `publicMenuDrafts` | Public create-menu draft state, token, uploaded file/link metadata, extracted result fields, IP hash, claim/expiry state. | Public create-menu route before owner claim. | Let a non-logged-in owner create/preview then claim a menu. |
| Firebase Storage `publicMenuDrafts/...` | Public draft uploaded image/PDF/source file. | Public create-menu image upload. | Source artifact for draft extraction. |
| `imageBatchProcessingJobs/{tId}/{sId}` | Image-generation batch job status, item results, generated images, generated count, failure state, and capped status history. | Owner image-generation batch requests and job processing. | Async menu image generation tracking without unbounded status-history growth. |
| `guestFeedback` | Guest rating/message/contact fields, source/project, status, owner note/audit, attention flag, expiry. | Public feedback submit route. | Low-friction customer feedback and owner quality signals. |
| `feedbackEvents` | Non-PII feedback event log: event type, tId/sId/projectId/rating/timestamp/expiry. | Guest feedback submission/status changes. | Aggregate feedback events without retaining raw PII permanently. |
| `platformSummary/ownerBusinessHealth*` | Business Health current and snapshot documents with health blocks, source refs, analytics teaser, feedback summary, suggested checks, cost metadata. | Owner Business Health snapshot builder. | Source-backed owner health presentation. |
| `platformSummary/ownerBusinessAnalyticsIndex*` | Analytics index used by owner business assistant/health flows. | Owner Business Health writers. | Fast source lookup without raw analytics scans. |
| `ownerBusinessAssistantAnswerEvents` | Assistant Q/A event log with question/answer truncation, status, confidence, source facts/domains/actions, provider/cost, expiry. | Owner assistant answer route. | Audit, quality, cost, and supportability for assistant answers. |
| `ownerBusinessAssistantThreads` | Recent owner assistant conversation messages, trimmed history, expiry. | Owner assistant answer route/thread store. | Short-lived context continuity. |
| `ownerBusinessAssistantActions` | Owner assistant action audit records, status, payload summary, expiry. | Assistant action flow. | Action traceability. |
| `ownerBusinessAssistantDrafts` | Short-lived action drafts. | Assistant action draft builder. | Review-before-apply workflow. |
| `ownerBusinessAssistantFeedback` | Owner feedback on assistant answer/action, expiry. | Assistant feedback API. | Quality loop. |
| `subscriptions` | Plan, product, tenant/store/user, Razorpay ids, status, cycle dates, credits, payment method summary, billing history/statuses. | Onboarding subscription creation, Razorpay webhooks, billing jobs. | Entitlement, billing, credit accounting. |
| `payment_transactions` | Structured payment audit: event, product, tenant/store, payment/subscription/order/invoice ids, amount, currency, status, method, card network, UPI presence, pack/credit data. | Razorpay webhook processing. | Payment audit, reconciliation, support. |
| `razorpayWebhookEvents` | Webhook idempotency/process state: event type/id, retry count, processing lock, processed/failed status, transaction type. | Razorpay webhook receipt. | Safe idempotent payment processing. |
| `topups` / credit purchase records | Credit purchase/order state. | Credit purchase flows. | AI credit accounting. |
| `authPhoneOtpChallenges` | OTP challenge state, purpose, phone, phone hash/last4/username, country/dial, OTP hash, attempts, expiry, request IP/user-agent hashes, delivery metadata. | Phone OTP request/verification. | Passwordless phone login. |
| `authPhoneOtpLoginTokens` | Short-lived login token records for OTP login. | Successful OTP verification. | Bridge from OTP verification to app session. |
| `messageLogs` | Legacy lifecycle email sends: store/tenant, event type, channel, status, recipient email, subject, reference/provider ids, errors, createdAt, expiry. | Lifecycle messaging engine, publish/billing/staleness flows. | Owner communication audit and idempotency with retention. |
| `ownerNotificationEvents` | Queue-first notification events: product, trigger, tenant/store, reference/dedupe, recipient role, metadata, priority, status, source, timestamps, expiry. | New notification migration path. | Central owner notification queue/audit with retention. |
| `ownerNotificationDeliveries` | Delivery attempts by event/channel/recipient hash: masked recipient, status, subject, template, provider id, error, expiry. | Notification processor. | Channel-level delivery audit while avoiding raw recipient exposure in the delivery key. |
| `ownerNotificationRateLimits` | Per-recipient-hash and per-store daily counts with short expiry. | Notification processor. | Notification anti-spam/rate limiting with automatic cleanup. |
| `stores/{storeId}/posDeliveryLogs` | POS sync delivery attempt status, response code, attempt, sentAt, duration, error, payload size. | POS sync deliver API. | POS delivery audit with capped history. |
| `compliancePages/{storeId}` | Optional owner custom overrides for privacy, terms, refund pages. | Owner saves compliance override. | Store legal/content customization; system content is generated from store data. |
| `reviewsState` | Active block/escalation review state booleans with expiry. | Planned/review-state workflows; current endpoint reads state. | Reputation-protection warning state. |
| Review reply AI accounting | Pasted review text length, rating, generated/fallback reply, model/tokens/cost in AI operation accounting. | `/api/reviews/suggest`. | Owner-approved review reply suggestion and billable AI accounting. |
| `tenants/{tId}/integrations/gbp/{sId}` | GBP OAuth token doc shape: access/refresh token, expiry, scope, token type, audit fields. | Planned/server-only GBP integration path. | Google Business Profile integration; not fully implemented in inspected code. |
| `stores/{storeId}.gbp` / `.gbpState` | GBP connection and sync-state shape. | GBP sync paths once implemented. | Public link/hours monitoring for GBP. |
| `messagingOnboarding*` collections | Messaging/WhatsApp onboarding sessions, inbound events, state, rate limits, published store/project artifacts. | Messaging onboarding flows. | Owner onboarding via messaging channel. |
| `businessEntityIndex` | Public/entity addressability index. | Entity-block/platform route maintenance. | Stable business entity lookup/addressability. |
| `businessDiscovery` | Discovery/indexing support records. | Discovery flows. | Business discovery/search support. |
| `ownerActivityLogs` | Owner activity log records when used. | Owner activity flows. | Audit and support. |

## 4. Core owner, tenant, store, and onboarding data

### What is stored

MenuList creates and maintains the owner/business account structure around `users`, `tenants`, `stores`, and summary docs.

Typical stored fields include:

- owner/user contact fields: email, phone, phone number/country/dial, phone username, display name/profile fields;
- tenant fields: business name, business type/category/industry, email, active/verified flags, stores list, tenant key, subdomain, onboarding source, created/modified timestamps;
- store fields: store name, tenant name, business type/category/industry, contact email/phone, timezone, business day end time, scheduler hour, languages, roles, subdomain, master/outlet relationship, onboarding metadata, working hours/settings;
- summary docs: global counts, store summary entries, project summary entries.

### When and how it is written

- Standard onboarding uses the shared tenant/store creator, which writes tenant, store, platform summary, store summary, and user binding data in one flow.
- Subscription onboarding calls the same creation path and then writes the subscription record.
- Reseller onboarding writes equivalent tenant/store/user/subscription structures with reseller metadata.
- Phone profile/OTP flows update `users` with normalized phone fields and phone-login metadata.

### Why it exists

This is not analytics. It is the minimum operating truth that lets MenuList know which owner can access which business, how public routes resolve, how scheduler jobs find stores, and how billing/entitlements are attached.

## 5. Menu and public-output truth

### What is stored

The canonical menu/business output lives primarily in:

- `projects/{tId}/{sId}/{projectId}`;
- `platformSummary/projects_{sId}`;
- `platformSummary/storesSummary`;
- store-level fields used by public menus, OBP, PWA, screen display, compliance pages, and trust signals.

Project documents can include:

- uploaded files and source metadata;
- extracted menu categories/items/languages;
- item names, descriptions, prices, variants/attributes, availability/active state, images, tags, and category relationships;
- project/public settings, publish state, timestamps, language data, special menus, decision blocks, and metadata;
- `_mce` correctness metadata when the Menu Correctness Engine runs.

### When and how it is written

- Menu extraction jobs write extracted data into projects or public drafts.
- Editor saves write the updated project document and invalidate public cache tags.
- Publish increments menu version fields and writes MOL publish events and snapshots.
- Public draft claim creates a project from a draft and writes the project summary.
- Multi-outlet propagation updates outlet project/public summary data.

### Why it exists

This is the core product: MenuList turns owner/business menu truth into public customer-facing output. Public summary docs reduce reads and avoid scanning deep project collections for customer routes.

## 6. Public/customer analytics

### What is stored

MenuList uses aggregate analytics documents rather than one Firestore document per customer click. The main daily document id pattern is:

`analytics/{tenant}_{store}_{project}_daily_{localDate}`

Daily analytics can include:

- total views/clicks and hourly counters;
- device/source/campaign/content/location/medium breakdown maps;
- category/item views and clicks;
- item names and language names;
- search terms and zero-result search terms;
- unavailable item taps;
- attribute filters;
- recommendation clicks;
- decision-block renders/expands/clicks/actions;
- OBP views/actions/link clicks/share/menu clicks;
- customer-app prompt/install/open/shortcut events;
- menu kit/project switch/login/signup/share/user-location/subdomain-blocked GA4-only events;
- store timezone, business-day end, grain, surface, local date, and last-updated metadata.

Browser-side analytics also keeps a pending write queue in `localStorage` under `menulist_pending_analytics_queue_v1` so aggregate updates can survive page unload and flush later.

### When and how it is written

- Public menu/OBP/customer-app event helpers build aggregate `updateData`.
- Browser paths queue updates and flush them through `/api/public/analytics/track`.
- Server paths can write directly through the analytics writer.
- The public API validates tenant/store/project, date window, field count/key format, blocked/active state, and decision-block preferences before writing.
- Scheduled aggregation jobs compact daily data into summary/dashboard/intelligence documents and can delete old daily docs after the retention window.

### Why it exists

Analytics supports owner insight, menu improvement, Business Health, customer-app usage, OBP performance, and internal product monitoring without storing a raw clickstream document for every customer action.

### Important notes

- The analytics surface is still high-volume because a single daily document can have many map keys.
- Browser `sessionId` is now local-only for dedupe/session milestones. A shared analytics write policy denies `sessionId` and unknown field families before browser queueing, direct writing, and public API/Admin writes.
- Browser location analytics is opt-in. Coarse rounded geolocation is requested only when the store analytics preference explicitly enables location tracking; otherwise location maps are not written.
- Analytics preference fields on stores can disable menu/customer/decision/location/OBP tracking by surface.

## 7. MOL, menu observation, snapshots, and internal menu intelligence

### What is stored

MenuList stores internal operating memory for menu changes:

- `menuChangeLog/{tId}/{sId}` nested compact menu revision summaries and optional detailed menu change events;
- a historical top-level `menuChangeLog/{autoId}` variant may exist from older multi-outlet writes, but new multi-outlet events use the nested DAL;
- `menuSnapshots/{tId}/{sId}` menu state snapshots;
- `menuItemState/{tId}/{sId}/{projectId}/metrics/{itemId}` derived item metrics;
- `platformSummary/extractionLearning`;
- `platformSummary/storeTruthConfidence`;
- `insights/authority_maturation_YYYY-MM-DD`;
- `ownerControlUsage/{tId}_{sId}`;
- `systemTelemetry` MOL/function/cost telemetry.

### What events are tracked

MOL/menu observation tracks compact summary counts by default:

- items added/removed;
- prices changed;
- item/category names corrected;
- extraction corrections;
- availability changed;
- active state changed;
- publish events;
- pricing/PDF/hours/GBP/POS/extraction-applied MOL events;
- multi-outlet propagation events.

Detailed per-item/per-field MOL events remain available only when `MENU_OBSERVATION_MODE` is set to `detailed`.

Menu snapshots store a compact copy of item/category state, not the entire project. Snapshot item fields include id, name, price, category, active, available, and tags. Snapshot category fields include id, name, and active.

### When and how it is written

- `detectAndLogChanges` compares old and new project data during project update when feature flags permit observation, then writes one `MENU_REVISION_SUMMARY` by default.
- Publish writes publish MOL events and creates snapshots when snapshots are enabled.
- MOL helper functions write pricing/PDF/multi-outlet events.
- Scheduled functions read MOL logs and derive per-item drift metrics, extraction-learning summaries, store-truth confidence, staleness messages, and authority maturation insights.

### Why it exists

This is MenuList's internal memory of whether menu truth is stable, stale, frequently corrected, or drifting. It supports correctness, staleness detection, product intelligence, owner messaging, and operational confidence without making owners manage a dashboard.

### Implementation observation

Most MOL reads and scheduled jobs expect nested `menuChangeLog/{tId}/{sId}` documents. The multi-outlet helper now uses the same nested DAL, but historical top-level `menuChangeLog/{autoId}` records may still exist and should remain visible during migration/audit work.

## 8. Named feature data behavior

### 8.1 Menu Health Monitor

Menu Health Monitor verifies that published menus are reachable on public URLs.

It stores:

- `stores/{storeId}.health.lastVerifiedAt`;
- `stores/{storeId}.health.lastPublishCheckStatus`;
- `stores/{storeId}.health.lastPublishCheckUrl`;
- `stores/{storeId}.health.lastPublishCheckError`;
- `stores/{storeId}.health.lastSuccessfulPublishAt` on success;
- `systemAlerts` documents on failure;
- owner lifecycle messages/notification events for publish success/failure depending on notification flags.

It does not store customer analytics or menu contents. It checks public route reachability, response status, and minimum content length.

### 8.2 Menu Trust Signals

Menu Trust Signals is render-only in the inspected code.

It stores no new collection and no new tracking record. It derives trust labels from existing data:

- business type/category;
- last published timestamp;
- store city/area/location;
- working hours;
- timezone;
- hours last updated timestamp.

It hides stale freshness signals when publish freshness is older than the configured threshold.

### 8.3 Menu Correctness Engine

MCE validates menu/project structure before save or publish.

It stores no new collection. The only persistent data is `_mce` metadata on the project document:

- `verified`;
- `verifiedAt`;
- `warnings`.

It also strips internal fields from client/customer payloads through sanitizer utilities.

### 8.4 Menu Command Center

Menu Command Center is an editor tool over the existing project document.

It stores no separate command-center collection. Bulk operations modify the in-memory project draft and then the editor save path persists the project. Operations include:

- bulk price changes, including attribute prices;
- availability changes;
- move category;
- active/inactive toggles;
- text-case changes;
- repair menu operations such as category icons, language repairs, descriptions, and public content translation.

Repair actions can call AI/accounting services, so those attempts may appear in `menulistAiOperations` and related logs, but Command Center itself does not create a dedicated Firestore audit collection.

## 9. Guest feedback

### What is stored

Raw guest feedback is stored in `guestFeedback`:

- tenant/store/project;
- rating;
- message;
- optional name, phone, email;
- source;
- status;
- needs-attention flag;
- owner note/audit fields;
- expiry timestamp.

`feedbackEvents` stores non-PII event records with event type, tenant/store/project, rating, timestamp, and expiry.

### When and how it is written

The public feedback submit route validates store/project availability, store settings, honeypot fields, and input shape. It writes raw feedback and a feedback event. Scheduled retention deletes expired raw `guestFeedback` documents. The consolidated maintenance scheduler also deletes expired `feedbackEvents`, including legacy timestamp-only event docs older than the configured event-retention window.

### Why it exists

Guest feedback gives owners a quieter, first-party quality signal and feeds Business Health summaries. Feedback events preserve aggregate activity without retaining raw contact/message data indefinitely.

## 10. Business Health and Owner Business Assistant

### What is stored

Business Health stores source-backed summary documents under `platformSummary`:

- current health doc;
- time-based snapshot doc;
- analytics index;
- multi-location health doc when applicable.

The owner assistant stores:

- `ownerBusinessAssistantAnswerEvents` with truncated question/answer, status, confidence, source facts, source domains, actions, provider/cost data, and expiry;
- `ownerBusinessAssistantThreads` with short-lived message history;
- `ownerBusinessAssistantActions` with action audit data;
- `ownerBusinessAssistantDrafts` with short-lived proposed actions;
- `ownerBusinessAssistantFeedback` with owner feedback.

### When and how it is written

Cloud Functions build health snapshots from analytics, feedback summaries, source refs, and business signal blocks. API routes log answer events, persist thread context, build action drafts, audit action execution, and accept feedback.

### Why it exists

These docs turn raw analytics/feedback/menu/system data into owner-readable, source-backed business health status without requiring owners to inspect raw analytics dashboards.

### Retention

The consolidated MenuList maintenance scheduler deletes expired assistant snapshots, drafts, action logs, answer events, feedback, and threads according to their configured expiry windows.

## 11. AI, extraction, import, image generation, and public drafts

### AI operation accounting

MenuList writes AI operation logs under `menulistAiOperations/{tId}/{sId}`. Typical fields include:

- action type;
- model;
- prompt/candidate/total token counts;
- processing time;
- charge/cost/credit fields;
- billing mode and units consumed;
- project/file/source context;
- compact response/client-response summary by default; raw provider response only in detailed mode with expiry;
- user/session identifiers.

Owner-facing AI operations API sanitizes platform-only fields for owners.

### Menu image and link extraction

`menuImageProcessingJobs` stores async job state:

- files/artifacts with uid/name/size/type/url;
- source metadata and source fingerprint;
- tenant/store/user/project;
- business type/category and target languages;
- status, progress, result, error;
- extracted data, detected business profile, quality/confidence summaries;
- short-lived raw batch response metadata, detail-retention metadata, and token/credit accounting.

`menuLinkImportArtifacts` stores imported URL artifacts with:

- source/final URL;
- content hash/type;
- storage path;
- source text preview;
- redirect count;
- tenant/store/user/project context.

Menu link source files are stored in Firebase Storage under `menuLinkImports/...`.

### Public create-menu drafts

`publicMenuDrafts` stores unclaimed draft menus created before login/claim:

- draft token;
- image/source URL/path;
- original file metadata;
- source type and content hash;
- extracted data/result fields;
- detected business name/type/category/currency;
- IP hash;
- creator user id when available;
- claim status;
- expiry.

Unclaimed expired drafts and their uploaded Storage files are removed by the maintenance scheduler.

### Image generation batch jobs

`imageBatchProcessingJobs/{tId}/{sId}` stores batch status, item result lists, generated image lists, generated count, capped status history, and failure state for async menu image generation.

## 12. Billing, payment, and subscription data

### What is stored

Subscriptions store:

- product/tenant/store/user;
- plan and billing details;
- Razorpay subscription/order/payment identifiers where relevant;
- status/cycle/renewal fields;
- credits and allowances;
- payment method summary;
- billing history and status events.

Payment audit records store:

- event and transaction type;
- tenant/store/product ids;
- payment/subscription/order/invoice ids;
- invoice URL when present;
- amount/currency/status;
- payment method;
- card network;
- UPI presence and UPI transaction fields;
- pack/credit details.

Webhook idempotency records store processing state, retry count, event type/id, and processing lock expiry.

### Why it exists

These records support entitlements, AI credit balance, subscription status, payment support, and webhook idempotency/reconciliation.

## 13. Auth, security, and phone OTP data

Phone OTP login stores:

- OTP challenge status and purpose;
- phone number fields, phone hash, last four digits, phone username, country/dial code;
- OTP hash, attempts, expiry;
- request IP hash and user-agent hash;
- delivery status and provider message id;
- short-lived login-token docs after successful verification.

User profile update paths store normalized phone/contact fields on the user document.

Security and rate-limit helpers are used around expensive or sensitive APIs, but this inventory focuses on persistent data records rather than transient in-memory checks.

## 14. Messaging, lifecycle messages, and owner notifications

MenuList has two owner-message logging paths.

### Legacy lifecycle path

`messageLogs` stores:

- store/tenant;
- event type;
- channel;
- status;
- recipient email;
- subject;
- reference id;
- provider message id;
- error;
- created timestamp;
- expiry timestamp.

The lifecycle engine uses this for idempotency and daily rate limiting. Direct staleness-detection message logs also carry an expiry timestamp, with retention kept longer than the 90-day staleness cooldown so cleanup does not cause repeat notifications inside the cooldown window.

### Queue-first owner notification path

When migration flags are enabled, lifecycle messages flow through:

- `ownerNotificationEvents`;
- `ownerNotificationDeliveries`;
- `ownerNotificationRateLimits`.

Events store trigger metadata, processing status, and expiry. Deliveries store channel-level attempts, recipient hash, masked recipient, template, status, provider id, error, and expiry. Rate-limit docs store per-recipient-hash and per-store daily counts with short expiry.

### Why it exists

These records make owner communications idempotent, rate-limited, auditable, and recoverable.

## 15. POS, integrations, compliance, and reviews

### POS

POS delivery writes a capped subcollection:

`stores/{storeId}/posDeliveryLogs/{autoId}`

Each log contains status, response code, attempt, sent time, duration, error, and payload size. The store doc also keeps `posSync` status fields such as menu version, last sent time/status/error.

### Integrations

GBP integration defines a server-only path:

`tenants/{tId}/integrations/gbp/{sId}`

The token doc shape includes access token, refresh token, expiry, scope, token type, and created/modified audit fields. Store-level `gbp` and `gbpState` shapes hold connection and sync status. The inspected file still marks token functions as placeholders awaiting API access.

### Compliance pages

Compliance pages use an overrides-only model:

- system-generated content is produced from store data at render time;
- only owner custom overrides are stored in `compliancePages/{storeId}`;
- fields are `privacyOverride`, `termsOverride`, `refundOverride`, `tId`, `sId`, and `modifiedOn`.

### Reviews/reputation

The current checkout has:

- `reviewsState` endpoint reads for active `blockActive` and `escalationActive` flags with `autoExpiresAt`;
- `/api/reviews/suggest` accepts a pasted review and rating, generates or falls back to a reply suggestion, and records AI operation accounting with rating/review length/reply source/model/cost;
- docs and constants for broader review ingestion, but full GBP ingestion/reply-posting pipeline is not implemented in the inspected code.

## 16. Operational monitoring and scheduler data

Operational data includes:

- `systemAlerts` for health/error/performance/security/usage alerts;
- `systemHealth` reports with 7-day expiry;
- `systemTelemetry` function/task/MOL telemetry;
- `schedulerRunLogs` for scheduler activity/failure summaries with 90-day expiry;
- platform alert delivery data via the alerting path;
- monitoring/error logs where implemented by the shared logger.

The consolidated MenuList scheduler uses per-task leases/state and logs only non-empty activity/failure runs to reduce noise and read/write cost.

## 17. Retention and cleanup

Known retention/cleanup paths in the inspected code:

| Data | Retention/cleanup behavior |
| --- | --- |
| Raw daily analytics | Aggregator has delete behavior for daily docs older than 90 days. |
| Guest feedback | Raw `guestFeedback` expires after 90 days and scheduled retention deletes expired docs. |
| Feedback events | New feedback events carry `expiresAt`; maintenance cleanup deletes expired docs and legacy timestamp-only events older than 180 days. |
| Scheduler run logs | New MenuList scheduler logs carry `expiresAt`; maintenance cleanup deletes expired docs and legacy startedAt-only logs older than 90 days. |
| Public menu drafts | Unclaimed expired drafts and associated Storage files are deleted by the maintenance scheduler. |
| Owner Business Health snapshots | Expired platform summary snapshot docs are removed by the maintenance scheduler. |
| Owner assistant answer events | `expiresAt` around 180 days and cleaned by scheduler. |
| Owner assistant actions/feedback | `expiresAt` around 90 days and cleaned by scheduler. |
| Owner assistant drafts | `expiresAt` around 7 days and cleaned by scheduler. |
| Owner assistant threads | `expiresAt` around 30 days and max history trimming; cleaned by scheduler. |
| AI operation details | Default accounting-only mode avoids raw provider detail storage; detailed-mode records carry `detailExpiresAt` and scheduler detail compaction. |
| Menu extraction job details | Completed auto-saved jobs are pruned after the configured detail window; raw batch responses are deleted with combined extracted data. |
| Menu snapshots | Publish snapshots carry `expiresAt`; maintenance scheduler deletes expired nested snapshot docs in bounded batches. |
| Image batch status history | Status history is capped to the latest 20 entries. |
| Owner notifications | Events, deliveries, rate-limit docs, legacy lifecycle `messageLogs`, and staleness-detection message logs carry expiry and are cleaned by the maintenance scheduler. |
| System health | Stored with 7-day expiry timestamp. |
| POS delivery logs | API keeps the latest 20 delivery logs. |

Retention not confirmed in this pass:

- full document retention for accounting-only `menulistAiOperations` records after detail pruning;
- full document retention for terminal `menuImageProcessingJobs` beyond existing old-job cleanup and detail pruning;
- long-term retention for `menuChangeLog` and `menuItemState` metrics;
- long-term retention for payment audit docs and webhook event docs.

These may be intentionally retained for audit/support, but they should be reviewed explicitly if a data-minimization pass is requested.

## 18. Data-risk and cost observations

1. **Analytics width is the main growth risk.** The implementation is aggregate, but daily docs can grow through high-cardinality maps such as search terms, item names, item views, hourly item clicks, source/campaign/content maps, and zero-result terms.
2. **MOL remains durable internal memory, but default writes are compact.** Detailed item-level MOL data is now opt-in; long-term retention for MOL-derived metrics still needs an explicit policy.
3. **AI logs are cost-critical.** They now default to accounting-only storage, but full accounting record retention still needs a separate audit/support decision.
4. **Public draft artifacts include source files and IP hashes.** Unclaimed drafts are cleaned up, but claimed drafts become project/menu truth and therefore persist as normal menu data.
5. **Notification delivery stores recipient hashes and masked values.** The newer path is more privacy-preserving than legacy `messageLogs`, which stores recipient email directly.
6. **Reviews are not fully live as a data pipeline in this checkout.** Avoid describing Google review ingestion as implemented unless the ingestion/reply routes are added and verified.
7. **GBP token storage is defined but placeholder.** The intended path is sensitive and server-only; Firestore rules should keep it client-denied when implemented.
8. **Menu Trust Signals and Command Center do not create separate data exhaust.** Trust Signals is read-only UI, and Command Center persists normal project changes through the editor/project path.

## 19. Practical answer for "what do we track?"

MenuList tracks:

- who the SMB owner/user is;
- what tenant/store/outlet they own;
- their business profile, store settings, working hours, contact fields, public routing identity, and billing plan;
- their menu/project truth, files, extracted data, publish state, generated images, and public summaries;
- public customer interactions with menus/OBP/customer app as aggregate analytics;
- owner menu changes and publish events as internal MOL;
- menu snapshots and derived drift/correctness/staleness metrics;
- health checks for published menu availability;
- correctness warnings/verification state;
- optional guest feedback and summary health signals;
- AI actions, token/cost accounting, extraction/import/image jobs, and public draft conversion;
- payment/subscription/webhook audit data;
- phone OTP challenge/login-token data;
- owner notification/message delivery status;
- POS delivery attempts and integration/compliance/review-support scaffolding;
- platform operational health, alerts, telemetry, and scheduler activity.

The single most important distinction is this: MenuList does not only store the owner-facing menu. It also stores internal operational memory around that menu - analytics, MOL events, snapshots, health/correctness metadata, feedback, AI accounting, and scheduled summaries - so the platform can keep public business truth stable without asking owners to manage every detail manually.
