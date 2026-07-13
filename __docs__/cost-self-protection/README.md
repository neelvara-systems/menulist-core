# Cost Self-Protection (SAFE_MODE)

**Status:** ✅ CORE BUILT — Pre-production verification required
**Feature Flag:** `ENABLE_COST_PROTECTION: true`
**Priority:** 🔴 P0 — Verify before production
**Created:** February 20, 2026
**Last Updated:** July 13, 2026
**Source:** ChatGPT launch infra review → Cascade critical review

**Launch boundary:** Not current launch certification or deploy approval. This README documents source-built SAFE_MODE protection; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, SAFE_MODE browser/provider/Functions smoke, and production-host smoke.

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

Expensive-work circuit breaker that stops explicitly guarded app operations and all Gemini provider calls through the shared MenuList Functions gateway when the founder or budget-alert path activates protection.

The platform toggle re-proves current persisted platform authority after a fail-closed limiter. State changes are transactional and idempotent: repeating the current state performs no config or alert write, while a committed toggle remains successful even if its secondary alert record cannot be created.

## Architecture Overview (60-second summary)

```
Firestore: ops_config/system
  ├── SAFE_MODE: true/false
  ├── activatedAt: timestamp
  ├── reason: "manual" | "cost_spike" | "abuse_detected"
  └── alertsMutedUntil: timestamp (deploy mute)

When SAFE_MODE = true:
  → Explicitly guarded app AI endpoints return 503
  → Shared MenuList Functions AI gateway rejects Gemini calls before key/provider access
  → AI-backed batch work is blocked; unrelated writes and maintenance are not globally stopped
  → Publish still works (core product)
  → Public menu viewing still works (cached)
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
3. Explicitly guarded app AI routes return `503` while SAFE_MODE is active.
4. Public menu and OBP pages still load while SAFE_MODE is active.
5. `gcpBudgetAlertWebhook` is deployed, secret-protected, and connected to the GCP Budget Alert Pub/Sub subscription.
6. A direct MenuList Cloud Function provider generation, embedding, image, or upload call fails with `AI_PROVIDER_SAFE_MODE_ACTIVE` before key selection or provider I/O; `files.delete` remains available for cleanup while SAFE_MODE is active, and workflow-specific entry-point checks still provide cleaner task/status responses where implemented.

## What Already Exists

| Protection                      | Status              | Location                       |
| ------------------------------- | ------------------- | ------------------------------ |
| Rate limiting (15+ configs)     | ✅ BUILT            | `src/lib/rateLimit/configs.ts` |
| Feature flags (instant disable) | ✅ BUILT            | `src/config/features.ts`       |
| App Check (bot protection)      | ✅ Ready (flag OFF) | `ENABLE_APP_CHECK`             |
| Platform Cost Posture | ✅ BUILT | `/platform/cost-posture`, `__docs__/platform-cost-posture/` |
| Cloud Billing export to BigQuery | ☐ PRE-PROD MANUAL | `__docs__/production-readiness/launch-prerequisites.md` Step 2B |
| Versioned Storage cache metadata | ✅ BUILT | Public immutable for versioned public assets; private immutable for internal/source uploads |
| **Expensive-work circuit breaker** | ✅ CORE BUILT / ☐ PRE-PROD VERIFY | `src/lib/ops/safeMode.ts`, `/api/ops/safe-mode`, `functions/src/monitoring/safeMode.ts`, `functions/src/ai/aiGateway.ts` |

## Feature Flag

```typescript
ENABLE_COST_PROTECTION: true; // in src/config/features.ts
```

---

**Version History:**

| Version | Date              | Changes                                   |
| ------- | ----------------- | ----------------------------------------- |
| 1.7     | July 13, 2026     | Added current persisted platform authorization, fail-closed toggle limiting, transactional idempotency, and explicit secondary-alert failure semantics |
| 1.6     | July 11, 2026     | Added shared MenuList Functions AI-gateway enforcement and clarified that SAFE_MODE is not a global write lock |
| 1.5     | May 24, 2026      | Corrected SAFE_MODE status: core built, production verification still required |
| 1.4     | May 24, 2026      | Added repo-wide Storage cache metadata policy for safe versioned public/private uploads |
| 1.3     | May 24, 2026      | Clarified Cloud Billing export to BigQuery as pre-production cost visibility, separate from app analytics or Firestore cost cron jobs |
| 1.2     | May 16, 2026      | Added follow-up Firebase cost hardening for auth refreshes, public analytics, ticket summaries, sitemap outlets, and routing summary verification |
| 1.1     | May 16, 2026      | Added platform Firebase cost audit        |
| 1.0     | February 20, 2026 | Initial documentation from ChatGPT review |
