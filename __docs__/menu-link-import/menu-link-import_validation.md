# Menu Link Import Validation

**Date:** May 25, 2026

## Completed Checks

- `npx tsc --noEmit` in `functions/` passed.
- `npx tsc --noEmit --incremental false` at repo root passed.
- Targeted lint passed for:
  - `src/app/api/menu-link-imports/route.ts`
  - `src/lib/menu-link-import/sourceAcquisition.ts`
  - `src/lib/menu-link-import/client.ts`
  - `src/lib/extraction/applyChanges.ts`
  - `src/lib/firebase/menuProcessing.ts`
  - `src/components/templates/main-app/projects/index.tsx`
  - `src/components/templates/main-app/projects/FileList.tsx`
  - `src/components/mobile/sheets/MenuUploadSheet.tsx`
- `git diff --check` passed for the touched Menu Link Import runtime/docs/files.
- Temporary local server (`npx next dev -p 3010`) compiled `/projects` and redirected to `/signin` because no authenticated owner session was available in the in-app browser.
- Temporary local server compiled `/api/menu-link-imports`; unauthenticated POST returned `401 Unauthorized` through the existing auth guard.

## Manual Review

- Feature flag defaults off.
- API route is authenticated and tenant-scoped.
- Source acquisition rejects unsafe URL classes before fetch.
- Source acquisition pins outbound requests to validated public DNS answers and re-checks redirects.
- Source acquisition is bounded so candidate discovery cannot keep the API route open indefinitely.
- Low-confidence HTML can fall back to bounded same-origin linked PDF/image assets.
- Raw HTML is not stored separately; v1 stores only the artifact passed to extraction.
- API cleanup removes newly created private artifacts when Firestore job creation fails before the job exists.
- Link jobs set `forceReview: true`.
- Existing file upload jobs keep current behavior.
- Approval path creates the missing source file only when the owner saves review changes.
- Imported source files include processing metadata and render as files, not assumed images.
- Desktop prevents overlapping link import and local photo/PDF upload jobs in the same project.
- Mobile keeps link import and selected-file upload as separate sheet steps.
- Public cache invalidation remains in `applyExtractionChanges`, so acquisition and extraction do not invalidate public output.

## Remaining Manual Runtime Gap

- Authenticated owner-screen browser interaction for the gated UI still needs a logged-in local session or a feature-enabled staging session. Static UI/data-flow review, TypeScript, lint, and route compilation passed in this session.
