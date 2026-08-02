# MenuList Staging QA Setup Guide

> Status: first execution guide
> Scope: MenuList local plus staging only
> Last updated: August 1, 2026
> Launch boundary: this guide does not approve production deployment. Finish this MenuList QA setup, verify it end to end, then create a separate MenuList production guide.

This is the dedicated setup file for **MenuList staging/QA**. Follow only this
file first. Do not set up Answerlattice, CampaignCue, SignalDesk, Neelvara, or
MyCodex until MenuList QA is live and verified.

## Final Domain Contract Used By This Guide

| Domain | Purpose | Env |
| --- | --- | --- |
| `qa.menulist.digital` | MenuList QA/staging app, owner/staff authenticated app, local/staging shared runtime values | Staging/local shared |
| `*.qa.menulist.digital` | QA tenant test links, for example `abc.qa.menulist.digital` | Staging/local shared |
| `menulist.digital` + `www` | Redirect to `menulist.ai` or a noindex internal access page; not a product/public site | Not product/public |
| `menulist.ai` | Main MenuList marketing, SEO, and production app shell | Production, not touched here |
| `app.menulist.ai` | Owner/staff authenticated app | Production, not touched here |
| `*.menulist.online` | Production customer public menu/OBP links, for example `abc.menulist.online` | Production, not touched here |
| `menulist.online` + `www` | 301 redirect to `menulist.ai` | Production redirect, not touched here |

## Decisions For This First Setup

| Area | MenuList QA decision |
| --- | --- |
| Environment | local and staging share QA values |
| Domain | `qa.menulist.digital` |
| QA tenant wildcard | `*.qa.menulist.digital` |
| Firebase project | `menulist-qa` |
| Vercel project | one shared repo project, Preview/Staging env only |
| Production | not touched in this guide |
| Other products | not touched in this guide |
| MyCodex | not used; MyCodex remains static/no DB and has no `menulist.digital` dependency |
| SignalDesk | not part of MenuList QA setup; SignalDesk remains under its dedicated `signaldesk.menulist.online` contract |
| MenuList env naming | use `MENULIST_*` for server-side MenuList values and `NEXT_PUBLIC_MENULIST_*` for browser values |

Important Next.js rule: browser-exposed variables must still start with
`NEXT_PUBLIC_`. So the public MenuList prefix is `NEXT_PUBLIC_MENULIST_*`, not
`MENULIST_NEXT_PUBLIC_*`.

## Stop Rules

Stop and fix the setup before continuing if:

- Firebase project id `menulist-qa` is unavailable.
- Firebase Console suggests a suffixed id such as `menulist-qa-12345`.
- Vercel asks you to configure MenuList QA on `menulist.online`,
  `www.menulist.online`, `menulist.ai`, or `app.menulist.ai`.
- You do not have the real owner Google/Firebase/Vercel account.
- A non-Firebase provider asks for production verification, live mode, or live
  billing. Firebase/Google Cloud billing for `menulist-qa` is allowed only
  when it is required for QA Functions/Storage and belongs to the company owner
  account.
- You are about to paste a real secret into this document, chat, git, or a
  screenshot.

## Live Execution Checklist - MenuList QA Only

Use this checklist while doing the setup. When you finish something, tell Codex
the checklist id, for example `QA-A01 done` or `QA-F04 blocked`, and Codex will
mark the item here before guiding the next step.

Do not paste secret values into this file or chat. For secret-related items,
mark completion only after the value is stored in the password vault, local
ignored env file, Vercel Preview env, or Firebase Secret Manager as instructed.

Status rules:

- `[ ]` means pending.
- `[x]` means completed and verified.
- If a step is intentionally not used for this QA pass, leave `[ ]` and write
  `Skipped intentionally` in the notes when Codex updates the row.
- Do not mark a provider complete just because an account exists. Mark it
  complete only when the QA key/value is created, stored, and wired where this
  guide says.

### Phase A - Owner Access And Safety

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-A01 | Password vault exists for MenuList QA setup | Password manager | Vault can store registrar, Google, Firebase, Vercel, provider credentials, and recovery codes |
| [ ] | QA-A02 | Registrar owner login confirmed | Registrar account | You can access the account that owns `menulist.digital` |
| [ ] | QA-A03 | Google/Firebase owner login confirmed | Google account and Firebase Console | You can access or create `menulist-qa` from the owner account |
| [ ] | QA-A04 | Vercel owner/team login confirmed | Vercel dashboard | You can access the single Vercel project for this repo |
| [ ] | QA-A05 | MFA enabled and recovery codes stored | Registrar, Google, Vercel, providers | No setup depends on a weak or disposable login |
| [ ] | QA-A06 | Secret sharing rule accepted | This guide and password vault | No real secret will be pasted into docs, chat, screenshots, or git |

### Phase B - Domain And DNS

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-B01 | `menulist.digital` ownership confirmed | Registrar DNS screen | Domain is owned in the correct account |
| [ ] | QA-B02 | `menulist.digital` auto-renew confirmed | Registrar billing/domain settings | Auto-renew is on and payment method is valid |
| [ ] | QA-B03 | No extra domain selected | Registrar and Vercel | No production, SignalDesk, MyCodex, Answerlattice, or CampaignCue domain is used in this pass |
| [ ] | QA-B04 | `qa.menulist.digital` added to Vercel project | Vercel Project -> Domains | Vercel shows exact DNS records for `qa.menulist.digital` |
| [ ] | QA-B05 | `*.qa.menulist.digital` added to Vercel project if Vercel allows wildcard mapping | Vercel Project -> Domains | Vercel shows exact DNS records for QA tenant subdomains |
| [ ] | QA-B06 | `menulist.digital` and `www.menulist.digital` redirect/noindex decision recorded | Vercel Project -> Domains/DNS | Apex is not serving product content |
| [ ] | QA-B07 | DNS records copied exactly from Vercel | Registrar DNS screen | Registrar DNS matches Vercel instructions exactly |
| [ ] | QA-B08 | Vercel domain validation complete | Vercel Project -> Domains | `qa.menulist.digital` and the QA wildcard are valid |

### Phase C - Firebase Project And Services

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-C01 | Firebase project id checked before creation | Firebase Console | Exact id `menulist-qa` is available or already exists |
| [ ] | QA-C02 | Firebase project `menulist-qa` exists | Firebase Console | Project URL is `https://console.firebase.google.com/project/menulist-qa/overview` |
| [ ] | QA-C03 | Firebase billing/account ownership confirmed | Firebase and Google Cloud billing | Project belongs to the company owner account and required billing is attached if needed |
| [ ] | QA-C04 | Firestore enabled in Native mode | Firebase Console -> Firestore Database | Firestore exists only in `menulist-qa` for this pass |
| [ ] | QA-C05 | Firebase Auth enabled | Firebase Console -> Authentication | Required MenuList sign-in providers are enabled |
| [ ] | QA-C06 | Firebase Storage enabled | Firebase Console -> Storage | Storage bucket belongs to `menulist-qa` |
| [ ] | QA-C07 | MenuList QA Web app created | Firebase Project Settings -> General | Web app config values are available |
| [ ] | QA-C08 | Firebase authorized domains added | Firebase Auth -> Settings -> Authorized domains | `localhost`, `qa.menulist.digital`, and any tested `*.qa.menulist.digital` host are listed |
| [ ] | QA-C09 | Service account values stored securely | Firebase Project Settings -> Service accounts | Admin SDK project id, client email, and private key are stored in the password vault |
| [ ] | QA-C10 | Temporary service account JSON removed | Local machine | No downloaded service account JSON remains outside the vault |
| [ ] | QA-C11 | Production Firebase not touched | Firebase Console | No setup work is done in project id `menulist` |

### Phase D - Google OAuth

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-D01 | OAuth consent configured under company identity | Google Cloud Console -> OAuth consent | Consent screen uses the correct owner/company account |
| [ ] | QA-D02 | Web OAuth client created for MenuList QA | Google Cloud Console -> Credentials | Client id and secret exist for QA usage |
| [ ] | QA-D03 | Authorized JavaScript origins added | OAuth client settings | `http://localhost:3000`, `https://qa.menulist.digital` |
| [ ] | QA-D04 | Authorized redirect URIs added | OAuth client settings | `http://localhost:3000/api/auth/callback/google`, `https://qa.menulist.digital/api/auth/callback/google` |
| [ ] | QA-D05 | OAuth client id/secret stored securely | Password vault | Values are ready for local env and Vercel Preview env |

### Phase E - Required QA Provider Values

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-E01 | `NEXTAUTH_SECRET` generated | Local terminal and password vault | 32-byte secret is stored, not pasted into docs/chat |
| [ ] | QA-E02 | `MENULIST_OWNER_REFERRAL_TOKEN_SECRET` generated | Local terminal and password vault | 32-byte base64url secret is stored before owner referral is enabled |
| [ ] | QA-E03 | MenuList staging Gemini primary and rotation keys created | Google AI Studio | QA keys exist and are stored as `MENULIST_GEMINI_AI_KEY`, `GEMINI_AI_KEY`, and Firebase-declared rotation names `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, `GEMINI_AI_KEY_4` |
| [ ] | QA-E04 | Upstash staging Redis created | Upstash Console | REST URL/token exist and are stored for QA only |
| [ ] | QA-E05 | Razorpay Test Mode keys available | Razorpay Dashboard -> Test Mode | `rzp_test_` key id, key secret, and test webhook secret are stored |
| [ ] | QA-E06 | Revalidation secret generated | Password vault | Same QA value can be used in Vercel and Firebase Function secret |
| [ ] | QA-E07 | GCP budget webhook secret generated if budget alerts are configured | Google Cloud billing and password vault | QA budget webhook secret is stored or intentionally skipped |

Provider console links for this phase:

- Google AI Studio API keys: https://aistudio.google.com/apikey
- Upstash Console: https://console.upstash.com/
- Razorpay Dashboard: https://dashboard.razorpay.com/
- Google Cloud Billing: https://console.cloud.google.com/billing

Gemini rotation note: current MenuList Functions targets declare
`GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and `GEMINI_AI_KEY_4`. Prefer separate
real failover keys. If a slot temporarily uses the same Google account/provider
value as the primary key, record it in your vault as a rotate-later placeholder;
do not treat duplicate values as extra quota.

### Phase F - Optional QA Provider Values

These can be skipped for the first MenuList QA boot if the matching feature is
not being tested. If skipped, do not create fake values.

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-F01 | Sentry staging project/environment created if needed | Sentry dashboard | Server/browser DSNs are stored or skipped intentionally |
| [ ] | QA-F02 | reCAPTCHA/App Check staging registration created if needed | reCAPTCHA Admin and Firebase App Check | `qa.menulist.digital` is registered, monitor mode only unless separately approved |
| [ ] | QA-F03 | Telegram staging alert bot/chat created if needed | BotFather and Telegram | Bot token/chat id are stored or skipped intentionally |
| [ ] | QA-F04 | SMTP staging sender configured if needed | Workspace or SMTP provider | SMTP host/port/user/pass are stored or skipped intentionally |
| [ ] | QA-F05 | WhatsApp staging values configured if needed | Meta dashboard | Phone number id/token/app secret/verify token are stored or skipped intentionally |
| [ ] | QA-F06 | UptimeRobot staging monitors added after DNS is valid | UptimeRobot | Monitor exists for `https://qa.menulist.digital`, or skipped intentionally |
| [ ] | QA-F07 | GA/Clarity/Plausible staging analytics configured if approved | Analytics provider dashboards | Staging ids are stored or skipped intentionally |

Optional provider console links:

- Sentry: https://sentry.io/
- reCAPTCHA Admin: https://www.google.com/recaptcha/admin/create
- Firebase App Check for MenuList QA:
  https://console.firebase.google.com/project/menulist-qa/appcheck
- Telegram BotFather: https://t.me/BotFather
- Meta Developers: https://developers.facebook.com/apps/
- UptimeRobot: https://uptimerobot.com/dashboard

### Phase G - Local And Vercel Preview Env

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-G01 | Local ignored env file prepared from `.env.staging.example` | `.env.local` or approved ignored local env | Local values point to `menulist-qa` and `qa.menulist.digital` |
| [ ] | QA-G02 | Vercel Preview env created | Vercel Project -> Settings -> Environment Variables -> Preview | QA values are entered only in Preview/Staging scope |
| [ ] | QA-G03 | Runtime URL env values set | Local env and Vercel Preview env | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEPLOYMENT_URL`, `NEXT_PUBLIC_PLATFORM_DOMAIN`, and `NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN` use `qa.menulist.digital` |
| [ ] | QA-G04 | Firebase public canonical keys set | Local env and Vercel Preview env | `NEXT_PUBLIC_MENULIST_FIREBASE_*` values point to `menulist-qa` |
| [ ] | QA-G05 | Firebase public compatibility aliases set | Local env and Vercel Preview env | `NEXT_PUBLIC_FIREBASE_*` values exactly match canonical MenuList values |
| [ ] | QA-G06 | Firebase admin canonical keys set | Local env and Vercel Preview env | `MENULIST_FIREBASE_*` values point to `menulist-qa` |
| [ ] | QA-G07 | Firebase admin compatibility aliases set | Local env and Vercel Preview env | `FIREBASE_*` values exactly match canonical MenuList values |
| [ ] | QA-G08 | Gemini canonical key and compatibility alias set | Local env and Vercel Preview env | `MENULIST_GEMINI_AI_KEY` and `GEMINI_AI_KEY` use the same QA key |
| [ ] | QA-G09 | Razorpay Test Mode keys set | Local env and Vercel Preview env | Private and public Razorpay keys start with `rzp_test_` |
| [ ] | QA-G10 | Upstash and revalidation values set | Local env and Vercel Preview env | QA Redis and revalidation secrets are present |
| [ ] | QA-G11 | Optional provider values handled | Local env and Vercel Preview env | Optional providers are either real QA values or intentionally blank |
| [ ] | QA-G12 | Private key newlines escaped for Vercel | Vercel Preview env | `MENULIST_FIREBASE_PRIVATE_KEY` and `FIREBASE_PRIVATE_KEY` are valid multiline-safe values |
| [ ] | QA-G13 | Production env not touched | Vercel Project -> Environment Variables -> Production | No production values are changed from this guide |
| [ ] | QA-G14 | Other product env setup skipped | Vercel and local env | No real Answerlattice, CampaignCue, SignalDesk, Neelvara, or MyCodex setup is done in this pass |

Required runtime values for this guide:

```env
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://qa.menulist.digital
NEXT_PUBLIC_DEPLOYMENT_URL=https://qa.menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN=qa.menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=qa.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=qa.menulist.digital
NEXTAUTH_URL=https://qa.menulist.digital
```

### Phase H - Firebase Functions Secrets And Metadata

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-H01 | Firebase CLI login confirmed | Local terminal | `firebase projects:list` shows `menulist-qa` |
| [ ] | QA-H02 | Required AI secrets set | Firebase Secret Manager for `menulist-qa` | `GEMINI_AI_KEY`, `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and `GEMINI_AI_KEY_4` exist because current deploy targets declare them |
| [ ] | QA-H03 | Required Upstash secrets set | Firebase Secret Manager for `menulist-qa` | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist |
| [ ] | QA-H04 | Required Razorpay Test Mode Function secrets set | Firebase Secret Manager for `menulist-qa` | `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` use test-mode values; `RAZORPAY_WEBHOOK_SECRET` stays in local/Vercel env for the Next.js webhook route |
| [ ] | QA-H05 | Required WhatsApp, monitoring, and revalidation secrets handled for current declared targets | Firebase Secret Manager for `menulist-qa` | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `SENTRY_DSN`, and `REVALIDATION_SECRET` exist |
| [ ] | QA-H06 | Optional Function secrets handled | Firebase Secret Manager for `menulist-qa` | SMTP and Telegram are real QA values or intentionally skipped until a selected deploy target declares/uses them |
| [ ] | QA-H07 | Secret metadata checked without printing values | Google Secret Manager metadata command | Secret names exist, values are never displayed |
| [ ] | QA-H08 | Production Functions secrets not touched | Firebase/Google Secret Manager | No secrets are set in project id `menulist` |

### Phase I - Firebase QA Infrastructure Deploy

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-I01 | Firebase project pre-check passed | Local terminal | `firebase projects:list` includes exact `menulist-qa` |
| [ ] | QA-I02 | Firestore rules/indexes and Storage rules deployed | Local terminal | Deploy command targets `--project menulist-qa --config firebase.json` only |
| [ ] | QA-I03 | MenuList QA Functions bundle deployed only after required declared secrets exist | Local terminal | Maintained `functions` script deploys the scoped MenuList QA function targets to `menulist-qa` only |
| [ ] | QA-I04 | Deploy logs reviewed | Local terminal and Firebase Console | No IAM, billing, Secret Manager, or project-not-found errors remain |
| [ ] | QA-I05 | Production Firebase deploy not run | Local terminal history and Firebase Console | No command targets `--project menulist` |

### Phase J - Vercel Preview/Staging Deploy

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-J01 | Preview env reviewed before deploy | Vercel Project -> Environment Variables -> Preview | Required MenuList QA env values are present |
| [ ] | QA-J02 | Vercel Preview/Staging deployment triggered | Vercel dashboard or approved git workflow | Deployment is not a production deployment |
| [ ] | QA-J03 | Deployment attached to `qa.menulist.digital` | Vercel Project -> Deployments and Domains | `https://qa.menulist.digital` serves the staging deployment |
| [ ] | QA-J04 | Runtime project checked from logs/env evidence | Vercel logs or app diagnostics | Runtime points to `menulist-qa`, not `menulist` |
| [ ] | QA-J05 | Vercel Production not touched | Vercel dashboard | No production deploy or production env edit happens in this guide |

### Phase K - MenuList QA Smoke Test

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-K01 | `https://qa.menulist.digital` opens | Browser | MenuList QA app loads |
| [ ] | QA-K02 | `https://qa.menulist.digital/api/version` opens | Browser | Version endpoint responds from the staging deployment |
| [ ] | QA-K03 | Staging owner sign-in works | Browser and Firebase Auth | Test owner can authenticate through QA OAuth/Auth setup |
| [ ] | QA-K04 | Test business/store can be created or loaded | Browser | Basic owner workflow is usable |
| [ ] | QA-K05 | QA tenant link opens | Browser | `https://<test-slug>.qa.menulist.digital` resolves to the test public menu/OBP |
| [ ] | QA-K06 | Firestore writes verified in `menulist-qa` | Firebase Console -> Firestore | Test data appears only in `menulist-qa` |
| [ ] | QA-K07 | Storage writes verified in `menulist-qa` bucket | Firebase Console -> Storage | Test uploads appear only in QA bucket |
| [ ] | QA-K08 | No production writes observed | Firebase Console -> project `menulist` | Production data remains untouched |
| [ ] | QA-K09 | Vercel logs checked | Vercel deployment logs | No missing-env, auth callback, Firebase project, or server secret errors remain |
| [ ] | QA-K10 | Optional monitoring checked if configured | Sentry/UptimeRobot/analytics dashboards | QA events appear only in staging provider projects |
| [ ] | QA-K11 | Explicit no-go checks confirmed | This guide and dashboards | No Answerlattice, CampaignCue, SignalDesk, MyCodex, production, `menulist.ai`, or `menulist.online` production setup was done |
| [ ] | QA-K12 | Final MenuList QA status shared with Codex | Chat plus this file | Codex marks completed items and records blockers before moving to production guide |

## Step-By-Step Setup Order

### Step 1: Confirm Owner Access

Where:

- Password manager.
- Registrar account.
- Google account.
- Vercel dashboard: https://vercel.com/dashboard
- Firebase Console: https://console.firebase.google.com/

What to do:

1. Confirm the owner password vault exists.
2. Confirm the registrar login for `menulist.digital` is stored.
3. Confirm the Google owner/admin login is stored.
4. Confirm the Vercel owner/team login is stored.
5. Turn on MFA everywhere.
6. Store recovery codes in the password vault.

Expected result:

- You can access registrar, Google/Firebase, and Vercel from owner-controlled
  accounts.
- No setup depends on a personal disposable login.

### Step 2: Configure `qa.menulist.digital`

Where:

- Registrar DNS screen.
- Vercel Project -> Settings -> Domains.
- Vercel custom domain docs: https://vercel.com/docs/domains

What to do:

1. Confirm `menulist.digital` is owned in the registrar account.
2. Confirm auto-renew is on.
3. In Vercel, add `qa.menulist.digital`.
4. Add `*.qa.menulist.digital` if Vercel gives wildcard DNS instructions for tenant tests.
5. Copy DNS records exactly from Vercel into the registrar.
6. Do not attach `menulist.online`, `www.menulist.online`, `menulist.ai`, or `app.menulist.ai` to this staging flow.
7. Decide whether `menulist.digital` and `www.menulist.digital` redirect to `menulist.ai` or show a noindex internal access page.

Expected result:

- `qa.menulist.digital` is the only MenuList QA app host.
- QA tenant tests use `*.qa.menulist.digital`.
- The `menulist.digital` apex is not a public product website.

### Step 3: Create Or Confirm Firebase Project `menulist-qa`

Where:

- Firebase Console: https://console.firebase.google.com/
- Firebase project docs: https://firebase.google.com/docs/projects/learn-more

What to do:

1. Search for exact Firebase project id `menulist-qa`.
2. If it exists under the owner/company account, use it.
3. If it does not exist, create exactly `menulist-qa`.
4. Do not accept a suffixed id.
5. Enable Firestore in Native mode.
6. Enable Firebase Auth.
7. Enable Storage.
8. Create a MenuList Web app and store the config values in the password vault.

Expected result:

- Firebase project id is exactly `menulist-qa`.
- No production project is touched.

### Step 4: Add Firebase Auth Domains

Where:

- Firebase Console -> `menulist-qa` -> Authentication -> Settings -> Authorized domains.

What to add:

- `localhost`
- `qa.menulist.digital`
- Any exact QA tenant host you will test if Firebase requires it, for example
  `demo.qa.menulist.digital`.

Expected result:

- QA sign-in can complete on local and staging.
- Production domains are not required in `menulist-qa` for this first pass.

### Step 5: Configure Google OAuth For QA

Where:

- Google Cloud Console: https://console.cloud.google.com/apis/credentials

Authorized JavaScript origins:

- `http://localhost:3000`
- `https://qa.menulist.digital`

Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://qa.menulist.digital/api/auth/callback/google`

Expected result:

- OAuth client id and secret are stored for QA use.
- Production OAuth client is not changed.

### Step 6: Prepare Env Values

Where:

- Local ignored env file.
- Vercel Project -> Settings -> Environment Variables -> Preview.

What to do:

1. Start from `.env.staging.example`.
2. Fill real QA values only.
3. Keep production values out of this file.
4. Use full MenuList env names: `MENULIST_*` and `NEXT_PUBLIC_MENULIST_*`.
5. Keep compatibility aliases only where the existing env template lists them.

Expected result:

- Local and Vercel Preview env use `menulist-qa`.
- Runtime URLs use `qa.menulist.digital`.
- Generated QA tenant links use `*.qa.menulist.digital`.

### Step 7: Set Firebase Functions Secrets

Where:

- Local terminal with Firebase CLI.
- Google Secret Manager: https://console.cloud.google.com/security/secret-manager

Use only project `menulist-qa`.

Required secret names for this QA pass:

- `GEMINI_AI_KEY`
- `GEMINI_AI_KEY_2`
- `GEMINI_AI_KEY_3`
- `GEMINI_AI_KEY_4`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SENTRY_DSN`
- `REVALIDATION_SECRET`

Optional only if enabled:

- SMTP secrets.
- Telegram alert secrets.
- `GCP_BUDGET_WEBHOOK_SECRET` for `gcpBudgetAlertWebhook`.

`RAZORPAY_WEBHOOK_SECRET` is still required in local and Vercel Preview env for
the Next.js Razorpay webhook route, but it is not a Firebase Functions Secret
Manager secret in the current MenuList Functions code.

Run these commands and enter the real QA value when the Firebase CLI prompts
for it:

```bash
firebase functions:secrets:set GEMINI_AI_KEY --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_2 --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_3 --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_4 --project menulist-qa
firebase functions:secrets:set UPSTASH_REDIS_REST_URL --project menulist-qa
firebase functions:secrets:set UPSTASH_REDIS_REST_TOKEN --project menulist-qa
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID --project menulist-qa
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN --project menulist-qa
firebase functions:secrets:set WHATSAPP_APP_SECRET --project menulist-qa
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN --project menulist-qa
firebase functions:secrets:set RAZORPAY_KEY_ID --project menulist-qa
firebase functions:secrets:set RAZORPAY_KEY_SECRET --project menulist-qa
firebase functions:secrets:set SENTRY_DSN --project menulist-qa
firebase functions:secrets:set REVALIDATION_SECRET --project menulist-qa
```

If you later deploy `gcpBudgetAlertWebhook`, also set:

```bash
firebase functions:secrets:set GCP_BUDGET_WEBHOOK_SECRET --project menulist-qa
```

If a selected Firebase deploy target reports a missing SMTP, Telegram, or
budget-alert secret, stop and set only the missing declared QA secret in
`menulist-qa`. Do not switch to production and do not add fake placeholder
values.

Check secret names without printing values:

```bash
gcloud secrets list --project menulist-qa --format='value(name)'
```

Never run a command that prints secret values, such as `functions:secrets:access`,
while sharing terminal output in chat or screenshots.

Expected result:

- Secret metadata exists in `menulist-qa`.
- Secret values are never printed in terminal output, docs, or chat.

### Step 8: Deploy Firebase QA Infrastructure

Where:

- Local terminal.

Pre-check:

```bash
firebase projects:list
```

Required deploy target:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive
```

Validate the local deploy boundary before deploying Functions:

```bash
npm run verify:functions-deploy-preflight
npm --prefix functions run build
```

Deploy Functions only after required declared secrets exist:

```bash
npm --prefix functions run deploy:menulist-qa
```

Expected result:

- Rules/indexes/storage deploy to `menulist-qa`.
- Function deploy targets only the maintained MenuList QA bundle:
  `processMenuImages`, `processMenuImagesJob`, `menulistMaintenanceScheduler`,
  `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`,
  `triggerStoreNightlyScheduler`, `messagingOnboarding`,
  `backfillStoresSummary`, `mapsPlaceCheck`, and `verifyMenuPublish`.
- No command targets `menulist`.

### Step 9: Deploy Vercel Preview/Staging

Where:

- Vercel dashboard: https://vercel.com/dashboard
- The existing single Vercel project for this repository.

What to do:

1. Confirm Preview env values are present.
2. Trigger the approved Preview/Staging deployment.
3. Confirm `qa.menulist.digital` is assigned to the deployment.
4. Do not trigger or promote Production from this guide.

Expected result:

- `https://qa.menulist.digital` serves the MenuList QA app.
- Logs show `menulist-qa` runtime values.

### Step 10: Smoke Test MenuList QA

Open:

- `https://qa.menulist.digital`
- `https://qa.menulist.digital/api/version`
- `https://<test-slug>.qa.menulist.digital`

Check:

- Sign-in works.
- Test store workflow works.
- Generated public link uses `https://<slug>.qa.menulist.digital`.
- Firestore writes appear only in `menulist-qa`.
- Storage writes appear only in the `menulist-qa` bucket.
- Production project `menulist` remains unchanged.

## Final QA Completion Gate

MenuList QA is complete only when:

- `qa.menulist.digital` is live.
- QA tenant wildcard links work.
- Auth, Firestore, Storage, and required provider keys work against `menulist-qa`.
- No production Firebase, Vercel Production, `menulist.ai`, `app.menulist.ai`, or
  `menulist.online` setup was touched.
- You report the completed checklist ids back to Codex.

After this gate passes, create the separate MenuList production setup guide and
repeat the process for production domains and production provider keys.
