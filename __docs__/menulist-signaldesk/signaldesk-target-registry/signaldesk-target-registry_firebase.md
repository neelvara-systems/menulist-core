# SignalDesk Target Registry - Firebase Cost Plan

**Status:** Initial planning doc
**Created:** June 23, 2026
**Cost impact now:** None.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskTargetSummaries` | Target list rows | Paginated target list |
| `signaldeskTargets` | Full target detail | Target detail only |
| `signaldeskSourceCandidates` | Source refs and imported facts | Target/import detail |
| `signaldeskContactIdentities` | Contact records with masked/list-safe fields | Target detail only |
| `signaldeskChannelIdentities` | Email/phone/social identities | Target detail only |
| `signaldeskImportRuns` | Import run summaries | Import list |
| `signaldeskImportRows` | Row-level validation/import status | Import detail only |
| `signaldeskTargetStateEvents` | State changes | Target detail/audit only |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Target list page | 1 query | 0 | Summary collection only. |
| Target detail | 4-10 docs | 0 | Target, contacts, source refs, state history page. |
| Import 100 rows | 100-300 dedupe reads | 100-250 writes | Batch writes; cap rows. |
| Create target manually | 2-5 | 2-5 | Target, summary, source candidate, audit/state. |
| State change | 2-4 | 2-4 | Target, summary, state event, audit. |
| Reveal contact | 2-5 | 1 audit write | No list-view reveal. |

## Indexes

- `signaldeskTargetSummaries`: `status + updatedAt`
- `signaldeskTargetSummaries`: `segment + updatedAt`
- `signaldeskTargetSummaries`: `nextAction + updatedAt`
- `signaldeskTargetSummaries`: `city + category + updatedAt`
- `signaldeskContactIdentities`: `identityHash + channel`
- `signaldeskImportRows`: `importRunId + status`
- `signaldeskTargetStateEvents`: `targetId + createdAt`

Do not index raw contact values or raw source fields.

## Cost Controls

- Page size max 50.
- No target list listeners.
- No raw import-row dashboard scans.
- Import rows should be deleted or archived per retention policy.
- Target summary must contain only list-safe fields.
- Dedupe should use hashes and compact keys.

## Retention

| Data | Default |
| --- | --- |
| Import rows | 30-90 days |
| Target summaries | Until target deletion/restriction |
| Contact identities | Minimum necessary; suppression preserved separately |
| State events | 24 months |
