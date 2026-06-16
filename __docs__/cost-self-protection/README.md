# Cost Self-Protection (SAFE_MODE)

**Status:** ✅ CORE BUILT — Pre-production verification required
**Feature Flag:** `ENABLE_COST_PROTECTION: true`
**Priority:** 🔴 P0 — Verify before production
**Created:** February 20, 2026
**Source:** ChatGPT launch infra review → Cascade critical review

---

## Quick Navigation

| Document                                                                           | Audience     | Purpose                              |
| ---------------------------------------------------------------------------------- | ------------ | ------------------------------------ |
| [cost-self-protection_spec.md](./cost-self-protection_spec.md)                     | CEO/PM       | What it does, why it matters         |
| [cost-self-protection_impl.md](./cost-self-protection_impl.md)                     | Developers   | Technical blueprint, SAFE_MODE logic |
| [cost-self-protection_firebase.md](./cost-self-protection_firebase.md)             | Cost Control | Firebase cost estimates              |
| [firebase-cost-optimization-audit-2026-05-16.md](./firebase-cost-optimization-audit-2026-05-16.md) | Cost Control | Platform Firebase usage audit and optimizations |
| [cost-self-protection_mobile-support.md](./cost-self-protection_mobile-support.md) | Mobile       | Admission test (BACKEND ONLY)        |

---

## One-Liner

Global circuit breaker that instantly disables expensive operations (AI generation, bulk actions, heavy writes) when the system detects anomalous behavior or the founder manually triggers protection.

## Architecture Overview (60-second summary)

```
Firestore: ops_config/system
  ├── SAFE_MODE: true/false
  ├── activatedAt: timestamp
  ├── reason: "manual" | "cost_spike" | "abuse_detected"
  └── alertsMutedUntil: timestamp (deploy mute)

When SAFE_MODE = true:
  → AI generation endpoints return 503
  → Bulk operations blocked
  → Publish still works (core product)
  → Public menu viewing still works (cached)
  → Feedback submission rate-limited harder
```

## Key Decision: What ChatGPT Got Wrong

ChatGPT proposed `ops_daily_cost` and `ops_baselines` collections for automated cost tracking. **Rejected** because:

- Firebase doesn't expose read/write counts via API from within the app
- Google Cloud provides free budget alerts at the project level — use those instead
- SAFE_MODE as a manual killswitch + budget alert trigger is simpler and more reliable

Cloud Billing export to BigQuery is still required before production, but it is an ops setup item, not an app data model. Use it to inspect actual GCP/Firebase spend by service and SKU. Do not mirror product analytics or customer events to BigQuery at launch.

## Pre-Production Requirement

SAFE_MODE is not a missing feature anymore. The core circuit breaker is present in code, but it must be tested on the production Firebase/Vercel setup before launch.

Before production, verify:

1. `ops_config/system` exists with `SAFE_MODE: false`.
2. Ops Control Room can enable and disable SAFE_MODE.
3. Expensive AI routes return `503` while SAFE_MODE is active.
4. Public menu and OBP pages still load while SAFE_MODE is active.
5. `gcpBudgetAlertWebhook` is deployed, secret-protected, and connected to the GCP Budget Alert Pub/Sub subscription.
6. Direct Cloud Function entry points are audited for SAFE_MODE coverage before any expensive callable/trigger is treated as production-ready.

## What Already Exists

| Protection                      | Status              | Location                       |
| ------------------------------- | ------------------- | ------------------------------ |
| Rate limiting (15+ configs)     | ✅ BUILT            | `src/lib/rateLimit/configs.ts` |
| Feature flags (instant disable) | ✅ BUILT            | `src/config/features.ts`       |
| App Check (bot protection)      | ✅ Ready (flag OFF) | `ENABLE_APP_CHECK`             |
| Platform Cost Posture | ✅ BUILT | `/platform/cost-posture`, `__docs__/platform-cost-posture/` |
| Cloud Billing export to BigQuery | ☐ PRE-PROD MANUAL | `__docs__/production-readiness/launch-prerequisites.md` Step 2B |
| Versioned Storage cache metadata | ✅ BUILT | Public immutable for versioned public assets; private immutable for internal/source uploads |
| **Global circuit breaker**      | ✅ CORE BUILT / ☐ PRE-PROD VERIFY | `src/lib/ops/safeMode.ts`, `/api/ops/safe-mode`, `functions/src/triggers/operations.ts` |

## Feature Flag

```typescript
ENABLE_COST_PROTECTION: true; // in src/config/features.ts
```

---

**Version History:**

| Version | Date              | Changes                                   |
| ------- | ----------------- | ----------------------------------------- |
| 1.5     | May 24, 2026      | Corrected SAFE_MODE status: core built, production verification still required |
| 1.4     | May 24, 2026      | Added repo-wide Storage cache metadata policy for safe versioned public/private uploads |
| 1.3     | May 24, 2026      | Clarified Cloud Billing export to BigQuery as pre-production cost visibility, separate from app analytics or Firestore cost cron jobs |
| 1.2     | May 16, 2026      | Added follow-up Firebase cost hardening for auth refreshes, public analytics, ticket summaries, sitemap outlets, and routing summary verification |
| 1.1     | May 16, 2026      | Added platform Firebase cost audit        |
| 1.0     | February 20, 2026 | Initial documentation from ChatGPT review |
