# Owner Business Assistant Validation

**Owner-Facing Name:** Business Health
**Status:** Read-only validation after action-support removal
**Last Updated:** July 4, 2026

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

No Business Health path should write:

- one document per token
- one document per provider chunk
- one action/draft document
- base64 media
- generated image artifacts

## Security Confirmation

The active Business Health APIs remain protected read/answer routes with auth, tenant/store/project validation, request validation, rate limiting where provider-backed answering is possible, and generic owner-safe errors.

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
