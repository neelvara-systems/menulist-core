# Answerlattice QA And Production Environment Setup Checklist

> **Last updated:** August 20, 2026
> **Status:** live setup ledger
> **Order:** QA first, production second
> **Launch boundary:** completing setup does not certify a release or authorize a Vercel deployment

Use this file as the single owner/operator checklist for Answerlattice cloud
setup. Report exact item IDs such as `AL-QA-A01 done`; record evidence beside
the item before moving forward.

## Fixed Architecture

| Concern | QA | Production |
| --- | --- | --- |
| Firebase project | `neelvara-answerlattice-qa` | `neelvara-answerlattice-prod` |
| Firebase alias | `answerlattice-qa` | `answerlattice-prod` |
| Website | `canonica.app`, `www.canonica.app` | `answerlattice.com`, `www.answerlattice.com` |
| Vercel environment | custom `qa`, branch `staging` | Production |
| Admin authentication | Vercel OIDC through project-owned WIF | Vercel OIDC through project-owned WIF |
| Runtime service account | `answerlattice-vercel-qa@neelvara-answerlattice-qa.iam.gserviceaccount.com` | `answerlattice-vercel-prod@neelvara-answerlattice-prod.iam.gserviceaccount.com` |
| WIF pool | project-local `answerlattice-vercel` | project-local `answerlattice-vercel` |
| WIF provider ID | `answerlattice-qa` | `answerlattice-prod` |
| Firebase config | `firebase-answerlattice.json` | `firebase-answerlattice.json` |
| Rules/indexes/Storage | dedicated Answerlattice files | same approved files, deployed independently |
| Functions | `functions-answerlattice/`, codebase `answerlattice` | same approved source revision, deployed independently |

Firebase Functions use Google-managed runtime credentials. The Vercel OIDC/WIF
flow is for the shared Next.js runtime and must not replace Functions ADC.

## Status Legend

- `[x]` verified now from source or live readback.
- `[ ]` pending or not currently readable.
- Historical evidence is named explicitly and never converted to `[x]`
  without current readback.

## Current Baseline

- [x] `AL-BASE-01` Source target matrix uses `neelvara-answerlattice-qa` and
  `neelvara-answerlattice-prod`.
- [x] `AL-BASE-02` `.firebaserc` maps production alias
  `answerlattice-prod` to project `neelvara-answerlattice-prod`.
- [x] `AL-BASE-03` Dedicated Firebase config, rules, indexes, Storage rules,
  and Functions source exist.
- [x] `AL-BASE-04` Staging and production env examples contain separate
  full-name `ANSWERLATTICE_*` key families and OIDC selectors.
- [x] `AL-BASE-05` WIF regression coverage defines a different service
  account and provider for each Answerlattice project.
- [x] `AL-BASE-06` Production apex and `www` return HTTP 200 from Vercel.
- [x] `AL-BASE-07` Fresh QA ownership. On August 20, 2026,
  `admin@neelvara.com` created Google Cloud project
  `neelvara-answerlattice-qa` (project number `216985843437`) under
  organization `neelvara.com` and read it back in Google Cloud Console.
- [x] `AL-BASE-08` QA domain ownership and routing preparation. `canonica.app`
  is in the company GoDaddy account; the apex and `www` hosts are attached only
  to Vercel custom environment `qa`. The parked web records are being replaced
  with Vercel's exact records; mail and verification DNS remain untouched.
- [x] `AL-BASE-09` Repository QA host contract uses `canonica.app` and
  `www.canonica.app`, with noindex, disallow-all robots, and no sitemap.
- [x] `AL-BASE-10` The former IDs `answerlattice-qa` and `answerlattice` are
  unowned/unreadable from the company account and permanently retired from
  source, credentials, IAM, provider setup, and deploy commands.

## Stop Conditions

Stop before any mutation when one of these is true:

- Before any Firebase-scoped deploy, the exact project is absent from
  `firebase projects:list` for the setup account.
- A console or CLI command resolves production alias `answerlattice-prod` to
  anything other than project `neelvara-answerlattice-prod`.
- The chosen Firestore location conflicts with an existing database. Firestore
  location is immutable; read it before creating or documenting parity.
- A secret, webhook, database, API key, service account, WIF pool/provider, or
  budget belongs to MenuList or another product.
- Vercel selectors would expose QA values to Production, Production values to
  QA, or either Answerlattice family to unrelated Preview deployments.
- A combined Firebase deploy proposes deleting remote indexes. Do not use
  `--force`; audit remote/local index parity first.

## Answerlattice QA

### Access And Ownership

- [x] `AL-QA-A01` Create company-owned Google Cloud project
  `neelvara-answerlattice-qa` under `neelvara.com` and verify direct access for
  `admin@neelvara.com`. Project number: `216985843437`.
- [ ] `AL-QA-A02` Record project number, organization, billing account,
  Firebase status, and active owner/break-glass identities.
  - Current readback on August 21, 2026: project number `216985843437`,
    organization `neelvara.com`, billing account
    `0135AA-B5D4AD-C72CAB`, Firebase enabled, and
    `admin@neelvara.com` is the only visible principal with inherited
    Organisation Administrator plus direct Owner. This account is the existing
    permanent break-glass administrator; the missing control is a named daily
    operator with only required access, not another break-glass identity.
    Google Workspace currently bills each assigned Business Base user at
    INR 60/month through November 18, 2026 and INR 120/month afterward. No
    second paid user was silently created; this governance decision remains
    open and does not block the deployed QA runtime.
- [x] `AL-QA-A03` Confirm billing alerts and hard provider spend controls are
  routed to the company operational mailbox.
  - A project-scoped INR 25 monthly Google Cloud budget alert exists with 50%,
    90%, and 100% thresholds. A separate enforced INR 20 monthly spend cap now
    applies only to Gemini API in `neelvara-answerlattice-qa`, with 50%, 80%,
    and 100% notifications to billing administrators/users and project owners
    at the company-managed account. The Vercel `qa` environment also retains
    the repository admission guard
    `ANSWERLATTICE_GEMINI_SPEND_LIMIT_USD_10M=8`. The cap can pause Gemini API
    usage and is intentionally independent from the general project alert.
- [x] `AL-QA-A04` Confirm service-account key creation policy and verify zero
  user-managed keys on the Vercel runtime service account.
  - Current readback on August 20, 2026: inherited constraint
    `iam.managed.disableServiceAccountKeyCreation` is Enforced and dedicated
    runtime identity `answerlattice-vercel-qa@neelvara-answerlattice-qa.iam.gserviceaccount.com`
    has zero user-managed keys.

### Firebase Foundation

- [x] `AL-QA-B01` Firestore `(default)` is Native/Standard in immutable
  multi-region `nam5`, with point-in-time recovery and delete protection
  enabled.
- [x] `AL-QA-B02` Verify Firebase Auth, Web app, Storage bucket, App Check,
  Functions, Eventarc, Cloud Tasks, Scheduler, Artifact Registry, Secret
  Manager, Pub/Sub, and Cloud Run state.
  - Current readback: active Firebase Web app `Answerlattice QA Web`, US
    multi-region Storage, dedicated App Check registration, 11 active approved
    Functions, one hourly Scheduler job, one running embedding task queue, and
    the required Google-managed supporting services. Optional provider-send
    Functions are not deployed.
- [x] `AL-QA-B03` Record the exact Firebase Web configuration in the custom
  Vercel `qa` environment using the `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_*`
  keys from `.env.staging.example`.
- [x] `AL-QA-B04` Keep `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate` and
  reject partial Answerlattice configuration.
- [x] `AL-QA-B05` Verify authorized Auth domains and App Check registration for
  `canonica.app` and `www.canonica.app` before enforcement.
  - Auth permits the exact QA hosts. App Check uses a dedicated legacy
    score-based reCAPTCHA v3 key for `canonica.app`, TTL 24 hours, threshold
    0.5. Enforcement remains intentionally OFF for monitoring-first rollout.
    No live reCAPTCHA Enterprise key is retained. Google Cloud's key inventory
    contains only the legacy `Website - score` key for `canonica.app`. Firebase
    still retains the historical Enterprise provider configuration because the
    App Check API has no delete method and rejects an empty `siteKey`; its
    referenced Enterprise key has been deleted, so it cannot exchange tokens.
    The application initializes only `ReCaptchaV3Provider`.

### Keyless Vercel Runtime

- [x] `AL-QA-C01` Create or verify
  `answerlattice-vercel-qa@neelvara-answerlattice-qa.iam.gserviceaccount.com`.
- [x] `AL-QA-C02` Create or verify project-local WIF pool
  `answerlattice-vercel` and provider `answerlattice-qa` with the exact Vercel
  team/project/environment condition.
- [x] `AL-QA-C03` Grant only the repository-documented runtime roles and WIF
  impersonation binding; do not grant Owner/Editor to the runtime identity.
- [x] `AL-QA-C04` Set the QA-only OIDC selectors from `.env.staging.example`;
  remove static service-account JSON variables and files.
- [x] `AL-QA-C05` Run `npm run test:vercel-workload-identity` and
  `npm run verify:env-targets`.
- [ ] `AL-QA-C06` Produce one authorized hosted proof for OIDC/STS, Firebase
  custom-token signing, Firestore, Storage, and any admitted task path without
  creating real customer data.
  - Project-local WIF, least-privilege IAM, managed-environment selectors, and
    hosted deployment identity are configured and source-verified. The final
    custom-token/data-path proof needs an authorized disposable credential
    fixture, so it remains deferred testing rather than missing provider setup.

### Secrets And Providers

- [x] `AL-QA-D01` Inventory current Vercel QA values and Firebase Secret
  Manager names. Record names/status only, never secret values. The custom
  `qa` environment now contains the dedicated Answerlattice Firebase/OIDC/public
  selectors; Secret Manager contains only the admitted core secret names.
- [x] `AL-QA-D02` Create distinct QA values for the required core secret group:
  `ANSWERLATTICE_CRON_SECRET`, `ANSWERLATTICE_GEMINI_AI_KEY`, and
  `ANSWERLATTICE_PUBLIC_BUNDLE_SALT`.
  - Current readback on August 21, 2026: the dedicated Google AI Studio
    authorization key `Answerlattice QA Gemini Authorization` is bound to its
    project-local AI Studio service account, restricted to
    `generativelanguage.googleapis.com`, and is not reused by MenuList. Vercel's
    custom `qa` environment contains the sensitive
    `ANSWERLATTICE_GEMINI_AI_KEY` value. Firebase Secret Manager has enabled
    version 3 of `ANSWERLATTICE_GEMINI_AI_KEY`; versions 1 and 2 are destroyed.
    All eight deployed AI entry points that declare the key are ACTIVE and bind
    version 3. The superseded standard Google API key is deleted. The public
    Firebase Web API key remains a separate browser identifier and is never the
    Gemini runtime credential.
- [x] `AL-QA-D03` Do not create a paid QA Upstash database. The admitted Redis
  integrations are optional fast paths; when the dedicated variables are
  absent they degrade to Firestore/live retrieval. Durable truth remains in
  Firestore. Reopen this item only after measured load justifies Redis.
- [x] `AL-QA-D04` Keep Resend, SMTP, GitHub, WhatsApp, analytics, and
  other optional providers only when their feature gate and certification are
  approved. Keep provider-send paths disabled until then.
- [x] `AL-QA-D05` Verify no MenuList API key, webhook secret, Redis token, or
  Firebase secret is reused.
  - Google OAuth remains a deliberate exception to setup closure: the shared
    NextAuth runtime currently has one MenuList-scoped `GOOGLE_CLIENT_*` pair
    and one `NEXTAUTH_URL`. Answerlattice QA uses credential authentication for
    now. Do not modify or reuse the MenuList OAuth client; a host-aware
    product-specific OAuth design requires a separately approved code change.
- [x] `AL-QA-D06` Migrate the explicitly API-restricted standard Gemini API key
  to a Google AI Studio authorization key before Google's September 2026
  standard-key rejection. Rotate the value in Vercel `qa` and Firebase Secret
  Manager, redeploy only the eight Functions that bind
  `ANSWERLATTICE_GEMINI_AI_KEY`, verify an authorized provider call from the
  exact enabled secret version, redeploy the Vercel custom `qa` environment,
  and then destroy the superseded Google Cloud key and Secret Manager version.
  Hosted product-workflow certification remains in `AL-QA-E06`. Follow Google's
  [Gemini API key guidance](https://ai.google.dev/gemini-api/docs/api-key) and
  never place the authorization key in browser configuration.
  - Credential creation is owner-operated. Codex prepares the exact project,
    name, and scope and guides the owner through final creation; after explicit
    confirmation, Codex verifies metadata and performs the secret transfer,
    scoped redeploys, readback, and retirement without displaying secret values.

### Scoped Deploy And Setup Closure

- [x] `AL-QA-E01` Run source gates on the exact revision:
  `npm run typecheck:answerlattice`,
  `npm --prefix functions-answerlattice run build`,
  `npm run test:vercel-workload-identity`, and
  `npm run verify:env-targets`.
  - Current evidence on August 20, 2026: the full
    `npm run verify:answerlattice-runtime-truth` aggregate passed, including
    dedicated/shared Firestore rule parity, Storage rules, billing, public API,
    widget, scheduler, governance, tenant-isolation, and runtime contracts.
    Answerlattice TypeScript, the Functions build, `git diff --check`, and the
    documentation link scan also passed with zero broken links. The link scan
    reported only pre-existing video-document naming warnings outside this
    setup scope.
- [x] `AL-QA-E02` Audit remote indexes before deploying. Resolve the historical
  `kb_articles` conflict without `--force` or remote index deletion.
- [x] `AL-QA-E03` Deploy the dedicated rules, Storage rules, approved indexes,
  and approved Functions targets to `neelvara-answerlattice-qa` using
  `firebase-answerlattice.json`.
- [x] `AL-QA-E04` Read back active rules, Storage rules, index states,
  Functions, scheduler/task resources, secret bindings, and service-account
  identities from `neelvara-answerlattice-qa`.
- [x] `AL-QA-E05` After the prepared routing revision is deployed to QA,
  attach `canonica.app` and `www.canonica.app` only to the custom Vercel `qa`
  environment and exact `staging` branch, then replace only the parked GoDaddy
  web records with Vercel's exact records. Preserve mail and verification DNS.
  - Domain attachment and DNS replacement are complete. GoDaddy now serves apex
    A `216.150.1.1` and `www` CNAME
    `dd4b150d15c50a85.vercel-dns-017.com.`; public DNS and Vercel both report
    valid QA configuration. Mail and verification records were preserved.
    Exact staging commit `f02e2c9dc18af21d83a4e8a4c2bfd86f22a043ea`
    is now live on both hosts. Hosted readback returned HTTP 200 with valid TLS,
    `x-product-id: answerlattice`, and
    `x-robots-tag: noindex, nofollow, noarchive`; Canonica remains inside QA and
    no longer redirects to production.
- [ ] `AL-QA-E06` Verify TLS, `/api/version`, noindex/robots policy, Auth,
  App Check monitoring, widget, owner dashboard, ticket, KB, and scheduler
  setup paths. Product testing evidence remains separate from setup closure.
  - Base hosted proof is complete: `/api/version` returned exact commit
    `f02e2c9dc18af21d83a4e8a4c2bfd86f22a043ea`, both Canonica hosts returned
    HTTP 200 with the Answerlattice product header and QA crawler isolation,
    `robots.txt` disallows all crawling, `sitemap.xml` returns 404, and the
    production Answerlattice host remains HTTP 200 and indexable. Hydrated
    browser readback confirmed AnswerLattice branding, the approved governed
    source tagline, credential-only login, and no MenuList Google OAuth action.
    Fixture-dependent App Check, widget, dashboard, ticket, KB, scheduler, and
    authenticated identity-path certification remains deferred testing and is
    not inferred from the base-host proof.
- [ ] `AL-QA-E07` Complete a non-destructive backup/restore drill using
  `answerlattice-backup-recovery-runbook.md`.
  - A daily 14-week managed-backup schedule is active. The isolated restore
    rehearsal remains pending until the first backup reaches READY state. A
    Firebase CLI readback on August 21, 2026 returned no available backups and
    confirmed the daily schedule with `8467200s` retention remains active.

QA setup closes only when `AL-QA-A01` through `AL-QA-E07` have current
evidence. Historical May/June deploy records do not waive these readbacks.

## Answerlattice Production

Start this section only after QA setup closes. Production preparation may be
performed without traffic activation, but production deploy and provider-send
activation require an explicit scoped approval.

### Access And Ownership

- [ ] `AL-PROD-A01` Grant `admin@neelvara.com` explicit access to project
  `neelvara-answerlattice-prod` and verify it appears in
  `firebase projects:list`.
- [ ] `AL-PROD-A02` Record project number, organization, billing, budgets,
  operational contacts, and break-glass access independently from QA.
- [ ] `AL-PROD-A03` Verify the production runtime service account has zero
  user-managed keys and no broad Owner/Editor role.

### Firebase Foundation

- [ ] `AL-PROD-B01` Verify or create the Firebase Web app, Auth, Firestore,
  Storage, App Check, Functions, Eventarc, Cloud Tasks, Scheduler, Artifact
  Registry, Secret Manager, Pub/Sub, and Cloud Run foundation.
- [ ] `AL-PROD-B02` Confirm the immutable Firestore location before creation.
  Use the approved Answerlattice architecture; do not copy MenuList's regional
  decision automatically.
- [ ] `AL-PROD-B03` Record production Firebase Web configuration only in
  Vercel Production using `.env.production.example`.
- [ ] `AL-PROD-B04` Configure exact production Auth domains and App Check
  registration for `answerlattice.com` and `www.answerlattice.com`.

### Keyless Vercel Runtime

- [ ] `AL-PROD-C01` Create or verify
  `answerlattice-vercel-prod@neelvara-answerlattice-prod.iam.gserviceaccount.com`.
- [ ] `AL-PROD-C02` Create or verify the project-local WIF pool
  `answerlattice-vercel` and provider `answerlattice-prod`, restricted to the
  shared Vercel project's Production environment.
- [ ] `AL-PROD-C03` Apply least-privilege runtime and impersonation bindings.
- [ ] `AL-PROD-C04` Set Production-only OIDC selectors and remove all static
  Answerlattice Admin key material.
- [ ] `AL-PROD-C05` Produce an authenticated hosted production proof for
  OIDC/STS, custom-token signing, Firestore, Storage, and admitted task paths.

### Secrets, Providers, And Spend

- [ ] `AL-PROD-D01` Create fresh production core secrets; do not promote QA
  secret values.
- [ ] `AL-PROD-D02` Create an independent Google AI Studio authorization key,
  billing attribution, usage alerting, and spend-control evidence for project
  `neelvara-answerlattice-prod`. Do not create or promote a standard Gemini API
  key that will be rejected after September 2026.
- [ ] `AL-PROD-D03` Create a production Upstash database and hard budget only
  if the admitted production paths require it; never share QA credentials.
- [ ] `AL-PROD-D04` Configure production Resend/SMTP/provider credentials only
  for approved send paths. Keep WhatsApp and other optional provider sends
  disabled until legal/ownership/certification gates close.
- [ ] `AL-PROD-D05` Verify every enabled Secret Manager version is bound only
  to the exact Functions that declare it.

### Production Promotion And Setup Closure

- [ ] `AL-PROD-E01` Freeze the exact source revision that passed QA and rerun
  the focused source gates.
- [ ] `AL-PROD-E02` Audit production remote indexes before deploy; never use
  `--force` as a shortcut.
- [ ] `AL-PROD-E03` With explicit scoped approval, deploy dedicated rules,
  Storage rules, approved indexes, and approved Functions targets to project
  `neelvara-answerlattice-prod` using `firebase-answerlattice.json`.
- [ ] `AL-PROD-E04` Read back active rules, Storage rules, indexes, Functions,
  service identities, secret bindings, scheduler/tasks, and budgets.
- [ ] `AL-PROD-E05` Verify Vercel Production assignments for
  `answerlattice.com` and `www.answerlattice.com`, TLS, canonical redirects,
  `/api/version`, and production environment identity.
- [ ] `AL-PROD-E06` Complete authenticated backend smoke and a bounded
  backup/restore drill before launch certification.
- [ ] `AL-PROD-E07` Record intentionally disabled providers and feature flags;
  setup closure must not silently activate them.

Production setup closes only when `AL-PROD-A01` through `AL-PROD-E07` have
current readback. Release certification, real-client onboarding, provider
delivery certification, browser/device checks, and launch approval remain
separate gates.

## Evidence Log

Append short entries here. Do not paste secrets, tokens, private keys, raw
service-account JSON, or customer data.

| Date | Item | Result | Evidence |
| --- | --- | --- | --- |
| 2026-08-20 | `AL-BASE-01` through `AL-BASE-06` | Source and public production host baseline recorded | Repository target/config files; HTTP header checks |
| 2026-08-20 | `AL-BASE-07` | Superseded discovery | Firebase CLI as `admin@neelvara.com` could not read the retired external Answerlattice IDs; the company-owned replacement QA project was then created and verified |
| 2026-08-20 | `AL-BASE-07` | Superseded discovery | Direct GCP checks confirmed the old IDs were inaccessible; they were retired rather than reused or requested |
| 2026-08-20 | `AL-BASE-08` | Pass | GoDaddy inventory confirmed `canonica.app` ownership; the domain was attached only to Vercel `qa`, and the exact apex and `www` web records were replaced without changing mail or verification DNS |
| 2026-08-20 | `AL-BASE-09` | Pass after hosted release | Deployment target, product routing, widget staging URL, crawler isolation, and regression assertions moved to `canonica.app`; exact staging commit `f02e2c9dc18af21d83a4e8a4c2bfd86f22a043ea` is live on both QA hosts |
| 2026-08-20 | `AL-QA-D01` | Superseded pre-setup inventory | Custom Vercel `qa` was branch-locked to `staging` and initially had zero `ANSWERLATTICE_*` variables; dedicated values were added later in the setup |
| 2026-08-20 | `AL-QA-A01` | Pass after fresh-project decision | The inaccessible external IDs were not modified; company-owned project `neelvara-answerlattice-qa` was created under `neelvara.com` and verified as `admin@neelvara.com` |
| 2026-08-21 | `AL-QA-A03` | Pass | General INR 25 project alert remains active; enforced INR 20 monthly Gemini API spend cap added for `neelvara-answerlattice-qa` with 50%, 80%, and 100% notifications to billing users and project owners; Vercel admission guard remains 8 USD per 10 minutes |
| 2026-08-20 | `AL-QA-B01` through `AL-QA-B05` | Pass with monitoring boundary | Firebase enabled; Firestore `nam5`; active Web app; US Storage; exact Auth domains; legacy reCAPTCHA v3 App Check registered with enforcement OFF |
| 2026-08-20 | `AL-QA-C01` through `AL-QA-C05` | Pass | Dedicated keyless runtime service account, project-local WIF pool/provider, least-privilege roles, exact Vercel QA selectors, zero user-managed keys, and focused identity/env gates |
| 2026-08-20 | `AL-QA-D01` through `AL-QA-D05` | Pass with OAuth deferral | Dedicated core secrets and Firebase/OIDC values exist; no MenuList secret or Redis credential reused; optional providers disabled; Google OAuth deferred because shared NextAuth is MenuList-scoped |
| 2026-08-20 | `AL-QA-E02` through `AL-QA-E04` | Pass | Rules and Storage rules hashes match source; 100 composite indexes READY; 18 TTL fields ACTIVE; 11 approved Functions ACTIVE; one Scheduler job and one task queue active |
| 2026-08-21 | `AL-QA-E05` | Pass | Canonica apex and `www` are attached only to Vercel `qa`; public DNS and Vercel are valid; Vercel deployment `dpl_4RrusSrXKWKUDyVvV9UjUGogxy9R` serves exact build `f02e2c9dc18af21d83a4e8a4c2bfd86f22a043ea` with HTTP 200, valid TLS, Answerlattice product identity, QA crawler isolation, and no production redirect |
| 2026-08-21 | `AL-QA-E06` | Setup pass; certification deferred | Exact `/api/version`, HTTP 200, TLS, Answerlattice product header, noindex header, disallow-all robots, absent sitemap, unaffected production host, and hydrated AnswerLattice credential-only login verified; fixture-dependent application and identity paths remain deferred testing |
| 2026-08-21 | QA login deployment | Pass after scoped build repair | Initial deployment `dpl_AhmxMDzT73N2aFvUnhTP3eCMiXpY` failed because it referenced a local-only uncommitted website constant; the login copy dependency was made self-contained, source gates passed, and replacement deployment `dpl_4RrusSrXKWKUDyVvV9UjUGogxy9R` reached READY |
| 2026-08-21 | `AL-QA-E07` | Waiting for first backup | One daily Firestore backup schedule with `8467200s` retention exists; Firebase CLI returned no available backups, so the isolated restore rehearsal cannot begin yet |
| 2026-08-21 | `AL-QA-D06` | Pass | Owner created the project-local AI Studio authorization key; metadata and API restriction verified; Vercel `qa` and Firebase Secret Manager rotated; eight AI Functions ACTIVE on secret version 3; direct Gemini call returned HTTP 200 with `OK`; old standard key deleted and secret version 2 destroyed; fresh Vercel `qa` deployment `menulist-core-jo9gbj0hk-neelvara-systems.vercel.app` reached READY and `/api/version` returned exact commit `002a76ea056135203b908b64e29be03e18dcb142` |
