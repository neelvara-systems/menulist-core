# Design Cue - Validation Report

**Date:** June 14, 2026
**Feature:** CampaignCue Design Cue
**Status:** implementation_done, audit_done, docs_aligned, prod_ready_for_deterministic_scope

## Verdict

Design Cue deterministic patch flow is implementation-ready for CampaignCue editor testing. Known command chips and safe owner comments run in the browser, produce validated `CreativeEditorDocument` patch sets, require owner approval, and commit through the shared editor document/history path.

Provider-backed model assistance is not active. The model route exists only as a protected, rate-limited, validated fail-closed boundary until provider, accounting, and fixture tests are added.

## Files Reviewed

| Area | Files |
| --- | --- |
| Feature flags | `src/config/features.ts` |
| CampaignCue constants | `src/constants/campaigncue/designCue.ts`, `src/constants/campaigncue/index.ts`, `src/constants/campaigncue/routes.ts` |
| Shared editor types/UI | `src/modules/creative-editor/types.ts`, `src/modules/creative-editor/CreativeEditor.tsx`, `src/modules/creative-editor/DesignCuePanel.tsx`, `src/modules/creative-editor/CreativeEditor.module.scss` |
| CampaignCue resolver | `src/lib/campaigncue/design-cue/context.ts`, `intent.ts`, `patches.ts`, `validate.ts`, `apply.ts`, `modelAdapter.ts` |
| CampaignCue wiring | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`, `src/app/(campaigncue)/campaigncue/app/editor-test/CampaignCueEditorTestClient.tsx` |
| API boundary | `src/app/api/campaigncue/design-cue/turns/route.ts`, `src/lib/validation/campaigncueDesignCueSchemas.ts` |
| Verification | `scripts/verification/verify-campaigncue-runtime.js` |
| Docs | `__docs__/campaigncue/design-cue/*`, `__docs__/campaigncue/README.md`, `__docs__/campaigncue/creative-studio/*`, `__docs__/shared-creative-editor/*`, `__docs__/CHANGELOG.md` |

## Issues Found And Fixed

| Issue | Fix |
| --- | --- |
| Runtime verifier still expected `Save PNG` even though legacy editor parity uses `Save`. | Updated verifier to lock the intended `Save` label. |
| TypeScript did not narrow API and patch validation unions strongly enough. | Switched to explicit discriminants and a number type guard. |
| Product-neutral command ids were accepted too broadly by the CampaignCue resolver. | Added a CampaignCue action-id guard; unsupported strings fail closed. |
| Missing locality/contact could add placeholder text such as `your area` or generic contact-review text. | Added confirmed-fact flags and review-only findings for missing location/contact; no placeholder business facts are added. |
| Patch validation allowed overly broad geometry/style numeric values. | Added bounds for coordinates, dimensions, rotation, line height, stroke width, opacity, invalid canvas size, unsupported canvas presets/text placements, unsafe add-text layer names, empty layer patches, and non-allowlisted alignment/font style/font weight values. |
| Model route invalid JSON could fall into the generic error path after auth. | Added explicit invalid JSON handling with safe `400` response and security log. |
| Docs still described Design Cue as planned. | Updated README, implementation, Firebase, mobile, Creative Studio, shared editor, and test docs to reflect current code. |
| Mobile docs claimed a bottom sheet was implemented. | Corrected docs: current shared editor uses the responsive AI Tools drawer; bottom sheet remains required before phone-first rollout. |

## Security Result

- The shared editor panel imports shared editor types only and does not import CampaignCue product authority.
- `POST /api/campaigncue/design-cue/turns` uses `withAuth()`, CampaignCue runtime guard, session scope guard, `AI_OPERATION` rate limiting, Zod validation, and safe validation logging.
- The model route returns fail-closed while `ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST` is disabled.
- Patch validation rejects locked/missing target layers, unsafe text patterns, unsupported layer patch keys, unsafe colors, invalid numeric values, out-of-range geometry/style values, invalid canvas size/presets/text placements, unsafe add-text layer names, empty layer patches, non-allowlisted text style values, and unsupported operations.
- No direct posting, sending, ad spend mutation, external URL mutation, Fabric JSON persistence, signed URL persistence, or base64 Firestore persistence was added.

## Firebase Cost Result

- Known command chips: 0 additional Firestore reads, 0 writes, 0 provider calls.
- Free-text deterministic comments: 0 additional Firestore reads, 0 writes, 0 provider calls.
- Patch preview/apply in local editor state: 0 Firebase operations.
- Existing asset save/export remains on the existing CampaignCue asset-registration path.
- Model route unauthenticated check returned `401`; authenticated model calls remain disabled/fail-closed, so no provider or AI accounting cost is introduced.

## UX Result

- Design Cue appears inside the AI Tools drawer with command chips first and comment input second.
- Patch result cards show owner-readable summary, findings/operations, and Apply/Try another/Cancel.
- `Add location` without a confirmed locality showed a review card and did not add `your area` placeholder text.
- `Add contact line` without a confirmed contact showed a review card and did not add placeholder contact text.
- Applying `Bigger offer` added a selected editable `Clear offer` layer and rendered it through the live Fabric canvas path.
- Free-text `make this square` produced and applied a square resize patch; the editor dimension changed to `1080 X 1080`.
- Mobile has responsive one-column command chips and 44px actions, but a dedicated bottom sheet remains a future mobile wrapper requirement.

## Docs Result

- Design Cue docs now separate implemented deterministic scope from disabled model assistance.
- Firebase docs now record the zero-cost local path and fail-closed model route.
- Creative Studio and CampaignCue hub docs now describe Design Cue as implemented.
- Shared Creative Editor docs now record the neutral panel and product-adapter boundary.

## Test And Build Result

Run from `/Users/danny/Projects/MenuListAi/menulist-core`:

| Check | Result |
| --- | --- |
| `node scripts/verification/verify-campaigncue-runtime.js` | Passed with 749 checks. |
| `npx tsc --noEmit --incremental false --pretty false` | Passed. |
| `npm run lint` | Passed. |
| `git diff --check` | Passed. |
| Browser smoke at `http://127.0.0.1:3114/__campaigncue/app/editor-test` | Passed for old-editor-style shell rendering, live Fabric canvas object count, AI Tools visibility, Design Cue command rendering, Bigger offer preview, and Apply adding an editable `Clear offer` layer to the live canvas. |

`npm run build` was not run because production builds are opt-in for this repo workflow.

## Remaining Risks

| Risk | Status |
| --- | --- |
| Provider-backed intent/copy/critique | Not active; keep disabled until AI accounting, SAFE_MODE/provider preflight, bounded response schema, and fixture tests exist. |
| Canvas-coordinate comment anchoring | Not implemented; current comments target selected layer or document. |
| Mobile bottom sheet | Not implemented; required before phone-first public rollout. |
| Persistent review threads | Not implemented; only justified for durable CueLayers designs or future persisted editor documents. |
