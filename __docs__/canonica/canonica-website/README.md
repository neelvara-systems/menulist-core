# Canonica Website (canonica.app)

> **Feature:** Public marketing website for Canonica product
> **Status:** ✅ IMPLEMENTED (Step 1 of Phase 2: DISTRIBUTE)
> **Date:** 2026-03-07
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

---

## Quick Reference

### Pages (6 total)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Homepage | Hero + Pillars + HowItWorks + Comparison + CTA |
| `/product` | Product | Deep-dive into 5 architectural pillars |
| `/pricing` | Pricing | Beta pricing (free) + included features list |
| `/about` | About | Company beliefs + team origin |
| `/contact` | Contact | Email contacts + design partner program |
| `/get-started` | Get Started | Beta application + design partner criteria |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/sites/canonica/layout.tsx` | Layout with metadata, OG tags, SEO |
| `src/app/sites/canonica/styles.css` | Tailwind directives + CSS variables |
| `src/app/sites/canonica/page.tsx` | Homepage (server component) |
| `src/app/sites/canonica/components/Header.tsx` | Shared header with nav + mobile menu |
| `src/app/sites/canonica/components/Footer.tsx` | Shared footer with link columns |
| `src/app/sites/canonica/components/CanonicaLink.tsx` | Dev/production-aware Link component |
| `src/app/sites/canonica/components/HeroSection.tsx` | Hero with gradient text + CTAs |
| `src/app/sites/canonica/components/PillarsSection.tsx` | 5 pillar cards grid |
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
3. **Server components by default** — Pages are server components. Only Header (mobile menu state) is client.
4. **basePath pattern** — `getBasePath()` reads `x-product-id` header + `host` to determine if dev mode. Passed as prop to components that contain links.
5. **CanonicaLink** — Wraps `next/link` with basePath prefix for dev mode compatibility.
6. **No external dependencies** — Zero new npm packages. Uses Tailwind + inline SVGs.

---

## Version History

| Date | Change |
|------|--------|
| 2026-03-07 | Initial implementation: 6 pages, shared components, Tailwind, multi-product routing |
