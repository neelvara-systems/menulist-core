# Main Website Strategy Spec

**Version:** 3.6.77 — Broad SMB Conversion Readiness
**Status:** CURRENT CONTEXT
**Source:** ChatGPT conversation + Cascade validation + web research

> This file keeps useful strategy context and validation notes. It is not a separate website version and must not be used to restore old website source code.

> May 21, 2026 update: the canonical homepage is now intentionally shorter than earlier strategy drafts. Advanced proof should remain available in supporting pages and future expansion content, but the first homepage scroll should not try to explain the entire product.

> May 23, 2026 update: Chrome's agentic web / WebMCP guidance validates MenuList's discovery strategy, but WebMCP is not the strategy itself. MenuList's current PAL contract is public pages, server-rendered JSON-LD, sitemap/robots, `llms.txt`, `llms-full.txt`, and gated API/POS surfaces where enabled. WebMCP and MCP are future gated surfaces, not current website claims.

> May 23, 2026 agent-readable hardening update: active platform pages now emit page-level WebPage/Breadcrumb JSON-LD, homepage structured data is server-rendered, `https://menulist.ai` is the canonical discovery host, and the legacy `/product` redirect is removed from sitemap/LLM inventories.

> June 1, 2026 resource localization update: `/resources` is now an evergreen content layer with reviewed English, Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish resource coverage. Locale-prefixed resource URLs are discovery surfaces only after full source-versioned packs pass verifier coverage; they must stay separate from owner app, customer menu runtime, Firebase, Answerlattice, Canonica, GrowthOS, KitStamp, and other same-repo product surfaces.

> June 17, 2026 Business Health update: the homepage now carries one focused Business Health section because the owner dashboard, mobile screen, APIs, scheduler read models, cache hardening, action guards, and monitoring surface are implemented. Public strategy may frame it as the AI health check that shows what needs attention, but not as an AI assistant, chatbot, revenue optimizer, prediction product, or autonomous public-truth writer.

> June 9, 2026 Featured Choices update: the Decision Intelligence capability is now represented publicly as `/features/featured-choices`. Buyer-facing copy must use Featured Choices, Featured choice, Quick choice, and Value choice, and must avoid internal Decision Blocks naming, algorithm language, exact decision-time claims, or guaranteed sales-lift claims.

> June 17, 2026 Business Health Features update: the `/features` Operations group now also carries one compact Business Health card so the feature inventory matches the homepage USP. It must stay a calm diagnostic claim: AI health checks, latest MenuList check, last checked date, customer attention, whether anything needs action, No action needed when stable, and safe handoff to AI Menu Manager or existing owner screens.

> June 17, 2026 Business Health campaign update: `/features/business-health` is now the public marketing page for Business Health campaigns. `/business-health` remains the protected owner app route. The campaign page can explain the feature in more depth, but the claim boundary is unchanged: Business Health is an AI diagnostic health check, not an AI assistant, chatbot, realtime sales monitor, revenue optimizer, prediction engine, competitor tracker, or autonomous public-truth editor.

> June 22, 2026 Analytics feature page update: `/features/analytics` is now the public page for the shipped owner analytics dashboard. The page can explain today, overview, daily, weekly, monthly, and overall dashboard views across desktop and mobile, but must keep the claim boundary to aggregate owner summaries, not customer profiling, heatmaps, revenue attribution, BI, or guaranteed sales improvement.

> June 22, 2026 broad SMB conversion update: the active website now uses `Create customer link ->` for the main `/create-menu` funnel and frames the source as a current menu, service list, catalogue, price list, rate card, or public offering list. Restaurants/cafes remain strong proof categories, but salons/spas and other list-driven SMBs are first-class positioning proof.

---

## Historical Strategy Context

| Aspect             | V1 (Infrastructure)                      | V2 (Hype/Domination)                          |
| ------------------ | ---------------------------------------- | --------------------------------------------- |
| **Goal**           | Build trust + authority                  | Acquire customers + create buzz               |
| **Tone**           | Premium calm, professional               | Direct, transformation-focused, energetic     |
| **Hero message**   | "Your official menu. From one place."    | "Turn your current menu or service list into your official customer link." |
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
| 3   | Hero = transformation statement           | ✅ ADOPT            | Current version: "Turn your current menu or service list into your official customer link." |
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

1. **Featured Choices** — Featured, Quick, and Value choices on the customer menu, with owner control and settled menu-signal support where enough activity exists
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
14. **Print files** — Paper menu PDFs, table cards, counter cards, and printer handoff files generated from the current approved menu
15. **Menu Trust Signals** — Location, hours, freshness date on customer-facing pages
16. **Menu Quality Signals** — Missing descriptions/images/prices flagged with one-tap fix
17. **Menu Presence Monitor** — Checklist showing where menu is visible across surfaces
18. **Customer Communication Kit** — Pre-written messages with menu link, address, hours
19. **Business Health** — AI health check that combines latest menu/public-surface state, cached customer attention, freshness, multi-location status, safe handoff to AI Menu Manager or existing owner screens, and No action needed state. It appears on the homepage, as a `/features` Operations card, and as the dedicated public campaign page at `/features/business-health`.
20. **Analytics dashboard** — Today, overview, daily, weekly, monthly, and overall owner dashboard views exist across desktop and mobile. Public copy can explain aggregate menu, Official Business Page, action, search, and customer app activity without turning MenuList into a BI product.
21. **Header-level feature campaigns** — Menu Import, Official Business Page, QR Menu and Links, Owner PWA Dashboard, Business Health, and Public Discovery are the current header dropdown feature set because they map directly to SMB owner purchase confidence: start from the current menu, publish one public source, share it, manage core owner workflows from phone or PWA, know what needs attention, and provide a clearer public source.

**Rule:** Do not forget these capabilities in the website ecosystem. They are competitive advantages, but they do not all need to sit on the homepage at once.

---

## Current Homepage Section Order

**Changed from V2** — the homepage is compressed so first-time SMB owners see the private-preview path, the before/after problem, customer proof, owner proof, and CTA without advanced feature density.

```
1. HeroSection                  — Current list -> one official customer link
2. CreateMenuPreviewSection     — Try-first private-preview path
3. BeforeAfterSection           — Old scattered-menu state vs one current link
4. CustomerBrowseSection        — Customer-facing menu preview
5. CustomerLinkIncludesSection  — Compact official-link output proof
6. OwnerProofSection            — AI Menu Manager + Business Health proof
7. FaqSection                   — Conversion-critical questions
8. FinalCtaSection              — Close with owner-approved menu CTA
```

**Rationale:** After showing the private-preview path and public-menu pain, immediately prove the customer result and what the approved link includes. Business Health stays inside `OwnerProofSection`, where Weekly Menu Review is one supporting proof rather than a new homepage section. The deeper `BusinessHealthSection` remains unmounted. Dense proof areas such as Search/AEO, Analytics, SmartFeatures, Stats, Business, and Industry stay as supporting components/pages so the homepage does not become a feature checklist.

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
**New:** "Turn your current menu or service list into your official customer link."

- titlePart1: "Turn your current menu or service list into"
- titleHighlight: "your official customer link."
- titlePart2: ""
- subtitle: Transformation-focused, grounded in owner approval, and broad enough for menus, service lists, catalogues, and price lists
- CTA: "Create customer link →" (broad acquisition action)
- Secondary CTA: "See customer link" (`/features/official-business-page`)
- Caption: "Start with a 7-day setup. Review the public version before choosing a paid plan."

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
**Current:** "Make one public source customers can trust."

- Mirrors hero for consistent messaging
- CTA: "Create customer link →"
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
- Action-oriented CTAs ("Create customer link")
- Problem-agitation framing ("Business menus on the internet are broken")
- 7-day setup language aligned with pricing/funnel copy

### Core principle

**Hype comes from the TRANSFORMATION, not from language.** Show the practical move from current menu/service list -> reviewed public source -> customer-facing surfaces. Let the product speak.

---

## V2 Meta Tags

| Page     | Title                                                 | Description                                                                                                      |
| -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Homepage | MenuList - One Official Customer Link for Menus and Services | Turn your current menu or service list into one official customer link for business page, QR, print files, customer actions, owner updates, feedback, and health checks. |

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
