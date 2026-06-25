# Firebase Functions Secrets Setup

> Scope: MenuList Firebase Functions and Answerlattice Firebase Functions
> Current primary AI secret: `GEMINI_AI_KEY`

This file documents the Firebase Functions secrets that are actually declared by
the current code. Do not print, commit, or paste secret values in logs or docs.

## Current Secret Sources

- MenuList Functions secret declarations: `functions/src/config/secrets.ts`
- Answerlattice Functions secret declarations:
  `functions-answerlattice/src/config/secrets.ts`
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

Messaging onboarding is enabled in those files:

```text
ENABLE_MESSAGING_ONBOARDING=true
MESSAGING_ONBOARDING_PROVIDERS=whatsapp
ENABLE_MESSAGING_ONBOARDING_TRACKING=true
```

`NEXT_PUBLIC_MSG_PREVIEW_BASE_URL` must be the site host only. The extraction
watcher appends `/msg-preview/{sessionId}` when it builds the preview link.

## Answerlattice Function Secrets

Set this in both Answerlattice Firebase projects:

- staging/local Firebase project: `answerlattice-qa`
- production Firebase project: `answerlattice`

Required Answerlattice secret:

```text
ANSWERLATTICE_CRON_SECRET
```

Set staging:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project answerlattice-qa --config firebase-answerlattice.json
```

Set production:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project answerlattice --config firebase-answerlattice.json
```

## CampaignCue And MyCodex

CampaignCue currently has no Firebase Cloud Functions in this repo. CampaignCue
Admin SDK/provider values belong in Vercel env.

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
```

If the command returns `CONSUMER_INVALID`, the project id is not available to
the authenticated Google account or does not exist.

If the command returns `SERVICE_DISABLED`, enable Secret Manager API for that
project.

If the command returns `BILLING_DISABLED`, enable billing before deploying or
validating Functions secrets.

## Current AI Secret Name

Use `GEMINI_AI_KEY` as the primary Firebase Functions AI secret. Rotation keys
are `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and `GEMINI_AI_KEY_4`.

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
that failed checks surface through the scheduler alert path.

## Deploy Note

After adding a new secret name to a function's `secrets` option, deploy the
function so Firebase binds the secret to that function.

Rotating the value of an existing bound secret does not require a function
redeploy.
