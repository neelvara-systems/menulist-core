# Answerlattice Data Inventory Data Map

**Status:** Audit map
**Product scope:** Answerlattice only
**Created:** 2026-06-15
**Last Updated:** 2026-06-20

## 1. Scope

This map covers the Answerlattice runtime in the current repository:

- Answerlattice app/API code under `src/app/(answerlattice)`, `src/app/api/answerlattice`, `src/app/api/widget`, `src/lib/answerlattice`, `src/database/answerlattice`, and shared support DAL files that use Answerlattice Firebase.
- Answerlattice Firebase assets: `firestore-answerlattice.rules`, `firestore-answerlattice.indexes.json`, `storage-answerlattice.rules`, and `functions-answerlattice/`.
- Shared support files that are product-aware and write to Answerlattice data, including AI operation logging, notifications, tickets, chats, feedback, KB, public API authentication, and owner notifications.

Excluded:

- MenuList SMB data inventory details, except where shared support utilities are product-aware and write into Answerlattice Firebase.
- Answerlattice website-only static copy unless it writes contact, onboarding, widget, public API, or hosted-help data.
- Future Owner Support Assistant runtime collections that are still docs-frozen and not implemented in the inspected code.

## 2. Identifier model

| Identifier | Meaning | Where used |
| --- | --- | --- |
| `pId` / `productId` | Product boundary. Answerlattice uses `AL`. | Almost every Answerlattice collection, AI operation rows, stores, contact enquiries, notifications, integration rows. |
| `tId` / `tenantId` | Answerlattice tenant/workspace owner scope. | Firestore rules, search, governance, support, scheduler, bundles, public API, integrations. |
| `sId` / `storeId` | Answerlattice workspace/store scope. | Firestore rules, `stores/{sId}`, support records, bundle paths, hosted help, widget keys, billing. |
| `uId` | User or system actor id. | AI/search history, chat sessions, signal events, audit logs, support actions. |
| `entityId` | Governed product concept id. | Entities, relations, canonical answers, signal events, search index, friction stats. |
| `answerId` | Canonical answer id. | Canonical answers, audit logs, releases, search history, mutation proposals. |
| `jobId` / `sourceId` / `itemId` | Knowledge Intake job/source/review ids. | Intake jobs, sources, review items, usage ledger, published KB/FAQ/surface/proposal records. |
| `publicBundleId` / `bundleVersion` | Compiled context bundle id/version. | Storage paths and bundle manifest in `platformSummary`. |

## 3. Firebase boundary

Answerlattice uses a dedicated Firebase client/admin runtime. The client file initializes a named `answerlattice` app when separate configuration is present, and the admin file initializes a named `answerlattice-admin` app with Answerlattice credentials or local ADC fallback.

Cloud Functions live in `functions-answerlattice/` and use separate Firebase Admin initialization. Firestore rules default-deny and then explicitly allow tenant-scoped reads/writes for specific collections. Storage rules are scoped to Answerlattice-only paths.

## 4. Storage atlas

### 4.1 Workspace, account, billing, and setup

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `stores/{sId}` | Workspace/product profile, `pId`, `productId`, `productName`, `productUrl`, `supportEmail`, `billingModel`, `primarySurfaces`, `timeZone`, `businessDayEndTime`, `answerlatticeLaunchProfile`, widget config, widget key hashes/prefixes, hosted help config, runtime status, subscription summary. | On onboarding, workspace profile save, widget config/key management, hosted help settings, runtime widget config requests, billing sync. | Main Answerlattice workspace truth, public/widget auth lookup, dashboard setup, scheduler tenant discovery, billing fallback. | Keep one compact workspace document for product setup and runtime lookup. | Durable account/workspace record; no TTL found. |
| `subscriptions` | Subscription state, plan, amount, quantity, credits, status history, billing dates, provider subscription id. | Billing/provider flows and subscription sync. | Billing screens, active subscription lookup, Knowledge Intake usage/balance checks. | Paid access and plan enforcement. | Durable billing record; no Answerlattice-specific TTL found. |
| `payment_transactions` | Payment/order/subscription charge events, amount/currency/provider metadata. | Payment provider webhook/order flows. | Billing history screen, audit/support. | Payment audit trail. | Durable financial record; no TTL found. |
| `platformSummary/answerlatticeTenantsSummary` and tenant docs | Tenant/workspace registry and scheduler discovery summary. | Workspace profile updates, tenant summary sync, scheduler. | Scheduler tenant discovery, platform operations. | Avoid scanning `stores` in schedulers. | Durable summary; no TTL found. |
| `platformSummary/answerlatticeActivationSummary_*` | Setup readiness, bundle state, subscription/workspace readiness. | Activation summary API and scheduler/readiness flows. | Activation Command Center. | Summary-first dashboard data. | Durable summary; no TTL found. |
| `answerlattice_publicHelpSites/{domain}` | Hosted help domain registry, `tId`, `sId`, `pId`, enabled flag, hosted help config, DNS/provisioning status. | Hosted help settings save and refresh. | Hosted public help domain resolution through server cache. | Resolve anonymous hosted help domains with one direct registry doc. | Durable while domain is assigned; deleted when removed. |
| `platformSummary/integrationConfig_*` | Slack webhook URL, email recipients, event filters, placeholder Linear/GitHub config, circuit breaker settings. | Integration settings save. | Integration delivery processors and owner settings UI. | Owner-managed external workflow configuration. | Durable config; no TTL. |
| `platformSummary/integrationHealth_*` | Last integration status, event id, event type, status code, duration, last success/failure. | Integration delivery logger. | Owner-facing compact health without scanning raw delivery logs. | Summary-first operational status. | Durable compact summary; no TTL. |

### 4.2 Governed answer truth

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `answerlattice_entities` | Product concepts/entities, type, name, slug, description, aliases, status, current version, tenant/store ids. | Entity create/update/deprecate, onboarding/bootstrap, candidate approval. | Retrieval, governance, product ontology, compiled bundles. | Stable product vocabulary for canonical answers. | Durable. Deletes disabled in rules; deprecation pattern used. |
| `answerlattice_entityRelations` | Links between entities and relationship metadata. | Governance/product graph updates. | Knowledge graph expansion, compiled context bundles. | Express entity interaction and related concepts. | Durable; delete allowed by permission in rules. |
| `answerlattice_canonicalAnswers` | Authoritative answer content, structured summary, detailed explanation, procedure, scope, validation, governance/drift state. | Human-approved answer creation/update and governance flows. | Canonical retrieval, public API answer endpoint, widget/help search, compiled bundles. | Core Answerlattice authority layer. | Durable. Deletes disabled in rules. |
| `answerlattice_releases` | Release/version state for governed answer set. | Release management/governance. | Retrieval freshness, instant cache versioning, compiled context. | Versioned answer authority. | Durable. Deletes disabled in rules. |
| `answerlattice_mutationProposals` | Proposed answer changes from signals/intake, draft text, related entities, status, approval/rejection metadata. | Signal-to-knowledge pipeline, Knowledge Intake publish to canonical proposal, governance review. | Human approval queue. | Never mutate canonical answers directly from signals or AI. | Durable proposal record. Deletes disabled in rules. |
| `answerlattice_auditLogs` | Append-only governance actions, answer history, actor, action, before/after context. | Governance changes. | Compliance/audit history and answer change trace. | Human governance accountability. | Durable; code comments state at least 3-year retention. |
| `answerlattice_entitySearchIndex` | Precomputed entity tokens, synonyms, weights, current version. | Entity/index rebuild and governance changes. | Fast canonical/entity matching, public entity bundle, context bundles. | Reduce runtime reads and computation. | Durable read model; no TTL. |
| `answerlattice_entityCandidates` | Candidate concepts produced by ingestion/intelligence, confidence, status. | Auto knowledge, intake, bootstrap, signal processing. | Governance candidate review. | Human-reviewed ontology expansion. | Durable queue; no TTL found. |

### 4.3 Knowledge base, FAQs, surfaces, and changelog

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `kb_categories` | Category/section/article navigation maps for a workspace. | KB management, Knowledge Intake article publish, bootstrap. | Help Center nav, public content cache, context bundles. | Published support navigation. | Durable. |
| `kb_articles` | Published/staged article content, plain text, TipTap doc, tags, embeddings, status, source links, likes/dislikes. | KB CRUD, generation pipeline, article embedding API, Knowledge Intake publish. | Help Center, RAG/vector search, compiled context, public content cache. | Answer source material and support docs. | Durable until owner delete/archive. |
| `kb_generation_jobs`, `kb_staging_sections`, `kb_staging_chunks` | KB generation/import job state and staging chunks. | KB generation pipeline. | Review/publish generated help articles. | Human-reviewed content generation. | No global retention found in inspected Answerlattice code. |
| `answerlattice_faqs` | Owner-reviewed question/answer pairs, status, active flag, tags, entity/context/surface links, review fields. | FAQ management and Knowledge Intake publish. | FAQ retrieval before RAG, Help Center FAQ tab, bundles. | Deterministic short-answer path. | Durable/archive by status. |
| `answerlattice_productSurfaces` | Route/page/workflow context map, visibility, entity hints, tags, active flag. | Product Surface UI and Knowledge Intake publish. | Context-aware retrieval, related content, compiled bundles. | Route-aware support answers. | Durable/archive by status/active flag. |
| `changelog/{tId}/{sId}/{pageId}` | Paginated release notes and changelog entries. | Changelog management. | Help Center release notes, context bundles, owner changelog. | Product update/support context. | Page model; no TTL found. |

### 4.4 Search, widget, and public API runtime

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `aiSearchHistory` | Query, cache key, tenant/store/user, mount context, generated image query, image URL, crafted answer, bounded references, canonical/answer source, canonical answer id, FAQ id, matched entity ids, fallback reason, confidence, source versions, product context fields, `expiresAt`, `retentionDays`. | On instant-cache hits, canonical hits, FAQ hits, empty/no-result paths, and RAG answers. Widget feedback updates rows with `isGood` and `submittedAt`. | Search cache, widget feedback, friction analysis, canonical miss signals, support debugging. | Runtime answer trace and feedback loop without permanent raw answer-event retention. | 90-day expiry on new rows, TTL override on `expiresAt`, bounded payload writer, and scheduler cleanup for legacy rows by `createdOn`. |
| `queryEmbeddings` | Cache key, original query, vector values, createdAt, hitCount, `expiresAt`, `retentionDays`. | When RAG embedding cache misses. | Avoid repeated embedding generation. | Provider cost and latency reduction. | 30-day expiry on new rows, TTL override on `expiresAt`, stale-read best-effort delete, and scheduler cleanup by `createdAt`. |
| Upstash instant cache | Canonical-only deterministic answer payload keyed by tenant/store/entity/version/plan/role. | Canonical hit path when enabled. | Zero-Firestore hot path for canonical answers. | Low-latency/cost cache for governed answers. | Redis TTL is used by cache layer. |
| Public API request logs | Store id, endpoint, request metadata through shared `logApiRequest`. | Public API auth path. | API monitoring. | Rate/security trace. | Depends on shared public API logging implementation; not expanded in this audit. |
| `stores/{sId}.answerlatticeWidgetApi` | Hash-only widget keys, key prefix, key names, created/copied/revoked metadata. | Widget key API generate/rename/delete. | Widget/public key validation. | API-key auth without storing raw keys. | Durable until revoked/deleted. Raw key shown only once. |
| `stores/{sId}.widgetConfig` / `widgetAllowedOrigins` | Widget UI config, allowed origins, schema/version timestamps. | Widget config save. | Public widget config endpoint and compiled context staleness. | Safe embeddable runtime config. | Durable config. |
| `stores/{sId}.widgetRuntimeStatus` | Throttled runtime status/verification information. | Public widget config requests. | Owner install/readiness checks. | Prove widget is installed and working. | Durable compact status; no TTL found. |
| `answerlattice_signalEvents` | Public API signals and internal ticket/chat/feedback/escalation signals: type, entity id, sanitized metadata, timestamp, actor trace, optional dedupe key. | Signal emitter, public signal ingestion, ticket/feedback/chat flows. Explicit external/request IDs use deterministic server document IDs. | Mutation governance, friction aggregation, support board, predictive help. | Evidence, not automatic authority, without duplicate rows from retried external signals. | Existing scheduler deletes signals older than 12 months. |

### 4.5 Knowledge Intake

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `answerlattice_knowledgeIntakeJobs` | Intake job title, description, source/review counts, default category/section, product URLs, audience, usage summary, status, timestamps, actor fields. | Job create/update/analyze/publish. | Intake Command Center and scheduler summary. | Structured import workflow. | Durable; no TTL found. |
| `answerlattice_knowledgeSources` | Source type, title, origin URL, file name, MIME, redacted `contentText`, excerpt, content hash, tags, context keys, entity ids, metadata, error state, timestamps. | Add source, repeated-reply import, public page fetch, media extraction output. | Intake analysis and review item generation. | Source evidence for support knowledge. | Durable source text; no compaction found. |
| `answerlattice_intakeReviewItems` | Generated/reviewable article/FAQ/surface/proposal candidates, status, target, body/answer/question/context/entity fields. | Intake analysis and update-review-item route. | Human review and publish. | No direct auto-publish into authoritative layers. | Durable; no TTL found. |
| `answerlattice_intakeUsageLedger` | Reserved/finalized/refunded usage units, action, provider/model, byte size, token counts, token count source, metadata, monthly-vs-top-up debit source, and subscription/store balance effects. | Media extraction reserve/finalize/refund. | Billing/credit accountability. | Paid intake usage control. | Durable ledger; no TTL found. |
| `platformSummary/knowledgeIntakeSummary_*` | Compact active/recent job/readiness counts and last-published fields. | Job creation and nightly summary builder. | Dashboard/readiness summary. | Avoid raw intake scans in owner surfaces. | Durable summary. |

### 4.6 AI/accounting

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `answerlattice_aiOperations/{tId}/{sId}/{docId}` | AI action, billing mode, token counts, token count source, units, model/provider context, source, timing, compact client response, support-credit `creditConsumption` when present, accounting fields, optional serialized provider response in detailed mode, `detailExpiresAt` in detailed mode. | Provider-backed Answerlattice calls such as Knowledge Intake OCR/transcription/embedding, widget/help search, article translation, FAQ generation, article embedding, manual and scheduled draft generation, article entity extraction, ticket-knowledge extraction, onboarding bootstrap, friction insight, and Cloud Function KB embedding. | Platform cost accounting and owner billing/support-credit usage through sanitized API responses; direct tenant Firestore reads are not allowed. | AI cost control and audit without raw prompt/provider payload exposure in accounting-only mode. | Default is accounting-only. Detailed payloads get `detailExpiresAt`, but no Answerlattice TTL field override for `detailExpiresAt` was found. |

### 4.7 Support, tickets, chat, and feedback

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `chatSessions` | Chat title/history/messages, user/workspace fields from composer, feedback state, admin metadata, image URLs. | Chat save/update/message feedback. | User chat history, admin conversation monitoring, support debugging. | Support conversation continuity. | Durable; latest 50 user query cap but no cleanup found. |
| Storage `chatSessions/chatimages/{tId}/{sId}/{imageId}` | Chat images uploaded from base64 with private immutable metadata. | Chat image upload. | Chat/image search and support context. | Preserve user-provided visual context. | Metadata says tied to chat session; hard delete now reads the session and deletes image URLs before deleting the Firestore doc. |
| `supportTickets` | Ticket subject, category, priority, client details, documents, messages, statuses, satisfaction, logs, client debug context, escalation context, deleted flag. | Ticket create/update/message/status/satisfaction/delete/restore. | Ticket inbox, support operations, signals, notifications. | Human support workflow. | Durable ticket workflow; hard delete reads persisted ticket data and deletes top-level documents plus message attachments before deleting Firestore doc. |
| Storage `supportTickets/documents/{tId}/{sId}/{fileId}` | Ticket top-level documents/images. | Ticket create/update. | Support evidence. | Attachments for support tickets. | Deleted by ticket hard delete. |
| Storage `supportTickets/messages/{tId}/{sId}/{fileId}` | Message attachments. | Ticket message add. | Conversation evidence. | Attachments for replies. | Deleted by ticket hard delete. |
| `feedback` | Ratings, comments, feature requests/issues, context/surface assignment, user/workspace fields, created/modified fields. | Help Center feedback and updates. | Feedback dashboard and signal emitter. | Product/support feedback loop. | Durable; latest/list queries capped, no cleanup found. |
| `answerlattice_supportBoardCards` | Internal private support cards, status, priority, notes, linked source/signal/history ids, status history. | Support Board UI and nightly support board sync. | Owner/staff private support workboard. | Convert signals/history into reviewable support tasks. | Durable; no TTL found. |

### 4.8 Scheduler, intelligence, and read models

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `platformSummary/answerlatticeNightlyState_*`, `answerlatticeNightlyLock_*`, task lease docs | Scheduler state, leases, status, per-tenant lock data. | Answerlattice master scheduler. | Prevent overlapping scheduler work. | Bounded safe scheduled operations. | Lease expiry fields exist; durable state docs remain. |
| `answerlattice_schedulerRunLogs` | Run id, trigger, start/update, status, duration, tenant discovery, totals, errors, tenant runs, feature flags/limits, retention cleanup totals, `expiresAt`, `retentionDays`. | Each Answerlattice nightly/manual scheduler run. | Platform ops/debugging. | Operational trace. | 90-day expiry on new rows, TTL override on `expiresAt`, and scheduler cleanup for legacy rows by `startedAt`. |
| `answerlattice_frictionDailyStats` | Per-entity daily counts and friction score. | Friction aggregation. | Trend calculation and snapshots. | Convert raw signals/search misses into compact intelligence. | Cleanup deletes records older than 90 days. |
| `platformSummary/frictionSnapshot_*` | Top friction entities, emerging topics, health, totals. | Friction aggregation. | Dashboard/readiness and predictive trigger sync. | Summary-first owner/operator view. | Durable compact summary. |
| `answerlattice_predictiveTriggers` | Suggested/active predictive help triggers, status, constraints, scoring fields. | Owner/governance UI and nightly predictive sync. | Predictive widget/help suggestions. | Proactive support from governed signals. | Durable until disabled/deleted. |
| `platformSummary/predictiveTriggers_*` | Compact runtime predictive trigger summary. | Predictive trigger sync. | Public widget config and runtime predictive help. | Avoid raw trigger scans in public runtime. | Durable compact summary. |
| `answerlattice_cacheVersions` | Source/version records for KB, canonical, surfaces/widget/context changes. | KB/canonical/surface/widget/profile writes and cache version bumps. | Search freshness, public content, compiled context staleness. | Cheap freshness validation. | Durable read model. |

### 4.9 Compiled context bundles and Storage

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `platformSummary/answerlatticeContextBundleManifest_*` | Bundle status, public bundle id, active/last-ready version, source versions, object refs, stats, limits, errors. | Manual/server build and nightly repair build. | Widget/public API/entity reads and bundle proxy. | Single manifest for compiled context. | Durable manifest; scheduler cleanup uses it to retain active plus previous two ready versions. |
| `platformSummary/answerlatticeContextBundleLock_*` | Build lock status, lock id, start, expiry, source versions. | Bundle build start/end/fail. | Prevent concurrent bundle builds. | Build safety. | 10-minute expiry field on lock; doc remains. |
| Storage `answerlattice-context/public/{publicBundleId}/v{version}/...` | Public JSON bundle objects and manifest. | Context bundle build. | Public bundle proxy and public/runtime bootstraps. Cache misses are rate-limited before Storage access and fail closed if the limiter is unavailable while enabled. | Serve public-safe compiled context without Firestore reads or unbounded public Storage probing. | Public read allowed by Storage rules. Scheduler deletes old versions beyond active/last-ready plus previous two. |
| Storage `answerlattice-context/private/{tId}/{sId}/v{version}/...` | Private MCP/context JSON objects and manifest. | Context bundle build. | Server/public API fallback, entity index bundle, private context consumers. | Compiled private product context. | Client read/write/delete denied by Storage rules; admin writes. Scheduler deletes old versions beyond active/last-ready plus previous two. |

### 4.10 Integrations and notifications

| Storage target | What is stored | When written | How used | Why it exists | Current retention |
| --- | --- | --- | --- | --- | --- |
| `answerlattice_integrationEvents` | Event type, tenant/store, severity, sanitized payload, status, createdAt, expiresAt. | Integration event bus. | Integration processor on create. | Append-only outbound workflow events. | TTL field override exists on `expiresAt`. |
| `answerlattice_integrationDeliveryLogs` | Event id, adapter, attempt, status, status code, sanitized error, duration, createdAt, expiresAt. | Delivery attempt logger. | Ops/debugging and health summary. | Delivery audit without blocking caller. | TTL field override exists on `expiresAt`. |
| `answerlattice_integrationRateLimits` | Adapter/email delivery counters, bucket, recipient hash, expiresAt. | Integration rate limiter. | Prevent external delivery floods. | Persistent delivery caps. | TTL field override exists on `expiresAt`. |
| `answerlattice_notificationLogs` | Generic notification event type, recipient email, reference id, status, subject, message id, error/reason, createdAt, `expiresAt`, `retentionDays`. | Generic Answerlattice notification sender. | Email delivery diagnostics and idempotency/rate checks. | Support notification trace. | 90-day expiry on new rows, TTL override on `expiresAt`, and scheduler cleanup for legacy rows by `createdAt`. |
| `ownerNotificationEvents` | Product id, trigger type, tenant/store/workspace, reference id, dedupe key, recipient role/hints, metadata, priority, status, source, timestamps, `expiresAt`, `retentionDays` for Answerlattice events. | Owner-notification enqueue path when migration flag is enabled. | Product-aware owner notification processing. | Newer unified owner notification system. | 90-day expiry for Answerlattice rows, TTL override on `expiresAt`, and scheduler cleanup for legacy rows by `createdAt`. |
| `ownerNotificationDeliveries` | Event id, product, trigger, channel, recipient hash/masked, status, subject, template, provider id/error, attempt, timestamps, `expiresAt`, `retentionDays` for Answerlattice deliveries. | Owner-notification delivery writer. | Delivery audit. | Channel-level delivery trace. | 90-day expiry for Answerlattice rows, TTL override on `expiresAt`, and scheduler cleanup for legacy rows by `createdAt`. |
| `ownerNotificationRateLimits` | Recipient/store daily counters, hashes, date key, count, updatedAt, `expiresAt`, `retentionDays` for Answerlattice counters. | Owner-notification rate limiter. | Per-recipient/store delivery caps. | Prevent notification floods. | 2-day expiry for Answerlattice rows, TTL override on `expiresAt`, and scheduler cleanup for legacy rows by `updatedAt`. |
| `answerlattice_contactEnquiries` | Public contact form name, work email, phone, product URL, topic, message, consent, path/referrer/user-agent, hashed IP, status, timestamps, `expiresAt`, `retentionDays`. | Anonymous public contact API. | Sales/support follow-up and spam investigation. | Buyer/contact intake separated from MenuList. | 365-day expiry on new rows, TTL override on `expiresAt`, and scheduler cleanup for legacy rows by `createdAt`. |

## 5. Data flow map

### 5.1 Workspace setup and activation

1. Owner/onboarding creates or updates `stores/{sId}` with Answerlattice profile fields.
2. Workspace profile saves also update tenant summary and mark compiled context source versions changed.
3. Activation summary reads workspace, subscription, and bundle manifest state and returns a compact readiness view.
4. Scheduler discovers tenants from platform summary docs instead of scanning all workspace records.

### 5.2 Widget setup and public runtime

1. Owner generates an `al_*` widget key. Raw key is returned once; only hashes/prefix summaries are stored on `stores/{sId}.answerlatticeWidgetApi`.
2. Owner saves widget config and allowed origins on `stores/{sId}`.
3. Public widget config authenticates the API key, checks scope/origin/rate limits, reads sanitized config, predictive summary, and public bundle refs.
4. Public/widget search calls `coreSearch`, which may use instant cache, Firestore search history cache, canonical retrieval, FAQ retrieval, or RAG.
5. Every answer path writes `aiSearchHistory` for feedback/analytics; widget feedback updates that row.

### 5.3 Governed answer lifecycle

1. Entities and canonical answers are created or updated through governance flows.
2. Releases/version docs and cache version docs represent answer set freshness.
3. Public answers API is read-only and uses canonical retrieval. Public signal API writes signals only; it never mutates canonical answers.
4. Mutation proposals are human-reviewed before canonical answer changes.
5. Audit logs preserve governance history.

### 5.4 Knowledge Intake lifecycle

1. An intake job is created under `answerlattice_knowledgeIntakeJobs`.
2. Sources are added from manual text, URLs, repeated replies, screenshots, audio, or video. Text is cleaned and common secrets are redacted before storage.
3. Media extraction reserves usage, calls AI extraction, logs an AI operation, stores extracted text as a source, and finalizes/refunds ledger rows.
4. Review items are generated and later published into KB articles, FAQs, product surfaces, or mutation proposals.
5. Summary docs keep owner/dashboard views compact.

### 5.5 Support loop

1. Users submit tickets, chat sessions, or feedback.
2. Tickets can emit signal events, send notifications, store attachments, and carry client debug/log context.
3. Feedback can emit signal events with summarized metadata.
4. Search misses and signals feed friction aggregation, support board sync, predictive triggers, and mutation proposal flows.

### 5.6 Scheduler and summaries

1. `answerlatticeNightly` is the consolidated scheduled function exported from `functions-answerlattice/src/index.ts`.
2. The master scheduler acquires task and tenant leases in `platformSummary`.
3. Tenant work runs drift/proposal/friction/trust/support-board/intake/predictive/context-bundle tasks based on flags.
4. Run logs are written to `answerlattice_schedulerRunLogs`.
5. Summary docs such as friction snapshot, integration health, predictive triggers, support board summary, and Knowledge Intake summary are used to avoid raw reads in owner/runtime views.
6. Knowledge Intake review-item status edits update parent job counters directly instead of scanning every source and review item after each child edit.

## 6. Retention and compaction snapshot

| Surface | Existing retention/compaction | Gap |
| --- | --- | --- |
| Integration events/logs/rate counters | `expiresAt` plus Firestore TTL field overrides. | Good pattern to reuse elsewhere. |
| Signal events | Scheduler deletes events older than 12 months. | Bounded scheduler delete cost; no TTL field override. |
| Friction daily stats | Scheduler deletes stats older than 90 days. | Snapshot remains durable. |
| AI operation details | Default accounting-only. Detailed mode adds `detailExpiresAt`. | No Answerlattice TTL field override for AI detail subfields/docs found. |
| Query embeddings | 30-day expiry, TTL field override, stale-read best-effort delete, and scheduler cleanup by `createdAt`. | Implemented. |
| Search history | 90-day expiry, TTL field override, bounded writer payload, and scheduler cleanup by `createdOn`. | Implemented for raw runtime retention. Long-term analytics should use compact summaries, not this raw collection. |
| Knowledge Intake sources/review items | Redaction and max field lengths. Raw media not retained after extraction. Review-item edits update parent job counters transactionally instead of full recounting. | Source text and review items remain durable because the current published-job workflow still returns them for review; closed-job compaction needs an explicit archive state/product retention decision. |
| Scheduler run logs | Bounded error/tenant arrays plus 90-day expiry and legacy cleanup by `startedAt`. | Implemented. |
| Generic notification logs | Dedup/rate queries, compact fields, 90-day expiry, TTL override, and legacy cleanup. | Implemented. |
| Owner notifications | Compact event/delivery/rate docs, 90-day event/delivery expiry, 2-day rate-limit expiry, TTL overrides, and legacy cleanup. | Implemented for Answerlattice rows only. |
| Contact enquiries | Sanitization, hashed IP, honeypot, public rate limit, 365-day expiry, TTL override, and legacy cleanup. | Implemented with a 365-day platform lifecycle. |
| Compiled context bundles | Manifest points to active/latest versions, in-memory proxy/cache, and scheduler Storage cleanup keeps active/last-ready plus previous two versions. | Implemented. |
| Chat/ticket attachments | Storage paths tenant/store scoped; hard delete now removes chat images, ticket documents, and ticket message attachments. | Implemented for hard-delete paths. |

## 7. Production interpretation

Firestore should keep Answerlattice's current app truth and compact read models:

- canonical answer truth;
- workspace/account truth;
- owner-approved content;
- audit/governance records;
- compact summaries and current operational state.

Firestore should not become the permanent raw warehouse for:

- every search/chat/support interaction forever;
- all query embedding cache rows forever;
- every scheduler run forever;
- every notification/contact/integration detail forever;
- all compiled bundle versions forever;
- large source/media/job detail after the workflow is closed.

The existing integration TTL pattern, signal cleanup, friction cleanup, source-version manifests, and compiled context bundle architecture give Answerlattice the right direction. The missing work is to apply the same retention/compaction discipline to the remaining high-growth or sensitive operational collections.
