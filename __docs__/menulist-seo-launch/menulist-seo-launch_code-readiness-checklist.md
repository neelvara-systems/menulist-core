# MenuList SEO Launch Code-Side Readiness Checklist

**Status:** Active checklist  
**Created:** June 22, 2026  
**Product:** MenuList only  
**Sequence:** Complete code-side readiness before Search Console or other external setup

---

## Purpose

This checklist is the launch SEO gate before owner-side setup such as Google Search Console, Bing Webmaster Tools, directory submissions, outreach, or outside audits.

The goal is simple: make sure MenuList's own website, public truth routes, sitemap, robots policy, metadata, structured data, and claim boundaries are clean before asking external systems to crawl or measure them.

## Done Definition

Code-side SEO readiness is done when:

1. Platform sitemap, robots, canonical URLs, metadata, and structured data pass the local SEO verifier.
2. Reviewed website resources and locale-backed resource pages pass the locale/resource verifier.
3. Public tenant/menu/OBP indexing stays behind the public-truth quality gate.
4. Public copy and machine-readable context files avoid ranking, citation, Google refresh, revenue, fake metric, and "AI-powered SEO" promises.
5. Source docs, this SEO launch folder, and the global changelog reflect the current implementation.
6. `git diff --check` passes for changed files.

Only after these are true, and after the founder decides to start non-code setup, should Search Console move from the external setup queue into active owner setup.

## P0 Code-Side Gates

| Gate | Evidence | Status |
| --- | --- | --- |
| Canonical domain and URL constants use the production MenuList identity. | `src/constants/menulist/website.ts`, `scripts/verification/verify-agent-readiness.js` | Verify before external setup |
| Platform sitemap includes only intended public website/resource/industry routes and excludes tenant menu URLs. | `src/app/sitemap.ts`, `src/lib/seo/discoveryPolicy.ts` | Verify before external setup |
| Platform robots allows public discovery surfaces and blocks private/app/API/internal routes. | `public/robots.txt`, `src/lib/seo/discoveryPolicy.ts` | Verify before external setup |
| Route-level/header noindex behavior exists for internal, auth, success, preview, or non-discovery states that must not rank. | `src/app/(global-pages)/signin/page.tsx`, `src/app/(global-pages)/forgot-password/page.tsx`, `src/middleware.ts`, `scripts/verification/verify-agent-readiness.js` | Verify before external setup |
| Public tenant menu and OBP sitemap inclusion is quality-gated. | `src/lib/seo/publicTruthIndexing.ts`, `src/app/client/sitemap.ts`, `src/app/client/robots.ts` | Verify before external setup |
| Structured data represents visible page facts and does not include fake reviews, hidden FAQs, invented ratings, or unsupported claims. | `src/components/website/SchemaMarkup.tsx`, `src/components/website/WebsitePageStructuredData.tsx` | Verify before external setup |
| Public website copy stays inside approved claim boundaries. | `public/locales/menulist.ai/*.json`, `public/llms.txt`, `public/llms-full.txt`, `__docs__/main-website/` | Verify before external setup |
| Resource pages have reviewed locale coverage before being discoverable. | `scripts/verification/verify-website-resource-locales.js`, `src/lib/seo/discoveryPolicy.ts` | Verify before external setup |
| Documentation and changelog are updated for any SEO/public discovery change. | `__docs__/menulist-seo-launch/`, `__docs__/main-website/`, `__docs__/discovery-infrastructure/`, `__docs__/CHANGELOG.md` | Ongoing |

## Default Verification Commands

Run these after SEO, discovery, resource, metadata, sitemap, robots, structured-data, locale, or claim-boundary changes:

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
git diff --check
```

Run TypeScript only when code, route, metadata, locale, or shared type changes require it:

```bash
npx tsc --noEmit --incremental false
```

Do not run production builds, Vercel deploys, or external setup unless explicitly requested.

## Current Baseline

As of June 23, 2026, after validating the external ChatGPT SEO audit:

- `menulist.online` robots/sitemap endpoints returned 200 in live curl checks, but they advertise `menulist.ai` canonical discovery URLs.
- `menulist.ai` currently returns a `/lander` shell, not the MenuList app, so production host alignment is a blocker before Search Console.
- `/signin` and `/forgot-password` now have explicit noindex metadata.
- Middleware now emits `X-Robots-Tag: noindex, nofollow` for auth/app/API/internal/create-menu preview and success paths.
- Platform robots/discovery policy now includes the missing internal/auth path prefixes.
- Missing public tenant project/menu slug paths now emit `noindex, follow`, canonicalize to the tenant or outlet root, and remain out of tenant sitemap while keeping the customer fallback ladder.
- Stale item/category detail paths under a real menu now emit `noindex, follow` and canonicalize to the current menu page.

As of June 22, 2026, after creating this checklist:

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
git diff --check
npx tsc --noEmit --incremental false --pretty false
```

Additional checks:

```bash
node -e "const fs=require('fs'); const path='public/locales/menulist.ai'; for (const f of fs.readdirSync(path)) { if (f.endsWith('.json')) JSON.parse(fs.readFileSync(path+'/'+f,'utf8')); } console.log('MenuList locale JSON parsed')"
rg -n "AI-powered" public/locales/menulist.ai public/llms.txt public/llms-full.txt src/app/'(website)' src/components/website
```

Result: all passed. The claim scan returned no public runtime matches.

The first code-side claim scan found positive `AI-powered` shorthand in public AI Menu Manager locale copy and LLM context wording. That wording was removed and replaced with approval-based language before readiness was logged.

No production build, Vercel deploy, Search Console setup, Bing setup, IndexNow setup, or external audit was run.

## External Setup Unlock

After the P0 code-side gates pass and the founder starts non-code setup, move these tasks into active owner setup:

- Verify `menulist.ai` in Google Search Console.
- Submit `https://menulist.ai/sitemap.xml`.
- Inspect core URLs in Search Console.
- Check sitemap processing, indexing coverage, page experience, and rich result eligibility.
- Create the monthly Search Console review cadence.

Until then, these remain intentionally queued.
