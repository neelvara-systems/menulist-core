# MenuList Staging QA Setup Guide

> Status: first execution guide
> Scope: MenuList local plus staging only
> Last updated: August 2, 2026
> Launch boundary: this guide does not approve production deployment. Finish this MenuList QA setup, verify it end to end, then create a separate MenuList production guide.

This is the dedicated setup file for **MenuList staging/QA**. Follow only this
file first. Do not set up Answerlattice, CampaignCue, SignalDesk, Neelvara, or
MyCodex until MenuList QA is live and verified.

## Final Domain Contract Used By This Guide

| Domain | Purpose | Env |
| --- | --- | --- |
| `menulist.digital` + `www` | MenuList main website running in staging/QA mode | Staging/QA website |
| `app.menulist.digital` | Single owner/staff authenticated app; canonical dashboard is `/dashboard` | Staging/QA app |
| `*.menulist.digital` | QA customer test links, for example `abc.menulist.digital`; platform labels such as `app`, `www`, and `qa` are reserved | Staging/QA customer hosts |
| `menulist.ai` | Main MenuList marketing, SEO, and production app shell | Production, not touched here |
| `app.menulist.ai` | Owner/staff authenticated app | Production, not touched here |
| `*.menulist.online` | Production customer public menu/OBP links, for example `abc.menulist.online` | Production, not touched here |
| `menulist.online` + `www` | 301 redirect to `menulist.ai` | Production redirect, not touched here |

## Decisions For This First Setup

| Area | MenuList QA decision |
| --- | --- |
| Environment | local and staging share QA values |
| QA main website | `menulist.digital`, with `www.menulist.digital` as its alias |
| Canonical QA owner app | `app.menulist.digital`; owner dashboard path is `/dashboard` |
| QA tenant wildcard | `*.menulist.digital`; generated links are `<business-slug>.menulist.digital` |
| Owner scope | One app hostname only; authenticated session data selects the tenant and store |
| Firebase project | `menulist-qa` |
| Firebase/Google Cloud region | `us-central1` for Firestore, Storage, Functions, and Cloud Tasks; Firestore asks for an explicit choice, so select `us-central1` |
| Vercel project | one shared repo project, Preview/Staging env only |
| Vercel secret scope | Preview values restricted to exact Git branch `staging` |
| Local data safety | same QA configuration family; use Firebase emulators first for destructive/rule testing, and use cloud `menulist-qa` only for integration smoke |
| QA discovery | every `menulist.digital` host is `noindex`, disallows all crawlers, and publishes no sitemap |
| Production | not touched in this guide |
| Other products | not touched in this guide |
| MyCodex | not used; MyCodex remains static/no DB and has no `menulist.digital` dependency |
| SignalDesk | not part of MenuList QA setup; SignalDesk remains under its dedicated `signaldesk.menulist.online` contract |
| MenuList env naming | use `MENULIST_*` for server-side MenuList values and `NEXT_PUBLIC_MENULIST_*` for browser values |

Important Next.js rule: browser-exposed variables must still start with
`NEXT_PUBLIC_`. So the public MenuList prefix is `NEXT_PUBLIC_MENULIST_*`, not
`MENULIST_NEXT_PUBLIC_*`.

## Permanent Owner Account Decision

Use `admin@neelvara.com` from one Google Workspace tenant as the permanent
break-glass Google, Google Cloud, Firebase, and provider owner identity. Do not
use it for routine browsing or daily setup work. Create a named daily operator
such as `danny@neelvara.com`, grant only the access needed for setup, and keep
`admin@neelvara.com` as Super Admin. Do not use a new address such as
`neelvara@gmail.com` as the permanent company root account. A founder's
existing long-lived personal email may be the recovery address, but it is not
the shared operational owner.

Creating the Workspace tenant requires control of `neelvara.com`. Google asks
you to prove that control through a DNS verification record. Neelvara Systems
can remain an operating/trade name during this QA setup; do not represent it as
a registered company, LLP, or corporation unless that registration actually
exists.

There are two separate choices in Google Cloud:

- **Resource parent:** create `menulist-qa` under the Google Cloud organization
  associated with the verified `neelvara.com` Workspace domain.
- **Payments profile type:** choose the truthful type for the person/entity that
  currently pays. Do not invent company registration or tax details. Google
  does not allow the payments-profile account type or country to be changed
  later; if the legal payer changes, create a new billing account/payments
  profile with the correct details and relink `menulist-qa`.

Official references:

- Google Workspace domain verification:
  https://support.google.com/a/answer/60216
- Google Cloud organization setup:
  https://cloud.google.com/resource-manager/docs/creating-managing-organization
- Cloud Billing account creation and permanent account-type choice:
  https://cloud.google.com/billing/docs/how-to/create-billing-account
- Cloud Billing settings that can and cannot be changed:
  https://cloud.google.com/billing/docs/how-to/modify-billing-account

## Stop Rules

Stop and fix the setup before continuing if:

- Exact domain `neelvara.com` is unavailable at registrar checkout or ownership
  of `menulist.digital` cannot be proved. Do not choose a substitute silently.
- Firebase project id `menulist-qa` is unavailable.
- Firebase Console suggests a suffixed id such as `menulist-qa-12345`.
- Vercel asks you to configure MenuList QA on `menulist.online`,
  `www.menulist.online`, `menulist.ai`, or `app.menulist.ai`.
- Vercel tries to connect `menulist.digital`, `www.menulist.digital`,
  `app.menulist.digital`, or `*.menulist.digital` to Production instead of
  Preview/Staging.
- A sensitive Vercel Preview variable is available to every Preview branch
  instead of being restricted to exact Git branch `staging`.
- You have not exported the current `menulist.digital` DNS zone, or an existing
  mail/verification record has not been recreated before changing nameservers.
- Any setup step asks you to activate `qa.menulist.digital`,
  `*.qa.menulist.digital`, `dashboard.menulist.digital`, or
  `app.menulist.online`.
- An existing `menulist-qa` Firestore database or Storage bucket is not in
  `us-central1`. Resource locations cannot be changed in place; record the
  existing location and stop for architecture review instead of deleting it.
- Any `menulist.digital` QA website, app, or customer page is indexable, serves
  an allow-crawling `robots.txt`, or publishes a sitemap.
- You do not have the real owner Google/Firebase/Vercel account.
- The GitHub `menulist-ai/menulist-core` repository, exact `staging` branch, or
  the existing Vercel Git integration is unavailable to the company operator.
- A non-Firebase provider asks for production verification, live mode, or live
  billing. Firebase/Google Cloud billing for `menulist-qa` is allowed only
  when it is required for QA Functions/Storage and belongs to the company owner
  account.
- You are about to paste a real secret into this document, chat, git, or a
  screenshot.
- An actual local or Vercel env value still contains a literal template marker
  such as `<menulist-qa-web-api-key>`.
- A required Preview spend-cap budget is unavailable in the selected billing
  account. Stop before paid Gemini calls and report the provider limitation;
  an alert-only budget is not a spending cap.

## Live Execution Checklist - MenuList QA Only

Use this checklist while doing the setup. When you finish something, tell Codex
the checklist id, for example `QA-A01 done` or `QA-F04 blocked`, and Codex will
mark the item here before guiding the next step.

Do not paste secret values into this file or chat. For secret-related items,
mark completion only after the value is stored in the password vault, local
ignored env file, Vercel Preview env, or Firebase Secret Manager as instructed.

Status rules:

- `[ ]` means pending.
- `[x]` means completed and verified. For an optional item, it can also mean
  the decision was completed and Codex recorded `Skipped intentionally` on the
  row; a silent skip is never complete.
- Do not mark a provider complete just because an account exists. Mark it
  complete only when the QA key/value is created, stored, and wired where this
  guide says.

### Phase A - Owner Access And Safety

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-A01 | Password vault exists for MenuList QA setup | Password manager | Vault can store registrar, Google, Firebase, Vercel, provider credentials, and recovery codes |
| [ ] | QA-A02 | Registrar account secured and required domains confirmed | Registrar account | `menulist.digital` ownership is confirmed; exact `neelvara.com` is purchased if absent; both have auto-renew, valid payment, domain lock, MFA, and vaulted recovery |
| [ ] | QA-A03 | Workspace tenant created and primary domain verified | Google Workspace/Admin Console and registrar DNS | One Workspace tenant uses verified `neelvara.com`; the exact Google verification TXT record resolves |
| [ ] | QA-A04 | Break-glass Workspace Super Admin created | Google Workspace/Admin Console | `admin@neelvara.com` exists, has MFA/recovery, and is not used as the daily account |
| [ ] | QA-A05 | Named daily operator created | Google Workspace and Google Cloud IAM | `danny@neelvara.com` or the founder's equivalent named account performs daily setup with only required access |
| [ ] | QA-A06 | Gmail delivery activated and tested | Google Admin Console, DNS, and both mailboxes | Google-provided MX is published; each real user can send and receive a test message |
| [ ] | QA-A07 | SPF, DKIM, and monitor-only DMARC configured | Google Admin Console and DNS | One correct SPF record covers actual senders, DKIM signing is active, and DMARC starts at `p=none` with a controlled report recipient |
| [ ] | QA-A08 | Provider-notice aliases/groups created | Google Admin Console | `billing@neelvara.com`, `security@neelvara.com`, and `dmarc@neelvara.com` deliver to named real users; they are not shared-password accounts |
| [ ] | QA-A09 | GitHub repository and staging branch access confirmed | GitHub `menulist-ai/menulist-core` | Company operator can access the existing repository; exact branch `staging` exists; MFA is enabled; no new repository is created |
| [ ] | QA-A10 | Single Vercel project and Git integration confirmed | Vercel dashboard and Project -> Settings -> Git | Exactly one project is connected to `menulist-ai/menulist-core`; reuse it if present or import the repo once if absent; the operator can deploy exact branch `staging` |
| [ ] | QA-A11 | MFA enabled and recovery codes stored | Registrar, Google, GitHub, Vercel, providers | No setup depends on a weak or disposable login |
| [ ] | QA-A12 | Secret sharing rule accepted | This guide and password vault | No real secret will be pasted into docs, chat, screenshots, or git |
| [ ] | QA-A13 | Founder recovery identity and ownership recorded | Google Workspace and password vault | A long-lived personal email is recovery-only; offline codes and the recovery owner are recorded; add a second trusted Super Admin before production when another owner is available |
| [ ] | QA-A14 | Google Cloud organization visible | Google Cloud Console | The organization associated with `neelvara.com` is visible before creating `menulist-qa` |
| [ ] | QA-A15 | Retired Firebase service-account keys revoked | Google Cloud Console -> IAM & Admin -> Service Accounts for every retired project | Any old local service-account key is deleted or disabled before new QA credentials are created; do not copy it into `menulist-qa` |
| [ ] | QA-A16 | Maintenance calendar created | Calendar/password vault | Quarterly IAM/secret review and annual domain/payment/recovery review dates are recorded |

### Phase B - Domain And DNS

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-B01 | `menulist.digital` ownership confirmed | Registrar DNS screen | Domain is owned in the correct account |
| [ ] | QA-B02 | `menulist.digital` auto-renew confirmed | Registrar billing/domain settings | Auto-renew is on and payment method is valid |
| [ ] | QA-B03 | No extra domain selected | Registrar and Vercel | No production, SignalDesk, MyCodex, Answerlattice, or CampaignCue domain is used in this pass |
| [ ] | QA-B04 | Current DNS zone inventoried and exported | Existing DNS provider/registrar | Every A, AAAA, CNAME, MX, TXT, CAA, and SRV record is backed up before DNS authority changes |
| [ ] | QA-B05 | `menulist.digital` and `www.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | Apex and `www` target Preview for `staging`, never Production |
| [ ] | QA-B06 | `app.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | Owner sign-in and `/dashboard` use the dedicated QA app host |
| [ ] | QA-B07 | `*.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | QA customer subdomains target the same `staging` deployment |
| [ ] | QA-B08 | DNS records preserved and Vercel nameservers configured | Vercel DNS and registrar nameserver screen | Existing required records are recreated in Vercel DNS before the registrar uses the exact Vercel nameservers required for the apex wildcard |
| [ ] | QA-B09 | First branch deployment intentionally deferred | Vercel Domains and this guide | Domain assignments are saved, but no incomplete deployment is triggered before Phase G env and Phase I Firebase gates are ready |
| [ ] | QA-B10 | Domain ownership, DNS, and TLS readiness complete | Vercel Project -> Domains | Apex, `www`, `app`, and wildcard configuration are valid and assigned to exact branch `staging`; content smoke waits for Phase J/K |

### Phase C - Firebase Project Shell And Auth

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-C01 | Firebase project id checked before creation | Firebase Console | Exact id `menulist-qa` is available or already exists |
| [ ] | QA-C02 | Firebase project `menulist-qa` exists under the Neelvara organization | Firebase/Google Cloud Console | Project URL is `https://console.firebase.google.com/project/menulist-qa/overview` and its resource parent is the `neelvara.com` organization |
| [ ] | QA-C03 | Firebase ownership and intended billing owner confirmed | Firebase and Google Cloud Console | Project belongs to the company organization/operator and the truthful billing owner is identified; Phase C2 performs the actual link and guardrails |
| [ ] | QA-C04 | Firebase Auth and Email/Password provider enabled | Firebase Console -> Authentication -> Sign-in method | Firebase Auth is initialized and Email/Password is enabled for the current owner credential/custom-token flow; Google OAuth remains configured separately in Phase D |
| [ ] | QA-C05 | MenuList QA Web app created | Firebase Project Settings -> General | Web app config values are available and vaulted |
| [ ] | QA-C06 | Production Firebase not touched | Firebase Console | No setup work is done in project id `menulist` |

### Phase C2 - QA Billing And Spend Guardrails

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-BILL01 | `menulist-qa` linked to billing | Google Cloud Billing or Firebase Console | Firebase project can use Blaze/paid Google Cloud services for QA only |
| [ ] | QA-BILL02 | Alert-only budget created | Google Cloud Billing -> Budgets and alerts | Owner notifications exist before Gemini/Functions usage starts |
| [ ] | QA-BILL03 | Gemini API enabled in exact QA project | Google Cloud API Library | Generative Language/Gemini API is enabled for `menulist-qa` without creating a second project or making a paid call |
| [ ] | QA-BILL04 | Gemini API spend cap created | Google Cloud Billing -> Budgets and alerts | Preview spend-cap enforcement is scoped to `menulist-qa` and the Gemini API only |
| [ ] | QA-BILL05 | AI Studio system limit read | Google AI Studio project rate limits | Current project rolling spend ceiling is recorded without exposing keys |
| [ ] | QA-BILL06 | Local rolling ceiling chosen and vaulted | AI Studio limits and password vault setup note | The intended `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` value is below the active AI Studio ceiling; checked-in default is USD 8 and Phase G performs the env wiring |
| [ ] | QA-BILL07 | Cloud Run cap intentionally deferred | Setup notes | No cap exists until its whole-project outage/restore behavior is approved and drilled |
| [ ] | QA-BILL08 | Payments profile is truthful and migration note recorded | Google Payments/Cloud Billing and password vault | Account type, legal payer, country, and tax details match current reality; no unregistered entity details are invented |

### Phase C3 - Firebase Data Services And Credentials

Cloud Storage for Firebase now requires Blaze billing. Do not start this phase
until every Phase C2 billing/spend item is complete.

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-C07 | Firestore enabled in Native mode at `us-central1` | Firebase Console -> Firestore Database | Firestore asks for a location; `us-central1` is selected so the `(default)` database matches the existing Functions/Tasks contract |
| [ ] | QA-C08 | Firebase Storage enabled at `us-central1` | Firebase Console -> Storage | Project is already on Blaze; the default `menulist-qa.firebasestorage.app` bucket uses immutable location `us-central1` |
| [ ] | QA-C09 | Firebase authorized domains added | Firebase Auth -> Settings -> Authorized domains | `localhost` and `app.menulist.digital` are listed; public tenant hosts do not require owner auth |
| [ ] | QA-C10 | Service account values stored securely | Firebase Project Settings -> Service accounts | Admin SDK project id, client email, private key, and Firebase Web API key mapping are stored in the password vault |
| [ ] | QA-C11 | Temporary service account JSON removed | Local machine | No downloaded service account JSON remains outside the vault |
| [ ] | QA-C12 | Immutable resource locations recorded | Password vault setup note | Firestore and Storage both record `us-central1`; no location is assumed from an env value alone |
| [ ] | QA-C13 | Admin key creation date and revocation owner recorded | Password vault and Google Cloud IAM | The current static QA key has an owner/date and will be revoked immediately on leak, access removal, or replacement |

### Phase D - Google OAuth

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-D01 | Google Auth branding and contacts configured | Google Cloud Console -> Google Auth Platform -> Branding | MenuList QA name, support email, developer contact, homepage/privacy/terms links, and verified `menulist.digital` domain are accurate |
| [ ] | QA-D02 | OAuth audience set to External/Testing | Google Auth Platform -> Audience | QA remains in Testing and only named QA test users are admitted; no production publishing is requested |
| [ ] | QA-D03 | Identity-only scopes confirmed | Google Auth Platform -> Data Access | Only `openid`, `email`, and `profile` are requested for sign-in |
| [ ] | QA-D04 | Web OAuth client created for MenuList QA | Google Auth Platform -> Clients | One Web application client id and secret exist for QA usage |
| [ ] | QA-D05 | Authorized JavaScript origins added | OAuth client settings | Exact origins are `http://localhost:3000` and `https://app.menulist.digital`; no wildcard/customer origin is present |
| [ ] | QA-D06 | Authorized redirect URIs added | OAuth client settings | Exact callbacks are `http://localhost:3000/api/auth/callback/google` and `https://app.menulist.digital/api/auth/callback/google` |
| [ ] | QA-D07 | OAuth test users added | Google Auth Platform -> Audience | Named company QA accounts that will run the smoke test are listed |
| [ ] | QA-D08 | OAuth client id/secret stored securely | Password vault | Values are ready for local env and branch-restricted Vercel Preview env |

### Phase E - Required QA Provider Values

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-E01 | MenuList staging Gemini primary and rotation keys created | Google AI Studio | QA keys exist; canonical `MENULIST_GEMINI_AI_KEY`/`_2`/`_3`/`_4`, current app aliases `GEMINI_AI_KEY`/`_2`/`_3`/`_4`, and matching Function secret names are recorded |
| [ ] | QA-E02 | Upstash staging Redis created | Upstash Console | REST URL/token exist and are stored for QA only |
| [ ] | QA-E03 | Razorpay Test Mode keys and webhook secret available | Razorpay Dashboard -> Test Mode | `rzp_test_` key id/key secret and a distinct QA webhook secret are stored; the endpoint is added only after `app.menulist.digital` is live |
| [ ] | QA-E04 | Sentry QA project created | Sentry dashboard | A MenuList QA project/environment exists and its server/browser DSNs are stored because selected Functions bind `SENTRY_DSN` |
| [ ] | QA-E05 | Meta non-production app and WhatsApp test credentials created | Meta Developers | Meta-provided test phone-number id/token, app secret, and a generated verify token are stored; provider processing remains disabled |
| [ ] | QA-E06 | `NEXTAUTH_SECRET` generated | Local terminal and password vault | Separate 32-byte base64url secret is stored, not pasted into docs/chat |
| [ ] | QA-E07 | `MENULIST_OWNER_REFERRAL_TOKEN_SECRET` generated | Local terminal and password vault | Separate 32-byte base64url secret is stored before owner referral is enabled |
| [ ] | QA-E08 | Revalidation secret generated | Password vault | Separate QA value is ready for Vercel and Firebase Function Secret Manager |
| [ ] | QA-E09 | GCP budget webhook secret generated if budget alerts are configured | Google Cloud billing and password vault | Separate QA budget webhook secret is stored or intentionally skipped |
| [ ] | QA-E10 | Cloud Tasks API enabled in `menulist-qa` | Google Cloud APIs | Cloud Tasks is enabled only for the QA project |
| [ ] | QA-E11 | Batch image queue created | Cloud Tasks -> Queues | `batch-image-generation` exists in `us-central1` with bounded dispatch/retry settings |
| [ ] | QA-E12 | Batch worker secret generated | Password vault | One separate random QA-only secret is ready for `BATCH_IMAGE_GENERATION_WORKER_SECRET` |

Provider console links for this phase:

- Google AI Studio API keys: https://aistudio.google.com/apikey
- Upstash Console: https://console.upstash.com/
- Razorpay Dashboard: https://dashboard.razorpay.com/
- Google Cloud Billing: https://console.cloud.google.com/billing
- Cloud Tasks API for `menulist-qa`: https://console.cloud.google.com/apis/library/cloudtasks.googleapis.com?project=menulist-qa
- Cloud Tasks queues for `menulist-qa`: https://console.cloud.google.com/cloudtasks?project=menulist-qa
- Cloud Tasks queue creation reference: https://cloud.google.com/tasks/docs/creating-queues
- Sentry: https://sentry.io/
- Meta Developers: https://developers.facebook.com/apps/

Gemini rotation note: current MenuList Functions targets declare
`GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and `GEMINI_AI_KEY_4`. Prefer separate
real failover keys. If a slot temporarily uses the same Google account/provider
value as the primary key, record it in your vault as a rotate-later placeholder;
do not treat duplicate values as extra quota.

### Phase F - Optional QA Provider Decisions

These can be skipped for the first MenuList QA boot if the matching feature is
not being tested. Sentry and Meta/WhatsApp are not in this optional list because
the maintained full Functions target list binds their Secret Manager names even
while messaging provider processing remains disabled. If an optional provider
is skipped, do not create fake values.

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-F01 | reCAPTCHA/App Check staging registration created if needed | reCAPTCHA Admin and Firebase App Check | `app.menulist.digital`, the website apex, and only tested customer hosts are registered as required; monitor mode only unless approved |
| [ ] | QA-F02 | Telegram staging alert bot/chat created if needed | BotFather and Telegram | `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are stored or skipped intentionally |
| [ ] | QA-F03 | SMTP staging sender configured if needed | Workspace or SMTP provider | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are stored or skipped intentionally |
| [ ] | QA-F04 | UptimeRobot decision recorded | Setup note | Mark enabled or skipped now; create monitors only after the Phase J deployment is live so false setup incidents are not generated |
| [ ] | QA-F05 | GA/Clarity/Plausible staging analytics configured if approved | Analytics provider dashboards | Staging ids are stored or skipped intentionally |

Optional provider console links:

- reCAPTCHA Admin: https://www.google.com/recaptcha/admin/create
- Firebase App Check for MenuList QA:
  https://console.firebase.google.com/project/menulist-qa/appcheck
- Telegram BotFather: https://t.me/BotFather
- UptimeRobot: https://uptimerobot.com/dashboard

### Phase G - Local And Vercel Preview Env

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-G01 | Local ignored env file prepared from `.env.staging.example` | `.env.local` or approved ignored local env | Local values point to `menulist-qa`; local URL overrides use `http://localhost:3000` |
| [ ] | QA-G02 | Branch-restricted Vercel Preview env created | Vercel Project -> Settings -> Environment Variables -> Preview -> Git Branch | Every MenuList QA value, especially secrets, is restricted to exact branch `staging` |
| [ ] | QA-G03 | Runtime URL env values set | Local env and Vercel Preview env | Website/platform values use `menulist.digital`, aliases include `www` and `app`, tenant base uses `menulist.digital`, and `NEXTAUTH_URL` uses `app.menulist.digital` |
| [ ] | QA-G04 | Firebase public canonical keys set | Local env and Vercel Preview env | `NEXT_PUBLIC_MENULIST_FIREBASE_*` values point to `menulist-qa` |
| [ ] | QA-G05 | Firebase public compatibility aliases set | Local env and Vercel Preview env | `NEXT_PUBLIC_FIREBASE_*` values exactly match canonical MenuList values |
| [ ] | QA-G06 | Firebase admin canonical keys set | Local env and Vercel Preview env | `MENULIST_FIREBASE_*` values point to `menulist-qa` |
| [ ] | QA-G07 | Firebase admin compatibility aliases set | Local env and Vercel Preview env | `FIREBASE_*` values exactly match canonical MenuList values |
| [ ] | QA-G08 | Gemini keys, aliases, and rolling ceiling set | Local env and Vercel Preview env | Canonical MenuList keys match current app aliases; `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` uses the approved QA value below the provider ceiling |
| [ ] | QA-G09 | Razorpay Test Mode keys set | Local env and Vercel Preview env | Private and public Razorpay keys start with `rzp_test_` |
| [ ] | QA-G10 | Upstash and revalidation values set | Local env and Vercel Preview env | QA Redis and revalidation secrets are present |
| [ ] | QA-G11 | Provider values handled according to Phase E/F | Local env and Vercel Preview env | Required QA providers use real QA values; optional providers are real QA values or intentionally absent |
| [ ] | QA-G12 | Private key newlines escaped for Vercel | Vercel Preview env | `MENULIST_FIREBASE_PRIVATE_KEY` and `FIREBASE_PRIVATE_KEY` are valid multiline-safe values |
| [ ] | QA-G13 | Production env not touched | Vercel Project -> Environment Variables -> Production | No production values are changed from this guide |
| [ ] | QA-G14 | Other product env setup skipped | Vercel and local env | No real Answerlattice, CampaignCue, SignalDesk, Neelvara, or MyCodex setup is done in this pass |
| [ ] | QA-G15 | MenuList Functions non-secret env set | `functions/.env.menulist-qa` | App/API and message-preview origins are `https://app.menulist.digital`; tenant base is `menulist.digital`; the approved QA Gemini rolling limit is explicit |
| [ ] | QA-G16 | Cloud Tasks worker values set | Local env and Vercel Preview env | Worker URL is the QA app-host endpoint, queue id is `batch-image-generation`, and the QA-only worker secret is present |
| [ ] | QA-G17 | Deployable env values sanitized | Local env and Vercel Preview env | No value contains `<...>` template text, and unrelated product placeholder rows are absent rather than uploaded as values |
| [ ] | QA-G18 | Emulator-first local override documented | Ignored `.env.local` and Firebase Emulator Suite | Destructive/rule-focused local work uses emulator hosts; Vercel remains emulator-off and cloud QA is used only for deliberate integration smoke |

Required runtime values for this guide:

```env
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://menulist.digital
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.digital,www.menulist.digital,app.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.digital
NEXTAUTH_URL=https://app.menulist.digital
```

Required MenuList Functions non-secret values:

```env
NEXT_PUBLIC_APP_URL=https://app.menulist.digital
MENULIST_TENANT_BASE_DOMAIN=menulist.digital
NEXT_PUBLIC_MSG_PREVIEW_BASE_URL=https://app.menulist.digital
MENULIST_GEMINI_SPEND_LIMIT_USD_10M=8
```

### Phase H - Firebase Functions Secrets And Metadata

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-H01 | Firebase CLI login confirmed | Local terminal | `firebase projects:list` shows `menulist-qa` |
| [ ] | QA-H02 | Secret Manager API enabled only in `menulist-qa` | Google Cloud API Library | `secretmanager.googleapis.com` is enabled for the QA project after billing/budgets, not for production |
| [ ] | QA-H03 | Required AI secrets set | Firebase Secret Manager for `menulist-qa` | `GEMINI_AI_KEY`, `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and `GEMINI_AI_KEY_4` exist because current deploy targets declare them |
| [ ] | QA-H04 | Required Upstash secrets set | Firebase Secret Manager for `menulist-qa` | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist |
| [ ] | QA-H05 | Required Razorpay Test Mode Function secrets set | Firebase Secret Manager for `menulist-qa` | `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` use test-mode values; `RAZORPAY_WEBHOOK_SECRET` stays in local/Vercel env for the Next.js webhook route |
| [ ] | QA-H06 | Required WhatsApp, monitoring, and revalidation secrets set for the maintained target list | Firebase Secret Manager for `menulist-qa` | Real QA `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `SENTRY_DSN`, and `REVALIDATION_SECRET` versions exist even while provider processing is disabled |
| [ ] | QA-H07 | Optional Function secrets handled | Firebase Secret Manager for `menulist-qa` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` are real QA values or intentionally skipped until a selected deploy target declares/uses them |
| [ ] | QA-H08 | Secret metadata checked without printing values | Google Secret Manager metadata command | Secret names exist, values are never displayed |
| [ ] | QA-H09 | Production Functions secrets not touched | Firebase/Google Secret Manager | No secrets are set in project id `menulist` |

### Phase I - Firebase QA Infrastructure Deploy

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-I01 | Pinned runtime loaded | Local terminal | `node --version` is `v22.23.1`, matching `.nvmrc` |
| [ ] | QA-I02 | Firebase project pre-check passed | Local terminal | `firebase projects:list` includes exact `menulist-qa` under the intended owner login |
| [ ] | QA-I03 | MenuList root rules predeploy suite passed | Local terminal | `npm run verify:menulist-firebase-rules-predeploy` passes every discovered `demo-*` Firestore/Storage emulator rule script |
| [ ] | QA-I04 | Firestore rules/indexes and Storage rules deployed together | Local terminal | Fresh-project command targets `--project menulist-qa --config firebase.json` only |
| [ ] | QA-I05 | Deployed Firestore rules read back | Firebase Console -> Firestore Database -> Rules | Published source/timestamp match the repository deploy; no Console-only edit exists |
| [ ] | QA-I06 | Deployed Storage rules read back | Firebase Console -> Storage -> Rules | Published source/timestamp match the repository deploy; no Console-only edit exists |
| [ ] | QA-I07 | Deployed index state read back | Firebase CLI and Firebase Console -> Firestore Database -> Indexes | Every declared composite index reaches `READY`; none remain `CREATING` or `ERROR` |
| [ ] | QA-I08 | Rule propagation wait completed | Firebase Console and clock | Several minutes have passed after the successful rules release before live smoke testing |
| [ ] | QA-I09 | Deployed allow/deny smoke matrix passed | Local app connected to cloud `menulist-qa`, Firebase Auth, Rules Playground/direct client, Firestore, and Storage | Own-tenant operations work through real QA Auth; anonymous, cross-tenant, server-only spend-window, and legacy Storage operations are denied before the first Vercel deploy |
| [ ] | QA-I10 | MenuList QA Functions bundle deployed only after rule smoke and required secrets pass | Local terminal | Maintained `functions` script deploys scoped MenuList QA function targets to `menulist-qa` only |
| [ ] | QA-I11 | Deploy/readback/smoke evidence recorded | This checklist and operator evidence | Date, project, commands, result, tester ids, and blockers are recorded without secrets or sensitive payloads |
| [ ] | QA-I12 | Production Firebase deploy not run | Local terminal history and Firebase Console | No command targets `--project menulist` |

### Phase J - Vercel Preview/Staging Deploy

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-J01 | Branch-restricted Preview env reviewed before deploy | Vercel Project -> Environment Variables -> Preview | Required MenuList QA values are present and restricted to exact Git branch `staging` |
| [ ] | QA-J02 | Vercel Preview/Staging deployment triggered | Vercel dashboard or approved git workflow | Deployment is not a production deployment |
| [ ] | QA-J03 | Deployment attached to QA domains | Vercel Project -> Deployments and Domains | Website apex/`www`, owner `app`, and customer wildcard all serve the Preview/Staging deployment |
| [ ] | QA-J04 | Runtime project checked from logs/env evidence | Vercel logs or app diagnostics | Runtime points to `menulist-qa`, not `menulist` |
| [ ] | QA-J05 | Vercel Production not touched | Vercel dashboard | No production deploy or production env edit happens in this guide |

### Phase K - MenuList QA Smoke Test

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-K01 | `https://menulist.digital` opens | Browser | MenuList main website opens with QA/staging values |
| [ ] | QA-K02 | `https://www.menulist.digital` opens | Browser | `www` reaches the same QA website deployment |
| [ ] | QA-K03 | `https://app.menulist.digital/signin` opens | Browser | Canonical QA owner sign-in loads on the app host |
| [ ] | QA-K04 | `https://app.menulist.digital/api/version` opens | Browser | Version endpoint responds from the staging deployment |
| [ ] | QA-K05 | Email/password owner sign-in works | Browser and Firebase Auth | A synthetic QA owner authenticates through the current credential flow on `app.menulist.digital` |
| [ ] | QA-K06 | Google OAuth sign-in works | Browser, Google Auth Platform, and Vercel logs | A listed OAuth test user completes the exact QA callback with no redirect/domain error |
| [ ] | QA-K07 | Single owner dashboard route works | Browser | `https://app.menulist.digital/dashboard` loads and session scope selects the tenant/store |
| [ ] | QA-K08 | Owner onboarding stays on app host | Browser | `https://menulist.digital/create-menu` redirects to `https://app.menulist.digital/create-menu`; Google auth and preview remain on the app host |
| [ ] | QA-K09 | Test business/store can be created or loaded | Browser | Basic owner workflow is usable |
| [ ] | QA-K10 | QA customer link opens | Browser | `https://<test-slug>.menulist.digital` resolves to the test public menu/OBP |
| [ ] | QA-K11 | Firestore writes verified in `menulist-qa` | Firebase Console -> Firestore | Test data appears only in `menulist-qa` |
| [ ] | QA-K12 | Storage writes verified in `menulist-qa` bucket | Firebase Console -> Storage | Test uploads appear only in QA bucket |
| [ ] | QA-K13 | No production writes observed | Firebase Console -> project `menulist` | Production data remains untouched |
| [ ] | QA-K14 | Vercel logs checked | Vercel deployment logs | No missing-env, auth callback, Firebase project, or server secret errors remain |
| [ ] | QA-K15 | QA Sentry event checked | Sentry `menulist-qa` project | One controlled browser/server test error appears only in the QA project and contains no secret or raw sensitive payload |
| [ ] | QA-K16 | Optional post-deploy monitors handled | UptimeRobot/analytics dashboards | Website/app monitors and approved analytics are created and tested, or each is recorded as skipped intentionally |
| [ ] | QA-K17 | Complete QA crawler isolation works | Browser or `curl` | Apex, `www`, `app`, and a QA customer host return `X-Robots-Tag: noindex, nofollow, noarchive`, serve `Disallow: /`, and return `404` for `/sitemap.xml` |
| [ ] | QA-K18 | QA customer origin cannot use owner API CORS | Terminal | A request to an owner API with `Origin: https://<test-slug>.menulist.digital` is rejected and does not receive `Access-Control-Allow-Origin` |
| [ ] | QA-K19 | Explicit no-go checks confirmed | This guide and dashboards | No other product or production setup was performed; retired QA hosts were not activated |
| [ ] | QA-K20 | Controlled batch image worker smoke passes | MenuList QA app, Cloud Tasks, and Vercel logs | One QA batch request reaches `app.menulist.digital`, rejects a wrong secret, accepts the configured secret through the normal queue flow, and leaves no production data |
| [ ] | QA-K21 | Razorpay Test webhook configured and verified | Razorpay Test Mode and Vercel logs | Exact QA endpoint uses the distinct webhook secret; one signed test/sandbox event is accepted without any live-mode operation |
| [ ] | QA-K22 | Final MenuList QA status shared with Codex | Chat plus this file | Codex marks completed items and records blockers before moving to production guide |

## Step-By-Step Setup Order

### Step 1: Create The Permanent Owner Identity And Confirm Access

Where:

- Password manager.
- Registrar account for `neelvara.com` and `menulist.digital`.
- GoDaddy account/products: https://account.godaddy.com/products
- GoDaddy domain search: https://www.godaddy.com/domains
- Google Workspace: https://workspace.google.com/
- Google Admin Console: https://admin.google.com/
- Workspace domain verification: https://support.google.com/a/answer/60216
- Workspace MX setup: https://support.google.com/a/answer/6156494
- Workspace SPF setup: https://support.google.com/a/answer/33786
- Workspace DKIM setup: https://support.google.com/a/answer/174124
- Workspace DMARC setup: https://support.google.com/a/answer/2466580
- Google Cloud Console: https://console.cloud.google.com/
- GitHub repository: https://github.com/menulist-ai/menulist-core
- GitHub organization settings: https://github.com/organizations/menulist-ai/settings/profile
- Vercel dashboard: https://vercel.com/dashboard
- Firebase Console: https://console.firebase.google.com/

What to do:

1. Create the controlled `Neelvara Systems` password vault before opening new
   provider accounts. Add sections for registrar, Workspace, Google Cloud,
   Firebase, GitHub, Vercel, Gemini, Upstash, Razorpay, Sentry, Meta, and
   recovery codes.
2. Sign in to the founder-controlled registrar account, turn on MFA, vault its
   recovery codes, and confirm exact ownership of `menulist.digital`.
3. Search for exact `neelvara.com` at checkout. If it is not already owned and
   the registrar confirms it is available, purchase only that exact domain. Do
   not rely on an earlier availability check and do not choose a substitute.
4. For both domains, enable auto-renew, confirm a valid payment method, enable
   transfer/domain lock, and record the registrar account owner.
5. Create one Google Workspace tenant with `neelvara.com` as its primary domain.
6. Add the exact DNS verification TXT record Google provides at the registrar;
   then return to Admin Console and wait until the domain shows Verified.
7. Create `admin@neelvara.com` as the break-glass Super Admin. Do not use this
   account for ordinary browsing or routine provider work.
8. Create the named daily operator `danny@neelvara.com` or the founder's
   equivalent named mailbox. Grant only the roles needed for setup.
9. Create `billing@neelvara.com`, `security@neelvara.com`, and
   `dmarc@neelvara.com` as aliases or groups that deliver to named real users.
   Do not create shared-password users for these addresses. Configure the DMARC
   report recipient to accept the required external aggregate reports without
   exposing its member list.
10. Publish the exact Google-provided MX record(s), activate Gmail in Admin
    Console, and send a test message in both directions from each real mailbox.
    Remove or replace MX records from any previous mail provider after its mail
    has been exported. Preserve unrelated non-mail DNS records.
11. Publish one SPF TXT record covering every actual sender. For Workspace-only
    sending, follow Google's current Workspace-only value. If an SPF record
    already exists or another sender is active, merge it according to the
    provider instructions; never publish two SPF records.
12. In Admin Console, generate the DKIM record, publish Google's exact TXT value,
    wait for DNS propagation, and click **Start authentication**. Confirm a sent
    test message passes DKIM.
13. After SPF/DKIM have propagated, publish DMARC for `neelvara.com` in
    monitoring mode (`p=none`) with reports delivered to the controlled DMARC
    address. Do not move to quarantine/reject during initial setup.
14. Use a founder's long-lived personal email only as the recovery address. Do
   not create or use `neelvara@gmail.com` as the permanent company root.
15. Turn on MFA for both Workspace accounts and store break-glass recovery codes
   offline and in the controlled vault.
16. Use the named daily operator for normal setup. Use `admin@neelvara.com` only
   when a Super Admin action is required, and confirm the `neelvara.com`
   organization resource is visible.
17. Sign in to GitHub with the company-controlled operator, enable MFA, confirm
    access to existing repository `menulist-ai/menulist-core`, and confirm exact
    branch `staging` exists. Do not create another repository.
18. Sign in to Vercel, enable MFA, and search the company team for a project
    already connected to `menulist-ai/menulist-core`. Reuse it if present. If no
    project exists, import that repository exactly once into the company team.
    Under Project -> Settings -> Git, confirm the connection and branch
    `staging`. Never create a second project for the same repository.
19. Before creating new Firebase credentials, revoke any confirmed retired
    service-account key from an old project. Never copy an old key into
    `menulist-qa`.
20. Create calendar reminders for quarterly IAM/secret review and annual
    domain, payment, recovery-code, and ownership review.

Expected result:

- `admin@neelvara.com` is the recoverable break-glass owner and the named daily
  operator performs routine setup.
- You can access registrar, Google/Firebase, and Vercel from owner-controlled
  accounts, with recovery details stored separately.
- Workspace mail can send and receive, and SPF, DKIM, and monitor-only DMARC are
  active before provider billing/security notices depend on those addresses.
- The existing GitHub repository, `staging` branch, and single Vercel Git
  integration are confirmed.
- No setup depends on a personal disposable login.

### Step 2: Configure MenuList QA Domains

Where:

- Registrar DNS screen.
- Vercel Project -> Settings -> Domains.
- Vercel domain docs: https://vercel.com/docs/domains/working-with-domains
- Vercel Git and branch-domain docs: https://vercel.com/docs/git
- Vercel nameserver docs:
  https://vercel.com/docs/domains/working-with-nameservers

What to do:

1. Confirm `menulist.digital` is owned in the registrar account.
2. Confirm auto-renew is on.
3. Inventory and export every current DNS record before changing DNS authority.
   Include A, AAAA, CNAME, MX, TXT, CAA, and SRV records. A screenshot alone is
   not a restorable zone backup.
4. Confirm Project -> Settings -> Git still points to
   `menulist-ai/menulist-core`. In that existing single Vercel project, add
   `menulist.digital`,
   `www.menulist.digital`, `app.menulist.digital`, and `*.menulist.digital`.
5. Assign every entry to the exact Git branch `staging`. Vercel domains default
   to Production unless explicitly assigned, so verify the Git Branch field on
   each entry instead of relying on the word "Preview" elsewhere in the UI.
6. The maintained apex-wildcard setup uses Vercel nameservers. Before switching
   them at the registrar, recreate every DNS record that must survive in Vercel
   DNS, then compare the old and new zone inventories.
7. Change the registrar nameservers only to the exact values Vercel currently
   shows. Do not invent an A or wildcard CNAME from this guide. If the current
   domain cannot move to Vercel nameservers, stop and review a delegated-domain
   design before issuing any tenant links.
8. Save the branch assignments but do not trigger the first deployment yet.
   Phase J creates the fresh exact-`staging` Preview only after env, secrets,
   Firebase rules, and Functions are ready.
9. Confirm `app`, `www`, `qa`, `dashboard`, and every other reserved platform
   label cannot be issued as a customer slug.
10. Confirm Vercel reports valid domain ownership/DNS and the expected TLS
    certificate state for apex, `www`, `app`, and wildcard. Confirm every domain
    still shows Git Branch `staging`, not Production. Content and HTTPS request
    smoke happens after the Phase J deployment.
11. Do not attach `menulist.online`, `www.menulist.online`, `menulist.ai`, or
    `app.menulist.ai` to this staging flow.

Expected result:

- `menulist.digital`, `www.menulist.digital`, `app.menulist.digital`, and the
  wildcard are DNS/TLS-ready for the first exact-`staging` Preview deployment.
- `app.menulist.digital` is assigned as the only QA owner/auth app host, and QA
  customer tests are assigned to `<business-slug>.menulist.digital`.
- Vercel is authoritative DNS for the apex wildcard and all pre-existing
  required DNS records still resolve.
- `menulist.digital` is not used for MyCodex and is not attached to Production.

### Step 3: Create Or Confirm Firebase Project `menulist-qa`

Where:

- Firebase Console: https://console.firebase.google.com/
- Firebase project docs: https://firebase.google.com/docs/projects/learn-more

What to do:

1. Search for exact Firebase project id `menulist-qa`.
2. If it exists under the owner/company account, use it.
3. If it does not exist, create exactly `menulist-qa` from the named company
   operator account. Use the break-glass admin only if additional organization
   permission is required.
4. Select the Google Cloud organization associated with `neelvara.com` as the
   project resource parent when Google presents that choice.
5. Do not accept a suffixed id.
6. Confirm the project owner/operator and the truthful intended billing owner.
   Do not link billing or create paid resources until Step 4 creates the budget
   guardrails.
7. Enable Firebase Auth, then Authentication -> Sign-in method -> Email/Password.
   Enable Email/Password for the current owner credential flow. Do not enable
   Firebase's Google provider as a substitute for the separate NextAuth Google
   OAuth client configured in Step 5.
8. Create one MenuList Web app named `MenuList QA Web` and store its config
   values in the password vault. Do not create a separate web app per QA host.
9. Confirm no action was taken in Firebase project id `menulist`.

Expected result:

- Firebase project id is exactly `menulist-qa`.
- Firebase Auth and one QA Web app exist under the company project.
- No production project is touched.

### Step 4: Enable QA Billing For Firebase And Gemini

Where:

- Google Cloud Billing: https://console.cloud.google.com/billing
- Firebase project billing: https://console.firebase.google.com/project/menulist-qa/usage/details
- Google Cloud alert-only budgets: https://cloud.google.com/billing/docs/how-to/budgets
- Google Cloud spend-cap budgets Preview: https://cloud.google.com/billing/docs/how-to/budgets-spend-caps
- Gemini API for `menulist-qa`:
  https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=menulist-qa
- Google AI Studio project limits: https://aistudio.google.com/usage
- Gemini API billing docs: https://ai.google.dev/gemini-api/docs/billing

What to do:

1. Link `menulist-qa` to the approved QA Cloud Billing account.
2. When Google creates or selects the payments profile, use the truthful current
   payer, country, address, tax details, and account type. Do not claim Neelvara
   is a registered legal entity when it is not. Record the chosen account type
   in the password vault/setup notes because Google does not let you change it
   on that payments profile later.
3. If the legal payer changes after registration, create a new correctly typed
   Cloud Billing account/payments profile and relink `menulist-qa`; do not
   rewrite false details into the old profile.
4. Create a low alert-only budget scoped to project `menulist-qa` before API
   usage starts. Send notifications to the real billing/security recipients and
   select deliberate threshold percentages. Record the amount and recipients.
   This standard budget sends alerts; it does not stop spending.
5. Enable the Gemini/Generative Language API in exact project `menulist-qa`.
   Do not create a key or make a provider call yet.
6. Create a separate Preview spend-cap budget scoped to project `menulist-qa`
   and service **Gemini API**. Keep the amount below the owner's absolute limit
   because enforcement is not instantaneous and in-flight calls may complete.
   This feature is a Google Cloud Preview capability and may not be available to
   every billing account. If the console does not offer it, stop before paid
   Gemini calls and report the external blocker; do not mark `QA-BILL04` done.
7. Read the current AI Studio rolling spend limit for project `menulist-qa`.
8. Choose and vault `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` below that provider
   limit. The checked-in default is USD 8. Wire it only when Phase G prepares
   the env files.
9. Do not configure a Cloud Run spend cap in this pass. It pauses every Cloud
   Run service, job, and worker pool in the project when enforced.

Expected result:

- `menulist-qa` can deploy Firebase Functions and use paid/production-grade
  services after their provider keys are created in Phase E.
- Alert-only, provider rolling, chosen app-local rolling, and monthly Gemini
  spend-cap layers are all visible and distinct before any paid Gemini call.
- No production billing account or production Firebase project is touched.

### Step 4.1: Create Firebase Data Services And Admin Credentials

Where:

- Firebase Console: https://console.firebase.google.com/project/menulist-qa/overview
- Firestore location docs: https://firebase.google.com/docs/firestore/locations
- Storage setup and Blaze requirement:
  https://firebase.google.com/docs/storage/web/start
- Storage location docs: https://firebase.google.com/docs/storage/locations

What to do:

1. Confirm exact project `menulist-qa` is linked to the guarded billing account
   from Step 4 and now shows the Blaze plan.
2. Enable the `(default)` Firestore database in Native mode. Firestore asks for
   a location; select `us-central1` so it matches the current Firebase Functions
   and Cloud Tasks runtime contract.
3. Enable the default Storage bucket. Select `us-central1` and confirm the new
   bucket name is `menulist-qa.firebasestorage.app`. Its location is permanent.
4. In Authentication -> Settings -> Authorized domains, add only:
   - `localhost`
   - `app.menulist.digital`
5. In Project Settings -> Service accounts, generate one new QA Admin SDK
   private key only when the Vercel server credentials are ready to be entered.
   Vault the `project_id`, `client_email`, and `private_key`; record the key id,
   creation date, and revocation owner.
6. Map the Firebase Web app API key to canonical
   `MENULIST_FIREBASE_API_KEY` and current server alias `FIREBASE_API_KEY` in the
   vault record. It may match the browser Web API key, but both server env names
   remain non-public env entries because current server-auth routes read the
   alias.
7. After extracting the required fields into the vault and ignored local env,
   securely remove the downloaded JSON from Downloads and every unencrypted
   local path. Never commit or upload the JSON file to Vercel.
8. Record the actual Firestore and Storage locations in the vault setup note.
   If either resource already exists elsewhere, do not delete or recreate it;
   stop and report the current location for architecture review.

Expected result:

- Firestore and Storage both report `us-central1` in their console metadata.
- QA sign-in can complete on localhost and `app.menulist.digital`; production
  and customer tenant domains are not authorized in `menulist-qa`.
- Admin credentials and the server Firebase API-key mapping are vaulted, with no
  downloaded JSON left on disk.

Region decision for this setup: use only `us-central1`. Do not create regional
copies or add another deployed environment.

### Step 5: Configure Google OAuth For QA

Where:

- Google Auth Platform for `menulist-qa`:
  https://console.cloud.google.com/auth/overview?project=menulist-qa
- Google Search Console: https://search.google.com/search-console
- Google Auth Platform overview:
  https://support.google.com/cloud/answer/15548748
- Google Auth client setup:
  https://support.google.com/cloud/answer/15549257

What to do:

1. Select exact project `menulist-qa` in the Google Cloud project selector.
2. Verify domain ownership for `menulist.digital` in Search Console using the
   company operator/project owner. DNS verification does not make the QA site
   indexable; the app still enforces its noindex/robots/no-sitemap policy.
3. In Google Auth Platform -> Branding, set the app name to `MenuList QA`, use a
   monitored company support/developer contact, and enter these exact QA pages:
   - Home: `https://menulist.digital`
   - Privacy: `https://menulist.digital/privacy-policy`
   - Terms: `https://menulist.digital/terms-of-service`
   - Authorized domain: `menulist.digital`
4. In Audience, select **External** and keep publishing status **Testing**. Add
   only the named company accounts that will run QA. Do not publish the app or
   request production verification in this pass.
5. In Data Access, keep only the identity scopes used by the current NextAuth
   sign-in: `openid`, `email`, and `profile`. Stop if the console shows a
   sensitive/restricted scope not explained by this guide.
6. In Clients, create one **Web application** OAuth client named
   `MenuList QA Web`.
7. Add the exact Authorized JavaScript origins below. Do not add wildcard tenant
   hosts or customer origins.

Authorized JavaScript origins:

- `http://localhost:3000`
- `https://app.menulist.digital`

Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://app.menulist.digital/api/auth/callback/google`

8. Save the client. Vault the client id and client secret immediately; Google
   may not show the secret again. These become `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET` in Phase G.
9. Re-open the client and compare every origin and redirect character-for-
   character. Do not add `menulist.ai`, `app.menulist.ai`, production callbacks,
   customer wildcards, or Vercel-generated preview URLs.

Expected result:

- OAuth client id and secret are stored for QA use.
- Branding, audience, test users, scopes, origins, and callbacks are all scoped
  to the MenuList QA flow.
- Production OAuth client is not changed.

### Step 5.1: Create MenuList QA Gemini Keys

Where:

- Google AI Studio API keys: https://aistudio.google.com/apikey
- Google Cloud API credentials for `menulist-qa`:
  https://console.cloud.google.com/apis/credentials?project=menulist-qa
- Gemini rate-limit reference: https://ai.google.dev/gemini-api/docs/rate-limits

What to do:

1. In AI Studio, select the existing Google Cloud project `menulist-qa`. Do not
   let AI Studio silently create another project.
2. Create four QA keys named `MenuList QA primary`, `MenuList QA rotation 2`,
   `MenuList QA rotation 3`, and `MenuList QA rotation 4`.
3. In Google Cloud Credentials, restrict each key to the Gemini/Generative
   Language API shown by the current console. These are server keys, so do not
   add browser-referrer restrictions that would prevent Vercel or Functions
   calls.
4. Vault each key and record its Google project, creation date, purpose, and
   revocation owner. Keys in the same project share that project's Gemini quota;
   four keys do not create four quotas.
5. Record the env mapping without placing values in this document:

| Vault entry | Canonical Vercel/local env | Current app/Function alias |
| --- | --- | --- |
| Primary | `MENULIST_GEMINI_AI_KEY` | `GEMINI_AI_KEY` |
| Rotation 2 | `MENULIST_GEMINI_AI_KEY_2` | `GEMINI_AI_KEY_2` |
| Rotation 3 | `MENULIST_GEMINI_AI_KEY_3` | `GEMINI_AI_KEY_3` |
| Rotation 4 | `MENULIST_GEMINI_AI_KEY_4` | `GEMINI_AI_KEY_4` |

Expected result:

- Four real QA keys belong to `menulist-qa`, are API-restricted, and are
  recoverable from the vault.
- No Answerlattice, CampaignCue, SignalDesk, or production key is created.

### Step 5.2: Create The QA Upstash Database

Where:

- Upstash Console: https://console.upstash.com/
- Upstash Redis getting started: https://upstash.com/docs/redis/overall/getstarted

What to do:

1. Create or use one company-controlled Upstash account with MFA/provider login
   recovery recorded in the vault.
2. Create exactly one QA Redis database named `menulist-qa-rate-limit`. Use the
   provider's current low-cost/default single-database option for this pass and
   record the provider-selected location/plan; do not create multi-region or a
   production database yet.
3. Open the database REST details and copy the REST URL plus the standard REST
   token. Do not expose a Redis token to `NEXT_PUBLIC_*` variables.
4. Vault and map the same QA values to:
   - `MENULIST_UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_URL`
   - `MENULIST_UPSTASH_REDIS_REST_TOKEN` and `UPSTASH_REDIS_REST_TOKEN`
5. Do not run destructive flush commands. Connectivity is tested through the
   app's bounded rate-limit path after deployment.

Expected result:

- One isolated QA Redis database exists and both REST values are vaulted.
- No production Upstash database or browser-visible token exists.

### Step 5.3: Prepare Razorpay Test Mode

Where:

- Razorpay Dashboard: https://dashboard.razorpay.com/
- Razorpay test/live quickstart: https://razorpay.com/docs/payments/quickstart/
- Razorpay webhook guide: https://razorpay.com/docs/webhooks/

What to do:

1. Create or use one owner-controlled Razorpay merchant account. Enter the
   truthful current individual/trade-name payer details; do not invent company
   registration, tax, or KYC details.
2. Switch the dashboard to **Test Mode** before generating anything.
3. Generate one test key pair. Confirm the key id starts with `rzp_test_`, vault
   the key id/secret, and record the creation date. Stop if a key starts with
   `rzp_live_`.
4. Generate a separate random QA webhook signing secret and vault it as
   `MENULIST_RAZORPAY_WEBHOOK_SECRET` / `RAZORPAY_WEBHOOK_SECRET`. This value is
   not the Razorpay API key secret.
5. Record the env mapping:
   - `MENULIST_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, and
     `NEXT_PUBLIC_RAZORPAY_KEY_ID` use the same test key id.
   - `MENULIST_RAZORPAY_KEY_SECRET` and `RAZORPAY_KEY_SECRET` use the test key
     secret and stay server-only.
   - `MENULIST_RAZORPAY_WEBHOOK_SECRET` and `RAZORPAY_WEBHOOK_SECRET` use the QA
     webhook secret and stay server-only.
6. Do not add the webhook endpoint yet. Step 9.5 adds it only after
   `https://app.menulist.digital` is live.

Expected result:

- Test keys and a distinct test webhook secret are vaulted.
- Razorpay Live Mode, live keys, and production webhooks remain untouched.

### Step 5.4: Create The MenuList QA Sentry Project

Where:

- Sentry: https://sentry.io/
- Sentry Next.js setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry organization auth tokens:
  https://docs.sentry.io/organization/auth-tokens/

What to do:

1. Create or use one company-controlled Sentry organization and enable the
   strongest available account MFA.
2. Create one Next.js project named `menulist-qa`. Do not reuse a production
   project.
3. Copy the QA DSN. Because local and staging share the QA family, map that DSN
   to `SENTRY_DSN`, `SENTRY_DEV_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and
   `NEXT_PUBLIC_SENTRY_DEV_DSN` in their correct server/public env locations.
4. Create a least-privilege organization auth token only if the current Vercel
   source-map upload requires it. Vault `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and
   `SENTRY_PROJECT`; keep the auth token server-only.
5. Record a retention/PII review owner. Do not enable collection of raw secrets,
   passwords, provider tokens, or unrestricted customer payloads.

Expected result:

- Browser, Next.js server, and selected Firebase Functions can report to one
  isolated MenuList QA Sentry project.
- No production Sentry project or DSN is used.

### Step 5.5: Create Meta WhatsApp Test Credentials Required By The Function Bundle

Where:

- Meta Developers apps: https://developers.facebook.com/apps/
- WhatsApp Cloud API getting started:
  https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/

What to do:

1. Sign in with the owner-controlled Meta developer account and record MFA and
   recovery ownership.
2. Create one non-production app using the WhatsApp-capable business app option
   shown by the current Meta console, then add the WhatsApp product.
3. Use Meta's test WhatsApp number and test recipient flow. Do not connect a
   production business number, production billing, or live customer recipient.
4. Vault the test phone-number id and test access token. Record the token expiry;
   replace an expired temporary token before any messaging smoke test.
5. From App Settings -> Basic, vault the app secret.
6. Generate a separate random verify token and vault it. This is an owner-chosen
   challenge token, not the Meta app secret or access token.
7. Map the values to `MENULIST_WHATSAPP_PHONE_NUMBER_ID`,
   `MENULIST_WHATSAPP_ACCESS_TOKEN`, `MENULIST_WHATSAPP_APP_SECRET`, and
   `MENULIST_WHATSAPP_VERIFY_TOKEN` for local/Vercel only when needed, and to
   Function Secret Manager names without the `MENULIST_` prefix in Phase H.
8. Keep `ENABLE_MESSAGING_ONBOARDING=false`. Do not register the production
   webhook, send live messages, or add a live number during this QA setup.

Expected result:

- The real non-production values required by the maintained Functions target
  declarations exist without activating production messaging.
- If Meta blocks app creation or test credentials, record `QA-E05 blocked` and
  stop before the full Functions deploy. Never use fake values.

### Step 5.6: Generate The Remaining QA-Only Secrets

Where:

- Local terminal, with output moved directly into the password vault.

Run the command separately for each required secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Generate and label separate values for:

- `NEXTAUTH_SECRET`
- `MENULIST_OWNER_REFERRAL_TOKEN_SECRET`
- `REVALIDATION_SECRET`
- `BATCH_IMAGE_GENERATION_WORKER_SECRET`
- `GCP_BUDGET_WEBHOOK_SECRET` only if the optional budget webhook will be used

Never reuse one generated value for two names. Do not paste the output into chat
or this document.

### Step 5.7: Create The QA Cloud Tasks Queue

Where:

- Cloud Tasks API: https://console.cloud.google.com/apis/library/cloudtasks.googleapis.com?project=menulist-qa
- Cloud Tasks queues: https://console.cloud.google.com/cloudtasks?project=menulist-qa
- Google Cloud Shell or a local terminal authenticated to the owner account.

What to do:

1. Confirm the selected project is exactly `menulist-qa`.
2. Enable the Cloud Tasks API.
3. Create the queue with the existing runtime queue id and project location:

```bash
gcloud tasks queues create batch-image-generation \
  --project=menulist-qa \
  --location=us-central1 \
  --max-concurrent-dispatches=8 \
  --max-dispatches-per-second=4 \
  --max-attempts=5 \
  --min-backoff=5s \
  --max-backoff=300s
```

4. If the command reports that the queue already exists, do not create a
   second queue. Inspect the existing one:

```bash
gcloud tasks queues describe batch-image-generation \
  --project=menulist-qa \
  --location=us-central1
```

5. Confirm the separate QA-only `BATCH_IMAGE_GENERATION_WORKER_SECRET` from
   Step 5.6 is vaulted. Do not enter it in an env until Phase G.
6. Record these non-secret values for Phase G:

```env
BATCH_IMAGE_GENERATION_WORKER_URL=https://app.menulist.digital/api/image-generation/batch-generation
BATCH_IMAGE_GENERATION_QUEUE_ID=batch-image-generation
```

Stop if the command targets another project/location, billing is not active,
or the existing queue has materially different retry/rate settings. Share the
output with Codex before changing an existing queue.

Expected result:

- One running `batch-image-generation` queue exists in
  `menulist-qa/us-central1`.
- The worker URL is recorded for the QA owner-app host, not the marketing or
  customer domain.
- No task has been enqueued yet; the controlled worker smoke happens after the
  Vercel staging deployment is live.

### Step 5.8: Record Optional QA Provider Decisions

Do not create optional accounts merely to fill env rows. For the first
MenuList QA boot, use these defaults unless a named test requires otherwise:

1. **Firebase App Check/reCAPTCHA:** skip enforcement. If App Check is being
   evaluated, register only the QA website/app/test hosts and leave it in
   monitoring mode until the normal Auth, Firestore, and Storage smoke passes.
2. **Telegram alerts:** skip unless QA operations alerts are part of this test.
   If enabled, create a QA-only bot/chat through BotFather and vault both
   values; do not reuse a production bot.
3. **SMTP:** skip unless lifecycle-email delivery is part of this test. If
   enabled, create a QA sender in the approved mail provider, verify its sending
   domain, vault host/port/user/password, and send only to controlled testers.
4. **UptimeRobot:** record `Enabled after Phase J` as the recommended decision.
   Do not create monitors until the first staging deployment is live.
5. **Analytics:** skip staging analytics by default. Enable a separate QA
   property only when an analytics test has been explicitly approved; never
   send QA events into production reporting.

Tell Codex the outcome for `QA-F01` through `QA-F05`. Codex will mark each
decision complete and add `Skipped intentionally`, `Enabled after Phase J`, or
the configured QA provider reference without recording a secret.

Expected result:

- Every optional provider has an explicit decision before env preparation.
- No fake placeholder, production credential, or unapproved analytics account
  exists.

### Step 6: Prepare Env Values

Where:

- Local ignored env file.
- Vercel Project -> Settings -> Environment Variables -> Preview.

What to do:

1. Use `.env.staging.example` as the complete inventory. It is not deployable
   as-is and Vercel does not read it automatically.
2. Populate only the MenuList/shared runtime rows required by this pass in the
   ignored local env and Vercel Preview. For every Vercel value, choose Preview
   and restrict its Git Branch to exact branch `staging`; do not expose QA
   secrets to unrelated Preview branches. Remove or leave unset every unrelated
   product row; do not upload literal `<...>` values to make a key look present.
3. Keep production values out of this file.
4. Use full MenuList env names: `MENULIST_*` and `NEXT_PUBLIC_MENULIST_*`.
5. Keep compatibility aliases only where the existing env template lists them.
6. Set `functions/.env.menulist-qa` from its checked-in example so app/API,
   customer-domain, and messaging-preview values remain separate.
7. In the local ignored env, override the deployment markers and URLs below.
   The Firebase/provider values still come from the same QA family:

```env
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_VERCEL_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

8. In Vercel Preview for exact branch `staging`, use the hosted values below:

```env
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://menulist.digital
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.digital,www.menulist.digital,app.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.digital
NEXTAUTH_URL=https://app.menulist.digital
```

9. Populate this minimum MenuList QA value map before the first deployment. Use
   `.env.staging.example` for the exact one-key-per-line inventory and comments:

| Group | Required names for this pass |
| --- | --- |
| Auth | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Firebase browser canonical | `NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY`, `NEXT_PUBLIC_MENULIST_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_MENULIST_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_MENULIST_FIREBASE_APP_ID` |
| Firebase browser current aliases | Matching `NEXT_PUBLIC_FIREBASE_*` values; optional Realtime Database and Measurement ID rows stay absent unless those services are actually configured |
| Firebase server canonical | `MENULIST_FIREBASE_PROJECT_ID`, `MENULIST_FIREBASE_STORAGE_BUCKET`, `MENULIST_FIREBASE_API_KEY`, `MENULIST_FIREBASE_CLIENT_EMAIL`, `MENULIST_FIREBASE_PRIVATE_KEY`, `MENULIST_FIREBASE_PROJECT_LOCATION=us-central1` |
| Firebase server current aliases | Matching `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_API_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_LOCATION=us-central1` |
| Gemini | `MENULIST_GEMINI_AI_KEY` plus `_2`/`_3`/`_4`, matching `GEMINI_AI_KEY` plus `_2`/`_3`/`_4`, and `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` |
| Razorpay Test | `MENULIST_RAZORPAY_KEY_ID`, `MENULIST_RAZORPAY_KEY_SECRET`, `MENULIST_RAZORPAY_WEBHOOK_SECRET`, matching `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| Upstash | `MENULIST_UPSTASH_REDIS_REST_URL`, `MENULIST_UPSTASH_REDIS_REST_TOKEN`, and matching `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Sentry | `SENTRY_DSN`, `SENTRY_DEV_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DEV_DSN`; add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` only when source-map upload is configured |
| App/worker secrets | `MENULIST_OWNER_REFERRAL_TOKEN_SECRET`, `REVALIDATION_SECRET`, `BATCH_IMAGE_GENERATION_WORKER_SECRET` |
| Cloud Tasks | `BATCH_IMAGE_GENERATION_WORKER_URL=https://app.menulist.digital/api/image-generation/batch-generation`, `BATCH_IMAGE_GENERATION_QUEUE_ID=batch-image-generation` |
| Meta/WhatsApp | Canonical `MENULIST_WHATSAPP_*` and matching `WHATSAPP_*` values only when testing the Next.js messaging/phone flow; Function Secret Manager values remain required by Phase H |

10. Leave every `ANSWERLATTICE_*`, `CAMPAIGNCUE_*`, `SIGNALDESK_*`,
    `MYCODEX_*`, and matching `NEXT_PUBLIC_*` sister-product key absent. The
    startup validator permits an entirely absent sister-product Firebase family
    but rejects partial product configuration.
11. Check the actual local env for unresolved placeholders without printing any
    configured values:

```bash
awk -F= '$2 ~ /^<.*>$/ {print $1}' .env.local
```

Expected output: no variable names.

12. In Vercel, review values directly because the checked-in example is only a
    key inventory. Confirm each sensitive value says **Preview** and exact Git
    Branch `staging`.
13. For rule tests and destructive local data work, start the Firebase Emulator
   Suite and use this ignored local override:

```env
NEXT_PUBLIC_USE_EMULATORS=true
FUNCTIONS_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

14. Keep those emulator values off in Vercel. Set them back to `false`/blank
   locally only when deliberately smoke-testing the shared cloud
   `menulist-qa` integration.

Expected result:

- Local and branch-restricted Vercel Preview env use the `menulist-qa`
  configuration family; emulator-first local tests do not create a third
  deployed environment.
- Website runtime values use `menulist.digital`; `NEXTAUTH_URL` uses
  `app.menulist.digital`.
- Generated QA customer links use `<slug>.menulist.digital`.
- Functions use `NEXT_PUBLIC_APP_URL=https://app.menulist.digital`,
  `NEXT_PUBLIC_MSG_PREVIEW_BASE_URL=https://app.menulist.digital`, and
  `MENULIST_TENANT_BASE_DOMAIN=menulist.digital`.
- No deployable env contains a template marker or a fake sister-product value.

### Step 7: Set Firebase Functions Secrets

Where:

- Local terminal with Firebase CLI.
- Google Secret Manager: https://console.cloud.google.com/security/secret-manager

Use only project `menulist-qa`.

Confirm the Firebase login includes exact project `menulist-qa`:

```bash
firebase projects:list
```

Then enable Secret Manager only in that project:

```bash
gcloud services enable secretmanager.googleapis.com --project=menulist-qa
```

Stop on any authentication, IAM, billing, or project-not-found error. Do not
substitute `menulist` or another project.

The maintained full MenuList QA Functions command includes targets whose
deployment options bind Sentry and WhatsApp Secret Manager parameters. Those
secret names must have real QA versions before that command can deploy, even
though `ENABLE_MESSAGING_ONBOARDING=false` keeps provider processing off. To
defer either provider, stop before the Functions deploy and review a smaller
target list separately; never create fake secret values.

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

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
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

If SMTP or Telegram is enabled and a selected Function binds those groups, set
only the corresponding real QA values:

```bash
firebase functions:secrets:set SMTP_HOST --project menulist-qa
firebase functions:secrets:set SMTP_PORT --project menulist-qa
firebase functions:secrets:set SMTP_USER --project menulist-qa
firebase functions:secrets:set SMTP_PASS --project menulist-qa
firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project menulist-qa
firebase functions:secrets:set TELEGRAM_CHAT_ID --project menulist-qa
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
- Firebase Console: https://console.firebase.google.com/project/menulist-qa
- Firebase rules deployment guide:
  https://firebase.google.com/docs/rules/manage-deploy
- Firebase rules emulator testing guide:
  https://firebase.google.com/docs/rules/unit-tests
- [External Certification Runbook Gate 2A](../production-readiness/external-certification-runbook.md#gate-2a-firebase-storage-rules-deployment)

#### 8.1 Load The Pinned Runtime

```bash
nvm use
node --version
npm --version
firebase --version
```

Expected:

- Node prints `v22.23.1`, matching `.nvmrc`.
- Firebase CLI prints a version instead of a missing-command error.

Stop if Node does not match `.nvmrc`. Do not accept rule evidence from a
different runtime when the maintained suite is pinned to Node 22.23.1.

#### 8.2 Confirm Login And Exact Project Access

```bash
firebase projects:list
```

If authentication has expired, run `firebase login` interactively, then repeat
the project list. Confirm the active login is the intended company-controlled
owner/operator and the output includes exact project id `menulist-qa`.

Stop if the project is missing or the command reports IAM, Cloud Resource
Manager, billing, or authentication errors. Do not substitute another project,
create a similarly named project, or continue against `menulist`.

#### 8.3 Run The Complete Local Root-Rules Gate

Optional inventory only:

```bash
npm run verify:menulist-firebase-rules-predeploy -- --list
```

Required local gate:

```bash
npm run verify:menulist-firebase-rules-predeploy
```

The maintained runner discovers every direct Firestore/Storage emulator rule
script that executes against the root `firebase.json`, requires a `demo-*`
project boundary, runs the scripts sequentially, and stops at the first
failure. The discovered count may increase as coverage is added; record the
count printed by the current run instead of copying an old fixed count.

Expected:

- Every discovered emulator rule script passes.
- The runner confirms `firebase.json` still points to `firestore.rules`,
  `firestore.indexes.json`, and `storage.rules`.
- No real Firebase project is read, written, or deployed by this local gate.

Stop on any failure. Fix the repository rule/test mismatch and rerun the entire
gate before deploying.

#### 8.4 Deploy The Fresh MenuList QA Rules Baseline

Required fresh-project command:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive
```

The narrower command below is valid only for a reviewed Firestore-rule-only
change after the QA baseline already exists:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules --non-interactive
```

Do **not** replace the fresh-project command with that narrower command. A new
`menulist-qa` project also needs the repository's composite indexes and Storage
rules.

Expected:

- The CLI reports successful release of Firestore rules, Firestore indexes, and
  Storage rules to exact project `menulist-qa`.
- The command never targets `menulist`.

Stop on any IAM, billing, API enablement, project-not-found, rules compilation,
index, or Storage error. Do not edit rules in Firebase Console to make a deploy
pass; repository files deployed by CLI are the source of truth, and later CLI
deploys overwrite Console-only rule changes.

#### 8.5 Read Back The Deployed State

1. Open Firebase Console -> project `menulist-qa` -> Firestore Database ->
   Rules. Confirm the published timestamp is after this deploy and compare the
   displayed source with `firestore.rules`.
2. Open Firebase Console -> project `menulist-qa` -> Storage -> Rules. Confirm
   the published timestamp is after this deploy and compare the displayed
   source with `storage.rules`.
3. List deployed indexes:

```bash
firebase firestore:indexes --project menulist-qa --database '(default)'
```

4. Open Firebase Console -> Firestore Database -> Indexes. Compare the deployed
   composite index definitions with `firestore.indexes.json` and wait until
   every required index is `READY`.

Rules releases can take several minutes to propagate. Wait after the successful
release before live testing. Do not continue while an index is `CREATING` or
`ERROR`, or when either displayed rules source/timestamp cannot be reconciled
with the repository deploy.

#### 8.6 Smoke The Deployed Rules With Real QA Identities

Prepare two synthetic Firebase Auth users and two synthetic QA businesses in
`menulist-qa`:

- `QA owner A` owns only `QA tenant/store A`.
- `QA owner B` owns only `QA tenant/store B`.

Record only their test labels, Firebase Auth UIDs, tenant ids, and store ids in
the evidence. Never record passwords, tokens, provider keys, or customer data.

For this pre-Vercel gate, run the app locally against the real cloud QA project:

1. Confirm local env uses `NEXT_PUBLIC_ENV=development`, Firebase project
   `menulist-qa`, and the local URLs from Step 6.
2. Set `NEXT_PUBLIC_USE_EMULATORS=false` and remove every emulator host value for
   this deliberate integration smoke.
3. Start the local app without running a production build:

```bash
npm run dev
```

4. Open `http://localhost:3000/signin`. Before any test write, confirm the
   browser/server diagnostics identify project `menulist-qa`, never `menulist`.

Run this matrix after propagation:

| Test | Method | Required result |
| --- | --- | --- |
| Owner A sign-in and own dashboard/store load | Sign in normally at `http://localhost:3000` | Allowed through real `menulist-qa` Firebase Auth and scoped to tenant/store A |
| Owner A harmless own-tenant save | Use one reversible owner-app edit | Allowed; change appears only in `menulist-qa` |
| Owner A own scoped upload | Upload one disposable QA asset through the app | Allowed only under the tenant-scoped Storage path |
| Anonymous owner-only Firestore access | Firebase Rules Playground or direct Web SDK with no auth | Denied |
| Owner A reads or writes tenant/store B | Rules Playground/direct Web SDK using owner A's QA UID and current claims | Denied |
| Browser access to `geminiSpendWindows/menulist` | Rules Playground/direct Web SDK as anonymous, owner, and platform-style test identities; check get/list/create/update/delete | Every operation denied; this collection is server-only |
| Legacy `MenuListAi/project/...` Storage read/write/delete | Direct Storage SDK using anonymous, same-tenant, cross-tenant, and platform-style test identities | Denied as specified by External Certification Gate 2A |
| Owner B normal own-tenant load | Sign in normally at localhost as owner B | Allowed and scoped only to tenant/store B |

Use the Firebase Rules Playground for negative operations the product UI does
not expose. Enter the real QA test UID and the same claims assigned to that test
account. Use the normal app for positive owner flows. Do not use Admin SDK,
Cloud Functions, service-account credentials, or Firebase Console document
edits as proof of Security Rules because privileged server access bypasses the
client rule layer.

Hard stop if any prohibited operation succeeds or any expected own-tenant
operation fails. Do not weaken rules in Console, deploy Functions, trigger a
Vercel deployment, or touch production until the mismatch is fixed, the full
local gate is rerun, rules are redeployed/read back, propagation completes, and
the entire live matrix passes.

After the matrix, stop the local dev server and restore the emulator-first local
override before routine destructive work. Phase K repeats positive auth and
tenant behavior on the hosted QA domains.

#### 8.7 Record Evidence

For `QA-I03` through `QA-I09`, record:

```text
Date/time (Asia/Kolkata):
Operator account:
Firebase project: menulist-qa
Git commit/worktree reference:
Node version:
Firebase CLI version:
Local rule scripts discovered/passed:
Deploy command and result:
Firestore rules published timestamp/readback result:
Storage rules published timestamp/readback result:
Index READY result:
QA owner A UID / tenant id / store id:
QA owner B UID / tenant id / store id:
Allow tests passed:
Deny tests passed:
Blockers:
```

Screenshots must omit tokens, passwords, secret values, personal customer data,
and full provider credentials.

#### 8.8 Validate And Deploy Functions Only After Rules Pass

Validate the local deploy boundary:

```bash
npm run verify:functions-deploy-preflight
npm --prefix functions run build
```

Deploy Functions only after required declared secrets exist:

```bash
npm --prefix functions run deploy:menulist-qa
```

Expected result:

- Rules/indexes/storage are locally verified, deployed to `menulist-qa`, read
  back, propagated, and live-smoked before Functions deployment.
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

1. Confirm Preview env values are present and every MenuList QA value is
   restricted to exact Git branch `staging`.
2. Confirm each QA domain's Git Branch field is exactly `staging`.
3. Trigger a new deployment from the `staging` branch after the domain
   assignments exist.
4. Confirm apex, `www`, `app`, and wildcard `menulist.digital` domains are
   assigned to the staging deployment.
5. Do not trigger or promote Production from this guide.

Expected result:

- `https://menulist.digital` serves the QA website and
  `https://app.menulist.digital` serves the owner app.
- Logs show `menulist-qa` runtime values.

### Step 9.5: Connect Post-Deploy Provider Endpoints

#### Razorpay Test Webhook

1. Open https://dashboard.razorpay.com/ and confirm the dashboard still says
   **Test Mode**.
2. Add this exact webhook URL:

```text
https://app.menulist.digital/api/razorpay/webhook
```

3. Enter the distinct QA webhook signing secret created in Step 5.3. Do not use
   the Razorpay API key secret.
4. Subscribe only to the event families handled by the current route:
   `order.paid`, `payment.failed`, `payment.refunded`, `refund.processed`,
   `subscription.pending`, `subscription.halted`, `subscription.activated`,
   `subscription.charged`, `subscription.completed`,
   `subscription.cancelled`, `subscription.paused`, `subscription.updated`, and
   `subscription.resumed`.
5. Use Razorpay's Test Mode webhook test or one bounded sandbox transaction.
   Confirm Vercel accepts the signed event, rejects an invalid signature, and
   writes only QA billing data. Do not perform a Live Mode transaction.

#### Optional Uptime Monitors

If `QA-F04` was marked enabled, create HTTPS monitors only now for:

- `https://menulist.digital`
- `https://app.menulist.digital/api/version`

Route alerts to a named company operator. Do not create wildcard-per-tenant
monitors during initial QA. If UptimeRobot was intentionally skipped, record
that result under `QA-K16`.

### Step 10: Smoke Test MenuList QA

Open:

- `https://menulist.digital`
- `https://www.menulist.digital`
- `https://app.menulist.digital/signin`
- `https://app.menulist.digital/dashboard`
- `https://app.menulist.digital/create-menu`
- `https://app.menulist.digital/api/version`
- `https://<test-slug>.menulist.digital`

For each host below, open `/robots.txt` and confirm it contains `Disallow: /`;
confirm `/sitemap.xml` returns `404`:

- `https://menulist.digital`
- `https://www.menulist.digital`
- `https://app.menulist.digital`
- `https://<test-slug>.menulist.digital`

Also confirm a normal HTML response from each host includes:

```text
X-Robots-Tag: noindex, nofollow, noarchive
```

Run this with the same test slug (no auth cookie is required for this negative
origin check):

```bash
curl -i \
  -H 'Origin: https://<test-slug>.menulist.digital' \
  https://app.menulist.digital/api/auth/access-status
```

Expected: the request is rejected before owner data access and the response
does not contain `Access-Control-Allow-Origin` for the tenant origin.

Verify that the batch worker rejects an invalid task secret before testing a
real batch. This command deliberately uses a false secret and must return
`403 Forbidden` without creating or changing a job:

```bash
curl -i -X POST \
  -H 'Content-Type: application/json' \
  -H 'project-id: menulist-qa' \
  -H 'x-menulist-task-secret: deliberately-wrong' \
  --data '{}' \
  https://app.menulist.digital/api/image-generation/batch-generation
```

Then use one QA store and one test item to start the normal batch-image flow
from the owner app. Confirm one task appears in the `batch-image-generation`
queue, reaches the QA worker URL, and writes only to `menulist-qa`. Stop after
one controlled item; do not use production data or production keys.

Check:

- Email/password and Google OAuth sign-in both work with synthetic QA users.
- `https://menulist.digital/create-menu` redirects to the app-host onboarding route.
- Every QA website, app, and customer host is `noindex`, disallows crawling,
  and publishes no sitemap.
- A QA customer origin such as `https://<test-slug>.menulist.digital` is not
  admitted by CORS to owner APIs on `app.menulist.digital`.
- Test store workflow works.
- Generated public link uses `https://<slug>.menulist.digital`.
- Firestore writes appear only in `menulist-qa`.
- Storage writes appear only in the `menulist-qa` bucket.
- The Cloud Tasks invalid-secret check returns `403`, and one normal QA batch
  task completes through `app.menulist.digital`.
- The Razorpay Test webhook accepts one correctly signed test/sandbox event and
  rejects an invalid signature; no Live Mode operation occurs.
- One controlled Sentry event reaches only the `menulist-qa` project, and every
  optional monitor/analytics decision is recorded.
- Production project `menulist` remains unchanged.

## Final QA Completion Gate

MenuList QA is complete only when:

- `menulist.digital`, `www.menulist.digital`, and `app.menulist.digital` are live
  on Preview/Staging.
- QA tenant wildcard links work.
- All `menulist.digital` QA hosts pass the noindex, disallow-all robots, and
  no-sitemap checks.
- Vercel QA variables are restricted to exact Git branch `staging`.
- The complete root-rules emulator gate passes; Firestore rules, indexes, and
  Storage rules are deployed/read back; indexes are `READY`; and the real-auth
  allow/deny matrix passes against `menulist-qa`.
- Auth, Firestore, Storage, and required provider keys work against `menulist-qa`.
- The Razorpay Test webhook and isolated QA Sentry event pass without production
  provider usage.
- The `batch-image-generation` QA queue and worker-secret boundary pass their
  controlled smoke test.
- No production Firebase, Vercel Production, `menulist.ai`, `app.menulist.ai`, or
  `menulist.online` setup was touched.
- You report the completed checklist ids back to Codex.

## Maintenance Record Created During QA Setup

This setup is durable, but credentials and ownership still require review.
Before marking QA complete, record the responsible person and next due date for:

| Frequency | Review |
| --- | --- |
| Monthly | Google Cloud/Gemini spend, failed uptime checks, and unresolved Sentry alerts |
| Quarterly | Workspace, Google Cloud, Firebase, Vercel, GitHub, registrar, and provider IAM; unused API/service-account keys; secret rotation need |
| Annually | Domain auto-renew/payment backup, recovery codes, account owners, DNS export, and a documented Firebase backup/restore check before production launch |

Revoke a credential immediately after a leak, staff/access change, or provider
warning; do not wait for the scheduled review.

After this gate passes, create the separate MenuList production setup guide and
repeat the process for production domains and production provider keys.
