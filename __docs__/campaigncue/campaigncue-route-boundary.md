# CampaignCue Route Boundary

## Rule

`src/app/sites/campaigncue` is public website only.

Do not add owner dashboard pages under `src/app/sites/campaigncue`. That folder should contain public marketing, discovery, feature pages, robots, sitemap, legal, and other unauthenticated product-website pages only.

Dedicated public feature pages live at `src/app/sites/campaigncue/features/[featureSlug]/page.tsx`. They explain product workflows with static previews only.

Dedicated public use-case pages live under `src/app/sites/campaigncue/use-cases/*`. They explain audience-specific journeys with static product previews only.

CampaignCue owner workspace routes live under the product app route group:

- `src/app/(campaigncue)/campaigncue/page.tsx`
- `src/app/(campaigncue)/campaigncue/app/page.tsx`
- Future owner workspace routes: `src/app/(campaigncue)/campaigncue/{section}/page.tsx`

This mirrors the Answerlattice pattern where public website files live under `src/app/sites/answerlattice` and owner/product dashboard files live under `src/app/(answerlattice)/answerlattice`.

## URL Mapping

| External/local URL | Internal route | Surface |
| --- | --- | --- |
| `campaigncue.ai/` | `/sites/campaigncue` | Public website |
| `campaigncue.ai/features/{featureSlug}` | `/sites/campaigncue/features/{featureSlug}` | Public feature page |
| `campaigncue.ai/use-cases/small-business` | `/sites/campaigncue/use-cases/small-business` | Public use-case page |
| `campaigncue.ai/app` | `/campaigncue/app` | Owner workspace |
| `campaigncue.ai/app/{section}` | `/campaigncue/app/{section}` | Owner workspace (deep links) |
| `localhost:3000/__campaigncue` | `/sites/campaigncue` | Public website |
| `localhost:3000/__campaigncue/features/{featureSlug}` | `/sites/campaigncue/features/{featureSlug}` | Public feature page |
| `localhost:3000/__campaigncue/use-cases/small-business` | `/sites/campaigncue/use-cases/small-business` | Public use-case page |
| `localhost:3000/__campaigncue/app` | `/campaigncue/app` | Owner workspace |
| `localhost:3000/__campaigncue/app/{section}` | `/campaigncue/app/{section}` | Owner workspace (deep links) |
| `localhost:3000/campaigncue/app` | `/campaigncue/app` | Direct internal workspace route |
| `localhost:3000/campaigncue/app/{section}` | `/campaigncue/app/{section}` | Direct internal workspace deep link |

`src/middleware.ts` owns this mapping through CampaignCue route helpers from `src/constants/campaigncue/domains.ts`.

## Guardrails

- Public website pages must not import CampaignCue owner workspace components.
- Public feature pages may show static dashboard/editor previews, but those previews are website content only and must not import owner app state, hooks, APIs, or workspace components.
- Public use-case pages may show static dashboard/editor previews, but those previews are website content only and must not import owner app state, hooks, APIs, or workspace components.
- Owner workspace pages must not be created below `src/app/sites/campaigncue`.
- Product-domain `/app` and deep links like `/app/{section}` must map to `/campaigncue/app` and `/campaigncue/app/{section}`, not `/sites/campaigncue/app*`.
- Local `/__campaigncue/app` and deep links like `/__campaigncue/app/{section}` must map to `/campaigncue/app` and `/campaigncue/app/{section}`, not `/sites/campaigncue/app*`.
- Public feature paths are allowlisted. Unknown CampaignCue paths under `/features/*` must return `404` before middleware rewrites them into `src/app/sites/campaigncue/features/[featureSlug]`.
- Public feature pages are request-rendered because they read the product base-path header for local/product-domain links. Do not force `generateStaticParams` or `dynamicParams = false` on this route; the middleware allowlist and page-level `notFound()` are the slug safety contract.
- Local dev product prefixes must match the exact prefix or a slash-boundary child path. `/__campaigncue` and `/__campaigncue/app` are valid; `/__campaigncuex` must not match CampaignCue.
- CampaignCue APIs stay under `src/app/api/campaigncue`.
- `/api/*` and other internal bypass paths pass through before CampaignCue product-domain rewrites, so `campaigncue.ai/api/campaigncue/*` reaches the API layer instead of `/sites/campaigncue`.
- CampaignCue product constants stay under `src/constants/campaigncue`.
- Public feature-page data stays under `src/constants/campaigncue/websiteFeatures.ts`; public use-case page data stays under `src/constants/campaigncue/websiteUseCases.ts`; homepage links, metadata, and sitemap entries should derive from product-scoped sources instead of scattered literals.
- The verifier must fail if `src/app/sites/campaigncue/app` exists.

## Validation

`npm run verify:campaigncue` checks the route split, middleware rewrite helpers, product-domain API pass-through, exact local prefix matching, public feature pages, docs, sitemap inclusion, and the absence of the old `src/app/sites/campaigncue/app` path.
