# Ops Control Room (/ops)

**Status:** ✅ IMPLEMENTED — Superadmin access at /ops  
**Feature Flag:** N/A (route-level access control, superadmin only)  
**Priority:** 🟠 P1 — Build before scale (50+ stores)  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review
**Last Updated:** July 13, 2026

---

## Quick Navigation

| Document                                                                   | Audience   | Purpose                              |
| -------------------------------------------------------------------------- | ---------- | ------------------------------------ |
| [ops-control-room_spec.md](./ops-control-room_spec.md)                     | CEO/PM     | What it shows, why it matters        |
| [ops-control-room_impl.md](./ops-control-room_impl.md)                     | Developers | Technical blueprint, route, sections |
| [ops-control-room_mobile-support.md](./ops-control-room_mobile-support.md) | Mobile     | Platform-only emergency mobile support |

---

## One-Liner

Lean numeric internal dashboard at `/ops` that gives the founder system-wide visibility in <10 seconds — system health, adoption pulse, store integrity, and emergency controls.

## Architecture Overview (60-second summary)

```
Route: /ops (superadmin only, not in sidebar)
Layout: Single page, numeric blocks only

┌─ Section 1: System State ──────────────────────────┐
│ Menu Health: ✅ OK | Publish Success: 100% | Errors: 0 │
│ SAFE_MODE: OFF | Last Alert: none                   │
└─────────────────────────────────────────────────────┘
┌─ Section 2: Adoption Pulse (24h) ──────────────────┐
│ New Stores: 2 | Published: 5 | Active: 34          │
│ Feedback: 12 | AI Generations: 8 | Menu Views: 1.2K│
└─────────────────────────────────────────────────────┘
┌─ Section 3: Store Integrity ───────────────────────┐
│ Missing project: 0 | Unpublished >48h: 3           │
│ No publish 60d: 1 | MCE failing: 0                 │
└─────────────────────────────────────────────────────┘
┌─ Section 4: Recent Alerts ─────────────────────────┐
│ [list of last 10 alerts from systemAlerts]          │
└─────────────────────────────────────────────────────┘
┌─ Section 5: Emergency Controls ────────────────────┐
│ [Enable SAFE_MODE] [Disable SAFE_MODE]             │
│ [Mute Alerts 20min]                                │
└─────────────────────────────────────────────────────┘
```

**Design:** Lean v1. No charts. Numbers only. Manual refresh. Fetch-on-open.

## Scheduler Monitor

`/ops/scheduler` is the related internal monitor for the unified nightly scheduler. It shows:

- Run-log health from `schedulerRunLogs`
- Per-task breakdown including OBP + menu analytics settlement
- Store-local settlement state from `platformSummary/nightlyState_*`
- Failed/stale settlement counts for catch-up monitoring
- Manual store-level nightly recovery via `triggerStoreNightlyScheduler`

The manual recovery button uses the selected store from `platformSummary/storesSummary`. It does not expose project IDs in the UI; the callable reruns the store-level nightly path for every active project under that store, including analytics settlement, Decision Blocks, and Menu Intelligence.

Manual recovery creates a deterministic `schedulerRunLogs/manual_store_{tId}_{sId}_{timestamp}` document before work starts. Failed runs keep `phase`, `manualScope`, `runLogId`, task counts, and structured `errors[]` entries with `code`, `operation`, optional `settlementDate`, and safe details so the broken step can be fixed before retrying. MenuList scheduler run logs carry `expiresAt` and are retained for the configured operational window rather than permanent history.

Source gate: `npm run verify:scheduler-monitor-boundary` locks the read-only scheduler DAL, bounded desktop/mobile scheduler detail rendering, MobileShell mapping, and the store-level manual recovery boundary. It does not run Firestore reads/writes, callable invocations, browser smoke, Firebase deploy, or Vercel deploy.

Scheduler and alert failure diagnostics use bounded `ops_*` codes through `src/lib/ops/opsDiagnostics.ts`. Functions-side ops triggers use stable `OPERATIONS_*` codes for publish verification, force republish, budget alerts, and stores-summary backfill failures. The operator UI may show a run-log ID for manual recovery failures, but it does not show raw provider/callable exception messages.

High-risk `/api/ops` controls and notification monitors do not rely on the signed platform-role claim alone. After a fail-closed HMAC-keyed limiter, they re-read the exact current platform user before private data, provider, or mutation work. Notification metrics describe a bounded recent window, and SAFE_MODE repeats are idempotent.

`forceRepublish` is a platform recovery mutation, not a claim-only shortcut. The Function transactionally admits canonical user/tenant/store authority and touches every active canonical project in the selected store, capped at 100 documents. It then revalidates the same authority and public hostname with the resulting store-health write. A stale platform token, removed platform role, inactive entity, mismatched store tenant, or cross-scope project cannot be touched.

## Cost Posture Monitor

`/platform/cost-posture` is the related internal monitor for known cost posture. It links existing cost-adjacent platform screens together and keeps the original cost-tracking rejection intact:

- No `ops_daily_cost` collection.
- No `ops_baselines` collection.
- No Firestore-driven billing forecast scheduler.
- Known AI/provider signals come from existing bounded logs.
- Whole-bill Firebase forecasting remains blocked until Cloud Billing export to BigQuery is configured.

## Key Decision: What ChatGPT Got Wrong

ChatGPT proposed 7 sections including cost tracking (ops_daily_cost) and baseline comparisons. **Rejected** because:

- Firebase doesn't expose read/write counts via API
- Cost visibility comes from Firebase Console + GCP budget alerts
- Baseline comparisons require additional Firestore collections (cost overhead)
- Lean v1 with numeric blocks is correct for solo founder with <200 stores

## Feature Flag

No feature flag needed. Access control via route-level superadmin check.

---

**Version History:**

| Version | Date              | Changes                                   |
| ------- | ----------------- | ----------------------------------------- |
| 1.3     | July 13, 2026     | Added current persisted platform authorization, fail-closed ops limits, bounded recent notification counts, atomic manual handoff, and idempotent SAFE_MODE transitions |
| 1.2     | June 16, 2026     | Added link to Platform Cost Posture as the accepted bounded cost visibility surface |
| 1.1     | May 1, 2026       | Added scheduler settlement monitoring boundary |
| 1.0     | February 20, 2026 | Initial documentation from ChatGPT review |
