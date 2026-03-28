# Website Image & Asset Requirements

**Status:** 🟡 PARTIALLY RESOLVED — Major sections now use CSS/SVG/Canvas animations (no real images needed)
**Last Updated:** February 2026 (updated after Stripe-inspired audit)

---

## What Changed — Stripe-Inspired Audit (Feb 2026)

After a comprehensive Stripe-inspired UI/UX audit, multiple sections were rebuilt using **pure CSS mockups, SVG animations, and Canvas** — eliminating most real-image dependencies:

| Section                             | Before               | After                                                                                                                        | Images Needed? |
| ----------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Homepage — How It Works             | Simple numbered grid | **InteractiveWorkflowSection** — auto-advancing 4-step demo with CSS product frames                                          | ✅ None        |
| Homepage — Stats                    | Missing              | **StatsSection** — animated canvas network + clickable stats                                                                 | ✅ None        |
| How It Works page (`/how-it-works`) | Basic text sections  | Full Stripe-style redesign with dark animated SVG flow diagram + numbered step sections + CSS UI mockups                     | ✅ None        |
| Multi-Location page                 | Basic text           | Full Stripe-style redesign with dark animated electricity flow (Master → 5 Outlets) + CSS price override + dashboard mockups | ✅ None        |
| Footer                              | Plain layout         | Animated logo mark watermark (SVG stroke animation, loops every 9s)                                                          | ✅ None        |
| Solution Section                    | Static SVG           | SVG with electricity flowing animation on dotted lines                                                                       | ✅ None        |

**Only 3 real assets are still needed for production launch** (see Priority Order below).

---

## Summary

The website uses live animated CSS/SVG components for all UI demonstrations. Real images are still needed only for: OG image (social sharing), favicon (browser tab), and the hero phone mockup.

**All assets should be placed in:** `public/images/website/`

**Image format rules:**

- Hero images: WebP or PNG, max 250KB, 1200×675px minimum
- Section images: WebP or PNG, max 100KB each
- Icons: SVG preferred (already using react-icons/lu — no new icon files needed)
- Logo: SVG, placed at `public/images/website/logo.svg`

---

## Required Assets

### 1. Logo

| Asset                   | File                                | Specs          | Description                                                                                                  |
| ----------------------- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| Logo mark (icon only)   | `logo-mark.svg`                     | 28×28px SVG    | Blue square with menu lines (currently inline SVG in Header.tsx)                                             |
| Logo full (icon + text) | `logo-full.svg`                     | ~150×28px SVG  | Logo mark + "MenuList" text for OG images                                                                    |
| Favicon                 | `favicon.ico` + `favicon-32x32.png` | 32×32, 16×16   | Place in `public/` root                                                                                      |
| Apple touch icon        | `apple-touch-icon.png`              | 180×180px PNG  | Place in `public/icons/`                                                                                     |
| OG Image                | `og-image.png`                      | 1200×630px PNG | Social share image — "MenuList" logo centered on white/blue background with tagline "Where your menu lives." |

---

### 2. Homepage — Hero Section

| Asset                      | File                    | Specs                           | Description                                                                                                                                                       |
| -------------------------- | ----------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phone mockup**           | `hero-phone-mockup.png` | ~400×760px PNG (transparent bg) | A real screenshot of the QR/client menu on a phone frame. Shows a sample restaurant menu with items, prices, categories, and images. This is the dominant visual. |
| **Surface labels graphic** | (not needed)            | —                               | Currently using CSS-drawn labels — works fine as-is                                                                                                               |

**Current state:** Placeholder CSS shapes showing a phone outline with colored blocks.  
**What's needed:** Real product screenshot of the client-facing menu on a phone, showing actual menu items with images and prices.

---

### 3. Homepage — Solution Section (System Diagram)

| Asset              | File                      | Specs | Description                                                                                                                                                   |
| ------------------ | ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System diagram** | (not needed — SVG inline) | —     | Currently an inline SVG showing "Your Menu" → QR/Google/Screens/Web/Print. Works well as-is. Can be enhanced later with a more polished SVG but not blocking. |

---

### 4. Homepage — Prepared For You Section

| Asset                        | File                       | Specs          | Description                                                               |
| ---------------------------- | -------------------------- | -------------- | ------------------------------------------------------------------------- |
| **Extraction before/after**  | `feature-extraction.png`   | ~600×400px PNG | Optional: Side-by-side showing paper menu photo → structured digital data |
| **Generated images example** | `feature-images.png`       | ~600×400px PNG | Optional: Grid of 4 AI-generated food item images                         |
| **Descriptions example**     | `feature-descriptions.png` | ~600×400px PNG | Optional: Menu item with generated description text                       |
| **Translation example**      | `feature-translation.png`  | ~600×400px PNG | Optional: Same item shown in English + Hindi + Arabic                     |

**Note:** These are optional enhancements. The section works with just icons + text (current state). Images would strengthen the section but are not blocking.

---

### 5. Multi-Location Page

| Asset                     | File                      | Specs | Description                       |
| ------------------------- | ------------------------- | ----- | --------------------------------- |
| **Master-outlet diagram** | (not needed — SVG inline) | —     | Currently inline SVG. Works well. |

---

### 6. How It Works Page (`/how-it-works`)

✅ **No images needed** — fully redesigned with Stripe-inspired CSS UI mockups:

- Dark animated SVG flow diagram (HQ → Build → QR/Screens/Web/Print/Translate)
- Step 01–04 alternating sections with CSS product mockups (upload form, AI panel, publish grid, update timeline)
- All mockups are pure CSS/SVG — no screenshots required

---

### 7. Multi-Location Page (`/multi-location`)

✅ **No images needed** — fully redesigned with Stripe-inspired CSS UI mockups:

- Dark animated SVG flow diagram (Master Menu HQ → 5 Outlets, electricity flowing)
- Step 01: Master menu table mockup
- Step 02: Local price override card (master vs outlet comparison)
- Step 03: Locations dashboard list
- All mockups are pure CSS — no screenshots required

### 8. About Page

No images needed — minimal page per content doc.

---

### 9. Get Started Page

| Asset           | File         | Specs | Description                                          |
| --------------- | ------------ | ----- | ---------------------------------------------------- |
| **Google logo** | (not needed) | —     | Currently inline SVG for Google OAuth button. Works. |

---

## Priority Order

| Priority | Asset                                          | Blocking?                                               | Impact                                                        |
| -------- | ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- | --- | --- |
| **P0**   | OG Image (`og-image.png`)                      | Yes — social sharing looks broken without it            | High                                                          |
| **P0**   | Favicon + apple-touch-icon                     | Yes — browser tab looks generic                         | High                                                          |
| **P1**   | Hero phone mockup                              | No — placeholder works but real screenshot sells better | High                                                          |
| ~~P2~~   | ~~Logo SVG (mark + full)~~                     | ~~No~~                                                  | Resolved — existing animated logo used in footer as watermark |
| ~~P3~~   | ~~Feature section images (4)~~                 | ~~No~~                                                  | Resolved — CSS mockups now replace all feature images         |
| ~~P3~~   | ~~How It Works / Multi-Location page mockups~~ | ~~No~~                                                  | Resolved — full CSS redesign with no image dependencies       |     | Low |

---

## Folder Structure

```
public/
├── images/
│   └── website/
│       ├── logo-mark.svg
│       ├── logo-full.svg
│       ├── og-image.png          (1200×630)
│       ├── hero-phone-mockup.png (400×760)
│       ├── feature-extraction.png (optional)
│       ├── feature-images.png     (optional)
│       ├── feature-descriptions.png (optional)
│       └── feature-translation.png  (optional)
├── favicon.ico
├── favicon-32x32.png
└── icons/
    └── apple-touch-icon.png
```

---

## How to Create

### OG Image (P0)

- White background
- MenuList logo mark centered
- "MenuList" text below in Inter SemiBold
- Tagline "Where your menu lives." in Inter Regular, slate-500
- Dimensions: 1200×630px
- Can be created in Figma, Canva, or any design tool

### Hero Phone Mockup (P1)

- Take a real screenshot of the client-facing menu (the QR/web menu that customers see)
- Use a menu with real items, prices, images, and categories
- Wrap in a phone frame (use a Figma mockup template or similar)
- Export as PNG with transparent background

### Favicon (P0)

- Use the logo mark (blue square with menu lines)
- Export at 32×32px and 16×16px
- Generate .ico from the PNG using any favicon generator
