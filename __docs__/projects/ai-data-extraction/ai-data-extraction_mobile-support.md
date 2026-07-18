# AI Data Extraction — Mobile Support

**Status:** Implemented through the existing mobile menu shell
**Last Updated:** July 15, 2026

## Mobile Flow

1. The owner starts a photo or PDF upload from the existing Mobile Menu upload sheet.
2. `MenuUploadSheet` calls the same `createProcessingJob()` helper used by desktop.
3. The helper sends `forceReview: true`; the authenticated API preserves it and the worker returns `preview_ready` rather than mutating the project.
4. `MobileMenuScreen` opens the existing `ExtractionReviewSheet` with the extracted additions and changes.
5. **Apply Changes** uses the existing owned-job apply path. **Discard All** leaves the project unchanged.
6. The selected project is refreshed after an acknowledged apply.

## Boundary

- No new mobile route, tab, provider, API, collection, or Cloud Function is introduced.
- Mobile stays inside `MobileShell` and reuses existing project/job state.
- Public create-menu and messaging-onboarding extraction-only destinations are unaffected.
- Desktop and mobile remain aligned through the shared job creator and the same `preview_ready` ownership/status contract.

## Verification

- `npm run verify:menu-extraction-pipeline:dry-run`
- `npm run test:menu-processing-job-listener-boundary`
- `node scripts/verification/verify-menu-extraction-pipeline.js`
