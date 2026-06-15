# Answerlattice Data Inventory Evidence

**Status:** Evidence appendix
**Product scope:** Answerlattice only
**Created:** 2026-06-15

This appendix lists the exact code/doc references used for the Answerlattice data inventory. Current code is treated as the primary source of truth.

## 1. Doctrine and product boundary

| Claim | Evidence |
| --- | --- |
| Answerlattice is governed answer infrastructure, not a generic helpdesk/chatbot/CMS. | `__docs__/answerlattice/doctrine/01-core-doctrine.md:1-144`, `__docs__/answerlattice/doctrine/02-non-goals-charter.md:1-144` |
| Existing frozen collections and infrastructure separation are part of doctrine. | `__docs__/answerlattice/doctrine/03-infrastructure-freeze-v1.md:1-154` |
| Answerlattice code/rules must use product-specific constants, `pId`, `tId`, `sId`, and separate Firebase assets. | `.codex/rules/ANSWERLATTICE_RULES.md:1-216` |

## 2. Dedicated Firebase runtime

| Claim | Evidence |
| --- | --- |
| Client-side Answerlattice DAL imports from a named Answerlattice Firebase client and uses shared mode only for explicit legacy/emulator override. | `src/lib/firebase/answerlatticeFirebaseClient.ts:1-8`, `src/lib/firebase/answerlatticeFirebaseClient.ts:30-53` |
| Server-side Answerlattice admin initializes a separate `answerlattice-admin` app when not in shared mode. | `src/lib/firebase/answerlatticeFirebaseAdmin.ts:1-9`, `src/lib/firebase/answerlatticeFirebaseAdmin.ts:20-26`, `src/lib/firebase/answerlatticeFirebaseAdmin.ts:144-177` |
| Answerlattice Cloud Functions have separate Firebase Admin initialization and project/bucket environment resolution. | `functions-answerlattice/src/firebaseAdmin.ts:1-8`, `functions-answerlattice/src/firebaseAdmin.ts:23-33`, `functions-answerlattice/src/firebaseAdmin.ts:96-120` |
| Answerlattice scheduled/manual/API functions are exported from `functions-answerlattice/src/index.ts`. | `functions-answerlattice/src/index.ts:1-15`, `functions-answerlattice/src/index.ts:54-72`, `functions-answerlattice/src/index.ts:99-143`, `functions-answerlattice/src/index.ts:154-180`, `functions-answerlattice/src/index.ts:188-227` |

## 3. Collection constants, rules, and indexes

| Claim | Evidence |
| --- | --- |
| App-side Answerlattice collection constants enumerate governed answer, operational, notification, integration, intake, public help, and support collections. | `src/constants/answerlattice/database.ts:1-40` |
| Functions-side constants include Answerlattice collections plus shared `platformSummary`, `aiSearchHistory`, `queryEmbeddings`, owner notification collections, `stores`, KB, and changelog collections. | `functions-answerlattice/src/constants/database.ts:13-55` |
| Root database constants re-export Answerlattice collections for shared helper compatibility. | `src/constants/database.ts:177-183` |
| Firestore rules default deny and explicitly scope Answerlattice client access. | `firestore-answerlattice.rules:1-8` |
| `platformSummary` rules allow client reads/writes only for recognized Answerlattice docs and permissions; deletes are denied. | `firestore-answerlattice.rules:10-25` |
| Governed answer collections have tenant/permission-scoped rules and many deletes are disabled. | `firestore-answerlattice.rules:27-87` |
| Friction stats, scheduler run logs, AI operations, integrations, predictive triggers, product surfaces, FAQs, support board, intake, cache versions, notification logs, chat, feedback, tickets, stores, subscriptions, payment transactions, query embeddings, KB, search history, and changelog are covered by explicit rule sections. | `firestore-answerlattice.rules:89-296` |
| Composite indexes exist for friction, signals, canonical/governance, audit, entities, integrations, notification logs, predictive triggers, support tickets, product surfaces, FAQs, support board, and intake. | `firestore-answerlattice.indexes.json:225-1165` |
| TTL field overrides cover integration rows plus Answerlattice scheduler logs, notification logs, owner notification rows, query embeddings, contact enquiries, and search history. | `firestore-answerlattice.indexes.json:1167-1233` |

## 4. Storage rules and paths

| Claim | Evidence |
| --- | --- |
| Answerlattice Storage rules are scoped to Answerlattice QA/prod storage buckets and keep MenuList paths out. | `storage-answerlattice.rules:3-8` |
| Chat images are stored under `chatSessions/chatimages/{tId}/{sId}/{imageId}` with image type and size rules. | `storage-answerlattice.rules:62-66` |
| Ticket documents and message attachments are stored under `supportTickets/documents` and `supportTickets/messages`. | `storage-answerlattice.rules:68-78` |
| Changelog files and intake source files have tenant/store scoped storage paths and limits. | `storage-answerlattice.rules:80-92` |
| Public compiled context bundle objects are publicly readable by constrained `publicBundleId`/version pattern; private bundle paths deny client read/write/delete. | `storage-answerlattice.rules:94-102` |

## 5. Workspace, widget, hosted help, and billing

| Claim | Evidence |
| --- | --- |
| Workspace profile stores product name, URL, support email, billing model, primary surfaces, timezone, business day end time, and launch profile on `stores/{sId}`. | `src/app/api/answerlattice/workspace-profile/route.ts:31-39`, `src/app/api/answerlattice/workspace-profile/route.ts:142-171` |
| Workspace profile updates tenant summary and compiled context source versions. | `src/app/api/answerlattice/workspace-profile/route.ts:172-193` |
| Widget keys are raw once, stored hash-only under `stores/{sId}.answerlatticeWidgetApi`, and bounded by key limit. | `src/app/api/answerlattice/widget-key/route.ts:3-9`, `src/app/api/answerlattice/widget-key/route.ts:121-156`, `src/app/api/answerlattice/widget-key/route.ts:184-204` |
| Widget config and allowed origins are saved on `stores/{sId}` and mark compiled context stale. | `src/app/api/answerlattice/widget-config/route.ts:51-62`, `src/app/api/answerlattice/widget-config/route.ts:164-180` |
| Hosted help settings store config on `stores/{sId}` and domain registry docs in `answerlattice_publicHelpSites`. | `src/app/api/answerlattice/hosted-help-settings/route.ts:241-356` |
| Hosted help domain registry docs include domain, `pId`, `tId`, `sId`, enabled flag, config, status, and updatedAt. | `src/lib/answerlattice/hostedHelpServer.ts:120-140` |
| Billing reads `subscriptions`, `payment_transactions`, and `stores/{sId}.answerlatticeSubscription`. | `src/database/answerlattice/billing.ts:9-13`, `src/database/answerlattice/billing.ts:67-87`, `src/database/answerlattice/billing.ts:138-160` |

## 6. Public API and widget runtime

| Claim | Evidence |
| --- | --- |
| Public API auth requires `al_*` keys, rate limits requests, validates hash-only credentials, scope, product, purpose, origin, tenant, and store. | `src/lib/answerlattice/publicApi.ts:21-98` |
| Public answers API is read-only canonical retrieval and uses `Cache-Control: private, no-store`. | `src/app/api/answerlattice/public/v1/answers/route.ts:3-8`, `src/app/api/answerlattice/public/v1/answers/route.ts:64-118` |
| Public entities API reads compiled bundles first and falls back to Firestore entity reads, with private max-age cache. | `src/app/api/answerlattice/public/v1/entities/route.ts:36-68`, `src/app/api/answerlattice/public/v1/entities/route.ts:70-139` |
| Public signal API ingests structured signals and emits `answerlattice_signalEvents`; it never mutates canonical answers directly. | `src/app/api/answerlattice/public/v1/signals/route.ts:3-8`, `src/app/api/answerlattice/public/v1/signals/route.ts:50-80` |
| Widget config endpoint reads sanitized public runtime config, predictive summary, bundle refs, and throttles runtime status writes to `stores/{sId}`. | `src/app/api/widget/config/route.ts:39-92`, `src/app/api/widget/config/route.ts:149-244`, `src/app/api/widget/config/route.ts:247-266` |
| Widget search authenticates API key, rate limits, validates query/context/image/conversation history, calls `coreSearch`, and records AI operation usage. | `src/app/api/widget/search/route.ts:76-149`, `src/app/api/widget/search/route.ts:150-219`, `src/app/api/widget/search/route.ts:229-293` |
| Widget feedback updates `aiSearchHistory` and emits a negative signal when enabled. | `src/app/api/widget/feedback/route.ts:87-157`, `src/app/api/widget/feedback/route.ts:166-217` |

## 7. Search, search history, and embedding cache

| Claim | Evidence |
| --- | --- |
| `coreSearch` documents the single Answerlattice retrieval pipeline: safe mode, image processing, instant cache, Firestore cache, canonical retrieval, FAQ retrieval, RAG, history, metrics. | `src/lib/search/searchCore.ts:329-343` |
| Instant-cache hits still write `aiSearchHistory`. | `src/lib/search/searchCore.ts:546-664`, `src/lib/search/searchCore.ts:596-621` |
| Cache lookup uses `aiSearchHistory` for Help Center stateless Q&A, while widget skips shared cache because feedback needs a per-answer record. | `src/lib/search/searchCore.ts:665-731` |
| Canonical hits write `aiSearchHistory`. | `src/lib/search/searchCore.ts:788-913`, `src/lib/search/searchCore.ts:820-837` |
| FAQ hits write search history through the canonical miss context wrapper. | `src/lib/search/searchCore.ts:940-989` |
| RAG fallback uses `queryEmbeddings`, vector search against `kb_articles`, strips embeddings from returned docs, calls Gemini, validates references, and writes `aiSearchHistory`. | `src/lib/search/searchCore.ts:1037-1104`, `src/lib/search/searchCore.ts:1167-1269` |
| Server search history writer composes `pId: AL`, `tId`, `sId`, trace/request ids, retention fields, and writes to `aiSearchHistory`. | `src/database/aiSearchHistory/server.ts:99-122` |
| Search history writer caps query/answer/reference fields, omits vector-like fields, and preserves Firestore timestamps for TTL. | `src/database/aiSearchHistory/server.ts:15-22`, `src/database/aiSearchHistory/server.ts:31-45`, `src/database/aiSearchHistory/server.ts:47-97` |
| `queryEmbeddings` uses a 30-day staleness check, deletes stale docs best-effort, and writes retention fields on cache save. | `src/database/queryEmbeddings/index.ts:26-57`, `src/database/queryEmbeddings/index.ts:67-85` |

## 8. Knowledge Intake

| Claim | Evidence |
| --- | --- |
| Knowledge Intake redacts emails, cards, common tokens, JWTs, and secret-like key/value pairs before storing source text. | `src/lib/answerlattice/knowledgeIntake.ts:160-184` |
| Intake jobs and summary refs use `answerlattice_knowledgeIntakeJobs`, `answerlattice_knowledgeSources`, `answerlattice_intakeReviewItems`, and `platformSummary/knowledgeIntakeSummary_*`. | `src/lib/answerlattice/knowledgeIntake.ts:227-230` |
| Job creation writes product/workspace fields, input metadata, counters, usage summary, timestamps, and a compact summary patch. | `src/lib/answerlattice/knowledgeIntake.ts:356-403` |
| Loading an intake bundle is bounded by constraints for sources and review items. | `src/lib/answerlattice/knowledgeIntake.ts:406-433` |
| Sources store redacted `contentText`, excerpt, content hash, tags, context keys, entity ids, metadata, timestamps, and actor fields. | `src/lib/answerlattice/knowledgeIntake.ts:460-564` |
| Media extraction enforces type/size/signature checks, reserves usage, records AI operation, stores extracted text as a source, records hashes, and notes raw media is not retained. | `src/lib/answerlattice/knowledgeIntake.ts:567-724` |
| Review-item status edits build parent job counter deltas and apply them transactionally with the item update instead of recounting all sources/review items on every edit. | `src/lib/answerlattice/knowledgeIntake.ts:318-339`, `src/lib/answerlattice/knowledgeIntake.ts:737-790` |
| Knowledge Intake can publish review items into KB articles, FAQs, product surfaces, or canonical mutation proposals; changelog publish is blocked. | `src/lib/answerlattice/knowledgeIntake.ts:941-975` |
| Publishing a KB article writes `kb_articles`, updates `kb_categories`, bumps cache version, and marks compiled context changed. | `src/lib/answerlattice/knowledgeIntake.ts:977-1099` |
| Publishing FAQ/surface/proposal writes to `answerlattice_faqs`, `answerlattice_productSurfaces`, or `answerlattice_mutationProposals`. | `src/lib/answerlattice/knowledgeIntake.ts:1102-1225` |
| Intake usage ledger reserves/finalizes/refunds credits and writes `answerlattice_intakeUsageLedger`. | `src/lib/answerlattice/intakeUsageLedger.ts:42-47`, `src/lib/answerlattice/intakeUsageLedger.ts:156-328` |
| Nightly summary reads latest jobs and writes a compact Knowledge Intake summary. | `functions-answerlattice/src/answerlattice/knowledgeIntakeSummary.ts:43-59`, `functions-answerlattice/src/answerlattice/knowledgeIntakeSummary.ts:87-120` |

## 9. AI operation logging

| Claim | Evidence |
| --- | --- |
| AI operation logging stores detailed provider response only when `AI_OPERATION_LOG_MODE` is `detailed`; otherwise it is accounting-only. | `src/lib/ai/operationLog.ts:61-74`, `src/lib/ai/operationLog.ts:89-109` |
| Answerlattice AI operation rows write to `answerlattice_aiOperations/{tId}/{sId}` when `pId` is `AL`. | `src/lib/ai/operationLog.ts:111-146` |
| Detailed mode adds `detailExpiresAt`, but the operation document is otherwise retained. | `src/lib/ai/operationLog.ts:115-135` |

## 10. Support tickets, chat sessions, and feedback

| Claim | Evidence |
| --- | --- |
| Chat images are uploaded to tenant/store scoped Storage with metadata saying they are tied to chat sessions. | `src/database/chatSessions/index.ts:29-41`, `src/database/chatSessions/index.ts:72-95` |
| Chat sessions write to `chatSessions`; latest user sessions are capped at 50. | `src/database/chatSessions/index.ts:128-137`, `src/database/chatSessions/index.ts:209-220` |
| Chat session hard delete collects image URLs, deletes them from Answerlattice Storage, then deletes the Firestore session doc. | `src/database/chatSessions/index.ts:22-31`, `src/database/chatSessions/index.ts:185-203` |
| Ticket create stores captured logs/debug context, uploads top-level documents, emits ticket/escalation signals, and triggers notifications. | `src/database/tickets/index.ts:145-221` |
| Ticket message add uploads message attachments, caps messages at 500, writes messages array, and can trigger reply notification. | `src/database/tickets/index.ts:244-303` |
| Ticket status update writes status history and can trigger status notification. | `src/database/tickets/index.ts:305-355` |
| Ticket hard delete reads persisted ticket data, deletes top-level documents and message attachments from Answerlattice Storage, then deletes the ticket doc. | `src/database/tickets/index.ts:35-53`, `src/database/tickets/index.ts:357-378` |
| Ticket list/listener queries are scoped and capped. | `src/database/tickets/index.ts:418-540` |
| Feedback writes to `feedback`, emits signal metadata, and query lists are capped. | `src/database/feedback/index.ts:1-18`, `src/database/feedback/index.ts:110-138`, `src/database/feedback/index.ts:173-245` |

## 11. Signals, friction, and scheduler

| Claim | Evidence |
| --- | --- |
| Signal emitter is feature-gated, non-blocking, sanitizes metadata, dedupes common cases in memory, and writes `answerlattice_signalEvents`. | `src/lib/answerlattice/signalEmitter.ts:1-17`, `src/lib/answerlattice/signalEmitter.ts:34-37`, `src/lib/answerlattice/signalEmitter.ts:62-92`, `src/lib/answerlattice/signalEmitter.ts:107-133` |
| Friction aggregation reads today's signals and canonical misses from `aiSearchHistory`, writes daily stats, and writes compact `platformSummary/frictionSnapshot_*`. | `functions-answerlattice/src/answerlattice/frictionAggregation.ts:119-193`, `functions-answerlattice/src/answerlattice/frictionAggregation.ts:249-365` |
| Friction daily stats cleanup deletes records older than 90 days. | `functions-answerlattice/src/answerlattice/frictionAggregation.ts:379-414` |
| Signal TTL archive deletes signal events older than 12 months. | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts:1281-1328` |
| Scheduler run logs write trigger, totals, errors, tenant runs, metadata, retention cleanup totals, and 90-day retention fields to `answerlattice_schedulerRunLogs`. | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts:1612-1621`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts:1715-1778` |
| Answerlattice nightly runs the operational retention cleanup inside the existing scheduler and logs per-target cleanup counts. | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts:2304-2354` |
| Master scheduler uses task and tenant leases/state in `platformSummary`. | `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts:109-139`, `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts:157-214`, `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts:216-380` |

## 12. Compiled context bundles

| Claim | Evidence |
| --- | --- |
| Bundle source data reads store, context summary, entities, relations, canonical answers, product surfaces, articles, FAQs, releases, predictive summary, and changelog entries. | `src/lib/answerlattice/contextBundleBuilderServer.ts:240-346` |
| Bundle builder uploads JSON objects to Storage with content type, cache control, and hash metadata. | `src/lib/answerlattice/contextBundleBuilderServer.ts:565-584` |
| Bundle manifest is read from `platformSummary` and cached in memory. | `src/lib/answerlattice/contextBundleBuilderServer.ts:586-608` |
| Manual/server bundle build writes a lock with `expiresAt`, uploads public/private objects, uploads manifests, and writes manifest to `platformSummary`. | `src/lib/answerlattice/contextBundleBuilderServer.ts:630-786` |
| Nightly bundle repair path performs the same public/private object upload and manifest write pattern. | `functions-answerlattice/src/answerlattice/contextBundleBuilder.ts:520-660` |
| Functions-side retention cleanup reads bundle manifests, keeps active/last-ready plus previous two versions, and deletes older public/private Storage objects with bounded limits. | `functions-answerlattice/src/answerlattice/dataRetention.ts:110-178`, `functions-answerlattice/src/answerlattice/dataRetention.ts:274-290` |
| Public bundle proxy serves only allowed public bundle paths from Storage with in-memory proxy cache. | `src/app/api/answerlattice/bundles/public/[...path]/route.ts:1-94` |

## 13. Integrations

| Claim | Evidence |
| --- | --- |
| Integration event bus emits sanitized append-only `answerlattice_integrationEvents` with `expiresAt`. | `functions-answerlattice/src/integrations/eventBus.ts:1-12`, `functions-answerlattice/src/integrations/eventBus.ts:31-83` |
| Delivery logger writes `answerlattice_integrationDeliveryLogs` with `expiresAt` and updates compact integration health in `platformSummary`. | `functions-answerlattice/src/integrations/deliveryLogger.ts:1-8`, `functions-answerlattice/src/integrations/deliveryLogger.ts:23-60`, `functions-answerlattice/src/integrations/deliveryLogger.ts:88-143` |
| Integration rate limiter writes counters with `expiresAt`. | `functions-answerlattice/src/integrations/rateLimiter.ts:1-6`, `functions-answerlattice/src/integrations/rateLimiter.ts:30-104` |
| Integration settings save Slack/email config to `platformSummary`; GET returns safe response plus health. | `src/app/api/answerlattice/integrations/route.ts:152-180`, `src/app/api/answerlattice/integrations/route.ts:182-258` |

## 14. Notifications and contact enquiries

| Claim | Evidence |
| --- | --- |
| Generic notifications target `answerlattice_notificationLogs` for Answerlattice and write event type, recipient email, reference id, status, subject, provider ids/errors, createdAt, and Answerlattice retention fields. | `src/lib/notifications/index.ts:84-116`, `src/lib/notifications/index.ts:206-236` |
| Generic notification flow can migrate Answerlattice owner-notification triggers into the owner-notification system. | `src/lib/notifications/index.ts:268-300` |
| Owner-notification collection names are `ownerNotificationEvents`, `ownerNotificationDeliveries`, and `ownerNotificationRateLimits`. | `src/data/shared/ownerNotificationRegistry.ts:34-38` |
| Answerlattice owner-notification trigger types include notification test, missing support email, widget verified/failed, source sync failed, canonical approval required, and high priority escalation. | `src/data/shared/ownerNotificationRegistry.ts:267-350` |
| App-side owner-notification event, delivery, and rate-limit writes add Answerlattice-only retention fields. | `src/lib/owner-notifications/index.ts:70-78`, `src/lib/owner-notifications/index.ts:145-174`, `src/lib/owner-notifications/index.ts:180-218`, `src/lib/owner-notifications/index.ts:264-287` |
| Public contact API writes product-separated `answerlattice_contactEnquiries` with contact details, consent, referrer, user-agent, hashed IP, status, timestamps, and retention fields. | `src/app/api/answerlattice/public/contact/route.ts:1-13`, `src/app/api/answerlattice/public/contact/route.ts:80-100` |
| Notification test route sends an Answerlattice notification to workspace support email and uses `answerlattice_notificationLogs` through the generic sender. | `src/app/api/answerlattice/notifications/test/route.ts:38-114` |

## 15. Existing cost/read-model documentation

| Claim | Evidence |
| --- | --- |
| Existing Answerlattice cost docs already identify public content caching, hosted help registry, bounded ticket/chat reads, search cache source versions, and summary-first patterns. | `__docs__/answerlattice/firebase-cost-optimization-audit.md:1-42`, `__docs__/answerlattice/firebase-cost-optimization-audit.md:82-95` |
| Existing Answerlattice README states Activation Command Center reads compact summary docs only and Owner Support Assistant remains docs-frozen until runtime exists. | `__docs__/answerlattice/README.md:28-43`, `__docs__/answerlattice/README.md:141-143` |

## 16. Implemented retention policy

| Claim | Evidence |
| --- | --- |
| App-side retention helper defines the product retention windows and returns Firestore TTL-compatible `expiresAt` plus `retentionDays`. | `src/lib/answerlattice/dataRetention.ts:1-45` |
| Functions-side retention helper mirrors the policy, exposes bounded cleanup results, and uses existing timestamp fields for legacy row cleanup. | `functions-answerlattice/src/answerlattice/dataRetention.ts:12-84`, `functions-answerlattice/src/answerlattice/dataRetention.ts:86-108`, `functions-answerlattice/src/answerlattice/dataRetention.ts:180-293` |
