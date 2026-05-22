# Product Surface Contexts Firebase Notes

## Collections

### `canonica_productSurfaces`

Purpose: owner-managed product surface map.

Operations:

- list surfaces for current Canonica tenant/store: one bounded query, limit 300
- create/update/archive surface: one document write

Security:

- tenant scoped through `pId`, `tId`, and `sId`
- readable/writable by platform users or tenant users with write role
- hard delete is not used; surfaces are archived with `active: false`

### `platformSummary/contextContent_{tId}_{sId}`

Purpose: compact read model for runtime related content.

Operations:

- runtime search/widget: one small read, server-memory cached
- rebuild: one write

Contents:

- surface metadata
- compact article refs
- compact FAQ refs
- compact changelog refs
- ticket counts only

Public runtime must not expose ticket subjects, messages, requester data, or internal notes.

## Rebuild Reads

The summary rebuild endpoint uses bounded reads:

- product surfaces: max 300
- published KB articles: max 500
- published FAQs: max 500
- latest changelog pages: max 3 pages
- recent support tickets: max 300

The rebuild happens on explicit management operations, not every customer page load.

## Indexes

Required composite indexes:

- `canonica_productSurfaces`: `tId`, `sId`, `active`, `priority`
- `canonica_productSurfaces`: `tId`, `sId`, `key`

## Cost Impact

Runtime cost stays low because the widget/search flow reads one compact summary instead of querying articles, FAQs, changelogs, and tickets by tag on every request.

The heavier scan is moved to owner save/manual rebuild time where freshness matters and frequency is low.
