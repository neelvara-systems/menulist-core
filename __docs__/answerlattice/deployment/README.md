# Answerlattice Deployment Hub

> **Category:** Answerlattice infrastructure and release operations
> **Last updated:** August 21, 2026
> **Status:** QA core setup active; EmailOS and widget-secret activation remain open; production foundation prepared

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

The following was verified on August 21, 2026:

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
  were verified serving exact staging commit
  `1589272a29e1f342ae7d4b93985da91f66922152` inside Answerlattice QA with
  valid TLS and no production redirect. This hosted revision includes the
  approved product-routed Google OAuth implementation described below.
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
  authorized disposable workspace fixture exists; all production OAuth
  provider actions also remain open.
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
  The first isolated restore rehearsal also waits on a managed backup reaching
  READY. Fixture-dependent Auth/App Check/widget/dashboard/ticket/KB/scheduler
  proof remains deferred testing, not missing setup.
- Production project `neelvara-answerlattice-prod` is company-owned and visible
  to `admin@neelvara.com`. Firebase Web/Auth/Firestore/Storage, protected
  `nam5` data, backup scheduling, budgets, required APIs, rules, Storage rules,
  100 READY indexes, 18 TTL fields, keyless Vercel identity, and fresh cron and
  bundle secrets are prepared. The runtime service account has no user-managed
  keys or broad project role. Production domains and TLS are healthy.
- Production activation is deliberately incomplete. The owner-created Gemini
  authorization key and legacy reCAPTCHA v3 key are parked; App Check is not
  registered; the 11 approved Functions, Scheduler, and embedding queue are not
  deployed. The live Production Vercel build predates the new Answerlattice
  Production env values, so source promotion, Production redeploy, and hosted
  OIDC/data-path proof remain separately gated.

Historical claims in the QA runbook remain evidence of earlier work, not proof
of current state. Do not mark a live checklist item complete until the current
account can read it back from the exact project.

## Execution Order

1. With explicit Vercel deployment authorization, create a fresh custom-`qa`
   deployment from the approved staging revision, confirm both Canonica hosts
   move to it, and read back `/api/version` plus one bounded server AI call.
2. Complete fixture-dependent Auth, App Check, widget, dashboard, ticket,
   knowledge-base, scheduler, and identity-path certification when the QA
   fixtures are available.
3. Complete the first isolated restore rehearsal after a ready backup exists.
4. Close every remaining `AL-QA-*` item with current readback.
5. When the owner creates the production Gemini authorization key, transfer it
   directly to Vercel Production and Secret Manager, then deploy and read back
   only the 11 approved Answerlattice Functions plus their Scheduler and task
   queue resources.
6. When the owner creates the production legacy reCAPTCHA v3 key, register the
   production Web app and keep enforcement OFF during monitoring.
7. Promote the approved staging source to main and redeploy Vercel Production
   only with explicit deployment authorization.
8. Run production-host, OIDC/data-path, and recovery evidence before launch
   approval.

Do not copy MenuList service accounts, WIF providers, Firebase Web values,
Secret Manager values, Upstash credentials, provider webhook secrets, or
runtime data into Answerlattice.
