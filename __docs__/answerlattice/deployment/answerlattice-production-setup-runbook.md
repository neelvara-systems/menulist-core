# Answerlattice Production Setup Runbook

> **Last updated:** August 22, 2026
> **Firebase project:** `neelvara-answerlattice-prod`
> **Firebase alias:** `answerlattice-prod`
> **Public domains:** `answerlattice.com`, `www.answerlattice.com`
> **Status:** provider and infrastructure setup complete; certification remains open

This runbook explains the production-only execution sequence. Track completion
in [Answerlattice Environment Setup Checklist](./answerlattice-environment-setup-checklist.md); do not maintain a second checklist here.

## Entry Conditions

Do not start a production mutation until all are true:

1. `neelvara-answerlattice-qa` is visible to the setup account and QA setup has current
   readback.
2. The exact source revision has passed the focused Answerlattice gates and QA
   deploy.
3. Project `neelvara-answerlattice-prod` is visible to the setup account.
4. Production project number, organization, billing, budgets, Firestore
   location, existing resources, and IAM have been inventoried.
5. The requested deploy/provider action has explicit scoped approval.

The production project is readable and its core foundation is active on the
verified Production deployment. Hosted application certification remains a
separate gate.

## Current Readback

Verified through August 22, 2026:

- company ownership, billing, independent budgets, and single human operator;
- Firebase Web app, Email/Password Auth, exact authorized domains, Firestore
  `nam5`, Storage, PITR, delete protection, daily 98-day backup schedule, and
  supporting APIs;
- source-hash-verified Firestore and Storage rules, 100 READY composite
  indexes, and 18 TTL fields;
- dedicated service account, ACTIVE project-local WIF provider, exact
  Production subject restriction, least-privilege IAM, and zero user-managed
  keys;
- Vercel Production Firebase/OIDC selectors and fresh cron/bundle secrets;
- owner-created production Gemini authorization key in sensitive Vercel
  Production and Secret Manager version 1, with a bounded HTTP 200 provider
  proof;
- eight ACTIVE Gemini-bound Functions on Node 22 in `us-central1`, including
  Scheduler and embedding task queue resources with exact secret bindings;
- truthful production Google OAuth branding, test audience/user, exact
  apex/`www` client origins and callbacks, and Production-only Vercel client
  bindings with hosted `NEXTAUTH_URL` absent;
- completed isolated Firestore restore into the delete-protected non-default
  recovery database, with all 100 composite indexes and 15 non-TTL field
  overrides matching production;
- healthy `answerlattice.com` and `www.answerlattice.com` TLS/routing.
- replacement legacy reCAPTCHA v3 App Check credential with authoritative REST
  readback reporting `siteSecretSet=true`, 24-hour TTL, score threshold `0.5`,
  and enforcement OFF for Firestore, Storage, and Authentication;
- unique sensitive Production-only `ANSWERLATTICE_WIDGET_RUNTIME_SECRET`;
- READY exact-artifact Vercel Production redeployment
  `dpl_EFgScLqcUcgH5RW6pDDq68tbdPY3`, derived from certified deployment
  `dpl_6wszXf6VQAqYEV6Q5knDPMeBcPo1` and application commit
  `5fa6ae245dd151ebbea10d28a9c523689bdcf2d0`; the apex serves Answerlattice
  with environment `production`, deployment URL
  `menulist-core-mv1su2gwu-neelvara-systems.vercel.app`, and `www` redirects to
  the apex.

Still open as certification or release-governance work, not provider setup:

- hosted callback/session certification of the already bound and activated
  production Google OAuth client;
- promotion of the exact application and evidence commits through the approved
  Git review path;
- hosted OIDC/data-path proof, authenticated backend smoke, recovery fixture
  validation, TTL reapplication, Storage/Auth recovery evidence, and approved
  recovery-database cleanup.

## Production Sequence

1. **Inventory without mutation.** Read project metadata, enabled APIs,
   Firebase apps, Auth domains, Firestore/Storage, rules, indexes, Functions,
   service accounts, keys, WIF, Secret Manager names/status, budgets, and
   provider ownership.
2. **Prepare keyless identity.** Use the project-owned
   `answerlattice-vercel-prod` service account, WIF pool
   `answerlattice-vercel`, and provider `answerlattice-prod`. Keep static Admin
   credentials absent.
3. **Enter production selectors.** Use the Answerlattice rows in
   `.env.production.example` and Vercel Production only. Do not import the QA
   environment wholesale.
4. **Create production secrets.** Generate independent values, add enabled
   Secret Manager versions, and bind only the Functions that declare them.
5. **Audit indexes.** Compare remote and
   `firestore-answerlattice.indexes.json`; resolve conflicts deliberately and
   never use `--force` without an approved deletion plan.
6. **Run source gates.** At minimum:

   ```bash
   npm run typecheck:answerlattice
   npm --prefix functions-answerlattice run build
   npm run test:vercel-workload-identity
   npm run verify:env-targets
   npm run verify:answerlattice-backup-recovery
   ```

7. **Deploy only approved Firebase targets.** Use project ID
   `neelvara-answerlattice-prod` and config `firebase-answerlattice.json`. A typical full infrastructure
   command is shown for reference, not as standing authorization:

   ```bash
   firebase deploy \
     --only firestore:rules,firestore:indexes,storage,functions:answerlattice \
     --project neelvara-answerlattice-prod \
     --config firebase-answerlattice.json \
     --non-interactive
   ```

   If remote index audit requires a narrower sequence, deploy rules, Storage,
   approved indexes, and approved Functions targets separately.

8. **Read back deployed state.** Verify active rules content/hash, Storage
   rules, index readiness, exact Functions, runtime service identities,
   scheduler/task resources, and secret bindings.
9. **Certify hosted identity.** Verify `/api/version`, environment selectors,
   OIDC/STS, custom-token signing, Firestore, Storage, and admitted task paths
   on the production deployment.
10. **Certify recovery.** Run the project-confirmed production backup/restore
    procedure without touching QA or MenuList.

## Provider Boundary

Google OAuth is core identity infrastructure, not an optional provider. It must
match the MenuList flow end to end: the same NextAuth `google` provider,
identity scopes, account callbacks, and session logic, with credentials selected
from the request hostname. Credential isolation remains mandatory:

- QA client: origins `https://canonica.app` and
  `https://www.canonica.app`; each origin plus
  `/api/auth/callback/google` as an authorized redirect URI;
- production client: origins `https://answerlattice.com` and
  `https://www.answerlattice.com`; each origin plus
  `/api/auth/callback/google` as an authorized redirect URI;
- bind the clients through `ANSWERLATTICE_GOOGLE_CLIENT_ID` and sensitive
  `ANSWERLATTICE_GOOGLE_CLIENT_SECRET` in only the matching Vercel environment;
- omit hosted `NEXTAUTH_URL` so NextAuth derives the host that initiated the
  request; keep a localhost override only for local development;
- use `admin@neelvara.com` as the sole human company operator.

Each Google Auth Platform project must use truthful product branding,
`support@neelvara.com` as the support contact,
`admin@neelvara.com` as the developer contact and sole Testing-mode test user,
External audience, and only `openid`, `email`, and `profile`. QA legal URLs use
`https://canonica.app/privacy-policy` and
`https://canonica.app/terms-of-service`; production uses the same paths under
`https://answerlattice.com`. Publishing production OAuth remains a separate
release gate after hosted callback certification.

The shared Next.js runtime may use one environment-scoped Sentry DSN, but every
event must carry the hostname-derived `product` tag. Answerlattice Firebase
Functions use Google Cloud Logging and intentionally do not declare Sentry or a
project-local `SENTRY_DSN` secret.

Core infrastructure readiness does not require enabling every optional
provider. Keep any provider disabled when its legal ownership, account access,
secret, webhook, delivery, spend, or real-client evidence is not ready. Record
the disabled state in the checklist instead of creating placeholders or
borrowing MenuList/QA credentials.

## Rollback Boundary

Before deployment, capture the active production ruleset, index inventory,
Functions inventory, env selector inventory, and backup resource. A rollback
must restore the previously verified production state; it must never redirect
production to `neelvara-answerlattice-qa` or attach production domains to the
custom QA environment.
