# Print Assets Mobile Support

**Status:** Implemented
**Last Updated:** July 9, 2026

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

## Non-Goals

- No mobile-only print layout.
- No mobile-only data loading path.
- No desktop route bypass from mobile tabs.
- No print quantity estimator.
