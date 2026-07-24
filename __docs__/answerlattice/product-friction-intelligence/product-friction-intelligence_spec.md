# Product Friction Evidence Specification

## Customer Job

Show a founder which mapped product areas are generating the most support friction, what changed between two completed windows, and which evidence should be reviewed next without claiming that support volume proves a product defect.

## Inputs

- `answerlattice_signalEvents` for the current UTC day, scoped by `pId`, `tId`, and `sId`.
- `aiSearchHistory` canonical misses for the current UTC day, queried by exact `pId: AL + tId + sId` before the read cap and rechecked for exact Answerlattice scope.
- active `answerlattice_entities` documents for semantic names and types.
- exact-`AL` `answerlattice_frictionDailyStats` rows for the current completed seven days and previous completed seven days.

Tickets, chats, feedback, and search misses are evidence signals. They do not become approved truth.

## Window Contract

The daily ingest date uses UTC. The review snapshot never includes a partial current day.

- current window: the seven completed UTC calendar days ending yesterday;
- comparison window: the seven completed UTC calendar days immediately before the current window;
- one snapshot must declare schema version 2, exact workspace scope, timestamps, date keys, complete status, source limit, and observed row count.

## Admission and Mapping

Only normalized entity IDs that resolve to exact-scope active entities produce ranked daily rows. Evidence for missing, inactive, malformed, or foreign entities increments `unmappedEvidenceCount` and is not assigned to a guessed entity.

## Calculations

For one entity:

`weightedLoad = evidenceCount * (1 + escalationCount/evidenceCount + canonicalMissCount/evidenceCount)`

Trend thresholds:

- `new`: previous load is zero and current load is positive;
- `rising`: current/previous is greater than 1.5;
- `improving`: current/previous is below 0.7;
- otherwise `stable`.

Friction-level thresholds use total weighted load across all admitted entities:

- `LOW`: 0 through 100;
- `MODERATE`: above 100 through 500;
- `HIGH`: above 500.

These thresholds are operational triage labels. They are not accuracy, satisfaction, severity, defect, or product-health scores.

## Outputs

### Daily rows

`answerlattice_frictionDailyStats/{tId}_{sId}_{entityId}_{date}` contains exact scope, schema version, entity identity, daily evidence counts, weighted load, and server timestamp. Reruns exactly replace this derived row. Historical aggregation admits bounded numeric fields only, recomputes weighted load, and rejects duplicate entity/day truth.

### Snapshot

`platformSummary/frictionSnapshot_{tId}_{sId}` contains:

- exact product and workspace scope;
- complete window metadata;
- top ten friction entities;
- up to five emerging topics;
- friction level and total weighted load;
- all-entity evidence and escalation totals;
- unmapped evidence count;
- legacy daily-row count;
- server last-updated timestamp.

### Advisory insight

`platformSummary/friction_{tId}_{sId}` may contain a bounded summary, allowlisted entity-specific suggested actions, emerging notes, source snapshot timestamp, friction level copied from the deterministic snapshot, and `advisory: true`.

The advisory producer must validate exact workspace scope and the complete source shape before provider work. Publication must occur through a transaction-current source fingerprint check and exact document replacement; a changed source, malformed metric, unsupported model field, or unknown entity ID produces no advisory write.

## Owner Experience

- show an unavailable state when no valid snapshot exists;
- distinguish no evidence from evidence needing entity mapping;
- show the completed date range and stale state;
- label weighted load and friction level precisely;
- keep the weekly summary visibly advisory;
- keep refresh manual and read-only.
- never render or return loaded snapshot/advisory state when its stored scope key differs from the current requested workspace.

## Limits and Failure Rules

- daily signals: 500 rows plus one saturation sentinel;
- daily canonical misses: 500 rows plus one saturation sentinel;
- 14-day friction history: 500 rows plus one saturation sentinel;
- top owner list: 10 entities;
- emerging list: 5 entities;
- cleanup retention: 90 days, exact `AL` product/workspace query, oldest-first bounded deletion, and post-commit counting.

Any saturated or invalid required source fails the tenant task. The prior valid summary remains preferable to a truncated replacement.

## Non-Goals

- generic product analytics;
- behavioral event instrumentation;
- automatic root-cause diagnosis;
- automatic answer or product changes;
- a universal health score;
- autonomous customer outreach;
- treating every ticket or chat as verified truth.
