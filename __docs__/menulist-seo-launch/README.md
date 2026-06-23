# MenuList SEO Launch Operating Index

**Status:** Active operating doc  
**Owner:** Founder + Codex-as-consultant  
**Product:** MenuList only  
**Created:** June 22, 2026

---

## Purpose

This folder is the ongoing operating home for MenuList launch SEO work.

Use it to record decisions, action items, evidence, blockers, and owner-side setup steps. It does not replace the implementation docs under `main-website/` or `discovery-infrastructure/`; it points to them and keeps the launch SEO program organized.

## Product Boundary

This folder covers MenuList only:

- `menulist.ai` main website SEO and AEO.
- MenuList public resources and industry pages.
- MenuList public menu, Official Business Page, tenant sitemap, robots, and public truth indexing policy.
- MenuList Search Console, indexing, page performance, structured data, and launch measurement.

This folder does not cover Answerlattice, CampaignCue, ConstantLayer, Canonica, MyCodex, GrowthOS, or KitStamp unless a future entry explicitly says a cross-product SEO issue affects MenuList.

## Market Scope

MenuList is not targeting one single market and should not be documented as a restaurant-only SEO or QR menu product.

The launch SEO scope is broad customer-facing SMBs where customers need a current public list:

- restaurants, cafes, bakeries, cloud kitchens, and food businesses;
- salons, spas, barbers, studios, and service-menu businesses;
- caterers, clinics, repair shops, classes, retail counters, and other local businesses with packages, prices, rate cards, catalogs, or service lists;
- multi-location SMBs that need consistent public list truth across branches.

Restaurants and cafes remain strong proof categories, but they are not the product identity. Salon, spa, and service-list proof must be visible early so MenuList does not get trapped as another restaurant-only menu builder.

The market is already cluttered with QR menu tools, restaurant website builders, generic digital-menu makers, link-in-bio pages, social profiles, WhatsApp/PDF workflows, and local setup agencies. MenuList's defensible SEO/product line is:

> Turn the current customer-facing list into one official customer link.

## Standing Consultant Decision

MenuList should keep launch SEO mostly in-house.

Codex is treated as the internal MenuList SEO consultant for:

- strategy validation against repo truth;
- technical SEO checks;
- sitemap, robots, canonical, structured-data, and indexing policy review;
- page inventory and claim-boundary review;
- Search Console setup guidance;
- action logging and doc maintenance.

Outside help, if used, should be narrow and fixed-scope only:

- one technical SEO audit;
- one structured-data and page-title review;
- one keyword mapping review;
- no broad agency retainer until MenuList has Search Console and conversion data.

## Source Of Truth Map

| Area | Source |
| --- | --- |
| Main website SEO/AEO implementation truth | [`../main-website/main-website_seo-aeo.md`](../main-website/main-website_seo-aeo.md) |
| Shareable marketing/SEO review brief | [`../main-website/main-website_seo-aeo-marketing-brief.md`](../main-website/main-website_seo-aeo-marketing-brief.md) |
| Main website current architecture and changelog | [`../main-website/README.md`](../main-website/README.md) |
| Main website page-by-page copy truth | [`../main-website/main-website_content.md`](../main-website/main-website_content.md) |
| Discovery infrastructure and public machine-readability | [`../discovery-infrastructure/README.md`](../discovery-infrastructure/README.md) |
| Public tenant indexing gate | [`../discovery-infrastructure/public-truth-indexing-policy.md`](../discovery-infrastructure/public-truth-indexing-policy.md) |
| Production launch prerequisites | [`../production-readiness/launch-prerequisites.md`](../production-readiness/launch-prerequisites.md) |
| Global release/change log | [`../CHANGELOG.md`](../CHANGELOG.md) |

## Runtime Evidence Anchors

| Runtime area | File |
| --- | --- |
| MenuList canonical website constants | `src/constants/menulist/website.ts` |
| Platform discovery page inventory | `src/lib/seo/discoveryPolicy.ts` |
| Platform sitemap route | `src/app/sitemap.ts` |
| Platform robots file | `public/robots.txt` |
| Public tenant indexability gate | `src/lib/seo/publicTruthIndexing.ts` |
| Public tenant sitemap route | `src/app/client/sitemap.ts` |
| Public tenant robots route | `src/app/client/robots.ts` and `src/app/client/robots/route.ts` |
| Homepage structured data | `src/components/website/SchemaMarkup.tsx` |
| Page structured data | `src/components/website/WebsitePageStructuredData.tsx` |
| SEO/AEO verifier | `scripts/verification/verify-agent-readiness.js` |
| Resource locale verifier | `scripts/verification/verify-website-resource-locales.js` |

## Operating Files

| File | Purpose |
| --- | --- |
| [`menulist-seo-launch_research-brief-2026-06-22.md`](./menulist-seo-launch_research-brief-2026-06-22.md) | Current primary-source SEO/Search research translated into MenuList launch strategy. |
| [`menulist-seo-launch_code-readiness-checklist.md`](./menulist-seo-launch_code-readiness-checklist.md) | Code-side launch SEO readiness gate to complete before Search Console or other external setup. |
| [`menulist-seo-launch_verification.md`](./menulist-seo-launch_verification.md) | Cross-check evidence, findings, verification results, and remaining follow-ups. |
| [`menulist-seo-launch_consultant-ledger.md`](./menulist-seo-launch_consultant-ledger.md) | Running log of SEO decisions, reviews, evidence, and claim boundaries. |
| [`menulist-seo-launch_action-register.md`](./menulist-seo-launch_action-register.md) | Open and closed launch SEO tasks, owner-side blockers, and future candidates. |

## Update Protocol

For every non-trivial MenuList SEO, AEO, website discovery, public menu indexing, Search Console, structured data, sitemap, robots, or launch measurement task:

1. Check repo truth first: code, `main-website/`, `discovery-infrastructure/`, and current verifiers.
2. Update the specific source doc when implementation, copy, route, metadata, sitemap, indexing, or claim boundaries change.
3. Add a dated entry to the consultant ledger.
4. Update the action register when a task is opened, closed, blocked, or deferred.
5. Add a global changelog entry when a shipping docs/runtime/public-surface change is made.
6. Run the narrow relevant verifier. Default SEO verifier set:

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
```

Run `npx tsc --noEmit --incremental false` only when code, route, metadata, locale, or shared type changes require it. Do not run production builds or Vercel deploys unless explicitly requested.

## Claim Boundaries

MenuList SEO language must stay inside these boundaries:

- Say MenuList prepares a clearer official source for search engines, customers, and AI/search systems to read.
- Say public pages can include visible facts, stable URLs, sitemap signals, robots policy, and structured data.
- Say external systems decide what they crawl, index, rank, cite, summarize, or show.
- Treat AEO/GEO as internal shorthand for search-readiness work, not a separate public promise.
- Treat `llms.txt` and `llms-full.txt` as non-Google agent context files, not Google ranking or AI Overview levers.
- Do not promise ranking, traffic growth, AI citations, Google refresh timing, revenue lift, automatic external-platform updates, fake reviews, fake metrics, or broad "AI-powered SEO."
- Do not create thin keyword pages, city pages, fake case studies, fake downloadable templates, or unverified business pages.

## Current Baseline

As of June 23, 2026:

- Main website SEO/AEO docs are implemented and current.
- Platform sitemap/robots/canonical metadata/JSON-LD are verifier-covered.
- Public tenant menu and OBP sitemap inclusion are quality-gated.
- Reviewed resource locale packs are verifier-covered.
- The launch strategy is in-house SEO with Codex as internal consultant and optional fixed-scope outside audit only.
- Execution sequence is code-side first. Search Console and other external setup remain queued until the founder starts non-code setup.
- Positive public `AI-powered` shorthand was removed from AI Menu Manager locale copy and LLM context wording during the first code-side claim-boundary pass.
- Market scope is broad customer-facing SMBs; restaurants/cafes and salons/spas are proof categories, not product limits.
- Auth/internal noindex behavior is explicit for `/signin`, `/forgot-password`, app/internal/API paths, and create-menu preview/success transitions.
- Stale public tenant project/menu slug paths and stale item/category detail paths preserve customer recovery but emit `noindex, follow` and canonicalize to the current tenant/outlet/menu surface.
- Placeholder-backed salon/spa, service-list, and local-service industry pages now exist for code-side review: `/industries/salons-spas`, `/industries/service-list-businesses`, and `/industries/local-service-businesses`.
- Placeholder assets remain temporary and must be replaced with routed demo screenshots or permissioned proof before Product Hunt gallery use, paid traffic, broad partner outreach, or final public launch visuals.
- Search Console remains blocked until production host alignment is fixed: live `menulist.online` serves the app but advertises `menulist.ai`, while `menulist.ai` currently serves a `/lander` shell.
