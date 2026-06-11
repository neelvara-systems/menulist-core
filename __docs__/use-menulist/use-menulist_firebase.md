# Use MenuList - Firebase Cost Analysis

**Version:** 1.3
**Last Updated:** June 11, 2026

## Cost Impact

Use MenuList remains a UI aggregation layer with no hub-owned backend and no hub-owned collection. It is not zero-read: desktop currently performs bounded reads to existing read models.

Menu Card Export, Printable Asset Templates, Digital Screens, and Feedback own their own deeper persistence/cost contracts when the owner opens those workflows.

## Desktop Reads

| Data | Source | Reads | Notes |
| --- | --- | ---: | --- |
| Store details | Platform provider / already-loaded store context | 0 | No extra Firestore read by the hub. |
| Project summaries | `platformSummary/projects_{sId}` via `getExistingProjectsListWithoutLoader(true)` | 1 | No auto-create write. Empty state stays empty. |
| Screen state | `platformSummary/campaigns_{sId}` via `getScreenState()` | 1 | Used for Menu Board and Highlights links. |
| Full selected project | `projects/{tId}/{sId}/{projectId}` | 0-1 on tap | Only for PDF fallback/export paths that need full item data. |

Expected desktop page load: 2 Firestore reads when screen state is checked and project summaries are not already cached by the app layer.

## Mobile Reads

Mobile Share uses `MobileProjectsProvider` project state and the same screen-state DAL:

| Data | Reads | Notes |
| --- | ---: | --- |
| Project summaries | Usually already loaded by the mobile shell | The mobile provider may intentionally auto-create the first project when entering menu management, not when using read-only output actions. |
| Screen state | 1 | Same `getScreenState()` summary doc read. |
| Full selected project | 0-1 on tap | Only when PDF/export generation needs uncached full data. |

## Writes

| Action | Writes | Notes |
| --- | ---: | --- |
| Page load | 0 | Uses no-write project summary helper on desktop. |
| Copy/open/download local assets | 0 | Clipboard, browser Blob, Canvas, and jsPDF paths only. |
| Starter activation signal | 0-1 | Existing store signal write, only when the starter-activation policy allows and only once per signal. |
| Child workflow actions | Feature-owned | Menu Card Export, Feedback, Digital Screens, POS, and Print Assets document their own writes. |

## Collections Read

| Collection/doc | Purpose |
| --- | --- |
| `platformSummary/projects_{sId}` | Project selection, direct menu links, feedback links, QR targets. |
| `platformSummary/campaigns_{sId}` | Digital screen token and last-seen state. |
| `projects/{tId}/{sId}/{projectId}` | On-demand full data for PDF/export fallback only. |

## June 11, 2026 Audit Fix

Desktop Use MenuList now uses `getExistingProjectsListWithoutLoader(true)` instead of `getProjectsList(true)`. Loading the output hub no longer creates a default project for stores with no menu.

This preserves the product boundary: read-only output surfaces should not create public menu truth.
