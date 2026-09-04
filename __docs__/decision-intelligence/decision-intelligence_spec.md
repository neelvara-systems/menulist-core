# Decision Intelligence — Product Specification

**Public name:** Featured Choices
**Last verified:** September 2, 2026
**Status:** Local source-complete for the audited feature; not current launch certification. Firebase QA deployment and release certification remain pending.

This spec is not production approval. Current release clearance still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, scoped scheduler deploy evidence, browser/device/customer-menu QA, public-cache evidence, and production-host smoke.

## Purpose

Featured Choices can give customers a small starting point above the full approved menu. The feature never replaces the menu, changes the normal category order, invents an item, or promises an order or sale.

The three possible choices are:

| Internal block | Owner/public label | Current evidence boundary |
| --- | --- | --- |
| `popular` | Featured choice | Recent menu interactions on the current item, with neutral `Popular choice` wording |
| `quickPick` | Quick choice | An explicit item duration at or below the business-category threshold |
| `bestValue` | Value choice | A priced item at or below the current menu's average priced-item value |

The section appears only when the current data gates pass or an owner has selected an eligible item. It is not shown on every menu.

## Authority and data boundary

- `projects/{tId}/{sId}/{projectId}` is the menu and owner-control authority.
- `analytics/{tId}_{sId}_{projectId}_intelligence_7d` is the only scheduler scoring input.
- `project.publicDecisionBlocks` is a generated customer-safe projection. Owner writes must not overwrite it.
- The public server route binds the embedded projection to the resolved tenant/store/project, runtime-validates the exact writer shape, and emits only the candidate, timestamp, and bounded stats fields consumed by the renderer.
- Current active catalog items are authoritative. Deleted, inactive, or analytics-only item IDs cannot become candidates.
- `extractionIdAliases` may carry prior analytics into the current item ID.
- Current IDs are unique, catalog/alias cardinality is bounded to 2,000, and merged view/click counters must remain safe integers. Duplicate IDs, malformed containers, excessive aliases/items, or counter overflow fail the scoring run before any projection write.
- `available: false` and category time slots are runtime filters because availability is temporary.
- MenuList does not have POS sales, order completion, review, rating, or inventory data in this flow.

## Scheduled flow

1. `computeDecisionBlocksScores` fires hourly at minute 30.
2. Only stores whose store-local analytics settlement is due are processed.
3. Active projects are resolved from `platformSummary/projects_{sId}`. A valid empty summary ends the lookup without a collection scan.
4. The compact 7-day analytics snapshot and each active project are read once.
5. Current active items are extracted and scored. Equal scores are ordered by binary item ID, so persisted candidate order is independent of catalog traversal order.
6. Up to three candidates per enabled block are written to `project.publicDecisionBlocks` with a 48-hour TTL. If the current project has no scoreable active items, an existing generated projection is deleted and the public store cache is invalidated; absence already remains zero-write.
7. The public menu/OBP cache is invalidated once for the affected store.
8. Public rendering applies data gates, owner settings, availability, time-slot, duplicate-item, price-display, and stale-data checks.

Missing or stale compact analytics never opens a hidden daily-document range query. Automatic output stays hidden until data earns the right to guide; valid owner pins can still be used.

## Eligibility gates

Automatic choices require all global gates:

- at least 100 total item views in the stored projection;
- at least 20 behavioral clicks;
- at least 5 current active items; and
- at least 3 settled analytics days.

Block-specific gates:

| Block | Gate |
| --- | --- |
| Featured | At least 30 behavioral clicks overall and at least 3 current items with 3 or more clicks each. Only individually evidenced items become candidates. |
| Quick | Stable lifecycle (500 or more views), at least 60% explicit-duration coverage, and an explicit duration no greater than the shared category threshold. |
| Value | Prices are visible, at least 70% price coverage, at least 5 priced items, and candidate price is no greater than the priced-item average. |

At least two automatic blocks must survive runtime filtering. One owner-selected block may render by itself because it is explicit owner-authored menu guidance.

## Owner flows

Desktop and mobile expose the same controls when `FEATURE_FLAGS.ENABLE_DECISION_BLOCKS` is enabled:

- show or hide each business-category-supported choice;
- select one current item for a choice;
- clear the selection to return to automatic choice; and
- save through the shared project mutation boundary; and
- after that saved truth settles, preview, edit, and download the existing Campaign Poster for the explicit choice from the same setting surface.

An owner-selected item still must be active, available, inside its category time slot, supported by the business category, not duplicated in another rendered choice, and priced when used for Value choice. If it cannot be shown, another eligible automatic choice may appear; otherwise that choice stays hidden.

The static poster path is narrower than public runtime fallback: it is available only for a saved explicit pin, never for automatic selection. It uses the existing business-aware public block label, current localized item name and optional description, selected parent theme, and canonical exact-item URL. Missing, hidden, unavailable, disabled, unsupported, unsaved, or linkless input fails closed. No new Decision Intelligence read/write, poster record, generated-file persistence, or campaign completion state is introduced.

## Runtime stale behavior

- Valid generated projection: use scored candidates plus runtime filters.
- Expired or activation-gate failure: owner-selected items only.
- More than 72 hours since a valid computation: automatic choices stay hidden; valid owner-selected items remain eligible.
- Invalid timestamps, no items, all unavailable items, or no safe result: show less rather than wrong.

## Feature flags

- App UI/public renderer: `FEATURE_FLAGS.ENABLE_DECISION_BLOCKS`
- Functions projection writes: `FUNCTION_FLAGS.ENABLE_DECISION_BLOCKS_SCORING`
- CMI is independently controlled and is not required for Featured Choices rendering.

## Manual recovery

- `triggerDecisionBlocksScoring` accepts one `{ tId, sId, projectId? }` scope.
- It requires an authenticated platform token and a current active `users/{uid}` platform-owner record.
- Store and project scope are revalidated before writes.
- Platform-wide callable fan-out is rejected; the scheduled function owns all-store processing.
- `triggerStoreNightlyScheduler` is the store-level recovery path when analytics settlement and CMI must also run.

## Out of scope

- checkout, ordering, payment, POS, inventory, ratings, reviews, or sales attribution;
- exact decision-time or revenue-improvement claims;
- client-side ranking when the generated projection is absent;
- CMI priority changing the public menu order; and
- owner-facing algorithm, confidence, or scoring explanations.

## Acceptance checks

- Current catalog IDs only; aliases merge history; deleted IDs are pruned.
- Duration `0` remains valid and is never replaced by a default.
- Shared app/Functions duration and block configuration are byte-equivalent.
- Automatic popular wording is neutral and has per-item behavioral evidence.
- Scheduler and manual writes invalidate public cache once per affected store.
- Desktop and mobile controls use one settings shape and are feature-gated.
- Desktop and mobile saved explicit pins open one shared Campaign Poster preview/editor/download contract; automatic and unsaved choices cannot print.
- Public output stays available only while safe, current, and eligible.

Historical pre-audit specification: `_archive/pre-2026-07-16/decision-intelligence_spec.md`.
