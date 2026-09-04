# AI Image Generation — Mobile Support

**Status:** Implemented through the shared responsive owner flow
**Last Updated:** August 31, 2026

## Mobile decision

Image generation passes the mobile admission gate because owners commonly add or replace item images while working from a phone. Mobile does not maintain a second generation implementation. `MobileMenuScreen` opens the shared `ImageUploadModal` inside the existing `MobileShell` provider tree, and the modal renders as a mobile `Popup` with the same generation, batch, review, accounting, and persistence contracts used on desktop.

## Supported mobile flows

| Flow | Mobile behavior |
| --- | --- |
| Upload item photo | Opens the shared modal on the upload tab |
| Generate one item image | **Generate image** opens the shared modal on the generation tab |
| Generate missing item images | Missing-image filter opens shared batch configuration with at most 50 eligible items |
| Review batch job | Uses the shared listener and responsive result cards inside `MobileShell` |
| Accept/discard/cancel/retry | Uses the same owner-outcome transaction and Storage cleanup contract as desktop |
| Edit existing image | Shared uploaded-image actions open the same edit draft flow when generation is enabled |
| Generate project/menu cover | Mobile project selector exposes the action only when the master flag is enabled |
| Generate business cover | Mobile Official Page screen exposes the action only when the master flag is enabled |
| Use a saved person | Select or clear an existing active, owner-approved person in the shared generation flow |
| Manage saved people | Create with consent, withdraw, and delete remain desktop owner setup/governance actions |

## Shared inheritance

Mobile inherits:

- authenticated session, tenant/store scope, permissions, linked-outlet image policy, Safe Mode, rate limits, and credit accounting;
- item/project data and public-cache invalidation through the existing project DAL;
- feature flag behavior from `FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION`;
- browser-local generation preferences scoped by tenant/store;
- Gemini provider/model selection from the server route;
- batch Firestore listener state, deterministic retries, and terminal retention.

## Touch and copy requirements

- Owner actions remain at least 44px on mobile surfaces.
- The generation action must open `preferredInitialTab="generate"`; upload/manage actions stay on `upload`.
- The master flag hides new generation/edit actions without hiding upload/delete or existing batch-result recovery.
- Batch selection never exceeds 50. If a larger missing-image set is supplied, the shared modal selects the first supported 50 and tells the owner.
- Do not show fixed completion-time promises. Show selected-item count and the shared credit estimate.
- Keep the generated-photo modal footer above nested sheets and suppress the underlying floating menu control while it is open.
- Generated drafts use visible labeled selection controls; selection must not depend on hover.
- Use plain owner copy; do not use `Smart`, provider jargon, raw job errors, or raw IDs.

## Persistence and public output

Single accepted images use `handleModalImageUpload()` and the shared item-image association helper. Batch accepted images use `appendImageBatchProjectSelections()` and `appendImageBatchSelectionsToProject()`. Both standalone and linked-outlet paths preserve policy and public-cache invalidation. Generated drafts that are not accepted do not become public project truth.

## Failure behavior

- Feature disabled: generation controls are hidden; upload/manage remains available; existing batch review remains reachable.
- Capacity exhausted: existing enhancement-pack guidance is shown.
- Provider/start failure: owner-safe generic copy is shown; no raw provider or stored job error is rendered.
- Failed batch: available drafts can be saved before a new retry job starts.
- Interrupted browser acknowledgement/cleanup: generated assets are retained; scheduler retention prunes job metadata only until global cross-project/outlet exclusive-reference proof exists.

## Evidence

- `src/components/mobile/screens/MobileMenuScreen.tsx`
- `src/components/mobile/sheets/ItemEditSheet.tsx`
- `src/components/mobile/components/MobileProjectSelectorSheet.tsx`
- `src/components/mobile/screens/MobileOfficialPageScreen.tsx`
- `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx`
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx`
- `src/database/projects/index.ts`

## Verification

- `npm run verify:ai-accounting`
- `npm run verify:menu-project-editor-boundary`
- `npm run verify:public-business-truth`
- scoped lint for the mobile and shared image surfaces
- authenticated mobile-shell smoke for upload, generate, batch review, accept, discard, cancel, retry, project cover, and business cover

## Saved-person behavior

The shared responsive image sheet exposes the frequent saved-person action on narrow screens: an owner or permitted staff member can select or clear an existing active profile and see its protected preview. Mobile does not expose profile creation because preparing 2–4 photos and making four consent/rights assertions is rare governance work rather than a quick field action. Withdrawal and permanent deletion also remain desktop management actions. The mobile selector explains this boundary without adding a new MobileShell destination or mobile-only API. Generated output retains the existing owner review/save boundary.

The authenticated mobile-shell smoke is release evidence and remains pending until run against the target deployment.
