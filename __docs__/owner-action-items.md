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

### Public Starter Menu Entry Launch

| #   | Task                                                                 | Why                                                                                                              | Priority                    | Status |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | Fix or replace the configured Upstash Redis endpoint                  | Local public upload/claim rate-limit checks logged DNS `ENOTFOUND`; launch needs rate limits to fail closed enough to protect AI/Firebase cost. | P0 (before public traffic)  | ⬜     |
| 2   | Confirm Gemini quota/key capacity for public menu extraction          | The local verification key returned quota errors; public upload-before-auth depends on reliable extraction capacity or additional rotated keys. | P0 (before public traffic)  | ⬜     |
| 3   | Deploy Firestore rules, indexes, and updated Cloud Functions scheduler | `publicMenuDrafts` must stay server-only, and expired draft images/docs need the `public_menu_draft_cleanup` scheduler task live.              | P0 (before public traffic)  | ⬜     |
| 4   | Confirm Razorpay recurring/autopay capability for hosted checkout     | Signed webhook processing passed locally, but hosted recurring checkout still depends on merchant/account capability.                         | P0 (before paid launch)     | ⬜     |
| 5   | Run WhatsApp Cloud API sandbox media flow if WhatsApp onboarding is included | The public web flow is verified; WhatsApp media/webhook delivery still requires real Meta test app credentials and provider callback proof.    | P1 (before WhatsApp launch) | ⬜     |

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

### WhatsApp Cloud API / Messaging Onboarding Activation

| #   | Task                                                                                     | Why                                                                                                             | Priority                         | Status |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------ |
| 1   | Create a founder-controlled Meta login for development/staging with 2FA enabled          | Required to use Meta for Developers without tying the setup to a random personal or employee-controlled account | P0 (before WhatsApp testing)     | ⬜     |
| 2   | Create a non-production Meta Developer app and add the WhatsApp product                  | Keeps MenuList dev/staging Cloud API testing separate from future production Meta assets                        | P0 (before WhatsApp testing)     | ⬜     |
| 3   | Use Meta's test WhatsApp phone number and approved test recipient first                  | Allows end-to-end webhook, media, and message testing before a real business number is connected                | P0 (before WhatsApp testing)     | ⬜     |
| 4   | Generate test credentials for the non-production app only                                | Provides the real provider values needed by Firebase Functions without using production tokens                  | P0 (before enabling the feature) | ⬜     |
| 5   | Set non-production Firebase secrets for the intended Firebase target                     | The messaging function needs real secrets; dummy WhatsApp secrets are not allowed                               | P0 (before enabling the feature) | ⬜     |
| 6   | Register the Meta webhook URL for the non-production function                            | Required for inbound WhatsApp messages and media uploads to reach MenuList                                      | P0 (before live testing)         | ⬜     |
| 7   | Enable `ENABLE_MESSAGING_ONBOARDING=true` only after real non-production secrets exist   | Prevents a half-enabled webhook from accepting traffic without valid provider access                            | P0 (before live testing)         | ⬜     |
| 8   | Run the full test flow: text message, image/PDF upload, preview, approve, publish, reply | Proves the Cloud API path works before any owner-facing or customer-facing launch                               | P0 (before beta)                 | ⬜     |
| 9   | Decide and register the production business entity path                                  | Meta production readiness needs a real business identity before serious launch                                  | P0 (before production launch)    | ⬜     |
| 10  | Prepare India business verification documents                                            | Likely required/supporting documents include PAN, GST/Udyam/shop registration, address proof, or bank proof     | P0 (before production launch)    | ⬜     |
| 11  | Map the live MenuList domain and create domain email                                     | Production Meta verification and trust should use the real website/domain identity                              | P0 (before production launch)    | ⬜     |
| 12  | Publish production privacy policy and terms pages                                        | Required for production trust, opt-in clarity, and Meta review readiness                                        | P0 (before production launch)    | ⬜     |
| 13  | Get a dedicated unused production WhatsApp number                                        | A Cloud API number cannot remain active in the normal WhatsApp app; never use a founder personal number         | P0 (before production launch)    | ⬜     |
| 14  | Create separate production Meta Business Portfolio, app, WABA, and payment setup         | Keeps production billing, limits, templates, and ownership separate from dev/staging                            | P0 (before production launch)    | ⬜     |
| 15  | Create and approve utility templates for onboarding messages                             | Required for production-initiated WhatsApp messages outside the customer service window                         | P0 (before production launch)    | ⬜     |
| 16  | Store production WhatsApp secrets separately from dev/staging secrets                    | Prevents test tokens, test phone IDs, or staging webhooks from leaking into production                          | P0 (before production launch)    | ⬜     |
| 17  | Review current Meta WhatsApp pricing and convert the expected launch cost to INR         | Vendor pricing can change; launch cost planning must be based on current Meta pricing                           | P1 (before paid traffic)         | ⬜     |

**How to do the development/staging setup:**

```bash
# Set these only with real values from the non-production Meta app.
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID --project <non-production-firebase-project>
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN --project <non-production-firebase-project>
firebase functions:secrets:set WHATSAPP_APP_SECRET --project <non-production-firebase-project>
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN --project <non-production-firebase-project>

# Enable only after the real non-production secrets exist.
# Runtime env:
# ENABLE_MESSAGING_ONBOARDING=true
# MESSAGING_ONBOARDING_PROVIDERS=whatsapp
```

**Webhook URL format:**

```text
https://us-central1-{firebaseProject}.cloudfunctions.net/messagingOnboarding/whatsapp
```

**Separation rules:**

- Dev/staging uses a non-production Meta app, Meta test phone number, test recipient, and non-production Firebase secrets.
- Production uses a separate Meta Business Portfolio, app, WABA, dedicated phone number, billing setup, templates, and Firebase secrets.
- Official Meta WhatsApp Cloud API only. Do not use OpenWA, `whatsapp-web.js`, Baileys, QR-scanned WhatsApp Web sessions, or browser automation for MenuList onboarding.
- Do not create dummy WhatsApp secrets. Missing real secrets mean the feature stays disabled.
- Do not enable owner-facing launch until webhook, media download, preview, approve/publish, outbound confirmation, `/ops/messaging-onboarding`, indexes, rules, and TTL are verified.

> **Detailed runbook:** `__docs__/messaging-onboarding/messaging-onboarding_runbook.md`  
> **Enable/test checklist:** `__docs__/messaging-onboarding/messaging-onboarding_validation.md#to-enable--test`  
> **Meta docs:** [Cloud API Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started), [Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks), [Messaging Limits](https://developers.facebook.com/docs/whatsapp/messaging-limits), [Pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)

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
| `__docs__/messaging-onboarding/messaging-onboarding_runbook.md` | WhatsApp Cloud API provider stance, secrets, monitoring, and non-actions |
| `__docs__/messaging-onboarding/messaging-onboarding_validation.md` | Messaging onboarding enable/test checklist |

---

_Last Updated: May 17, 2026_
_Updated By: Codex (WhatsApp Cloud API / Messaging Onboarding Action Items)_
