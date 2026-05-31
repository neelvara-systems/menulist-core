# GrowthOS Command Center - Planning Documentation

**Status:** Planning only for separate GrowthOS. MenuList Today wedge implemented but paused behind a disabled flag.  
**Product context:** GrowthOS candidate, inside the MenuList ecosystem.  
**Stage:** Stage 0 review plus Stage 1 planning docs.  
**Created:** May 31, 2026  
**Source input:** ChatGPT conversation about GrowthOS orchestration, GrowthAction, freshness, weekly growth packs, and separate-app packaging.
**Superseded for implementation planning:** `__docs__/growthos-addon/README.md` is now the active GrowthOS plan. GrowthOS is treated as a MenuList higher-tier add-on labelled Growth Kits, not as this separate command-center product surface.

---

## Decision Summary

This folder documents a candidate GrowthOS Command Center product surface.

The current decision is not "start a separate GrowthOS implementation." The current decision is:

1. Preserve the useful ChatGPT idea: organize GrowthOS around owner-approved actions, not exposed AI tools.
2. Preserve existing doctrine: GrowthOS is Stage 2 and remains blocked until founder unlocks it.
3. Reject any immediate separate-app build that bypasses MenuList stability, system-of-record proof, and product-separation guardrails.
4. Do not roll out the MenuList Today Weekly Growth Pack yet. Keep it hidden until owner usability and need are proven.

## Current Repo Reality

| Area | Current truth |
| --- | --- |
| GrowthOS strategy | Existing strategy says GrowthOS is deferred and not active development. See `__docs__/growth-execution-strategy/README.md:7`. |
| Stage gate | Product Evolution Doctrine says GrowthOS starts only after MenuList is stable and trusted. See `__docs__/constitution/11-product-evolution-doctrine.md:20`. |
| Existing v0 | Social Content/Today already has campaign types, confidence thresholds, surfaces, summary docs, and export-oriented flows. See `src/config/features.ts:281`, `src/lib/campaigns/engine.ts:274`, and `src/types/campaigns.ts:11`. |
| KitStamp boundary | KitStamp is Stage 3 content preparation with Final Content Kit export, not weekly growth actions. See `__docs__/kitstamp/README.md:3` and `__docs__/kitstamp/README.md:728`. |
| Separate app routing | GrowthOS has a disabled placeholder in product domains, but no deployment target matrix entry. See `src/constants/productDomains.ts:88` and `src/constants/deploymentTargets.ts:11`. |
| Boundary risk | Product Separation Doctrine forbids GrowthOS writing to MenuList or influencing MenuList behavior. See `__docs__/constitution/12-product-separation-doctrine.md:68`. |

## Paused MenuList Wedge

The May 31 follow-up decision was to avoid a separate product and add the smallest safe wedge to Today.

| Layer | Current file |
| --- | --- |
| Feature flag | `src/config/features.ts` -> `ENABLE_TODAY_WEEKLY_GROWTH_PACK` stays `false` |
| Shared builder | `src/lib/today/weeklyGrowthPack.ts` |
| Desktop UI | `src/components/templates/main-app/today/components/WeeklyGrowthPack/` |
| Mobile UI | `src/components/mobile/components/TodayWeeklyGrowthPackCard.tsx` |
| Mobile host | `src/components/mobile/screens/MobileHoursScreen.tsx` |

This wedge is not GrowthOS Stage 2. It creates no route, no product domain, no direct publishing, no scheduler, and no new Firestore write path.

After owner-value review, the wedge is paused and should not be frozen as a launch feature. The concern is product usefulness, not technical safety: it currently feels like a side feature unless it is clearly secondary to Today keeping public business truth ready.

Revisit only if a small owner pilot shows real pull: owners understand it without explanation, copy/share an output, and still treat Today truth readiness as the primary value.

Do not reclassify this paused wedge as KitStamp. The KitStamp archive says MenuList AI Image Generation is the KitStamp image-engine prototype, while Social Content is the GrowthOS v0 pattern. The Weekly Growth Pack remains a Today/GrowthOS question, not a KitStamp question.

## Document Map

| Document | Purpose |
| --- | --- |
| [ChatGPT Review](./_archive/chatgpt-review-2026-05-31.md) | Critical review of the pasted conversation against repo truth and current market context. |
| [Decision Brief](./growthos-command-center_decision-brief.md) | Founder decision matrix before approving or rejecting the separate app path. |
| [Specification](./growthos-command-center_spec.md) | Business requirements and owner-facing scope if this is approved. |
| [Implementation Plan](./growthos-command-center_impl.md) | Technical contract, file-path plan, and blockers if implementation is approved. |
| [Firebase Cost](./growthos-command-center_firebase.md) | Proposed read/write/storage/provider cost contract. |
| [Mobile Support](./growthos-command-center_mobile-support.md) | Mobile admission result and mobile/desktop split. |
| [Marketing Notes](./growthos-command-center_marketing.md) | Internal positioning and packaging notes. |
| [Website Content](./growthos-command-center_website.md) | Public copy candidate, not publish-ready until product approval. |
| [Helpdoc](./growthos-command-center_helpdoc.md) | Owner help article candidate, not publish-ready until product approval. |
| [Test Cases](./growthos-command-center_test-cases.md) | Decision, product, security, cost, and mobile tests. |

## Non-Decision

These docs do not approve:

- a new GrowthOS route
- a GrowthOS production domain
- new GrowthOS Firestore collections
- new Cloud Functions
- direct posting to Google, Instagram, WhatsApp, or any external surface
- GrowthOS writing to MenuList truth
- a scheduler or background queue
- Vercel or Firebase deploys

## Recommended Next Decision

Before implementation, decide one of these:

| Option | Meaning | Recommendation |
| --- | --- | --- |
| A - Do not build now | Keep GrowthOS deferred; mine this conversation only for Social Content/Today improvements. | Safest default. |
| B - Keep hidden pilot only | Keep the Today wedge disabled and revive only for a small owner pilot. | Current decision. |
| C - Build a GrowthOS shell now | Requires founder override of existing GrowthOS timing gates and routing/product identity decisions. | Not recommended without explicit unlock. |

## Cost Impact

No runtime Firebase cost change. This is documentation and planning only.
