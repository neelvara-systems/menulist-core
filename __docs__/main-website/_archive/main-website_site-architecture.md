# Site Architecture — MenuList Main Website

**Status:** 🔒 LOCKED — Implementation Reference  
**Last Updated:** February 2026

---

## 1. Page Map

```
menulist.ai/
├── / ............................ Homepage (positioning + system overview)
├── /product .................... How It Works (detailed product explanation)
├── /multi-location ............. For Chains & Multi-Outlet businesses
├── /pricing .................... Plans + credit model
├── /about ...................... Minimal credibility page
├── /get-started ................ Conversion entry point (→ onboarding)
├── /privacy-policy ............. Legal
├── /terms-of-service ........... Legal
├── /refund-policy .............. Legal
├── /contact .................... Support/contact
└── /login ...................... Auth redirect
```

**Total: 10 routes (6 core + 4 legal/utility)**

---

## 2. Homepage — Section-by-Section Wireframe

### Section 1: Hero (Above the Fold)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [MenuList logo]   How It Works  Multi-Location  Pricing     │
│                                              Login  [Create] │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│     Manage your official menu and                            │
│     business information from one place.                     │
│                                                              │
│     Upload your menu once.                                   │
│     We prepare and publish everything for you.               │
│                                                              │
│     [Create your MenuList →]                                 │
│     Takes minutes. No technical setup.                       │
│                                                              │
│     ┌──────────────────────────────────┐                     │
│     │  [Multi-surface product preview] │                     │
│     │  Phone menu + QR + Public page   │                     │
│     └──────────────────────────────────┘                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:** Centered text above, product visual below  
**Background:** `--bg-primary` (#FFFFFF)  
**Padding:** `py-24` desktop, `py-12` mobile

---

### Section 2: The Problem

```
┌──────────────────────────────────────────────────────────────┐
│  bg: --bg-subtle                                             │
│                                                              │
│     Most businesses don't have a single                      │
│     official public version of their menu.                   │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Outdated  │ │ Wrong    │ │ Old PDF  │ │ Different│       │
│  │ Google    │ │ QR menu  │ │ floating │ │ pricing  │       │
│  │ listing   │ │          │ │ around   │ │ online   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│     Customers see inconsistent information.                  │
│     Prices don't match. Menus are outdated.                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:** Centered heading, 4-column icon grid (2x2 on mobile)  
**Background:** `--bg-subtle` (#F8FAFC)  
**Padding:** `py-20` desktop, `py-12` mobile

---

### Section 3: The Solution

```
┌──────────────────────────────────────────────────────────────┐
│  bg: --bg-primary                                            │
│                                                              │
│     Create one official version.                             │
│     Everything else stays aligned. You don't touch it again. │
│                                                              │
│              ┌──────────────┐                                │
│              │  Your Menu   │                                │
│              └──────┬───────┘                                │
│         ┌───────┬───┴───┬───────┬───────┐                   │
│         ▼       ▼       ▼       ▼       ▼                   │
│       [QR]  [Google] [Screens] [Web]  [Print]               │
│                                                              │
│  • Central control                                           │
│  • Instant updates                                           │
│  • Multi-surface publishing                                  │
│  • Consistent everywhere                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:** Centered heading, system diagram (SVG), 2x2 bullet grid  
**Background:** `--bg-primary` (#FFFFFF)  
**Visual:** Clean SVG diagram, brand color for connections

---

### Section 4: Where It Shows Up

```
┌──────────────────────────────────────────────────────────────┐
│  bg: --bg-subtle                                             │
│                                                              │
│     See where your menu appears.                             │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  [icon]  │  │  [icon]  │  │  [icon]  │                  │
│  │ QR Menu  │  │ Public   │  │ Google   │                  │
│  │          │  │ Link     │  │ Presence │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  [icon]  │  │  [icon]  │  │  [icon]  │                  │
│  │ Digital  │  │ PDF      │  │ Official │                  │
│  │ Screens  │  │ Export   │  │ Page     │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:** Centered heading, 3x2 tile grid (2x3 on mobile)  
**Background:** `--bg-subtle` (#F8FAFC)  
**Each tile:** Icon (32px, brand color) + title + 1-line description

---

### Section 5: For Serious Businesses

```
┌──────────────────────────────────────────────────────────────┐
│  bg: --bg-primary                                            │
│                                                              │
│  [Left: text]              [Right: product visual]           │
│                                                              │
│  For growing businesses                                      │
│  that care about consistency.                                │
│                                                              │
│  ✓ Consistent pricing everywhere                             │
│  ✓ Central brand control                                     │
│  ✓ Multi-location support                                    │
│  ✓ Professional presentation                                 │
│                                                              │
│  [Learn about multi-location →]                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:** 2-column (text left, visual right). Stacked on mobile.  
**Background:** `--bg-primary` (#FFFFFF)  
**Link:** Text link to `/multi-location` page (not a button)

---

### Section 6: Who It's For

```
┌──────────────────────────────────────────────────────────────┐
│  bg: --bg-accent (subtle blue tint)                          │
│                                                              │
│     Designed for restaurants, cafés, bakeries,               │
│     cloud kitchens, and growing businesses                   │
│     that publish public offers.                              │
│                                                              │
│     [icon] [icon] [icon] [icon] [icon]                       │
│     Rest.  Café   Bakery Cloud  Service                      │
│                          Kitchen Business                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:** Centered text with icon row  
**Background:** `--bg-accent` (#EFF6FF) — only section with color tint  
**Short section** — just text + icons. No cards.

---

### Section 7: How It Works

```
┌──────────────────────────────────────────────────────────────┐
│  bg: --bg-primary                                            │
│                                                              │
│     How it works                                             │
│                                                              │
│  ①─────────────②─────────────③─────────────④                │
│  Create        We prepare    Publish       Stays updated     │
│  your menu     everything                  everywhere        │
│                                                              │
│     No technical knowledge required.                         │
│                                                              │
│     [Create your MenuList →]                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:** Horizontal step flow (4 steps connected by line). Vertical on mobile.  
**Background:** `--bg-primary` (#FFFFFF)  
**CTA:** Secondary placement of main CTA

---

### Section 8: Final CTA

```
┌──────────────────────────────────────────────────────────────┐
│  bg: --bg-subtle                                             │
│                                                              │
│     Make your menu official.                                 │
│                                                              │
│     [Create your MenuList →]                                 │
│                                                              │
│     Start in minutes.                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:** Centered, minimal  
**Background:** `--bg-subtle` (#F8FAFC)  
**Short section** — heading + CTA + micro-copy only

---

## 3. Product Page (/product)

**Purpose:** Deeper explanation for visitors who want to understand the system before signing up.

### Sections:

1. **Page hero** — "How MenuList works" + short explanation
2. **Upload & Create** — Menu upload (PDF/image), AI extraction, data editor
3. **Review & Approve** — MCE validation, preview, quality check
4. **Publish** — One-click, atomic, multi-surface
5. **Where It Lives** — Detailed surface breakdown (QR, OBP, screens, etc.)
6. **Always Current** — Auto-sync, update propagation, 60s freshness
7. **CTA** — "Create your MenuList"

**Tone:** Slightly more detailed than homepage, but still no jargon. Explain system behavior, not technology.

---

## 4. Multi-Location Page (/multi-location)

**Purpose:** Convert chain operators (highest ARPU customers).

### Sections:

1. **Page hero** — "One menu. Every location. Always consistent."
2. **The Chain Problem** — Managing 5+ locations manually = inconsistency
3. **Master → Outlet Model** — Visual showing master menu propagating to outlets
4. **Per-Location Control** — Price overrides, availability overrides, location info
5. **Central Dashboard** — One place to manage all locations
6. **Pricing for Chains** — Per-outlet pricing model
7. **CTA** — "Set up your first location"

**Tone:** Slightly elevated. Speaks to operators managing multiple locations.

---

## 5. Pricing Page (/pricing)

**Purpose:** Transparent pricing that builds trust.

### Sections:

1. **Page hero** — "Simple, transparent pricing"
2. **Plan cards** — INR primary, USD secondary. Monthly/yearly toggle.
3. **What's included** — Clear feature list per plan
4. **AI credits explained** — Simple explanation (non-jargon)
5. **FAQ** — Common pricing questions
6. **CTA** — "Get started"

**Design notes:**

- Existing pricing page has good Razorpay integration — preserve backend logic
- Redesign UI to match new design system
- Remove B2B/developer tab (premature, wrong audience)
- Remove feature comparison table (too complex for ICP)
- Show 2-3 plans maximum

---

## 6. About Page (/about)

**Purpose:** Minimal credibility for Indian SMBs who want to know who's behind the product.

### Sections:

1. **Mission statement** — 2-3 sentences about what MenuList does and why
2. **The team** — Founder name/photo (optional), location (India)
3. **Contact** — Email + WhatsApp support link
4. **Trust line** — "Built in India. Used by growing businesses."

**Design notes:** Single column, minimal. No corporate fluff. Keep under 500 words total.

---

## 7. Get Started Page (/get-started)

**Purpose:** Conversion entry — bridge between website and product.

### Flow:

1. Google login button (primary)
2. After auth → onboarding flow begins
3. WhatsApp verification option (inside flow, not on page)

**Design notes:**

- Extremely clean, centered
- Logo + "Create your MenuList" heading
- Google login button
- Small text: "Already have an account? Login"
- No form fields on this page (Google OAuth handles it)

---

## 8. Legal Pages

Preserve existing content, apply new design system styling.

- **Privacy Policy** — Standard format, clean typography
- **Terms of Service** — Standard format, clean typography
- **Refund Policy** — Standard format, clean typography
- **Contact** — Email + support info

---

## 9. Responsive Behavior

### Mobile (< 768px)

- Single column layouts
- Hamburger menu
- Stacked hero (text above, visual below)
- 2-column tile grids
- Vertical step flow (How It Works)
- Sticky bottom CTA bar (subtle, appears after scrolling past hero)

### Tablet (768-1024px)

- 2-column grids where desktop uses 3
- Full navigation visible
- Side-by-side hero text + visual

### Desktop (> 1024px)

- Full layout as wireframed above
- Max-width container centered
- 3-column grids

---

## 10. Navigation Flow

```
Homepage
├── Hero CTA → /get-started
├── Nav: How It Works → /product
├── Nav: Multi-Location → /multi-location
├── Nav: Pricing → /pricing
├── Nav: Login → /login
├── Section 5 link → /multi-location
├── Section 7 CTA → /get-started
├── Section 8 CTA → /get-started
└── Footer links → all pages

/product
├── CTAs → /get-started
└── Nav links → all pages

/multi-location
├── CTAs → /get-started
├── Pricing link → /pricing
└── Nav links → all pages

/pricing
├── Plan CTAs → /get-started (with plan pre-selected)
└── Nav links → all pages
```

**Every page has exactly ONE primary destination:** `/get-started`

---

## 11. Technical File Structure

### Existing Route Group (REUSE)

The `src/app/(website)/` route group **already exists** with these pages:

- `/` → `page.tsx` (home)
- `/home/` → `page.tsx`
- `/pricing/` → `page.tsx`
- `/about-us/` → `page.tsx`
- `/privacy-policy/` → `page.tsx`
- `/terms-of-service/` → `page.tsx`
- `/refund-policy/` → `page.tsx`
- `/contact-us/` → `page.tsx`
- `/trust-security/` → `page.tsx`
- `layout.tsx` (wraps all website pages)

Currently, ALL pages render the monolithic `LandingPage` component with a `fromPage` prop.  
**Strategy:** Replace the component imports in each page.tsx to point to new v2 components.

### New Component Structure

```
src/
├── app/
│   └── (website)/                  # EXISTING route group — keep + modify
│       ├── layout.tsx              # UPDATE: new layout with WebsiteHeader + Footer
│       ├── page.tsx                # UPDATE: render new HomePage component
│       ├── product/                # NEW route
│       │   └── page.tsx
│       ├── multi-location/         # NEW route
│       │   └── page.tsx
│       ├── pricing/                # EXISTING — UPDATE component
│       │   └── page.tsx
│       ├── about/                  # RENAME from about-us
│       │   └── page.tsx
│       ├── get-started/            # NEW route
│       │   └── page.tsx
│       ├── privacy-policy/         # EXISTING — UPDATE styling
│       │   └── page.tsx
│       ├── terms-of-service/       # EXISTING — UPDATE styling
│       │   └── page.tsx
│       ├── refund-policy/          # EXISTING — UPDATE styling
│       │   └── page.tsx
│       └── contact/                # RENAME from contact-us
│           └── page.tsx
│
├── components/
│   └── website/                    # NEW directory — all v2 website components
│       ├── layout/
│       │   ├── WebsiteHeader.tsx
│       │   ├── WebsiteFooter.tsx
│       │   └── WebsiteContainer.tsx
│       ├── home/
│       │   ├── HeroSection.tsx
│       │   ├── ProblemSection.tsx
│       │   ├── SolutionSection.tsx
│       │   ├── SurfacesSection.tsx
│       │   ├── BusinessSection.tsx
│       │   ├── IndustrySection.tsx
│       │   ├── HowItWorksSection.tsx
│       │   └── FinalCtaSection.tsx
│       ├── product/
│       │   └── ...sections
│       ├── multi-location/
│       │   └── ...sections
│       ├── pricing/
│       │   ├── PricingPage.tsx          # NEW UI — uses usePaymentHandler hook
│       │   ├── PlanCard.tsx             # NEW UI — redesigned plan cards (B2C only)
│       │   ├── OnboardingModal.tsx      # NEW UI — same flow as existing (name + industry → auth → pay)
│       │   ├── SuccessModal.tsx         # NEW UI — same flow as existing
│       │   ├── PricingFaq.tsx           # NEW UI — rewritten FAQ content
│       │   └── CurrencySwitcher.tsx     # REUSE — minimal restyle
│       └── shared/
│           ├── WebsiteButton.tsx
│           ├── SectionHeading.tsx
│           ├── SectionWrapper.tsx
│           └── FeatureTile.tsx
│
└── styles/
    └── website.css                 # Website-specific CSS variables + overrides
```

### Migration Notes

- **Existing old components:** `src/components/templates/website/platformSite/landingPage/` — archive, don't delete during build. Remove after new site is verified.
- **Pricing integration:** Existing Razorpay payment flow in `landingPage/pricing/` must be preserved. Redesign UI, keep backend logic.
- **Auth provider:** Existing `WebsiteAuthProvider` in layout — keep for Google login support.
- **Feature flag:** Add `ENABLE_NEW_WEBSITE: false` to `src/config/features.ts`. Use in `(website)/page.tsx` to conditionally render old vs new.
- **Redirects:** Set up redirects: `/about-us` → `/about`, `/contact-us` → `/contact`, `/home` → `/`
- Does NOT touch existing dashboard/app components
- **Server components by default:** All homepage sections are server components. Only use `"use client"` where interaction absolutely requires JS.
- **Static generation:** Homepage uses `export const dynamic = "force-static"` — zero runtime cost, edge cached.

### Pricing/Auth Reuse Dependencies

These existing files are **NOT touched** during the rebuild. New pricing UI components import from them:

```
REUSE UNTOUCHED:
├── src/hooks/usePaymentHandler.ts          # Core Razorpay payment flow
├── src/hooks/useRazorpayScript.ts          # Razorpay script loader
├── src/hooks/useFirebaseAuthSync.ts        # Firebase auth sync
├── src/app/(website)/WebsiteAuthProvider.tsx # Auth session wrapper
├── src/data/PlatformPlansList.ts           # Plan definitions (prices, features)
├── src/data/PlatformFeaturesList.ts        # Feature lists per plan
├── src/data/common.ts                      # Plan, Currency, BillingInterval types
├── src/app/api/razorpay/                   # All payment API routes
└── src/lib/auth/                           # Auth utilities (signOutSession, etc.)

REUSE WITH RESTYLE:
├── landingPage/pricing/CurrencySwitcher.tsx # INR/USD toggle
└── landingPage/pricing/WelcomeBackBanner.tsx # Returning user greeting

DISCARD (replaced by new components):
├── landingPage/pricing/index.tsx           # Old pricing page layout
├── landingPage/pricing/PlanCard.tsx         # Old plan card design
├── landingPage/pricing/OnboardingModal.tsx  # Old modal design
├── landingPage/pricing/FeatureComparisonTable.tsx # Too complex, removed
├── landingPage/pricing/SubscriptionManagement.tsx # Keep logic, rebuild UI
└── landingPage/components/landingpage/     # ALL homepage sections discarded
```

---

## 12. Technical Production Requirements

### 12.1 Security Headers

Add in `next.config.js` headers configuration:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Basic `Content-Security-Policy` (start permissive, tighten later)

### 12.2 Analytics

Add only ONE tool. Choose one:

- Google Analytics 4 (recommended — fits SMB ecosystem)
- PostHog
- Plausible

Do NOT add: Hotjar, CrazyEgg, Clarity, chat widgets, heatmap tools, exit-intent popups.

### 12.3 Image Hosting Strategy

**Marketing assets: Local in repo (static import)**

- Store in `/public/images/` or `/_assets/` for static imports
- Use `next/image` with `import` for automatic optimization
- Hero image: `priority` prop. All others: default lazy.
- Compress manually before commit (hero < 250KB WebP, sections < 100KB each)
- Version controlled, deploy-safe, zero external dependencies

**User-generated content** (menu images, uploads): Firebase Storage (unchanged)

### 12.4 Lighthouse Targets (Pre-Launch Gate)

| Category       | Target       |
| -------------- | ------------ |
| Performance    | 90+ (mobile) |
| Accessibility  | 95+          |
| Best Practices | 95+          |
| SEO            | 100          |

Run Lighthouse on mobile before any public traffic. Fix before launch.

### 12.5 Error Pages

- `app/not-found.tsx` — Custom branded 404. Clean, calm. No jokes, no casual language.
- `app/error.tsx` — Custom error boundary. Professional. Offer path back to homepage.

Even error pages affect trust perception.

### 12.6 Build Phase Order

| Phase     | Scope                                                                                                        | Est. Time             |
| --------- | ------------------------------------------------------------------------------------------------------------ | --------------------- |
| 0         | Foundation — `next/font`, metadata, global layout, favicon, CSS variables                                    | 0.5 day               |
| 1         | Header — Logo + nav links + CTA + Login. Mobile responsive. Lock early.                                      | 0.5 day               |
| 2         | Hero section — headline, effort-removal subline, CTA, mobile preview image                                   | 1 day                 |
| 3         | Remaining homepage (Problem → Solution → Surfaces → Business → Industry → How It Works → Final CTA → Footer) | 1.5 days              |
| 4         | Supporting pages (Pricing, About, Contact, Privacy, Terms, Refund)                                           | 1 day                 |
| 5         | SEO + infra (sitemap.ts, robots.ts, schema JSON-LD, OG image, security headers)                              | 0.5 day               |
| 6         | Performance hardening (Lighthouse audit, bundle size check, image optimization)                              | 0.5 day               |
| 7         | Real-device testing (phone, slow network, incognito, WhatsApp OG preview check)                              | 0.5 day               |
| **Total** |                                                                                                              | **~5-6 focused days** |

**Build discipline rules:**

- Do NOT redesign mid-build
- Do NOT add new sections or ideas
- Do NOT add animations for fun
- Do NOT compare competitors during build
- Complete one section → move to next
- Execute what is already decided in docs

### 12.7 WhatsApp OG Preview (Critical for SMBs)

After deploy, verify by pasting URL in WhatsApp self-chat:

- Correct title appears
- Correct description appears
- OG image renders properly

SMBs share links via WhatsApp. This matters more than Twitter/LinkedIn cards for our ICP.

---

## 13. SEO Per-Page

| Page           | Title                                                  | Description                                                                                                                                | H1                                                                 |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Homepage       | MenuList — Official Menu & Business Information System | Manage your official menu and business information from one place. Update once — stays correct across QR, Google, screens, web, and print. | Manage your official menu and business information from one place. |
| Product        | How MenuList Works — One Menu, Everywhere              | See how MenuList keeps your menu correct across QR, Google, screens, web, and print. Upload once, publish everywhere.                      | How MenuList works                                                 |
| Multi-Location | MenuList for Chains & Multi-Location Businesses        | Manage menus across all your locations from one place. Master menu, per-location control, instant sync.                                    | One menu. Every location. Always consistent.                       |
| Pricing        | MenuList Pricing — Simple, Transparent Plans           | Start managing your official menu. Simple plans with transparent pricing. No hidden fees.                                                  | Simple, transparent pricing                                        |
| About          | About MenuList — Built in India for Growing Businesses | MenuList is a public menu infrastructure system built in India for restaurants, cafés, and growing businesses.                             | About MenuList                                                     |
| Get Started    | Get Started with MenuList                              | Create your official MenuList in minutes. No technical setup required.                                                                     | Create your MenuList                                               |
