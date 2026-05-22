# Canonica Website (canonica.app)

> **Feature:** Public marketing website for Canonica product
> **Status:** ✅ IMPLEMENTED — refreshed for self-service Canonica and buyer-facing conversion flow
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

### Pages (26 total)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Homepage | Founder-relief hero focused on support accuracy + tabbed product-page demo + closed-loop support truth visual + dashboard-style product proof + best-fit/not-fit + setup funnel + bento widget/hosted-help install + trust controls + pillars + system coverage + comparison + pricing preview + objections + CTA |
| `/product` | Product | Self-serve product overview with visual workflow proof for launch setup, support control, branded help domains, safe ticket context, page-aware widget, canonical answers, releases, and support gaps |
| `/product/launch-setup` | Product Area | Landing-style page for activation, workspace setup, starter knowledge, surfaces, widget key, and readiness |
| `/product/page-aware-widget` | Product Area | Landing-style page for widget runtime, safe context, allowed origins, blocked routes, and approved answers |
| `/product/support-control` | Product Area | Landing-style page for hosted help, docs, FAQ, changelog, ticket fallback, conversations, and weekly support review |
| `/product/knowledge-governance` | Product Area | Landing-style page for ontology, canonical answers, drift, signal mutation, coverage, and trust metrics |
| `/use-cases` | Use Cases | Founder/operator scenarios by support problem |
| `/use-cases/founders` | Use Case | Solo-founder support loop for launching before hiring support |
| `/use-cases/support-teams` | Use Case | Reduce repeated tickets while keeping owner-approved answer control |
| `/use-cases/product-teams` | Use Case | Product-surface drift, release review, and support friction visibility |
| `/use-cases/engineering` | Use Case | Safe widget install, route context, and governed retrieval for engineering teams |
| `/page-aware-support-widget` | SEO Landing | Page-aware support widget page with concrete before/after support example |
| `/hosted-help-center-for-saas` | SEO Landing | Hosted SaaS help center page for docs, FAQ, and changelog on support domains |
| `/support-widget-for-solo-founders` | SEO Landing | Solo-founder support widget page focused on launching support before hiring a team |
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
| `src/app/sites/canonica/productAreas.ts` | Shared product-area navigation and descriptions |
| `src/app/sites/canonica/product/launch-setup/page.tsx` | Product-area landing page for Launch Setup |
| `src/app/sites/canonica/product/page-aware-widget/page.tsx` | Product-area landing page for Page-Aware Widget |
| `src/app/sites/canonica/product/support-control/page.tsx` | Product-area landing page for Support Control |
| `src/app/sites/canonica/product/knowledge-governance/page.tsx` | Product-area landing page for Knowledge Governance |
| `src/app/sites/canonica/use-cases/page.tsx` | Use-case page for founder/operator support scenarios |
| `src/app/sites/canonica/use-cases/founders/page.tsx` | Founder use-case landing page |
| `src/app/sites/canonica/use-cases/support-teams/page.tsx` | Support-team use-case landing page |
| `src/app/sites/canonica/use-cases/product-teams/page.tsx` | Product-team use-case landing page |
| `src/app/sites/canonica/use-cases/engineering/page.tsx` | Engineering use-case landing page |
| `src/app/sites/canonica/page-aware-support-widget/page.tsx` | SEO landing page for page-aware widget search intent |
| `src/app/sites/canonica/hosted-help-center-for-saas/page.tsx` | SEO landing page for hosted help-center search intent |
| `src/app/sites/canonica/support-widget-for-solo-founders/page.tsx` | SEO landing page for solo-founder support search intent |
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
| `src/app/sites/canonica/components/CanonicaAnalytics.tsx` | Optional GA/measurement-id conversion event tracker with no Firestore writes |
| `src/app/sites/canonica/components/HeroSection.tsx` | Hero with gradient text + CTAs |
| `src/app/sites/canonica/components/HomePageAwareDemoSection.tsx` | Homepage tabbed static page-aware demo section |
| `src/app/sites/canonica/components/ClosedLoopSection.tsx` | Homepage support truth loop from page question to reviewed canonical answer |
| `src/app/sites/canonica/components/BestFitSection.tsx` | Homepage best-fit/not-fit buyer qualification |
| `src/app/sites/canonica/components/ProductPreviewSection.tsx` | Responsive dashboard/widget/governance product scene used on homepage and product page |
| `src/app/sites/canonica/components/ProductAreasSection.tsx` | Homepage product-suite cross-link section for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance |
| `src/app/sites/canonica/components/SetupFunnelSection.tsx` | Homepage 10-minute setup visual funnel |
| `src/app/sites/canonica/components/WidgetSection.tsx` | Homepage bento grid for page-aware widget, install, hosted help, route controls, and support-gap review |
| `src/app/sites/canonica/components/HomeTrustSection.tsx` | Homepage short trust/security control strip |
| `src/app/sites/canonica/components/PillarsSection.tsx` | 4 Canonica engine pillar cards |
| `src/app/sites/canonica/components/SystemCoverageSection.tsx` | Launch Setup, Support Control, Knowledge Governance, and Runtime Layer cards |
| `src/app/sites/canonica/components/HowItWorksSection.tsx` | 5-step vertical timeline |
| `src/app/sites/canonica/components/ComparisonSection.tsx` | Traditional KB vs Canonica table |
| `src/app/sites/canonica/components/PricingPreviewSection.tsx` | Homepage pricing preview and support-credit explanation |
| `src/app/sites/canonica/components/ObjectionsSection.tsx` | Homepage objection-handling FAQ strip |
| `src/app/sites/canonica/components/SeoLandingPage.tsx` | Shared component for static SEO landing pages |
| `src/app/sites/canonica/components/UseCaseLandingPage.tsx` | Shared wrapper for role-specific use-case pages |
| `src/app/sites/canonica/components/ProductCapabilityLandingPage.tsx` | Shared landing-page template for major product capability pages |
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
| 2026-05-22 | Reworked homepage for self-sell conversion: pain/outcome-led hero, embedded generic-vs-Canonica demo, best-fit/not-fit, 10-minute setup funnel, trust strip, pricing preview, objections, optional no-Firestore GA events, and three SEO landing pages |
| 2026-05-22 | Added a screenshot-led product scene inspired by modern product websites: activation command center, product surfaces, widget answer, and signal-to-knowledge queue now appear directly after the hero and on the product page without adding Firebase reads or static screenshot assets |
| 2026-05-22 | Applied the Canonica positioning pass: demo is the primary hero CTA, homepage leads with page-aware support truth, a closed-loop visual explains question → canonical answer → signal → human approval, comparison now contrasts chatbot/helpdesk/KB/Canonica, FAQ defines the category, and four role-specific use-case pages were added |
| 2026-05-22 | Applied founder-relief positioning safely: homepage now says "You build revenue. Canonica keeps support accurate." while avoiding "we handle your support" because Canonica is not a helpdesk replacement, outsourcing service, or AI autopilot |
| 2026-05-22 | Improved website presentation quality using product-site patterns from Circle/Upvoty references: the demo now uses a horizontal page-tab row and large product canvas, product proof has clearer dashboard tabs, and widget content is organized as a bento-style install/runtime/governance grid |
| 2026-05-22 | Added standalone landing-style product area pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance, following the Swell/Abyssale/Circle pattern where each product part can sell and explain itself |
| 2026-05-22 | Final product-suite polish: header Product dropdown now exposes the four product-area pages, homepage/resources/use-case/SEO pages cross-link those areas, and buyer navigation stays static with zero Firebase cost |
