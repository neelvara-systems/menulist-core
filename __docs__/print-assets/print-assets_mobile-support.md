# Print Assets Mobile Support

**Status:** Implemented
**Last Updated:** September 4, 2026

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners commonly need print files while setting up tables/counters or replacing damaged cards. |
| Speed | Pass | One tap downloads an existing client-generated file. |
| Touch | Pass | Asset cards are large touch targets. |
| Value | Pass | Owners often send files to printers or staff from their phone. |

## Mobile Contract

- Mobile routes `/assets` and `/use-menulist/print-assets` stay inside `MobileShell`.
- More tab shows `QR and print assets` and opens the `printAssets` sub-screen.
- Share tab opens Assets through shell state, not `window.location`.
- Assets opens Print Menu through `onOpenPrintMenu` shell callback, not route navigation.
- Menu tab opens Print Menu through `onOpenPrintMenu` shell callback after pending menu saves complete.
- Mobile uses `MobileShareScreen` download handlers in focused mode.
- Mobile and desktop use the same `generateMenuKit()` bundle output.
- Mobile and desktop use the same printable renderer for individual downloads and previews, including front/back business cards and ID cards.
- Readiness, print-shop handoff, and reprint guidance come from shared print-assets helpers.
- Preview appears inside the template bottom sheet first, with separate PDF/image download actions for single assets.
- The dashboard shows reusable business-profile readiness. Authorized owners can open a mobile sheet to update the canonical brand name, location name, logo, tagline, and applicable public contact fields without leaving Assets.
- A successful inline save updates shared store/tenant context and rebuilds the currently open asset preview from the acknowledged values. Unsaved edits require an explicit discard decision.

## Non-Goals

- No mobile-only print layout.
- No mobile-only data loading path.
- No desktop route bypass from mobile tabs.
- No print quantity estimator.
