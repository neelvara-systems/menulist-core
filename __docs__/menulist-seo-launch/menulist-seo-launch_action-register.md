# MenuList SEO Launch Action Register

**Status:** Active  
**Created:** June 22, 2026  
**Product:** MenuList only

---

## Status Legend

| Status | Meaning |
| --- | --- |
| Open | Work is ready to do. |
| Blocked | Waiting on owner access, external system, production deployment, or data. |
| Ongoing | Must be maintained whenever related work changes. |
| Deferred | Good idea, but not launch-critical or not ready. |
| Done | Completed and verified. |

## Priority Legend

| Priority | Meaning |
| --- | --- |
| P0 | Required before launch SEO can be called operationally ready. |
| P1 | Strong launch improvement after P0 is stable. |
| P2 | Useful after launch data exists. |

---

## Active Register

| Priority | Status | Action | Owner | Evidence / source | Notes |
| --- | --- | --- | --- | --- | --- |
| P0 | Ongoing | Complete code-side SEO readiness before external setup. | Codex | `menulist-seo-launch_code-readiness-checklist.md` | Baseline passed on June 22, 2026; rerun after SEO/discovery changes before external setup. |
| P0 | Ongoing | Keep SEO/AEO verifier passing after metadata, sitemap, robots, LLM, or route changes. | Codex | `npm run verify:agent-readiness` | Run after discovery/canonical/schema changes. |
| P0 | Ongoing | Keep reviewed resource locale verifier passing after resource or locale changes. | Codex | `npm run verify:website-resource-locales` | Run after resource route/content/locale changes. |
| P0 | Ongoing | Keep public tenant pages quality-gated before indexing or sitemap inclusion. | Codex | `src/lib/seo/publicTruthIndexing.ts`, `src/app/client/sitemap.ts` | Do not index weak, expired, blocked, starter, incomplete, or misleading records. |
| P0 | Ongoing | Keep SEO claims inside approved boundaries. | Founder + Codex | `main-website_seo-aeo.md`, `main-website_seo-aeo-marketing-brief.md` | No ranking, citation, Google refresh, revenue, fake metric, or AI visibility promises. |
| P0 | Ongoing | Keep broad SMB scope visible without turning MenuList into generic software. | Founder + Codex | `README.md`, `menulist-seo-launch_research-brief-2026-06-22.md` | Restaurants/cafes and salons/spas are proof categories; customer-facing SMB list truth is the market scope. |
| P0 | Ongoing | Gate international and channel SEO pages behind proof and intake readiness. | Founder + Codex | `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_launch-distribution-review.md` | `/global`, `/in`, `/ae`, `/us`, `/br`, `/mx`, `/line`, and `/kakao` remain roadmap candidates until proof assets, localized copy, intake path, and claim review exist. |
| P0 | Blocked | Align live production host before Search Console. | Founder | Live curl checks on June 23 and June 30, 2026 | `menulist.online` serves the app but emits `menulist.ai` canonical/sitemap URLs; `menulist.ai` currently serves a `/lander` shell and `/lander` sitemap, not the MenuList app. Do not submit Search Console until hosting/DNS matches the chosen canonical host. |
| P1 | Open | Create an owner-side Search Console review checklist after property access exists. | Codex | This folder | Include query, index coverage, sitemap, URL inspection, page experience, and rich results checks. |
| P1 | Open | Add a monthly Search Console review cadence after launch. | Founder + Codex | Google Search Console | Google says daily checks are unnecessary; review monthly and after material site/content changes. |
| P1 | Open | Review highest-value existing pages before adding new pages. | Codex | `main-website_seo-aeo-marketing-brief.md` | Start with official customer link, official menu source, create-menu, pricing, OBP, resources, restaurants/cafes, salon/spa, and multi-location pages. |
| P1 | Ongoing | Use demo universe before adding service-list SEO pages. | Codex | `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_demo-universe.md`; `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_demo-placeholder-assets.md` | Placeholder-backed salon/spa, service-list, and local-service industry pages now exist. Replace placeholders with routed screenshots or permissioned proof before broad campaign use. |
| P1 | Ongoing | Keep AEO/GEO language as internal shorthand, not a public promise. | Founder + Codex | `menulist-seo-launch_research-brief-2026-06-22.md` | Google treats generative AI search optimization as normal SEO. |
| P1 | Ongoing | Keep owner-facing public presence health useful without external-scan promises. | Codex | `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts`; Business Health | Current modules include Google profile handoff and menu freshness using MenuList data only. |
| P1 | Ongoing | Keep `llms.txt` framing limited to non-Google agent context and product clarity. | Codex | `public/llms.txt`, `public/llms-full.txt`, Google AI optimization guidance | Do not describe LLM files as Google ranking, AI Overview, or indexing levers. |
| P1 | Ongoing | Keep named crawler policy aligned with current primary-source crawler docs. | Codex | `src/lib/seo/discoveryPolicy.ts`, `public/robots.txt`, `src/app/client/robots.ts`, `src/app/client/robots/route.ts` | Current policy includes OpenAI, Anthropic, Perplexity, Google, Bing, and Common Crawl tokens; ad-validation crawlers must not be described as search-ranking levers. |
| P1 | Deferred | Add carefully scoped resource pages such as WhatsApp link, price-change checklist, restaurant menu cleanup, service-list cleanup, and service price-list checklist. | Founder + Codex | `main-website_seo-aeo-marketing-brief.md`, `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_whatsapp-seo-content-briefs.md` | Briefs now exist; implementation still waits for proof assets, production CTA, and real pilot questions. |
| P1 | Deferred | Add comparison pages such as PDF menu vs MenuList or QR menu maker vs official menu source. | Founder + Codex | `main-website_seo-aeo-marketing-brief.md` | Avoid hostile claims and "best QR menu maker" positioning. |
| P2 | Deferred | Evaluate Bing Webmaster Tools and IndexNow for platform and tenant URL updates. | Codex | IndexNow documentation | Decide host/key strategy, publish triggers, abuse limits, and noindex gate before any implementation. |
| P2 | Deferred | Hire outside SEO consultant for one fixed-scope audit. | Founder | This folder | Only if needed after internal baseline and Search Console setup. No agency retainer yet. |

---

## External Setup Queue

These tasks are intentionally queued until the founder starts non-code setup. Code-side baseline passed on June 22, 2026, but Search Console still requires owner Google/domain access.

| Priority | Status | Action | Owner | Evidence / source | Notes |
| --- | --- | --- | --- | --- | --- |
| P0 | Blocked | Verify `menulist.ai` in Google Search Console. | Founder | Google Search Console | Requires owner Google account/domain access and completed code-side readiness gate. |
| P0 | Blocked | Submit `https://menulist.ai/sitemap.xml` in Search Console. | Founder | `public/robots.txt`, `src/app/sitemap.ts` | Do after property verification, code-side readiness, and production host alignment. |
| P0 | Blocked | Inspect core URLs in Search Console: `/`, `/pricing`, `/features`, `/features/public-discovery`, `/resources`, and current proof industry pages. | Founder + Codex | Search Console URL Inspection | Include `/industries/restaurants`, `/industries/cafes-bakeries`, `/industries/salons-spas`, `/industries/service-list-businesses`, and `/industries/local-service-businesses` after host alignment and deployment. |

---

## Completed Baseline

| Date | Action | Evidence |
| --- | --- | --- |
| 2026-07-01 | Added owner SEO/AEO value layer: Google profile handoff kit, Public Truth Google/freshness modules, and visible OBP customer quick answers from page facts. | `src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx`; `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts`; `src/app/client/obp/OBPResolvedSurface.tsx`; `scripts/verification/verify-public-truth-check.js`; `scripts/verification/verify-public-business-truth.js` |
| 2026-06-23 | Added placeholder-backed salon/spa, service-list, and local-service industry pages before final demo screenshots/videos are available. | `src/content/websiteIndustries.ts`; `src/app/(website)/industries/salons-spas/page.tsx`; `src/app/(website)/industries/service-list-businesses/page.tsx`; `src/app/(website)/industries/local-service-businesses/page.tsx`; `public/images/website/demo-placeholders/`; `menulist-marketing-distribution_demo-placeholder-assets.md` |
| 2026-06-30 | Refreshed AI/search crawler and merchant schema policy from current primary sources. | `src/lib/seo/discoveryPolicy.ts`; `public/robots.txt`; `src/app/client/robots.ts`; `src/app/client/robots/route.ts`; `src/app/client/[[...slug]]/page.tsx`; `main-website_seo-aeo.md`; `menulist-seo-launch_consultant-ledger.md` |
| 2026-06-23 | Added WhatsApp SEO content briefs without creating new routes; kept route expansion deferred behind proof and intake readiness. | `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_whatsapp-seo-content-briefs.md`; `menulist-seo-launch_consultant-ledger.md` |
| 2026-06-23 | Reviewed launch-platform and international-acquisition strategy against launch SEO gates; kept country/channel pages deferred until proof and intake readiness. | `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_launch-distribution-review.md`; `menulist-seo-launch_consultant-ledger.md` |
| 2026-06-23 | Fixed stale public tenant menu slug and item/category detail metadata so recovery/detail pages are not indexable public truth pages. | `src/app/client/[[...slug]]/page.tsx`; `scripts/verification/verify-agent-readiness.js`; `__docs__/discovery-infrastructure/public-truth-indexing-policy.md`; `menulist-seo-launch_verification.md` |
| 2026-06-23 | Reviewed external ChatGPT SEO audit against live endpoints and repo truth; hardened auth/internal noindex behavior. | Live curl checks; `src/app/(global-pages)/signin/page.tsx`; `src/app/(global-pages)/forgot-password/page.tsx`; `src/middleware.ts`; `src/lib/seo/discoveryPolicy.ts`; `public/robots.txt`; `scripts/verification/verify-agent-readiness.js` |
| 2026-06-22 | Completed final code-side readiness pass for broad-SMB SEO/runtime copy before external setup. | `menulist-seo-launch_verification.md`; locale JSON parse; stale-copy/claim scan; `npm run verify:agent-readiness`; `npm run verify:website-resource-locales`; `npx tsc --noEmit --incremental false --pretty false`; `npm run lint`; `git diff --check`; local dev route smoke on `/`, `/pricing`, `/create-menu`, `/features`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/llms-full.txt` |
| 2026-06-22 | Created the multi-category demo universe brief, source-list pack, and screenshot capture plan required before service-list SEO page expansion. | `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_demo-universe.md`; `menulist-marketing-distribution_demo-source-lists.md`; `menulist-marketing-distribution_screenshot-capture-plan.md`; MLD-A001; MLD-A009; MLD-A010; MLD-R006 |
| 2026-06-22 | Aligned live website metadata, footer AI-summary prompt, and primary English/Hindi homepage copy to broad SMB customer-list positioning. | `src/constants/menulist/website.ts`; `src/components/website/Footer.tsx`; `public/locales/menulist.ai/en-US.json`; `public/locales/menulist.ai/hi-IN.json`; `__docs__/main-website/README.md` |
| 2026-06-22 | Completed code-side SEO cross-check and verification log. | `menulist-seo-launch_verification.md`; `npm run verify:agent-readiness`; `npm run verify:website-resource-locales`; locale JSON parse; Website namespace claim scan; `git diff --check`; `npx tsc --noEmit --incremental false --pretty false` |
| 2026-06-22 | Confirmed broad customer-facing SMB market scope and crowded-market positioning. | Founder direction; `README.md`; `menulist-seo-launch_research-brief-2026-06-22.md`; marketing-distribution docs |
| 2026-06-22 | Removed positive `AI-powered` shorthand from public AI Menu Manager locale copy and LLM context wording. | `public/locales/menulist.ai/*.json`; `public/llms.txt`; `public/llms-full.txt`; `__docs__/main-website/README.md`; public claim scan returned no matches |
| 2026-06-22 | Re-ran code-side SEO baseline checks after adopting code-side-first sequence. | `npm run verify:agent-readiness`; `npm run verify:website-resource-locales`; `git diff --check` |
| 2026-06-22 | Adopted code-side-first launch SEO sequence. | `menulist-seo-launch_code-readiness-checklist.md`; external setup queue in this register |
| 2026-06-22 | Confirmed current SEO/AEO verifiers pass. | `npm run verify:agent-readiness`; `npm run verify:website-resource-locales` |
| 2026-06-22 | Created MenuList SEO launch operating folder and consultant ledger. | `__docs__/menulist-seo-launch/` |
| 2026-06-22 | Added primary-source SEO research brief and MenuList consultant interpretation. | `menulist-seo-launch_research-brief-2026-06-22.md` |

---

## Do Not Do

- Do not create a generic blog because SEO work has started.
- Do not add city/category pages without verified supply density and real customer value.
- Do not make MenuList restaurant-only in SEO, page plans, or outreach.
- Do not create thin salon, spa, service-list, category, or local-service pages just to chase keywords.
- Do not index weak or unverified business records.
- Do not put public customer menu URLs into the platform sitemap; tenant domains use tenant sitemap policy.
- Do not add ranking, citation, Google refresh, revenue, or AI visibility promises.
- Do not claim `llms.txt` improves Google rankings, indexing, AI Overviews, or AI Mode inclusion.
- Do not hire a broad SEO agency before Search Console, page, and conversion data exist.
- Do not treat third-party SEO tool output as truth without checking Google guidance and repo implementation.
