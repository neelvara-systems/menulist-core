# Website Image & Asset Requirements

**Status:** ✅ CURRENT — P0 fictional demo visuals generated and mounted where the current homepage uses visual proof
**Last Updated:** May 21, 2026
**Primary Stage Output:** `website-prep-codex-prompts/stage-06-output-screenshot-asset-production-system.md`
**Latest Asset Output:** `asset-production/stage-06-3/stage-06-3-p0-fictional-demo-asset-pack.md`

---

## Current Asset Strategy

The canonical homepage is product-led and mounts founder-approved fictional demo visuals directly in the UI as **launch-safe demo product visuals** where the current page structure uses image proof: hero, setup, public surfaces, and customer menu. The standalone Official Business Page and analytics/status images remain generated supporting assets for future page slots or section reuse; they are represented on the current homepage through the public-surfaces matrix rather than mounted as full homepage sections. These small pre-compressed files are rendered as direct unoptimized `next/image` assets so the visuals are visible reliably during review.

Asset production must preserve MenuList's current positioning:

- customer-facing business truth infrastructure
- official public source for menu and business details
- owner-approved publishing
- public menu + Official Business Page proof
- operational calm
- no fake dashboards
- no automatic Google/Instagram/WhatsApp sync claims
- no AI-hype visuals

This document is the operational asset checklist. The detailed production plan, capture order, and image-generation prompts live in the Stage 6 output.

Stage 6.3 supersedes the earlier Stage 6.1 draft pack with a fictional founder-approved demo business named **The Daily Plate**. These assets are now visible on the homepage as controlled demo product visuals, but they must not be described as real customer screenshots, testimonials, or customer proof.

Stage 6.2 produced private browser-rendered synthetic demo captures under `__docs__/main-website/asset-production/stage-06-2/`. These captures are useful for screenshot-slot planning and visual QA, but they are not public customer proof and should not be moved into `public/images/website/` without a separate approval pass.

---

## Asset Storage

Approved launch assets should be placed under:

```text
public/images/website/
```

Use lowercase kebab-case filenames:

```text
public/images/website/
├── menulist-hero-official-source.webp
├── menulist-og-official-source.png
├── menulist-public-menu-mobile.webp
├── menulist-obp-browser.webp
├── menulist-setup-relief-workflow.webp
├── menulist-public-surfaces-matrix.webp
├── menulist-analytics-proof.webp
├── menulist-launch-square.png
└── menulist-linkedin-launch.png
```

Do not place raw capture files, private demo data, or unapproved screenshots in `public/`.

Compatibility copy:

```text
public/og-image.png
```

This file is currently a copy of `public/images/website/menulist-og-official-source.png` so legacy metadata references have a real image.

## Stage 6.3 P0 Fictional Demo Asset Pack

The latest Stage 6.3 generator pass was reference-aligned against the current MenuList public runtime and the Habibis public-surface captures in `asset-production/stage-06-4-reference/`. The assets keep the website's light marketing theme because customer public pages can use business-specific themes; the reference captures were used for structure, not color copying.

Structure now mirrored in the generated assets:

- Official Business Page anatomy: language pills, business identity, service modes, open/official badges, action buttons, menu cards, utility tiles, and source status.
- Public menu anatomy: business header, menu title, search, category chips, featured/category rhythm, image-backed item cards, descriptions, and prices.
- Source-truth system: source card, public status, feedback/issues, activity/freshness, QR/share surfaces, and saved shortcut.

| Asset | File | Status | Notes |
| --- | --- | --- | --- |
| Hero official-source composite | `public/images/website/menulist-hero-official-source.webp` | Generated + visible demo | Fictional The Daily Plate product composite; mounted in `HeroSection.tsx` |
| Open Graph image | `public/images/website/menulist-og-official-source.png` | Generated | Current website metadata target |
| Backward-compatible OG image | `public/og-image.png` | Generated | Copy of the new OG image |
| Mobile public menu visual | `public/images/website/menulist-public-menu-mobile.webp` | Generated + visible demo | Fictional customer-browse visual; mounted in `CustomerBrowseSection.tsx` |
| OBP browser visual | `public/images/website/menulist-obp-browser.webp` | Generated supporting asset | Fictional Official Business Page visual for future/reused section slots; current homepage represents OBP inside `SurfacesSection.tsx` |
| Setup relief workflow | `public/images/website/menulist-setup-relief-workflow.webp` | Generated + visible demo | Upload/review/publish workflow strip; mounted in `SetupReliefSection.tsx` |
| Public surfaces matrix | `public/images/website/menulist-public-surfaces-matrix.webp` | Generated + visible demo | MenuList-controlled surfaces visual with feedback/status concepts; mounted in `SurfacesSection.tsx` |
| Analytics/status visual | `public/images/website/menulist-analytics-proof.webp` | Generated supporting asset | Synthetic activity/status signals only; current homepage keeps analytics as a small confidence signal in the surfaces matrix |
| Launch square image | `public/images/website/menulist-launch-square.png` | Generated | Square social/launch asset |
| LinkedIn launch image | `public/images/website/menulist-linkedin-launch.png` | Generated | Social preview derivative |

Generator:

- `scripts/website-assets/generate-stage6-assets.mjs`

Generated pack note:

- `__docs__/main-website/asset-production/stage-06-3/stage-06-3-p0-fictional-demo-asset-pack.md`

Stage 6.1 historical draft note:

- `__docs__/main-website/asset-production/stage-06-1/stage-06-1-synthetic-asset-pack.md`

## Stage 6.2 Private Clean Demo Captures

| Capture | File | Status | Notes |
| --- | --- | --- | --- |
| Hero official-source capture | `__docs__/main-website/asset-production/stage-06-2/captures/hero-official-source.png` | Captured | Browser-rendered synthetic demo reference; not public proof |
| Mobile public menu capture | `__docs__/main-website/asset-production/stage-06-2/captures/public-menu-mobile.png` | Captured | Synthetic customer-browse reference |
| Official Business Page capture | `__docs__/main-website/asset-production/stage-06-2/captures/official-business-page.png` | Captured | Synthetic OBP/public-presence reference |
| Setup/review workflow capture | `__docs__/main-website/asset-production/stage-06-2/captures/setup-review-workflow.png` | Captured | Synthetic setup-relief reference |
| Public surfaces matrix capture | `__docs__/main-website/asset-production/stage-06-2/captures/public-surfaces-matrix.png` | Captured | MenuList-controlled surface reference only; no external sync claim |
| Analytics proof capture | `__docs__/main-website/asset-production/stage-06-2/captures/analytics-proof.png` | Captured | Synthetic metrics only; not customer proof |

Source board:

- `__docs__/main-website/asset-production/stage-06-2/demo-screenshot-board.html`

Capture note:

- `__docs__/main-website/asset-production/stage-06-2/stage-06-2-clean-demo-captures.md`

Publishing rule:

- Keep raw Stage 6.2 captures under `__docs__/`.
- Do not move them into `public/images/website/` until the synthetic identity is explicitly approved for public use or replaced with a founder-approved demo tenant.

---

## Required Launch Assets

| Priority | Asset | Recommended file | Role | Source | Blocking |
| --- | --- | --- | --- | --- | --- |
| P0 | Hero official-source composite | `menulist-hero-official-source.webp` | First-screen credibility | OBP + public menu + source-card composite | P0 demo visual is mounted; replace with routed screenshot composite when demo tenant exists |
| P0 | Open Graph image | `menulist-og-official-source.png` | Social/link preview | Hero/source-card derivative | P0 demo visual is mounted |
| P0 | Mobile public menu screenshot | `menulist-public-menu-mobile.webp` | Customer browse proof | Real public menu route | P0 demo visual is mounted; replace with routed screenshot when demo tenant exists |
| P0 | OBP browser screenshot | `menulist-obp-browser.webp` | Public-presence authority proof | Real Official Business Page route | Supporting demo visual is generated; current homepage uses OBP inside the surfaces matrix; replace with routed screenshot when demo tenant exists |
| P0 | Setup relief workflow visual | `menulist-setup-relief-workflow.webp` | Effort-removal proof | Upload/review/publish screenshots | P0 demo visual is mounted; replace with routed screenshots when demo tenant exists |
| P1 | Analytics/status proof crop | `menulist-analytics-proof.webp` | Post-publish owner confidence | Owner dashboard/mobile dashboard | Supporting demo visual is generated; current homepage uses activity/status inside the surfaces matrix; final needs staged demo metrics |
| P1 | Public surfaces matrix | `menulist-public-surfaces-matrix.webp` | Multi-surface proof | OBP, menu, QR/share, saved shortcut, issue reports, activity signals | P0 demo visual is mounted; final needs real source screenshots |
| P1 | LinkedIn launch image | `menulist-linkedin-launch.png` | Launch distribution | Hero/OBP/menu composite | Useful |
| P2 | Square launch visual | `menulist-launch-square.png` | Instagram/WhatsApp launch | Workflow strip | Useful |
| P2 | Digital screen proof | `menulist-digital-screen-proof.webp` | Store-display proof | `src/app/screen/[token]/ScreenDisplay.tsx` | Optional |

---

## Screenshot Source Requirements

Use one founder-approved demo business across all captures. The same demo identity should appear in:

- Official Business Page
- public menu
- QR/share flow
- setup/upload flow
- analytics proof
- customer app or digital-screen proof if captured

Recommended demo-state requirements:

- 3-5 categories
- 12-20 items
- INR pricing
- 4-6 strong item images
- clean business name and logo
- safe address/phone values
- realistic business hours
- one visible language switcher state
- visible freshness/current-status signal
- no real customer data
- no private owner email
- no raw tenant/store/project IDs
- no debug overlays

---

## Capture Targets

| Target | Runtime/source file | Use |
| --- | --- | --- |
| Homepage composition | `src/components/website/home/HomePage.tsx` | Asset-slot order and fallback coded visuals |
| Hero layout | `src/components/website/home/HeroSection.tsx` | Hero composite structure |
| Public menu route | `src/app/client/[[...slug]]/page.tsx` | Real customer menu screenshot |
| Public menu renderer | `src/components/templates/website/clientWebsite/index.tsx` | Menu language, freshness, customer app, analytics context |
| Official Business Page | `src/app/client/obp/OBPContent.tsx` | OBP screenshot and public-presence proof |
| Mobile upload | `src/components/mobile/sheets/MenuUploadSheet.tsx` | Setup relief proof |
| Extraction review | `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx` | Owner approval proof |
| Official Page settings | `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx` | Owner public-presence control |
| Mobile Share | `src/components/mobile/screens/MobileShareScreen.tsx` | QR/link deployment proof |
| Owner dashboard | `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx` | Analytics proof |
| Mobile dashboard | `src/components/mobile/screens/MobileDashboardScreen.tsx` | Mobile analytics proof |
| Digital screen | `src/app/screen/[token]/ScreenDisplay.tsx` | Optional real-world deployment proof |

---

## Asset Type Rules

### Use Real Screenshots For

- public menu
- Official Business Page
- setup/upload/review
- owner dashboard analytics
- mobile share/QR
- digital screen preview

### Use Composites For

- hero
- public surfaces matrix
- OG/social assets
- setup relief workflow strip
- launch announcement visuals

### Use Typography-Led Visuals For

- industry breadth
- simple stats
- proof-strip claims
- email header variants

### Avoid

- fake dashboards
- generated UI unrelated to the repo
- stock restaurant photos as proof
- fake testimonials/logos
- automatic external-platform sync visuals
- purple/blue AI startup art
- excessive arrows or technical architecture diagrams

---

## Production Order

1. Prepare founder-approved demo business.
2. Capture public menu mobile screenshot.
3. Capture OBP desktop and mobile screenshots.
4. Capture setup/upload and extraction-review states.
5. Capture owner dashboard/mobile dashboard only after safe demo metrics are ready.
6. Build hero composite.
7. Derive OG/social assets from hero composite.
8. Build customer-browse and setup-relief section visuals.
9. Build public-surfaces matrix.
10. Compress and verify all exported assets.
11. Insert assets into homepage only when they outperform current coded visuals.
12. Re-run desktop/mobile visual QA.

---

## File Size And Format Rules

| Asset type | Format | Target size |
| --- | --- | --- |
| Homepage section image | WebP | Under 220 KB each |
| Hero composite | WebP | Under 350 KB |
| OG/social image | PNG or JPG | Under 500 KB |
| Small icon/logo | SVG or PNG | Under 50 KB |
| Raw screenshots | Do not place in `public/` | Keep private until approved |

---

## Approval Rules

Founder approval is required before publishing:

- any real customer/business screenshot
- any metric or analytics screenshot
- any asset using a real phone number, address, logo, or menu
- any claim implying automatic external sync
- any ad/campaign visual

Founder approval is optional for:

- typography-only industry grid
- coded fallback visual polish
- internal screenshot staging notes

---

## Current Blocking Items

- No routed founder-approved demo tenant has been selected for real public screenshots.
- Stage 6.3 fictional demo assets now cover the P0 homepage, OG/social, and placeholder visual gap.
- Stage 6.3 assets were refreshed after comparing real MenuList OBP/menu structure through Stage 6.4 reference captures while preserving the website's light marketing theme.
- Stage 6.2 private clean demo captures now cover screenshot-slot planning without publishing unapproved data.
- Stage 7 visual QA screenshots now confirm the homepage first viewport after mobile overflow fixes:
  - `__docs__/main-website/asset-production/stage-07/homepage-desktop-stage-07.png`
  - `__docs__/main-website/asset-production/stage-07/homepage-mobile-stage-07.png`
- Stage 7.1 visual QA screenshots confirm generated mockups are mounted in the rendered homepage:
  - `__docs__/main-website/asset-production/stage-07-1/homepage-draft-mockups-desktop.png`
  - `__docs__/main-website/asset-production/stage-07-1/homepage-draft-mockups-mobile.png`
- The fictional demo pack must not be presented as real customer proof.
- Analytics proof still requires safe demo metrics before real dashboard capture.
- Public-surface matrix still requires 4-6 clean real source screenshots for final launch proof.

---

## Reference

For full details, use:

- `__docs__/main-website/website-prep-codex-prompts/stage-06-output-screenshot-asset-production-system.md`
