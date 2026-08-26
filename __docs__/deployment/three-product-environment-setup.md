# Product Domains, Accounts, And Environment Setup Checklist

> Status: one-time infrastructure setup runbook
> Scope: Neelvara Systems, MenuList, Answerlattice, CampaignCue, SignalDesk, MyCodex
> Last updated: August 15, 2026
> Launch boundary: not current launch certification or deploy approval. This setup checklist cannot certify a release; production deployment approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

This document is the setup checklist for fresh company, domain, staging/local,
and production infrastructure. It is written from the current codebase contract,
not from a future deployment shape.

For first execution, do not start with this combined file. Start with the
dedicated MenuList QA guide:
[MenuList Staging QA Setup Guide](./menulist-staging-qa-setup.md).

Start with the owner-facing setup sequence before filling env values:
[Initial Account, Domain, Firebase, And Vercel Setup Guide](./initial-account-domain-firebase-setup-guide.md).

Current owner corrections:

- `menulist.digital` apex and `www.menulist.digital` are the MenuList QA
  website, `app.menulist.digital` is its single owner/staff app, and
  `*.menulist.digital` is the QA customer-test host family. Attach all only to
  Vercel Preview/Staging, not Production.
- `menulist.online` is not MenuList staging. It is the production customer
  tenant family (`*.menulist.online`) plus exact apex/`www` redirects to
  `menulist.ai`.
- SignalDesk should use the `menulist.online` domain family unless a later
  contract explicitly changes it.
- MenuList product env names should move to `MENULIST_*`; public browser keys
  use `NEXT_PUBLIC_MENULIST_*` because Next.js requires `NEXT_PUBLIC_`.
- SignalDesk env names use `SIGNALDESK_*`. Do not create
  `MENULIST_SIGNALDESK_*` env keys.

Use this as the blind-follow setup guide, with one caveat: domain availability
must be verified in the registrar checkout at purchase time because availability
can change between checks.

## How To Follow This Document

Follow the phases in order. Do not skip forward because later phases depend on
earlier account, project, billing, domain, and env decisions.

Use this operating rule for every checkbox:

- **Where** means the console, file, or command location to open.
- **What to do** means the exact action to take there.
- **Expected result** means what must be true before moving to the next step.

Setup order:

1. Complete Phase 0 and rebuild old local env files from templates if needed.
2. Complete Phase 1 parent identity, domain purchase, Workspace, registrar,
   and the single shared Vercel project.
3. Complete Phase 2 Firebase/Google Cloud projects and billing.
4. Complete Phase 3 Google OAuth and NextAuth.
5. Complete Phase 4 Vercel env variables for staging first.
6. Complete Phase 5 Firebase Secret Manager for staging first.
7. Complete Phase 6 third-party services for staging first.
8. Complete Phase 7 DNS/domain verification for staging hosts only.
9. Complete Phase 8 Firebase infrastructure deploy for staging.
10. Complete Phase 9 seed data for staging.
11. Complete Phase 10 and Phase 11 staging verification.
12. Prepare MenuList production through the dedicated
    [MenuList Production Provider Setup](./menulist-production-provider-setup.md).
    Production deploy, domain assignment, DNS cutover, provider activation,
    and data creation remain blocked until its Phase F gates pass.

Stop rules:

- If a project id is missing or unavailable, stop. Do not substitute another
  project id.
- If a console asks for a secret value and you do not have the real value, leave
  that provider disabled or pending. Do not create dummy secrets.
- If a command fails with IAM, billing, Secret Manager, or project-not-found
  errors, fix cloud setup before changing application code.
- If any instruction conflicts with `src/constants/deploymentTargets.ts`,
  `.firebaserc`, `.env.staging.example`, or `.env.production.example`, stop and
  update this document and the source files together.

## Historical Gemini Production Handoff Log (Superseded)

> This June/July snapshot is retained as setup history. It is not a current
> action register. MenuList QA provider, secret, deploy, and certification
> evidence is recorded in
> [MenuList Staging QA Setup](./menulist-staging-qa-setup.md); current MenuList
> production preparation is recorded in
> [MenuList Production Provider Setup](./menulist-production-provider-setup.md).
> Do not rerun or re-open completed QA items from the historical checklist
> below.

**Date logged:** June 26, 2026
**Scope:** Gemini/AI provider production readiness for MenuList, Answerlattice, and SignalDesk

### Codebase Status

- [x] Active source no longer calls Gemini 2.0 Flash models.
- [x] MenuList Gemini model ids are centralized in `src/constants/AI/models.ts`.
- [x] Answerlattice app model ids are centralized in `src/constants/answerlattice/ai.ts`.
- [x] Answerlattice Functions model ids are centralized in `functions-answerlattice/src/constants/ai.ts`.
- [x] SignalDesk app model ids are centralized in `src/constants/signaldesk/integrations.ts`.
- [x] MenuList daily provider health check writes `_health/aiProvider_gemini`.
- [x] Answerlattice daily provider health check writes `platformSummary/answerlatticeAiProviderHealth`.
- [x] Local verification passed: root TypeScript, MenuList Functions build, Answerlattice Functions build, AI accounting verifier, menu extraction pipeline verifier, and `git diff --check`.

### Current Cloud Access Preflight

Current shell check on July 27, 2026:

- `firebase projects:list` failed with `Failed to authenticate, have you run firebase login?`
- `gcloud projects list` could not run because `gcloud` is not installed on the current shell path.

Required projects that must be visible before deploy continues from the setup
account:

```text
menulist-qa
menulist-prod
neelvara-answerlattice-qa
neelvara-answerlattice-prod
campaigncue-qa
campaigncue
menulist-signaldesk-qa
menulist-signaldesk
```

Do not substitute a retired legacy MenuList project, `menulist-ai`,
`canonica-qa`, or a sample project.

### Deploy Attempts Already Run

Historical MenuList QA health-check deploy evidence targeted `menulist-qa` and reached predeploy lint/build. Do not reuse the older command shape from that attempt; the current scoped retry command is listed in the owner action register below.

Result:

```text
Predeploy lint/build passed.
HTTP Error: 403, The caller does not have permission.
```

Superseded Answerlattice QA health-check deploy attempt against the retired
external project (historical evidence only; do not reuse this target):

```bash
firebase deploy --only functions:answerlattice:answerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json
```

Result:

```text
Predeploy build passed.
HTTP Error: 403, The caller does not have permission.
```

Local Firebase CLI note: Firebase CLI `14.15.1` requires Node 20 or newer. If the shell uses Node 18, switch to Node 20/22/24 before running Firebase deploy commands.

### Owner Action Register

Complete these in order. Do not skip to production until QA passes.

1. [ ] Grant the setup/deploy account access to the exact Firebase/GCP projects listed above, or create them with the exact project ids.
2. [ ] Enable billing, Secret Manager API, required Firebase services, and Vertex AI where applicable for every Firebase-backed project listed above.
3. [ ] Create dedicated Gemini staging and production keys. Restrict each key to the Gemini API. Do not reuse local/staging keys in production.
4. [ ] Store staging Gemini values in Vercel staging and Firebase Secret Manager for `menulist-qa`.
5. [ ] Store production Gemini values in Vercel production and Firebase Secret Manager for `menulist-prod`.
6. [ ] Store Answerlattice Gemini values in `ANSWERLATTICE_GEMINI_AI_KEY` and SignalDesk Gemini values in `SIGNALDESK_GEMINI_AI_KEY` for the matching Vercel environment.
7. [ ] Create every Firebase-declared AI secret before deploying the matching
   Functions target. MenuList uses shared `GEMINI_AI_KEY`, `_2`, and `_3` plus
   isolated `MENULIST_GEMINI_TEXT_AI_KEY`; do not restore `GEMINI_AI_KEY_4`.
   Answerlattice and SignalDesk retain their own product-scoped slot contracts.
   Never treat multiple keys in one provider project as quota scaling.
8. [ ] Configure budget alerts, spend monitoring, and model/project quota checks for the Google Cloud project that owns each Gemini key.
9. [ ] Deploy MenuList QA Functions after secrets exist:
   ```bash
   npm run verify:functions-deploy-preflight
   npm --prefix functions run build
   npm --prefix functions run deploy:menulist-qa
   ```
10. [ ] Deploy Answerlattice QA Functions after project access is fixed:
   ```bash
   firebase deploy --only functions:answerlattice:answerlatticeNightly --project neelvara-answerlattice-qa --config firebase-answerlattice.json
   ```
11. [ ] Deploy SignalDesk QA Functions after project access is fixed:
   ```bash
   firebase deploy --only functions:signaldesk --project menulist-signaldesk-qa --config firebase-signaldesk.json
   ```
12. [ ] Confirm `_health/aiProvider_gemini` updates after the MenuList scheduler runs.
13. [ ] Confirm `platformSummary/answerlatticeAiProviderHealth` updates after the Answerlattice scheduler runs.
14. [ ] Repeat the same setup and deploy flow for production only after QA health checks pass.

## Non-Negotiable Setup Contract

- There are only two operating environments for secrets and infra:
  - local plus staging uses QA/staging values.
  - production uses dedicated production values.
- The Vercel app is one shared project connected to this repo. Product routing is
  handled by domains and code, not by creating one Vercel project per product.
- MenuList, Answerlattice, CampaignCue, and SignalDesk each have separate
  Firebase projects.
- Neelvara is the static parent/entity trust site. It has no Firebase,
  Firestore, Storage, Functions, or billing setup.
- MyCodex is static/private documentation. It has no Firebase, no Firestore, no
  Storage, no Functions, and no billing setup.
- Use full product names in environment variable keys. Do not create `AL_*`,
  `CC_*`, `MC_*`, `SD_*`, `NV_*`, `NEXT_PUBLIC_AL_*`, `NEXT_PUBLIC_CC_*`,
  `NEXT_PUBLIC_MC_*`, `NEXT_PUBLIC_SD_*`, or `NEXT_PUBLIC_NV_*`.
- Internal product codes are separate from env keys:
  - MenuList: `ML`
  - Answerlattice: `AL`
  - CampaignCue: `CC`
  - MyCodex: `MC`
  - SignalDesk: `SD`
- CampaignCue uses `CC` as its internal product code and `campaigncue` as its runtime product slug.
- MyCodex uses `MC` as its reserved internal product code and `mycodex` as its runtime product slug.
- SignalDesk uses `SD` as its internal product code and `signaldesk` as its runtime product slug. Its env prefix is `SIGNALDESK_*`.
- Neelvara is a deployment target and parent site, not a database-backed product code. Public parent-site env values use `NEXT_PUBLIC_NEELVARA_*`.
- Do not use or recreate a retired legacy MenuList project. MenuList
  staging/local is `menulist-qa`.
- Real secrets must never be committed. Store them in Vercel env vars, Firebase
  Secret Manager, ignored local env files, or external password management.
- MenuList keeps one current region contract: `us-central1` for Firestore,
  Storage, Firebase Functions, and Cloud Tasks. Do not create regional copies
  or a third deployed environment during this setup.
- Restrict Vercel staging secrets to each product's exact staging Git branch;
  MenuList uses branch `staging`.
- Every `menulist.digital` QA host is non-indexable, disallows all crawlers, and
  publishes no sitemap.
- Local and staging share QA configuration, but destructive/rule-focused local
  work uses Firebase emulators first.

## Source Of Truth Matrix

| Product | Code | Local URL | Staging URL | Staging Firebase | Production URL | Production Firebase |
| --- | --- | --- | --- | --- | --- | --- |
| MenuList | `ML` | `http://localhost:3000/` | website `https://menulist.digital`; owner app `https://app.menulist.digital`; customers `*.menulist.digital` | `menulist-qa` | website `https://menulist.ai`; owner app `https://app.menulist.ai`; customers `*.menulist.online` | `menulist-prod` |
| Neelvara | none | `http://localhost:3000/__neelvara/` | `https://neelvara.menulist.online` | none | `https://neelvara.com` | none |
| Answerlattice | `AL` | `http://localhost:3000/__answerlattice/` | `https://canonica.app` | `neelvara-answerlattice-qa` | `https://answerlattice.com` | `neelvara-answerlattice-prod` |
| CampaignCue | `CC` | `http://localhost:3000/__campaigncue/` | `https://campaigncue.menulist.online` | `campaigncue-qa` | `https://campaigncue.ai` | `campaigncue` |
| SignalDesk | `SD` | `http://localhost:3000/signaldesk` | `https://signaldesk.menulist.online` | `menulist-signaldesk-qa` | `https://signaldesk.menulist.online` | `menulist-signaldesk` |
| MyCodex | `MC` | `http://localhost:3000/__mycodex/` | no active domain | none | no active domain | none |

Code references:

- Product deployment targets: `src/constants/deploymentTargets.ts`
- Product codes: `src/constants/product.ts`
- Env validation: `src/lib/env/validateEnv.ts`
- Firebase aliases: `.firebaserc`
- Main env templates: `.env.staging.example`, `.env.production.example`

Current live DNS/HTTP spot check from July 27, 2026:

- This dated check covered the retired `qa.menulist.digital` host. Recheck the
  current `menulist.digital`, `www`, `app`, and wildcard QA contract during setup.
- `neelvara.com` and `campaigncue.ai` do not resolve
  from this environment yet. Verify purchase/ownership and Vercel DNS before
  treating those production hosts as live.

## Official Links

Use these links only as setup entry points. For project-specific pages, replace
or select the matching project in the console.

| Service | Setup Link |
| --- | --- |
| Domain registrar / GoDaddy | https://www.godaddy.com/domains |
| Google Admin Console / Workspace | https://admin.google.com/ |
| Google Workspace multiple domains | https://knowledge.workspace.google.com/admin/domains/add-a-user-alias-domain-or-secondary-domain |
| Google Search Console | https://search.google.com/search-console |
| Firebase Console | https://console.firebase.google.com/ |
| Firebase project basics | https://firebase.google.com/docs/projects/learn-more |
| Firebase Auth | https://firebase.google.com/docs/auth |
| Firestore | https://firebase.google.com/docs/firestore |
| Cloud Storage for Firebase | https://firebase.google.com/docs/storage |
| Firebase App Check web reCAPTCHA | https://firebase.google.com/docs/app-check/web/recaptcha-provider |
| Firebase Emulator Suite | https://firebase.google.com/docs/emulator-suite |
| Firebase Functions env and secrets | https://firebase.google.com/docs/functions/config-env |
| Google Cloud Console | https://console.cloud.google.com/ |
| Google Cloud resource hierarchy | https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy |
| Google Cloud IAM | https://console.cloud.google.com/iam-admin/iam |
| Google Cloud service accounts | https://console.cloud.google.com/iam-admin/serviceaccounts |
| Google Cloud OAuth credentials | https://console.cloud.google.com/apis/credentials |
| Google Cloud Secret Manager | https://console.cloud.google.com/security/secret-manager |
| Google Cloud Tasks | https://console.cloud.google.com/cloudtasks |
| Google Cloud Billing | https://console.cloud.google.com/billing |
| Google Cloud billing export | https://console.cloud.google.com/billing/export |
| Google Maps Platform | https://console.cloud.google.com/google/maps-apis |
| Vercel dashboard | https://vercel.com/dashboard |
| Vercel environment variables | https://vercel.com/docs/environment-variables |
| Vercel domains | https://vercel.com/docs/domains |
| Google AI Studio API keys | https://aistudio.google.com/app/apikey |
| Gemini API key security | https://ai.google.dev/gemini-api/docs/api-key |
| OpenAI API keys, optional legacy env | https://platform.openai.com/api-keys |
| Upstash Console | https://console.upstash.com/ |
| Upstash Redis docs | https://upstash.com/docs/redis |
| Razorpay Dashboard | https://dashboard.razorpay.com/ |
| Razorpay API keys | https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/ |
| Razorpay webhooks | https://razorpay.com/docs/webhooks/ |
| Sentry dashboard | https://sentry.io/ |
| Sentry Next.js docs | https://docs.sentry.io/platforms/javascript/guides/nextjs/ |
| Sentry auth tokens | https://docs.sentry.io/organization/auth-tokens/ |
| Google Analytics | https://analytics.google.com/analytics/web/ |
| Google Analytics Data API | https://developers.google.com/analytics/devguides/reporting/data/v1 |
| Microsoft Clarity | https://clarity.microsoft.com/ |
| Google reCAPTCHA admin | https://www.google.com/recaptcha/admin/create |
| Meta developers | https://developers.facebook.com/apps/ |
| WhatsApp Cloud API | https://developers.facebook.com/docs/whatsapp/cloud-api/get-started |
| WhatsApp message templates | https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/ |
| Gmail app passwords | https://myaccount.google.com/apppasswords |
| Gmail SMTP settings | https://support.google.com/a/answer/176600 |
| Telegram BotFather | https://t.me/BotFather |
| Telegram bots docs | https://core.telegram.org/bots |
| Slack incoming webhooks | https://api.slack.com/messaging/webhooks |
| GitHub webhooks | https://docs.github.com/en/webhooks |
| Shopify webhooks | https://shopify.dev/docs/apps/build/webhooks |
| UptimeRobot | https://uptimerobot.com/ |

## Account Ownership Rule

Use one parent operating identity and one shared infrastructure account stack:

- Parent operating/trade name: Neelvara Systems.
- Domain registrar: one founder-controlled account with MFA, recovery codes,
  auto-renew, and backup payment method.
- Google Workspace: one tenant with `neelvara.com` as the primary domain after
  purchase; product domains are added as secondary or alias domains.
- Google Cloud/Firebase: one company-controlled organization/billing account;
  separate Firebase projects underneath it.
- Vercel: one fresh Neelvara-owned account/team and one fresh project connected
  to this repo; do not transfer old deployments, history, or environment values.
- GitHub: use the fresh company-admin account `neelvara-admin` with
  `admin@neelvara.com`, keep its personal public-profile name optional, create
  the `neelvara-systems` organization, natively transfer the existing repo
  through the controlled admin account without making the retired source
  account an organization member, add a backup owner before production, and
  enforce MFA. Use a dedicated Neelvara
  SSH key on each workstation, update the local remote after transfer, keep
  author identity repository-local, and retire an old key only after the new
  account can authenticate and fetch the transferred repository.
- Razorpay: one merchant account under the real Neelvara legal/trade identity.
- Password manager: one company vault for registrar, Workspace, GitHub, Vercel,
  Firebase, Razorpay, provider credentials, and recovery codes.

Use `admin@neelvara.com` as the only human Workspace, Google Cloud, Firebase,
and provider owner/operator for every product. Do not create a named daily
operator, product-specific user, duplicate Super Admin, or random Gmail
account. Retain offline recovery codes and an independently controlled recovery
path for this single identity.

Create service accounts per project only where the app needs server credentials.
Do not use personal user keys for application runtime.

Do not describe Neelvara Systems as Pvt Ltd, LLP, corporation, or holding
company in account/legal materials until the CA/legal adviser confirms the final
structure.

## Files To Fill

| File | Purpose | Secret? | Commit real values? |
| --- | --- | --- | --- |
| `.env.staging.example` | Canonical local/staging Vercel env checklist | no, template only | yes, placeholders only |
| `.env.production.example` | Canonical production Vercel env checklist | no, template only | yes, placeholders only |
| `.env.local` | Local runtime values copied from staging template | yes | no |
| `functions/.env.menulist-qa.example` | MenuList staging Functions non-secret template | no | yes, placeholders only |
| `functions/.env.menulist-prod.example` | MenuList production Functions non-secret template | no | yes, placeholders only |
| `functions/.env.menulist-qa` | MenuList staging Functions non-secret runtime values | no secrets | no |
| `functions/.env.menulist-prod` | MenuList production Functions non-secret runtime values | no secrets | no |
| `functions-answerlattice/.env.answerlattice-qa.example` | Answerlattice staging Functions non-secret template | no | yes, placeholders only |
| `functions-answerlattice/.env.answerlattice.example` | Answerlattice production Functions non-secret template | no | yes, placeholders only |
| `functions-answerlattice/.env.answerlattice-qa` | Answerlattice staging Functions non-secret runtime values | no secrets | no |
| `functions-answerlattice/.env.answerlattice` | Answerlattice production Functions non-secret runtime values | no secrets | no |
| `firebase-signaldesk.json` | SignalDesk Firebase deploy config | no | yes |
| `firestore-signaldesk.rules` | SignalDesk Firestore rules | no | yes |
| `storage-signaldesk.rules` | SignalDesk Storage rules | no | yes |
| `firestore-signaldesk.indexes.json` | SignalDesk Firestore indexes | no | yes |
| `functions-signaldesk/` | SignalDesk Functions codebase; no declared Secret Manager secrets today | no secrets in tracked code | yes |

Vercel does not read `.env.staging.example` or `.env.production.example`
directly. Copy their keys into Vercel Project Settings for the correct
environment scope.

The example files are inventories, not deployable configurations. Never place a
literal `<...>` placeholder in `.env.local`, a Functions runtime env, or Vercel.
For a product-by-product setup, omit unrelated product rows from the actual
environment until those products are configured.

## Phase 0: Do Not Reuse Old Local Env Files Blindly

If `.env`, `.env.local`, or `.env.prod` already exist from the old setup, treat
them as legacy local files until they are rebuilt from the templates above.

Before using an existing local env file:

- [ ] Confirm MenuList local/staging points to exact project `menulist-qa`.
- [ ] Confirm MenuList production points to exact project `menulist-prod`.
- [ ] Confirm hosted staging uses `NEXT_PUBLIC_ENV=preview`; local development
      overrides it with `NEXT_PUBLIC_ENV=development` while retaining the same
      QA Firebase/provider family.
- [ ] Confirm production uses `NEXT_PUBLIC_ENV=production`.
- [ ] Confirm `NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES` does not mix staging and
      production MenuList domains in the same env scope.
- [ ] Confirm Answerlattice values are not blank.
- [ ] Confirm CampaignCue values exist.
- [ ] Confirm SignalDesk values point to `menulist-signaldesk-qa` for
      local/staging.
- [ ] Confirm Neelvara static contact emails are `@neelvara.com`.
- [ ] Confirm MyCodex static auth values exist.
- [ ] Confirm old generic `NEXT_PUBLIC_FIREBASE_DATABASE_URL` and
      `NEXT_PUBLIC_FB_DATABASE_URL` are not used instead of canonical
      `NEXT_PUBLIC_MENULIST_FB_DATABASE_URL`.

Repo guard command for the checked-in templates and deployment matrix:

```bash
npm run verify:env-targets
```

For real `.env` files, compare keys and safe public project/domain values only.
Do not print or paste private keys, tokens, passwords, or client secrets.

If an old env file still contains a retired Firebase project id, rebuild it from
`.env.staging.example` or `.env.production.example` rather than patching a few
individual lines. The current templates contain many more required product env
keys than the old files.

## Phase 1: Prepare Access And Domains

### 0. Purchase or retain domains

Open registrar/domain account: https://www.godaddy.com/domains

Use one founder/company-controlled registrar account. Do not split product
domains across personal accounts.

| Domain | Purpose | Action |
| --- | --- | --- |
| `neelvara.com` | Neelvara Systems parent/entity trust website | Purchase or confirm ownership now; live DNS check on July 27, 2026 returned `ENOTFOUND` |
| `menulist.ai` | MenuList production marketing/platform root | Already resolves; retain and connect/verify in Vercel |
| `app.menulist.ai` | MenuList production owner/staff authenticated app | Subdomain only; configure in Vercel/DNS |
| `*.menulist.online` | MenuList production customer menu/OBP tenant links | Wildcard/subdomains only; configure in Vercel/DNS |
| `menulist.online` | Production redirect to `menulist.ai`; SignalDesk and sister-product staging subdomains also use this domain family | Already resolves; retain |
| `menulist.digital` | MenuList QA/staging website apex and customer-link base | Already owned; attach to Vercel Preview/Staging only; do not use for MyCodex |
| `www.menulist.digital` | MenuList staging main website `www` alias | Subdomain only; attach to Vercel Preview/Staging only |
| `app.menulist.digital` | MenuList QA owner/staff app | Subdomain only; attach to Vercel Preview/Staging only |
| `*.menulist.digital` | MenuList QA customer test links | Wildcard/subdomains only; configure in Vercel/DNS |
| `answerlattice.com` | Answerlattice production website/app | Already resolves; retain and connect/verify in Vercel |
| `campaigncue.ai` | CampaignCue production website/app | Purchase or confirm ownership now; live DNS check on July 27, 2026 returned `ENOTFOUND` |
| `canonica.app` | Answerlattice QA website/app | Retain as the exact QA host; attach only to Vercel custom environment `qa` and branch `staging` |

Do not purchase:

- `constantlayer.in`
- `growthos.app`
- `surfaceos.app`
- `kitstamp.com` or `kitstamp.app`
- `menunexus.com`, `menunexus.ai`, `menunexus.app`, `menunexus.co`, or `menunexus.in`
- a separate MyCodex domain
- a separate SignalDesk domain

### 0.1. Workspace email setup

Open Google Admin: https://admin.google.com/

Create the single company Super Admin and operator mailbox:

```text
admin@neelvara.com
```

Do not create another Workspace or Cloud Identity user for routine work or for
any product. Use the controlled company profile for provider work, enable MFA
on `admin@neelvara.com`, and store its recovery codes offline and in the
company vault.

Create aliases or groups instead of paid users for every address below:

Neelvara:

- `hello@neelvara.com`
- `support@neelvara.com` as a Google Group owned by the monitored company
  administrator so it can be selected as a Google OAuth support contact
- `billing@neelvara.com`
- `security@neelvara.com`
- `dmarc@neelvara.com`
- `legal@neelvara.com`
- `privacy@neelvara.com`

Route the remaining Neelvara addresses above to the same licensed company
mailbox as aliases. Do not add duplicate `contactus@neelvara.com` or
`help@neelvara.com` identities unless the public contact contract is changed.

MenuList:

- `hello@menulist.ai`
- `support@menulist.ai`
- `partners@menulist.ai`
- `sales@menulist.ai`
- `billing@menulist.ai`
- `legal@menulist.ai`
- `privacy@menulist.ai`
- `security@menulist.ai`
- `founder@menulist.ai`
- `system@menulist.ai` or `noreply@menulist.ai` as send-only identity

Answerlattice:

- `hello@answerlattice.com`
- `partners@answerlattice.com`
- `noreply@answerlattice.com`

CampaignCue:

- Reserve `hello@campaigncue.ai`; activate it only when public launch setup starts.

SignalDesk:

- No separate domain mailbox. Use `signaldesk@menulist.ai` only if private
  internal routing needs a mailbox later.

For every sending domain, configure SPF, DKIM, and DMARC in DNS and test
delivery before using production SMTP.

### 1. Confirm domain ownership

Open the registrar or DNS provider for each domain:

- `neelvara.com`
- `menulist.digital`
- `menulist.online`
- `menulist.ai`
- `answerlattice.com`
- `campaigncue.ai`

Expected hostnames:

| Hostname | Environment | Product |
| --- | --- | --- |
| `menulist.digital` | staging | MenuList main website |
| `www.menulist.digital` | staging | MenuList main website |
| `app.menulist.digital` | staging | MenuList owner/staff app |
| `*.menulist.digital` | staging | MenuList customer tests |
| `neelvara.menulist.online` | staging | Neelvara |
| `canonica.app` | staging | Answerlattice |
| `www.canonica.app` | staging | Answerlattice |
| `campaigncue.menulist.online` | staging | CampaignCue |
| `signaldesk.menulist.online` | staging | SignalDesk |
| `menulist.ai` | production | MenuList |
| `www.menulist.ai` | production | MenuList |
| `app.menulist.ai` | production | MenuList app alias |
| `help.menulist.ai` | production | MenuList help alias |
| `support.menulist.ai` | production | MenuList support alias |
| `*.menulist.online` | production | MenuList customer/public subdomains |
| `menulist.online` | production redirect | Redirect to `menulist.ai` |
| `www.menulist.online` | production redirect | Redirect to `menulist.ai` |
| `neelvara.com` | production | Neelvara |
| `www.neelvara.com` | production | Neelvara |
| `answerlattice.com` | production | Answerlattice |
| `www.answerlattice.com` | production | Answerlattice |
| `campaigncue.ai` | production | CampaignCue |
| `www.campaigncue.ai` | production | CampaignCue |
| `signaldesk.menulist.online` | private | SignalDesk |

Do not guess DNS records. Add only domains authorized for the current environment
in Vercel, then follow the exact DNS instructions Vercel shows. Before changing
DNS authority, export the current zone and recreate all records that must
survive. The QA apex wildcard `*.menulist.digital` uses Vercel nameservers;
assign QA domains to exact Git branch `staging` and create a fresh branch
deployment after assignment so they do not silently default to Production.
Do not add or cut over `*.menulist.online` or another production domain until
the production provider ledger reaches its certification-gated activation
phase.

### 2. Create the shared Vercel project

Open: https://vercel.com/dashboard

Checklist:

- [ ] Confirm the old Vercel phone number is released/unlinked before deleting
      the old account.
- [ ] Inventory only old domain assignments and env-key/provider names; revoke
      or rotate every referenced credential at its issuing provider.
- [ ] Remove old custom domains/subscriptions/projects/teams and delete the old
      account only after the teardown prerequisites pass.
- [ ] Create the fresh Neelvara Vercel account/team with MFA/passkey and
      recovery.
- [ ] Import `neelvara-systems/menulist-core` once after native GitHub transfer.
- [ ] Populate environment values only from maintained templates and newly
      generated QA credentials; never copy old Vercel values.
- [ ] Use one Vercel project for all product/domain surfaces.
- [ ] Do not create separate Vercel projects for MenuList, Answerlattice,
      CampaignCue, SignalDesk, Neelvara, or MyCodex.
- [ ] Connect the production branch to Vercel Production.
- [ ] Create the custom Vercel environment `qa`, attach it only to the exact
      staging Git branch `staging`, and keep its deployment stage markers on
      `preview`.
- [ ] In staging, keep `NEXT_PUBLIC_ENV=preview` because the current code
      resolves staging through the `preview` deployment stage.
- [ ] In local development, use `NEXT_PUBLIC_ENV=development` and
      `NEXT_PUBLIC_VERCEL_ENV=development`; this changes runtime routing only and
      does not create another deployed environment.

Important MyCodex note: MyCodex currently has no active public domain. Do not
add a MyCodex custom domain in Vercel unless the static-reader architecture and
domain decision are reopened first.

## Phase 2: Create Firebase And Google Cloud Projects

Create or confirm exactly these Firebase project ids:

| Product | Staging/local project | Production project |
| --- | --- | --- |
| MenuList | `menulist-qa` | `menulist-prod` |
| Answerlattice | `neelvara-answerlattice-qa` | `neelvara-answerlattice-prod` |
| CampaignCue | `campaigncue-qa` | `campaigncue` |
| SignalDesk | `menulist-signaldesk-qa` | `menulist-signaldesk` |
| Neelvara | none | none |
| MyCodex | none | none |

Before creating app config, confirm the current login can see the target
projects.

Where:

- Terminal in this repo.
- Firebase Console: https://console.firebase.google.com/
- Google Cloud Console: https://console.cloud.google.com/

What to do:

```bash
firebase projects:list
gcloud projects list --format='value(projectId)'
```

Expected result:

- [ ] `menulist-qa` is visible.
- [ ] `menulist-prod` is visible.
- [ ] `neelvara-answerlattice-qa` is visible.
- [ ] `neelvara-answerlattice-prod` is visible.
- [ ] `campaigncue-qa` is visible.
- [ ] `campaigncue` is visible.
- [ ] `menulist-signaldesk-qa` is visible.
- [ ] `menulist-signaldesk` is visible.

If any target project is missing:

- [ ] Create it in Firebase Console with the exact project id, or get IAM access
      from the owner account.
- [ ] Do not use a retired legacy MenuList project, `menulist-ai`, `canonica-qa`, or any sample project
      as a substitute.
- [ ] Do not continue to OAuth, Vercel env, Secret Manager, or deploy steps
      until all required project ids are visible to the setup account.

### 1. Firebase console project links

| Project | Firebase link |
| --- | --- |
| `menulist-qa` | https://console.firebase.google.com/project/menulist-qa/overview |
| `menulist-prod` | https://console.firebase.google.com/project/menulist-prod/overview |
| `neelvara-answerlattice-qa` | https://console.firebase.google.com/project/neelvara-answerlattice-qa/overview |
| `neelvara-answerlattice-prod` | https://console.firebase.google.com/project/neelvara-answerlattice-prod/overview |
| `campaigncue-qa` | https://console.firebase.google.com/project/campaigncue-qa/overview |
| `campaigncue` | https://console.firebase.google.com/project/campaigncue/overview |
| `menulist-signaldesk-qa` | https://console.firebase.google.com/project/menulist-signaldesk-qa/overview |
| `menulist-signaldesk` | https://console.firebase.google.com/project/menulist-signaldesk/overview |

If a link opens a missing project page, create the project with that exact id.
If the id is unavailable, stop and update the deployment matrix in code/docs
before using a different id.

### 2. Enable billing

Open Google Cloud Billing: https://console.cloud.google.com/billing

For each Firebase-backed project:

- [ ] Link billing account.
- [ ] Confirm Blaze plan is enabled where Cloud Functions, Secret Manager,
      Storage, Cloud Tasks, or production monitoring requires it.
- [ ] Add budget alerts before Cloud Functions deploys, Secret Manager use,
      Gemini API keys, Cloud Tasks, production monitoring, or production
      traffic.
- [ ] Record that alert-only budgets notify only; Preview spend-cap enforcement
      is a separate project-and-service control.

Projects:

- [ ] `menulist-qa`
- [ ] `menulist-prod`
- [ ] `neelvara-answerlattice-qa`
- [ ] `neelvara-answerlattice-prod`
- [ ] `campaigncue-qa`
- [ ] `campaigncue`
- [ ] `menulist-signaldesk-qa`
- [ ] `menulist-signaldesk`

### 3. Enable Firestore

For each Firebase-backed project:

- [ ] Open Firebase Console.
- [ ] Build > Firestore Database.
- [ ] Create database in Native mode.
- [ ] Firestore asks for an explicit location. For MenuList, select
      `us-central1` so it matches the current Functions/Tasks contract.
- [ ] Record the actual location. Firestore location is immutable after
      provisioning; stop for review if an existing resource differs.
- [ ] Do not relax rules for staging.

### 4. Enable Cloud Storage for Firebase

For each Firebase-backed project:

- [ ] Open Firebase Console.
- [ ] Build > Storage.
- [ ] Create the default bucket in the documented product region. MenuList QA
      Storage must use `us-central1`.
- [ ] Record the actual location. Storage location is immutable after
      provisioning; stop for review if an existing bucket differs.
- [ ] Copy the bucket name into the matching env variables.

Storage bucket env variables:

- MenuList: `NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET`
- Answerlattice: `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET`
- CampaignCue: `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET`
- SignalDesk: `NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET`,
  `SIGNALDESK_FIREBASE_STORAGE_BUCKET`

### 5. Create Firebase web apps

For each Firebase-backed project:

- [ ] Open Project settings > General.
- [ ] Create one Web App.
- [ ] Copy the generated config into Vercel env for that environment.

MenuList staging uses:

- `NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY`
- `NEXT_PUBLIC_MENULIST_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_MENULIST_FB_DATABASE_URL`
- `NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID=menulist-qa`
- `NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_MENULIST_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_MENULIST_FIREBASE_APP_ID`
- `NEXT_PUBLIC_MENULIST_FIREBASE_MEASUREMENT_ID`

MenuList production uses the same key names with
`NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID=menulist-prod`. Generic Firebase names are
read-only migration fallbacks in runtime code and must not be stored in current
env files or Vercel.

Answerlattice staging uses:

- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=neelvara-answerlattice-qa`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID`

Answerlattice production uses the same key names with
`NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=neelvara-answerlattice-prod`.

CampaignCue staging uses:

- `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_MODE=separate`
- `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_API_KEY`
- `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID=campaigncue-qa`
- `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_APP_ID`
- `NEXT_PUBLIC_CAMPAIGNCUE_FIRESTORE_DATABASE_ID`

CampaignCue production uses the same key names with
`NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID=campaigncue`.

CampaignCue production/preview cannot opt into shared Firebase mode. The
canonical project identifier and any service-account file's `project_id` must
exactly match the stage target. A mismatch is a setup error,
not permission to fall back to MenuList Firebase.

SignalDesk staging uses:

- `NEXT_PUBLIC_SIGNALDESK_FIREBASE_MODE=separate`
- `NEXT_PUBLIC_SIGNALDESK_FIREBASE_API_KEY`
- `NEXT_PUBLIC_SIGNALDESK_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID=menulist-signaldesk-qa`
- `NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET=menulist-signaldesk-qa.firebasestorage.app`
- `NEXT_PUBLIC_SIGNALDESK_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_SIGNALDESK_FIREBASE_APP_ID`
- `NEXT_PUBLIC_SIGNALDESK_FIRESTORE_DATABASE_ID`

SignalDesk production uses the same key names with
`NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID=menulist-signaldesk` and
`NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET=menulist-signaldesk.firebasestorage.app`.

Neelvara has no Firebase web app and no Firebase env variables.
MyCodex has no Firebase web app and no Firebase env variables.

### 6. Enable Firebase Authentication

For each Firebase-backed project:

- [ ] Open Build > Authentication.
- [ ] Enable Email/Password if owner credential login is required.
- [ ] Enable Phone only when OTP flows are actually ready for that project.
- [ ] Add authorized domains.

Authorized domains:

| Project | Domains |
| --- | --- |
| `menulist-qa` | `localhost`, `app.menulist.digital` |
| `menulist-prod` | `app.menulist.ai` |
| `neelvara-answerlattice-qa` | `localhost`, `canonica.app`, `www.canonica.app` |
| `neelvara-answerlattice-prod` | `answerlattice.com`, `www.answerlattice.com` |
| `campaigncue-qa` | `localhost`, `campaigncue.menulist.online` |
| `campaigncue` | `campaigncue.ai`, `www.campaigncue.ai` |
| `menulist-signaldesk-qa` | `localhost`, `signaldesk.menulist.online` |
| `menulist-signaldesk` | `signaldesk.menulist.online` |

### 7. Configure Admin SDK workload identities

For the four MenuList/Answerlattice Firebase projects used by the shared Vercel
app, use the approved Vercel OIDC -> Google Workload Identity Federation path:

- [ ] custom Vercel environment `qa`, attached only to branch `staging`, uses
      dedicated identities in `menulist-qa` and `answerlattice-qa`;
- [ ] Vercel Production uses dedicated identities in `menulist-prod` and
      `answerlattice`;
- [ ] each project has its own service account, pool/provider configuration,
      and exact-subject IAM binding; no identity crosses project boundaries;
- [ ] do not generate Firebase Admin private keys or weaken inherited
      key-creation policy for any of these four managed Vercel targets;
- [ ] Firebase Functions use their attached Google-managed runtime service
      accounts through Application Default Credentials. Do not copy Vercel
      OIDC configuration or JSON keys into Functions env/Secret Manager.
- [ ] For another product that still has an approved explicit off-Google key,
      store the downloaded JSON outside git, copy only the documented fields,
      delete the temporary file, and retain owner/rotation/revocation evidence.

MenuList env:

- `NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY`
- both custom QA and production Vercel: `MENULIST_FIREBASE_ADMIN_AUTH_MODE=vercel_oidc`,
  `MENULIST_GCP_PROJECT_NUMBER`, `MENULIST_GCP_SERVICE_ACCOUNT_EMAIL`,
  `MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID`, and
  `MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID`
- `MENULIST_FIREBASE_PROJECT_LOCATION=us-central1`

The project ID, bucket, and Web API key are already public Firebase Web config.
Server code reuses those canonical values. Do not add server or generic aliases.

Answerlattice env:

- `ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE=vercel_oidc`
- `ANSWERLATTICE_GCP_PROJECT_NUMBER`
- `ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL`
- `ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID`
- `ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID`

The server reuses `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE`, project ID,
storage bucket, and optional Firestore database ID. Do not add private copies
of those non-secret Firebase identifiers.

CampaignCue env:

- `CAMPAIGNCUE_FIREBASE_CLIENT_EMAIL`
- `CAMPAIGNCUE_FIREBASE_PRIVATE_KEY`
- `CAMPAIGNCUE_GOOGLE_APPLICATION_CREDENTIALS`

The server reuses `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_MODE`, project ID,
storage bucket, and optional Firestore database ID. Do not add private copies
of those non-secret Firebase identifiers.

SignalDesk env:

- `SIGNALDESK_FIREBASE_MODE=separate`
- `SIGNALDESK_FIREBASE_PROJECT_ID`
- `SIGNALDESK_FIREBASE_STORAGE_BUCKET`
- `SIGNALDESK_FIREBASE_CLIENT_EMAIL`
- `SIGNALDESK_FIREBASE_PRIVATE_KEY`
- `SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS`
- `SIGNALDESK_FIRESTORE_DATABASE_ID`

Local development may override either Admin mode to `adc`. Managed Vercel QA and
Production must not contain the MenuList or Answerlattice client-email,
private-key, or credential-file variables. Never add a generic
`FIREBASE_PRIVATE_KEY` row to current Vercel env.

## Phase 3: Configure Google OAuth And NextAuth

Open Google Cloud OAuth credentials:
https://console.cloud.google.com/apis/credentials

Create a separate Web OAuth client for every product and environment. MenuList
QA, MenuList production, Answerlattice QA, and Answerlattice production may
share approved company consent/branding ownership, but they must not share
credentials or mix origins/callbacks across products or environments.

The shared NextAuth code uses one provider ID and callback shape but routes
credentials by hostname. MenuList clients use `GOOGLE_CLIENT_*`; Answerlattice
clients use `ANSWERLATTICE_GOOGLE_CLIENT_*`. This is code reuse, not credential
reuse.

MenuList QA/local JavaScript origins:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `https://app.menulist.digital`
- `https://campaigncue.menulist.online`
- `https://signaldesk.menulist.online`

MenuList production JavaScript origins:

- `https://app.menulist.ai`
- `https://campaigncue.ai`
- `https://www.campaigncue.ai`
- `https://signaldesk.menulist.online`

Answerlattice QA JavaScript origins:

- `https://canonica.app`
- `https://www.canonica.app`

Answerlattice production JavaScript origins:

- `https://answerlattice.com`
- `https://www.answerlattice.com`

Redirect URI pattern:

```text
https://<domain>/api/auth/callback/google
```

MenuList QA/local redirect URIs, in the MenuList QA client:

- `http://localhost:3000/api/auth/callback/google`
- `http://127.0.0.1:3000/api/auth/callback/google`
- `https://app.menulist.digital/api/auth/callback/google`
- `https://campaigncue.menulist.online/api/auth/callback/google`
- `https://signaldesk.menulist.online/api/auth/callback/google`

MenuList production redirect URIs, in the MenuList production client:

- `https://app.menulist.ai/api/auth/callback/google`
- `https://campaigncue.ai/api/auth/callback/google`
- `https://www.campaigncue.ai/api/auth/callback/google`
- `https://signaldesk.menulist.online/api/auth/callback/google`

Answerlattice QA redirect URIs, in the Answerlattice QA client:

- `https://canonica.app/api/auth/callback/google`
- `https://www.canonica.app/api/auth/callback/google`

Answerlattice production redirect URIs, in the Answerlattice production
client:

- `https://answerlattice.com/api/auth/callback/google`
- `https://www.answerlattice.com/api/auth/callback/google`

Vercel env, using different values in custom `qa` and Production:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ANSWERLATTICE_GOOGLE_CLIENT_ID`
- `ANSWERLATTICE_GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

Do not set `NEXTAUTH_URL` in a hosted shared Vercel environment. NextAuth must
derive the current Vercel request origin so each host uses its own host-only
cookie and exact callback. A localhost-only `NEXTAUTH_URL` remains allowed.
Never add Canonica or Answerlattice callbacks to a MenuList OAuth client.

Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

MyCodex does not use Firebase Auth or Google OAuth in the current static reader
contract. It uses:

- `MYCODEX_BASIC_AUTH_USER`
- `MYCODEX_BASIC_AUTH_PASSWORD`
- `MYCODEX_SESSION_SECRET`

## Phase 4: Configure Vercel Env Variables

Open Vercel dashboard: https://vercel.com/dashboard

Use:

- `.env.staging.example` as the Vercel custom `qa` inventory; local development
  uses the same QA project family but overrides Admin auth mode to `adc`.
- `.env.production.example` for Vercel Production.

### 1. Custom QA and local scope

Create the custom Vercel environment `qa`, attach it only to exact Git branch
`staging`, and store QA values there. Do not use the generic Preview identity
for Firebase Admin access. Local development uses ignored local env plus ADC;
never expose provider secrets to all Preview branches.

Set these identity values:

```env
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://menulist.digital
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.digital,www.menulist.digital,app.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.digital
```

Do not set `NEXTAUTH_URL` in this hosted environment. It would force every
shared-project OAuth callback to the MenuList host instead of the host that
started sign-in.

Use QA Firebase values:

- MenuList: `menulist-qa`
- Neelvara: no Firebase
- Answerlattice: `neelvara-answerlattice-qa`
- CampaignCue: `campaigncue-qa`
- SignalDesk: `menulist-signaldesk-qa`
- MyCodex: no Firebase

For destructive/rule-focused local work, use the same QA configuration with
local runtime markers and the Firebase Emulator Suite:

```env
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_VERCEL_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
FUNCTIONS_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

Keep these values off in Vercel. Emulator use does not create a third deployed
environment.

### 2. Production Vercel scope

Set these identity values:

```env
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_APP_URL=https://menulist.ai
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.ai
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.ai,www.menulist.ai,app.menulist.ai
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.online
```

Use production Firebase values:

- MenuList: `menulist-prod`
- Neelvara: no Firebase
- Answerlattice: `answerlattice`
- CampaignCue: `campaigncue`
- SignalDesk: `menulist-signaldesk`
- MyCodex: no Firebase

### 3. Vercel env groups to fill

Fill every key in the templates. These are the groups and where values come
from.

| Group | Variables | Source |
| --- | --- | --- |
| Runtime identity | `NEXT_PUBLIC_ENV`, `NEXT_PUBLIC_VERCEL_ENV`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEPLOYMENT_URL`, `NEXT_PUBLIC_PLATFORM_DOMAIN`, `NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES`, `NEXT_PUBLIC_BUILD_ID`, `NEXT_PUBLIC_BUILD_CREATED_AT`, `NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE` | repo contract plus Vercel build metadata |
| Auth | shared `NEXTAUTH_SECRET`; MenuList `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; Answerlattice `ANSWERLATTICE_GOOGLE_CLIENT_ID` / `ANSWERLATTICE_GOOGLE_CLIENT_SECRET`; no hosted `NEXTAUTH_URL` | OpenSSL plus separate product/environment Google Cloud OAuth clients |
| MenuList Firebase client | `NEXT_PUBLIC_MENULIST_FIREBASE_*` only | Firebase Web App config |
| MenuList Firebase Admin | custom QA and production: `MENULIST_FIREBASE_ADMIN_AUTH_MODE=vercel_oidc`, `MENULIST_GCP_PROJECT_NUMBER`, `MENULIST_GCP_SERVICE_ACCOUNT_EMAIL`, `MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID`, `MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID`; both reuse canonical public project ID/bucket plus `MENULIST_FIREBASE_PROJECT_LOCATION` | project-local Vercel OIDC and Google Workload Identity Federation; local override is ADC |
| Answerlattice Firebase client | `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_*`, `NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID` | Answerlattice Firebase Web App config |
| Answerlattice Firebase Admin | custom QA and production: `ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE=vercel_oidc`, `ANSWERLATTICE_GCP_PROJECT_NUMBER`, `ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL`, `ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID`, `ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID`; reuse canonical public identifiers | project-local Vercel OIDC and Google Workload Identity Federation; local override is ADC |
| Answerlattice runtime | `ANSWERLATTICE_CRON_SECRET`, `ANSWERLATTICE_MCP_SESSION_SECRET`, `ANSWERLATTICE_PUBLIC_BUNDLE_SALT`, `ANSWERLATTICE_NIGHTLY_TRIGGER_URL`, `ANSWERLATTICE_TRIGGER_NIGHTLY_URL`, `ANSWERLATTICE_PUBLIC_API_DEBUG`, `ANSWERLATTICE_TEST_URL`, `NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY` | generated secrets plus deployed function URL and product URL |
| CampaignCue Firebase client | `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_*`, `NEXT_PUBLIC_CAMPAIGNCUE_FIRESTORE_DATABASE_ID` | CampaignCue Firebase Web App config |
| CampaignCue Firebase Admin | `CAMPAIGNCUE_FIREBASE_CLIENT_EMAIL`, `CAMPAIGNCUE_FIREBASE_PRIVATE_KEY`, `CAMPAIGNCUE_GOOGLE_APPLICATION_CREDENTIALS`; reuse canonical public identifiers | CampaignCue Firebase service account plus Firebase Web config |
| CampaignCue CueLayers | `CAMPAIGNCUE_CUE_LAYERS_LOW_COST_IMAGE_MODEL`, `CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL`, `CAMPAIGNCUE_CUE_LAYERS_PREMIUM_IMAGE_MODEL`, `CAMPAIGNCUE_CUE_LAYERS_PREMIUM_ROLLOUT_PERCENT`, `CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL`, `CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT`, `CAMPAIGNCUE_TEMPLATE_SEED_ACTOR` | explicit premium boolean, real segmentation model ID or blank, and bounded 0-100 rollout |
| SignalDesk Firebase client | `NEXT_PUBLIC_SIGNALDESK_FIREBASE_*`, `NEXT_PUBLIC_SIGNALDESK_FIRESTORE_DATABASE_ID` | SignalDesk Firebase Web App config |
| SignalDesk Firebase Admin | `SIGNALDESK_FIREBASE_*`, `SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS`, `SIGNALDESK_FIRESTORE_DATABASE_ID` | SignalDesk Firebase service account |
| SignalDesk AI and bridge | `SIGNALDESK_GEMINI_AI_KEY`, `SIGNALDESK_GEMINI_AI_KEY_2`, `SIGNALDESK_GEMINI_AI_KEY_3`, `SIGNALDESK_GEMINI_AI_KEY_4`, `SIGNALDESK_AI_MODEL`, `SIGNALDESK_OUTCOME_BRIDGE_SECRET` | Google AI Studio plus generated HMAC secret |
| SignalDesk optional providers | `SIGNALDESK_APIFY_*`, `SIGNALDESK_GOOGLE_PLACES_API_KEY`, `SIGNALDESK_META_*`, `SIGNALDESK_MESSENGER_PAGE_ID`, `SIGNALDESK_INSTAGRAM_PAGE_ID`, `SIGNALDESK_WHATSAPP_PHONE_NUMBER_ID`, `SIGNALDESK_EMAIL_*`, `SIGNALDESK_SMTP_*`, `SIGNALDESK_UNSUBSCRIBE_URL`, `SIGNALDESK_PHYSICAL_ADDRESS`, `SIGNALDESK_SMARTLEAD_*` | leave blank until provider account, legal approval, budget cap, and provider-send gate are approved |
| Neelvara static contact | `NEXT_PUBLIC_NEELVARA_CONTACT_EMAIL`, `NEXT_PUBLIC_NEELVARA_LEGAL_EMAIL`, `NEXT_PUBLIC_NEELVARA_PRIVACY_EMAIL` | Workspace aliases |
| MyCodex static auth | `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, `MYCODEX_SESSION_SECRET` | generated credentials/password manager |
| MenuList AI | Root/Vercel: `MENULIST_GEMINI_AI_KEY`, `MENULIST_GEMINI_SPEND_LIMIT_USD_10M`; Functions Secret Manager: `GEMINI_AI_KEY`, `MENULIST_GEMINI_TEXT_AI_KEY`; optional `OPENAI_API_KEY` | Google AI Studio and optional OpenAI; follow `gemini-credential-billing-strategy.md` |
| Payments | Root/Vercel: `MENULIST_RAZORPAY_KEY_SECRET`, `MENULIST_RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID`, `CRON_SECRET`, `INTERNAL_BILLING_EMAIL`, `GCP_BUDGET_WEBHOOK_SECRET`; Functions Secret Manager: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay plus generated internal secrets |
| Cache and revalidation | Root/Vercel: `MENULIST_UPSTASH_REDIS_REST_URL`, `MENULIST_UPSTASH_REDIS_REST_TOKEN`, `MENULIST_REVALIDATION_SECRET`; Functions Secret Manager: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REVALIDATION_SECRET` | Upstash plus generated shared-value secrets |
| Cloud Tasks | Root/Vercel: reuse `NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID`, plus `MENULIST_FIREBASE_PROJECT_LOCATION`, `MENULIST_BATCH_IMAGE_GENERATION_WORKER_URL`, `MENULIST_BATCH_IMAGE_GENERATION_QUEUE_ID`, `MENULIST_BATCH_IMAGE_GENERATION_WORKER_SECRET` | Google Cloud Tasks |
| Analytics/maps | `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY`, `GA_PROJECT_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` | GA4, Clarity, Maps |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE`, `SENTRY_ENABLED_IN_EMULATOR`; Firebase Functions use project-local `SENTRY_DSN` Secret Manager | Sentry |
| App Check and emulators | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_MENULIST_FIREBASE_APPCHECK_DEBUG_TOKEN`, `NEXT_PUBLIC_USE_EMULATORS`, `FUNCTIONS_EMULATOR`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_STORAGE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` | reCAPTCHA/App Check and local emulator settings |
| Email and alerts | Root/Vercel: `MENULIST_SMTP_HOST`, `MENULIST_SMTP_PORT`, `MENULIST_SMTP_USER`, `MENULIST_SMTP_PASS`, `MENULIST_TELEGRAM_BOT_TOKEN`, `MENULIST_TELEGRAM_CHAT_ID`, plus the shared notification rows; Functions Secret Manager: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | SMTP provider, Telegram, Slack |
| WhatsApp and OTP | Root app: optional `MENULIST_WHATSAPP_PHONE_NUMBER_ID`, `MENULIST_WHATSAPP_ACCESS_TOKEN`, `MENULIST_WHATSAPP_OTP_TEMPLATE_NAME`, `MENULIST_WHATSAPP_OTP_TEMPLATE_LANGUAGE`, `MENULIST_WHATSAPP_OTP_ALLOW_TEXT_FALLBACK`, plus phone dev controls and `NEXT_PUBLIC_MSG_PREVIEW_BASE_URL`. Firebase Functions: project-local `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` Secret Manager values and messaging-onboarding flags in the product Functions env file | Meta WhatsApp and internal OTP policy; do not duplicate Functions-only values into root/Vercel env |
| External Answerlattice widget client | `NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY`, `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC` | Answerlattice widget setup; the key name is client-generic while the optional script override remains scoped to this MenuList deployment |
| Menu link import | `MENU_LINK_IMPORT_CHROME_PATH`, `MENU_LINK_IMPORT_CHROME_NO_SANDBOX` | local/server browser capability |
| Vercel API | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | Vercel project settings/API tokens |
| Optional webhooks | `GITHUB_WEBHOOK_SECRET`, `SHOPIFY_WEBHOOK_SECRET` | GitHub/Shopify dashboard |

Firebase Admin credential and local ADC diagnostics use `src/lib/firebase/firebaseAdminDiagnostics.ts`. Do not debug these paths by logging service-account file paths, service-account JSON, private keys, client emails, raw credential errors, or ADC exception text. Use the bounded Admin bootstrap codes guarded by `npm run verify:auth-security-failure-matrix`.

SignalDesk is intentionally stricter than the local ADC fallback used by
Answerlattice and CampaignCue: its app-server Admin runtime accepts only the
product-scoped `SIGNALDESK_FIREBASE_*` credential values, the
product-scoped `SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS` file, or
emulator identity. It must not fall back to generic host ADC because that
credential may belong to another Firebase product or deployment stage.

Startup environment validation diagnostics use `src/lib/env/envDiagnostics.ts`. Do not debug missing env setup by logging secret values or full local `.env` contents. The runtime diagnostic records missing/warning counts and product-stage failure codes; this document remains the source for exact variables to configure.

Commented legacy API envs seen in old code are not part of the active setup:

- `NEXT_PUBLIC_UPDATE_ADDRESS`
- `NEXT_PUBLIC_GET_USER`
- `NEXT_PUBLIC_UPDATE_OPTIN_FOR_WAPP`
- `NEXT_PUBLIC_UPDATE_VISIT_COUNT`

Do not add them unless that commented legacy API path is intentionally revived.

Verification-only local envs are also not part of Vercel or production setup.
For example, the owner mobile certification harness can read
`MOBILE_QA_ENV_FILE`, `MOBILE_QA_BASE_URL`, `MOBILE_QA_OUTPUT_DIR`,
`MOBILE_QA_DEBUG_PORT`, `MOBILE_QA_CDP_TIMEOUT_MS`,
`MOBILE_QA_REQUIRE_EXPLICIT_FIXTURE`, `MOBILE_QA_EMAIL`,
`MOBILE_QA_STORE_ID`, `MOBILE_QA_PROJECT_ID`, and
`MOBILE_QA_PROJECT_NAME` when the script is run manually. These are not
required staging/production env vars and must not be added to Vercel as app
runtime configuration.

## Phase 5: Configure Firebase Secret Manager

Open Secret Manager: https://console.cloud.google.com/security/secret-manager

Firebase Functions only receive secrets that are set in Secret Manager and
declared by the function. Do not put these values in tracked function dotenv
files.

### 1. Secret Manager preflight

Where:

- Google Cloud Console > APIs & Services.
- Google Cloud Console > Billing.
- Terminal in this repo.

What to do:

1. Enable billing for every Firebase-backed target project.
2. Enable Secret Manager API for every Firebase-backed target project.
3. Confirm the authenticated account can list secret metadata.

Commands:

```bash
gcloud services enable secretmanager.googleapis.com --project menulist-qa
gcloud services enable secretmanager.googleapis.com --project menulist-prod
gcloud services enable secretmanager.googleapis.com --project neelvara-answerlattice-qa
gcloud services enable secretmanager.googleapis.com --project neelvara-answerlattice-prod
gcloud services enable secretmanager.googleapis.com --project campaigncue-qa
gcloud services enable secretmanager.googleapis.com --project campaigncue
gcloud services enable secretmanager.googleapis.com --project menulist-signaldesk-qa
gcloud services enable secretmanager.googleapis.com --project menulist-signaldesk

gcloud secrets list --project menulist-qa --format='value(name)'
gcloud secrets list --project menulist-prod --format='value(name)'
gcloud secrets list --project neelvara-answerlattice-qa --format='value(name)'
gcloud secrets list --project neelvara-answerlattice-prod --format='value(name)'
gcloud secrets list --project campaigncue-qa --format='value(name)'
gcloud secrets list --project campaigncue --format='value(name)'
gcloud secrets list --project menulist-signaldesk-qa --format='value(name)'
gcloud secrets list --project menulist-signaldesk --format='value(name)'
```

Expected result:

- [ ] Commands return a secret-name list or an empty list.
- [ ] No command returns `CONSUMER_INVALID`.
- [ ] No command returns `SERVICE_DISABLED`.
- [ ] No command returns `BILLING_DISABLED`.

If `CONSUMER_INVALID` appears, the project id does not exist for this account or
the account lacks access. Stop and fix project creation/IAM.

If `SERVICE_DISABLED` appears, enable Secret Manager API for that project.

If `BILLING_DISABLED` appears, enable billing for that project.

### 2. MenuList staging Functions secrets

Run after selecting/login to the right Firebase account:

```bash
firebase functions:secrets:set GEMINI_AI_KEY --project menulist-qa
firebase functions:secrets:set MENULIST_GEMINI_TEXT_AI_KEY --project menulist-qa
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

### 3. MenuList production Functions secrets

Repeat the same commands with:

```bash
--project menulist-prod
```

Use production values, not copied staging/test secrets.

### 4. Answerlattice Functions secrets

Staging:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project neelvara-answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY --project neelvara-answerlattice-qa --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_PUBLIC_BUNDLE_SALT --project neelvara-answerlattice-qa --config firebase-answerlattice.json
```

Production:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project neelvara-answerlattice-prod --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY --project neelvara-answerlattice-prod --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_PUBLIC_BUNDLE_SALT --project neelvara-answerlattice-prod --config firebase-answerlattice.json
```

### 5. CampaignCue, SignalDesk, Neelvara, and MyCodex secrets

CampaignCue currently has no Firebase Cloud Functions in this repo. Configure
CampaignCue server/Admin SDK values in Vercel env.

SignalDesk has its own Firebase Functions codebase, but current
`functions-signaldesk/src` does not declare Secret Manager secrets. Configure
SignalDesk app/runtime values in Vercel env through `SIGNALDESK_*`.
If a future SignalDesk Function adds a declared secret, update this section
before deploying that function.

Neelvara is static/no DB and has no Firebase Functions secrets.

MyCodex has no Firebase Functions and no Firebase Secret Manager setup.

## Phase 6: Third-Party Setup Checklist

Do not create these external accounts unless a future owner-approved activation
changes the repo contract:

- ConstantLayer accounts.
- Canonica Firebase, email, payment, or social accounts.
- Separate MyCodex domain/account stack.
- Separate SignalDesk domain.
- CampaignCue social OAuth/provider connections. CampaignCue remains
  export/download-only until a separately authorized activation path exists.
- SignalDesk paid sender/enrichment/provider accounts such as Apollo, Hunter,
  ZeroBounce, Postmark, Resend, Smartlead, Instantly, or lemlist until sender,
  legal, provider, and budget approvals exist.
- Apple App Store or Google Play accounts. Current products are web/PWA.
- OpenAI, Slack, Shopify, Maps, or public-media API accounts unless the matching
  optional integration is deliberately activated.

### 1. Google AI Studio / Gemini

Open: https://aistudio.google.com/app/apikey

Checklist:

- [ ] Create the dedicated staging credential set: shared primary, shared
      failover slots 2 and 3, and one extraction credential.
- [ ] Create the equivalent dedicated production credential set with
      production-only values.
- [ ] Restrict every credential to the Gemini API.
- [ ] Confirm the production key is not used by local development or staging.
- [ ] Store the staging primary in Vercel custom environment `qa` as
      `MENULIST_GEMINI_AI_KEY`.
- [ ] Store the production primary in Vercel Production under the same canonical
      MenuList name with a production-only value.
- [ ] Store keys in MenuList Firebase Secret Manager for `menulist-qa` and
      `menulist-prod`.
- [ ] Create/store Answerlattice keys in `ANSWERLATTICE_GEMINI_AI_KEY` and
      matching Answerlattice Firebase Secret Manager.
- [ ] Create/store SignalDesk keys in `SIGNALDESK_GEMINI_AI_KEY`.
- [ ] Confirm budget alerts already exist for the Google Cloud project before
      using the key for paid Gemini calls.
- [ ] Add the required extraction key as `MENULIST_GEMINI_TEXT_AI_KEY`.
      MenuList and Answerlattice rotate primary credentials in place. SignalDesk
      retains its independently governed current contract.
- [ ] Leave `GEMINI_API_KEY` blank unless a legacy path explicitly requires it.
- [ ] Confirm Google Cloud billing is enabled for the key's project.
- [ ] Configure budget and usage alerts for the key's Google Cloud project.
- [ ] Check model/project quota before launch; do not treat extra key slots as
      quota scaling.
- [ ] After Functions deploy, confirm `_health/aiProvider_gemini` and
      `platformSummary/answerlatticeAiProviderHealth` update successfully.

Use only the Gemini env names already present in code and templates:

- MenuList Vercel/setup records: `MENULIST_GEMINI_AI_KEY` only.
- MenuList Firebase Functions Secret Manager: project-local `GEMINI_AI_KEY`
  for primary AI and `MENULIST_GEMINI_TEXT_AI_KEY` for menu extraction.
- Answerlattice app/Functions: `ANSWERLATTICE_GEMINI_AI_KEY` only.
- SignalDesk app/runtime: `SIGNALDESK_GEMINI_AI_KEY` plus
  `SIGNALDESK_GEMINI_AI_KEY_2`,
  `SIGNALDESK_GEMINI_AI_KEY_3`, and
  `SIGNALDESK_GEMINI_AI_KEY_4`.

Do not invent shorthand env keys such as `ML_GEMINI_AI_KEY`,
`AL_GEMINI_AI_KEY`, `CC_GEMINI_AI_KEY`, or `SD_GEMINI_AI_KEY`. Do not invent
`CAMPAIGNCUE_GEMINI_AI_KEY` until CampaignCue provider-call activation is
approved in code and docs.

MenuList and Answerlattice rotate credentials by replacing managed values in
place. The dedicated MenuList extraction key isolates credential lifecycle and
failure containment. Production scaling requires paid billing, model-level
quota monitoring, backpressure, and quota increase requests. See
[Gemini Credential And Billing Strategy](./gemini-credential-billing-strategy.md).

### 2. OpenAI, optional legacy env

Open: https://platform.openai.com/api-keys

Checklist:

- [ ] Leave `OPENAI_API_KEY` blank unless the OpenAI helper is intentionally
      enabled.
- [ ] If enabled, create separate staging and production keys.
- [ ] Store the key only in Vercel env, not in public code.

### 3. Upstash Redis

Open: https://console.upstash.com/

Checklist:

- [ ] Create one Redis database for staging.
- [ ] Create one Redis database for production.
- [ ] Copy REST URL and REST token.
- [ ] Set Vercel env:
      `MENULIST_UPSTASH_REDIS_REST_URL`,
      `MENULIST_UPSTASH_REDIS_REST_TOKEN`.
- [ ] Set MenuList Functions secrets `UPSTASH_REDIS_REST_URL` and
      `UPSTASH_REDIS_REST_TOKEN` for both `menulist-qa` and `menulist-prod`.
- [ ] Do not share production Redis with staging.

Used for rate limiting, cache paths, Answerlattice instant/predictive cache, and
owner business assistant context cache.

### 4. Razorpay

Open dashboard: https://dashboard.razorpay.com/

Docs:

- API keys: https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/
- Webhooks: https://razorpay.com/docs/webhooks/

Checklist:

- [ ] Use Razorpay Test Mode for staging.
- [ ] Generate test key id and secret.
- [ ] Set staging Vercel env:
      `MENULIST_RAZORPAY_KEY_SECRET`,
      `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID`,
      `MENULIST_RAZORPAY_WEBHOOK_SECRET`.
- [ ] Set staging MenuList Functions secrets:
      `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
- [ ] Add staging webhook endpoint:
      `https://app.menulist.digital/api/razorpay/webhook`.
- [ ] Use Razorpay Live Mode for production.
- [ ] Generate live key id and secret.
- [ ] Set production Vercel env with live values.
- [ ] Set production MenuList Functions secrets with live values.
- [ ] Record the intended production webhook endpoint
      `https://app.menulist.ai/api/razorpay/webhook`, but do not activate it
      until the production provider ledger reaches Phase F.
- [ ] Copy the webhook signing secret from each Razorpay webhook into the
      matching Vercel env scope.

Do not use live keys in staging.

### 5. Sentry

Open: https://sentry.io/

Docs:

- Next.js: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Auth tokens: https://docs.sentry.io/organization/auth-tokens/

Checklist:

- [ ] Create or confirm the Sentry organization.
- [ ] Create a project for this app, or separate staging/production projects if
      you want strict error separation.
- [ ] Copy the environment-specific shared-app DSN once into
      `NEXT_PUBLIC_SENTRY_DSN`; Vercel scope selects staging or production.
- [ ] Do not duplicate that value into root `SENTRY_DSN`, `SENTRY_DEV_DSN`, or
      `NEXT_PUBLIC_SENTRY_DEV_DSN` rows.
- [ ] Create source-map upload token.
- [ ] Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- [ ] Set MenuList Functions `SENTRY_DSN` secret for `menulist-qa` and
      `menulist-prod`.

### 6. Google Analytics 4

Open: https://analytics.google.com/analytics/web/

Data API docs: https://developers.google.com/analytics/devguides/reporting/data/v1

Checklist:

- [ ] Create or confirm GA4 property.
- [ ] Create staging web stream if staging traffic should be tracked.
- [ ] Create production web stream.
- [ ] Copy Measurement ID into `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- [ ] Create Google Cloud service account for server reporting.
- [ ] Grant that service account access to the GA property.
- [ ] Store service account fields in:
      `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY`, `GA_PROJECT_ID`.

If staging analytics should be disabled, leave staging Measurement ID blank and
accept that analytics routes depending on GA credentials will be limited.

### 7. Microsoft Clarity

Open: https://clarity.microsoft.com/

Checklist:

- [ ] Create production Clarity project.
- [ ] Create staging Clarity project only if staging behavior should be tracked.
- [ ] Set `NEXT_PUBLIC_CLARITY_ID` per Vercel environment.

### 8. reCAPTCHA and Firebase App Check

Open reCAPTCHA admin: https://www.google.com/recaptcha/admin/create

Firebase App Check docs:
https://firebase.google.com/docs/app-check/web/recaptcha-provider

Checklist:

- [ ] Create staging reCAPTCHA v3 site key for staging domains.
- [ ] Create production reCAPTCHA v3 site key for production domains.
- [ ] Set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` per Vercel scope.
- [ ] Set `NEXT_PUBLIC_MENULIST_FIREBASE_APPCHECK_DEBUG_TOKEN` only for
      local/debug use.
- [ ] Start App Check in monitoring mode first.
- [ ] Enforce Firestore/Storage only after real browser traffic sends valid
      App Check tokens.
- [ ] Confirm every `menulist.digital` QA host remains noindex and publishes no
      sitemap; App Check registration does not make QA content public.

Staging App Check domains:

- `menulist.digital`
- `app.menulist.digital`
- tested non-reserved QA customer hosts such as `qa-cafe.menulist.digital`
- `canonica.app`
- `www.canonica.app`
- `campaigncue.menulist.online`
- `signaldesk.menulist.online`

Production App Check domains:

- `menulist.ai`
- `www.menulist.ai`
- `app.menulist.ai`
- production tenant hosts under `*.menulist.online` if the public customer runtime uses App Check on those pages
- `answerlattice.com`
- `www.answerlattice.com`
- `campaigncue.ai`
- `www.campaigncue.ai`
- `signaldesk.menulist.online`

Neelvara is static/no Firebase and does not need Firebase App Check.
MyCodex does not need Firebase App Check.

### 9. Meta WhatsApp Cloud API

Open:

- Meta apps: https://developers.facebook.com/apps/
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- Templates: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/

Checklist:

- [ ] Create or confirm Meta app.
- [ ] Add WhatsApp product.
- [ ] Connect business account and phone number.
- [ ] Copy phone number id into `WHATSAPP_PHONE_NUMBER_ID`.
- [ ] Generate access token and store in `WHATSAPP_ACCESS_TOKEN`.
- [ ] Copy app secret into `WHATSAPP_APP_SECRET`.
- [ ] Generate a random webhook verify token and store in
      `WHATSAPP_VERIFY_TOKEN`.
- [ ] Create OTP template if phone OTP is enabled.
- [ ] Set `WHATSAPP_OTP_TEMPLATE_NAME`.
- [ ] Set `WHATSAPP_OTP_TEMPLATE_LANGUAGE`.
- [ ] Configure owner/platform alert template only if platform WhatsApp alerts
      are enabled.
- [ ] Keep `ENABLE_MESSAGING_ONBOARDING=false` until real WhatsApp secrets and
      Meta webhook registration exist for the target.
- [ ] Set `ENABLE_MESSAGING_ONBOARDING=true` only for the target being smoked
      after those prerequisites are complete.
- [ ] Set the same values in MenuList Firebase Secret Manager when Functions
      need WhatsApp.

Leave WhatsApp secret values blank until a real provider setup exists. Do not use
dummy values to make a deploy look configured. Checked-in MenuList env templates
keep messaging onboarding processing off, so the operational blocker remains real
provider credentials plus webhook registration before enabling the target.

### 10. SMTP email

Gmail app passwords: https://myaccount.google.com/apppasswords

Gmail SMTP settings: https://support.google.com/a/answer/176600

Checklist:

- [ ] Choose sender account or SMTP provider.
- [ ] If using Gmail/Workspace, enable 2-Step Verification and create app
      password.
- [ ] Set Vercel env:
      `MENULIST_SMTP_HOST`, `MENULIST_SMTP_PORT`, `MENULIST_SMTP_USER`,
      `MENULIST_SMTP_PASS`.
- [ ] Set MenuList Functions secrets:
      `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
- [ ] Use Workspace SMTP only for controlled QA/low-volume testing. Before
      production, confirm the approved transactional sender/provider and do not
      use a personal Gmail inbox password.
- [ ] Set `INTERNAL_NOTIFICATION_EMAIL`, `PLATFORM_ALERT_EMAIL_TO`, and
      `INTERNAL_BILLING_EMAIL`. Each value is one plain mailbox address; do not
      use a comma/semicolon recipient list or display-name syntax.

### 11. Telegram alerts

Open BotFather: https://t.me/BotFather

Docs: https://core.telegram.org/bots

Checklist:

- [ ] Create staging alert bot/chat or topic.
- [ ] Create production alert bot/chat or topic.
- [ ] Set Vercel env `MENULIST_TELEGRAM_BOT_TOKEN` and
      `MENULIST_TELEGRAM_CHAT_ID`.
- [ ] Store Functions secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in
      MenuList Firebase Secret Manager.

### 12. Slack alerts, optional

Open: https://api.slack.com/messaging/webhooks

Checklist:

- [ ] Create incoming webhook only if Slack alerting is needed.
- [ ] Set `SLACK_WEBHOOK_URL`.
- [ ] Leave blank if Slack is not part of operations.

### 13. Google Cloud Tasks

Open: https://console.cloud.google.com/cloudtasks

Checklist:

- [ ] Enable Cloud Tasks API for `menulist-qa`.
- [ ] Enable Cloud Tasks API for `menulist-prod`.
- [ ] Create staging queue for batch image generation.
- [ ] Create production queue for batch image generation.
- [ ] Set `MENULIST_FIREBASE_PROJECT_LOCATION=us-central1`.
- [ ] Set `MENULIST_BATCH_IMAGE_GENERATION_QUEUE_ID`.
- [ ] Set `MENULIST_BATCH_IMAGE_GENERATION_WORKER_URL`.
- [ ] Generate and set `MENULIST_BATCH_IMAGE_GENERATION_WORKER_SECRET`.
- [ ] Capture the QA and production queue descriptions and verify `maxConcurrentDispatches`, `maxDispatchesPerSecond`, and `retryConfig` against each deployed worker and current Gemini target quota; do not copy unverified throughput values between environments.

### 14. Google Cloud budget alerts

Open:

- Billing: https://console.cloud.google.com/billing
- Billing export: https://console.cloud.google.com/billing/export

Checklist:

- [ ] Create budget for each Firebase-backed project.
- [ ] Configure alert thresholds.
- [ ] Confirm budget alerts exist before paid Firebase, Functions, Secret
      Manager, Gemini, Cloud Tasks, or production traffic starts.
- [ ] Record that alerts are notifications and do not replace provider/app-level
      rate limits or quota controls.
- [ ] Create one Preview spend-cap enforcement budget per product project scoped
      to the Gemini API service; keep it below the absolute monthly limit because
      enforcement is not instantaneous.
- [ ] Record the AI Studio rolling project limit and keep the matching
      `MENULIST_*`, `ANSWERLATTICE_*`, or `SIGNALDESK_*`
      `GEMINI_SPEND_LIMIT_USD_10M` value below it.
- [ ] Leave Cloud Run spend caps disabled until whole-project service/job/worker
      outage and manual-restore behavior is approved and drilled.
- [ ] Generate `GCP_BUDGET_WEBHOOK_SECRET`.
- [ ] Set the secret in Vercel env and MenuList Firebase Secret Manager.
- [ ] Enable billing export only if reporting needs BigQuery data.

### 15. Google Maps Platform

Open: https://console.cloud.google.com/google/maps-apis

Checklist:

- [ ] Enable the needed Maps API.
- [ ] Create browser API key.
- [ ] Restrict key by HTTP referrers.
- [ ] Add staging domains to staging key.
- [ ] Add production domains to production key.
- [ ] Set `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`.

### 16. Public media APIs

Open:


Checklist:

- [ ] Create keys only if these integrations are used.
- [ ] Leave blank when not used.

### 17. Vercel Domains API, optional

Open:

- Dashboard: https://vercel.com/dashboard
- Env docs: https://vercel.com/docs/environment-variables

Checklist:

- [ ] Create Vercel token only if domain automation is enabled.
- [ ] Copy project id to `VERCEL_PROJECT_ID`.
- [ ] Copy team id to `VERCEL_TEAM_ID` when the project is under a team.
- [ ] Store token in `VERCEL_TOKEN`.
- [ ] Leave all three blank if domain automation is not enabled.

### 18. GitHub and Shopify webhooks, optional

Open:

- GitHub: https://docs.github.com/en/webhooks
- Shopify: https://shopify.dev/docs/apps/build/webhooks

Checklist:

- [ ] Create `GITHUB_WEBHOOK_SECRET` only if GitHub webhooks are enabled.
- [ ] Create `SHOPIFY_WEBHOOK_SECRET` only if Shopify webhooks are enabled.
- [ ] Leave blank if those providers are not active.

### 19. UptimeRobot monitors

Open: https://uptimerobot.com/

Checklist:

- [ ] Add monitors for `https://menulist.digital` and `https://app.menulist.digital`.
- [ ] Add monitors for `https://canonica.app` and `https://www.canonica.app`.
- [ ] Add monitor for `https://campaigncue.menulist.online`.
- [ ] Add monitor for `https://signaldesk.menulist.online`.
- [ ] Add monitor for `https://neelvara.menulist.online`.
- [ ] Add monitor for `https://menulist.ai`.
- [ ] Add monitor for `https://neelvara.com`.
- [ ] Add monitor for `https://answerlattice.com`.
- [ ] Add monitor for `https://campaigncue.ai`.
- [ ] Add monitor for `https://signaldesk.menulist.online`.
- [ ] Add monitors for `/api/version` if endpoint health checks are desired.

No env variables are required for UptimeRobot.

### 20. Google Search Console

Open: https://search.google.com/search-console

Checklist:

- [ ] Add domain property for `neelvara.com` after it resolves to production.
- [ ] Add domain property for `menulist.ai` after it resolves to production.
- [ ] Add domain property for `answerlattice.com` after it resolves to production.
- [ ] Add domain property for `campaigncue.ai` after it resolves to production.
- [ ] Verify ownership through DNS using the record Search Console provides.
- [ ] Do not add MyCodex or SignalDesk as public Search Console properties
      unless their private/internal status changes.

## Phase 7: Configure DNS And Vercel Domains

Open Vercel Domains: https://vercel.com/docs/domains

For each hostname authorized for the current environment:

- [ ] Add domain in the single Vercel project.
- [ ] Let Vercel show the exact DNS record.
- [ ] Add that DNS record in the registrar/DNS provider.
- [ ] Export the current DNS zone before any nameserver change.
- [ ] For an apex wildcard, recreate required existing records in Vercel DNS and
      use the exact Vercel nameservers shown in the dashboard.
- [ ] Assign QA domains to exact Git branch `staging` and create a deployment
      after the assignment; confirm they are not attached to Production.
- [ ] Wait for Vercel verification.
- [ ] Confirm HTTPS certificate is issued.

Complete QA/staging host assignment first. Production host assignment and DNS
cutover are not infrastructure-preparation steps; they remain blocked until the
dedicated production provider ledger reaches Phase F and the active release
gate explicitly approves them.

Do not manually invent A/CNAME values from this document. Vercel is the source
of truth for the exact record it expects.

## Phase 8: Deploy Firebase Infrastructure

Only run these after Firebase projects, billing, rules, indexes, Storage,
Functions env files, and Secret Manager values exist.

Every product/environment must complete this lifecycle independently:

1. Load the pinned runtime and run the product/config-specific local emulator
   rule suite. MenuList staging uses
   `npm run verify:menulist-firebase-rules-predeploy`; that root-config result is
   not deployment proof for Answerlattice, CampaignCue, or SignalDesk.
2. Deploy the exact staging project/config with explicit
   `firestore:rules,firestore:indexes,storage` scope. A narrow
   `firestore:rules`-only command is for an incremental rule-only change, not a
   fresh Firebase project baseline.
3. Read back the published Firestore and Storage rule sources, list deployed
   indexes, and wait until required indexes are `READY` and rule propagation has
   completed.
4. Use real staging Auth identities for expected owner/workspace access and
   Rules Playground/direct client checks for anonymous, cross-tenant, and
   server-only denies. Admin SDK/Functions evidence is invalid for client rules
   because privileged server access bypasses them.
5. Record project, command, published timestamps, index state, test identities,
   allow/deny results, and blockers without secrets or customer data.
6. Deploy Functions only after that product's rule lifecycle passes. Stop on
   any unexpected allow/deny result and do not proceed to production.

For the first MenuList QA execution, use the literal Phase I instructions in
[MenuList Staging QA Setup Guide](./menulist-staging-qa-setup.md#phase-i---firebase-qa-infrastructure-deploy).

MenuList staging:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive
npm run verify:functions-deploy-preflight
npm --prefix functions run build
npm --prefix functions run deploy:menulist-qa
```

MenuList production Firebase infrastructure deploys require staging evidence and explicit production approval in the active session. For the current Storage rules cutover, record Gate 2A QA evidence in `__docs__/production-readiness/external-certification-runbook.md` before production Storage rules deploy approval.

MenuList production, only after the dedicated production provider ledger and
active release gate authorize deployment and smoke:

```bash
firebase deploy --project menulist-prod --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive
npm run verify:functions-deploy-preflight
firebase deploy --project menulist-prod --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive
```

For MenuList production-readiness certification, use the exact Gate 1 evidence
format in `__docs__/production-readiness/external-certification-runbook.md`.
Do not replace the scoped target list with a broad `--only functions` deploy
unless a separate fresh-infrastructure rollout has reviewed the full function
inventory and explicitly widened the target.

Answerlattice staging:

```bash
firebase deploy --project neelvara-answerlattice-qa --config firebase-answerlattice.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project neelvara-answerlattice-qa --config firebase-answerlattice.json --only functions:answerlattice
```

Answerlattice production:

```bash
firebase deploy --project neelvara-answerlattice-prod --config firebase-answerlattice.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project neelvara-answerlattice-prod --config firebase-answerlattice.json --only functions:answerlattice
```

CampaignCue staging:

```bash
firebase deploy --project campaigncue-qa --config firebase-campaigncue.json --only firestore:rules,firestore:indexes,storage
```

CampaignCue production:

```bash
firebase deploy --project campaigncue --config firebase-campaigncue.json --only firestore:rules,firestore:indexes,storage
```

SignalDesk staging:

```bash
firebase deploy --project menulist-signaldesk-qa --config firebase-signaldesk.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project menulist-signaldesk-qa --config firebase-signaldesk.json --only functions:signaldesk
```

SignalDesk production:

```bash
firebase deploy --project menulist-signaldesk --config firebase-signaldesk.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project menulist-signaldesk --config firebase-signaldesk.json --only functions:signaldesk
```

Neelvara:

- No Firebase deploy.

MyCodex:

- No Firebase deploy.

Do not run Vercel deploys from Codex unless explicitly requested in the active
session. After env values change, trigger a Vercel redeploy manually from the
Vercel dashboard when ready.

## Phase 9: Seed First Required Data

Do this only after Firebase rules/auth are configured.

MenuList:

- [ ] Create platform owner user.
- [ ] Create tenant.
- [ ] Create store.
- [ ] Create subscription/billing state.
- [ ] Create one sample project/menu.
- [ ] Confirm `ops_config/system` exists.
- [ ] Set `SAFE_MODE=false` only when production operations are intentionally
      live.

Answerlattice:

- [ ] Create platform owner/admin user.
- [ ] Create tenant/workspace.
- [ ] Create first support product/source set.
- [ ] Create public widget key only if widget testing is planned.
- [ ] Confirm nightly/manual scheduler secret matches `ANSWERLATTICE_CRON_SECRET`.

CampaignCue:

- [ ] Sign in with a MenuList-linked owner account.
- [ ] Confirm CampaignCue reads MenuList tenant/store context.
- [ ] Confirm CampaignCue writes workspace data only to its own Firebase project.
- [ ] Create or seed platform pack templates if using the seed script.

SignalDesk:

- [ ] Create private operator/admin access.
- [ ] Confirm SignalDesk writes only to `menulist-signaldesk-qa` in staging and
      `menulist-signaldesk` in production.
- [ ] Confirm provider accounts are disabled or held unless explicitly approved.
- [ ] Confirm `SIGNALDESK_OUTCOME_BRIDGE_SECRET` is at least 32
      characters before enabling the outcome bridge.

Neelvara:

- [ ] No seed data.
- [ ] Confirm parent-site contact addresses exist in Workspace.
- [ ] Confirm static pages render and do not require Firebase.

MyCodex:

- [ ] No seed data.
- [ ] Confirm `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, and
      `MYCODEX_SESSION_SECRET`.
- [ ] Confirm login works.
- [ ] Confirm reader state stays browser-local.

## Phase 10: Verification Commands

Run local checks before deploy or handoff:

```bash
npm run verify:env-targets
npm run verify:agent-readiness
npm run verify:answerlattice-runtime-truth
npm run verify:campaigncue
npm run test:signaldesk:env-project-validation
npm run test:signaldesk:functions-project-boundary
node scripts/verification/verify-mycodex-pwa-assets.js
npm run build:verify
npm --prefix functions run build
npm --prefix functions-answerlattice run build
npm --prefix functions-signaldesk run build
git diff --check
```

Do not run `npm run build`, Vercel builds, or Vercel deploys unless explicitly
requested.

## Phase 11: Runtime Smoke Checklist

After Vercel redeploy and Firebase deploys:

MenuList staging:

- [ ] Open `https://menulist.digital` and confirm it serves the MenuList main
      website with QA/staging env values.
- [ ] Open `https://www.menulist.digital` and confirm it serves the MenuList
      main website with QA/staging env values.
- [ ] Open `https://app.menulist.digital/signin` and
      `https://app.menulist.digital/api/version`.
- [ ] Open a non-reserved QA customer test host such as `https://qa-cafe.menulist.digital`.
- [ ] Sign in.
- [ ] Create/update a menu/project.
- [ ] Confirm public menu/OBP cache invalidates after writes.
- [ ] Confirm payment test key loads only in staging.

MenuList production:

- [ ] Open `https://menulist.ai`.
- [ ] Open `https://app.menulist.ai/api/version`.
- [ ] Sign in with production account.
- [ ] Confirm live Razorpay key only in production.
- [ ] Confirm App Check after monitoring.

Answerlattice staging:

- [ ] Open `https://canonica.app` and `https://www.canonica.app`.
- [ ] Open `https://canonica.app/api/version`.
- [ ] Confirm Answerlattice Firebase project is `neelvara-answerlattice-qa`.
- [ ] Confirm widget script path loads when key exists.
- [ ] Confirm public API debug is disabled unless intentionally enabled.

Answerlattice production:

- [ ] Open `https://answerlattice.com`.
- [ ] Open `https://answerlattice.com/api/version`.
- [ ] Confirm Answerlattice Firebase project is `neelvara-answerlattice-prod`.
- [ ] Confirm production widget key/script.

CampaignCue staging:

- [ ] Open `https://campaigncue.menulist.online`.
- [ ] Open `https://campaigncue.menulist.online/api/version`.
- [ ] Sign in from MenuList-linked owner context.
- [ ] Confirm workspace bootstrap.
- [ ] Confirm no `CAMPAIGNCUE_FIREBASE_UNAVAILABLE`.
- [ ] Confirm data writes to `campaigncue-qa`.

CampaignCue production:

- [ ] Open `https://campaigncue.ai`.
- [ ] Open `https://campaigncue.ai/api/version`.
- [ ] Confirm production workspace bootstrap.
- [ ] Confirm data writes to `campaigncue`.

SignalDesk staging:

- [ ] Open `https://signaldesk.menulist.online`.
- [ ] Open `https://signaldesk.menulist.online/api/version`.
- [ ] Confirm sign-in path is isolated under `/signaldesk/signin`.
- [ ] Confirm data writes to `menulist-signaldesk-qa`.
- [ ] Confirm provider-send remains disabled unless explicitly approved.

SignalDesk production:

- [ ] Open `https://signaldesk.menulist.online`.
- [ ] Open `https://signaldesk.menulist.online/api/version`.
- [ ] Confirm production private access works.
- [ ] Confirm data writes to `menulist-signaldesk`.
- [ ] Confirm provider-send remains disabled unless explicitly approved.

Neelvara staging:

- [ ] Open `https://neelvara.menulist.online`.
- [ ] Confirm parent-site static pages render.
- [ ] Confirm no Firebase project is required.

Neelvara production:

- [ ] Open `https://neelvara.com`.
- [ ] Confirm parent-site static pages render.
- [ ] Confirm no Firebase project is required.

MyCodex:

- [ ] Confirm no public domain is configured.
- [ ] Confirm local `/__mycodex/` works when the private reader is enabled.
- [ ] Confirm Basic Auth/session login is required if a private host is added later.
- [ ] Confirm no Firebase requests are needed for MyCodex.
- [ ] Confirm static docs render.

Security smoke:

- [ ] Protected unauthenticated API paths return `401`, not a generic 500.
- [ ] Firestore default deny rules remain deployed.
- [ ] Storage rules remain deployed.
- [ ] Secrets are not visible in browser source or client bundles.

## Final Owner Checklist

Use this table while setting up. Do not paste secret values into this document.

| Area | Staging/local done | Production done | Owner note |
| --- | --- | --- | --- |
| Vercel project connected | [ ] | [ ] | one shared project |
| Vercel env filled | [ ] | [ ] | from `.env.*.example` |
| Custom QA env branch-restricted | [ ] | n/a | custom `qa` attached only to exact branch `staging` |
| Domains verified in Vercel | [ ] | [ ] | copy Vercel DNS exactly |
| Firebase projects created | [ ] | [ ] | no Neelvara/MyCodex Firebase |
| Billing enabled | [ ] | [ ] | required for Functions/secrets |
| Firestore enabled | [ ] | [ ] | Native mode |
| Storage enabled | [ ] | [ ] | per product project |
| Firebase Auth providers | [ ] | [ ] | only required providers |
| Local emulator safety | [ ] | n/a | destructive/rule tests use emulators first |
| Google OAuth | [ ] | [ ] | dedicated clients with exact environment origins and callbacks |
| Admin SDK identity | [ ] | [ ] | MenuList and Answerlattice QA/production use project-local Vercel OIDC/WIF; local uses ADC |
| Firebase Secret Manager | [ ] | [ ] | Functions secrets only |
| Gemini | [ ] | [ ] | restricted, separate per environment |
| SignalDesk env | [ ] | [ ] | namespaced `SIGNALDESK_*` only |
| Neelvara static contact | [ ] | [ ] | Workspace aliases only |
| Upstash | [ ] | [ ] | separate DBs |
| Razorpay | [ ] | [ ] | test vs live |
| Sentry | [ ] | [ ] | browser/server/source maps |
| GA4 | [ ] | [ ] | optional staging |
| Clarity | [ ] | [ ] | optional staging |
| reCAPTCHA/App Check | [ ] | [ ] | monitor before enforce |
| WhatsApp | [ ] | [ ] | leave blank until real setup |
| SMTP | [ ] | [ ] | app password/provider secret |
| Telegram | [ ] | [ ] | alert chat separation |
| Cloud Tasks | [ ] | [ ] | MenuList only today |
| Media APIs | [ ] | [ ] | optional |
| Uptime monitors | [ ] | [ ] | dashboard only |
| Firebase deploys | [ ] | [ ] | after secrets exist |
| Vercel redeploy | [ ] | [ ] | manual dashboard action |
| Runtime smoke | [ ] | [ ] | all product domains |
| Maintenance calendar | [ ] | [ ] | monthly spend/alerts, quarterly IAM/secrets, annual ownership/recovery |

## Blocking Rules

- Do not use production Firebase, Razorpay, Upstash, or Sentry values in staging.
- Do not relax Firestore or Storage rules for staging.
- Do not enable App Check enforcement until valid traffic is confirmed.
- Do not enable WhatsApp with fake values.
- Do not create additional product-wise Gemini env keys beyond the names already
  present in `.env.staging.example`, `.env.production.example`, and source
  constants unless code is changed first.
- Do not invent shorthand env keys such as `AL_*`, `CC_*`, `SD_*`, `MC_*`, or
  `NV_*`.
- Do not share one Gemini API key across local, staging, and production.
- Do not use unrestricted Gemini production keys.
- Do not restore retired numbered MenuList or Answerlattice Gemini aliases.
  Additional same-project keys do not increase capacity.
- Do not add Firebase env keys for MyCodex.
- Do not add Firebase env keys for Neelvara.
- Do not create separate Vercel projects unless the deployment matrix is changed
  first.
- Do not expose staging secrets to every Vercel Preview branch.
- Do not allow `menulist.digital` QA hosts to be indexed or publish sitemaps.
- Do not use any retired legacy MenuList project in active env or deployment setup.
- If any Firebase deploy fails with IAM, billing, or Secret Manager errors, fix
  the cloud project setup before changing application code.
