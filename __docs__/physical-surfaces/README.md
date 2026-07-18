# Physical Surfaces — Documentation Hub

> **Feature:** Physical Menu Surfaces (Campaign-Based Recommendation Cards)  
> **Status:** ⚠️ LEGACY — Superseded by [Menu Kit](../menu-kit/README.md) for identity surfaces  
> **Last Updated:** July 16, 2026

---

## Important: Relationship to Menu Kit

This feature was the **original** physical surfaces system (Jan 2026), generating **campaign-based recommendation cards** (e.g., "Most customers order Butter Chicken") shown in the Today tab.

In Feb-Mar 2026, **[Menu Kit](../menu-kit/README.md)** was built as the **canonical physical surface system**, implementing **identity infrastructure surfaces** (e.g., "SCAN TO VIEW MENU") which are strategically stronger. See `_archive/chatgpt-review.md` for the full strategic analysis.

### Two Systems Comparison

| Aspect              | Physical Surfaces (THIS)              | Menu Kit (CANONICAL)                                                         |
| ------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| **Approach**        | Campaign-based recommendations        | Identity infrastructure                                                      |
| **Example copy**    | "Most customers order Butter Chicken" | "SCAN TO VIEW MENU"                                                          |
| **Dependency**      | Campaign confidence scores            | Store data only (zero campaign dependency)                                   |
| **Location**        | Today tab (ephemeral)                 | Share Modal (persistent)                                                     |
| **Surfaces**        | Tent card, counter sticker            | Table tent, counter sticker, entrance poster, social assets, placement guide |
| **Feature flag**    | None                                  | `ENABLE_MENU_KIT: true`                                                      |
| **Code**            | `src/lib/physical-surfaces/`          | `src/lib/menu-kit/`                                                          |
| **Strategic value** | Marketing suggestions (weak)          | Infrastructure identity (strong)                                             |

**For all new physical surface work, use Menu Kit.**

Maintenance note: the legacy Today/mobile Hours download buttons remain as a read-only compatibility surface for an already-populated `platformSummary/campaigns_{sId}.physicalSurfaces` field. Current source has no active writer that computes or persists that field; `calculatePhysicalSurfaceEligibility()` is not called by the current campaign mutation path. Therefore this legacy UI must not be described as an autonomously generated current feature. When legacy data exists, its downloads reuse the shared Menu Kit premium output tokens (`src/lib/menu-kit/brandTokens.ts`) and platform attribution helper (`src/lib/menu-kit/platformAttribution.ts`) so they include store logo/color treatment, a scan-safe QR panel, and subtle MenuList logo/name/domain footer instead of plain black-and-white output.

---

## Quick Navigation

| Audience      | Document                                                           | Purpose                                          |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| CEO / PM      | [physical-surfaces_spec.md](./physical-surfaces_spec.md)           | Business requirements (legacy campaign surfaces) |
| Developer     | [physical-surfaces_impl.md](./physical-surfaces_impl.md)           | Technical blueprint (legacy campaign surfaces)   |
| Marketing     | [physical-surfaces_marketing.md](./physical-surfaces_marketing.md) | Sales positioning                                |
| Website       | [physical-surfaces_website.md](./physical-surfaces_website.md)     | Public landing page content                      |
| Support       | [physical-surfaces_helpdoc.md](./physical-surfaces_helpdoc.md)     | Customer help documentation                      |
| Ops / Finance | [physical-surfaces_firebase.md](./physical-surfaces_firebase.md)   | Firebase cost tracking                           |

## Additional Documents

| Document                                                                             | Purpose                                                                       |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [physical-surfaces_validation.md](./physical-surfaces_validation.md)                 | Validation report                                                             |
| [physical-surfaces_code-review.md](./physical-surfaces_code-review.md)               | Code review findings                                                          |
| [physical-surfaces_logic-verification.md](./physical-surfaces_logic-verification.md) | Logic verification                                                            |
| [physical-surfaces_doc-feedback-audit.md](./physical-surfaces_doc-feedback-audit.md) | Documentation feedback audit                                                  |
| [\_archive/chatgpt-review.md](./_archive/chatgpt-review.md)                          | ChatGPT strategic review (Mar 14, 2026) — identity vs recommendation analysis |

## Current Source Boundary

Campaign-based recommendation cards are a legacy read/download compatibility path, not a currently populated autonomous flow. **For supported identity infrastructure surfaces (table tents, entrance posters, stickers), use [Menu Kit](../menu-kit/README.md) and [Print Menu Surfaces](../print-menu-surfaces/README.md).**

## Problem Solved

The original Physical Surfaces spec aimed to extend campaign intelligence to printable materials. A subsequent strategic review (ChatGPT + Cascade validation) identified that **identity surfaces** (stable, store-level, no campaign dependency) are strategically stronger than **recommendation surfaces** (volatile, campaign-dependent). Menu Kit implements the identity approach.
