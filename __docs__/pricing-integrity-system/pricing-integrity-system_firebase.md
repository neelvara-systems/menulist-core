# Pricing Integrity System - Firebase and Cost

**Status:** Current source/cost boundary, not current launch certification
**Last updated:** July 17, 2026

## Active operation ledger

| Operation | Active cost |
| --- | --- |
| Item/option edit through project update | Existing project write; price normalization is in memory |
| Project publish | Existing project write/transaction path; no price-specific document |
| Linked-outlet standard or override save | Existing route transaction/batch and entitlement checks; no new price read/write |
| Public menu/OBP invalidation | Existing `/api/revalidate/menu` request after successful mutation |
| Configured Digital Screens touch | Existing bounded `platformSummary/campaigns_{storeId}` version update where applicable |
| Public/menu/PDF/screen display projection | Uses already loaded project/screen data; no price-specific Firestore read |
| On-demand PDF | Browser-local generation and scoped local history; no job document |

The July 16 normalization, option-price projection, filters, quality summaries, and AI/bulk arithmetic fixes add zero Firestore reads, writes, deletes, collections, indexes, Storage objects, Cloud Functions, or scheduler tasks.

## Dormant operations

- `runPricingIntegrity()` is not called by project save/publish.
- `ENABLE_BACKGROUND_PDF_REGEN` is false.
- No current owner action writes a PDF regeneration job.
- Dormant MOL/PDF-integrity writes are not counted as active runtime cost.
- Browser writes to retired `projectsMetadata/{tId}/{sId}/{projectId}` and
  `projectsData/{tId}/{sId}/{projectId}` aliases are denied. They remain
  authenticated, exact tenant-and-store-scoped read-only compatibility surfaces;
  active menu truth writes use
  `projects/{tId}/{sId}/{projectId}` so validation, multi-location authority,
  public-cache invalidation, and publication effects cannot be bypassed.

There is no active background PDF queue cost.

## Scale boundary

Price validation is linear over the already loaded project mutation and does not fan out by tenant/store. Public and screen projections reuse bounded project/screen payloads. The implementation deliberately avoids a per-price ledger, observer, worker, or duplicate summary because existing project truth and cache/version propagation are sufficient.

The July 17 cost pass found no justified additional Firebase artifact. Project subcollections use store IDs as their terminal collection names, so a broad price-field collection-group index exemption is not available without changing the canonical project path. Adding a price mirror, summary, queue, or per-item document would increase writes and consistency risk for no active query benefit. Keep price truth inside the existing project mutation and add a new read model only if a measured bounded query cannot use the loaded project data.

## Deployment boundary

The July 28 data-flow audit closes browser writes to the two retired project
aliases in Firestore rules. Local rules-emulator proof is required, followed by
the scoped MenuList QA Firestore-rules deployment when operator authentication
is available. No index, Storage rule, Cloud Function, or app deployment is
required by that correction.

This document is not current launch certification. Release approval requires the production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/MobileShell checks, public menu and PDF artifact QA, configured-screen QA, target deploy evidence, and production-host smoke.
