# MenuList Marketing Distribution - Demo Placeholder Assets

**Status:** Temporary placeholder asset inventory  
**Created:** June 23, 2026  
**Owner:** Codex creates placeholders, founder replaces with approved assets  
**Related actions:** MLD-A012  
**Scope:** Placeholder visuals for broad-SMB launch proof and service-list industry pages.

---

## Purpose

These files unblock service-list, salon/spa, and local-service SEO page work while the final routed screenshots and videos are still pending.

They are not customer proof. They are labelled sample/demo placeholders and must be replaced before Product Hunt gallery use, paid traffic, broad partner outreach, or final public campaign assets.

## Placeholder Files

| Asset | Path | Intended replacement |
| --- | --- | --- |
| Glow & Blade service-list placeholder | `public/images/website/demo-placeholders/glow-blade-service-list-placeholder.svg` | Approved mobile screenshot or short clip of the Glow & Blade Studio demo public service-list page |
| Multi-category service-list proof grid | `public/images/website/demo-placeholders/service-list-proof-grid-placeholder.svg` | Approved gallery frame using real routed demo screenshots across cafe, salon, local service, retail/catalog, and package-list demos |
| Spark Auto Detailing rate-card placeholder | `public/images/website/demo-placeholders/spark-detailing-rate-card-placeholder.svg` | Approved mobile screenshot or clip of the Spark Auto Detailing package/rate-card demo public page |
| Launch video poster placeholder | `public/images/website/demo-placeholders/launch-video-poster-placeholder.svg` | Approved 60-90 second walkthrough poster or final hosted video thumbnail |

## Current Code Use

The placeholders are visible on:

- `/industries/salons-spas`
- `/industries/service-list-businesses`
- `/industries/local-service-businesses`

Each page uses the existing industry-page shell, page metadata, `WebsitePageStructuredData`, platform discovery registry, static sitemap, and LLM context.

## Replacement Rules

1. Keep `Sample business. Demo data only.` on fictional demos where a viewer could mistake the asset for a real customer.
2. Do not use real customer names, phone numbers, emails, photos, menus, prices, or storefronts without written permission.
3. Do not show owner dashboard emails, billing data, Firestore IDs, local URLs, draft tokens, or debug labels.
4. Do not add fake reviews, ratings, ranking, revenue, traffic, conversion, or customer-count claims.
5. Use screenshots from real MenuList routes when possible; use static source-before visuals only for the old-list state.
6. Re-run `npm run verify:agent-readiness`, `npm run verify:website-resource-locales`, typecheck, lint, and a browser smoke after replacing assets or changing the pages.

## Still Pending

- Routed demo tenants/public pages for the six core demo businesses.
- Final mobile screenshots for salon/service-list/rate-card proof.
- Final Product Hunt gallery frames.
- Final 60-90 second walkthrough video.
- Founder approval for demo names, visual style, captions, and asset use.
