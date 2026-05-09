# Official Business Page (OBP) — Spec

**Status:** IMPLEMENTED — 3-Year Freeze  
**Author:** Cascade (Lead Architect)  
**Date:** February 15, 2026 (Created) | March 11, 2026 (Infrastructure Domination Rebuild) | March 18, 2026 (Distribution Strategy Update)  
**Audience:** CEO, PM, Clients (non-technical)

---

## Executive Summary

**What:** A single, permanent business link that becomes the default customer answer instead of PDFs, Google Drive menus, Instagram profile links, and random WhatsApp messages. Auto-generated from existing store data.

**Why:** Businesses today send fragmented links when customers ask for info. OBP gives them one canonical link that shows who they are, whether they're open, and how to reach them — with a single tap to their full menu. OBP is not a page system. It is a **link replacement protocol**.

**For whom:** Every MenuList business, from single-outlet restaurants to multi-store chains.

**Impact:** Makes MenuList the business's primary internet presence. Once the link spreads to Instagram bios, Google profiles, WhatsApp chats, and packaging — MenuList becomes embedded in customer behavior and difficult to replace. The goal: owner stops thinking about _what to send_ and just sends this link.

---

## Goals & Success Metrics

| Goal                                 | Success Metric                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Become the default link owners share | Owner stops sending PDFs/Zomato/Instagram and sends only MenuList link                      |
| Instant access to business info      | Page loads in <1.5s on mobile 4G in India                                                   |
| Official source stays current        | OBP reflects store changes within 60 seconds                                                |
| Brand spread                         | "Powered by MenuList" visible on every OBP page                                             |
| Distribution surface                 | Thousands of MenuList links circulating in the wild                                         |
| Link replacement rate                | Owner uses OBP link for ≥80% of customer interactions (replaces PDFs, Maps, manual replies) |
| Distribution behavior                | Owner shares OBP via WhatsApp ≥2 times per week (tracked via OBP_SHARE event)               |

**Real success = owner says "Just open this link" for everything.**

---

## Target Customers (ICP)

- Restaurant, café, bakery, bar, cloud kitchen owners in India
- Non-technical SMB owners who share menu via WhatsApp
- Businesses with or without existing websites
- Multi-outlet chains (each store gets its own OBP)

### Behavioral Segmentation (Who Benefits Most)

| Segment                      | Current Behavior                                            | OBP Replacement                                           |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| **WhatsApp-first** (primary) | Shares menu via images/PDF on WhatsApp multiple times daily | One-tap OBP share replaces all manual replies             |
| **Google Maps dependent**    | Uses Google Maps link as main business reference            | OBP in GBP "Website" field gives Google visitors the official source |
| **Instagram bio linkers**    | Uses Instagram profile as business identity                 | OBP link in bio — faster, updated from MenuList data, action-oriented |

---

## Scope

### In-Scope

- Auto-generated identity page at subdomain root
- Business identity: logo, name, descriptor, open/closed status, "Known for" cue
- Above-fold trust strip: price range, area/city, service modes (dine-in/takeaway/delivery)
- Primary CTA: "View Menu" → opens existing digital menu (with OBP→menu conversion tracking)
- Quick actions: Call, WhatsApp, Directions, Reserve, Order
- Google review reference: rating badge + link to Google reviews (NOT hosted reviews)
- Business photos: owner-managed photos; first 3 preview on OBP, tapping opens the full viewer
- Utility cards split service modes, payment options, dietary options, and amenities for mobile scanning
- Info block: address, today's hours
- Structured info section (AEO): full 7-day hours, cuisine types, price range, service modes, payment methods
- Social links: Instagram, Facebook, Website
- Freshness signal: "Info verified today/this week/this month"
- Established year: "Serving since [year]"
- Permanent closure state: "Permanently Closed" with disabled menu CTA
- Footer: "Official Page · Powered by MenuList"
- Dashboard integration: link display, copy link, copy message, dual QR (Share + Menu)
- Schema.org: `@id`, `mainEntityOfPage`, `identifier` (MenuList Entity ID), `AggregateRating`, `foundingDate`, image array, `permanentlyClosed` signal
- AEO canonical title: "Name — Menu, Hours, Contact"
- Custom domain support
- "Menu coming soon" state before menu publish
- Feature flag: `ENABLE_OBP`
- OBP analytics: page views, action clicks, menu conversion — daily/weekly/monthly aggregation

### Out-of-Scope (Permanent Ban)

- Custom text blocks / about section / marketing copy
- Masonry/page gallery / slideshow as default page content (OBP preview stays first 3 only)
- Hosting reviews / testimonials / UGC (external reference only)
- Promotions / offers / banners
- Custom sections / drag-drop editor
- Theme marketplace / font selection / layout changes
- Blog / SEO pages / multi-page site
- AI-generated page layouts
- Per-owner toggle to disable OBP
- Adaptive/dynamic UI based on location/time/device
- Visitor segmentation or personalization

---

## User Stories

### Story 1: Customer Opens Business Link

> As a **customer**, I receive a link from a restaurant on WhatsApp. I open it and immediately see the restaurant name, whether they're open, and a big "View Menu" button. I tap it and browse the full menu.

### Story 2: Owner Shares One Link

> As a **restaurant owner**, when someone asks for my menu or location, I copy my official MenuList link from the dashboard and send it. I never need to send a PDF, Zomato link, or Instagram again.

### Story 3: Owner Updates Info

> As an **owner**, I change my phone number in Business Settings. My official page updates automatically within a minute. I don't need to "republish" anything.

### Story 4: New Business Setup

> As a **new MenuList user**, after entering my business name and phone number during onboarding, my official page already exists. It shows "Menu coming soon" with my contact info. I can start sharing it immediately.

### Story 5: Owner Copies QR

> As an **owner**, I download the QR code of my official link from the dashboard and print it on my packaging and table tent cards. Customers scan it and land on my official page.

### Story 6: Default Response (Habit Replacement)

> As an **owner**, whenever a customer asks for menu, location, timing, or contact info, I automatically send my MenuList link without thinking. I don’t open Google Maps, find a PDF, or type a manual reply. This link is my default answer to everything.

---

## Page Structure (What Customers See)

```
┌─────────────────────────────┐
│         [Logo]              │  ← Circle/square, 80px
│     Business Name           │  ← Bold h1
│   "Modern Indian Kitchen"   │  ← Descriptor, muted, max 40 chars
│   ₹₹ · Bandra West · Dine  │  ← Trust strip: price + area + service modes
│   🟢 Open now · Closes 11pm│  ← Live status with next change
│   4.5 ★ on Google (320)    │  ← Google rating reference (subtle)
│   Known for: wood-fired     │  ← Identity cue (optional)
│   Serving since 2015        │  ← Established year (optional)
│                             │
│   ┌─────────────────────┐   │
│   │    VIEW MENU        │   │  ← Primary CTA, conversion tracked
│   └─────────────────────┘   │
│                             │
│   [photo1] [photo2] [photo3]│  ← first 3 photo preview; tap opens all
│                             │
│   [Call][WhatsApp][Map]     │  ← Quick actions + Reserve + Order
│                             │
│   📍 123 Main St, Mumbai    │  ← Address
│   🕐 Open today: 9am–11pm  │  ← Today's hours
│                             │
│   📅 Business Hours         │  ← Expandable: all 7 days (AEO)
│   🍽️ Japanese, Ramen        │  ← Cuisine types
│   💰 Price range: ₹₹        │  ← Price range
│   🏪 Dine-In · Takeaway     │  ← Service modes
│   💳 Accepts: Cash, UPI     │  ← Payment methods
│                             │
│   [Veg][WiFi][Parking]      │  ← Business attribute tags
│   [IG] [FB] [Web]          │  ← Social links
│   ✓ Info verified today     │  ← Freshness signal
│                             │
│  Official Page · MenuList   │  ← Authority footer
└─────────────────────────────┘
```

**Page height:** ~2–3 mobile screens. Identity at 1 screen, trust signals + info below fold.

---

## Requirements

### Functional Requirements

| ID    | Requirement                                              | Priority |
| ----- | -------------------------------------------------------- | -------- |
| FR-01 | OBP auto-generated for every store with name + phone     | P0       |
| FR-02 | Shows logo, name, descriptor, open/closed status         | P0       |
| FR-03 | "View Menu" CTA opens digital menu at `/menu` route      | P0       |
| FR-04 | Call, WhatsApp, Directions, Google reviews, feedback, reserve, and order quick action buttons with owner visibility controls | P0       |
| FR-05 | Address and today's hours displayed                      | P0       |
| FR-06 | Social links (Instagram, Facebook, Website) if available | P1       |
| FR-07 | "Powered by MenuList" footer (not removable)             | P0       |
| FR-08 | Dashboard shows official link with copy + QR download    | P0       |
| FR-09 | Schema.org LocalBusiness JSON-LD                         | P0       |
| FR-10 | "Menu coming soon" state if no published menu            | P0       |
| FR-11 | Accent color: auto-detect from logo or manual pick       | P1       |
| FR-12 | Short descriptor: owner-editable, max 40 chars           | P1       |
| FR-13 | Works on subdomain and custom domain                     | P0       |
| FR-14 | Feature flag `ENABLE_OBP` controls global rollout        | P0       |

### Non-Functional Requirements

| ID     | Requirement                 | Target                               |
| ------ | --------------------------- | ------------------------------------ |
| NFR-01 | Mobile load time (India 4G) | < 1.5 seconds                        |
| NFR-02 | Page weight                 | < 50KB (excluding logo)              |
| NFR-03 | Data freshness              | < 60 seconds (cache TTL)             |
| NFR-04 | Accessibility               | WCAG 2.1 AA for essential actions    |
| NFR-05 | SEO                         | Schema.org, meta tags, canonical URL |
| NFR-06 | Offline resilience          | Graceful degradation if data fails   |

---

## Routing Architecture

| URL                               | What Shows                     | Condition                           |
| --------------------------------- | ------------------------------ | ----------------------------------- |
| `joespizza.menulist.ai/`          | OBP                            | `ENABLE_OBP = true`                 |
| `joespizza.menulist.ai/`          | Digital Menu                   | `ENABLE_OBP = false` (current)      |
| `joespizza.menulist.ai/menu`      | Digital Menu (default project) | Always (reserved slug)              |
| `joespizza.menulist.ai/food-menu` | Specific project               | Existing slug system                |
| `joespizza.com/`                  | OBP                            | Custom domain + `ENABLE_OBP = true` |

**"menu" becomes a reserved slug** — cannot be used as a project name. System auto-routes it to the default project.

---

## Customization Rules

### Allowed (Identity Controls)

- Logo upload/change
- Business name (from store data)
- Short descriptor (max 40 chars)
- "Known for" identity cue (max 40 chars)
- Accent color (color picker)
- Established year
- Google review URL + rating + review count
- Business photos (upload to Firebase Storage; first 3 appear in OBP preview)
- WhatsApp number (separate from main phone)
- Google Maps URL (exact location link)
- Reservation URL (e.g., Dineout, OpenTable)
- Order URL (e.g., Swiggy, Zomato)
- Toggle: Call / WhatsApp / Directions visibility
- Social links: Instagram, Facebook, Website URLs

### Not Allowed (Permanent Ban)

- Layout changes / section reordering
- Custom text blocks / about section / marketing copy
- Photo gallery > 3 images / slideshow / carousel
- Theme marketplace / font selection
- Background images / gradients
- HTML embed / drag-drop
- Multi-page site
- Hosting reviews or testimonials

**Rule: Owners can update information, not design.**

---

## Architecture Overview (Non-Technical)

```
Store Data (already exists)
  ↓ name, logo, phone, address, hours, socials
  ↓ + new: publicPresence (accent color, descriptor, toggles)
  ↓
OBP Page (auto-generated, server-rendered)
  ↓
Customer sees: Identity + Actions + Info
  ↓
"View Menu" tap → Digital Menu (existing, unchanged)
```

- No new databases or collections
- OBP reads from the same store document that already exists
- Changes in dashboard reflect on OBP within 60 seconds
- No "publish" button — live always

---

## Risks & Open Questions

| Risk                                                     | Mitigation                                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Existing QR codes land on OBP instead of menu            | "View Menu" is prominent — 1 extra tap. Feature flag for gradual rollout.                                  |
| "menu" slug conflicts with existing project named "Menu" | Reserved route takes priority. Edge case: rename project prompt.                                           |
| Owners want more customization                           | Constitutional ban. Sales messaging: "Clean and fast for your customers."                                  |
| Slow adoption                                            | Free + auto-generated + dashboard prominence + QR download drives natural usage                            |
| **OBP not being used** (highest real risk)               | WhatsApp-first share button + behavioral nudges + persistent link visibility across all dashboard surfaces |

### Open Questions

1. Should "menu" slug show the default project or a project list (for multi-project stores)?  
   **Decision:** Default project. Multi-project stores use specific slugs.

2. What happens if store has no address?  
   **Decision:** Hide directions button and address section. Show less, not wrong (Law 5).

---

## Future Enhancements (Logged, Not In V1)

> These are strategically valid ideas from founder-level review. Logged here for future reference.
> They are NOT in V1 scope. They require modifying existing core flows (publish, onboarding, editor).
> See `_archive/code-feedback-audit.md` for full audit reasoning.

| Enhancement                                      | Trigger Point              | Why Deferred                                          |
| ------------------------------------------------ | -------------------------- | ----------------------------------------------------- |
| "From now on, send this link to customers" nudge | After menu publish success | Modifies publish flow — high-risk core flow change    |
| "Your link updated automatically" confirmation   | After menu/hours edit save | Touches editor/settings save flows — scope creep risk |
| OBP link shown after onboarding completion       | Onboarding success screen  | Modifies onboarding flow — separate feature effort    |
| Menu preview signal (top 3 popular items)        | OBP page below CTA         | Extra Firestore read per OBP visit — cost concern     |
| Photo labels (Storefront / Interior / Dish)      | OBP photo strip            | Small UX improvement, low priority                    |
| Action button hierarchy (primary/secondary)      | OBP action row             | Call+Directions primary, rest secondary — UX polish   |

---

## Post-Launch Guardrail (PERMANENT)

> **Feature requests that WILL come within 2 weeks of launch:**
> gallery, offers, banners, stories, themes, booking, reviews, custom sections.
>
> **Answer to ALL of them: NO.**
>
> OBP stays clean. If this becomes a page builder, the infrastructure dream dies.
> The Out-of-Scope permanent ban list (above) is the constitutional defense.
> Reference: ChatGPT founder audit → Risk 5.

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** March 18, 2026 (Distribution strategy update from ChatGPT audit — see `_archive/chatgpt-review-session-march18-distribution-audit.md`)
