# Existing Website Audit — MenuList Main Website

**Status:** 🔒 LOCKED — Reference for Rebuild  
**Last Updated:** February 2026  
**Source:** Full codebase analysis of `src/components/templates/website/platformSite/landingPage/`

---

## 1. Current Site Architecture

### 1.1 Routing Structure

All pages render through a single monolithic `LandingPage` component via `fromPage` prop:

| Route | `fromPage` | Component |
|-------|-----------|-----------|
| `/` | `"home"` | Full homepage (16+ sections) |
| `/home` | `"home"` | Duplicate of above |
| `/pricing` | `"pricing"` | PricingPage + SubscriptionManagementPage |
| `/about-us` | `"about"` | AboutUsPage |
| `/privacy-policy` | `"privacy"` | PrivacyPage |
| `/terms-of-service` | `"terms"` | TermsPage |
| `/refund-policy` | `"refund"` | RefundPolicyPage |
| `/contact-us` | `"contact"` | ContactUsPage |
| `/trust-security` | `"security"` | TrustSecurityPage |

**Problem:** Everything is `"use client"` — the entire site is client-rendered. Zero SEO benefit from SSR. Massive JS bundle.

### 1.2 Homepage Sections (16+ sections, order as rendered)

| # | Section | Component | Keep/Discard | Reason |
|---|---------|-----------|-------------|--------|
| 1 | Hero | `HeroSection` | **DISCARD** | Wrong messaging ("Turn Menu PDF into Live Digital Catalog"), AI-hype tone, dashboard screenshot, startup aesthetic |
| 2 | Trust Badges | `TrustBadgesSection` | **DISCARD** | No real social proof to show yet |
| 3 | Business Types | `BusinessTypesSection` | **PARTIAL** | Good concept (showing different business types), but wrong execution — before/after transformation framing is tool-like, not infrastructure |
| 4 | How It Works | `HowItWorksSection` | **DISCARD** | 3-step tool process with auto-playing videos. Wrong framing (upload→extract→design). New site: 4-step infrastructure flow |
| 5 | Transformation | `TransformationSection` | **DISCARD** | "Before/After" comparison is tool marketing. Infrastructure doesn't position against "the old way" |
| 6 | Personalized Demo | `PersonalizedDemoSection` | **DISCARD** | Interactive demo widget — too complex for new site, adds JS weight |
| 7 | Features | `FeaturesSection` | **DISCARD** | Feature-heavy cards with AI hype ("AI Data Extraction", "AI Photoshoot"). Contradicts outcome-first positioning |
| 8 | Command Center | `CommandCenterSection` | **DISCARD** | Dashboard-focused ("Your Command Center"). Shows admin UI, not customer output |
| 9 | Creative Studio | `UnifiedCreativeStudio` | **DISCARD** | Tool feature showcase. Not relevant to new positioning |
| 10 | Templates | `TemplatesSection` | **DISCARD** | Template gallery — tool-like, not infrastructure |
| 11 | Creative Studio 2 | `CreativeStudioSection` | **DISCARD** | Duplicate creative showcase |
| 12 | Analytics | `AnalyticsSection` | **DISCARD** | Analytics features are backend, not public-facing value |
| 13 | Why Choose Us | `WhyChooseUsSection` | **DISCARD** | "Secret Weapon" language, stats-heavy, marketing tone |
| 14 | ROI Calculator | `RoiCalculatorSection` | **DISCARD** | Interactive calculator — complex, adds JS, premature for early stage |
| 15 | Developer Section | `DeveloperSection` | **DISCARD** | Developer/B2B audience. Wrong ICP for new site |
| 16 | Developer API | `DeveloperApiSection` | **DISCARD** | API documentation pitch. Wrong audience |
| 17 | FAQ | `FaqSection` | **PARTIAL** | FAQ structure can be reused for pricing page. Content needs rewrite |
| 18 | Final CTA | `FinalCtaSection` | **DISCARD** | "Generate Your Catalog" — wrong CTA, wrong tone |

### 1.3 Homepage Content Problems

| Problem | Evidence | Impact |
|---------|----------|--------|
| **AI-hype messaging** | "Turn Menu PDF into Live Digital Catalog", "AI Extracts & You Verify", "AI-Powered Automation" | Positions as tool, not infrastructure |
| **Feature-heavy** | 6 feature cards, command center, creative studio, analytics, templates | Overwhelms non-tech SMBs |
| **Developer section** | Entire section for B2B/developers with JSON editor | Wrong audience |
| **Dashboard screenshots** | Hero shows admin dashboard, not customer output | Shows building blocks, not result |
| **Startup aesthetic** | Cyan gradients, glow effects, hover transforms, blur backgrounds | Contradicts calm infrastructure positioning |
| **Too many CTAs** | "Generate My Catalog", "Try it yourself", "Get Started", "View Our Plans" | Dilutes conversion path |
| **"Powered by EcomsAi"** | In footer and mobile nav | Confusing dual branding |
| **Social icons linking nowhere** | Twitter, LinkedIn, Instagram, Facebook, WhatsApp links are placeholder | Dead links destroy trust |
| **Fake phone number** | "+1 (555) 123-4567" in footer | Obviously fake, destroys credibility |
| **Dark mode toggle** | ThemeToggle in navbar | Unnecessary complexity for public site |
| **ROI Calculator** | Full interactive calculator section | Complex, premature, no data to back claims |

---

## 2. Pricing/Subscription/Auth Flow Analysis

### 2.1 Flow Architecture

```
User clicks plan → handlePaymentCardClick()
  ├── If NOT logged in:
  │   ├── OnboardingModal opens (business name + industry)
  │   ├── purchaseIntent saved to localStorage
  │   ├── Google signIn triggered
  │   └── After auth return → startPaymentProcessing()
  ├── If logged in BUT no tenant:
  │   └── executePostOnboarding() → creates tenant + store + triggers Razorpay
  └── If logged in WITH tenant:
      └── Directly triggers Razorpay payment
```

### 2.2 Key Components

| Component | Path | Function | Reuse? |
|-----------|------|----------|--------|
| `usePaymentHandler` | `src/hooks/usePaymentHandler.ts` | Razorpay script loading, subscription creation, payment verification | **REUSE** — core payment logic |
| `useRazorpayScript` | `src/hooks/useRazorpayScript.ts` | Loads Razorpay checkout.js | **REUSE** — utility hook |
| `PricingPage` | `landingPage/pricing/index.tsx` | Plan display, billing toggle, currency switcher | **REUSE LOGIC, REBUILD UI** |
| `PlanCard` | `landingPage/pricing/PlanCard.tsx` | Individual plan card rendering | **REBUILD UI** — redesign to match new design system |
| `OnboardingModal` | `landingPage/pricing/OnboardingModal.tsx` | Business name + industry collection | **REUSE LOGIC, REBUILD UI** |
| `SubscriptionPayementSuccessModal` | `landingPage/pricing/SubscriptionPayementSuccessModal.tsx` | Post-payment success confirmation | **REUSE LOGIC, REBUILD UI** |
| `CurrencySwitcher` | `landingPage/pricing/CurrencySwitcher.tsx` | INR/USD toggle | **REUSE** — small utility component |
| `FeatureComparisonTable` | `landingPage/pricing/FeatureComparisonTable.tsx` | Full feature comparison grid | **DISCARD** — too complex for ICP, contradicts simple pricing |
| `PricingFaq` | `landingPage/pricing/PricingFaq.tsx` | Pricing-related FAQ | **REBUILD** — keep FAQ concept, rewrite content |
| `WelcomeBackBanner` | `landingPage/pricing/WelcomeBackBanner.tsx` | Shows returning user name | **REUSE** — nice touch for returning users |
| `SubscriptionManagementPage` | `landingPage/pricing/SubscriptionManagement.tsx` | Active subscription management | **REUSE** — needed for subscribed users visiting /pricing |

### 2.3 Data Dependencies

| File | Path | Content | Reuse? |
|------|------|---------|--------|
| `PlatformPlansList` | `src/data/PlatformPlansList.ts` | Plan definitions (prices, features, limits) | **REUSE** — source of truth for plans |
| `PlatformFeaturesList` | `src/data/PlatformFeaturesList.ts` | Feature definitions per plan | **REUSE** — but simplify display |
| `common.ts` types | `src/data/common.ts` | `Plan`, `Currency`, `BillingInterval`, `PurchaseIntent` types | **REUSE** — shared types |

### 2.4 API Routes (Payment Backend)

| Route | Function | Reuse? |
|-------|----------|--------|
| `/api/razorpay/create-subscription` | Creates Razorpay subscription | **REUSE** — backend logic unchanged |
| `/api/razorpay/verify-payment` | Verifies payment signature | **REUSE** — backend logic unchanged |
| Payment webhook handlers | Process Razorpay webhooks | **REUSE** — backend logic unchanged |

### 2.5 Reuse Decision: **REUSE LOGIC, REBUILD UI**

**Rationale:**
- The Razorpay payment flow is **production-tested and working**. Rewriting it from scratch would be risky and wasteful.
- The hooks (`usePaymentHandler`, `useRazorpayScript`), API routes, and data files are **backend/logic concerns** — they don't depend on UI design.
- The UI components (PlanCard, OnboardingModal, etc.) need **visual redesign** to match the new design system, but their **functional logic** (state management, payment flow, localStorage intent) should be preserved.

**Migration approach:**
1. Keep all hooks, API routes, and data files untouched
2. Create new `src/components/website/pricing/` components that use the same hooks
3. Remove B2B/Developer tab from new pricing UI (wrong audience)
4. Remove FeatureComparisonTable (too complex)
5. Keep: CurrencySwitcher, billing toggle, OnboardingModal logic, SuccessModal logic, WelcomeBackBanner
6. Redesign: PlanCard, page layout, FAQ content, heading/copy

---

## 3. Auth Flow Analysis

### 3.1 Current Auth Architecture

| Component | Function | Reuse? |
|-----------|----------|--------|
| `WebsiteAuthProvider` | `(website)/WebsiteAuthProvider.tsx` — wraps website with session | **REUSE** — needed for login/pricing |
| `useFirebaseAuthSync` | Syncs NextAuth session with Firebase Auth | **REUSE** — required for Firestore access |
| NextAuth Google provider | Google OAuth login | **REUSE** — unchanged |
| `signIn('google')` | Triggers Google sign-in | **REUSE** — standard NextAuth |
| `signOutSession` | Handles logout + cleanup | **REUSE** — existing utility |

### 3.2 Auth Decision: **FULLY REUSE**

The auth flow is clean, well-integrated, and has no UI dependency. The `WebsiteAuthProvider` in the layout should be preserved. Login/logout buttons will be redesigned but the underlying auth logic stays identical.

---

## 4. Shared Components Analysis

### 4.1 shadcn/ui Components Used by Existing Site

| Component | Used By | Keep for New Site? |
|-----------|---------|-------------------|
| `Button` | Everywhere | **YES** — core component |
| `Sheet` | Mobile nav | **YES** — for mobile menu |
| `Dialog` | OnboardingModal, SuccessModal | **YES** — for pricing modals |
| `Card` | Feature cards, plan cards | **MAYBE** — only for pricing cards |
| `Tabs` | Pricing B2C/B2B toggle | **NO** — removing B2B tab |
| `Switch` | Billing interval toggle | **YES** — for monthly/yearly toggle |
| `Input` | OnboardingModal | **YES** — for business name input |
| `Label` | OnboardingModal | **YES** — for form labels |
| `Select` | OnboardingModal industry | **YES** — for dropdown |
| `Slider` | ROI Calculator | **NO** — removing ROI calc |
| `Badge` | Feature badges | **NO** — not needed |
| `Avatar` | Profile button | **YES** — for logged-in user |
| `DropdownMenu` | Profile dropdown | **YES** — for user menu |
| `Accordion` | FAQ | **MAYBE** — for pricing FAQ |
| `ThemeToggle` | Navbar | **NO** — removing dark mode toggle |

### 4.2 Revised shadcn Component List for New Site

Minimum needed: `Button`, `Sheet`, `Dialog`, `Switch`, `Input`, `Label`, `Select`, `Avatar`, `DropdownMenu`

These are all already installed. No new dependencies needed.

---

## 5. Other Pages Audit

### 5.1 About Us Page

| Aspect | Current | New Site |
|--------|---------|----------|
| Structure | Mission, Problem, Solution, CoreValues, Team, CTA | Simplify to: Mission, Team (optional), Contact, Trust line |
| Tone | Startup/inspirational | Calm, factual |
| Content | Generic startup boilerplate | Rewrite completely |
| **Verdict** | **DISCARD content, keep route** | |

### 5.2 Legal Pages (Privacy, Terms, Refund)

| Aspect | Current | New Site |
|--------|---------|----------|
| Content | Actual legal text | **REUSE** — legal content is valid |
| Styling | Uses landing page theme | Restyle to new design system |
| **Verdict** | **REUSE content, REBUILD styling** | |

### 5.3 Contact Us Page

| Aspect | Current | New Site |
|--------|---------|----------|
| Content | Contact form/info | Simplify to email + WhatsApp |
| **Verdict** | **REBUILD** — simpler version | |

### 5.4 Trust & Security Page

| Aspect | Current | New Site |
|--------|---------|----------|
| Content | Security details | **DISCARD** — premature, can add later |
| **Verdict** | **REMOVE from nav**, keep route for SEO | |

---

## 6. SEO Schema Audit

### Current (`SeoSchema.tsx`)

```json
{
  "@type": "SoftwareApplication",
  "name": "MenuListAI",
  "description": "Instantly create a stunning digital catalog with AI...",
  "offers": { "lowPrice": "29.00", "highPrice": "149.00", "priceCurrency": "USD" }
}
```

**Problems:**
- Name: "MenuListAI" should be "MenuList"
- Description: AI-hype, tool-focused
- Pricing: USD only, doesn't reflect INR primary
- Missing: Organization schema, WebSite schema

**Action:** Replace entirely with new schema definitions from `main-website_seo-aeo.md`

---

## 7. CSS/Styling Audit

### Current Approach
- shadcn/ui theming with CSS variables (`--background`, `--foreground`, `--primary`, etc.)
- Tailwind for layout
- `main.css` with custom styles
- Dark mode support (via ThemeProvider)
- Cyan-to-blue gradients throughout
- Blur effects, glow shadows, backdrop-blur on nav

### New Approach (from design system)
- Tailwind only + minimal shadcn
- Custom CSS variables for website tokens
- No dark mode
- No gradients
- No blur effects
- No glow shadows
- White + slate-50 backgrounds

**Action:** New `styles/website.css` with clean tokens. Do NOT modify existing `main.css` (used by dashboard).

---

## 8. Performance Audit

### Current Issues
- **100% client-rendered** — entire site is `"use client"`, zero SSR
- **Heavy Framer Motion usage** — animation variants on every section
- **Firebase Storage images** — hero image loaded from remote URL (extra DNS, latency)
- **Auto-playing videos** — How It Works section loads 3 MP4 videos
- **Razorpay script** — loaded on every page (only needed on pricing)
- **Large component tree** — 16+ sections loaded at once
- **Dark mode CSS** — doubles styling complexity

### New Site Targets
- Server components by default
- No Framer Motion (CSS transitions only)
- Local static images
- No video
- Razorpay only on pricing page
- 8 sections (half the current)
- Light mode only

---

## 9. Summary: What to Keep vs Discard

### KEEP (Reuse Logic)
1. **Payment flow:** `usePaymentHandler`, `useRazorpayScript`, all Razorpay API routes
2. **Auth flow:** `WebsiteAuthProvider`, `useFirebaseAuthSync`, NextAuth Google provider
3. **Plan data:** `PlatformPlansList`, `PlatformFeaturesList`, common types
4. **Pricing logic:** Currency detection, billing toggle, localStorage intent, onboarding flow
5. **Legal page content:** Privacy Policy, Terms of Service, Refund Policy text
6. **shadcn components:** Button, Sheet, Dialog, Switch, Input, Label, Select, Avatar, DropdownMenu

### REBUILD (New UI, Same Logic)
1. **Pricing page:** New layout, new plan cards, remove B2B tab, remove comparison table
2. **Onboarding modal:** Same flow, new visual design
3. **Success modal:** Same flow, new visual design
4. **Navbar:** New design, new nav items, new logo, remove dark mode toggle
5. **Footer:** New design, remove social icons, remove "Powered by EcomsAi"
6. **FAQ:** Keep accordion concept, rewrite all content

### DISCARD (Do Not Use)
1. **All 16 homepage sections** — every single one contradicts new positioning
2. **Hero messaging** — completely wrong tone and framing
3. **Feature cards** — AI-hype, tool marketing
4. **Developer sections** — wrong audience
5. **ROI Calculator** — premature, complex
6. **Trust badges** — no real data
7. **Before/After transformation** — tool marketing pattern
8. **Auto-playing videos** — performance cost, startup pattern
9. **Creative Studio showcase** — feature-heavy
10. **Command Center showcase** — dashboard-focused
11. **SeoSchema** — wrong name, wrong description, wrong positioning
12. **ClarityAnalytics** — can add analytics later via new approach
13. **SVGBg decorations** — startup aesthetic
14. **All gradient/glow effects** — contradicts calm design
15. **Dark mode toggle** — removed for public site
