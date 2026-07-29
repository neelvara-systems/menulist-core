# MenuList Staging QA Setup Guide

> Status: first execution guide
> Scope: MenuList local plus staging only
> Last updated: July 29, 2026
> Launch boundary: this guide does not approve production deployment. Finish this MenuList QA setup, verify it end to end, then create a separate MenuList production guide.

This is the dedicated setup file for **MenuList staging/QA**. Follow only this
file first. Do not set up Answerlattice, CampaignCue, SignalDesk, Neelvara, or
MyCodex until MenuList QA is live and verified.

## Decisions For This First Setup

| Area | MenuList QA decision |
| --- | --- |
| Environment | local and staging share QA values |
| Domain | `menulist.online` |
| Firebase project | `menulist-qa` |
| Vercel project | one shared repo project, Preview/Staging env only |
| Production | not touched in this guide |
| Other products | not touched in this guide |
| MyCodex / `menulist.digital` | not used; domain dependency is discarded |
| SignalDesk | not part of MenuList QA setup; future SignalDesk should stay under `menulist.online` unless a later contract changes it |
| MenuList env naming | use `MENULIST_*` for server-side MenuList product values and `NEXT_PUBLIC_MENULIST_*` for public browser values |

Important Next.js rule: browser-exposed variables must still start with
`NEXT_PUBLIC_`. So the public MenuList prefix is `NEXT_PUBLIC_MENULIST_*`, not
`MENULIST_NEXT_PUBLIC_*`.

## Stop Rules

Stop and fix the setup before continuing if:

- Firebase project id `menulist-qa` is unavailable.
- Firebase Console suggests a suffixed id such as `menulist-qa-12345`.
- Vercel asks you to configure any domain other than `menulist.online` or
  `www.menulist.online` for this first setup.
- You do not have the real owner Google/Firebase/Vercel account.
- A provider asks for production verification or live billing.
- You are about to paste a real secret into this document, chat, git, or a
  screenshot.

## Step 1: Confirm Owner Access

Where:

- Password manager.
- Registrar account.
- Google account.
- Vercel dashboard: https://vercel.com/dashboard
- Firebase Console: https://console.firebase.google.com/

What to do:

1. Confirm the owner password vault exists.
2. Confirm the registrar login for `menulist.online` is stored.
3. Confirm the Google owner/admin login is stored.
4. Confirm the Vercel owner/team login is stored.
5. Turn on MFA everywhere.
6. Store recovery codes in the password vault.

Expected result:

- You can access registrar, Google/Firebase, and Vercel from owner-controlled
  accounts.
- No setup depends on a personal disposable login.

## Step 2: Confirm `menulist.online`

Where:

- Registrar DNS screen.
- Vercel project domains.

What to do:

1. Confirm `menulist.online` is owned in the registrar account.
2. Confirm auto-renew is on.
3. Confirm MFA is on for the registrar.
4. Do not buy a separate domain for this first QA setup.
5. Do not use `menulist.digital`.
6. Do not configure SignalDesk in this step.

Expected result:

- `menulist.online` is the only domain required for this MenuList QA pass.

## Step 3: Create Or Confirm Firebase Project `menulist-qa`

Where:

- Firebase Console: https://console.firebase.google.com/
- Firebase project docs: https://firebase.google.com/docs/projects/learn-more

What to do:

1. Open Firebase Console.
2. Click `Add project` only if `menulist-qa` does not already exist.
3. Enter the exact project id:
   ```text
   menulist-qa
   ```
4. Confirm the final project id before creating it.
5. Attach the company billing account if Firebase requires it for the services
   you enable.
6. Do not create `ecomsai`.
7. Do not create `menulist-ai`.
8. Do not create production project `menulist` yet from this guide.

Expected result:

- Firebase project `menulist-qa` exists.
- It is visible at https://console.firebase.google.com/project/menulist-qa/overview
- It belongs to the company Google/Firebase owner account.

## Step 4: Enable Firebase Services In `menulist-qa`

Where:

- Firebase Console -> project `menulist-qa`.

What to do:

1. Open `Build -> Firestore Database`.
2. Create Firestore in Native mode.
3. Open `Build -> Authentication`.
4. Enable the required MenuList sign-in providers.
5. Open `Build -> Storage`.
6. Enable Cloud Storage for Firebase.
7. Open Project Settings.
8. Add one Web app for MenuList QA.
9. Copy the web app config values to the secure setup tracker, not to chat.

Expected result:

- Firestore Native mode exists.
- Firebase Auth exists.
- Storage exists.
- A Web app config is available for env setup.

## Step 5: Add Firebase Authorized Domains

Where:

- Firebase Console -> `menulist-qa` -> Authentication -> Settings ->
  Authorized domains.

What to add:

- `localhost`
- `menulist.online`
- `www.menulist.online`

Expected result:

- Local and staging auth can complete against `menulist-qa`.

## Step 6: Create Firebase Service Account Values

Where:

- Firebase Console -> `menulist-qa` -> Project Settings -> Service accounts.
- Google Cloud service accounts: https://console.cloud.google.com/iam-admin/serviceaccounts

What to do:

1. Use a service account owned by `menulist-qa`.
2. Download JSON only if Vercel/server runtime needs explicit Admin SDK values.
3. Store the JSON in the password vault.
4. Extract these values for env setup:
   - project id
   - client email
   - private key
5. Escape private key newlines for Vercel.
6. Delete temporary local JSON copies after secure storage.

Expected result:

- You have Admin SDK values for `menulist-qa`.
- The key file is not committed.

## Step 7: Configure One Vercel Project

Where:

- Vercel dashboard: https://vercel.com/dashboard
- Vercel domains docs: https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Vercel env docs: https://vercel.com/docs/environment-variables

What to do:

1. Open the existing Vercel team/project for this repository, or import the repo
   one time if it does not exist.
2. Do not create a separate Vercel project for MenuList QA.
3. Add these domains to the same Vercel project:
   - `menulist.online`
   - `www.menulist.online`
4. Copy the exact DNS records Vercel shows.
5. Add those records in the registrar DNS screen.
6. Wait until Vercel marks both domains valid.

Expected result:

- One Vercel project owns `menulist.online` and `www.menulist.online`.
- No other product domain is required for this first setup.

## Step 8: Create Google OAuth Client

Where:

- Google Cloud OAuth credentials: https://console.cloud.google.com/apis/credentials

What to do:

1. Open the Google Cloud project that owns the OAuth client.
2. Configure OAuth consent under the company identity.
3. Create a Web application OAuth client.
4. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://menulist.online`
   - `https://www.menulist.online`
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://menulist.online/api/auth/callback/google`
   - `https://www.menulist.online/api/auth/callback/google`
6. Store the client id and client secret in the password vault.

Expected result:

- You have `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for MenuList QA.

## Step 9: Prepare MenuList QA Env Values

Where:

- Local ignored env file.
- Vercel Project -> Settings -> Environment Variables -> Preview.

Rule:

- Canonical MenuList product values use `MENULIST_*`.
- Canonical public MenuList values use `NEXT_PUBLIC_MENULIST_*`.
- Current runtime compatibility aliases must also be filled where listed below.
  They are not a third environment; they are same-value aliases while the repo
  finishes migration from older generic MenuList env keys.
- Framework/platform envs stay unprefixed when the framework expects that name.

### 9.1 Runtime And Auth

Set these in local and Vercel Preview:

```bash
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://menulist.online
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.online
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.online
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.online,www.menulist.online
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
NEXTAUTH_URL=https://menulist.online
```

Expected result:

- Runtime points to QA/staging.
- Auth redirects match `menulist.online`.

### 9.2 Firebase Web App Values

Use the `menulist-qa` Web app config from Firebase Console.

| Canonical MenuList key | Current compatibility alias to set with same value |
| --- | --- |
| `NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `NEXT_PUBLIC_MENULIST_FIREBASE_AUTH_DOMAIN` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `NEXT_PUBLIC_MENULIST_FB_DATABASE_URL` | `NEXT_PUBLIC_FB_DATABASE_URL` |
| `NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID=menulist-qa` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID=menulist-qa` |
| `NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `NEXT_PUBLIC_MENULIST_FIREBASE_MESSAGING_SENDER_ID` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `NEXT_PUBLIC_MENULIST_FIREBASE_APP_ID` | `NEXT_PUBLIC_FIREBASE_APP_ID` |
| `NEXT_PUBLIC_MENULIST_FIREBASE_MEASUREMENT_ID` | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` |

Expected result:

- Public Firebase config points only to `menulist-qa`.

### 9.3 Firebase Admin SDK Values

| Canonical MenuList key | Current compatibility alias to set with same value |
| --- | --- |
| `MENULIST_FIREBASE_PROJECT_ID=menulist-qa` | `FIREBASE_PROJECT_ID=menulist-qa` |
| `MENULIST_FIREBASE_STORAGE_BUCKET` | `FIREBASE_STORAGE_BUCKET` |
| `MENULIST_FIREBASE_CLIENT_EMAIL` | `FIREBASE_CLIENT_EMAIL` |
| `MENULIST_FIREBASE_PRIVATE_KEY` | `FIREBASE_PRIVATE_KEY` |
| `MENULIST_FIREBASE_PROJECT_LOCATION=us-central1` | `FIREBASE_PROJECT_LOCATION=us-central1` |

Expected result:

- Server/Admin SDK values point only to `menulist-qa`.

### 9.4 MenuList AI Values

Use a staging Gemini key only.

| Canonical MenuList key | Current compatibility alias to set with same value |
| --- | --- |
| `MENULIST_GEMINI_AI_KEY` | `GEMINI_AI_KEY` |
| `MENULIST_GEMINI_AI_KEY_2` | `GEMINI_AI_KEY_2` |
| `MENULIST_GEMINI_AI_KEY_3` | `GEMINI_AI_KEY_3` |
| `MENULIST_GEMINI_AI_KEY_4` | `GEMINI_AI_KEY_4` |

Leave rotation keys blank unless real rotation/failover keys exist.

Expected result:

- MenuList QA AI calls use staging keys only.

### 9.5 Payments And Billing

Use Razorpay Test Mode only.

| Canonical MenuList key | Current compatibility alias to set with same value |
| --- | --- |
| `MENULIST_RAZORPAY_KEY_ID=rzp_test_<id>` | `RAZORPAY_KEY_ID=rzp_test_<id>` |
| `MENULIST_RAZORPAY_KEY_SECRET` | `RAZORPAY_KEY_SECRET` |
| `MENULIST_RAZORPAY_WEBHOOK_SECRET` | `RAZORPAY_WEBHOOK_SECRET` |
| `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID=rzp_test_<id>` | `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_<id>` |
| `MENULIST_GCP_BUDGET_WEBHOOK_SECRET` | `GCP_BUDGET_WEBHOOK_SECRET` |

Expected result:

- QA payments use Razorpay Test Mode, never Live Mode.

### 9.6 Upstash, Cache, And Revalidation

Use a staging Upstash Redis database only.

| Canonical MenuList key | Current compatibility alias to set with same value |
| --- | --- |
| `MENULIST_UPSTASH_REDIS_REST_URL` | `UPSTASH_REDIS_REST_URL` |
| `MENULIST_UPSTASH_REDIS_REST_TOKEN` | `UPSTASH_REDIS_REST_TOKEN` |
| `MENULIST_REVALIDATION_SECRET` | `REVALIDATION_SECRET` |

Expected result:

- Staging rate limit/cache/revalidation values are separate from production.

### 9.7 Optional Staging Notifications

Leave these blank until you intentionally test the matching provider.

| Canonical MenuList key | Current compatibility alias to set with same value |
| --- | --- |
| `MENULIST_SMTP_HOST` | `SMTP_HOST` |
| `MENULIST_SMTP_PORT` | `SMTP_PORT` |
| `MENULIST_SMTP_USER` | `SMTP_USER` |
| `MENULIST_SMTP_PASS` | `SMTP_PASS` |
| `MENULIST_TELEGRAM_BOT_TOKEN` | `TELEGRAM_BOT_TOKEN` |
| `MENULIST_TELEGRAM_CHAT_ID` | `TELEGRAM_CHAT_ID` |
| `MENULIST_WHATSAPP_PHONE_NUMBER_ID` | `WHATSAPP_PHONE_NUMBER_ID` |
| `MENULIST_WHATSAPP_ACCESS_TOKEN` | `WHATSAPP_ACCESS_TOKEN` |
| `MENULIST_WHATSAPP_APP_SECRET` | `WHATSAPP_APP_SECRET` |
| `MENULIST_WHATSAPP_VERIFY_TOKEN` | `WHATSAPP_VERIFY_TOKEN` |

Expected result:

- Optional messaging providers stay disabled unless real staging credentials
  exist.

### 9.8 App Check, Analytics, And Monitoring

Set only if the staging provider exists:

```bash
NEXT_PUBLIC_MENULIST_RECAPTCHA_SITE_KEY=<staging-recaptcha-v3-site-key>
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<same-value-current-runtime-alias>
NEXT_PUBLIC_MENULIST_FIREBASE_APPCHECK_DEBUG_TOKEN=
NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=
MENULIST_SENTRY_DSN=<staging-sentry-server-dsn>
SENTRY_DSN=<same-value-current-runtime-alias>
NEXT_PUBLIC_MENULIST_SENTRY_DSN=<staging-sentry-browser-dsn>
NEXT_PUBLIC_SENTRY_DSN=<same-value-current-runtime-alias>
NEXT_PUBLIC_MENULIST_GA_MEASUREMENT_ID=<staging-ga-measurement-id>
NEXT_PUBLIC_GA_MEASUREMENT_ID=<same-value-current-runtime-alias>
NEXT_PUBLIC_MENULIST_CLARITY_ID=<staging-clarity-id>
NEXT_PUBLIC_CLARITY_ID=<same-value-current-runtime-alias>
```

Expected result:

- Staging monitoring/analytics are separate from production.

## Step 10: Create Required Third-Party QA Keys

Create only what MenuList QA needs.

| Provider | Where | QA action |
| --- | --- | --- |
| Gemini | https://aistudio.google.com/app/apikey | Create staging key, restrict to Gemini API, store in MenuList AI env |
| Upstash | https://console.upstash.com/ | Create staging Redis DB, store REST URL/token |
| Razorpay | https://dashboard.razorpay.com/ | Use Test Mode keys only |
| Sentry | https://sentry.io/ | Create staging project/environment if error reporting is needed |
| reCAPTCHA/App Check | https://www.google.com/recaptcha/admin/create | Register `menulist.online`, monitor before enforcing |
| Telegram | https://t.me/BotFather | Create staging alert bot only if ops alerts are being tested |
| SMTP | https://support.google.com/a/answer/176600 | Configure staging sender only if lifecycle email is being tested |
| UptimeRobot | https://uptimerobot.com/ | Add staging monitors after Vercel DNS is valid |

Do not create:

- production Gemini keys.
- Razorpay Live Mode keys.
- Answerlattice providers.
- CampaignCue providers.
- SignalDesk providers.
- MyCodex setup.
- `menulist.digital`.

## Step 11: Set Firebase Functions Secrets For `menulist-qa`

Where:

- Firebase Functions env/secrets docs: https://firebase.google.com/docs/functions/config-env
- Terminal after `firebase login`.

Important:

- Firebase Functions Secret Manager names must match the current function
  declarations exactly.
- For MenuList Functions today, the declared names are still the exact names
  below. Do not invent `MENULIST_` Secret Manager names until Functions
  declarations are migrated.

Run only for `menulist-qa`:

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
firebase functions:secrets:set SMTP_HOST --project menulist-qa
firebase functions:secrets:set SMTP_PORT --project menulist-qa
firebase functions:secrets:set SMTP_USER --project menulist-qa
firebase functions:secrets:set SMTP_PASS --project menulist-qa
firebase functions:secrets:set RAZORPAY_KEY_ID --project menulist-qa
firebase functions:secrets:set RAZORPAY_KEY_SECRET --project menulist-qa
firebase functions:secrets:set SENTRY_DSN --project menulist-qa
firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project menulist-qa
firebase functions:secrets:set TELEGRAM_CHAT_ID --project menulist-qa
firebase functions:secrets:set GCP_BUDGET_WEBHOOK_SECRET --project menulist-qa
firebase functions:secrets:set REVALIDATION_SECRET --project menulist-qa
```

If a provider is intentionally disabled, do not set fake values. Leave that
provider pending and keep the matching feature gate off.

Expected result:

- Required MenuList QA Functions secrets exist in `menulist-qa`.
- No production secrets are touched.

## Step 12: Deploy Firebase QA Infrastructure

Where:

- Local terminal with Firebase CLI logged into the company account.

Pre-check:

```bash
firebase projects:list
```

Expected project:

```text
menulist-qa
```

Deploy staging rules, indexes, and storage:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,storage
```

Deploy only the QA scheduler health path after required secrets exist:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive
```

Expected result:

- MenuList QA Firebase infrastructure deploys to `menulist-qa`.
- No production Firebase deploy happens.

Stop if:

- the command returns IAM, billing, Secret Manager, or project-not-found errors.
- `firebase projects:list` does not show `menulist-qa`.

## Step 13: Trigger Vercel Preview/Staging

Where:

- Vercel dashboard or approved git workflow.

What to do:

1. Confirm all MenuList QA Preview env values are set.
2. Confirm Production env values are not touched.
3. Trigger the Vercel Preview/Staging deployment.
4. Confirm the deployment is attached to `menulist.online`.
5. Do not deploy Vercel Production from this guide.

Expected result:

- `https://menulist.online` serves the MenuList QA deployment.
- Runtime env points to `menulist-qa`.

## Step 14: Smoke Test MenuList QA

Where:

- Browser.
- Firebase Console.
- Vercel logs.
- Sentry staging project if configured.

Smoke checklist:

- [ ] Open `https://menulist.online`.
- [ ] Open `https://www.menulist.online`.
- [ ] Open `https://menulist.online/api/version`.
- [ ] Sign in with the staging test owner account.
- [ ] Create or load a test business/store.
- [ ] Confirm Firestore writes go to `menulist-qa`.
- [ ] Confirm Storage writes go to the `menulist-qa` bucket.
- [ ] Confirm no writes go to production project `menulist`.
- [ ] Confirm no dependency on `menulist.digital`.
- [ ] Confirm no SignalDesk setup is required.
- [ ] Confirm no Answerlattice or CampaignCue env is required for this pass.

Expected result:

- MenuList QA is usable on `menulist.online`.
- Data isolation is proven in Firebase Console.
- You can move to the next guide: MenuList production setup.

## Final MenuList QA Tracker

| Item | Done | Notes |
| --- | --- | --- |
| Owner vault ready | [ ] | MFA and recovery stored |
| `menulist.online` confirmed | [ ] | auto-renew on |
| Firebase project `menulist-qa` exists | [ ] | exact id only |
| Firestore Native mode enabled | [ ] | QA project only |
| Firebase Auth enabled | [ ] | authorized domains added |
| Storage enabled | [ ] | QA bucket only |
| Web app config copied securely | [ ] | no secrets in docs/chat |
| Service account values stored | [ ] | no JSON committed |
| Google OAuth client ready | [ ] | localhost plus `menulist.online` redirects |
| Vercel project connected | [ ] | one project only |
| Vercel domains valid | [ ] | `menulist.online`, `www.menulist.online` |
| Vercel Preview env filled | [ ] | QA values only |
| Firebase Function secrets set | [ ] | `menulist-qa` only |
| Firebase QA infrastructure deployed | [ ] | no production deploy |
| Vercel staging deployed | [ ] | no production deploy |
| Smoke tests passed | [ ] | writes verified in `menulist-qa` |

## Absolute No-Go For This Guide

- Do not create or configure production Firebase project `menulist`.
- Do not configure Answerlattice.
- Do not configure CampaignCue.
- Do not configure SignalDesk.
- Do not configure MyCodex.
- Do not use `menulist.digital`.
- Do not create `ecomsai`.
- Do not use Razorpay Live Mode.
- Do not use production Gemini keys.
- Do not commit real env files.
