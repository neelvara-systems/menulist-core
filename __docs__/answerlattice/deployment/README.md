# Answerlattice Deployment Hub

> **Category:** Answerlattice infrastructure and release operations
> **Last updated:** August 22, 2026
> **Status:** QA and production core infrastructure active; certification and optional providers remain gated

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
| [Final Cross-Cutting Audit](../system-inventory/answerlattice-final-cross-cutting-audit.md) | Current source/runtime audit and release evidence boundary |

## Current Verified State

The following was verified through August 22, 2026:

- Source targets are `neelvara-answerlattice-qa` for local/QA and
  `neelvara-answerlattice-prod` for production in
  `src/constants/deploymentTargets.ts`.
- `.firebaserc`, `firebase-answerlattice.json`, the Answerlattice Functions
  package scripts, and the environment examples agree on those project IDs.
- Dedicated Firestore rules, index, Storage rules, and Functions source files
  exist in the repository.
- `https://answerlattice.com` and `https://www.answerlattice.com` return HTTP
  200 from Vercel.
- `canonica.app` is owned in the company GoDaddy account. Its apex and `www`
  hosts are attached only to Vercel custom environment `qa`. GoDaddy now serves
  Vercel's exact apex A and `www` CNAME records; public DNS and Vercel report
  valid configuration, and mail/verification DNS was preserved. Both hosts
  now serve exact staging commit
  `a6afeafd25ee05235c06ce2199fa15e9f3945177` inside Answerlattice QA with
  valid TLS and no production redirect. The approved product-routed Google
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
  project-local keyless Vercel identity, core secrets, rules, indexes, 11
  approved Functions, Scheduler, Cloud Tasks, and a daily 14-week Firestore
  backup schedule are active. App Check enforcement remains monitoring-only.
  Optional provider-send paths remain disabled. No paid Upstash database is
  needed for the current optional cache path.
- The full Answerlattice runtime-truth aggregate, Answerlattice TypeScript,
  Answerlattice Functions build, whitespace validation, WIF/environment gates,
  backup verifier, documentation-link scan, hosted route boundary, and hosted
  login boundary pass. Fixture-dependent application certification remains a
  separate testing gate.
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
- The Vercel QA activation gap is closed. Deployment
  `dpl_91Uj4beXQWDCppJQK88VqvT56ZHQ` reached READY in custom environment `qa`
  from exact staging commit
  `a6afeafd25ee05235c06ce2199fa15e9f3945177`. Both Canonica hosts serve that
  build with Answerlattice identity and QA crawler isolation. Its OIDC token
  reports custom environment `qa` and subject
  `owner:neelvara-systems:project:menulist-core:environment:qa`.
- Answerlattice QA EmailOS inbound setup is active without enabling outbound
  email. Function revision `answerlatticeemailoswebhook-00006-zer` binds only
  `ANSWERLATTICE_RESEND_WEBHOOK_SECRET` version 1, uses the organization-policy
  compatible Cloud Run public transport setting, and returns HTTP 400
  `Invalid webhook` for an unsigned request. The owner-created Resend sending
  key is now stored as a sensitive value only in Vercel custom `qa` and as
  enabled Secret Manager version 1 in `neelvara-answerlattice-qa`; it was
  transferred through standard input without display or repository persistence.
  Approved redeployment `dpl_BdKiiGMKCR5hsdpLywDTTn1PqBLf` reached READY in
  custom environment `qa` from the same certified staging commit
  `a6afeafd25ee05235c06ce2199fa15e9f3945177`. Both Canonica hosts serve the
  redeployment with Answerlattice identity and QA crawler isolation. The
  sensitive sending key is therefore available to the hosted QA runtime, but
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
  binding with hosted `NEXTAUTH_URL` absent; production deployment, callback,
  session, and custom-token proof remain open.
- The shared Next.js/Vercel process intentionally uses one environment-scoped
  Sentry DSN because browser, server, and edge SDKs initialize once per runtime,
  not once per custom domain. Monitoring now derives and records the product
  tag before sanitizing request URLs. Answerlattice Firebase Functions remain
  isolated on their project-local `SENTRY_DSN` Secret Manager value.
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
- Production core activation is complete without enabling optional providers.
  Dedicated legacy
  reCAPTCHA v3 App Check is registered with enforcement OFF, and its public
  site key plus the dedicated Google OAuth client are bound only to Vercel
  Production. The owner-created production Gemini authorization key is active
  in sensitive Vercel Production and Secret Manager version 1; a bounded
  provider call returned HTTP 200 with exactly `OK`. All 11 approved core
  Functions are ACTIVE on Node 22 with exact secret readback: the eight
  Gemini-bound paths plus two retry-safe Firestore analytics/support triggers
  and the PLATFORM-authorized analytics backfill callable. The callable uses
  the QA-proven Domain Restricted Sharing-compatible Cloud Run transport
  annotation and returns HTTP 401 `UNAUTHENTICATED` to an unsigned request,
  so public transport does not bypass Firebase callable authentication. The
  optional production EmailOS webhook and its provider credentials remain
  intentionally absent.
  Vercel deployment `dpl_6wszXf6VQAqYEV6Q5knDPMeBcPo1` is READY from exact
  application commit `5fa6ae245dd151ebbea10d28a9c523689bdcf2d0`.
  `answerlattice.com` serves Answerlattice over TLS with that commit and
  `www.answerlattice.com` redirects permanently to the apex. Hosted
  OIDC/data-path proof, authenticated smoke, recovery fixture validation, TTL
  reapplication, Storage/Auth evidence, and recovery cleanup remain separately
  gated.

Historical claims in the QA runbook remain evidence of earlier work, not proof
of current state. Do not mark a live checklist item complete until the current
account can read it back from the exact project.

## Execution Order

1. Under explicit Vercel deployment approval, redeploy custom environment `qa`
   so its runtime receives the staged Answerlattice QA sending key. Then run the
   controlled delivery certification before enabling provider sending.
2. Complete fixture-dependent Auth, App Check, widget, dashboard, ticket,
   knowledge-base, scheduler, and identity-path certification when the QA
   fixtures are available.
3. Close every remaining `AL-QA-*` item with current readback.
4. Promote the exact application and evidence commits to main through the
   approved Git review path; do not replace the certified Production build with
   an unrelated main revision.
5. Run production-host, OIDC/data-path, authenticated smoke, fixture recovery,
   TTL reapplication, Storage/Auth recovery, and cleanup evidence before launch
   approval.

Do not copy MenuList service accounts, WIF providers, Firebase Web values,
Secret Manager values, Upstash credentials, provider webhook secrets, or
runtime data into Answerlattice.
