# Growth Engine - Documentation Hub

**Product:** Growth Engine, with `MenuNexus` recommended as the naming candidate after preliminary availability checks
**Product code:** `GE` proposed, not implemented; `MN` recommended if `MenuNexus` is secured before implementation
**Status:** Planning docs only. No product routes, Firebase targets, functions, or feature flags are active.
**Created:** May 31, 2026
**Product decision:** Treat Growth Engine as MenuList-owned distribution automation infrastructure, not as a generic lead-gen stack, not as GrowthOS/Growth Kits, and not as a MenuList owner feature.

---

## Current Decision

Growth Engine should be designed as separate distribution automation infrastructure that helps MenuList find distribution targets, detect menu truth gaps, route owners into claim/onboarding, activate canonical MenuList truth, publish owned surfaces, notify discovery systems, monitor freshness, and measure distribution coverage.

The active definition is:

> Growth Engine is the internal MenuList distribution automation system that turns qualified business targets into claimed MenuList truth, owned public surfaces, discovery feeds, channel-safe owner routes, freshness monitoring, and attribution.

It is not:

- GrowthOS / Growth Kits
- a customer-facing MenuList feature
- a CRM
- a generic SDR bot
- a third-party growth tool wrapper
- a website-demo factory
- an owner onboarding system
- a replacement for MenuList's public business truth system

## MenuList Production Validation Gate

Growth Engine must not move into aggregator-style public listing outreach until MenuList is proven with real production owners.

Current allowed posture:

- use the WhatsApp Claim/Invite kit only for owners who came through MenuList claim, verification, onboarding, inbound WhatsApp, existing customer, or founder-led consent contexts
- keep public listing and aggregator-source ideas as blocked planning paths
- use real MenuList production owner behavior to validate the core product before expanding acquisition infrastructure

Blocked until that gate is met:

- public listing lead aggregation as an execution path
- cold WhatsApp outreach from public or enriched phone numbers
- broad source-provider outreach runs
- treating Google, Instagram, Maps, Foursquare, Apify-like, CSV, or other public/source-provider data as permission to message
- scaling Growth Engine send infrastructure before MenuList activation, retention, and owner value are proven with real users

## Repo Strategy Recommendation

Use the same repo as a product-scoped monorepo module, but do not build it inside MenuList root folders and do not clone the MenuList repo.

| Option | Verdict | Reason |
| --- | --- | --- |
| Clone MenuList and build there | Reject | Duplicates security, auth, routing, Firebase, and onboarding contracts; creates drift exactly where lead attribution needs current MenuList truth. |
| Build as a normal MenuList feature | Reject | Acquisition data, PII, cold outreach, provider tokens, and campaign controls do not belong in owner/customer MenuList surfaces. |
| Same repo, separate product boundary | Recommended | Reuses shared auth/security/routing patterns while keeping code, Firebase, functions, routes, docs, and product identity isolated. |
| Separate repo after independence | Conditional | Use only if Growth Engine has its own team, deploy cadence, security boundary, or external product ambitions. |

The recommended first implementation shape is:

```txt
same git repo
separate product code folders
separate Firebase QA/prod projects
separate Cloud Functions package
separate product host when approved
one narrow MenuList integration contract for onboarding routes and feedback
owned distribution contracts for public surfaces, sitemaps, feeds, truth packets, GBP handoff, and attribution
```

## Why This Is Separate From GrowthOS

Existing docs lock GrowthOS as a MenuList paid add-on labelled Growth Kits. It produces ready-to-use local growth kits for existing MenuList clients from current MenuList truth.

Growth Engine is different:

| Product | User | Job | Output |
| --- | --- | --- | --- |
| MenuList | SMB owner/customer | Keep public business truth current | Menus, official pages, QR, screens, PDFs |
| GrowthOS / Growth Kits | Existing MenuList owner | Use current MenuList truth in a local action | Copy/share/print kit |
| KitStamp | Creator/operator | Prepare approved content kits | Final Content Kit |
| Growth Engine | Internal growth/distribution team | Acquire, activate, distribute, and monitor MenuList truth | Distribution target, claim route, canonical surface, feed/ping, channel route, attribution, freshness health |

Growth Engine may generate a lead preview or audit artifact, but that artifact is never MenuList truth and never a public claim about the business. Public distribution starts only after owner confirmation or an approved MenuList verification path.

## Document Map

| Document | Purpose |
| --- | --- |
| [Decision Brief](./growth-engine_decision-brief.md) | Founder-level product and repo decision. |
| [ChatGPT Review](./growth-engine_chatgpt-review-2026-05-31.md) | Review of the attached conversation, accepted/rejected points, and risks. |
| [Distribution Architecture](./growth-engine_distribution-architecture.md) | New direction lock: lead gen becomes MenuList-owned distribution infrastructure. |
| [Automation Workflow Blueprint](./growth-engine_automation-workflow-blueprint.md) | Implementation-ready automation model based on researched GTM workflows and MenuList-specific distribution needs. |
| [Connections And Activation Screen](./growth-engine_connections-activation-screen.md) | Internal control screen for adapter IDs, provider credentials, email pipeline, WhatsApp pipeline, webhooks, budgets, kill switches, and activation gates. |
| [Implementation Readiness](./growth-engine_implementation-readiness.md) | Final implementation-entry contract covering route inventory, UI states, RBAC, flags, env keys, Firestore rules/indexes, seed config, use cases, API/UI/test checklists, and stop conditions. |
| [Google Places Source Policy](./growth-engine_google-places-source-policy.md) | Controlled use of Google Places as a cost-gated candidate source and place identity adapter. |
| [Foursquare Source Policy](./growth-engine_foursquare-source-policy.md) | Controlled use of Foursquare as an identity/category/chain graph signal, with PAYG outreach restrictions blocked by default. |
| [WhatsApp Governance Policy](./growth-engine_whatsapp-governance-policy.md) | Controlled use of WhatsApp as a consented owner-verification and truth-maintenance rail, not bulk outreach. |
| [Naming Shortlist](./growth-engine_naming-shortlist.md) | Recommended product name after preliminary domain, search, and company-name availability signals. |
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

## Implementation Readiness

The docs are ready for implementation planning with these locked decisions:

- Product name remains `Growth Engine` until `MenuNexus` is purchased and company-name checks clear.
- Product code is `GE` for first implementation. Reserve `MN` only if the rename is secured before product constants are added.
- Route strategy is internal/admin only. No public Growth Engine site or host.
- Firebase projects are `growth-engine-qa` and `growth-engine`.
- Connections And Activation is required before provider execution. It owns adapter IDs, secret references, email pipeline readiness, WhatsApp pipeline readiness, webhooks, budgets, kill switches, validation, and activation state.
- Email adapter is Amazon SES first, with `reach.menulist.ai` or equivalent dedicated subdomain.
- Jurisdiction policy supports India, US, and `GLOBAL_REVIEW` records.
- Manual CSV is mandatory; Google Places and Apify-like adapters are candidate-discovery only after source policy approval.
- Google Places may persist place IDs, request metadata, and decision state only; broader Places content must not become durable MenuList truth or public output.
- Foursquare Places API pay-as-you-go data must not be used to contact listed businesses as prospects unless a separate contract or written permission explicitly allows it.
- Foursquare is useful as an identity/category/chain graph signal. It can create candidate graph edges, not MenuList truth.
- Business Truth Graph is a required implementation model: Growth Engine creates candidate business/location/menu/surface/source edges, and MenuList creates confirmed truth edges.
- MenuList canonical surface resolver/bridge owns public URL truth. Growth Engine must not hardcode public URL patterns.
- Google Business Profile, Apple Business Connect, and Bing Places are owner-authorized distribution handoffs only.
- WhatsApp remains assisted unless explicit opt-in, approved templates, provider readiness, and policy review exist.
- WhatsApp API sending requires a Message Governance Layer: consent ledger, suppression ledger, template registry, conversation-window state, webhook ingestion, reputation monitor, sender identity policy, and kill switches.
- WhatsApp is reserved for expected owner verification, claim recovery, support, and truth-maintenance journeys. Public phone availability or enriched phone data is not WhatsApp opt-in.
- WhatsApp Flows may collect structured owner-confirmed business truth after consent and policy approval; they must not become generic AI chat or lead resale intake.
- All feature flags stay default off.

Implementation must include owned distribution gates, owned automation gates, and connection activation gates, not only sending gates. Source policy, channel policy, adapter registry, provider secrets, sender readiness, suppression, target registry, workflow engine, enrichment waterfalls, decision snapshots, AI worker registry, canonical surface publishing, discovery publishing, menu feed export readiness, onboarding inventory, artifact review, evals, and incident controls are launch-baseline requirements.

Before code starts, use [Implementation Readiness](./growth-engine_implementation-readiness.md) as the final checklist. It defines the required internal routes, screen states, role matrix, feature flags, environment keys, secret handling, Firestore rules/index expectations, seed records, use cases, API guards, UI guards, tests, and stop conditions.

The only non-code blocker is external: purchase/protect `menunexus.com` and complete final MCA/company-name and trademark checks before renaming product constants, folders, Firebase projects, or public-facing assets.

## Cost Impact Of This Documentation

No runtime Firebase cost change. This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.
