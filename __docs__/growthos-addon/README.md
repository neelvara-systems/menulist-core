# GrowthOS Add-on - Documentation Hub

**Feature:** GrowthOS Add-on for MenuList higher-tier clients
**Owner-facing label:** Growth Kits
**Status:** Stage 1 planning docs only. Implementation not started. Feature flag must default off.
**Created:** May 31, 2026
**Product decision:** Build inside MenuList as a paid add-on, not as a standalone product.

---

## May 31, 2026 Deep Review Update

The large ChatGPT GrowthOS conversation was reviewed line by line and archived here:

```txt
__docs__/growthos-addon/_archive/growthos-deep-conversation-review-2026-05-31.md
```

Final decision from that review:

| Feature/angle | Decision |
| --- | --- |
| Do This Now Inbox | V1 core |
| Menu Truth Readiness Checklist | V1 core |
| Owner Voice basics | V1 core |
| Compliance Preflight | V1 core |
| One Kit to Multiple Handoffs | V1 core |
| Staff Brief Pack | V1 core |
| Basic export logging | V1 core, execution signals only |
| Latest kit visible after refresh/generation failure | V1 core mobile resilience |
| Review reply from pasted text | Guarded optional V1, triage-first, no ingestion |
| Existing Image Adaptation | Pilot extension after core text/staff loop |
| Owner-Confirmed Offer Builder | Deferred; creates new business truth |
| Customer FAQ Reply Snippets | P2 pilot-dependent |
| Photo Capture Prompts | P2 pilot-dependent |
| Multi-Outlet Localized Kits | P2 pilot-dependent |
| Used History UI | P2 pilot-dependent; no ROI |
| Advanced low-data/offline behavior | P2 pilot-dependent |

The implementation plan should start only with the V1 core loop:

> MenuList finds one useful action, checks truth, creates one kit, and the owner copies/shares/downloads/prints/marks it used.

## Decision Summary

GrowthOS should move forward as a MenuList higher-tier add-on because MenuList already owns the hard part: current menu truth, store status, item availability, images, public links, and owner context.

It should not compete with Canva, Adobe, Google Pomelli, schedulers, or agency tools. Those products start from a blank creative surface or a brand profile. GrowthOS starts from the live MenuList truth and returns a ready-to-use local action kit for the business owner.

The practical owner job is:

> "Give me something accurate I can post, send, print, or say today from my real menu."

## What GrowthOS Is Now

GrowthOS is a paid MenuList add-on that turns verified MenuList truth into short, ready-to-use local growth kits.

It produces:

- WhatsApp status or message copy
- Google Business Profile update drafts
- Instagram caption drafts
- Staff Brief Pack lines for today's counter/team guidance
- printable poster or QR tent copy
- guarded review reply drafts only when the owner supplies review text

It does not publish automatically. It does not write MenuList menu truth. It does not claim revenue lift or campaign ROI.

## What Changed From Old Docs

The older GrowthOS docs treated GrowthOS as a possible separate product or command center. That is no longer the active implementation plan.

Current decision:

| Area | Current active decision |
| --- | --- |
| Product form | MenuList paid add-on for higher-tier clients |
| Public owner label | Growth Kits |
| Standalone app/domain | Not approved |
| Direct posting | Disabled |
| Weekly Growth Pack | Still paused as-is; may inform GrowthOS kit templates |
| VisualMeta | Separate product decision; not part of GrowthOS |

Old docs remain historical direction and are now archived under this folder:

- `__docs__/growthos-addon/_archive/growth-execution-strategy-2026-05-31/`
- `__docs__/growthos-addon/_archive/growthos-command-center-2026-05-31/`
- `__docs__/strategy/product-positioning-map.md`

This folder is now the active GrowthOS implementation-planning source.

## Why This Is Worth Building

| Evidence | What it means for GrowthOS |
| --- | --- |
| Google Pomelli launched for SMB social campaign generation, using a business website to build brand DNA and generate campaign ideas/assets. Source: https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/ | Generic SMB marketing generation is real and crowded. MenuList must differentiate through live menu truth, not generic campaign creation. |
| Canva AI 2.0 is moving toward conversational, agentic, multi-channel campaign creation, scheduling, web research, and brand intelligence. Source: https://www.canva.com/newsroom/news/canva-create-2026-ai/ | GrowthOS should not become a creative agent, scheduler, brand workspace, or campaign suite. |
| Canva Visual Suite 2.0 emphasizes cross-format campaign creation and Magic Studio scale. Source: https://www.canva.com/newsroom/news/canva-create-2025/ | Broad creative suites are moving fast. GrowthOS should avoid canvas/design workflows and stay output-first. |
| Constant Contact reported 68 percent of surveyed SMBs expected to increase marketing budgets and 74 percent expected to spend more time on marketing in 2026. Source: https://www.constantcontact.com/news/2026-02-11-small-businesses-double-down-for-2026-majority-plan-to-increase-marketing-budgets-to-combat-inflation | SMBs are willing to spend, but they need efficiency and usable output, not more dashboards. |
| BrightLocal reported AI local recommendations rising from 6 percent in 2025 to 45 percent in 2026, with consumers still fact-checking reviews and source material. Source: https://www.brightlocal.com/research/lcrs-ai-trust/ | Local truth consistency matters more, not less. GrowthOS should amplify accurate, current business facts. |
| Google Business Profile supports owner posts for updates, offers, events, photos, and links, but posts are reviewed and can be rejected. Source: https://support.google.com/business/answer/7342169?hl=en | GrowthOS can prepare compliant drafts, but direct posting must stay disabled until policy and API paths are proven. |

## Current Repo Evidence

| Existing foundation | Evidence |
| --- | --- |
| Today/Social Content already exists and is enabled as the owner action surface | `src/config/features.ts:290-326` |
| Campaign types and execution surfaces already model post/send/print/display outputs | `src/types/campaigns.ts:7-58` |
| Today summary uses a one-read Firestore pattern | `src/types/campaigns.ts:195-250`, `src/database/campaigns/index.ts:49-113` |
| Campaign engine already generates candidates from available menu items | `src/lib/campaigns/engine.ts:270-398` |
| Campaign generation API already uses auth, rate limiting, validation, tenant checks, and project menu data | `src/app/api/campaigns/generate/route.ts:25-155` |
| Caption generation already uses AI capacity checks and records AI operations | `src/app/api/campaigns/caption/route.ts:31-214` |
| AI capacity is checked before provider calls | `src/lib/ai/capacityCheck.ts:71-144` |
| AI unit costs already include campaign captions, review reply suggestions, and image generation | `src/constants/AI/unitCosts.ts:19-92` |
| Direct posting is already explicitly disabled for Social Content | `src/config/features.ts:385-399` |
| The Today Weekly Growth Pack is paused and flag-off | `src/config/features.ts:401-420` |
| GBP Sync remains feature-flagged and blocked on API access | `__docs__/gbp-sync/README.md:1-24`, `src/config/features.ts:656-673` |
| Reviews and reputation docs remain API-blocked for ingestion | `__docs__/reviews-reputation/README.md:1-23`, `__docs__/reviews-reputation/README.md:75-90` |
| VisualMeta is content preparation, not immediate growth execution | `__docs__/visual-meta/README.md:1-12`, `__docs__/strategy/product-positioning-map.md:28-68` |

## Active Scope

The first approved implementation should be a paid add-on module inside MenuList that:

1. Reads current MenuList truth.
2. Ranks one or more immediate local action opportunities.
3. Builds a Growth Kit for one selected action.
4. Lets the owner copy, download, share, or print the output.
5. Records only execution signals such as copied, downloaded, or printed.
6. Never claims business outcome, order lift, or ROI.
7. Gives staff a short, current line for what to suggest or avoid today.
8. Keeps the latest usable kit visible on mobile when refresh or generation fails.

## Product Boundaries

| Boundary | Rule |
| --- | --- |
| MenuList truth | GrowthOS reads it but does not change it. If facts are wrong, send the owner to the approved MenuList edit flow. |
| Today | Today remains the quiet daily operational surface. GrowthOS can be entered from Today for paid users but should not replace Today. |
| Social Content | Reuse its campaign engine and export patterns where possible. Do not duplicate before auditing existing code. |
| VisualMeta | Excluded. VisualMeta prepares deliberate multi-asset content kits. GrowthOS produces immediate local action kits. |
| GBP | Draft only until API access and policy handling are approved. |
| Reviews | Manual paste reply assist can be part of GrowthOS; review ingestion depends on GBP access. |
| Direct posting | Disabled. Manual copy/download/export only. |
| Public claims | No "AI-powered", no revenue promises, no auto-posting claims. |

## Document Map

| Document | Purpose |
| --- | --- |
| [Decision Brief](./growthos-addon_decision-brief.md) | Founder-level product decision, market gap, and recommendation. |
| [Specification](./growthos-addon_spec.md) | What, why, who, where, how, and acceptance criteria. |
| [Implementation Plan](./growthos-addon_impl.md) | Feature flags, data model, APIs, UI, security, and rollout contract. |
| [Firebase Cost](./growthos-addon_firebase.md) | Firestore, Storage, AI unit, scheduler, and index cost planning. |
| [Mobile Support](./growthos-addon_mobile-support.md) | Mobile admission, UX, touch, and parity requirements. |
| [Marketing Notes](./growthos-addon_marketing.md) | Packaging, sales positioning, competition, and pricing shape. |
| [Website Content](./growthos-addon_website.md) | Candidate public website/pricing copy for MenuList add-on pages. |
| [Helpdoc](./growthos-addon_helpdoc.md) | Candidate owner help article. |
| [Test Cases](./growthos-addon_test-cases.md) | Product, security, cost, desktop, mobile, and docs verification matrix. |

## Implementation Gate

Before code starts:

- Confirm add-on entitlement model and plan names.
- Confirm public owner label: recommended `Growth Kits`.
- Confirm no standalone route/domain.
- Confirm `ENABLE_GROWTHOS_ADDON` defaults to `false`.
- Confirm direct posting remains disabled.
- Confirm initial outputs use manual copy/download/export only.
- Confirm review support starts with manual owner-pasted review text only.
- Confirm no new scheduler is added.

## Cost Impact Of This Documentation

No runtime Firebase cost change. This is documentation and planning only.
