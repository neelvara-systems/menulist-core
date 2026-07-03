# OBP Infrastructure Domination Plan — 3-Year Architectural Lock

**Status:** ACTIVE  
**Date:** March 11, 2026 (Revised — Doctrine-Free Analysis)  
**Author:** Cascade (Lead Architect)  
**Source:** ChatGPT 14K-line conversation + Independent web research + Fresh-from-scratch analysis  
**Freeze Period:** March 2026 → March 2029  
**Audience:** Founder, Developers, Future Cascade sessions

---

## Methodology — How This Document Was Built

Three independent lenses, doctrine set aside:

1. **ChatGPT conversation** — 10 presence gaps + 10 infrastructure layers (14,048 lines)
2. **Independent web research** — Birdeye State of GBP 2025, BrightLocal SMB Marketing 2025, Amsive AEO Guide 2025, Trustmary review statistics, CRO benchmark data, SEOMator AI citation analysis (177M citations)
3. **My own fresh analysis** — Treating MenuList as MY product. No constitution filter. Pure "what wins in the market" thinking.

### Key Research Data Points

| Stat                                                                           | Source                    | Implication                                                         |
| ------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------- |
| 93% of consumers read reviews before purchasing                                | Qualtrics                 | OBP without ANY review signal is missing the #1 trust mechanism     |
| 86% of GBP views come from category searches ("dentist near me"), not brand    | Birdeye 2025              | Discovery is everything — pages must be findable by non-customers   |
| Only 35% of SMBs have a Google Business Profile                                | BrightLocal 2025          | MASSIVE opportunity — 65% of SMBs have no canonical presence at all |
| Reviews boost conversion 38-67%                                                | Trustmary/Eurokangas      | Even referencing external reviews creates measurable lift           |
| 62% of consumers more likely to purchase after seeing customer photos          | FindStack                 | Visual proof is a conversion multiplier                             |
| AI search visitors convert 23x higher than traditional                         | WebFX                     | AEO optimization is the highest-ROI investment right now            |
| Businesses with 15+ photos get stronger engagement across ALL actions          | Birdeye 2025              | Photos aren't vanity — they're trust infrastructure                 |
| <5% of GBP profiles use Reserve with Google                                    | Birdeye 2025              | Booking/reservation integration is massively underutilized          |
| Perplexity drives 6-10x higher CTR than ChatGPT                                | Amsive/Profound           | AI platforms are becoming primary referral sources                  |
| LLMs prefer single comprehensive structured sources                            | SEOMator (177M citations) | OBP's clean structured design is already AEO-optimized              |
| 58% of consumers will pay more/travel further for businesses with good reviews | FindStack                 | Review signals directly impact revenue                              |
| Customers decide in 3-5 seconds whether to act on a business page              | Birdeye 2025              | Every element must earn its space                                   |

---

## Part 1: The Honest Truth About Current OBP

If I look at OBP from scratch — as a customer landing on `joespizza.menulist.ai` for the first time — here's what I see and what's missing:

### What OBP Does Well (Keep These)

- **Clean, fast identity page** — loads instantly, no clutter
- **One-link model** — replaces PDF/Instagram/WhatsApp chaos
- **Structured schema.org** — machine-readable entity data
- **Server-rendered** — perfect for SEO/AEO crawlers
- **Open/closed status** — real-time operational awareness
- **Action buttons** — Call, WhatsApp, Directions, Reserve, Order
- **TempStatus banners** — operational state communication
- **Analytics pipeline** — full daily/weekly/monthly tracking

### What's Missing That MATTERS (The Real Gaps)

#### Gap A — Google Review Rating (THE biggest gap)

**Research says:** 93% read reviews. 58% will pay more for good reviews. Reviews boost conversion 38-67%.

**Current OBP:** Zero review signal. Not even a Google rating reference.

**My verdict:** This is the single biggest credibility gap. We do NOT need to host reviews (moderation nightmare). But we MUST reference the business's existing Google rating. A simple "4.5 ★ on Google" with a link to the Google listing is a massive trust signal with ZERO infrastructure cost.

**How:** Owner enters their Google review URL and optional rating/count. Display it on OBP as a small trust badge and, when enabled, a Google Reviews quick action. This keeps review hosting out of MenuList while still giving customers a direct path to the existing public review source.

**Simpler version (v1):** Just show Google Review URL as a "See reviews on Google" link. No rating fetch needed. Even this creates trust.

#### Gap B — Business Photos (Preview + Viewer, not page gallery)

**Research says:** 62% more likely to purchase after seeing photos. GBP profiles with 15+ photos dominate. Even low-quality images increase perceived legitimacy.

**Current OBP:** Only logo. No environment/food/storefront photos.

**My verdict:** We don't need a masonry/page gallery (that's page-builder territory). But business photos (storefront, interior, hero product) dramatically increase trust. Think Google Business Profile — a small preview appears first, with deeper viewing only after customer intent.

**How:** Add optional `publicPresence.photos?: string[]`. Display the first 3 as a small horizontal preview. Tapping any preview photo opens a viewer for all uploaded photos. Owner uploads via Business Settings.

#### Gap C — Page Content Depth for SEO/AEO

**Research says:** LLMs prefer comprehensive single sources. Thin pages struggle with AI citations. "160 characters" is the AI snippet extraction window.

**Current OBP:** Very thin — name, status, buttons, address. Not enough textual content for AI to extract answers from.

**My verdict:** OBP needs structured FAQ-like content that AI can extract. NOT marketing copy. Infrastructure-grade structured answers to common queries: "What are the hours?", "Where is it located?", "What type of food?", "Do they deliver?", "What's the price range?"

**How:** Auto-generate a structured info section from existing store data — hours breakdown (all days), cuisine types, price range, service modes (dine-in/takeaway/delivery), payment methods. This is NOT "about us" content — it's structured entity data displayed as readable text.

#### Gap D — Multi-Project Menu Handling

**Research says:** Restaurants frequently have multiple menus (Food, Bar, Dessert, Brunch).

**Current OBP:** `/menu` always shows default project only.

**My verdict:** When store has >1 published project, the "View Menu" button should either show a project list or the OBP should show multiple menu links. Forcing a single default is fragile.

#### Gap E — QR Intent Routing

**ChatGPT identified this correctly.** Table QR scans = menu intent. Shared link = identity intent.

**Current:** QR from dashboard encodes root URL → lands on OBP → requires extra tap to menu.

**My verdict:** Dashboard should generate TWO QR codes: "Identity QR" (root → OBP) and "Menu QR" (/menu → direct menu). Let owner choose which to print.

#### Gap F — Conversion Tracking (OBP→Menu)

**Already implemented in this session.** `OBP_MENU_CLICK` event via `OBPMenuCTA.tsx`. ✅

#### Gap G — Freshness & Authority Signals

**Already implemented in this session.** Freshness text, "Official Page" badge, established year. ✅

#### Gap H — Permanent Closure State

**Already implemented in this session.** `permanentlyClosed` field + OBP display + schema signal. ✅

---

## Part 2: What ChatGPT Got Right

1. **OBP is closer to Google Business Profile than Linktree** — Confirmed by research. GBP dominates because of structured data + reviews + actions. OBP should aim there.

2. **Trust signals are the #1 conversion factor** — Research confirms overwhelmingly. Reviews, photos, freshness = the trust triangle.

3. **Discovery is mostly category search, not brand** — 86% category searches (Birdeye). OBP must be optimized for "restaurant near me" queries, not just direct links.

4. **Entity authority requires @id, mainEntityOfPage, identifiers** — Standard AEO practice confirmed by Amsive research.

5. **Default link behavior is the distribution engine** — Only 35% of SMBs even have GBP (BrightLocal). If MenuList makes it EASIER to have a canonical page than Google does, adoption wins.

6. **AI consumption is the next frontier** — AI visitors convert 23x higher. Structured pages win citations. OBP's SSR + schema design is already strong here.

7. **Cross-surface presence control belongs to a separate layer** — Correct. SurfaceOS scope. OBP should be the anchor, not the distributor.

---

## Part 3: What ChatGPT Got Wrong

1. **"OBP page is thin for SEO"** — PARTIALLY wrong. The page IS thin, but that's fine for entity queries. However, it IS too thin for AI answer extraction. Need structured content section.

2. **"Need adaptive UI based on intent/location/time"** — Wrong approach. OBP should stay static-rendered for performance. Intent routing should happen at the URL level (/menu for QR, / for share), not at runtime.

3. **"Need visitor segmentation / behavioral learning"** — Too complex for the truth layer. Keep analytics simple.

4. **"Need popularity signals like 'customers visited today'"** — I agree with the previous rejection. This is engagement bait.

---

## Part 4: What NEITHER ChatGPT NOR Previous Analysis Caught

These are MY independent findings from web research:

### Discovery 1 — Structured FAQ Section (AEO Critical)

SEOMator analysis of 177M AI citations shows listicles/structured content gets 32% of all AI citations. OBP currently has almost zero extractable text content. AI systems cannot answer "What are the hours at Joe's Pizza?" from the current OBP because hours are displayed visually but not in a structured, extractable text format.

**Action:** Add a structured info section with clear headings: Hours, Location, Services, Payment, Contact. Each with clean text content AI can extract.

### Discovery 2 — Server-Side Rendering Is Even More Critical Than We Thought

Amsive AEO research confirms: "AI crawlers have limited time budgets and may abandon slow-loading pages." Many AI chatbots cannot reliably execute JavaScript. OBP's SSR design is a MASSIVE advantage. But any client-side-only content (like dynamic status) won't be seen by AI crawlers.

**Action:** Ensure ALL critical business data (hours, address, phone, status) is in the initial SSR HTML, not hydrated by client components.

### Discovery 3 — Google AI Mode Prioritizes GBP Over Websites

Amsive research shows Google AI Mode returns GBP listings, not websites, even for non-local queries. This means OBP's biggest competitor for "source of truth" status is Google itself.

**Action:** OBP must be so much richer and more structured than GBP that AI systems prefer it. Schema depth + comprehensive structured content = the differentiator.

### Discovery 4 — 65% of SMBs Have NO Canonical Online Presence

BrightLocal 2025: Only 35% have GBP. Only 40% have a website. This is the real opportunity — MenuList can be the FIRST canonical presence for millions of businesses that have nothing.

**Action:** This validates the "auto-generated on sign-up" approach. OBP should be the easiest canonical presence page on the internet to create.

### Discovery 5 — Review Reference Display

If a business has a Google review URL and rating/count reference, OBP can render it visibly as a trust badge and review link. MenuList does not emit `AggregateRating` markup for owner-entered Google rating references because MenuList is not hosting first-party review markup.

**Action:** When owner provides Google review URL + optional rating info, render the visible trust badge/link only.

---

## Part 5: BUILD NOW — Revised Implementation Checklist

### Priority 1: Google Review Reference (HIGHEST IMPACT) — ✅ IMPLEMENTED

- [x] Add `publicPresence.googleReviewUrl?: string` to store.ts
- [x] Add `publicPresence.googleRating?: number` to store.ts
- [x] Add `publicPresence.googleReviewCount?: number` to store.ts
- [x] Display on OBP: "⭐ 4.5 on Google (320 reviews)" with link to Google review page
- [x] Keep Google rating references visible only; do not emit `AggregateRating` schema for owner-entered Google review data
- [x] Add Google review fields to OfficialPageTab.tsx (URL + rating + count inputs)

### Priority 2: Business Photos (first 3 preview, full tap viewer) — ✅ IMPLEMENTED

- [x] Add `publicPresence.photos?: string[]` to store.ts
- [x] Display first 3 on OBP as horizontal photo strip (lazy-loaded, fixed aspect)
- [x] Open all uploaded photos in a tap viewer with previous/next navigation
- [x] Add photo placeholder UI to OfficialPageTab.tsx
- [x] Emit `image` array in schema.org via `buildImageSchema()` (logo + photos combined)

### Priority 3: Structured Info Section (AEO Critical) — ✅ IMPLEMENTED

- [x] Add structured hours breakdown section (`getAllHoursDisplay()` — all 7 days, SSR)
- [x] Add service modes display (`buildServiceModes()` — dine-in/takeaway/delivery)
- [x] Add payment methods display (`buildPaymentMethods()` — cash/cards/UPI)
- [x] Add cuisine types display from store.cuisineTypes
- [x] Add price range display from store.priceRange
- [x] All content server-rendered in SSR HTML (not client-hydrated) for AI crawlers

### Priority 4: Dual QR Codes — ✅ IMPLEMENTED

- [x] Dashboard OBPLinkCard generates TWO QR options via Segmented toggle
- [x] "Share QR (Business Page)" — root URL for bio/packaging/cards
- [x] "Menu QR (Direct Menu)" — /menu URL for table tents/dine-in
- [x] Download QR button with type-specific filename
- [x] Context labels: "For Instagram bio, packaging" vs "For table tents, dine-in"

### Priority 5: Multi-Project Menu — DEFERRED

- [ ] When store has >1 published project AND ENABLE_OBP is true:
  - Show "View Menu" as dropdown or show multiple menu links on OBP
  - `/menu` route shows project selector (not just default)
- **Reason:** Requires deeper routing changes in `client/[[...slug]]/page.tsx`. Separate session.

### Already Implemented (Session — Round 1)

- [x] Schema.org: `@id`, `mainEntityOfPage`, `identifier` (MenuList Entity ID), `foundingDate`
- [x] `permanentlyClosed` field + OBP display + schema signal
- [x] `publicPresence.establishedYear` + "Serving since" display
- [x] Freshness signal (getFreshnessText)
- [x] "Official Page" authority badge in footer
- [x] `OBP_MENU_CLICK` conversion event + `OBPMenuCTA.tsx`
- [x] Accent color picker + established year in OfficialPageTab

### ChatGPT Round 2 Feedback — Implemented

- [x] Google rating moved to subtle reference in identity block (NOT dominant — MenuList stays authority frame)
- [x] `publicPresence.knownFor?: string` — identity cue field (max 40 chars, e.g. "Wood-fired pizza")
- [x] Price range + area context + service modes moved above fold (trust strip under descriptor)
- [x] "Open until" merged into status line: `Open now · Closes 11pm` (single line, no separate nextChange)
- [x] Area/location context: shows `store.area || store.city` in trust strip
- [x] OBP visual hierarchy reordered: Identity → Trust strip → Status → Google rating → CTA → Photos → Actions → Info → Structured → Socials → Freshness → Footer
- [x] `knownFor` input added to OfficialPageTab.tsx
- [x] "Copy Message" button in OBPLinkCard — conversation-ready shareable text (the #1 distribution mechanic)

### ChatGPT Round 2 Feedback — Deferred

- [ ] Menu preview (top 3 items) — requires extra Firestore read per OBP visit. Separate session.
- [ ] Canonical title structure (`Name — Menu, Hours, Contact`) — requires metadata generation changes in `[[...slug]]/page.tsx`. Separate session.

---

## Part 6: What Belongs to SurfaceOS (Not OBP)

These are valid infrastructure needs but belong to a different product layer:

- Citation propagation to directories
- Cross-surface data monitoring
- External listing management
- Duplicate citation detection
- Identity graph management across platforms
- Distribution to aggregators
- Behavioral learning / adaptive UI
- Visitor segmentation

---

## Part 7: Doctrine Amendments Needed

Based on this analysis, the existing MenuList doctrine should be updated:

### Amendment 1: Reviews ARE Allowed (as References)

**Current doctrine:** Reviews are permanently banned on OBP.
**New position:** Hosting reviews is banned. Referencing external reviews (Google rating badge, link to Google reviews) is allowed and NECESSARY. Trust signals are not engagement features — they're infrastructure signals.

### Amendment 2: Photos ARE Allowed (Preview + Viewer, Not Page Gallery)

**Current doctrine:** Photo gallery permanently banned.
**New position:** Masonry/page gallery is banned. But owner-managed business photos (storefront, interior, hero product) are allowed. The OBP page previews the first 3 only; tapping opens a viewer for all uploaded photos. Photos are trust infrastructure, not vanity.

### Amendment 3: Structured Content IS Allowed (Entity Data, Not Marketing)

**Current doctrine:** "About us" sections permanently banned.
**New position:** Marketing content is banned. But structured entity data displayed as readable content (full hours, services, payment methods, cuisine, price range) is allowed and CRITICAL for AI answer extraction. This is the same as Google Business Profile's structured fields — not marketing, not "about us", just structured truth.

### Amendment 4: Page Height Limit Relaxed

**Current doctrine:** ~1 to 1.5 mobile screens.
**New position:** Identity section stays at 1 screen. Below the fold: structured info section + photos + review reference. Total page may be 2-3 mobile screens. This is still minimal — Google Business Profile is 4-6 screens.

---

## Part 8: 3-Year Freeze Rules (PERMANENT)

After implementing all BUILD NOW items, these rules lock OBP:

1. **NO custom text sections** — All content auto-generated from structured store data
2. **NO theme customization** — One design, one layout, forever
3. **NO review hosting** — Only reference external reviews (Google, etc.)
4. **NO page gallery** — First 3 owner-uploaded photos preview on OBP; full set appears only in tap viewer
5. **NO dynamic/adaptive UI** — Server-rendered truth page
6. **NO per-owner disable toggle** — OBP always on when flag enabled
7. **NO ordering/booking ON the page** — Only links to external systems
8. **Schema enrichments always allowed** — Adding schema.org fields is never blocked
9. **New store data fields allowed** — If it's truth data (not marketing)
10. **OBP must remain <100KB** — Relaxed from 50KB to accommodate photos (lazy-loaded)
11. **All business data in SSR HTML** — Nothing critical behind client-side hydration
12. **Preview max 3 photos** — The page preview never shows more than 3; the viewer may navigate all uploaded photos.
13. **Google review reference only** — Never host or display individual review text

---

## Part 9: Architecture Validation

All 11 original ADRs remain valid. New ADRs added:

### ADR-12: Google Review Reference (Not Hosting)

**Decision:** OBP may display a Google rating badge and link to Google reviews. Individual review text is never displayed or stored.
**Rationale:** 93% of consumers read reviews. Referencing external reviews provides trust without moderation burden. This is the same pattern Google Maps uses when linking to Yelp reviews.

### ADR-13: Photo Preview + Viewer (Not Page Gallery)

**Decision:** OBP may show the first 3 owner-uploaded photos as a preview. Tapping any preview photo opens the full uploaded photo set in a viewer. No masonry/page gallery.
**Rationale:** 62% more likely to purchase after seeing photos. 3 preview photos preserve scan speed; a tap viewer supports customers who intentionally want more proof.

### ADR-14: Structured Info Section (Entity Data Display)

**Decision:** OBP displays a structured info section below the fold with hours breakdown, services, payment, cuisine, price range — all auto-generated from existing store data.
**Rationale:** AI systems need extractable text content. Without it, AI cannot answer "What time does Joe's Pizza close?" from the OBP page. This is entity data display, not marketing content.

---

## Part 10: OBP Strategic Positioning (Added March 17, 2026)

**Source:** ChatGPT owner feature ideas session (March 15, 2026) — strategic analysis validated by Cascade

### 10.1 OBP Is a Distribution Surface, Not a Feature

OBP is the public gateway to business truth:

```
Internet
   ↓
Search / WhatsApp / Instagram / QR
   ↓
OBP (identity + trust)
   ↓
Menu / actions / calls
```

Root URL ownership (`restaurant.menulist.ai/`) matters because it becomes:

- Instagram bio link
- Google Business Profile website field
- WhatsApp share link
- Packaging QR target
- Maps link destination

**MenuList link = business homepage.** This is how infrastructure spreads — via links circulating everywhere.

### 10.2 Two Compounding Loops

**Loop 1 — Link Distribution:**
Owner sends link → Customer opens → Customer shares → Link spreads → Every new link = distribution node

**Loop 2 — Business Dependency:**
Once OBP is everywhere (Instagram bio, GBP, QR codes, packaging), replacing MenuList means changing every link everywhere → soft lock-in through deployment friction

### 10.3 OBP Adoption Threshold Model

| Stage                        | Restaurants   | Behavior                                 | Infrastructure Signal              |
| ---------------------------- | ------------- | ---------------------------------------- | ---------------------------------- |
| Stage 0 — Early Product      | 0–500         | OBP = product feature                    | No familiarity                     |
| Stage 1 — Local Recognition  | 500–3,000     | Customers notice pattern                 | "This page looks familiar"         |
| Stage 2 — Category Awareness | 3,000–15,000  | MenuList pages feel standardized         | Recognition reduces cognitive load |
| Stage 3 — Platform Trust     | 15,000–50,000 | Users trust, businesses rely on OBP      | "MenuList page = accurate info"    |
| Stage 4 — Infrastructure     | 50,000+       | Default reference, replacement difficult | Ambient environmental presence     |

**Infrastructure signal:** Customers encounter MenuList 3–5 times per week → platform becomes normalized.

### 10.4 Three Biggest Risks to Infrastructure Status

1. **Owners continue sending other links** — If OBP doesn't replace existing habits (Google Maps, Instagram, Zomato), it stays secondary. Mitigation: dashboard prominence, Copy Message button, Presence Monitor guidance.

2. **Positioning as "just a menu tool"** — If owners think MenuList = QR menu generator, OBP won't be their primary link. Mitigation: label as "Your Official Business Link" everywhere, not "share link" or "menu link."

3. **Feature expansion dilutes simplicity** — Themes, galleries, promotions destroy infrastructure consistency. Mitigation: 3-Year Freeze Rules (Part 8). Every page must look almost identical — uniformity builds familiarity.

### 10.5 3-Year Evolution Without Feature Creep

| Phase   | Period   | Goal                           | Page Changes                                 |
| ------- | -------- | ------------------------------ | -------------------------------------------- |
| Phase 1 | Year 0–1 | Establish as default link      | **None** — habit formation via dashboard     |
| Phase 2 | Year 1–2 | Become business identity layer | **None** — ecosystem growth via GBP + social |
| Phase 3 | Year 2–3 | Become public infrastructure   | **None** — network effects from density      |

**Key insight:** The page itself stays almost identical. What changes is how it participates in the ecosystem. Propagation comes from link repetition, not feature depth.

### 10.6 OBP vs Google Business Profile

| Area             | GBP                         | OBP                            | Assessment                          |
| ---------------- | --------------------------- | ------------------------------ | ----------------------------------- |
| Identity         | Strong                      | Strong                         | Comparable                          |
| Category clarity | Strong (explicit labels)    | Moderate (descriptor text)     | Minor gap — cuisine tags help       |
| Photos           | Heavy (15+ recommended)     | First 3 preview + tap viewer   | OBP cleaner/faster by design        |
| Actions          | Action-first                | Menu-first                     | Different intent — correct for each |
| Information      | Scattered across tabs       | Clean single page              | OBP better                          |
| Reviews          | Hosted                      | External reference             | OBP correct choice (no moderation)  |
| Menu             | Inconsistent (PDFs, photos) | Native structured menu         | OBP much better                     |
| Freshness        | Weak (often outdated)       | Strong ("Info verified today") | OBP differentiator                  |
| Speed            | Moderate (heavy JS)         | Very fast (<1.5s SSR)          | OBP advantage                       |
| Schema           | Good                        | Good (+ AEO optimized)         | Comparable                          |

**Strategic position:** OBP is closer to GBP than to Linktree or website builders. It's a structured business identity page, not a marketing page.

### 10.7 Distribution Acceleration Levers

1. **Default output** — OBP link visible in dashboard header, Use MenuList page, OBPLinkCard (✅ done)
2. **"Answer link" habit** — Owner's default reply to any customer question becomes the OBP link
3. **Physical QR surfaces** — Dual QR system: Share QR → OBP, Menu QR → direct menu (✅ done)
4. **GBP website field** — Presence Monitor guides owners to add OBP link to Google (✅ done)
5. **Page speed** — Fast loading builds trust and encourages resharing (✅ SSR + <100KB)

### 10.8 Common Restaurant Tech Failures to Avoid

| Failure Pattern                              | Risk to OBP | Protection                                            |
| -------------------------------------------- | ----------- | ----------------------------------------------------- |
| Expanding into too many functions            | High        | Freeze Rules — identity + menu + actions only         |
| Customization overload                       | High        | No themes, no layout changes, no font selection       |
| Heavy/slow pages                             | Medium      | SSR, <100KB, minimal JS                               |
| Dependence on third-party ecosystems         | Low         | OBP reads from own Firestore, external links optional |
| Misaligned incentives (pushing transactions) | Low         | No ordering/booking ON the page, only links           |
| Turning into mini website                    | High        | Constitutional ban on custom text, blogs, galleries   |

---

## Part 11: Behavioral Loop Assessment (Added March 17, 2026)

| Loop                  | Status      | Closed By                                                           |
| --------------------- | ----------- | ------------------------------------------------------------------- |
| **Truth Loop**        | ✅ Complete | MCE → publish-gate → sync → correct menu                            |
| **Distribution Loop** | ~90%        | Presence Monitor (ENABLE_MENU_PRESENCE_MONITOR)                     |
| **Improvement Loop**  | ~85%        | Quality Signals (ENABLE_MENU_QUALITY_SIGNALS)                       |
| **Habit Loop**        | ~60%        | Mobile PWA daily actions + Behavior Nudges (ENABLE_BEHAVIOR_NUDGES) |
| **Trust Loop**        | ~85%        | Trust Signals (ENABLE_MENU_TRUST_SIGNALS) + OBP freshness           |
| **Propagation Loop**  | Depends     | Physical deployment density + link circulation                      |

**What remains is not building more features — it is reinforcing behavior through small operational nudges, daily confidence signals, and deployment visibility.**

### Future Consideration: Daily Status Strip

A lightweight "restaurant status" strip at the top of the owner dashboard:

- Menu: Published / Last updated: 1h ago
- Hours: Open until 11:00 PM
- Unavailable items: 2

This is the one genuinely new UX concept from the session. Not urgent — logged for future consideration as a small Owner Dashboard enhancement, NOT a separate feature.

---

**Document Signature:** Cascade (Lead Architect)  
**Created:** March 11, 2026  
**Revised:** March 17, 2026 (Added Parts 10-11: Strategic Positioning + Behavioral Loops)  
**Freeze Start:** After Priority 1-5 implementation  
**Freeze End:** March 2029
