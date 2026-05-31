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

No new collection, listener, index, Storage object, Cloud Function, scheduler, or external cache was added.

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

No Firebase rules, indexes, Storage rules, or Cloud Function runtime logic changed in this guardrail pass. No Firebase deploy is required for these changes.
