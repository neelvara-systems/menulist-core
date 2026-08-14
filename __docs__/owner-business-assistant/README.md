# Owner Business Assistant Documentation

**Feature Folder:** `__docs__/owner-business-assistant/`
**Owner-Facing Name:** Business Health
**Internal Slug:** `owner-business-assistant`
**Product:** MenuList
**Status:** Implemented as a read-only Business Health and grounded answer surface
**Last Updated:** August 14, 2026

## Current Decision

Business Health is not a generic chatbot and is not an action system. It is a read-only operating surface that helps an owner understand store health, selected-menu analytics, feedback signals, source coverage, and supported business questions from compact precomputed data.

Owner-initiated work now belongs to AI Menu Manager / Menu Manager. Business Health must not prepare action drafts, render action sheets, execute owner commands, mutate public truth, or create workflow records for actions.

**Owner Business Health boundary source gate:** `npm run verify:owner-business-health-boundary` source-gates the read-only Business Health runtime: `/business-health`, bounded `/api/owner-business-assistant/*` read/answer/feedback routes, 256KB read-model response parsing, 32KB answer request cap, 8KB feedback request cap, selected-store scope checks, `VIEW_ANALYTICS` permission checks, MobileShell read-only screen behavior, removed action surfaces, and ledger coverage. It is source/docs verification only; browser/mobile QA, provider smoke, scheduler fixture evidence, Firebase deploy, Vercel deploy, production build, live Firestore writes, Storage writes, and production-host smoke remain outside this checkpoint.

The accepted product shape is:

1. Scheduler-built compact Business Health read models.
2. Deterministic analytics period summaries for today, this week, last week, this month, and last month.
3. Cache-first context packets for the dashboard, full Business Health page, mobile screen, and answer route.
4. Grounded typed answers using only validated context-packet facts and deterministic fallbacks.
5. Structured read-only artifacts: text, metric rows, compact tables, trend series, source/freshness notes, suggested questions, and health checks.
6. Desktop dashboard card, public readiness fix list, analytics strip, full `/business-health` route, and mobile screen inside `MobileShell`.
7. Internal platform monitoring for answer quality, unsupported gaps, source coverage, feedback, and route read/write cost.
8. Explicit packet invalidation tied to scheduler rebuilds and public-truth changes.
9. A read-only Weekly Menu Review that compares this week's existing MenuList activity with last week and places current owner checks beside it. It does not infer revenue, profit, item margin, competitor performance, or external-review sentiment.

The rejected product shape is:

1. Floating "ask anything" chatbot.
2. Chat-time scans of analytics, menu, feedback, review, or log collections.
3. Business Health owned direct writes to menu, store, outlet, staff, billing, external platforms, or public truth.
4. Action options, drafts, approval cards, action audit records, or action bottom sheets in Business Health.
5. A new analytics collection for ordinary period questions.
6. Runtime external web/weather/events/competitor search from the answer route.
7. Raw Firebase collection data passed directly to the AI model.
8. Always-on long transcript storage or token-by-token message writes.
9. Public website hype about an assistant beyond implemented proof.
10. Autonomous menu optimization or a claim that customer activity is the same as POS sales.

## Weekly Menu Review Boundary

Weekly Menu Review is a deterministic presentation over the existing Business Health analytics index and current health document. Weekly activity follows the selected menu scope; the current attention state is explicitly location-level. It renders this-week activity, a last-week comparison when available, and the existing freshness disclosure. It adds no collection, API, scheduler, provider call, write, or action draft.

Business Health remains diagnostic. If the review indicates that a menu detail deserves a change, the owner performs that work through Menu Manager or the existing destination screen; the review never applies the change.

## Ownership Boundary

Business Health answers "what is happening?" and "what should I look at?"

Menu Manager handles "do this" requests. The Menu Manager loop remains:

owner intent -> proposal card -> approval when needed -> existing MenuList operation -> receipt.

If Business Health needs to point the owner toward an operation, it should use calm copy such as "Open Menu Manager to prepare this update." It must not create its own action card or write path.

## Document Map

| Doc | Purpose |
| --- | --- |
| [owner-business-assistant_spec.md](./owner-business-assistant_spec.md) | Product requirements, scope, guardrails, owner value, accepted/rejected behavior |
| [owner-business-assistant_architecture.md](./owner-business-assistant_architecture.md) | Current read-only architecture, data ownership, cache model, API boundaries |
| [owner-business-assistant_business-health.md](./owner-business-assistant_business-health.md) | Dedicated Business Health read model and flags |
| [owner-business-assistant_impl.md](./owner-business-assistant_impl.md) | Implementation blueprint for the current read-only runtime |
| [owner-business-assistant_firebase.md](./owner-business-assistant_firebase.md) | Firestore, Cloud Functions, Storage, AI, cache, and cost model |
| [owner-business-assistant_mobile-support.md](./owner-business-assistant_mobile-support.md) | MobileShell behavior, touch UX, route mapping, mobile QA |
| [owner-business-assistant_test-cases.md](./owner-business-assistant_test-cases.md) | Unit, API, scheduler, UI, mobile, red-team, and manual QA |
| [owner-business-assistant_marketing.md](./owner-business-assistant_marketing.md) | Internal positioning, sales narrative, allowed and rejected language |
| [owner-business-assistant_website.md](./owner-business-assistant_website.md) | Public website decision and copy constraints |
| [owner-business-assistant_helpdoc.md](./owner-business-assistant_helpdoc.md) | Owner help article draft |
| [owner-business-assistant_validation.md](./owner-business-assistant_validation.md) | Current validation summary, cost/security checks, and removal confirmation |
| [_archive/chatgpt-review.md](./_archive/chatgpt-review.md) | Historical conversation cross-check |
| [_archive/owner-business-assistant_action-support-removed-2026-06-17.md](./_archive/owner-business-assistant_action-support-removed-2026-06-17.md) | Removed action-support track and replacement boundary |

## Runtime Surfaces

Implemented:

1. Feature flags in `src/config/features.ts` and Cloud Functions flags in `functions/src/constants/features.ts`.
2. Shared constants, schemas, types, context-packet builder, deterministic answer resolver, refusals, and domain capability matrix.
3. Scheduler-built current health, daily snapshots, optional analytics index, and multi-location summary docs.
   Current, same-day snapshot, and analytics-index payloads are authoritative full replacements after Firestore sanitization so removed optional facts cannot survive from an older run. The multi-location document remains a per-store merge so one store refresh cannot erase sibling stores.
   Firestore reads are parsed through one shared runtime schema with exact tenant/store identity before context-packet composition. Storage-only TTL/kind fields and unknown legacy fields are projected out, while malformed documents fail to the not-ready/analytics-unavailable fallback. Redis packet reads validate the complete packet plus cache-key tenant/store/project identity before reuse.
4. Protected APIs under `/api/owner-business-assistant/*` for read-only current health, analytics, answer, thread, feedback, and locations behavior. Thread IDs must match the browser-generated `oba_` runtime ID shape before thread writes or reads. Browser read-model hooks parse current, analytics, locations, and thread responses through a shared 256KB bounded reader before caching or rendering. Feedback writes keep the existing `DATA_WRITE` limiter and reject JSON bodies above 8KB before validation, selected-store scope checks, permission checks, or Firestore writes.
5. Desktop dashboard card, analytics strip, full route, suggested questions, answer follow-ups, source/freshness disclosure, and priority checks.
6. MobileShell More sub-screen, `/business-health` route mapping, and mobile Business Health screen.
7. Optional bounded thread-doc history, answer-event logging, feedback, source coverage metrics, and platform monitor. The platform monitor uses the same 256KB bounded response reader before rendering answer-event, source-coverage, feedback, and cost/read metric state.

Removed:

1. Business Health action API.
2. Business Health action registry/executor.
3. Desktop and mobile action sheets.
4. Business Health action/draft collections.
5. Business Health action feature flags.

## Current Default Posture

- Business Health is cache-first and read-only.
- Provider-backed typed answers remain controlled by existing Business Health AI flags, SAFE_MODE, rate limits, a 32KB answer request body cap, validation, and AI accounting.
- Public menu/store writes remain outside Business Health.
- Menu operations are routed conceptually to Menu Manager, not duplicated in this feature.
- Public copy remains calm and proof-based.

Validation record: [owner-business-assistant_validation.md](./owner-business-assistant_validation.md).

## July 16, 2026 Cross-Check

- Desktop `/dashboard` and `/business-health` remain protected by the shared `VIEW_ANALYTICS` route requirement before their page children mount.
- `MobileShell` now enforces the same permission for dashboard hashes, direct `/business-health` mapping, and the Business Health opener before either analytics screen mounts. Mobile More keeps its existing internal gate.
- The answer route applies its limiter before bounded parsing and performs SAFE_MODE reads only after body, selected-store, and permission admission. `AI_OPERATION` limiter-provider failures fail closed with a retryable 503; deterministic `DATA_READ` answers preserve their existing fail-open limiter posture.
- Provider-backed answer generation remains disabled and isolated; no provider integration, AI transaction, new document, setting, or scheduler was added.
