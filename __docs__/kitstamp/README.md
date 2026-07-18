# KitStamp - Documentation Hub

**Product:** KitStamp
**Product code:** `KS`
**Status:** Stage 1 planning docs only. Implementation not started. Product routes and Firebase targets are not active.
**Created:** May 31, 2026
**Product decision:** Treat KitStamp as a separate product, with separation discipline similar to Answerlattice.
**Naming lock:** Active implementation naming is only `KitStamp`, `kitstamp`, and `KS`.
**Current source gate:** `npm run verify:kitstamp-boundary`

---

## Current Decision

KitStamp should be designed as a separate product, not as a MenuList feature and not as a GrowthOS module.

The active definition is:

> KitStamp is a content readiness workspace that turns source images, text, translations, and review notes into human-approved Final Content Kits.

KitStamp prepares content before it is published elsewhere. It does not publish, schedule, manage live pages, or claim marketing outcomes.

## Naming And Activation Lock

Use only these active names and identifiers:

| Layer | Locked value |
| --- | --- |
| Public product brand | KitStamp |
| Product slug | `kitstamp` |
| Product code | `KS` |
| Local dev prefix | `/__kitstamp` |
| Public site route group | `src/app/sites/kitstamp/` |
| App/API namespace | `src/app/kitstamp/`, `src/app/api/kitstamp/` |
| Firebase target prefix | `kitstamp` |
| Functions package | `functions-kitstamp/` |
| Core artifact | Final Content Kit |
| User-facing artifact phrase | Approved Kit |

Implementation may begin only with foundation work:

- disabled feature flags
- product constants
- disabled route skeleton
- Firebase config, rules, indexes, and Storage skeleton
- KitStamp Firebase helpers
- types and constants
- DAL skeleton
- emulator/rules test skeleton

Do not start with provider generation, MenuList import, export adapters, guest review links, public launch, downstream API push, or billing-enabled provider calls.

The May 31, 2026 deep ChatGPT review is accepted only with limits:

- Export Templates are accepted as built-in, versioned packaging presets first.
- MenuList Snapshot Import is accepted as copied snapshots only, with manual refresh and no write-back.
- Export Adapters are accepted as file-based handoff packages only, not live integrations.
- Implementation starts with foundation and core workspace, not generation or integrations.

## Why It Should Exist

The market is moving fast in broad creative tools:

| Market evidence | KitStamp implication |
| --- | --- |
| Canva AI 2.0 moves from blank-page design into conversational, layered, editable, on-brand multi-channel outputs. Source: https://www.canva.com/newsroom/news/canva-create-2026-ai/ | Do not compete with Canva as a general design canvas or agentic campaign builder. |
| Canva Visual Suite 2.0 joins documents, videos, whiteboards, websites, spreadsheets, bulk create, resize, and photo editing in one suite. Source: https://www.canva.com/newsroom/news/canva-create-2025/ | Broad cross-format creative production is crowded; KitStamp must stay narrower. |
| Adobe Firefly Services and Creative Production focus on enterprise-grade on-brand content production, APIs, batch execution, video, 3D, and custom models. Source: https://news.adobe.com/news/2025/03/adobe-firefly-services-custom-models-unlock-on-brand-content-production | Enterprise content-supply-chain automation is already owned by Adobe-class platforms. KitStamp should target smaller operators and agencies that need kit readiness, not enterprise orchestration. |
| Adobe Firefly Services docs describe batch execution, progress tracking, per-asset results, and on-brand mixed-media APIs. Source: https://developer.adobe.com/firefly-services/docs/guides/ | KitStamp needs review, provenance, export, and cost discipline from day one. |
| Photoroom APIs focus on product-photo editing, background removal/replacement, relighting, consistent catalog output, and PIM/DAM/CMS/e-commerce workflow integration. Source: https://www.photoroom.com/api | KitStamp should not be only an image API. Its gap is source-to-kit readiness across image, copy, translation, review, and export. |
| Photoroom documentation recommends human validation when product accuracy matters. Source: https://docs.photoroom.com/ | KitStamp's human-approved Final Content Kit is the correct trust model. |

The gap is not "make an image" or "design a post." The gap is:

> "Prepare this product/menu/catalog content so a client, owner, or operator can approve it and hand it off without losing accuracy."

## Current Repo Evidence

| Existing foundation | Evidence |
| --- | --- |
| KitStamp already has product code reserved as `KS` | `src/constants/product.ts:11-17` |
| KitStamp has a disabled product-domain placeholder | `src/constants/productDomains.ts:99-108` |
| Deployment target matrix does not include KitStamp yet | `src/constants/deploymentTargets.ts:10-28` |
| Answerlattice is the separation model: shared Vercel app, separate product host and Firebase target | `__docs__/answerlattice/doctrine/08-product-separation-playbook.md:8-24` |
| Answerlattice separate-mode uses product-scoped sessions and does not make MenuList own Answerlattice data | `__docs__/answerlattice/doctrine/08-product-separation-playbook.md:26-37` |
| Multi-product tenancy already reserves `KS` for KitStamp | `__docs__/answerlattice/doctrine/07-multi-product-tenancy.md:25-38` |
| MenuList image generation has protected single-image, image-editing, and batch-image APIs | `src/app/api/image-generation/route.ts:24-100`, `src/app/api/image-editing/route.ts:73-146`, `src/app/api/image-generation/batch-trigger/route.ts:19-120` |
| Batch image worker already uses Cloud Tasks and capacity checks, but remains MenuList-scoped | `src/app/api/image-generation/batch-generation/route.ts:22-70` |
| Existing AI unit costs include image generation, batch image generation, image editing, translation, and rewrite costs | `src/constants/AI/unitCosts.ts:19-92` |

## Product Boundaries

| Boundary | Rule |
| --- | --- |
| MenuList | MenuList may become a client/source of KitStamp, but KitStamp must not write back into MenuList truth. |
| GrowthOS | GrowthOS produces immediate post/send/use actions. KitStamp prepares deliberate reviewed kits. |
| Answerlattice | Answerlattice governs support knowledge. KitStamp governs content readiness. They use similar separation patterns but do not share runtime data. |
| Website Asset Operating System | AssetOS is internal tooling for MenuList/Answerlattice website assets. KitStamp is a market-facing product. Do not merge them. |
| Canva/Adobe | KitStamp is not a canvas, design suite, or enterprise creative automation platform. |
| Photoroom | KitStamp is not only product photo automation. Images are one content unit in the kit. |

## What KitStamp Produces

The terminal artifact is a Final Content Kit.

A kit can contain:

- approved source image
- generated or edited visual variant
- plain product/menu description
- channel-specific caption
- translated variants
- alt text
- usage notes
- source provenance
- approval status
- export manifest
- ZIP or structured download package

The kit is exported and then used elsewhere. KitStamp does not publish it.

## What KitStamp Does Not Do

KitStamp will not:

- publish content
- schedule posts
- run ads
- manage live websites
- manage menus
- replace Canva, Adobe, Figma, DAM, CMS, PIM, or marketplace tools
- make claims without source facts
- auto-approve generated assets
- measure ROI
- optimize campaigns

## Answerlattice-Like Separation Target

KitStamp should follow the Answerlattice split pattern:

| Layer | KitStamp target |
| --- | --- |
| Product ID | `KS` |
| Public website | `src/app/sites/kitstamp/` when approved |
| Local dev path | `/__kitstamp` when enabled |
| Product host | `kitstamp.com` or approved final domain |
| Firebase local/preview | `kitstamp-qa` proposed |
| Firebase production | `kitstamp` proposed |
| Server functions | `functions-kitstamp/` proposed |
| Data ownership | root `pId: "KS"`, with `tId` and `sId` scope |
| Cross-product imports | copied snapshots with `sourceContext`, never live shared writes |

Do not activate the existing KitStamp product-domain placeholder until deployment targets, Firebase targets, public site, and host-header smoke tests are documented and verified.

The maintained source gate proves the current planning-only state: only the
reserved product code/domain placeholder exists, all KitStamp product-domain
flags remain false, and there is no route, API, Firebase config, rules/index
target, Functions package, environment namespace, provider call, billing flow,
or publishing runtime. A future implementation must intentionally update this
gate together with the approved foundation.

## Document Map

The active implementation contract is the standard KitStamp doc set below. Extra strategy, review, doctrine, naming-lock, decision-brief, implementation-lock, and archive docs have been removed from the active tree.

| Document | Purpose |
| --- | --- |
| [Specification](./kitstamp_spec.md) | Product requirements, ICP, scope, workflows, acceptance criteria. |
| [Implementation Plan](./kitstamp_impl.md) | Architecture, files, flags, APIs, routing, billing, and separation plan. |
| [Firebase Cost](./kitstamp_firebase.md) | Firestore, Storage, provider, functions, and billing cost plan. |
| [Mobile Support](./kitstamp_mobile-support.md) | Mobile admission, responsive scope, review-only mobile posture. |
| [Marketing Notes](./kitstamp_marketing.md) | Positioning, category, competitors, sales packaging. |
| [Website Copy](./kitstamp_website.md) | Candidate public website copy. |
| [Helpdoc](./kitstamp_helpdoc.md) | Candidate user help article. |
| [Test Cases](./kitstamp_test-cases.md) | Product, security, cost, mobile, export, and routing verification. |

## Implementation Gate

Before implementation:

- use this README plus `kitstamp_spec.md`, `kitstamp_impl.md`, `kitstamp_firebase.md`, and `kitstamp_test-cases.md` as the build contract
- provision or confirm the selected KitStamp Firebase targets
- keep all KitStamp flags default off
- build foundation and core workspace before generation or integrations
- keep provider calls blocked until credit values and margins are approved
- keep MenuList import snapshot-only
- keep export adapters file-only
- confirm public website copy against implemented capability
- confirm no direct publishing, scheduling, auto-approval, or MenuList write-back path

## Cost Impact Of This Documentation

No runtime Firebase cost change. This is documentation and planning only.
