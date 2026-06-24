# MenuList SignalDesk - Implementation Plan

**Status:** First-build internal workflow, investment-control runtime, Apify source broker, owned email sequencer queue, market pod planner, weekly strategist memo, provider evaluation harness, channel-window/source-retention runtime, Content Distribution Rail runtime, and Trust Partner Rail runtime implemented; paid campaigns, external paid-provider adapters, provider send, auto-publish, and deploy skipped
**Created:** June 23, 2026
**Runtime:** Product-isolated app shell, API guard, overview API, workspace API, action API, kill-switch API, first-build workflow service, provider registry, budget governor, model routes, model evals, enrichment waterfalls, vendor run ledger, Apify source broker, approval packets, sender-domain risk, owned email sequencer queue, content distribution rail, optional external sequencer handoff records, run timelines, Firebase config, rules/indexes/storage rules, and functions skeleton created.
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

## Investment-Control Runtime Added

The June 23 investment-control implementation added the internal controls needed before paid provider scale:

| Area | Current implementation |
| --- | --- |
| Provider registry | `signaldeskProviderAccounts` stores provider, use, credential state, owner approval, status, per-run/daily/monthly caps, spend counters, and disabled reason. |
| Budget governor | `signaldeskBudgetPolicies` stores provider/global/task-style caps; provider spend checks block unregistered, unapproved, disabled, over-run, over-daily, and over-monthly use. |
| Model routes | `signaldeskModelRoutes` route AI tasks by provider/model/status/cost cap; current executable route is Gemini only, while stronger OpenAI/Anthropic routes remain held until adapters/accounts are approved. |
| Model evals | `signaldeskModelEvals` records sampled confidence/pass/rejected-fact state for AI assist runs. |
| Waterfall policy | `signaldeskEnrichmentWaterfalls` stores provider order, requested field, max credits, stop condition, verification requirement, source policy, retention, and active/hold state. |
| Vendor ledger | `signaldeskVendorRuns` records source-provider and waterfall readiness/blocked states with estimated cost and blocked reason. |
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
| Sender-domain risk | `signaldeskSenderDomains` tracks authentication, ramp, bounce, complaint, unsubscribe, provider, and brand risk; email handoff/send requires an active ready sender domain. |
| Owned email sequencer | `signaldeskSequencerHandoffs` and `signaldeskSequencerSteps` queue one approved email step through the internal `owned-email` rail after approval, sender-domain, suppression, source-policy, prior-contact, pause, and email-readiness gates. |
| External sequencer handoff | `signaldeskSequencerHandoffs` records Smartlead/Instantly/lemlist handoff readiness or blocked reason without connecting or sending to sequencers. |
| Run timelines | `signaldeskRunTimelines` gives founder-readable traces for defaults, providers, enrichment, models, approval packets, and handoffs. |
| Self-service CTA | `signaldeskSelfServiceCtas` stores proof/activation CTA copy and is injected into evidence-bound drafts. |

External paid-provider adapters for Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, Postmark, Resend, Smartlead, Instantly, and lemlist are still not connected. This is intentional: the internal governor and owned email rail exist first, and actual account connection remains an owner decision.

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
| 17 | Trust partner rail | Partner/creator profiles, 3-5 niche tests, lean briefs, flat-fee deals, deliverables, disclosure gates, outcome attribution, and renewal decisions. Route/read model and disabled action stubs exist, but executable runtime remains behind the false feature flag. |

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
| Create evidence packet | Store source facts, rejected facts, allowed-use notes, expiry. |
| Draft message | Use approved template and variables only. |
| Approve action | Human reviewer transitions work item to approved. |
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
- Every AI worker must validate typed output before storage.

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

- assisted WhatsApp: implemented as gated handoff/provider-send plumbing
- Instagram/Messenger inbound routing: implemented as gated webhook/handoff plumbing
- live source-provider import: implemented for Google Places Text Search and Apify Source Broker with provider source policy, max-result cap, provider budget, and no raw provider payload storage
- real AI provider assist: implemented through the existing Gemini gateway
- trust partner rail: implemented for internal testing; real partner outreach/spend still requires active budget policy, founder approval, disclosure review, and manual partner execution
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
4. global outbound kill-switch API with role checks, rate limiting, Zod validation, audit event, and control-room summary update;
5. dedicated SignalDesk Firebase client/admin configuration using full `MENULIST_SIGNALDESK_*` env names;
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

1. provider integration env names under `MENULIST_SIGNALDESK_*`;
2. internal `/signaldesk/sources`, `/signaldesk/ai`, and `/signaldesk/channels` pages;
3. source-provider action using Google Places Text Search or Apify Source Broker with a required provider source policy, max-result cap, provider account, and budget cap;
4. Apify connector/settings readiness, env-controlled Actor ID, normalized target rows, vendor ledger, source health event logging, and webhook status intake;
5. Foursquare provider placeholder blocked until explicit source approval;
6. real Gemini AI assist action for score/evidence/draft/reply-classification review runs;
7. AI worker run, decision snapshot, AI operation ledger, audit, and cost summary writes for AI assist;
8. signed webhook endpoint for email, WhatsApp, Instagram, Messenger, and Apify providers;
9. webhook HMAC/shared-secret validation, public rate limiting, normalized event storage, channel/source health updates, and suppression updates where channel events apply;
10. assisted channel handoff for approved drafts;
11. SMTP/Meta provider-send adapter behind the global provider-send flag and channel readiness checks;
12. phone, WhatsApp, and Instagram contact identity indexing when source policy allows contact use.

## Remaining Implementation Gates

Before real-project usage, provider send, and external integrations:

- Firebase deploy is skipped in this session; create or grant access to `menulist-signaldesk-qa` and `menulist-signaldesk` before any deploy;
- seed founder/admin team membership or confirm platform admin claims in the active auth environment;
- confirm first market pod;
- confirm first approved source list and retention policy;
- confirm first trust partner niche, flat-fee cap, disclosure wording, and tracking CTA before Trust Partner Rail runtime;
- confirm sender identity and physical address policy;
- confirm unsubscribe, bounce, complaint, DNC, and suppression handling;
- keep `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND` false until the send/export gate passes.
- paid campaign automation remains skipped by founder instruction.
