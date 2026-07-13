# Owner Support Assistant - Runtime Review

> **Status:** READ-ONLY RUNTIME SOURCE-VERIFIED
> **Created:** 2026-06-07
> **Last verified:** 2026-07-11
> **Release boundary:** Source verification only; authenticated browser/device and deployed-host evidence remain pending.

---

## Answerlattice Owner Support Assistant Read-Only Runtime

The original docs freeze was reopened because the app flag, route, navigation, APIs, runtime library, and responsive client were implemented and enabled. The current runtime is a bounded read-only subset of the larger frozen architecture.

## Current Evidence

| Area | Current source truth | Result |
| --- | --- | --- |
| Feature flag | `src/config/features.ts` sets `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT: true`. | Live in source. |
| Route and navigation | `/answerlattice/support-assistant` is in the route registry, Support Control navigation, and route-permission map. | Management-only; `MANAGE_SUPPORT` required. |
| Brief endpoint | `GET /api/answerlattice/support-assistant/brief` checks the flag, applies the dashboard read limiter, requires `MANAGE_SUPPORT`, and reads five compact summaries. | Read-only, private/no-store. |
| Query endpoint | `POST /api/answerlattice/support-assistant/query` resolves exact session scope, applies a hashed 20/minute limiter before the permission read, requires `MANAGE_SUPPORT`, caps the body at 4 KiB, and validates a strict question. | Read-only, private/no-store. |
| Answer engine | `src/lib/answerlattice/ownerSupportAssistant.ts` classifies six bounded intents and uses one five-document summary packet with a 60-second, 300-entry cache. | Deterministic; no AI provider. |
| Client | The client bounds JSON responses at 128 KiB, uses no-store/same-origin/manual-redirect fetches, exposes the read-only limit, and gives owner actions 44px targets. | Responsive source contract. |
| Persistence | No assistant transcript, message, feedback, action, analytics, attribution, plan, or event collection/path exists. | Zero assistant writes. |

## Live Cost Contract

- Cold summary packet: five Firestore document reads through one `getAll()` call.
- Warm in-process packet within 60 seconds: zero Firestore reads.
- Question: reuses the same packet when warm; otherwise five reads.
- No listener, list query, vector search, provider call, Storage operation, Cloud Function, scheduler task, or write.
- Cache is tenant/store keyed and capped at 300 entries.

## Deferred Contract

These reviewed ideas are not live:

- action preview or execution
- ticket reply or status mutation
- Support Board card/note creation
- Knowledge Intake, FAQ, KB, or canonical draft creation
- assistant feedback persistence
- AI-assisted wording or AI operation accounting
- bounded detail reads
- owner period-analytics summary
- assistant-owned compact summary or nightly task
- contextual entry points outside the dedicated navigation route

The architecture, action-support, owner-analytics, and cases documents preserve constraints for those possible additions. They do not prove runtime availability.

## Verification Contract

`npm run verify:answerlattice-runtime-truth` must reject:

- a disabled/stale feature status in maintained docs
- missing route/nav/permission gates
- query rate limiting after the Firestore-backed permission check
- unbounded request or response parsing
- missing private/no-store behavior
- an AI provider call in the deterministic engine
- loss of the summary-cache cap/TTL or summary-only read model
- loss of the 44px owner action target

Required local checks for runtime changes:

```bash
node --check scripts/verification/verify-answerlattice-runtime-truth.js
npm run verify:answerlattice-runtime-truth
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm run docs:check-links
git diff --check
```

## External Boundary

This review does not certify Firebase/Vercel deployment, real credentials, provider behavior, authenticated management access on a target host, summary-document freshness, browser rendering, physical-device behavior, production-host behavior, or production release approval.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-07-11 | Reopened the docs-only freeze and recorded the enabled, deterministic, summary-only runtime plus the absent action/AI/feedback/analytics boundaries. |
| 2026-06-07 | Added the original docs freeze after strategy validation. |
