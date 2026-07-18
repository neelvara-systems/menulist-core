# Menu Design and Customer Presentation Verification — July 16, 2026

**Result:** Local source complete; not current launch certification

## Scope traced

- desktop B2C mood/layout/preset/display/background/pricing-note controls;
- MobileShell design editor, embedded-state parity, background preparation, publish acknowledgement, link/share handoff;
- canonical design config, legacy mood/tabs migration, preset compatibility, contrast enforcement;
- public menu route handoff, customer category/item layout, search/filter/category navigation, direct item links, item details, images, availability, backgrounds, and price visibility;
- standalone and linked-outlet publish/version/truth/cache paths;
- current Firebase/Storage operation shape and maintained docs.

## Corrections made

1. Replaced the permissive all-layout matrix with the Digital Menu Output Constitution matrix and corrected the incompatible Clean/Card preset.
2. Hardened mood/layout/config normalization against prototype-chain values, arrays, malformed booleans, and legacy `tabs` state.
3. Corrected baseline accent/price contrast; removed price opacity; made mood, spice, allergen, dietary, and unavailable badges readable; kept unavailable item details keyboard reachable.
4. Added one active public option-price projection. The list and PDP now agree, active prices appear before interaction, inactive/unpriced/non-finite values are excluded, and variant analytics do not emit stale base price.
5. Added a public background boundary for HTTPS/root-relative persisted URLs and preview-only data images. Active and exported output avoid fixed attachment.
6. Removed the estimated-height 150-item category placeholder. It caused layout shifts and made off-screen search results and item deep links non-addressable; current output renders the bounded project truth directly.
7. Preserved spaces while owners type the 140-character pricing note. The existing public resolver trims/collapses whitespace after persistence.
8. Rebuilt the current spec, implementation, and Firebase note from code truth; archived superseded narratives; aligned README, mobile help/support, and constitution evidence.

## Firebase and scale result

No new collection, listener, query, Firestore write, composite index, Firestore rule, Storage rule, Cloud Function, or scheduler was added. Pure normalization and rendering stay client-side. Publish continues through the shared project mutation/truth/cache path. Prepared backgrounds retain the shared immutable public-media lifecycle, so ambiguous persistence does not trigger unsafe deletion.

## Local evidence

- `npm run verify:menu-design-presentation-boundary` — passed.
- `npm run verify:menu-project-editor-boundary` and all chained project scope/mutation/upload/time-slot tests — passed.
- `npm run verify:public-business-truth` and chained tests — passed.
- `npm run verify:public-customer-delivery` and chained DTO/PWA tests — passed.
- `npm run verify:pricing-integrity-boundary` — passed.
- `npm run verify:mobile-shell-route-map` — passed.
- `npm run verify:dependency-freeze` — passed.
- `npx tsc --noEmit --pretty false` — passed.
- scoped ESLint for all touched runtime/verifier files — passed.
- `npm run docs:check-links` — 2,449 files, 4,354 internal links, 0 broken links; 27 pre-existing founder-video naming warnings.
- focused `git diff --check` — required at final close.

No Firebase infrastructure source changed, so Firebase auto-deploy does not apply. No Vercel deploy or production build was run.

## External/owner pending

- approved app release;
- authenticated desktop and MobileShell owner publish smoke;
- browser/device visual matrix across every allowed mood/layout and long localized content;
- low-bandwidth/failed-image, large-menu, search/category/deep-link, unavailable-item, keyboard, and mixed option-price checks;
- Storage upload and public cache-refresh observation;
- custom-domain and production-host smoke.
