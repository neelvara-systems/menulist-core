# Canonica Website — Implementation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
> **Audience:** Developers

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (same pipeline as MenuList) |
| Routing | Middleware hostname-based rewrite (multi-product) |
| Components | React Server Components (default) + Client Components (Header) |
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
├── pricing/page.tsx               # Pricing page
├── about/page.tsx                 # About page
├── contact/page.tsx               # Contact page
├── get-started/page.tsx           # Beta application page
└── components/
    ├── Header.tsx                 # Shared header (client component)
    ├── Footer.tsx                 # Shared footer
    ├── CanonicaLink.tsx           # Dev/production-aware Link wrapper
    ├── HeroSection.tsx            # Homepage hero
    ├── PillarsSection.tsx         # Homepage 5-pillar cards
    ├── HowItWorksSection.tsx      # Homepage 5-step timeline
    ├── ComparisonSection.tsx      # Homepage comparison table
    └── CTASection.tsx             # Homepage bottom CTA
```

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
- `pricing/page.tsx` — Pricing page
- `about/page.tsx` — About page
- `contact/page.tsx` — Contact page
- `get-started/page.tsx` — Get Started page
- `Footer.tsx` — Footer (no state needed)
- `HeroSection.tsx`, `PillarsSection.tsx`, `HowItWorksSection.tsx`, `ComparisonSection.tsx`, `CTASection.tsx`

### Client Components (`'use client'`)
- `Header.tsx` — Mobile menu toggle requires `useState`
- `CanonicaLink.tsx` — Wraps `next/link` (client component by nature)

---

## Production Deployment

### Prerequisites
1. Add `canonica.app` domain to Vercel project dashboard
2. Configure DNS for canonica.app pointing to Vercel
3. Create `canonica-og-image.png` (1200x630) in `/public/`

### Security
- `/sites/*` direct access blocked in production (middleware redirects to `/`)
- Only accessible via hostname-based rewrite
- All OWASP security headers applied via `applySecurityHeaders()`

### Caching
- Static pages: Vercel automatic static optimization
- No Firestore reads, no API calls, zero Firebase cost

---

## Firebase Cost

**$0.00/month** — The website is entirely static. No database reads, no API calls, no Cloud Functions.

---

## Adding a New Page

1. Create `src/app/sites/canonica/[page-name]/page.tsx`
2. Import `headers` from `next/headers`, `CanonicaHeader`, `CanonicaFooter`
3. Add `getBasePath()` function (copy from any existing page)
4. Add page to `NAV_LINKS` in `Header.tsx` if it should appear in navigation
5. Add to `FOOTER_LINKS` in `Footer.tsx` if needed

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial implementation |
