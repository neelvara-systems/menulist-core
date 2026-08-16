# Deployment — Documentation Hub

> **Category:** Infrastructure  
> **Last Updated:** August 16, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This hub links deployment runbooks; current release approval requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

---

## Documents

| Document | Purpose |
|----------|---------|
| [menulist-staging-qa-setup.md](./menulist-staging-qa-setup.md) | Sole first execution guide for MenuList local/staging setup: domain purchase, Workspace mail/DNS, break-glass/daily accounts, GitHub/Vercel Git access, QA domains on exact branch `staging`, the branch-restricted custom `qa` environment, wildcard DNS preservation, `us-central1` Firebase resources, emulator-first local safety, all-host QA crawler isolation, billing/provider setup, Firebase rule emulator/deploy/readback/authenticated-smoke gates, and recurring ownership reviews |
| [menulist-production-provider-setup.md](./menulist-production-provider-setup.md) | Live provider-preparation ledger and four-project keyless rollout contract: one shared Vercel project, MenuList/Answerlattice QA and production OIDC/Google Workload Identity Federation, exact provider order, and the strict boundary that keeps deploys, DNS, payments, messages, data, and launch certification gated |
| [gemini-credential-billing-strategy.md](./gemini-credential-billing-strategy.md) | Canonical four-project Gemini billing, minimal credential inventory, secret-name, spend-control, rotation, and migration contract. It supersedes historical four-key-pool instructions. |
| [initial-account-domain-firebase-setup-guide.md](./initial-account-domain-firebase-setup-guide.md) | Owner-facing one-time setup guide for domain purchase, Workspace, Google Cloud/Firebase projects, billing accounts, budget alerts before paid services/API keys, Vercel, DNS, provider accounts, env placement, and staging-before-production order |
| [three-product-environment-setup.md](./three-product-environment-setup.md) | Technical product/domain/account/env setup checklist for Neelvara, MenuList, Answerlattice, CampaignCue, SignalDesk, MyCodex, billing ownership, budget alerts, and provider spend guardrails |
| [production-deployment-checklist.md](./production-deployment-checklist.md) | Guarded production handoff checklist; routes external gates through the production-readiness runbook and does not authorize deploys without active approval |
| [domain-environment-setup.md](./domain-environment-setup.md) | Exact env variables for production, preview/staging, and localhost domain handling |
| [.env.production.example](../../.env.production.example) | Canonical production-only key inventory; use only when the production provider ledger reaches `PROD-E01`, never as permission to deploy or activate production traffic |

## Summary

Deployment guides and checklists for shipping MenuList.ai to production (Vercel + Firebase). Vercel deploys remain opt-in per active session; use the production deployment checklist and External Certification Runbook as handoff/evidence guides, not as automatic deploy permission.

## Current MenuList Setup Status

| Area | Current state | Resume point |
| --- | --- | --- |
| QA infrastructure and keyless runtime | Configuration is prepared under the recorded one-maintainer exception. The custom Vercel `qa` environment tracks only branch `staging`; application-source release candidate `4cbe53d0691c74eec2b526a10519d4c882dccfd5` is Ready on deployment `menulist-core-6zootj7uq-neelvara-systems.vercel.app`. Both `menulist.digital/api/version` and `app.menulist.digital/api/version` returned that exact build identity with Vercel environment `preview`, which is the expected runtime label inside the custom `qa` environment. Earlier evidence proves canonical-host isolation and authenticated keyless runtime. App Check monitoring records verified Authentication and Firestore traffic; the dedicated Maps Embed-only key/host restrictions are prepared. The isolated company-team QA Redis database is Pay as You Go with a provider-confirmed USD 20 hard cap and no Prod Pack. | Hosted feature/provider certification remains open. Produce the authorized fixture and true-device evidence named in `menulist-staging-feature-certification.md`, one bounded verified Storage request, and the map-embed certification before App Check enforcement or Production promotion. Do not manufacture fixture traffic or enable enforcement early. |
| Production Google/Firebase foundation | Project `menulist-prod`, billing, budget, Blaze, `us-central1` Firestore and Storage, empty Authentication, Web app, required APIs, Workload Identity Federation, zero-key service account, Vercel Production selectors, the running zero-task `batch-image-generation` Cloud Tasks queue with QA-parity dispatch/retry limits, its queue-only `roles/cloudtasks.enqueuer` binding, Firestore PITR, App Check monitoring-mode registration, canonical Neelvara aliases, production OAuth/NextAuth, Gemini Paid Tier import, INR 750 cap, two service-account-bound Gemini credentials, the isolated `menulist-prod` Sentry project, the isolated `menulist-prod-rate-limit` Upstash database with a USD 20 hard cap and no Prod Pack, its sensitive Production-only Vercel variables and enabled `menulist-prod` Secret Manager versions, Upstash account MFA plus company-team enforcement and operational alerts, the frozen 13-event Razorpay production webhook contract, the temporarily shared company Test Mode Razorpay API pair, the complete current Functions secret manifest with a distinct production budget-webhook secret, the Maps Embed-only production key/host restrictions, and the MenuList-only managed-env/domain/Firebase Web/admitted-provider inventory are prepared. The MFA-protected `MenuList` Resend boundary is also prepared with verified outbound `menulist.ai` DNS, distinct QA/production sending-only keys and signed webhooks, and enabled version-1 product-scoped secrets in both Firebase projects. Optional provider paths are reviewed fail-closed, the non-secret Functions production env is prepared, the production revalidation secret is rotated consistently across Vercel and Secret Manager, and the maintained non-deploy source/configuration plus metadata-only separation gates pass; GA4, Telegram, external uptime monitoring, and production WhatsApp remain intentionally omitted. | Configuration is complete as far as the current no-deploy/no-testing/legal-document boundary allows. Razorpay Test Mode API credentials are wired only for a pre-live candidate; `PROD-D05`-`D07` remain open until truthful legal/KYC documents, dedicated Live Mode keys, and the endpoint-specific production webhook exist. `PROD-D09`-`D10` remain parked: do not reuse QA Meta assets, create production WhatsApp secrets, register a callback, enable messaging, or send. `PROD-D14` remains open until final business-owned provider controls exist. The next executable phase is the separately approved QA deploy/certification sequence, followed by the guarded production release; do not start Phase F traffic or provider activation from configuration status alone. |
| Production hosted OIDC proof | Provider, least-privilege IAM, production queue, and queue-scoped enqueuer preparation are complete, but no current Production deployment exists. The sole Vercel Production record is the failed August 11 deployment from obsolete commit `159005a3a0032cc24ba2d789b6f5cf8a18a7736e`; it is not release evidence. | Do not promote the QA artifact because its build identity is `preview`. After staging certification and explicit Vercel Production approval, create a true Production build and close `PROD-B11` by proving OIDC, Firebase Auth, Firestore, Storage, and one bounded Cloud Tasks operation. |
| Answerlattice | Deliberately pending. | Start only after MenuList production setup closes. |

### Document consolidation decision

`__docs__/deployment/` is already the single canonical setup folder. It contains
10 deployment documents with distinct responsibilities. During the recent
MenuList QA/production setup work, two new ledgers were added:
`menulist-staging-feature-certification.md` and
`menulist-production-provider-setup.md`; only the production provider ledger was
created specifically for the keyless migration. Do not combine or move these
files: the QA infrastructure ledger, hosted feature-certification ledger, and
production provider/release ledger carry different evidence and approval
boundaries. This README is the status hub that links them.

---

## Follow Docs In This Sequence

[Deployment README](./README.md)
Use this only as the index.

[MenuList Staging QA Setup Guide](./menulist-staging-qa-setup.md)
Follow this one file from top to bottom. It now starts with the permanent
domain purchase, Workspace email/DNS, break-glass and daily identities, and the
existing GitHub/Vercel integration, then covers the MenuList QA domain,
Firebase, billing/budgets, OAuth, provider accounts, branch-restricted env, Functions secrets,
deploy, crawler isolation, and smoke checklist. Its Phase I is the authority for
local rule emulation, the fresh rules/indexes/Storage deploy, deployed-state
readback, and real-auth allow/deny smoke before Functions. Tell Codex `QA-A01
done`, `QA-B04 done`, and so on; Codex will mark the live checklist and guide
the next item.

[MenuList Production Provider Setup](./menulist-production-provider-setup.md)
Use this live ledger after the QA infrastructure setup is reconciled. Inactive
production provider preparation may proceed while feature certification runs,
but its activation phase remains blocked until certification and the guarded
production release gates pass. Report exact `PROD-*` IDs one at a time.

[.env.production.example](../../.env.production.example)
Open this only when the production provider ledger reaches `PROD-E01`. It is
the canonical production key inventory. The only active cross-environment
credential exception is the explicitly recorded, temporary Razorpay Test Mode
API pair; never copy webhook secrets or other QA values into Production, upload
literal placeholders, or treat completed env entry as deploy approval.

[.env.staging.example](../../.env.staging.example)
Open this only when the QA guide reaches Phase G. Use it for both local and
Vercel Preview/Staging values as a key inventory; never upload its literal
placeholders or unrelated product rows.

[Domain Environment Setup](./domain-environment-setup.md)
Use this only as a reference while entering/checking URL env vars.

[Firebase Functions Secrets Setup](../../functions/src/envSetup.md)
Use this only when the QA guide reaches Phase H/I and a deployed Function asks
for a declared secret.

[Initial Account, Domain, Firebase, And Vercel Setup Guide](./initial-account-domain-firebase-setup-guide.md)
Do not follow this portfolio-wide guide during the first MenuList QA pass. Use
it as a cross-product reference after MenuList QA is verified. For MenuList
production execution, use the dedicated production provider ledger above.

[Three-Product Environment Setup](./three-product-environment-setup.md)
Do not follow this portfolio-wide technical checklist during MenuList QA. It is
a later cross-product reference.

When an older portfolio-wide reference conflicts with the live MenuList QA or
production ledger, the environment examples, or current source verifiers, stop
and follow the dedicated live ledger. Update the stale reference before
continuing rather than blending instructions from both documents.
