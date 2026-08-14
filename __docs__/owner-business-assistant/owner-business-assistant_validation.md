# Owner Business Assistant Validation

**Owner-Facing Name:** Business Health
**Status:** Read-only validation after action-support removal
**Last Updated:** August 14, 2026

## Validation Decision

Business Health is validated as a read-only health, analytics, and grounded answer surface. Owner operation handling has been removed from this feature because AI Menu Manager / Menu Manager now owns owner-initiated operations.

`npm run verify:owner-business-health-boundary` is the focused read-only boundary gate for the active Business Health route, API, desktop page, MobileShell screen, removed action surfaces, docs, and ledger evidence.

## Removed and Verified Absent

The current implementation removes:

- action API route
- action hook
- desktop action sheet
- mobile action sheet
- action registry/executor/access/draft/target/public-truth guard modules
- action request schemas and action types
- action/draft Firestore collection constants
- action/draft Firestore rules
- action/draft scheduler cleanup
- action usage metrics from the platform monitor
- Business Health action AI accounting operation type
- owner-facing action copy for Business Health drafts

## Current Runtime Contract

Business Health supports:

- current store health
- selected project analytics context
- location summary
- suggested checks
- suggested questions
- typed answers
- feedback/source/freshness signals
- public readiness fix list derived from current MenuList truth
- platform monitoring for answer quality and cost

Business Health does not support:

- owner action execution
- action drafts
- action approval sheets
- public-truth mutation
- public-readiness fix-list action drafts
- external publishing
- generated image application
- rollback/undo
- rules/automation

## Boundary With Menu Manager

Business Health can identify that something may need attention. Menu Manager prepares and executes operations through:

owner intent -> proposal card -> approval when needed -> existing MenuList operation -> receipt.

Business Health must not duplicate that action registry.

## Firebase Cost Confirmation

Action workflow collections are removed from the active model. The remaining Business Health writes are bounded to existing summary, thread, feedback, and answer-event behavior controlled by Business Health flags. Thread writes and reads now require browser-generated `oba_` runtime thread IDs before `ownerBusinessAssistantThreads` document access, and whitespace-mutated thread IDs fail before document reads/writes. The feedback route now uses shared bounded JSON admission before selected-store scope checks, permission checks, or the feedback write, and whitespace-mutated answer IDs fail before feedback or answer-event document writes.

Business Health thread privacy now requires exact tenant/store/actor alias agreement and exact persisted actor ownership on both append and read. Store permission alone cannot disclose or mutate another staff member's conversation. Thread responses project bounded allowlisted metadata, messages, source IDs, and suggested-question fields; injected legacy/private fields are omitted. Focused session-scope behavior, Business Health source, MenuList tenant-safety, exact TypeScript, and scoped lint are the local gates.

The owner answer boundary is also runtime-enforced in both directions.
`answerResponseBoundary.ts` admits only the documented answer, source-fact,
artifact, follow-up, cache, and route-metric shapes. The API refuses an invalid
or unknown-field-bearing public payload, while the browser refuses the same
payload after the 32KB response cap. A TypeScript assertion alone is not
treated as response validation.

The scheduler regression now proves that current-health, same-day snapshot, and analytics-index writes are replacements, while the multi-location store map remains merged. This prevents stale optional analytics, teaser, project-summary, and legacy fields from surviving a later authoritative rebuild without increasing the write count.

The same focused verifier now feeds storage-only and unknown fields, malformed arrays, wrong tenant identity, and mismatched Redis packet identity into the shared runtime boundary. Valid documents are projected to the exact health/analytics contract; invalid Firestore documents fall back before response composition, and invalid cache packets become misses. This prevents Firestore TTL metadata or legacy fields from crossing the server/client response boundary.

No Business Health path should write:

- one document per token
- one document per provider chunk
- one action/draft document
- base64 media
- generated image artifacts

## Security Confirmation

The active Business Health APIs remain protected read/answer routes with auth, tenant/store/project validation, request validation, rate limiting where provider-backed answering is possible, and generic owner-safe errors.

Thread first use is an explicit successful empty state: the browser-created ID can precede its first persisted answer, and the thread route returns the same empty envelope for an absent row and a row outside the admitted actor scope. Exact actor ownership remains required before any persisted metadata or message is projected.

Browser read-model hooks now send current, analytics, locations, and thread requests with same-origin credentials, no browser cache, and manual redirect handling, then parse responses through a shared bounded reader before SWR cache/state updates. Non-OK, malformed, oversized, or invalid successful read-model envelopes fail closed with bounded diagnostics instead of direct `response.json()` parsing. The answer hook also discards malformed stored thread IDs and replaces them with a fresh `oba_` ID before sending a new answer request. The answer hook and platform monitor use the same request policy before their bounded response readers.

Removing owner operation handling reduces mutation risk because Business Health no longer exposes a write route for owner operations.

## Mobile Confirmation

Mobile Business Health remains inside `MobileShell`. It renders read-only checks, the public readiness fix list, and answers. Fix-list buttons route through shell callbacks and do not import or display an action bottom sheet.

## Verification Commands

Required after changes:

- `npm run verify:owner-business-assistant`
- `npm run verify:menulist-api-tenant-safety`
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `git diff --check`

If Firestore rules or Functions cleanup code changes, validate and deploy the matching Firebase target when credentials allow.

Retention validation must cover disabled-feature state. `owner_business_assistant_cleanup` is a data-lifecycle task, not a feature-delivery task: expired snapshots, answer events, feedback, and threads remain eligible for bounded deletion even when their producer flags are off. Source verification must reject restoration of `isFunctionFeatureEnabled` or a skipped-cleanup branch inside this task.

## July 16, 2026 Cross-Check Evidence

- Direct MobileShell dashboard and Business Health entry is source-gated by loaded `VIEW_ANALYTICS` permissions before analytics screens mount.
- The answer route rate limit precedes body parsing; optional SAFE_MODE follows selected-store and permission admission.
- AI-operation limiter-provider outages return 503 and stop before model work; ordinary deterministic data reads keep their existing behavior.
- The shared Business Health source gate checks these boundaries. No Firebase rules, indexes, Storage rules, or Cloud Function logic changed in this pass.

## August 14, 2026 Weekly Menu Review Extension

The extension is admitted only as a deterministic presentation of existing `thisWeek`, `lastWeek`, and current-health facts. Source gates require desktop and MobileShell parity, the dedicated presentation flag, no action hook/sheet, and the unchanged read-only Business Health boundary. It adds no Firebase artifact, provider path, external source, or deployment target.

### Post-implementation parity audit

| Finding | Classification | Resolution |
| --- | --- | --- |
| Desktop did not preserve the existing analytics fallback when `thisWeek` was unavailable | Mismatch | The Weekly Menu Review component now renders the existing analytics strip, matching mobile and the implementation contract. |
| Current-health check count could appear selected-menu scoped beside weekly selected-menu metrics | Drift | Both surfaces now display the existing localized location-level scope label beside the check state. |
| Weekly review could accidentally regain action-generation behavior | Regression risk | Focused gates require read-only presentation, no action hook/sheet, the dedicated flag, and unchanged cached analytics/current-health contracts. |

**Final verdict:** Pass. The extension is source-complete, desktop/mobile aligned, and remains read-only with no new data or provider boundary.
