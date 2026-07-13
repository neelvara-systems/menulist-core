# Health Signals (Pillars 4-6) — Validation Report

**Date:** July 13, 2026
**Feature Flags:** `ENABLE_TRUST_HEALTH_SIGNAL`, `ENABLE_LOYALTY_HEALTH_SIGNAL`, `ENABLE_RISK_DECLINE_DETECTION`  
**Status:** Dormant; all flags are `false`, with no scheduler/export/UI consumer
**Type Check:** Exact-current validation is recorded in the data-flow audit; the February table below is historical and not release evidence.

---

## Current Validation Decision

| Boundary | Current evidence |
|---|---|
| Feature flags | Present and `false` in `src/config/features.ts` |
| Functions activation | `processHealthSignalsForAllStores()` is retained but not exported or called by a scheduler |
| Desktop | `HealthSignalCards.tsx` exists but has no consumer |
| Mobile | No mobile screen consumes `healthSignals` |
| Persisted truth | Dormant computation now requires exact project-scoped daily identity and exact unique/direct counters; it may not invent percentages |
| Retry/freshness | Same-week risk retries are idempotent and aged prior signals are not reused |
| Cost | Zero current runtime operations; activation cost must be measured from bounded project-scoped reads |

Activation is not approved by this document. It requires an explicit Functions feature flag, consolidated scheduler task with lease/cadence, emulator-backed persistence test, index/cost proof, mounted desktop and MobileShell surfaces, freshness behavior, Firebase QA deployment, and real-traffic threshold evidence.

## Historical February 2026 Claims (Superseded)

## Engineering Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| FR-01 | Trust signal: Strong / Stable / Weak | ✅ | `healthSignalsComputation.ts:136-169` |
| FR-02 | Loyalty signal: Strong / Stable / Weak | ✅ | `healthSignalsComputation.ts:175-209` |
| FR-03 | Risk signal: Stable / Watch / At Risk | ✅ | `healthSignalsComputation.ts:215-248` |
| FR-04 | Weekly computation (Sundays only) | ✅ | `masterScheduler.ts:240` — dayOfWeek check |
| FR-05 | Visibility threshold (50+ visitors/week for 4+ weeks) | ✅ | Both trust + loyalty check `qualifyingWeeks.length < 4` |
| FR-06 | Risk requires both trust + loyalty visible | ✅ | `computeRiskState` checks `!trust.visible \|\| !loyalty.visible` |
| FR-07 | Desktop dashboard cards | ✅ | `HealthSignalCards.tsx` — composite component |
| FR-08 | Mobile dashboard display | ✅ | `MobileDashboardScreen.tsx` — grid layout |
| FR-09 | Feature flags per signal | ✅ | Each card checks its own flag |
| FR-10 | No individual visitor tracking | ✅ | All computations use aggregate daily docs |

---

## Files Created/Modified

| File | Action | LOC |
|------|--------|-----|
| `src/types/platform/store.ts` | MODIFIED | +30 (healthSignals type) |
| `functions/src/analytics/healthSignalsComputation.ts` | NEW | ~290 |
| `functions/src/schedulers/masterScheduler.ts` | MODIFIED | +40 (Task 5 + wrapper) |
| `src/components/.../OwnerDashboard/HealthSignalCards.tsx` | NEW | ~170 |
| `src/components/.../OwnerDashboard/index.tsx` | MODIFIED | +5 |
| `src/components/mobile/screens/MobileDashboardScreen.tsx` | MODIFIED | +60 |

---

## Security / Privacy Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No individual visitor data | ✅ | Reads from aggregate daily analytics only |
| Aggregate computations only | ✅ | Weekly buckets, no per-visitor tracking |
| Health state NOT on public pages | ✅ | Only visible in owner dashboard |
| Tenant-isolated computation | ✅ | Per-store processing in Cloud Function |
| Feature flag gated | ✅ | 3 separate flags, all default OFF |
| No new Firestore collections | ✅ | Field on existing store doc |

---

## Firebase Cost

| Operation | Cost Impact |
|-----------|------------|
| Read daily analytics (weekly) | ~56 reads/store/week (8 weeks × 7 days) |
| Write healthSignals (weekly) | 1 write/store/week |
| New collections | None |
| Estimated monthly (100 stores) | ~₹5/month |

---

## Documentation Completeness

| Doc | Pillar | Status |
|-----|--------|--------|
| trust-health-signal README | P4 | ✅ Updated |
| trust-health-signal_impl.md | P4 | ✅ Updated to IMPLEMENTED |
| loyalty-health-signal README | P5 | ✅ Updated |
| loyalty-health-signal_impl.md | P5 | ✅ Updated to IMPLEMENTED |
| risk-decline-detection README | P6 | ✅ Updated |
| risk-decline-detection_impl.md | P6 | ✅ Updated to IMPLEMENTED |
| changelog.md | All | ✅ Updated |
| roadmap | All | ✅ Updated (3 rows) |

---

**Historical validation result:** The February checklist claimed complete wiring that is not present in the current repository. It is retained only as implementation history.
**Last Updated:** July 13, 2026
