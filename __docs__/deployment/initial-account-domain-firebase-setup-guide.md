# Initial Account, Domain, Firebase, And Vercel Setup Guide

> Status: owner-facing one-time setup guide
> Scope: Neelvara Systems, MenuList, Answerlattice, CampaignCue, SignalDesk, MyCodex
> Last updated: August 2, 2026
> Launch boundary: this guide prepares accounts, projects, env values, and DNS. It is not production launch approval. Production release still needs the current production-readiness audit, deploy approval, provider QA, browser/device QA, and production-host smoke checks.

This is the step-by-step setup guide to follow from scratch. It is written for
the human setup work: what to open, what to create, what to fill, and what must
be true before moving to the next step.

For the first real setup pass, start with:
[MenuList Staging QA Setup Guide](./menulist-staging-qa-setup.md). Use this
combined guide only after MenuList QA is live and verified.

The permanent break-glass Google owner identity is `admin@neelvara.com` in one
Workspace tenant. Use a named mailbox such as `danny@neelvara.com` for daily
work with only the access it needs. A founder's personal Google account may be
a recovery identity, but a new `neelvara@gmail.com` account is not the
permanent company root. Neelvara Systems remains an operating/trade name until
registration exists; never enter invented corporate registration or tax details
into a provider.

Use the companion technical runbooks for exact env and command detail:

- [MenuList Staging QA Setup Guide](./menulist-staging-qa-setup.md)
- [Product Domains, Accounts, And Environment Setup Checklist](./three-product-environment-setup.md)
- [Firebase Functions Secrets Setup](../../functions/src/envSetup.md)
- [Deployment Environment Setup](./domain-environment-setup.md)

## Read This First

Follow this guide from top to bottom. Do not skip to production before staging
works.

Rules for this setup:

- There are only two environments:
  - local plus staging use the QA/staging values.
  - production uses dedicated production values.
- Use one Vercel project connected to this repository. Do not create one Vercel
  project per product.
- Use one company Google Workspace/Cloud identity. Do not create separate Google
  logins for each product.
- For MenuList, use the existing `us-central1` region contract. Firestore asks
  for an explicit location; select `us-central1`. Do not create regional copies
  or a third deployed environment during this setup.
- Restrict sensitive Vercel Preview values to the exact staging Git branch for
  that product. Do not expose them to every Preview branch.
- Create separate Firebase projects per database-backed product and environment.
- Do not create Firebase for Neelvara or MyCodex.
- Use full product names in env variables. MenuList product values use
  `MENULIST_*`; public MenuList browser values use `NEXT_PUBLIC_MENULIST_*`.
  Do not use `ML_*`, `AL_*`, `CC_*`, `MC_*`, `SD_*`, or `NV_*` env prefixes.
- Never paste real secret values into docs, tickets, chat, screenshots, or git.

Stop immediately if:

- a required Firebase project id is not available.
- you cannot access the company owner account.
- billing cannot be attached to a Firebase/GCP project.
- Vercel asks for DNS values different from this guide. In that case, copy
  Vercel's current DNS instructions exactly.
- a provider asks for production verification and staging has not passed yet.

## Master Decision Table

| Area | Decision |
| --- | --- |
| Parent operating/trade identity | `Neelvara Systems` until legal adviser confirms final entity structure |
| Domain account | One founder-controlled registrar account with MFA |
| Google account structure | One Google Workspace tenant with `neelvara.com` primary |
| Google Cloud/Firebase | One company organization and billing account, separate projects underneath |
| Vercel | One team, one project, same git repo, domain routing handles products |
| GitHub | Keep existing organization/repository, add backup owner and MFA |
| Payments | One Razorpay merchant account under the real Neelvara legal/trade identity |
| Local/staging env | QA/staging Firebase and provider values |
| Production env | Dedicated production Firebase and provider values |
| Env variable naming | Full product names only |
| MenuList region | `us-central1` for Firestore, Storage, Functions, and Cloud Tasks |
| MenuList QA crawler policy | All `menulist.digital` hosts are noindex, disallow all crawlers, and publish no sitemap |
| Vercel staging secret scope | Preview plus exact Git branch `staging` |
| Local safety | Same QA configuration family; Firebase emulators first for destructive/rule testing |

## Product And Domain Matrix

| Surface | Type | Staging/local | Production | Firebase |
| --- | --- | --- | --- | --- |
| MenuList | primary product | website `https://menulist.digital`/`www`; owner app `https://app.menulist.digital`; customer links `*.menulist.digital` | website `https://menulist.ai`/`www`; owner app `https://app.menulist.ai`; customer links `*.menulist.online` | `menulist-qa` / `menulist` |
| Neelvara | static parent site | `https://neelvara.menulist.online` | `https://neelvara.com` | none |
| Answerlattice | product | `https://answerlattice.menulist.online` | `https://answerlattice.com` | `answerlattice-qa` / `answerlattice` |
| CampaignCue | product | `https://campaigncue.menulist.online` | `https://campaigncue.ai` | `campaigncue-qa` / `campaigncue` |
| SignalDesk | private product surface | `https://signaldesk.menulist.online` | `https://signaldesk.menulist.online` unless later contract changes it | `menulist-signaldesk-qa` / `menulist-signaldesk` |
| MyCodex | static private PWA | no active domain in new setup | no active domain in new setup | none |

Internal codes exist only for product identity/data contracts:

| Product | Internal code | Env prefix |
| --- | --- | --- |
| MenuList | `ML` | `MENULIST_*`; public browser keys are `NEXT_PUBLIC_MENULIST_*` |
| Answerlattice | `AL` | `ANSWERLATTICE_*` |
| CampaignCue | `CC` | `CAMPAIGNCUE_*` |
| MyCodex | `MC` | `MYCODEX_*` only for static auth/session |
| SignalDesk | `SD` | `SIGNALDESK_*` |
| Neelvara | none | `NEXT_PUBLIC_NEELVARA_*` for static site values |

Do not type `ML`, `AL`, `CC`, `MC`, or `SD` into env variable names unless an
existing code file already requires that exact key.

## Step 1: Prepare Owner Password Vault

Where:

- Your password manager.

What to do:

1. Create a company vault named `Neelvara Systems`.
2. Create sections for registrar, Google Workspace, Google Cloud, Firebase,
   Vercel, GitHub, Razorpay, Gemini, Upstash, Sentry, SMTP, Telegram, Meta, and
   recovery codes.
3. Store only real owner credentials and recovery codes there.
4. Turn on MFA for every account as soon as the provider allows it.
5. Add a backup owner or recovery method where the provider supports it.
6. Record quarterly IAM/secret review and annual domain/payment/recovery review
   reminders before setup is considered durable.

Expected result:

- One controlled vault exists before any domain, cloud, or payment setup starts.
- You know where every credential and recovery code will be stored.

Do not continue if:

- credentials are still in personal notes, chat, screenshots, or local files.

## Step 2: Purchase Or Confirm Domains

Where:

- GoDaddy domains: https://www.godaddy.com/domains
- Or the registrar account where the existing domains already live.

What to do:

1. Sign in to the founder-controlled registrar account.
2. Turn on MFA and save recovery codes in the password vault.
3. Confirm these existing domains are in the same owner-controlled account:
   - `menulist.ai`
   - `menulist.digital`
   - `menulist.online`
   - `answerlattice.com`
4. Search and purchase these domains if available at checkout:
   - `neelvara.com`
   - `campaigncue.ai`
5. Enable auto-renew for every retained production/staging domain.
6. Add a backup payment method.
7. Do not buy bundled website hosting. Vercel handles the app.
8. Do not buy separate paid email hosting from the registrar if Google Workspace
   will be used.

Expected result:

- These domains are owned or retained:
  - `neelvara.com`
  - `menulist.ai`
  - `menulist.digital`
  - `menulist.online`
  - `answerlattice.com`
  - `campaigncue.ai`
- Auto-renew and MFA are enabled.
- Registrar login and recovery codes are in the password vault.

Do not purchase or create:

- `constantlayer.in`
- `growthos.app`
- `surfaceos.app`
- `kitstamp.com`
- `kitstamp.app`
- MenuNexus domains
- separate MyCodex domain
- separate SignalDesk domain
- Canonica domains/accounts beyond retaining `canonica.app` as an optional
  legacy redirect if you already own it.

Stop if:

- `neelvara.com` or `campaigncue.ai` is unavailable. Do not replace the project
  name silently. Make a naming decision first, then update repo contracts.

## Step 3: Create Google Workspace

Where:

- Google Admin Console: https://admin.google.com/
- Google Workspace multiple-domain guide: https://knowledge.workspace.google.com/admin/domains/add-a-user-alias-domain-or-secondary-domain

What to do:

1. Create one Google Workspace tenant using `neelvara.com` as the primary
   domain.
2. Create the break-glass Super Admin mailbox:
   - `admin@neelvara.com`
3. Create the named daily operator mailbox:
   - `danny@neelvara.com`, or the founder's equivalent named address
4. Turn on MFA for both accounts.
5. Save break-glass login and recovery codes in the password vault and offline.
6. Use the named operator for routine setup. Keep `admin@neelvara.com` for
   Super Admin and account-recovery work.
7. Add production product domains as secondary or alias domains:
   - `menulist.ai`
   - `answerlattice.com`
   - `campaigncue.ai`
8. Add `menulist.digital` only if you want Workspace-managed staging email.
   Staging email is optional.
9. Create aliases or groups instead of paid mailboxes for every public address.

No separate Firebase "organization versus individual" account type exists.
Firebase uses the Google Cloud project resource hierarchy: create projects
under the `neelvara.com` organization. The separate Individual/Business choice
belongs to the Google payments profile. Use the truthful current payer details;
Google does not let you change that payments-profile account type or country
later, so a future legal-entity change requires a new correctly typed billing
account/payments profile and relinking the projects.

Create these Neelvara addresses:

- `hello@neelvara.com`
- `legal@neelvara.com`
- `privacy@neelvara.com`
- `security@neelvara.com`

Create these MenuList addresses:

- `hello@menulist.ai`
- `support@menulist.ai`
- `partners@menulist.ai`
- `sales@menulist.ai`
- `billing@menulist.ai`
- `legal@menulist.ai`
- `privacy@menulist.ai`
- `security@menulist.ai`
- `founder@menulist.ai`
- `noreply@menulist.ai` or `system@menulist.ai` as send-only identity

Create these Answerlattice addresses:

- `hello@answerlattice.com`
- `partners@answerlattice.com`
- `support@answerlattice.com`
- `legal@answerlattice.com`
- `privacy@answerlattice.com`
- `noreply@answerlattice.com`

Create these CampaignCue addresses:

- `hello@campaigncue.ai`
- `support@campaigncue.ai`
- `legal@campaigncue.ai`
- `privacy@campaigncue.ai`
- `noreply@campaigncue.ai`

Expected result:

- One Workspace tenant exists.
- `neelvara.com` is primary.
- Product email addresses route to real inboxes or groups.
- No separate Workspace tenant exists per product.

## Step 4: Configure Email DNS

Where:

- Google Admin Console: https://admin.google.com/
- Registrar DNS screen for each domain.
- Google SPF guide: https://support.google.com/a/answer/33786
- Google DKIM guide: https://support.google.com/a/answer/174124
- Google DMARC guide: https://support.google.com/a/answer/2466580

What to do for every sending domain:

1. Add Google Workspace MX records exactly as Google Admin shows them.
2. Add SPF TXT record for Google-only sending:
   ```text
   v=spf1 include:_spf.google.com ~all
   ```
3. Generate DKIM in Google Admin.
4. Add the DKIM TXT record exactly as Google shows it.
5. Start DMARC in monitor mode:
   ```text
   v=DMARC1; p=none; rua=mailto:security@neelvara.com
   ```
6. After email delivery is verified, decide whether to move DMARC to stricter
   enforcement later.

Domains to configure email authentication for:

- `neelvara.com`
- `menulist.ai`
- `answerlattice.com`
- `campaigncue.ai`

Expected result:

- Inbound mail works.
- Outbound mail passes SPF and DKIM.
- DMARC reports can be received.

Stop if:

- Google Admin shows different MX/DKIM values. Use Google Admin's current values,
  not copied values from this document.

## Step 5: Create Google Cloud Organization And Billing

Where:

- Google Cloud Console: https://console.cloud.google.com/
- Resource hierarchy: https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy
- Billing: https://console.cloud.google.com/billing
- IAM: https://console.cloud.google.com/iam-admin/iam

What to do:

1. Sign in with the Workspace admin or company owner account.
2. Confirm a Google Cloud organization exists for `neelvara.com`.
3. Create one Cloud Billing account under the company identity.
4. Add the owner/admin as billing admin.
5. Add budget alerts before attaching paid Firebase services, Cloud Functions,
   Secret Manager, Gemini API keys, or production services.
6. Do not attach project billing to a personal Gmail account.
7. Treat ordinary alert-only budgets as notifications. Preview spend-cap
   enforcement is a separate project-and-service control for eligible services.

Expected result:

- Google Cloud organization exists under the Workspace.
- One billing account exists.
- Billing admin access is stored and recoverable.
- Budget alerts are configured before paid Firebase/Gemini usage.

## Step 6: Create Firebase Projects

Where:

- Firebase Console: https://console.firebase.google.com/
- Firebase project docs: https://firebase.google.com/docs/projects/learn-more
- Cloud Storage Blaze requirement: https://firebase.google.com/docs/storage/web/start

Create these exact Firebase projects. Project IDs cannot be changed after
provisioning, so check the ID before pressing the final create button.

| Product | Environment | Firebase project id | Console link after creation |
| --- | --- | --- | --- |
| MenuList | staging/local | `menulist-qa` | https://console.firebase.google.com/project/menulist-qa/overview |
| MenuList | production | `menulist` | https://console.firebase.google.com/project/menulist/overview |
| Answerlattice | staging/local | `answerlattice-qa` | https://console.firebase.google.com/project/answerlattice-qa/overview |
| Answerlattice | production | `answerlattice` | https://console.firebase.google.com/project/answerlattice/overview |
| CampaignCue | staging/local | `campaigncue-qa` | https://console.firebase.google.com/project/campaigncue-qa/overview |
| CampaignCue | production | `campaigncue` | https://console.firebase.google.com/project/campaigncue/overview |
| SignalDesk | staging/local | `menulist-signaldesk-qa` | https://console.firebase.google.com/project/menulist-signaldesk-qa/overview |
| SignalDesk | production | `menulist-signaldesk` | https://console.firebase.google.com/project/menulist-signaldesk/overview |

What to do for each project:

1. Click `Add project`.
2. Enter the exact project id from the table.
3. After the project exists, attach the company billing account and create its
   project-scoped budget alerts/eligible spend caps before enabling paid
   services or making provider calls. Cloud Storage for Firebase requires Blaze.
4. Enable Google Analytics only if you have decided to use GA4 for that product.
5. After project creation, open Project Settings.
6. Add a Web app.
7. Copy the Web app config values into the secure setup tracker, not into chat.
8. Enable Firestore in Native mode at the location required by the dedicated
   product guide. Firestore asks for a location; for MenuList QA, select
   `us-central1`.
9. Enable Firebase Authentication.
10. Enable Cloud Storage for Firebase where the product uses storage, using the
    dedicated product guide's location. For MenuList QA, use `us-central1`.
11. Enable Secret Manager API for projects with Cloud Functions secrets.
12. Enable Cloud Functions required APIs when deploying functions.

Firestore and Storage locations are immutable after each resource is created.
For MenuList, keep the simple existing `us-central1` contract. Do not delete an
existing resource just because its location differs; stop and record it first.

Expected result:

- All eight project ids exist and are visible in Firebase Console.
- No Firebase project exists for Neelvara.
- No Firebase project exists for MyCodex.
- No retired legacy MenuList project is used anywhere.

Stop if:

- any exact project id is unavailable.
- Firebase suggests a suffix such as `-12345`. Do not accept a suffixed project
  id unless the repo contracts are intentionally changed first.

## Step 7: Configure Firebase Authentication

Where:

- Firebase Console -> selected project -> Authentication.

What to do:

1. Enable the sign-in providers used by that product.
2. For MenuList and owner/admin surfaces, enable Google sign-in if required.
3. Add authorized domains for each Firebase project.
4. Keep staging domains in QA projects and production domains in production
   projects.

Authorized domain checklist:

| Firebase project | Add authorized domains |
| --- | --- |
| `menulist-qa` | `localhost`, `app.menulist.digital` |
| `menulist` | `app.menulist.ai` |
| `answerlattice-qa` | `localhost`, `answerlattice.menulist.online` |
| `answerlattice` | `answerlattice.com`, `www.answerlattice.com` |
| `campaigncue-qa` | `localhost`, `campaigncue.menulist.online` |
| `campaigncue` | `campaigncue.ai`, `www.campaigncue.ai` |
| `menulist-signaldesk-qa` | `localhost`, `signaldesk.menulist.online` |
| `menulist-signaldesk` | `signaldesk.menulist.online` unless a later contract creates a separate production host |

Expected result:

- Auth works on staging without touching production projects.
- Production auth domains are ready but not used until production launch.

## Step 8: Create Firebase Service Accounts For Server/Admin SDK

Where:

- Google Cloud Console service accounts: https://console.cloud.google.com/iam-admin/serviceaccounts
- Firebase Project Settings -> Service accounts.

What to do:

1. For each Firebase project, create or use a service account dedicated to app
   server/Admin SDK access.
2. Download the JSON key only if Vercel/server runtime needs explicit service
   account env values.
3. Store the JSON file in the password vault.
4. Convert JSON fields into env variables using the env templates.
5. Escape private keys correctly for Vercel env values.
6. Delete any temporary local JSON file after values are stored securely.
7. Record the key creation date and responsible owner. Revoke it immediately on
   leak, access removal, or replacement, and review unused keys quarterly.
8. Before production, evaluate Vercel OIDC/Google Workload Identity. This is not
   required to complete QA; when static keys remain, keep the rotation and
   revocation record active.

Vercel env mapping:

| Product | Staging/local env keys | Production env keys |
| --- | --- | --- |
| MenuList | canonical `MENULIST_FIREBASE_PROJECT_ID`, `MENULIST_FIREBASE_STORAGE_BUCKET`, `MENULIST_FIREBASE_API_KEY`, `MENULIST_FIREBASE_CLIENT_EMAIL`, `MENULIST_FIREBASE_PRIVATE_KEY` plus identical current `FIREBASE_*` aliases using `menulist-qa` | same variable names with separate credentials and Web API key from `menulist` |
| Answerlattice | `ANSWERLATTICE_FIREBASE_PROJECT_ID`, `ANSWERLATTICE_FIREBASE_CLIENT_EMAIL`, `ANSWERLATTICE_FIREBASE_PRIVATE_KEY` using `answerlattice-qa` | same variable names with separate credentials from `answerlattice` |
| CampaignCue | `CAMPAIGNCUE_FIREBASE_PROJECT_ID`, `CAMPAIGNCUE_FIREBASE_CLIENT_EMAIL`, `CAMPAIGNCUE_FIREBASE_PRIVATE_KEY` using `campaigncue-qa` | same variable names with separate credentials from `campaigncue` |
| SignalDesk | `SIGNALDESK_FIREBASE_PROJECT_ID`, `SIGNALDESK_FIREBASE_CLIENT_EMAIL`, `SIGNALDESK_FIREBASE_PRIVATE_KEY` using `menulist-signaldesk-qa` | same variable names with separate credentials from `menulist-signaldesk` |

Expected result:

- Server/Admin SDK env values exist for all database-backed products.
- No service account exists for Neelvara or MyCodex.

## Step 9: Create Google OAuth Credentials For NextAuth

Where:

- Google Cloud OAuth credentials: https://console.cloud.google.com/apis/credentials

What to do:

1. Open the Google Cloud project that will own the OAuth client.
2. Configure OAuth consent screen under the company identity.
3. Create a Web application OAuth client.
4. Add authorized JavaScript origins.
5. Add authorized redirect URIs.
6. Store client id and client secret in Vercel env.

Authorized JavaScript origins:

- `http://localhost:3000`
- `https://app.menulist.digital`
- `https://answerlattice.menulist.online`
- `https://campaigncue.menulist.online`
- `https://signaldesk.menulist.online`
- `https://app.menulist.ai`
- `https://answerlattice.com`
- `https://campaigncue.ai`

Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://app.menulist.digital/api/auth/callback/google`
- `https://answerlattice.menulist.online/api/auth/callback/google`
- `https://campaigncue.menulist.online/api/auth/callback/google`
- `https://signaldesk.menulist.online/api/auth/callback/google`
- `https://app.menulist.ai/api/auth/callback/google`
- `https://answerlattice.com/api/auth/callback/google`
- `https://campaigncue.ai/api/auth/callback/google`

Expected result:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are available for staging and
  production env setup.
- Redirects match the deployed domains exactly.

## Step 10: Create One Vercel Project

Where:

- Vercel dashboard: https://vercel.com/dashboard
- Vercel domains docs: https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Vercel branch-domain assignment docs:
  https://vercel.com/docs/domains/working-with-domains/assign-domain-to-a-git-branch
- Vercel env docs: https://vercel.com/docs/environment-variables

What to do:

1. Create or open the company Vercel team.
2. Import this git repository one time.
3. Use one Vercel project for the shared app.
4. Do not create separate Vercel projects for MenuList, Answerlattice,
   CampaignCue, Neelvara, SignalDesk, or MyCodex.
5. Keep production branch and preview branch settings aligned with the current
   deployment workflow.
6. Add every required domain to this single Vercel project.
7. Assign `menulist.digital`, `www.menulist.digital`,
   `app.menulist.digital`, and `*.menulist.digital` to Preview/Staging, not
   Production.
8. Restrict every MenuList QA Preview environment variable to exact Git branch
   `staging`, especially private keys and provider secrets.

Add these staging domains:

- `menulist.digital`
- `www.menulist.digital`
- `app.menulist.digital`
- `*.menulist.digital`
- `neelvara.menulist.online`
- `answerlattice.menulist.online`
- `campaigncue.menulist.online`
- `signaldesk.menulist.online`

Add these production domains:

- `menulist.ai`
- `www.menulist.ai`
- `app.menulist.ai`
- `help.menulist.ai`
- `support.menulist.ai`
- `menulist.online`
- `www.menulist.online`
- `*.menulist.online`
- `neelvara.com`
- `www.neelvara.com`
- `answerlattice.com`
- `www.answerlattice.com`
- `campaigncue.ai`
- `www.campaigncue.ai`

Expected result:

- One Vercel project contains all domains.
- The QA website, owner app, and customer wildcard serve the staging deployment.
- Production domains stay attached only to Production.
- Vercel shows the DNS records required for each domain.
- No product-specific Vercel project exists.

## Step 11: Configure DNS For Vercel

Where:

- Vercel project -> Settings -> Domains.
- Registrar DNS screen for each domain.

What to do:

1. For each domain added in Vercel, open the Vercel domain details screen.
2. Inventory and export the existing DNS zone before changing records or
   nameservers.
3. Copy the DNS records Vercel shows.
4. Add or update those records at the registrar/DNS provider.
5. For apex domains, use Vercel's current A/ALIAS/ANAME guidance exactly as
   shown in the dashboard.
6. For subdomains, use the CNAME record Vercel shows.
7. For apex wildcard contracts such as `*.menulist.digital` and
   `*.menulist.online`, use the Vercel nameserver workflow. Recreate every
   required existing record in Vercel DNS before switching the registrar's
   nameservers, then use only the exact nameservers Vercel displays.
8. Assign QA domains to exact Git branch `staging`, create a new deployment
   after assignment, and verify they did not default to Production.
9. Wait until Vercel marks the domain and HTTPS certificate as valid.

Expected result:

- Vercel shows every domain as configured.
- Staging domains work before production cutover.
- `neelvara.com` and `campaigncue.ai` resolve before
  production smoke testing.

Stop if:

- Vercel asks you to remove a conflicting domain from another Vercel account or
  project. Resolve ownership first.
- DNS records differ from old notes. Trust the current Vercel screen.

## Step 12: Fill Local And Staging Env Values

Where:

- Local file copied from `.env.staging.example`.
- Vercel project -> Settings -> Environment Variables -> Preview.
- Vercel project -> Settings -> Environment Variables -> Development if you use
  Vercel CLI local env pull.

What to do:

1. Open `.env.staging.example`.
2. Treat it as an inventory, not a deployable file. Create the ignored local env
   with only configured rows and never retain literal `<...>` placeholders.
3. Fill QA/staging Firebase values:
   - MenuList -> `menulist-qa`
   - Answerlattice -> `answerlattice-qa`
   - CampaignCue -> `campaigncue-qa`
   - SignalDesk -> `menulist-signaldesk-qa`
4. Fill staging provider values only when the provider setup exists.
5. In Vercel, add the same staging values to Preview and restrict each value to
   the exact product staging branch. MenuList uses branch `staging`.
6. Do not put staging values in the Production environment.
7. Leave optional provider keys blank until their account and activation gate
   are approved.
8. For destructive/rule-focused local work, turn on the Firebase Emulator Suite
   using the emulator rows in `.env.staging.example`. Keep them off in Vercel
   and turn them off locally only for deliberate cloud-QA integration smoke.

Important Gemini naming:

- MenuList uses `MENULIST_GEMINI_AI_KEY` for owner setup records, with the
  current `GEMINI_AI_KEY` runtime/Functions alias filled until the code and
  Functions declarations are fully migrated.
- CampaignCue uses the current shared `GEMINI_AI_KEY` path unless its product
  contract is changed later.
- Answerlattice uses `ANSWERLATTICE_GEMINI_AI_KEY`.
- SignalDesk uses `SIGNALDESK_GEMINI_AI_KEY`.
- Do not create `CAMPAIGNCUE_GEMINI_AI_KEY`, `AL_GEMINI_AI_KEY`,
  `CC_GEMINI_AI_KEY`, or `SD_GEMINI_AI_KEY`.

Expected result:

- Local app and Vercel Preview use QA/staging project ids.
- Real secrets are stored only in ignored local env, Vercel, Firebase Secret
  Manager, or the password vault.

## Step 13: Fill Production Env Values

Where:

- `.env.production.example` as the source template.
- Vercel project -> Settings -> Environment Variables -> Production.

What to do:

1. Open `.env.production.example`.
2. Use dedicated production Firebase values:
   - MenuList -> `menulist`
   - Answerlattice -> `answerlattice`
   - CampaignCue -> `campaigncue`
   - SignalDesk -> `menulist-signaldesk`
3. Use production provider keys only.
4. Use production `NEXTAUTH_SECRET`, session secrets, webhook secrets, and
   revalidation secrets.
5. Do not reuse staging secrets in production.
6. Do not commit a filled `.env.production` file.

Expected result:

- Vercel Production env is complete.
- No QA project id appears in production env.
- No production secret appears in staging/local env.

## Step 14: Set Firebase Functions Secrets

Where:

- Firebase Functions env guide: https://firebase.google.com/docs/functions/config-env
- Firebase Secret Manager: https://console.cloud.google.com/security/secret-manager
- Local terminal after Firebase CLI login.
- Companion runbook: [Firebase Functions Secrets Setup](../../functions/src/envSetup.md)

What to do:

1. Log in with the company Firebase owner/deploy account.
2. Confirm the CLI can see the required projects:
   ```bash
   firebase projects:list
   ```
3. Set MenuList secrets in:
   - `menulist-qa`
   - `menulist`
4. Set Answerlattice secrets in:
   - `answerlattice-qa`
   - `answerlattice`
5. Do not set SignalDesk Firebase Function secrets today. Current SignalDesk
   Functions do not declare Secret Manager secrets.
6. Do not set Firebase Functions secrets for CampaignCue today. CampaignCue has
   no Firebase Functions codebase in the current repo.
7. Do not set Firebase Functions secrets for Neelvara or MyCodex.

MenuList primary secrets:

- `GEMINI_AI_KEY`
- `GEMINI_AI_KEY_2`
- `GEMINI_AI_KEY_3`
- `GEMINI_AI_KEY_4`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SENTRY_DSN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `GCP_BUDGET_WEBHOOK_SECRET`
- `REVALIDATION_SECRET`

Answerlattice declared secrets:

- `ANSWERLATTICE_CRON_SECRET`
- `ANSWERLATTICE_GEMINI_AI_KEY`
- `ANSWERLATTICE_GEMINI_AI_KEY_2`
- `ANSWERLATTICE_GEMINI_AI_KEY_3`
- `ANSWERLATTICE_GEMINI_AI_KEY_4`
- `ANSWERLATTICE_PUBLIC_BUNDLE_SALT`
- `ANSWERLATTICE_SMTP_HOST`
- `ANSWERLATTICE_SMTP_PORT`
- `ANSWERLATTICE_SMTP_USER`
- `ANSWERLATTICE_SMTP_PASS`

Expected result:

- Firebase Secret Manager contains only secrets declared by the current
  Functions code.
- Staging and production secrets are separate.

Stop if:

- `firebase projects:list` does not show the exact required project ids.
- the CLI is logged into a personal account that should not own deployment.

## Step 15: Create Provider Accounts And Keys

Create staging first, then production. Keep production disabled until staging
smoke checks pass.

### Gemini / Google AI Studio

Where:

- Google AI Studio API keys: https://aistudio.google.com/app/apikey
- Gemini API key security: https://ai.google.dev/gemini-api/docs/api-key
- Google Cloud Billing budgets: https://console.cloud.google.com/billing/budgets

What to do:

1. Confirm the key's Google Cloud project is linked to billing.
2. Create budget alerts for the key's Google Cloud project before paid Gemini
   usage starts.
3. Create a separate Preview spend-cap enforcement budget scoped to that project
   and the Gemini API service. Keep it below the absolute monthly loss limit
   because enforcement is not instantaneous.
4. Record the AI Studio rolling project limit and set the product's
   `*_GEMINI_SPEND_LIMIT_USD_10M` value below it; the checked-in default is USD 8.
5. Create separate staging and production keys.
6. Restrict each key to the Gemini API.
7. Store staging keys in staging Vercel env and staging Firebase secrets.
8. Store production keys only in production Vercel env and production Firebase
   secrets.
9. Create every Firebase-declared rotation secret name before deploying the
   matching Functions target. Prefer separate real failover keys; if a slot
   temporarily uses the same provider/account value, record it as a rotate-later
   placeholder and do not treat it as quota scaling.

Expected result:

- MenuList/CampaignCue, Answerlattice, and SignalDesk have the correct
  environment-specific Gemini keys.
- Alert-only budgets, Gemini API spend-cap budgets, and app-local rolling
  ceilings are active before paid Gemini API usage.

### Upstash Redis

Where:

- Upstash Console: https://console.upstash.com/
- Upstash Redis docs: https://upstash.com/docs/redis

What to do:

1. Create one QA/staging Redis database.
2. Create one production Redis database.
3. Store REST URL and token in the matching Vercel env.
4. Store the same values in MenuList Firebase Secret Manager where Functions
   require them.

Expected result:

- Staging and production do not share Redis tokens.

### Razorpay

Where:

- Razorpay Dashboard: https://dashboard.razorpay.com/
- Razorpay Test/Live modes: https://razorpay.com/docs/payments/dashboard/test-live-modes/
- Razorpay webhooks: https://razorpay.com/docs/webhooks/

What to do:

1. Create one merchant account under the real Neelvara legal/trade identity.
2. Use Test Mode for staging.
3. Use Live Mode for production only after approval.
4. Generate separate API keys for Test and Live modes.
5. Configure webhook endpoints for staging and production separately.
6. Store webhook secrets in matching envs.

Expected result:

- MenuList and Answerlattice share the Razorpay merchant account but keep
  product data/plans scoped in the app.
- Staging uses Test Mode keys.
- Production uses Live Mode keys only.

### Sentry

Where:

- Sentry dashboard: https://sentry.io/
- Sentry Next.js docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry auth tokens: https://docs.sentry.io/organization/auth-tokens/

What to do:

1. Create one Sentry organization under company ownership.
2. Create projects or environments for MenuList, Answerlattice, CampaignCue, and
   SignalDesk as needed.
3. Add staging DSNs to staging env.
4. Add production DSNs to production env.
5. Add source-map auth token only if source map upload is intentionally enabled.

Expected result:

- Error reporting is separated by product and environment.

### SMTP / Email Sending

Where:

- Google Workspace Gmail SMTP: https://support.google.com/a/answer/176600
- Gmail app passwords: https://myaccount.google.com/apppasswords

What to do:

1. Use Workspace SMTP only if the account security model allows it.
2. Otherwise choose a dedicated transactional email provider later.
3. Keep staging and production credentials separate where possible.
4. Configure `noreply` or `system` identities for automated email.

Expected result:

- App email can send without using a personal inbox password.

### Telegram Alerts

Where:

- BotFather: https://t.me/BotFather
- Telegram bot docs: https://core.telegram.org/bots

What to do:

1. Create a staging alert bot and chat.
2. Create a production alert bot and chat.
3. Store bot token and chat id in the matching env.

Expected result:

- Staging alerts do not go to the production incident channel.

### Firebase App Check / reCAPTCHA

Where:

- Firebase App Check web reCAPTCHA: https://firebase.google.com/docs/app-check/web/recaptcha-provider
- reCAPTCHA Admin: https://www.google.com/recaptcha/admin/create

What to do:

1. Register staging domains first.
2. Register production domains only after Vercel DNS is ready.
3. Add App Check env values to matching environments.
4. Monitor traffic before enforcing.

Expected result:

- App Check can be enabled safely after valid traffic is visible.

### UptimeRobot

Where:

- UptimeRobot: https://uptimerobot.com/

What to do:

1. Create monitors for staging URLs.
2. Create monitors for production URLs after DNS is live.
3. Add `/api/version` monitors where endpoint health is useful.

Expected result:

- You get alerts when public or private product hosts fail.

### Search Console

Where:

- Google Search Console: https://search.google.com/search-console

What to do:

1. Add domain properties after production domains resolve to Vercel.
2. Verify each property through DNS.
3. Add:
   - `neelvara.com`
   - `menulist.ai`
   - `answerlattice.com`
   - `campaigncue.ai`
4. Do not add MyCodex or SignalDesk unless their private/internal status
   changes.

Expected result:

- Public production domains are verified for search ownership.

### Meta / WhatsApp

Where:

- Meta developers: https://developers.facebook.com/apps/
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- WhatsApp message templates: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/

What to do:

1. Create non-production setup first.
2. Create production Business Portfolio, WABA, app, dedicated number, and
   billing only before WhatsApp activation.
3. Do not activate CampaignCue social OAuth/provider connections.
4. Do not activate SignalDesk paid sender/provider workflows until legal,
   sender, provider, and budget approvals exist.

Expected result:

- WhatsApp is gated and deliberate, not accidentally live.

## Step 16: Do Not Create These Yet

Do not create accounts, env keys, or paid subscriptions for:

- ConstantLayer.
- Canonica Firebase, email, payments, or social accounts.
- GrowthOS, SurfaceOS, KitStamp, or MenuNexus.
- MyCodex Firebase, database, billing, or separate domain.
- SignalDesk separate domain.
- CampaignCue social OAuth/provider accounts.
- SignalDesk Apollo, Hunter, ZeroBounce, Postmark, Resend, Smartlead,
  Instantly, lemlist, or similar paid accounts.
- OpenAI, Slack, Shopify, Google Maps, or public-media APIs unless a currently
  approved integration requires them.
- Apple App Store or Google Play Console.

## Step 17: Deploy Firebase Infrastructure In Staging First

Where:

- Local terminal after Firebase CLI login.

What to do:

1. Confirm project aliases in `.firebaserc` and the exact product config file.
2. Run the product-specific local Firebase emulator rule suite under the pinned
   runtime. For MenuList, follow Phase I in
   [MenuList Staging QA Setup Guide](./menulist-staging-qa-setup.md#phase-i---firebase-qa-infrastructure-deploy)
   and run `npm run verify:menulist-firebase-rules-predeploy`.
3. For a fresh project, deploy that product's Firestore rules, composite
   indexes, and Storage rules together. A `firestore:rules`-only command from a
   reviewed incremental change is not a complete fresh-project baseline.
4. Read the published Firestore and Storage rule sources back from Firebase
   Console, list deployed indexes, and wait until required composite indexes are
   `READY`.
5. Wait several minutes for rule propagation, then use real staging Auth users
   plus Rules Playground/direct client checks to prove own-tenant allow,
   anonymous deny, cross-tenant deny, and server-only collection deny behavior.
   Never use Admin SDK evidence for this check because privileged server access
   bypasses client Security Rules.
6. Record the project id, commands, source timestamps, index state, test UIDs,
   allow/deny results, and blockers without recording secrets or customer data.
7. Deploy only staging Firebase Functions after the rule readback and live rule
   smoke pass.
8. Do not deploy production Firebase targets until staging passes and the
   active production process grants explicit approval.

Staging commands:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,storage
npm run verify:functions-deploy-preflight
npm --prefix functions run build
npm --prefix functions run deploy:menulist-qa

firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions:answerlattice:answerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json

firebase deploy --project campaigncue-qa --config firebase-campaigncue.json --only firestore:rules,firestore:indexes,storage

firebase deploy --project menulist-signaldesk-qa --config firebase-signaldesk.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project menulist-signaldesk-qa --config firebase-signaldesk.json --only functions:signaldesk
```

Expected result:

- Staging rules, indexes, and Storage rules pass local emulation, deploy, match
  readback, propagate, and pass authenticated allow/deny smoke tests before
  declared Functions deploy successfully.
- No production Firebase deploy has happened yet.

Stop if:

- any deploy returns IAM, billing, Secret Manager, or project-not-found errors.
  Fix cloud setup first.
- any deployed source differs from the repository, an index remains `ERROR`, a
  prohibited operation succeeds, or an expected own-tenant operation fails.
  Fix and repeat the full product-specific rule lifecycle before continuing.

## Step 18: Trigger Vercel Staging Deployment

Where:

- Vercel dashboard or approved git workflow.

What to do:

1. Confirm Preview env vars are complete and restricted to the exact staging
   Git branch.
2. Trigger the staging/preview deployment.
3. Confirm Vercel build/deploy completes.
4. Confirm staging domains point to the latest deployment.

Expected result:

- Staging app is live on the staging domains.
- Staging app talks only to QA Firebase projects.

Note:

- This guide does not grant automatic Vercel deploy permission inside Codex
  sessions. Vercel deploys remain explicit approval actions.

## Step 19: Run Staging Smoke Checks

Where:

- Browser.
- Firebase Console.
- Vercel logs.
- Sentry staging project/environment.

What to check:

MenuList staging:

- Open `https://menulist.digital` and confirm it serves the MenuList main
  website with QA/staging env values.
- Open `https://www.menulist.digital` and confirm it serves the MenuList main
  website with QA/staging env values.
- Open `https://app.menulist.digital/signin` and
  `https://app.menulist.digital/api/version`.
- Open a non-reserved QA customer test host such as `https://qa-cafe.menulist.digital`.
- On the MenuList QA apex, `www`, `app`, and customer test host, confirm normal
  responses include `X-Robots-Tag: noindex, nofollow, noarchive`, `robots.txt`
  contains `Disallow: /`, and `/sitemap.xml` returns `404`.
- Sign in.
- Confirm data writes go to `menulist-qa`.

Neelvara staging:

- Open `https://neelvara.menulist.online`.
- Confirm static pages render.
- Confirm no Firebase project is required.

Answerlattice staging:

- Open `https://answerlattice.menulist.online`.
- Open `https://answerlattice.menulist.online/api/version`.
- Sign in.
- Confirm data writes go to `answerlattice-qa`.

CampaignCue staging:

- Open `https://campaigncue.menulist.online`.
- Open `https://campaigncue.menulist.online/api/version`.
- Sign in.
- Confirm data writes go to `campaigncue-qa`.
- Confirm CampaignCue remains export/download-only.

SignalDesk staging:

- Open `https://signaldesk.menulist.online`.
- Open `https://signaldesk.menulist.online/api/version`.
- Confirm sign-in path is isolated under `/signaldesk/signin`.
- Confirm data writes go to `menulist-signaldesk-qa`.
- Confirm provider-send remains disabled unless separately approved.

MyCodex:

- No public domain is configured in new setup.
- Confirm no Firebase project is required if the static reader is used locally.

Expected result:

- Every staging surface loads.
- Auth works where expected.
- Firebase writes hit QA/staging projects only.
- No production data changes happen during staging smoke.

## Step 20: Repeat For Production Only After Staging Passes

Where:

- Firebase Console.
- Vercel Production env.
- Registrar DNS.
- Provider dashboards.

What to do:

1. Confirm staging smoke is complete.
2. Confirm the break-glass owner, named daily operator, recovery path, and
   maintenance reminders are recorded.
3. Confirm the production service-account approach: use Vercel OIDC/Workload
   Identity when validated for the runtime, or record the static-key owner,
   creation date, and rotation/revocation procedure.
4. Enable the approved Firestore backup/PITR policy and record one restore-test
   procedure before production customer data is accepted.
5. Confirm App Check monitoring has valid QA traffic before enforcement.
6. Confirm the production email sender is an approved transactional sender or
   controlled Workspace relay, never a personal inbox password.
7. Confirm production domain auto-renew, backup payment, DNS export, and owner
   recovery are current.
8. Confirm production env values are filled and distinct from staging.
9. Confirm production Firebase secrets exist.
10. Confirm production domains resolve in Vercel.
11. Deploy production Firebase infrastructure only after explicit approval.
12. Trigger production Vercel deployment only after explicit approval.
13. Run production smoke checks.

Production smoke checks:

- `https://menulist.ai`
- `https://www.menulist.ai`
- `https://app.menulist.ai`
- `https://help.menulist.ai`
- `https://support.menulist.ai`
- `https://neelvara.com`
- `https://www.neelvara.com`
- `https://answerlattice.com`
- `https://www.answerlattice.com`
- `https://campaigncue.ai`
- `https://www.campaigncue.ai`
- `https://signaldesk.menulist.online` if SignalDesk is intentionally active

Expected result:

- Production app talks only to production Firebase projects.
- Production provider keys are active only in production.
- Staging and production are separated.

## Final Setup Tracker

Use this as the owner checklist. Do not mark a row complete until the expected
result is true.

| Item | Staging/local | Production | Notes |
| --- | --- | --- | --- |
| Password vault ready | [ ] | [ ] | MFA and recovery codes stored |
| Domains purchased/confirmed | [ ] | [ ] | `neelvara.com` and `campaigncue.ai` verified at checkout |
| Workspace created | [ ] | [ ] | `neelvara.com` primary |
| Break-glass and daily Workspace accounts | [ ] | [ ] | `admin@` is recovery-only; named operator is daily use |
| Product email aliases/groups | [ ] | [ ] | no separate tenant per product |
| Email SPF/DKIM/DMARC | [ ] | [ ] | DNS verified |
| Cloud organization | [ ] | [ ] | company-owned |
| Billing account | [ ] | [ ] | budgets enabled |
| Firebase projects | [ ] | [ ] | exact eight project ids |
| Firestore Native mode | [ ] | [ ] | per database-backed product |
| Firebase Auth | [ ] | [ ] | authorized domains added |
| Firebase Storage | [ ] | [ ] | where required |
| Service accounts | [ ] | [ ] | no static-site service accounts |
| Google OAuth | [ ] | [ ] | origins and redirects added |
| One Vercel project | [ ] | [ ] | all domains on one project |
| Vercel DNS verified | [ ] | [ ] | copy Vercel records exactly |
| Vercel env values | [ ] | [ ] | from env templates |
| Vercel staging branch restriction | [ ] | n/a | Preview secrets limited to exact staging branch |
| Firebase Function secrets | [ ] | [ ] | declared secrets only |
| Gemini keys | [ ] | [ ] | separate staging and production |
| Upstash Redis | [ ] | [ ] | separate databases |
| Razorpay | [ ] | [ ] | Test Mode vs Live Mode |
| Sentry | [ ] | [ ] | env separation |
| SMTP | [ ] | [ ] | no personal inbox password |
| Telegram alerts | [ ] | [ ] | separate alert chats |
| App Check/reCAPTCHA | [ ] | [ ] | monitor before enforcement |
| Uptime monitors | [ ] | [ ] | public/private host monitors |
| Search Console | n/a | [ ] | production public domains only |
| Meta/WhatsApp | [ ] | [ ] | gated, not accidental live |
| Staging Firebase deploy | [ ] | n/a | must pass first |
| Staging Vercel deploy | [ ] | n/a | must pass first |
| Production Firebase deploy | n/a | [ ] | explicit approval only |
| Production Vercel deploy | n/a | [ ] | explicit approval only |
| Final smoke | [ ] | [ ] | browser plus provider logs |
| Maintenance calendar | [ ] | [ ] | monthly spend/alerts, quarterly IAM/secrets, annual ownership/recovery |

## Absolute No-Go List

- Do not use a retired legacy MenuList project.
- Do not create shorthand env keys.
- Do not create separate Vercel projects for each product.
- Do not expose staging secrets to every Vercel Preview branch.
- Do not share QA secrets with production.
- Do not reuse production secrets locally.
- Do not commit real env files.
- Do not relax Firestore or Storage rules to make setup pass.
- Do not enable App Check enforcement before valid traffic is confirmed.
- Do not allow any `menulist.digital` QA host to be indexed or publish a
  sitemap.
- Do not create Firebase for Neelvara or MyCodex.
- Do not activate CampaignCue provider/social integrations.
- Do not activate SignalDesk paid sender/enrichment providers.
- Do not describe Neelvara Systems as Pvt Ltd, LLP, corporation, or holding
  company until legal structure is confirmed.
