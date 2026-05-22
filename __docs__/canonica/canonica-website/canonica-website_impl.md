# Canonica Website — Implementation

> **Version:** 1.1.7
> **Last Updated:** 2026-05-22
> **Audience:** Developers

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (same pipeline as MenuList) |
| Routing | Middleware hostname-based rewrite (multi-product) |
| Components | React Server Components by default; client islands only where interaction needs state |
| Links | `CanonicaLink` wrapper for dev/production path resolution |
| Dependencies | Zero new npm packages |

---

## File Structure

```
src/app/sites/canonica/
├── layout.tsx                     # Root layout (metadata, OG, viewport)
├── styles.css                     # Tailwind directives + CSS variables
├── page.tsx                       # Homepage (server component)
├── not-found.tsx                  # 404 page
├── product/page.tsx               # Product deep-dive
├── use-cases/page.tsx             # Small-SaaS use-case page
├── demo/page.tsx                  # Static interactive demo page
├── demo/CanonicaPublicDemo.tsx    # Account-free page-aware support demo
├── install/page.tsx               # Widget install and page context page
├── integrations/page.tsx          # Redirect alias to /install for older links
├── pricing/page.tsx               # Pricing page
├── resources/page.tsx             # Public learning hub
├── updates/page.tsx               # Public website update log
├── security/page.tsx              # Security and trust page
├── faq/page.tsx                   # FAQ page with FAQPage JSON-LD
├── about/page.tsx                 # About page
├── contact/page.tsx               # Contact page
├── get-started/page.tsx           # Self-service onboarding page
├── privacy-policy/page.tsx        # Public privacy policy
├── terms-of-service/page.tsx      # Public terms of service
├── sitemap.xml/route.ts           # Canonica sitemap.xml route handler
├── robots.txt/route.ts            # Canonica robots.txt route handler
├── siteConfig.ts                  # Shared public site metadata and route registry
├── enginePillars.ts               # Implemented Canonica engine pillar copy
├── systemCoverage.ts              # Code-backed system coverage groups for homepage
└── components/
    ├── Header.tsx                 # Shared header with native mobile navigation
    ├── Footer.tsx                 # Shared footer
    ├── CanonicaLink.tsx           # Dev/production-aware Link wrapper
    ├── HeroSection.tsx            # Homepage hero
    ├── ProductPreviewSection.tsx  # Static dashboard/widget/governance visual preview
    ├── WidgetSection.tsx          # Homepage widget install and page-aware support section
    ├── PillarsSection.tsx         # Homepage Canonica engine pillar cards
    ├── SystemCoverageSection.tsx  # Homepage Launch/Support/Governance/Runtime system map
    ├── HowItWorksSection.tsx      # Homepage 5-step timeline
    ├── ComparisonSection.tsx      # Homepage comparison table
    ├── StructuredData.tsx         # Organization/WebSite/SoftwareApplication JSON-LD
    └── CTASection.tsx             # Homepage bottom CTA
```

## Self-Sellable Positioning Pass

The public website now follows `../self-sellable-product-strategy.md`:

- homepage leads with small-SaaS support correctness instead of enterprise control-plane language
- homepage and product page expose the implemented Canonica engine pillars: Product Ontology, Canonical Answer Engine, Drift Governance, and Signal Mutation
- homepage exposes the implemented system map: Launch Setup, Support Control, Knowledge Governance, and Runtime Layer
- homepage includes a static product preview showing activation, widget context, and governance queue states
- public website pages now include use cases, widget install, resources, and updates so the site matches the buying-page shape expected from support tooling without adding unsupported API or adapter claims
- header links include `/demo`
- `/demo` is static and account-free; it does not call Firebase or an AI provider
- pricing exposes Starter, Growth, and Studio INR packaging
- `/security` reuses the MenuList trust-page shape of facts, controls, and disclosure while keeping Canonica-specific claims around widget context, tenant-scoped rules, owner-approved answers, rate-limited runtime endpoints, compact summaries, and separate product infrastructure
- `/faq` answers founder objections and includes FAQ structured data
- `/product`, `/get-started`, `/about`, and `/contact` no longer use enterprise/design-partner-first copy
- footer links only target public website routes; public legal links now resolve to real pages
- Canonica product domains serve Canonica-owned `/sitemap.xml` and `/robots.txt`
- homepage emits Organization, WebSite, and SoftwareApplication structured data
- Canonica website layout sets Canonica metadata, manifest, icons, and dark theme color so public pages do not inherit MenuList web-app title metadata
- copy differentiates Canonica from helpdesks, chatbots, and documentation CMS products without claiming to replace them
- May 22 refresh changed the hero from page-aware support copy to the implemented support knowledge control plane category.
- Website copy now includes hosted help domains, FAQ management/article-backed FAQ generation, product-scoped Canonica billing/support credits, source-version cache freshness, and separate Firebase/product boundaries.
- Custom help domains are now buyer-facing website content because they make Canonica feel native to the client's product instead of a third-party bolt-on.
- Ticket debugging context is now presented as capped, sanitized support context in product, security, FAQ, and privacy copy; public copy avoids raw "console log" wording except where implementation docs need it.
- `/pricing` now explains that public setup starts on beta while paid plan changes and support-credit top-ups happen from Canonica Billing using product-scoped Razorpay requests.
- `/install`, `/security`, `/faq`, `/resources`, `/updates`, privacy, and terms now account for hosted help and current support-surface scope.

---

## Routing Architecture

### Multi-Product Domain Registry

**File:** `src/constants/productDomains.ts`

All product domains are registered here. The middleware reads the hostname and rewrites to the correct internal route.

```
canonica.app/*  →  middleware  →  /sites/canonica/*
localhost/__canonica/*  →  middleware  →  /sites/canonica/*  (dev only)
```

### Middleware Flow

**File:** `src/middleware.ts`

Priority order:
1. Product website domains (canonica.app → /sites/canonica)
2. Dev path prefixes (/__canonica → /sites/canonica) — local dev only
3. Client tenant domains (*.menulist.ai → /_client)
4. Platform domain (menulist.ai → (website) route group)

### Domain Resolver

**File:** `src/lib/multiTenant/domainResolver.ts`

Added `'product'` domain type. Detects product websites before platform/client detection. Returns `ProductDomainConfig` for middleware to use.

### URL Constants

**File:** `src/constants/urls.ts`

`PLATFORM_DOMAINS` array now includes all product domains via `ALL_PRODUCT_DOMAINS` spread. This prevents product domains from being treated as client tenant subdomains.

---

## basePath Pattern (Dev/Production Link Resolution)

### Problem
In production (`canonica.app`), internal links like `/pricing` work naturally.
In dev mode (`localhost:3000/__canonica`), `/pricing` navigates to MenuList's pricing page.

### Solution
Each page reads the `x-product-id` header (set by middleware) and `host` header to determine if dev mode:

```typescript
function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}
```

`basePath` is passed as a prop to components that contain links (Header, Footer, HeroSection, CTASection).

### CanonicaLink Component

```typescript
// Wraps next/link with basePath prefix
export default function CanonicaLink({ href, basePath = '', children, ...props }) {
    const resolvedHref = href.startsWith('/') ? `${basePath}${href}` : href;
    return <Link href={resolvedHref} {...props}>{children}</Link>;
}
```

---

## Component Architecture

### Server Components (default)
- `layout.tsx` — Root layout with metadata
- `page.tsx` — Homepage
- `product/page.tsx` — Product page
- `use-cases/page.tsx` — Use-case page
- `install/page.tsx` — Widget install and page context page
- `integrations/page.tsx` — Redirect alias to `/install`
- `resources/page.tsx` — Resources hub
- `updates/page.tsx` — Public website update log
- `pricing/page.tsx` — Pricing page
- `security/page.tsx` — Security page
- `faq/page.tsx` — FAQ page
- `about/page.tsx` — About page
- `contact/page.tsx` — Contact page
- `get-started/page.tsx` — Get Started page
- `privacy-policy/page.tsx` — Privacy policy page
- `terms-of-service/page.tsx` — Terms of service page
- `Footer.tsx` — Footer (no state needed)
- `HeroSection.tsx`, `ProductPreviewSection.tsx`, `WidgetSection.tsx`, `PillarsSection.tsx`, `SystemCoverageSection.tsx`, `HowItWorksSection.tsx`, `ComparisonSection.tsx`, `CTASection.tsx`

### Client Components (`'use client'`)
- `demo/CanonicaPublicDemo.tsx` — Account-free demo state
- `get-started/OnboardingForm.tsx` — Self-service onboarding form state

### Native Interaction
- `Header.tsx` — Mobile navigation uses native `<details>/<summary>` so it still works if hydration is delayed and does not add a client bundle.

---

## Production Deployment

### Prerequisites
1. Add `canonica.app` domain to Vercel project dashboard
2. Configure DNS for canonica.app pointing to Vercel
3. Keep `public/canonica-og-image.png`, `public/canonica.webmanifest`, and Canonica icon PNGs available for OpenGraph, app metadata, and favicon previews

### Security
- `/sites/*` direct access blocked in production (middleware redirects to `/`)
- Only accessible via hostname-based rewrite
- All OWASP security headers applied via `applySecurityHeaders()`

### Caching
- Static pages: Vercel automatic static optimization
- No Firestore reads, no API calls, zero Firebase cost

---

## Firebase Cost

**$0.00/month for normal browsing** — The website pages are static. No database reads, no API calls, no Cloud Functions.

The public demo is static interaction state only. Security, FAQ, privacy, and terms pages are static content. The self-service onboarding form is the only public website surface that calls Canonica APIs, and it runs only after explicit user submission.

Use-cases, install, resources, updates, and the homepage product/widget preview sections are static server-rendered website content. They do not read Firestore and do not call Canonica APIs.

---

## Adding a New Page

1. Create `src/app/sites/canonica/[page-name]/page.tsx`
2. Import `headers` from `next/headers`, `CanonicaHeader`, `CanonicaFooter`
3. Add `getBasePath()` function (copy from any existing page)
4. Add page to `NAV_LINKS` in `Header.tsx` if it should appear in navigation
5. Add to `FOOTER_LINKS` in `Footer.tsx` if needed
6. Add the route to `CANONICA_PUBLIC_PAGES` in `siteConfig.ts` so Canonica sitemap output stays complete
7. Avoid public website route names reserved by Canonica dashboard rewrites, including `/docs`, `/help`, `/changelog`, and `/release-notes`

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial implementation |
| 2026-05-21 | 1.1.0 | Self-sellable website pass, demo, pricing update, founder-friendly product funnel, security/FAQ/legal pages, sitemap/robots, manifest/icons, and structured data |
| 2026-05-21 | 1.1.1 | Restored implemented Canonica engine pillars on homepage and product page without claiming deferred API/integration pillar |
| 2026-05-21 | 1.1.2 | Added homepage system coverage section from codebase inventory: Launch Setup, Support Control, Knowledge Governance, and Runtime Layer |
| 2026-05-21 | 1.1.3 | Added static product preview and public use-cases, integrations, resources, and updates pages; updated nav, footer, sitemap registry, and docs |
| 2026-05-21 | 1.1.4 | Added widget-first `/install`, made `/integrations` a redirect alias, and removed rollout-only API/adapters from buyer-facing website claims |
| 2026-05-21 | 1.1.5 | Expanded `/security` with MenuList-inspired trust-page structure adapted to Canonica's implemented widget runtime, tenant isolation, governed answers, rate limits, summaries, and product separation |
| 2026-05-22 | 1.1.6 | Refreshed website to match current Canonica implementation: support knowledge control plane hero, hosted help, FAQ generation/management, product-scoped billing/support credits, cache freshness, and separate Firebase/product boundaries |
