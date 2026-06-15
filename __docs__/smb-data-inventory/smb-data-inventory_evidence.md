# SMB Data Inventory Evidence Appendix

**Status:** Internal evidence appendix; updated for P0/P1/P2 implementation on 2026-06-14
**Product scope:** MenuList only
**Created:** 2026-06-14

This appendix lists the source evidence used by [SMB data map](./smb-data-inventory_data-map.md). File references use repo-relative `file:line` ranges.

## 1. Collection registry and feature flags

| Claim | Evidence |
| --- | --- |
| MenuList defines core collections for users, tenants, stores, projects, subscriptions, analytics, operations, AI jobs, MOL, snapshots, guest feedback, integrations, reviews, compliance, system alerts, scheduler logs, and public menu drafts. | `src/constants/database.ts:3-21`, `src/constants/database.ts:59-65`, `src/constants/database.ts:75-101`, `src/constants/database.ts:103-129`, `src/constants/database.ts:131-177`, `src/constants/database.ts:180-191` |
| Cloud Functions mirror the core MenuList collection registry and add function/runtime collections such as system telemetry, scheduler logs, health, auth OTP, and public drafts. | `functions/src/constants/database.ts:15-46`, `functions/src/constants/database.ts:57-78`, `functions/src/constants/database.ts:83-123`, `functions/src/constants/database.ts:131-138` |
| Menu observation and snapshots are enabled by feature flags; CMI-related flags live nearby. | `src/config/features.ts:600-641`, `src/config/features.ts:674-720` |
| Data retention/storage mode flags define summary MOL mode, snapshot retention, AI operation log mode, extraction detail retention, image-batch history cap, and owner-notification retention. | `src/config/features.ts`, `functions/src/constants/features.ts` |
| Guest feedback is feature-gated. | `src/config/features.ts:902-910` |
| Owner Business Health and assistant usage logging are feature-gated. | `src/config/features.ts:984-1021` |
| POS sync, Menu Command Center, and Menu Correctness Engine are feature-gated. | `src/config/features.ts:1027-1103` |
| Menu Trust Signals is configured as a pure UI feature using existing data. | `src/config/features.ts:1490-1513` |
| Menu Health Monitor is feature-gated. | `src/config/features.ts:1723-1739` |

## 2. Core owner, tenant, store, subscription, and profile data

| Claim | Evidence |
| --- | --- |
| Shared onboarding creates tenant/store documents with business profile, contact, settings, roles, timezone, summary, and user binding fields. | `src/lib/onboarding/createTenantStore.ts:21-64`, `src/lib/onboarding/createTenantStore.ts:156-244`, `src/lib/onboarding/createTenantStore.ts:256-337`, `src/lib/onboarding/createTenantStore.ts:365-386` |
| Website subscription onboarding calls tenant/store creation and then writes subscription fields. | `src/app/api/onboarding/create-subscription/route.ts:130-190`, `src/app/api/onboarding/create-subscription/route.ts:195-244` |
| Subscriptions are stored with product/tenant/store/user identity and subscription state. | `src/database/subscriptions/server.ts:40-98`, `src/database/subscriptions/server.ts:126-218` |
| Phone OTP challenges store phone hashes, OTP hash, attempt/expiry/request metadata, and phone login user fields. | `src/lib/auth/phoneOtp.ts:200-376` |
| User profile update stores normalized phone/contact fields. | `src/lib/userProfile/server.ts:1-15`, `src/lib/userProfile/server.ts:43-77` |

## 3. Project/menu truth and public summaries

| Claim | Evidence |
| --- | --- |
| Project update fetches old project state when observation/master-awareness/MCE needs it, stamps `_mce`, writes project data, invalidates public cache, writes master operational state, and logs update events. | `src/database/projects/index.ts:825-899`, `src/database/projects/index.ts:919-1014` |
| Project publish increments menu version/last-published fields and logs publish events/snapshots. | `src/database/projects/index.ts:1289-1325` |
| Public draft claim converts extracted draft data into a project and platform project summary. | `src/app/api/public/create-menu/claim/route.ts:360-436` |
| Public summary docs are used for public menu/OBP routing and sitemap/client surfaces. | `src/app/client/[[...slug]]/page.tsx:210`, `src/app/client/sitemap.ts:170-205`, `src/app/client/obp/OBPContent.tsx:66-132` |

## 4. Public/customer analytics

| Claim | Evidence |
| --- | --- |
| Shared analytics write policy allowlists supported scalar/map fields and denies `sessionId`. | `src/lib/analytics/writePolicy.ts` |
| Server analytics writer applies the shared policy before writing daily docs with tenant/store/project, grain, surface, local date, timezone/business-day fields, counters/maps, and `lastUpdated`. | `src/lib/analytics/serverWrite.ts` |
| Public analytics API validates tenant/store/project/updateData, limits fields, checks active/blocked state, applies target cache, filters decision-block fields, applies the shared write policy, validates date window, and writes via the server writer. | `src/app/api/public/analytics/track/route.ts` |
| Browser analytics queue uses localStorage key `menulist_pending_analytics_queue_v1`, flush interval/max batch, direct/API write paths, recovery, dashboard reads, `trackAnalyticsEvent`, and the shared write policy. | `src/database/analytics/index.ts` |
| Unified analytics applies debounce/cooldown, resolves device/location/session, keeps session ID local for dedupe, writes aggregate fields, and supports menu, OBP, decision-block, customer-app, search, item, and GA4-only events. | `src/lib/analytics/unified.ts` |
| Analytics preferences control store/menu/customer/decision/location/OBP tracking and external IDs. | `src/lib/analytics/preferences.ts:1-38` |
| Geolocation can store coarse rounded lat/lng or timezone fallback. | `src/lib/analytics/geo.ts:6-44` |
| Analytics session ID uses sessionStorage with 30-minute timeout. | `src/lib/analytics/session.ts:6-47` |
| Device parser derives type/browser/OS. | `src/lib/analytics/device.ts:13-34` |
| Customer analytics aggregation defines daily/summary/weekly/monthly patterns and a 90-day daily delete window. | `functions/src/aggregateCustomerAnalytics.ts:24-75`, `functions/src/aggregateCustomerAnalytics.ts:186-218` |
| Dashboard summary aggregation writes compact analytics/dashboard/intelligence summaries. | `functions/src/analytics/dashboardSummaryAggregation.ts:1100-1210`, `functions/src/analytics/dashboardSummaryAggregation.ts:1365-1442` |
| OBP analytics aggregation has OBP-specific link/action counters and summaries. | `functions/src/analytics/obpAnalyticsAggregation.ts:58-127`, `functions/src/analytics/obpAnalyticsAggregation.ts:294-353`, `functions/src/analytics/obpAnalyticsAggregation.ts:653-821`, `functions/src/analytics/obpAnalyticsAggregation.ts:982` |

## 5. MOL, snapshots, drift metrics, extraction learning, and owner control usage

| Claim | Evidence |
| --- | --- |
| Project updates compare item changes and write one compact `MENU_REVISION_SUMMARY` by default, with detailed per-item entries available in detailed mode. | `src/database/projects/index.ts` |
| Menu snapshots store compact item/category state under `menuSnapshots/{tId}/{sId}` with expiry/retention metadata. | `src/database/projects/index.ts` |
| Menu change log is silent, append-only, feature/debounce controlled, supports scoped nested writes, and writes nested `menuChangeLog/{tId}/{sId}` entries. | `src/database/menuChangeLog/index.ts` |
| Menu observation types define event types, log fields, item state, derived metrics, and cost telemetry. | `src/types/menuObservation.ts:20-35`, `src/types/menuObservation.ts:49-64`, `src/types/menuObservation.ts:77-126`, `src/types/menuObservation.ts:134-143` |
| MOL logger writes pricing/PDF-style events to nested menu change logs. | `src/lib/pricing/molLogger.ts:27-50`, `src/types/mol.types.ts:17-38`, `src/types/mol.types.ts:57-87` |
| Multi-outlet MOL helper now routes events through the shared scoped nested menu-change DAL. | `src/lib/multiOutlet/molEvents.ts` |
| Menu drift metrics read MOL logs, compute price/availability/correction metrics, write `menuItemState` metric docs, and write MOL cost telemetry to `systemTelemetry`. | `functions/src/analytics/menuDriftMetrics.ts:1-20`, `functions/src/analytics/menuDriftMetrics.ts:134-214`, `functions/src/analytics/menuDriftMetrics.ts:220-254`, `functions/src/analytics/menuDriftMetrics.ts:260-369` |
| Extraction learning reads recent extraction-correction MOL events and writes `platformSummary/extractionLearning`. | `functions/src/analytics/extractionLearning.ts:1-20`, `functions/src/analytics/extractionLearning.ts:62-174` |
| Store truth confidence reads store summary and extraction learning and writes `platformSummary/storeTruthConfidence`. | `functions/src/analytics/storeTruthConfidence.ts:1-20`, `functions/src/analytics/storeTruthConfidence.ts:137-223` |
| Staleness check reads store-truth confidence and writes lifecycle message logs/messages with expiry metadata when needed. | `functions/src/analytics/stalenessCheck.ts` |
| Authority maturation reads `ownerControlUsage`, computes phases, and writes insight docs. | `functions/src/analytics/authorityMaturation.ts:1-14`, `functions/src/analytics/authorityMaturation.ts:173-221` |
| Owner control usage logs debounced control counts/monthly usage/last-used timestamps to `ownerControlUsage/{tId}_{sId}`. | `src/database/ownerControlUsage/index.ts:61-72`, `src/database/ownerControlUsage/index.ts:124-216` |
| Function telemetry writes daily `systemTelemetry` function result summaries. | `functions/src/telemetry/logger.ts:31-42` |

## 6. Named features

| Feature | Evidence |
| --- | --- |
| Menu Health Monitor verifies public URL reachability, updates `stores.health`, and creates system alerts on failure. | `functions/src/monitoring/publishVerification.ts:1-12`, `functions/src/monitoring/publishVerification.ts:25-49`, `functions/src/monitoring/publishVerification.ts:59-156` |
| Publish verification and force-republish functions call health verification/update and lifecycle messages. | `functions/src/triggers/operations.ts:93-166`, `functions/src/triggers/operations.ts:290-340` |
| Menu Trust Signals renders existing business/category/location/hours/publish fields and stores no new collection. | `src/components/atoms/TrustSignals.tsx:1-13`, `src/components/atoms/TrustSignals.tsx:20-42`, `src/components/atoms/TrustSignals.tsx:68-98`, `src/components/atoms/TrustSignals.tsx:122-211`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx:2600-2655` |
| Menu Correctness Engine defines zero-new-collection metadata and result types. | `src/lib/mce/types.ts:1-28`, `src/lib/mce/types.ts:38-98` |
| MCE rule registry and evaluation produce verified/warning/error results. | `src/lib/mce/correctnessResolver.ts:683-758` |
| MCE entrypoint converts evaluation into project metadata. | `src/lib/mce/index.ts:21-49` |
| MCE sanitizer strips internal fields from customer/client payloads. | `src/lib/mce/utils.ts:25-91` |
| Command Center bulk operations are pure project transformations and previews. | `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:1-8`, `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:33-74`, `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:250-427` |
| Command Center applies operations to project data and passes the updated project back to the editor; undo is local state. | `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:469-553` |
| Editor mounts Command Center and treats apply as a project dirty-state change rather than a separate collection write. | `src/components/templates/main-app/projects/editorView/Editor.tsx:1503-1527` |

## 7. Guest feedback

| Claim | Evidence |
| --- | --- |
| Guest feedback type includes rating/message/contact/source/status/attention/audit/expiry fields. | `src/types/guestFeedback.ts:11-120` |
| Public feedback submit route validates honeypot/store/project/settings/input and writes feedback/event records. | `src/app/api/public/feedback/submit/route.ts:100-234` |
| Server helper writes raw `guestFeedback` and non-PII `feedbackEvents` with event expiry metadata. | `src/database/guestFeedback/server.ts:20-66` |
| Client feedback event helper also writes `expiresAt` for authenticated feedback event paths. | `src/database/guestFeedback/index.ts:305-348` |
| Retention function deletes expired raw feedback docs in batches. | `functions/src/analytics/guestFeedbackRetention.ts:1-20`, `functions/src/analytics/guestFeedbackRetention.ts:60-143` |
| Maintenance scheduler deletes expired feedback events and timestamp-only legacy event docs after the event retention window. | `functions/src/schedulers/menulistMaintenanceScheduler.ts:573-602`, `functions/src/schedulers/menulistMaintenanceScheduler.ts:801-818`, `functions/src/schedulers/menulistMaintenanceScheduler.ts:1022-1027` |
| Business Health feedback summary reads recent guest feedback and redacts/summarizes contact-sensitive content. | `functions/src/ownerBusinessAssistant/buildOwnerBusinessFeedbackSummary.ts:15-18`, `functions/src/ownerBusinessAssistant/buildOwnerBusinessFeedbackSummary.ts:67-77`, `functions/src/ownerBusinessAssistant/buildOwnerBusinessFeedbackSummary.ts:226-264` |

## 8. Business Health and Owner Business Assistant

| Claim | Evidence |
| --- | --- |
| Business Health builder composes analytics index, feedback summary, blocks, source refs, suggested checks, and current doc data. | `functions/src/ownerBusinessAssistant/buildOwnerBusinessHealthSnapshot.ts:29-76`, `functions/src/ownerBusinessAssistant/buildOwnerBusinessHealthSnapshot.ts:82-196` |
| Business Health writers write current/snapshot/analytics-index/multi-location docs under `platformSummary` with expiry and packet invalidation. | `functions/src/ownerBusinessAssistant/ownerBusinessHealthWriters.ts:44-100` |
| Assistant answer events store truncated Q/A, status/confidence/cache/source facts/domain/action/provider/cost and expiry. | `src/lib/ownerBusinessAssistant/server/answerEventLogger.ts:11`, `src/lib/ownerBusinessAssistant/server/answerEventLogger.ts:32-74` |
| Assistant threads store short-lived trimmed message history. | `src/lib/ownerBusinessAssistant/server/threadStore.ts:8-9`, `src/lib/ownerBusinessAssistant/server/threadStore.ts:49-116` |
| Assistant actions and drafts have explicit retention windows and write audit/draft docs. | `src/lib/ownerBusinessAssistant/actions/actionAuditLogger.ts:11`, `src/lib/ownerBusinessAssistant/actions/actionAuditLogger.ts:21-56`, `src/lib/ownerBusinessAssistant/actions/actionDraftBuilder.ts:9-37` |
| Assistant feedback API writes 90-day feedback docs. | `src/app/api/owner-business-assistant/feedback/route.ts:17`, `src/app/api/owner-business-assistant/feedback/route.ts:63-72` |
| Maintenance scheduler deletes expired owner-business-assistant docs and snapshots. | `functions/src/schedulers/menulistMaintenanceScheduler.ts:839-885` |

## 9. AI, extraction, link imports, image jobs, and public drafts

| Claim | Evidence |
| --- | --- |
| AI operation log stores cost/token/model/accounting context under `menulistAiOperations/{tId}/{sId}` and defaults raw provider response storage to accounting-only mode. | `src/lib/ai/operationLog.ts` |
| AI operations API reads operation docs and sanitizes platform-only fields for owner responses. | `src/app/api/ai-operations/route.ts:1-80`, `src/app/api/ai-operations/route.ts:242-279` |
| Menu extraction jobs write files/source metadata, project/business context, status, tenant/store/user, and target languages. | `src/app/api/menu-extraction/jobs/route.ts:600-677` |
| Menu link import stores source artifact in Storage and writes artifact metadata plus an extraction job. | `src/app/api/menu-link-imports/route.ts:156-239` |
| Processing jobs update public drafts with extracted/detected business data or failure state. | `functions/src/logic/processMenuImagesJob.ts:490-541` |
| Extraction result storage includes combined data, business profile, quality/confidence, short-lived raw batch metadata, timings, file results, token/credit accounting, and detail-retention metadata. | `functions/src/logic/processMenuImagesJob.ts`, `functions/src/schedulers/menuJobCleanup.ts` |
| Public create-menu route creates extraction jobs and public draft docs with file/link/source/IP/claim/expiry fields. | `src/app/api/public/create-menu/route.ts:220-358`, `src/app/api/public/create-menu/route.ts:480-511` |
| Maintenance scheduler deletes unclaimed expired public drafts and associated Storage image paths. | `functions/src/schedulers/menulistMaintenanceScheduler.ts:482-544` |
| Image batch processing writes job status/history/generated item/image results and failure state under scoped job paths, with status history capped. | `src/database/imageBatchProcessing/server.ts`, `src/database/imageBatchProcessing/index.tsx` |
| Business copy generation uses AI accounting with cleaned response, model/tokens/cost, and request context. | `src/app/api/business-copy/route.ts:221-295` |
| Review reply suggestion uses pasted review/rating, fallback/AI reply, and AI operation accounting. | `src/app/api/reviews/suggest/route.ts:101-180`, `src/app/api/reviews/suggest/route.ts:201-258` |

## 10. Billing and payments

| Claim | Evidence |
| --- | --- |
| Razorpay webhook idempotency writes `razorpayWebhookEvents` process state, event type/id, retry count, and lock timestamps. | `src/app/api/razorpay/webhook/route.ts:65-125` |
| Payment audit records include product/tenant/store, event, payment/subscription/order/invoice ids, amount/currency/status/method/card/UPI/pack fields. | `src/app/api/razorpay/webhook/route.ts:134-190` |
| Subscription webhook update stores payment method summary, billing history, cycle dates, credits, webhook status, and status events. | `src/app/api/razorpay/webhook/route.ts:430-490` |

## 11. Messaging, notifications, alerts, health, scheduler, and POS

| Claim | Evidence |
| --- | --- |
| Legacy lifecycle messaging uses `messageLogs` for idempotency/rate limit, resolves store recipient email, sends email, and logs status/recipient/subject/provider/error with expiry metadata. | `functions/src/messaging/messagingEngine.ts`, `functions/src/messaging/types.ts` |
| Owner notification registry defines event/delivery/rate-limit collections and trigger types. | `functions/src/sharedData/ownerNotificationRegistry.ts:1-38`, `functions/src/sharedData/ownerNotificationRegistry.ts:40-120` |
| Owner notification processor resolves recipient info from stores, including email/billing email/WhatsApp number and consent. | `functions/src/ownerNotifications/processor.ts:184-220` |
| Owner notification rate limits store per-recipient-hash and per-store daily counts with expiry metadata. | `functions/src/ownerNotifications/processor.ts` |
| Owner notification deliveries store recipient hash/masked value, status, subject, template, provider id, error, sent timestamp, and expiry metadata. | `functions/src/ownerNotifications/processor.ts` |
| Owner notification events store trigger metadata, processing status, expiry metadata, and failures can create platform alerts. | `functions/src/ownerNotifications/processor.ts` |
| System alerts store alert type/severity/title/message/metadata/action/ack fields and can deliver platform/Telegram alerts. | `functions/src/monitoring/alerts.ts:19-38`, `functions/src/monitoring/alerts.ts:121-205` |
| System health reports write daily tenant/store health docs with 7-day expiry. | `functions/src/monitoring/healthCheck.ts:301-322` |
| Scheduler run logs are persisted only when a run has activity or failure. | `functions/src/schedulers/menulistMaintenanceScheduler.ts:284-311` |
| POS sync writes capped delivery logs and updates store `posSync` status fields. | `src/app/api/pos-sync/deliver/route.ts:80-141`, `src/app/api/pos-sync/deliver/route.ts:200-245` |

## 12. Compliance, reviews, and integrations

| Claim | Evidence |
| --- | --- |
| Compliance pages use an overrides-only data model and store only owner custom privacy/terms/refund override fields. | `src/database/compliance/index.ts:1-17`, `src/database/compliance/index.ts:19-78`, `src/database/compliance/server.ts:1-45`, `src/app/api/compliance/route.ts:1-12`, `src/app/api/compliance/route.ts:24-87`, `src/app/api/compliance/route.ts:95-130` |
| Review state endpoint reads only active boolean block/escalation state with expiry. | `src/app/api/reviews/states/route.ts:1-24`, `src/app/api/reviews/states/route.ts:46-77` |
| Review/reputation docs include broader GBP ingestion plans, but current docs warn routes/components should not be marketed as live until GBP ingestion exists and UI is intentionally mounted. | `__docs__/reputation-protection/reputation-protection_impl.md:114-142` |
| GBP integration DAL defines server-only token path and token/connection/sync-state shapes, but functions are placeholders awaiting API access. | `src/database/integrations/gbp.ts:1-13`, `src/database/integrations/gbp.ts:18-81`, `src/database/integrations/gbp.ts:83-160` |

## 13. Retention and cleanup

| Claim | Evidence |
| --- | --- |
| Daily customer analytics has a 90-day raw daily delete path. | `functions/src/aggregateCustomerAnalytics.ts:24-55` |
| Guest feedback retention deletes expired raw guest feedback in batches. | `functions/src/analytics/guestFeedbackRetention.ts:1-20`, `functions/src/analytics/guestFeedbackRetention.ts:60-143` |
| Feedback event retention deletes expired and legacy feedback event docs through the consolidated scheduler. | `functions/src/schedulers/menulistMaintenanceScheduler.ts:573-602`, `functions/src/schedulers/menulistMaintenanceScheduler.ts:801-818`, `functions/src/schedulers/menulistMaintenanceScheduler.ts:1022-1027` |
| Public drafts cleanup deletes unclaimed expired drafts and Storage images. | `functions/src/schedulers/menulistMaintenanceScheduler.ts:482-544` |
| Owner-business-assistant cleanup deletes expired current/snapshot/action/draft/event/feedback/thread docs. | `functions/src/schedulers/menulistMaintenanceScheduler.ts:839-885` |
| Maintenance scheduler run logs carry `expiresAt`; the same scheduler deletes expired and legacy startedAt-only run logs. | `functions/src/schedulers/menulistMaintenanceScheduler.ts:296-311`, `functions/src/schedulers/menulistMaintenanceScheduler.ts:605-635`, `functions/src/schedulers/menulistMaintenanceScheduler.ts:820-837`, `functions/src/schedulers/menulistMaintenanceScheduler.ts:1028-1033` |
| Hourly decision scheduler and manual store recovery run logs also carry `expiresAt`. | `functions/src/decisionBlocksScoring.ts:1151-1165`, `functions/src/decisionBlocksScoring.ts:2016-2036`, `functions/src/decisionBlocksScoring.ts:2132-2144` |
| System health reports carry a 7-day expiry field. | `functions/src/monitoring/healthCheck.ts:301-322` |
| POS delivery logs are capped to the latest 20 entries. | `src/app/api/pos-sync/deliver/route.ts:215-227` |
| MenuList maintenance scheduler now handles AI operation detail cleanup, menu snapshot cleanup, and owner-notification retention cleanup through existing task leases/cadences. | `functions/src/schedulers/menulistMaintenanceScheduler.ts` |

## 14. Related feature docs reviewed

| Area | Docs |
| --- | --- |
| Menu Health Monitor | `__docs__/menu-health-monitor/` |
| Menu Trust Signals | `__docs__/menu-trust-signals/` |
| Menu Correctness Engine | `__docs__/menu-correctness-engine/` |
| Menu Command Center | `__docs__/menu-command-center/` |
| Lifecycle messaging | `__docs__/lifecycle-messaging/` |
| Owner notifications | `__docs__/owner-notifications/` |
| Reviews/reputation | `__docs__/reviews-reputation/`, `__docs__/reputation-protection/` |
| Compliance pages | `__docs__/compliance-pages/` |
| GBP sync | `__docs__/gbp-sync/` |
