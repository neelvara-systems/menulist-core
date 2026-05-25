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
- After enabling `ENABLE_MENU_LINK_IMPORT` in both app and functions config, `firebase deploy --only functions:processMenuImagesJob --project ecomsai` completed successfully.
- Authenticated Chrome QA on `http://localhost:3000/projects` verified paste-link flow through review:
  - pasted a public PDF URL,
  - confirmed permission,
  - created a `menu_link_import` job,
  - worker accepted the job after the function flag deploy,
  - job reached `preview_ready`,
  - review modal showed 11 selected changes.
- Live apply surfaced a Firestore payload issue: optional extracted category fields could include nested `undefined`. `applyExtractionChanges` now sanitizes the final update payload before `updateDoc`.
- Data contract replay after the fix verified the reviewed link import writes one source file, 5 categories, and 6 items with `undefinedPathCount: 0`; the job was marked completed and the stale intermediate preview job from the same validation pass was cancelled.
- Local revalidation API could not be called with a secret because `REVALIDATION_SECRET` was not present in the local `.env`.

## Manual Review

- Feature flag is enabled in both app and function config after validation; the centralized flag remains the rollback control.
- API route is authenticated and tenant-scoped.
- Source acquisition rejects unsafe URL classes before fetch.
- Source acquisition pins outbound requests to validated public DNS answers and re-checks redirects.
- Source acquisition handles Node custom lookup calls that request either one address or `all: true`; public PDF and HTML acquisition succeeded after this check.
- Source acquisition is bounded so candidate discovery cannot keep the API route open indefinitely.
- Source acquisition scoring now uses business-category-aware menu/catalog/offering terms from the shared business-type model instead of restaurant-only keywords.
- A direct acquisition smoke against a public non-food pricing HTML page returned a text artifact, while `127.0.0.1` remained blocked with `UNSAFE_IP`.
- Low-confidence HTML can fall back to bounded same-origin linked PDF/image catalog assets.
- Raw HTML is not stored separately; v1 stores only the artifact passed to extraction.
- API cleanup removes newly created private artifacts when Firestore job creation fails before the job exists.
- Link jobs set `forceReview: true`.
- Existing file upload jobs keep current behavior.
- Approval path creates the missing source file only when the owner saves review changes.
- Imported source files include processing metadata and render as files, not assumed images.
- Desktop prevents overlapping link import and local photo/PDF upload jobs in the same project.
- Desktop now exposes link import from the processed-menu editor action area as well as the upload view, so image/PDF-first projects can still import from a link later.
- Mobile keeps link import and selected-file upload as separate sheet steps.
- Public cache invalidation remains in `applyExtractionChanges`, so acquisition and extraction do not invalidate public output.

## Remaining Manual Runtime Gap

- Browser apply was proven up to the review modal and initially failed on a real Firestore `undefined` payload. After the code fix, the local Chrome session required a fresh Google OAuth consent to restore NextAuth before re-clicking Apply. That consent was not completed in-browser; the fixed data contract was replayed with admin credentials against the QA project instead, then verified in Firestore.
