# Presence Dominance — Spec

**Status:** Draft  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** CEO, PM, Clients (non-technical)  
**Pillar:** 1 of 6 — Customer-Facing Infrastructure

---

## Executive Summary

**What:** A behavioral adoption strategy that makes MenuList the single official link every business shares everywhere — Instagram bio, Google, WhatsApp, QR codes, packaging.

**Why:** The Official Business Page (OBP) is already built and works perfectly. But presence dominance isn't about engineering — it's about **habit formation**. The owner must instinctively send the MenuList link for every customer request. This pillar defines the nudge system and behavioral design that creates that habit.

**For whom:** Every MenuList business owner, starting with first 50 onboarded SMBs.

**Impact:** Once the MenuList link is printed on tables, saved by customers, in Google, and in Instagram bios — replacing MenuList becomes painful. That's infrastructure lock-in.

---

## Goals & Success Metrics

| Goal | Success Metric |
|------|---------------|
| Owner sends MenuList link for everything | Stops sending PDFs/Zomato/Instagram links |
| Link appears in Instagram bio | 30%+ of active stores within 3 months |
| Link set as Google menu URL | 50%+ of active stores within 6 months |
| QR printed on physical surfaces | 40%+ of active stores order/download QR |
| Customers save/bookmark the link | Return visitor rate >20% |

---

## Scope

### In-Scope

- Post-publish share nudge ("Share your official link everywhere")
- "Share Everywhere" guidance card in dashboard
- Copy link with one tap (already exists, enhance prominence)
- QR download with one tap (already exists, enhance prominence)
- "Add to Instagram bio" suggestion with instructions
- "Set as Google menu link" guidance
- Mobile share sheet integration (native share)
- WhatsApp share button (pre-formatted message)
- Post-onboarding first-time share prompt

### Out-of-Scope (Permanent)

- Auto-posting to social platforms
- Social media management tools
- Link analytics dashboard (OBP metrics already exist in Owner Dashboard)
- Multi-link bio page builder (MenuList ≠ Linktree)
- SEO tools panel
- Marketing campaign tools

---

## User Stories

### Story 1: Post-Publish Share Nudge

> As an **owner**, after I publish my menu for the first time, I see a calm card saying "Your official business link is ready. Share it everywhere." with copy link, QR download, and platform-specific suggestions.

### Story 2: Share Everywhere Guidance

> As an **owner**, in my dashboard I see a "Share Your Link" card with clear instructions for Instagram, Google, WhatsApp, and print. Each has a one-tap action.

### Story 3: Mobile Quick Share

> As a **mobile user**, when someone asks for my menu on WhatsApp, I open MenuList, tap "Share Link", and the native share sheet opens with my official link pre-filled.

### Story 4: First-Time Onboarding Link

> As a **new user**, after completing onboarding and my menu is live, the success screen prominently shows my official link with "Start sharing this everywhere."

---

## What Already Exists (Codebase Reality)

| Component | Location | Status |
|-----------|----------|--------|
| OBP page | `src/app/_client/obp/OBPContent.tsx` | ✅ Built |
| OBP link card | `src/components/.../businessSettings/OBPLinkCard.tsx` | ✅ Built |
| Copy link button | Inside OBPLinkCard | ✅ Built |
| QR download | Physical surfaces (tent cards, stickers, PDF) | ✅ Built |
| OBP analytics | `src/app/_client/obp/OBPAnalytics.tsx` | ✅ Built |
| OBP metrics card | `src/components/.../OBPMetricsCard.tsx` | ✅ Built |
| Schema.org JSON-LD | `src/app/_client/obp/schema.ts` | ✅ Built |
| CDN caching | `s-maxage=60, stale-while-revalidate=300` | ✅ Built |
| Mobile share screen | `src/components/mobile/screens/MobileShareScreen.tsx` | ✅ Built |

## What Needs Building (Behavioral Adoption)

| Component | Description | Effort | Priority |
|-----------|-------------|--------|----------|
| Post-publish nudge card | After first publish, show "Share your link" card | 1-2 days | P0 |
| Share guidance card | Dashboard card with platform-specific instructions | 1-2 days | P0 |
| Mobile native share | Use Web Share API from mobile for one-tap sharing | 0.5 day | P0 |
| WhatsApp share button | Pre-formatted "Check out our menu: [link]" | 0.5 day | P1 |
| Instagram bio instructions | Step-by-step visual guide | 0.5 day | P1 |
| Google menu link guide | Step-by-step for setting GBP menu URL | 0.5 day | P1 |

**Total estimated effort:** 4-5 days

---

## Behavioral Design Principles

### 1. Natural, Not Forced
Owners should naturally start using the MenuList link. No pop-ups, no mandatory steps. Calm suggestions at the right moment.

### 2. Right Moment Nudges
- After first publish → "Share your link"
- After menu update → "Customers see the latest version automatically"
- After QR download → "Print this on your tables"

### 3. Platform-Specific Guidance
Each platform needs specific instructions:
- **Instagram:** "Go to Edit Profile → Website → Paste your link"
- **Google:** "Open Google Business → Info → Menu link → Paste"
- **WhatsApp:** "Share this link when customers ask for menu"

### 4. Switching Cost Awareness
Once link is:
- Printed on tables → can't easily change
- Saved by customers → bookmarks stay
- In Google → indexed and ranked
- In Instagram → followers see it

---

## Competitive Analysis

| Competitor | Approach | MenuList Advantage |
|-----------|----------|-------------------|
| Linktree | Generic link-in-bio (list of links) | MenuList is purpose-built: live hours, menu, contact actions |
| Google Business Profile | Information panel (Google controls) | MenuList: owner controls, always accurate, not algorithm-dependent |
| Zomato/Swiggy | Discovery platforms (commission-based) | MenuList: direct link, no commission, owner-branded |
| PDF menus | Static, outdated quickly | MenuList: always live, auto-updated |

### Market Context
- Link-in-bio market: **$1.62 billion** (2024, Dataintelo)
- Linktree: 50 million users (79.95% market share)
- But generic link tools are commodities — MenuList's OBP is **purpose-built for food/service businesses** with structured data, live hours, and contact actions

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Owners don't change Instagram bio | Persistent gentle nudge, not one-time |
| QR not printed (cost concern) | Provide free downloadable QR designs |
| Customers don't save the link | Speed + reliability builds habit over time |
| Competition from Google's own GBP page | MenuList link IN Google (as menu URL), not competing with Google |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** February 19, 2026
