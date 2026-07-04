# Public Truth Monitor Add-On - Spec

**Last Updated:** July 4, 2026
**Status:** V2 paid saved-history runtime implemented

---

## Product Job

Help an owner, agency, or multi-location operator keep public business truth from drifting after initial setup.

The paid value is:

- saved history
- monthly report
- agency/client export
- recurring checks when scheduler mode is explicitly enabled later
- multi-location comparison when scoped runtime is explicitly added later
- owner-approved setup or repair work when a managed workflow is explicitly added later

It is not a stronger one-time score.

## Users

| User | Need |
| --- | --- |
| Serious single-location owner | A monthly reminder when public facts need review |
| Multi-location owner | Compare link, hours, action, photo, price, and menu/service readiness across locations |
| Agency or partner | Export a client-ready setup/readiness report |
| MenuList operations | See owner-approved repair tasks without scraping or mutating external platforms |

## Included Checks

V2 may reuse V1 owner modules:

- Public truth basics
- Business facts copy pack
- QR link health
- Social bio link consistency
- Customer link preview
- Print and share assets
- Menu or service clarity
- Price and availability clarity
- PDF cleanup readiness
- WhatsApp action link
- WhatsApp reply pack
- Hours readiness
- Photo and visual identity
- Customer question coverage
- Customer FAQ reply pack
- Booking and inquiry readiness
- Google profile handoff
- Menu freshness

## Non-Goals

- generic SEO audit
- AI visibility score
- ranking/citation promise
- external platform mutation
- social posting
- review manipulation
- WhatsApp automation
- per-scan QR analytics
- unbounded report archive
- broad crawling

## Implemented Runtime

1. Paid entitlement and plan placement: Pro/Premium by default.
2. Report-history retention cap: maximum 6 reports per store.
3. Summary storage: `platformSummary/publicTruthMonitor_{storeId}`.
4. Owner refresh: authenticated and tenant-verified.
5. Report export: browser-local text file from saved summary/history.
6. Mobile: compact Business Health card inside `MobileShell`.

## Not Enabled

1. Background scheduler cadence.
2. Multi-location comparison runtime.
3. Email delivery.
4. Managed repair workflow.
5. External adapter or AI/search sampling.

## Success Criteria

- Owners understand what changed since last check.
- Every gap maps to a MenuList fix path.
- Reports say exactly what was checked and not checked.
- History remains capped and paid-entitled.
- No public claim promises ranking, citations, revenue, visits, bookings, or external platform updates.
