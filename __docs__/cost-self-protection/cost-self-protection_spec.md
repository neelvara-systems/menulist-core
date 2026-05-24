# Cost Self-Protection (SAFE_MODE) — Product Specification

**Status:** ✅ CORE BUILT — Pre-production verification required
**Created:** February 20, 2026
**Audience:** CEO, PM, Non-developers

---

## Executive Summary

**What:** A global circuit breaker that instantly disables expensive operations when the system is under stress.  
**Why:** A single bug, abuse attempt, or infinite loop could spike Firebase costs in hours. SAFE_MODE bounds that risk.  
**For Whom:** The MenuList founder/ops team (automatic or manual activation).

---

## Problem Statement

If production launch happens without SAFE_MODE verified, a bug or compromised account could still trigger expensive AI or bulk operations before the team contains it.

The risk is not that the circuit breaker is missing from code. The risk is incomplete launch wiring:

1. `ops_config/system` may not exist or may have the wrong SAFE_MODE value.
2. The `/ops` toggle may not be verified against production Firebase.
3. GCP Budget Alerts may not be connected to the secret-protected webhook.
4. Direct expensive Cloud Function entry points may need a final SAFE_MODE coverage audit.

SAFE_MODE provides a single switch that immediately reduces system cost to near-zero while keeping core product (menu viewing) operational.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Contain cost spikes | Max uncontrolled cost duration | <6 hours (with GCP budget alert + manual trigger) |
| Zero customer impact | Public menu availability during SAFE_MODE | 100% (cached pages still served) |
| Instant activation | Time to activate SAFE_MODE | <10 seconds (manual toggle) |

---

## Scope

### In-Scope
- SAFE_MODE flag in Firestore `ops_config/system` document
- Manual activation via ops dashboard or direct Firestore edit
- Automatic check in AI generation, bulk operations, and heavy write paths
- Alert trigger when SAFE_MODE activates
- Manual deactivation only (never auto-deactivate)

### Out-of-Scope (NOT building — ChatGPT rejected)
- `ops_daily_cost` collection — Firebase doesn't expose read/write counts via API. Use GCP budget alerts instead
- `ops_baselines` collection — Over-engineering for <50 stores
- `ops_endpoint_usage` collection — Vercel Analytics handles this
- Automated spike detection cron — Use GCP budget alerts (free) as trigger
- WRITE_LOCK (nuclear option) — Too dangerous. SAFE_MODE is sufficient
- Auto-deactivation — Human must verify system is stable before deactivating

---

## What SAFE_MODE Disables

| Category | Behavior During SAFE_MODE |
|----------|--------------------------|
| AI image generation | Returns 503 "System maintenance" |
| AI text generation (descriptions, translations) | Returns 503 "System maintenance" |
| Batch operations | Blocked |
| Heavy analytics computation | Skipped |
| Feedback submission | Rate limit tightened (2/min instead of 10/10min) |
| **Menu public viewing** | ✅ UNAFFECTED (cached pages) |
| **Menu publishing** | ✅ UNAFFECTED (core product) |
| **OBP pages** | ✅ UNAFFECTED (cached pages) |
| **Dashboard login/navigation** | ✅ UNAFFECTED |

---

## Activation Scenarios

| Trigger | How | Who |
|---------|-----|-----|
| Manual (ops dashboard) | Click "Enable SAFE_MODE" button | Founder |
| Manual (Firestore Console) | Set `ops_config/system.SAFE_MODE = true` | Founder/developer |
| GCP budget alert → webhook | Budget alert Pub/Sub push calls `gcpBudgetAlertWebhook`, which activates SAFE_MODE and sends Telegram alert | Automatic + founder notified |

**Note:** ChatGPT proposed cron-based spike detection. **Rejected** because Firebase does not expose real-time read/write counts cleanly inside the app and a custom cron would add more Firestore writes. GCP Budget Alerts remain the external trigger; SAFE_MODE deactivation stays manual.

---

## Recovery Protocol

1. SAFE_MODE activated → heavy operations stop
2. Founder checks: What caused the spike? (Firebase Console, Sentry, logs)
3. Fix root cause (bug fix, block abusive user, etc.)
4. Verify system stable (check Firebase Console usage graphs)
5. Deactivate SAFE_MODE manually
6. Verify heavy operations resume correctly

---

## Non-Functional Requirements

- **Activation latency:** <2 seconds (Firestore read in each endpoint)
- **Zero customer impact:** Public pages unaffected during SAFE_MODE
- **Fail-open:** If `ops_config/system` doc is unreachable, operations continue normally (don't break the system to protect the system)
- **No recurring cost:** Only 1 Firestore read per request that checks SAFE_MODE (cached in Cloud Functions warm instances)

---

**Document Policy:** Single spec. Implementation details in `_impl.md`.
