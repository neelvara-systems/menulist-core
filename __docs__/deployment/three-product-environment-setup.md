# Product Staging and Production Setup

> Status: setup runbook
> Scope: MenuList, Answerlattice, CampaignCue, MyCodex
> Last updated: June 20, 2026

This is the one-time setup path for fresh staging and production infrastructure. The repo is one shared Next.js/Vercel app with product-specific routing. MenuList, Answerlattice, and CampaignCue have product-specific Firebase targets. MyCodex is static/private documentation with no Firebase project. Do not create separate code deployments unless the deployment matrix is changed first.

## Source Of Truth

| Product | Staging URL | Staging Firebase | Production URL | Production Firebase |
| --- | --- | --- | --- | --- |
| MenuList | `https://menulist.online` | `ecomsai` | `https://menulist.ai` | `menulist` |
| Answerlattice | `https://ecomsai.com` | `answerlattice-qa` | `https://answerlattice.com` | `answerlattice` |
| CampaignCue | `https://campaigncue.menulist.online` | `campaigncue-qa` | `https://campaigncue.ai` | `campaigncue` |
| MyCodex | `https://menulist.digital` | none | `https://menulist.digital` | none |

These project ids are enforced by `src/constants/deploymentTargets.ts` and `src/lib/env/validateEnv.ts`. MyCodex intentionally has an empty Firebase project id in the deployment matrix. If a Firebase project id is unavailable, update those source files and the docs before provisioning a different id.

## Files Prepared

| File | Use |
| --- | --- |
| `.env.staging.example` | Vercel Preview/Staging environment variable checklist |
| `.env.production.example` | Vercel Production environment variable checklist |
| `functions/.env.ecomsai.example` | MenuList staging Functions non-secret env template |
| `functions/.env.menulist.example` | MenuList production Functions non-secret env template |
| `functions-answerlattice/.env.answerlattice-qa.example` | Answerlattice staging Functions non-secret env template |
| `functions-answerlattice/.env.answerlattice.example` | Answerlattice production Functions non-secret env template |

Real values belong in Vercel, Firebase Secret Manager, local ignored env files, or service-account downloads kept outside git. Never paste private keys or tokens into tracked docs.

## Naming Contract

Use full product names in environment variable keys. Do not create shorthand env keys such as `AL_FIREBASE_PROJECT_ID`, `CC_FIREBASE_PROJECT_ID`, `MC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_AL_*`, `NEXT_PUBLIC_CC_*`, or `NEXT_PUBLIC_MC_*`.

Correct env-key examples:

```env
NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa
ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa
NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID=campaigncue-qa
CAMPAIGNCUE_FIREBASE_PROJECT_ID=campaigncue-qa
MYCODEX_BASIC_AUTH_USER=<internal-docs-username>
MYCODEX_BASIC_AUTH_PASSWORD=<internal-docs-password>
MYCODEX_SESSION_SECRET=<generate-with-openssl-rand-base64-32>
```

`ML`, `AL`, `CC`, and `MC` are internal two-character product codes used in app data such as `pId`, product-account records, billing scopes, notification scopes, and product-scoped metadata. They are defined in `src/constants/product.ts`. CampaignCue uses `CC` as its internal product code and `campaigncue` as its runtime product slug. MyCodex uses `MC` as its reserved internal product code and `mycodex` as its runtime product slug. MyCodex sessions keep the slug, not `MC`, and MyCodex must not introduce Firebase env keys. Do not introduce `CC` or `MC` as env-key prefixes.

## Step 1: Create Firebase Projects

Create or confirm these Firebase projects:

| Product | Staging | Production |
| --- | --- | --- |
| MenuList | `ecomsai` | `menulist` |
| Answerlattice | `answerlattice-qa` | `answerlattice` |
| CampaignCue | `campaigncue-qa` | `campaigncue` |
| MyCodex | none | none |

For each Firebase-backed project:

1. Enable billing. Cloud Functions, Secret Manager validation, Cloud Tasks, and production monitoring can fail without billing.
2. Create a Web App and copy the client config values into the matching Vercel env scope.
3. Enable Firestore in Native mode.
4. Enable Cloud Storage for Firebase.
5. Enable Firebase Auth providers used by the app: Email/Password for credential login and any phone provider needed for OTP flows. Google OAuth itself is configured in Google Cloud and NextAuth.
6. Add authorized domains for that product and stage.
7. Create an Admin service account key only for Vercel server-side Admin SDK env vars. Do not commit the JSON file.
8. Set App Check only after the app works without enforcement. Start monitoring first, then enforce Firestore/Storage once reCAPTCHA domains and debug tokens are verified.

MenuList also needs a Realtime Database URL because the client config reads `NEXT_PUBLIC_FB_DATABASE_URL`.

MyCodex has no Firebase setup. It reads tracked documentation files through the Next.js app, protects access with private Basic Auth/session env vars, and stores reader state only in the browser on the current device.

## Step 2: Configure Firebase Auth And Google OAuth

In Google Cloud Console, create OAuth credentials for the shared app. Add JavaScript origins and redirect URIs for each active domain.

Staging origins:

- `https://menulist.online`
- `https://www.menulist.online`
- `https://ecomsai.com`
- `https://www.ecomsai.com`
- `https://campaigncue.menulist.online`

Production origins:

- `https://menulist.ai`
- `https://www.menulist.ai`
- `https://answerlattice.com`
- `https://www.answerlattice.com`
- `https://campaigncue.ai`
- `https://www.campaigncue.ai`

Redirect URI pattern:

```text
https://<domain>/api/auth/callback/google
```

Use the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel Preview and Production unless you intentionally want separate OAuth clients. MyCodex on `menulist.digital` does not use Firebase Auth or Google OAuth in the current static reader contract.

## Step 3: Configure Vercel

Use one Vercel project for the shared repo. Do not create separate Vercel projects for MenuList, Answerlattice, CampaignCue, or MyCodex unless the codebase is first changed to support product-specific deployments.

Recommended Vercel shape:

- One project connected to this Git repo.
- Production environment connected to the production branch and production domains.
- Staging as either a Vercel custom environment named `staging` with branch tracking, or as the Preview environment pinned to the staging branch/domain mapping.
- In staging, keep `NEXT_PUBLIC_ENV=preview` unless `src/constants/deploymentTargets.ts` is extended to treat `VERCEL_TARGET_ENV=staging` as its own deployment stage.

1. Add staging domains to the staging/custom environment or Preview branch mapping:
   - `menulist.online`
   - `www.menulist.online`
   - `ecomsai.com`
   - `www.ecomsai.com`
   - `campaigncue.menulist.online`
   - `menulist.digital`
2. Add production domains to the Production environment:
   - `menulist.ai`
   - `www.menulist.ai`
   - `answerlattice.com`
   - `www.answerlattice.com`
   - `campaigncue.ai`
   - `www.campaigncue.ai`
   - `menulist.digital`
   - `www.menulist.digital`
3. Copy `.env.staging.example` keys into Vercel with the staging/custom environment scope, or Preview scope if you are using Preview for staging.
4. Copy `.env.production.example` keys into Vercel with Production scope.
5. Keep `NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES` stage-local only:
   - Preview: `menulist.online,www.menulist.online`
   - Production: `menulist.ai,www.menulist.ai`
6. Add `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, and `MYCODEX_SESSION_SECRET` in both Vercel scopes because env validation requires them on Vercel.

The `.env.*.example` files are checklists, not runtime files for Vercel. Vercel reads the values from Project Settings for the target environment; local development can copy a template into an ignored `.env.local` or use `vercel env pull`.

Do not run a Vercel deploy from Codex unless explicitly requested in the current session. After env changes, trigger the redeploy from Vercel when you are ready.

## Step 4: Configure Product Firebase Env In Vercel

Preview scope must use:

- MenuList: `NEXT_PUBLIC_FIREBASE_PROJECT_ID=ecomsai`, `FIREBASE_PROJECT_ID=ecomsai`
- Answerlattice: `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa`, `ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa`
- CampaignCue: `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID=campaigncue-qa`, `CAMPAIGNCUE_FIREBASE_PROJECT_ID=campaigncue-qa`
- MyCodex: no Firebase project env; use `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, and `MYCODEX_SESSION_SECRET`

Production scope must use:

- MenuList: `NEXT_PUBLIC_FIREBASE_PROJECT_ID=menulist`, `FIREBASE_PROJECT_ID=menulist`
- Answerlattice: `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice`, `ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice`
- CampaignCue: `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID=campaigncue`, `CAMPAIGNCUE_FIREBASE_PROJECT_ID=campaigncue`
- MyCodex: no Firebase project env; use `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, and `MYCODEX_SESSION_SECRET`

Use escaped newlines for private keys in Vercel: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`.

## Step 5: Configure Firebase Function Secrets

Set secrets per Firebase project. Do not put secrets in tracked env files.

MenuList staging:

```bash
firebase functions:secrets:set GEMINI_AI_KEY --project ecomsai
firebase functions:secrets:set GEMINI_AI_KEY_2 --project ecomsai
firebase functions:secrets:set GEMINI_AI_KEY_3 --project ecomsai
firebase functions:secrets:set GEMINI_AI_KEY_4 --project ecomsai
firebase functions:secrets:set UPSTASH_REDIS_REST_URL --project ecomsai
firebase functions:secrets:set UPSTASH_REDIS_REST_TOKEN --project ecomsai
firebase functions:secrets:set RAZORPAY_KEY_ID --project ecomsai
firebase functions:secrets:set RAZORPAY_KEY_SECRET --project ecomsai
firebase functions:secrets:set SMTP_HOST --project ecomsai
firebase functions:secrets:set SMTP_PORT --project ecomsai
firebase functions:secrets:set SMTP_USER --project ecomsai
firebase functions:secrets:set SMTP_PASS --project ecomsai
firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project ecomsai
firebase functions:secrets:set TELEGRAM_CHAT_ID --project ecomsai
firebase functions:secrets:set GCP_BUDGET_WEBHOOK_SECRET --project ecomsai
firebase functions:secrets:set REVALIDATION_SECRET --project ecomsai
firebase functions:secrets:set SENTRY_DSN --project ecomsai
```

MenuList production: repeat the same commands with `--project menulist`.

Answerlattice staging:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project answerlattice-qa --config firebase-answerlattice.json
```

Answerlattice production:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project answerlattice --config firebase-answerlattice.json
```

CampaignCue currently has no Cloud Functions in this repo. Its secrets are Vercel Admin SDK env vars and future provider secrets only. MyCodex has no Cloud Functions and no Firebase secrets.

## Step 6: Configure Third-Party Services

| Service | Staging | Production | Notes |
| --- | --- | --- | --- |
| Gemini | Can share low-volume key | Prefer primary plus rotation keys | Functions support `GEMINI_AI_KEY_2` through `_4` |
| Upstash | Separate DB recommended | Separate DB required for clean ops | Used for rate limits and caches |
| Razorpay | Test mode keys | Live mode keys | Webhook secret must match each Razorpay dashboard |
| Sentry | Staging/dev project | Production project | Set browser and server DSNs |
| SMTP | Test sender or same Workspace account | Production sender | Use app password, not account password |
| Telegram | Staging alert chat or topic | Production alert chat | Keep noisy staging separate if possible |
| GA4 | Separate web stream recommended | Production web stream | Server GA service account can be shared read-only |
| Clarity | Staging optional | Production project | Code has fallback, but explicit env is cleaner |
| reCAPTCHA v3 | Staging key with staging domains | Production key with production domains | App Check enforcement comes after verification |
| WhatsApp Cloud API | Keep disabled unless testing real provider | Enable only with real Meta app and templates | Do not use dummy secrets to satisfy deploys |
| UptimeRobot | Optional monitors | Required monitors | No env vars; configure in dashboard |

## Step 7: Deploy Firebase Infrastructure

Only run these after projects, billing, env files, and secrets exist.

MenuList staging:

```bash
firebase deploy --project ecomsai --config firebase.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project ecomsai --config firebase.json --only functions
```

MenuList production:

```bash
firebase deploy --project menulist --config firebase.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project menulist --config firebase.json --only functions
```

Answerlattice staging:

```bash
firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only functions:answerlattice
```

Answerlattice production:

```bash
firebase deploy --project answerlattice --config firebase-answerlattice.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project answerlattice --config firebase-answerlattice.json --only functions:answerlattice
```

CampaignCue staging:

```bash
firebase deploy --project campaigncue-qa --config firebase-campaigncue.json --only firestore:rules,firestore:indexes,storage
```

CampaignCue production:

```bash
firebase deploy --project campaigncue --config firebase-campaigncue.json --only firestore:rules,firestore:indexes,storage
```

MyCodex: no Firebase deploy.

## Step 8: Seed Required First Data

Do this only after rules and auth are in place.

- MenuList: create platform owner user, tenant, store, subscription, one sample project/menu, `ops_config/system` with `SAFE_MODE=false`.
- Answerlattice: create platform owner user, tenant/store workspace, first support product/source set, public API key only if public API testing is planned.
- CampaignCue: create or sign in with a MenuList-linked owner account, then verify first workspace bootstrap. CampaignCue reads MenuList store context and writes CampaignCue workspace data to its own Firebase project.
- MyCodex: no seed data. Set the Vercel auth/session env vars, then verify the private reader login and local browser-only reader state.

## Step 9: Verification Order

Run lightweight checks before any deploy:

```bash
npm run verify:env-targets
npm run build:verify
npm run verify:campaigncue
npm run verify:answerlattice-runtime-truth
node scripts/verification/verify-mycodex-pwa-assets.js
```

After Vercel redeploy:

1. Open each product public domain.
2. Check `/api/version` on each active domain.
3. Confirm unauthenticated protected APIs return `401`, not a rewrite or generic 500.
4. Sign in through each owner app path.
5. Confirm MenuList writes invalidate public menu/OBP cache.
6. Confirm Answerlattice dashboard/widget uses the Answerlattice Firebase project for the stage.
7. Confirm CampaignCue workspace no longer returns `CAMPAIGNCUE_FIREBASE_UNAVAILABLE`.
8. Confirm MyCodex requires login on Vercel domains and does not require any Firebase env.

## Blocking Rules

- Do not relax Firestore or Storage rules for staging.
- Do not use production Razorpay keys in staging.
- Do not enable App Check enforcement until the web app successfully sends App Check tokens.
- Do not enable WhatsApp messaging onboarding with dummy secrets.
- Do not deploy Vercel from this repo unless explicitly requested.
- Do not create `MYCODEX_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_MYCODEX_FIREBASE_PROJECT_ID`, `MC_FIREBASE_PROJECT_ID`, or `NEXT_PUBLIC_MC_*` keys. MyCodex is static/no DB.
- If Firebase deploy fails with Secret Manager or billing errors, fix project billing/IAM before changing code.
