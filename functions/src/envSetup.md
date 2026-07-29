# Firebase Functions Secrets Setup

> Scope: MenuList, Answerlattice, and SignalDesk Firebase Functions
> Current MenuList primary AI secret: `GEMINI_AI_KEY`
> Current Answerlattice primary AI secret: `ANSWERLATTICE_GEMINI_AI_KEY`
> Current SignalDesk app AI env: `SIGNALDESK_GEMINI_AI_KEY`

This file documents the Firebase Functions secrets that are actually declared by
the current code. Do not print, commit, or paste secret values in logs or docs.

## Current Secret Sources

- MenuList Functions secret declarations: `functions/src/config/secrets.ts`
- Answerlattice Functions secret declarations:
  `functions-answerlattice/src/config/secrets.ts`
- SignalDesk Functions codebase: `functions-signaldesk/src`
- Full product setup runbook:
  `__docs__/deployment/three-product-environment-setup.md`

## MenuList Function Secrets

Set these in both MenuList Firebase projects:

- staging/local Firebase project: `menulist-qa`
- production Firebase project: `menulist`

Required or declared MenuList secrets:

```text
GEMINI_AI_KEY
GEMINI_AI_KEY_2
GEMINI_AI_KEY_3
GEMINI_AI_KEY_4
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN
WHATSAPP_APP_SECRET
WHATSAPP_VERIFY_TOKEN
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
SENTRY_DSN
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
GCP_BUDGET_WEBHOOK_SECRET
REVALIDATION_SECRET
```

Set staging secrets:

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

`SENTRY_DSN` is required only when Functions Sentry is enabled. Functions do
not embed a fallback Sentry project DSN; if the secret/env value is missing,
Sentry initialization is skipped and Firebase logs remain active. For local
emulator-only server error routing, set `SENTRY_DEV_DSN` in the local Functions
env file instead of adding another deployed secret.

Set production secrets by repeating the same commands with:

```bash
--project menulist
```

Use production values for production. Do not copy staging/test provider values
into `menulist`.

## MenuList Function Runtime Env

Non-secret runtime env lives in the Firebase Functions dotenv files:

- `functions/.env.menulist-qa`
- `functions/.env.menulist`
- `functions/.env.menulist-qa.example`
- `functions/.env.menulist.example`

Messaging onboarding processing is disabled by default in those files. Enable it only on a target with real Meta secrets and webhook registration:

```text
ENABLE_MESSAGING_ONBOARDING=false
MESSAGING_ONBOARDING_PROVIDERS=whatsapp
ENABLE_MESSAGING_ONBOARDING_TRACKING=true
```

`NEXT_PUBLIC_MSG_PREVIEW_BASE_URL` must be the site host only. The extraction
watcher appends `/msg-preview/{sessionId}` when it builds the preview link.

## Answerlattice Function Secrets

Set this in both Answerlattice Firebase projects:

- staging/local Firebase project: `answerlattice-qa`
- production Firebase project: `answerlattice`

Declared Answerlattice secrets:

```text
ANSWERLATTICE_CRON_SECRET
ANSWERLATTICE_GEMINI_AI_KEY
ANSWERLATTICE_GEMINI_AI_KEY_2
ANSWERLATTICE_GEMINI_AI_KEY_3
ANSWERLATTICE_GEMINI_AI_KEY_4
ANSWERLATTICE_PUBLIC_BUNDLE_SALT
ANSWERLATTICE_SMTP_HOST
ANSWERLATTICE_SMTP_PORT
ANSWERLATTICE_SMTP_USER
ANSWERLATTICE_SMTP_PASS
```

Set staging:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_2 --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_3 --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_4 --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_PUBLIC_BUNDLE_SALT --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_HOST --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_PORT --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_USER --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_PASS --project answerlattice-qa --config firebase-answerlattice.json
```

Set production by repeating every Answerlattice command above with:

```bash
--project answerlattice
```

Use production-specific values for production. Do not reuse the QA AI keys,
bundle salt, SMTP credentials, or cron secret.

## SignalDesk Function Secrets

SignalDesk uses separate Firebase projects:

- staging/local Firebase project: `menulist-signaldesk-qa`
- production Firebase project: `menulist-signaldesk`

Current `functions-signaldesk/src` reads only Firebase-provided runtime project
identity (`FIREBASE_CONFIG`, `GCLOUD_PROJECT`, and `GOOGLE_CLOUD_PROJECT`) and
does not declare Firebase Secret Manager secrets.

Do not set undeclared SignalDesk Function secrets just to mirror Vercel env.
SignalDesk app/provider/runtime env belongs in Vercel through
`SIGNALDESK_*` variables unless a future Cloud Function explicitly
adds a `defineSecret` declaration.

SignalDesk deploy commands after project access, billing, rules, indexes, and
storage exist:

```bash
firebase deploy --project menulist-signaldesk-qa --config firebase-signaldesk.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project menulist-signaldesk-qa --config firebase-signaldesk.json --only functions:signaldesk

firebase deploy --project menulist-signaldesk --config firebase-signaldesk.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project menulist-signaldesk --config firebase-signaldesk.json --only functions:signaldesk
```

## CampaignCue, Neelvara, And MyCodex

CampaignCue currently has no Firebase Cloud Functions in this repo. CampaignCue
Admin SDK/provider values belong in Vercel env.

Neelvara is static/no DB and has no Firebase Functions secrets.

MyCodex is static/no DB and has no Firebase Functions secrets.

## Local Emulator Values

The emulator does not read Google Secret Manager. For local Functions emulator
work, use an ignored local file such as `functions/.env.local`.

Example shape:

```env
FUNCTIONS_EMULATOR=true
GEMINI_AI_KEY=<local-or-staging-gemini-key>
UPSTASH_REDIS_REST_URL=<local-or-staging-upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<local-or-staging-upstash-rest-token>
```

Only add the local secrets needed for the function being tested.

## Checking Secret Metadata Safely

Do not use `firebase functions:secrets:access` unless you explicitly need to
read a secret value. That command prints the secret value.

This Firebase CLI version may not provide `functions:secrets:list`. To list
secret names without values, use Google Secret Manager metadata:

```bash
gcloud secrets list --project menulist-qa --format='value(name)'
gcloud secrets list --project menulist --format='value(name)'
gcloud secrets list --project answerlattice-qa --format='value(name)'
gcloud secrets list --project answerlattice --format='value(name)'
gcloud secrets list --project menulist-signaldesk-qa --format='value(name)'
gcloud secrets list --project menulist-signaldesk --format='value(name)'
```

If the command returns `CONSUMER_INVALID`, the project id is not available to
the authenticated Google account or does not exist.

If the command returns `SERVICE_DISABLED`, enable Secret Manager API for that
project.

If the command returns `BILLING_DISABLED`, enable billing before deploying or
validating Functions secrets.

## Current AI Secret Name

Use `GEMINI_AI_KEY` as the primary MenuList Firebase Functions AI secret.
Rotation keys are `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and
`GEMINI_AI_KEY_4`.

Answerlattice uses `ANSWERLATTICE_GEMINI_AI_KEY` plus
`ANSWERLATTICE_GEMINI_AI_KEY_2`, `ANSWERLATTICE_GEMINI_AI_KEY_3`, and
`ANSWERLATTICE_GEMINI_AI_KEY_4`.

SignalDesk app/runtime uses `SIGNALDESK_GEMINI_AI_KEY` plus
`SIGNALDESK_GEMINI_AI_KEY_2`,
`SIGNALDESK_GEMINI_AI_KEY_3`, and
`SIGNALDESK_GEMINI_AI_KEY_4`. These are Vercel env values today, not
Firebase Functions Secret Manager values.

`GEMINI_API_KEY` is a legacy app env alias only. Do not set it as the primary
Firebase Functions secret unless code is intentionally changed to read it again.

Production Gemini keys must be created per environment and restricted to the
Gemini API. Do not reuse the local or staging key in production. Do not expose
Gemini keys in browser code, mobile apps, widgets, Firestore, or logs.

The extra key slots are for credential rotation, leak response, and transient
failover. They do not create unlimited capacity when they belong to the same
Google project because Gemini quotas are enforced at the project/model tier.
For production scaling, use billing, quota monitoring, budget alerts, and
quota increase requests.

Daily provider health records:

```text
MenuList: _health/aiProvider_gemini
Answerlattice: platformSummary/answerlatticeAiProviderHealth
```

After deploying Functions, confirm those records update once per UTC day and
that failed checks surface through the scheduler alert path. Failed MenuList
provider-health records store stable local failure codes plus source error
name/code/status metadata only; they do not store raw SDK/provider messages.

## Deploy Note

After adding a new secret name to a function's `secrets` option, deploy the
function so Firebase binds the secret to that function.

Rotating the value of an existing bound secret does not require a function
redeploy.
