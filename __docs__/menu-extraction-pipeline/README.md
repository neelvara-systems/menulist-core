# Menu Extraction Pipeline

**Status:** Implemented
**Last Updated:** July 28, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This README records source-gated Menu Extraction Pipeline behavior only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, provider smoke for the target extraction model and environment, authenticated desktop/mobile upload, identity-preflight, preview/review/apply QA, real-device mobile upload/review QA, public create-menu upload/link/preview/claim QA, owner review before publish, target Firebase deploy evidence where rules, Storage, indexes, or Functions change, target Vercel deploy evidence where app routes or browser clients change, and production-host smoke.

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

Owner upload job creation computes a server-trusted `sourceFingerprint` from Firebase Storage object metadata. If the same owner uploads the same files to the same project again within the reuse window, the route can return the recent completed job instead of creating another AI extraction job. Forced-review, retry, link-import, public draft, and messaging jobs are excluded from this owner-upload reuse path. If Storage metadata lookup fails for an allowed owner upload, job creation still continues, the fingerprint is skipped for that request, and the route logs bounded `menu_extraction_owner_upload_metadata_lookup_failed` diagnostics without raw file names, URLs, paths, or identifiers.

The desktop browser helper `getProcessedFile.ts` stays quiet on normal job start, active-job reuse, and job-created paths. It does not log raw project IDs, job IDs, existing job IDs, filenames, uploaded URLs, or file payloads. Failed job creation uses the bounded `desktop_menu_upload_job_create_failed` diagnostic and fixed owner retry copy.

The shared browser job helper treats API responses and Firestore identities as untrusted. It normalizes the project before the protected request or active-job query, normalizes a returned job ID before reuse or the development callable, normalizes cancellation IDs before document refs, and drops malformed job document IDs from active-query results.

Menu-intake identity preflight remains non-blocking. If an allowed preflight file passes Storage/prefix/network validation but cannot be fetched or read inside the bounded response limit, the helper skips that file for the identity prompt and logs bounded `menu_intake_identity_preflight_file_unreadable` diagnostics without raw file names, URLs, paths, or identifiers.

Menu-intake identity provider response parsing also remains non-blocking. If Gemini returns malformed or non-object JSON for the preflight identity check, the helper uses the existing low-confidence fallback analysis and logs bounded `menu_intake_identity_provider_response_parse_failed` diagnostics with response length, candidate length, parse-stage, fence/object-fragment booleans, and operation shape metadata only. It does not log raw provider response text, extracted menu text, file content, project IDs, tenant IDs, store IDs, user IDs, or exception text.

Public `/create-menu` browser handoffs use same-origin credentials, no-store cache policy, and manual redirect handling before trusting upload/link acknowledgements, preview polling responses, or claim acknowledgements. Public preview polling uses `statusOnly=1` every 5 seconds while extraction is pending/processing, stops after at most 36 status reads with an explicit retry state, and fetches the full extracted draft only after completion. The public image chooser allows the device/browser to offer camera or saved photos and resets before open so a same-file retry is observable. This keeps the public create-menu preview path finite and lightweight without changing Firestore ownership, auth, or claim behavior.

Extraction review apply keeps MOL audit logging fire-and-forget after the acknowledged menu/project write and job completion update. If the non-blocking `EXTRACTION_APPLIED` MOL event fails, the apply flow now logs bounded `menu_review_apply_mol_event_log_failed` diagnostics with project/job presence-length context, actor/tenant/store presence-length context, applied-change count, review mode, MOL version, and normalized source error metadata only. The owner success path and valid MOL writes stay unchanged.

Review persistence is concurrency-safe. Standalone/master application rebuilds the approved plan inside a transaction over the current project and job, then commits both together. Linked-outlet application sends the exact job, expected local version and applied count to `/api/projects/outlet-save`; that protected transaction rechecks current authority/job/version and commits project plus job completion atomically. Nested Firestore values retain their SDK types while mutable file data is cloned.

Every review apply/discard requires the persisted job to contain an explicit owner ID matching the current session in addition to tenant, store and project scope. Missing-owner legacy or malformed jobs fail closed; Admin linked-outlet persistence does not bypass this owner boundary.

## Destination Contract

Each job may carry `destination`:

- `project`: save or preview against an existing project.
- `public_menu_draft`: write normalized project-shaped extracted data back to `publicMenuDrafts/{draftId}` for preview and later claim.
- `messaging_onboarding`: keep project writes skipped and let the messaging extraction watcher update the session.

Jobs now store root-level `timings` plus `result.summary` so platform ops can see queue wait, provider time, save time, item/category counts, and confidence summary without always reading a full normalized payload. Completed first-extraction project jobs may have `result.combinedData` pruned after the project has been saved and a delay has passed; public draft, messaging onboarding, and review/preview jobs keep full data while their downstream consumers need it.

Owner desktop/mobile listeners treat the job document as an untrusted runtime boundary. Canonical job/project IDs, status, bounded result metrics, localized menu data, per-file results, and preview limits are normalized before any consumer receives them. Review comparison excludes orphan items, duplicate extraction identities, and multiple extraction rows that resolve to the same persisted category/item. Weak category matches are review-only, configured thresholds control both category and item classification, and apply plans use field-level patches so omitted order/metadata and retained translations are not erased. Invalid prices are warned and excluded from writes; safe new items preserve extracted variant and structured item metadata.

## Security Contract

Browser clients cannot create extraction jobs directly. Owner uploads go through the protected server route so auth, tenant access, project existence, Firebase Storage URL allowlisting, rate limits, SAFE_MODE, and menu-intake identity checks run before the job exists.

The protected owner route does not accept client-provided `source` or `sourceMetadata`. Retry jobs recover source lineage from the original failed server-owned job.

The owner route accepts only the fixed `image_processing` action, rejects zero-byte or duplicate-identity file declarations, and canonicalizes business type/category against the maintained business registry before either value enters a dedupe fingerprint or worker prompt. Persisted project identity wins; canonical request context remains only as a legacy-project fallback. Retry loading reuses the same bounded file schema, so a malformed historical job cannot create a replacement job with empty, oversized, or duplicate file rows.

The pre-AI project-size gate reserves 100KB for a one-file append and at most 200KB for any larger batch. The bounded headroom keeps the supported 15-file/page intake usable for a normal project instead of multiplying a heuristic by every page. The worker transaction still measures the actual merged document and blocks saves above 900KB; reset/create-new remains the owner-controlled replacement path.

## Verification

Run:

```bash
npm run verify:menu-extraction-pipeline
npm run verify:menu-extraction-pipeline:dry-run
```

The static verifier checks the mirrored shared contract, server-only job creation, destination builder use, public durable extraction, status-only polling, retry source preservation, worker file/lifecycle guards, timing telemetry, delayed payload pruning, and public draft extracted-data shape. The dry run builds sample jobs for every entry point and validates routing/source/storage/MIME behavior and project/editor payload alignment without calling Firebase Storage, Firestore, Gemini, or the live worker.
