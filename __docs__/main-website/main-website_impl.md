# Main Website (menulist.ai) — Implementation

**Status:** IMPLEMENTED — v3.4.8 Canonical Website Default
**Last Updated:** May 19, 2026
**Audience:** Developers

---

## 1. Architecture Overview

The main website lives in the `(website)` route group under Next.js App Router. All pages use a shared layout with light theme, localization, and analytics.

```
Route Group: src/app/(website)/
Layout:      LocalisationProvider → WebsiteAuthProvider → ThemeProvider (forcedTheme="light")
Analytics:   GoogleAnalytics + ClarityAnalytics (injected in layout)
Styles:      @styles/app.scss (layout) + @/styles/website.css (per-page)
```

---

## 2. Pages & Routes

| Route | File | Component | Type | Metadata |
|-------|------|-----------|------|----------|
| `/` | `(website)/page.tsx` | `HomePage` | Client (`'use client'`) | Default from layout |
| `/features` | `(website)/features/page.tsx` | `FeaturesPage` | Server | Per-page `export const metadata` |
| `/how-it-works` | `(website)/how-it-works/page.tsx` | `ProductPage` | Server | Per-page |
| `/pricing` | `(website)/pricing/page.tsx` | `PricingWrapper` | Server | Per-page |
| `/about` | `(website)/about/page.tsx` | `AboutPage` | Server | Per-page |
| `/contact` | `(website)/contact/page.tsx` | `ContactPage` | Server | Per-page |
| `/get-started` | `(website)/get-started/page.tsx` | `GetStartedPage` | Server | Per-page |
| `/multi-location` | `(website)/multi-location/page.tsx` | `MultiLocationPage` | Server | Per-page |
| `/trust-security` | `(website)/trust-security/page.tsx` | `TrustSecurityPage` | Server | Per-page |
| `/create-menu` | `(website)/create-menu/page.tsx` | `CreateMenuClient` | Server (gate) | Per-page |
| `/create-menu/preview/[draftId]` | `(website)/create-menu/preview/[draftId]/page.tsx` | `PreviewClient` | — | — |
| `/create-menu/success` | `(website)/create-menu/success/page.tsx` | — | — | — |
| `/product` | `(website)/product/page.tsx` | **Redirect → `/how-it-works`** | Server | — |
| `/privacy-policy` | `(website)/privacy-policy/page.tsx` | `PrivacyPolicyPage` | Server | Per-page |
| `/terms-of-service` | `(website)/terms-of-service/page.tsx` | `TermsOfServicePage` | Server | Per-page |
| `/refund-policy` | `(website)/refund-policy/page.tsx` | `RefundPolicyPage` | Server | Per-page |

**Total: 16 routes (8 core + 3 create-menu + 1 redirect + 3 legal + 1 trust)**

### Notes
- Homepage (`/`) is `'use client'` — includes `SchemaMarkup` (JSON-LD), all other pages are server components with `export const metadata`.
- `/product` is a permanent redirect to `/how-it-works` (legacy URL preservation).
- `/create-menu` is feature-gated by `ENABLE_PUBLIC_MENU_ENTRY` — shows "Coming Soon" when OFF.
- Public website CTAs route to `/create-menu` for upload-first conversion. `/get-started` remains a guided setup/sign-in page and no longer acts as the primary homepage funnel.

---

## 3. Layout

**File:** `src/app/(website)/layout.tsx`

```
LocalisationProvider (locale from next-intl/server)
  → WebsiteAuthProvider (`src/app/(website)/WebsiteAuthProvider.tsx`)
    → ThemeProvider (forcedTheme="light")
      → GoogleAnalytics
      → ClarityAnalytics
      → {children}
```

**Default metadata (from layout):**
- Title: `MenuList - Upload Your Menu Online`
- Description: `Start with your current menu. MenuList turns it into a live menu, official page, QR, web link, customer view, and PDF from one approved source.`
- OG image: `/images/website/menulist-og-official-source.png`
- Backward-compatible OG copy: `/og-image.png`
- Robots: index, follow (full crawling enabled)
- Viewport: device-width, initialScale 1, maximumScale 1

---

## 4. Homepage Sections (17 sections plus sticky CTA, in order)

**File:** `src/components/website/home/HomePage.tsx`

| # | Section | Component File |
|---|---------|---------------|
| 1 | Hero | `HeroSection.tsx` |
| 2 | Revenue Path | `RevenuePathSection.tsx` |
| 3 | Interactive Workflow | `InteractiveWorkflowSection.tsx` |
| 4 | Problem | `ProblemSection.tsx` |
| 5 | Solution | `SolutionSection.tsx` |
| 6 | Stats | `StatsSection.tsx` |
| 7 | Setup Relief | `SetupReliefSection.tsx` |
| 8 | Surfaces | `SurfacesSection.tsx` |
| 9 | Search Discovery | `SearchDiscoverySection.tsx` |
| 10 | Customer Browse | `CustomerBrowseSection.tsx` |
| 11 | Analytics Insights | `AnalyticsInsightsSection.tsx` |
| 12 | Smart Features | `SmartFeaturesSection.tsx` |
| 13 | Prepared For You | `PreparedForYouSection.tsx` |
| 14 | Business | `BusinessSection.tsx` |
| 15 | Industry | `IndustrySection.tsx` |
| 16 | FAQ | `FaqSection.tsx` |
| 17 | Final CTA | `FinalCtaSection.tsx` |

**Asset-production support:** Stage 6.1 public placeholders live in `public/images/website/` and are mounted as draft homepage visuals in `HeroSection.tsx`, `SetupReliefSection.tsx`, `SurfacesSection.tsx`, `CustomerBrowseSection.tsx`, `AnalyticsInsightsSection.tsx`, and `BusinessSection.tsx`. Stage 6.2 private screenshot references live in `__docs__/main-website/asset-production/stage-06-2/` and are not imported by the app. Stage 7 visual QA screenshots live in `__docs__/main-website/asset-production/stage-07/`.

**Footer revenue pass:** Stage 7.2 reviewed Paper, Kestra, Stripe, Lenis, Upscayl, Linear, Vercel, and Notion reference patterns, then upgraded `Footer.tsx` into a conversion/resource layer. It deliberately borrows structure, not unsupported claims or trend-heavy visuals.

**Whole-page reference pass:** Stage 7.3 corrected the footer-only scope by adding `RevenuePathSection.tsx`, reshaping `ProblemSection.tsx`, and upgrading `StatsSection.tsx` into a stronger proof band. The page now moves from official source -> revenue path -> public drift pain -> one-source proof -> workflow and visual evidence.

**Copy, motion, and heading polish:** Stage 7.4 normalized homepage wording, casing, and grammar in the `Website` locale namespace, removed viewport-scaled website typography, added subtle hover polish to proof/path/problem elements, updated shared scroll animations to respect reduced-motion preferences, and routed static website hero/section headings through `WebsiteHeadline` for consistent highlight treatment.

**Supporting-page revenue polish:** Stage 7.5 extended the official-source system across supporting pages. `AboutPage`, `ContactPage`, `GetStartedPage`, `TrustSecurityPage`, and `pricing-pages/index.tsx` now use shared hero/proof patterns where appropriate; pricing visual copy was hardened without changing payment, subscription, Razorpay, auth, or onboarding logic; `/how-it-works` and `/multi-location` now avoid overclaiming instant propagation in public copy.

**Mobile website polish:** Stage 7.7 tightened `website.css` mobile behavior across the homepage and supporting pages. Mobile controls now use 44px-class touch targets, the revenue path and proof sections use denser mobile grids, the footer navigation keeps tappable links, and stale `/multi-location` locale overrides were normalized away from instant/always-consistent claims. Pricing/payment/auth/create-menu runtime logic was not changed.

**Search/AI discovery proof:** Stage 7.8 added `SearchDiscoverySection.tsx` after `SurfacesSection.tsx`. It exposes shipped SEO/AEO and discovery infrastructure in calm owner language: owner SEO/AEO settings, Business Copy Setup, structured public business/menu facts, sitemap/robots rules, and LLM discovery files. The copy explicitly avoids ranking, citation, or placement guarantees. SEO/AEO runtime, `/api/seo`, Business Copy Setup, mobile owner screens, pricing/payment/auth, and create-menu runtime logic were not changed.

**POS Sync operations proof:** Stage 7.10 added one POS Sync proof point to `SmartFeaturesSection.tsx` and one Operations card to `FeaturesPage.tsx`. This is intentionally low prominence because POS Sync is an advanced operations capability, not the first-screen buying promise for a non-technical SMB owner. Copy uses signed full-menu snapshot and connected store POS webhook language and does not claim universal POS support, real-time sync, or a POS integration suite. POS Sync runtime, APIs, settings behavior, pricing/payment/auth, and create-menu runtime logic were not changed.

**Mobile owner operations proof:** Stage 7.11 added a dedicated Operations card to `FeaturesPage.tsx` for phone-browser/PWA owner management. This expands the existing short reassurance line into a feature-level proof point, grounded in existing mobile owner surfaces rather than a new runtime change. Mobile owner runtime, dashboard logic, digital screens runtime, POS Sync runtime, pricing/payment/auth, and create-menu runtime logic were not changed.

**Staff access operations proof:** Stage 7.12 added one staff-access proof point to `SmartFeaturesSection.tsx`, one Operations card to `FeaturesPage.tsx`, and one FAQ entry. Copy is grounded in shipped staff management: email or Staff ID/passcode access, role assignment, passcode reset, and owner force sign-out. Staff/auth runtime, role/permission APIs, pricing/payment/auth, and create-menu runtime logic were not changed.

**Staff access policy alignment:** Stage 7.13 updated public Privacy Policy, Terms of Service, and Trust & Security content to reflect owner-managed staff identities, role/store-scoped access, passcode reset metadata, authorized team access, and owner session revocation controls. This was a content/security-disclosure alignment only; no staff/auth runtime behavior changed.

**Canonical cleanup:** v3.3.0 made this implementation the only website source-code version. Old source-code backups, backup restore docs, the dead `HowItWorksSection.tsx`, and unused legacy landing-template visuals were removed. Historical strategy docs may remain for context, but they are not restoration sources.

---

## 5. Component Directory Structure

```
src/components/website/
├── Header.tsx                  — Shared header (all pages)
├── Footer.tsx                  — Shared revenue footer with CTA, proof cards, and product/source/resource/legal navigation
├── SchemaMarkup.tsx            — Homepage JSON-LD schema
├── GoogleAnalytics.tsx         — GA tracking script
├── ClarityAnalytics.tsx        — Microsoft Clarity script
├── home/                       — 17 homepage sections + StickyCta
├── about/AboutPage.tsx         — About page
├── contact/ContactPage.tsx     — Contact page
├── features/FeaturesPage.tsx   — Features page
├── get-started/GetStartedPage.tsx  — Get Started page
├── multi-location/MultiLocationPage.tsx — Multi-Location page
├── product/ProductPage.tsx     — How It Works page (used by /how-it-works route)
├── legal/                      — PrivacyPolicyPage, TermsOfServicePage, RefundPolicyPage
├── trust-security/TrustSecurityPage.tsx — Trust & Security page
├── pricing/PricingWrapper.tsx  — Pricing page wrapper
├── pricing-pages/              — Full pricing UI (PlanCard, FeatureComparisonTable,
│   │                             OnboardingModal, SubscriptionManagement, CreditPackCard,
│   │                             CurrencySwitcher, PricingFaq, WelcomeBackBanner, etc.)
│   └── shared/                 — CreditPacksCtaSection, EnterpriseCtaSection, Loader, SVGBg
├── shared/                     — Reusable components (see below)
└── shadcn/                     — shadcn/ui primitives still required by website layout and pricing
```

### Shared Components (`src/components/website/shared/`)

| Component | Purpose |
|-----------|---------|
| `AnimateOnScroll.tsx` | Visibility-safe website wrapper; keeps content readable even when scroll animation observers do not fire |
| `LogoMark.tsx` | Static official MenuList mark used by website header/footer, matched to the app icon / `AnimatedVerticalLogo` geometry |
| `ScrollToTopButton.tsx` | Floating scroll-to-top button |
| `SectionHeading.tsx` | Section heading wrapper backed by `WebsiteHeadline` |
| `SectionWrapper.tsx` | Section layout wrapper with consistent spacing |
| `WebsiteButton.tsx` | Styled CTA button |
| `WebsiteHeadline.tsx` | Shared hero/section headline renderer with consistent highlight styling |
| `WebsiteMobileSupportHint.tsx` | Reusable owner reassurance line for phone-browser/PWA operation |
| `WebsiteOwnerApprovalHint.tsx` | Reusable owner reassurance line for review-before-publish control |
| `WebsitePageHero.tsx` | Shared supporting-page hero with eyebrow, headline, subline, and CTA slots |
| `WebsiteProofStrip.tsx` | Shared proof strip used by supporting pages |
| `WebsiteLanguageSwitcher.tsx` | Language dropdown (8 languages) |

---

## 6. Localization (i18n)

- Config: `src/config/websiteLanguages.ts` (8 languages)
- Switcher: `WebsiteLanguageSwitcher.tsx` — auto-detects position (opens upward near bottom)
- Locale files (website namespace):
  `public/locales/menulist.ai/en-US.json`, `public/locales/menulist.ai/hi-IN.json`,
  `public/locales/menulist.ai/ta-IN.json`, `public/locales/menulist.ai/te-IN.json`,
  `public/locales/menulist.ai/mr-IN.json`, `public/locales/menulist.ai/bn-IN.json`,
  `public/locales/menulist.ai/ar-SA.json`, `public/locales/menulist.ai/es-ES.json`
- Pattern: `useTranslations('Website')` with `t('Section.keyName')`
- **Fully translated:** en-US + hi-IN (all sections)
- **Core sections translated:** ar-SA, es-ES, ta-IN, te-IN, mr-IN, bn-IN (Header/Footer/Hero; rest falls back to English via deepMerge)
- **Website language switcher:** `WEBSITE_LANGUAGES` drives 8 selectable locales
  (`en-US`, `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, `es-ES`) from `src/config/websiteLanguages.ts`.
- Additional locale files (`en-GB`, `gu-IN`, `zh-CN`) exist in `public/locales/menulist.ai/` for broader app usage and fallback-only coverage.

---

## 7. Feature Flags

| Flag | File | Default | Purpose |
|------|------|---------|---------|
| `ENABLE_PUBLIC_MENU_ENTRY` | `src/config/features.ts` | `false` | Gates `/create-menu` public entry page |

**Note:** `ENABLE_NEW_WEBSITE` no longer exists. The current website is the canonical default.

---

## 8. SEO Infrastructure

- All non-homepage pages are **server components** with `export const metadata` (unique title, description, canonical, OG)
- Homepage is `'use client'` — uses default metadata from layout + `SchemaMarkup` component for JSON-LD
- `SchemaMarkup.tsx` injects Organization + WebSite schema on homepage
- Sitemap: `public/sitemap.xml` (all public pages)
- Robots: Full crawling enabled (index, follow, max-image-preview: large)
- Per-page canonical URLs via `alternates.canonical`

---

## 9. Styles

- **Layout:** `@styles/app.scss` (imported in layout.tsx)
- **Pages:** `@/styles/website.css` (imported per-page via page.tsx files)
- **Approach:** CSS variables for colors, responsive breakpoints, mobile-first spacing, and 44px-class touch targets
- **Components:** Mix of Tailwind CSS + custom CSS + shadcn/ui
- **Theme:** Force light mode via `ThemeProvider` (website is always light)

---

## 10. Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Route group | `(website)` | Separates website from dashboard routes |
| SSR vs CSR | Server components (except homepage) | SEO benefit for all pages |
| Homepage CSR | `'use client'` | Heavy animations (Framer Motion, Canvas, SVG) |
| Pricing | Reuses existing `pricing-pages/` components | Full Razorpay integration already built |
| Analytics | GA + Clarity in layout | Covers all pages automatically |
| Auth | `WebsiteAuthProvider` wrapper | Session context for pricing/onboarding flows |
| Theming | shadcn ThemeProvider forced light | Website is always light mode |
| Localization | next-intl via layout provider | Consistent i18n across all pages |
