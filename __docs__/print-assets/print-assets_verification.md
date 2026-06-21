# Print Assets Verification

**Status:** Freeze-ready
**Last Updated:** June 21, 2026

## Freeze Decision

Print Assets, Print Menu, Menu Kit print outputs, and the related lightweight website placement are complete enough to freeze product scope.

Freeze means:

- The supported print asset catalog is frozen after adding the extended asset set: flyer, gift certificate, front/back business card, ID card, invitation, postcard, product tag, and campaign poster. Blank design studio, print-ordering marketplace, and quantity estimator remain out of scope.
- Future work should be limited to production bugs, scan/readability regressions, accessibility fixes, and copy corrections.
- Any additional printable product line beyond the expanded supported catalog must reopen scope with docs first.

## June 21 Asset-Set Update Verification

| Check | Result | Notes |
| --- | --- | --- |
| `node scripts/verification/verify-printable-asset-templates.js` | Passed | Covers the dedicated `/assets` route, compatibility route, desktop/mobile template catalog, shared renderer, project metadata updates, and accessibility guards. |
| Editor-backed document smoke | Passed | Generated all 13 editor-backed printable asset documents, including front/back business card and ID card, with expected dimensions and locked source-linked layers. |
| Focused feature ESLint | Passed | Covers changed Assets, mobile, printable renderer, and verification files touched by this update. |
| `npx tsc --noEmit --incremental false` | Passed | TypeScript compile check. |
| `git diff --check` | Passed | No whitespace errors. |
| Stale asset-list scan | Passed | No docs still describe the old extended set as the current catalog. |

## Prior Freeze Evidence

| Check | Result | Notes |
| --- | --- | --- |
| `npm run verify:menu-card-export` | Passed | Covers Print Assets route, mobile shell wiring, shared output pipeline, premium branding, AI advisor guard, and zero export-storage write path. |
| `curl -I --max-time 60 http://localhost:3000/assets` | Passed | Dedicated Assets route returned `200 OK` from the local dev server. |
| Feature-scoped `git status` | Reviewed | Current feature-scope changes are the intentional visual refinement, docs, and verifier updates; unrelated Answerlattice worktree changes are outside this feature scope. |
| Rendered preview sample | Passed | Single table card, branded menu QR, branded feedback QR, and non-food service card were rendered from shared generator code after the visual refinement. |
| Expanded editor-backed asset smoke | Passed | Flyer, gift certificate, front/back business card, ID card, invitation, postcard, product tag, and campaign poster generated Creative Editor documents with correct dimensions and locked QR/link source layers. |
| Dynamic output content guard | Passed | Print faces receive store name, logo, brand color, short URL, `printCardTitle`, and `scanToView` from caller/store context; the canvas renderer does not compose menu-only copy internally. |

## Cost Result

No Firebase infrastructure was added for Print Assets. Generated files stay client-side, and previews use temporary browser blob URLs. The feature does not add Firestore collections, Storage paths, Cloud Functions, API artifact routes, rules, or indexes.

## Freeze Scope

Included:

- Desktop `/assets`
- Compatibility `/use-menulist/print-assets`
- Mobile PWA Assets screen inside `MobileShell`
- Print Menu mobile shell behavior
- Shared desktop/mobile output generation
- Governed desktop customization for editor-renderable single print assets
- MenuList attribution with Premium removal policy
- Table tent, single table/counter card, counter sticker, entrance poster, feedback QR, flyer, gift certificate, front/back business card, ID card, invitation, postcard, product tag, campaign poster, full Print Menu PDF, and complete Menu Kit bundle
- Premium print hierarchy: brand top panel, logo/initials badge, purpose pill, neutral QR panel, short-link capsule, and scan-safe black QR
- Lightweight website copy as `Print files`

Not included:

- Print ordering or local printer marketplace
- Print quantity estimation
- Blank owner-facing design studio
- Stored/generated artifact library in Firebase
