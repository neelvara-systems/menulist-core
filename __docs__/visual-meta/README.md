# VisualMeta - Documentation Hub

**Product:** VisualMeta
**Product code:** `VM`
**Status:** Stage 1 planning docs only. Implementation not started. Product routes and Firebase targets are not active.
**Created:** May 31, 2026
**Product decision:** Treat VisualMeta as a separate product, with separation discipline similar to Canonica.

---

## Current Decision

VisualMeta should be designed as a separate product, not as a MenuList feature and not as a GrowthOS module.

The active definition is:

> VisualMeta is a content readiness workspace that turns source images, text, translations, and review notes into human-approved Final Content Kits.

VisualMeta prepares content before it is published elsewhere. It does not publish, schedule, manage live pages, or claim marketing outcomes.

## Why It Should Exist

The market is moving fast in broad creative tools:

| Market evidence | VisualMeta implication |
| --- | --- |
| Canva AI 2.0 moves from blank-page design into conversational, layered, editable, on-brand multi-channel outputs. Source: https://www.canva.com/newsroom/news/canva-create-2026-ai/ | Do not compete with Canva as a general design canvas or agentic campaign builder. |
| Canva Visual Suite 2.0 joins documents, videos, whiteboards, websites, spreadsheets, bulk create, resize, and photo editing in one suite. Source: https://www.canva.com/newsroom/news/canva-create-2025/ | Broad cross-format creative production is crowded; VisualMeta must stay narrower. |
| Adobe Firefly Services and Creative Production focus on enterprise-grade on-brand content production, APIs, batch execution, video, 3D, and custom models. Source: https://news.adobe.com/news/2025/03/adobe-firefly-services-custom-models-unlock-on-brand-content-production | Enterprise content-supply-chain automation is already owned by Adobe-class platforms. VisualMeta should target smaller operators and agencies that need kit readiness, not enterprise orchestration. |
| Adobe Firefly Services docs describe batch execution, progress tracking, per-asset results, and on-brand mixed-media APIs. Source: https://developer.adobe.com/firefly-services/docs/guides/ | VisualMeta needs review, provenance, export, and cost discipline from day one. |
| Photoroom APIs focus on product-photo editing, background removal/replacement, relighting, consistent catalog output, and PIM/DAM/CMS/e-commerce workflow integration. Source: https://www.photoroom.com/api | VisualMeta should not be only an image API. Its gap is source-to-kit readiness across image, copy, translation, review, and export. |
| Photoroom documentation recommends human validation when product accuracy matters. Source: https://docs.photoroom.com/ | VisualMeta's human-approved Final Content Kit is the correct trust model. |

The gap is not "make an image" or "design a post." The gap is:

> "Prepare this product/menu/catalog content so a client, owner, or operator can approve it and hand it off without losing accuracy."

## Current Repo Evidence

| Existing foundation | Evidence |
| --- | --- |
| VisualMeta already has product code reserved as `VM` | `src/constants/product.ts:11-17` |
| VisualMeta has a disabled product-domain placeholder | `src/constants/productDomains.ts:99-108` |
| Deployment target matrix does not include VisualMeta yet | `src/constants/deploymentTargets.ts:10-28` |
| Canonica is the separation model: shared Vercel app, separate product host and Firebase target | `__docs__/canonica/doctrine/08-product-separation-playbook.md:8-24` |
| Canonica separate-mode uses product-scoped sessions and does not make MenuList own Canonica data | `__docs__/canonica/doctrine/08-product-separation-playbook.md:26-37` |
| Multi-product tenancy already reserves `VM` for VisualMeta | `__docs__/canonica/doctrine/07-multi-product-tenancy.md:25-38` |
| MenuList image generation has protected single-image, image-editing, and batch-image APIs | `src/app/api/image-generation/route.ts:24-100`, `src/app/api/image-editing/route.ts:73-146`, `src/app/api/image-generation/batch-trigger/route.ts:19-120` |
| Batch image worker already uses Cloud Tasks and capacity checks, but remains MenuList-scoped | `src/app/api/image-generation/batch-generation/route.ts:22-70` |
| Existing AI unit costs include image generation, batch image generation, image editing, translation, and rewrite costs | `src/constants/AI/unitCosts.ts:19-92` |

## Product Boundaries

| Boundary | Rule |
| --- | --- |
| MenuList | MenuList may become a client/source of VisualMeta, but VisualMeta must not write back into MenuList truth. |
| GrowthOS | GrowthOS produces immediate post/send/use actions. VisualMeta prepares deliberate reviewed kits. |
| Canonica | Canonica governs support knowledge. VisualMeta governs content readiness. They use similar separation patterns but do not share runtime data. |
| Website Asset Operating System | AssetOS is internal tooling for MenuList/Canonica website assets. VisualMeta is a market-facing product. Do not merge them. |
| Canva/Adobe | VisualMeta is not a canvas, design suite, or enterprise creative automation platform. |
| Photoroom | VisualMeta is not only product photo automation. Images are one content unit in the kit. |

## What VisualMeta Produces

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

The kit is exported and then used elsewhere. VisualMeta does not publish it.

## What VisualMeta Does Not Do

VisualMeta will not:

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

## Canonica-Like Separation Target

VisualMeta should follow the Canonica split pattern:

| Layer | VisualMeta target |
| --- | --- |
| Product ID | `VM` |
| Public website | `src/app/sites/visualmeta/` when approved |
| Local dev path | `/__visualmeta` when enabled |
| Product host | `visualmeta.app` or approved final domain |
| Firebase local/preview | `visualmeta-qa` proposed |
| Firebase production | `visualmeta` proposed |
| Server functions | `functions-visualmeta/` proposed |
| Data ownership | root `pId: "VM"`, with `tId` and `sId` scope |
| Cross-product imports | copied snapshots with `sourceContext`, never live shared writes |

Do not activate the existing VisualMeta product-domain placeholder until deployment targets, Firebase targets, public site, and host-header smoke tests are documented and verified.

## Document Map

| Document | Purpose |
| --- | --- |
| [Decision Brief](./visual-meta_decision-brief.md) | Founder-level why/where/who/how decision. |
| [Specification](./visual-meta_spec.md) | Product requirements, ICP, scope, workflows, acceptance criteria. |
| [Implementation Plan](./visual-meta_impl.md) | Architecture, files, flags, APIs, routing, billing, and separation plan. |
| [Firebase Cost](./visual-meta_firebase.md) | Firestore, Storage, provider, functions, and billing cost plan. |
| [Mobile Support](./visual-meta_mobile-support.md) | Mobile admission, responsive scope, review-only mobile posture. |
| [Marketing Notes](./visual-meta_marketing.md) | Positioning, category, competitors, sales packaging. |
| [Website Copy](./visual-meta_website.md) | Candidate public website copy. |
| [Helpdoc](./visual-meta_helpdoc.md) | Candidate user help article. |
| [Test Cases](./visual-meta_test-cases.md) | Product, security, cost, mobile, export, and routing verification. |
| [Doctrine](./doctrine/01-core-doctrine.md) | Core identity and pillars. |
| [Non-Goals](./doctrine/02-non-goals-charter.md) | Permanent exclusions. |
| [Infrastructure Freeze](./doctrine/03-infrastructure-freeze-v1.md) | 3-year architecture freeze target. |
| [Separation Playbook](./doctrine/04-product-separation-playbook.md) | Canonica-like product separation plan. |

## Historical Docs

The previous single-file VisualMeta strategy is archived at:

```txt
__docs__/visual-meta/_archive/visual-meta-strategy-2026-05-31.md
```

The original ChatGPT review remains at:

```txt
__docs__/visual-meta/_archive/chatgpt-review.md
```

## Implementation Gate

Before implementation:

- confirm domain strategy
- confirm separate Firebase target names
- confirm billing plan names and credit accounting
- confirm whether VisualMeta uses Google models only or abstracts provider choice
- confirm source import rules from MenuList and external clients
- confirm public website copy
- confirm no direct publishing or scheduling
- confirm no MenuList write-back path

## Cost Impact Of This Documentation

No runtime Firebase cost change. This is documentation and planning only.
