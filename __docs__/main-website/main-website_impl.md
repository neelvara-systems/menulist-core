# Main Website (menulist.ai) — Implementation

**Status:** IMPLEMENTED — v2 Hype/Domination  
**Last Updated:** March 2026  
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

---

## 3. Layout

**File:** `src/app/(website)/layout.tsx`

```
LocalisationProvider (locale from next-intl/server)
  → WebsiteAuthProvider (src/app/(website)/WebsiteAuthProvider.tsx)
    → ThemeProvider (forcedTheme="light")
      → GoogleAnalytics
      → ClarityAnalytics
      → {children}
```

**Default metadata (from layout):**
- Title: `MenuList — Upload Your Menu. Your Business is Online.`
- Description: `Turn a menu photo into your digital menu, QR menu, and official business page — in minutes, not months. One menu, everywhere customers look.`
- OG image: `/og-image.png`
- Robots: index, follow (full crawling enabled)
- Viewport: device-width, initialScale 1, maximumScale 1

---

## 4. Homepage Sections (12 sections, in order)

**File:** `src/components/website/home/HomePage.tsx`

| # | Section | Component File |
|---|---------|---------------|
| 1 | Hero | `HeroSection.tsx` |
| 2 | Problem | `ProblemSection.tsx` |
| 3 | Solution | `SolutionSection.tsx` |
| 4 | Interactive Workflow | `InteractiveWorkflowSection.tsx` |
| 5 | Prepared For You | `PreparedForYouSection.tsx` |
| 6 | Surfaces | `SurfacesSection.tsx` |
| 7 | Smart Features | `SmartFeaturesSection.tsx` |
| 8 | Stats | `StatsSection.tsx` |
| 9 | Business | `BusinessSection.tsx` |
| 10 | Industry | `IndustrySection.tsx` |
| 11 | FAQ | `FaqSection.tsx` |
| 12 | Final CTA | `FinalCtaSection.tsx` |

**Dead code:** `HowItWorksSection.tsx` exists in `home/` but is NOT imported by `HomePage.tsx`. It was replaced by `InteractiveWorkflowSection.tsx` in v2.

---

## 5. Component Directory Structure

```
src/components/website/
├── Header.tsx                  — Shared header (all pages)
├── Footer.tsx                  — Shared footer (all pages)
├── SchemaMarkup.tsx            — Homepage JSON-LD schema
├── GoogleAnalytics.tsx         — GA tracking script
├── ClarityAnalytics.tsx        — Microsoft Clarity script
├── home/                       — 12 homepage sections + 1 dead file
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
└── shadcn/                     — shadcn/ui components (ThemeProvider, hooks, lib, ui)
```

### Shared Components (`src/components/website/shared/`)

| Component | Purpose |
|-----------|---------|
| `AnimateOnScroll.tsx` | Scroll-triggered animations (Framer Motion) |
| `LogoMark.tsx` | Animated logo mark SVG |
| `ScrollToTopButton.tsx` | Floating scroll-to-top button |
| `SectionHeading.tsx` | Consistent section heading component |
| `SectionWrapper.tsx` | Section layout wrapper with consistent spacing |
| `WebsiteButton.tsx` | Styled CTA button |
| `WebsiteLanguageSwitcher.tsx` | Language dropdown (8 languages) |

---

## 6. Localization (i18n)

- Config: `src/config/websiteLanguages.ts` (8 languages)
- Switcher: `WebsiteLanguageSwitcher.tsx` — auto-detects position (opens upward near bottom)
- Locale files: `public/locales/menulist.ai/{locale}.json` → `Website` namespace
- Pattern: `useTranslations('Website')` with `t('Section.keyName')`
- **Fully translated:** en-US + hi-IN (all sections)
- **Core sections translated:** ar-SA, es-ES, ta-IN, te-IN, mr-IN, bn-IN (Header/Footer/Hero; rest falls back to English via deepMerge)

---

## 7. Feature Flags

| Flag | File | Default | Purpose |
|------|------|---------|---------|
| `ENABLE_PUBLIC_MENU_ENTRY` | `src/config/features.ts` | `false` | Gates `/create-menu` public entry page |

**Note:** `ENABLE_NEW_WEBSITE` no longer exists — was removed after website v2 was fully implemented and became the default.

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
- **Approach:** CSS variables for colors, responsive breakpoints, mobile-first
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
