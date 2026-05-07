# Customer-Facing Digital Menu — Product Specification

**Feature Name:** Client Menu (Customer-Facing Digital Menu)  
**Document Type:** Product Requirements Document (PRD)  
**Status:** ✅ Production Ready  
**Last Updated:** May 7, 2026
**Audience:** Product, CEO, Business Teams, Non-Technical Stakeholders

---

## Executive Summary

The Customer-Facing Digital Menu is the **public-facing interface** that restaurant customers see when they scan a QR code or visit a restaurant's menu URL. It is the most critical customer touchpoint in MenuListAi.

### What It Is

A **live, intelligent digital menu** that:

- Updates in real-time when owners make changes
- Shows smart recommendations (Decision Blocks) without exposing AI
- Works on any device (mobile-first, responsive)
- Supports custom branding and multi-language
- Preserves a locked public information structure even when the owner chooses a project-wise menu mood or layout

### What It Is NOT

- ❌ A static PDF or image menu
- ❌ An ordering system (no checkout/payment)
- ❌ An analytics dashboard for customers
- ❌ A marketing campaign display
- ❌ A website builder or freeform design surface

### Business Value

| Metric                 | Value                            |
| ---------------------- | -------------------------------- |
| First Contentful Paint | < 1.5s                           |
| Customer Decision Time | 60s → 15s (with Decision Blocks) |
| Owner Effort           | Zero (auto-updates)              |
| Word-of-Mouth Trigger  | 3 Auto-Sell Features             |

---

## Goals & Objectives

### Primary Goals

1. **Reduce customer decision time** from 60 seconds to 15 seconds
2. **Create visible differentiation** from paper/static QR menus
3. **Enable word-of-mouth** through memorable behaviors
4. **Require zero daily effort** from restaurant owners

### Success Metrics

| Metric                    | Target           | How Measured     |
| ------------------------- | ---------------- | ---------------- |
| Menu load time            | < 2 seconds      | Lighthouse       |
| Decision Block engagement | > 10% click rate | Analytics        |
| Return visits             | > 30% same-week  | Session tracking |
| Owner retention           | > 70% 30-day     | Platform metrics |

---

## Scope

### In Scope

| Feature                     | Description                    | Status  |
| --------------------------- | ------------------------------ | ------- |
| Multi-tenant domain routing | Subdomains + custom domains    | ✅ Done |
| SEO optimization            | Metadata, Schema.org, sitemap  | ✅ Done |
| Decision Blocks             | Smart recommendations          | ✅ Done |
| Live Indicator              | "Live · updated recently" trust signal | ✅ Done |
| Instant Availability        | Sold-out items fade instantly  | ✅ Done |
| Time-Based Categories       | Categories show/hide by time   | ✅ Done |
| Multi-language support      | Customer selects language      | ✅ Done |
| Analytics tracking          | Internal + third-party         | ✅ Done |
| Offline resilience          | PWA with service worker        | ✅ Done |
| State persistence           | Scroll, filter, category saved | ✅ Done |

### Out of Scope

| Feature           | Reason                          |
| ----------------- | ------------------------------- |
| Ordering/checkout | Not a POS system                |
| Customer accounts | Unnecessary friction            |
| Personalization   | Complexity without proven value |
| Real-time chat    | Different product category      |
| Table booking     | Out of scope for menu           |

---

## User Stories

### Customer Stories

| #   | As a...             | I want to...                        | So that...                      |
| --- | ------------------- | ----------------------------------- | ------------------------------- |
| C1  | Restaurant customer | Scan QR and see menu instantly      | I can decide what to order      |
| C2  | Customer            | See what's popular/recommended      | I don't have to read everything |
| C3  | Customer            | Know if an item is sold out         | I don't order unavailable items |
| C4  | Customer            | See menu in my language             | I understand all items          |
| C5  | Customer            | Return to where I was after refresh | I don't lose my place           |

### Owner Stories

| #   | As a...          | I want to...                    | So that...                         |
| --- | ---------------- | ------------------------------- | ---------------------------------- |
| O1  | Restaurant owner | Update menu and see it live     | Customers see current offerings    |
| O2  | Owner            | Mark items sold out instantly   | Customers stop ordering them       |
| O3  | Owner            | Set time windows for categories | Breakfast/lunch/dinner auto-switch |
| O4  | Owner            | Have my branding on menu        | It looks like my restaurant        |
| O5  | Owner            | Use my own domain               | It looks professional              |

---

## User Flows

### Flow 1: Customer Views Menu

```
Customer scans QR code
    ↓
Browser navigates to joespizza.menulist.ai
    ↓
Middleware detects subdomain, sets headers
    ↓
Page loads store data + default project
    ↓
SEO metadata + Schema.org injected
    ↓
Home page renders (hero, branding)
    ↓
Customer taps "View Menu"
    ↓
Menu page renders with:
  - Decision Blocks (if available)
  - Categories + Items
  - Live indicator
  - Language selector
    ↓
Customer browses, taps item for details
    ↓
All interactions tracked for intelligence
```

### Flow 2: Owner Marks Item Sold Out

```
Owner opens dashboard
    ↓
Navigates to project editor
    ↓
Finds item, taps "Available/Unavailable" toggle
    ↓
Change saves to Firestore
    ↓
Customer menu updates instantly:
  - Item fades to 40% opacity
  - "Sold out" label appears
  - No page reload needed
```

### Flow 3: Time-Based Category Switch

```
Store has "Breakfast" category
  - Time window: 7:00 AM - 11:00 AM
    ↓
At 10:55 AM: Customer sees "Breakfast ends in 5 minutes"
    ↓
At 11:00 AM: Breakfast category fades out
    ↓
Lunch category appears automatically
    ↓
No owner action required
```

---

## Features

### 1. Multi-Tenant Domain Routing

**What:** Serve menus via subdomains or custom domains.

| URL Type      | Example                        | How It Works                                    |
| ------------- | ------------------------------ | ----------------------------------------------- |
| Subdomain     | `joespizza.menulist.ai`        | Middleware reads subdomain, looks up store      |
| Custom Domain | `joespizza.com`                | DNS points to us, middleware looks up by domain |
| Slug Path     | `joespizza.menulist.ai/drinks` | Multiple projects per store                     |

### 2. Decision Blocks

**What:** Smart recommendations that help customers decide faster.

| Block Type | Customer Sees         | Purpose          |
| ---------- | --------------------- | ---------------- |
| Popular    | "People often choose" | Social proof     |
| Quick Pick | "Ready quickly"       | Speed-conscious  |
| Best Value | "Good choice"         | Budget-conscious |

**Key Rules:**

- Maximum 3 blocks
- 1 item per block (single recommendation)
- Precomputed nightly (no runtime AI)
- Fails silently if no data

### 3. Auto-Sell Features

**What:** Visible behaviors that differentiate from paper menus.

| Feature               | Customer Sees                | Effect   |
| --------------------- | ---------------------------- | -------- |
| Live Indicator        | "Live · updated recently" | Trust    |
| Instant Availability  | Item fades when sold out     | Surprise |
| Time-Based Categories | "Lunch starts in 12 min"     | Stories  |

### 4. SEO Optimization

**What:** Full search engine optimization for each menu.

| Component          | Implementation                        |
| ------------------ | ------------------------------------- |
| Dynamic Metadata   | Title, description, OG tags per store |
| Schema.org JSON-LD | Restaurant + Menu structured data     |
| Per-client Sitemap | `{domain}/sitemap.xml`                |
| Per-client Robots  | `{domain}/robots.txt`                 |
| Canonical URLs     | Custom domain takes precedence        |

### 5. Analytics Tracking

**What:** Comprehensive behavior tracking for intelligence.

| Tracking Type      | Events                                              |
| ------------------ | --------------------------------------------------- |
| Internal           | Menu view, item click, Decision Block click, search |
| Google Analytics   | Page view, item list, item detail                   |
| Facebook Pixel     | PageView, ViewContent                               |
| Enhanced Ecommerce | Product impressions, detail views                   |

---

## Requirements

### Functional Requirements

| ID   | Requirement                         | Priority | Status |
| ---- | ----------------------------------- | -------- | ------ |
| FR1  | Menu loads in < 2 seconds on 3G     | P0       | ✅     |
| FR2  | Subdomain routing works             | P0       | ✅     |
| FR3  | Custom domain routing works         | P0       | ✅     |
| FR4  | Decision Blocks display correctly   | P0       | ✅     |
| FR5  | Items show availability status      | P0       | ✅     |
| FR6  | Time-based categories work          | P1       | ✅     |
| FR7  | Multi-language selection works      | P1       | ✅     |
| FR8  | State persists on refresh           | P1       | ✅     |
| FR9  | Offline mode works (cached content) | P1       | ✅     |
| FR10 | Analytics track all events          | P1       | ✅     |
| FR11 | Public category identity avoids raw emoji rendering | P0 | ✅ |
| FR12 | Public output uses localized fallback for menu/category/item labels | P0 | ✅ |
| FR13 | Image-enabled layouts reserve stable image slots | P0 | ✅ |

### Non-Functional Requirements

| ID   | Requirement              | Target          |
| ---- | ------------------------ | --------------- |
| NFR1 | First Contentful Paint   | < 1.5s          |
| NFR2 | Largest Contentful Paint | < 2.5s          |
| NFR3 | Time to Interactive      | < 3.5s          |
| NFR4 | Mobile responsiveness    | 100%            |
| NFR5 | WCAG 2.1 AA compliance   | 100%            |
| NFR6 | Offline data persistence | Session storage |
| NFR7 | Layout stability         | No image-driven scroll jumps |
| NFR8 | Theme governance         | Locked primitives across presets |

### Public UI Governance Requirements

| Area | Requirement |
| ---- | ----------- |
| Theme system | Owners can choose existing menu moods/layouts, but cannot change public layout order, custom CSS, custom fonts, or interaction behavior. |
| Category identity | Public category icons must use controlled icon rendering. `emoji:*` values may remain in stored data/editor context, but public output renders a glyph fallback. |
| Navigation | Search and category rail are the primary orientation/retrieval layer. The floating category control is a `Sections` navigator, not a generic menu button. |
| Typography | Category headings must orient the user without becoming decorative title screens. Item names/descriptions use line limits to preserve scanning rhythm. |
| Images | Images support item understanding. They cannot turn the menu into a feed, and missing/broken images must not collapse reserved layout space. |
| Footer | Business identity comes before platform attribution. MenuList attribution is quiet infrastructure metadata, not a growth-marketing CTA. |
| Localization | Public labels must use the shared localization fallback path instead of reading only `activeLanguage`. |

### Firebase Cost Impact

| Operation        | Per Menu View         | Daily (1000 views) |
| ---------------- | --------------------- | ------------------ |
| Store lookup     | 1 read                | 1,000 reads        |
| Project metadata | 1 read                | 1,000 reads        |
| Project data     | 1 read                | 1,000 reads        |
| Decision Blocks  | 1 read                | 1,000 reads        |
| Store details    | 1 read                | 1,000 reads        |
| Analytics write  | 1 write               | 1,000 writes       |
| **Total**        | **5 reads + 1 write** | **~$0.50/day**     |

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER REQUEST                             │
│                                                                  │
│   joespizza.menulist.ai  →  joespizza.menulist.ai/drinks        │
│   joespizza.com          →  joespizza.com/bar-menu              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MIDDLEWARE                                   │
│                                                                  │
│   1. Parse hostname (resolveDomain)                             │
│   2. Determine tenant type (subdomain vs custom)                │
│   3. Rewrite to /_client/[[...slug]]                            │
│   4. Set headers (x-tenant-subdomain, x-tenant-type)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT MENU PAGE (Server)                    │
│                                                                  │
│   1. Read tenant headers                                         │
│   2. Lookup store by subdomain/custom domain                    │
│   3. Find project by slug or default                            │
│   4. Fetch precomputed Decision Blocks                          │
│   5. Generate SEO metadata + Schema.org                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT MENU RENDERER (Client)                │
│                                                                  │
│   1. Inject analytics trackers                                   │
│   2. Detect device type                                          │
│   3. Render Home or Menu page                                    │
│   4. Display Decision Blocks                                     │
│   5. Track all interactions                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
ClientMenuPage (Server Component)
├── Schema.org JSON-LD
└── ClientMenuRenderer (Client Component)
    ├── GoogleSearchConsole
    ├── GoogleAnalytics
    ├── FacebookPixel
    ├── EnhancedEcommerce
    └── UnifiedAnalyticsTracking
        └── MainContentRenderer
            ├── HomePageNew (home screen)
            └── MenuPageNew (menu screen)
                ├── DecisionBlocks
                ├── Categories
                ├── Items
                └── Footer
```

---

## Risks & Mitigations

| Risk                             | Impact | Probability | Mitigation                              |
| -------------------------------- | ------ | ----------- | --------------------------------------- |
| Slow menu load on cheap phones   | High   | Medium      | SSR, PWA caching, optimized images      |
| Decision Blocks show wrong items | Medium | Low         | Nightly precompute, availability filter |
| Custom domain DNS issues         | Medium | Medium      | Clear setup docs, verification flow     |
| Analytics tracking blocked       | Low    | Medium      | First-party tracking, fallback counters |
| State lost on refresh            | Medium | Low         | Session storage persistence             |

---

## Open Questions

| #   | Question                                                  | Status                                 |
| --- | --------------------------------------------------------- | -------------------------------------- |
| 1   | Should we add customer preferences (veg/non-veg default)? | Deferred - Monitor feedback            |
| 2   | Should we support multiple languages simultaneously?      | Deferred - Single language per session |
| 3   | Should we add table number detection for future ordering? | Out of scope - Not a POS               |

---

## Deferred Items (Implemented March 15, 2026)

All items from the ChatGPT review have been implemented or verified as already done.

| #   | Item                                          | Status          | Implementation                                                 |
| --- | --------------------------------------------- | --------------- | -------------------------------------------------------------- |
| D1  | Deep linking for individual items             | ✅ Already done | `/menu/item/{slug}-{shortId}` URL pattern in menuPageNew.tsx   |
| D2  | Structured dish metadata (allergens, dietary) | ✅ Implemented  | `ExtractedDataItem` + schema.org `suitableForDiet`/`nutrition` |
| D3  | Lazy language loading                         | ✅ Implemented  | `optimizeLanguagePayload()` strips non-primary descriptions    |
| D4  | Menu payload splitting for 300+ item menus    | ✅ Implemented  | Progressive rendering via IntersectionObserver (150+ items)    |
| D5  | Analytics scripts lazy loading                | ✅ Implemented  | GA4/FB/EE converted to `dynamic()` imports with `ssr: false`   |
| D6  | Text-first ultra-light fallback               | ✅ Implemented  | "Loading menu..." fades in after 3s in MenuSkeleton            |
| D7  | State persistence version key                 | ✅ Implemented  | `menuState_v2_${projectId}` prevents stale parse errors        |
| D8  | Decision Blocks availability filter           | ✅ Already done | `selectAvailableCandidate()` runtime filter in DecisionBlocks  |

### Permanently Rejected

| Item                                | Rejection Reason                                     |
| ----------------------------------- | ---------------------------------------------------- |
| Chef notes / restaurant stories     | Violates constitution: "Silence Is a Feature"        |
| Promotions / engagement / loyalty   | Violates Feature Rejection Gate. Belongs to GrowthOS |
| Ordering / checkout                 | Not a POS system (permanent exclusion)               |
| Customer accounts / personalization | Unnecessary friction                                 |
| Full custom design system           | Redundant with existing antd + SCSS                  |
| Flatten project data structure      | Violates 3-year schema freeze                        |
| "Offer Catalog" identity change     | Premature — focus on restaurant menu dominance first |
| Freeform public menu customization  | Weakens canonical public surface consistency         |
| Public engagement counters          | Creates activity theater instead of operational trust |
| Feed-like/image-first menu browsing | Reduces scan speed and public information clarity    |

---

## Strategic Positioning (Validated March 15, 2026)

### What This Surface Is

The customer-facing digital menu is **not just a UI**. It is the **primary public interface** of MenuList's truth layer — the canonical representation of what a business publicly offers.

### 5-Phase Evolution Path

1. **Phase 1 — Reliable Menu Interface** (Current): Fast, accurate, shareable, SEO-indexed
2. **Phase 2 — Structured Menu Authority**: Structured data graph consumable by external systems (Pull API, schema.org)
3. **Phase 3 — Universal Menu URL**: MenuList link used on Google Business Profile, Instagram, WhatsApp, QR codes, website
4. **Phase 4 — Menu Intelligence Layer**: Silent intelligence improving Decision Blocks over time
5. **Phase 5 — Global Menu Infrastructure**: APIs consumed by AI assistants, search engines, delivery platforms

### The Real Competitive Advantage

Not technology — **installed presence**. When restaurants use `restaurant.menulist.ai` everywhere (QR codes, Google, Instagram, website), switching requires replacing all links. This creates natural lock-in without contracts.

### Core Success Metric

> **Restaurants using MenuList as their primary menu link** — not dashboard sessions, not feature usage, not session time.

### SMB Compatibility (Future)

Current architecture is ~80% compatible with non-restaurant SMBs (salons, gyms, bakeries, spas). The core pattern (Business → Categories → Items) generalizes well. Only minor schema additions needed (duration, variants, offerType) — deferred until restaurant dominance is established.

---

## Related Documents

| Document                                          | Purpose                            |
| ------------------------------------------------- | ---------------------------------- |
| `_impl.md`                                        | Technical implementation blueprint |
| `_marketing.md`                                   | Sales/marketing collateral         |
| `analytics-tracking/_spec.md`                     | Analytics tracking specification   |
| `analytics-tracking/_impl.md`                     | Analytics implementation details   |
| `autosell-features/_spec.md`                      | Auto-Sell features specification   |
| `autosell-features/_impl.md`                      | Auto-Sell implementation details   |
| `client-menu_firebase.md`                         | Firebase cost tracking             |
| `multi-tenant-architecture.md`                    | Domain routing architecture        |
| `seo-implementation-guide.md`                     | SEO/Schema.org implementation      |
| `_archive/chatgpt-review-infrastructure-audit.md` | ChatGPT review (March 2026)        |
| `_archive/client-menu_chatgpt-ui-ux-review-progress.md` | May 2026 screenshot-only UI/UX review validation and progress |

---

## Approval

| Role             | Name        | Date       |
| ---------------- | ----------- | ---------- |
| Product Owner    | [Signature] | 2026-01-12 |
| Engineering Lead | [Signature] | 2026-01-12 |
| CEO              | [Signature] | 2026-01-12 |

---

_Document Status: ✅ PRODUCTION READY_  
_Last Updated: May 7, 2026_
