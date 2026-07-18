# Menu Correctness, Quality, Trust, and Observation Verification

**Date:** July 16, 2026
**Status:** Local source complete after focused gates; external evidence remains pending
**Authority:** Current code and focused verifiers override older planning language.

## Current flow

1. Standalone `updateProject()` merges the requested patch with the fresh transaction document, evaluates MCE, and stamps `_mce` in the same project write.
2. Standalone `publishProject()` now repeats MCE against the fresh publish transaction state and stamps `_mce` with `menuVersion` and `lastPublishedAt` in that same write.
3. The editor Publish-Gate validates the in-memory project, including the resolved linked-outlet editor view. Critical MCE errors stop the editor transition; quality signals remain advisory and always allow the owner to continue.
4. Linked outlet ordinary saves remain protected by the authenticated outlet-save schema and policy transaction, but the route does not stamp `_mce`; claiming per-outlet persisted MCE verification would be inaccurate. This is a documented boundary, not a new second write.
5. Dashboard, editor, and MobileShell quality signals compute from already-loaded project data. The dashboard project SWR read is shared with setup progress and deduped for ten minutes.
6. Public trust signals use the existing public store/project payload. Location, confidence-gated hours status, offering label, and a bounded publish date render together; stale, malformed, or materially future publish dates are hidden.
7. MOL summary mode writes one compact revision event only when menu items change. Detailed mode remains an explicit debugging/learning switch. Publish adds one compact event.
8. Publish snapshots add one best-effort document. Linked outlets snapshot the resolved public menu, oversized payloads are skipped before Firestore, and `expiresAt` is consumed by the bounded maintenance-scheduler cleanup.

## Correctness fixes in this pass

- MCE now follows the canonical stored-price contract: currency values, text prices, and ranges are valid display values; negative/zero checks and anomaly math apply only to a single numeric value.
- Legacy projects without `project.languages` use extracted primary-language evidence instead of assuming English.
- Missing descriptions check the primary language only; secondary-language gaps appear once under translations.
- Price ranges and text prices do not become fabricated numeric outliers.
- Public freshness is visible again and cannot label a materially future timestamp as updated today.
- Standalone publish cannot leave `_mce` stale when publish data changes.
- Linked-outlet publish observation and snapshots use the resolved menu without another Firestore read.
- Snapshot payloads keep a 900 KiB preflight margin below Firestore's document limit.

## Firebase and scale

| Operation | Current cost |
| --- | --- |
| MCE evaluation and quality/trust computation | 0 Firebase operations |
| Standalone save/publish `_mce` stamp | 0 extra writes; same project mutation |
| Dashboard project data | One shared, 10-minute-deduped project read when setup/quality needs it |
| MOL summary edit | 1 append-only write when item truth changed |
| Publish observation | 1 append-only write |
| Publish snapshot | At most 1 append-only write; oversized payloads skip |
| Linked snapshot resolution | 0 extra reads; reuses the master document already fetched for publish admission |

The existing `menu_snapshot_cleanup` task is the active retention path. It now rotates a deterministic bounded page across every known store, including inactive stores, instead of repeatedly scanning only the first 200 active rows. The ineffective `menuSnapshots` collection-group TTL instruction was removed because the snapshot documents live in dynamic store-named subcollections. No new scheduler, collection, index, rule, API route, or owner setting was added. `menuChangeLog` remains intentionally retained operational memory; normal mode is compact and every reader is capped/paginated.

## Verification

- `npm run verify:menu-correctness-quality-boundary`
- `npm run verify:public-business-truth`
- `npm run verify:menu-project-editor-boundary`
- `npx tsc --noEmit`
- scoped ESLint for touched TypeScript/TSX files
- `npm run docs:check-links`
- `npm run verify:dependency-freeze`
- `git diff --check`

All listed source gates pass on the current worktree. `npm run docs:check-links` reports 0 broken links and 27 pre-existing naming warnings under retained video artifacts; this item added no naming violation.

## Owner/release pending

- Deploy and verify the scoped maintenance scheduler in `menulist-qa`, then production only with approved infrastructure access.
- Deploy the approved app release; no Vercel deployment is authorized by this audit.
- Run authenticated standalone and linked-outlet desktop/MobileShell saves, publish-gate checks, dashboard action handoff, and public menu trust-signal smoke.
- Confirm a linked outlet publish snapshot contains resolved master items plus local overrides and expires after the configured TTL window.
- Review representative currency, range, text-price, multilingual, stale/future-date, large-menu, low-bandwidth, and device cases.
