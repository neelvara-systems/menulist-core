# GrowthOS Add-on - Documentation Hub

**Feature:** GrowthOS plan-gated module for MenuList Pro/Premium clients
**Owner-facing label:** Growth Kits
**Mobile Today label:** Today's Sales Pack
**Status:** Enabled behind Pro/Premium entitlement gate.
**Created:** May 31, 2026
**Product decision:** Build inside MenuList as a Pro/Premium plan feature, not as a standalone product.

---

## Boundary Note - GrowthOS vs Growth Engine

GrowthOS/Growth Kits is not the new Growth Engine acquisition product.

| Product | Active meaning |
| --- | --- |
| GrowthOS / Growth Kits | MenuList Pro/Premium feature for existing higher-tier clients. It turns current MenuList truth into copy/share/print kits. |
| Growth Engine | Separate internal acquisition product for MenuList lead generation, outreach safety, tracked onboarding, and attribution. Active docs: `__docs__/growth-engine/README.md`. |

Do not reuse GrowthOS routes, `GR` product identity, entitlement model, owner UI, or docs for Growth Engine implementation.

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

GrowthOS should move forward as a MenuList Pro/Premium plan feature because MenuList already owns the hard part: current menu truth, store status, item availability, images, public links, and owner context.

It should not compete with Canva, Adobe, Google Pomelli, schedulers, or agency tools. Those products start from a blank creative surface or a brand profile. GrowthOS starts from the live MenuList truth and returns a ready-to-use local action kit for the business owner.

The practical owner job is:

> "Give me something accurate I can post, send, print, or say today from my real menu."

June 1 product posture:

- GrowthOS is not the main MenuList feature.
- It is not a homepage promise or standalone product.
- It is a quiet Pro/Premium retention and upsell layer after official menu truth exists.
- Broader public placement requires real pilot usage.
- If 30-day Pro/Premium usage is weak, keep it quiet or pause expansion instead of adding more surface area.

## What GrowthOS Is Now

GrowthOS is a Pro/Premium MenuList feature that turns verified MenuList truth into short, ready-to-use local growth kits.

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
| Product form | MenuList Pro/Premium plan feature for higher-tier clients |
| Public owner label | Growth Kits |
| Standalone app/domain | Not approved |
| Direct posting | Disabled |
| Weekly Growth Pack | Still paused as-is; may inform GrowthOS kit templates |
| KitStamp | Separate product decision; not part of GrowthOS |

Old docs remain historical direction and are now archived under this folder:

- `__docs__/growthos-addon/_archive/growth-execution-strategy-2026-05-31/`
- `__docs__/growthos-addon/_archive/growthos-command-center-2026-05-31/`
- `__docs__/strategy/product-positioning-map.md`

This folder is now the active GrowthOS implementation source.

## June 1, 2026 Implementation Update

GrowthOS V1 is implemented as a Pro/Premium-gated MenuList module under the owner label `Growth Kits`.

Implemented V1 scope:

- feature flags and entitlement helpers
- desktop route `/growth-kits`
- desktop sidebar visibility only when flag and entitlement pass
- small Today entry point only for eligible stores
- mobile Today card with latest-kit fallback behavior
- deterministic source facts, action ranking, preflight, kit generation, and Staff Brief Pack
- guarded deterministic review reply from owner-pasted text
- API routes for refresh, kit generation, export logging, and review guard
- Firestore rules for `platformSummary/growthos_{sId}`, `growthosKits`, and `growthosExports`
- no direct posting, scheduler, image generation, offer builder, used-history UI, ROI, or provider call in V1

## June 1, 2026 Owner-Value Hardening Update

The owner-facing Today surface is now framed as `Today's Sales Pack`, not as a generic module card.

Active product contract:

```txt
One current menu action -> one customer message -> one staff line -> one counter line -> owner uses it manually
```

This hardening was added because the first mobile test proved the feature worked technically, but the visible `Growth Kits` abstraction still felt like a side feature. The paid value must be a finished daily sales handoff, not a place the owner has to understand.

Implementation rules added:

- mobile Today must lead with the daily outcome label `Today's Sales Pack`
- stale or blocked kits must not present usable copy/share controls
- stale kits must show `Update pack` / fresh-pack action before use
- owner-facing status should say `Menu checked`, `Ready`, or `Update first`, not confidence percentages
- staff and counter lines are first-class parts of the pack, not hidden secondary content
- mobile Today should not show the older `No today action yet` generation prompt when `Today's Sales Pack` is already present
- mobile Today must stay quiet when GrowthOS only has a weak generic action; surface the Sales Pack only for a fresh prepared pack, a previously used stale pack that needs an update, or a strong menu reason such as a new item, customer favorite, or high-confidence action
- the mobile trigger gate uses the existing GrowthOS summary read and must not refresh, generate, export, or write anything until the owner taps an action
- the legacy Social Content `Generate Today Action` owner path is retired; existing prepared Today campaigns can still be completed/skipped, but new generated action creation belongs to GrowthOS / `Today's Sales Pack`
- the desktop module may remain `Growth Kits`, but its core panel must describe the same daily Sales Pack loop

Implementation evidence:

| Layer | Evidence |
| --- | --- |
| Flags | `src/config/features.ts` |
| Data types | `src/types/growthos.ts` |
| Source facts and kit logic | `src/lib/growthos/` |
| Client DAL and hook | `src/database/growthos/index.ts`, `src/hooks/useGrowthOS.ts` |
| Server persistence | `src/database/growthos/server.ts` |
| API routes | `src/app/api/growthos/` |
| Desktop route | `src/app/(main)/growth-kits/page.tsx`, `src/components/templates/main-app/growthos/` |
| Today entry point | `src/components/templates/main-app/today/index.tsx` |
| Mobile support | `src/components/mobile/components/GrowthKitsMobileCard.tsx`, `src/components/mobile/screens/MobileHoursScreen.tsx` |
| Rules | `firestore.rules` |

## Why This Is Worth Building

| Evidence | What it means for GrowthOS |
| --- | --- |
| Google Pomelli launched for SMB social campaign generation, using a business website to build brand DNA and generate campaign ideas/assets. Source: https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/ | Generic SMB marketing generation is real and crowded. MenuList must differentiate through live menu truth, not generic campaign creation. |
| Canva AI 2.0 is moving toward conversational, agentic, multi-channel campaign creation, scheduling, web research, and brand intelligence. Source: https://www.canva.com/newsroom/news/canva-create-2026-ai/ | GrowthOS should not become a creative agent, scheduler, brand workspace, or campaign suite. |
| Canva Visual Suite 2.0 emphasizes cross-format campaign creation and Magic Studio scale. Source: https://www.canva.com/newsroom/news/canva-create-2025/ | Broad creative suites are moving fast. GrowthOS should avoid canvas/design workflows and stay output-first. |
| Constant Contact reported 68 percent of surveyed SMBs expected to increase marketing budgets and 74 percent expected to spend more time on marketing in 2026. Source: https://www.constantcontact.com/news/2026-02-11-small-businesses-double-down-for-2026-majority-plan-to-increase-marketing-budgets-to-combat-inflation | SMBs are willing to spend, but they need efficiency and usable output, not more dashboards. |
| Constant Contact reported U.S. SMB adoption of AI tools rising from 26 percent in 2023 to 87 percent by April 2026, with 40 percent leaning on AI and automation to manage marketing workload. Source: https://www.constantcontact.com/blog/small-business-marketing-statistics/ | Owners are already using automation to save time. GrowthOS should stay practical workload relief, not a novelty or prompt playground. |
| BrightLocal reported AI local recommendations rising from 6 percent in 2025 to 45 percent in 2026, with consumers still fact-checking reviews and source material. Source: https://www.brightlocal.com/research/lcrs-ai-trust/ | Local truth consistency matters more, not less. GrowthOS should amplify accurate, current business facts. |
| BrightLocal's 2026 review survey reported that 74 percent of consumers seek reviews from the last three months, 31 percent will only use a business with 4.5 stars or more, and 82 percent read AI-generated review summaries. Source: https://www.brightlocal.com/research/local-consumer-review-survey/ | Review freshness and careful reply handling can support GrowthOS, but only through manual owner-pasted review guardrails. Do not ingest reviews, fake sentiment, or produce generic reply spam. |
| Google Business Profile supports owner posts for updates, offers, events, photos, and links, but posts are reviewed and can be rejected. Source: https://support.google.com/business/answer/7342169?hl=en | GrowthOS can prepare compliant drafts, but direct posting must stay disabled until policy and API paths are proven. |

## June 19, 2026 Web Research Addendum

The current market evidence strengthens the active MenuList add-on decision rather than creating a new product mandate.

| Research signal | Product decision |
| --- | --- |
| SMBs are increasing marketing spend/time while using automation to reduce workload. | Keep GrowthOS framed as `Today's Sales Pack`: one current action, one customer line, one staff line, one counter line. |
| Google Pomelli and Canva AI 2.0 validate SMB campaign generation and multi-channel creation as active markets. | Do not compete with them as a creative suite. The MenuList wedge is live menu truth, availability, prices, hours, and public links. |
| Local discovery is increasingly mediated by reviews, recent source material, and AI summaries. | GrowthOS should protect source facts and review safety. Any review feature stays manual-paste, no raw review logging, no fake reviews, no review ingestion without GBP access. |
| `GrowthOS` has active external brand usage in marketing/growth tools. | Keep `GrowthOS` internal and keep owner-facing naming as `Growth Kits` / `Today's Sales Pack`. Do not launch a standalone GrowthOS site or domain from this module. |

## Current Repo Evidence

| Existing foundation | Evidence |
| --- | --- |
| Today/Social Content already exists and is enabled as the owner action surface | `src/config/features.ts` |
| Campaign types and execution surfaces already model post/send/print/display outputs | `src/types/campaigns.ts:7-58` |
| Today summary uses a one-read Firestore pattern | `src/types/campaigns.ts:195-250`, `src/database/campaigns/index.ts:49-113` |
| Old Social Content owner generator has been removed | No `src/app/api/campaigns/generate/route.ts`, no `src/lib/campaigns/engine.ts`, and no owner-facing `Generate Today Action` prompt remain in active code. |
| Caption generation already uses AI capacity checks and records AI operations | `src/app/api/campaigns/caption/route.ts:31-214` |
| AI capacity is checked before provider calls | `src/lib/ai/capacityCheck.ts:71-144` |
| AI unit costs already include campaign captions, review reply suggestions, and image generation | `src/constants/AI/unitCosts.ts:19-92` |
| Direct posting is already explicitly disabled for Social Content | `src/config/features.ts` |
| The Today Weekly Growth Pack is paused and flag-off | `src/config/features.ts` |
| GrowthOS direct posting, image mode, offer builder, quick replies, photo prompts, multi-outlet mode, used history UI, and advanced low-data mode are gated separately | `src/config/features.ts` |
| GBP Sync remains feature-flagged and blocked on API access | `__docs__/gbp-sync/README.md:1-24`, `src/config/features.ts:656-673` |
| Reviews and reputation docs remain API-blocked for ingestion | `__docs__/reviews-reputation/README.md:1-23`, `__docs__/reviews-reputation/README.md:75-90` |
| KitStamp is content preparation, not immediate growth execution | `__docs__/kitstamp/README.md:1-12`, `__docs__/strategy/product-positioning-map.md:28-68` |

## Active Scope

The first approved implementation should be a Pro/Premium-gated module inside MenuList that:

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
| KitStamp | Excluded. KitStamp prepares deliberate multi-asset content kits. GrowthOS produces immediate local action kits. |
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
| [Website Content](./growthos-addon_website.md) | Candidate public website/pricing copy for MenuList Pro/Premium pages. |
| [Helpdoc](./growthos-addon_helpdoc.md) | Candidate owner help article. |
| [Test Cases](./growthos-addon_test-cases.md) | Product, security, cost, desktop, mobile, and docs verification matrix. |
| [Validation](./growthos-addon_validation.md) | Implementation validation commands, deploy result, and rollout checks. |

## Rollout Gate

Current runtime posture:

- `ENABLE_GROWTHOS_ADDON=true`.
- `GROWTHOS_ADDON_ACCESS="paid"`.
- Keep paid plan IDs limited to Pro and Premium unless pricing changes.
- Verify Firestore rules are deployed.
- Run `npm run verify:growthos`.
- Verify desktop and mobile with a real entitled store.
- Confirm direct posting remains disabled.
- Confirm review support uses owner-pasted review text only.
- Confirm no new scheduler is active.

## Cost Impact Of This Documentation

Runtime Firebase cost remains zero while the master flag is off. When enabled, cost is owner-action driven: summary read, bounded refresh/generate reads, changed-only summary writes, kit write, and export write/status updates.
