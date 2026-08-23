# Answerlattice Deployment Hub

> **Category:** Answerlattice infrastructure and release operations
> **Last updated:** August 23, 2026
> **Status:** Core QA and production infrastructure is prepared; authenticated data-path, recovery-fixture, and launch certification remain open

This folder is the canonical entry point for Answerlattice environment setup.
Answerlattice shares the repository and Vercel project with MenuList, but it
owns separate Firebase, Auth, Firestore, Storage, Functions, App Check,
service-account, Workload Identity, secret, budget, provider, and release
evidence for each environment.

## Environment Contract

| Stage | Public host | Firebase project | Firebase alias | Vercel target |
| --- | --- | --- | --- | --- |
| Local and QA | `canonica.app`, `www.canonica.app` | `neelvara-answerlattice-qa` | `answerlattice-qa` | custom environment `qa`, exact branch `staging` |
| Production | `answerlattice.com`, `www.answerlattice.com` | `neelvara-answerlattice-prod` | `answerlattice-prod` | Production |

The immutable cloud project IDs use the company-owned `neelvara-` namespace.
`answerlattice-qa` and `answerlattice-prod` are local Firebase aliases and WIF
provider IDs only; they are not cloud project IDs.

## Documents

| Document | Authority |
| --- | --- |
| [Answerlattice Environment Setup Checklist](./answerlattice-environment-setup-checklist.md) | Live QA and production setup status, exact order, item IDs, stop conditions, and current blockers |
| [Answerlattice QA Deployment Runbook](./answerlattice-qa-deployment-runbook.md) | Historical QA deploy evidence and detailed operational history; it is not the live setup status ledger |
| [Answerlattice Production Setup Runbook](./answerlattice-production-setup-runbook.md) | Production-only preparation and promotion sequence after QA setup closes |
| [Answerlattice Backup And Recovery Runbook](./answerlattice-backup-recovery-runbook.md) | Backup discovery, project confirmation, restore drills, and recovery evidence |
| [Production Readiness Certification](../answerlattice-production-certification.md) | Historical code certification and product evidence; it does not approve infrastructure setup or deployment |
| [Final Cross-Cutting Audit](../system-inventory/answerlattice-final-cross-cutting-audit.md) | Historical August 2 local-source audit; use the live setup checklist for current cloud state |

## Current Verified State

The following was verified through August 23, 2026:

- Source targets are `neelvara-answerlattice-qa` for local/QA and
  `neelvara-answerlattice-prod` for production in
  `src/constants/deploymentTargets.ts`.
- `.firebaserc`, `firebase-answerlattice.json`, the Answerlattice Functions
  package scripts, and the environment examples agree on those project IDs.
- Dedicated Firestore rules, index, Storage rules, and Functions source files
  exist in the repository.
- `https://answerlattice.com` returns HTTP 200 from Vercel and
  `https://www.answerlattice.com` returns the intended permanent HTTP 308
  redirect to the apex.
- `canonica.app` is owned in the company GoDaddy account. Its apex and `www`
  hosts are attached only to Vercel custom environment `qa`. GoDaddy now serves
  Vercel's exact apex A and `www` CNAME records; public DNS and Vercel report
  valid configuration, and mail/verification DNS was preserved. Initial domain
  certification recorded exact staging commit
  `f6256fba66d60a4dbd3d88314300f2a79d28ff25` inside Answerlattice QA with
  with valid TLS and no production redirect; the current build is recorded
  below. The approved product-routed Google
  OAuth consent and session proof was completed on the earlier certified
  application revision described below.
- The QA host contract requires `X-Robots-Tag: noindex, nofollow, noarchive`,
  a disallow-all `robots.txt`, and no sitemap. Production remains indexable.
- The former IDs `answerlattice-qa` and `answerlattice` exist outside the
  confirmed company account. `admin@neelvara.com` cannot read them and the
  owner identity is not exposed by Google. They are retired external targets:
  never request access, deploy, or place credentials in them.
- On August 20, 2026, `admin@neelvara.com` created Google Cloud project
  `neelvara-answerlattice-qa` (project number `216985843437`) in organization
  `neelvara.com`. Billing account `0135AA-B5D4AD-C72CAB` is linked. Firebase,
  Firestore, Storage, Auth, legacy reCAPTCHA v3 App Check, required APIs,
  project-local keyless Vercel identity, core secrets, rules, indexes, 12
  approved Functions, Scheduler, Cloud Tasks, and a daily 14-week Firestore
  backup schedule are active. App Check enforcement remains monitoring-only.
  Optional provider-send paths remain disabled. No paid Upstash database is
  needed for the current optional cache path.
- The full Answerlattice runtime-truth aggregate, Answerlattice TypeScript,
  Answerlattice Functions build, whitespace validation, WIF/environment gates,
  backup verifier, documentation-link scan, hosted route boundary, and hosted
  login boundary pass. Fixture-dependent application certification remains a
  separate testing gate.
- August 23 current-build revalidation confirmed exact build
  `d534e64822eb8aea8fc4b4ecd0f17a45090afed8` on both Canonica QA hosts and
  the Answerlattice production apex. All 12 approved Functions in each
  Answerlattice Firebase project remain `ACTIVE` on Node 22. The complete
  Answerlattice runtime-truth aggregate passed again. An existing authenticated
  QA session loaded the Firestore-backed Setup Status workspace without browser
  errors; it reports 36% readiness, 5 of 14 setup checks, 0 of 7 launch checks,
  five mapped surfaces, and no imported articles or trusted answers. Production
  correctly redirects an unauthenticated dashboard request to sign-in. These
  checks are current evidence, but do not substitute for the remaining hosted
  Storage/task, recovery-fixture, or authenticated production proofs.
- A setup-only parity audit on August 21, 2026 found two genuine QA gaps:
  product-isolated Answerlattice Resend/EmailOS onboarding inside the approved
  shared MenuList/Answerlattice provider team and a Vercel QA
  redeployment to activate the newly stored private
  `ANSWERLATTICE_WIDGET_RUNTIME_SECRET`. Answerlattice Functions intentionally
  use Google Cloud Logging and do not declare Sentry or `SENTRY_DSN`; the
  shared Next.js runtime keeps the environment-scoped DSN with product tags.
  GitHub, MCP, WhatsApp, SMTP, paid Redis, optional analytics, and a global
  public widget key remain intentionally absent; they are not MenuList parity
  requirements.
- The Vercel QA activation gap is closed. Current live readback confirms the
  custom environment `qa` serves the refreshed `staging` branch tip on both
  Canonica hosts with Answerlattice identity and QA crawler isolation. Its OIDC
  token reports custom environment `qa` and subject
  `owner:neelvara-systems:project:menulist-core:environment:qa`.
- Answerlattice QA EmailOS inbound setup is active without enabling outbound
  email. Function revision `answerlatticeemailoswebhook-00006-zer` binds only
  `ANSWERLATTICE_RESEND_WEBHOOK_SECRET` version 1, uses the organization-policy
  compatible Cloud Run public transport setting, and returns HTTP 400
  `Invalid webhook` for an unsigned request. The owner-created Resend sending
  key is now stored as a sensitive value only in Vercel custom `qa` and as
  enabled Secret Manager version 1 in `neelvara-answerlattice-qa`; it was
  transferred through standard input without display or repository persistence.
  Current live readback confirms the activated custom `qa` deployment serves
  both Canonica hosts with Answerlattice identity and QA crawler isolation. The
  sensitive sending key is available to the hosted QA runtime, but
  `ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND` remains `false`; no email was
  sent and controlled delivery certification remains open.
- Google OAuth parity is now an approved core setup requirement. The shared
  NextAuth session implementation keeps the same `google` provider, identity
  scopes, callback path, account validation, and separate Answerlattice
  Firebase custom-token synchronization used by MenuList. The auth route
  selects credentials by the actual request hostname: MenuList uses
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; Answerlattice uses dedicated
  `ANSWERLATTICE_GOOGLE_CLIENT_ID` / `ANSWERLATTICE_GOOGLE_CLIENT_SECRET`.
  Never reuse or add Answerlattice callbacks to the MenuList client.
- Hosted custom `qa` and Production environments must omit `NEXTAUTH_URL`.
  NextAuth 4 otherwise forces every callback to one MenuList origin before it
  can apply host routing. Vercel's trusted forwarded host supplies the exact
  origin, and Google OAuth clients admit only their environment's explicit
  origins and `/api/auth/callback/google` redirects. Localhost may still set a
  local `NEXTAUTH_URL`.
- The code and environment contract are prepared. Answerlattice QA Google Auth
  Platform now has truthful Canonica branding, company support/developer
  contacts, External Testing audience, the sole admin test user, and dedicated
  Web client `Answerlattice QA Web`. The initially created secret was
  invalidated before use after accessibility-label exposure; only its
  replacement remains enabled. Vercel `qa` contains the dedicated sensitive
  client binding and no hosted `NEXTAUTH_URL`. No secret was written to source
  or documentation. Custom QA deployment
  `menulist-core-2ix2pt0p5-neelvara-systems.vercel.app` served exact
  staging commit `1589272a29e1f342ae7d4b93985da91f66922152` on both Canonica
  hosts. Both hosts derive their own exact Google callback and request only
  `openid email profile`. A bounded consent/callback with
  `admin@neelvara.com` returned to `canonica.app` authenticated, and the apex
  session did not cross to `www`, proving the host-only cookie boundary.
  Answerlattice Firebase custom-token synchronization remains open until an
  authorized disposable workspace fixture exists. Production now has its own
  truthful `Answerlattice Production Web` client and Production-only Vercel
  binding with hosted `NEXTAUTH_URL` absent; production deployment activation
  is complete, while callback, session, and custom-token proof remain open
  certification work.
- The shared Next.js/Vercel process intentionally uses one environment-scoped
  Sentry DSN because browser, server, and edge SDKs initialize once per runtime,
  not once per custom domain. Monitoring now derives and records the product
  tag before sanitizing request URLs. Answerlattice Firebase Functions use
  Google Cloud Logging and intentionally do not declare Sentry or a
  project-local `SENTRY_DSN` secret.
- Firebase Functions, Secret Manager, and the current Canonica deployment use
  the rotated QA AI Studio authorization key. The exact current staging
  revision is live; one authenticated bounded Next.js server-side Gemini
  readback remains fixture-dependent. The owner-approved account model is
  closed: `admin@neelvara.com` is the only human operator for every product;
  Cloud
  Identity Free is active at no charge but no additional user was created.
  Later ledger-only commits may advance `/api/version` without changing this
  verified OAuth application release boundary.
  The first QA managed backup reached READY and restored successfully into an
  isolated delete-protected database with all 100 composite indexes. Fixture
  content, TTL reapplication, Storage/Auth recovery, cleanup, and the
  Auth/App Check/widget/dashboard/ticket/KB/scheduler paths remain deferred
  testing or post-setup certification, not missing provider setup.
- Production project `neelvara-answerlattice-prod` is company-owned and visible
  to `admin@neelvara.com`. Firebase Web/Auth/Firestore/Storage, protected
  `nam5` data, backup scheduling, budgets, required APIs, rules, Storage rules,
  100 READY indexes, 18 TTL fields, keyless Vercel identity, and fresh cron and
  bundle secrets are prepared. The runtime service account has no user-managed
  keys or broad project role. Production domains and TLS are healthy. The first
  managed backup restored successfully into delete-protected database
  `answerlattice-prod-recovery-20260821` without touching `(default)`; all 100
  composite indexes and 15 non-TTL field overrides match production. The 18
  TTL policies were absent as expected and remain an explicit recovery step.
- Production core activation and the inbound EmailOS webhook are complete
  without enabling outbound optional providers.
  The dedicated Google OAuth client and replacement legacy reCAPTCHA v3
  credential are bound only to Vercel Production. Authoritative Firebase App
  Check REST v1 readback reports `siteSecretSet=true`, a 24-hour token TTL, a
  `0.5` score threshold, and `UNENFORCED` Firestore, Storage, and Authentication
  services. The corresponding public site key and a fresh server-only
  `ANSWERLATTICE_WIDGET_RUNTIME_SECRET` are active in READY Production
  deployment `dpl_EFgScLqcUcgH5RW6pDDq68tbdPY3`. The owner-created production
  Gemini authorization key is active
  in sensitive Vercel Production and Secret Manager version 2; a bounded
  provider call returned HTTP 200 with exactly `OK`. All 12 approved Functions
  are ACTIVE on Node 22 with exact secret readback: the eight
  Gemini-bound paths plus two retry-safe Firestore analytics/support triggers
  and the PLATFORM-authorized analytics backfill callable, plus the signed
  inbound EmailOS webhook. The callable uses
  the QA-proven Domain Restricted Sharing-compatible Cloud Run transport
  annotation and returns HTTP 401 `UNAUTHENTICATED` to an unsigned request,
  so public transport does not bypass Firebase callable authentication. The
  Secret Manager version 1 is destroyed after the eight AI Functions moved to
  version 2. The replacement key is active in the current Production deployment.
  Current signed-in AI Studio metadata lists exactly one Answerlattice
  Production authorization key and one QA key; no superseded Production
  credential remains to retire.
  The production EmailOS webhook revision
  `answerlatticeemailoswebhook-00001-muj` binds only
  `ANSWERLATTICE_RESEND_WEBHOOK_SECRET` version 1, uses the same supported
  Domain Restricted Sharing transport setting, rejects GET with HTTP 405, and
  rejects an unsigned POST with HTTP 400 `Invalid webhook`. Outbound Resend and
  WhatsApp provider sending remain disabled and their credentials are absent.
  Current live readback confirms that `answerlattice.com` serves Answerlattice
  over TLS with environment `production`, `www.answerlattice.com` redirects
  permanently to the apex, and `/api/version` matches the current `main` branch
  tip at verification time. Hosted
  OIDC/data-path proof, authenticated smoke, recovery fixture validation, TTL
  reapplication, Storage/Auth evidence, and recovery cleanup remain separately
  gated.
- Current QA hosted readback confirms both Canonica hosts serve Answerlattice
  from the current `staging` branch tip at verification time with environment
  `preview`, valid TLS, and the required noindex policy. Earlier deployment IDs
  and commit hashes in the evidence log remain historical release points only.
  Fresh public-route smoke covered the core product, demo, install, developer,
  pricing, trust, security, pre-onboarding, contact, and legal surfaces without
  a rendered error state. Google sign-in and the launch-path preview passed; a
  user without Answerlattice workspace scope was safely redirected to Pricing.
  The first explicitly approved managed QA workspace attempt reached Razorpay
  plan creation but failed before the provider subscription outcome or local
  entitlement could be confirmed. Firestore retained only a quarantined `provisioning`
  scope. Investigation found that tenant cleanup incorrectly required a store
  identity on the tenant document; the local correction now uses document-kind
  ownership, preserves legacy canonical-only recovery, writes compact `tId` and
  `sId` aliases for new workspaces, and passes focused contract and emulator
  tests. The earlier 11-character Vercel secret readback was the platform's
  masked representation of a sensitive value, not evidence of a malformed
  stored secret. The unchanged shared Razorpay Test pair was read from enabled
  MenuList Secret Manager version 1, returned HTTP 200 on a bounded read-only
  provider request, and was re-applied without display to the active QA and
  Production Vercel variables. Do not retry onboarding until the onboarding
  correction is released.
- The two empty-state Firestore corrections found during local authenticated QA
  are deployed to `neelvara-answerlattice-qa`. Firebase's managed compiler
  accepted the dedicated rules file, and Rules API readback matches the local
  source byte-for-byte. The shared rules mirror has the same focused contract
  and both dedicated/shared positive and adversarial suites pass.
- The hourly and manual master-scheduler paths now pass in both Answerlattice
  projects. The project-local Functions runtime identities have Firestore user
  and log-writer access, plus bucket-scoped Storage object administration. The
  Production manual scheduler now matches QA's Domain Restricted
  Sharing-compatible public transport/application-secret-auth contract. Fresh
  automatic and manual runs returned HTTP 200; all three admitted tasks
  succeeded, and both provider-health documents report `status: ok` with the
  approved Functions SDK surface.

Historical claims in the QA runbook remain evidence of earlier work, not proof
of current state. Do not mark a live checklist item complete until the current
account can read it back from the exact project.

## Pre-QA Handoff

No provider or infrastructure setup action remains before Answerlattice QA.
The onboarding ownership/diagnostic correction is active, the quarantined
attempt was resumed without creating a second provider object, and the managed
QA workspace now exists with its retained Razorpay Test subscription in the
authoritative payment-pending state. Payment-pending does not grant paid AI or
Knowledge Intake entitlement.

Continue the fixture-dependent items in the live checklist:
`AL-QA-C06`, plus the testing-only portions referenced by
`AL-QA-D06`, `AL-QA-D07`, and `AL-QA-E06`. `AL-PROD-C05` and `AL-PROD-E06`
remain certification work. Optional Redis, outbound EmailOS/Resend, SMTP,
GitHub, WhatsApp, analytics, and provider-send paths remain deliberately
disabled. Do not create or enable them merely for parity.

The August 23 recovery closeout completed `AL-QA-E07` and the recovery half of
`AL-PROD-E06`. Both isolated databases had all 100 composite indexes and zero
document collections, matching backup snapshots created before any workspace
data existed. All 18 source-controlled TTL policies were reapplied and reached
`ACTIVE`. A synthetic object passed upload, readback, soft delete, restore, and
second readback in each primary Firebase Storage bucket; no test object remains
live. Firebase Auth exportability passed for one QA user and zero production
users inside a mode-`0700` temporary directory, and the plaintext exports were
deleted immediately. After exact-target readback, only the two dated recovery
databases were deleted; each project now lists only `(default)`. The managed
backups remain retained, while a future non-empty backup must provide tenant
lineage evidence once real workspace data exists.

The production provenance correction is live and verified. Always refresh
`origin/staging`, `origin/main`, the local worktree, and both hosted
`/api/version` responses before recording a new current-state claim; never treat
an earlier commit hash as the permanent release authority.

## Execution Order

1. Complete fixture-dependent Auth, App Check, widget, dashboard, ticket,
   knowledge-base, scheduler, and identity-path certification when the QA
   fixtures are available.
2. Promote the exact application and evidence commits to main through the
   approved Git review path; do not replace the certified Production build with
   an unrelated main revision.
3. Run production-host, OIDC/data-path, authenticated smoke, fixture recovery,
   TTL reapplication, Storage/Auth recovery, and cleanup evidence before launch
   approval.

Do not copy MenuList service accounts, WIF providers, Firebase Web values,
Secret Manager values, Upstash credentials, provider webhook secrets, or
runtime data into Answerlattice.
