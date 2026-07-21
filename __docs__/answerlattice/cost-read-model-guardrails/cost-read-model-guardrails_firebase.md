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

No new collection, listener, index, Storage object, scheduler, external cache, source query, or run-log write was added. Existing Answerlattice Cloud Function logic was instrumented.

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

Answerlattice Cloud Function runtime logic changed, so the existing `answerlatticeNightly` and `triggerAnswerlatticeNightly` exports require a QA Functions deploy. The scoped July 20, 2026 attempt stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed. No Firebase rules, indexes, Storage rules, scheduler definition, or app-hosting deployment changed.
