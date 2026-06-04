# Print Menu Surfaces Mobile Support

**Status:** Supported through existing mobile Share flow
**Last Updated:** June 4, 2026

## Mobile Decision

**YES.** Owners often need to download or share print files from a phone after publishing or while at the business.

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners may download/reprint table cards after menu changes, damage, or new table setup. |
| Speed | Pass | Generation is one tap and completes locally. |
| Touch | Pass | Existing mobile Share tiles use large touch targets. |
| Value | Pass | Owners can send the file to a printer or staff from the phone. |

## Mobile Contract

- Mobile Share stays inside `MobileShell`.
- No desktop route bypass.
- No separate mobile renderer.
- Mobile and desktop use the same `generateMenuKit()` path, which consumes `generatePrintMenuTableTent()` and `generatePrintMenuSingleTableCard()`.
- Mobile inherits auth, selected project, store logo/color, plan type, and business type from existing providers.

## Output Parity

The table tent and single table/counter card downloaded from mobile must match the desktop outputs exactly. Only the delivery action differs: mobile can use Web Share API where available; otherwise it downloads the same Blob.
