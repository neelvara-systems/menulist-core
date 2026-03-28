# Cost Self-Protection (SAFE_MODE)

**Status:** ✅ IMPLEMENTED — Feature flag OFF by default  
**Feature Flag:** `ENABLE_COST_PROTECTION: false`  
**Priority:** 🟠 P1 — Build before scale  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review

---

## Quick Navigation

| Document                                                                           | Audience     | Purpose                              |
| ---------------------------------------------------------------------------------- | ------------ | ------------------------------------ |
| [cost-self-protection_spec.md](./cost-self-protection_spec.md)                     | CEO/PM       | What it does, why it matters         |
| [cost-self-protection_impl.md](./cost-self-protection_impl.md)                     | Developers   | Technical blueprint, SAFE_MODE logic |
| [cost-self-protection_firebase.md](./cost-self-protection_firebase.md)             | Cost Control | Firebase cost estimates              |
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

## What Already Exists

| Protection                      | Status              | Location                       |
| ------------------------------- | ------------------- | ------------------------------ |
| Rate limiting (15+ configs)     | ✅ BUILT            | `src/lib/rateLimit/configs.ts` |
| Feature flags (instant disable) | ✅ BUILT            | `src/config/features.ts`       |
| App Check (bot protection)      | ✅ Ready (flag OFF) | `ENABLE_APP_CHECK`             |
| **Global circuit breaker**      | ❌ MISSING          | —                              |

## Feature Flag

```typescript
ENABLE_COST_PROTECTION: false; // in src/config/features.ts
```

---

**Version History:**

| Version | Date              | Changes                                   |
| ------- | ----------------- | ----------------------------------------- |
| 1.0     | February 20, 2026 | Initial documentation from ChatGPT review |
