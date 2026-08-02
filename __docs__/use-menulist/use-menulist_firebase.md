# Use MenuList - Firebase Cost Analysis

**Version:** 1.6
**Last Updated:** June 29, 2026

## Cost Impact

Use MenuList remains a UI aggregation layer with no hub-owned backend and no hub-owned collection. It is not zero-read: desktop currently performs bounded reads to existing read models.

Menu Card Export, Printable Asset Templates, Digital Screens, and Feedback own their own deeper persistence/cost contracts when the owner opens those workflows.

## Desktop Reads

| Data | Source | Reads | Notes |
| --- | --- | ---: | --- |
| Store details | Platform provider / already-loaded store context | 0 | No extra Firestore read by the hub. |
| Project summaries | `platformSummary/projects_{sId}` via `getExistingProjectsListWithoutLoader(true)` | 1 | No auto-create write. Empty state stays empty. |
| Screen state | `platformSummary/campaigns_{sId}` via `getScreenState()` | 1 | Used for links plus exact-version Menu Board/Highlights status. |
| Full selected project | `projects/{tId}/{sId}/{projectId}` | 0-1 on tap | Only for PDF fallback/export paths that need full item data. |

Expected desktop page load: 2 Firestore reads when screen state is checked and project summaries are not already cached by the app layer.

The explicit **Refresh TV status** action performs one additional authorized
`getScreenState()` read. It does not poll and creates no write.

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
| Copy/open/download local assets | 0 | Clipboard API/acknowledged textarea fallback, browser Blob, Canvas, and jsPDF paths only. |
| Refresh TV status | 0 writes; 1 read | Owner-triggered canonical screen-state refresh only. |
| Starter activation signal | 0-1 | Existing store signal write, only when the starter-activation policy allows and only once per signal. |
| Child workflow actions | Feature-owned | Menu Card Export, Feedback, Digital Screens, POS, and Print Assets document their own writes. |

## Collections Read

| Collection/doc | Purpose |
| --- | --- |
| `platformSummary/projects_{sId}` | Project selection, direct menu links, feedback links, QR targets. |
| `platformSummary/campaigns_{sId}` | Digital screen token, current content version, and per-mode open receipts. |

## August 1, 2026 Exact-Version Screen Status

Desktop Use MenuList now reads `contentVersion` and `screenSeenByMode` from the
same existing screen-state response. Menu Board and Highlights are evaluated
independently; the legacy aggregate timestamp is not used for owner-facing
status. `use_menulist_screen_status_refresh_failed` records bounded failure
context if the explicit refresh fails while preserving the last truthful state.
| `projects/{tId}/{sId}/{projectId}` | On-demand full data for PDF/export fallback only. |

## June 11, 2026 Audit Fix

Desktop Use MenuList now uses `getExistingProjectsListWithoutLoader(true)` instead of `getProjectsList(true)`. Loading the output hub no longer creates a default project for stores with no menu.

This preserves the product boundary: read-only output surfaces should not create public menu truth.

## June 27, 2026 Diagnostic Hardening

Desktop Use MenuList now logs failed load, copy, Menu Kit, QR, PDF, feedback QR, and starter activation signal paths through bounded secure diagnostics. Page-level copied feedback and copy-driven starter activation signals wait for Clipboard API or acknowledged textarea fallback success; failed copy diagnostics may record clipboard/fallback support booleans.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. Valid page-load reads and existing starter activation signal writes are unchanged.

## June 29, 2026 Presence Monitor External Link Hardening

Desktop and mobile Presence Monitor guide buttons now open Google Business and Instagram URLs with `noopener,noreferrer` and log blocked/thrown external opens through bounded diagnostics: `use_menulist_presence_external_open_failed` on desktop and `mobile_presence_external_open_failed` on mobile. Logged context may include store/tenant/project/link/surface/open-URL presence-length metadata only, not raw official links, external URLs, owner-entered values, store records, or browser exceptions.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. Valid official-link copy, placement confirm/remove writes, and starter activation signal writes are unchanged.

## June 29, 2026 Desktop Screen-Link Diagnostic Hardening

Desktop Use MenuList now logs failed `getScreenState()` reads through `use_menulist_screen_links_load_failed` with bounded store/tenant, project, subdomain, OBP-link, menu-link, and custom-domain presence/length metadata only. The existing fallback remains: Menu Board and Highlights links are omitted when screen state is unavailable, while every non-screen output remains usable.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. The existing screen-state read is unchanged.

## June 29, 2026 Direct Output Open Hardening

Desktop Use MenuList now logs blocked selected-menu, Menu Board, and Highlights open actions through `use_menulist_open_failed` with bounded output context plus URL/label presence-length metadata only. Direct output opens use `noopener,noreferrer`.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. Direct opens remain browser-local owner actions.

## June 29, 2026 Share Card Diagnostic Hardening

Desktop share cards now log failed link copy, message copy, WhatsApp handoff, and direct-open paths through `share_link_card_copy_failed`, `share_link_card_copy_message_failed`, `share_link_card_whatsapp_open_failed`, and `share_link_card_open_failed` with bounded card/caller/link/message-length metadata only. Copied feedback waits for Clipboard API or acknowledged textarea fallback success; failed copy diagnostics may record clipboard/fallback support booleans. WhatsApp and direct opens use `noopener,noreferrer`; failed WhatsApp opens may record generated URL length but not the raw URL or message body.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. Clipboard writes and browser handoffs remain owner-initiated local actions.

## June 29, 2026 Desktop Communication Kit Diagnostic Hardening

Desktop Communication Kit now logs failed generated-message copy and blocked WhatsApp handoff paths through `use_menulist_communication_kit_copy_failed` and `use_menulist_communication_kit_whatsapp_open_failed` with bounded parent output, template, generated-message length, generated WhatsApp URL length, and clipboard/fallback support metadata only. Copied feedback waits for Clipboard API or acknowledged textarea fallback success; rejected Clipboard API writes fall through to the acknowledged fallback when it is available. WhatsApp opens use `noopener,noreferrer`.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. Message generation, clipboard writes, and WhatsApp handoff remain browser-local owner actions.

## June 29, 2026 Mobile QR Diagnostic Hardening

The shared mobile QR sheet now logs failed QR generation, clipboard copy, and download setup paths through bounded mobile owner diagnostics for Mobile Share, Feedback, Official Page, Design, and Project Selector QR flows.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. QR generation and download remain browser-local owner actions.

## June 29, 2026 Mobile Communication Kit Diagnostic Hardening

The mobile Communication Kit now logs failed generated-message copy, native share, and WhatsApp handoff paths through bounded mobile owner diagnostics. WhatsApp opens use `noopener,noreferrer` and failed opens log generated URL length only.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. Message generation remains browser-local and share/copy actions remain owner-initiated.

## June 29, 2026 Presence Monitor Diagnostic Hardening

Desktop and mobile Presence Monitor now log failed official-link copy, surface confirm, and surface remove actions through bounded diagnostics. Official-link copied feedback waits for Clipboard API or acknowledged textarea fallback success; failed copy diagnostics may record clipboard/fallback support booleans only in addition to existing bounded context.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. Successful confirm/remove actions still use the existing `updateMenuPresence()` store write.
