# Deployment — Documentation Hub

> **Category:** Infrastructure  
> **Last Updated:** August 2, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This hub links deployment runbooks; current release approval requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

---

## Documents

| Document | Purpose |
|----------|---------|
| [menulist-staging-qa-setup.md](./menulist-staging-qa-setup.md) | Sole first execution guide for MenuList local/staging setup: domain purchase, Workspace mail/DNS, break-glass/daily accounts, GitHub/Vercel Git access, QA domains on exact branch `staging`, branch-restricted Preview secrets, wildcard DNS preservation, `us-central1` Firebase resources, emulator-first local safety, all-host QA crawler isolation, billing/provider setup, Firebase rule emulator/deploy/readback/authenticated-smoke gates, and recurring ownership reviews |
| [initial-account-domain-firebase-setup-guide.md](./initial-account-domain-firebase-setup-guide.md) | Owner-facing one-time setup guide for domain purchase, Workspace, Google Cloud/Firebase projects, billing accounts, budget alerts before paid services/API keys, Vercel, DNS, provider accounts, env placement, and staging-before-production order |
| [three-product-environment-setup.md](./three-product-environment-setup.md) | Technical product/domain/account/env setup checklist for Neelvara, MenuList, Answerlattice, CampaignCue, SignalDesk, MyCodex, billing ownership, budget alerts, and provider spend guardrails |
| [production-deployment-checklist.md](./production-deployment-checklist.md) | Guarded production handoff checklist; routes external gates through the production-readiness runbook and does not authorize deploys without active approval |
| [domain-environment-setup.md](./domain-environment-setup.md) | Exact env variables for production, preview/staging, and localhost domain handling |

## Summary

Deployment guides and checklists for shipping MenuList.ai to production (Vercel + Firebase). Vercel deploys remain opt-in per active session; use the production deployment checklist and External Certification Runbook as handoff/evidence guides, not as automatic deploy permission.

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
it after MenuList QA is verified, when setting up production and the remaining
products.

[Three-Product Environment Setup](./three-product-environment-setup.md)
Do not follow this portfolio-wide technical checklist during MenuList QA. It is
a later cross-product reference.
