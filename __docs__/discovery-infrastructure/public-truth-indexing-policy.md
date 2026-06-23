# Public Truth Indexing Policy

**Status:** Implemented  
**Last Updated:** June 23, 2026
**Owner:** Discovery infrastructure / customer-facing public surfaces  

---

## Purpose

MenuList public pages should be discoverable only when they are useful public truth objects.

The long-term strategy is not to publish many keyword pages. The strategy is to let real public business/menu pages carry long-tail customer intent because they contain current, visible, structured business facts.

Core rule:

> One durable page per real business, outlet, menu, or customer task. Never one page per keyword variation.

---

## What Changed

The runtime now has a central indexability gate:

- `src/lib/seo/publicTruthIndexing.ts`

This policy is used by:

- `src/app/client/[[...slug]]/page.tsx`
  - applies `index/follow` or `noindex/follow` metadata for public tenant pages
  - treats stale or deleted project/menu slug paths and stale item/category detail paths as `noindex, follow`
- `src/app/client/sitemap.ts`
  - keeps weak/incomplete public truth pages out of per-tenant sitemap output
- `src/app/client/obp/OBPResolvedSurface.tsx`
  - no longer emits hidden FAQ JSON-LD for OBP runtime pages

The OBP still emits business-record schema through:

- `src/app/client/obp/schema.ts`

The public menu still emits catalog/menu schema through:

- `src/app/client/[[...slug]]/page.tsx`

---

## Indexability Gate

### Base Public Eligibility

A public tenant page is not indexable when:

- the store is missing
- the store is inactive, deleted, blocked, or tenant-blocked
- the starter public surface is expired or archived
- the page has no public identity

These pages may still be reachable by customers when routing allows it, but they are not advertised in sitemap and receive `noindex, follow`.

### OBP / Outlet OBP

An Official Business Page or outlet business page is indexable only when it has:

- public identity, and
- at least two useful public facts from:
  - location
  - contact
  - hours
  - official/action links
  - published menu signal

This avoids indexing empty or weak business records.

### Menu Pages

A menu page is indexable only when:

- the store passes base public eligibility, and
- the menu/project is active, not deleted, not a special-menu draft, and has real public menu content.

When a requested project/menu slug no longer resolves, the customer page may still show the fallback ladder for old QR links or PWA entry points. That URL is not a new public truth page: metadata uses `noindex, follow`, and the canonical falls back to the tenant or outlet root instead of self-canonicalizing the stale path.

When a menu exists but a requested item/category detail path no longer resolves, the detail URL also uses `noindex, follow` and canonicalizes back to the current menu page. The menu remains indexable when it passes the public truth gate.

For sitemap generation, the policy uses project summary data already being read. It does not add full project reads just to decide sitemap inclusion.

---

## Sitemap Rule

Per-tenant sitemap output now follows the same policy:

- OBP root is included only if the OBP passes the public-facts gate.
- Canonical project slug URLs are included only if project summary data passes the menu gate.
- Outlet roots are included only if the outlet OBP passes the public-facts gate.
- Outlet menu URLs are included only if the outlet project summary passes the menu gate.
- `/menu` universal alias remains excluded from sitemap unless a real project owns that slug.
- Previous slugs remain excluded and redirect to the canonical URL.

This keeps sitemap as an indexable-public-truth inventory, not a raw route inventory.

---

## Metadata Rule

Public tenant metadata now uses the same gate:

| Page state | Metadata |
| --- | --- |
| Useful public truth page | `index, follow` |
| Expired starter or weak record | `noindex, follow` |
| Stale or missing project/menu slug with customer fallback ladder | `noindex, follow` |
| Stale or missing item/category detail URL under a real menu | `noindex, follow` |
| Missing store | `noindex, nofollow` |

The page can still render when routing allows it. The discovery signal is conservative.

---

## Schema Rule

The primary public business/menu schema stack is:

- `LocalBusiness` / most specific subtype such as `Restaurant`
- `PostalAddress`
- `GeoCoordinates`
- `OpeningHoursSpecification`
- `sameAs`
- `priceRange`
- `servesCuisine`
- `menu` / `hasMenu`
- `Menu`
- `MenuSection`
- `MenuItem`
- `BreadcrumbList`

OBP runtime no longer emits generated `FAQPage` JSON-LD. FAQ schema should be used only when FAQ content is visibly rendered on the same page and is reviewed as useful content.

This keeps structured data aligned with visible public content.

---

## What This Does Not Build

This policy does not create:

- a public restaurant directory
- unclaimed business pages
- city/category discovery pages
- keyword-variant pages
- AI-written restaurant pages
- fake price/hour pages
- ranking or AI visibility guarantees

Those would require separate product, data-quality, owner-claim, and legal review.

---

## Future Work That Still Needs A Separate Decision

Before MenuList creates any new public business-record surface beyond already-owned tenant pages, decide:

- whether unclaimed records can exist publicly
- what counts as owner-approved or verified
- how source/confidence state is shown
- how owners claim or correct a discovered record
- which geography and vertical should be used first
- how Search Console, owner outreach, and claim/update conversion are measured
- how stale prices, hours, and menu files are downgraded or suppressed

Until those decisions are documented and approved, MenuList should not create programmatic directory or keyword pages.
