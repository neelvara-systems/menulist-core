# Social Bio Link Consistency Check - Specification

**Status:** Implemented V0 public tool; V1 maps to existing MenuList owner readiness surfaces
**Last Updated:** July 4, 2026
**Owner Job:** "Show me whether all the places customers find me point to the same current link."

## Purpose

Social Bio Link Consistency Check turns a common SMB setup problem into a MenuList fix path:

```txt
social/profile/QR/print links -> one current customer link -> MenuList truth layer
```

Owners often update one channel and forget another. Instagram may point to an old PDF, WhatsApp may show a different link, Google may use a website that has stale menu details, and printed QR cards may still lead to an old source. This tool makes that inconsistency visible without claiming to inspect those external platforms.

## V0 Public Tool

V0 accepts owner-entered fields only:

- business name
- city or area
- current customer link
- owner-selected placement facts
- owner-selected cleanup and customer-action facts

The report returns:

- overall status
- local placement summary
- 10 check rows
- one next action into MenuList
- copy/download report
- optional consented contact handoff

Every row includes `evidenceText` that says what was actually checked.

## Checks

| Check | Required | Source |
| --- | --- | --- |
| Current customer link | Yes | Owner-entered URL format only |
| Instagram bio link | No | Owner-selected placement fact |
| Facebook page link | No | Owner-selected placement fact |
| WhatsApp Business profile link | No | Owner-selected placement fact |
| Google profile link | No | Owner-selected placement fact |
| Website or landing page link | No | Owner-selected placement fact |
| QR and print links | No | Owner-selected placement fact |
| Old link cleanup | No | Owner-selected cleanup fact |
| Customer action | Yes | Owner-selected action fact |
| External social inspection | No | Always not checked in V0 |

## Non-Goals

V0 does not open social profiles, fetch social profiles, inspect websites, inspect Google profiles, inspect QR destinations, inspect print materials, verify external link content, store reports, call AI providers, scan search results, promise rankings, promise citations, or update external platforms.

## V1 Owner Mapping

The logged-in owner experience does not need a duplicate module. MenuList already has Share, QR, Public Discovery, Official Business Page, and Business Health surfaces that know the current customer link and the owner's canonical public facts.

V1 should route owners into:

- Share and QR readiness when the current link is missing or stale
- Public Discovery when the public customer source is incomplete
- Business Health when customer action, hours, menu/service clarity, photos, or contact facts are missing

## V2 Add-On Lane

Paid behavior is only justified when recurrence or scale creates value:

- recurring social/profile link placement checks
- saved history
- monthly profile-link consistency report
- multi-location link placement report
- agency/client setup export
- owner-approved managed cleanup

V2 remains documented only.
