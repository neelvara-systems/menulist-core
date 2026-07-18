# Physical Surfaces — Firebase Boundary

**Status:** Legacy read compatibility; no active writer
**Last Updated:** July 16, 2026

The legacy UI reads `platformSummary/campaigns_{sId}.physicalSurfaces` as part of the existing one-read Today summary. Current source has no writer that computes or persists this field, and `calculatePhysicalSurfaceEligibility()` has no runtime caller.

When legacy data already exists, tent-card/sticker generation runs in the browser with the existing shared QR/branding generators:

| Operation | Firestore | Storage | Functions |
| --- | --- | --- | --- |
| Today summary read | Included in the existing one-document Today read | 0 | 0 |
| Generate/download legacy card | 0 | 0 | 0 |

There is no active `generatePrintSurface` function, generated-print Storage path, artifact Firestore write, rule, or index. Do not revive the archived planned-storage model. Supported current physical identity output remains client-side in Menu Kit, Print Assets, Printable Asset Templates, Print Menu Surfaces, and Menu Card Export.
