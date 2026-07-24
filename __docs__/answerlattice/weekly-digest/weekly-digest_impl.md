# Weekly Digest Implementation

## Current Flow

```text
settled chat sessions
-> daily exact-scope analytics summary
-> Sunday UTC master-scheduler task
-> strict 14-day source admission
-> deterministic completed-week aggregation
-> source-completeness calculation
-> hash comparison
-> existing weekly insight write when changed
-> strict browser read
-> current/partial/stale presentation
-> permission-filtered review handoff
```

## Source Map

| Area | Current source |
| --- | --- |
| Route | `src/app/(answerlattice)/answerlattice/weekly-digest/page.tsx` |
| Primary UI | `src/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest.tsx` |
| Legacy read-only UI | `src/components/templates/platform/chatManagement/WeeklyDigest.tsx` |
| Shared parser/freshness | `src/lib/answerlattice/analyticsIntelligenceContracts.ts` |
| Manual prepare route | `src/app/api/analytics/weekly-narrative/generate-local/route.ts` |
| Deterministic writer | `functions-answerlattice/src/answerlattice/chatIntelligence.ts` |
| Scheduler integration | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` |
| Scheduled export | `functions-answerlattice/src/index.ts` as `answerlatticeNightly` |
| Permissions | `src/constants/answerlattice/permissions.ts` |
| Firestore rules | `firestore-answerlattice.rules`, with shared recovery mirror in `firestore.rules` |

## Scheduled Preparation

The existing hourly `answerlatticeNightly` export runs the master scheduler. Workspace-local settlement decides when nightly work runs. Weekly chat intelligence is requested on Sunday UTC after the daily analytics task has completed or when the Sunday run requires a weekly refresh.

The writer:

1. validates positive integer tenant/store scope;
2. reads at most 14 exact-scope daily rows;
3. strictly parses every returned row;
4. requires every admitted current-week day to be source-complete;
5. aggregates the latest completed seven UTC days and the prior seven;
6. marks completeness from actual admitted source days;
7. generates bounded deterministic text;
8. hashes the source payload;
9. reads the existing feedback insight and, on weekly runs, the existing weekly insight;
10. writes only changed schema-v2 insight documents by exact replacement.

Both scheduled and manual writers use the same literal contract: `volumeChangePercent`, nullable `positiveFeedbackSharePointChange`, deterministic tie-breaking, a 120-character top category, at most 20 counted recurring gaps, and identical narrative/recommendation wording. Missing conversation or recorded-feedback denominators produce `null`, never false zero movement.

## Manual Compatibility Path

`POST /api/analytics/weekly-narrative/generate-local` is an app route for an authorized operator, not a second scheduler.

- feature-gated;
- exact session scope;
- workspace rate limit: two requests per minute;
- `canManageSupport`;
- two bounded seven-row daily queries;
- strict daily parsing;
- incomplete current source rejection;
- one existing weekly insight read;
- at most one hash-skipped write;
- exact schema-v2 replacement with no legacy merge fields;
- private no-store response;
- no provider call or AI accounting.

## Browser Read

The primary UI performs one direct Firestore document read and admits it through `parseAnswerlatticeWeeklySummary`. It does not trust arbitrary stored shape, product identity, dates, generation mode, source counts, or timestamp.

The legacy platform component is read-only. It cannot manually generate a digest. Both surfaces withhold incomplete comparisons on screen and in exported text.

The shared parser remains backward compatible with legacy deterministic rows containing `volumeChange` / `satisfactionChange`, but returns only the literal current DTO. New writes never restore those fields.

## Failure and Recovery

- Missing row: explain scheduler timing and allow refresh; permitted users may prepare.
- Invalid row: fixed load error and no untrusted rendering.
- Partial source: show source-day evidence and withhold comparisons.
- Stale row: warn before support decisions.
- Future row: mark invalid.
- No daily data: return `no_data` without a write.
- Incomplete current daily source: return conflict without a write.
- Unchanged source hash: return success with `written: false`.
