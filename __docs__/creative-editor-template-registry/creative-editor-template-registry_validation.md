# Creative Editor Template Registry Validation

**Status:** Passed targeted checks
**Last Updated:** July 13, 2026

## Commands Run

| Command | Result |
| --- | --- |
| `node scripts/verification/verify-printable-asset-templates.js` | Passed after store-level default-doc simplification |
| `npm run test:creative-editor-template-registry-boundaries` | Passed immutable path ownership, scoped upsert/delete, cap eviction, full-platform-cap retention, and legacy-path compatibility cases. |
| `npm run test:menulist-media-storage-rules` | Passed versioned user/platform template filename, scope, MIME, and malformed-name emulator cases. |
| `npx tsc --noEmit --incremental false --pretty false` | Passed after store-level default-doc simplification |
| `npm run lint -- --file ...` for registry/editor/print-assets source files | Passed after store-level default-doc simplification |
| `git diff --check -- ...` | Passed after store-level default-doc simplification |
| `firebase deploy --only firestore:rules,storage --project ecomsai` | Historical deployment evidence only for the retired shared MenuList project; current MenuList rules/storage deploy evidence must target `menulist-qa` first with `firebase.json`, then production only after QA evidence and explicit production approval. |
| Chrome smoke on `http://localhost:3000/assets` | Passed route render, asset switching, template options modal, and editor open/close. Save attempt is externally blocked by Firebase Storage bucket quota and now shows a clear inline storage-full message with no console error. |

## Reviewed Behavior

| Area | Result |
| --- | --- |
| Shared editor boundary | Save as template is callback-owned; no Firebase import added to shared editor. |
| Registry DAL | Feature-gated by the consuming route, Zod-validated, and tenant/store scoped from session + current store context, with actor metadata stored on writes. |
| Mutation concurrency | User index mutations and platform catalog/mirror mutations use Firestore transactions; session lookup and Storage side effects remain outside retry callbacks. |
| Persistence ambiguity | Failed write acknowledgements trigger one authoritative probe; cleanup occurs only after absence is proven, and failed probes retain attempt-owned objects. |
| Storage lifecycle | Saves use immutable versioned object names; post-commit cleanup is exact owner/category/template scoped and retained-reference aware. |
| Firestore cost | Platform catalog list uses one business-category metadata doc; Saved designs list uses one bounded store `default` index doc. |
| Persistence cost | Full document payloads are written only on explicit save and stored in Storage. |
| Firestore safety | Optional registry fields are stripped before index writes so Firestore never receives `undefined` values. |
| Print assets | Saved designs load only after the route is ready and are filtered by product, source, and selected asset type. |
| Platform targeting | MenuList platform templates are requested by resolved shared business category, then filtered by product, source, and `assetTypeId` in UI; `generic` is only the fallback/default category when no category is available. |
| Single-template actions | Open/delete paths match template id plus product, source, and optional asset id before loading Storage or rewriting the `default` index. |
| Asset switching | The route does not refetch registry docs when the selected asset type changes; it filters the already-loaded platform/user arrays by product, source, and asset. |
| Source freshness | Saved printable templates rehydrate QR and short-link source refs from the selected project before editing/download. |
| Browser lifecycle | Generated template opens in the options modal, launches the editor, and closes back to `/assets` without console errors. Save/delete code paths are implemented, but the live bucket currently returns structured code `storage/quota-exceeded`, so the browser save round trip cannot complete until storage quota is cleared/upgraded. |

## Remaining Manual QA

- Clear or upgrade Firebase Storage quota, then repeat Save as template, reopen from Saved designs, switch selected project, confirm QR/short-link rehydration, and delete the saved template.
- Deploy current `storage.rules` to `menulist-qa` after Firebase project access is restored. The July 13 scoped Storage deployment stopped before upload at Service Usage HTTP 403 (`Project 'menulist-qa' not found or permission denied`).
