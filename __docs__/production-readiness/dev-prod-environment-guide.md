# Dev vs Prod Environment Guide — MenuList Production Readiness

**Created:** March 22, 2026  
**Last Updated:** June 21, 2026
**Source:** ChatGPT strategic session → Cascade full codebase audit + validation  
**Status:** ACTIONABLE — Implementation guide for environment separation  
**ChatGPT Accuracy:** ~55% (strategic framing strong, ~45% already exists or wrong assumptions)

**Launch boundary:** Not current launch certification or deploy approval. This environment guide cannot approve go-live by itself; production readiness still requires External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

## Active Environment Target Matrix

This is the current source-of-truth contract for the shared Vercel app. Code mirrors this in `src/constants/deploymentTargets.ts`, and `npm run verify:env-targets` checks that routing, aliases, and deploy scripts stay aligned.

| Environment | Vercel env | MenuList URL | MenuList Firebase | Answerlattice URL | Answerlattice Firebase |
| --- | --- | --- | --- | --- | --- |
| Local development | local | `http://localhost:3000/` | `menulist-qa` | `http://localhost:3000/__answerlattice/` | `answerlattice-qa` |
| Staging / QA | Preview | `https://menulist.online` | `menulist-qa` | `https://answerlattice.menulist.online` | `answerlattice-qa` |
| Production | Production | `https://menulist.ai` | `menulist` | `https://answerlattice.com` | `answerlattice` |

Do not use `menulist-dev` for the current local/preview path. Local and preview MenuList intentionally use `menulist-qa`; only Vercel production switches MenuList to the production Firebase project `menulist`. Answerlattice is separate in every active environment: `answerlattice-qa` for local/preview and `answerlattice` for production.

Known product hostnames are stage-scoped. Middleware redirects a known QA hostname that reaches Production, or a known production hostname that reaches Preview, to the active hostname for that product instead of treating it as a custom tenant domain.

MenuList can embed Answerlattice as an external client on owner routes only when `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY` is configured with an Answerlattice-issued `al_` widget key. The default script host follows the matrix above: local uses the same localhost app, QA/Preview uses `https://answerlattice.menulist.online`, and Production uses `https://answerlattice.com`. Use `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC` only for temporary preview overrides.

---

## ChatGPT Conversation Validation

### Validation Summary Table

| #   | ChatGPT Claim                                    | Verdict            | Codebase Evidence                                                                                                              |
| --- | ------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Separate Firebase projects for dev/prod          | **UPDATED**        | Current contract: local/preview MenuList uses `menulist-qa`, production MenuList uses `menulist`; local/preview Answerlattice uses `answerlattice-qa`, production Answerlattice uses `answerlattice`. |
| 2   | Separate storage buckets                         | **AGREE**          | `firebaseStorageUrl` hardcoded to `menulist-qa.appspot.com` — needs per-env config                                                 |
| 3   | Separate API keys (Gemini, etc.)                 | **AGREE**          | Single `GEMINI_AI_KEY` used everywhere. Multi-key rotation exists but all keys are for same project                            |
| 4   | Separate domains                                 | **ALREADY EXISTS** | Vercel handles this: `main` → prod domain, `dev` → preview URLs                                                                |
| 5   | No shared anything between dev/prod              | **PARTIAL**        | Feature flags are code-level (not env-level), so target-specific changes require explicit review and certification evidence rather than env overrides |
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
| 20  | Over-engineering staging env                     | **UPDATED**        | Staging/QA exists as the Vercel Preview environment: `menulist.online` + `answerlattice.menulist.online`. It uses QA Firebase targets and must not be treated as production. |
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

1. Separate Firebase targets per environment/product
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
| **Dependency Freeze Gate** | `npm run verify:dependency-freeze` pins root and Functions package declarations to lockfile-resolved versions and blocks accidental semver drift | ✅ COMPLETE |

### What's Missing (Action Required)

| Gap                                            | Priority  | Effort    |
| ---------------------------------------------- | --------- | --------- |
| **Vercel env values for production Firebase targets** | 🔴 HIGH   | Console setup |
| **Environment variable validation at startup** | 🔴 HIGH   | 30 min    |
| **Target-environment feature flag evidence** | 🟡 MEDIUM | Review + certification evidence |
| **Incident response playbook**                 | 🟡 MEDIUM | 1 hour    |
| **Pre-deploy checklist script**                | 🟢 LOW    | 30 min    |

---

## Third-Party Service Audit

### Complete Service Inventory

| #   | Service                 | Package                                      | Purpose                                 | Env Vars (Next.js)                                                                                 | Env Vars (CF)                            | Dev Setup                      | Prod Setup                  |
| --- | ----------------------- | -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------ | --------------------------- |
| 1   | **Firebase (MenuList)** | Root app: `firebase` v11.7.3, `firebase-admin` v12.7.0; MenuList Functions: `firebase-admin` v13.5.0, `firebase-functions` v6.6.0 | Core database, auth, storage            | `NEXT_PUBLIC_FIREBASE_*` (7 vars), `FIREBASE_*` (4 vars)                                           | Auto from project                        | Local/Preview: `menulist-qa`       | Production: `menulist` |
| 2   | **Firebase (Answerlattice)** | Same packages                                | Answerlattice product database               | `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_*` (6 vars), `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE`, optional `NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID` | `ANSWERLATTICE_FIREBASE_*`, optional `ANSWERLATTICE_FIRESTORE_DATABASE_ID` | Local/Preview: `answerlattice-qa` | Production: `answerlattice` |
| 3   | **Razorpay**            | `razorpay` v2.9.6                            | Payments & subscriptions                | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | **NEEDS: Test mode keys**      | Live mode keys              |
| 4   | **Google Gemini AI**    | `@google/genai` v0.12.0                      | OCR, descriptions, translations, images | `GEMINI_AI_KEY`                                                                                    | `GEMINI_AI_KEY` + `_2`, `_3`, `_4`       | Same key (OK for dev)          | Same key + rotation keys    |
| 5   | **Upstash Redis**       | Root app: `@upstash/redis` v1.35.6; MenuList Functions: v1.35.7 | Rate limiting, Answerlattice cache           | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                               | Same                                     | **Can skip** (flag OFF in dev) | Required                    |
| 6   | **Sentry**              | Root app: `@sentry/nextjs` v10.22.0; MenuList Functions: `@sentry/node` v8.55.0 | Error tracking                          | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`                                                             | `SENTRY_DSN`                             | Dev Sentry project             | Prod Sentry project         |
| 7   | **NextAuth**            | `next-auth` v4.24.13                         | Authentication (Google OAuth)           | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                      | N/A                                      | Same OAuth app (OK)            | Same OAuth app              |
| 8   | **Google Analytics**    | `@google-analytics/data` v5.1.0              | Server-side analytics reads             | `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY`, `GA_PROJECT_ID`                                               | N/A                                      | Same (OK for dev)              | Same                        |
| 9   | **SMTP (Nodemailer)**   | Root app: `nodemailer` v7.0.13; MenuList Functions: v8.0.1; Answerlattice Functions: v8.0.2 | Lifecycle emails, notifications         | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`                                                 | Same secrets                             | Optional (skip in dev)         | Gmail SMTP or custom        |
| 10  | **Telegram Bot**        | Raw HTTP fetch                               | Ops alerts                              | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                                                           | Same secrets                             | Optional (skip in dev)         | Required                    |
| 11  | **Google Cloud Tasks**  | `@google-cloud/tasks` v6.1.0                 | Batch image generation queue            | `BATCH_IMAGE_GENERATION_WORKER_URL`, `BATCH_IMAGE_GENERATION_QUEUE_ID`                             | N/A                                      | Skip in dev                    | Required                    |
| 12  | **Vercel**              | Hosting platform                             | Deployment                              | `VERCEL`, `VERCEL_ENV` (auto-set)                                                                  | N/A                                      | Auto (`dev` branch)            | Auto (`main` branch)        |
| 13  | **WhatsApp Cloud API**  | Raw HTTP in CF                               | Messaging onboarding                    | N/A                                                                                                | `WHATSAPP_*` (4 secrets)                 | Not needed (flag OFF)          | When enabled                |

### Services That NEED Separate Dev/Prod Configuration

| Service                 | Why Separate                                                       | How                                    |
| ----------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **Firebase (MenuList)** | Production data must not mix with local/preview data | Keep local/preview on `menulist-qa`; set Vercel Production vars to `menulist` |
| **Firebase (Answerlattice)** | Answerlattice data must stay separate from MenuList and from production | Use `answerlattice-qa` locally/in Preview; use `answerlattice` in Production |
| **Razorpay**            | Test mode vs live payments — using live keys in dev = real charges | Use Razorpay test mode keys in dev     |
| **Sentry**              | Keep dev errors out of prod dashboard                              | Configured through env; no DSNs in code |
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

## Feature Flags: Target-Environment Review

Feature flags live in `src/config/features.ts`. This guide does not authorize blanket env-specific overrides or a "turn everything on" launch ritual.

### Current Contract

- Keep `src/config/features.ts` as the source of truth unless a separate architecture decision introduces env-specific overrides.
- Review only the flags tied to the target gate being certified.
- Provider-backed flags require target secrets/account setup, source gates, QA evidence where applicable, and explicit production approval before production use.
- If a flag is already `true` in source, treat it as code-enabled; still verify the underlying provider/runtime evidence before launch.

### Operational Flags To Review

| Flag | Required evidence before production launch |
| --- | --- |
| `ENABLE_RATE_LIMITING` | Upstash env is configured for the target and public menu setup/claim strict-fail behavior is verified |
| `ENABLE_APP_CHECK` | Firebase App Check site keys are configured for the target domains |
| `ENABLE_SENTRY` | Target DSN exists and error capture is verified without leaking local/dev DSNs |
| `ENABLE_COST_PROTECTION` | SAFE_MODE toggle, AI-route `503`, public menu/OBP unaffected behavior, and worker coverage are verified |
| `ENABLE_OPS_ALERTS` | Telegram secrets/channel and scoped QA Functions deploy evidence exist |
| `ENABLE_MENU_HEALTH_MONITOR` | `verifyMenuPublish` deploy evidence and post-publish monitor smoke evidence exist |
| `ENABLE_LIFECYCLE_MESSAGING` | SMTP secrets, provider send evidence, and owner-safe copy review exist |

Do not add `NEXT_PUBLIC_ENABLE_*` flag env keys or per-env overrides as a quick launch fix. If target-specific flag behavior becomes necessary later, document the architecture change first and add verifier coverage before relying on it.

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
SENTRY_DEV_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Answerlattice Product (if using)
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID=
NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID=
ANSWERLATTICE_FIREBASE_MODE=separate
ANSWERLATTICE_FIREBASE_PROJECT_ID=
ANSWERLATTICE_FIREBASE_PRIVATE_KEY=
ANSWERLATTICE_FIREBASE_CLIENT_EMAIL=
ANSWERLATTICE_FIRESTORE_DATABASE_ID=
ANSWERLATTICE_WIDGET_KEY_ENCRYPTION_SECRET=

# MenuList as Answerlattice external client (optional owner-app widget embed)
NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY=
NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC=
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

## Execution Plan: Environment Separation

### Phase 1: Firebase Target Separation (HIGHEST PRIORITY)

**Step 1: Keep Local/Preview Targets Stable**

1. Local MenuList uses `http://localhost:3000/` and Firebase `menulist-qa`.
2. Local Answerlattice uses `http://localhost:3000/__answerlattice/` and Firebase `answerlattice-qa`.
3. Vercel Preview MenuList uses `https://menulist.online` and Firebase `menulist-qa`.
4. Vercel Preview Answerlattice uses `https://answerlattice.menulist.online` and Firebase `answerlattice-qa`.

**Step 2: Configure Local Development**

1. MenuList `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `FIREBASE_PROJECT_ID` point to `menulist-qa`.
2. Answerlattice `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID` and `ANSWERLATTICE_FIREBASE_PROJECT_ID` point to `answerlattice-qa`.
3. Answerlattice local site access stays under `/__answerlattice`; do not add local host aliases for Answerlattice website work.

**Step 3: Configure Vercel Production**

1. In Vercel Dashboard → Settings → Environment Variables
2. Set all MenuList `FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_*` vars to the production Firebase project `menulist`.
3. Set all Answerlattice `ANSWERLATTICE_FIREBASE_*` and `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_*` vars to the production Firebase project `answerlattice`.
4. Set `NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai` in Production and `NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.online` in Preview.
5. Run `npm run verify:env-targets` after env/documentation edits.

**Step 4: Seed Non-Production QA Data**

1. Create or confirm a test tenant/store in `menulist-qa`.
2. Upload sample menu for testing
3. Create test subscription or unexpired starter activation
4. Do not create or target `menulist-dev` for the current local/preview path.

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

### Phase 3: Target Feature Flag Activation Review

Do not flip every operational flag as a launch ritual. For each target, compare `src/config/features.ts` against the active certification gate, then record the evidence for only the flags that gate that release.

1. Run the maintained source gate for the feature or provider path.
2. Confirm target secrets/accounts exist before treating provider-backed flags as usable.
3. Capture QA evidence before production activation when Firebase Functions, Storage, Firestore, provider delivery, or public runtime behavior is involved.
4. Require explicit production approval before changing production-facing flag behavior or deploy targets.

### Phase 4: Runtime Guards (Code Changes)

See "Codebase Changes" section below.

---

## Production Certification Checklist

This guide is a companion environment checklist. It does not approve production launch by itself. The launch verdict remains blocked until every [External Certification Runbook](./external-certification-runbook.md) gate relevant to the release has audit evidence.

### Pre-Launch (Do Once)

- [ ] Local/preview Firebase targets confirmed for `menulist-qa` and `answerlattice-qa`
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

### Launch Verdict Evidence

This checklist supports launch review only when:

- MCE blocks bad data (`ENABLE_MCE: true` source state verified)
- MOL logs mutations (`ENABLE_MENU_OBSERVATION: true` source state verified)
- SAFE_MODE kill switch has target evidence for toggle behavior and unaffected public menu/OBP traffic
- Error tracking has target DSN evidence and bounded logging behavior
- Rate limiting has target Upstash evidence and strict public setup/claim fallback coverage
- Tenant isolation is verified through maintained source gates and authenticated smoke evidence where applicable
- Cost posture is predictable through credit controls, SAFE_MODE, provider quotas, and budget-alert evidence
- Every External Certification Runbook gate relevant to the release has audit evidence

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
| `src/lib/firebase/firebaseClient.ts:18` | `menulist-qa.appspot.com`            | Storage URL hardcoded to prod    | Use `process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `next.config.js:59`                     | `firebasestorage.googleapis.com` | Image pattern — OK for both envs | No change needed                                      |
| `functions/src/config/secrets.ts:132`   | `region: 'us-central1'`          | Same region for all envs         | OK — keep same region                                 |

---

## Third-Party Account Creation Guide

This section details **all accounts you need to create** for production, organized by priority and service. Each entry includes: what to create, where to get it, what env vars it provides, and cost (if any).

### Tier 1: Required for Production (P0)

These are mandatory before launch. Without them, core features break.

#### 1. Firebase (MenuList) — Already Exists

- **What you have:** `menulist-qa` project for local/preview QA
- **What production needs:** `menulist` project credentials in Vercel Production
- **Where:** Firebase Console → project settings → web app + service account for `menulist`
- **Steps:**
  1. Keep local/Preview env vars pointed at `menulist-qa`.
  2. Set Production `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `FIREBASE_PROJECT_ID` to `menulist`.
  3. Deploy MenuList production rules/indexes/functions explicitly with `--project menulist` only after QA evidence and explicit production approval.
- **Env vars provided:** `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_*` (14 vars)
- **Cost:** No new local/preview project; production costs move to `menulist`.

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
  1. Go to Environment Variables.
  2. Use `.env.production.example` as the Production key checklist and fill real production values in Vercel only.
  3. Use `.env.staging.example` as the Preview/local key checklist and fill QA values in Vercel only.
  4. Treat existing `.env`, `.env.local`, or `.env.prod` files as legacy local files until rebuilt from the canonical templates in `__docs__/deployment/three-product-environment-setup.md`.
  5. Redeploy only through the approved Vercel workflow for the active session.
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
- **Root app runtime rule:** browser Sentry reads `NEXT_PUBLIC_SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DEV_DSN`; server and edge Sentry read `SENTRY_DSN` or local `SENTRY_DEV_DSN`, with the same app public DSN as a fallback. If no matching DSN is configured, root app Sentry stays disabled.
- **Functions runtime rule:** deployed Functions read `SENTRY_DSN` only; local emulators may use `SENTRY_DEV_DSN`. If no DSN is configured, Functions Sentry stays disabled and Firebase logs remain active.
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
- **Setup Firebase Functions:** Set QA secrets first with `--project menulist-qa`; production secrets require QA evidence and explicit production secret approval.
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

#### 10B. Marketing Website Analytics Vendor Boundary

- **Current launch position:** use consent-gated Plausible Cloud for the public MenuList and Answerlattice marketing websites once the Plausible sites and Vercel env vars are configured.
- **Plausible:** website-only. Configure `NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN` and `NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN`; use script overrides only when Plausible provides a site-specific script URL.
- **GA4/Clarity:** GA4 remains optional for paid-ad/conversion continuity. Microsoft Clarity remains MenuList-only for visual behavior observation.
- **PostHog:** rejected for launch. Any later internal product analytics plan must disable autocapture/session replay and use manual events only.
- **Product analytics:** public menu, Official Business Page, Customer App, Owner Dashboard, and Business Health analytics stay on the existing MenuList-owned aggregate analytics/read-model pipeline.
- **Reference:** `__docs__/client-menu/analytics-tracking/analytics-tracking_vendor-plan.md`

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

#### 13. Microsoft Clarity — Marketing Website Analytics

- **What to create:** No new project by default if retaining the current configured project. Verify ownership/access before launch.
- **Where:** https://clarity.microsoft.com
- **Steps:**
  1. Sign up with Microsoft account
  2. Confirm the existing MenuList project is accessible, or add a new project only if replacing the configured id
  3. Site URL: `https://menulist.ai`
  4. If replacing, copy the Project ID (looks like `sc0tsmzg6b`)
- **Env vars:** `NEXT_PUBLIC_CLARITY_ID`
- **Cost:** Free (always free, unlimited sites)
- **Note:** Loads only through `WebsiteAnalyticsConsent` after accepted analytics consent. Clarity is visual behavior review, not the canonical website analytics dashboard.

#### 13B. Plausible Cloud — Marketing Website Analytics

- **What to create:** Plausible Cloud account with separate sites for `menulist.ai` and `answerlattice.com`
- **Where:** https://plausible.io
- **Steps:**
  1. Add site: `menulist.ai`
  2. Add site: `answerlattice.com`
  3. Configure custom-event goals for the launch event names listed in `analytics-tracking_vendor-plan.md`
  4. Use Growth by default unless Business-only features are needed immediately
  5. Copy a site-specific script URL only if Plausible provides one; otherwise leave the script override env blank
- **Env vars:** `NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_MENULIST_PLAUSIBLE_SCRIPT_SRC`, `NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_SCRIPT_SRC`
- **Cost:** Paid Plausible Cloud plan
- **Note:** Loads only through the public website consent banners after accepted analytics consent. Do not use Plausible for owner dashboard, public menu, Official Business Page, Customer App, widget, or Business Health truth.

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
| 1   | Firebase QA Project Access | Confirm `menulist-qa` and `answerlattice-qa` access | Existing project access | P0       | N/A                          |
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
| 13  | Clarity              | Verify project access | Free            | P2       | N/A                          |
| 13B | Plausible Cloud      | Create website sites  | Paid plan       | P2       | N/A                          |
| 14  | GCP Billing          | Budget alert          | Free            | P1       | N/A                          |

---

### Setup Checklist (Print & Tick Off)

**Before Launch (P0):**

- [ ] Configure MenuList production Firebase env vars for `menulist`
- [ ] Configure Answerlattice production Firebase env vars for `answerlattice`
- [ ] Confirm local/preview Firebase env vars for `menulist-qa` and `answerlattice-qa`
- [ ] Get Razorpay live API keys
- [ ] Configure Vercel env vars (Preview + Production)

**Week 1 After Launch (P1):**

- [ ] Create Sentry dev + prod projects
- [ ] Create Telegram bot, get bot token + chat ID
- [ ] Set Gmail App Password
- [ ] Configure Firebase Functions secrets for Telegram + SMTP
- [ ] Confirm monitoring feature flags and External Certification Runbook evidence (SAFE_MODE, Sentry, Ops Alerts, Health Monitor)

**Month 1 After Launch (P2):**

- [ ] Sign up UptimeRobot, add monitors
- [ ] Create reCAPTCHA v3 site key
- [ ] Verify GA4 service account access
- [ ] Sign up Unsplash/Pixabay (optional)
- [ ] Verify Clarity project access if retaining the current website analytics stack
- [ ] Create Plausible sites for `menulist.ai` and `answerlattice.com`, set website-only Plausible env vars, and configure launch custom-event goals
- [ ] Do not add PostHog unless `analytics-tracking_vendor-plan.md` has a separate approved internal-product-analytics task
- [ ] Set GCP budget alerts

---

## Cross-Check Summary

### Environment File Sources

| File                      | Purpose                                         | Git Ignored? |
| ------------------------- | ----------------------------------------------- | ------------ |
| `.env.staging.example`    | Canonical local/staging Vercel env checklist    | No, placeholder template |
| `.env.production.example` | Canonical production Vercel env checklist       | No, placeholder template |
| `.env.local`              | Local runtime values rebuilt from staging template | Yes       |
| `.env.prod`               | Legacy local file only; do not copy blindly to Vercel | Yes       |
| `functions/.env.menulist-qa.example` | MenuList QA Functions non-secret template | No, placeholder template |
| `functions/.env.menulist.example` | MenuList production Functions non-secret template | No, placeholder template |

### All Environment Variables Covered

| Category               | Count  | Source                                                     |
| ---------------------- | ------ | ---------------------------------------------------------- |
| Firebase (MenuList)    | 14     | `src/lib/firebase/config.ts`, `firebaseAdmin.ts`           |
| Firebase (Answerlattice)    | 7      | `src/lib/firebase/answerlatticeConfig.ts`                       |
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

### Current Setup Handoff

Use `__docs__/deployment/three-product-environment-setup.md` as the detailed setup runbook. This environment guide is a companion overview only.

### Vercel Env Handoff

- Preview/local key checklist: `.env.staging.example`
- Production key checklist: `.env.production.example`
- Do not copy `.env.local` or `.env.prod` wholesale into Vercel.
- Vercel deploys still require explicit approval in the active session.

### Firebase Functions Secret Handoff

- Configure MenuList QA secrets first with commands that include `--project menulist-qa`.
- Use `__docs__/deployment/three-product-environment-setup.md` for the current full secret list.
- Repeat for `--project menulist` only after QA evidence and explicit production secret approval.
- Secret setup alone does not certify deployed Functions; Gate 1 in the External Certification Runbook still requires local preflight and scoped deploy evidence.

---

## Version History

| Version | Date           | Changes                                                                 |
| ------- | -------------- | ----------------------------------------------------------------------- |
| 1.0     | March 22, 2026 | Initial guide — ChatGPT validation + codebase audit                     |
| 1.1     | March 22, 2026 | Added complete third-party account creation guide + cross-check summary |
