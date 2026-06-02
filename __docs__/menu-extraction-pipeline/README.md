# Menu Extraction Pipeline

**Status:** Implemented
**Last Updated:** June 2, 2026

Menu extraction now uses one durable intake/job contract across owner upload, mobile upload, menu link import, public create-menu, and messaging onboarding.

## Source Of Truth

All extraction work is queued in `menuImageProcessingJobs/{jobId}` and processed by `functions/src/logic/processMenuImagesJob.ts`.

The shared app/Functions contract lives in:

- `src/data/shared/menuExtractionJob.ts`
- `functions/src/sharedData/menuExtractionJob.ts`

These files must stay byte-for-byte identical. They define destination types, source markers, MIME limits, file limits, and routing builders used by every job producer.

The MIME contract intentionally has different admission layers. Dashboard uploads allow PDF/JPEG/PNG/WebP, public create-menu image uploads allow JPEG/PNG/WebP, link import can process its acquired text/image/PDF artifacts, and messaging onboarding also supports HEIC/HEIF because WhatsApp/iPhone intake already admits those files before extraction.

Entry points do not run separate menu extraction prompts:

- Dashboard upload and mobile upload call `POST /api/menu-extraction/jobs`.
- Authenticated menu link import calls `POST /api/menu-link-imports`, which writes the same job collection.
- Public `/create-menu` writes a `publicMenuDrafts/{draftId}` document and queues the same job collection.
- Messaging onboarding writes the same job collection from Cloud Functions with `destination.type = "messaging_onboarding"`.

## Destination Contract

Each job may carry `destination`:

- `project`: save or preview against an existing project.
- `public_menu_draft`: write normalized project-shaped extracted data back to `publicMenuDrafts/{draftId}` for preview and later claim.
- `messaging_onboarding`: keep project writes skipped and let the messaging extraction watcher update the session.

## Security Contract

Browser clients cannot create extraction jobs directly. Owner uploads go through the protected server route so auth, tenant access, project existence, Firebase Storage URL allowlisting, rate limits, SAFE_MODE, and menu-intake identity checks run before the job exists.

The protected owner route does not accept client-provided `source` or `sourceMetadata`. Retry jobs recover source lineage from the original failed server-owned job.

## Verification

Run:

```bash
npm run verify:menu-extraction-pipeline
npm run verify:menu-extraction-pipeline:dry-run
```

The static verifier checks the mirrored shared contract, server-only job creation, destination builder use, public durable extraction, retry source preservation, worker file/lifecycle guards, and public draft extracted-data shape. The dry run builds sample jobs for every entry point and validates routing/source/storage/MIME behavior and project/editor payload alignment without calling Firebase Storage, Firestore, Gemini, or the live worker.
