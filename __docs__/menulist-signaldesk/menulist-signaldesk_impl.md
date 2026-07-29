# MenuList SignalDesk - Implementation Plan

**Status:** First-build internal workflow, investment controls, governed source/research/content/partner rails, solo-founder Operating Layer, and bounded Revenue Operating Layer implemented; paid campaigns, external paid-provider adapters, provider send, auto-publish, calendar/proposal/payment providers, and deploy remain skipped or blocked
**Created:** June 23, 2026
**Last Updated:** July 22, 2026
**Runtime:** Product-isolated app shell, guarded APIs, first-build workflow service, provider/budget/model controls, governed source/research/content/partner rails, Revenue Operating Layer, run timelines, Firebase config/rules/indexes/storage rules, and functions skeleton created.
**Implementation posture:** Product-isolated internal module inside this monorepo first; extraction-ready boundaries.

## Owner Control Posture

SignalDesk must be implemented as a MenuList distribution system, not as another manual CRM.

The founder-facing posture is:

```txt
observe -> monitor -> approve -> pause or redirect
```

The system posture is:

```txt
research -> dedupe -> score -> gather evidence -> draft -> queue approvals -> route replies -> suppress risk -> attribute outcomes
```

Implementation rule: if a workflow can be safely converted into a system-prepared approval packet, do that instead of adding another founder/operator task. Human work should remain at policy, approval, exception, pause, and scale decisions.

Draft preparation is transaction-authoritative and replay-safe. The selected target, source policy, active template, evidence summary, optional CTA, sender-domain readiness, and latest prior-contact conversation are re-read in the settlement transaction. A content hash over the rendered message and those authority-bearing inputs owns the draft, approval, and approval-packet IDs, so exact concurrent retries cannot duplicate queue, audit, timeline, or cost effects; changed message or authority facts produce a distinct review record.

Human approval is also transaction-authoritative. The decision transaction requires the pending approval's draft and packet to exist and agree on target, approval, and evidence identity; the target must still point to that exact pair as latest. It then revalidates current source rights, suppression/lifecycle/prior-contact state, target segment/action, and unsupported claims before changing approval/draft/packet/target truth or decrementing queues. Rejection remains available to close a pending review unit even when its optional packet/draft is incomplete, while approval always fails closed.

Client-side SignalDesk DAL failures use fixed internal-tool copy for overview load, workspace load, action run, and pause updates. Route response text from `src/app/api/signaldesk/*` is not rethrown into the UI. Overview, workspace, action, and kill-switch callers parse route responses through a 1 MB bounded reader, require the documented `{ data }` envelope, and guard overview/workspace shapes before replacing local state. Malformed, oversized, rejected, or wrong-shape route responses now log `signaldesk_client_response_parse_failed`, `signaldesk_client_response_rejected`, or `signaldesk_client_response_invalid` with operation, response status, mobile-client state, and bounded action/section/scope presence/length metadata before preserving the same fixed UI failure copy. The runtime still preserves the existing access, rate-limit, mobile-readonly, and provider-send gates. Overview, workspace, action, kill-switch, and lower-level overview-load failures use `signaldesk_*_failed` diagnostics with bounded user/action/section/scope metadata and source error name/code/status only. Shared API guard security events for validation failures, permission failures, rate limits, and invalid JSON now use `getSignalDeskSecurityLogContext()` over bounded route metadata plus endpoint/method/action/permission/feature presence-length fields instead of raw `buildSecurityContext()` output.

## Investment-Control Runtime Added

The June 23 investment-control implementation added the internal controls needed before paid provider scale:

| Area | Current implementation |
| --- | --- |
| Provider registry | `signaldeskProviderAccounts` stores provider, use, credential state, owner approval, status, per-run/daily/monthly caps, spend counters, and disabled reason. |
| Budget governor | `signaldeskBudgetPolicies` stores provider/global/task-style caps; provider spend checks block unregistered, unapproved, disabled, over-run, over-daily, and over-monthly use. |
| Model routes | `signaldeskModelRoutes` route AI tasks by provider/model/status/cost cap; current executable route is Gemini only, while stronger OpenAI/Anthropic routes remain held until adapters/accounts are approved. |
| Model evals | `signaldeskModelEvals` records cumulative run confidence/rejected-fact counters plus founder shadow-review decisions, rates, and attention. Rates are derived from counters instead of being overwritten by the latest run. The first new result preserves non-reconstructable legacy values separately and starts the exact `cumulative-v1` window. |
| Waterfall policy | `signaldeskEnrichmentWaterfalls` stores provider order, requested field, max credits, stop condition, verification requirement, source policy, retention, and active/hold state. |
| Vendor ledger | `signaldeskVendorRuns` records source-provider and waterfall readiness/blocked states with estimated cost and blocked reason. |
| FHRS/FHIS source provider | `fhrs-fhis` can import UK official food-business establishment seeds from the FSA API after source policy, provider account, budget governor, and feature-flag checks; contact use is not inferred and raw payloads are not stored. |
| Research Agent Table | `/signaldesk/mission` can turn a plain-English prompt into a governed provider run, normalized target import, enrichment table rows, pass/fail/unsure scoring, source transparency, idempotency, and market-pod update. Exhausted provider source-policy scans log `signaldesk_research_source_policy_scan_failed` with bounded provider and candidate/rejected counts before returning the safe policy-required failure. |
| Apify source broker | `apify` can run one env-controlled source Actor after source policy, provider approval, env readiness, and provider budget checks; rows are normalized into target imports without storing raw dataset payloads. |
| Enrichment result | `signaldeskEnrichmentResults` stores normalized field-level result status, confidence, source policy, expiry, and masked value preview when approved source data already has the field. |
| Approval packet | `signaldeskApprovalPackets` compress target, evidence, draft, suppression, source policy, sender readiness, CTA, risk summary, and recommended action into one owner decision record. |
| Market pod planner | `signaldeskMarketPods` now stores rules-based confidence, recommendation, recommendation reason, and next actions from current targets, demand signals, outcomes, source runs, and CTAs. |
| Weekly strategist memo | `signaldeskStrategistMemos` stores the weekly founder decision memo: targets, approvals, replies, demand, outcomes, source runs, spend, provider quality, risks, and next owner decisions. |
| Provider evaluation shell | `signaldeskProviderEvaluations` compares existing vendor/enrichment records by blocked rate, verified contact rate, useful result rate, cost, suppression risk, and recommendation without calling paid adapters. |
| Channel window and source retention | `signaldeskChannelWindowStates` and `signaldeskProviderSourceRetention` record channel eligibility and source refresh state through protected server actions, with client reads only. |
| Content Distribution Rail | `signaldeskContentSources`, `signaldeskContentAssets`, `signaldeskContentDistributionDrafts`, `signaldeskContentCalendarItems`, and `signaldeskContentPerformanceSummaries` support owned-proof repurposing, approval-gated channel drafts, queued calendar items, and compact performance capture without auto-publish. |
| Trust Partner Rail | `signaldeskTrustPartnerProfiles`, `signaldeskTrustPartnerNicheTests`, `signaldeskTrustPartnerDeals`, `signaldeskTrustPartnerBriefs`, `signaldeskTrustPartnerDeliverables`, `signaldeskTrustPartnerMetrics`, and `signaldeskTrustPartnerRenewalDecisions` support internal partner testing with flat-fee gates, disclosure checks, compact metrics, renewal logic, audit, cost, and timelines. |
| Prior-contact guard | Draft, enrichment, export, handoff, and sequencer paths block suppressed/contacted/replied/converted targets, non-new conversations, and targets with existing outcomes. |
| Manual contact record | Protected desktop action validates an idempotency key, target/policy, bounded timestamp, route and outcome, then explicitly maps those validated fields into the server DTO. The server repeats source-policy, suppression, route, prior-export and kill-switch checks before atomic timeline/conversation/target/suppression/audit/cost writes. |
| Sender-domain risk | `signaldeskSenderDomains` tracks authentication, ramp, bounce, complaint, unsubscribe, provider, and brand risk; email handoff/send requires an active ready sender domain. |
| Owned email sequencer | `signaldeskSequencerHandoffs` and `signaldeskSequencerSteps` queue one approved email step through the internal `owned-email` rail after approval, sender-domain, suppression, source-policy, prior-contact, pause, and email-readiness gates. |
| External sequencer handoff | `signaldeskSequencerHandoffs` records Smartlead/Instantly/lemlist handoff readiness or blocked reason without connecting or sending to sequencers. |
| Run timelines | `signaldeskRunTimelines` gives founder-readable traces for defaults, providers, enrichment, models, approval packets, and handoffs. |
| Self-service CTA | `signaldeskSelfServiceCtas` stores proof/activation CTA copy and is injected into evidence-bound drafts. |

## AI Shadow Review Runtime Contract

The validated July 11 AI-revenue research reuses existing records instead of adding another collection or agent layer.

| Layer | Contract |
| --- | --- |
| AI run | `signaldeskAiWorkerRuns/{aiRunId}` stores task, provider, model route/eval IDs, target, confidence, prompt version, rejected-fact presence, cost, and optional founder review evidence. |
| Review action | `review-ai-shadow-run` accepts `aiRunId`, `accepted|edited|rejected|held`, a bounded reason, and 0-1,440 founder-attention minutes. Non-accepted decisions require a reason. |
| Authority | API permission maps to `signaldesk.configure`; server repeats the `founder-admin` plus configure check. Mobile maps the action to `approve` and remains server-blocked. |
| Aggregate | One transaction rereads the run, model eval, and optional current revenue summary; it reverses any prior review contribution, applies the replacement, and recomputes all rates. |
| Rate source | Provider runs increment `sampleSize`, `passedSampleCount`, `lowConfidenceCount`, and `rejectedFactSampleCount`. Workspace reads derive display rates from those counters. |
| Attention | Shadow-review minutes accumulate on the model eval and, when present, the existing revenue control summary. Re-review uses the minute delta. |
| Audit | The transaction writes an audit event, run timeline, and daily cost summary. It never writes messages, opportunities, offers, envelopes, outcomes, or MenuList collections. |
| UI | `/signaldesk/ai` shows aggregate rates, reviewed counts, review attention, run review state, bounded reason/minutes inputs, and founder-only decision buttons. Mobile stays read-only. |

No new feature flag, collection, index, provider, scheduler, or public surface is required.

Standalone `run-ai-assist` requests use the existing `signaldeskIdempotencyKeys` collection before provider execution. The key binds actor, target, task, normalized instruction, multi-pass mode, and optional volume parent. Exact completed retries replay one deterministic worker run; changed input conflicts. The final worker/eval/snapshot/operation/provider-spend/timeline/audit/cost transaction must still own the original claim. Browser retries retain a key only while the exact target/task/instruction tuple is unchanged, and volume children derive their key from parent/target/task identity.

Provider, critic, escalation, or unconfirmed final-persistence failures move only the exact AI claim owner to `unresolved`, store `ai_assist_outcome_unresolved`, and emit one audit event. Exact retry becomes review-required without another model call. If final transaction acknowledgement is lost but the completed claim and deterministic worker exist, the call returns success. Reserved spend is retained for ambiguous provider billing.

Direct `run-source-provider` requests use the same existing idempotency collection. The request fingerprint binds actor, provider, policy, normalized query/location, and result cap. The first claim transaction also reads the provider account and optional provider budget policy, enforces the per-run/daily/monthly caps against transaction-current spend, and reserves the estimated cost before the external call. Exact completed retries reconstruct the bounded source run and target summaries; changed input conflicts. The private browser retains a retry key only while the exact provider request is unchanged.

After provider success, target/detail/identity/source-run writes, provider health, deterministic vendor-run truth, row-aligned retention, claim completion, timeline, audit, and cost truth share the target-import batch. The source-run ID is derived from the actor/key hash. A commit acknowledgement loss therefore re-reads the exact completed claim and deterministic source run without repeating provider work. Duplicate rows keep an aligned internal target projection even when the public result set deduplicates them, preserving every allowed provider-record provenance against the correct target.

If the external result or pre-commit import outcome is not durably completed, the exact claim owner transactionally moves the claim from `in_progress` to `unresolved`, stores only `source_provider_outcome_unresolved` or `source_provider_import_unresolved`, and emits one audit event. Exact retry returns a review-required error without another provider request. The reservation is not automatically refunded because provider billing may already have occurred.

Research Agent requests require a bounded actor/request idempotency key at both API and server boundaries. The private browser retains the same key while prompt, provider, research type, source policy, and result cap remain unchanged after failure, and clears it only after success. Exact replays return the durable run status unchanged and expose replay identity only through the separate response `duplicate` flag. Completion compensation first re-reads the deterministic run and at most one hundred matching rows. A final batch that committed before acknowledgement loss returns completed durable truth; only a non-completed run may be marked blocked. This prevents completed table/pod/run output from being overwritten by false failure compensation.

The research run ID derives from founder actor plus the required key hash. Exact legacy claims still replay their stored entity ID, while independent keys always receive separate run and row namespaces even when their normalized research input is identical.

Final Research Agent rows, run, market pod, timeline, audit, and cost settle in one Firestore transaction. The transaction reads market-pod review authority before writing, so a founder decision committed during provider work forces a retry against current pod truth instead of being overwritten by stale approval/status fields.

Rules-only target scoring also settles transactionally. It re-reads target and source-policy authority before any score effects, and derives a deterministic operation identity from the exact scoring facts plus `rules-v1`. Concurrent/retried identical requests return the existing score without duplicate snapshots, ledgers, audits, target writes, or cost increments.

Evidence creation follows the same transaction-current contract. Its content identity includes source-policy-derived allowed use plus every target fact projected into packet detail/summary, so identical retries converge while a rights or evidence-fact change produces new provenance. Packet detail, summary, target next action, audit, and cost commit together.

Standalone AI Assist reserves its initial Gemini estimate while creating its claim. It refuses to start while AI Volume owns the live global lock. AI Volume performs a second transaction-current aggregate budget check while acquiring that lock, so a direct request cannot consume capacity between preflight and batch ownership. Volume children then use the owned envelope and final provider-spend ledger without double-reserving their calls.

AI finalization re-reads the optional provider-budget policy in the claim-owned transaction. Provider-account spend is always recorded, while policy spend is merged only when the policy exists. This preserves the supported account-only configuration and prevents a missing optional policy from becoming a partial spend-only document.

## AI Volume Mode Runtime Contract

`ENABLE_MENULIST_SIGNALDESK_AI_VOLUME_MODE` gates `run-ai-volume-batch`. The authenticated action is Zod-validated, rate-limited as `BATCH_OPERATION`, mapped to `signaldesk.configure`, repeated as a founder-admin check in the workflow, and classified as blocked provider work on mobile.

The parent and child records reuse `signaldeskAiWorkerRuns`:

- parent `workerType: ai_volume_batch` uses a founder-scoped idempotency-key hash, stores no raw key, binds the exact normalized founder/targets/tasks/instruction/cost request with a fingerprint, and summarizes up to fifteen target/task pairs;
- child `workerType: ai_assist_{task}` stores fast output, critic verdict/evidence, optional same-provider escalation, final confidence/output, model calls, estimated cost, and parent ID;
- latest bounded workspace reads split rules scores, parent volume runs, and reviewable provider children without another collection or index.

Default active routes use `gemini-3.5-flash-lite` for `score`, `evidence`, `draft`, `reply-classification`, and `quality-critic`, with `gemini-3.6-flash` escalation on the four business tasks. Exact untouched Gemini 2.5 score/evidence seed routes migrate once. Founder-modified routes are not overwritten; unsupported retained Gemini routes fail before provider work and require owner review.

Default convergence is create-only for valid current rows. One foundation transaction reads 55 documents: the current preview CTA, the current UTC daily-cost row, and 53 unique business defaults. It creates only missing rows and emits the seed audit, timeline, and exact daily-cost update only when at least one business row is created or an exact legacy row is migrated. The provider registry contains 18 account/use records and 17 provider-scoped budgets because `owned-email` has separate disabled sender and approved internal-sequencer accounts under one conservative provider budget. Existing spend, caps, status, disable reasons, and ownership timestamps are preserved byte-for-byte after strict product/shape validation. Automatic replacement is limited to the exact historical score/evidence route, Mumbai first-pod, and active current-list Offer CTA shapes; any near-match or founder marker prevents migration. The default content source is separately create-only, is not created while distribution is paused, validates existing source provenance, and derives activation only from a strictly projected transaction-current founder-approved pod.

The synchronous executor uses three bounded workers. It preflights the aggregate daily/monthly Gemini budget and holds one six-minute global recovery lock so another batch cannot consume the same budget snapshot while the 300-second route has a one-minute shutdown margin. Every child retains its own provider/budget/source-policy checks, provider spend, operation ledger, model eval, decision snapshot, timeline, audit, and daily cost. The parent records only orchestration evidence and stable failure codes.

Exact retries return the durable parent without another provider call; changed input under the same key fails closed. Legacy parents without a fingerprint replay only when their stored founder, targets, tasks, instruction, and cost ceiling exactly match. Parent creation also stores a unique worker claim, so an ambiguous transaction acknowledgement can continue only for the worker that actually committed it.

If an idempotent retry finds an expired `running` parent, it reconstructs at most fifteen children from a bounded twenty-row query and finalizes the parent without a provider call. Completed children preserve calls and estimated cost; incomplete recovery stores `ai_volume_run_interrupted`. Both normal finish and recovery release the global lock only when it still belongs to that parent.

Desktop writes only the bounded request envelope—key, target IDs, task list, cost maximum, and optional instruction—to browser-local storage before the call. It reuses that payload for `Retry Batch` until a terminal parent returns, disables scope edits during recovery, clears automatically on terminal state, and offers `Clear Retry` for a request blocked before parent creation.

External paid-provider adapters for Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, Postmark, Resend, Smartlead, Instantly, and lemlist are still not connected. This is intentional: the internal governor and owned email rail exist first, and actual account connection remains an owner decision.

The gated Meta message adapter URL-encodes the selected WhatsApp, Instagram, or Messenger endpoint ID before building the Graph API `/messages` path. Provider send remains disabled by default, but the dormant send path must still preserve safe provider URL construction for future controlled activation.

## Architecture Decision

Build SignalDesk as a separate private internal tool, not inside MenuList owner/customer runtime.

Implementation should start inside this monorepo because the repo already supports product-isolated surfaces, Firebase targets, feature flags, and route groups. The runtime must still be split as a product module, not a MenuList feature.

```txt
src/app/(signaldesk)/signaldesk/
src/app/api/signaldesk/
src/components/signaldesk/
src/constants/signaldesk/
src/database/signaldesk/
src/hooks/signaldesk/
src/lib/signaldesk/
src/providers/signaldesk/
src/types/signaldesk/
functions-signaldesk/
firebase-signaldesk.json
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
storage-signaldesk.rules
```

The separate-repo shape remains a reserved extraction option only if operations demand it. Do not begin by creating a separate repo unless the founder explicitly chooses that path.

## Product Separation Decision

| Item | Decision |
| --- | --- |
| Product code | `PRODUCT_IDS.SIGNALDESK = "SD"` is implemented. |
| Product slug | `signaldesk` |
| Route group | `src/app/(signaldesk)/signaldesk/` |
| API namespace | `src/app/api/signaldesk/` |
| Constants | `src/constants/signaldesk/` |
| DAL | `src/database/signaldesk/` only |
| Firebase client | `signaldeskFirebaseClient`, never default MenuList `firebaseClient` |
| Functions | `functions-signaldesk/` for workers, webhooks, AI, provider events |
| Public routes | None |
| MenuList owner/customer nav | None |

Existing codebase evidence:

- `src/constants/product.ts:4` requires product-backed documents to use `pId / tId / sId / docId`.
- `src/constants/product.ts:13` centralizes product IDs.
- `src/config/features.ts:24` shows internal separate-product-style systems can live in this repo without public routes.
- `src/config/features.ts:33` shows CampaignCue is a separate product in the shared app behind product flags.
- `src/constants/answerlattice/database.ts:4` shows product-local database constants for a dedicated Firebase project.
- `firebase-answerlattice.json:1` and `firebase-campaigncue.json:1` show separate Firebase configs are already accepted patterns.

## Firebase Split Decision

SignalDesk must use dedicated Firebase projects:

| Environment | Project |
| --- | --- |
| Local/QA | `menulist-signaldesk-qa` |
| Production | `menulist-signaldesk` |

Required files:

```txt
src/lib/firebase/signaldeskConfig.ts
src/lib/firebase/signaldeskFirebaseClient.ts
src/lib/firebase/signaldeskFirebaseAdmin.ts
firebase-signaldesk.json
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
storage-signaldesk.rules
functions-signaldesk/
```

SignalDesk may share the Next.js app and auth entry point, but it must not share MenuList Firestore collections, MenuList DALs, MenuList public routes, or MenuList owner/customer navigation.

## Feature Flags

Add full-name flags before any route or API goes live:

```ts
ENABLE_MENULIST_SIGNALDESK_APP_SHELL
ENABLE_MENULIST_SIGNALDESK_IMPORTS
ENABLE_MENULIST_SIGNALDESK_AI_INTELLIGENCE
ENABLE_MENULIST_SIGNALDESK_DRAFTS
ENABLE_MENULIST_SIGNALDESK_APPROVALS
ENABLE_MENULIST_SIGNALDESK_EMAIL_EXPORT
ENABLE_MENULIST_SIGNALDESK_INBOX
ENABLE_MENULIST_SIGNALDESK_OUTCOME_BRIDGE
ENABLE_MENULIST_SIGNALDESK_DEMAND_SIGNALS
ENABLE_MENULIST_SIGNALDESK_CONTROL_ROOM
ENABLE_MENULIST_SIGNALDESK_SOURCE_PROVIDERS
ENABLE_MENULIST_SIGNALDESK_APIFY_SOURCE_BROKER
ENABLE_MENULIST_SIGNALDESK_AI_PROVIDER_CALLS
ENABLE_MENULIST_SIGNALDESK_PROVIDER_WEBHOOKS
ENABLE_MENULIST_SIGNALDESK_ASSISTED_CHANNELS
ENABLE_MENULIST_SIGNALDESK_OWNED_EMAIL_SEQUENCER
ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL
ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND
```

Provider send stays false until sender identity, physical address, unsubscribe, bounce, complaint, and suppression workflows are verified.

## Source Evidence

| Decision | Evidence |
| --- | --- |
| Private internal tool, not MenuList feature | `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:6` |
| Build as control room, not autonomous outbound machine | `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:19` |
| Split target/contact/channel/conversation/outcome | `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:103` |
| Start with auth, registry, dedupe, AI scoring, evidence, templates, approval, email/export, inbox, attribution, signals, dashboard | `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:207` |
| Do not start with WhatsApp API, Instagram automation, or optimizer | `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:209` |

## Product Modules

| Order | Module | Technical output |
| ---: | --- | --- |
| 1 | Foundation | Auth, roles, audit log, feature/config flags, kill switches. |
| 2 | Target registry | Target, contact, channel identity, source candidate, import records. |
| 3 | Dedupe/provenance | Identity keys, source policy links, merge/hold/reject states. |
| 4 | AI intelligence | Typed scoring workers for fit, current-list gap, contactability, risk. |
| 5 | Evidence snapshots | Evidence packet docs, rejected facts, confidence, prompt/rule version. |
| 6 | Draft control | Template library, approved variables, draft generation, safety checker. |
| 7 | Approval queue | System-prepared approval packets, reviewer actions, state transitions, audit events. |
| 8 | Email/export rail | Export first, then email provider after readiness. |
| 9 | Inbox | Conversations, messages, notes, reply classifier. |
| 10 | Outcome bridge | Tracked MenuList routes and outcome ingestion. |
| 11 | Demand signals | Compact signal capture from MenuList public surfaces. |
| 12 | Control room | Channel health, cost summaries, incidents, queue counts. |
| 13 | Investment controls | Provider registry, budget policies, model routes/evals, waterfalls, vendor ledger, sender domains, approval packets, run timelines. |
| 14 | Content distribution | Source assets, canonical messages, platform drafts, approval, calendar queue, and performance records without auto-publish. |
| 14 | Owned email sequencer | Internal queued email step for approved drafts; actual SMTP send remains behind provider-send and email readiness gates. |
| 15 | Execution-rail evaluation | Blocked/ready external sequencer handoff records only; no external sequencer send. |
| 16 | Apify source broker | Env-controlled Actor execution for capped discovery/evidence imports; no arbitrary browser Actor ID, raw dataset storage, or direct-send path. |
| 17 | Trust partner rail | Partner/creator profiles, 3-5 niche tests, lean briefs, flat-fee deals, deliverables, disclosure gates, outcome attribution, and renewal decisions. Internal runtime exists; real partner execution/spend remains gated. |
| 18 | Revenue operating layer | Revenue accounts, commercial opportunities, immutable offer versions, policy-referenced operating envelopes, activation watches, and materialized revenue/founder-attention summaries. |

## Founder-Facing UX Contract

Default screens should answer:

| Screen need | Required surface |
| --- | --- |
| Observe | Summary metrics, source health, channel health, approval backlog, inbox backlog, outcome movement. |
| Monitor | Kill switches, incidents, suppression spikes, provider readiness, cost posture, stale queues. |
| Approve | Approval queue with source, evidence, rejected facts, draft, channel eligibility, and risk state. |
| Redirect | Market pod, source policy, channel pause, cohort hold/reject, template rejection. |
| Learn | Attribution by source, city, category, channel, and MenuList activation outcome. |

Do not make the founder open raw imports, raw webhook events, raw messages, or raw AI operation logs unless they choose a detail/admin path.

## Data Model Sketch

Use separate objects. Do not keep one flat lead row.

```ts
type SignalDeskTargetSummary = {
  targetId: string;
  displayName: string;
  category?: string;
  city?: string;
  country?: string;
  status: "new" | "review" | "ready" | "held" | "rejected" | "contacted" | "replied" | "converted";
  segment: "a" | "b" | "c" | "hold" | "reject";
  primaryOpportunity?: "missing-current-list" | "stale-menu" | "instagram-only" | "pdf-only" | "no-link" | "unknown";
  sourceConfidence: "high" | "medium" | "low" | "blocked";
  contactability: "ready" | "limited" | "missing" | "blocked";
  suppressionStatus: "clear" | "suppressed" | "wrong-contact" | "complaint";
  nextAction?: "review" | "enrich" | "draft" | "approve" | "send" | "hold" | "reject";
  updatedAt: string;
};
```

```ts
type SignalDeskDecisionSnapshot = {
  snapshotId: string;
  targetId: string;
  decisionType: "score" | "hold" | "reject" | "draft" | "approve" | "send" | "route" | "attribute";
  evidenceRefs: string[];
  rejectedFacts: string[];
  confidence: "high" | "medium" | "low";
  aiWorkerVersion?: string;
  ruleVersion: string;
  decidedBy: "system" | "human";
  actorId?: string;
  createdAt: string;
};
```

```ts
type SignalDeskSuppressionEvent = {
  suppressionId: string;
  identityHash: string;
  channel: "email" | "phone" | "whatsapp" | "instagram" | "messenger";
  reason: "unsubscribe" | "dnc" | "wrong-contact" | "complaint" | "bounce" | "manual";
  source: "inbound" | "operator" | "provider-webhook" | "import";
  proofRef?: string;
  createdAt: string;
};
```

## Internal Routes

Initial route inventory for implementation:

| Route | Purpose | First build |
| --- | --- | --- |
| `/signaldesk` | Summary dashboard | Yes |
| `/signaldesk/targets` | Target registry and import review | Yes |
| `/signaldesk/targets/[targetId]` | Evidence, contacts, conversations, outcomes | Yes |
| `/signaldesk/imports` | Manual import and source-run history | Yes |
| `/signaldesk/approvals` | Human review queue | Yes |
| `/signaldesk/templates` | Approved templates and variables | Yes |
| `/signaldesk/inbox` | Replies and operator notes | Yes |
| `/signaldesk/attribution` | Outcome summaries | Yes |
| `/signaldesk/policies` | Source/channel/suppression policies | Yes |
| `/signaldesk/control-room` | Kill switches, channel health, cost state | Yes |
| `/signaldesk/revenue` | Revenue accounts, opportunities, offers, operating envelopes, activation watches, and compact revenue summary | Yes |
| `/signaldesk/meta-paid` | Meta paid intent | Gated |
| `/signaldesk/whatsapp` | Assisted WhatsApp governance | Gated |
| `/signaldesk/clusters` | Local cluster expansion | Reserved |

No public routes.

## Code Split Rules

Allowed shared imports:

- session/auth helpers;
- secure logger and error helpers;
- Zod validation patterns;
- rate limiting helpers;
- product-neutral UI primitives;
- Firebase client/admin factory patterns.

Blocked imports:

- MenuList owner/customer DALs for SignalDesk data writes;
- MenuList public menu/page components;
- MenuList owner dashboard components unless extracted to product-neutral primitives first;
- default MenuList Firebase client/admin for SignalDesk data;
- public website content or sitemap generators.

MenuList integration must use a narrow outcome bridge. SignalDesk records route tokens, outcome events, attribution, and evidence notes; it does not write MenuList `stores`, `projects`, billing, menu publish state, or customer-facing output.

## API / Worker Contracts

| Contract | First build behavior |
| --- | --- |
| Import target | Validate source policy, write import record, create candidates, no send. |
| Dedupe target | Generate identity keys and merge/hold/reject suggestions. |
| Score target | Return typed fit/gap/contactability/risk output. |
| Create evidence packet | Store source facts, rejected facts, allowed-use notes, expiry, and a versioned current-menu-presence diagnostic. Unknown owner-control and mobile-access facts remain explicitly unverified. |
| Draft message | Use approved template and variables only. |
| Approve action | Human reviewer may transition only an exact action packet whose fingerprint still matches the current evidence, source rights, allowed route, sender, CTA, message, unsupported-claim result, expected outcome, and risk state. |
| Export/send email | Recheck suppression, sender readiness, and approval. Export can precede provider send. |
| Classify reply | Typed classifier result; DNC/complaint immediately updates suppression. |
| Record outcome | Store MenuList outcome event and update summaries. |
| Capture demand signal | Store compact signal, not raw customer trace. |

## Security Requirements

- Internal auth only.
- Role-based access for admin, growth manager, operator, reviewer.
- Contact reveal must be audited.
- No raw secrets in Firestore, browser payloads, AI prompts, logs, or exports.
- Every mutation writes an audit event.
- Every send/export writes a decision snapshot.
- Every webhook must use signature verification where provider supports it.
- Webhook rejection diagnostics, webhook body parse/shape diagnostics, webhook event-shape diagnostics, API route failure diagnostics, enrichment block summaries, and research-agent blocked audit reasons use stable local codes instead of raw provider, user, action, payload, or exception messages. Signed webhook payloads must contain a provider event signal before any normalized event write, and fallback webhook event IDs are deterministic payload hashes rather than random IDs.
- Every AI worker must validate typed output before storage.
- AI provider JSON parse and output-shape failures log `signaldesk_ai_response_parse_failed` or `signaldesk_ai_response_shape_invalid` with bounded model/task/response-length metadata and fail before AI worker run, decision snapshot, operation ledger, eval, spend, timeline, or cost-summary writes.

## AI Worker Rules

AI may:

- classify category fit;
- detect current-list gap;
- summarize permitted source evidence;
- draft inside approved template rails;
- classify replies;
- suggest next action.

AI may not:

- decide legal eligibility;
- infer consent;
- bypass suppression;
- invent business facts;
- send messages;
- approve a campaign;
- decide that source-provider data may be stored or used for outreach.

## Build Order

### Build Slice 1

1. Keep `PRODUCT_IDS.SIGNALDESK = "SD"` and product-local constants in sync with the runtime.
2. Add SignalDesk feature flags.
3. Add product-isolated route/API/DAL/lib/component folders.
4. Add dedicated Firebase config/client/admin files.
5. Add `firebase-signaldesk.json`, rules, indexes, and storage rules.
6. Add `functions-signaldesk/` skeleton for workers/webhooks/provider flows.
7. Add auth and role model.
8. Add audit log.
9. Add target registry.
10. Add manual import.
11. Add source policy and provenance.
12. Add dedupe.
13. Add AI scoring worker with typed output and cost ledger.
14. Add evidence packet.
15. Add template/draft guardrails.
16. Add approval queue.
17. Add export/email rail with suppression.
18. Add inbox and manual reply capture.
19. Add MenuList outcome bridge.
20. Add summaries and control room.

### Gated / Skipped Slices

- assisted WhatsApp: channel-window and contact-authority plumbing exists, but current draft/approval creation is email-only; an email approval cannot be reused and no WhatsApp handoff/send is enabled
- Instagram/Messenger routing: signed inbound webhook plumbing exists; Instagram contact/window plumbing is gated until an exact same-channel draft/approval exists, Messenger outbound remains unsupported, and cold DM automation is blocked
- live source-provider import: implemented for Google Places Text Search, FHRS/FHIS UK establishment seed, and Apify Source Broker with provider source policy, max-result cap, provider budget, manual redirect handling, bounded provider JSON parsing, parse-failure diagnostics, and no raw provider payload storage
- real AI provider assist: implemented through the shared Gemini retry gateway with a SignalDesk-only `SIGNALDESK_GEMINI_AI_KEY*` pool; no MenuList/Answerlattice credential fallback
- trust partner rail: Feature 17 locally source-complete with feature-gated route/read/action admission, least-privilege parallel reads, founder-only activation/spend, actor-bound retry transactions, pause enforcement, attributable live metrics, outcome-derived renewal, and exact cost accounting; real outreach/spend remains manual
- Meta paid intent: skipped in this session
- Firebase deploy: skipped in this session
- experiments, cluster planner, and optimizer: not part of this implementation slice

## Implemented First-Build Slice

The first implementation slice now exists in product-scoped folders:

```txt
src/app/(signaldesk)/
src/app/api/signaldesk/
src/components/signaldesk/
src/constants/signaldesk/
src/database/signaldesk/
src/hooks/signaldesk/
src/lib/firebase/signaldeskConfig.ts
src/lib/firebase/signaldeskFirebaseClient.ts
src/lib/firebase/signaldeskFirebaseAdmin.ts
src/lib/signaldesk/
src/types/signaldesk/
functions-signaldesk/
firebase-signaldesk.json
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
storage-signaldesk.rules
```

Implemented behavior:

1. protected `/signaldesk` app shell;
2. first-route workspace for dashboard, targets, imports, approvals, templates, inbox, attribution, policies, control-room, and audit;
3. summary-first overview API;
4. global outbound kill-switch API with role checks, rate limiting, Zod validation, and one transactional switch/audit/idempotency settlement that leaves provider-derived channel health untouched;
5. dedicated SignalDesk Firebase client/admin configuration using full `SIGNALDESK_*` env names;
6. dedicated Firestore/Storage rules with default deny and server/admin-only writes;
7. dedicated `functions-signaldesk` package with a health-check skeleton and disabled provider/AI/scheduler flags;
8. source policy seed/create flow;
9. bounded manual import with source-run summary, source candidate, target summary/detail, identity index, contact identity, suppression check, and audit writes;
10. rules-based target score with decision snapshot and AI operation ledger;
11. evidence packet summary/detail;
12. safe template draft generation;
13. human approval review;
14. export-only email rail with kill-switch and suppression checks;
15. manual reply capture and classifier;
16. outcome and demand-signal recording;
17. section-aware workspace reads that keep default screens on bounded summaries.

## Implemented Gated Runtime Expansion

The second implementation slice adds the remaining non-paid, non-deploy runtime surfaces:

1. provider integration env names under `SIGNALDESK_*`;
2. internal `/signaldesk/sources`, `/signaldesk/ai`, and `/signaldesk/channels` pages;
3. source-provider action using Google Places Text Search, FHRS/FHIS UK official establishment seed, or Apify Source Broker with a required provider source policy, max-result cap, provider account, budget cap, manual redirect handling, bounded provider JSON response parsing, and `signaldesk_source_provider_response_parse_failed` diagnostics for malformed successful provider JSON;
4. FHRS/FHIS normalization for UK food-business establishment rows with no contact-permission inference;
5. Apify connector/settings readiness, env-controlled Actor ID, normalized target rows, vendor ledger, source health event logging, and webhook status intake;
6. Foursquare provider placeholder blocked until explicit source approval;
7. real Gemini AI assist action for score/evidence/draft/reply-classification review runs;
8. AI worker run, decision snapshot, AI operation ledger, audit, and cost summary writes for AI assist;
9. signed webhook endpoint for email, WhatsApp, Instagram, Messenger, and Apify providers;
10. webhook HMAC/shared-secret validation, public rate limiting, normalized event storage, channel/source health updates, and suppression updates where channel events apply;
11. assisted channel handoff only when the requested channel exactly matches the approved draft; current seeded draft creation is email-only;
12. SMTP/Meta provider-send adapter behind the global provider-send flag, channel readiness checks, manual redirect handling for Meta API calls, bounded Meta response parsing, and `signaldesk_meta_response_parse_failed` diagnostics for malformed successful Meta JSON;
13. phone, WhatsApp, and Instagram contact identity indexing when source policy allows contact use.

## Feature 18 Operating Layer Cross-Check - July 21, 2026

The completed source audit closed the remaining route, read-model, permission, and replay gaps without adding infrastructure:

1. The parent Operating Layer flag now gates both direct pages, the Mission workspace section, every mutation, market-pod recommendation, and Research Agent execution.
2. Research remains behind its additional child flag; disabled Research, Content, Partner, and Revenue layers contribute no records to Mission/dashboard read models or mission ranking.
3. Independent Mission reads execute concurrently and remain bounded.
4. Workspace controls use `target.review`, `signaldesk.configure`, `draft.create`, and `source.configure` instead of one broad edit state.
5. Reply playbooks, source-quality snapshots, and market pods use strict canonical projectors; unsafe suppression routing and malformed stored state fail closed.
6. Explicit source-quality policy/run references must exist and agree. Exact retries return stored truth without repeating entity, audit, timeline, or cost effects.
7. Mobile remains Dashboard-only; no Mission or Opportunities mobile editor is advertised or exposed.
8. No rule, index, Storage, Function, provider-send, public-output, or MenuList-truth change was required.

## Implemented Revenue Operating Layer

**July 21 revalidation:** The page, API, and direct loader now enforce the feature flag; current target/source/contact/suppression authority is rechecked before commercial changes; manual wins are blocked; blocked accounts pause and ineligible open opportunities demote; exact successful retries do not repeat writes; founder approval gates approved envelopes; budget-policy detail is role-bounded; and Revenue remains desktop-only under the dashboard-only mobile contract. See [Revenue implementation](./signaldesk-revenue-operating-layer/signaldesk-revenue-operating-layer_impl.md).

The bounded commercial lifecycle now adds:

1. a private `/signaldesk/revenue` workspace and protected `revenue` read section;
2. deterministic revenue-account qualification over existing target, source-policy, suppression, contactability, reply, segment, and score state;
3. idempotent one-account/one-opportunity creation per target;
4. commercial opportunity stage, status, value, probability, next action, structured win/loss reason, and founder-attention tracking;
5. immutable commercial offer versions with price, cadence, discount authority, eligibility, and founder-approval conditions;
6. founder-only market-pod approve/hold/reject records, with recommendation/research kept held and zero-budget until review;
7. founder-only approved operating envelopes that require stored founder pod approval and transactionally revalidate existing source policy, offer, compatible optional global/pod budget, explicit email sender, active templates, time window, volume caps, cost cap, stop conditions, and approval mode;
8. deterministic downgrade/hold of requested `exception-only` mode, with every other approved mode remaining shadow or approval-only;
9. interested replies automatically invoke the same suppression/contactability/source-policy qualification guard used by the explicit revenue action;
10. target outcomes automatically refresh activation watches through indexed latest/earliest/terminal summary reads; qualification reconciles a prior outcome when the account is created later; only two-surface activation transactionally closes the linked opportunity;
11. elapsed seven-day watch deadlines read as stalled without a scheduler, and Daily Growth Mission prioritizes stalls/overdue opportunities with pipeline, founder-attention, and estimated-spend context;
12. `signaldeskRevenueControlSummaries/current` for one-currency pipeline, weighted pipeline, wins/losses, activation, stalls, and founder-attention totals;
13. transactional idempotency/delta updates, deterministic immutable offer/envelope IDs, expiry annotation, product-local Firestore rules/indexes, audit events, run timelines, daily cost writes, bounded failure diagnostics, hard mobile form/action denial, runtime verifier coverage, and local emulator E2E.

This layer adds no provider call, send, social publish, scheduler, calendar/proposal/payment connector, or MenuList store/menu/project/billing/customer-truth write.

## July 11 Activation-Control Hardening

The runtime now also implements:

1. field-level source-rights metadata (`accessMethod`, allowed/blocked fields, terms/version, attribution, prohibited uses, raw-payload policy, refresh method, policy owner, and review time);
2. current-policy revalidation of persisted research rows, with `allowedRoute`, route-permission state, hard-gate failures, and research-only handling;
3. derived activation opportunities with a small lifecycle and separate decision dimensions;
4. a five-item Today decision queue while Opportunities retains up to 30 research rows;
5. five primary Ant Design navigation destinations: Today, Opportunities, Conversations, Activations, and Controls; existing protected deep routes remain available from Advanced Controls;
6. idempotent, evidence-bound two-surface outcomes and rejection of legacy/unverified activation authority;
7. a signed, timestamped, replay-bounded SignalDesk outcome receiver plus hashed, expiring route tokens;
8. a founder-controlled proof-permission ledger that is rechecked at asset and draft generation time;
9. complaint/privacy/legal classification with immediate suppression, incident creation, channel pause, audit, and mission priority;
10. an observe-only Opportunity Case drawer with no raw contact reveal;
11. current-policy and target-suppression revalidation for every persisted research route;
12. composite contact/evidence/personalization checks on message preparation and delivery paths;
13. in-request identity dedupe before manual-import batch commit;
14. exact proof-scope binding and scope-narrowing/revocation enforcement;
15. outcome request-fingerprint conflicts, durable owner-qualified/verified-activation target projections, and converted-state preservation;
16. owner-qualified seven-day activation clocks independent of bounded outcome history;
17. provider-scoped, path-safe, atomic webhook idempotency with existing-target validation and reply projection;
18. mobile pause controls that can activate but not clear a pause while every other mutation stays server-blocked;
19. self-only normal-member membership reads with platform-admin list access;
20. a lightweight NextAuth session wrapper in the SignalDesk layout so MenuList store/tenant Firebase bootstrap code cannot enter the SignalDesk client bundle;
21. a noindex SignalDesk-local credentials gateway with bounded callbacks, active-access recheck, Ant Design theme parity, and no MenuList store/Firebase-claims bootstrap.

No MenuList runtime file was changed. The signed bridge receiver is ready locally, but a MenuList-owned event emitter remains an external integration decision.

## July 11 Manual Action Completion Hardening

The first-trial operating loop now distinguishes preparation from execution:

1. `export-message` and exported assisted handoffs retain the target's existing lifecycle state and set `nextAction = contact`; they no longer claim that contact occurred.
2. `record-manual-contact` is a protected, rate-limited, Zod-validated desktop action with `target.review` permission and hard mobile blocking.
3. The action accepts only `email-export` or `partner-intro`, rechecks the exact current source-policy ID, contact use, retention/expiry, suppression, target state, global/channel pause, and route eligibility. `limited` contactability never implies a form, phone, social, or messaging route. A true `permissioned-referral` may use `partner-intro` without storing a direct email/phone/social route.
4. `email-export` confirmation requires a fresh export whose creation time is not later than the recorded action and whose current conversation state remains `exported`; a consumed or older-than-30-day export cannot be reused.
5. A hashed founder/target/idempotency key reserves one existing run-timeline document with `batch.create`; its normalized request fingerprint lets exact retries return the existing result even after the export is consumed, while changed facts under the same key fail closed. Concurrent retries cannot duplicate target, conversation, suppression, audit, or cost writes.
6. The existing target summary stores only the latest bounded route/result/time projection. The conversation summary records a safe result label and outbound timestamp; the optional note stays in the admin audit reason rather than a new list collection.
7. `wrong-contact` atomically blocks contactability and writes the hashed suppression record. Other results do not rewrite suppression/contactability, so a concurrently-added suppression state cannot be cleared. The action never sends, schedules follow-up, calls a provider, or writes MenuList truth.
8. Approval rejection now requires one bounded reason. `other` requires a note, and the server independently enforces both rules for non-HTTP callers. The terminal approve/reject transition, target/draft/packet projections, queue decrement, audit, and cost write share one Firestore transaction so concurrent decisions cannot both consume a pending item.
9. Conversations exposes the manual confirmation form. Approval Queue exposes a reason selector and optional note. Both remain disabled in mobile observe-only mode while the server still blocks forced requests.

No collection, index, Firestore rule, Storage rule, provider adapter, public route, or MenuList runtime file was added.

## July 15 Source-Policy And Transactional Import Hardening

Source authority and import lineage now share one runtime contract instead of relying on route-local types or permissive persisted casts:

1. `sourcePolicyContracts.ts` is authoritative for source-policy creation and persisted projection. Contact, evidence, import, personalization, provider-run, and storage authority are all required booleans; missing values do not default open.
2. Contact authority requires an approved access method, explicit bounded contact channels, matching allowed fields, and evidence. Public discovery or a provider record never implies permission to contact.
3. Source-policy documents must carry `pId = SD`, match their Firestore document ID, satisfy review/expiry/retention/provider semantics, and project through an explicit DTO before any workspace or operation consumes them.
4. Policy creation uses a deterministic actor-plus-idempotency claim and stable request fingerprint in one transaction. An exact replay returns the original policy; reuse with changed facts fails closed.
5. `targetContracts.ts` is authoritative for import rows and target/source/research projections. URLs are credential-free HTTP(S), bounded fields are normalized, unexpected request fields are rejected, and internal/contact fields cannot leak through target summary DTOs.
6. Every retained email, phone, or Instagram value requires that row's `permissionEvidenceRef`. Import checks both the retained phone suppression identity and the exact legacy digits-only identity.
7. One Firestore transaction reads source authority, identity indexes, targets, contact identities, source candidates, suppressions, provider lineage, retention rows, and provider idempotency truth before any write. Foreign, orphaned, rebound, divergent, or mismatched records abort the whole import.
8. Re-import preserves mature target lifecycle and derived scores. It also preserves an existing contact permission state. Import refresh is not an authority-upgrade operation.
9. Only exact historical identity/contact records missing `pId` may migrate. Near matches, additional fields, wrong-product records, and incompatible lineage fail closed.
10. Provider adapters parse unknown payloads into bounded shared rows, cap result arrays, use abort timeouts, and expose stable safe failure codes. The workspace binds provider actions to an exact usable policy for the selected provider and keeps policy-create retry identity stable.
11. Manual CSV parsing uses one shared ten-column state machine. It supports escaped quotes, quoted commas/newlines, CRLF, and an optional exact header while rejecting unclosed quotes, shifted columns, overlong fields, empty names, and more than 50 rows before submission.
12. Manual imports use an actor-bound stable retry key and request fingerprint. Exact and concurrent retries return the same source run and target DTOs; changed facts under the same key fail closed without another write set.
13. Provider targets use versioned, provider-namespaced identity based on the record ID, then record URL, then bounded business facts. A pre-contract identity is reused only when strict target detail or provider-retention provenance proves the same external record, so same-name provider rows cannot overwrite one another.
14. Persisted target/research scores are bounded from 0 through 100, Firestore timestamps must remain Firestore timestamps, source-run status must agree with its counts, research verdict counts must reconcile to table-row count, and queued/running research runs cannot carry terminal rows or provider-run IDs.
15. Manual import admits only manual CSV, manual research, or owned-demand policies and rejects provider record fields before Firestore work. Provider-backed identity can enter only through a completed, matching provider run; rejected provenance spoof attempts create no source run, target, identity, candidate, claim, or cost truth.
16. Google Maps and provider listing URLs remain provenance, not current-menu truth. Only explicit current-list/menu fields can set `currentListUrl`; malformed optional provider contact/URL values are dropped independently without dropping an otherwise valid business. Opportunity classification prefers explicit PDF, then Instagram-only, then missing-current-list, and otherwise stays unknown.
17. Target detail reads enforce canonical email, international phone, Instagram handle, credential-free HTTP(S), an external-provider enum, and exact identity-version/provider/record coupling. Score replay and scoring inputs use strict product/identity/range projectors. Research runs require one explicit matching source-policy ID, and persisted row verdicts must agree with score bands and fail-safe route state.
18. Strict workspace lists page by descending `updatedAt` across bounded pages before projection, so arbitrary document IDs cannot hide newer valid truth. Outcome settlement and later reply capture preserve owner-qualified and verified-activation fields as Firestore `Timestamp` values rather than round-tripping public ISO DTO strings into persistence.
19. A newly imported target is projected through the same strict target-summary DTO as an exact replay, so retry timing cannot change response keys or expose persistence-only fields.
20. Identity-index, contact-identity, and source-candidate readers accept only their documented persistence fields and return explicit allowlists. Unknown/private fields are stripped, while raw document identity must equal the Firestore path before any trim or normalization.

This correction adds no outbound send, manual-contact settlement, webhook settlement, scheduler, public route, Firebase rule/index change, or MenuList truth write. Existing outcome behavior is unchanged; only the target lifecycle timestamp persistence format was repaired to match its existing Firestore contract.

## July 22 Daily Activation Operator Loop

The current runtime now makes Today the outcome-first daily surface without changing server authority:

1. `dailyActivationDesk.ts` combines the existing ranked Daily Growth Mission with live bounded Dashboard summaries, removes resolved reply/approval and terminal-target work, deduplicates by target, and caps Today at five items.
2. Direct score/evidence/draft work still uses the existing protected actions. Focus advances only after a durable action succeeds and the workspace refreshes. `Next` changes local focus only.
3. Market Search is collapsed while current outcome work exists, reducing the incentive to add leads before finishing activations.
4. The Opportunity Case drawer now shows a read-only target journey across evidence, contact, approval, MenuList setup outcomes, two-surface activation, and proof readiness using already-loaded summaries.
5. Interested/activation-started cases can copy the existing anonymous founder-pilot MenuList setup URL. This performs no provider send, route-token mint, contact settlement, outcome write, or MenuList truth mutation.
6. A durable target activation timestamp with evidence reference, approved integrity, and two distinct surfaces can open the existing Content Rail with a target-scoped proof-preparation hint. The browser then selects current permission/source authority and prefills review fields only; every asset/draft/review/schedule/publication action remains explicit.
7. Today shows a seven-day route-to-activation snapshot derived only from existing outcome summaries. Only evidence-backed verified two-surface outcomes count as activation; its percentage links unique routed targets to those same targets' verified activation outcomes, while stalls require an elapsed durable activation deadline.

The slice adds no collection, API route, server action, provider call, listener, scheduler, rule, index, Storage path, dependency, mobile mutation, or Firebase deploy requirement.

## Remaining Implementation Gates

Before real-project usage, provider send, and external integrations:

- Firebase deploy is skipped in this session; create or grant access to `menulist-signaldesk-qa` and `menulist-signaldesk` before any deploy;
- seed founder/admin team membership or confirm platform admin claims in the active auth environment;
- store the approved Bengaluru market-pod review in the founder-authenticated QA runtime after Firebase access is restored;
- supply the first real permissioned business list; the 30-day public-business evidence policy is approved but does not grant contact rights;
- select the first real menu-photographer or restaurant-consultant introduction; the learning test remains zero-fee and zero-budget;
- confirm sender identity and physical address policy;
- confirm unsubscribe, bounce, complaint, DNC, and suppression handling;
- keep `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND` false until the send/export gate passes.
- provision `SIGNALDESK_OUTCOME_BRIDGE_SECRET` and implement a separately reviewed MenuList-owned signed event emitter before using the bridge outside local tests;
- paid campaign automation remains skipped by founder instruction.
