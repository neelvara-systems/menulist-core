# Working Hours, Holidays, and Time Slots — Firebase Cost

**Status:** Current cost contract

**Last verified:** July 17, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This Firebase cost doc is source-gated working-hours and time-slot cost evidence only; Hours release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated desktop/mobile working-hours save QA, customer-facing public menu/OBP hours output QA across timezone/open/closed/temporary-status cases, cache/deploy evidence for store-output writes, and production-host smoke.

## Source Gate

`npm run verify:working-hours-boundary` confirms the current DAL/cache/cascade contract.

## Active Operations

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Render current status | 0 incremental | 0 | Uses the store object already loaded for menu/OBP/owner output |
| Save weekly hours | Existing store/summary path as required | 1 store patch plus existing summary/version side effects | `updateStore()`; no hours-specific document |
| Save one Today weekday | Same as weekly save | Same as weekly save | Leaf `workingHours.{day}` patch |
| Create preset | Session/store admission already owned by DAL | 1 store merge | `updateTimeSlotPresets()` plus cache invalidation |
| Edit/delete preset | Paged project scan and transaction reads for referenced candidates | 1 store merge plus changed project writes | Pages are 100; concurrency is bounded; each changed project cache is revalidated |
| Status fallback diagnostics | 0 | 0 | Browser/runtime logs only; capped in memory |

Public reads do not increase because `workingHours`, `timeZone`, and time-slot preset truth are part of existing store/project payloads and cache entries.

Hours status fallback diagnostics add no Firebase operation and are capped in memory.
Output Control timestamp diagnostics also run in memory and add no Firebase operation.

## Cost and Scale Guardrails

- Weekly saves use nested/deep patches; they do not rewrite unrelated store siblings.
- Closed-day removal is a field delete instead of a second cleanup read/write.
- Public cache invalidation stays on the existing store and project tag paths.
- Preset cascade processes project pages of 100 with bounded concurrency and skips projects without references.
- `stores.timeSlotPresets` is never filtered or ordered by runtime queries, so its nested array/map automatic indexes are disabled. Preset saves and reads remain exact store-document operations.
- No new query index, holiday document, exception document, listener, scheduled Function, Storage object, or provider call exists.
- Preset edits are expected to be rare. Add a reference index only after measured scan latency or read cost demonstrates a material problem.

## Residual Risk

The store preset write and project category cascade are not one Firestore transaction across all projects. A failure is surfaced and retryable, but an interruption can temporarily leave store preset metadata ahead of some category snapshots. A durable operation ledger would be justified only if production telemetry shows repeated partial cascades; adding one pre-emptively would be overengineering.

## Infrastructure Change

This audit changed app-side validation/evaluation and verifier/docs only. No Firestore rule, index, Storage rule, or Cloud Function source changed, so no Firebase infrastructure deploy was triggered.
