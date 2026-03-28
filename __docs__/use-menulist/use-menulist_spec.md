# Use MenuList — Product Specification

> **Version:** 1.0
> **Feature Flag:** `ENABLE_USE_MENULIST`

## 1. Problem Statement

MenuList generates multiple outputs (links, screen URLs, QR codes, PDFs, asset bundles) that owners need to deploy in their restaurant. These outputs are scattered across Settings, Share Modal, and Feedback sections. Owners miss half of them, leading to incomplete surface deployment and reduced MenuList visibility.

## 2. Solution

A single "Use MenuList" page that aggregates every usable output into one operational hub. Owners open this page whenever they need to:
- Share a menu link (WhatsApp, Instagram, Google)
- Get a screen URL for their TV
- Download print-ready QR assets
- Download a complete Menu Kit bundle

## 3. User Stories

### US-1: Copy menu link quickly
**As** a restaurant owner, **when** a customer asks for the menu on WhatsApp, **I want** to copy the menu link in one tap so I can paste and send it in < 5 seconds.

### US-2: Set up digital screen
**As** a restaurant owner, **when** I install a new TV, **I want** to copy the screen link and open it on the TV browser so the menu displays automatically.

### US-3: Download print assets
**As** a restaurant owner, **when** I want to place QR codes in my restaurant, **I want** to download print-ready assets (table tent, counter sticker, entrance poster) so I can print and place them without any design work.

### US-4: First-time deployment
**As** a new restaurant owner, **when** I first publish my menu, **I want** to download everything I need in one click (Menu Kit ZIP) so I can deploy MenuList in my restaurant in under 10 minutes.

### US-5: Get feedback QR
**As** a restaurant owner, **I want** to download a feedback QR poster so I can collect private customer feedback at the exit or billing counter.

### US-6: Share on Google Business
**As** a restaurant owner, **I want** clear guidance on how to add my menu link to Google Business Profile so customers can find my menu from Google search.

## 4. Page Structure

### 4.1 Quick Actions (Top — Always Visible)
| Action | Description | Implementation |
|--------|-------------|----------------|
| Copy Menu Link | Copy OBP/menu URL to clipboard | `navigator.clipboard.writeText(menuUrl)` |
| Open Menu | Open menu in new tab | `window.open(menuUrl)` |
| Copy Screen Link | Copy screen URL | `navigator.clipboard.writeText(screenUrl)` |
| Download Menu Kit | Download full ZIP bundle | Reuses `generateMenuKit()` from Menu Kit system |

### 4.2 Share Your Menu
Two link cards:
1. **Official Page** — Full identity page (OBP) — primary share link
2. **Direct Menu Link** — Opens menu immediately — for quick WhatsApp sharing

### 4.3 Digital Screens
Two screen link cards:
1. **Menu Board** — `/screen/{token}` — full menu with prices
2. **Highlights** — `/screen/{token}?mode=highlights` — rotating promotional slides

### 4.4 Print for Your Restaurant
Individual asset cards with Preview + Download:
- Table Tent (A6 PDF)
- Counter Sticker (8×8cm PNG)
- Entrance Poster (A4 PDF)
- Feedback QR (PNG)
- Printable Menu (PDF)

### 4.5 Resources
Micro-guides (modal-based):
- Setup Guide — Where to place each asset
- Printing Guide — Print sizes and tips
- Sharing Guide — Where to share links online

## 5. UX Rules (Non-Negotiable)

1. **No configuration** — Only outputs. No toggles, no editing, no settings.
2. **One-click actions** — Copy, Open, Download. Nothing else.
3. **No technical language** — "Online Menu Page" not "OBP". "TV Menu Screen" not "Digital Screen endpoint".
4. **Mobile-first** — Most owners access this on their phone inside the restaurant.
5. **Frequency hierarchy** — Share links at top (daily use), print assets below (occasional).
6. **Copy confirmation** — Toast message after every copy action.
7. **Max 3 sections** — Share, Screens, Print. Never exceed this.

## 6. States

| State | Condition | Behavior |
|-------|-----------|----------|
| `ready` | Menu published + screen initialized | Full page with all outputs |
| `no_menu` | No projects exist | "Create your first menu" CTA |
| `not_published` | Menu exists but not published | "Publish your menu" CTA + links disabled |
| `no_screen` | Screen not initialized | Screen section shows "Set up" button |
| `generating` | Menu Kit being generated | Loading state on download button |

## 7. Output Governance Rules

1. Only core presence outputs appear here — no promotions, no campaigns, no temporary assets
2. Every output must be persistent (stable for years) — no seasonal/temporary items
3. Every output represents a surface, not content — table QR yes, burger promo no
4. Page must never exceed 3 main sections (Share, Screens, Print)
5. If a new output doesn't fit these sections, it belongs in another product

## 8. Success Criteria

- Owner can copy menu link in < 3 seconds
- Owner can download Menu Kit in < 10 seconds
- Owner can copy screen link in < 3 seconds
- New restaurant fully deployed in < 10 minutes using this page
- Page load time < 1 second
