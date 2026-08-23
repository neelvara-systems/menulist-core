# Print Menu Surfaces Test Cases

**Status:** Active
**Last Updated:** June 4, 2026

## Static Verification

| Test | Expected |
| --- | --- |
| `npm run verify:menu-card-export` | Passes and checks Print Menu Surfaces ownership. |
| TypeScript | `npx tsc --noEmit --incremental false` passes. |
| Targeted lint | Touched renderer and verifier files pass. |

## Visual QA

| Case | Expected |
| --- | --- |
| Food business with long name | Name fits/truncates inside face; no overflow. |
| Mustard/gold brand color | CTA/accent uses brand color; QR remains black. |
| Missing logo | Store name still renders cleanly. |
| Multi-location plan | Visible MenuList attribution is hidden. |
| Non-Multi-location plan | MenuList attribution is visible and centered. |
| Single table/counter card | Renders upright as one A6 portrait page with no rotated face. |
| Printed sample | QR scans from normal table distance. |

## Regression Guards

- Table tent must not move back into Menu Kit layout ownership.
- Single table/counter card must stay in Print Menu Surfaces ownership.
- QR margin must remain four modules for table print.
- A6 standing face must remain portrait.
