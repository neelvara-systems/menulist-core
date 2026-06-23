# MenuList SignalDesk - Decision Log

**Status:** Active log
**Created:** June 23, 2026
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
9. Keep WhatsApp API automation, Instagram/Messenger automation, Meta paid intent, campaign optimizer, and cluster planner as later modules.
10. Prefer a separate private runtime repo/project later; no runtime code created in this pass.
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

## June 23, 2026 - Pre-Implementation Architecture Decision

### Context

Before implementation, the founder asked to revise Firebase optimization and product-separation/code-splitting strategy so the project does not become mixed into MenuList owner/customer runtime.

### Decisions

1. Implement SignalDesk inside this monorepo first, but as a product-isolated internal module.
2. Keep extraction-ready boundaries through product-scoped folders, product-local constants, dedicated Firebase config, dedicated rules/indexes/storage rules, and `functions-signaldesk/`.
3. Use proposed product code `SD` by adding `PRODUCT_IDS.SIGNALDESK = "SD"` in the first runtime PR.
4. Do not reuse `GR`; GrowthOS/Growth Kits is a separate boundary.
5. Use dedicated Firebase projects: `menulist-signaldesk-qa` and `menulist-signaldesk`.
6. Use full env prefix `MENULIST_SIGNALDESK_*`; do not introduce `SD_*` shorthand keys.
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
2. Add `PRODUCT_IDS.SIGNALDESK = "SD"` and full-name `MENULIST_SIGNALDESK_*` runtime/env constants.
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
8. Replace the single-provider AI assumption with a future AI model router.
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
