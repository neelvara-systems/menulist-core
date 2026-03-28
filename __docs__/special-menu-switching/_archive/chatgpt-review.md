# Special Menu Switching — ChatGPT Conversation Review

**Reviewed:** February 20, 2026  
**Reviewer:** Cascade (Lead Architect, full codebase access)  
**Source:** ChatGPT strategic conversation about Festival/Special Menu Switch feature  
**Status:** ✅ REVIEW COMPLETE

---

## Executive Summary

ChatGPT and user discussed a **temporary menu override system** for festivals, seasonal items, events, and special days. The conversation covered strategic importance, target segments, architecture philosophy, and implementation approach.

**Overall assessment:** Solid strategic thinking. Several architecture suggestions need correction based on actual codebase patterns. One critical enhancement discovered by Cascade that ChatGPT couldn't know.

---

## Conversation Topics Covered

| # | Topic | ChatGPT Position | Cascade Verdict |
|---|-------|-----------------|-----------------|
| 1 | What the feature is | Temporary menu override layer | ✅ AGREE |
| 2 | Why it's critical | Retention + operational necessity | ✅ AGREE |
| 3 | Who needs it | Tier 1: food/bakery/bar/sweet. Tier 2: salon/gym | ✅ AGREE |
| 4 | Strategic importance | Stickiness, living menu, GrowthOS enabler | ✅ AGREE |
| 5 | What it is NOT | Not campaign/discount/marketing engine | ✅ AGREE — aligns with doctrine |
| 6 | Core philosophy | Calm, automatic, invisible, reversible, safe | ✅ AGREE — aligns with Rule 5 (Silent Autopilot) |
| 7 | Behavior templates by businessType | Dynamic/Occasional/Static internally | ✅ AGREE — maps to existing `getBusinessCategory()` |
| 8 | No owner-facing config | System decides behavior internally | ✅ AGREE — aligns with 5-Minute Rule |
| 9 | Data model: `specialMenus` subcollection | New subcollection with menu snapshot | ❌ DISAGREE — wrong for MenuList (see below) |
| 10 | Resolver logic | Check active special menu at render time | ✅ PARTIAL — correct concept, wrong implementation |
| 11 | Activation system | Cron job every few minutes | ✅ PARTIAL — use existing nightly scheduler + API route |
| 12 | One-active constraint | Block overlapping at creation time | ✅ AGREE |
| 13 | MCE integration | Run validation on special snapshot | ✅ AGREE — already runs on all projects |
| 14 | Version bump on activation | Bump menuVersion | ✅ AGREE — triggers cache invalidation |
| 15 | Multiple scheduled, one active | Allow calendar of future menus | ✅ AGREE |

---

## Decision Matrix

### ✅ ACCEPTED (Aligns with Codebase + Doctrine)

| ChatGPT Idea | Justification | Codebase Evidence |
|--------------|--------------|-------------------|
| Temporary menu override layer | Core concept is sound. Doesn't violate customer-facing boundary | `__docs__/constitution/11-product-evolution-doctrine.md` Rule 2 |
| Behavior templates by businessType | Maps perfectly to existing `getBusinessCategory()` (7 categories) | `src/data/shared/businessTypes.ts:160` |
| No owner-facing configuration | Aligns with 5-Minute Understanding Rule | `__docs__/constitution/11-product-evolution-doctrine.md` Rule 3 |
| One active at a time, multiple scheduled | Clean constraint. Prevents conflict logic | Good design — no precedent needed |
| Auto-revert guaranteed | Aligns with Silent Autopilot principle | `__docs__/constitution/11-product-evolution-doctrine.md` Rule 5 |
| Not a campaign/discount engine | Aligns with Feature Rejection Gate | `__docs__/constitution/08-feature-rejection-gate.md` |
| MCE validation on special menu | MCE already validates all projects on save | `src/lib/mce/correctnessResolver.ts` |
| Block overlapping schedules at creation | Simplest conflict prevention | Good design |

### ❌ REJECTED (Contradicts Codebase Reality)

| ChatGPT Idea | Why Rejected | Correct Approach |
|--------------|-------------|-----------------|
| New `specialMenus` subcollection with menu snapshot | MenuList menus ARE projects. Projects already have: full editor, AI extraction, MCE, publish, screens, PDF, design system. Creating a separate snapshot duplicates ALL of this. | Special menu = a regular project with `_specialMenu` metadata (schedule, mode, status). Reuses 100% of existing project infrastructure. Zero new editor/collection needed. |
| Cron job "every few minutes" for activation | Over-engineering. Expensive. MenuList already has nightly scheduler at 2:30 AM UTC. For same-day precision, use API route trigger. | Nightly scheduler handles overnight transitions. API route `/api/store/special-menu/activate` handles same-day activation. Hybrid approach. |
| "Resolver logic in web menu, OBP, screens, PDF, POS webhook" separately | Duplicated logic across 5+ surfaces is maintenance nightmare | Single `resolveActiveMenu()` function at data layer. Called once in `getProjectBySlugOrDefault()`. All surfaces automatically get resolved menu. |

### ✅ ENHANCED BY CASCADE (ChatGPT Couldn't Know)

| Discovery | Impact | Evidence |
|-----------|--------|----------|
| Menus ARE projects — full infrastructure reuse | Special menu uses SAME editor, SAME AI extraction, SAME MCE, SAME publish pipeline. Zero new UI for menu editing. | `src/database/projects/index.ts`, `src/components/templates/main-app/projects/` |
| `duplicateProject()` already exists | Owner can "Create Special Menu from Current Menu" by duplicating, then editing. Natural flow. | `src/database/projects/index.ts:1043-1112` |
| Multi-outlet `resolveProjectForRender()` pattern | Exact same resolver pattern: check condition → swap/merge project data. Proven architecture. | `src/lib/multiOutlet/resolveProject.ts:171-224` |
| `getBusinessCategory()` maps to 7 categories | ChatGPT's 3 templates map cleanly: food → Dynamic, service → Occasional, retail → Static | `src/data/shared/businessTypes.ts:160-167` |
| Nightly scheduler at `decisionBlocksScoring.ts` | Already runs at 2:30 AM UTC. Can add special menu activation/deactivation check. | `functions/src/decisionBlocksScoring.ts` |
| `projectsSummary` pattern | Special menu metadata can live on project summary — no new collection needed. | `src/database/projects/index.ts` (syncProjectToSummary) |
| Temp Status Layer already has `special_menu` type | Complementary — temp status banner says "Special menu available", this feature actually SWITCHES the menu content | `src/app/api/store/temp-status/route.ts:18` |
| Cache invalidation via `revalidateTag` | `menu-store-{sId}` tag already handles per-store cache busting on menu changes | `src/app/_client/[[...slug]]/page.tsx:620` |

---

## Market Research Findings

### Industry Standard: "Day-parting" / "Menu Scheduling"

Competitors that offer this:
- **TouchBistro** — Schedule menus by time of day, seasons, specials. POS-integrated.
- **LOOK Digital Signage** — Day-parting: auto-switch by breakfast/lunch/dinner, weekend specials, seasonal offers.
- **UpMenu** — "Instantaneously create digital menus for daily specials and seasonal items."
- **Orders.co** — Real-time menu updates across all platforms at once for seasonal specials.
- **Navori** — POS-integrated menu boards with scheduled content switching.

### Key Insight
All competitors are either POS systems or signage platforms. MenuList is unique as a **customer-facing truth layer** that handles menu switching. This positions MenuList differently — not signage, not POS, but **operational menu infrastructure**.

### Market Size
- Restaurant management software market: $3.45B (2024), projected $8.58B by 2032 (CAGR 13.3%)
- Seasonal/temporary menu changes are a standard feature in the space

---

## Doctrine Compliance Check

| Doctrine | Compliance | Notes |
|----------|-----------|-------|
| Rule 1: Product Evolution Sequence | ✅ PASS | Stage 0 (MenuList Dominance). Menu truth switching = core menu infrastructure. |
| Rule 2: Customer-Facing Only | ✅ PASS | Directly affects what customers see (menu content) |
| Rule 3: 5-Minute Understanding | ✅ PASS with care | "Create Special Menu" → set dates → done. Must stay this simple. |
| Rule 4: Elite Infrastructure | ✅ PASS | Makes MenuList time-aware — from static to living. Inevitable, not feature-rich. |
| Rule 5: Silent Autopilot | ✅ PASS | Auto-activate, auto-revert, no manual intervention after setup |
| Rule 6: Never Become | ⚠️ WATCH | Must NOT drift into campaign/offer/discount territory |
| Feature Rejection Gate | ✅ PASS | Solves real operational problem. Not feature-rich decoration. |
| 3-Year Freeze | ✅ PASS | Ships complete Day 1. Feature flag controls rollout. |

---

## Doctrine-Level Content Found

**YES — this conversation contains principles that should govern feature design:**

The conversation established the **"Temporary Override Principle"** — a pattern for any feature that temporarily changes customer-facing truth:

1. **Base truth is sacred** — never corrupt the canonical source
2. **Override has automatic lifecycle** — must auto-revert
3. **Status always visible to owner** — no confusion about current state
4. **Zero learning required** — must feel obvious
5. **System-decided behavior** — no owner-facing configuration complexity

This is NOT doctrine-level (doesn't warrant a constitution document) but IS a strong design pattern that should be documented in the feature spec as invariants.

---

## Prioritized Action Items

1. ✅ Create full doc set for `special-menu-switching` feature
2. ✅ Use project-based architecture (NOT new subcollection)
3. ✅ Map behavior templates to `getBusinessCategory()` output
4. ✅ Integrate with existing nightly scheduler
5. ✅ Leverage `duplicateProject()` for "create from base"
6. ✅ Add feature flag `ENABLE_SPECIAL_MENU_SWITCHING`
7. ✅ Connect to temp status layer (auto-set `special_menu` banner when active)

---

**Last Updated:** February 20, 2026
