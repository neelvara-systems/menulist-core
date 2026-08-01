# Working Hours, Holidays, and Time Slots — Firebase Cost

**Status:** Current cost contract

**Last verified:** July 30, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This Firebase cost doc is source-gated working-hours and time-slot cost evidence only; Hours release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated desktop/mobile working-hours save QA, customer-facing public menu/OBP hours output QA across timezone/open/closed/temporary-status cases, cache/deploy evidence for store-output writes, and production-host smoke.

## Source Gate

`npm run verify:working-hours-boundary` confirms the current DAL/cache/cascade contract.

## Active Operations

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Render current status | 0 incremental | 0 | Uses the store object already loaded for menu/OBP/owner output |
| Save weekly hours | Existing store/summary path as required | 1 store patch plus existing summary/version side effects | `updateStore()`; no hours-specific document |
| Save one Today weekday | Same as weekly save | Same as weekly save | Leaf `workingHours.{day}` patch |
| Add/edit/remove special date | Existing owner store payload | 1 store patch | Replaces the bounded `specialHours` map and stamps `hoursLastUpdatedAt`; no new document |
| Render effective special hours | 0 incremental | 0 | Uses `specialHours` from the already-loaded store payload |
| Create preset | Session/store admission already owned by DAL | 1 store merge | `updateTimeSlotPresets()` plus cache invalidation |
| Edit/delete preset | 1 store transaction read plus paged project scan and transaction reads for admitted candidates | 1 store transaction write with pending marker, changed project writes, then 1 marker-clear transaction write | Updates admit referenced projects; deletes admit all exact-store projects so cache recovery remains possible after a prior committed removal |
| Recover interrupted preset cascade | Existing store payload plus the same bounded project scan | Remaining changed project writes plus 1 marker-clear transaction write | One attempt per mounted exact store scope; no scheduler or queue collection |
| Status fallback diagnostics | 0 | 0 | Browser/runtime logs only; capped in memory |

Public reads do not increase because `workingHours`, `specialHours`, `timeZone`, and time-slot preset truth are part of existing store/project payloads and cache entries.

Hours status fallback diagnostics add no Firebase operation and are capped in memory.
Output Control timestamp diagnostics also run in memory and add no Firebase operation.

## Cost and Scale Guardrails

- Weekly saves use nested/deep patches; they do not rewrite unrelated store siblings.
- Special hours are capped at 64 exact-date entries and stored on the existing store document. There is no date query or listener.
- Closed-day removal is a field delete instead of a second cleanup read/write.
- Public cache invalidation stays on the existing store and project tag paths.
- Preset cascade processes project pages of 100 with bounded concurrency. Updates skip projects without references. Deletes revalidate the complete exact-store project set because retry cannot rediscover a reference that was already removed before cache invalidation failed.
- Store preset truth and `timeSlotPresetCascadePending` commit atomically. A pending marker blocks later preset mutations, survives client interruption/store switching, and can be cleared only by its exact operation after project acknowledgement.
- `stores.timeSlotPresets` is never filtered or ordered by runtime queries, so its nested array/map automatic indexes are disabled. Preset saves and reads remain exact store-document operations.
- No new query index, holiday document, exception document, listener, scheduled Function, Storage object, or provider call exists.
- Preset edits are expected to be rare. Add a reference index only after measured scan latency or read cost demonstrates a material problem.

## Residual Risk

The store preset write and all project category updates cannot share one Firestore transaction because the project set is paged. During an interrupted cascade, store preset metadata can temporarily lead some category snapshots, but the atomic store-local marker makes that incomplete state durable, blocks conflicting edits, and triggers exact-scope retry. Recovery currently runs when desktop or mobile opens that store's time-slot screen; there is no background worker, so a store whose owner never returns can remain pending. Production telemetry would be required before adding a scheduled worker or separate operation collection.

## Infrastructure Change

This extension changed app-side store validation, owner/public surfaces, types, tests, and docs. No Firestore rule, index, Storage rule, or Cloud Function source changed, so no Firebase infrastructure deploy was triggered.
