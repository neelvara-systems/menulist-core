# AI Image Generation — Specification

**Feature:** Menu Image Generation & Editing
**Status:** Source-gate verified; release evidence remains pending
**Last Updated:** July 16, 2026
**Audience:** Product, engineering, QA, support

## Purpose

MenuList prepares image drafts when an owner has no suitable image or wants to revise an existing one. Generated output is not presumed accurate. Item images stay drafts until the owner selects and saves them; cover flows use the existing media preview/save authority.

Do not describe this feature as professional-photography replacement, guaranteed quality, fixed-speed generation, unlimited full-menu processing, or unchecked publishing.

## Runtime scope

| Flow | Admission | Output authority |
| --- | --- | --- |
| Single item generation | Auth, master flag, Safe Mode, rate limit, schema, permission, outlet policy, capacity reservation | Base64 draft; owner must choose/upload before project truth changes |
| Reference-image generation | Same as single plus tenant/store-scoped bounded reference fetch | Same as single |
| Existing-image editing | Auth, master flag, Safe Mode, rate limit, schema, permission, outlet policy, capacity reservation | Edited draft; original stays unchanged until owner saves a result |
| Batch item generation | Owner job creation, master flag, trigger validation, permission, outlet policy, capacity precheck, Cloud Tasks readiness | 1–50 item job; owner reviews accepted results before project association |
| Project/menu cover | Master flag and the single-generation route; manual owner action or missing-cover preparation after accepted extraction truth | Prepared media upload plus transaction-current `projectImage` authority |
| Official Business Page cover | Master flag and the single-generation route from desktop/mobile owner settings | Prepared preview and explicit owner save to business-cover Storage/project truth |

Active provider/model truth is `GEMINI_MODELS.IMAGE_GEN` (`gemini-2.5-flash-image`) through `src/app/api/image-generation/generators.ts`. There is no active Imagen branch.

## Owner outcomes

- Owners can keep an existing image, upload their own photo, generate a draft, edit an existing photo, or discard generated output.
- Batch selection is limited to 50 items in the owner UI and independently enforced by request/server/job boundaries.
- The UI shows the shared content-credit estimate. Final consumption follows actual successful output accounting.
- Desktop and mobile use the same responsive item-image modal, same project persistence helpers, and same batch listener/DAL.
- AI Menu Manager image task definitions and image-gap suggestions require the same master flag; it cannot advertise or admit a disabled generation action.
- Linked outlets can act only where the current image-override policy allows it.
- Public menu/Official Business Page output changes only through existing project/store persistence and public-cache invalidation paths.

## End-to-end flows

### 1. Single item or reference-image generation

1. Owner opens the item image modal and selects **Generate Photo**.
2. The client builds a bounded request from the selected item and visual settings.
3. `/api/image-generation` authenticates and applies the master flag, Safe Mode, rate limit, body cap, schema validation, store permission, outlet policy, and capacity checks.
4. Prompt construction normalizes owner/item input. Reference URLs must belong to the current tenant/store media scope and pass bounded download checks.
5. The route reserves the estimated credit units, calls the shared Gemini generator, and finalizes only successful output quantity.
6. The browser receives bounded image data and shows drafts.
7. Only the owner-selected draft is prepared, uploaded, associated with the item, and persisted. Public cache invalidation follows the existing project save path.
8. Failure before final accounting refunds the reservation safely.

### 2. Image editing

1. Owner chooses **Edit** for an existing item image.
2. `/api/image-editing` applies the same master flag, auth, Safe Mode, rate, validation, permission, outlet-policy, capacity, and scoped-image-fetch boundaries.
3. The prompt router sanitizes the selected edit intent and item context.
4. Gemini returns an edited draft; the original remains the current project image.
5. The owner selects a draft and saves it through the same item-image persistence path.

### 3. Batch generation

1. Owner selects 1–50 eligible items. UI bulk/category/quick-select paths all enforce the same maximum.
2. The browser creates one visible `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` document and requires its acknowledgement.
3. `/api/image-generation/batch-trigger` revalidates exact session/project/job/config/item truth, permission, outlet policy, prompt capacity, and Cloud Tasks configuration.
4. One deterministic Cloud Task is enqueued per item. Partial enqueue is recorded and shown without duplicating admitted work.
5. The authenticated worker validates project header/secret before body work, then applies the master flag, schema/scope checks, worker rate limit, job/item registration, lease, capacity reservation, prompt cache/provider call, prepared Storage upload, idempotent accounting, and transactional result append.
6. Duplicate or retried deliveries reuse deterministic operation/media identifiers and do not double-charge or duplicate output.
7. The listener projects bounded job truth into desktop/mobile review state.
8. Owner can accept selected images, discard all, cancel, cancel with accepted images, or resolve a failed job and start a new retry job.
9. Exact lost-ack terminal retries converge without duplicate status history.
10. Browser review never deletes public generated media from selection/job state. The maintenance scheduler prunes job payload/row metadata only; physical media deletion waits for global cross-project/outlet exclusive-reference proof.

### 4. Project and business covers

- Manual project and business-cover buttons are hidden when the master flag is disabled.
- `src/lib/image/projectImageGeneration.ts` independently returns without provider work when disabled, protecting programmatic/automatic callers.
- A generated project cover cannot overwrite an owner image that wins while generation/upload is in flight; transaction-current metadata authority decides.
- Business-cover generation remains an explicit owner action and uses the same media preparation/preview/upload path as a manual cover.

## Failure and recovery contract

| Failure | Required behavior |
| --- | --- |
| Feature disabled | Hide new generation/edit controls; server routes reject new work; admitted worker tasks return retryable `503`; existing job review remains accessible |
| Safe Mode/provider unavailable/rate limited | No new provider work; owner receives generic recovery copy; worker response remains retryable where applicable |
| Insufficient credits | No provider call; show the existing enhancement-pack guidance |
| Invalid tenant/project/outlet scope | Fail before provider, Storage, or accounting work |
| Provider returns no image | Return failure; refund any unsettled reservation |
| Batch duplicate delivery | Skip completed/terminal work or retry the same leased/deterministic operation safely |
| Browser acknowledgement or cleanup interrupted | Preserve generated Storage objects; project/job retries converge without risking a URL already committed elsewhere |
| Public save fails | Do not report success; keep owner recovery available and preserve current public truth |

## Security, cost, and scale requirements

- All owner routes use `withAuth()` and store permission enforcement.
- Worker admission uses the configured GCP project header and timing-safe shared-secret comparison.
- Request/response bodies, prompt fields, reference downloads, generated media, logs, and stored errors are bounded.
- Provider/accounting logs store shapes and counts, not image bytes, prompts, secrets, raw owner payloads, or raw provider metadata. Image-provider response logging inspects at most 100 candidates and 100 parts per candidate and allowlists only non-negative safe-integer token totals (`cachedContentTokenCount`, `candidatesTokenCount`, `promptTokenCount`, `thoughtsTokenCount`, and `totalTokenCount`).
- Batch work uses deterministic IDs, item leases, maximum attempts, bounded prompt/upload concurrency, and capped per-store worker rate limiting.
- Prompt-cache hits are zero-unit operations; non-cache successful images consume the shared generated-image credit rate.
- Batch item payloads are pruned after 7 days and terminal job documents after 30 days. Public generated-media deletion is disabled until global exclusive-reference proof exists.
- No new standalone scheduled function is permitted; cleanup belongs to `menulistMaintenanceScheduler`.

## Non-goals

- No automatic claim that generated output depicts the real item.
- No direct publishing to third-party delivery/social platforms.
- No custom model training, video generation, 3D generation, or real-time generation streaming.
- No owner-facing provider/model selector.
- No unbounded batch size or unbounded concurrency.

## Acceptance gates

Codebase/source completion requires:

- `npm run verify:ai-accounting`
- `npm run verify:storage-paths`
- `npm run test:media-storage-boundary`
- `npm run verify:menu-project-editor-boundary`
- `npm run verify:public-business-truth`
- scoped lint and `npx tsc --noEmit`
- Functions type/build/preflight checks when scheduler cleanup changes
- touched-diff and docs parity review

Release completion additionally requires target deployment, configured Cloud Tasks worker secrets/URL/queue, provider smoke, authenticated desktop/mobile owner QA, and public-render/cache smoke. These external steps remain pending until performed in the target environment.

## Primary code evidence

- `src/app/api/image-generation/route.ts`
- `src/app/api/image-generation/generators.ts`
- `src/app/api/image-generation/batch-trigger/route.ts`
- `src/app/api/image-generation/batch-generation/route.ts`
- `src/app/api/image-editing/route.ts`
- `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx`
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/`
- `src/components/mobile/screens/MobileMenuScreen.tsx`
- `src/lib/image/projectImageGeneration.ts`
- `src/lib/ai-menu-manager/actionTypes.ts`
- `src/lib/ai-menu-manager/projectPromptHints.ts`
- `src/lib/ai-menu-manager/domainConversationRouter.ts`
- `src/database/imageBatchProcessing/`
- `src/lib/ai/imageBatchProjectSelection.ts`
- `functions/src/schedulers/imageBatchRetentionBoundary.ts`
- `functions/src/schedulers/menulistMaintenanceScheduler.ts`
