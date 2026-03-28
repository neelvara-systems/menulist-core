# ChatGPT Feedback Round 3 — Landing Page Discovery Infrastructure

**Date:** March 10, 2026  
**Source:** ChatGPT conversation reviewing discovery-infrastructure docs  
**Question asked:** "Should we add discovery infrastructure info to the MenuList landing page?"  
**Accuracy:** ~35%

---

## ChatGPT Suggestions vs Reality

### Already Done (ChatGPT unaware — ~60% of suggestions)

| Suggestion | Already Exists | Where |
|---|---|---|
| "Official Menu Page" positioning | ✅ | Hero: "Your official menu. From one place." |
| "Always Up-to-Date" messaging | ✅ | SmartFeaturesSection: "Your menu stays correct after you publish." |
| Surface tiles showing where menu appears | ✅ | SurfacesSection: 6 surfaces (QR, Link, Screens, PDF, Official Page, Google) |
| Help Center article explaining infrastructure | ✅ | `seo-aeo-discovery-infrastructure_helpdoc.md` |
| "One menu. Everywhere." framing | ✅ | SolutionSection + FinalCtaSection |

### Valid New Suggestions (Accepted — 2 items)

1. **Subtle discoverability line** — Added to SurfacesSection: "Your menu pages are built to be found — by customers, Google, and the tools people use to discover restaurants."
2. **Footer trust badge** — Updated from "The official public menu system." to "Official menu pages. Built to be found."

### Rejected Suggestions

| Suggestion | Reason |
|---|---|
| "Built for how the modern internet works" | Fails Mumbai restaurant owner test — "modern internet" is meaningless to them |
| Separate SEO/AEO page on website | Over-engineering; helpdoc already covers this |
| "structured for search engines and AI assistants" (exact phrasing) | Too technical for restaurant owners |
| Full infrastructure section on homepage | Violates Language Governance (no technical jargon) |

### Language Governance Violations in ChatGPT's Copy

- "AI assistants" — borderline (we softened to "tools people use to discover restaurants")
- "structured" — technical jargon
- "modern web" — vague, fails 2-second understanding test
- "schema.org", "JSON-LD", "entity graphs" — ChatGPT correctly said NOT to use these, which we agree with

---

## Changes Made

### Code Changes

1. **`src/components/website/home/SurfacesSection.tsx`** — Added discovery credibility note after surfaces grid
2. **`src/components/website/Footer.tsx`** — Updated bottom-right trust line

### Doc Changes

3. **`__docs__/main-website/main-website_content.md`** — Updated Section 4 notes + footer copy

---

## Key Principle Applied

> Surface the benefit, hide the complexity.

ChatGPT's core insight was correct: the discovery infrastructure IS a differentiator, but must be communicated as a benefit ("built to be found") not as technology ("schema.org structured data"). This aligns with Language Governance Doc 02.
