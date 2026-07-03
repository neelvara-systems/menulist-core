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

### June 19 Product Activation And Release Scope

| #   | Task                                                                 | Why                                                                                                              | Priority                    | Status |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | Decide the release scope for the current dirty worktree               | Growth Kits and CampaignCue hardening are validated, but the workspace also contains AI Menu Manager read-only answer changes and an untracked `routes-manifest.json`. Decide whether these ship together, split into separate commits, or the unrelated items are handled separately. | P0 (before commit/deploy)   | ⬜     |
| 2   | Provision or grant access to the dedicated CampaignCue Firebase project | CampaignCue protected owner workspace testing and Firebase deploy remain blocked until the dedicated project/Admin credentials are available to this repo. | P0 (before CampaignCue owner testing) | ⬜     |
| 3   | Set CampaignCue environment variables and Admin credentials in local/Vercel/Firebase targets | The export/download runtime is code-ready, but real workspace bootstrap, saves, campaign creation, asset registration, and CueLayers Storage paths need real CampaignCue Firebase credentials. | P0 (before CampaignCue owner testing) | ⬜     |
| 4   | Deploy CampaignCue Firebase rules, indexes, and Storage rules after project access is ready | Existing CampaignCue Firebase deploy attempts are blocked by `campaigncue-qa` access/availability. Deploying the Firebase target is required before real owner writes. | P0 (after task 2)           | ⬜     |
| 5   | Confirm CampaignCue domain and auth launch behavior                   | `campaigncue.ai/app` needs a final sign-in/domain decision before public owner testing or a production Vercel deploy. | P0 (before public CampaignCue traffic) | ⬜     |
| 6   | Decide when to authorize the Vercel deploy for the verified app changes | Codex did not run Vercel deploy or production build by default. A deploy needs explicit owner approval after release scope is clear. | P0 (before public traffic)  | ⬜     |
| 7   | Keep direct provider activation separate from the current CampaignCue export/download release | Google Business Profile OAuth/API access, WhatsApp WABA/templates/opt-in/pricing, provider metrics, billing, and direct posting/sending remain future provider-layer work. | P1 (before provider launch) | ⬜     |
| 8   | Keep KitStamp as a separate product decision, not a MenuList/CampaignCue merge | KitStamp remains foundation/planning only. Before implementation, decide domain, Firebase targets, billing package, initial ICP, export schema, and public claims. | P2 (only if KitStamp is activated) | ⬜     |

### Public Starter Menu Entry Launch

| #   | Task                                                                 | Why                                                                                                              | Priority                    | Status |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | Fix or replace the configured Upstash Redis endpoint                  | Local public upload/claim rate-limit checks logged DNS `ENOTFOUND`; code now fails closed for public menu setup and claim when the provider is unavailable, but launch still needs a working Upstash endpoint before public traffic. | P0 (before public traffic)  | ⬜     |
| 2   | Confirm Gemini quota/key capacity for public menu extraction          | The local verification key returned quota errors; public upload-before-auth depends on reliable extraction capacity or additional rotated keys. | P0 (before public traffic)  | ⬜     |
| 3   | Deploy Firestore rules, indexes, and updated Cloud Functions scheduler | `publicMenuDrafts` must stay server-only, and expired draft images/docs need the `public_menu_draft_cleanup` scheduler task live.              | P0 (before public traffic)  | ⬜     |
| 4   | Confirm Razorpay recurring/autopay capability for hosted checkout     | Signed webhook processing passed locally, but hosted recurring checkout still depends on merchant/account capability.                         | P0 (before paid launch)     | ⬜     |
| 5   | Run WhatsApp Cloud API sandbox media flow if WhatsApp onboarding is included | The public web flow is verified; WhatsApp media/webhook delivery still requires real Meta test app credentials and provider callback proof.    | P1 (before WhatsApp launch) | ⬜     |

### AI Extraction Monitoring Dashboard

| #   | Task                                                                             | Why                                                                                                                                         | Priority                                | Status |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------ |
| 1   | Enable `ENABLE_EXTRACTION_MONITORING_DASHBOARD` flag in `src/config/features.ts` | Turns on the extraction pipeline health dashboard at `/ops/extraction`. Read-only, ~$0.04/month cost.                                       | P1 (after first real extractions)       | ⬜     |
| 2   | Verify Firestore indexes for extraction monitoring queries                       | May already exist — run `firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json` after `npm run verify:env-targets` passes; production requires QA evidence and explicit production approval. | P1 (before enabling flag)               | ⬜     |
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
# 2. Add to Firebase Secrets in QA first:
firebase functions:secrets:set GEMINI_AI_KEY_2 --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_3 --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_4 --project menulist-qa

# 3. Add the same QA keys to the Vercel Preview environment only
# 4. Run npm run verify:functions-deploy-preflight, then use External Certification Gate 1 for the scoped QA Functions deploy
# 5. Repeat for production values only after QA evidence and explicit production secret/deploy approval
```

### AI Data Extraction — Security Fixes

| #   | Task                                                                     | Why                                                                                                                              | Priority           | Status |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Deploy updated Firestore rules to QA: `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json` | 3 security fixes: tenant validation on job creation (CRITICAL), AI operations rules, platform admin read override for monitoring. Production requires QA evidence and explicit production approval. | P0 (before launch) | ⬜     |
| 2   | Deploy updated Cloud Functions                                           | Server-side defense-in-depth: projectId ↔ tId/sId mismatch validation in extraction CF                                           | P0 (before launch) | ⬜     |

**How to do #1 + #2:**

```bash
# 1. Deploy Firestore rules to QA after targeted validation
firebase deploy --only firestore:rules --project menulist-qa --config firebase.json

# 2. Deploy Cloud Functions through External Certification Gate 1
npm run verify:functions-deploy-preflight
# Then use the scoped menulist-qa Gate 1 command from __docs__/production-readiness/external-certification-runbook.md
```

> **Fixed by Cascade (Mar 13, 2026):** Security Surface Audit — 3 vulnerabilities fixed (1 CRITICAL). See `__docs__/projects/ai-data-extraction/security-surface-audit-mar13-2026.md`

### Production Readiness (Monitoring Stack)

| #   | Task                               | Why                                                                     | Priority           | Status |
| --- | ---------------------------------- | ----------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Create Telegram Bot + set secrets  | Required for ops alerts (payment failures, publish errors, cost spikes) | P0 (before launch) | ⬜     |
| 2   | Set GCP Budget Alerts              | Auto-activates SAFE_MODE when cost threshold exceeded                   | P0 (before launch) | ⬜     |
| 3   | Deploy Cloud Functions             | Deploys verifyMenuPublish, alertEscalation, gcpBudgetAlertWebhook, menu extraction worker updates, source-file path hardening updates, and the consolidated maintenance scheduler. Latest documented `menulist-qa` source-file path hardening subset, `processMenuImagesJob`, and scheduler deploy attempts on July 2, 2026 completed predeploy lint/build and then failed with Cloud Resource Manager HTTP 403 caller permission. | P0 (before launch) | ⬜     |
| 4   | Deploy Firestore indexes           | Required for alert escalation queries                                   | P0 (before launch) | ⬜     |
| 5   | Confirm monitoring feature flag evidence | Check current `src/config/features.ts` source state, QA secrets/deploy evidence, provider smoke evidence where applicable, and External Certification Runbook records for `ENABLE_COST_PROTECTION`, `ENABLE_OPS_ALERTS`, and `ENABLE_MENU_HEALTH_MONITOR`. | P0 (before launch) | ⬜     |
| 6   | Setup UptimeRobot                  | External uptime monitoring (free)                                       | P1 (before launch) | ⬜     |
| 7   | Setup SMTP for lifecycle messaging | Enables billing emails, renewal reminders, suspension warnings          | P1 (before launch) | ⬜     |
| 8   | Run the external certification runbook | Full MenuList production certification still needs Firebase deploy, mobile/browser QA, Razorpay sandbox, WhatsApp provider, POS provider, batch worker, and production-host evidence recorded in the audit. | P0 (before production certification) | ⬜     |
| 9   | Deploy MenuList Storage rules cutover to QA | Legacy project Storage paths are now read-only in code. Gate 2A requires `npm run verify:storage-paths`, then `firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive` before production approval. Latest local retry on July 2, 2026 was blocked by Service Usage HTTP 403: `menulist-qa` not found or permission denied before rules upload. | P0 (before production certification) | ⬜     |

> **Full setup guide:** `__docs__/production-readiness/launch-prerequisites.md`
> **External certification guide:** `__docs__/production-readiness/external-certification-runbook.md`

### Environment Target Separation

| #   | Task                                                             | Why                                                                                          | Priority           | Status |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ | ------ |
| 1   | Confirm local and preview MenuList env vars point to `menulist-qa` | Current contract keeps local/preview on the QA Firebase target; do not create or use `menulist-dev` for this path | P0 (before launch) | ⬜     |
| 2   | Confirm Vercel Production MenuList env vars point to `menulist` | Production traffic must use the production Firebase target, not QA or a stale sample project | P0 (before launch) | ⬜     |
| 3   | Confirm Answerlattice env vars stay separated                    | Local/preview use `answerlattice-qa`; production uses `answerlattice`                         | P0 (before launch) | ⬜     |
| 4   | Get Razorpay test mode keys for non-production smoke             | Prevents real charges during staging/testing                                                 | P0 (before launch) | ⬜     |
| 5   | Deploy Firestore indexes to the current QA target after access is ready | Use `firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json` only after `npm run verify:env-targets` passes | P0 (before QA smoke) | ⬜     |
| 6   | Deploy Firestore rules to the current QA target after access is ready | Use `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json` only after targeted validation passes | P0 (before QA smoke) | ⬜     |
| 7   | Seed or confirm a test tenant/store in `menulist-qa`             | Required for non-production owner/mobile and publish smoke without touching production data   | P1 (after target access) | ⬜     |
| 8   | Confirm production feature flag evidence before launch           | No blanket activation order; review SAFE_MODE, Sentry, Ops Alerts, Health Monitor, and Lifecycle Messaging against target secrets, QA evidence, provider smoke, deploy evidence, and explicit production approval. | P0 (at launch)     | ⬜     |

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
| 7   | Keep `ENABLE_MESSAGING_ONBOARDING=false` until real Firebase secrets and Meta webhook registration are in place, then enable only the smoke target | Prevents repo-side env defaults from accepting provider webhooks before real non-production setup exists | P0 (before live testing)         | ⬜     |
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

**Current website CTA note (June 22, 2026):** `/whatsapp` uses the supplied test number `+1 555 657 1424` for click-to-WhatsApp testing. This does not complete Meta app setup, Firebase secrets, webhook registration, approved test-recipient setup, or the dedicated production WhatsApp number.

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

### Answerlattice (Multi-Product Setup)

| #   | Task                                               | Why                                         | Priority                        | Status |
| --- | -------------------------------------------------- | ------------------------------------------- | ------------------------------- | ------ |
| 1   | Create Answerlattice Firebase project in GCP            | Answerlattice runs on separate Firebase project  | P0 (before Answerlattice activation) | ⬜     |
| 2   | Fill ANSWERLATTICE*FIREBASE*\* env vars (.env + Vercel) | Required for Answerlattice Firestore access      | P0 (before Answerlattice activation) | ⬜     |
| 3   | Move Cloud Functions to functions-answerlattice/        | Separate deployment for Answerlattice CFs        | P0 (before Answerlattice activation) | ⬜     |
| 4   | Deploy both function sets                          | MenuList + Answerlattice CFs deployed separately | P0 (before Answerlattice activation) | ⬜     |
| 5   | Enable Answerlattice feature flags one by one           | Phased activation per doctrine              | P0 (before Answerlattice activation) | ⬜     |

> **Full setup guide:** `__docs__/answerlattice/doctrine/10-implementation-action-items.md`

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
| `__docs__/answerlattice/doctrine/10-implementation-action-items.md` | Detailed Answerlattice manual setup steps        |
| `__docs__/messaging-onboarding/messaging-onboarding_runbook.md` | WhatsApp Cloud API provider stance, secrets, monitoring, and non-actions |
| `__docs__/messaging-onboarding/messaging-onboarding_validation.md` | Messaging onboarding enable/test checklist |
| `__docs__/campaigncue/campaigncue-production-implementation-audit.md` | CampaignCue current export/download runtime status and external blockers |
| `__docs__/growthos-addon/growthos-addon_validation.md` | Growth Kits verification and production-readiness hardening notes |
| `__docs__/kitstamp/kitstamp_impl.md` | KitStamp separate-product implementation plan and activation gates |

---

_Last Updated: June 19, 2026_
_Updated By: Codex (Product activation and release-scope action items)_
