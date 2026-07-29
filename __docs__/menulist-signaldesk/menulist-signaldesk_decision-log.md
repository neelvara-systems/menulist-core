# MenuList SignalDesk - Decision Log

**Status:** Active log
**Created:** June 23, 2026
**Last Updated:** July 11, 2026
**Purpose:** Preserve decisions that should not be lost in chat.

## June 23, 2026 - Initial Documentation Set

### Context

Founder selected the name MenuList SignalDesk and asked to start the doc set preparation for the private internal tool. The source ChatGPT conversation contains many features, so the first pass created a dedicated docs root and project-level doc set.

### Decisions

1. Use `MenuList SignalDesk` as the internal project name.
2. Create docs under `__docs__/menulist-signaldesk/`.
3. Treat SignalDesk as a private internal growth control room, not a public product.
4. Do not create public `_website.md` or public `_helpdoc.md` files for SignalDesk.
5. Replace public docs with internal `_operator-runbook.md` and `_compliance.md`.
6. Start from the corrected private-tool build spine, not the transcript order.
7. Keep the 38 ChatGPT specs as source inventory and map them into module doc sets.
8. Build first around target registry, source provenance, AI scoring, evidence packets, safe drafts, human approval, email/export, inbox, attribution, demand signals, and control room.
9. Keep WhatsApp API automation, Instagram/Messenger automation, Meta paid intent, campaign optimizer, and cluster planner as owner-gated modules.
10. Prefer a separate private runtime repo/project only if operations demand it; no runtime code created in this pass.
11. Create `signaldesk-foundation` as the first per-feature doc set because access, roles, audit, and kill switches must exist before source import or sending.

### Source Evidence

- Corrected private-tool scope: `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:6`
- Control-room verdict: `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:19`
- Build order: `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:207`
- Feature/source spec inventory: `../growth-engine/growth-engine_chatgpt-review-2026-06-23.md:448`
- Growth research alignment: `../menulist-marketing-distribution/menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md:91`

### Files Created

- `README.md`
- `menulist-signaldesk_feature-map.md`
- `menulist-signaldesk_spec.md`
- `menulist-signaldesk_impl.md`
- `menulist-signaldesk_firebase.md`
- `menulist-signaldesk_compliance.md`
- `menulist-signaldesk_operator-runbook.md`
- `menulist-signaldesk_mobile-support.md`
- `menulist-signaldesk_test-cases.md`
- `menulist-signaldesk_action-register.md`
- `menulist-signaldesk_decision-log.md`
- `signaldesk-foundation/README.md`
- `signaldesk-foundation/signaldesk-foundation_spec.md`
- `signaldesk-foundation/signaldesk-foundation_impl.md`
- `signaldesk-foundation/signaldesk-foundation_firebase.md`
- `signaldesk-foundation/signaldesk-foundation_compliance.md`
- `signaldesk-foundation/signaldesk-foundation_mobile-support.md`
- `signaldesk-foundation/signaldesk-foundation_test-cases.md`

### Remaining Work

Create focused per-module doc sets in the order recorded in `menulist-signaldesk_feature-map.md`.

### Boundaries

No code, Firebase config, provider setup, outreach, public route, deploy, or external account action was performed.

## June 23, 2026 - Feature Doc Set Coverage Completed

### Context

After the initial project docs and `signaldesk-foundation` folder were created, the founder asked whether the project had feature-by-feature doc coverage. The answer was no, so the remaining build modules were documented as focused internal feature doc sets.

### Decisions

1. Treat the first-pass SignalDesk documentation as complete only when every build-slice module has its own internal feature folder.
2. Keep the per-feature pattern consistent: `README.md`, `_spec.md`, `_impl.md`, `_firebase.md`, `_compliance.md`, `_mobile-support.md`, and `_test-cases.md`.
3. Continue excluding `_website.md`, `_helpdoc.md`, and `_marketing.md` because SignalDesk remains private and internal.
4. Keep implementation blocked until founder decisions exist for runtime repo, Firebase project IDs, first market pod, sender identity, physical address policy, and approved source list.

### Feature Folders Covered

- `signaldesk-foundation/`
- `signaldesk-target-registry/`
- `signaldesk-source-policy/`
- `signaldesk-ai-intelligence/`
- `signaldesk-evidence-packets/`
- `signaldesk-draft-control/`
- `signaldesk-approval-queue/`
- `signaldesk-email-rail/`
- `signaldesk-inbox/`
- `signaldesk-outcome-bridge/`
- `signaldesk-demand-signals/`
- `signaldesk-control-room/`

### Boundaries

No code, Firebase config, provider setup, outreach, public route, deploy, external account action, website doc, or public help doc was created.

## June 24, 2026 - Trust Partner Rail Planning Added

### Context

Founder shared an X article about scaling Cal AI through influencer distribution and asked whether it was useful for SignalDesk. The article was treated as an external playbook input, not a direct implementation instruction.

### Decisions

1. Adopt the system lessons: trust-channel testing, speed, 3-5 niche tests, lean briefs, flat-fee deals, deliverable tracking, and renewal/cut decisions.
2. Reject direct consumer-app influencer copying for MenuList.
3. Name the MenuList-fit module `SignalDesk Trust Partner Rail`.
4. Focus on restaurant-owner trust channels such as restaurant consultants, menu photographers, local food/business creators with operator audiences, agencies, POS/payment partners, and local business communities.
5. Keep broad UGC, celebrity creators, follower-count buying, per-view default pricing, automated contracts, automated payments, public partner portals, provider send, paid campaign automation, and deploys out of scope.
6. Add the feature flag as disabled: `ENABLE_MENULIST_SIGNALDESK_TRUST_PARTNER_RAIL: false`.
7. Require disclosure, approved claims, banned-claim review, budget approval, and outcome attribution before any paid or incentivized partner workflow.

### Files Added Or Updated

- `signaldesk-trust-partner-rail/`
- `menulist-signaldesk_feature-map.md`
- `menulist-signaldesk_action-register.md`
- `menulist-signaldesk_impl.md`
- `menulist-signaldesk_firebase.md`
- `menulist-signaldesk_validation.md`
- `README.md`
- `src/config/features.ts`

### Boundaries

No runtime route, API action, Firestore collection, provider call, partner outreach, contract, payment, public page, Firebase deploy, Vercel deploy, paid campaign automation, or provider send was added.

## June 23, 2026 - Pre-Implementation Architecture Decision

### Context

Before implementation, the founder asked to revise Firebase optimization and product-separation/code-splitting strategy so the project does not become mixed into MenuList owner/customer runtime.

### Decisions

1. Implement SignalDesk inside this monorepo first, but as a product-isolated internal module.
2. Keep extraction-ready boundaries through product-scoped folders, product-local constants, dedicated Firebase config, dedicated rules/indexes/storage rules, and `functions-signaldesk/`.
3. Use proposed product code `SD` by adding `PRODUCT_IDS.SIGNALDESK = "SD"` in the first runtime PR.
4. Do not reuse `GR`; GrowthOS/Growth Kits is a separate boundary.
5. Use dedicated Firebase projects: `menulist-signaldesk-qa` and `menulist-signaldesk`.
6. Use full env prefix `SIGNALDESK_*`; do not introduce `SD_*` shorthand keys.
7. Keep SignalDesk data out of MenuList Firestore collections except through a narrow, documented outcome bridge.
8. Make every default screen summary-first; raw events/messages/import rows are detail/admin drill-down only.
9. Add AI operation ledgers, idempotency keys, source-run summaries, conversation summaries, and cost daily summaries before provider send automation.
10. Block provider send until sender identity, physical address, unsubscribe, bounce, complaint, suppression, and kill-switch flows are verified.

### Files Updated

- `menulist-signaldesk_architecture-readiness.md`
- `menulist-signaldesk_impl.md`
- `menulist-signaldesk_firebase.md`
- `signaldesk-foundation/signaldesk-foundation_impl.md`
- `signaldesk-foundation/signaldesk-foundation_firebase.md`
- `README.md`
- `menulist-signaldesk_action-register.md`

### Boundaries

No runtime code, Firebase project, Firebase config, rules, indexes, functions package, provider setup, public route, deploy, or outbound action was created in this revision.

## June 23, 2026 - Foundation Runtime Implemented

### Context

The founder asked to start implementing SignalDesk end to end. The first safe implementation slice is the product-isolated foundation because provider send, source providers, market pod, physical address, and Firebase project access are not ready.

### Decisions

1. Implement the foundation inside this monorepo using product-scoped code folders and dedicated Firebase config.
2. Add `PRODUCT_IDS.SIGNALDESK = "SD"` and full-name `SIGNALDESK_*` runtime/env constants.
3. Add `/signaldesk` protected internal routes but no public website, no owner/customer navigation, and no sitemap entry.
4. Add summary-first overview reads and a kill-switch write path before any target/import/provider send work.
5. Keep provider send disabled through `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND = false`.
6. Add Firestore and Storage rules with default deny and server/admin-only writes.
7. Add a dedicated `functions-signaldesk` package, but keep provider webhooks, AI workers, and scheduled summaries disabled in its first skeleton.
8. Do not deploy Firebase infrastructure because the `menulist-signaldesk-qa` and `menulist-signaldesk` projects/access are owner-controlled and not confirmed in this session.

### Files Added Or Updated

- `.gitignore`
- `firebase-signaldesk.json`
- `firestore-signaldesk.rules`
- `firestore-signaldesk.indexes.json`
- `storage-signaldesk.rules`
- `functions-signaldesk/`
- `src/app/(signaldesk)/`
- `src/app/api/signaldesk/`
- `src/components/signaldesk/`
- `src/constants/signaldesk/`
- `src/database/signaldesk/`
- `src/hooks/signaldesk/`
- `src/lib/firebase/signaldeskConfig.ts`
- `src/lib/firebase/signaldeskFirebaseAdmin.ts`
- `src/lib/firebase/signaldeskFirebaseClient.ts`
- `src/lib/signaldesk/`
- `src/types/signaldesk/`
- `src/config/features.ts`
- `src/constants/deploymentTargets.ts`
- `src/constants/product.ts`
- `src/lib/env/validateEnv.ts`
- `tsconfig.json`

### Verification

- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm install` in `functions-signaldesk/` completed with a local Node 18 vs functions Node 22 engine warning.
- `npm run build` in `functions-signaldesk/` passed.
- `firebase emulators:exec --only firestore,storage --project demo-signaldesk --config firebase-signaldesk.json "true"` passed.
- `git diff --check` for touched SignalDesk paths passed.

### Boundaries

No Firebase project was created, no Firebase deploy was run, no provider was configured, no source import ran, no target/contact data was written, no outbound message was sent, no public page was created, and no MenuList owner/customer surface was changed.

## June 23, 2026 - First-Build Internal Workflow Implemented

### Context

The founder asked to implement every documented SignalDesk feature end to end. The safe interpretation is the documented first-build internal workflow, not external provider send, because sender identity, physical address, unsubscribe/bounce/complaint handling, approved source list, and Firebase project access are not owner-confirmed yet.

### Decisions

1. Implement all P0 first-build features through protected internal APIs and a section-aware workspace UI.
2. Keep all client data access through `/api/signaldesk/workspace` and `/api/signaldesk/actions`; do not add direct client Firestore writes.
3. Implement AI intelligence as deterministic rules-based scoring first, with operation ledger records and zero provider cost, until a real AI worker/eval budget is approved.
4. Implement email as export-only, not provider send.
5. Implement inbox as manual reply capture with rules-based classification and suppression writes for DNC/wrong-contact replies.
6. Implement MenuList outcomes as SignalDesk outcome events and summaries only; do not write MenuList `stores`, `projects`, billing, menu publish, or customer output.
7. Implement demand signals as compact SignalDesk events and summaries only.
8. Expand Firestore rules to read-only internal summary/workflow collections while keeping all client writes denied.

### Features Covered

- source policies;
- manual target import;
- identity dedupe and source provenance;
- rules-based target scoring;
- evidence packets;
- template-based safe drafts;
- approval queue;
- export-only email rail;
- manual inbox replies and classification;
- suppression ledger updates from DNC/wrong-contact replies;
- outcome bridge summaries;
- demand-signal summaries;
- control-room summaries;
- audit events.

### Verification

- `npx tsc --noEmit --incremental false --pretty false` passed.
- `firebase emulators:exec --only firestore,storage --project demo-signaldesk --config firebase-signaldesk.json "true"` passed.

## June 23, 2026 - Owner Control Model Accepted

### Context

The founder clarified the intended point of view: SignalDesk should help market and distribute MenuList while Danny mainly observes, monitors, approves, pauses, or redirects. The system should do the research, dedupe, scoring, evidence preparation, draft preparation, reply routing, suppression, attribution, and learning work.

### Decisions

1. Treat SignalDesk as a MenuList distribution system, not a manual CRM.
2. Make the founder posture `observe -> monitor -> approve -> pause or redirect`.
3. Make the system posture `research -> dedupe -> score -> gather evidence -> draft -> queue approvals -> route replies -> suppress risk -> attribute outcomes`.
4. Convert manual work into system-prepared approval packets wherever policy and safety allow it.
5. Keep humans at source policy, market pod, channel readiness, message approval, risky exceptions, pause, redirect, and scale decisions.
6. Keep default screens summary-first: movement, risk, approvals, intervention, and MenuList outcomes.
7. Do not expose raw imports, raw webhook events, raw messages, or raw AI operation logs by default.
8. Keep provider send disabled until sender/compliance/source/channel readiness is complete.
9. Keep paid campaign automation skipped.
10. Keep Firebase deploy skipped until explicitly requested.

### Files Updated

- `README.md`
- `menulist-signaldesk_spec.md`
- `menulist-signaldesk_impl.md`
- `menulist-signaldesk_owner-control-model.md`
- `menulist-signaldesk_operator-runbook.md`
- `menulist-signaldesk_action-register.md`
- `src/components/signaldesk/SignalDeskWorkspace.tsx`
- `src/components/signaldesk/SignalDeskWorkspace.module.scss`

## June 23, 2026 - Web Research Gates Added

### Context

The founder asked to research the owner-control SignalDesk direction on the web and add whatever is valid and needful. The review focused on official/current sources for email compliance, sender authentication, WhatsApp/Meta messaging windows, Google Places data handling, phone/text consent risk, and AI risk management.

### Decisions

1. Add a web research addendum as a first-class SignalDesk doc.
2. Treat the research output as gates, not as permission to automate more sending.
3. Add sender-health readiness before provider send can ever be enabled.
4. Add channel-window state for WhatsApp, Instagram, and Messenger handoffs.
5. Add provider-source retention and Google Place ID refresh requirements.
6. Keep automated phone/SMS outreach blocked unless explicit consent and jurisdiction review exist.
7. Add AI quality monitoring around confidence, rejected facts, edit rate, eval failures, and cost.
8. Define an owner approval packet that combines evidence, source retention, channel readiness, suppression, risk, cost, and action choices.

### Files Updated

- `README.md`
- `menulist-signaldesk_web-research-addendum-2026-06-23.md`
- `menulist-signaldesk_compliance.md`
- `menulist-signaldesk_owner-control-model.md`
- `menulist-signaldesk_action-register.md`
- `menulist-signaldesk_decision-log.md`
- `menulist-signaldesk_validation.md`

## June 23, 2026 - Cross-Check Hardening

### Context

After the first-build internal workflow was implemented, the founder asked to cross-check everything. The review focused on Firebase project separation, security logging, allowed-use enforcement, evidence/draft/export gates, public-surface isolation, and local validation.

### Findings Fixed

1. SignalDesk server reads/writes now refuse to use Firestore unless explicit SignalDesk Firebase config exists or the local emulator is active.
2. Action and kill-switch validation failures now use the SignalDesk security logging path.
3. Source imports no longer normalize, hash, store, or index contact values when the source policy disallows contact use.
4. Evidence packets now require source-policy evidence approval and only permit draft personalization when the source policy allows it.
5. Draft creation now requires an evidence packet, personalization approval, and draft-ready target state.
6. Export now requires an approved approval, existing approved draft, evidence, clear suppression, contact-use approval, ready email contactability, and inactive outbound/email kill switches.
7. Action API errors now expose only allowlisted workflow-state errors and mask unknown failures.

### Verification

- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run build` in `functions-signaldesk/` passed; generated `functions-signaldesk/lib` was removed after validation.
- `firebase emulators:exec --only firestore,storage --project demo-signaldesk --config firebase-signaldesk.json "true"` passed.
- `git diff --check` passed.
- Public-surface search found no SignalDesk references in website, sitemap, robots, middleware, client shell, or app templates.
- Local dev smoke on port `3002` returned `200 OK` for `/signaldesk`.
- Anonymous workspace, action, and kill-switch APIs returned `401 Unauthorized`.

### Boundaries

No Firebase deploy was run because `menulist-signaldesk-qa` and `menulist-signaldesk` project access is not confirmed. Provider send remains disabled until sender identity, physical address, unsubscribe, bounce, complaint, suppression, approved source list, and Firebase project access are complete.
- `npm run build` in `functions-signaldesk/` passed.
- `/signaldesk` returned `200 OK` in local dev.
- Anonymous `/api/signaldesk/workspace?section=targets` returned `401 Unauthorized`.
- Anonymous `/api/signaldesk/actions` returned `401 Unauthorized`.
- `git diff --check` for touched SignalDesk paths passed.

### Boundaries

No Firebase deploy was run because the SignalDesk Firebase projects/access are not confirmed. No provider was configured. No provider send was implemented or executed. No real source import, target/contact data creation, suppression write, message export, outcome, or demand-signal write was exercised during local verification because authenticated SignalDesk project access is still required.

## June 23, 2026 - Solo-Founder Investment Plan Adopted

### Context

The founder clarified that SignalDesk is the main system he will depend on as a solo technical founder, and that he is willing to invest in AI model APIs and third-party providers such as Apollo if they make the system powerful enough to market and distribute MenuList.

### Decisions

1. Treat SignalDesk as the internal MenuList distribution operating system, not only a lead-generation workflow.
2. Use investment to buy source coverage, evidence quality, targeting judgment, safer preparation, monitoring, learning, and budget control.
3. Do not use investment to buy uncontrolled sending, generic list blasting, raw provider dependency, or public product scope.
4. Add Apollo as a valid enrichment lane for high-value B2B/company/person workflows, but not as the default source for every local restaurant.
5. Add Hunter/ZeroBounce-style verification as a controlled email finding/validation layer before export/send.
6. Add Firecrawl/Tavily/Exa-style web research and crawl providers behind source policy, budget, retention, and provider-evaluation gates.
7. Keep Google Places as local candidate discovery, not durable prospect truth.
8. Replace the single-provider AI assumption with a gated AI model router.
9. Use cheap models for high-volume extraction/classification/reply triage and stronger models only for weekly strategist, high-value approval packets, low-confidence adjudication, and provider audits.
10. Add provider account registry, budget governor, vendor run ledger, normalized enrichment results, model route policy, model evals, approval packets, market pods, weekly strategy memos, and provider evaluation harness before serious paid-provider scale.
11. Continue to keep provider send, paid campaign automation, and Firebase deploy gated until explicitly approved.

### Files Updated

- `README.md`
- `menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md`
- `menulist-signaldesk_action-register.md`
- `menulist-signaldesk_decision-log.md`
- `menulist-signaldesk_validation.md`

### Boundaries

No paid provider account was purchased, connected, or configured. No new provider adapter code was implemented. No provider send was enabled. No paid campaign automation was implemented. No Firebase deploy was run.

## June 23, 2026 - Market Practice Cross-Check Adopted

### Context

The founder asked to cross-check the SignalDesk plan against how people are currently building AI-assisted lead generation and outbound systems for their own products. The review looked at Clay/Apollo-style data layers, waterfall enrichment, AI outbound, CRM duplicate checks, no-code workflows, Smartlead/Instantly/lemlist-style sequencer rails, sender deliverability practices, and buyer self-service behavior.

### Decisions

1. Keep SignalDesk as the internal intelligence/control layer rather than copying Clay or using no-code tools as the durable source of truth.
2. Add enrichment waterfall policies before connecting multiple enrichment providers.
3. Add audience/signal segment state on top of market pods so plays can be trigger-based, not only static city/category lists.
4. Add prior-contact, prior-conversation, suppression, and prior-MenuList-outcome guards before enrichment spend, export, handoff, or send.
5. Add sequencer handoff as an optional execution-rail model for Smartlead/Instantly/lemlist-style tools, but do not make SignalDesk sequencer-first.
6. Add sender-domain risk state to sender health; domain/inbox readiness, authentication, volume ramp, bounce, complaint, unsubscribe, reputation, and brand-risk monitoring are required.
7. Keep domain rotation and warmup practices unapproved by default; any use requires explicit founder approval and a brand-risk note.
8. Require evidence-bound personalization: every personalized line must cite an evidence ID or be rejected.
9. Add run timeline/graph visibility so the founder can understand system actions without raw-log overload.
10. Default CTAs should route toward MenuList self-service proof and activation, not only book-a-call.
11. Continue rejecting uncontrolled scraping, generic list blasting, spreadsheet-as-production-truth, auto-send from AI personalization, and optimizing only for opens/clicks.

### Files Updated

- `README.md`
- `menulist-signaldesk_market-practice-cross-check-2026-06-23.md`
- `menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md`
- `menulist-signaldesk_action-register.md`
- `menulist-signaldesk_decision-log.md`
- `menulist-signaldesk_validation.md`

### Boundaries

No paid provider account was purchased, connected, or configured. No sequencer account was connected. No provider send was enabled. No scraping workflow was run. No paid campaign automation was implemented. No Firebase deploy was run.

## June 24, 2026 - Remaining Internal Runtime Rails Implemented

### Context

The founder approved implementing the remaining SignalDesk rails except external enrichment/provider adapters. The product posture remains solo-founder/internal: the system prepares, tracks, recommends, and gates work so the founder can observe, monitor, approve, pause, or redirect.

### Decisions

1. Keep Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, and similar paid adapters skipped for this slice.
2. Implement WhatsApp/Instagram/Messenger channel-window state as internal eligibility records before assisted handoff or provider send.
3. Implement provider-source retention and Google Places refresh metadata without storing raw provider payloads.
4. Implement market pod recommendation and weekly strategist memo logic as rules-based internal decision support, not paid campaign automation.
5. Implement provider evaluation as an internal evidence harness over existing vendor/source/enrichment records, not as a live adapter call.
6. Enable Trust Partner Rail for internal testing: partner profiles, niche tests, flat-fee budget-checked deals, lean briefs, deliverables, compact metrics, renewal decisions, partner pause scope, and `/signaldesk/partners`.
7. Keep real partner outreach, contracts, payments, paid campaigns, external sequencer sends, provider send, Firebase deploy, Vercel deploy, and production build out of this slice.

### Verification

- `npm run verify:signaldesk` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `git diff --check` passed.
- `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` passed.

### Boundaries

No external paid adapter was implemented. No provider send was enabled. No automated partner outreach, contract, or payment workflow was added. No paid campaign automation was implemented. No Firebase deploy, Vercel deploy, or production build was run.

## June 24, 2026 - Content Distribution Rail Implemented

### Context

The founder asked to review Distribution.ai and implement the useful parts inside SignalDesk. The adopted lesson is source-to-channel content repurposing and scheduling discipline, not a public social tool or autonomous publisher.

### Decisions

1. Add SignalDesk Content Distribution Rail as an internal MenuList proof distribution workflow.
2. Store content sources, canonical assets, channel drafts, calendar items, and performance summaries in SignalDesk-local collections.
3. Generate deterministic channel drafts from approved content assets and CTAs.
4. Require owner approval before scheduling a draft.
5. Keep scheduling as an internal queue only; no auto-publish adapter is added.
6. Capture manual performance and bridge owner-quality signals into demand summaries.
7. Add a `content-distribution` kill switch and verifier coverage.

### Files Updated

- `src/app/(signaldesk)/signaldesk/content/page.tsx`
- `src/components/signaldesk/SignalDeskWorkspace.tsx`
- `src/app/api/signaldesk/actions/route.ts`
- `src/lib/signaldesk/workflowServer.ts`
- `src/types/signaldesk/index.ts`
- `src/constants/signaldesk/database.ts`
- `firestore-signaldesk.rules`
- `firestore-signaldesk.indexes.json`
- `scripts/verification/verify-signaldesk-runtime.js`
- `__docs__/menulist-signaldesk/signaldesk-content-distribution-rail/`

### Boundaries

No auto-publish, social scheduler adapter, paid campaign automation, provider send, Firebase deploy, Vercel deploy, or production build was run.

## June 24, 2026 - Growth Playbook Review Adopted

### Context

The founder shared a consolidated review of how fast-growing AI products and solo-founder distribution systems create growth loops. The review was evaluated against SignalDesk's private internal boundary and MenuList's current-list activation doctrine.

### Decisions

1. Adopt the artifact loop from Lovable/Bolt/Gamma-style growth, not generic viral launch tactics.
2. Define the MenuList loop as current-menu problem found -> MenuList preview -> owner approval -> live on two customer surfaces -> proof asset -> next target, partner, or content draft.
3. Keep the north star as activated businesses with current lists live on at least two customer surfaces within seven days.
4. Record a recommended first pod hypothesis pending founder approval: Bengaluru, Indiranagar + Koramangala, cafes/dessert shops/QSR/cloud-kitchen-facing storefronts, founder email/manual export first.
5. Record the first CTA hypothesis pending founder approval: one current official menu link for QR, WhatsApp, Google/Profile, Instagram, and repeat customers, reviewed before publishing.
6. Treat Activation Concierge as MenuList-side work. SignalDesk may route and observe outcomes, but it must not own upload, parse, preview, approval, publish, or public MenuList truth.
7. Keep demand listening source-policy-gated and manual-review only; do not add Reddit/X/LinkedIn auto-replies, cold WhatsApp, cold Meta DMs, provider send, auto-publish, or paid campaign automation.

### Files Updated

- `menulist-signaldesk_growth-playbook-review-2026-06-24.md`
- `menulist-signaldesk_action-register.md`
- `menulist-signaldesk_feature-map.md`
- `menulist-signaldesk_validation.md`
- `README.md`
- `../menulist-marketing-distribution/menulist-marketing-distribution_strategy.md`
- `../menulist-marketing-distribution/menulist-marketing-distribution_action-register.md`

### Boundaries

No runtime feature was added from this review. No provider send, paid campaign automation, auto-publish, cold social automation, public SignalDesk page, Firebase deploy, Vercel deploy, or MenuList truth write was introduced.

## July 10, 2026 - Revenue Operating Layer Implemented

### Context

The founder asked to turn the reviewed Revenue Operating System direction into docs and working code end to end. The useful repo-fit slice is a bounded commercial lifecycle over existing SignalDesk targets, policies, offers/CTAs, outcomes, audit, cost, and owner-control rails. It is not authorization for autonomous provider send, calendar/proposal/payment providers, or MenuList truth ownership.

### Decisions

1. Add a private `/signaldesk/revenue` workspace rather than separate Marketing and Sales products.
2. Link each existing target idempotently to one revenue account and create at most one automatic commercial opportunity when deterministic qualification passes.
3. Keep lifecycle, engagement, compliance, automation, activation, opportunity stage, and opportunity status as separate state dimensions.
4. Make commercial offer terms immutable within a version; price, discount authority, eligibility, or terms changes require a new version.
5. Build operating envelopes as references to existing source, offer, pod, budget, sender, template, time, cost, volume, stop, fallback, and approval controls.
6. Keep executable state at shadow or approval-only. A requested `exception-only` envelope is stored as held and falls back to per-item approval.
7. Derive activation watches only from SignalDesk outcome summaries. MenuList remains authoritative for store, menu, project, publish, billing, customer, and activation truth.
8. Materialize one compact revenue-control summary, including founder-attention minutes, instead of scanning raw messages or event collections.
9. Keep all revenue mutations server-only, mobile-blocked, audited, timeline-traced, cost-accounted, and client-write denied by Firestore rules.

### Cross-Check Corrections

The July 10 findings-first pass closed integrity gaps that were not visible in the initial sequential happy path:

1. Revenue envelopes no longer auto-attach the first active provider budget. Only compatible global or matching active-pod budgets may be referenced.
2. Every envelope requires an active market pod. Draft, held, expired, and exception-only records cannot expose approval-only execution.
3. Offer and envelope IDs are deterministic from name/version, and immutable terms cannot be overwritten inside a version.
4. Account/opportunity creation and revenue/activation summary deltas use Firestore transactions so concurrent retries remain exact.
5. Opportunity currency comes from its offer; valued opportunities require an offer and unlike minor-unit currencies cannot be combined.
6. Two-surface activation closes the linked opportunity, updates win/open/forecast summaries once, and moves the account to customer lifecycle.
7. Expired envelopes read as held, paused envelopes preserve approval history, operators can explicitly select active offer versions, and mobile revenue forms are actually disabled in addition to server blocking.

### Local Proof

- `npm run verify:signaldesk` passes.
- `npx tsc --noEmit --pretty false` passes.
- `npm run test:signaldesk:e2e:local` passes under Node 20.
- `npm run test:signaldesk:rules` passes under Node 20.

### Boundaries

No provider send was enabled. No scheduler, calendar provider, proposal/e-sign provider, payment provider, social auto-publish, paid campaign automation, public SignalDesk page, or MenuList truth write was added. The required QA-only Firestore rules/index deploy was attempted against `menulist-signaldesk-qa` and blocked by Firebase Rules API HTTP 403 because the current caller lacks permission; no cloud resources were changed.

## July 10, 2026 - First-Trial Revenue Loop Wired

### Context

The founder authorized the bounded trial-readiness work after reviewing SignalDesk as a founder-controlled Revenue Operating System. The implementation closes routine coordination gaps without granting provider send, spend, source, offer, or MenuList product authority.

### Decisions

1. Keep the recommended Bengaluru first pod create-only, held, and zero-budget in seed data; migrate only the exact old unapproved held Mumbai seed; initialization cannot approve strategy or spend, and reseeding cannot overwrite founder approval.
2. Align first-run import, source, partner, research, and seven-day envelope defaults to the maintained Bengaluru/Indiranagar/Koramangala hypothesis.
3. Treat an interested reply as an authorized deterministic qualification trigger after reply, suppression, contactability, and source-policy state is durable.
4. Automatically refresh the SignalDesk activation projection after a target-scoped outcome when a revenue account exists.
5. Preserve reply/outcome truth if a derived commercial projection needs recovery; log bounded state without raw reply/contact data.
6. Derive elapsed seven-day activation deadlines as stalled during bounded workspace/mission reads instead of adding a scheduler.
7. Put stalled activations and overdue opportunities ahead of scale work in Daily Growth Mission, with open-pipeline, founder-attention, and estimated-spend context.
8. Retain the explicit activation-watch action as a recovery recheck only.
9. Reconcile prior outcome summaries when qualification creates an account after the outcome, so event order cannot determine activation visibility.

### Boundaries

No pod was activated, no budget was approved, no real source list or sender identity was inferred, no provider send or social auto-publish was enabled, no calendar/proposal/payment connector was added, and no MenuList store/menu/project/publish/billing/customer truth was read or written.

The scoped QA Firestore rules/index deployment was retried after all local gates passed. Firebase Rules API again returned HTTP 403 `The caller does not have permission`; no QA cloud resource changed.

## July 11, 2026 - Measurable AI Shadow Review Implemented

### Context

The current AI sales, marketing, and distribution research supported shadow evaluation before broader autonomy. Code cross-check found that provider model-evaluation `sampleSize` accumulated while pass and rejected-fact rates were overwritten by the latest run and edit rate stayed zero, so SignalDesk could not measure the trial honestly.

### Decisions

1. Reuse `signaldeskAiWorkerRuns` and `signaldeskModelEvals`; do not add another review collection or generic agent layer.
2. Split provider-backed AI assists from deterministic rules scores when loading the AI workspace.
3. Accumulate provider pass, low-confidence, and rejected-fact sample counts transactionally and derive rates from those totals. Preserve the non-reconstructable pre-change rates as a legacy snapshot and start the exact `cumulative-v1` window with the first new provider result.
4. Allow only founder admins with `signaldesk.configure` to accept, mark edited, reject, or hold provider-backed runs.
5. Require a bounded reason for edit, reject, and hold; accept may use the fixed `Accepted unchanged.` reason.
6. Record bounded founder-attention minutes and replace prior review counts/minutes on re-review so metrics remain idempotent.
7. Update only the existing compact revenue attention summary; review does not move pipeline, send, publish, spend, propose, or promote autonomy.
8. Keep all review controls blocked on mobile and retain the existing provider-send, auto-publish, paid-campaign, and MenuList-truth boundaries.

### Local Proof

- `npm run verify:signaldesk` passed 2,241 static contract checks.
- `npx tsc --noEmit --pretty false` passed.
- `npm run test:signaldesk:e2e:local` passed in the Firestore emulator.
- E2E proves non-founder and rules-run denial, required exception reasons, review replacement without double counting, audit/timeline evidence, workspace separation, and no outbound export.

### Boundaries

No Firebase rule, index, Storage rule, Cloud Function, provider credential, channel, external account, public surface, or MenuList source of truth changed. No cloud deployment was required or attempted for this slice.

## July 10, 2026 - Revenue Authority Cross-Check Corrections

### Findings

1. Market-pod recommendation and Research Agent Table could write `status: active` from system evidence and the recommendation path attached a `$300` pod budget without founder approval.
2. Revenue qualification treated legacy target `status: converted` as won/customer authority, although that state could be produced by a single `published` outcome.
3. Activation watch derivation used an unordered 30-summary target query, so long histories could omit an older terminal activation and derive the seven-day deadline from an incomplete window.
4. The legacy pod migration guard did not match every old default field, so a modified unapproved pod could still be mistaken for the exact legacy seed.

### Corrections

1. Added founder-only `review-market-pod` approve/hold/reject with actor, timestamp, reason, audit, and timeline evidence.
2. Recommendation and research paths now keep unreviewed pods held, attach zero approved pod budget, preserve founder-controlled scope/decisions, and cannot activate themselves.
3. Operating envelopes now require active status plus `reviewDecision: approved` and `approvedBy`, so a manually or system-written active flag is insufficient.
4. Commercial won/customer state now requires a recorded `two_surface_activation`; published-only targets remain open with a published watch.
5. Activation derivation now uses indexed latest-30, exact-earliest, and separate terminal-activation reads so bounded history remains deterministic.
6. Tightened the legacy migration to the complete old unapproved held Mumbai default shape.
7. Added E2E cases for non-founder review, unreviewed active-pod rejection, recommendation/research holds, published-only qualification, and terminal activation outside 30 newer summaries.

### Boundaries

No provider send, paid automation, pod spend, public SignalDesk route, scheduler, calendar/proposal/payment connector, or MenuList truth write was enabled by these corrections.

## July 10, 2026 - Social Channel Market Research And Next Trial

The founder requested a current deep research pass across X, Reddit, Instagram, YouTube, and Google to determine what restaurant owners, local creators, operators, consultants, and restaurant-technology vendors are doing and what SignalDesk should do next.

Decision:

1. Do not add more horizontal SignalDesk automation before the first activation-proof trial.
2. Do not position MenuList as a QR-menu replacement, restaurant OS, POS, ordering platform, or marketing agency.
3. Use Google as the primary high-intent discovery and activation surface; the owner remains responsible for authorized Business Profile placement.
4. Use Instagram for permissioned proof and local creator/photographer/consultant trust channels, with manual approval and publishing.
5. Use Reddit for listening and objection learning, YouTube for durable post-activation proof, and X for founder/partner learning rather than primary restaurant acquisition.
6. Keep public customer menu viewing no-login and avoid forced phone/email/WhatsApp capture.
7. Run a zero-external-spend, manual-first Bengaluru trial: 25 candidates, 12 evidence packets, five private previews, three two-surface activations, one permissioned proof asset, and one bounded trust-partner referral test.
8. Select later product work only from measured trial bottlenecks.

Source and operating detail are maintained in `menulist-signaldesk_social-channel-market-research-and-next-plan-2026-07-10.md` and its self-contained HTML brief.

## July 10, 2026 - Bengaluru Trial Preparation Approved And Operationalized

### Approval

After reviewing the exact social-channel market plan, the founder instructed Codex to do the needful. This is recorded as approval to prepare the proposed zero-external-spend Bengaluru trial and align internal defaults. It is not approval to send messages, contact businesses through public data, spend money, publish content, enable providers, or change Google, Meta, or MenuList truth.

### Decisions

1. Approve the first pod as Indiranagar and Koramangala, Bengaluru, covering independent cafes, dessert shops, QSRs, and customer-facing cloud kitchens.
2. Use manual/in-person or expected founder introduction first; use permissioned referral second; hold founder email until sender identity, physical address, unsubscribe, bounce, complaint, and domain readiness are complete.
3. Split source authority into a 30-day public-business research policy with contact and personalization blocked, and a separate permissioned manual-introduction policy.
4. Keep Google Places and other external discovery providers unapproved and at zero trial budget.
5. Keep the first menu-photographer/restaurant-consultant learning test at zero fee and zero budget.
6. Use a manual experiment card with 25 candidates, 12 evidence packets, five private previews, three two-surface activations within seven days, and one permissioned proof asset.
7. Stop after five owner conversations with no accepted preview, or when fewer than two of the first five accepted previews activate on two surfaces.
8. Keep the separate ten-business onboarding board permissioned-only. Public candidate research may identify business entities for internal evidence review but cannot create contact authority.

### Implemented Preparation

- Replaced stale Hadapsar/Pune Market Search presets and placeholder copy with the approved Bengaluru pod.
- Made evidence-only public-business research the safe first manual policy and import selection.
- Removed contact examples from the default manual-import rows.
- Aligned experiment, partner-attempt, evidence, activation, and stop-rule defaults to the approved plan.
- Changed the seeded Google Places and trust-partner trial controls to zero approval/spend.
- Restricted source-policy activation, budget mutation, commercial pricing/envelope mutation, and trust-partner deal approval to the founder-admin `signaldesk.configure` path; corresponding UI actions disable without that permission.
- Added `menulist-signaldesk_bengaluru-activation-trial-operating-pack-2026-07-10.md` with the 25-row board, evidence packet, draft-only scripts, preview checklist, tracking routes, and stop conditions.

### Remaining External Gates

No business was contacted. The intended QA runtime still needs Firebase permission because the scoped rules/index deploy is blocked by HTTP 403. A real permissioned business or partner introduction, sender identity, physical-address policy, and first owner-approved activation proof also remain external inputs.

## July 15, 2026 - Bengaluru Evidence-Only Board Completed

After the current market, product, and operational intelligence review, the founder instructed Codex to do the needful. The safe executable scope was limited to completing the approved internal research preparation because contact permission, QA Firebase access, sender readiness, owner activation, spend, publication, and provider-send authority remain absent.

Decisions:

1. Complete all 25 candidate slots from first-party business websites or menu destinations only.
2. Record eight internal `Pass`, seven `Unsure`, nine `Fail`, and one policy `Hold`; none creates contact authority.
3. Prepare 12 documentation-level evidence packets with route `none`, zero budget, source expiry, rejected facts, and no contact or personalization use.
4. Keep third-party ordering/listing results out of evidence; one candidate remains held because no approved first-party source was established.
5. Preserve the separate permissioned-manual-introduction policy before any owner action.
6. Keep provider send, cold WhatsApp/social messaging, paid providers, partner spend, content publication, Firebase deployment, and MenuList truth writes blocked.

No business was contacted, no contact details were stored, no paid API was called, no provider action ran, no cloud resource changed, and no MenuList runtime file was modified.

## July 11, 2026 - Founder-Controlled AI Volume Mode Implemented

### Context

The founder confirmed that falling AI inference cost should be used to accelerate SignalDesk sales, marketing, and distribution work, then instructed implementation end to end. The accepted scope is heavier internal reasoning inside existing authority boundaries, not unbounded autonomous distribution.

### Decisions

1. Add a feature-flagged desktop AI Volume Mode for founder admins only.
2. Bound each request to five targets, three approved internal tasks, three concurrent children, batch rate limiting, and USD 5 founder-estimated-cost authority.
3. Use explicit stable `gemini-3.5-flash-lite` for default generation and independent critique, with `gemini-3.6-flash` as the only executable stronger-model escalation. Retired Gemini 2.5 IDs remain only as exact persisted-route migration inputs.
4. Require strict typed output from both generation and critic passes; any retained rejected fact forces low-confidence founder review.
5. Reuse existing AI worker, model-eval, provider-spend, audit, timeline, daily-cost, and decision-snapshot records; add no collection, index, rule, scheduler, or MenuList write path.
6. Hash founder-scoped idempotency keys so paid retries return the original parent instead of repeating calls.
7. Preserve successful children on partial failure and persist stable failure codes rather than raw provider errors.
8. Preflight aggregate provider daily/monthly budget and serialize volume work through one six-minute recovery lock so overlapping paid batches cannot consume the same budget snapshot and the 300-second route retains a one-minute shutdown margin.
9. Keep OpenAI/Anthropic, sending, publishing, commercial mutation, consent/source decisions, suppression override, external spend, and autonomy graduation outside this implementation.
10. Reconcile an expired running parent on idempotent retry by reconstructing bounded child evidence and finalizing without provider calls; release the lock only when it still names that parent.

### Proof

- `npm run verify:signaldesk` passed 2,302 checks after stale-parent and desktop retry coverage.
- `npx tsc --noEmit --pretty false` passed.
- `npm run test:signaldesk:e2e:local` passed on the disposable Firestore emulator.
- Stale-parent E2E now proves partial reconstruction, no-child blocking, calls/cost restoration, stable interruption evidence, one-time recovery audit/timeline, retry idempotency, and owned-lock release.
- Desktop contract checks prove bounded local payload validation, same-key retry until terminal state, locked retry scope, automatic terminal clearing, and explicit founder clearing.
- `npm run test:signaldesk:rules` passed Firestore and Storage semantic tests.
- `npm run docs:check-links` passed 2,340 files and 4,129 internal links with no broken links or naming violations.
- `SIGNALDESK_SMOKE_BASE_URL=http://localhost:3014 node scripts/verification/smoke-signaldesk-routes.js` passed 45 private route, alias, authentication, and webhook checks after the final `/signaldesk/ai` recovery UI compiled locally.
- Scoped diff and trailing-whitespace checks passed after the final documentation cleanup.

### External State

No real Gemini call, target contact, message export/send, content publish, provider purchase, external spend, Firebase deploy, Vercel deploy, or MenuList truth mutation occurred. Real use still requires the founder-controlled provider credentials, budget, source policy, and operating inputs already listed in the validation runbook.

## July 11, 2026 - Activation Opportunity And Permission Hardening

### Decisions

1. Make activation opportunity, not lead, the founder-facing operating object.
2. Keep 20-30 candidates as inventory but show no more than five Today decisions.
3. Replace inferred recommended channel authority with a current source-policy-derived allowed route.
4. Require a complete source-rights registry and treat legacy incomplete records as review required.
5. Require owner-qualified intent, owner review, two distinct surfaces, evidence, and idempotency before a two-surface activation has authority.
6. Accept MenuList outcomes only through manual owner-reviewed records or the HMAC-signed route-token bridge.
7. Separate proof permission from activation and recheck revocation before content draft generation.
8. Treat complaint, privacy, and legal replies as suppression plus circuit-breaker events.
9. Keep five primary Ant Design destinations while preserving protected deep tools.
10. Keep all implementation SignalDesk-local; do not modify MenuList runtime or enable provider send.

## July 15, 2026 - Current-Menu Evidence And Exact Action Packets

### Decisions

1. Keep the existing activation-opportunity queue, five-decision Today cap, and owner-qualified seven-day activation clock; do not duplicate them.
2. Add a conservative `current-menu-presence-v1` diagnostic to new evidence packets using only approved target and source fields.
3. Preserve unknown truth explicitly: owner control and mobile accessibility remain `unverified` until direct evidence exists.
4. Carry the evidence diagnosis, rejected facts, source-policy state and expiry, allowed route, sender, CTA, exact message, expected outcome, unsupported-claim result, and risk into the approval packet.
5. Bind those fields with an action fingerprint. A changed draft or control state invalidates the packet and requires refresh.
6. Hold evidence-only or non-contactable targets at approval even when internal drafting is permitted.
7. Keep the implementation SignalDesk-local. No MenuList runtime, Firebase rules, provider-send flag, public route, or external provider was changed.

## July 15, 2026 - Final Local Authority And E2E Closure

### Decisions

1. Do not seed a noncanonical `pending` sender-domain document. Preserve and filter an exact legacy sentinel, while all executable sender authority must use a real canonical domain and strict product-local fingerprint.
2. Bind draft, approval, export, assisted handoff, provider-send, and sequencer replay to transaction-current target, source-policy, CTA, sender, suppression, and prior-contact authority. Exact retries may replay durable truth; changed requests fail closed.
3. Admit direct paid AI work through one deterministic actor/request claim. Concurrent exact retries join that claim and wait for bounded completion; ambiguous admission may recover only when the exact durable claim exists.
4. Treat proof revocation, content holds, rejections, and publication review as terminal or explicit-review states. Published truth stays `distributed`; authority loss opens one durable incident and restoration resolves it exactly once without erasing publication evidence.
5. Refresh only an unreviewed daily mission when a complaint, privacy request, or legal request arrives. The critical reply becomes the first action, while approved/completed mission history remains immutable.
6. Keep the collection-wide secret scan strict for bearer credentials. Only exact deterministic reconciliation/lifecycle identifier field names are classified as non-secret coordination values; raw tokens, access tokens, API keys, webhook secrets, SMTP credentials, and provider payloads remain blocked.
7. Accept no static-verifier pass as sufficient proof. The authenticated full Firestore-emulator workflow, Firestore/Storage rules semantics, warmed route/API smoke, TypeScript, emulator parse, and diff hygiene must all pass together.

### Boundaries

No provider send, external sequencer send, paid API call, real target contact, content publication, partner spend, Firebase deploy, Vercel deploy, public SignalDesk route, or MenuList store/menu/project/billing/public-output write occurred. Current clearance remains local controlled internal use only; real-world outreach still requires the separately recorded founder, source-rights, sender, legal, and provider decisions.
