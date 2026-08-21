# MenuList Production Provider Setup

> **Status:** Active owner/provider preparation ledger
> **Scope:** MenuList production accounts, projects, credentials, and inactive provider configuration
> **Last updated:** August 16, 2026
> **Current progress:** 49 of 62 checks complete; `PROD-B11` keyless architecture, provider preparation, production Cloud Tasks queue, and queue-scoped enqueuer IAM are complete, while the authenticated Firestore/Storage/Cloud Tasks hosted proof remains open; `PROD-B12` PITR and its restore drill are complete; `PROD-B13` App Check is registered in monitoring mode; production Gemini billing/credentials, the isolated production Sentry project, the exact-host Maps Embed credential, the isolated production Upstash database plus environment wiring, and the MFA-protected MenuList Resend boundary with verified outbound DNS and isolated production credentials/webhook are prepared; the existing company Razorpay Test Mode API pair is temporarily wired to the pre-live production candidate while KYC, Live Mode credentials, and the endpoint-specific production webhook remain release blockers; the current production Functions secret manifest is complete with a distinct internal budget-webhook secret; GA4, Telegram, external uptime monitoring, and production WhatsApp remain intentionally omitted; the MenuList-only Production environment inventory, exact domain rows, production Firebase Web/keyless server configuration, admitted-provider environment wiring, optional-provider fail-closed review, non-secret Functions runtime configuration, non-deploy source/configuration verification, and metadata-only environment-separation review are prepared; the full `menulist-qa` provider setup is complete; the remaining QA certification fixtures and device/provider testing are owner-accepted parallel work rather than a production-deployment blocker; the local release aggregate and scoped MenuList matrix are recorded under `PROD-F02`; the exact release commit is live on a Ready Vercel Production deployment, the six production domains are attached and cut over with TLS, Storage rules, all 166 declared Firestore composite indexes and field overrides, and four WhatsApp-independent Functions targets are deployed; Firestore Security Rules publication alone remains blocked by a repeated Google Rules API HTTP 503, and both Answerlattice targets are explicitly pending

This is the step-by-step production provider setup guide for MenuList. It may
run in parallel with the remaining staging feature-certification flows, but it
does not authorize a production deploy, DNS cutover, live payment, production
message, production data write, or launch.

The current production contract remains:

- website: `menulist.ai` and `www.menulist.ai`
- owner/staff app: `app.menulist.ai`
- customer links: `*.menulist.online`
- Firebase project: exact project ID `menulist-prod`
- Firebase/Google Cloud region: `us-central1`
- Vercel environment: `Production`

Report each completed item as its exact ID, for example `PROD-A05 resolved`.
Codex must update this ledger before guiding the next item.

## Four-Project Keyless Rollout Contract

The approved final architecture keeps one shared `menulist-core` Vercel project
and four separate Firebase projects:

| Vercel environment | Product | Firebase project | Runtime identity |
| --- | --- | --- | --- |
| custom `qa`, attached only to branch `staging` | MenuList | `menulist-qa` | dedicated `menulist-qa` WIF service account |
| Production | MenuList | `menulist-prod` | dedicated `menulist-prod` WIF service account |
| custom `qa`, attached only to branch `staging` | Answerlattice | `answerlattice-qa` | dedicated `answerlattice-qa` WIF service account |
| Production | Answerlattice | `answerlattice` | dedicated `answerlattice` WIF service account |

The repository source, env templates, validation, and regression coverage are
prepared for all four eventual targets. Provider setup and runtime certification
run independently in this order: MenuList QA, MenuList production,
Answerlattice QA, and Answerlattice production. The two Answerlattice targets
remain pending until the MenuList QA and production passes close; their absence
does not block a MenuList deployment, but any partial Answerlattice Firebase
family remains invalid. A generic Vercel Preview identity is not accepted as the
internal production-grade QA identity; the custom `qa` environment must emit the
identity admitted by Google IAM.
Custom Environments require a supporting Vercel plan; if the current team does
not expose that feature, stop and resolve the plan boundary instead of falling
back to generic Preview trust. Firebase Functions are not part of this
migration.

## Parallel Safety Boundary

Safe before feature certification closes:

- inspect and recover account/project ownership;
- create inactive production projects and resources after their exact identity
  is approved;
- attach company billing and create budgets/alerts;
- create production OAuth clients, provider resources, and secrets without
  wiring traffic to them;
- vault credentials and enter distinct Vercel Production/Firebase Secret
  Manager values without deploying;
- export current DNS and confirm domain ownership, auto-renew, and recovery.

Blocked until staging feature certification and production release gates pass:

- Firebase rules, indexes, Storage, or Functions production deploys;
- a Vercel Production build or deployment;
- assigning or cutting over production DNS;
- activating a Razorpay Live webhook or taking a real payment;
- registering production messaging callbacks or sending a production message;
- enabling App Check enforcement;
- creating production tenants, stores, staff, subscriptions, or customer data;
- enabling public indexing or announcing production availability.

## Current Evidence

- `admin@neelvara.com` is the authenticated company administrator.
- Historical baseline before production-project creation: Firebase Console
  listed only `menulist-qa`. Current evidence below supersedes that baseline and
  confirms active Firebase project `menulist-prod`.
- Firebase's project-creation wizard reports exact project ID `menulist` as
  `taken or unavailable`.
- Firebase's eligible existing Google Cloud project list shows
  `menulist-gemini-qa-free` and `Default Gemini Project`; it does not show
  `menulist`.
- `.firebaserc` keeps `menulist-qa` as the safe default and intentionally has no
  `menulist-prod` self-alias. Production commands must use literal project ID
  `menulist-prod`, allowing Firebase CLI to load
  `functions/.env.menulist-prod` exactly once by project ID.
- `2026-08-16` - Production domain preflight completed without DNS mutation.
  GoDaddy zone exports were saved locally as `menulist.ai.txt` and
  `menulist.online.txt`; `menulist.ai` auto-renew was already enabled through
  February 11, 2028, and the owner explicitly approved enabling
  `menulist.online` auto-renew through February 12, 2027. Vercel still has no
  MenuList production custom domains attached and no valid current Production
  deployment, so no traffic moved.
- `2026-08-16` - Application-source release candidate
  `4cbe53d0691c74eec2b526a10519d4c882dccfd5` passed configuration safety,
  workload-identity tests, Functions deploy preflight, TypeScript, lint, and
  diff hygiene. The custom `qa` deployment
  `menulist-core-6zootj7uq-neelvara-systems.vercel.app` became Ready, and both
  canonical QA `/api/version` endpoints returned that exact build with the
  expected runtime environment value `preview`. No `main` push, Production
  deployment, production-domain assignment, or DNS edit occurred.
- `2026-08-16` - The owner approved the scoped release exception while the
  remaining QA fixture/device/provider certification continues in parallel.
  Exact commit `32d1a0605adae6f2d9c6881fa52fda1254f1b840` was fast-forwarded
  to both `origin/staging` and `origin/main`. Vercel Production deployment
  `dpl_Eay11a4cM7Szb33cqEgYjnDVy3Yj` is Ready at
  `menulist-core-2zoz9qky4-neelvara-systems.vercel.app`; `/api/version` on
  the immutable deployment, `menulist.ai`, `www.menulist.ai`, and
  `app.menulist.ai` returned that exact build ID with environment
  `production`. A bad Production `NEXT_PUBLIC_SENTRY_DSN` mapping was detected
  from the first deployment's runtime log, replaced directly from the
  company-owned `menulist-prod` Sentry client key without printing it, and
  redeployed. A fresh unauthenticated `/api/auth/set-claims` request returned
  the expected application HTTP 401 and the corrected deployment log contained
  only the bounded authentication warning, not the former invalid-DSN error.
- `2026-08-16` - Production DNS cutover completed. Vercel owns six exact rows:
  `menulist.ai`, `www.menulist.ai`, `app.menulist.ai`,
  `menulist.online`, `www.menulist.online`, and `*.menulist.online`.
  GoDaddy now routes the `.ai` apex to Vercel's current recommended IPv4 and
  both `www`/`app` through Vercel's current recommended CNAME. The `.online`
  zone uses `ns1.vercel-dns.com` and `ns2.vercel-dns.com`; its existing DMARC
  TXT policy was copied into Vercel DNS before the nameserver change. Vercel
  reports Valid Configuration for the `.ai` hosts and both `.online`
  redirects. HTTPS proof passed for the three `.ai` hosts, both exact
  `.online` redirects preserve the request path/query and return 301 to
  `menulist.ai`, and a disposable wildcard hostname returned HTTP 200 with
  `x-tenant-subdomain` and `x-tenant-type: subdomain`. One local resolver still
  retained the former parked `.online` apex during its old TTL; Cloudflare,
  Google, and Vercel authoritative DNS already returned the Vercel addresses.
- `2026-08-16` - Firebase production infrastructure deploy evidence recorded.
  Storage rules deployed successfully to `menulist-prod`. The 42-script local
  rules matrix passed. An indexes-only Firebase configuration bypassed the
  unavailable Rules API preflight and deployed all 166 declared composite
  indexes plus the repository field overrides; production readback found zero
  missing declared indexes. Firestore Security Rules remain open after the CLI
  test call and direct Rules REST ruleset creation both returned HTTP 503. The
  required Firebase Rules service agent and its sole
  `roles/firebaserules.system` binding are present. Live IAM comparison confirms
  `admin@neelvara.com` has `roles/owner` on both `menulist-qa` and
  `menulist-prod`; both projects return the required
  `firebase.projects.get`, `firebaserules.releases.update`,
  `firebaserules.rulesets.create`, and `serviceusage.services.use` permissions,
  and both Rules service agents have `roles/firebaserules.system`. No missing
  human or service-agent role exists and no IAM grant was added. A production
  control request created and deleted a minimal deny-all ruleset successfully,
  proving the project, caller, Rules API, and ruleset mutation path work. The
  optimized current source passed the complete 42-script emulator gate, compiled
  with zero issues, and was released with exact hash readback on QA, but five bounded full-source create attempts and
  five bounded full-source test attempts still returned HTTP 503 on the fresh
  production project. This isolates the remaining failure to Google's managed
  large-policy compiler path for `menulist-prod`, not authentication or an
  invalid local ruleset. Production therefore remains on its initial 163-byte
  locked ruleset, which does not match repository SHA-256
  `667cc95349abb7f232bff900b7c9ce79002cdc1f1399c2fec04e8e491d8169d9`.
  At that checkpoint, the Basic Google Cloud support route did not offer a paid
  technical case, so no IAM role or support-plan change was made; the later
  Firebase Support case is recorded in the `2026-08-18` entry below.
  Four
  WhatsApp-independent Functions are ACTIVE in `us-central1`:
  `processMenuImages`, `mapsPlaceCheck`, `backfillStoresSummary`, and
  `processMenuImagesJob`. The default compute build identity now has the
  durable `roles/run.builder` role plus Eventarc receiver/invoker roles; the
  temporary standalone Logs Writer and Storage Object Viewer grants were
  removed. The three callable services use Cloud Run's supported public
  transport setting under domain-restricted sharing, while application-level
  auth remains enforced: bounded unauthenticated requests reached each handler
  and returned its expected application HTTP 401. `processMenuImagesJob`
  remains private/event-only. WhatsApp-bound Functions were deliberately not
  deployed and no placeholder secret was created. Artifact Registry cleanup
  remains a separate destructive-retention decision; no automatic deletion
  policy was enabled during this release.
- `2026-08-18` - Firebase Support case `10420179` replied after observing the
  small production ruleset and asked whether the issue still persisted. That
  small ruleset is the diagnostic deny-all control, not the intended production
  policy. The intended repository source is 193,131 UTF-8 bytes across 4,381
  lines with SHA-256
  `667cc95349abb7f232bff900b7c9ce79002cdc1f1399c2fec04e8e491d8169d9`.
  All 42 local emulator rule scripts passed again. One fresh authenticated,
  rules-only production retry at `2026-08-18T16:34:18Z` reached
  `POST /v1/projects/menulist-prod:test` and returned HTTP 503 `UNAVAILABLE`.
  The failure occurred during the managed test/preflight call, so no ruleset or
  release was created and production remains on the diagnostic deny-all
  ruleset. The support follow-up must confirm that the issue persists and ask
  Google to inspect the production managed-compiler path, report the compiled
  policy size, and identify any internal limit that this source reaches.
- `2026-08-20` - The Firebase Support recommendation to remove comments was
  tested without modifying canonical `firestore.rules`. A string-aware lexical
  transform removed comments and blank lines only, reducing the temporary
  deployment candidate from 193,131 bytes and 4,381 lines to 171,753 bytes and
  3,767 lines. All three `https://` string literals were preserved. The
  canonical 42-script emulator matrix passed, and the temporary candidate
  compiled successfully in the local Firestore emulator. One scoped production
  deployment using Firebase CLI `15.26.0` authenticated as
  `admin@neelvara.com`, passed IAM and database access, then again received HTTP
  503 `UNAVAILABLE` from `POST /v1/projects/menulist-prod:test` before any
  ruleset or release mutation. Comments and raw source payload size are
  therefore not the production-specific trigger. Canonical `firestore.rules`
  remains unchanged at SHA-256
  `667cc95349abb7f232bff900b7c9ce79002cdc1f1399c2fec04e8e491d8169d9`, and
  production remains on the diagnostic deny-all ruleset. The support follow-up
  should include both source files and request engineering review of the
  production managed compiler's internal complexity or compiled-AST failure.
- `2026-08-20` - A read-only QA/production setup-parity audit found no missing
  customer-controlled Rules prerequisite. Both Firebase projects are ACTIVE,
  belong to organisation `936910729624`, use the same enabled billing account,
  and have a Native-mode `(default)` Firestore database in `us-central1`.
  `firebaserules.googleapis.com`, `firestore.googleapis.com`, Firebase,
  Identity Toolkit, and Service Usage are enabled in both projects. Both use
  the same default repository targets (`firestore.rules` and
  `firestore.indexes.json`), grant `admin@neelvara.com` every tested Rules and
  Service Usage permission, have the correctly numbered
  `service-<project-number>@firebase-rules.iam.gserviceaccount.com` service
  agent with only `roles/firebaserules.system`, and expose identical Rules API
  quotas with no overrides. The expected differences are production PITR,
  production's narrower approved Functions set, and its additional
  Compute/Cloud Run service roles; none participates in Rules compilation.
  Static inspection of canonical `firestore.rules` found no project-ID or
  environment literal, no duplicate helper name, no custom-function cycle,
  and a maximum helper-call depth of 6, below Firebase's documented limit of
  20. A back-to-back authenticated `projects:test` control using the exact
  canonical bytes returned HTTP 200 with zero issues for `menulist-qa` at
  `2026-08-20T05:05:26Z`, then HTTP 503 for `menulist-prod` at
  `2026-08-20T05:05:30Z`; the production 163-byte deny-all control returned
  HTTP 200 at `2026-08-20T05:08:21Z`. Production also already contains an
  immutable, byte-identical canonical ruleset created on `2026-08-16` with the
  repository SHA-256 and 193,131-byte source, proving full-source ingestion
  succeeded. Testing that stored ruleset returned HTTP 503, while testing QA's
  byte-identical stored ruleset returned HTTP 200. The active production
  `cloud.firestore` release still points to the 163-byte deny-all ruleset; no
  release mutation was attempted. This isolates the blocker to a
  production-project-specific managed compile/test path after ingestion, not
  project setup, IAM, API enablement, quotas, source selection, CLI version,
  browser transport, comments, or raw payload size.
- `2026-08-16` - The data-flow inventory was regenerated against exact candidate
  `4cbe53d0691c74eec2b526a10519d4c882dccfd5`: 8,997 first-party files are in
  scope, with 7,493 reviewed, 1,116 in progress, and 388 inventory-only; the
  collection catalog contains 299 families. The current Firestore rules delta,
  root collection registries, and unchanged `fontPreset` and
  `ownerControlUsage` evidence rows were manually reviewed and relocked to exact
  current fingerprints. `verify:data-flow-audit-tools`, the focused
  NotificationOS and tenant/store rules emulators, SecurityOS registry audit,
  and the complete 42-script MenuList root Firebase rules predeploy matrix all
  passed. This closes the stale-fingerprint sub-blocker only; the hosted fixture
  and true-device rows still prevent `PROD-F01` from closing.
- `src/constants/deploymentTargets.ts`, the production env example, Functions
  runtime URL maps, backfill allowlists, setup commands, and their verifiers
  now require production project ID `menulist-prod`.
- `2026-08-15` - The deployment documentation hub and every document in its
  execution sequence were reconciled against the completed QA ledger, current
  env templates, Functions secret declarations, deployment targets, and env
  verifiers. Stale shared-OAuth, generic MenuList env-name, and premature
  production-domain instructions were corrected; the dedicated QA and
  production ledgers now override older portfolio-wide references.
- `2026-08-15` - After Google Cloud re-authentication, opening exact project ID
  `menulist` returned **You need additional access** with missing permission
  `resourcemanager.projects.get`. The project was absent from the
  `neelvara.com` resource selector. The request-access preview identified no
  administrator or automatic recipient, required a manually forwarded
  message, and left the requested role unspecified. No request was copied or
  submitted, no broad role was requested, and no project was created.
- `2026-08-15` - The sole maintainer confirmed that no founder/company-
  controlled Google account ever created project ID `menulist`. Because Google
  Cloud project IDs are globally unique, permanent, and unavailable for reuse
  even after deletion, the inaccessible ID is classified as unrelated or
  otherwise permanently unavailable. No ownership claim will be sent.
- `2026-08-15` - Replacement candidate `neelvara-menulist-prod` passed the
  Google Cloud **New Project** form's project-ID validation with project name
  `MenuList Production`, organization `neelvara.com`, and parent resource
  `neelvara.com`. The form was cancelled before creation. Candidate approval
  was subsequently rejected by the owner because the ID was unnecessarily
  long; no project was created with that ID.
- `2026-08-15` - Historical Firebase project `menulist-ai` was rediscovered
  under legacy owner account `tech.ecomsai@gmail.com`. Its display name is
  `menulist`, but its immutable project ID is `menulist-ai`; it is not the
  inaccessible global project ID `menulist`. Runtime inspection confirmed an
  existing Web app, Analytics configuration, and historical Firestore data in
  default database location `nam5`. That location cannot satisfy MenuList's
  frozen `us-central1` production contract. Existing deployment guidance
  already classifies `menulist-ai` as retired legacy infrastructure. Do not
  delete it, reuse it for production, copy its credentials, or alter its data
  during production setup. Inventory/export and final retirement are separate
  controlled cleanup work after company ownership and retention requirements
  are established.
- `2026-08-15` - The owner requested a clean environment pair matching
  `menulist-qa` and rejected the company-prefixed candidate. Replacement
  candidate `menulist-prod` passed Google Cloud's New Project form validation
  with project name `MenuList Production`, organization `neelvara.com`, and
  parent `neelvara.com`. The form was cancelled before creation.
- `2026-08-15` - The owner approved exact production project ID
  `menulist-prod`. The repository contract was migrated before resource
  creation: product slug `menulist`, domains, and region stayed unchanged;
  runtime project selection, Firebase dotenv naming, guarded backfills,
  setup/deploy commands, and verifiers now use `menulist-prod`. No Google Cloud
  project, Firebase resource, secret, provider activation, deploy, DNS change,
  or production data was created by this migration.
- `2026-08-15` - `PROD-A07` migration verification passed:
  `verify:env-targets`, `verify:menulist-env-contract`, MenuList host and
  Functions URL routing tests, billing and founder-monitor boundary suites,
  tenant-block backfill safety, messaging onboarding monitor, SignalDesk
  project isolation, full `verify:agent-readiness`, Functions deploy preflight
  lint/build, root typecheck, root lint, documentation link validation, and
  `git diff --check`. Documentation link validation found zero broken links;
  its 62 existing video-artifact filename warnings are unrelated to this ID
  migration.
- `2026-08-15` - Google Cloud Console confirms project name
  `MenuList Production`, immutable project ID `menulist-prod`, project number
  `233910481388`, and organization `neelvara.com` while authenticated as
  `admin@neelvara.com`. The project is active and its billing panel is visible,
  but Phase B billing approval remains uncredited until reviewed under
  `PROD-B02`. A read-only `firebase projects:list` check still lists only
  `menulist-qa`, confirming Firebase has not yet been added to the new Cloud
  project. No Firebase product, app, production data, deploy, or DNS change was
  created by this step.
- `2026-08-15` - `PROD-A08` completed. Firebase was added to the existing
  Google Cloud project with Google Analytics kept disabled. Firebase Project
  Overview confirms **MenuList Production** on the Blaze plan, with no app or
  production data initialized. A company-account `firebase projects:list`
  check confirms active project ID `menulist-prod`, project number
  `233910481388`, display name `MenuList Production`, and Firebase enabled. The
  CLI also continues to list `menulist-qa` separately.
- `2026-08-15` - `PROD-B01` completed by read-only IAM inspection. Project
  **MenuList Production** is shown under organization `neelvara.com`.
  `admin@neelvara.com` has inherited **Organisation Administrator** and direct
  project-level **Owner**. The only other visible principal is Firebase's
  generated Admin SDK service account. No IAM policy was changed and no second
  human administrator was added; the previously recorded sole-maintainer
  deferral remains in force until another trusted maintainer exists.
- `2026-08-15` - `PROD-B02` completed by read-only billing inspection.
  `menulist-prod` is linked to the paid company billing account **Neelvara
  Cloud Billing - Temporary**, billing-account ID `0135AA-B5D4AD-C72CAB`, under
  organization `936910729624`. The billing URL and cost view are scoped to
  `project=menulist-prod`; Firebase independently shows the project on Blaze.
  No account was linked, unlinked, renamed, or replaced during this check.
- `2026-08-15` - `PROD-B03` completed. Alert-only budget **MenuList Production
  monthly alert** (budget ID `a40f2e56-d782-4445-8121-14231467f4f0`) is monthly,
  scoped only to project **MenuList Production**, and uses a specified INR 1,000
  amount with actual-spend email thresholds at 50%, 75%, and 100%. Spend-cap
  status is **Not applicable**, as required for this general project alert.
  Billing admins/users and the project Owner receive alerts; Pub/Sub and custom
  Monitoring channels remain disconnected. Review owner is
  `admin@neelvara.com`, recurring on the first day of each month, beginning
  `2026-09-01`.
- `2026-08-15` - `PROD-B04` completed from existing cross-console evidence.
  Firebase Project Overview shows **MenuList Production** on Blaze, and Google
  Cloud Billing confirms the paid company account attached to
  `menulist-prod`. No additional plan change or billing mutation was required.
- `2026-08-15` - `PROD-B05` completed. Firebase Console created an empty
  `(default)` Firestore database in Production mode. Read-only CLI verification
  confirms `projects/menulist-prod/databases/(default)`, location
  `us-central1`, type `FIRESTORE_NATIVE`, and edition `STANDARD`. No collection,
  document, application, index, or repository rules deploy was created. PITR
  and delete protection remain disabled and are intentionally deferred to the
  dedicated resilience check `PROD-B12`.
- `2026-08-15` - `PROD-B06` completed. Firebase Console created default bucket
  `menulist-prod.firebasestorage.app` as Regional Standard Storage in exact
  location `us-central1`, using Production mode's deny-all initial client
  rules. The Files view confirms the bucket is empty. Read-only
  `firebase projects:list --json` verification confirms active project
  `menulist-prod` has label `firebase/storage-default-bucket: created`. No
  file, folder, application, or repository Storage rules deploy was created.
- `2026-08-15` - `PROD-B07` completed. Firebase Authentication is initialized
  for exact project `menulist-prod`. The Sign-in method page confirms no
  provider is enabled, and the Users page is empty. An authenticated read-only
  `firebase auth:export` returned exactly zero users; its temporary local
  export was deleted immediately. No provider, production user, OAuth client,
  application, or Identity Platform upgrade was created.
- `2026-08-15` - `PROD-B08` completed. Firebase registered exactly one active
  Web app named **MenuList Production Web** under exact project
  `menulist-prod`. Read-only `firebase apps:list WEB --project menulist-prod
  --json` verification passed. The operator confirmed the generated public Web
  SDK configuration is vaulted as a configuration record under company owner
  `admin@neelvara.com`; no API key or SDK configuration was copied into this
  ledger or repository. No package install, application code change, deploy,
  production user, or sign-in provider was created.
- `2026-08-15` - `PROD-B09` completed. Firebase Authentication Authorized
  domains for exact project `menulist-prod` lists `app.menulist.ai` as the sole
  Custom domain. Firebase-managed defaults `localhost`,
  `menulist-prod.firebaseapp.com`, and `menulist-prod.web.app` remain intact.
  No apex, `www`, QA, tenant wildcard, or customer-link domain was admitted.
  This allowlist change did not enable a sign-in provider, deploy an app, or
  change DNS.
- `2026-08-15` - `PROD-B10` inventory checkpoint recorded. Google Cloud shows
  36 enabled baseline services for exact project `menulist-prod`, including
  Firebase management/rules/installations, Identity Toolkit, Firestore,
  Storage, Logging, Monitoring, Pub/Sub, Cloud Resource Manager, and Service
  Usage. The following repo-required runtime services are not visible and must
  be admitted individually before this check closes: Secret Manager, Cloud
  Functions, Cloud Run Admin, Cloud Build, Artifact Registry, Eventarc, Cloud
  Scheduler, Cloud Tasks, and Compute Engine. No service was enabled or
  disabled during inventory. Existing Firebase-provisioned baseline services
  will not be removed as part of production setup.
- `2026-08-15` - `PROD-B10` API checkpoint 1/9 completed. **Secret Manager
  API** (`secretmanager.googleapis.com`) is Enabled for exact project
  `menulist-prod`. No secret, credential, version, application, function, or
  deployment was created.
- `2026-08-15` - `PROD-B10` API checkpoint 2/9 completed. **Cloud Functions
  API** (`cloudfunctions.googleapis.com`) is Enabled for exact project
  `menulist-prod`. No credential, application, function, or deployment was
  created.
- `2026-08-15` - `PROD-B10` API checkpoint 3/9 completed. **Cloud Run Admin
  API** (`run.googleapis.com`) is Enabled for exact project `menulist-prod`.
  No credential, application, Cloud Run service, function, or deployment was
  created; the API metrics page showed no traffic for the selected time frame.
- `2026-08-15` - `PROD-B10` API checkpoint 4/9 completed. **Cloud Build API**
  (`cloudbuild.googleapis.com`) is Enabled for exact project `menulist-prod`.
  Cloud Build History showed no build results, and the API metrics page showed
  no traffic for the selected time frame. No build, trigger, repository,
  worker pool, credential, or deployment was created.
- `2026-08-15` - `PROD-B10` API checkpoint 5/9 completed. **Artifact Registry
  API** (`artifactregistry.googleapis.com`) is Enabled for exact project
  `menulist-prod`. No repository, artifact, container image, credential, build,
  or deployment was created.
- `2026-08-15` - `PROD-B10` API checkpoint 6/9 completed. **Eventarc API**
  (`eventarc.googleapis.com`) is Enabled for exact project `menulist-prod`.
  No Eventarc trigger, credential, function, or deployment was created; the API
  metrics page showed no traffic for the selected time frame.
- `2026-08-15` - `PROD-B10` API checkpoint 7/9 completed. **Cloud Scheduler
  API** (`cloudscheduler.googleapis.com`) is Enabled for exact project
  `menulist-prod`. No scheduler job, credential, function, or deployment was
  created; the API metrics page showed no traffic for the selected time frame.
- `2026-08-15` - `PROD-B10` API checkpoint 8/9 completed. **Cloud Tasks API**
  (`cloudtasks.googleapis.com`) is Enabled for exact project `menulist-prod`.
  No task queue, task, credential, function, or deployment was created; the API
  metrics page showed no traffic for the selected time frame.
- `2026-08-15` - `PROD-B10` API checkpoint 9/9 completed. **Compute Engine
  API** (`compute.googleapis.com`) is Enabled for exact project
  `menulist-prod`. No VM, disk, network, IP address, credential, build, or
  deployment was created; the API metrics page showed no traffic for the
  selected time frame. `PROD-B10` is complete: Secret Manager, Cloud Functions,
  Cloud Run Admin, Cloud Build, Artifact Registry, Eventarc, Cloud Scheduler,
  Cloud Tasks, and Compute Engine are all enabled for the production project.
- `2026-08-15` - `PROD-B11` source-contract preflight confirms the deployed
  Vercel server path currently initializes Firebase Admin from explicit
  `MENULIST_FIREBASE_CLIENT_EMAIL` and `MENULIST_FIREBASE_PRIVATE_KEY` values.
  Application Default Credentials remain a local-development fallback, and no
  validated production OIDC/Workload Identity path is implemented. Do not
  describe production as keyless. Before creating a static key, inspect and
  record the exact Firebase Admin SDK service account and effective key-creation
  policy; owner, creation date, rotation, and revocation evidence remain pending.
- `2026-08-15` - `PROD-B11` Firebase identity checkpoint recorded. Exact project
  `menulist-prod` exposes Firebase Admin SDK service account
  `firebase-adminsdk-fbsvc@menulist-prod.iam.gserviceaccount.com`; the project
  settings page lists 14 service accounts and displays **Generate new private
  key**. No key was generated or downloaded. The visible control does not prove
  that organization policy permits user-managed key creation, and the existing
  key inventory must be checked before any generation attempt.
- `2026-08-15` - `PROD-B11` key-inventory checkpoint recorded from Google Cloud
  IAM for exact project `menulist-prod`. The enabled Firebase Admin SDK service
  account `firebase-adminsdk-fbsvc@menulist-prod.iam.gserviceaccount.com` shows
  **No keys**. The App Engine default and default compute service accounts also
  show no keys. No service account, key, role, policy, or credential was created,
  changed, downloaded, or deleted. Inspect the effective managed key-creation
  constraint before deciding whether the established project-only exception
  workflow is required.
- `2026-08-15` - `PROD-B11` organization-policy checkpoint confirmed exact
  project **MenuList Production** inherits parent policy
  `iam.managed.disableServiceAccountKeyCreation`. Its effective status is
  **Enforced**; the create/update constraint denies Google-provided
  `USER_MANAGED` service-account keys. No policy, role, condition, or exception
  was changed.
- `2026-08-15` - Opening the `PROD-B11` policy-management path was denied because
  `admin@neelvara.com` lacks `orgpolicy.policies.create`,
  `orgpolicy.policies.delete`, and `orgpolicy.policies.update`. Google Cloud
  suggests organization-level `roles/orgpolicy.policyAdmin` on `neelvara.com`.
  No access was granted. Do not add that broad temporary elevation or create a
  project exception while the recommended keyless migration remains available.
- `2026-08-15` - `PROD-B11` keyless feasibility was re-evaluated against current
  official provider documentation and repository truth. Vercel now documents
  OIDC federation on all plans and a direct Google Cloud Workload Identity
  Federation flow using short-lived credentials. The current MenuList runtime
  does not implement that flow: its shared Firebase Admin singleton still
  selects an explicit certificate from server env values, the Vercel env
  validator requires the client email/private key pair, and `@vercel/oidc` is
  not a direct frozen dependency. Keyless production identity is feasible but
  requires a bounded source, dependency-freeze, env-contract, provider-IAM, and
  runtime-verification migration. Keep the inherited key-creation policy
  enforced and do not create a static production key. The owner decision and
  bounded migration result are recorded below.
- `2026-08-15` - The owner sent the exact approval phrase **Approve PROD-B11 keyless migration**. The bounded
  source contract now selects `vercel_oidc` for production Vercel, exchanges
  Vercel's request/build OIDC token through Google Security Token Service, and
  impersonates dedicated service account
  `menulist-vercel-prod@menulist-prod.iam.gserviceaccount.com` with short-lived
  credentials. The same federated client supplies Firebase Admin and Cloud
  Tasks. Firebase custom-token signing uses the configured service-account ID
  and therefore requires `iam.serviceAccounts.signBlob` on that exact account.
  Production env no longer declares a Firebase Admin client email/private key.
  No provider IAM resource, build, deployment, production token exchange, or
  production data access occurred.
- `2026-08-15` - The owner expanded the approved Vercel keyless contract to
  MenuList QA, MenuList production, Answerlattice QA, and Answerlattice
  production while retaining one shared Vercel project. The source now uses one
  shared OIDC/WIF implementation with product-specific wrappers, exact project
  validation, dedicated service-account identities, and fail-closed custom
  `qa`/Production environment checks. Both managed env templates reject static
  MenuList and Answerlattice Admin keys. The provider and runtime passes follow
  the four-target order above, with MenuList QA and production closing before
  the explicitly pending Answerlattice targets.
- `2026-08-15` - `QA-OIDC-01` read-only Vercel preflight completed for linked
  project `neelvara-systems/menulist-core`. At that checkpoint the team was on
  Hobby with zero Custom Environments and the live create dialog ended at
  **Upgrade to Pro**. Current Vercel pricing lists one Custom Environment
  included with Pro, which is sufficient for the single shared `qa`
  environment; no additional five-environment capacity is required. Team OIDC
  issuer mode is already selected with issuer
  `https://oidc.vercel.com/neelvara-systems` and audience
  `https://vercel.com/neelvara-systems`, so no OIDC save is required. No plan,
  billing, environment, OIDC, Google IAM, or deployment setting was changed.
  Generic Preview trust and a second Vercel project remain rejected by the
  approved architecture.
- `2026-08-15` - `QA-OIDC-02` completed after the owner activated Vercel Pro.
  The included Custom Environment is now `qa`, described as **Production-grade
  QA for the staging branch**, with Branch Tracking enabled only for exact
  branch `staging`. Live readback confirms no attached domain and no added or
  imported environment variables. No additional environment capacity, Vercel
  deployment, OIDC setting change, Google IAM change, or domain move occurred.
- `2026-08-16` - `menulist-qa` keyless provider setup and hosted exchange proof
  completed. A disposable Build Output API deployment targeted at custom
  environment `qa` proved that the hosted JWT contains exact subject
  `owner:neelvara-systems:project:menulist-core:environment:qa`, custom claim
  `environment=qa`, immutable team ID
  `team_pCphDvMJUPFjVfH8x1AXSmPz`, immutable project ID
  `prj_9DIdLQC5fWX0HtExaBFpg0xAJklz`, `VERCEL_ENV=preview`, and
  `VERCEL_TARGET_ENV=qa`. This directly resolves the earlier local
  `environment:development` ambiguity without relying on provider support.
  Security Token Service was enabled; pool `menulist-vercel`, provider
  `menulist-qa`, and keyless runtime service account
  `menulist-vercel-qa@menulist-qa.iam.gserviceaccount.com` were created. The
  provider leaves allowed audiences empty, maps the exact subject and immutable
  IDs, and requires the immutable IDs plus exact `qa` environment and subject.
  Runtime access is limited to project roles `roles/datastore.user` and
  `roles/firebaseauth.admin`, bucket-scoped `roles/storage.objectAdmin` on
  `menulist-qa.firebasestorage.app`, queue-scoped
  `roles/cloudtasks.enqueuer` on `batch-image-generation`, self-scoped
  `roles/iam.serviceAccountTokenCreator`, and exact-subject
  `roles/iam.workloadIdentityUser`. Hosted proof passed Vercel custom-audience
  exchange, Google STS exchange, service-account impersonation, and Firebase
  custom-token `signBlob`; the service account has zero user-managed keys. The
  disposable deployment, temporary files, and generated deployment-protection
  bypass were removed, leaving zero `qa` probe deployments and zero automation
  bypass secrets. Vercel custom environment `qa` now contains the five
  non-secret MenuList selectors: `MENULIST_FIREBASE_ADMIN_AUTH_MODE=vercel_oidc`,
  project number, service-account email, pool ID, and provider ID. No Preview
  variables were imported, no static key was removed, and no application
  deployment occurred.
- `2026-08-16` - The MenuList-only custom `qa` runtime baseline was migrated and
  verified. Of 38 explicit branch-specific Preview project variables, 36
  MenuList/shared values were copied. The former
  `MENULIST_FIREBASE_CLIENT_EMAIL` and `MENULIST_FIREBASE_PRIVATE_KEY` rows were
  excluded, as were Vercel system values and all sister-product variables.
  Custom `qa` now contains 41 project variables: 36 baseline values and five
  MenuList WIF selectors. Readback verified exact QA stage/domain/project/region,
  emulator-off, Cloud Tasks, and WIF values without printing secrets. No static
  Admin-key or Answerlattice variable is present. The former key pair remains
  only in the legacy branch-specific Preview configuration pending successful
  keyless QA runtime proof, after which it must be removed and revoked.
- `2026-08-16` - MenuList QA application/runtime proof passed on custom
  environment `qa`. Deployment `dpl_uSd8VderSJwFav1uW8nt5BV52nTb` from commit
  `aea6c9314cc5fa2447fc1d9e53176cd17ae0860f` is Ready. A stale copied Google
  OAuth client secret first caused `invalid_client`; after correction, stale
  Upstash credentials caused `/pipeline` HTTP 401 and `/api/auth/set-claims`
  HTTP 503. Correcting the QA Upstash pair produced repeated 200 responses for
  claim setting and session reads plus authenticated owner Firestore-backed
  route loads. At that checkpoint the apex, `www`, app `/api/version`, and a
  tenant subdomain all returned 200 through the application deployment. A disposable scoped probe
  passed exact custom-`qa` claims, Google STS, service-account impersonation,
  `signBlob`, Storage object create/read/delete, and Cloud Tasks task creation
  on `batch-image-generation`; its intentionally invalid payload did not call
  AI or mutate business data. The probe auto-promotion briefly pointed the QA
  aliases at a 404 probe deployment; all aliases were immediately restored to
  the application deployment and reverified. Both disposable deployments were
  deleted and the generated Vercel automation bypass was revoked.
- `2026-08-16` - The two legacy branch-specific Preview rows
  `MENULIST_FIREBASE_CLIENT_EMAIL` and
  `MENULIST_FIREBASE_PRIVATE_KEY` were removed. Public-key matching identifies
  the exact former Google key as
  `79ef5b9d27319c55c674fed85655e0b681443ec2` on
  `firebase-adminsdk-fbsvc@menulist-qa.iam.gserviceaccount.com`. After company
  operator reauthentication, IAM pre-delete readback returned exactly that one
  enabled user-managed key. The delete request targeted only its exact resource;
  post-propagation IAM readback reports zero remaining user-managed keys. The
  MenuList QA identity migration is complete. Do not reopen Vercel static
  credentials. Answerlattice QA and production remain pending until the
  MenuList production pass closes.
- `2026-08-16` - The dedicated `menulist-prod` keyless provider preparation
  completed without a production deployment. Security Token Service is
  enabled; pool `menulist-vercel`, provider `menulist-prod`, and runtime service
  account `menulist-vercel-prod@menulist-prod.iam.gserviceaccount.com` are
  active. The provider maps the same four proven Vercel claims as QA and admits
  only immutable team ID `team_pCphDvMJUPFjVfH8x1AXSmPz`, immutable project ID
  `prj_9DIdLQC5fWX0HtExaBFpg0xAJklz`, exact environment `production`, and exact
  subject `owner:neelvara-systems:project:menulist-core:environment:production`.
  Project-scoped `roles/datastore.user` and `roles/firebaseauth.admin`,
  bucket-scoped `roles/storage.objectAdmin`, self-scoped
  `roles/iam.serviceAccountTokenCreator`, and exact-subject
  `roles/iam.workloadIdentityUser` are applied. IAM readback reports zero
  user-managed keys. Vercel
  Production contains the five exact encrypted WIF selectors with deterministic
  readback and contains neither legacy MenuList Admin credential variable.
  `PROD-B11` remains open until a release-approved hosted Production deployment
  proves the OIDC assertion, STS exchange, impersonation, Firebase Auth custom
  token signing, Firestore, Storage, and the eventual queue-scoped Cloud Tasks
  operation. No production alias, DNS, application secret, runtime traffic, or
  business data was changed.
- `2026-08-16` - The production Cloud Tasks prerequisite for `PROD-B11` was
  completed without creating or running a task. Queue
  `projects/menulist-prod/locations/us-central1/queues/batch-image-generation`
  is `RUNNING` with the proven QA-parity limits: 4 maximum dispatches per
  second, 8 concurrent dispatches, 5 maximum attempts, 5-second minimum
  backoff, and 300-second maximum backoff. It contains zero tasks. Exact queue
  IAM readback contains only `roles/cloudtasks.enqueuer` for
  `serviceAccount:menulist-vercel-prod@menulist-prod.iam.gserviceaccount.com`.
  A separate project-policy query returned no project-level
  `roles/cloudtasks.enqueuer` match for that principal. This closes the queue
  resource and least-privilege IAM prerequisite only; `PROD-B11` remains open
  until the first release-approved Production deployment proves the hosted
  OIDC exchange and the complete Firebase/Storage/Cloud Tasks runtime path.
- `2026-08-16` - The latest `staging` push was verified on the exact Vercel
  custom-`qa` deployment `dpl_395c2D5ZJfybiDgLrPrjVv5GBkZK`. Deployment URL,
  `app.menulist.digital`, and `menulist.digital` all return build commit
  `0ad6bc7ba0950f0d69375c9eef2df5ef8fbdfb0f`; the deployment is `Ready`, and
  its runtime-log inventory reports zero warnings, errors, or fatals. This is
  QA deployment evidence only: `/api/version` truthfully reports build
  environment `preview`. Vercel has no current Production deployment. Its sole
  Production record is the failed August 11 build from obsolete commit
  `159005a3a0032cc24ba2d789b6f5cf8a18a7736e`. Repository default branch `main`
  is currently `2efe5cf8200c39d7d3d1b7b5f2658c9a3b434151`, while `staging` and local
  `HEAD` are the verified `0ad6bc7` commit. Do not promote the QA artifact or
  treat it as Production OIDC evidence. A true Production rebuild remains
  gated by completed staging certification and explicit `PROD-F05` Vercel
  deploy approval.
- `2026-08-16` - The current source/configuration recheck passed the Vercel
  workload-identity contract, Functions deploy preflight (including Functions
  lint and TypeScript compilation), configuration safety, all 42 MenuList
  Firestore-rules emulator scripts, root TypeScript, root ESLint, verifier
  syntax, and diff whitespace checks. Vercel metadata-only readback confirms
  both custom `qa` and Production contain the scoped
  `MENULIST_UPSTASH_REDIS_REST_URL` and
  `MENULIST_UPSTASH_REDIS_REST_TOKEN` variables; values were not exported.
  The local Upstash runtime probe remains intentionally unavailable because
  managed provider secrets are not copied into the operator shell. The six
  stale MenuList AssetOS records were reviewed on August 16: five visuals still
  matched their changed source boundaries, and the Business Health proof was
  refreshed and founder-approved with Weekly Menu Review kept separate from
  the location-level current check. All MenuList asset fingerprints are now
  current. Eight Answerlattice AssetOS records remain deliberately pending
  under the product rollout sequence. The wider production-readiness aggregate
  is still not green because those deferred Answerlattice records and the
  data-flow collection inventory require explicit review. Do not rewrite either
  evidence set or infer approval merely to make the aggregate pass. These are
  release-certification gates, not missing production OIDC, Cloud Tasks, or
  managed-secret configuration.

## `PROD-B11` Keyless Runtime Decision

### Existing static-key path

The former production design copied a service-account `client_email` and
long-lived private key into Vercel environment variables. Every server instance
used the same persistent credential until an operator rotated or revoked it.
Creating that key would require weakening the inherited organization policy or
obtaining a project exception, and any leaked copy would remain usable until
manual revocation.

### Approved Vercel keyless path

1. Vercel issues a signed OIDC token containing the owning team, project, and
   environment identity.
2. Google Workload Identity Federation accepts only the exact approved
   production subject and audience.
3. Google Security Token Service exchanges the Vercel assertion for a temporary
   federated token.
4. IAM Service Account Credentials lets that principal impersonate the
   dedicated MenuList Vercel service account and returns a short-lived Google
   access token.
5. Firebase Admin and Cloud Tasks use that access token. The source never stores
   or logs the Vercel assertion or a Google private key.

The provider must use Vercel's recommended team issuer, map
`google.subject=assertion.sub`, and restrict access to the exact production
subject instead of granting all identities in the pool. Enable IAM, Security
Token Service, and IAM Service Account Credentials APIs. The dedicated runtime
service account receives only the project/resource roles required by the
current Vercel server contract, the exact federated subject receives
`roles/iam.workloadIdentityUser` on that service account, and custom-token
signing requires `roles/iam.serviceAccountTokenCreator` on that service account
for the runtime identity. Do not grant organization-policy administration and
do not disable `iam.managed.disableServiceAccountKeyCreation`.

### Why Firebase Functions are different

Firebase Functions execute inside Google Cloud. Their deployed runtime service
account is attached by Google and exposed through Application Default
Credentials, so Functions already receive short-lived Google-managed
credentials without Vercel OIDC, a Workload Identity Pool, or a downloaded key.
This migration changes only the external Vercel-hosted Next.js server runtime.
Functions service-account permissions still require least-privilege review,
but no Functions package, secret, env key, or deployment changes under
`PROD-B11`.

## Phase A - Production Identity And Project-ID Preflight

- [x] `PROD-A01` Confirm the original source contract before replacement:
  production Firebase project ID was `menulist`, region was `us-central1`, and
  production hosts were the approved `menulist.ai`/`menulist.online` set.
- [x] `PROD-A02` Confirm Firebase Console under `admin@neelvara.com` lists only
  `menulist-qa`; production is not initialized.
- [x] `PROD-A03` Test exact project ID `menulist` in the Firebase create wizard
  without submitting creation; result is `taken or unavailable`.
- [x] `PROD-A04` Check Firebase's eligible Google Cloud project list; no
  accessible `menulist` project is present.
- [x] `PROD-A05` Re-authenticate in Google Cloud and determine whether project
  ID `menulist` belongs to a recoverable Neelvara/founder-controlled project,
  is pending deletion, or is unrelated/unrecoverable. Do not create a new
  project during this check. Result: permission denied; no ownership or
  recovery contact was exposed.
- [x] `PROD-A06` Decide recoverability from known ownership history. If a
  founder/company-controlled Google account previously created exact project
  ID `menulist`, use that account to restore `admin@neelvara.com` company owner
  access, move/confirm the project under `neelvara.com`, and inspect its
  lifecycle, billing, and region history. If no controlled account ever owned
  it, record the ID as unrelated/unrecoverable and continue to `PROD-A07`.
  Result: no controlled account ever owned the ID; it is unrelated or
  permanently unavailable.
- [x] `PROD-A07` If `menulist` is proven unrecoverable or unrelated, approve one
  intentional replacement project ID and update every source, verifier, env
  example, Firebase alias, and deployment document before creating it. Never
  accept Firebase's generated suffix silently. Result: exact ID
  `menulist-prod` approved and the repository contract migrated without
  creating provider resources.
- [x] `PROD-A08` Create Google Cloud project `MenuList Production` with exact ID
  `menulist-prod` under organization `neelvara.com`, add Firebase to that
  existing project, then confirm it is visible in Firebase Console and
  `firebase projects:list` under the company deployment account. Result:
  project created under the approved organization, Firebase registered without
  Analytics or application data, and company-account CLI visibility passed.

### Exact next action for `PROD-B11`

1. Do not choose **Grant access**. Close the additional-access panel while
   leaving the inherited organization policy unchanged.
2. Confirm the Vercel team plan exposes Custom Environments. Create or inspect
   custom environment `qa`, attach it only to branch `staging`, and stop if the
   feature is unavailable. Do not substitute generic Preview trust.
3. Open the linked Vercel project `menulist-core` -> **Settings** -> **Security**
   -> **Secure Backend Access with OIDC Federation**. Select the recommended
   **Team** issuer mode, save it, and stop.
4. Record the visible team slug plus confirm project ID
   `prj_9DIdLQC5fWX0HtExaBFpg0xAJklz` and team ID
   `team_pCphDvMJUPFjVfH8x1AXSmPz`. Do not add Vercel Production env values or
   trigger a deployment yet.
5. `menulist-qa` pool/provider/service-account binding, scoped hosted token
   exchange, custom-`qa` value inventory, successful application deployment,
   canonical-domain cutover, auth/Firestore runtime, Storage object lifecycle,
   and queue-scoped Cloud Tasks creation are complete. The two former static
   Vercel rows are removed, and exact key
   `79ef5b9d27319c55c674fed85655e0b681443ec2` is deleted from
   `firebase-adminsdk-fbsvc@menulist-qa.iam.gserviceaccount.com`; IAM readback
   confirms zero user-managed keys remain. MenuList QA is closed.
6. The dedicated `menulist-prod` pool, provider, service account, current
   least-privilege IAM, zero-key readback, five Vercel Production selectors,
   production Cloud Tasks queue, and queue-scoped enqueuer binding are
   prepared. Do not create a separate probe deployment. At the first
   release-approved hosted Production deployment, run the full OIDC/runtime
   proof, including a bounded queue operation, before checking `PROD-B11`.
   Answerlattice QA and production remain explicitly pending until the MenuList
   production pass closes.

## Phase B - Firebase And Google Cloud Foundation

Start only after Phase A establishes the approved production project ID.

- [x] `PROD-B01` Confirm project parent is the `neelvara.com` organization and
  company administrators own recovery and IAM. Result: organization parent
  confirmed; `admin@neelvara.com` is inherited Organisation Administrator and
  direct project Owner, with no unapproved human principal visible.
- [x] `PROD-B02` Attach the approved company Cloud Billing account. Result:
  `menulist-prod` is linked to paid account **Neelvara Cloud Billing -
  Temporary** (`0135AA-B5D4AD-C72CAB`); no linkage change was required.
- [x] `PROD-B03` Create project-scoped budget alerts and record an owner and
  monthly review date; do not describe alert-only budgets as hard caps. Result:
  INR 1,000 monthly alert-only budget saved for `menulist-prod`, with
  50%/75%/100% actual thresholds and first-of-month owner review.
- [x] `PROD-B04` Upgrade Firebase billing only as required for Storage,
  Functions, Secret Manager, Cloud Tasks, and production provider use. Result:
  Firebase is on Blaze through the approved linked company billing account.
- [x] `PROD-B05` Create Firestore in Native mode at exact location
  `us-central1`; stop before creation if the console proposes another location.
  Result: empty Standard `(default)` Native database created in
  `us-central1` with deny-all initial client rules and CLI read-back passed.
- [x] `PROD-B06` Create Cloud Storage for Firebase at exact location
  `us-central1`; do not seed files. Result: empty Regional Standard bucket
  `menulist-prod.firebasestorage.app` created in `us-central1` with deny-all
  initial client rules; CLI project-label read-back passed.
- [x] `PROD-B07` Enable Firebase Authentication without creating production
  users. Result: Authentication initialized with no enabled provider and zero
  users; authenticated read-only export passed.
- [x] `PROD-B08` Register the MenuList production Web app and vault its public
  Web configuration as a configuration record, not a secret. Result: one
  active app named **MenuList Production Web** exists and its generated public
  SDK configuration is vaulted under company ownership.
- [x] `PROD-B09` Add only the approved Firebase Auth domain
  `app.menulist.ai`; keep staging domains in `menulist-qa`. Result:
  `app.menulist.ai` is the sole Custom domain; only Firebase-managed defaults
  remain alongside it.
- [x] `PROD-B10` Enable only APIs required by the current repository contract,
  including Secret Manager and the APIs required by the approved Functions and
  Cloud Tasks targets. Result: all nine required APIs are enabled; no runtime
  resource, credential, build, or deployment was created.
- [ ] `PROD-B11` Record the Vercel-to-Google server identity decision: validated
  OIDC/Workload Identity, or a static Admin key with owner, creation date,
  rotation, and revocation procedure.
- [x] `PROD-B12` Enable the approved Firestore backup/PITR policy and document a
  restore drill before accepting production data. Result: authenticated Admin
  API readback on August 16 confirms `POINT_IN_TIME_RECOVERY_ENABLED`, seven-day
  version retention, Native mode, and exact location `us-central1`. The restore
  drill below is frozen before any production data is admitted.
- [x] `PROD-B13` Register production App Check resources in monitoring mode
  only; enforcement remains release-gated. Result: the exposed reCAPTCHA v3
  credential was deleted and replaced under company-owned project
  `menulist-prod`; the replacement private secret is registered only with
  Firebase App Check for **MenuList Production Web**; the matching public site
  key exists exactly once as `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, scoped only to
  Vercel Production. Firebase shows the app as **Registered** and the APIs view
  remains **Unenforced**. No Vercel or Firebase deployment was triggered.

### `PROD-B13` Monitoring And Enforcement Boundary

- Registration evidence date: August 16, 2026.
- Provider: reCAPTCHA v3, matching the current `ReCaptchaV3Provider` source
  contract. Moving to reCAPTCHA Enterprise is a separate architecture change,
  not part of this setup checkpoint.
- Allowed production domain families are `menulist.ai` and `menulist.online`;
  QA domains and Vercel preview wildcards are not part of this production key.
- The private reCAPTCHA secret must remain only in Firebase App Check. The
  client-visible site key must remain only in the matching Vercel Production
  variable or other approved public configuration stores.
- Environment-variable changes apply only to a future deployment. Do not
  deploy merely to close this setup item.
- Keep Firestore, Storage, Authentication, and every other displayed API
  unenforced until a release-approved production deployment emits verified
  traffic and the metrics window proves legitimate requests are accepted.
- Authentication enforcement remains excluded because the current auth stack
  requires a separate compatibility review.

### `PROD-B12` Restore Drill

Use this drill only with explicit incident/recovery approval. PITR restores to a
new database; it does not overwrite `(default)` in place.

1. Record the incident owner, source database
   `projects/menulist-prod/databases/(default)`, selected recovery timestamp,
   and the exact earliest-version readback.
2. Create a temporary recovery database in `us-central1` from that timestamp.
   Never select another region and never point production runtime variables at
   the recovery database during validation.
3. Compare bounded document counts and sampled tenant/store identities against
   the incident record. Do not export secrets or customer payloads into chat or
   documentation.
4. Record pass/fail evidence, then delete the temporary recovery database only
   after the incident owner approves cleanup. A failed restore blocks production
   data admission or continuation.
5. Re-read `(default)` and confirm its PITR state remains enabled. Repeat the
   drill after material Firestore topology or retention changes.

## Phase C - Authentication And Google-Owned Provider Setup

- [x] `PROD-C01` Configure the production Google OAuth consent/branding under
  company ownership using truthful current business details. Use app name
  `MenuList`, homepage `https://menulist.ai`, privacy policy
  `https://menulist.ai/privacy-policy`, Terms of Service
  `https://menulist.ai/terms-of-service`, and authorized domain
  `menulist.ai`. Select the monitored `support@neelvara.com` Google Group as
  the user support email and `admin@neelvara.com` as the developer contact.
  The support identity is a Group owned by the company administrator because
  Google Auth Platform exposes managed Groups, not ordinary user aliases, in
  this selector. Move to `support@menulist.ai` only after `menulist.ai` is
  deliberately added to Google Workspace and that product-facing Group is
  proven eligible. Do not add QA, Vercel preview, tenant, Answerlattice, or
  unrelated sister-product domains. Saving or publishing branding does not
  authorize production deployment or OAuth client creation.
  - `2026-08-16` - Workspace readback confirmed the existing
    `billing@neelvara.com`, `security@neelvara.com`, and
    `dmarc@neelvara.com` aliases. `hello@neelvara.com`,
    `legal@neelvara.com`, and `privacy@neelvara.com` were added to the same
    licensed `admin@neelvara.com` mailbox. The `support@neelvara.com` Google
    Group was created with that administrator as owner, external posting
    enabled, conversation/member visibility restricted to group roles, and
    membership restricted to invited users. Google Auth Platform then exposed
    the Group in the production support-email selector. `contactus@` and
    `help@` were not created because they duplicate the canonical hello/support
    contact contract.
- [x] `PROD-C02` Create a dedicated production OAuth Web client; do not reuse
  QA credentials.
- [x] `PROD-C03` Add exact production JavaScript origins for
  `https://app.menulist.ai` only where the client requires them.
- [x] `PROD-C04` Add exact production callback URI
  `https://app.menulist.ai/api/auth/callback/google`.
- [x] `PROD-C05` Vault the production OAuth client ID/secret and record owner,
  creation date, and rotation/revocation procedure.
- [x] `PROD-C06` Create a distinct production `NEXTAUTH_SECRET`; never copy the
  QA value.
  - `2026-08-16` - Google Auth Platform created one enabled Web application
    client named **MenuList Production Web**. Its only JavaScript origin is
    `https://app.menulist.ai` and its only callback is
    `https://app.menulist.ai/api/auth/callback/google`. The client ID and
    private client secret were transferred without printing them into
    Vercel-managed sensitive variables scoped only to Production. A fresh
    production-only `NEXTAUTH_SECRET` and
    `NEXTAUTH_URL=https://app.menulist.ai` were stored in the same scope. The
    credential owner is `admin@neelvara.com`; rotate or revoke the client in
    Google Auth Platform, replace the two Vercel OAuth variables, and create a
    fresh deployment only through the release-approved Vercel path. No
    deployment was triggered by this configuration work.
- [x] `PROD-C07` Import existing project `menulist-prod` into Google AI Studio
  under company billing account `0135AA-B5D4AD-C72CAB`, confirm it inherits the
  shared positive Prepay balance without another purchase, and configure its
  project-specific Gemini monthly spend cap.
  - `2026-08-16` - The owner approved
    `gemini-credential-billing-strategy.md` as the canonical long-term
    four-project contract. Read-only AI Studio verification shows the company
    billing account at Paid Tier 1 with INR 998.59 remaining from the single
    INR 1,000 August 13 Prepay purchase, INR 1.19 recorded usage, auto-reload
    Off. `menulist-prod` was imported into that same account and its Gemini API
    monthly spend cap is INR 750; QA remains capped at INR 250. API keys have no
    separate payment requirement and no new credit purchase was made.
- [x] `PROD-C08` Create exactly two `menulist-prod` credentials restricted to
  the Gemini API: **MenuList Production primary** and **MenuList Production
  menu extraction**. Store the primary as Vercel Production
  `MENULIST_GEMINI_AI_KEY` and Firebase `GEMINI_AI_KEY`; store extraction only
  as Firebase `MENULIST_GEMINI_TEXT_AI_KEY`. Rotate both in place; do not create
  permanent numbered fallback slots.
  - `2026-08-16` - Google Cloud now requires new Gemini credentials to be
    service-account-bound authorization keys. Created no-private-key identities
    `menulist-gemini-primary@menulist-prod.iam.gserviceaccount.com` and
    `menulist-gemini-extract@menulist-prod.iam.gserviceaccount.com`, with no
    unrelated project roles, and bound one Gemini-only key to each. A first
    primary credential rendered into operator automation output and was
    deleted before storage or use; only its replacement is active. The
    replacement primary is stored as sensitive Vercel Production
    `MENULIST_GEMINI_AI_KEY` plus Firebase `GEMINI_AI_KEY@1`; extraction is
    stored only as Firebase `MENULIST_GEMINI_TEXT_AI_KEY@1`. Metadata confirms
    both Firebase versions are enabled and the Vercel row is Production-only.
    No key value was read back, and no deployment or provider call occurred.

## Phase D - External Production Providers

These resources may be prepared inactive after Phase A. Do not enable live
traffic.

Execution-order note: the owner deferred remaining hosted QA feature/provider
certification until both MenuList environments are configured. Continue the
inactive production provider and environment setup in this phase and Phase E.
That decision does not authorize Phase F deployment, DNS cutover, OAuth
publishing, App Check enforcement, provider callbacks, paid calls, or live
traffic.

- [x] `PROD-D01` Create a dedicated production Upstash Redis database and
  confirm it does not share the QA REST URL or token.
  - `2026-08-16` - The owner created the company team `Neelvara Systems`, added
    team billing, moved `menulist-qa-rate-limit` into that team, and created the
    isolated `menulist-prod-rate-limit` database on GCP `US-CENTRAL1`. Production
    uses Pay as You Go with Upstash's minimum USD 20 hard budget cap, TLS is
    enabled, and the optional USD 200/month Prod Pack is not active. The provider
    issued a distinct hidden endpoint/token pair for the production database;
    neither value was recorded in this ledger. Credential transfer remains
    separately open under `PROD-D02`.
- [x] `PROD-D02` Vault the production Upstash REST URL/token and record region,
  owner, and rotation/revocation procedure.
  - `2026-08-16` - Stored the hidden production pair as sensitive,
    Production-only Vercel rows `MENULIST_UPSTASH_REDIS_REST_URL` and
    `MENULIST_UPSTASH_REDIS_REST_TOKEN`. Created enabled version `1` in exact
    Firebase project `menulist-prod` under the Functions runtime names
    `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Metadata readback
    confirmed both version states without reading their values. The provider
    owner is the company `Neelvara Systems` Upstash team and the database region
    is GCP `US-CENTRAL1`. For rotation or suspected exposure, reset the database
    password in Upstash, which revokes both Standard and Read Only REST tokens;
    immediately replace both Vercel Production values and add new Secret Manager
    versions, verify metadata, then disable superseded Firebase versions after
    the replacement runtime is certified. Never place the Standard token in a
    public variable or documentation.
- [x] `PROD-D03` Configure MenuList's Sentry production environment/project and
  vault the production DSN without sending a production test event yet.
  - `2026-08-16` - Created a separate Next.js project named `menulist-prod` in
    the existing company-owned, MFA-protected `Neelvara Systems` Sentry
    organization. The existing `menulist-qa` project remains separate. The
    default production DSN was copied without displaying it and stored only as
    sensitive Vercel Production `NEXT_PUBLIC_SENTRY_DSN` plus Firebase
    `menulist-prod` Secret Manager `SENTRY_DSN@1`; metadata readback reports the
    Firebase version Enabled and the Vercel row Production-only. High-priority
    issue email alerting remains selected. No sample error, source-map auth
    token, paid upgrade, Firebase deployment, Vercel deployment, or production
    event was created.
- [x] `PROD-D04` Configure an approved production transactional sender or
  controlled Workspace relay; never use a personal inbox password.
  - `2026-08-16` - Unparked and prepared under the frozen EmailOS contract.
    The MFA-protected Resend team is named `MenuList`; `menulist.ai` is verified
    in the Tokyo sending region with DKIM and isolated `send.menulist.ai`
    SPF/MX Return-Path records. Google Workspace apex MX records were not
    changed and Resend inbound mail was not enabled. Distinct sending-only keys
    restricted to `menulist.ai` exist for QA and production. Distinct signed
    webhooks listen only for the nine code-admitted delivery/suppression event
    types. Production version-1 `MENULIST_RESEND_API_KEY` and
    `MENULIST_RESEND_WEBHOOK_SECRET` values are enabled in `menulist-prod`;
    values were transferred without entering chat or the repository. The
    canonical sender remains `MenuList <system@menulist.ai>` with
    `support@neelvara.com` reply-to. No SMTP credential, provider send,
    deployment, webhook event, or test email was created.
- [ ] `PROD-D05` Complete truthful Razorpay merchant Live Mode activation/KYC
  when available; staging remains Test Mode.
  - `2026-08-16` - Read-only dashboard verification under the company account
    shows Test Mode selected and **Complete your onboarding to accept
    payments** / **KYC verification is needed to collect live payments**.
    This remains an owner-controlled legal and financial submission. No KYC
    field was entered, no document was uploaded, and Live Mode was not
    activated.
  - `2026-08-16` - Deliberately parked by the owner because a truthful Neelvara
    legal/KYC document set is not yet available. No personal-document fallback,
    unregistered-company claim, placeholder detail, or provider submission was
    made. Resume only after the legal merchant identity and supporting
    documents are settled; `PROD-D06` and `PROD-D07` remain blocked.
  - `2026-08-16` - Approved temporary pre-live exception: reuse the existing
    company Razorpay Test Mode merchant account and API pair for the production
    candidate instead of creating another app/account or using personal legal
    claims. This exception permits test credentials only; it does not complete
    KYC, enable Live Mode, authorize a real payment, or close this row.
- [ ] `PROD-D06` Generate and vault dedicated Razorpay Live API credentials;
  do not place them in Preview or Firebase QA.
  - Blocked behind `PROD-D05`; no Live credential was created or stored.
    Pending that replacement, the verified existing `rzp_test_` API pair is
    stored in `menulist-prod` Secret Manager as enabled version 1 of
    `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, and in Vercel Production as
    `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID` plus sensitive
    `MENULIST_RAZORPAY_KEY_SECRET`. The same working pair was re-applied to the
    custom `qa` and legacy `Preview (staging)` Vercel scopes. Vercel exports
    managed sensitive values as opaque envelopes, so they were not treated as
    plaintext readback evidence. A read-only provider request using the
    production Secret Manager copy returned HTTP 200. Values were never printed
    or committed. Replace every temporary Test Mode binding in one controlled
    cutover after KYC; never promote the test pair to launch credentials.
- [ ] `PROD-D07` Generate a distinct production Razorpay webhook secret and
  record the intended endpoint `https://app.menulist.ai/api/razorpay/webhook`;
  do not activate the Live webhook yet.
  - Blocked behind `PROD-D05`; no Live webhook, signing secret, callback, or
    delivery was created. The QA webhook secret was deliberately not copied:
    webhook secrets and callback endpoints remain environment-specific even
    during the temporary Test Mode API-key reuse period.
- [x] `PROD-D08` Freeze the production Razorpay webhook subscription to these
  13 route-handled events before activation: `order.paid`, `payment.failed`,
  `refund.processed`, `subscription.paused`, `subscription.resumed`,
  `subscription.authenticated`, `subscription.activated`,
  `subscription.pending`, `subscription.halted`, `subscription.charged`,
  `subscription.cancelled`, `subscription.completed`, and
  `subscription.updated`.
  - `2026-08-16` - This matches the verified QA provider contract and the
    current subscription lifecycle source. Razorpay documents
    `refund.processed` as the definitive final refund status event. The route
    also accepts `payment.refunded` defensively for historical payload
    compatibility, but Production must not subscribe to it in addition to
    `refund.processed`, which would create duplicate refund-event risk. No Live
    webhook was created or activated.
- [ ] `PROD-D09` Confirm Meta Business, app, and WhatsApp production ownership,
  recovery, and truthful verification status.
  - `2026-08-16` - Read-only Meta Business verification found no production
    asset set to certify. Business portfolio `MenuList Dev` is Unverified, has
    no primary Page, legal name, address, phone, or website, and does not
    require portfolio-level 2FA. Its sole full-control human is the founder
    under legacy address `admin@menulist.online`. The only attached app is
    **MenuList QA Messaging** and the only WhatsApp asset is Meta's **Test
    WhatsApp Business Account**; the QA runtime system user also has app
    access. These QA/test assets must not be relabelled as production evidence.
    No portfolio setting, person, app, WhatsApp account, or verification field
    was changed.
  - `2026-08-16` - The owner deliberately parked production WhatsApp until
    truthful legal/business documents are ready. A briefly prepared Meta app
    creation form was cancelled before submission; no production-candidate app
    or provider asset was created. Do not use the founder's personal profile to
    create a temporary production boundary, relabel or reuse QA assets, create
    production secrets, register a callback, enable processing, or send. Resume
    only with the final truthful business-owned portfolio, verification and
    recovery evidence, portfolio-level 2FA, production WABA/number, least-
    privilege system user, and independently generated credentials.
- [ ] `PROD-D10` Prepare dedicated production WhatsApp credentials and verify
  token ownership without registering the production callback or sending.
  - Blocked behind `PROD-D09`; no production Meta app, WhatsApp Business
    Account, system user, token, verify token, callback, or message was created.
- [x] `PROD-D11` Confirm production Google Maps/Places key restrictions match
  the exact production hosts and required APIs.
  - `2026-08-16` - Enabled only **Maps Embed API** in exact project
    `menulist-prod` and created dedicated key **MenuList Production Maps
    Embed**. Metadata readback confirms one API restriction, Maps Embed API,
    plus HTTP-referrer restrictions for exactly `https://menulist.ai/*`,
    `https://www.menulist.ai/*`, `https://app.menulist.ai/*`, and
    `https://*.menulist.online/*`. The key is stored only as Vercel Production
    `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`; it is intentionally browser-visible
    and protected by provider restrictions. Source now uses
    `strict-origin-when-cross-origin` so Google receives the admitted origin.
    Places API was not enabled because current source does not call it. QA has
    a separate Maps Embed-only key and QA-only host restrictions. No map
    request or Vercel deployment was triggered.
- [x] `PROD-D12` Record the production analytics decision and create a distinct
  GA4 property/stream only if analytics is approved.
  - `2026-08-16` - Intentionally omitted for initial production. MenuList-owned
    product analytics remains on the existing first-party aggregate/read-model
    path. Public website analytics remains consent-gated, with Plausible as the
    preferred future website vendor; GA4 is reserved for a separately approved
    paid-ad or conversion-continuity need. No GA4 property, web stream,
    measurement ID, Data API service account, credential, Firebase Analytics
    link, Vercel variable, tracking request, or deployment was created. Do not
    populate `NEXT_PUBLIC_GA_MEASUREMENT_ID` or `GA_*` placeholders merely to
    satisfy the environment inventory.
- [x] `PROD-D13` Record whether Telegram and uptime monitoring are enabled or
  intentionally omitted; do not create unowned alert channels.
  - `2026-08-16` - Intentionally omitted from initial production provider
    preparation. The company-owned `menulist-prod` Sentry project is the active
    error-monitoring destination. Telegram delivery remains fail-closed with no
    bot token/chat ID, and no UptimeRobot account, contact, or monitor was
    created before a real production deployment exists. Reconsider an external
    uptime monitor only after release approval, using exact production URLs and
    a named company-owned notification recipient. Do not create placeholder
    Telegram secrets or point a monitor at QA/staging aliases.
- [ ] `PROD-D14` Confirm every production provider account has company-owned
  recovery, MFA, and a named monthly/quarterly review owner.
  - Blocked. Google Workspace/Cloud, Vercel, GitHub, GoDaddy, Sentry, and the
    current company vault have recorded ownership/recovery evidence. On
    `2026-08-16`, provider readback confirmed the personal
    `admin@neelvara.com` Upstash account has MFA enabled, the company
    `Neelvara Systems` team requires MFA for every member, and transactional
    usage-limit/team-invitation alerts are enabled. Upstash recovery material
    was already recorded in the controlled company vault under `QA-A11`; the
    current sole maintainer at `admin@neelvara.com` is the named monthly review
    owner. This closes the Upstash portion only. The production provider
    inventory remains incomplete: Razorpay Live is behind KYC and production
    WhatsApp is deliberately parked until Meta has a business-owned verified
    asset set and portfolio-level 2FA. Do not mark this control complete until those
    providers exist and their recovery, MFA, and review-owner evidence is
    recorded without exposing recovery data.

## Phase E - Inactive Secrets And Environment Wiring

No deploy is authorized by this phase.

- [x] `PROD-E01` Use `.env.production.example` as the portfolio key inventory
  and select only MenuList/generic rows for this MenuList Production pass.
  - `2026-08-16` - Corrected the former destructive wording for the approved
    shared Vercel project: do not delete a valid sibling-product Production row
    merely because MenuList is being configured. Instead, add no Answerlattice,
    CampaignCue, or SignalDesk placeholder during this pass and leave those
    product setups pending. Metadata-only Vercel review showed the currently
    configured Production rows used by this pass are MenuList-prefixed or
    approved shared keys. No value was revealed. The canonical template now
    keeps parked SMTP, intentionally omitted GA4/Clarity, and intentionally
    omitted Telegram entries blank rather than advertising Gmail or literal
    provider placeholders. Actual managed environments must never receive a
    literal `<...>` value.
- [x] `PROD-E02` Set exact production URL/domain values for `menulist.ai`,
  `app.menulist.ai`, and `menulist.online` in Vercel Production only.
  - `2026-08-16` - Added `NEXT_PUBLIC_ENV=production`,
    `NEXT_PUBLIC_VERCEL_ENV=production`, `NEXT_PUBLIC_APP_URL` and
    `NEXT_PUBLIC_DEPLOYMENT_URL` as `https://menulist.ai`, exact platform domain
    plus apex/`www`/`app` aliases, and tenant base `menulist.online` to Vercel
    Production. Metadata readback confirms all seven rows are Production-only,
    with no Preview or custom `qa` scope. Existing production
    `NEXTAUTH_URL=https://app.menulist.ai` remains separately scoped to
    Production. No domain assignment, DNS change, deployment, or request was
    triggered.
- [x] `PROD-E03` Set the approved production Firebase Web config and server
  identity in Vercel Production; verify no `menulist-qa` value remains.
  - `2026-08-16` - Firebase Console readback from exact app **MenuList
    Production Web** supplied the six browser configuration fields for project
    `menulist-prod`, project number `233910481388`, Storage bucket
    `menulist-prod.firebasestorage.app`, and app ID ending `109910c9`. They were
    transferred without printing the API key into the six canonical
    `NEXT_PUBLIC_MENULIST_FIREBASE_*` rows in Vercel Production. Metadata
    confirms every row is Production-only, not Preview or custom `qa`. The
    separately completed WIF selectors remain the server identity; no Admin
    client email/private key or `menulist-qa` Firebase value was introduced.
    Firebase Analytics remains intentionally unconfigured. No deployment or
    Firebase request was triggered.
- [ ] `PROD-E04` Set distinct production OAuth, NextAuth, revalidation, referral,
  worker, and webhook secrets; verify none equals its QA counterpart.
- `2026-08-16` - Partial preparation only. Production OAuth and NextAuth were
  already isolated under Phase C. Fresh production-only referral-token, batch
  worker, and revalidation values were generated and the three canonical
  `MENULIST_*` rows were created in Vercel Production without revealing their
  values. The initial revalidation value was then replaced with one fresh value
  in Vercel Production and the same value was stored as
  `REVALIDATION_SECRET` version 2 in `menulist-prod` Secret Manager. Metadata
  readback confirms version 2 is enabled and version 1 is disabled. Secret
  values remained hidden in all evidence, and no deployment was triggered, so
  the Vercel change remains pending live effect until a separately approved
  release. EmailOS no longer blocks this row: its production API key and
  webhook secret are distinct from QA and stored only in `menulist-prod`.
  Razorpay Live and production Meta/WhatsApp webhook secrets remain
  unavailable, so the broader row stays open. The temporary shared Razorpay
  Test Mode API pair does not change that result. Do not invent placeholders or
  reuse QA webhook values.
- [x] `PROD-E05` Set production Gemini, Upstash, SMTP, Razorpay, Sentry, Maps,
  analytics, and messaging values only for features intentionally admitted.
  - `2026-08-16` - Closed as an admission-controlled inventory, not as blanket
    provider activation. The production Gemini primary credential, Sentry DSN,
    and Maps Embed key are stored only in their approved Production scopes.
    Upstash is now present only in its approved Production scopes; Resend is
    prepared under `PROD-D04` with Functions-only product-scoped secrets while
    provider sending remains off; SMTP stays unconfigured; the approved
    temporary Razorpay Test Mode API pair is present in Vercel Production and
    `menulist-prod` Secret Manager, while Live Mode and the production webhook
    remain absent behind `PROD-D05`-`PROD-D07`;
    GA4/Clarity and Telegram/external uptime are intentionally omitted under
    `PROD-D12`-`PROD-D13`; and production WhatsApp remains absent and explicitly
    runtime-disabled behind `PROD-D09`-`PROD-D10`. No literal placeholder was added to a managed
    environment, no optional provider was enabled merely to complete this row,
    and no deployment or provider call occurred.
- [x] `PROD-E06` Keep every optional production feature fail-closed until its
  provider smoke and release gate are ready.
  - `2026-08-16` - Source and production configuration review confirms the
    parked provider paths remain closed without fake credentials. MenuList
    EmailOS provider transmission and owner WhatsApp notifications are disabled
    by their product-specific source gates. The Functions production env keeps
    messaging onboarding, WhatsAppOS, owner WhatsApp delivery, and platform
    WhatsApp alerts explicitly disabled. WhatsApp provider calls and disabled-
    target function manifests both honor those gates, so production does not
    depend on absent Meta secrets. Resend credentials are present
    but inert behind `ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND=false`; Razorpay
    has Test Mode API credentials only and no production webhook, while Live
    Mode, production WhatsApp, GA4/Clarity, Telegram, and external uptime values
    remain absent for the blockers recorded above. App Check remains deliberately in
    monitoring mode rather than being misreported as enforced. No flag was
    enabled, no placeholder was stored, and no deployment or provider smoke was
    run to close this source/configuration gate.
- [x] `PROD-E07` Create only Firebase Functions secret names declared by the
  current MenuList Functions source, with production values in the approved
  production Firebase project.
  - `2026-08-16` - Metadata-only Firebase CLI readback, with no secret access,
    confirms enabled production versions exist for `GEMINI_AI_KEY`,
    `MENULIST_GEMINI_TEXT_AI_KEY`, `SENTRY_DSN`, `REVALIDATION_SECRET`,
    `UPSTASH_REDIS_REST_URL`,
    `UPSTASH_REDIS_REST_TOKEN`, `MENULIST_RESEND_API_KEY`, and
    `MENULIST_RESEND_WEBHOOK_SECRET`. Both Resend values are enabled at version
    1 and were verified by metadata only. Legacy and product-scoped WhatsApp,
    SMTP, Razorpay, Telegram, and budget-webhook names were initially absent.
    The target-aware Functions secret groups now omit
    legacy WhatsApp and WhatsApp alert-delivery names when the production
    WhatsApp gates are false; no dummy Meta secret is needed for the parked
    target. On `2026-08-16`, the verified Razorpay Test Mode API pair was added
    as enabled version 1 of `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. A fresh,
    production-specific random value was generated directly into enabled
    `GCP_BUDGET_WEBHOOK_SECRET` version 1; the QA internal secret was not reused.
    This completes the current production Functions secret manifest without
    creating a Pub/Sub connection, callback, provider object, or deployment.
    Canonical `MENULIST_WHATSAPP_*` constants are not yet part of an active
    secret group and were not created speculatively.
- [x] `PROD-E08` Configure non-secret Functions environment values, including
  `NEXT_PUBLIC_APP_URL=https://app.menulist.ai` and
  `MENULIST_TENANT_BASE_DOMAIN=menulist.online`.
  - `2026-08-16` - Prepared the private non-secret runtime file
    `functions/.env.menulist-prod` for exact project `menulist-prod`. It uses
    owner/message-preview origin `https://app.menulist.ai`, tenant base
    `menulist.online`, the approved Gemini local admission ceiling, and the
    EmailOS sender contract `MenuList <system@menulist.ai>` with
    `support@neelvara.com` reply-to. It keeps messaging onboarding, WhatsAppOS,
    owner WhatsApp delivery, and platform WhatsApp alerts disabled while
    retaining the `whatsapp` provider name only as dormant configuration with
    tracking enabled. No credential is in the file, it remains uncommitted
    by contract, and no Functions deployment or provider request occurred.
- [x] `PROD-E09` Run configuration/source verifiers that do not deploy or make
  paid provider calls; record exact results in the production-readiness audit.
  - `2026-08-16` - Passed `verify:agent-readiness`,
    `verify:menulist-env-contract`, `test:provider-client-boundary`,
    `test:functions-ai-key-attribution`, and
    `verify:official-business-page-boundary`; root `npx tsc --noEmit`, focused
    ESLint for the changed map/runtime verifier files, and `git diff --check`
    also passed. `docs:check-links` scanned 2,994 files and 5,248 internal
    links with zero broken links and 62 pre-existing video-artifact naming
    warnings. The production-readiness audit records the same evidence and its
    local-only boundary. No build, deploy, live write, or paid provider call ran.
- [x] `PROD-E10` Perform a secret-name and environment-separation review without
  printing secret values; confirm no literal placeholders remain.
  - `2026-08-16` - The initial Vercel metadata review under the Production filter found 29
    expected MenuList rows: production routing/domain, Firebase Web, WIF,
    OAuth/NextAuth, App Check site key, Gemini, Sentry, Maps, and the three
    application secrets. Every displayed row is Production-scoped; no QA
    Firebase value, static Admin private key/client email, sibling-product
    placeholder, SMTP/Resend, Upstash, Razorpay Live, GA4/Clarity, Telegram, or
    production WhatsApp row is present. Values remained hidden. Firebase CLI
    metadata confirmed the four names present at that checkpoint in
    `menulist-prod` Secret Manager
    and did not access values. `npm run verify:env-targets` passed. The rows
    created in this pass came from exact provider metadata or fresh generated
    values, not literal `<...>` template text. The subsequent
    `REVALIDATION_SECRET` version-2 rotation is recorded under `PROD-E04`.
    Later provider additions and the completed Functions manifest are recorded
    in their own dated entries under `PROD-D02`, `PROD-D04`, `PROD-D06`, and
    `PROD-E07`.
  - `2026-08-16` - Follow-up metadata review confirms the temporary Razorpay
    Test Mode exception added only `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID` and
    sensitive `MENULIST_RAZORPAY_KEY_SECRET` to Vercel Production, plus enabled
    version 1 of `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in exact project
    `menulist-prod`. The key ID was checked for the `rzp_test_` prefix and the
    production Secret Manager pair authenticated read-only with HTTP 200. No
    production webhook secret, callback, Live key, WhatsApp row, deployment,
    payment object, or charge was created. Vercel-managed sensitive values were
    not decrypted or printed; runtime equality remains a hosted certification
    item after an approved deployment.

## Phase F - Certification-Gated Activation And Launch Handoff

The default gate is a fully closed staging feature-certification ledger plus
explicit production release approval. On `2026-08-16`, the owner explicitly
accepted the remaining QA certification risk and directed those fixture,
physical-device, Razorpay Test Mode, Answerlattice-backed support, and temporary
elevated-role checks to continue in parallel. This exception authorizes the
scoped MenuList production deployment path; it does not mark those QA checks as
passed and does not authorize live Razorpay, WhatsApp, App Check enforcement,
OAuth publishing, or final launch certification.

- [ ] `PROD-F01` Confirm all staging feature-certification parent flows are
  closed with evidence and no release-blocking regression remains.
- [x] `PROD-F02` Run the current local production-readiness aggregate and record
  the exact commit, command, and result.
  - `2026-08-16` - Run against staging base
    `c1f53d235c5f92fc0cd5e7d57d2b855ade7a9732` plus the release-gate fixes
    prepared for the next exact staging commit. The full
    `npm run verify:production-readiness-local` aggregate stopped after `33/194`
    checks at `verify:asset-factory` because eight parked Answerlattice website
    asset fingerprints require separate visual review. A separate
    MenuList/shared root-verifier matrix selected 155 checks: 153 passed,
    `verify:production-readiness-local` retained that exact Answerlattice-only
    stop, and `verify:upstash-readiness` retained its external certification
    status. Focused regressions for every repaired verifier contract passed.
    Exact commit, clean-tree typecheck/lint/docs, and hosted QA SHA evidence are
    refreshed after this ledger update and before production promotion.
- [ ] `PROD-F03` Deploy production Firestore rules/indexes and Storage rules only
  with explicit production approval and scoped commands.
- `2026-08-16` - Storage rules and all 166 declared Firestore composite indexes
  plus field overrides are deployed; production index readback found zero
  missing declared indexes. Firestore Security Rules publication remains
  blocked by the repeated external Rules API HTTP 503 described in Current
  Evidence, and production still uses its initial locked ruleset. Keep this
  combined row open until the repository rules release and exact source
  readback pass.
- [x] `PROD-F04` Deploy the approved production Functions targets only after
  source preflight, secret existence, IAM, billing, and rollback checks pass.
  - `2026-08-16` - The four admitted WhatsApp-independent targets are ACTIVE
    and their transport/auth boundaries are verified as recorded above.
- [x] `PROD-F05` Trigger Vercel Production only after explicit Vercel deploy
  approval in the active session.
  - `2026-08-16` - Ready deployment
    `dpl_Eay11a4cM7Szb33cqEgYjnDVy3Yj` serves exact release commit
    `32d1a0605adae6f2d9c6881fa52fda1254f1b840` with corrected Production
    Sentry configuration.
- [x] `PROD-F06` Assign production Vercel domains and perform DNS cutover only
  after the deployed artifact, TLS, rollback plan, and exact records are ready.
  - `2026-08-16` - All six exact production domain rows are attached; `.ai`
    routing, `.online` redirects, wildcard tenant routing, DNS preservation,
    and TLS evidence are recorded above.
- [ ] `PROD-F07` Activate live provider callbacks/enforcement one provider at a
  time, including Razorpay, messaging, and App Check, with bounded evidence.
  Razorpay activation is blocked while any production binding starts with
  `rzp_test_` or the endpoint-specific production webhook is absent.
- [ ] `PROD-F08` Complete production-host, browser/device, data-isolation,
  payment, messaging, backup/restore, observability, and rollback smoke before
  recording the final launch verdict.
- [ ] `PROD-F09` Move the MenuList OAuth audience from External/Testing to
  Production only at the release gate, after required scopes, public branding
  URLs, domain ownership, test-user smoke, and any Google verification
  requirement are confirmed. Provider preparation alone must not publish the
  OAuth app.

## Related Authorities

- [MenuList Staging QA Setup](./menulist-staging-qa-setup.md)
- [MenuList Staging Feature Certification](./menulist-staging-feature-certification.md)
- [Production Deployment Checklist](./production-deployment-checklist.md)
- [External Certification Runbook](../production-readiness/external-certification-runbook.md)
- [Production Environment Example](../../.env.production.example)
- [Firebase Functions Secrets Setup](../../functions/src/envSetup.md)
