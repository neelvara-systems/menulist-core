# Cost Read-Model Guardrails Firebase Notes

## Runtime Cost Change In This Pass

| Change | Reads | Writes | Deletes | Notes |
| --- | ---: | ---: | ---: | --- |
| Widget activity indexed path | unchanged | 0 | 0 | Still reads up to 12 tenant/widget rows. |
| Widget activity fallback | up to 80 tenant-scoped rows | 0 | 0 | Previously fallback scanned recent global rows before tenant filtering. Now fallback stays in the current `tId/sId`. |
| Signal event caller limits | capped to 500 recent rows / 90 days | 0 | 0 | Prevents caller-supplied high limits from expanding reads. |
| Batch signal count query | capped to 1000 rows per 30-entity batch | 0 | 0 | Existing cap is now named and fixed. |
| Audit log loads | capped to 200 rows | 0 | 0 | Protects owner/history views from accidental high reads. |
| Support Board loads | capped to 120 rows | 0 | 0 | Invalid or negative limits now fall back to the configured cap. |
| Entity-label governance tabs | one bounded entity query | 0 | 0 | Canonical answers, usage analytics, and drift no longer also read relations and search-index rows. |
| Entity health tab | bounded entity + search-index queries | 0 | 0 | The unused relation query is skipped. |
| Predictive trigger create cap | one scoped count aggregate | 0 | 0 | Replaces fetching up to 200 trigger documents only to count them; summary rebuild remains bounded at 201 rows. |
| Scheduler source-window telemetry | 0 additional source reads | 0 additional writes | 0 | Reuses the existing scheduler source operations and run-log write. Each task records at most eight compact logical operation-result windows; the platform monitor returns at most 80. |
| Daily Brief concurrent cold load | one shared six-document `getAll()` per workspace flight | 0 | 0 | Same-workspace requests join one exact-promise-owned load; the 60-second, 300-workspace cache remains unchanged. |
| Owner decision summary indexing | unchanged | lower index amplification on existing writes | 0 | Large point-read-only Knowledge Map, friction, Answer Tests, and Activation payloads are exempt in dedicated/shared manifests. |

No new collection, listener, composite index, Storage object, scheduler, external cache, source query, or run-log write was added. Existing Answerlattice Cloud Function logic was instrumented, and the dedicated/shared index manifests now disable automatic indexing for the listed exact point-read summary payloads.

The scheduler observations are not Firebase billing data. They intentionally exclude index-entry billing, transaction retries, uninstrumented direct document reads, provider calls, and cached or server-side billing adjustments. Use them to find semantically identical high-volume windows, then confirm any proposed consolidation against Firebase billing telemetry before changing query ownership.

## Required Pattern For Future Answerlattice Features

| Need | Preferred Firebase shape | Not preferred |
| --- | --- | --- |
| Dashboard health/counts | One `platformSummary/*` document | scanning tickets/signals/jobs on every load |
| Recent detail list | tenant-scoped query with `limit()` or cursor | unbounded `getDocs()` |
| Owner active job progress | one bounded doc/list listener only if justified | per-item listeners |
| Runtime widget config | short cache + API-key/origin scoped document read | realtime listener per page load |
| Platform monitor | tenant summary first, tenant details after selection | loading recent jobs for all tenants |
| Nightly read model | consolidated Answerlattice scheduler step | standalone scheduled function per feature |

## Deployment Impact

Answerlattice Cloud Function runtime logic changed in the July 20 pass, so the existing `answerlatticeNightly` and `triggerAnswerlatticeNightly` exports require a QA Functions deploy. The scoped July 20, 2026 attempt stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote Function revision changed.

The July 29 owner-decision pass changed only the dedicated/shared Firestore index manifests and Next.js server read coalescing. Its scoped QA index deployment stopped before any remote change with the same Firebase CLI authentication error; a July 30 cross-check retry failed at the same boundary. No Firebase rules, Storage rules, scheduler definition, or app-hosting deployment changed.
