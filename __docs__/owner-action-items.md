# Owner Action Items — Manual Tasks Tracker

**Purpose:** Centralized tracker for ALL manual tasks the founder must do across every feature. Updated automatically by Cascade after every implementation session, production audit, or feature review.

**Rule:** This is the SINGLE SOURCE OF TRUTH for "what Danny needs to do manually." Cascade appends here after every session. Danny checks off items when done.

---

## How This File Works

1. **Cascade adds items** after every production audit, implementation session, or feature review
2. **Each item has:** Feature name, what to do, why, priority, status
3. **Danny marks items done** by changing `⬜` to `✅`
4. **Cascade never removes items** — completed items stay as history (move to Completed section)

---

## Active Items

### AI Extraction Monitoring Dashboard

| #   | Task                                                                             | Why                                                                                                                                         | Priority                                | Status |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------ |
| 1   | Enable `ENABLE_EXTRACTION_MONITORING_DASHBOARD` flag in `src/config/features.ts` | Turns on the extraction pipeline health dashboard at `/ops/extraction`. Read-only, ~$0.04/month cost.                                       | P1 (after first real extractions)       | ⬜     |
| 2   | Verify Firestore indexes for extraction monitoring queries                       | May already exist — run `firebase deploy --only firestore:indexes` to ensure composite indexes are deployed.                                | P1 (before enabling flag)               | ⬜     |
| 3   | P2: Wire Telegram alerts for extraction failure spikes                           | Auto-alerts when failure rate > 5% or quality drops. Infrastructure exists (`sendTelegramAlert()`), just needs wiring in nightly scheduler. | P2 (when extraction volume grows)       | ⬜     |
| 4   | P3: Add HCR (Human Correction Rate) metric from extraction learning loop data    | Data already collected via `menuChangeLog` + `platformSummary/extractionLearning`. Just needs dashboard display.                            | P3 (when enough correction data exists) | ⬜     |

> **Built by Cascade (Mar 13, 2026):** JobInspector.tsx (3-tab drawer), CostMonitor.tsx (daily spend panel), retryExtractionJob() (DAL + UI button with max 3 retries + validation)

### AI System Layer

| #   | Task                                                                         | Why                                                                                                                                                  | Priority                               | Status |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------ |
| 1   | Add 2nd-4th Gemini API keys to Vercel env vars + Firebase Secrets            | Enables key rotation for higher AI throughput. Single key still works with retry/backoff, but multi-key gives immediate failover on 429 rate limits. | Optional (do when hitting rate limits) | ⬜     |
| 2   | Phase 2: Build `aiUsageLog` cost tracking collection                         | Gives per-feature, per-tenant AI cost visibility. Currently no cross-feature cost tracking exists.                                                   | P2 (when you need cost visibility)     | ⬜     |
| 3   | Phase 3: Build knowledge reuse layer (translation memory, description cache) | Reduces AI costs ~25-35% by caching repeated operations.                                                                                             | P3 (when 1000+ menus)                  | ⬜     |

**How to do #1:**

```bash
# 1. Create 2-3 extra keys at https://aistudio.google.com/apikey
# 2. Add to Firebase Secrets:
firebase functions:secrets:set GEMINI_AI_KEY_2
firebase functions:secrets:set GEMINI_AI_KEY_3
firebase functions:secrets:set GEMINI_AI_KEY_4

# 3. Add same keys to Vercel → Settings → Environment Variables
# 4. Redeploy CF + Vercel
```

### AI Data Extraction — Security Fixes

| #   | Task                                                                     | Why                                                                                                                              | Priority           | Status |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Deploy updated Firestore rules: `firebase deploy --only firestore:rules` | 3 security fixes: tenant validation on job creation (CRITICAL), AI operations rules, platform admin read override for monitoring | P0 (before launch) | ⬜     |
| 2   | Deploy updated Cloud Functions                                           | Server-side defense-in-depth: projectId ↔ tId/sId mismatch validation in extraction CF                                           | P0 (before launch) | ⬜     |

**How to do #1 + #2:**

```bash
# 1. Deploy Firestore rules (3 fixes: V1 tenant validation, V2 AI operations, V3 platform admin read)
firebase deploy --only firestore:rules

# 2. Deploy Cloud Functions (updated processMenuImagesJob.ts with Step 0 tenant validation)
cd functions && npm run deploy
```

> **Fixed by Cascade (Mar 13, 2026):** Security Surface Audit — 3 vulnerabilities fixed (1 CRITICAL). See `__docs__/projects/ai-data-extraction/security-surface-audit-mar13-2026.md`

### Production Readiness (Monitoring Stack)

| #   | Task                               | Why                                                                     | Priority           | Status |
| --- | ---------------------------------- | ----------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Create Telegram Bot + set secrets  | Required for ops alerts (payment failures, publish errors, cost spikes) | P0 (before launch) | ⬜     |
| 2   | Set GCP Budget Alerts              | Auto-activates SAFE_MODE when cost threshold exceeded                   | P0 (before launch) | ⬜     |
| 3   | Deploy Cloud Functions             | Deploys verifyMenuPublish, alertEscalation, gcpBudgetAlertWebhook       | P0 (before launch) | ⬜     |
| 4   | Deploy Firestore indexes           | Required for alert escalation queries                                   | P0 (before launch) | ⬜     |
| 5   | Enable monitoring feature flags    | ENABLE_COST_PROTECTION, ENABLE_OPS_ALERTS, ENABLE_MENU_HEALTH_MONITOR   | P0 (before launch) | ⬜     |
| 6   | Setup UptimeRobot                  | External uptime monitoring (free)                                       | P1 (before launch) | ⬜     |
| 7   | Setup SMTP for lifecycle messaging | Enables billing emails, renewal reminders, suspension warnings          | P1 (before launch) | ⬜     |

> **Full setup guide:** `__docs__/production-readiness/launch-prerequisites.md`

### Dev/Prod Environment Separation

| #   | Task                                                             | Why                                                                                          | Priority           | Status |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Create `menulist-dev` Firebase project                           | Data isolation — dev data must never mix with customer data                                  | P0 (before launch) | ⬜     |
| 2   | Configure `.env.local` with dev Firebase credentials             | Local dev points to dev project, Vercel prod points to prod project                          | P0 (before launch) | ⬜     |
| 3   | Set all Vercel env vars (production scope) for `ecomsai` project | Ensures production deployment uses correct Firebase project                                  | P0 (before launch) | ⬜     |
| 4   | Get Razorpay test mode keys for development                      | Prevents real charges during development testing                                             | P0 (before launch) | ⬜     |
| 5   | Deploy Firestore indexes to dev project                          | `firebase deploy --only firestore:indexes --project menulist-dev`                            | P0 (after step 1)  | ⬜     |
| 6   | Copy Firestore security rules to dev project                     | `firebase deploy --only firestore:rules --project menulist-dev`                              | P0 (after step 1)  | ⬜     |
| 7   | Seed test tenant/store in dev project                            | Need test data for development                                                               | P1 (after step 1)  | ⬜     |
| 8   | Enable production feature flags in order                         | SAFE_MODE first, then Sentry, then OPS_ALERTS, then HEALTH_MONITOR, then LIFECYCLE_MESSAGING | P0 (at launch)     | ⬜     |

> **Full guide:** `__docs__/production-readiness/dev-prod-environment-guide.md`

### Canonica (Multi-Product Setup)

| #   | Task                                               | Why                                         | Priority                        | Status |
| --- | -------------------------------------------------- | ------------------------------------------- | ------------------------------- | ------ |
| 1   | Create Canonica Firebase project in GCP            | Canonica runs on separate Firebase project  | P0 (before Canonica activation) | ⬜     |
| 2   | Fill CANONICA*FIREBASE*\* env vars (.env + Vercel) | Required for Canonica Firestore access      | P0 (before Canonica activation) | ⬜     |
| 3   | Move Cloud Functions to functions-canonica/        | Separate deployment for Canonica CFs        | P0 (before Canonica activation) | ⬜     |
| 4   | Deploy both function sets                          | MenuList + Canonica CFs deployed separately | P0 (before Canonica activation) | ⬜     |
| 5   | Enable Canonica feature flags one by one           | Phased activation per doctrine              | P0 (before Canonica activation) | ⬜     |

> **Full setup guide:** `__docs__/canonica/doctrine/10-implementation-action-items.md`

---

## Completed Items

_Move items here when done. Keep as history._

<!-- Example:
### Feature Name
| # | Task | Completed | Date |
|---|------|-----------|------|
| 1 | Did the thing | ✅ | 2026-03-15 |
-->

---

## Related Files

| File                                                           | Scope                                       |
| -------------------------------------------------------------- | ------------------------------------------- |
| `__docs__/production-readiness/launch-prerequisites.md`        | Detailed monitoring setup guide (Steps 1-9) |
| `__docs__/canonica/doctrine/10-implementation-action-items.md` | Detailed Canonica manual setup steps        |

---

_Last Updated: March 22, 2026_
_Updated By: Cascade (Dev/Prod Environment Separation + Production Readiness Audit)_
