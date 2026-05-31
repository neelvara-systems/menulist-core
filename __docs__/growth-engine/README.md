# Growth Engine - Documentation Hub

**Product:** Growth Engine
**Product code:** `GE` proposed, not implemented
**Status:** Stage 1 planning docs only. No product routes, Firebase targets, functions, or feature flags are active.
**Created:** May 31, 2026
**Product decision:** Treat Growth Engine as a separate internal acquisition product for MenuList lead generation, not as GrowthOS/Growth Kits and not as a MenuList owner feature.

---

## Current Decision

Growth Engine should be designed as separate acquisition infrastructure that helps MenuList find, qualify, contact, and route prospective businesses into existing MenuList onboarding flows.

The active definition is:

> Growth Engine is an internal acquisition control system that turns qualified lead supply into tracked MenuList onboarding starts and completions under strict cost, consent, suppression, and channel-safety rules.

It is not:

- GrowthOS / Growth Kits
- a customer-facing MenuList feature
- a CRM
- a generic SDR bot
- a website-demo factory
- an owner onboarding system
- a public business truth system

## Repo Strategy Recommendation

Use the same repo as a product-scoped monorepo module, but do not build it inside MenuList root folders and do not clone the MenuList repo.

| Option | Verdict | Reason |
| --- | --- | --- |
| Clone MenuList and build there | Reject | Duplicates security, auth, routing, Firebase, and onboarding contracts; creates drift exactly where lead attribution needs current MenuList truth. |
| Build as a normal MenuList feature | Reject | Acquisition data, PII, cold outreach, provider tokens, and campaign controls do not belong in owner/customer MenuList surfaces. |
| Same repo, separate product boundary | Recommended | Reuses shared auth/security/routing patterns while keeping code, Firebase, functions, routes, docs, and product identity isolated. |
| Separate repo later | Conditional | Use only after Growth Engine has its own team, deploy cadence, security boundary, or external product ambitions. |

The recommended first implementation shape is:

```txt
same git repo
separate product code folders
separate Firebase QA/prod projects
separate Cloud Functions package
separate product host when approved
one narrow MenuList integration contract for onboarding routes and feedback
```

## Why This Is Separate From GrowthOS

Existing docs lock GrowthOS as a MenuList paid add-on labelled Growth Kits. It produces ready-to-use local growth kits for existing MenuList clients from current MenuList truth.

Growth Engine is different:

| Product | User | Job | Output |
| --- | --- | --- | --- |
| MenuList | SMB owner/customer | Keep public business truth current | Menus, official pages, QR, screens, PDFs |
| GrowthOS / Growth Kits | Existing MenuList owner | Use current MenuList truth in a local action | Copy/share/print kit |
| KitStamp | Creator/operator | Prepare approved content kits | Final Content Kit |
| Growth Engine | Internal growth team | Acquire and route MenuList leads | Qualified lead, campaign, message, attribution, onboarding feedback |

Growth Engine may generate a lead preview or audit artifact, but that artifact is never MenuList truth and never a public claim about the business.

## Document Map

| Document | Purpose |
| --- | --- |
| [Decision Brief](./growth-engine_decision-brief.md) | Founder-level product and repo decision. |
| [ChatGPT Review](./growth-engine_chatgpt-review-2026-05-31.md) | Review of the attached conversation, accepted/rejected points, and risks. |
| [Operator Gap Audit](./growth-engine_gap-audit-2026-05-31.md) | Second-pass web-researched gap review from the perspective of operating the product. |
| [Specification](./growth-engine_spec.md) | Business requirements, scope, user flows, and acceptance criteria. |
| [Implementation Plan](./growth-engine_impl.md) | Architecture, file layout, modules, APIs, workers, and build order. |
| [Firebase Cost](./growth-engine_firebase.md) | Firestore, Storage, Cloud Tasks, provider, AI, and retention cost model. |
| [Mobile Support](./growth-engine_mobile-support.md) | Mobile admission result and emergency-only mobile posture. |
| [Marketing Notes](./growth-engine_marketing.md) | Internal positioning and pitch language. |
| [Website Copy](./growth-engine_website.md) | Public-website decision: no public page approved; internal copy only. |
| [Helpdoc](./growth-engine_helpdoc.md) | Internal operator help article. |
| [Test Cases](./growth-engine_test-cases.md) | Product, safety, security, cost, and integration test matrix. |
| [Doctrine](./doctrine/01-core-doctrine.md) | Core product doctrine. |
| [Non-Goals](./doctrine/02-non-goals-charter.md) | Permanent exclusions. |
| [Infrastructure Freeze](./doctrine/03-infrastructure-freeze-v1.md) | 3-year architecture target. |
| [Separation Playbook](./doctrine/04-product-separation-playbook.md) | Product and repo separation rules. |

## Implementation Gate

Before implementation starts:

- Confirm product code `GE` or choose another 2-character code.
- Confirm final internal name: recommended `Growth Engine`.
- Confirm first domain or internal route strategy; no public domain is required for the first build.
- Confirm Firebase projects: proposed `growth-engine-qa` and `growth-engine`.
- Confirm source policy registry: allowed sources, allowed fields, retention, raw payload rules, and approval owner.
- Confirm no Google Maps scraped content is rehosted, stored as canonical truth, or used to create public pages.
- Confirm email provider, sender domain, SPF/DKIM/DMARC readiness, unsubscribe endpoint, bounce handling, and spam-rate monitoring.
- Confirm WhatsApp posture remains assisted-only until opt-in proof, approved templates, and legal/channel review exist.
- Confirm jurisdiction/channel matrix for India, US, or both before campaign creation is implemented.
- Confirm global consent, unsubscribe, DNC, wrong-contact, and complaint ledger.
- Confirm first MenuList onboarding flow inventory.
- Confirm private/noindex artifact QA, expiry, owner complaint, and takedown workflow.
- Confirm provider decision matrix and vendor/data-processor register.
- Confirm AI eval datasets and pass thresholds for scoring, DNC, pricing, and message safety.
- Confirm incident severity, owner, evidence export, and kill-switch runbook.
- Confirm dry-run report is mandatory before any campaign launch.
- Confirm global kill switch and channel-level kill switches exist before any sending.
- Keep all feature flags default off.

Implementation must start with operating gates, not sending. Source policy, channel policy, sender readiness, suppression, onboarding inventory, artifact review, evals, and incident controls are first-slice requirements.

## Cost Impact Of This Documentation

No runtime Firebase cost change. This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.
