# MenuList SignalDesk - Firebase Cost Plan

**Status:** Foundation config, governed workflow rails, investment controls, and bounded Revenue Operating Layer implemented and locally verified; cloud deploy remains owner-access blocked
**Created:** June 23, 2026
**Last Updated:** July 11, 2026
**Cost impact now:** Local verification only; no deployed SignalDesk project or production data writes.
**Runtime posture:** Dedicated SignalDesk Firebase projects are configured in code but still need owner-side project creation/access before deployment.

## Firebase Target Decision

Proposed projects, not created:

| Environment | Proposed Firebase project |
| --- | --- |
| QA/local | `menulist-signaldesk-qa` |
| Production | `menulist-signaldesk` |

Do not store SignalDesk target, contact, source, message, or suppression data inside MenuList's `menulist` or `menulist-qa` Firestore projects except through a narrow outcome bridge.

Implementation files created:

```txt
firebase-signaldesk.json
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
storage-signaldesk.rules
src/lib/firebase/signaldeskConfig.ts
src/lib/firebase/signaldeskFirebaseClient.ts
src/lib/firebase/signaldeskFirebaseAdmin.ts
functions-signaldesk/
```

Environment variables must use the full `MENULIST_SIGNALDESK_*` prefix. Do not create shorthand env keys such as `SD_*`.

## Cost Principles

SignalDesk must be summary-first.

Hard rules:

1. No dashboard reads raw event collections.
2. No broad real-time listeners.
3. No offset pagination.
4. No giant target documents.
5. No message arrays inside target documents.
6. No raw webhook payloads in Firestore.
7. No raw scraped payloads in Firestore.
8. No source-provider run without source policy and cost cap.
9. No AI worker without typed output, prompt version, eval status, and budget cap.
10. No send/export without suppression check.
11. No mobile raw PII reads.
12. No campaign dashboard from raw messages.
13. No SignalDesk UI reads from MenuList `stores`, `projects`, customer sessions, or owner dashboard collections.
14. No SignalDesk Cloud Function runs in the default MenuList `functions/` codebase unless it is a tiny MenuList-owned bridge endpoint.
15. No AI call from list screens, dashboards, or mobile summaries.
16. No provider webhook writes raw payloads to Firestore.
17. No contact reveal without audit and role permission.
18. No trust-partner deal, brief, deliverable, or metrics dashboard should read raw social payloads by default.
19. No content distribution screen should auto-publish or read raw third-party social payloads by default.
20. No SignalDesk action or kill-switch route may parse unbounded JSON; the shared API guard caps JSON bodies at 256KB before validation, access checks, provider/source work, AI work, or SignalDesk Firestore writes.
21. No revenue screen scans raw messages/events or MenuList store/project trees; it reads bounded SignalDesk records plus `signaldeskRevenueControlSummaries/current`.

The corrected review explicitly recommends summary docs such as `leadSummaries`, `targetSummaries`, `conversationSummaries`, `campaignSummaries`, `channelHealthSummaries`, `costDailySummaries`, and `sourceRunSummaries` (`../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:359`).

Body admission note: rejected oversized or malformed SignalDesk action/kill-switch bodies create no SignalDesk Firestore reads/writes and make no provider or AI calls.

Route diagnostic note: overview, workspace, action, kill-switch, and overview-loader failures now use bounded SignalDesk runtime diagnostics. Action and kill-switch validation failures return generic invalid-input responses, and route callsites do not forward validation detail values into security logs. Shared API guard security events for validation failures, permission failures, rate-limit rejections, and malformed JSON now log bounded route/session metadata plus endpoint/method/action/permission/feature presence-length fields instead of raw `buildSecurityContext()` output. This changes log metadata only and adds no Firestore reads/writes, Storage operations, provider calls, AI calls, Cloud Functions, cache tags, rules, indexes, or deploy requirement.

Client DAL response note: SignalDesk overview, workspace, action, and kill-switch callers now parse API route responses through a 1 MB bounded reader, require the `{ data }` envelope, and guard overview/workspace shapes before local state changes. Malformed, oversized, rejected, or wrong-shape route responses log `signaldesk_client_response_parse_failed`, `signaldesk_client_response_rejected`, or `signaldesk_client_response_invalid` from the browser/client DAL with operation, response status, mobile-client state, and bounded action/section/scope presence/length metadata. The UI still receives fixed internal-tool failure copy only. This changes client-side response acknowledgement and observability only and adds no Firestore reads/writes, Storage operations, provider calls, AI calls, Cloud Functions, cache tags, rules, indexes, or deploy requirement.

## Summary-First Screen Contract

| Screen | Default reads | Detail reads allowed |
| --- | --- | --- |
| `/signaldesk` | `signaldeskControlRoomSummaries`, `signaldeskQueueSummaries`, `signaldeskCostDailySummaries` | No raw events |
| `/signaldesk/targets` | `signaldeskTargetSummaries` | Target detail only after opening a target |
| `/signaldesk/imports` | `signaldeskSourceRunSummaries` | Import rows only after opening a run |
| `/signaldesk/approvals` | `signaldeskApprovalQueue` and compact target refs | Evidence/draft detail only after opening a work item |
| `/signaldesk/inbox` | `signaldeskConversationSummaries` | Messages only after opening a conversation |
| `/signaldesk/attribution` | `signaldeskOutcomeSummaries` | Attribution touches only after opening a target/action |
| `/signaldesk/settings` | `signaldeskConnectorSettings`, `signaldeskSenderDomains`, `signaldeskChannelHealthSummaries`, `signaldeskProviderAccounts` | No raw secrets; no provider payloads |
| `/signaldesk/sources` | `signaldeskProviderSourceRetention`, `signaldeskProviderEvaluations`, `signaldeskSourceRunSummaries`, `signaldeskVendorRuns`, `signaldeskEnrichmentResults` | Provider-source refresh status and evaluation summaries only; no raw provider payloads |
| `/signaldesk/content` | `signaldeskContentSources`, `signaldeskContentAssets`, `signaldeskContentDistributionDrafts`, `signaldeskContentCalendarItems`, `signaldeskContentPerformanceSummaries`, plus CTA/market-pod summaries | Draft body is internal review material only; no auto-publish and no raw social payloads |
| `/signaldesk/partners` | `signaldeskTrustPartnerProfiles`, `signaldeskTrustPartnerNicheTests`, `signaldeskTrustPartnerDeals`, `signaldeskTrustPartnerBriefs`, `signaldeskTrustPartnerDeliverables`, `signaldeskTrustPartnerMetrics`, `signaldeskTrustPartnerRenewalDecisions` summaries | Brief/deal/metric detail only after opening a record; no raw social payloads |
| `/signaldesk/revenue` | `signaldeskRevenueControlSummaries/current` plus bounded revenue accounts, commercial opportunities/offers, operating envelopes, activation watches, and referenced policy summaries | No raw messages/events and no MenuList store/project/menu/billing reads |
| `/signaldesk/control-room` | Control-room, channel, source, AI, queue, cost summaries | Raw incident/debug reads only after admin drill-down |

No default screen may subscribe to a raw collection with a real-time listener.

## Hot Collections

| Collection | Purpose | Normal UI reads |
| --- | --- | --- |
| `signaldeskTargetSummaries` | Target list rows | Paginated list, filtered by status/segment/updatedAt |
| `signaldeskTargets` | Target detail | Single target detail |
| `signaldeskSourceRunSummaries` | Import/source-run dashboard | Recent bounded list |
| `signaldeskSourcePolicies` | Approved source rules | Small policy list |
| `signaldeskContactIdentities` | Contact/channel identities | Target detail only |
| `signaldeskChannelIdentities` | Email/phone/WhatsApp/social identities | Target detail only |
| `signaldeskSuppressionLedger` | Unsubscribe/DNC/wrong-contact/complaint/bounce | Identity lookup only |
| `signaldeskEvidencePacketSummaries` | Evidence rows | Target detail only |
| `signaldeskDecisionSnapshots` | Decision trail | Target/campaign detail only |
| `signaldeskTemplateSummaries` | Template list | Small policy list |
| `signaldeskApprovalQueue` | Human review queue | Paginated queue |
| `signaldeskConversationSummaries` | Inbox rows | Paginated list |
| `signaldeskCampaignSummaries` | Campaign/sequence summaries | Small list |
| `signaldeskOutcomeSummaries` | MenuList outcome attribution | Summary dashboard |
| `signaldeskDemandSignalSummaries` | QR/link/share/claim signals | Summary dashboard |
| `signaldeskChannelHealthSummaries` | Sender/channel health | Small summary list |
| `signaldeskConnectorSettings` | Email, Meta, Apify, and fallback sequencer connector metadata plus env-derived readiness | Settings/channels summary list |
| `signaldeskCostDailySummaries` | Daily cost by source/worker/channel | Small summary list |
| `signaldeskIncidents` | Safety/compliance incidents | Paginated list |
| `signaldeskKillSwitches` | Emergency controls | Small list |
| `signaldeskAuditEvents` | Mutation/contact reveal/send/export audit | Bounded audit list only |
| `signaldeskIdentityIndex` | Dedupe lookup by normalized identity hash | Point lookup only |
| `signaldeskAiOperationLedger` | AI operation accounting | Cost/debug summary writer only |
| `signaldeskIdempotencyKeys` | Retry and webhook dedupe | Point lookup only |
| `signaldeskProviderAccounts` | Provider account/use approval and spend caps | Small policy/admin list |
| `signaldeskBudgetPolicies` | Per-provider/global/route/pod budget caps | Small policy/admin list |
| `signaldeskVendorRuns` | Provider run readiness/cost/result summary | Recent bounded list |
| `signaldeskEnrichmentResults` | Normalized field-level enrichment output | Target/source detail and bounded source list |
| `signaldeskEnrichmentWaterfalls` | Provider order, stop rules, max credits, retention | Small policy/admin list |
| `signaldeskModelRoutes` | AI task route, provider/model, status, cost cap | Small policy/admin list |
| `signaldeskModelEvals` | Cumulative AI route quality and founder shadow-review summary | AI/admin summary list |
| `signaldeskApprovalPackets` | Owner-ready decision packet | Approval queue/detail list |
| `signaldeskMarketPods` | System recommendation plus explicit founder approve/hold/reject evidence; unreviewed pods remain held and zero-budget | Attribution/control-room summary and envelope policy check |
| `signaldeskAudienceSegments` | Dynamic signal/source/outcome criteria | Attribution/control-room summary |
| `signaldeskSequencerHandoffs` | Owned email queue plus optional external execution-rail readiness | Channels summary list |
| `signaldeskSequencerSteps` | Owned email step state, schedule, body preview, send status | Channels summary list and reserved due-step worker |
| `signaldeskSenderDomains` | Sender auth/ramp/bounce/complaint/unsubscribe/risk | Channels/control-room summary |
| `signaldeskRunTimelines` | Founder-readable run trace | Control-room bounded list |
| `signaldeskSelfServiceCtas` | Proof/activation CTA copy | Template/control-room summary |
| `signaldeskRevenueAccounts` | Organization/location-aware commercial identity linked to existing targets | Revenue bounded list and point detail |
| `signaldeskCommercialOpportunities` | Qualified commercial stage, offer-derived currency/value, probability, next action, reasons, and founder attention | Revenue bounded list and account detail |
| `signaldeskCommercialOffers` | Immutable standard offer versions, price, discount authority, eligibility, and founder conditions | Small policy/offer registry |
| `signaldeskOperatingEnvelopes` | Referenced source/offer/pod/budget/sender/template controls, caps, approval mode, and execution boundary | Small current/recent policy list |
| `signaldeskActivationWatches` | Activation state automatically derived through indexed latest/earliest/terminal SignalDesk outcome-summary reads; elapsed deadlines are annotated stalled on bounded reads | Revenue bounded list and target point detail |
| `signaldeskRevenueControlSummaries` | One-currency pipeline, weighted value, wins/losses, activation/stall, and founder-attention totals | One `current` summary document |
| `signaldeskContentSources` | Source registry for owned proof and content inputs | Content summary list |
| `signaldeskContentAssets` | Canonical content messages, proof level, CTA, audience, and risk notes | Content summary list |
| `signaldeskContentDistributionDrafts` | Platform-ready drafts with approval and schedule state | Content review list |
| `signaldeskContentCalendarItems` | Queued internal content calendar items | Content calendar list |
| `signaldeskContentPerformanceSummaries` | Compact views/clicks/owner-signal records | Content performance list |

## Cold / Detail Collections

| Collection | Purpose | UI rule |
| --- | --- | --- |
| `signaldeskSourceCandidates` | Imported raw candidate metadata after normalization | Not a dashboard source |
| `signaldeskImportRows` | Import row status and validation errors | Import detail only |
| `signaldeskEvidencePackets` | Full evidence and rejected facts | Target detail/debug only |
| `signaldeskMessages` | Conversation messages | Conversation detail only |
| `signaldeskMessageEvents` | Delivery/click/reply events | Never dashboard scan |
| `signaldeskAiWorkerRuns` | AI worker input/output summary | Admin/debug only |
| `signaldeskEvalRuns` | AI eval results | Admin QA only |
| `signaldeskWebhookEvents` | Normalized provider webhook events | Admin/debug only |
| `signaldeskAttributionTouches` | Full attribution chain | Analytics/export only |
| `signaldeskDataRequests` | Access/correction/deletion requests | Compliance only |

## Write Optimization Contract

Each mutation should write in one bounded unit of work:

1. canonical detail doc or append-only event;
2. compact summary update;
3. audit event;
4. idempotency record for retryable/external actions;
5. cost ledger record when AI, provider, import, webhook, or export work runs.

Use server transactions only when state consistency requires them. Use batched writes for import rows and summary updates. Do not add new API routes that only re-read Firestore data already available through a product-local DAL.

Operating-envelope writes use a server transaction that rereads the current source policies, offer, founder-approved pod, optional revenue budget, sender identity, templates, and immutable envelope version before any write.

## Import Optimization

| Step | Optimization |
| --- | --- |
| Upload | Store original file in Storage with lifecycle policy. |
| Normalize | Strip blocked fields before Firestore writes. |
| Allowed-use guard | Do not normalize, hash, store, index, or suppress-check email/phone/social contact values when the source policy disallows contact use. |
| Dedupe | Compute identity hashes and query `signaldeskIdentityIndex` by doc ID. |
| Write | Batch rows in bounded chunks. |
| Errors | Store compact row errors, not raw row payloads in dashboards. |
| UI | Read `signaldeskSourceRunSummaries` by status/date. |

## AI Cost Optimization

| Worker | Cache key |
| --- | --- |
| Fit/current-list scoring | `targetEvidenceHash + workerVersion + ruleVersion` |
| Evidence summary | `sourceFactHash + policyVersion + workerVersion` |
| Draft generation | `templateVersion + variableHash + evidenceHash + guardrailVersion` |
| Reply classification | `messageHash + classifierVersion + ruleVersion` |

Rules:

- no AI calls from default list/dashboard/mobile views;
- daily worker budgets stored in `signaldeskCostDailySummaries`;
- each AI call writes `signaldeskAiOperationLedger`;
- eval samples are capped;
- low-confidence output writes review work, not action.
- malformed or non-object provider output logs bounded `signaldesk_ai_response_parse_failed` or `signaldesk_ai_response_shape_invalid` diagnostics and fails before AI worker run, decision snapshot, operation ledger, eval, provider-spend, timeline, or cost-summary writes.

## Webhook and Provider Optimization

- Verify provider signatures before writes where supported.
- Dedupe by provider event ID through `signaldeskIdempotencyKeys`.
- Normalize payloads into compact event docs.
- Store raw payloads only in Storage when proof is required.
- Update conversation/channel/source summaries in the same worker path.
- Pause channel automatically when complaint/bounce thresholds cross configured limits.

## Product Boundary Cost Rule

MenuList bridge reads/writes must be sparse and event-shaped:

| Allowed | Blocked |
| --- | --- |
| route token lookup | broad MenuList `stores` scan |
| compact outcome event | direct MenuList `projects` write |
| linked MenuList reference ID | public menu publish mutation |
| attribution touch | owner billing mutation |
| operator evidence note | customer session copy |

Any MenuList-side bridge route must document its reads/writes in both SignalDesk and MenuList docs before implementation.

## Storage

Use Cloud Storage for:

- original CSV/import files;
- large source payloads if retention policy allows;
- raw provider webhook payloads when needed for short-lived audit;
- evidence bundles too large for Firestore;
- exports;
- AI eval datasets;
- incident evidence packages.

Firestore stores refs, hashes, timestamps, status, compact normalized fields, and retention class.

## Read / Write Cost Model

| Flow | Expected reads | Expected writes | Cost control |
| --- | ---: | ---: | --- |
| Manual import 100 rows | 100-400 dedupe/suppression reads | 100 candidate writes + summary writes | Batch writes, hash keys, contact-scoped suppression checks, no raw payload dashboard. |
| Target list page | 1 paginated query | 0 | Summary collection only, page size 20-50. |
| Target detail | 5-12 doc reads | 0 | Read only selected detail docs. |
| AI score target | 2-5 reads | 2-4 writes | Cache by target evidence hash. |
| Evidence packet | 2-5 reads | 1-3 writes | Store large evidence in Storage. |
| Draft message | 3-6 reads | 1-2 writes | Template + target + evidence only; no full history. |
| Approve action | 2-4 reads | 2-5 writes | Write approval, decision snapshot, audit event. |
| Export/send email | 5-10 reads | 3-8 writes | Recheck suppression and sender; write compact events. |
| Queue owned email step | 7-12 reads | 5-8 writes | Reuses approved-message, source-policy, sender-domain, pause, and prior-contact checks; writes handoff, step, audit, timeline, and cost. |
| Send owned email step | 7-12 reads | 8-12 writes | Rechecks pauses, suppression, recipient, email env; writes message export, conversation, handoff, step, target, audit, timeline, and channel health. |
| Save connector setting | 1-4 reads | 3-5 writes | Writes connector metadata, channel or source status, audit, control summary, and cost summary. No raw secrets stored. |
| FHRS/FHIS source provider run | 4-8 reads plus per-row import checks | Import-path writes plus 4-7 provider ledger writes | Requires active provider source policy, evidence-use permission, provider account/budget, feature flag, and per-run cap. Calls free FSA API v2, stores normalized establishment rows and provider-source retention only, and does not store contact identities from FHRS/FHIS. |
| Research Agent Table | Source policy lookup, provider run/import reads, provider-source retention lookup, latest table workspace reads | 1 research run, provider-run/import writes, one row write per result, one market-pod update, optional idempotency key, audit, timeline, and cost summary | Caps provider results at 30, reuses governed source-provider runs, stores enrichment/source refs only, and does not bypass source policy or contact-use rules. Exhausted provider source-policy scans log bounded candidate/rejected counts and add no extra Firestore reads/writes. |
| Apify source provider run | 4-8 reads plus per-row import checks | Import-path writes plus 4-7 provider ledger writes | Requires Apify provider account, budget policy, active provider source policy, evidence-use permission, env token/Actor readiness, and per-run cap. Stores normalized target rows and webhook payload hashes only. |
| Generate content drafts | 2-4 reads | 3 + selected channel count writes | Reads one content asset and CTA, writes one draft per channel plus audit, timeline, queue summary, and cost summary. |
| Schedule content draft | 1-2 reads | 4 writes | Requires approved content draft; writes draft schedule state, calendar item, audit, timeline, and cost summary. Does not publish. |
| Record content performance | 1-2 reads | 4-5 writes | Writes compact performance summary; writes demand summary only when owner-quality signals exist. |
| Reply capture | 2-6 reads | 3-8 writes | Update conversation summary and target summary. |
| Outcome event | 2-5 reads | 3-6 writes | Update attribution and summaries, no raw scan. |
| Dashboard load | 5-15 summary reads | 0 | No raw event/message reads. |
| Provider budget check | 2-4 reads | 0-2 writes | Read provider account and budget policy; increment spend only after an approved run actually spends. |
| Enrichment waterfall run | 5-9 reads | 4-5 writes | Check source-provider pause first, reuse existing approved source value when available, otherwise write one ready/blocked vendor summary, result record, timeline, audit, and cost record without external spend. |
| AI route run | 5-9 reads | 6-10 writes | Check AI-worker pause first; read route/account/budget/evidence, write AI run, snapshot, ledger, eval, spend, timeline, and cost summary. |
| AI shadow review | 3 transactional reads including the optional current revenue summary | 4-6 writes | Founder-only desktop action updates the existing AI run and model-eval summary, adjusts existing revenue attention when present, and writes audit/timeline/cost; no new collection or raw output copy. |
| Approval packet | 4-8 reads | 3-5 writes | Read target/draft/evidence/CTA/sender, write packet, timeline, audit, and optional approval pointer. |
| Sequencer handoff | 6-10 reads | 3-5 writes | Check approved message, prior contact, provider account, and sender domain; write ready/blocked handoff only. |

## Index Strategy

Minimum indexes:

- target summaries by status + updatedAt;
- target summaries by segment + updatedAt;
- target summaries by nextAction + updatedAt;
- approval queue by status + priority + dueAt;
- evidence packet summaries by targetId + updatedAt;
- conversation summaries by status + lastMessageAt;
- suppression ledger by identityHash + channel;
- audit events by actorId + createdAt;
- incidents by status + severity + updatedAt;
- cost daily summaries by date + category;
- outcome summaries by date + source/channel.

Do not index:

- raw message body;
- raw source payload fields;
- raw webhook payload refs;
- AI prompt text;
- full evidence text;
- unrestricted contact values.

## Retention Defaults

| Data | Default retention |
| --- | --- |
| Import CSV | 30 days unless approved longer |
| Source candidate raw payload | 30 days max unless source policy says shorter |
| Evidence packet summary | 12 months |
| Message body | Minimum necessary; exact retention needs compliance decision |
| Suppression ledger | Indefinite or legal minimum needed to avoid recontact |
| Audit events | 24 months minimum |
| AI worker run detail | 90 days, summaries longer |
| Cost summaries | 24 months |

## Implemented Firebase Foundation

| Area | Current implementation |
| --- | --- |
| Firebase CLI config | `firebase-signaldesk.json` points to `functions-signaldesk`, `firestore-signaldesk.rules`, `firestore-signaldesk.indexes.json`, and `storage-signaldesk.rules`. |
| Firestore rules | Default deny; platform admins and active SignalDesk team members can read allowed collections; all client writes are denied. |
| Storage rules | Default deny; internal import/evidence/export/incident paths are read-restricted; all client writes/deletes are denied. |
| Indexes | Summary-first indexes added for targets, approval queue, evidence packet latest-by-target reads, conversations, suppression, audit, incidents, cost, and outcomes. |
| Admin config | `signaldeskFirebaseAdmin` resolves shared/separate mode, full SignalDesk env names, and optional Firestore database ID. |
| Client config | `signaldeskFirebaseClient` resolves shared/separate mode without using the default MenuList client for separate projects. |
| Functions | `functions-signaldesk` builds locally; provider webhooks, AI workers, and scheduled summaries are flag-disabled in the skeleton. |
| Investment controls | Provider accounts, budget policies, vendor runs, enrichment results, waterfalls, model routes/evals, approval packets, market pods, audience segments, channel windows, provider-source retention, strategist memos, provider evaluations, sequencer handoffs, sender domains, run timelines, self-service CTAs, and content distribution summaries are product-local collections. |
| Rules for new controls | Client reads are limited to platform admins or active SignalDesk team members; client writes remain denied for every new investment-control collection. |

## Implemented Write Paths

| Flow | Runtime write behavior | Cost control |
| --- | --- | --- |
| Default seed | Writes source policy, template, provider accounts, budget policies, model routes, default market pod, audience segment, CTA, waterfall, sender domain, timeline, audit event, and daily cost summary. | Admin-only action, idempotent doc IDs for core defaults, and existing provider/budget spend counters are preserved. |
| Manual import | Writes source run summary, target summary/detail, source candidate, identity index, contact identity when present, audit event, control summary, and cost summary. | Capped at 50 rows per request; no dashboard reads raw import rows. |
| Target score | Writes AI worker run, decision snapshot, AI operation ledger, target summary update, audit event, and cost summary. | Rules-based zero-provider-cost scoring until AI provider/eval budget is approved. |
| Evidence packet | Writes evidence detail, evidence summary, target summary update, audit event, and cost summary. | Detail reads only after target action; summaries feed list views. |
| Draft and approval | Writes draft summary, approval queue item, approval packet, run timeline, target summary update, queue summary, audit event, and cost summary. | Human approval remains mandatory before export; draft carries evidence refs and CTA refs. |
| Export | Writes message export, prepared conversation summary, target next-action update, approval/draft status update, audit event, and cost summary. | Export-only; preparation does not mark contact complete and provider send remains disabled. |
| Manual contact confirmation | Reads target detail/summary, current source policy, relevant kill switches, current conversation, and up to 20 existing exports only for `email-export`; writes one existing run-timeline doc, target/conversation projections, audit, daily cost, and optional wrong-contact suppression. | No new collection or index. Deterministic `batch.create` makes retries atomic; email completion requires a fresh unconsumed export; non-wrong-contact projections never rewrite suppression/contactability; no raw contact value, message body, provider payload, send, follow-up, or MenuList truth write is added. |
| Assisted channel handoff | Writes message export, conversation summary, approval/draft status update, channel health summary, target summary update, audit event, and cost summary. | Requires approved draft, clear suppression, contact-use approval, inactive channel/global kill switches, and email contact readiness when channel is email. |
| Provider send | Writes message export, conversation summary, approval/draft status update, channel health summary, target summary update, audit event, and cost summary after provider success. | Runtime adapter exists but global provider-send flag remains false until compliance setup is complete. Meta API calls use manual redirect handling, successful Meta responses are parsed through a 64KB bounded JSON reader, malformed successful response JSON logs `signaldesk_meta_response_parse_failed`, and only bounded provider message IDs are retained. |
| Provider webhook | Writes normalized webhook event, optional inbound message/conversation, optional suppression event, channel/source health summary, and queue summary where relevant after signature/secret verification, object-shaped body parsing, and provider-event signal detection. | Requires HMAC/shared-secret verification, stores payload hash instead of raw payload, rejects empty/malformed/non-object/no-event bodies before writes, logs rejected webhook plus body parse/shape/event-shape failures with stable local codes, and uses deterministic payload-hash fallback event IDs instead of random IDs. |
| Source provider run | Checks source-provider pause, calls approved source provider, writes source-run/import docs through the import path, source health summary, vendor run, run timeline, audit event, provider spend, and provider cost estimate. | Google Places uses a narrow field mask and no contact fields. Google Places, FHRS/FHIS, and Apify source-provider calls use manual redirect handling. FHRS/FHIS uses the free official FSA API v2 as source/evidence only and does not map contact fields. Apify uses env-controlled Actor ID, 1-30 row cap, max charge cap, no raw dataset storage, source-policy contact stripping, a 512KB bounded JSON response cap, and bounded parse-failure diagnostics. Foursquare is blocked pending source approval. |
| Research agent run | Writes research run status, provider-backed target rows, research table rows, market-pod summary, run timeline, audit event, idempotency key when provided, and cost summary. | Prompt-to-table only; capped at 30 rows; blocked audits use stable local codes; no send, no social action, no public page, no raw provider payload storage, and no MenuList truth writes. |
| AI assist | Checks AI-worker pause, uses only the `MENULIST_SIGNALDESK_GEMINI_AI_KEY*` pool through a scoped key manager, and writes AI worker run, decision snapshot, AI operation ledger, exact `cumulative-v1` model-eval counters, run timeline, provider spend, audit event, and cost summary only after provider output parses as object-shaped JSON. Non-reconstructable legacy sample/rate values are retained separately when the exact window begins. | AI route must be active, Gemini-backed, and within provider/budget policy; no MenuList/Answerlattice AI-key fallback and no AI calls from dashboard/list/mobile views. Malformed or non-object provider output logs bounded parse/shape diagnostics and does not write AI result ledgers. |
| AI shadow review | Transactionally stores founder decision/reason/minutes on an existing provider-backed AI run, reverses any prior decision contribution, recomputes model-eval review counts/rates, adjusts an existing revenue founder-attention summary by the minute delta, and writes audit/timeline/cost. | No new collection, index, provider call, opportunity mutation, send, publish, spend, or MenuList truth write. Founder-admin/configure and desktop-only gates are repeated server-side. |
| AI Volume Mode | Reads an existing idempotent parent run or preflights task/critic routes plus aggregate daily/monthly provider budget, then transactionally writes one parent worker summary and one global lock in the existing worker-run collection; each successful child uses the existing AI assist write set; finish merges parent counters/child IDs/stable failures, conditionally releases the owned lock, and writes audit/timeline/cost. An expired running retry reads at most 20 same-parent rows, keeps at most 15 children, reconstructs calls/cost, and finalizes without provider work. | Maximum 5 targets, 3 tasks, 3 bounded concurrent children, and 3 calls per pair. The lock expires after six minutes, one minute beyond the route window. No new collection/composite index/rule, raw error, send, publish, opportunity, external spend authority, or MenuList truth write. |
| Provider/budget/model/waterfall/segment/sender/CTA upserts | Writes the relevant compact control doc, audit event, and cost summary. | All client writes are denied; changes go through protected admin action API and permission checks; provider/budget upserts preserve existing spend counters. |
| Enrichment waterfall run | Checks source-provider pause, writes one skipped/ready/blocked vendor run summary, normalized enrichment result, run timeline, audit event, and cost summary. | No external provider connector is called yet; approved source values are reused without provider spend, and provider budget block summaries use stable local codes. |
| Approval packet create | Writes or refreshes approval packet, optional approval pointer, run timeline, audit event, and cost summary. | Packet compresses evidence/draft/suppression/source/sender/CTA risk for owner approval. |
| Sequencer handoff | Writes ready/blocked sequencer handoff, run timeline, audit event, and cost summary. | No Smartlead/Instantly/lemlist API call; readiness requires approved message, provider account approval, prior-contact guard, and sender-domain readiness. |
| Content Distribution Rail | Writes content source, asset, distribution draft, calendar item, performance, optional demand signal, audit, timeline, queue, and cost summaries through protected actions. | No auto-publish; customer-proof assets require an active `signaldeskProofPermissions` record and permission is rechecked before draft generation. |
| Reply capture | Writes conversation summary, message, reply classification, optional contact-scoped suppression event, target summary update, queue summary, audit event, and cost summary. | DNC/wrong-contact replies use contact-scoped suppression IDs. Complaint/privacy/legal states additionally write an incident and activate the channel kill switch before more work. |
| Manual contact record | Atomically creates one idempotent run timeline and updates conversation/target summaries, with optional wrong-contact suppression plus audit and daily cost. | The action route field-maps only the validated manual-contact DTO; server permits only fresh prepared email export or permissioned partner introduction, and checks current source policy, suppression, eligible route, timestamp, kill switches and current unconsumed export before the batch. Exact duplicate keys return the fingerprint-bound record; changed facts under one key fail without a second write set. |
| Outcome and demand signal | Transactionally writes compact event and summary docs, an optional hashed idempotency record, audit/control/cost summaries, and target state. | Two-surface activation requires owner-qualified/review timestamps, two distinct surfaces, evidence, and verified integrity. Duplicate keys have no second outcome side effect. |
| Signed outcome bridge | Reads one hashed/expiring `signaldeskRouteTokens` record, then invokes the same transactional outcome path. | Public endpoint requires HMAC, five-minute timestamp window, bounded body, rate limit, route-token match, and event idempotency. Raw bridge secrets and raw route tokens are never stored. |

June 30, 2026 provider redirect-boundary hardening is app-server only for SignalDesk. Google Places, Apify, FHRS/FHIS, and Meta provider-send calls now use manual redirect handling, so token-bearing provider calls and source-provider POST bodies fail closed on 3xx responses instead of following a new target. Valid provider/source calls, bounded JSON response parsing, provider spend ledgers, source imports, and dormant provider-send gating are unchanged. This adds no SignalDesk Firebase project deploy, Firestore reads/writes/deletes, Storage operations, extra provider calls, API routes, indexes, rules, owner/customer UI, or public routes beyond the existing provider/source calls.

## Open Firebase Questions

| Question | Needed before |
| --- | --- |
| Create/grant access to exact Firebase project IDs | Deploy rules, indexes, storage rules, and functions |
| Firestore region | Project creation |
| Seed admin/team membership source | Non-platform member access |
| BigQuery export need | Not first build |
| Message body retention | Inbox implementation |
| Storage bucket lifecycle | Import/provider implementation |
| Firestore rules role source for non-platform operators | First non-founder operator account |
| Apify source Actor selection and terms review | First real Apify run |
| First content proof asset and channel mix | First real content distribution test |
| MenuList signed outcome emitter | Separate review; SignalDesk receiver exists, but this pass did not modify MenuList runtime |
| Trust Partner Rail executable workflow | Runtime is enabled for internal testing; first real partner spend still needs active budget policy, founder approval, disclosure review, and manual execution |
