# CampaignCue Route Boundary

## Rule

`src/app/sites/campaigncue` is public website only.

Do not add owner dashboard pages under `src/app/sites/campaigncue`. That folder should contain public marketing, discovery, robots, sitemap, legal, and other unauthenticated product-website pages only.

CampaignCue owner workspace routes live under the product app route group:

- `src/app/(campaigncue)/campaigncue/page.tsx`
- `src/app/(campaigncue)/campaigncue/app/page.tsx`
- Future owner workspace routes: `src/app/(campaigncue)/campaigncue/{section}/page.tsx`

This mirrors the Answerlattice pattern where public website files live under `src/app/sites/answerlattice` and owner/product dashboard files live under `src/app/(answerlattice)/answerlattice`.

## URL Mapping

| External/local URL | Internal route | Surface |
| --- | --- | --- |
| `campaigncue.ai/` | `/sites/campaigncue` | Public website |
| `campaigncue.ai/app` | `/campaigncue/app` | Owner workspace |
| `campaigncue.ai/app/{section}` | `/campaigncue/app/{section}` | Owner workspace (deep links) |
| `localhost:3000/__campaigncue` | `/sites/campaigncue` | Public website |
| `localhost:3000/__campaigncue/app` | `/campaigncue/app` | Owner workspace |
| `localhost:3000/__campaigncue/app/{section}` | `/campaigncue/app/{section}` | Owner workspace (deep links) |
| `localhost:3000/campaigncue/app` | `/campaigncue/app` | Direct internal workspace route |
| `localhost:3000/campaigncue/app/{section}` | `/campaigncue/app/{section}` | Direct internal workspace deep link |

`src/middleware.ts` owns this mapping through CampaignCue route helpers from `src/constants/campaigncue/domains.ts`.

## Guardrails

- Public website pages must not import CampaignCue owner workspace components.
- Owner workspace pages must not be created below `src/app/sites/campaigncue`.
- Product-domain `/app` and deep links like `/app/{section}` must map to `/campaigncue/app` and `/campaigncue/app/{section}`, not `/sites/campaigncue/app*`.
- Local `/__campaigncue/app` and deep links like `/__campaigncue/app/{section}` must map to `/campaigncue/app` and `/campaigncue/app/{section}`, not `/sites/campaigncue/app*`.
- Local dev product prefixes must match the exact prefix or a slash-boundary child path. `/__campaigncue` and `/__campaigncue/app` are valid; `/__campaigncuex` must not match CampaignCue.
- CampaignCue APIs stay under `src/app/api/campaigncue`.
- `/api/*` and other internal bypass paths pass through before CampaignCue product-domain rewrites, so `campaigncue.ai/api/campaigncue/*` reaches the API layer instead of `/sites/campaigncue`.
- CampaignCue product constants stay under `src/constants/campaigncue`.
- The verifier must fail if `src/app/sites/campaigncue/app` exists.

## Validation

`npm run verify:campaigncue` checks the route split, middleware rewrite helpers, product-domain API pass-through, exact local prefix matching, docs, and the absence of the old `src/app/sites/campaigncue/app` path.
