# Website Image & Asset Requirements

**Status:** ✅ CURRENT — Market-first product-proof asset plan plus selected clean feature screenshot proof assets
**Last Updated:** July 10, 2026
**Primary Stage Output:** `website-prep-codex-prompts/stage-06-output-screenshot-asset-production-system.md`
**Latest Asset Output:** `asset-production/launch-pack-2026-07/menulist-launch-pack.md`

---

## Current Asset Strategy

The current asset pack contains founder-approved fictional demo visuals for **launch-safe demo product visuals** across hero, setup, public surfaces, customer menu, Official Business Page, and analytics/status proof. The active compressed homepage does not mount every generated asset. Future website work should distinguish generated supporting assets from visuals currently visible in the active homepage and feature-page flows.

Market-first correction, July 2026:

- Product proof is not optional polish for the MenuList website. Restaurant/SMB operators comparing tools need to see the customer page, owner approval surface, and operating state quickly, especially before they know the brand.
- The active compressed homepage now mounts `HeroSection` with the `menulist-business-truth-loop` WebM/MP4 and poster fallbacks, `CustomerBrowseSection` with `menulist-public-menu-mobile.webp`, and `OwnerProofSection` with AI Menu Manager and Business Health product-proof images. `menulist-hero-official-source.webp` remains a CSS background fallback and OG source. `SetupReliefSection`, `SurfacesSection`, `BusinessSection`, and `AnalyticsInsightsSection` are available components but are not mounted in the active homepage flow.
- Treat the next conversion pass as a product-proof pass, not a copy-expansion pass: add or replace visuals with real routed demo screenshots where they matter most, then keep the page short.
- Use static AVIF/WebP screenshots for first-viewport and feature-page proof, short muted WebM/MP4 loops only for workflows that need sequence, SVG/HTML only for source-to-surface system logic, and a short product video only after screenshot proof is already present.
- Do not describe fictional or synthetic visuals as real customer screenshots, testimonials, customer proof, or live usage evidence.

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

Stage 6.3 supersedes the earlier Stage 6.1 draft pack with a fictional founder-approved demo business named **The Daily Plate**. Some assets are visible in the active website, while others remain supporting assets for unmounted sections, future slots, social previews, or page-specific proof. They must not be described as real customer screenshots, testimonials, or customer proof.

Stage 8 adds homepage and feature-page product-proof demo images for the current conversion pass. These images are generated from fictional data and align with MenuList's actual output families: public menu, Official Business Page, owner approval cards, Business Health stable state, analytics/status proof, and owner phone dashboard. They are launch-safe demo product visuals only until replaced by browser-routed demo tenant screenshots.

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
├── menulist-linkedin-launch.png
└── product-proof/
    ├── ai-menu-manager-approval-card.webp
    ├── business-health-stable-check.webp
    └── owner-phone-dashboard.webp
```

Do not place raw capture files, private demo data, or unapproved screenshots in `public/`.

Approved public screenshot exception (June 15, 2026):

- `/public/images/website/print-ready-kit/print-assets-dashboard.jpg` is a cropped Assets template-list capture with account-header details removed.
- `/public/images/website/print-ready-kit/print-assets-editor.jpg` is the print asset editor capture for the dedicated Print-ready Kit page.
- These assets are mounted only on `/features/print-ready-kit` through `PrintReadyKitProofGallery.tsx`.

Approved public feature screenshot proof assets (June 16, 2026):

- `/public/images/website/features/menu-import/source-menu-link.webp` is a cropped owner import/source proof for `/features/menu-import`.
- `/public/images/website/features/qr-menu-links/share-kit.webp` is a cropped owner share/QR/presence proof for `/features/qr-menu-links`.
- `/public/images/website/menulist-public-menu-mobile.webp` is the approved fictional customer-menu proof reused on `/features/qr-menu-links`; the former feature-local capture was removed because visual review found a broken logo and empty media block.
- `/public/images/website/features/customer-feedback-loop/public-feedback-form.webp` is the public feedback report form proof for `/features/customer-feedback-loop`.
- `/public/images/website/features/public-discovery/presence-checklist.webp` is a public placement/source checklist proof for `/features/public-discovery`.
- These assets are mounted through `FeatureScreenshotProofGallery.tsx` and use localized captions from `Website.FeatureDetailScreenshots`.

Held-back source captures (June 16, 2026):

- Raw Chrome captures live under `__docs__/main-website/asset-production/feature-screenshots/raw/`.
- Do not move rough captures into `public/` if they show broken media, private owner details, unready Business Health states, missing descriptions, or non-launch demo quality.
- Current held-back slots: Official Business Page needs a clean public page without broken media/install-banner distraction; Featured Choices needs a public menu state that visibly proves Featured/Quick/Value choices; Owner PWA Dashboard needs real mobile/PWA screenshots; Business Health needs a ready/stable status state; Menu Content Prep and Menu Quality Validation need cleaner prepared demo data before public mounting.
- Customer Feedback owner-inbox proof remains held back because the current raw capture shows a loading state; QR Menu Links reuses the approved fictional mobile-menu proof because the former feature-local public capture showed a broken logo and empty media block.

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
| Hero official-source composite | `public/images/website/menulist-hero-official-source.webp` | Generated fallback demo | Fictional The Daily Plate product composite; retained as the homepage CSS background fallback and OG source |
| Hero business-truth motion | `public/images/website/menulist-business-truth-loop.webm` | Approved + visible demo | Mounted directly in current active `HeroSection.tsx` with MP4 and WebP poster fallbacks |
| Open Graph image | `public/images/website/menulist-og-official-source.png` | Generated | Current website metadata target |
| Backward-compatible OG image | `public/og-image.png` | Generated | Copy of the new OG image |
| Mobile public menu visual | `public/images/website/menulist-public-menu-mobile.webp` | Generated + visible demo | Fictional customer-browse visual; mounted in `CustomerBrowseSection.tsx` |
| OBP browser visual | `public/images/website/menulist-obp-browser.webp` | Generated + visible feature-page demo | Fictional Official Business Page visual; mounted in `/features/official-business-page` through `FeatureScreenshotProofGallery.tsx` |
| Setup relief workflow | `public/images/website/menulist-setup-relief-workflow.webp` | Generated supporting asset | Upload/review/publish workflow strip; available through `SetupReliefSection.tsx`, which is not mounted in the active compressed homepage |
| Public surfaces matrix | `public/images/website/menulist-public-surfaces-matrix.webp` | Approved supporting asset | MenuList-controlled surfaces visual with categorical activity availability and no invented counts; available through `SurfacesSection.tsx`, which is not mounted in the active compressed homepage |
| Analytics/status visual | `public/images/website/menulist-analytics-proof.webp` | Approved + visible feature-page demo | Categorical activity/status availability only; mounted in `/features/analytics` through `FeatureScreenshotProofGallery.tsx` |
| Launch square image | `public/images/website/menulist-launch-square.png` | Generated | Square social/launch asset |
| LinkedIn launch image | `public/images/website/menulist-linkedin-launch.png` | Approved | The Daily Plate social derivative aligned with the coordinated launch pack |

## Stage 8 Product Proof Demo Asset Pack

Stage 8 mounts product-proof demo visuals in the current active website instead of leaving all proof in unmounted supporting sections.

| Asset | File | Status | Notes |
| --- | --- | --- | --- |
| AI Menu Manager approval visual | `public/images/website/product-proof/ai-menu-manager-approval-card.webp` | Generated + visible demo | Mounted in `OwnerProofSection.tsx` and `/ai-menu-manager`; shows message -> prepared card -> owner approval |
| Business Health stable visual | `public/images/website/product-proof/business-health-stable-check.webp` | Generated + visible demo | Mounted in `OwnerProofSection.tsx` and `/features/business-health`; shows latest check, No action needed state, activity, and owner phone context |
| Owner phone dashboard visual | `public/images/website/product-proof/owner-phone-dashboard.webp` | Approved + visible demo | Mounted in `FeatureScreenshotProofGallery.tsx` for `/features/owner-phone-dashboard`; shows mobile status, share link, and public-link readiness without invented activity counts |
| Hero business-truth motion | `public/images/website/menulist-business-truth-loop.webm` | Approved + visible demo | Mounted directly in `HeroSection.tsx` for first-viewport product proof |
| OBP browser visual | `public/images/website/menulist-obp-browser.webp` | Generated + visible demo | Mounted in `FeatureScreenshotProofGallery.tsx` for `/features/official-business-page` |
| Analytics/status visual | `public/images/website/menulist-analytics-proof.webp` | Generated + visible demo | Mounted in `FeatureScreenshotProofGallery.tsx` for `/features/analytics` |

## Coordinated Launch Pack - July 2026

The governed launch pack combines the live website hero motion, its static fallback, square and LinkedIn social assets, the Owner PWA Dashboard device proof, and four deterministic film keyframes. The complete mapping and regeneration commands live in `asset-production/launch-pack-2026-07/menulist-launch-pack.md`.

Generator:

- `scripts/website-assets/generate-product-proof-assets.mjs`

Generated pack note:

- `__docs__/main-website/asset-production/stage-08-product-proof/stage-08-product-proof-demo-assets.md`

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
| P0 | Hero business-truth motion | `menulist-business-truth-loop.webm` | First-screen credibility | Approved source-to-surface HyperFrames loop | Mounted in the active homepage with MP4 and poster fallbacks |
| P0 | Open Graph image | `menulist-og-official-source.png` | Social/link preview | Hero/source-card derivative | Generated metadata asset exists |
| P0 | Mobile public menu screenshot | `menulist-public-menu-mobile.webp` | Customer browse proof | Real public menu route | P0 demo visual is mounted; replace with routed screenshot when demo tenant exists |
| P0 | OBP browser screenshot | `menulist-obp-browser.webp` | Public-presence authority proof | Real Official Business Page route | Generated demo asset is mounted on `/features/official-business-page`; replace with routed screenshot when demo tenant exists |
| P0 | Setup relief workflow visual | `menulist-setup-relief-workflow.webp` | Effort-removal proof | Upload/review/publish screenshots | Generated asset exists in an unmounted section; use only if the compressed homepage adds a proof strip or feature page slot |
| P1 | Analytics/status proof crop | `menulist-analytics-proof.webp` | Post-publish owner confidence | Owner dashboard/mobile dashboard | Generated demo asset is mounted on `/features/analytics`; replace with staged routed metrics screenshot when ready |
| P1 | Public surfaces matrix | `menulist-public-surfaces-matrix.webp` | Multi-surface proof | OBP, menu, QR/share, saved shortcut, issue reports, activity signals | Generated asset exists in an unmounted section; final needs real source screenshots or a tighter homepage proof grid |
| P1 | LinkedIn launch image | `menulist-linkedin-launch.png` | Launch distribution | Hero/OBP/menu composite | Useful |
| P2 | Square launch visual | `menulist-launch-square.png` | Instagram/WhatsApp launch | Workflow strip | Useful |
| P2 | Owner device visual | `product-proof/owner-phone-dashboard.webp` | Device mockup and mobile-owner proof | Owner PWA Dashboard product surface | Mounted and AssetOS-tracked |
| P2 | Launch-film keyframes | `packages/asset-factory/published/menulist/launch-video-frames/` | Film storyboard and edit handoff | Approved business-truth loop | Four deterministic 16:9 frames |
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
- Stage 6.3 fictional demo assets cover the OG/social and placeholder visual gap, but only part of the pack is visible in the active compressed homepage.
- Stage 6.3 assets were refreshed after comparing real MenuList OBP/menu structure through Stage 6.4 reference captures while preserving the website's light marketing theme.
- Stage 6.2 private clean demo captures now cover screenshot-slot planning without publishing unapproved data.
- Stage 7 visual QA screenshots now confirm the homepage first viewport after mobile overflow fixes:
  - `__docs__/main-website/asset-production/stage-07/homepage-desktop-stage-07.png`
  - `__docs__/main-website/asset-production/stage-07/homepage-mobile-stage-07.png`
- Stage 7.1 visual QA screenshots confirmed generated mockups in an earlier rendered homepage state; re-check active mounts before treating those slots as current:
  - `__docs__/main-website/asset-production/stage-07-1/homepage-draft-mockups-desktop.png`
  - `__docs__/main-website/asset-production/stage-07-1/homepage-draft-mockups-mobile.png`
- The fictional demo pack must not be presented as real customer proof.
- Analytics proof still requires safe demo metrics before real dashboard capture.
- Public-surface matrix still requires 4-6 clean real source screenshots for final launch proof.

---

## Reference

For full details, use:

- `__docs__/main-website/website-prep-codex-prompts/stage-06-output-screenshot-asset-production-system.md`
