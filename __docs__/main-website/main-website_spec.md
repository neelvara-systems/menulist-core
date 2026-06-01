# Main Website Strategy Spec

**Version:** 3.6.20 — Full Resource Locale Coverage
**Status:** CURRENT CONTEXT
**Source:** ChatGPT conversation + Cascade validation + web research

> This file keeps useful strategy context and validation notes. It is not a separate website version and must not be used to restore old website source code.

> May 21, 2026 update: the canonical homepage is now intentionally shorter than earlier strategy drafts. Advanced proof should remain available in supporting pages and future expansion content, but the first homepage scroll should not try to explain the entire product.

> May 23, 2026 update: Chrome's agentic web / WebMCP guidance validates MenuList's discovery strategy, but WebMCP is not the strategy itself. MenuList's current PAL contract is public pages, server-rendered JSON-LD, sitemap/robots, `llms.txt`, `llms-full.txt`, and gated API/POS surfaces where enabled. WebMCP and MCP are future gated surfaces, not current website claims.

> May 23, 2026 agent-readable hardening update: active platform pages now emit page-level WebPage/Breadcrumb JSON-LD, homepage structured data is server-rendered, `https://menulist.ai` is the canonical discovery host, and the legacy `/product` redirect is removed from sitemap/LLM inventories.

> June 1, 2026 resource localization update: `/resources` is now an evergreen content layer with reviewed English, Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish resource coverage. Locale-prefixed resource URLs are discovery surfaces only after full source-versioned packs pass verifier coverage; they must stay separate from owner app, customer menu runtime, Firebase, Answerlattice, Canonica, GrowthOS, KitStamp, and other same-repo product surfaces.

---

## Historical Strategy Context

| Aspect             | V1 (Infrastructure)                      | V2 (Hype/Domination)                          |
| ------------------ | ---------------------------------------- | --------------------------------------------- |
| **Goal**           | Build trust + authority                  | Acquire customers + create buzz               |
| **Tone**           | Premium calm, professional               | Direct, transformation-focused, energetic     |
| **Hero message**   | "Your official menu. From one place."    | "Upload your current menu. Publish one official version customers can trust." |
| **Core narrative** | Source of truth, stays aligned           | Menu → Internet Presence (transformation)     |
| **Emotion**        | Relief, trust                            | Surprise, curiosity, "why didn't this exist?" |
| **Language**       | Operational words only                   | Transformation statements, direct outcomes    |
| **When to use**    | After market dominance (10K+ businesses) | NOW — customer acquisition phase              |

---

## ChatGPT Conversation Validation

### What ChatGPT Got RIGHT (Use These)

| #   | Suggestion                                | Verdict             | Notes                                           |
| --- | ----------------------------------------- | ------------------- | ----------------------------------------------- |
| 1   | "Menu → Internet Presence" narrative      | ✅ ADOPT            | Stronger than "source of truth" for acquisition |
| 2   | Show transformation, not features         | ✅ ADOPT            | "Upload menu → business online" is compelling   |
| 3   | Hero = transformation statement           | ✅ ADOPT            | Current version: "Upload your current menu. Publish one official version customers can trust." |
| 4   | Before/After framing for problem section  | ✅ ADOPT            | Makes broken internet obvious                   |
| 5   | Don't call it "QR menu tool" or "AI tool" | ✅ ADOPT            | Already follows language governance             |
| 6   | Interactive demo in hero (future)         | ✅ DEFER            | Good idea but requires significant engineering  |
| 7   | "Powered by MenuList" footer on pages     | ✅ ALREADY EXISTS   | OBP pages already have this                     |
| 8   | Distribution through QR/WhatsApp/Google   | ✅ ALREADY EXISTS   | Product already does this                       |
| 9   | OBP as primary distribution surface       | ✅ ALREADY EXISTS   | OBP fully built                                 |
| 10  | Geographic density strategy               | ✅ ADOPT (strategy) | Focus one city first                            |

### What ChatGPT Got WRONG (Reject/Fix)

| #   | Suggestion                                       | Verdict                  | Why Wrong                                                                       |
| --- | ------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------- |
| 1   | "Restaurant" everywhere                          | ❌ FIX → "business"      | MenuList serves 60+ business types: salons, gyms, retail, etc.                  |
| 2   | "Restaurant website" framing                     | ❌ FIX → "business page" | OBP is an Official Business Page, not a website                                 |
| 3   | Category = "Menu Infrastructure for Restaurants" | ❌ FIX                   | Too narrow. "Menu infrastructure for businesses"                                |
| 4   | Remove all feature explanations                  | ❌ PARTIAL               | Keep Prepared section — it shows unique capabilities ChatGPT doesn't know about |
| 5   | "No website required" messaging                  | ⚠️ CAREFUL               | OBP replaces websites, but don't position as "website killer"                   |
| 6   | Suggested features like QR, OBP, translations    | ❌ ALREADY BUILT         | ChatGPT unaware these already exist in production                               |
| 7   | Rage-bait/controversy strategy (Cluely style)    | ❌ REJECT                | Roy Lee himself admitted launching too early with hype alone                    |
| 8   | "First in the world" claims                      | ❌ REJECT                | ChatGPT correctly warned against this too                                       |

### What ChatGPT MISSED (Codebase Advantages to Highlight)

ChatGPT had zero awareness of these built features:

1. **Decision Blocks** — Most Popular, Quick Pick, Best Value sections auto-generated from customer behavior
2. **Menu Correctness Engine** — 17-rule validation before publish
3. **Special Menu Switching** — Festival/event menus with auto-revert
4. **Temp Status Banners** — "Closed today" banners that auto-expire
5. **Multi-outlet Master→Outlet model** — 150+ edge cases handled
6. **Launch Kit** — QR sticker, table tent, counter card, Instagram story auto-generated
7. **Digital Screens** — Full TV menu display
8. **Schema.org structured data** — Built for Google/AI discovery
9. **llms.txt** — AI agent discovery file
10. **9 languages** — Full i18n infrastructure
11. **AI image generation** — Menu item images without photographer
12. **AI descriptions** — Professional descriptions without copywriter
13. **AI translations** — One-click multi-language
14. **Print files** — PDF and printer handoff files generated from the current approved menu
15. **Menu Trust Signals** — Location, hours, freshness date on customer-facing pages
16. **Menu Quality Signals** — Missing descriptions/images/prices flagged with one-tap fix
17. **Menu Presence Monitor** — Checklist showing where menu is visible across surfaces
18. **Customer Communication Kit** — Pre-written messages with menu link, address, hours

**Rule:** Do not forget these capabilities in the website ecosystem. They are competitive advantages, but they do not all need to sit on the homepage at once.

---

## Current Homepage Section Order

**Changed from V2** — the homepage is compressed so first-time SMB owners see the problem, workflow, setup proof, customer preview, and CTA before advanced feature density.

```
1. HeroSection              — Upload current menu -> one official version
2. ProblemSection           — Internet menus are broken
3. InteractiveWorkflow      — Upload, review, publish, share
4. SetupReliefSection       — Setup work prepared before publishing
5. SurfacesSection          — Public output proof
6. CustomerBrowseSection    — Customer-facing menu preview
7. PreparedForYouSection    — Real-world rollout proof
8. ResourcesSection         — Evergreen owner-useful resources
9. FaqSection               — Questions answered
10. FinalCtaSection         — Close with owner-approved menu CTA
```

**Rationale:** After showing the transformation and public-menu pain, immediately prove the workflow and public customer result. The older `SolutionSection` was removed because its one-source diagram repeated the hero, workflow source map, setup proof, and public-surface proof without adding new buyer evidence. Dense proof areas such as Search/AEO, Analytics, SmartFeatures, Stats, Business, and Industry stay as supporting components/pages so the homepage does not become a feature checklist.

---

## Agent-Readable Public Boundary

PAL means **Public Agentic Layer** for MenuList: public business truth stays readable to humans, crawlers, search engines, and browser/AI agents without moving MenuList into POS, payment, CRM, or fulfillment operations.

Current PAL contract:

- Public pages, server-rendered JSON-LD, sitemap, robots, `llms.txt`, and `llms-full.txt` are the production agent-readable layer.
- Public agents may read owner-published facts and route users to official handoff links.
- Public agents must not mutate business truth, POS state, billing, prices, hours, item availability, owner settings, or sensitive food claims.
- WebMCP and MCP remain future gated implementation surfaces, not public website claims.
- Redirected legacy URLs may preserve user traffic, but they must not be advertised as active sitemap or agent-context destinations.

---

## V2 Content Changes

### Hero (CHANGED)

**Old:** "Your official menu. From one place."
**New:** "Upload your current menu. Publish one official version customers can trust."

- titlePart1: "Upload your current menu."
- titleHighlight: "Publish one official version customers can trust."
- titlePart2: ""
- subtitle: Transformation-focused, grounded in owner approval, but no longer re-lists every public output
- CTA: "Upload your menu →" (action-oriented)
- Secondary CTA: "See customer preview" (`#customer-demo`)
- Caption: "Start with a 7-day setup. Review the public menu before choosing a paid plan."

### Problem (REFRAMED)

**Old:** "Most businesses don't have a single official version of their menu."
**New:** "Business menus on the internet are broken."

- Tiles reframed as internet-broken problems (not internal problems)
- Conclusion: "Businesses update menus. The internet doesn't."

### Solution (REMOVED FROM HOMEPAGE)

**Old:** "Create one official version. Everything else stays aligned."
**Previous current:** "One menu. Public places stay aligned."

- Removed from the homepage in v3.5.8.
- Reason: the SVG and bullets repeated the newer workflow source map and public-surface proof.
- The official-source claim remains active in the hero, workflow, surfaces, and FAQ copy.

### FinalCta (CHANGED)

**Old:** "Make your menu official."
**Current:** "Make one public menu customers can trust."

- Mirrors hero for consistent messaging
- CTA: "Upload your menu →"
- No repeated proof stack below the button; the final CTA should close the page cleanly after the proof sections have already done their job.

### SmartFeatures (EXPANDED — v2.2 March 2026)

**Old:** 2 bullet outcomes ("stays correct" + "staff sees current version")
**New:** 6 structured outcomes with title+description grid

1. **Stays accurate everywhere** — Existing accuracy messaging
2. **Customers trust it instantly** — Menu Trust Signals (location, hours, freshness)
3. **Your menu keeps improving** — Menu Quality Signals (missing items flagged, one-tap fix)
4. **You see where it's visible** — Menu Presence Monitor (surface checklist)
5. **Ready replies for customers** — Customer Communication Kit (pre-written messages)
6. **Your team stays aligned** — Existing staff alignment messaging

**New title:** "After you publish, the system handles the rest."
**Rationale:** SmartFeatures was the thinnest homepage section. Now it's the "post-publish value" section — answering "what happens after you go live?" Transformation narrative: you publish → system handles everything.

### CustomerBrowse (ADDED — v2.6 May 2026)

**New section:** "Customers find what they want faster."

- Placed after SurfacesSection so it answers what happens when customers actually open the menu.
- Sells the customer-facing experience without exposing implementation details such as sticky command layers, modal portals, or smooth-scroll mechanics.
- Proof points: search stays accessible, sections keep large menus browsable, language switching belongs inside the menu, and trust signals stay visible while customers browse.

**Rationale:** The homepage already proves MenuList can publish a menu everywhere. This section proves the public menu itself helps customers browse, trust, and decide faster, which separates MenuList from basic QR menu tools.

### Sections Preserved as Components or Homepage Sections

- **PreparedForYouSection** — Keep rollout proof compact; current homepage renders 5 placement cards instead of a broad capability grid
- **SurfacesSection** — Saved menu shortcut is included as a repeat-access surface; feedback is framed as a public-correction loop; Google/Instagram/WhatsApp placement stays manually framed.
- **StatsSection** — Preserved as supporting component, not mounted on current homepage.
- **BusinessSection** — Preserved as supporting component, not mounted on current homepage.
- **IndustrySection** — Preserved as supporting component/future page material, not mounted on current homepage; do not add separate industry/flexibility homepage copy unless future edits make the page visibly too restaurant-only.
- **InteractiveWorkflowSection** — Content stays, just moved up in order
- **FaqSection** — Minor updates to align with new positioning

---

## V2 Language Rules (Relaxed from V1)

### Still forbidden

- "AI-powered", "Smart", "Intelligent", "Dynamic"
- "Revolutionary", "Game-changing"
- Technical jargon (schema.org, JSON-LD, extraction models)
- Feature-first copy
- Excitement language with exclamation marks

### Now allowed (V2 only)

- Direct transformation statements only when owner approval and public output remain clear.
- Action-oriented CTAs ("Upload your menu")
- Problem-agitation framing ("Business menus on the internet are broken")
- 7-day setup language aligned with pricing/funnel copy

### Core principle

**Hype comes from the TRANSFORMATION, not from language.** Show the practical move from current menu -> reviewed public menu -> customer-facing surfaces. Let the product speak.

---

## V2 Meta Tags

| Page     | Title                                                 | Description                                                                                                      |
| -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Homepage | MenuList - One Official Menu Source for Customers | Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source. |

---

## ChatGPT Review 4 — Marketing Positioning (March 20, 2026)

**Accuracy:** ~40% — most suggestions already exist in codebase/docs.

### Items Adopted

1. **Ad script templates** — 3 concrete formats (Reality Check, Embarrassment Trigger, Silent Authority) added to marketing playbook
2. **PONR commitment language** — FinalCta subtitle changed from "One menu. Everywhere customers look." to "This becomes your official menu link. Share it everywhere — it stays correct."
3. **Sticky CTA on scroll** — New `StickyCta` component, appears after 25% scroll, hides near bottom
4. **Post-publish distribution nudges** — 4-message nudge sequence concept added to marketing playbook (implementation deferred — uses existing lifecycle messaging architecture)
5. **Activation metric** — "% of published businesses on 2+ surfaces within 7 days" added as true north metric

### Items Rejected

1. **"Restaurant" everywhere** — ChatGPT said "restaurant" throughout. Violates Pattern 10 Rule 2 (60+ business types)
2. **Strip landing page to 6 sections** — ChatGPT proposed removing features. Violates Pattern 10 Rule 6. ChatGPT unaware of 18+ built features
3. **"Distribution control layer" identity** — MenuList = Canonical Public Business Truth, not a distribution tool
4. **Dynamic CTA text change** — Over-engineering for unclear gain. Consistent CTA is better for ICP

### Archive

Full review: `_archive/chatgpt-review-marketing-positioning.md`

---

## Web Research Findings

1. **Cluely/Roy Lee:** Viral hype alone isn't enough. Roy Lee admitted "maybe we launched too early." Hype must be backed by working product. MenuList has the product — needs the narrative.
2. **QR menu market:** ~75% of restaurants now use QR menus. Market is crowded for "QR menu tools." Must position as something bigger.
3. **Landing page conversion:** Interactive demos and transformation visuals convert 3-5x better than feature lists (multiple sources).
4. **Startup hype pattern:** Problem → Transformation → Proof → CTA. Never features first.

---

## Canonical Status

The current website implementation is the only source-code version. Use `README.md`, `main-website_impl.md`, and `main-website_content.md` for the active implementation contract.
