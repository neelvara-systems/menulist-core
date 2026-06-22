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
| P0 | Blocked | Verify `menulist.ai` in Google Search Console. | Founder | Google Search Console | Requires owner Google account/domain access. |
| P0 | Blocked | Submit `https://menulist.ai/sitemap.xml` in Search Console. | Founder | `public/robots.txt`, `src/app/sitemap.ts` | Do after property verification. |
| P0 | Blocked | Inspect core URLs in Search Console: `/`, `/pricing`, `/features`, `/features/public-discovery`, `/resources`, `/industries/restaurants`. | Founder + Codex | Search Console URL Inspection | Requires Search Console access. |
| P0 | Ongoing | Keep SEO/AEO verifier passing after metadata, sitemap, robots, LLM, or route changes. | Codex | `npm run verify:agent-readiness` | Run after discovery/canonical/schema changes. |
| P0 | Ongoing | Keep reviewed resource locale verifier passing after resource or locale changes. | Codex | `npm run verify:website-resource-locales` | Run after resource route/content/locale changes. |
| P0 | Ongoing | Keep public tenant pages quality-gated before indexing or sitemap inclusion. | Codex | `src/lib/seo/publicTruthIndexing.ts`, `src/app/client/sitemap.ts` | Do not index weak, expired, blocked, starter, incomplete, or misleading records. |
| P0 | Ongoing | Keep SEO claims inside approved boundaries. | Founder + Codex | `main-website_seo-aeo.md`, `main-website_seo-aeo-marketing-brief.md` | No ranking, citation, Google refresh, revenue, fake metric, or AI visibility promises. |
| P1 | Open | Create an owner-side Search Console review checklist after property access exists. | Codex | This folder | Include query, index coverage, sitemap, URL inspection, page experience, and rich results checks. |
| P1 | Open | Add a monthly Search Console review cadence after launch. | Founder + Codex | Google Search Console | Google says daily checks are unnecessary; review monthly and after material site/content changes. |
| P1 | Open | Review highest-value existing pages before adding new pages. | Codex | `main-website_seo-aeo-marketing-brief.md` | Start with official menu source, menu source audit, Google Business Profile menu, QR menu, restaurants, multi-location. |
| P1 | Ongoing | Keep AEO/GEO language as internal shorthand, not a public promise. | Founder + Codex | `menulist-seo-launch_research-brief-2026-06-22.md` | Google treats generative AI search optimization as normal SEO. |
| P1 | Ongoing | Keep `llms.txt` framing limited to non-Google agent context and product clarity. | Codex | `public/llms.txt`, `public/llms-full.txt`, Google AI optimization guidance | Do not describe LLM files as Google ranking, AI Overview, or indexing levers. |
| P1 | Deferred | Add carefully scoped resource pages such as WhatsApp menu link, price-change checklist, and restaurant menu cleanup checklist. | Founder + Codex | `main-website_seo-aeo-marketing-brief.md` | Only after core pages are polished and there is a real content owner. |
| P1 | Deferred | Add comparison pages such as PDF menu vs MenuList or QR menu maker vs official menu source. | Founder + Codex | `main-website_seo-aeo-marketing-brief.md` | Avoid hostile claims and "best QR menu maker" positioning. |
| P2 | Deferred | Evaluate Bing Webmaster Tools and IndexNow for platform and tenant URL updates. | Codex | IndexNow documentation | Decide host/key strategy, publish triggers, abuse limits, and noindex gate before any implementation. |
| P2 | Deferred | Hire outside SEO consultant for one fixed-scope audit. | Founder | This folder | Only if needed after internal baseline and Search Console setup. No agency retainer yet. |

---

## Completed Baseline

| Date | Action | Evidence |
| --- | --- | --- |
| 2026-06-22 | Confirmed current SEO/AEO verifiers pass. | `npm run verify:agent-readiness`; `npm run verify:website-resource-locales` |
| 2026-06-22 | Created MenuList SEO launch operating folder and consultant ledger. | `__docs__/menulist-seo-launch/` |
| 2026-06-22 | Added primary-source SEO research brief and MenuList consultant interpretation. | `menulist-seo-launch_research-brief-2026-06-22.md` |

---

## Do Not Do

- Do not create a generic blog because SEO work has started.
- Do not add city/category pages without verified supply density and real customer value.
- Do not index weak or unverified business records.
- Do not put public customer menu URLs into the platform sitemap; tenant domains use tenant sitemap policy.
- Do not add ranking, citation, Google refresh, revenue, or AI visibility promises.
- Do not claim `llms.txt` improves Google rankings, indexing, AI Overviews, or AI Mode inclusion.
- Do not hire a broad SEO agency before Search Console, page, and conversion data exist.
- Do not treat third-party SEO tool output as truth without checking Google guidance and repo implementation.
