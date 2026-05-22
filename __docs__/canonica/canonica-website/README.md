# Canonica Website (canonica.app)

> **Feature:** Public marketing website for Canonica product
> **Status:** ✅ IMPLEMENTED — refreshed for self-service Canonica and buyer-facing hosted-help trust
> **Date:** 2026-05-22
> **Domain:** canonica.app (production) | localhost:3000/__canonica (dev)
> **Feature Flag:** None required (static marketing site)
> **Route Group:** `src/app/sites/canonica/`

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `canonica-website_spec.md` | CEO/PM | Business requirements, page architecture |
| 3 | `canonica-website_impl.md` | Developers | Technical blueprint, file paths, routing |

## Related Strategy

- `../self-sellable-product-strategy.md` — Canonica's non-enterprise ICP, small-SaaS positioning, pricing direction, website message bank, and sellable-launch task list. Use this before changing public Canonica website copy.

---

## Quick Reference

### Pages (15 total)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Homepage | Hero + product preview + widget/hosted-help install + branded help domains + safe ticket context + pillars + system coverage + HowItWorks + Comparison + CTA |
| `/product` | Product | Self-serve product overview for launch setup, support control, branded help domains, safe ticket context, page-aware widget, canonical answers, releases, and support gaps |
| `/use-cases` | Use Cases | Founder/operator scenarios by support problem |
| `/demo` | Demo | Static page-aware support demo with no Firebase or AI calls |
| `/install` | Widget Install | Widget script, allowed origins, blocked routes, hosted help domains such as help.yourapp.com, safe page context, and runtime verification |
| `/pricing` | Pricing | INR Starter/Growth/Studio packaging, beta setup, and support-credit top-up explanation |
| `/resources` | Resources | Canonica learning hub for launch setup, widget install, governance, and cost controls |
| `/updates` | Updates | Public product update timeline without using dashboard-owned changelog routes |
| `/security` | Security | Trust controls for widget context, hosted help domains, safe ticket debugging context, tenant separation, owner-approved answers, runtime limits, and responsible disclosure |
| `/faq` | FAQ | Founder questions about setup, widget context, hosted help, custom domains, safe ticket context, FAQ generation, pricing, tickets, and data handling |
| `/about` | About | Company beliefs + team origin |
| `/contact` | Contact | Email contacts for questions, setup help, and partnerships |
| `/get-started` | Get Started | Self-service onboarding for a new Canonica workspace |
| `/privacy-policy` | Privacy Policy | Public privacy summary for account, workspace, support, and widget data |
| `/terms-of-service` | Terms of Service | Public terms summary for account, content, widget, and service usage |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/sites/canonica/layout.tsx` | Layout with metadata, OG tags, SEO |
| `src/app/sites/canonica/styles.css` | Tailwind directives + CSS variables |
| `src/app/sites/canonica/page.tsx` | Homepage (server component) |
| `src/app/sites/canonica/use-cases/page.tsx` | Use-case page for founder/operator support scenarios |
| `src/app/sites/canonica/install/page.tsx` | Public widget install page |
| `src/app/sites/canonica/integrations/page.tsx` | Redirect alias to `/install` for older links |
| `src/app/sites/canonica/resources/page.tsx` | Public resources hub |
| `src/app/sites/canonica/updates/page.tsx` | Public website update log |
| `src/app/sites/canonica/demo/page.tsx` | Static product demo route |
| `src/app/sites/canonica/demo/CanonicaPublicDemo.tsx` | Client-side demo interaction state |
| `src/app/sites/canonica/security/page.tsx` | Public security/trust page with facts, runtime controls, and disclosure |
| `src/app/sites/canonica/faq/page.tsx` | Public FAQ page with FAQ structured data |
| `src/app/sites/canonica/privacy-policy/page.tsx` | Public privacy policy page |
| `src/app/sites/canonica/terms-of-service/page.tsx` | Public terms of service page |
| `src/app/sites/canonica/sitemap.xml/route.ts` | Canonica product-domain sitemap |
| `src/app/sites/canonica/robots.txt/route.ts` | Canonica product-domain robots policy |
| `src/app/sites/canonica/siteConfig.ts` | Public site URL, sitemap page list, and shared metadata constants |
| `src/app/sites/canonica/enginePillars.ts` | Shared implemented Canonica engine pillar content |
| `src/app/sites/canonica/systemCoverage.ts` | Shared implemented Canonica system coverage groups |
| `src/app/sites/canonica/components/StructuredData.tsx` | Homepage Organization/WebSite/SoftwareApplication JSON-LD |
| `public/canonica-og-image.png` | 1200x630 public social preview image |
| `public/canonica.webmanifest` | Canonica web app manifest |
| `src/app/sites/canonica/components/Header.tsx` | Shared header with nav + mobile menu |
| `src/app/sites/canonica/components/Footer.tsx` | Shared footer with link columns |
| `src/app/sites/canonica/components/CanonicaLink.tsx` | Dev/production-aware Link component |
| `src/app/sites/canonica/components/HeroSection.tsx` | Hero with gradient text + CTAs |
| `src/app/sites/canonica/components/ProductPreviewSection.tsx` | Static dashboard/widget/governance product preview |
| `src/app/sites/canonica/components/WidgetSection.tsx` | Homepage page-aware widget and install section |
| `src/app/sites/canonica/components/PillarsSection.tsx` | 4 Canonica engine pillar cards |
| `src/app/sites/canonica/components/SystemCoverageSection.tsx` | Launch Setup, Support Control, Knowledge Governance, and Runtime Layer cards |
| `src/app/sites/canonica/components/HowItWorksSection.tsx` | 5-step vertical timeline |
| `src/app/sites/canonica/components/ComparisonSection.tsx` | Traditional KB vs Canonica table |
| `src/app/sites/canonica/components/CTASection.tsx` | Bottom CTA section |

### Routing Architecture

```
Production:
  canonica.app/*  →  middleware detects hostname  →  rewrites to /sites/canonica/*

Local Dev:
  localhost:3000/__canonica/*  →  middleware detects dev prefix  →  rewrites to /sites/canonica/*
```

See `src/constants/productDomains.ts` for the full multi-product domain registry.

---

## Design Decisions

1. **Dark theme** — Deep navy/indigo palette. Distinct from MenuList's light theme. Signals infrastructure product.
2. **Tailwind CSS** — Same build pipeline as rest of app. `@tailwind` directives in `styles.css`.
3. **Server components by default** — Pages and shared chrome stay server-rendered. The mobile header menu uses native HTML instead of client state.
4. **basePath pattern** — `getBasePath()` reads `x-product-id` header + `host` to determine if dev mode. Passed as prop to components that contain links.
5. **CanonicaLink** — Wraps `next/link` with basePath prefix for dev mode compatibility.
6. **No external dependencies** — Zero new npm packages. Uses Tailwind + inline SVGs.

---

## Version History

| Date | Change |
|------|--------|
| 2026-03-07 | Initial implementation: 6 pages, shared components, Tailwind, multi-product routing |
| 2026-05-21 | Added small-SaaS positioning, `/demo`, Starter/Growth/Studio pricing copy, founder-friendly product/get-started/contact pages, public security/FAQ/legal pages, Canonica sitemap/robots, manifest, icons, and structured data |
| 2026-05-21 | Restored implemented Canonica engine pillars to homepage and product page while keeping the deferred API/integration pillar off public claims |
| 2026-05-21 | Added homepage system coverage map from the Canonica codebase inventory |
| 2026-05-21 | Added static product preview and market-standard public pages for use cases, integrations, resources, and updates |
| 2026-05-21 | Replaced public integrations positioning with widget-first install positioning; API/adapters stay rollout-gated and out of buyer-facing package copy |
| 2026-05-21 | Expanded the security page using the reusable MenuList trust-page structure while keeping Canonica-specific product boundaries, widget controls, owner-reviewed answers, rate limits, and responsible disclosure |
| 2026-05-22 | Refreshed public website for current Canonica runtime: support knowledge control plane hero, hosted help domains, FAQ management/generation, product-scoped billing/support credits, source-version cache freshness, and separate Firebase/product boundaries |
| 2026-05-22 | Added buyer-facing custom help domain positioning and safe ticket debugging context across homepage, product, install, security, FAQ, privacy, and updates copy |
