# MenuList Marketing Distribution - Demo Placeholder Assets

**Status:** Three industry placeholders retired; launch-video planning placeholder retained
**Created:** June 23, 2026  
**Owner:** Codex creates placeholders, founder replaces with approved assets  
**Related actions:** MLD-A012  
**Scope:** Placeholder visuals for broad-SMB launch proof and service-list industry pages.

---

## Purpose

The three industry placeholders previously unblocked service-list, salon/spa, and local-service SEO page work. They were removed from the public routes on July 18, 2026 because internal replacement instructions are not customer proof. Their historical SVGs remain inside AssetOS, outside `public/`.

They are not customer proof. They are labelled sample/demo placeholders and must be replaced before Product Hunt gallery use, paid traffic, broad partner outreach, or final public campaign assets.

## Placeholder Files

| Asset | Path | Intended replacement |
| --- | --- | --- |
| Glow & Blade service-list placeholder | `packages/asset-factory/published/placeholders/glow-blade-service-list-placeholder.svg` (retired) | Approved mobile screenshot or short clip of the Glow & Blade Studio demo public service-list page |
| Multi-category service-list proof grid | `packages/asset-factory/published/placeholders/service-list-proof-grid-placeholder.svg` (retired) | Approved gallery frame using real routed demo screenshots across cafe, salon, local service, retail/catalog, and package-list demos |
| Spark Auto Detailing rate-card placeholder | `packages/asset-factory/published/placeholders/spark-detailing-rate-card-placeholder.svg` (retired) | Approved mobile screenshot or clip of the Spark Auto Detailing package/rate-card demo public page |
| Launch video poster placeholder | `public/images/website/demo-placeholders/launch-video-poster-placeholder.svg` | Approved 60-90 second walkthrough poster or final hosted video thumbnail |

## Current Code Use

The three industry placeholders are no longer mounted on:

- `/industries/salons-spas`
- `/industries/service-list-businesses`
- `/industries/local-service-businesses`

The routes remain text-first through the existing industry-page shell, page metadata, `WebsitePageStructuredData`, platform discovery registry, sitemap, and LLM context. Proof may return only after the replacement is permissioned, current, and routed through AssetOS. The launch-video poster remains an unmounted planning placeholder.

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
