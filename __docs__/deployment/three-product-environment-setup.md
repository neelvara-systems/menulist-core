# Product Domains, Accounts, And Environment Setup Checklist

> Status: one-time infrastructure setup runbook
> Scope: Neelvara Systems, MenuList, Answerlattice, CampaignCue, SignalDesk, MyCodex
> Last updated: August 2, 2026
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
8. Complete Phase 7 DNS/domain verification for staging and production hosts.
9. Complete Phase 8 Firebase infrastructure deploy for staging.
10. Complete Phase 9 seed data for staging.
11. Complete Phase 10 and Phase 11 staging verification.
12. Repeat the same flow for production using production project ids and
    production provider values.

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

## Current Gemini Production Handoff Log

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
menulist
answerlattice-qa
answerlattice
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

Answerlattice QA health-check deploy attempt:

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
5. [ ] Store production Gemini values in Vercel production and Firebase Secret Manager for `menulist`.
6. [ ] Store Answerlattice Gemini values in `ANSWERLATTICE_GEMINI_AI_KEY` and SignalDesk Gemini values in `SIGNALDESK_GEMINI_AI_KEY` for the matching Vercel environment.
7. [ ] Create every Firebase-declared AI rotation secret name before deploying
   the matching Functions target. Prefer separate real failover keys for
   `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, `GEMINI_AI_KEY_4`, and
   `ANSWERLATTICE_GEMINI_AI_KEY_2` style slots; if a slot temporarily uses the
   same provider/account value, record it as a rotate-later placeholder and do
   not treat it as quota scaling.
8. [ ] Configure budget alerts, spend monitoring, and model/project quota checks for the Google Cloud project that owns each Gemini key.
9. [ ] Deploy MenuList QA Functions after secrets exist:
   ```bash
   npm run verify:functions-deploy-preflight
   npm --prefix functions run build
   npm --prefix functions run deploy:menulist-qa
   ```
10. [ ] Deploy Answerlattice QA Functions after project access is fixed:
   ```bash
   firebase deploy --only functions:answerlattice:answerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json
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
| MenuList | `ML` | `http://localhost:3000/` | website `https://menulist.digital`; owner app `https://app.menulist.digital`; customers `*.menulist.digital` | `menulist-qa` | website `https://menulist.ai`; owner app `https://app.menulist.ai`; customers `*.menulist.online` | `menulist` |
| Neelvara | none | `http://localhost:3000/__neelvara/` | `https://neelvara.menulist.online` | none | `https://neelvara.com` | none |
| Answerlattice | `AL` | `http://localhost:3000/__answerlattice/` | `https://answerlattice.menulist.online` | `answerlattice-qa` | `https://answerlattice.com` | `answerlattice` |
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
| Unsplash developers | https://unsplash.com/developers |
| Pixabay API | https://pixabay.com/api/docs/ |
| Pexels API | https://www.pexels.com/api/ |

## Account Ownership Rule

Use one parent operating identity and one shared infrastructure account stack:

- Parent operating/trade name: Neelvara Systems.
- Domain registrar: one founder-controlled account with MFA, recovery codes,
  auto-renew, and backup payment method.
- Google Workspace: one tenant with `neelvara.com` as the primary domain after
  purchase; product domains are added as secondary or alias domains.
- Google Cloud/Firebase: one company-controlled organization/billing account;
  separate Firebase projects underneath it.
- Vercel: one team and one Vercel project connected to this repo.
- GitHub: keep the existing repo/org ownership, add a backup owner, enforce MFA.
- Razorpay: one merchant account under the real Neelvara legal/trade identity.
- Password manager: one company vault for registrar, Workspace, GitHub, Vercel,
  Firebase, Razorpay, provider credentials, and recovery codes.

Use `admin@neelvara.com` as the break-glass Workspace Super Admin and a named
operator such as `danny@neelvara.com` for routine setup with only required
access. Do not create separate random Gmail accounts for each product. Add
individual humans through IAM, retain offline recovery codes, and add a second
trusted Super Admin before production when another owner is available.

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
| `functions/.env.menulist.example` | MenuList production Functions non-secret template | no | yes, placeholders only |
| `functions/.env.menulist-qa` | MenuList staging Functions non-secret runtime values | no secrets | no |
| `functions/.env.menulist` | MenuList production Functions non-secret runtime values | no secrets | no |
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
- [ ] Confirm MenuList production points to exact project `menulist`.
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
- [ ] Confirm old `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is not used instead of the
      current `NEXT_PUBLIC_FB_DATABASE_URL`.

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
| `canonica.app` | Legacy Answerlattice name if already owned | Retain only as redirect to `answerlattice.com`; do not create Canonica accounts |

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

Create the break-glass Super Admin mailbox:

```text
admin@neelvara.com
```

Create the named daily operator mailbox:

```text
danny@neelvara.com
```

Use the founder's equivalent named address if a different name is appropriate.
Keep the break-glass account out of daily browsing and provider work. Enable MFA
on both and store break-glass recovery codes offline and in the company vault.

Create aliases or groups instead of paid users for every address below:

Neelvara:

- `hello@neelvara.com`
- `legal@neelvara.com`
- `privacy@neelvara.com`

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
| `answerlattice.menulist.online` | staging | Answerlattice |
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

Do not guess DNS records. Add each domain in Vercel first, then follow the exact
DNS instructions Vercel shows. Before changing DNS authority, export the current
zone and recreate all records that must survive. The apex wildcard contracts
`*.menulist.digital` and `*.menulist.online` use Vercel nameservers; assign QA
domains to exact Git branch `staging` and create a fresh branch deployment after
assignment so they do not silently default to Production.

### 2. Create the shared Vercel project

Open: https://vercel.com/dashboard

Checklist:

- [ ] Import this Git repo once.
- [ ] Use one Vercel project for all product/domain surfaces.
- [ ] Do not create separate Vercel projects for MenuList, Answerlattice,
      CampaignCue, SignalDesk, Neelvara, or MyCodex.
- [ ] Connect the production branch to Vercel Production.
- [ ] Use Vercel Preview for staging and restrict every staging value to the
      exact staging Git branch. MenuList uses branch `staging`.
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
| MenuList | `menulist-qa` | `menulist` |
| Answerlattice | `answerlattice-qa` | `answerlattice` |
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
- [ ] `menulist` is visible.
- [ ] `answerlattice-qa` is visible.
- [ ] `answerlattice` is visible.
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
| `menulist` | https://console.firebase.google.com/project/menulist/overview |
| `answerlattice-qa` | https://console.firebase.google.com/project/answerlattice-qa/overview |
| `answerlattice` | https://console.firebase.google.com/project/answerlattice/overview |
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
- [ ] `menulist`
- [ ] `answerlattice-qa`
- [ ] `answerlattice`
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

- MenuList: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `FIREBASE_STORAGE_BUCKET`
- Answerlattice: `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET`,
  `ANSWERLATTICE_FIREBASE_STORAGE_BUCKET`
- CampaignCue: `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET`,
  `CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET`
- SignalDesk: `NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET`,
  `SIGNALDESK_FIREBASE_STORAGE_BUCKET`

### 5. Create Firebase web apps

For each Firebase-backed project:

- [ ] Open Project settings > General.
- [ ] Create one Web App.
- [ ] Copy the generated config into Vercel env for that environment.

MenuList staging uses:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FB_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=menulist-qa`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

MenuList production uses the same key names with
`NEXT_PUBLIC_FIREBASE_PROJECT_ID=menulist`.

Answerlattice staging uses:

- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice-qa`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID`
- `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID`

Answerlattice production uses the same key names with
`NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID=answerlattice`.

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

CampaignCue production/preview cannot opt into shared Firebase mode. Both
public and Admin project identifiers, including a service-account file's
`project_id`, must exactly match the stage target. A mismatch is a setup error,
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
| `menulist` | `app.menulist.ai` |
| `answerlattice-qa` | `localhost`, `answerlattice.menulist.online` |
| `answerlattice` | `answerlattice.com`, `www.answerlattice.com` |
| `campaigncue-qa` | `localhost`, `campaigncue.menulist.online` |
| `campaigncue` | `campaigncue.ai`, `www.campaigncue.ai` |
| `menulist-signaldesk-qa` | `localhost`, `signaldesk.menulist.online` |
| `menulist-signaldesk` | `signaldesk.menulist.online` |

### 7. Create Admin SDK service account keys

For each Firebase-backed project:

- [ ] Open Project settings > Service accounts.
- [ ] Generate a private key for server/Admin SDK use.
- [ ] Store the downloaded JSON outside git.
- [ ] Copy only the required fields into Vercel env.
- [ ] Delete the temporary JSON after the required fields are stored securely.
- [ ] Record key owner and creation date; review unused keys quarterly and
      revoke immediately on leak, access removal, or replacement.
- [ ] Before production, evaluate Vercel OIDC/Google Workload Identity. This is
      not a blocker for the current QA private-key runtime.

MenuList env:

- `MENULIST_FIREBASE_PROJECT_ID`
- `MENULIST_FIREBASE_STORAGE_BUCKET`
- `MENULIST_FIREBASE_API_KEY`
- `MENULIST_FIREBASE_CLIENT_EMAIL`
- `MENULIST_FIREBASE_PRIVATE_KEY`
- `MENULIST_FIREBASE_PROJECT_LOCATION=us-central1`

Keep these current runtime aliases identical to the canonical values:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_API_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_PROJECT_LOCATION=us-central1`

Answerlattice env:

- `ANSWERLATTICE_FIREBASE_MODE=separate`
- `ANSWERLATTICE_FIREBASE_PROJECT_ID`
- `ANSWERLATTICE_FIREBASE_STORAGE_BUCKET`
- `ANSWERLATTICE_FIREBASE_CLIENT_EMAIL`
- `ANSWERLATTICE_FIREBASE_PRIVATE_KEY`
- `ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS`
- `ANSWERLATTICE_FIRESTORE_DATABASE_ID`

CampaignCue env:

- `CAMPAIGNCUE_FIREBASE_MODE=separate`
- `CAMPAIGNCUE_FIREBASE_PROJECT_ID`
- `CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET`
- `CAMPAIGNCUE_FIREBASE_CLIENT_EMAIL`
- `CAMPAIGNCUE_FIREBASE_PRIVATE_KEY`
- `CAMPAIGNCUE_GOOGLE_APPLICATION_CREDENTIALS`
- `CAMPAIGNCUE_FIRESTORE_DATABASE_ID`

SignalDesk env:

- `SIGNALDESK_FIREBASE_MODE=separate`
- `SIGNALDESK_FIREBASE_PROJECT_ID`
- `SIGNALDESK_FIREBASE_STORAGE_BUCKET`
- `SIGNALDESK_FIREBASE_CLIENT_EMAIL`
- `SIGNALDESK_FIREBASE_PRIVATE_KEY`
- `SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS`
- `SIGNALDESK_FIRESTORE_DATABASE_ID`

In Vercel, private keys must use escaped newlines:

```env
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## Phase 3: Configure Google OAuth And NextAuth

Open Google Cloud OAuth credentials:
https://console.cloud.google.com/apis/credentials

Create OAuth credentials for the shared NextAuth Google provider.

Staging/local JavaScript origins:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `https://app.menulist.digital`
- `https://answerlattice.menulist.online`
- `https://campaigncue.menulist.online`
- `https://signaldesk.menulist.online`

Production JavaScript origins:

- `https://app.menulist.ai`
- `https://answerlattice.com`
- `https://www.answerlattice.com`
- `https://campaigncue.ai`
- `https://www.campaigncue.ai`
- `https://signaldesk.menulist.online`

Redirect URI pattern:

```text
https://<domain>/api/auth/callback/google
```

Add these redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `http://127.0.0.1:3000/api/auth/callback/google`
- `https://app.menulist.digital/api/auth/callback/google`
- `https://answerlattice.menulist.online/api/auth/callback/google`
- `https://campaigncue.menulist.online/api/auth/callback/google`
- `https://signaldesk.menulist.online/api/auth/callback/google`
- `https://app.menulist.ai/api/auth/callback/google`
- `https://answerlattice.com/api/auth/callback/google`
- `https://www.answerlattice.com/api/auth/callback/google`
- `https://campaigncue.ai/api/auth/callback/google`
- `https://www.campaigncue.ai/api/auth/callback/google`
- `https://signaldesk.menulist.online/api/auth/callback/google`

Vercel env:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- Optional: `NEXTAUTH_URL`

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

- `.env.staging.example` for local and Vercel staging/Preview.
- `.env.production.example` for Vercel Production.

### 1. Staging/local Vercel scope

For every staging value, select Preview and restrict the Git Branch to the
exact product staging branch. For MenuList, use `staging`; never expose its
private keys or provider secrets to all Preview branches.

Set these identity values:

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

Use QA Firebase values:

- MenuList: `menulist-qa`
- Neelvara: no Firebase
- Answerlattice: `answerlattice-qa`
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

- MenuList: `menulist`
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
| Auth | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `NEXTAUTH_URL` | OpenSSL plus Google Cloud OAuth |
| MenuList Firebase client | canonical `NEXT_PUBLIC_MENULIST_FIREBASE_*` and matching current `NEXT_PUBLIC_FIREBASE_*`/`NEXT_PUBLIC_FB_DATABASE_URL` aliases | Firebase Web App config |
| MenuList Firebase Admin | canonical `MENULIST_FIREBASE_PROJECT_ID`, `MENULIST_FIREBASE_STORAGE_BUCKET`, `MENULIST_FIREBASE_API_KEY`, `MENULIST_FIREBASE_CLIENT_EMAIL`, `MENULIST_FIREBASE_PRIVATE_KEY`, `MENULIST_FIREBASE_PROJECT_LOCATION`; matching current `FIREBASE_*` aliases include `FIREBASE_API_KEY` | Firebase service account plus Firebase Web API key |
| Answerlattice Firebase client | `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_*`, `NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID` | Answerlattice Firebase Web App config |
| Answerlattice Firebase Admin | `ANSWERLATTICE_FIREBASE_*`, `ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS`, `ANSWERLATTICE_FIRESTORE_DATABASE_ID` | Answerlattice Firebase service account |
| Answerlattice runtime | `ANSWERLATTICE_CRON_SECRET`, `ANSWERLATTICE_MCP_SESSION_SECRET`, `ANSWERLATTICE_PUBLIC_BUNDLE_SALT`, `ANSWERLATTICE_NIGHTLY_TRIGGER_URL`, `ANSWERLATTICE_TRIGGER_NIGHTLY_URL`, `ANSWERLATTICE_PUBLIC_API_DEBUG`, `ANSWERLATTICE_TEST_URL`, `NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY` | generated secrets plus deployed function URL and product URL |
| CampaignCue Firebase client | `NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_*`, `NEXT_PUBLIC_CAMPAIGNCUE_FIRESTORE_DATABASE_ID` | CampaignCue Firebase Web App config |
| CampaignCue Firebase Admin | `CAMPAIGNCUE_FIREBASE_*`, `CAMPAIGNCUE_GOOGLE_APPLICATION_CREDENTIALS`, `CAMPAIGNCUE_FIRESTORE_DATABASE_ID` | CampaignCue Firebase service account |
| CampaignCue CueLayers | `CAMPAIGNCUE_CUE_LAYERS_LOW_COST_IMAGE_MODEL`, `CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL`, `CAMPAIGNCUE_CUE_LAYERS_PREMIUM_IMAGE_MODEL`, `CAMPAIGNCUE_CUE_LAYERS_PREMIUM_ROLLOUT_PERCENT`, `CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL`, `CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT`, `CAMPAIGNCUE_TEMPLATE_SEED_ACTOR` | explicit premium boolean, real segmentation model ID or blank, and bounded 0-100 rollout |
| SignalDesk Firebase client | `NEXT_PUBLIC_SIGNALDESK_FIREBASE_*`, `NEXT_PUBLIC_SIGNALDESK_FIRESTORE_DATABASE_ID` | SignalDesk Firebase Web App config |
| SignalDesk Firebase Admin | `SIGNALDESK_FIREBASE_*`, `SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS`, `SIGNALDESK_FIRESTORE_DATABASE_ID` | SignalDesk Firebase service account |
| SignalDesk AI and bridge | `SIGNALDESK_GEMINI_AI_KEY`, `SIGNALDESK_GEMINI_AI_KEY_2`, `SIGNALDESK_GEMINI_AI_KEY_3`, `SIGNALDESK_GEMINI_AI_KEY_4`, `SIGNALDESK_AI_MODEL`, `SIGNALDESK_OUTCOME_BRIDGE_SECRET` | Google AI Studio plus generated HMAC secret |
| SignalDesk optional providers | `SIGNALDESK_APIFY_*`, `SIGNALDESK_GOOGLE_PLACES_API_KEY`, `SIGNALDESK_META_*`, `SIGNALDESK_MESSENGER_PAGE_ID`, `SIGNALDESK_INSTAGRAM_PAGE_ID`, `SIGNALDESK_WHATSAPP_PHONE_NUMBER_ID`, `SIGNALDESK_EMAIL_*`, `SIGNALDESK_SMTP_*`, `SIGNALDESK_UNSUBSCRIBE_URL`, `SIGNALDESK_PHYSICAL_ADDRESS`, `SIGNALDESK_SMARTLEAD_*` | leave blank until provider account, legal approval, budget cap, and provider-send gate are approved |
| Neelvara static contact | `NEXT_PUBLIC_NEELVARA_CONTACT_EMAIL`, `NEXT_PUBLIC_NEELVARA_LEGAL_EMAIL`, `NEXT_PUBLIC_NEELVARA_PRIVACY_EMAIL` | Workspace aliases |
| MyCodex static auth | `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, `MYCODEX_SESSION_SECRET` | generated credentials/password manager |
| AI | `GEMINI_AI_KEY`, `GEMINI_API_KEY`, `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, `GEMINI_AI_KEY_4`, `OPENAI_API_KEY` | Google AI Studio and optional OpenAI |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `CRON_SECRET`, `INTERNAL_BILLING_EMAIL`, `GCP_BUDGET_WEBHOOK_SECRET` | Razorpay plus generated internal secrets |
| Cache and revalidation | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REVALIDATION_SECRET` | Upstash plus generated secret |
| Cloud Tasks | `FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_LOCATION`, `BATCH_IMAGE_GENERATION_WORKER_URL`, `BATCH_IMAGE_GENERATION_QUEUE_ID`, `BATCH_IMAGE_GENERATION_WORKER_SECRET` | Google Cloud Tasks |
| Analytics/media | `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY`, `GA_PROJECT_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_UNSPLASH_API_CLIENTID`, `NEXT_PUBLIC_PIXABAY_API_CLIENTID`, `NEXT_PUBLIC_PEXELS_API_CLIENTID`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` | GA4, Clarity, media APIs, Maps |
| Sentry | `SENTRY_DSN`, `SENTRY_DEV_DSN`, `NEXT_PUBLIC_SENTRY_DEV_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE`, `SENTRY_ENABLED_IN_EMULATOR` | Sentry |
| App Check and emulators | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN`, `NEXT_PUBLIC_USE_EMULATORS`, `FUNCTIONS_EMULATOR`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_STORAGE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` | reCAPTCHA/App Check and local emulator settings |
| Email and alerts | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `INTERNAL_NOTIFICATION_EMAIL`, `INTERNAL_NOTIFICATION_WHATSAPP`, `PLATFORM_ALERT_EMAIL_TO`, `PLATFORM_ALERT_WHATSAPP_TO`, `PLATFORM_ALERT_WHATSAPP_TEMPLATE_NAME`, `PLATFORM_ALERT_WHATSAPP_TEMPLATE_LANGUAGE`, `PLATFORM_ALERT_WHATSAPP_SESSION_ACTIVE`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SLACK_WEBHOOK_URL` | SMTP provider, Telegram, Slack |
| WhatsApp and OTP | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_OTP_TEMPLATE_NAME`, `WHATSAPP_OTP_TEMPLATE_LANGUAGE`, `WHATSAPP_OTP_ALLOW_TEXT_FALLBACK`, `PHONE_OTP_DEV_CODE`, `PHONE_OTP_DEV_SKIP_SEND`, `PHONE_OTP_DEBUG_RESPONSE`, `MESSAGING_ONBOARDING_PROVIDERS`, `NEXT_PUBLIC_MSG_PREVIEW_BASE_URL` | Meta WhatsApp and internal OTP policy |
| MenuList Answerlattice widget | `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY`, `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC` | Answerlattice widget setup |
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
gcloud services enable secretmanager.googleapis.com --project menulist
gcloud services enable secretmanager.googleapis.com --project answerlattice-qa
gcloud services enable secretmanager.googleapis.com --project answerlattice
gcloud services enable secretmanager.googleapis.com --project campaigncue-qa
gcloud services enable secretmanager.googleapis.com --project campaigncue
gcloud services enable secretmanager.googleapis.com --project menulist-signaldesk-qa
gcloud services enable secretmanager.googleapis.com --project menulist-signaldesk

gcloud secrets list --project menulist-qa --format='value(name)'
gcloud secrets list --project menulist --format='value(name)'
gcloud secrets list --project answerlattice-qa --format='value(name)'
gcloud secrets list --project answerlattice --format='value(name)'
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

### 3. MenuList production Functions secrets

Repeat the same commands with:

```bash
--project menulist
```

Use production values, not copied staging/test secrets.

### 4. Answerlattice Functions secrets

Staging:

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

Production:

```bash
firebase functions:secrets:set ANSWERLATTICE_CRON_SECRET --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_2 --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_3 --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_4 --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_PUBLIC_BUNDLE_SALT --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_HOST --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_PORT --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_USER --project answerlattice --config firebase-answerlattice.json
firebase functions:secrets:set ANSWERLATTICE_SMTP_PASS --project answerlattice --config firebase-answerlattice.json
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

- [ ] Create a dedicated staging key.
- [ ] Create a dedicated production key.
- [ ] Restrict each key to the Gemini API.
- [ ] Confirm the production key is not used by local development or staging.
- [ ] Store staging key in Vercel staging `GEMINI_AI_KEY`.
- [ ] Store production key in Vercel production `GEMINI_AI_KEY`.
- [ ] Store keys in MenuList Firebase Secret Manager for `menulist-qa` and
      `menulist`.
- [ ] Create/store Answerlattice keys in `ANSWERLATTICE_GEMINI_AI_KEY` and
      matching Answerlattice Firebase Secret Manager.
- [ ] Create/store SignalDesk keys in `SIGNALDESK_GEMINI_AI_KEY`.
- [ ] Confirm budget alerts already exist for the Google Cloud project before
      using the key for paid Gemini calls.
- [ ] Add rotation keys only when they exist: `GEMINI_AI_KEY_2`,
      `GEMINI_AI_KEY_3`, `GEMINI_AI_KEY_4`,
      `ANSWERLATTICE_GEMINI_AI_KEY_2`, `ANSWERLATTICE_GEMINI_AI_KEY_3`,
      `ANSWERLATTICE_GEMINI_AI_KEY_4`, `SIGNALDESK_GEMINI_AI_KEY_2`,
      `SIGNALDESK_GEMINI_AI_KEY_3`, and
      `SIGNALDESK_GEMINI_AI_KEY_4`.
- [ ] Leave `GEMINI_API_KEY` blank unless a legacy path explicitly requires it.
- [ ] Confirm Google Cloud billing is enabled for the key's project.
- [ ] Configure budget and usage alerts for the key's Google Cloud project.
- [ ] Check model/project quota before launch; do not treat extra key slots as
      quota scaling.
- [ ] After Functions deploy, confirm `_health/aiProvider_gemini` and
      `platformSummary/answerlatticeAiProviderHealth` update successfully.

Use only the Gemini env names already present in code and templates:

- MenuList Vercel/setup records: `MENULIST_GEMINI_AI_KEY` plus
  `MENULIST_GEMINI_AI_KEY_2`, `MENULIST_GEMINI_AI_KEY_3`, and
  `MENULIST_GEMINI_AI_KEY_4`.
- Current MenuList app/Functions compatibility aliases: `GEMINI_AI_KEY` plus
  `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and `GEMINI_AI_KEY_4`.
- Answerlattice app/Functions: `ANSWERLATTICE_GEMINI_AI_KEY` plus
  `ANSWERLATTICE_GEMINI_AI_KEY_2`, `ANSWERLATTICE_GEMINI_AI_KEY_3`, and
  `ANSWERLATTICE_GEMINI_AI_KEY_4`.
- SignalDesk app/runtime: `SIGNALDESK_GEMINI_AI_KEY` plus
  `SIGNALDESK_GEMINI_AI_KEY_2`,
  `SIGNALDESK_GEMINI_AI_KEY_3`, and
  `SIGNALDESK_GEMINI_AI_KEY_4`.

Do not invent shorthand env keys such as `ML_GEMINI_AI_KEY`,
`AL_GEMINI_AI_KEY`, `CC_GEMINI_AI_KEY`, or `SD_GEMINI_AI_KEY`. Do not invent
`CAMPAIGNCUE_GEMINI_AI_KEY` until CampaignCue provider-call activation is
approved in code and docs.

The rotation aliases are for leak response and transient failover. If the keys
belong to the same Google project, they share that project's Gemini quota.
Production scaling requires paid billing, model-level quota monitoring, and
quota increase requests.

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
      `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- [ ] Set MenuList Functions secrets for both `menulist-qa` and `menulist`.
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
      `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
      `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Set staging MenuList Functions secrets:
      `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
- [ ] Add staging webhook endpoint:
      `https://app.menulist.digital/api/razorpay/webhook`.
- [ ] Use Razorpay Live Mode for production.
- [ ] Generate live key id and secret.
- [ ] Set production Vercel env with live values.
- [ ] Set production MenuList Functions secrets with live values.
- [ ] Add production webhook endpoint:
      `https://app.menulist.ai/api/razorpay/webhook`.
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
- [ ] Copy browser DSN into `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] Copy staging browser DSN into `NEXT_PUBLIC_SENTRY_DEV_DSN` if staging uses
      a separate Sentry project.
- [ ] Copy server DSN into `SENTRY_DSN`.
- [ ] Create source-map upload token.
- [ ] Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- [ ] Set MenuList Functions `SENTRY_DSN` secret for `menulist-qa` and
      `menulist`.

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
- [ ] Set `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` only for local/debug use.
- [ ] Start App Check in monitoring mode first.
- [ ] Enforce Firestore/Storage only after real browser traffic sends valid
      App Check tokens.
- [ ] Confirm every `menulist.digital` QA host remains noindex and publishes no
      sitemap; App Check registration does not make QA content public.

Staging App Check domains:

- `menulist.digital`
- `app.menulist.digital`
- tested non-reserved QA customer hosts such as `qa-cafe.menulist.digital`
- `answerlattice.menulist.online`
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
      `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
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
- [ ] Set `TELEGRAM_BOT_TOKEN`.
- [ ] Set `TELEGRAM_CHAT_ID`.
- [ ] Store both in Vercel env and MenuList Firebase Secret Manager.

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
- [ ] Enable Cloud Tasks API for `menulist`.
- [ ] Create staging queue for batch image generation.
- [ ] Create production queue for batch image generation.
- [ ] Set `FIREBASE_PROJECT_LOCATION=us-central1`.
- [ ] Set `BATCH_IMAGE_GENERATION_QUEUE_ID`.
- [ ] Set `BATCH_IMAGE_GENERATION_WORKER_URL`.
- [ ] Generate and set `BATCH_IMAGE_GENERATION_WORKER_SECRET`.
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

- Unsplash: https://unsplash.com/developers
- Pixabay: https://pixabay.com/api/docs/
- Pexels: https://www.pexels.com/api/

Checklist:

- [ ] Create keys only if these integrations are used.
- [ ] Set `NEXT_PUBLIC_UNSPLASH_API_CLIENTID`.
- [ ] Set `NEXT_PUBLIC_PIXABAY_API_CLIENTID`.
- [ ] Set `NEXT_PUBLIC_PEXELS_API_CLIENTID`.
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
- [ ] Add monitor for `https://answerlattice.menulist.online`.
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

For each hostname:

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

MenuList production:

```bash
firebase deploy --project menulist --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive
npm run verify:functions-deploy-preflight
firebase deploy --project menulist --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive
```

For MenuList production-readiness certification, use the exact Gate 1 evidence
format in `__docs__/production-readiness/external-certification-runbook.md`.
Do not replace the scoped target list with a broad `--only functions` deploy
unless a separate fresh-infrastructure rollout has reviewed the full function
inventory and explicitly widened the target.

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

- [ ] Open `https://answerlattice.menulist.online`.
- [ ] Open `https://answerlattice.menulist.online/api/version`.
- [ ] Confirm Answerlattice Firebase project is `answerlattice-qa`.
- [ ] Confirm widget script path loads when key exists.
- [ ] Confirm public API debug is disabled unless intentionally enabled.

Answerlattice production:

- [ ] Open `https://answerlattice.com`.
- [ ] Open `https://answerlattice.com/api/version`.
- [ ] Confirm Answerlattice Firebase project is `answerlattice`.
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
| Staging env branch-restricted | [ ] | n/a | Preview secrets limited to exact staging branch |
| Domains verified in Vercel | [ ] | [ ] | copy Vercel DNS exactly |
| Firebase projects created | [ ] | [ ] | no Neelvara/MyCodex Firebase |
| Billing enabled | [ ] | [ ] | required for Functions/secrets |
| Firestore enabled | [ ] | [ ] | Native mode |
| Storage enabled | [ ] | [ ] | per product project |
| Firebase Auth providers | [ ] | [ ] | only required providers |
| Local emulator safety | [ ] | n/a | destructive/rule tests use emulators first |
| Google OAuth | [ ] | [ ] | all domains and callbacks |
| Admin SDK env | [ ] | [ ] | private keys escaped in Vercel |
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
- Do not assume `GEMINI_AI_KEY_2`/`_3`/`_4` increase capacity when they are in
  the same Google project.
- Do not add Firebase env keys for MyCodex.
- Do not add Firebase env keys for Neelvara.
- Do not create separate Vercel projects unless the deployment matrix is changed
  first.
- Do not expose staging secrets to every Vercel Preview branch.
- Do not allow `menulist.digital` QA hosts to be indexed or publish sitemaps.
- Do not use any retired legacy MenuList project in active env or deployment setup.
- If any Firebase deploy fails with IAM, billing, or Secret Manager errors, fix
  the cloud project setup before changing application code.
