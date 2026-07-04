# Behavior Engineering (Presence Dominance Activation)

> **Make MenuList the instinctive default link every owner sends — through deliberate habit replacement, not features.**

**Created:** February 19, 2026  
**Source:** ChatGPT Strategic Session #4 + Cascade Codebase Audit + BJ Fogg Behavior Model Research  
**Status:** Source-gated behavior-copy boundary
**Parent Strategy:** [`__docs__/presence-dominance/`](../presence-dominance/README.md)  
**Pillar:** 1 of 6 — Customer-Facing Infrastructure

---

## Source Gate

This doc is source-gated by `npm run verify:public-business-truth`. Behavior Engineering copy must describe one stable customer link that points to the current owner-approved public source after the save/publish path and public cache refresh. It must not claim every edit is instantly visible, always latest, or automatically current outside the source-backed cache/publish contract.

---

## Quick Navigation

| Document | Audience | Purpose |
|----------|----------|---------|
| [Spec](./behavior-engineering_spec.md) | CEO, PM | Friction map, dependency loops, habit replacement model |
| [Impl](./behavior-engineering_impl.md) | Developers | Screen-by-screen micro-copy, component changes |
| [Marketing](./behavior-engineering_marketing.md) | Sales | Behavior-first positioning, pitch angles |
| [Website](./behavior-engineering_website.md) | Public | Landing page content for "official link" positioning |
| [Help Doc](./behavior-engineering_helpdoc.md) | Customers | How to make MenuList your official menu link |
| [Firebase](./behavior-engineering_firebase.md) | Cost Control | Zero additional Firebase cost (UI-only changes) |
| [Mobile Support](./behavior-engineering_mobile-support.md) | Internal | Mobile share screen nudge assessment |
| [Archive](./\_archive/chatgpt-review.md) | Internal | ChatGPT conversation critical review |

---

## One-Liner

Replace owners' default "send PDF/photo" reflex with "send MenuList link" through deliberate micro-copy nudges at 10 key product moments.

## Core Insight

MenuList's engineering is complete. The remaining gap is **behavioral adoption** — owners still send PDFs and photos out of muscle memory. This is not a product problem. It's a habit problem. We solve it through behavior engineering, not features.

## The Relief Stack (Why Owners Switch)

MenuList removes 3 daily irritations that create permanent dependency:

1. **Outdated menu embarrassment** — "But menu says ₹180..." → Link points customers to the current approved source
2. **Repeated WhatsApp work** — Send menu 20-80 times/day → One link, done
3. **Customer confusion** — Wrong expectations from old info → Single source of truth

## The 7 Dependency Loops

| # | Loop | Trigger | Lock-In Mechanism |
|---|------|---------|-------------------|
| 1 | Send Menu Loop | Customer asks for menu | Reflex replacement (link > PDF) |
| 2 | Update Once Loop | Owner changes price/item | No need to resend anywhere |
| 3 | Staff Alignment Loop | Staff sends menu to customers | Team-wide dependency |
| 4 | Instagram Bio Loop | Bio link = MenuList | Public-facing identity |
| 5 | QR Physical Loop | QR printed on tables/counter | Physical switching cost |
| 6 | Repeat Customer Loop | Regular customers reuse link | Customer-side habit |
| 7 | Official Link Identity Loop | Owner believes "this is our menu" | Mental model shift |

## Key Existing Files

| File | Purpose | Status |
|------|---------|--------|
| `src/config/features.ts` | `ENABLE_BEHAVIOR_NUDGES` | 🆕 NEW |
| `src/components/.../OBPLinkCard.tsx` | Dashboard link card | ✅ Exists — ENHANCED |
| `src/components/.../shareModal/index.tsx` | Desktop share modal | ✅ Exists — ENHANCED |
| `src/components/mobile/screens/MobileShareScreen.tsx` | Mobile share screen | ✅ Exists — ENHANCED |
| `src/components/.../OwnerDashboard/BehaviorNudgeCard.tsx` | Dashboard nudge card | 🆕 NEW |
| `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx` | Post-publish screen | ✅ Exists — ENHANCED |

## Feature Flags

```typescript
ENABLE_BEHAVIOR_NUDGES: true  // Micro-copy nudges across share/dashboard screens
```

## Locked Decisions

1. **90/10 Tone Rule** — 90% silent professional system, 10% precise guiding assistant
2. **Never say**: "AI learning", "collecting data", "smart menu", "digital transformation"
3. **Always say**: "official link", "current approved menu", "same customer link"
4. **Identity framing** — "Your official business link" not "your digital menu"
5. **No gamification** — No progress bars, badges, streaks, or fake urgency

## Success Metric

> **When someone asks for menu, owner sends MenuList link without thinking.**  
> If they still search gallery for PDF → behavior engineering failed.

## Dependencies

| Dependency | Status |
|-----------|--------|
| OBP (Official Business Page) | ✅ COMPLETE |
| Share Modal (desktop) | ✅ COMPLETE |
| MobileShareScreen | ✅ COMPLETE |
| Owner Dashboard | ✅ COMPLETE |
| Messaging Onboarding (post-publish) | ✅ CODED |

---

**Last Updated:** February 19, 2026
