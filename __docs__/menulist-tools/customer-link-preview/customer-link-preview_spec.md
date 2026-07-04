# One Customer Link Preview - Specification

**Status:** Implemented V0 public tool; V1 maps to existing MenuList owner readiness surfaces
**Last Updated:** July 4, 2026
**Owner Job:** "Show me whether one link has the facts customers need before I share it."

## Purpose

One Customer Link Preview turns the core MenuList promise into a small public tool:

```txt
one current customer link -> visible customer facts -> MenuList fix path
```

The tool is useful for restaurants, salons, clinics, services, retail shops, agencies, and local SMBs that currently spread customer facts across old PDFs, social bios, Google profiles, screenshots, chat messages, and website pages.

## V0 Public Tool

V0 accepts owner-entered fields only:

- business name
- city or area
- business type
- current or planned customer link
- owner-selected visible facts

The report returns:

- overall status
- local preview facts
- 11 check rows
- one next action into MenuList
- copy/download report
- optional consented contact handoff

Every row includes `evidenceText` that says what was actually checked.

## Checks

| Check | Required | Source |
| --- | --- | --- |
| Customer link present | Yes | Owner-entered URL format only |
| Business identity | Yes | Owner-entered name/area and selected fact |
| Menu or service summary | Yes | Owner-selected visible fact |
| Prices or rates | No | Owner-selected visible fact |
| Hours | No | Owner-selected visible fact |
| Location or service area | No | Owner-selected visible fact |
| Contact path | Yes | Owner-selected visible fact |
| Customer action | Yes | Owner-selected visible fact |
| Visual identity | No | Owner-selected visible fact |
| Mobile readability | No | Owner-selected visible fact |
| External link inspection | No | Always not checked in V0 |

## Non-Goals

V0 does not open links, fetch customer pages, inspect websites, inspect Google profiles, inspect social profiles, verify link content, check uptime, store reports, call AI providers, scan search results, promise rankings, promise citations, or update external platforms.

## V1 Owner Mapping

The logged-in owner experience does not need a duplicate module. MenuList already has owner readiness modules for public truth basics, menu/service clarity, QR link health, WhatsApp action links, hours readiness, photo identity, booking/inquiry readiness, price availability, and Google profile handoff.

V1 should route owners into the existing Business Health/Public Discovery and public page readiness surfaces.

## V2 Add-On Lane

Paid behavior is only justified when recurrence or scale creates value:

- recurring customer-link readiness checks
- saved history
- monthly link readiness report
- multi-location link preview export
- agency/client setup report
- owner-approved managed setup

V2 remains documented only.
