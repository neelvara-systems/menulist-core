# MenuList Production Provider Setup

> **Status:** Active owner/provider preparation ledger
> **Scope:** MenuList production accounts, projects, credentials, and inactive provider configuration
> **Last updated:** August 16, 2026
> **Current progress:** 18 of 61 checks complete; `PROD-B11` keyless architecture and source migration are approved; the full `menulist-qa` provider/runtime/domain/static-key-removal pass is complete, `menulist-prod` is next, and both Answerlattice targets are explicitly pending

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
- Firebase Console lists only `menulist-qa`.
- Firebase's project-creation wizard reports exact project ID `menulist` as
  `taken or unavailable`.
- Firebase's eligible existing Google Cloud project list shows
  `menulist-gemini-qa-free` and `Default Gemini Project`; it does not show
  `menulist`.
- `.firebaserc` keeps `menulist-qa` as the safe default and intentionally has no
  `menulist-prod` self-alias. Production commands must use literal project ID
  `menulist-prod`, allowing Firebase CLI to load
  `functions/.env.menulist-prod` exactly once by project ID.
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
   confirms zero user-managed keys remain. MenuList QA is closed. Start the
   dedicated `menulist-prod` pool/provider/service-account pass next.
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
- [ ] `PROD-B12` Enable the approved Firestore backup/PITR policy and document a
  restore drill before accepting production data.
- [ ] `PROD-B13` Register production App Check resources in monitoring mode
  only; enforcement remains release-gated.

## Phase C - Authentication And Google-Owned Provider Setup

- [ ] `PROD-C01` Configure the production Google OAuth consent/branding under
  company ownership using truthful current business details.
- [ ] `PROD-C02` Create a dedicated production OAuth Web client; do not reuse
  QA credentials.
- [ ] `PROD-C03` Add exact production JavaScript origins for
  `https://app.menulist.ai` only where the client requires them.
- [ ] `PROD-C04` Add exact production callback URI
  `https://app.menulist.ai/api/auth/callback/google`.
- [ ] `PROD-C05` Vault the production OAuth client ID/secret and record owner,
  creation date, and rotation/revocation procedure.
- [ ] `PROD-C06` Create a distinct production `NEXTAUTH_SECRET`; never copy the
  QA value.
- [ ] `PROD-C07` Create or approve the paid production Gemini project/key
  ownership model and its billing/spend-alert controls.
- [ ] `PROD-C08` Create only the Gemini keys admitted by current code, restrict
  them to the Gemini API, vault them, and document rotation slots as failover,
  not quota multiplication.

## Phase D - External Production Providers

These resources may be prepared inactive after Phase A. Do not enable live
traffic.

- [ ] `PROD-D01` Create a dedicated production Upstash Redis database and
  confirm it does not share the QA REST URL or token.
- [ ] `PROD-D02` Vault the production Upstash REST URL/token and record region,
  owner, and rotation/revocation procedure.
- [ ] `PROD-D03` Configure MenuList's Sentry production environment/project and
  vault the production DSN without sending a production test event yet.
- [ ] `PROD-D04` Configure an approved production transactional sender or
  controlled Workspace relay; never use a personal inbox password.
- [ ] `PROD-D05` Complete truthful Razorpay merchant Live Mode activation/KYC
  when available; staging remains Test Mode.
- [ ] `PROD-D06` Generate and vault dedicated Razorpay Live API credentials;
  do not place them in Preview or Firebase QA.
- [ ] `PROD-D07` Generate a distinct production Razorpay webhook secret and
  record the intended endpoint `https://app.menulist.ai/api/razorpay/webhook`;
  do not activate the Live webhook yet.
- [ ] `PROD-D08` Freeze the production Razorpay event list to events handled by
  the deployed route before webhook activation.
- [ ] `PROD-D09` Confirm Meta Business, app, and WhatsApp production ownership,
  recovery, and truthful verification status.
- [ ] `PROD-D10` Prepare dedicated production WhatsApp credentials and verify
  token ownership without registering the production callback or sending.
- [ ] `PROD-D11` Confirm production Google Maps/Places key restrictions match
  the exact production hosts and required APIs.
- [ ] `PROD-D12` Record the production analytics decision and create a distinct
  GA4 property/stream only if analytics is approved.
- [ ] `PROD-D13` Record whether Telegram and uptime monitoring are enabled or
  intentionally omitted; do not create unowned alert channels.
- [ ] `PROD-D14` Confirm every production provider account has company-owned
  recovery, MFA, and a named monthly/quarterly review owner.

## Phase E - Inactive Secrets And Environment Wiring

No deploy is authorized by this phase.

- [ ] `PROD-E01` Use `.env.production.example` as the key inventory and remove
  unrelated product rows before entering MenuList Production values.
- [ ] `PROD-E02` Set exact production URL/domain values for `menulist.ai`,
  `app.menulist.ai`, and `menulist.online` in Vercel Production only.
- [ ] `PROD-E03` Set the approved production Firebase Web config and server
  identity in Vercel Production; verify no `menulist-qa` value remains.
- [ ] `PROD-E04` Set distinct production OAuth, NextAuth, revalidation, referral,
  worker, and webhook secrets; verify none equals its QA counterpart.
- [ ] `PROD-E05` Set production Gemini, Upstash, SMTP, Razorpay, Sentry, Maps,
  analytics, and messaging values only for features intentionally admitted.
- [ ] `PROD-E06` Keep every optional production feature fail-closed until its
  provider smoke and release gate are ready.
- [ ] `PROD-E07` Create only Firebase Functions secret names declared by the
  current MenuList Functions source, with production values in the approved
  production Firebase project.
- [ ] `PROD-E08` Configure non-secret Functions environment values, including
  `NEXT_PUBLIC_APP_URL=https://app.menulist.ai` and
  `MENULIST_TENANT_BASE_DOMAIN=menulist.online`.
- [ ] `PROD-E09` Run configuration/source verifiers that do not deploy or make
  paid provider calls; record exact results in the production-readiness audit.
- [ ] `PROD-E10` Perform a secret-name and environment-separation review without
  printing secret values; confirm no literal placeholders remain.

## Phase F - Certification-Gated Activation And Launch Handoff

Do not start until the staging feature-certification ledger is fully closed and
the production release gate is explicitly approved.

- [ ] `PROD-F01` Confirm all staging feature-certification parent flows are
  closed with evidence and no release-blocking regression remains.
- [ ] `PROD-F02` Run the current local production-readiness aggregate and record
  the exact commit, command, and result.
- [ ] `PROD-F03` Deploy production Firestore rules/indexes and Storage rules only
  with explicit production approval and scoped commands.
- [ ] `PROD-F04` Deploy the approved production Functions targets only after
  source preflight, secret existence, IAM, billing, and rollback checks pass.
- [ ] `PROD-F05` Trigger Vercel Production only after explicit Vercel deploy
  approval in the active session.
- [ ] `PROD-F06` Assign production Vercel domains and perform DNS cutover only
  after the deployed artifact, TLS, rollback plan, and exact records are ready.
- [ ] `PROD-F07` Activate live provider callbacks/enforcement one provider at a
  time, including Razorpay, messaging, and App Check, with bounded evidence.
- [ ] `PROD-F08` Complete production-host, browser/device, data-isolation,
  payment, messaging, backup/restore, observability, and rollback smoke before
  recording the final launch verdict.

## Related Authorities

- [MenuList Staging QA Setup](./menulist-staging-qa-setup.md)
- [MenuList Staging Feature Certification](./menulist-staging-feature-certification.md)
- [Production Deployment Checklist](./production-deployment-checklist.md)
- [External Certification Runbook](../production-readiness/external-certification-runbook.md)
- [Production Environment Example](../../.env.production.example)
- [Firebase Functions Secrets Setup](../../functions/src/envSetup.md)
