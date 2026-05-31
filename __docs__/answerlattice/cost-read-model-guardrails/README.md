# Answerlattice Cost Read-Model Guardrails

> **Status:** Active Architecture Guardrail  
> **Last Updated:** 2026-05-31  
> **Scope:** Answerlattice dashboard, widget/runtime APIs, nightly scheduler summaries, owner review surfaces, and platform monitoring.

## Purpose

Answerlattice must stay predictable as tenants, support questions, tickets, signals, intake jobs, and governance records grow. The default architecture is not "make every screen realtime." The default is:

1. one compact summary document for screen-level readiness and counts,
2. bounded detail queries only after the owner opens a detail surface,
3. no per-item realtime listeners,
4. deterministic scheduler summaries for recurring work,
5. explicit owner-triggered expensive actions with support-credit accounting.

This keeps Answerlattice usable for small SaaS founders while protecting Firebase spend.

## Active Rules

### 1. Summary Docs First

Use `platformSummary/*` documents for screen-level state before reading growing collections.

Current summary docs include:

- `platformSummary/answerlatticeTenantsSummary`
- `platformSummary/contextContent_{tId}_{sId}`
- `platformSummary/coverage_{tId}_{sId}`
- `platformSummary/trustMetrics_{tId}_{sId}`
- `platformSummary/frictionSnapshot_{tId}_{sId}`
- `platformSummary/friction_{tId}_{sId}`
- `platformSummary/sourceVersions_{tId}_{sId}`
- `platformSummary/bundleManifest_{tId}_{sId}`
- `platformSummary/supportBoardSummary_{tId}_{sId}`
- `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`
- `platformSummary/predictiveTriggers_{tId}_{sId}`
- `platformSummary/integrationHealth_{tId}_{sId}`

Dashboard cards, activation readiness, platform monitors, and digest-style review screens should read summaries instead of scanning source logs.

### 2. Detail Lists Are Bounded

Any owner-facing list over a growing collection must have a hard cap or cursor pagination.

Current caps:

| Area | Cap |
| --- | ---: |
| Support Board cards | 120 per load |
| Support Board source sync | 50 source docs read, 20 cards written |
| Support Board notes | 25 embedded notes per card |
| Support Board status history | 50 embedded entries per card |
| Product surfaces | `ANSWERLATTICE_PRODUCT_SURFACE_LIMIT` |
| FAQs | 200 management rows, 80 public rows |
| Entities / canonical answers | 500 owner rows |
| Mutation proposals | 200 rows |
| Audit logs | 200 max per load |
| Recent signal events | 500 max per load |
| Widget activity | 12 display rows, 80 tenant-scoped fallback rows |
| Knowledge intake jobs/sources/review items | bounded by `ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS` |

Do not introduce a new list without adding the cap to the feature's Firebase doc.

### 3. Realtime Is Exceptional

Answerlattice dashboard and widget configuration surfaces should not use Firestore `onSnapshot` by default.

Allowed exceptions must satisfy all conditions:

- exactly one listener per screen or one listener for one active job/doc,
- bounded query or single document,
- owner-visible value that polling cannot provide,
- explicit Firebase cost note,
- cleanup on unmount.

Presence, typing indicators, live cursors, and ephemeral collaboration state should not be stored in Firestore. If Answerlattice later needs those features, use a dedicated ephemeral realtime layer after a separate architecture decision.

### 4. Hot Docs Stay Small

Hot documents should contain:

- status,
- counts,
- recent IDs,
- compact labels,
- summary health,
- timestamps,
- source hashes.

Cold data remains in source collections:

- full tickets,
- full conversations,
- audit trails,
- signal logs,
- intake source text,
- review item payloads,
- canonical answer history.

Avoid putting large source text, raw media, transcripts, or full history arrays into hot summary documents.

### 5. Scheduler Writes Skip Unchanged State

Nightly summaries should compute a deterministic source hash and skip writes when the read model did not change. This is already required for graph summaries and should be reused for new scheduler summaries.

### 6. External Cache Is Not The Default

Do not add Redis, sockets, or another cache just because a route reads Firestore.

Use external realtime/cache infrastructure only when:

- the state is ephemeral and high-frequency, or
- the Firestore read path is proven expensive by screen-level measurement, and
- invalidation remains simpler than the Firestore summary path.

## Implementation Notes

- `src/app/api/answerlattice/widget-activity/route.ts` uses the indexed tenant/widget query first. If that fails, the fallback now remains tenant-scoped before filtering widget rows.
- `src/database/answerlattice/signalEvents.ts` clamps caller-provided window and result limits.
- `src/database/answerlattice/auditLogs.ts` clamps audit loads to 200.
- `src/database/answerlattice/supportBoard.ts` clamps board loads to the configured max and protects against invalid limits.
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` and related scheduler modules own recurring summary preparation. Do not create separate scheduled functions for new Answerlattice summary maintenance unless doctrine changes.

## Review Checklist

Before merging Answerlattice code that reads Firestore:

- Does the first screen read a summary doc instead of scanning a source collection?
- Is every list capped or cursor-paginated?
- Is there any `onSnapshot`? If yes, is it a single bounded listener and documented?
- Does a fallback query remain tenant-scoped?
- Does the code avoid raw media/full text in hot docs?
- Does the feature Firebase doc include read/write/delete/listener costs?
- Does the final answer include a Firebase cost impact note?
