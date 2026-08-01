# Owner Dashboard - Current Runtime Contract

> **Version:** 3.0
> **Last Updated:** July 28, 2026
> **Status:** Implemented reference; not current launch certification

> **Launch boundary:** This document records current source behavior. It is not production approval. Release readiness still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [production-readiness checklist](../production-readiness/README.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), target deployment evidence, desktop/mobile browser QA, and production-host smoke.

## Current Runtime Boundary

The current owner dashboard is a Today-first live dashboard. It is a confirmation surface for a non-technical owner, not an overview-first analytics report builder.

- Desktop `/dashboard` renders `OwnerDashboard`; desktop `/today` renders the separate operational `TodayScreen`.
- Mobile `/dashboard` and `/today` both enter the Today tab. Analytics details and Business Health require `VIEW_ANALYTICS`, including direct mobile hash or path entry.
- `OwnerPermissionGuard` protects desktop `/dashboard` and `/business-health` with `VIEW_ANALYTICS`.
- `showHistorical` starts `false`. Dashboard callers pass `loadHistorical: showHistorical` to `useOwnerDashboard()` and `useOBPDashboard()` so settled reads stay lazy until the owner selects a non-Today view.
- The Today view reads live per-project and OBP daily documents through bounded DAL normalizers. Optional source-readiness, project-setup, and Business Health cards use their existing bounded sources when their flags are enabled.
- Settled menu analytics come from `{tId}_{sId}_{projectId}_dashboard_summary`; settled OBP analytics come from the OBP dashboard read model. The owner client must not rebuild settled menu cards from an unbounded daily-document range.
- Browser caches are tenant/store/project scoped. Today data has a 10-minute TTL; settled scheduler data uses the store-local scheduler day key. Persisted cache envelopes require exact safe-integer timestamps not in the future plus a canonical calendar date; malformed entries are removed. Owner Dashboard and Owner Action Plan payloads are reprojected through the DAL read-model normalizers (including exact project identity for the settled model) before fallback or fetcher use.
- Desktop graph mode is gated by `ENABLE_OWNER_DASHBOARD_GRAPH_MODE`. It renders existing settled `daily30d`, cached `trendSummary`, source, action, item, search, and OBP data. It adds no event, write, collection, job, or provider call.
- Past Activity remains disabled unless `ENABLE_PAST_ACTIVITY_HISTORY` is enabled. `/today/history` redirects or falls back to Today when the flag is disabled.

## Owner Experience

The first screen answers whether the official customer source is ready and whether anything needs attention. Activity details stay secondary.

- The official customer source covers menu, hours, customer link, private feedback, and owner-confirmed placement state.
- The Owner Action Layer chooses one existing next step; it does not create a second mutation system.
- Mobile activity details are collapsed until the owner opens them.
- Business Health is read-only. It can explain the current grounded check but must not prepare drafts or mutate menu, store, outlet, staff, or public truth.
- Normal state copy remains quiet: `No action needed.`

## Read and Cost Contract

The old estimate of roughly 37 daily-document reads on every initial visit is obsolete.

| Owner action | Current read shape |
| --- | --- |
| Open Today | One current menu daily document plus one current OBP daily document when both scopes are available; optional flagged cards use their existing bounded source |
| Open Overview, Graph, Weekly, Monthly, or Overall | One settled menu dashboard-summary read and one settled OBP dashboard read-model read, normally satisfied by the scoped browser cache for the scheduler day |
| Open a period not present in the settled model | One bounded period fallback read for that selected view only |
| Reopen within cache TTL/day key | Browser cache, with no corresponding Firestore read |

The exact read count can vary with enabled cards and cache state, so this contract deliberately records data shape rather than unsupported currency projections. No dashboard path may add a hot-path collection scan, unbounded daily query, per-card duplicate read, or new summary-only write.

OBP overview summary read diagnostics preserve the existing degraded behavior: if the optional OBP overall-summary read fails, the settled OBP path can build WTD/MTD/history from its bounded daily data, logs `owner_dashboard_obp_summary_read_failed`, and leaves `viewsChange` as `null`. It does not add another fallback read or write.

## Data Flow

```text
Public menu / OBP activity
  -> coalesced browser queue
  -> POST /api/public/analytics/track
  -> daily analytics document
  -> nightly settlement
  -> compact dashboard summary/read model
  -> owner DAL normalizer
  -> scoped SWR + localStorage cache
  -> Today or owner-requested settled view
```

The settlement job also stores cached weekly/monthly movement labels and trend comparisons inside the existing dashboard-summary write. The small comparison chart cards cover menu activity, customer actions, search demand, item interest, unavailable demand, and missing-search trends. They are not export controls, branch filters, date-range report builders, or sales reports.

## Permission and Failure Contract

- Desktop route admission is enforced before dashboard children mount.
- Mobile shell entry, direct hashes, and Business Health route mapping enforce `VIEW_ANALYTICS` before analytics screens mount.
- Owner Business Health APIs independently enforce authentication, selected-store scope, and `VIEW_ANALYTICS`.
- Owner action mark-done acknowledgement transactionally rechecks that the action is current and updates the bounded deterministic receipt map, preventing concurrent stale read/update loss.
- Invalid, wrong-project, or malformed cached read models fail normalization and are evicted or rejected. Scope remains part of every cache/SWR key, sign-out clears the cache namespace, and no TypeScript generic assertion is accepted as runtime cache validation.
- Desktop and mobile analytics-detail cards share one exact runtime projector.
  It reads only known own-data fields, bounds row counts/text/counts/rates,
  ignores malformed nested records/accessors, maps lifetime metrics explicitly,
  and emits no section for unusable data. Rates are capped at 100 and counts
  are finite non-negative integers before owner-facing formatting.
- Today and settled failures remain visible through the existing safe error/empty states; the client does not fabricate totals.
- Analytics collection browser writes remain denied by Firestore rules. Public customer writes go through the protected Admin route.

## Verification

Run from the repository root:

The focused source boundary is `npm run verify:owner-dashboard-today-boundary`.

```bash
npm run verify:owner-dashboard-today-boundary
npm run test:owner-dashboard-details-boundary
npm run verify:owner-business-health-boundary
npm run verify:analytics-write-boundary
npm run verify:catalog-analytics
npm run test:swr-local-storage-provider
npx tsc --noEmit
```

Also complete desktop/mobile browser QA and target-host smoke before release claims.

## Historical Reference

The earlier overview-era design, detailed WTD/MTD examples, old 37-read estimates, and historical implementation notes are preserved in [`_archive/owner-dashboard-v2.2-overview-era-reference.md`](./_archive/owner-dashboard-v2.2-overview-era-reference.md). They are not current runtime or cost authority.
