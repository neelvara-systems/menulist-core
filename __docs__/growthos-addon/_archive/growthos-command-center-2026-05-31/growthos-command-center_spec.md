# GrowthOS Command Center - Product Specification

**Status:** Candidate spec for separate GrowthOS. MenuList Today wedge implemented but paused behind a disabled flag.  
**Created:** May 31, 2026  
**Audience:** Founder, product, engineering, support

---

## Executive Summary

GrowthOS Command Center is a candidate GrowthOS surface that turns verified business truth into a short queue of owner-approved actions.

It should not expose five AI tools. It should not ask owners to choose between content, SEO, reviews, chat, and freshness. It should show what is ready to do this week.

The product kernel is:

1. MenuList truth is read.
2. Freshness and growth signals are generated.
3. Signals become `GrowthAction` records.
4. Owner approves, edits, ignores, or exports.
5. Generated assets keep provenance and expiry.

## Implemented MenuList Wedge

The approved current implementation is smaller than this spec:

- Existing MenuList Today remains the product surface.
- `ENABLE_TODAY_WEEKLY_GROWTH_PACK` gates the new card and remains `false`.
- The pack uses deterministic copy from already-loaded MenuList truth.
- Outputs are copy-only.
- No direct posting, scheduler, GrowthOS route, GrowthOS domain, or GrowthOS database is active.

Product decision: do not freeze or roll out this wedge yet. Owner usability and need are not proven. Revisit only after a small pilot shows owners understand it, copy/share it, and still see Today truth readiness as the primary value.

VisualMeta boundary: do not move this wedge to VisualMeta. VisualMeta prepares draft content units and Final Content Kits; this wedge is a weekly owner action/export question and belongs only to Today/GrowthOS if revived.

## Scope

### In Scope If Approved

| Area | Requirement |
| --- | --- |
| Command Center | One weekly action queue grouped into critical fixes, growth moves, and trust moves. |
| Freshness Check | Missing or stale public facts become actions, not reports. |
| Weekly Growth Pack | Owner selects a real menu item/service/offer; system creates ready outputs from verified facts. |
| GrowthAction | Every suggested move has evidence, affected surfaces, expiry, owner status, and provenance. |
| Approval | Nothing public changes until the owner approves. |
| Export | Initial outputs are copy/download/manual publish only. |
| Provenance | Every generated asset records source facts, owner approval, destination, expiry, and status. |

### Out of Scope

| Rejected | Reason |
| --- | --- |
| Direct autonomous publishing | External platform risk and current direct posting flag is disabled. |
| Social scheduling calendar | Creates planning and dashboard management. |
| Ads, CRM, loyalty, POS, orders | Wrong product category. |
| Full chatbot builder | Turns GrowthOS into support/conversation product and overlaps Answerlattice-style surfaces. |
| Analytics dashboard | Violates output-first GrowthOS posture. |
| Canva-style editor | Belongs to VisualMeta-style content preparation, not GrowthOS. |
| Full multi-location control | Needs its own approved spec and stronger truth maturity. |

## Owner-Facing Flow

### First Session

1. Owner opens GrowthOS.
2. GrowthOS reads the selected MenuList business profile.
3. GrowthOS shows a short public presence audit:
   - missing or stale facts
   - content opportunities from real menu items
   - review/proof opportunities only when source access is verified
4. Owner sees a small action queue.
5. Owner approves or exports one action.

### Weekly Use

1. Owner opens Command Center.
2. The weekly queue shows 3-7 actions.
3. Owner picks one action or generates the weekly Growth Pack.
4. Owner approves or exports generated assets.
5. GrowthOS records what was approved, edited, ignored, or exported.

## GrowthAction Object

`GrowthAction` is the central product object.

| Field | Purpose |
| --- | --- |
| `id` | Stable action id. |
| `pId` | Product id if product-scoped identity is used. GrowthOS must use the approved GrowthOS id, not an invented field. |
| `tId` / `sId` | Tenant and store identity. |
| `businessId` | Business/profile id when separate from store id. |
| `actionType` | Bounded action type such as `confirm_hours`, `add_faq`, `generate_growth_pack`, `reply_to_review`, `archive_expired_offer`. |
| `title` | Short owner-facing title. |
| `sourceEngines` | Bounded list: freshness, content, reputation, discovery, conversation. |
| `supportingSignals` | Source evidence ids and hashes. |
| `affectedTruthFacts` | MenuList facts used or proposed for correction. |
| `affectedSurfaces` | Candidate surfaces such as MenuList page, Google post draft, WhatsApp message, printable flyer. |
| `recommendedOutput` | Asset draft ids or structured output references. |
| `riskLevel` | Low, medium, high. High risk requires stronger approval. |
| `effortLevel` | Low, medium, high. |
| `impactScore` | Internal ranking score. Do not expose as a metric. |
| `urgencyScore` | Internal ranking score. Do not expose as a metric. |
| `confidenceScore` | Internal ranking score. Do not expose as a metric. |
| `ownerStatus` | `draft`, `pending_approval`, `approved`, `edited`, `ignored`, `exported`, `published`, `archived`. |
| `approvalRequired` | Always true for public-facing output in the first approved plan. |
| `expiresAt` | Prevents stale public content debt. |
| `createdAt` / `completedAt` | Lifecycle timestamps. |

## Priority Model

Priority is internal. The owner sees a simple ordered queue.

| Rank input | Meaning |
| --- | --- |
| Trust risk | Wrong hours, broken links, expired offers, stale menu, wrong address. |
| Revenue proximity | Booking/order/catering/customer high-intent questions. |
| Customer demand | Repeated questions, reviews, or manual owner evidence. |
| Surface importance | Google, official page, website, WhatsApp, MenuList public profile. |
| Effort-to-impact | 30-second fixes outrank complex campaigns. |
| Freshness decay | Older facts accumulate risk. |
| Proof strength | Real reviews/questions increase reliability. |

## Product Language

Allowed owner-facing copy:

- "This week"
- "Ready actions"
- "Approve"
- "Edit"
- "Ignore"
- "Export"
- "No action needed"

Avoid:

- "AI-powered"
- "smart"
- "dynamic"
- "we recommend"
- "based on intelligence"
- "your performance improved"

## Requirements

| ID | Requirement |
| --- | --- |
| FR-1 | Command Center shows at most 7 actions by default. |
| FR-2 | Critical fixes appear above growth moves. |
| FR-3 | Every action has a source evidence trail available internally. |
| FR-4 | Owner can approve, edit, ignore, export, or archive an action. |
| FR-5 | No generated output invents prices, offers, hours, ingredients, dietary claims, awards, ratings, delivery coverage, or availability. |
| FR-6 | Weekly Growth Pack uses only MenuList truth, owner input, approved claims, reviews with permission, and uploaded media. |
| FR-7 | Direct publishing remains disabled until a separate integration spec is approved. |
| FR-8 | Any approved MenuList truth change must be executed by MenuList-owned write paths unless doctrine changes. |
| FR-9 | Public outputs must have expiry or archive rules. |
| FR-10 | The system must be feature-flagged off by default until approved. |

## Risks

| Risk | Mitigation |
| --- | --- |
| GrowthOS blurs MenuList identity | Keep GrowthOS route/product surface separate if approved; do not embed a marketing command center inside MenuList. |
| GrowthOS becomes generic marketing software | Every action must use, improve, distribute, or validate MenuList truth. |
| Owner sees too much complexity | Hide engines, scores, graph names, and reasoning. |
| False public claims | Require provenance and approval. Block unverifiable claims. |
| Firebase cost creep | Use summaries, hashes, and on-demand generation. Avoid listeners and broad scans. |

## Open Questions

1. Is GrowthOS Stage 2 unlocked now?
2. Should this start as a separate app or as a Social Content/Today improvement?
3. Is GrowthOS allowed to create MenuList truth-change drafts?
4. Which domain and product id are approved?
5. Which source feeds reviews and customer questions first?

## Cost Impact

No runtime Firebase cost change yet. Proposed costs are in `growthos-command-center_firebase.md`.
