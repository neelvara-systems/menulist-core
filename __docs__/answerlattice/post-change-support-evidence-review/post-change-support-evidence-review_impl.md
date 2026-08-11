# Post-Change Support Evidence Review Implementation

## 1. Architecture

```text
Owner explicitly loads recent changes
        |
        v
Private GET route
        |
        +-- at most 8 active releases
        +-- at most 8 implemented corrections
        |
        v
Owner selects one exact change
        |
        v
Server re-reads and validates that change
        |
        v
Two capped direct-entity signal queries
        |
        v
Strict count-only response
        |
        v
Responsive section inside Product Friction Evidence
```

No comparison document is persisted.

## 2. Implemented Files

| Path | Responsibility |
| --- | --- |
| `src/config/features.ts` | Additive rollout flag and cost contract |
| `src/lib/answerlattice/postChangeEvidence.ts` | Strict DTOs, UTC window math, count projection, comparison state |
| `src/lib/answerlattice/postChangeEvidenceServer.ts` | Exact-scope change queries, point validation, capped signal queries |
| `src/lib/answerlattice/postChangeEvidenceClient.ts` | Timeout, no-store request, bounded response read, strict browser admission |
| `src/app/api/answerlattice/post-change-evidence/route.ts` | Auth, rate limit, permission, strict GET query, private response |
| `src/components/templates/answerlattice/governance/PostChangeSupportEvidenceReview.tsx` | Explicit-load controls and responsive evidence result |
| `src/components/templates/answerlattice/governance/FrictionTab.tsx` | Mount the section without changing the existing two-read load |
| `scripts/verification/test-answerlattice-post-change-evidence.ts` | Pure window, count, threshold, and response contracts |
| `scripts/verification/verify-answerlattice-post-change-evidence.js` | Route, UI, cost, docs, and non-goal source gate |

## 3. API Contract

`GET /api/answerlattice/post-change-evidence`

List mode:

```text
?mode=list
```

Review mode:

```text
?mode=review&changeType=release&changeId=<id>
?mode=review&changeType=knowledge_correction&changeId=<id>
```

Unknown, duplicate, missing, or contradictory query parameters return `400` before Firestore access.

The list response contains at most 12 newest valid candidates after merging up to 8 releases and 8 corrections. The review response contains one candidate, window state, and either a complete count comparison or no comparison.

## 4. Server Read Contract

### Recent changes

- Active releases: exact scope and `status=active`, ordered by existing normalized version index, limit 8.
- Implemented corrections: exact scope, `status=implemented`, `impactTracked in [false, true]`, ordered by existing `implementedOn` index with `limitToLast(8)`.
- Revalidate all scope, status, timestamp, and direct entity IDs after each read.
- Merge and sort by server-owned change time, newest first, limit 12.

### Exact review

- Read exactly one selected change document.
- Validate with the maintained release or mutation proposal contract.
- Derive time and entity IDs from stored data, never query input.
- Reject missing, wrong-scope, wrong-status, malformed, or empty-link records.

### Signal windows

- Query exact `AL`/tenant/workspace scope.
- Use one `entityId in [...]` filter across at most 25 direct entity IDs.
- Use explicit timestamp bounds and ascending timestamp order.
- Apply a field mask for `pId`, `tId`, `sId`, `entityId`, `type`, and `timestamp`.
- Limit each query to 201 documents.
- Revalidate every returned field and timestamp before counting.
- If 201 records are returned, return `source_window_saturated`; do not count or interpret the partial window.

## 5. Client Contract

- 15-second abort timeout.
- `GET`, `cache: no-store`, same-origin credentials, manual redirects.
- 64 KiB maximum JSON response.
- Strict Zod parsing before state mutation.
- Exact requested change type and ID must match the review response.
- Generic owner error copy; no raw server or Firebase detail.

## 6. UI Contract

- One unframed section after existing Product Friction Evidence content.
- No fetch on mount.
- One primary load action, one select control, and one comparison action.
- Existing friction empty states remain plain, but this independent section remains reachable after the snapshot finishes loading.
- Ready output uses a simple descriptions layout, not nested cards or a chart.
- Narrow screens stack controls and evidence fields.
- Buttons and selects are at least 44 px high.
- No contextual illustration because waiting, unavailable, empty, and healthy governance states stay plain.

## 7. Error Behavior

- Feature disabled: private `403`; UI is not mounted.
- Rate limiter unavailable: fail closed through the maintained dashboard-read limiter.
- Permission denied: private `403`.
- Selected change missing: private `404`.
- Invalid stored change: private `409`.
- Missing Firestore Admin runtime: private `503`.
- Query or parser failure: generic private `500` and bounded runtime diagnostics.
- Candidate or comparison request failure: retain Product Friction Evidence and show a retryable local Alert.

## 8. Compatibility

The legacy nightly mutation `impactResult.improvementPercent` field remains unchanged for backward compatibility. This owner feature does not read or display it because its causal wording, single-entity scope, mixed-day windows, and historical caps do not satisfy this contract.
