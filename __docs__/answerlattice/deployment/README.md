# Answerlattice Deployment Hub

> **Category:** Answerlattice infrastructure and release operations
> **Last updated:** August 20, 2026
> **Status:** QA cloud foundation deployed; DNS and hosted closure in progress

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

The following was verified on August 20, 2026:

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
  valid configuration, and mail/verification DNS was preserved. The hosted
  build still predates the Canonica routing contract, so final hosted closure
  waits for the bounded QA routing deployment and readback.
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
  backup verifier, and documentation-link scan pass. These are source and
  emulator-backed setup gates; they do not replace the pending hosted QA proof.
- The shared NextAuth runtime still exposes one MenuList-scoped Google OAuth
  client and `NEXTAUTH_URL`. Answerlattice QA uses credential authentication;
  do not mutate or reuse MenuList OAuth. Product-specific Google sign-in needs
  a separately approved host-aware auth change.
- Remaining setup work is the approved bounded Vercel QA routing deployment
  plus Canonica/TLS/OIDC/application readback, a separate
  break-glass identity/operational alert route, and the first isolated restore
  rehearsal after a ready backup exists.

Historical claims in the QA runbook remain evidence of earlier work, not proof
of current state. Do not mark a live checklist item complete until the current
account can read it back from the exact project.

## Execution Order

1. Deploy the approved bounded routing revision to custom environment `qa` and
   verify Canonica TLS, `/api/version`, crawler isolation, and OIDC/runtime smoke.
2. Complete the break-glass/operational-alert controls and the first isolated
   restore rehearsal after a ready backup exists.
3. Close every remaining `AL-QA-*` item with current readback.
4. Create and complete every `AL-PROD-*` preparation item independently in
   `neelvara-answerlattice-prod` only after QA setup closes.
5. Promote the same approved source revision to production with dedicated
   production identities and secrets.
6. Run production-host and recovery evidence before any launch approval.

Do not copy MenuList service accounts, WIF providers, Firebase Web values,
Secret Manager values, Upstash credentials, provider webhook secrets, or
runtime data into Answerlattice.
