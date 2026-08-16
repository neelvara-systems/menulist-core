# Firebase Functions Secrets Setup

> Scope: MenuList, Answerlattice, and SignalDesk Firebase Functions
> Current MenuList primary AI secret: `GEMINI_AI_KEY`
> Current MenuList menu-extraction AI secret: `MENULIST_GEMINI_TEXT_AI_KEY`
> Current Answerlattice primary AI secret: `ANSWERLATTICE_GEMINI_AI_KEY`
> Current SignalDesk app AI env: `SIGNALDESK_GEMINI_AI_KEY`

This file documents the Firebase Functions secrets that are actually declared by
the current code. Do not print, commit, or paste secret values in logs or docs.

Budget setup note: create alert-only budgets and a separate Preview Gemini API
spend-cap budget for the matching Firebase/GCP project before deploying paid
Functions paths or enabling paid Gemini usage. `GCP_BUDGET_WEBHOOK_SECRET` only
authenticates the optional alert webhook; it does not create either budget or
enable spend-cap enforcement.

## Current Secret Sources

- MenuList Functions secret declarations: `functions/src/config/secrets.ts`
- Answerlattice Functions secret declarations:
  `functions-answerlattice/src/config/secrets.ts`
- SignalDesk Functions codebase: `functions-signaldesk/src`
- Full product setup runbook:
  `__docs__/deployment/three-product-environment-setup.md`
- Current MenuList QA checklist:
  `__docs__/deployment/menulist-staging-qa-setup.md`
- Current MenuList production provider ledger:
  `__docs__/deployment/menulist-production-provider-setup.md`

MenuList currently uses one runtime location: `us-central1`. Select it when
Firestore asks for a location and keep Storage, Functions, and Cloud Tasks in
the same location. Do not create regional copies or a third deployed
environment. Local destructive and rule testing is emulator-first.

## MenuList Function Secrets

Set these in each MenuList Firebase project only when that environment's live
ledger reaches its Secret Manager step:

- staging/local Firebase project: `menulist-qa`
- production Firebase project: `menulist-prod`

Production secret creation requires the exact production project identity to
be approved first. Creating secret versions does not authorize a production
Functions deploy, provider activation, DNS cutover, or production data write.

Declared MenuList secret registry. A secret becomes deploy-required when a
selected Function binds it through its `secrets` option:

```text
GEMINI_AI_KEY
MENULIST_GEMINI_TEXT_AI_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN
WHATSAPP_APP_SECRET
WHATSAPP_VERIFY_TOKEN
MENULIST_WHATSAPP_PHONE_NUMBER_ID
MENULIST_WHATSAPP_ACCESS_TOKEN
MENULIST_WHATSAPP_APP_SECRET
MENULIST_WHATSAPP_VERIFY_TOKEN
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
MENULIST_RESEND_API_KEY
MENULIST_RESEND_WEBHOOK_SECRET
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
SENTRY_DSN
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
GCP_BUDGET_WEBHOOK_SECRET
REVALIDATION_SECRET
```

Set these staging secrets before using the maintained full MenuList QA Functions
target list:

```bash
firebase functions:secrets:set GEMINI_AI_KEY --project menulist-qa
firebase functions:secrets:set MENULIST_GEMINI_TEXT_AI_KEY --project menulist-qa
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

The unscoped `WHATSAPP_*` names remain the active deploy bindings during the
existing Meta integration migration. Before provider activation, create the
four `MENULIST_WHATSAPP_*` secrets with the same values, bind them in
`SECRET_GROUPS.WHATSAPP`, deploy the webhook, verify both GET verification and a
signed status callback, and only then remove the legacy bindings. Do not bind a
new secret name before its Secret Manager value exists because Firebase treats
every bound name as deploy-required.

Set these only when the corresponding separately selected Function/provider is
being deployed:

```bash
firebase functions:secrets:set SMTP_HOST --project menulist-qa
firebase functions:secrets:set SMTP_PORT --project menulist-qa
firebase functions:secrets:set SMTP_USER --project menulist-qa
firebase functions:secrets:set SMTP_PASS --project menulist-qa

# EmailOS: run only during the approved Resend onboarding session.
firebase functions:secrets:set MENULIST_RESEND_API_KEY --project menulist-qa
firebase functions:secrets:set MENULIST_RESEND_WEBHOOK_SECRET --project menulist-qa
firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project menulist-qa
firebase functions:secrets:set TELEGRAM_CHAT_ID --project menulist-qa
firebase functions:secrets:set GCP_BUDGET_WEBHOOK_SECRET --project menulist-qa
```

Secret Manager bindings are evaluated per selected deploy target. The maintained
full MenuList QA target list includes Functions that bind `SENTRY_DSN` and the
four WhatsApp secret names, so real QA secret versions must exist before that
bundle is deployed even while `ENABLE_MESSAGING_ONBOARDING=false`. Runtime
feature disablement does not remove a target's deploy-time secret binding. To
defer one of those providers, stop before Functions deployment and use only a
separately reviewed reduced target list; never create fake secret values.

Functions do not embed a fallback Sentry project DSN. A target that does not
bind or receive a Sentry DSN skips Sentry initialization and keeps Firebase
logging active. For local emulator-only server error routing, set
`SENTRY_DEV_DSN` in the local Functions env file instead of adding another
deployed secret.

For a later production setup, repeat only the commands required by the reviewed
production target list with:

```bash
--project menulist-prod
```

Use production values for production. Do not copy staging/test provider values
into `menulist-prod`.

Record each created secret's owner and creation date in the company vault.
Quarterly, review whether old versions or replaced credentials can be revoked.
Do not rotate a working credential without a tested replacement and rollback
path.

## MenuList Function Runtime Env

Non-secret runtime env lives in the Firebase Functions dotenv files:

- `functions/.env.menulist-qa`
- `functions/.env.menulist-prod`
- `functions/.env.menulist-qa.example`
- `functions/.env.menulist-prod.example`

Messaging onboarding processing is disabled by default in those files. Enable it only on a target with real Meta secrets and webhook registration:

```text
ENABLE_MESSAGING_ONBOARDING=false
MESSAGING_ONBOARDING_PROVIDERS=whatsapp
ENABLE_MESSAGING_ONBOARDING_TRACKING=true
```

Keep owner-app and customer-host values separate:

```text
# menulist-qa
NEXT_PUBLIC_APP_URL=https://app.menulist.digital
MENULIST_TENANT_BASE_DOMAIN=menulist.digital

# menulist
NEXT_PUBLIC_APP_URL=https://app.menulist.ai
MENULIST_TENANT_BASE_DOMAIN=menulist.online
```

`NEXT_PUBLIC_APP_URL` is the Next.js app/API origin used for cache
revalidation. `MENULIST_TENANT_BASE_DOMAIN` is the customer-link suffix used
for publish verification. Never derive one from the other.

MenuList Functions validate the owner app origin against the active Firebase
project when `GCLOUD_PROJECT` is available. `menulist-qa` accepts only
`https://app.menulist.digital`; `menulist` accepts only
`https://app.menulist.ai`. Invalid or cross-environment values fail closed and
must never fall back from QA to a production owner link.

The customer-domain suffix has the same project boundary. `menulist-qa`
accepts only `menulist.digital`, `menulist` accepts only `menulist.online`, and
unknown suffixes fail closed. Emulator tests may use a demo project ID, but
must still choose one of those two maintained suffixes explicitly.

`NEXT_PUBLIC_MSG_PREVIEW_BASE_URL` must be the owner-app host only. Use
`https://app.menulist.digital` for QA/staging and `https://app.menulist.ai`
for production. The extraction watcher appends `/msg-preview/{sessionId}`
when it builds the preview link.

## Answerlattice Function Secrets

Set this in both Answerlattice Firebase projects:

- staging/local Firebase project: `answerlattice-qa`
- production Firebase project: `answerlattice`

Declared Answerlattice secrets:

```text
ANSWERLATTICE_CRON_SECRET
ANSWERLATTICE_GEMINI_AI_KEY
ANSWERLATTICE_PUBLIC_BUNDLE_SALT
ANSWERLATTICE_SMTP_HOST
ANSWERLATTICE_SMTP_PORT
ANSWERLATTICE_SMTP_USER
ANSWERLATTICE_SMTP_PASS
ANSWERLATTICE_RESEND_API_KEY
ANSWERLATTICE_RESEND_WEBHOOK_SECRET
```

Set staging:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_PUBLIC_BUNDLE_SALT --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_HOST --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_PORT --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_USER --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_PASS --project answerlattice-qa --config firebase-answerlattice.json

# EmailOS: run only during the approved Resend onboarding session.
firebase functions:secrets:set ANSWERLATTICE_RESEND_API_KEY --project answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_RESEND_WEBHOOK_SECRET --project answerlattice-qa --config firebase-answerlattice.json
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
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099

# Add only when the selected local test intentionally calls the paid provider.
GEMINI_AI_KEY=<menulist-qa-gemini-key>
UPSTASH_REDIS_REST_URL=<menulist-qa-upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<menulist-qa-upstash-rest-token>
```

Only add the local secrets needed for the function being tested. Never place
production secrets in the local emulator file.

## Checking Secret Metadata Safely

Do not use `firebase functions:secrets:access` unless you explicitly need to
read a secret value. That command prints the secret value.

This Firebase CLI version may not provide `functions:secrets:list`. To list
secret names without values, use Google Secret Manager metadata:

```bash
gcloud secrets list --project menulist-qa --format='value(name)'
gcloud secrets list --project menulist-prod --format='value(name)'
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
Rotate it by replacing its Secret Manager version in place. Numbered MenuList
rotation aliases are retired and must not be restored.

Use `MENULIST_GEMINI_TEXT_AI_KEY` only for the menu extraction worker. Every
deployed environment must set it to a paid key from that environment's single
governed Gemini project. QA currently designates the paid provider key formerly
named as rotation slot 4 and stores its value under this dedicated Secret
Manager name. Production must create its own paid extraction key in the
production Gemini project. Never fall back from this extraction pool to
`GEMINI_AI_KEY*`, and do not create provider projects or keys to multiply
project-level quota.

Answerlattice uses only `ANSWERLATTICE_GEMINI_AI_KEY`. Rotate it by replacing
the managed value in place.

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

The dedicated extraction key provides workload isolation. It does not create
additional capacity because Gemini quotas are enforced at the project/model
tier. See `__docs__/deployment/gemini-credential-billing-strategy.md` for the
canonical four-project billing, credential, and rotation contract.
For production scaling, use billing, quota monitoring, alert-only budgets, the
Gemini API spend-cap budget, the app-local rolling ceiling, and quota increase
requests.

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
