# Printable Asset Templates - Validation

> **Last Updated:** September 5, 2026
> **Verdict:** PASS for the right-side theme-preview drawer source, accessibility, TypeScript, preference, and production-build gates. Live Chrome visual capture remains pending because the existing Assets tabs are owned by another active browser-debug session.

## September 5 desktop theme-library navigation audit

| Area | Implemented contract |
| --- | --- |
| Catalog space | The desktop theme catalog owns the full modal body width and scrolls independently; no persistent detail column reduces laptop card count. |
| Focused inspection | Selecting a current or alternate theme opens the existing six canonical rendered assets in a right-side drawer above the catalog; the two-column bento gives portrait outputs the taller cells. |
| Safe application | Card selection still performs no write. Menu/business Apply actions live in the drawer only while reviewing an unapplied theme and retain the existing synchronous write lock. |
| Navigation continuity | The catalog stays mounted behind the drawer, preserving search, filter, scroll position, visible thumbnail Blob URLs, and keyboard focus. Back, drawer Close, mask dismissal, and Escape close the drawer and clear the unapplied temporary selection so no stale `Previewing` badge remains. |
| Responsive boundary | The full-width catalog retains its responsive card count while the drawer is bounded by the viewport and its bento collapses safely at narrow widths. The separate MobileShell theme picker and bento are unchanged. |
| Cost and persistence | The presentation change adds no Firestore read/write, Storage upload, Function, API route, or generated-file persistence. |

## September 4 renderer-backed preview audit

| Area | Verified implementation |
| --- | --- |
| Output fidelity | Desktop and mobile preview placements call the same `renderPrintableAsset()` adapter as download and request canonical PNG output from the current `PrintableAssetRenderInput`. |
| No synthetic output | The retired component containing fake QR modules, generic menu bars, guessed aspect ratios, and hand-built theme decoration is removed; the verifier fails if it returns. |
| Geometry | Generated images use contained fitting, so portrait, landscape, square, two-face, and full-page output remains complete rather than cropped into a card-shaped thumbnail. |
| Runtime truth | Preview invalidation includes the selected project/menu version, business identity/contact facts, runtime content drafts, selected staff record, and parent theme. |
| Performance | The canonical PNG is reduced to a maximum 1200 px long edge for screen display only; downloads remain full print resolution. Catalog previews load only near the viewport, unload after genuinely leaving that window, share a bounded 12-result promise cache, and pass through a two-job queue. The desktop drawer leaves visible catalog preview components mounted, so drawer round-trips retain their active Blob URLs instead of regenerating them. Focused and comparison previews remain eager. |
| Lifecycle | Component-owned Blob URLs are revoked when a catalogue preview moves off-screen, changes, or unmounts; raw business/contact content is hashed before it becomes an in-memory cache key. |
| Bundle truth | Complete Menu Kit is labelled as a multi-file asset set instead of presenting an invented single-page output. |
| Cross-surface paths | Product Tag and Campaign Poster entry points on desktop and mobile share the canonical workflow modal; the modal renders a fresh PNG with contained fitting and revokes its Blob URL. Saved custom-design and platform-management cards may use their actual persisted document thumbnail, but the selected live asset preview cannot prefer it over current runtime output. |
| Cost and persistence | Preview rendering stays in the browser and adds no write, upload, Function, API route, or generated-artifact persistence. |

Fresh visual fixtures for Japanese Night Luxe and Mindful Motion passed across all 13 editor-renderable asset types (26 PNGs total). The dark, light, portrait, landscape, square, two-face, QR, paired-card, personalized, and promotional representatives retained their complete canonical composition.

## September 3 final delivery hardening audit

| Area | Verified implementation |
| --- | --- |
| Current-data preview | Runtime edits expose an unapplied state. Download, mobile Share/Save, and desktop editor entry refresh the exact current input into the visible preview before continuing. |
| Fail-closed output | Preview failure exposes Retry and keeps download/share/customize unavailable until a real preview succeeds. |
| Operation safety | Desktop, mobile, and the reusable workflow modal use synchronous refs to reject a second action before React state can settle; controls and dismissal stay locked while work runs. |
| Paired image delivery | Business Card front/back PNGs are packaged into one deterministic browser ZIP. PDF remains the paired print format. |
| Editor recovery | The reusable Product Tag/Campaign Poster editor records a baseline, warns before discard, and registers `beforeunload` while dirty. |
| Mobile delivery | Native file Share/Save uses the same rendered Blob; unsupported sharing falls back to download and owner cancellation emits no success. |
| Capability truth | Gift Certificate states that it has no balance/redemption/validity tracking. Invitation states that it has no RSVP/guest-registration flow. |
| Source transparency | Business Card, Staff Badge, Product Tag, and Print Menu identify their source data and the owning surface to correct it. |

The hardening adds no schema, collection, Firebase rule, index, API route, provider call, deployment, or generated-file persistence.

## September 3 runtime-details parity audit

Code and documentation were independently mapped across desktop, mobile, input admission, current-source rendering, customization, project switching, and Firebase cost behavior.

| Area | Expected contract | Verified implementation |
| --- | --- | --- |
| Gift Certificate fields | Optional recipient, sender, message, value, valid-until, and certificate number. | One shared details component supplies both desktop and mobile drafts. |
| Invitation fields | Optional occasion, date, time, and location. | One shared details component supplies both desktop and mobile drafts. |
| Input safety | Bound text and prevent one asset's fields from reaching another renderer. | `inputBoundary.ts` normalizes each property and admits each object only for its owning asset ID. |
| Output parity | Preview, direct PNG/PDF, and desktop customization use the same current values. | Both owner surfaces compose the same `PrintableAssetRenderInput`; the editor document is the source for each output path. |
| Empty fallback | Owners may leave any field for handwriting. | Empty objects normalize away while the existing labelled writing lines remain rendered. |
| Long-copy safety | Entered values never collide with labels or writing lines. | Gift fields use separate vertical bands; Invitation uses height-aware two-line fitting. Regression tests assert both boundaries with short and long content. |
| Project isolation | Personalization must not silently move to another menu/project. | Desktop selection and mobile project-change handling reset both drafts. |
| Persistence and cost | No Gift/Invitation record, API route, upload, Function, or background write. | Drafts remain component state and browser render input only; Firebase operation counts remain zero. |
| Asset-system fit | Runtime forms appear only where owner-authored facts are needed. | Flyer, Campaign Poster, Postcard, Gift Certificate, and Invitation accept runtime copy; Print Menu, Product Tag, Staff Badge, and Complete Menu Kit remain source-driven; the remaining display assets reuse existing business/menu context. |

### Findings and fixes

| # | Classification | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | MISMATCH | Help documentation still described Invitation as blank-only and split venue/address even though runtime uses one location field. | Updated the owner guidance to the actual optional-entry contract. |
| 2 | MISSING | Existing renderer tests proved text presence but not vertical separation. | Added label/value/line bounds assertions for every new field and long-copy cases. |
| 3 | MISMATCH | Long Invitation values could rise into their labels; Gift values began inside the label band. | Repositioned Gift bands and added height-aware Invitation fitting. |
| 4 | DRIFT | Website and marketing docs predated the optional Gift/Invitation flow. | Updated capability copy without implying persistence, redemption, event hosting, or RSVP support. |
| 5 | EDGE CASE | Identity-only asset editors still validated and normalized hidden contact fields. | Scoped contact validation and persistence to assets whose field contract exposes contact details. |
| 6 | EDGE CASE | Clearing the visible tagline restored the previously saved value. | The active-language tagline now persists an explicit canonical removal and immediately refreshes the preview. |
| 7 | FALSE POSITIVE | A country by itself marked the Business Card address recommendation complete. | Readiness now requires a street address or a meaningful city plus state/country combination. |

No new schema, collection, Firebase rule, index, API route, provider call, or deployment is required by this change.

## Verification evidence

- `npm run verify:printable-asset-templates`
- `npx tsx scripts/verification/test-printable-asset-delivery.ts`
- `npm run test:print-shared-boundaries`
- `npm run test:printable-asset-style-preferences`
- `npm run test:print-asset-catalog-boundary`
- `npm run verify:communication-kit-boundary`
- `npm run verify:global-accessibility-boundary`
- Printable 47-theme artwork geometry test
- Targeted ESLint
- TypeScript typecheck
- Next.js production build (passed; existing Sass `@import` deprecation warnings remain outside this scope)
- Scoped `git diff --check`

The repository-wide mobile-shell route-map verifier currently has an unrelated stale assertion for the former inline `hasPendingSubscription` expression. Current `MobileShell` uses the separate owner-access recovery resolver. This validation does not alter or claim completion of that concurrent scope.
