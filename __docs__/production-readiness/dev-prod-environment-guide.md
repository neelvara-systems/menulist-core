# Dev vs Prod Environment Guide — MenuList Production Readiness

**Created:** March 22, 2026  
**Last Updated:** August 13, 2026
**Source:** ChatGPT strategic session → Cascade full codebase audit + validation  
**Status:** ACTIONABLE — Implementation guide for environment separation  
**ChatGPT Accuracy:** ~55% (strategic framing strong, ~45% already exists or wrong assumptions)

**Launch boundary:** Not current launch certification or deploy approval. This environment guide cannot approve go-live by itself; production readiness still requires External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

## Active Environment Target Matrix

This is the current source-of-truth contract for the shared Vercel app. Code mirrors this in `src/constants/deploymentTargets.ts`, and `npm run verify:env-targets` checks that routing, aliases, and deploy scripts stay aligned.

| Environment | Vercel env | MenuList URL | MenuList Firebase | Answerlattice URL | Answerlattice Firebase |
| --- | --- | --- | --- | --- | --- |
| Local development | local | `http://localhost:3000/` | `menulist-qa` | `http://localhost:3000/__answerlattice/` | `neelvara-answerlattice-qa` |
| Staging / QA | Preview | website `https://menulist.digital`; app `https://app.menulist.digital`; customers `*.menulist.digital` | `menulist-qa` | `https://canonica.app` | `neelvara-answerlattice-qa` |
| Production | Production | website `https://menulist.ai`; app `https://app.menulist.ai`; customers `*.menulist.online` | `menulist-prod` | `https://answerlattice.com` | `neelvara-answerlattice-prod` |

Do not use `menulist-dev` for the current local/preview path. Local and preview MenuList intentionally use `menulist-qa`; only Vercel production switches MenuList to the production Firebase project `menulist-prod`. Answerlattice is separate in every active environment: `neelvara-answerlattice-qa` for local/preview and `neelvara-answerlattice-prod` for production.

Keep the infrastructure model simple: select `us-central1` when Firestore asks for
a location and use `us-central1` for MenuList Storage, Functions, and Cloud Tasks.
Do not create regional copies or a third deployed environment. Use the Firebase
Emulator Suite for destructive local tests. Every `menulist.digital` QA host must
send `X-Robots-Tag: noindex, nofollow, noarchive`, serve a disallow-all
`robots.txt`, and publish no sitemap. In Vercel, scope MenuList QA secrets to the
Preview environment for the exact `staging` Git branch, not every Preview branch.

Known product hostnames are stage-scoped. Middleware redirects a known QA hostname that reaches Production, or a known production hostname that reaches Preview, to the active hostname for that product instead of treating it as a custom tenant domain.

MenuList can embed Answerlattice as an external client on owner routes only when `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY` is configured with an Answerlattice-issued `al_` widget key. The default script host follows the matrix above: local uses the same localhost app, QA/Preview uses `https://answerlattice.menulist.online`, and Production uses `https://answerlattice.com`. Use `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC` only for temporary preview overrides.

---

## ChatGPT Conversation Validation

### Validation Summary Table

| #   | ChatGPT Claim                                    | Verdict            | Codebase Evidence                                                                                                              |
| --- | ------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Separate Firebase projects for dev/prod          | **UPDATED**        | Current contract: local/preview MenuList uses `menulist-qa`, production MenuList uses `menulist-prod`; local/preview Answerlattice uses `neelvara-answerlattice-qa`, production Answerlattice uses `neelvara-answerlattice-prod`. |
| 2   | Separate storage buckets                         | **AGREE**          | `firebaseStorageUrl` hardcoded to `menulist-qa.appspot.com` — needs per-env config                                                 |
| 3   | Separate API keys (Gemini, etc.)                 | **AGREE**          | MenuList uses environment-specific values: a shared 1-3 key pool plus one dedicated paid extraction credential. Keys in one project still share quota. |
| 4   | Separate domains                                 | **ALREADY EXISTS** | Vercel handles this: `main` → prod domain, `dev` → preview URLs                                                                |
| 5   | No shared anything between dev/prod              | **PARTIAL**        | Feature flags are code-level (not env-level), so target-specific changes require explicit review and certification evidence rather than env overrides |
| 6   | `.env.local` for dev, `.env.production` for prod | **WRONG**          | Next.js uses `.env.local` (all envs) + Vercel env vars per environment. No `.env.production` file needed                       |
| 7   | Use a public deployment-stage marker             | **UPDATED**        | Vercel's server `VERCEL_ENV` is authoritative; `NEXT_PUBLIC_VERCEL_ENV` and the retained `NEXT_PUBLIC_ENV` compatibility marker must agree with it |
| 8   | MCE validation on publish                        | **ALREADY EXISTS** | `src/lib/mce/` — 17-rule engine, publish-gate in Editor.tsx. Flag: `ENABLE_MCE: true`                                          |
| 9   | MOL logging                                      | **ALREADY EXISTS** | `src/database/menuChangeLog/` — append-only event ledger. Flag: `ENABLE_MENU_OBSERVATION: true`                                |
| 10  | Feature controls as instant remote kill switches | **PARTIAL**        | App flags are source-controlled build/runtime constants and require a release; selected Functions flags accept strict server env overrides |
| 11  | Cost discipline / rate limiting                  | **ALREADY EXISTS** | Upstash rate limiting, SAFE_MODE circuit breaker, AI enhancement pack credits                                                  |
| 12  | Write governance layer / mutation pipeline       | **ALREADY EXISTS** | All writes go through DAL (`src/database/`) with `apiCallComposer` + `requestBodyComposer`. No direct Firestore writes from UI |
| 13  | Expensive-work circuit breaker                   | **ALREADY EXISTS** | SAFE_MODE reads `ops_config/system` and blocks only routes/workers with an explicit check; the app helper fails open on config-read failure and public menus remain available |
| 14  | Create `/core/mutations/` folder                 | **DISAGREE**       | Existing DAL pattern (`src/database/`) already serves this purpose. Adding another layer is over-engineering                   |
| 15  | Idempotency control with `requestId`             | **PARTIAL**        | Lifecycle messaging has idempotency. Not all operations need it — publish uses `menuVersion` increment                         |
| 16  | Runtime environment guards                       | **ALREADY EXISTS** | `src/lib/env/validateEnv.ts` is wired through `src/instrumentation.ts`; `npm run verify:env-targets` source-gates the environment matrix. Target values still require external evidence. |
| 17  | Sanitization layer                               | **ALREADY EXISTS** | `sanitizeForClient()` in `src/lib/mce/utils.ts` strips `_mce`. `sanitizeForFirestore()` prevents undefined writes              |
| 18  | Deployment safety checks                         | **ALREADY EXISTS** | `npm run verify:production-readiness-local`, `npm run verify:functions-deploy-preflight`, and `npm run verify:env-targets` provide source/preflight gates. They do not authorize deployment. |
| 19  | Tenant isolation                                 | **ALREADY EXISTS** | `withAuth()` + `verifyTenantAccess()` on all protected routes. tId/sId on all queries                                          |
| 20  | Over-engineering staging env                     | **UPDATED**        | Staging/QA exists as the Vercel Preview environment: MenuList uses `menulist.digital`/`app.menulist.digital`/`*.menulist.digital`; Answerlattice uses `answerlattice.menulist.online`. It uses QA Firebase targets and must not be treated as production. |
| 21  | Cost visibility per store/feature                | **PARTIAL**        | Firebase cost docs per feature exist (`_firebase.md`), but no runtime cost tracking dashboard                                  |
| 22  | Failure playbook                                 | **RESOLVED**       | [MenuList Incident Response Runbook](./incident-response-runbook.md) defines severity, containment, SAFE_MODE limits, scoped rollback, recovery, communication, and durable evidence requirements; live drill evidence remains pending |
| 23  | Trust verification loop                          | **PARTIAL**        | Nightly scheduler runs integrity checks, but no daily menu sampling system                                                     |
| 24  | Separate Firestore security rules per env        | **WRONG**          | Same rules deploy to both. Dev rules should NOT be relaxed — same strictness prevents bugs                                     |

### ChatGPT Accuracy Breakdown

- **Strategic framing:** ~80% (good principles, right mindset)
- **Codebase awareness:** ~15% (unaware of 80%+ of existing infrastructure)
- **Implementation advice:** ~30% (many suggestions duplicate existing patterns)
- **Architecture proposals:** ~40% (some over-engineering, some valid gaps)

### What ChatGPT Got Right (Implement These)

1. Separate Firebase targets per environment/product
2. Runtime environment guards at app startup - implemented through `src/lib/env/validateEnv.ts` and `src/instrumentation.ts`; target values still require certification evidence
3. Failure/incident response playbook - implemented in [MenuList Incident Response Runbook](./incident-response-runbook.md); QA tabletop/live drill evidence remains pending
4. Pre-deploy checklist automation - implemented through the aggregate, Functions preflight, dependency-freeze, and environment-target gates; deployment remains explicitly approved and target-scoped

### What ChatGPT Got Wrong (Ignore These)

1. `/core/mutations/` folder — DAL already handles this
2. `.env.production` file — Vercel env vars are the correct pattern
3. A separate ad-hoc environment alias — use the maintained
   `VERCEL_ENV`/`NEXT_PUBLIC_VERCEL_ENV`/`NEXT_PUBLIC_ENV` agreement contract
   instead
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
| **Expensive-work circuit breaker** | SAFE_MODE (`src/lib/ops/safeMode.ts`) | ✅ SOURCE-COMPLETE (live target verification pending) |
| **Feature Flags**    | source-controlled build/runtime constants in `src/config/features.ts` | ✅ SOURCE-COMPLETE |
| **Menu Validation**  | MCE 17-rule engine                                   | ✅ COMPLETE            |
| **Event Logging**    | MOL append-only ledger                               | ✅ COMPLETE            |
| **Menu Snapshots**   | Best-effort short-term immutable evidence after publish | ✅ COMPLETE         |
| **Error Tracking**   | Sentry dual-project (dev/prod DSNs)                  | ✅ COMPLETE (flag OFF) |
| **Ops Alerting**     | Telegram + systemAlerts collection                   | ✅ COMPLETE (flag OFF) |
| **Console Removal**  | `removeConsole` in production build                  | ✅ COMPLETE            |
| **Security Headers** | X-Frame-Options, nosniff, referrer-policy            | ✅ COMPLETE            |
| **PWA**              | Disabled in dev, enabled in prod builds              | ✅ COMPLETE            |
| **Dependency Freeze Gate** | `npm run verify:dependency-freeze` pins root and Functions package declarations to lockfile-resolved versions and blocks accidental semver drift | ✅ COMPLETE |
| **Runtime Environment Validation** | `src/lib/env/validateEnv.ts` through `src/instrumentation.ts`; matrix guarded by `npm run verify:env-targets` | ✅ SOURCE-COMPLETE |
| **Pre-deploy Source Gate** | `npm run verify:production-readiness-local` plus `npm run verify:functions-deploy-preflight` | ✅ SOURCE-COMPLETE |
| **Incident Response** | [MenuList Incident Response Runbook](./incident-response-runbook.md) | ✅ SOURCE-COMPLETE (QA tabletop/live drill pending) |

### Remaining Action Required

| Gap                                            | Priority  | Effort    |
| ---------------------------------------------- | --------- | --------- |
| **Vercel env values for production Firebase targets** | 🔴 HIGH   | Console setup |
| **Target-environment feature flag evidence** | 🟡 MEDIUM | Review + certification evidence |

---

## Third-Party Service Audit

### Complete Service Inventory

| #   | Service                 | Package                                      | Purpose                                 | Env Vars (Next.js)                                                                                 | Env Vars (CF)                            | Dev Setup                      | Prod Setup                  |
| --- | ----------------------- | -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------ | --------------------------- |
| 1   | **Firebase (MenuList)** | Root app: `firebase` v11.7.3, `firebase-admin` v14.2.0; MenuList Functions: `firebase-admin` v13.10.0, stable `firebase-functions` v7.3.0 | Core database, auth, storage | `NEXT_PUBLIC_MENULIST_FIREBASE_*`, `MENULIST_FIREBASE_*` | Auto from project | Local/custom `qa`: `menulist-qa` | Production: `menulist-prod` |
| 2   | **Firebase (Answerlattice)** | Root app: modular `firebase-admin` v14.2.0; Answerlattice Functions: `firebase-admin` v13.10.0, stable `firebase-functions` v7.3.0 | Answerlattice product database               | `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_*` (6 vars), `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE`, optional `NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID` | `ANSWERLATTICE_FIREBASE_CLIENT_EMAIL`, `ANSWERLATTICE_FIREBASE_PRIVATE_KEY`, optional application credentials | Local/Preview: `neelvara-answerlattice-qa` | Production: `neelvara-answerlattice-prod` |
| 2A  | **Firebase (SignalDesk)** | Root app: modular `firebase-admin` v14.2.0; SignalDesk Functions: `firebase-admin` v13.10.0, stable `firebase-functions` v7.3.0 | Private SignalDesk growth-control data | `NEXT_PUBLIC_SIGNALDESK_FIREBASE_*`, `SIGNALDESK_FIREBASE_*` | Auto from the dedicated Functions project | Local/Preview: `menulist-signaldesk-qa` | Production: `menulist-signaldesk` |
| 3   | **Razorpay**            | Root app: v2.9.6; MenuList Functions: v2.9.8 | Payments & subscriptions | `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID`, `MENULIST_RAZORPAY_KEY_SECRET`, `MENULIST_RAZORPAY_WEBHOOK_SECRET` | project-local `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | **NEEDS: Test mode keys** | Live mode keys |
| 4   | **Google Gemini AI**    | Root/MenuList Functions/Answerlattice Functions: `@google/genai` v2.13.0; explicit stable Gemini 3 IDs through the shared compatibility compiler | OCR, descriptions, translations, images | Shared `MENULIST_GEMINI_AI_KEY` plus `_2`, `_3` | Shared `GEMINI_AI_KEY` plus `_2`, `_3`; extraction-only `MENULIST_GEMINI_TEXT_AI_KEY` | MenuList QA paid key set | Separate MenuList production paid key set |
| 5   | **Upstash Redis**       | Root app: `@upstash/redis` v1.35.6; MenuList Functions: v1.35.7 | Product-scoped rate limiting and caches | `MENULIST_UPSTASH_*`; Answerlattice uses `ANSWERLATTICE_UPSTASH_*` | Project-specific when used | MenuList QA database | Separate MenuList production database |
| 6   | **Sentry**              | Root app: `@sentry/nextjs` v10.66.0; MenuList Functions: `@sentry/node` v10.68.0 | Error tracking                          | `NEXT_PUBLIC_SENTRY_DSN`                                                                               | project-local `SENTRY_DSN`               | QA Sentry project              | Prod Sentry project         |
| 7   | **NextAuth**            | `next-auth` v4.24.15                         | Authentication (Google OAuth)           | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                      | N/A                                      | Same OAuth app (OK)            | Same OAuth app              |
| 8   | **Google Analytics**    | `@google-analytics/data` v5.1.0              | Server-side analytics reads             | `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY`, `GA_PROJECT_ID`                                               | N/A                                      | Same (OK for dev)              | Same                        |
| 9   | **SMTP (Nodemailer)**   | Root runtime alias, MenuList Functions, and Answerlattice Functions: v9.0.3 | Lifecycle emails, notifications         | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`                                                 | Target-specific secrets                  | Approved QA test sender        | Approved production transactional sender |
| 10  | **Telegram Bot**        | Raw HTTP fetch                               | Ops alerts                              | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                                                           | Target-specific secrets                  | MenuList QA bot/chat           | Separate MenuList production bot/chat |
| 11  | **Google Cloud Tasks**  | `@google-cloud/tasks` v6.1.0                 | Batch image generation queue            | `FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_LOCATION`, `BATCH_IMAGE_GENERATION_QUEUE_ID`, `BATCH_IMAGE_GENERATION_WORKER_URL`, `BATCH_IMAGE_GENERATION_WORKER_SECRET` | N/A                                      | Skip in dev                    | Required                    |
| 12  | **Vercel**              | Hosting platform                             | Deployment                              | `VERCEL`, `VERCEL_ENV` (auto-set)                                                                  | N/A                                      | Preview values restricted to `staging` | Production values on the production branch |
| 13  | **WhatsApp Cloud API**  | Raw HTTP in CF                               | Messaging onboarding                    | N/A                                                                                                | `WHATSAPP_*` (4 secrets)                 | Not needed (flag OFF)          | When enabled                |

### Services That NEED Separate Dev/Prod Configuration

| Service                 | Why Separate                                                       | How                                    |
| ----------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **Firebase (MenuList)** | Production data must not mix with local/QA data | Keep local/custom `qa` on `menulist-qa`; set Vercel Production vars to `menulist-prod` |
| **Firebase (Answerlattice)** | Answerlattice data must stay separate from MenuList and from production | Use `neelvara-answerlattice-qa` locally/in Preview; use `neelvara-answerlattice-prod` in Production |
| **Razorpay**            | Test mode vs live payments — using live keys in dev = real charges | Use Razorpay test mode keys in dev     |
| **Sentry**              | Keep dev errors out of prod dashboard                              | Configured through env; no DSNs in code |
| **Gemini AI**           | Separate budgets, restrictions, revocation, and incident response  | Use separate MenuList QA and production key sets |
| **Upstash**             | Prevent QA rate-limit data and flushes from affecting production   | Use separate MenuList QA and production databases |
| **SMTP**                | Test messages and credentials must not affect production delivery  | Use an approved QA sender and a production transactional sender |
| **Telegram**            | Test alerts must not pollute or mute production alerts             | Use separate QA and production bots/chats |
| **Google Cloud Tasks**  | Queues and workers belong to their target Firebase/GCP project     | Create target-scoped queues and worker secrets |

### Accounts That May Share Ownership

The company may own providers through one company account or organization. That
does not mean QA and production should reuse secrets, databases, projects, bots,
or sender credentials. Google OAuth may use one client only when every exact QA
and production callback URI is registered and reviewed.

---

## Feature Flags: Target-Environment Review

App feature flags live as source-controlled build/runtime constants in
`src/config/features.ts`. They are not remote configuration and require a
release to change. This guide does not authorize blanket env-specific overrides or a "turn everything on" launch ritual.

### Current Contract

- Keep `src/config/features.ts` as the source of truth unless a separate architecture decision introduces env-specific overrides.
- MenuList Functions may use the existing strict `FEATURE_NAME_ENABLED`
  override form. Only `true`, `1`, `yes`, `on`, `false`, `0`, `no`, and `off`
  are accepted; invalid configured text fails closed.
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
NEXTAUTH_URL=
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
FIREBASE_PROJECT_ID=
FIREBASE_PROJECT_LOCATION=
BATCH_IMAGE_GENERATION_WORKER_URL=
BATCH_IMAGE_GENERATION_QUEUE_ID=
BATCH_IMAGE_GENERATION_WORKER_SECRET=
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
ANSWERLATTICE_FIREBASE_PRIVATE_KEY=
ANSWERLATTICE_FIREBASE_CLIENT_EMAIL=
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
# NEXT_PUBLIC_BASE_URL
```

---

## Execution Plan: Environment Separation

### Phase 1: Firebase Target Separation (HIGHEST PRIORITY)

**Step 1: Keep Local/Preview Targets Stable**

1. Local MenuList uses `http://localhost:3000/` and Firebase `menulist-qa`.
2. Local Answerlattice uses `http://localhost:3000/__answerlattice/` and Firebase `neelvara-answerlattice-qa`.
3. Vercel Preview MenuList uses `https://menulist.digital` for the website,
   `https://app.menulist.digital` for the owner app, `*.menulist.digital` for
   customer links, and Firebase `menulist-qa`. Scope its QA env values to the
   exact `staging` Git branch.
4. Vercel Preview Answerlattice uses `https://canonica.app` and Firebase `neelvara-answerlattice-qa`.

**Step 2: Configure Local Development**

1. MenuList `NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID` points to `menulist-qa`; server code reuses it.
2. Answerlattice `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID` points to `neelvara-answerlattice-qa`; browser and server runtimes reuse it.
3. Answerlattice local site access stays under `/__answerlattice`; do not add local host aliases for Answerlattice website work.

**Step 3: Configure Vercel Production**

1. In Vercel Dashboard → Settings → Environment Variables
2. Set MenuList `NEXT_PUBLIC_MENULIST_FIREBASE_*` Web config and the server-only Admin credentials to the production Firebase project `menulist-prod`.
3. Set Answerlattice's canonical `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_*` identifiers to the production Firebase project `neelvara-answerlattice-prod`, with only Admin credentials under `ANSWERLATTICE_FIREBASE_*`.
4. Set `NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai` and `NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.online` in Production.
5. Set `NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital`,
   `NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.digital`, and
   `NEXTAUTH_URL=https://app.menulist.digital` in Preview.
6. Restrict every sensitive MenuList Preview variable to the exact `staging`
   branch. Do not expose QA credentials to arbitrary pull-request previews.
7. Run `npm run verify:env-targets` after env/documentation edits.

**Step 4: Seed Non-Production QA Data**

1. Create or confirm a test tenant/store in `menulist-qa`.
2. Upload sample menu for testing
3. Create test subscription or unexpired starter activation
4. Do not create or target `menulist-dev` for the current local/preview path.

### Phase 2: Razorpay Test/Live Split

**Step 1: Get Razorpay Test Keys**

1. Razorpay Dashboard → Settings → API Keys → Generate Test Key
2. Store test keys in `.env.local`:
   - `MENULIST_RAZORPAY_KEY_SECRET=...`
   - `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID=rzp_test_...`

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

- [ ] Local/preview Firebase targets confirmed for `menulist-qa` and `neelvara-answerlattice-qa`
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
- [ ] Source flags and strict Functions overrides verified for this release
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
- **What production needs:** `menulist-prod` public Web config and keyless Workload Identity selectors in Vercel Production
- **Where:** Firebase Console and Google Cloud IAM for `menulist-prod`; Vercel Production environment for the selectors
- **Steps:**
  1. Keep local/Preview env vars pointed at `menulist-qa`.
  2. Set Production `NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID` and `MENULIST_FIREBASE_PROJECT_ID` to `menulist-prod`; keep server identity keyless through the approved Workload Identity provider.
  3. Deploy MenuList production rules/indexes/functions explicitly with `--project menulist-prod` only after QA evidence and explicit production approval.
- **Env vars provided:** `NEXT_PUBLIC_MENULIST_FIREBASE_*`, `MENULIST_FIREBASE_*`
- **Cost:** Local/QA costs remain in `menulist-qa`; production costs belong to `menulist-prod`.

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
  4. Restrict every sensitive Preview variable to the exact `staging` Git branch.
     Stop if a QA secret would be available to every Preview branch.
  5. Treat existing `.env`, `.env.local`, or `.env.prod` files as legacy local files until rebuilt from the canonical templates in `__docs__/deployment/three-product-environment-setup.md`.
  6. Redeploy only through the approved Vercel workflow for the active session.
- **Cost:** Free tier sufficient for launch (100GB bandwidth, 10k serverless function invocations/day)

---

### Tier 2: Required Production Monitoring (P1 — Verify Before Launch)

These provide production visibility and alerting. Configure and verify the
required production monitors before launch; do not defer them to post-launch.

#### 4. Sentry — Error Tracking

- **What to create:** 2 projects (dev + prod)
- **Where:** https://sentry.io → Projects → Create Project
- **Steps:**
  1. Create organization (if not exists)
  2. Create project "javascript-nextjs-dev" (for dev errors)
  3. Create project "javascript-nextjs" (for prod errors)
  4. Copy DSN from each project settings
- **Env vars:** root app `NEXT_PUBLIC_SENTRY_DSN`; Firebase Functions project-local `SENTRY_DSN`
- **Root app runtime rule:** browser, server, and edge reuse one `NEXT_PUBLIC_SENTRY_DSN`. Vercel environment and branch scope select the QA or production value. If it is absent, root app Sentry stays disabled.
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

#### 6. SMTP — Lifecycle Emails

- **QA:** A controlled Workspace SMTP relay or app password may be used for
  low-volume delivery testing.
- **Production:** Use an approved transactional sender or controlled Workspace
  relay with a product sender such as `system@menulist.ai`. Do not use a personal
  Gmail inbox or personal account password.
- **Where:** Your approved SMTP provider or Google Workspace Admin
- **Steps:**
  1. Verify the sending domain's SPF, DKIM, and DMARC records.
  2. Create separate QA and production credentials or provider streams.
  3. Store the QA values in `menulist-qa` first and prove delivery.
  4. Store production values only after QA evidence and explicit production approval.
- **Env vars:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **Note:** Add the target-specific values to Firebase Functions secrets for Cloud Functions email sending.
- **Feature flag:** `ENABLE_LIFECYCLE_MESSAGING: true`

#### 7. Upstash Redis — Rate Limiting (Already Have)

- **What you have:** Database created, URL + token in .env files
- **Required structure:** One MenuList QA database and one separate MenuList production database.
- **Where:** https://console.upstash.com
- **Steps (if creating new):**
  1. Create new database
  2. Copy REST URL and REST Token
- **Env vars:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Cost:** Free tier — 10,000 requests/day
- **Note:** Do not share the database or token across QA and production.

---

### Tier 3: Optional Enhancements (P2 — Nice to Have)

#### 8. UptimeRobot — External Uptime Monitoring

- **What to create:** Free account + monitors
- **Where:** https://uptimerobot.com
- **Steps:**
  1. Sign up with your email
  2. Add monitors:
     - `https://menulist.ai` (main site)
     - `https://yourstore.menulist.online` (sample store)
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

#### 11-12. Retired Background-Image Providers

Unsplash, Pexels, and Pixabay search integrations are not part of the active MenuList runtime. Do not create provider accounts or configure provider API keys for them.

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
- Uses the environment-scoped `NEXT_PUBLIC_SENTRY_DSN`

---

### Account Summary Table

| #   | Service              | Account Type          | Cost            | Priority | Feature Flag                 |
| --- | -------------------- | --------------------- | --------------- | -------- | ---------------------------- |
| 1   | Firebase QA Project Access | Confirm `menulist-qa` and `neelvara-answerlattice-qa` access | Existing project access | P0       | N/A                          |
| 2   | Razorpay Live        | Switch to live mode   | Per transaction | P0       | N/A                          |
| 3   | Vercel               | Configure env scopes  | Free tier       | P0       | N/A                          |
| 4   | Sentry               | Create 2 projects     | Free            | P1       | `ENABLE_SENTRY`              |
| 5   | Telegram Bot         | Create via @BotFather | Free            | P1       | `ENABLE_OPS_ALERTS`          |
| 6   | SMTP                 | QA test sender + production transactional sender | Provider plan | P1 | `ENABLE_LIFECYCLE_MESSAGING` |
| 7   | Upstash              | Separate QA and production databases | Provider plan | P1 | `ENABLE_RATE_LIMITING` |
| 8   | UptimeRobot          | Sign up               | Free            | P2       | N/A                          |
| 9   | reCAPTCHA v3         | Create site           | Free            | P2       | `ENABLE_APP_CHECK`           |
| 10  | GA4 Service Account  | Verify access         | Free            | P2       | N/A                          |
| 13  | Clarity              | Verify project access | Free            | P2       | N/A                          |
| 13B | Plausible Cloud      | Create website sites  | Paid plan       | P2       | N/A                          |
| 14  | GCP Billing          | Budget alert          | Free            | P1       | N/A                          |

---

### Setup Checklist (Print & Tick Off)

**Before Launch (P0):**

- [ ] Configure MenuList production Firebase env vars for `menulist-prod`
- [ ] Configure Answerlattice production Firebase env vars for `neelvara-answerlattice-prod`
- [ ] Confirm local/preview Firebase env vars for `menulist-qa` and `neelvara-answerlattice-qa`
- [ ] Get Razorpay live API keys
- [ ] Configure Vercel QA env vars only for Preview branch `staging`, and production vars only for Production
- [ ] Confirm every `menulist.digital` host is `noindex`, serves disallow-all `robots.txt`, and publishes no sitemap
- [ ] Create the maintenance calendar for monthly access/secret review, quarterly key revocation/rotation review, and annual domain/billing/recovery review

**Before Production Launch (P1):**

- [ ] Create Sentry dev + prod projects
- [ ] Create Telegram bot, get bot token + chat ID
- [ ] Configure and verify the approved QA and production SMTP senders
- [ ] Configure Firebase Functions secrets for Telegram + SMTP
- [ ] Confirm monitoring feature flags and External Certification Runbook evidence (SAFE_MODE, Sentry, Ops Alerts, Health Monitor)

**Month 1 After Launch (P2):**

- [ ] Sign up UptimeRobot, add monitors
- [ ] Create reCAPTCHA v3 site key
- [ ] Verify GA4 service account access
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
| `functions/.env.menulist-prod.example` | MenuList production Functions non-secret template | No, placeholder template |

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

For the current work, follow `__docs__/deployment/menulist-staging-qa-setup.md`
first. Use `__docs__/deployment/three-product-environment-setup.md` only as the
shared portfolio reference. This environment guide is a companion overview.

### Vercel Env Handoff

- Preview/local key checklist: `.env.staging.example`; Vercel QA values are
  restricted to the exact `staging` Git branch
- Production key checklist: `.env.production.example`
- Do not copy `.env.local` or `.env.prod` wholesale into Vercel.
- Vercel deploys still require explicit approval in the active session.

### Firebase Functions Secret Handoff

- Configure MenuList QA secrets first with commands that include `--project menulist-qa`.
- Use `__docs__/deployment/three-product-environment-setup.md` for the current full secret list.
- Repeat for `--project menulist-prod` only after QA evidence and explicit production secret approval.
- Secret setup alone does not certify deployed Functions; Gate 1 in the External Certification Runbook still requires local preflight and scoped deploy evidence.

---

## Version History

| Version | Date           | Changes                                                                 |
| ------- | -------------- | ----------------------------------------------------------------------- |
| 1.2     | July 11, 2026  | Added the incident response runbook; corrected SAFE_MODE scope and the already-implemented startup environment/pre-deploy source gates |
| 1.0     | March 22, 2026 | Initial guide — ChatGPT validation + codebase audit                     |
| 1.1     | March 22, 2026 | Added complete third-party account creation guide + cross-check summary |
| 1.3     | August 13, 2026 | Aligned MenuList Gemini env guidance to shared slots 1-3 plus one isolated extraction credential |
