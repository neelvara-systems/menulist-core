# Owner Business Assistant Implementation

**Owner-Facing Name:** Business Health
**Status:** Implemented read-only runtime
**Last Updated:** June 17, 2026

## Implementation Contract

Business Health implements read-only health, analytics, and grounded answers. It does not implement owner actions. Menu, image, theme, publish, special-menu, store, outlet, staff, billing, and external work belong to AI Menu Manager / Menu Manager.

## Feature Flags

The active Business Health flags live in:

- `src/config/features.ts`
- `functions/src/constants/features.ts`

The implementation must include flags for:

- core Business Health visibility
- mobile visibility
- provider-backed answers
- thread/history behavior
- feedback/answer event logging
- platform monitor visibility
- Upstash/server packet cache where configured

The implementation must not include Business Health operation flags.

## API Routes

Active routes:

- `GET /api/owner-business-assistant/current`
- `GET /api/owner-business-assistant/analytics`
- `POST /api/owner-business-assistant/answer`
- `GET /api/owner-business-assistant/locations`
- session/thread routes where the thread flag is enabled
- feedback routes where feedback logging is enabled
- `GET /api/platform/owner-business-assistant/monitor`

Removed route class:

- Business Health operation execution route

Route requirements:

- authenticate the owner session
- validate tenant/store/project access
- validate payloads with schemas before reads/provider calls
- rate-limit provider-backed answers before model calls
- keep errors generic
- avoid sensitive logs
- keep read/write metrics compact

## Server Library

Active server pieces:

- context packet builder
- context packet cache and invalidation
- answer resolver and deterministic fallbacks
- domain capability matrix
- refusals and analytics-period resolver
- thread store
- answer event logger
- feedback handling

Removed server pieces:

- operation registry
- operation access
- operation executor
- operation schemas
- operation target resolver
- operation draft builder
- public-truth operation guard
- check workflow service

## Types and Schemas

Business Health answer artifacts are read-only. Supported artifacts include text, metrics, tables, trend series, and source/freshness information.

Types and schemas must not expose:

- operation definition types
- operation-option artifacts
- operation catalogs
- operation target kinds
- operation request payloads

## Desktop UI

Desktop surfaces:

- owner dashboard Business Health card
- Business Health analytics strip
- full `/business-health` route
- project scope selector
- location summary
- question composer
- read-only priority checks
- source/freshness disclosure

Removed desktop surface:

- Business Health operation sheet

Priority checks can show what to inspect, but not Open/Reviewed/Dismiss action controls.

## Mobile UI

Mobile surfaces:

- MobileShell More entry
- MobileShell Business Health sub-screen
- mobile project selector
- mobile analytics strip
- mobile question composer
- read-only checks and answers

Removed mobile surface:

- Business Health operation sheet

Mobile Business Health must stay inside `MobileShell` and must not route-bypass to desktop.

## Firestore and Storage

Active collections are compact read/monitoring collections only. Removed workflow collections:

- Business Health operation records
- Business Health operation drafts

Business Health must not store generated media or base64 payloads. Heavy artifacts are not part of the current Business Health runtime.

## Platform Monitor

The platform monitor can show:

- answer events
- unsupported domains
- source coverage
- feedback
- route read/write metrics
- provider cost where available

The platform monitor must not show operation usage or recent operation records.

## Verification

`npm run verify:owner-business-assistant` must prove:

- operation support files remain removed
- operation endpoint is absent from constants
- operation flags are absent
- operation schemas/types are absent
- desktop/mobile operation sheets are absent
- context packets do not include an operation catalog
- Business Health remains cache-first and bounded
