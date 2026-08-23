# Deployment — Documentation Hub

> **Category:** Infrastructure  
> **Last Updated:** August 23, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This hub links deployment runbooks; current release approval requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

---

## Documents

| Document | Purpose |
|----------|---------|
| [firebase-rules-publication.md](./firebase-rules-publication.md) | Default Firestore Security Rules publication contract: canonical source versus deterministic product artifact, local behavior gates, rules-only Firebase CLI deployment, exact active readback, and the HTTP 503/compiler-complexity recovery path |
| [menulist-staging-qa-setup.md](./menulist-staging-qa-setup.md) | Sole first execution guide for MenuList local/staging setup: domain purchase, Workspace mail/DNS, the single company owner/operator account, GitHub/Vercel Git access, QA domains on exact branch `staging`, the branch-restricted custom `qa` environment, wildcard DNS preservation, `us-central1` Firebase resources, emulator-first local safety, all-host QA crawler isolation, billing/provider setup, Firebase rule emulator/deploy/readback/authenticated-smoke gates, and recurring ownership reviews |
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
| Production Google/Firebase foundation | Project `menulist-prod`, billing, budget, Blaze, `us-central1` Firestore and Storage, empty Authentication, Web app, required APIs, Workload Identity Federation, zero-key service account, Vercel Production selectors, the running zero-task `batch-image-generation` Cloud Tasks queue with QA-parity dispatch/retry limits, its queue-only `roles/cloudtasks.enqueuer` binding, Firestore PITR, App Check monitoring-mode registration, canonical Neelvara aliases, production OAuth/NextAuth, Gemini Paid Tier import, INR 750 cap, two service-account-bound Gemini credentials, the isolated `menulist-prod` Sentry project, the isolated `menulist-prod-rate-limit` Upstash database with a USD 20 hard cap and no Prod Pack, its sensitive Production-only Vercel variables and enabled `menulist-prod` Secret Manager versions, Upstash account MFA plus company-team enforcement and operational alerts, the frozen 13-event Razorpay production webhook contract, the temporarily shared company Test Mode Razorpay API pair, the complete current Functions secret manifest with a distinct production budget-webhook secret, the Maps Embed-only production key/host restrictions, and the MenuList-only managed-env/domain/Firebase Web/admitted-provider inventory are prepared. The MFA-protected `MenuList` Resend boundary is also prepared with verified outbound `menulist.ai` DNS, distinct QA/production sending-only keys and signed webhooks, and enabled version-1 product-scoped secrets in both Firebase projects. The production revalidation secret is rotated consistently across Vercel and Secret Manager. Storage rules, all 166 declared Firestore composite indexes and field overrides, and the four WhatsApp-independent Functions targets are deployed; callable transport reaches application-level auth, while the event target remains private. Optional provider paths remain fail-closed; GA4, Telegram, external uptime monitoring, and production WhatsApp remain intentionally omitted. | MenuList-only Firestore Security Rules are deployed from generated `firestore-menulist.rules`; production Rules API compilation returned zero issues and active ruleset `d932770a-eebf-4875-9bab-d9382badf875` read back with exact SHA-256 `54f4f2eaf63ba0ddda737742f405072b9cb6f6261450e0591ef9bef9a97a98ec`. Razorpay Test Mode API credentials remain a pre-live exception; `PROD-D05`-`D07` require truthful legal/KYC documents, dedicated Live Mode keys, and the endpoint-specific production webhook. `PROD-D09`-`D10` remain parked with no production WhatsApp secret/callback/send. `PROD-D14`, final hosted OIDC data-path proof, deferred QA certification, App Check enforcement, OAuth publishing, and final launch certification remain open. |
| Production deployment and domains | Exact release commit `32d1a0605adae6f2d9c6881fa52fda1254f1b840` is Ready on Vercel Production deployment `dpl_Eay11a4cM7Szb33cqEgYjnDVy3Yj`. `menulist.ai`, `www.menulist.ai`, and `app.menulist.ai` return that exact `/api/version` identity over TLS. `menulist.online` and `www.menulist.online` are exact 301 redirects to `menulist.ai`; `*.menulist.online` serves tenant routing. The `.online` DMARC policy was preserved before switching the zone to Vercel nameservers. A misassigned Production Sentry DSN was corrected from the company-owned project and redeployed; the fresh auth-boundary smoke no longer emits the invalid-DSN error. | Monitor residual DNS-cache expiry for resolvers that retained the former parked `.online` apex during its old TTL. Do not treat domain readiness as authorization for live Razorpay, WhatsApp, App Check enforcement, OAuth publishing, or launch announcement. |
| Production hosted OIDC proof | Provider, least-privilege IAM, production queue, queue-scoped enqueuer preparation, zero-key readback, and a real Production deployment are complete. The current unauthenticated auth-route smoke proves the Production server bundle and application auth boundary, but it does not prove authenticated custom-token signing, Firestore, Storage, or Cloud Tasks. | Close `PROD-B11` only with an authorized bounded authenticated production proof covering OIDC/STS, Firebase Auth custom-token signing, Firestore, Storage object lifecycle, and one non-business Cloud Tasks enqueue/cleanup operation. Do not create production business fixtures merely to make this row green. |
| Answerlattice QA and production | Company-owned QA and production projects, domains, Firebase foundations, keyless Vercel identities, budgets, rules, Storage rules, indexes, App Check monitoring registrations, and 12 approved core Functions per project are prepared. QA and production use independent AI Studio authorization keys, with exactly one current authorization key retained per project. Both Canonica aliases and the Answerlattice production apex return verified build provenance in their expected Vercel environments; production `www` redirects permanently to the apex. The deployed QA and production Functions contain the recovered compiled-context fail-closed ordering, source matches them byte-for-byte, and the restored Next.js mirror plus deterministic local fixture are released to Vercel QA. | Use the [Answerlattice live setup ledger](../answerlattice/deployment/answerlattice-environment-setup-checklist.md). Remaining cloud work is certification and release governance: authenticated fixture/data-path proof, recovery fixture and TTL reapplication evidence, Storage/Auth recovery evidence, physical/browser/provider checks, and approved recovery-database cleanup. Production promotion of the restored Next.js mirror still requires an explicitly authorized `main` release; no Firebase Functions redeployment is required for that exact patch. |

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
domain purchase, Workspace email/DNS, the single company identity, and the
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
