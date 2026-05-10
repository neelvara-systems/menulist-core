# Dev vs Prod Environment Guide — MenuList Production Readiness

**Created:** March 22, 2026  
**Source:** ChatGPT strategic session → Cascade full codebase audit + validation  
**Status:** ACTIONABLE — Implementation guide for environment separation  
**ChatGPT Accuracy:** ~55% (strategic framing strong, ~45% already exists or wrong assumptions)

---

## ChatGPT Conversation Validation

### Validation Summary Table

| #   | ChatGPT Claim                                    | Verdict            | Codebase Evidence                                                                                                              |
| --- | ------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Separate Firebase projects for dev/prod          | **AGREE**          | Currently using single project `ecomsai`. Need `menulist-dev` + `menulist-prod`                                                |
| 2   | Separate storage buckets                         | **AGREE**          | `firebaseStorageUrl` hardcoded to `ecomsai.appspot.com` — needs per-env config                                                 |
| 3   | Separate API keys (Gemini, etc.)                 | **AGREE**          | Single `GEMINI_AI_KEY` used everywhere. Multi-key rotation exists but all keys are for same project                            |
| 4   | Separate domains                                 | **ALREADY EXISTS** | Vercel handles this: `main` → prod domain, `dev` → preview URLs                                                                |
| 5   | No shared anything between dev/prod              | **PARTIAL**        | Feature flags are code-level (not env-level), so they're shared. Need env-aware flag overrides                                 |
| 6   | `.env.local` for dev, `.env.production` for prod | **WRONG**          | Next.js uses `.env.local` (all envs) + Vercel env vars per environment. No `.env.production` file needed                       |
| 7   | Use `NEXT_PUBLIC_ENV=dev\|prod` variable         | **UNNECESSARY**    | `process.env.NODE_ENV` already handles this. Vercel sets `VERCEL_ENV` for preview vs production                                |
| 8   | MCE validation on publish                        | **ALREADY EXISTS** | `src/lib/mce/` — 17-rule engine, publish-gate in Editor.tsx. Flag: `ENABLE_MCE: true`                                          |
| 9   | MOL logging                                      | **ALREADY EXISTS** | `src/database/menuChangeLog/` — append-only event ledger. Flag: `ENABLE_MENU_OBSERVATION: true`                                |
| 10  | Feature flags for instant disable                | **ALREADY EXISTS** | 80+ flags in `src/config/features.ts` covering every feature                                                                   |
| 11  | Cost discipline / rate limiting                  | **ALREADY EXISTS** | Upstash rate limiting, SAFE_MODE circuit breaker, AI enhancement pack credits                                                  |
| 12  | Write governance layer / mutation pipeline       | **ALREADY EXISTS** | All writes go through DAL (`src/database/`) with `apiCallComposer` + `requestBodyComposer`. No direct Firestore writes from UI |
| 13  | Global kill switch                               | **ALREADY EXISTS** | SAFE_MODE in `src/lib/ops/safeMode.ts` — reads `ops_config/system` doc, blocks AI routes on activation                         |
| 14  | Create `/core/mutations/` folder                 | **DISAGREE**       | Existing DAL pattern (`src/database/`) already serves this purpose. Adding another layer is over-engineering                   |
| 15  | Idempotency control with `requestId`             | **PARTIAL**        | Lifecycle messaging has idempotency. Not all operations need it — publish uses `menuVersion` increment                         |
| 16  | Runtime environment guards                       | **PARTIAL**        | `removeConsole` in prod build, dev-only components exist, but no hard startup assertion                                        |
| 17  | Sanitization layer                               | **ALREADY EXISTS** | `sanitizeForClient()` in `src/lib/mce/utils.ts` strips `_mce`. `sanitizeForFirestore()` prevents undefined writes              |
| 18  | Deployment safety checks                         | **PARTIAL**        | `tsc --noEmit` enforced, Vercel build checks, but no pre-deploy invariant checker                                              |
| 19  | Tenant isolation                                 | **ALREADY EXISTS** | `withAuth()` + `verifyTenantAccess()` on all protected routes. tId/sId on all queries                                          |
| 20  | Over-engineering staging env                     | **AGREE**          | 2 environments only (dev + prod). No staging needed at this scale                                                              |
| 21  | Cost visibility per store/feature                | **PARTIAL**        | Firebase cost docs per feature exist (`_firebase.md`), but no runtime cost tracking dashboard                                  |
| 22  | Failure playbook                                 | **MISSING**        | No documented runbook for production incidents. Need to create                                                                 |
| 23  | Trust verification loop                          | **PARTIAL**        | Nightly scheduler runs integrity checks, but no daily menu sampling system                                                     |
| 24  | Separate Firestore security rules per env        | **WRONG**          | Same rules deploy to both. Dev rules should NOT be relaxed — same strictness prevents bugs                                     |

### ChatGPT Accuracy Breakdown

- **Strategic framing:** ~80% (good principles, right mindset)
- **Codebase awareness:** ~15% (unaware of 80%+ of existing infrastructure)
- **Implementation advice:** ~30% (many suggestions duplicate existing patterns)
- **Architecture proposals:** ~40% (some over-engineering, some valid gaps)

### What ChatGPT Got Right (Implement These)

1. Separate Firebase projects for dev/prod
2. Runtime environment guards at app startup
3. Failure/incident response playbook
4. Pre-deploy checklist automation

### What ChatGPT Got Wrong (Ignore These)

1. `/core/mutations/` folder — DAL already handles this
2. `.env.production` file — Vercel env vars are the correct pattern
3. `NEXT_PUBLIC_ENV` variable — `NODE_ENV` + `VERCEL_ENV` already exist
4. Relaxed dev security rules — same strictness everywhere prevents bugs shipping to prod
5. `executeWithCostGuard()` wrapper — existing credit system + SAFE_MODE already covers this
6. `assertIdentity()` central validator — `withAuth()` + `verifyTenantAccess()` already do this

---

## Current Architecture State

### What Already Exists (Strong Foundation)

| Layer                | Implementation                                       | Status                 |
| -------------------- | ---------------------------------------------------- | ---------------------- |
| **Write Governance** | DAL pattern (`src/database/`) with `apiCallComposer` | ✅ COMPLETE            |
| **Input Validation** | Zod schemas on all API routes                        | ✅ COMPLETE            |
| **Auth & Isolation** | `withAuth()` + tId/sId enforcement                   | ✅ COMPLETE            |
| **Rate Limiting**    | Upstash Redis (`src/lib/rateLimit.ts`)               | ✅ COMPLETE            |
| **Kill Switch**      | SAFE_MODE (`src/lib/ops/safeMode.ts`)                | ✅ COMPLETE (flag OFF) |
| **Feature Flags**    | 80+ flags in `src/config/features.ts`                | ✅ COMPLETE            |
| **Menu Validation**  | MCE 17-rule engine                                   | ✅ COMPLETE            |
| **Event Logging**    | MOL append-only ledger                               | ✅ COMPLETE            |
| **Menu Snapshots**   | Immutable on publish                                 | ✅ COMPLETE            |
| **Error Tracking**   | Sentry dual-project (dev/prod DSNs)                  | ✅ COMPLETE (flag OFF) |
| **Ops Alerting**     | Telegram + systemAlerts collection                   | ✅ COMPLETE (flag OFF) |
| **Console Removal**  | `removeConsole` in production build                  | ✅ COMPLETE            |
| **Security Headers** | X-Frame-Options, nosniff, referrer-policy            | ✅ COMPLETE            |
| **PWA**              | Disabled in dev, enabled in prod builds              | ✅ COMPLETE            |

### What's Missing (Action Required)

| Gap                                            | Priority  | Effort    |
| ---------------------------------------------- | --------- | --------- |
| **Separate Firebase projects** (dev vs prod)   | 🔴 HIGH   | 2-3 hours |
| **Environment variable validation at startup** | 🔴 HIGH   | 30 min    |
| **Feature flags that differ between dev/prod** | 🟡 MEDIUM | 1 hour    |
| **Incident response playbook**                 | 🟡 MEDIUM | 1 hour    |
| **Pre-deploy checklist script**                | 🟢 LOW    | 30 min    |

---

## Third-Party Service Audit

### Complete Service Inventory

| #   | Service                 | Package                                      | Purpose                                 | Env Vars (Next.js)                                                                                 | Env Vars (CF)                            | Dev Setup                      | Prod Setup                  |
| --- | ----------------------- | -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------ | --------------------------- |
| 1   | **Firebase (MenuList)** | `firebase` v11.7.3, `firebase-admin` v12.2.0 | Core database, auth, storage            | `NEXT_PUBLIC_FIREBASE_*` (7 vars), `FIREBASE_*` (4 vars)                                           | Auto from project                        | Same project currently         | **NEEDS: Separate project** |
| 2   | **Firebase (Canonica)** | Same packages                                | Canonica product database               | `NEXT_PUBLIC_CANONICA_FIREBASE_*` (6 vars), `NEXT_PUBLIC_CANONICA_FIREBASE_MODE`, optional `NEXT_PUBLIC_CANONICA_FIRESTORE_DATABASE_ID` | `CANONICA_FIREBASE_*`, optional `CANONICA_FIRESTORE_DATABASE_ID` | `shared` mode may reuse MenuList DB | `separate` mode with dedicated project/DB |
| 3   | **Razorpay**            | `razorpay` v2.9.6                            | Payments & subscriptions                | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | **NEEDS: Test mode keys**      | Live mode keys              |
| 4   | **Google Gemini AI**    | `@google/genai` v0.12.0                      | OCR, descriptions, translations, images | `GEMINI_AI_KEY`                                                                                    | `GEMINI_AI_KEY` + `_2`, `_3`, `_4`       | Same key (OK for dev)          | Same key + rotation keys    |
| 5   | **Upstash Redis**       | `@upstash/redis` v1.35.6                     | Rate limiting, Canonica cache           | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                               | Same                                     | **Can skip** (flag OFF in dev) | Required                    |
| 6   | **Sentry**              | `@sentry/nextjs` v10.22.0                    | Error tracking                          | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`                                                             | `SENTRY_DSN`                             | Dev Sentry project             | Prod Sentry project         |
| 7   | **NextAuth**            | `next-auth` v4.24.3                          | Authentication (Google OAuth)           | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                      | N/A                                      | Same OAuth app (OK)            | Same OAuth app              |
| 8   | **Google Analytics**    | `@google-analytics/data` v5.1.0              | Server-side analytics reads             | `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY`, `GA_PROJECT_ID`                                               | N/A                                      | Same (OK for dev)              | Same                        |
| 9   | **SMTP (Nodemailer)**   | `nodemailer` v7.0.7                          | Lifecycle emails, notifications         | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`                                                 | Same secrets                             | Optional (skip in dev)         | Gmail SMTP or custom        |
| 10  | **Telegram Bot**        | Raw HTTP fetch                               | Ops alerts                              | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                                                           | Same secrets                             | Optional (skip in dev)         | Required                    |
| 11  | **Google Cloud Tasks**  | `@google-cloud/tasks` v6.1.0                 | Batch image generation queue            | `BATCH_IMAGE_GENERATION_WORKER_URL`, `BATCH_IMAGE_GENERATION_QUEUE_ID`                             | N/A                                      | Skip in dev                    | Required                    |
| 12  | **Vercel**              | Hosting platform                             | Deployment                              | `VERCEL`, `VERCEL_ENV` (auto-set)                                                                  | N/A                                      | Auto (`dev` branch)            | Auto (`main` branch)        |
| 13  | **WhatsApp Cloud API**  | Raw HTTP in CF                               | Messaging onboarding                    | N/A                                                                                                | `WHATSAPP_*` (4 secrets)                 | Not needed (flag OFF)          | When enabled                |

### Services That NEED Separate Dev/Prod Configuration

| Service                 | Why Separate                                                       | How                                    |
| ----------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **Firebase (MenuList)** | Data isolation — dev data must never mix with customer data        | Create `menulist-dev` Firebase project |
| **Razorpay**            | Test mode vs live payments — using live keys in dev = real charges | Use Razorpay test mode keys in dev     |
| **Sentry**              | Keep dev errors out of prod dashboard                              | Already configured: 2 DSNs in code     |
| **Upstash**             | Prevent dev rate limit data from affecting prod                    | Can share OR create separate DB        |

### Services That CAN Share Dev/Prod

| Service                     | Why Sharing is OK                                                         |
| --------------------------- | ------------------------------------------------------------------------- |
| **Gemini AI**               | Same API, same pricing. Dev usage is minimal. Key rotation handles load   |
| **NextAuth (Google OAuth)** | Same OAuth app works for all domains. Redirect URIs configured per domain |
| **Google Analytics**        | Read-only access to same GA property                                      |
| **SMTP**                    | Same Gmail account. Dev sends minimal emails                              |
| **Telegram**                | Same bot for both envs (ops alerts are low volume)                        |
| **Google Cloud Tasks**      | Not active in dev anyway                                                  |

---

## Feature Flags: Dev vs Prod Recommended State

### Flags That Should Differ Between Environments

| Flag                         | Dev     | Prod   | Reason                            |
| ---------------------------- | ------- | ------ | --------------------------------- |
| `ENABLE_RATE_LIMITING`       | `false` | `true` | Unlimited testing in dev          |
| `ENABLE_APP_CHECK`           | `false` | `true` | Skip reCAPTCHA setup in dev       |
| `ENABLE_SENTRY`              | `false` | `true` | Avoid polluting error dashboard   |
| `ENABLE_COST_PROTECTION`     | `false` | `true` | SAFE_MODE active in prod only     |
| `ENABLE_OPS_ALERTS`          | `false` | `true` | No Telegram noise in dev          |
| `ENABLE_MENU_HEALTH_MONITOR` | `false` | `true` | Post-publish verification in prod |
| `ENABLE_LIFECYCLE_MESSAGING` | `false` | `true` | No emails from dev                |

### Flags That Should Be Same in Both

All other flags should be **identical** between dev and prod. This ensures dev accurately represents prod behavior.

### Current Problem

Feature flags are **hardcoded in source code** — same value in both envs. No env-level override mechanism.

### Recommended Solution

Add env-level override support at the top of `features.ts`:

```typescript
// Allow environment-level overrides for flags that differ between dev/prod
const envOverrides: Partial<Record<string, boolean>> = {
  ENABLE_RATE_LIMITING: process.env.NEXT_PUBLIC_ENABLE_RATE_LIMITING === "true",
  ENABLE_SENTRY: process.env.NEXT_PUBLIC_ENABLE_SENTRY === "true",
  // etc.
};
```

**However:** This adds complexity. The simpler approach: keep flags in code and manually change them before production enable. The current pattern has worked for 80+ flags already.

**Recommendation:** Do NOT add env-based flag overrides. Keep the current pattern. Change flags in code when ready for production.

---

## Environment Variable Master List

### Required for ALL Environments

```bash
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FB_DATABASE_URL=

# Firebase Admin SDK (server-side)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Auth
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI
GEMINI_AI_KEY=

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

### Required for Production Only

```bash
# Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Analytics (server-side)
GA_CLIENT_EMAIL=
GA_PRIVATE_KEY=
GA_PROJECT_ID=

# Batch Processing
BATCH_IMAGE_GENERATION_WORKER_URL=
BATCH_IMAGE_GENERATION_QUEUE_ID=
```

### Optional (Feature-Flagged, Skip If Flag OFF)

```bash
# Email (ENABLE_LIFECYCLE_MESSAGING)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Ops Alerts (ENABLE_OPS_ALERTS)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Error Tracking (ENABLE_SENTRY)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Canonica Product (if using)
NEXT_PUBLIC_CANONICA_FIREBASE_MODE=separate
NEXT_PUBLIC_CANONICA_FIREBASE_API_KEY=
NEXT_PUBLIC_CANONICA_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_CANONICA_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_CANONICA_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_CANONICA_FIREBASE_APP_ID=
NEXT_PUBLIC_CANONICA_FIRESTORE_DATABASE_ID=
CANONICA_FIREBASE_MODE=separate
CANONICA_FIREBASE_PROJECT_ID=
CANONICA_FIREBASE_PRIVATE_KEY=
CANONICA_FIREBASE_CLIENT_EMAIL=
CANONICA_FIRESTORE_DATABASE_ID=
```

### DEAD Variables (Zero References — Do NOT Add)

```bash
# All STRIPE_* vars (Stripe fully removed)
# TRANSLATION_MODEL, DESCRIPTION_MODEL, IMAGE_PROCESSING_MODEL
# GEMINI_EMBED_MODEL, GEMINI_CHAT_MODEL
# GA_ID_TEST
# NEXTAUTH_URL (auto-set by Vercel)
# NEXT_PUBLIC_BASE_URL
```

---

## Execution Plan: Dev/Prod Separation

### Phase 1: Firebase Project Separation (HIGHEST PRIORITY)

**Step 1: Create `menulist-dev` Firebase Project**

1. Go to Firebase Console → Add Project → `menulist-dev`
2. Enable Firestore, Storage, Auth (same configuration as `ecomsai`)
3. Copy security rules from `ecomsai`
4. Deploy indexes: `firebase deploy --only firestore:indexes --project menulist-dev`

**Step 2: Configure Local Development**

1. Create `.env.local` with `menulist-dev` Firebase credentials
2. Update `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` to dev project service account
3. All `NEXT_PUBLIC_FIREBASE_*` vars point to dev project

**Step 3: Configure Vercel Production**

1. In Vercel Dashboard → Settings → Environment Variables
2. Ensure all `FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_*` vars point to `ecomsai` (prod project)
3. Set environment scope to "Production" only

**Step 4: Seed Dev Data**

1. Create test tenant/store in dev project
2. Upload sample menu for testing
3. Create test subscription

### Phase 2: Razorpay Test/Live Split

**Step 1: Get Razorpay Test Keys**

1. Razorpay Dashboard → Settings → API Keys → Generate Test Key
2. Store test keys in `.env.local`:
   - `RAZORPAY_KEY_ID=rzp_test_...`
   - `RAZORPAY_KEY_SECRET=...`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...`

**Step 2: Webhook Configuration**

- Dev: Configure webhook URL to local tunnel (ngrok) or skip
- Prod: Keep current Vercel webhook URL

### Phase 3: Feature Flag Production Activation

When ready for production, change these flags to `true` in order:

1. `ENABLE_COST_PROTECTION` — SAFE_MODE kill switch (enable FIRST)
2. `ENABLE_SENTRY` — Error tracking
3. `ENABLE_RATE_LIMITING` — Already `true`, verify Upstash configured
4. `ENABLE_OPS_ALERTS` — Telegram alerts (after bot setup)
5. `ENABLE_MENU_HEALTH_MONITOR` — Post-publish verification
6. `ENABLE_LIFECYCLE_MESSAGING` — Email notifications (after SMTP setup)

### Phase 4: Runtime Guards (Code Changes)

See "Codebase Changes" section below.

---

## Production Go-Live Checklist

### Pre-Launch (Do Once)

- [ ] Firebase dev project created and configured
- [ ] Razorpay test keys in dev, live keys in prod (Vercel)
- [ ] All required env vars set in Vercel (see master list above)
- [ ] Sentry dev + prod projects configured
- [ ] Telegram bot created (per launch-prerequisites.md Step 1)
- [ ] GCP budget alerts set (per launch-prerequisites.md Step 2)
- [ ] Cloud Functions deployed
- [ ] Firestore indexes deployed
- [ ] UptimeRobot monitors configured

### Per-Deploy Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] No `console.log` in production code (compiler removes them)
- [ ] Feature flags verified (no accidental dev-only flags in main branch)
- [ ] No test data or test endpoints active
- [ ] Razorpay webhook signature validation tested

### Go-Live Decision

You go LIVE only when:

- ✅ MCE blocks bad data (`ENABLE_MCE: true` — already enabled)
- ✅ MOL logs mutations (`ENABLE_MENU_OBSERVATION: true` — already enabled)
- ✅ SAFE_MODE kill switch ready (`ENABLE_COST_PROTECTION` → enable)
- ✅ Error tracking active (`ENABLE_SENTRY` → enable)
- ✅ Rate limiting enforced (`ENABLE_RATE_LIMITING: true` — already enabled)
- ✅ Tenant isolation verified (`withAuth()` on all routes)
- ✅ Cost predictable (credit system + feature flag kill switches)

---

## Incident Response Playbook

### Scenario 1: AI Cost Spike

1. **Detect:** GCP budget alert OR Telegram alert
2. **Contain:** Enable SAFE_MODE via Ops Control Room (`/ops`)
3. **Diagnose:** Check `systemAlerts` collection for recent errors
4. **Fix:** Identify runaway process, fix root cause
5. **Recover:** Disable SAFE_MODE after confirming stability

### Scenario 2: Incorrect Menu Published

1. **Detect:** Manual report OR menu health monitor alert
2. **Contain:** Nothing to contain — menu is cached, updated version fixes it
3. **Fix:** Correct the menu data in editor, re-publish
4. **Verify:** Check all surfaces (QR, OBP, screens) show correct version
5. **Log:** MOL automatically captures the correction event

### Scenario 3: Payment Webhook Failure

1. **Detect:** Telegram alert from webhook route
2. **Diagnose:** Check `systemAlerts` for webhook error details
3. **Fix:** Usually transient — Razorpay retries automatically
4. **Escalate:** If persistent, check Razorpay dashboard for webhook logs
5. **Manual:** Use Razorpay dashboard to verify subscription state

### Scenario 4: Site Down (Vercel Outage)

1. **Detect:** UptimeRobot alert (email + optional Telegram)
2. **Action:** Check Vercel status page (vercel.com/status)
3. **Wait:** Vercel outages typically resolve in <30 minutes
4. **Verify:** UptimeRobot confirms recovery automatically
5. **Note:** Public menus are cached by CDN — may still work during outage

### Scenario 5: Firebase Quota Exceeded

1. **Detect:** App errors, GCP budget alert
2. **Contain:** Enable SAFE_MODE (stops AI writes, keeps reads working)
3. **Diagnose:** Check GCP Console → Firestore usage
4. **Fix:** Identify high-read pattern, optimize or wait for quota reset
5. **Prevent:** Review `_firebase.md` docs for cost-heavy operations

---

## Hardcoded Values That Need Environment Awareness

| File                                    | Hardcoded Value                  | Issue                            | Fix                                                   |
| --------------------------------------- | -------------------------------- | -------------------------------- | ----------------------------------------------------- |
| `src/lib/firebase/firebaseClient.ts:18` | `ecomsai.appspot.com`            | Storage URL hardcoded to prod    | Use `process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `next.config.js:59`                     | `firebasestorage.googleapis.com` | Image pattern — OK for both envs | No change needed                                      |
| `functions/src/config/secrets.ts:132`   | `region: 'us-central1'`          | Same region for all envs         | OK — keep same region                                 |

---

## Third-Party Account Creation Guide

This section details **all accounts you need to create** for production, organized by priority and service. Each entry includes: what to create, where to get it, what env vars it provides, and cost (if any).

### Tier 1: Required for Production (P0)

These are mandatory before launch. Without them, core features break.

#### 1. Firebase (MenuList) — Already Exists

- **What you have:** `ecomsai` project (production)
- **What to create:** `menulist-dev` project (development)
- **Where:** https://console.firebase.google.com → Add Project → `menulist-dev`
- **Steps:**
  1. Create project with name "MenuList Dev"
  2. Enable Firestore, Storage, Auth, Functions
  3. Copy security rules from `ecomsai`
  4. Deploy indexes: `firebase deploy --only firestore:indexes --project menulist-dev`
- **Env vars provided:** `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_*` (14 vars)
- **Cost:** Free tier covers dev usage

#### 2. Razorpay — Test Keys (Already Have), Live Keys Needed

- **What you have:** Test mode (`rzp_test_...`) — already in both .env files
- **What to create:** Live mode keys for production
- **Where:** https://dashboard.razorpay.com → Settings → API Keys → Live Mode
- **Steps:**
  1. Complete KYC verification in Razorpay
  2. Switch to Live Mode in dashboard
  3. Generate Live API Keys
  4. Update webhook URL to production domain
- **Env vars:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- **Cost:** 2% + GST per transaction (no monthly fee)

#### 3. Vercel — Already Have

- **What you have:** Project deployed, env vars in dashboard
- **What to do:** Configure Preview vs Production env vars
- **Where:** https://vercel.com/dashboard → Your Project → Settings → Environment Variables
- **Steps:**
  1. Go to Environment Variables
  2. Set "Production" scope for prod values (.env.prod)
  3. Set "Preview" scope for dev values (.env.local)
  4. Redeploy after adding vars
- **Cost:** Free tier sufficient for launch (100GB bandwidth, 10k serverless function invocations/day)

---

### Tier 2: Required for Monitoring (P1 — Enable After Launch)

These enable ops visibility and alerts. Launch without them is risky but possible.

#### 4. Sentry — Error Tracking

- **What to create:** 2 projects (dev + prod)
- **Where:** https://sentry.io → Projects → Create Project
- **Steps:**
  1. Create organization (if not exists)
  2. Create project "javascript-nextjs-dev" (for dev errors)
  3. Create project "javascript-nextjs" (for prod errors)
  4. Copy DSN from each project settings
- **Env vars:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DEV_DSN`, `NEXT_PUBLIC_SENTRY_DEV_DSN`
- **Cost:** Free tier — 5,000 errors/month
- **Feature flag:** `ENABLE_SENTRY: true`

#### 5. Telegram Bot — Ops Alerts

- **What to create:** Bot via @BotFather
- **Where:** Telegram app → Search @BotFather
- **Steps:**
  1. Send `/newbot` to @BotFather
  2. Name it "MenuList Ops Bot"
  3. Username: `menulist_ops_bot`
  4. **Copy the bot token** (looks like `7123456789:AAF...`)
  5. Create private channel, add bot as admin
  6. Send any message to channel
  7. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
  8. Find `"chat":{"id": -100XXXXXXXXXX}` — that's chat ID
- **Env vars:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (also set in Firebase Functions secrets)
- **Cost:** Free
- **Setup Firebase Functions:** `firebase functions:secrets:set TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- **Feature flag:** `ENABLE_OPS_ALERTS: true`

#### 6. Gmail SMTP — Lifecycle Emails

- **What to create:** App Password (not your Google password)
- **Where:** Google Account → Security → 2-Step Verification → App Passwords
- **Steps:**
  1. Enable 2-Factor Authentication on Google account
  2. Go to Security → 2-Step Verification → App Passwords
  3. Select "Mail" and "Other (Custom name)"
  4. Name it "MenuList Mailer"
  5. **Copy the 16-character app password** (e.g., `abcd efgh ijkl mnop`)
- **Env vars:** `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=your-email@gmail.com`, `SMTP_PASS=abcdefghijklmnop`
- **Cost:** Free (500 emails/day personal, 2,000/day Google Workspace)
- **Note:** Also add to Firebase Functions secrets for Cloud Functions email sending
- **Feature flag:** `ENABLE_LIFECYCLE_MESSAGING: true`

#### 7. Upstash Redis — Rate Limiting (Already Have)

- **What you have:** Database created, URL + token in .env files
- **What to consider:** Separate DB for dev/prod (optional)
- **Where:** https://console.upstash.com
- **Steps (if creating new):**
  1. Create new database
  2. Copy REST URL and REST Token
- **Env vars:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Cost:** Free tier — 10,000 requests/day
- **Note:** Can share same DB between dev/prod (keys don't collide)

---

### Tier 3: Optional Enhancements (P2 — Nice to Have)

#### 8. UptimeRobot — External Uptime Monitoring

- **What to create:** Free account + monitors
- **Where:** https://uptimerobot.com
- **Steps:**
  1. Sign up with your email
  2. Add monitors:
     - `https://menulist.ai` (main site)
     - `https://yourstore.menulist.ai` (sample store)
     - `https://menulist.ai/api/health` (if exists)
  3. Set check interval: 5 minutes
  4. Add alert contacts (email + optional Telegram webhook)
- **Env vars:** None (configured in UptimeRobot dashboard)
- **Cost:** Free tier — 50 monitors, 5-min checks
- **Note:** Sentry monitors errors, UptimeRobot monitors reachability

#### 9. Google reCAPTCHA v3 — App Check (Optional)

- **What to create:** reCAPTCHA v3 site key
- **Where:** https://www.google.com/recaptcha/admin
- **Steps:**
  1. Click "+" to create new site
  2. Choose reCAPTCHA v3 (NOT v2)
  3. Add domain: `menulist.ai`
  4. **Copy site key** (starts with numbers/letters)
- **Env vars:** `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- **Cost:** Free (unlimited assessments)
- **Feature flag:** `ENABLE_APP_CHECK: true`
- **Note:** Dev flag is OFF — skip for dev, only prod needs this

#### 10. Google Analytics 4 — Server-Side Analytics (Already Have)

- **What you have:** Service account for GA4 Data API
- **What to verify:** Service account still has access
- **Where:** https://console.cloud.google.com → IAM & Admin → Service Accounts
- **Steps:**
  1. Verify `menulistai-analytics@menulistai-analytics.iam.gserviceaccount.com` exists
  2. Verify it has "Viewer" role on GA4 property
- **Env vars:** `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY`, `GA_PROJECT_ID`
- **Cost:** Free (read-only API)

#### 11. Unsplash API — Background Images

- **What to create:** Developer account + application
- **Where:** https://unsplash.com/developers
- **Steps:**
  1. Sign up/login
  2. Click "New Application"
  3. Fill in app details
  4. **Copy Access Key** (looks like `abc123def456...`)
- **Env vars:** `NEXT_PUBLIC_UNSPLASH_API_CLIENTID`
- **Cost:** Free tier — 50 requests/hour
- **Note:** Optional — app works without this (background images feature)

#### 12. Pixabay API — Background Images (Alternative)

- **What to create:** API key
- **Where:** https://pixabay.com/api/docs/ → Get API Key
- **Steps:**
  1. Sign up/login
  2. Go to API docs → Get API Key
  3. **Copy API key**
- **Env vars:** `NEXT_PUBLIC_PIXABAY_API_CLIENTID`
- **Cost:** Free
- **Note:** Optional — alternative to Unsplash

#### 13. Microsoft Clarity — Heatmaps/Session Replay

- **What to create:** Project in Clarity
- **Where:** https://clarity.microsoft.com
- **Steps:**
  1. Sign up with Microsoft account
  2. Add new project
  3. Site URL: `https://menulist.ai`
  4. **Copy Project ID** (looks like `sc0tsmzg6b`)
- **Env vars:** `NEXT_PUBLIC_CLARITY_ID`
- **Cost:** Free (always free, unlimited sites)
- **Note:** Code has fallback ID — optional but recommended

#### 14. GCP Billing Alerts — Budget Monitoring

- **What to create:** Budget with alert thresholds
- **Where:** https://console.cloud.google.com → Billing → Budgets & Alerts
- **Steps:**
  1. Create budget "MenuList Production"
  2. Amount: ₹1,000 (or your limit)
  3. Set thresholds: 50%, 75%, 90%, 100%
  4. Alert email: your email
  5. (Optional) Link to Pub/Sub for auto SAFE_MODE
- **Env vars:** None (configured in GCP)
- **Cost:** Free (built into GCP)

#### 15. Sentry (Client-Side) — Same as #4

- Already covered in Sentry setup above
- Uses `NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DEV_DSN`

---

### Account Summary Table

| #   | Service              | Account Type          | Cost            | Priority | Feature Flag                 |
| --- | -------------------- | --------------------- | --------------- | -------- | ---------------------------- |
| 1   | Firebase Dev Project | Create new project    | Free            | P0       | N/A                          |
| 2   | Razorpay Live        | Switch to live mode   | Per transaction | P0       | N/A                          |
| 3   | Vercel               | Configure env scopes  | Free tier       | P0       | N/A                          |
| 4   | Sentry               | Create 2 projects     | Free            | P1       | `ENABLE_SENTRY`              |
| 5   | Telegram Bot         | Create via @BotFather | Free            | P1       | `ENABLE_OPS_ALERTS`          |
| 6   | Gmail SMTP           | App Password          | Free            | P1       | `ENABLE_LIFECYCLE_MESSAGING` |
| 7   | Upstash              | Already have          | Free            | P1       | `ENABLE_RATE_LIMITING`       |
| 8   | UptimeRobot          | Sign up               | Free            | P2       | N/A                          |
| 9   | reCAPTCHA v3         | Create site           | Free            | P2       | `ENABLE_APP_CHECK`           |
| 10  | GA4 Service Account  | Verify access         | Free            | P2       | N/A                          |
| 11  | Unsplash             | Developer app         | Free            | P2       | N/A                          |
| 12  | Pixabay              | API key               | Free            | P2       | N/A                          |
| 13  | Clarity              | New project           | Free            | P2       | N/A                          |
| 14  | GCP Billing          | Budget alert          | Free            | P1       | N/A                          |

---

### Setup Checklist (Print & Tick Off)

**Before Launch (P0):**

- [ ] Create `menulist-dev` Firebase project
- [ ] Get Razorpay live API keys
- [ ] Configure Vercel env vars (Preview + Production)

**Week 1 After Launch (P1):**

- [ ] Create Sentry dev + prod projects
- [ ] Create Telegram bot, get bot token + chat ID
- [ ] Set Gmail App Password
- [ ] Configure Firebase Functions secrets for Telegram + SMTP
- [ ] Enable monitoring feature flags (order: SAFE_MODE → Sentry → Ops Alerts → Health Monitor)

**Month 1 After Launch (P2):**

- [ ] Sign up UptimeRobot, add monitors
- [ ] Create reCAPTCHA v3 site key
- [ ] Verify GA4 service account access
- [ ] Sign up Unsplash/Pixabay (optional)
- [ ] Create Clarity project
- [ ] Set GCP budget alerts

---

## Cross-Check Summary

### Environment Files Created

| File                      | Purpose                                         | Git Ignored? |
| ------------------------- | ----------------------------------------------- | ------------ |
| `.env.local`              | Dev environment (local + Vercel Preview)        | ✅ Yes       |
| `.env.prod`               | Production template (copy to Vercel Production) | ✅ Yes       |
| `functions/.env.local`    | Firebase Functions emulator secrets             | ✅ Yes       |
| `functions/.secret.local` | Functions overrides (existing)                  | ✅ Yes       |

### All Environment Variables Covered

| Category               | Count  | Source                                                     |
| ---------------------- | ------ | ---------------------------------------------------------- |
| Firebase (MenuList)    | 14     | `src/lib/firebase/config.ts`, `firebaseAdmin.ts`           |
| Firebase (Canonica)    | 7      | `src/lib/firebase/canonicaConfig.ts`                       |
| Auth (NextAuth)        | 3      | `src/lib/auth/index.ts`                                    |
| AI (Gemini)            | 5      | `src/lib/google/genAi/`, `functions/src/config/secrets.ts` |
| Payments (Razorpay)    | 4      | `src/lib/razorpay/razorpay.ts`, webhook                    |
| Rate Limiting          | 2      | `src/lib/rateLimit.ts`, `functions/src/config/secrets.ts`  |
| Analytics (GA4)        | 3      | `src/lib/analytics/server/index.ts`                        |
| Batch Processing       | 2      | `src/lib/google/cloudTask/index.ts`                        |
| Email (SMTP)           | 4      | `src/lib/messaging/index.ts`, `notifications/index.ts`     |
| Ops Alerts             | 2      | `src/lib/ops/alerts.ts`, `functions/src/config/secrets.ts` |
| Error Tracking         | 4      | `sentry.server.config.ts`, `instrumentation-client.ts`     |
| Internal Notifications | 2      | `src/constants/internalRecipients.ts`                      |
| Website Analytics      | 2      | `src/components/website/`                                  |
| Image Libraries        | 2      | `src/lib/unsplash/index.ts`, `src/lib/pixabay/index.ts`    |
| App Check              | 1      | `src/lib/firebase/appCheck.ts`                             |
| Slack (Future)         | 1      | `src/lib/notifications/index.ts`                           |
| **TOTAL**              | **59** | Across all files                                           |

### Code Changes Made

| Change                       | File                                    | Status      |
| ---------------------------- | --------------------------------------- | ----------- |
| Fixed hardcoded storage URL  | `src/lib/firebase/firebaseClient.ts:18` | ✅ Done     |
| Added env validation         | `src/lib/env/validateEnv.ts` (new)      | ✅ Created  |
| Wired env validation         | `src/instrumentation.ts`                | ✅ Modified |
| Updated functions .gitignore | `functions/.gitignore`                  | ✅ Modified |

### Files Created/Modified in This Session

1. **Created:** `.env.local` — Dev environment (95 lines, fully documented)
2. **Created:** `.env.prod` — Production template (95 lines, with change instructions)
3. **Modified:** `functions/.env.local` — Added all secrets for emulator
4. **Modified:** `functions/.gitignore` — Added `.env.local` and `.secret.local`
5. **Created:** `src/lib/env/validateEnv.ts` — Runtime validation utility
6. **Modified:** `src/instrumentation.ts` — Wired env validation
7. **Modified:** `src/lib/firebase/firebaseClient.ts` — Fixed hardcoded storage URL
8. **Modified:** `__docs__/production-readiness/dev-prod-environment-guide.md` — Added third-party guide

### Ready for Vercel

Copy-paste these into Vercel Dashboard:

**For Preview Environment (dev):**

- Copy ALL variables from `.env.local`
- Set scope to "Preview"

**For Production Environment:**

- Copy ALL variables from `.env.prod`
- Update `[CHANGE FOR PROD]` marked variables
- Set scope to "Production"

### Ready for Firebase Functions

**For Emulator (local dev):**

- Values are in `functions/.env.local` (already configured)

**For Production (deployed):**

```bash
# One-time setup for each secret:
firebase functions:secrets:set GEMINI_AI_KEY
firebase functions:secrets:set UPSTASH_REDIS_REST_URL
firebase functions:secrets:set UPSTASH_REDIS_REST_TOKEN
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
firebase functions:secrets:set SENTRY_DSN
```

---

## Version History

| Version | Date           | Changes                                                                 |
| ------- | -------------- | ----------------------------------------------------------------------- |
| 1.0     | March 22, 2026 | Initial guide — ChatGPT validation + codebase audit                     |
| 1.1     | March 22, 2026 | Added complete third-party account creation guide + cross-check summary |
