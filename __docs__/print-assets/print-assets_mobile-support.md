# Print Assets Mobile Support

**Status:** Implemented
**Last Updated:** June 4, 2026

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners commonly need print files while setting up tables/counters or replacing damaged cards. |
| Speed | Pass | One tap downloads an existing client-generated file. |
| Touch | Pass | Asset cards are large touch targets. |
| Value | Pass | Owners often send files to printers or staff from their phone. |

## Mobile Contract

- Mobile route `/use-menulist/print-assets` stays inside `MobileShell`.
- More tab opens `printAssets` sub-screen.
- Share tab opens Print Assets through shell state, not `window.location`.
- Mobile uses `MobileShareScreen` download handlers in focused mode.
- Mobile and desktop use the same `generateMenuKit()` bundle output.
- Mobile and desktop use the same `generateMenuKitAsset()` semantic-key output for individual downloads and previews.
- Readiness, print-shop handoff, and reprint guidance come from shared print-assets helpers.
- Preview opens inside the mobile screen popup first, with Open Full Preview and Download actions.

## Non-Goals

- No mobile-only print layout.
- No mobile-only data loading path.
- No desktop route bypass from mobile tabs.
- No print quantity estimator.
