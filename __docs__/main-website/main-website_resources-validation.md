# MenuList Main Website Resources Validation

**Status:** Passed - implementation verification
**Last Verified:** June 2, 2026
**Scope:** MenuList public website resources layer

---

## Scope Verified

This validation covers the MenuList main website Resources + AI discovery layer only.

Included:

- `/resources` hub
- 12 `/resources/[slug]` article routes
- `/hi-IN/resources`, `/ta-IN/resources`, `/te-IN/resources`, `/mr-IN/resources`, `/bn-IN/resources`, `/ar-SA/resources`, and `/es-ES/resources` hubs
- 12 localized article routes each for `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, and `es-ES`
- resource content registry
- resource JSON-LD builders
- homepage, header, and footer resource links
- sitemap, robots, LLM context, and discovery-policy updates
- `verify:agent-readiness` route/discovery checks

Explicitly out of scope:

- owner dashboard
- authenticated app flows
- customer menu runtime
- billing, Razorpay, auth, middleware, Firebase rules, Firestore indexes, and Cloud Functions
- Answerlattice, Canonica, MyCodex, GrowthOS, KitStamp, and other same-repo products

The working tree contains unrelated edits outside this website-resource scope. They were not validated as part of this pass.

---

## Route Inventory

| Route | Type | Status |
| --- | --- | --- |
| `/resources` | Hub | Verified locally |
| `/resources/menu-source-audit` | Article | Verified locally |
| `/resources/menu-engineering` | Article | Registry/discovery verified |
| `/resources/qr-menu-for-restaurants` | Article | Registry/discovery verified |
| `/resources/digital-menu-vs-pdf-menu` | Article | Registry/discovery verified |
| `/resources/google-business-profile-menu` | Article | Registry/discovery verified |
| `/resources/official-menu-source` | Article | Registry/discovery verified |
| `/resources/restaurant-menu-seo` | Article | Registry/discovery verified |
| `/resources/ai-search-menu-discovery` | Article | Registry/discovery verified |
| `/resources/menu-update-checklist` | Article | Registry/discovery verified |
| `/resources/qr-code-placement-checklist` | Article | Registry/discovery verified |
| `/resources/menu-engineering-worksheet` | Article | Registry/discovery verified |
| `/resources/multi-location-menu-management` | Article | Registry/discovery verified |
| `/hi-IN/resources` | Hindi hub | Verified locally |
| `/hi-IN/resources/menu-source-audit` | Hindi article | Verified locally |
| `/hi-IN/resources/[slug]` remaining 11 articles | Hindi articles | Registry/discovery verified |
| `/ta-IN/resources` | Tamil hub | Verified locally |
| `/ta-IN/resources/[slug]` | Tamil articles | Registry/discovery verified |
| `/te-IN/resources` | Telugu hub | Registry/discovery verified |
| `/te-IN/resources/[slug]` | Telugu articles | Verified locally for `/menu-source-audit`; remaining articles registry/discovery verified |
| `/mr-IN/resources` | Marathi hub | Registry/discovery verified |
| `/mr-IN/resources/[slug]` | Marathi articles | Verified locally for `/menu-update-checklist`; remaining articles registry/discovery verified |
| `/bn-IN/resources` | Bengali hub | Registry/discovery verified |
| `/bn-IN/resources/[slug]` | Bengali articles | Verified locally for `/qr-menu-for-restaurants`; remaining articles registry/discovery verified |
| `/ar-SA/resources` | Arabic hub | Registry/discovery verified |
| `/ar-SA/resources/[slug]` | Arabic articles | Verified locally for `/menu-source-audit`; remaining articles registry/discovery verified |
| `/es-ES/resources` | Spanish hub | Registry/discovery verified |
| `/es-ES/resources/[slug]` | Spanish articles | Verified locally for `/menu-source-audit`; remaining articles registry/discovery verified |

---

## Verification Log

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit --incremental false` | Passed |
| Discovery readiness | `npm run verify:agent-readiness` | Passed: `Agent-readiness discovery surfaces verified` |
| Lint | `npm run lint` | Passed: no ESLint warnings or errors |
| Whitespace/conflict markers | `git diff --check` | Passed |
| Hub route | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/resources` | `200` |
| Article route | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/resources/menu-source-audit` | `200` |
| Mobile hub route | iPhone Safari user-agent curl against `/resources` | `200` |
| Mobile article route | iPhone Safari user-agent curl against `/resources/menu-source-audit` | `200` |
| Invalid slug evidence | `curl -s http://localhost:3002/resources/not-real \| rg 'Resource Not Found\|noindex, nofollow'` | Rendered not-found title and `noindex, nofollow` metadata |

Invalid resource slugs call `notFound()` and return explicit noindex metadata. In local `next dev`, the invalid resource URL may still show HTTP `200` because the route is rendered through the App Router not-found path; the official Next.js `not-found.js` documentation notes that streamed not-found responses can return `200`, while non-streamed responses return `404`: https://nextjs.org/docs/app/api-reference/file-conventions/not-found

`dynamicParams = false` was not used for this route because local Next.js dev produced unstable valid-route handling after clean server restarts. The current route keeps static params for known slugs, calls `notFound()` for unknown slugs, and protects unknown slugs from indexing through metadata.

---

## Follow-Up Cross-Check

**Date:** June 1, 2026

Additional checks and fixes after implementation:

- Resource slugs were rechecked against `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`: 12 article slugs, no duplicates, no missing discovery entries.
- Resource-scope language was scanned for forbidden public-content phrases from the website language-governance list: no remaining matches in the resource implementation scope.
- Article cluster labels now come from the localized resource copy registry instead of one English-only constant.
- Article JSON-LD breadcrumbs now include `Home -> Resources -> Article`.
- Hindi route smoke with `Accept-Language: hi-IN` confirmed Hindi article heading output and the localized cluster label.

Follow-up verification commands:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Passed |
| `npm run verify:agent-readiness` | Passed |
| `npm run lint` | Passed |
| `git diff --check` | Passed |
| `/resources` local smoke | `200` |
| `/resources/menu-source-audit` local smoke | `200` |
| mobile user-agent route smoke | Hub and article returned `200` |
| invalid slug evidence | rendered not-found title and `noindex, nofollow` metadata |

Browser automation note: the in-app Browser tool was not available in this tool session, so the cross-check used the local Next.js dev server plus HTTP, metadata, schema, and locale smoke checks.

---

## Localization Guardrail Pass

**Date:** June 1, 2026

Additional localization implementation:

- Added source-versioned resource locale packs.
- Added stable FAQ IDs to the English source so translations map by durable IDs instead of question order.
- Added `buildLocalizedWebsiteResources()` to apply reviewed locale packs over the English source.
- Added a reviewed full `hi-IN` pack for the resources hub and all 12 articles.
- Added `npm run verify:website-resource-locales`.

Verification:

| Check | Result |
| --- | --- |
| `npm run verify:website-resource-locales` | Passed: `Website resource locale packs verified: hi-IN` |

The verifier failed during implementation when a comparison row and a branch checklist still matched English exactly. Those sections were translated before the verifier was marked passing.

At this guardrail stage, Tamil, Telugu, Marathi, and Bengali were not yet published. That deferral was superseded by the Indian Resource Pack Rollout once full reviewed packs passed the same verifier and locale-prefixed routes existed.

---

## Hindi Locale URL Pass

**Date:** June 1, 2026

Additional SEO/AEO localization implementation:

- Added reviewed locale-prefixed resource routes at `/hi-IN/resources` and `/hi-IN/resources/[slug]`.
- Refactored default and localized resources through the same `ResourcePageShell`.
- Added locale-aware resource links, localized metadata, `alternates.languages`, and JSON-LD `inLanguage`.
- Added Hindi resource URLs and `hreflang` alternates to sitemap coverage.
- Added Hindi resource hub to `llms.txt` and all Hindi resource URLs to `llms-full.txt`.
- Extended `npm run verify:website-resource-locales` to assert reviewed locale route files, sitemap URLs, hreflang coverage, LLM coverage, and planned-locale exclusion.

Verification:

| Check | Result |
| --- | --- |
| `npm run verify:website-resource-locales` | Passed: `Website resource locale packs verified: hi-IN` |
| `npx tsc --noEmit --incremental false` | Passed |
| `npm run verify:agent-readiness` | Passed: `Agent-readiness discovery surfaces verified` |
| `npm run lint` | Passed: no ESLint warnings or errors |
| `git diff --check` | Passed |
| `/hi-IN/resources` local smoke | `200`, Hindi hub content, Hindi footer copy, localized resource links, JSON-LD `inLanguage`, and alternate metadata present |
| `/hi-IN/resources/menu-source-audit` local smoke | `200`, Hindi article heading/section content, localized related links, JSON-LD `inLanguage`, and alternate metadata present |
| Mobile Hindi article smoke | iPhone Safari user-agent returned `200` with Hindi article content |
| Former `/ta-IN/resources` unpublished-locale guard | Rendered not-found body with `noindex`; local streamed App Router response may return `200` even when `notFound()` is used. Superseded by the Indian Resource Pack Rollout. |

`dynamicParams = false` is not used for the locale-prefixed resource routes for the same local-dev stability reason documented above for default resource routes. The route layer instead uses `generateStaticParams()` for reviewed locale/slugs, explicit `notFound()` guards for non-reviewed locales or unknown slugs, and verifier checks to keep planned locales out of sitemap, hreflang, and LLM context.

---

## Indian Resource Pack Rollout

**Date:** June 1, 2026

Additional localization implementation:

- Added reviewed full resource packs for `ta-IN`, `te-IN`, `mr-IN`, and `bn-IN`.
- Registered the new packs in `src/content/websiteResources/locales/index.ts` and `src/content/websiteResources/index.ts`.
- Exposed reviewed Tamil, Telugu, Marathi, and Bengali resource URLs through the existing `/{locale}/resources` route layer.
- Updated sitemap, `hreflang`, `llms.txt`, and `llms-full.txt` discovery coverage.
- Updated the resources hub secondary CTA so locale-prefixed hubs link to locale-prefixed resource articles.
- Updated the website language switcher so resource readers navigate to the matching locale-prefixed resource URL, or back to the English `/resources` URL when English/non-reviewed fallback locales are selected.
- Updated `verify:agent-readiness` so planned-locale exclusion and reviewed-locale hreflang checks derive from the current resource locale registry.

Verification:

| Check | Result |
| --- | --- |
| `npm run verify:website-resource-locales` | Passed: `Website resource locale packs verified: hi-IN, ta-IN, te-IN, mr-IN, bn-IN` |
| `npm run verify:agent-readiness` | Passed: `Agent-readiness discovery surfaces verified` |
| `npx tsc --noEmit --incremental false` | Passed |
| `npm run lint` | Passed: no ESLint warnings or errors |
| `git diff --check` | Passed |
| `/ta-IN/resources` local smoke | `200`, Tamil script content, localized article link, and JSON-LD `inLanguage` present |
| `/te-IN/resources/menu-source-audit` local smoke | `200`, Telugu script content and JSON-LD `inLanguage` present |
| `/mr-IN/resources/menu-update-checklist` local smoke | `200`, Devanagari Marathi content and JSON-LD `inLanguage` present |
| `/bn-IN/resources/qr-menu-for-restaurants` local smoke | `200`, Bengali script content and JSON-LD `inLanguage` present |
| `/sitemap.xml` local smoke | Reviewed Tamil, Telugu, Marathi, and Bengali resource hubs plus `hreflang` alternates present |

Native-market wording polish can still improve tone later, but these packs are complete, source-version aligned, protected-term checked, discovery-registered, and verifier-reviewed. Future language additions should follow the same route/discovery/verifier gate before public SEO/AEO exposure.

---

## Full Website Resource Locale Coverage

**Date:** June 1, 2026

Additional localization implementation:

- Added reviewed full resource packs for `ar-SA` and `es-ES`.
- Registered Arabic and Spanish in `src/content/websiteResources/locales/index.ts`, `src/content/websiteResources/index.ts`, and `src/content/websiteResources/routing.ts`.
- Updated the localized resource layout to load all active website locale JSON files, not only Hindi, and to apply RTL direction for Arabic.
- Regenerated `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt` so Arabic and Spanish resource URLs are discoverable.
- Extended `npm run verify:website-resource-locales` so reviewed resource packs must cover every active non-default public website language.
- Pinned the unprefixed `/resources` and `/resources/[slug]` routes to the English website locale boundary so visitor locale cookies cannot change canonical English resource content.
- Extended `npm run verify:website-resource-locales` to fail if default resource routes import `next-intl/server` locale state instead of using the default resource locale boundary.

Verification:

| Check | Result |
| --- | --- |
| `npm run verify:website-resource-locales` | Passed: `Website resource locale packs verified: hi-IN, ta-IN, te-IN, mr-IN, bn-IN, ar-SA, es-ES` |
| `npm run verify:agent-readiness` | Passed: `Agent-readiness discovery surfaces verified` |
| `/ar-SA/resources/menu-source-audit` local smoke | `200`, Arabic script content, RTL wrapper, and JSON-LD `inLanguage` present |
| `/es-ES/resources/menu-source-audit` local smoke | `200`, Spanish content and JSON-LD `inLanguage` present |

## Chrome App Cross-Check

**Date:** June 2, 2026

Chrome extension verification covered all public resource route variants after the full locale rollout:

- 104 resource URLs checked in Chrome: English hub + 12 English articles, plus 7 localized hubs and 84 localized article routes.
- Every checked URL had a non-empty heading, no not-found/application-error body, matching JSON-LD `inLanguage`, canonical metadata, self `hreflang`, at least eight alternate entries, and locale-script content.
- Arabic routes rendered inside an RTL wrapper.
- Footer language switching was exercised by actual Chrome clicks across English, Spanish, and Arabic article URLs: `/resources/menu-source-audit` -> `/es-ES/resources/menu-source-audit` -> `/ar-SA/resources/menu-source-audit` -> `/resources/menu-source-audit`.
- Final post-fix Chrome route sweep passed with 104 checked URLs and 0 failures.
- Chrome exposed and the implementation fixed a deterministic URL issue where the unprefixed English resource route could inherit the visitor locale cookie.
- Chrome also exposed and the implementation fixed a footer dropdown hit-area issue where the final language option could be partially clipped when the menu opened upward.

---

## Deployment Status

- Vercel deploy was not run.
- Firebase deploy was not needed because no Firebase rules, indexes, Storage rules, or Cloud Function logic changed.
- `npm run build` was not run; this pass used TypeScript, lint, discovery verification, and local route smoke checks.
