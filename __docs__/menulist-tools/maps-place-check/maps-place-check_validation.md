# Maps Place Check - Validation

**Status:** PASS LOCALLY - QA FUNCTION/PROVIDER EVIDENCE BLOCKED BY FIREBASE CLI AUTHENTICATION; CONFIRMATION UI BLOCKED BY COLLISION POLICY
**Date:** July 22, 2026

## July 22, 2026 Hardening Addendum

The provider-backed callable and embedded, provider-neutral store binding remain
unchanged in this pass. New confirmation is now fail-closed while
`ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK` is disabled in either the client adapter
or direct store DAL. Removing an existing binding remains available while the
feature is disabled.

The current embedded binding does not establish cross-store uniqueness for a
provider Place ID. A grounded-candidate confirmation UI therefore cannot be
released after provider smoke alone. Activation also requires a
server-authoritative policy that detects collisions, fails closed, preserves
tenant isolation, and supports reviewed, reversible correction. No speculative
identity registry, collection, index, rule, or hot-path read was added while the
feature remains disabled.

`npm run verify:functions-deploy-preflight` passed on July 22. The Firebase CLI
then failed the read-only `firebase projects:list --json` authentication check,
so a deploy or provider smoke could not produce current remote evidence. This
pass changed no Function source, Firestore rule/index, or Storage rule and did
not attempt a Firebase deploy from the mixed worktree.

## Checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Backend-only callable exists | PASS | `functions/src/triggers/shared.ts:209` exports `mapsPlaceCheck` |
| Existing GenAI gateway is used | PASS | `functions/src/logic/mapsPlaceCheck.ts:251` calls `genAIClient.models.generateContent` |
| Google Maps tool is enabled | PASS | `functions/src/logic/mapsPlaceCheck.ts:258` passes `tools: [{ googleMaps: {} }]` |
| Pinned SDK shape checked | PASS WITH ENABLEMENT GATE | `@google/genai` is pinned at `1.16.0`, exposes `Tool.googleMaps` and `RetrievalConfig`, but does not expose `ai.interactions` |
| Firebase AI Logic Web SDK not added | PASS | Dependency freeze passed; root Firebase remains pinned separately |
| Feature flag defaults off in Functions | PASS | `functions/src/constants/features.ts:297` |
| Feature flag defaults off in client config | PASS | `src/config/features.ts:3299` |
| Auth and tenant/store access enforced | PASS | `functions/src/triggers/shared.ts:218` through `functions/src/triggers/shared.ts:219` |
| SAFE_MODE checked before provider call | PASS | `functions/src/triggers/shared.ts:225` through `functions/src/triggers/shared.ts:227` |
| Rate limiting checked before provider call | PASS | `functions/src/triggers/shared.ts:229` through `functions/src/triggers/shared.ts:237` |
| Non-English language codes rejected | PASS | `functions/src/logic/mapsPlaceCheck.ts:88` through `functions/src/logic/mapsPlaceCheck.ts:97` |
| Maps sources returned for attribution UI | PASS | `functions/src/logic/mapsPlaceCheck.ts:207` through `functions/src/logic/mapsPlaceCheck.ts:226` |
| Provider identity is source-only | PASS | `functions/src/logic/mapsPlaceCheck.ts:54` through `functions/src/logic/mapsPlaceCheck.ts:57` exclude model-returned identity fields; candidate ID and URI come from the first validated grounding source at `functions/src/logic/mapsPlaceCheck.ts:300` through `functions/src/logic/mapsPlaceCheck.ts:305` |
| Place IDs are never silently truncated | PASS | `functions/src/logic/mapsPlaceIdentityBoundary.ts:1` through `functions/src/logic/mapsPlaceIdentityBoundary.ts:15` preserve IDs up to the application safety cap and reject over-cap values |
| Maps source URLs are bounded and validated | PASS | `functions/src/logic/mapsPlaceIdentityBoundary.ts:17` through `functions/src/logic/mapsPlaceIdentityBoundary.ts:40` accept only bounded HTTPS Google Maps URLs |
| No canonical Firestore write-back from provider check | PASS | `functions/src/logic/mapsPlaceCheck.ts:243` through `functions/src/logic/mapsPlaceCheck.ts:317` contain provider call and response mapping only |
| No raw provider response in callable output | PASS | `functions/src/logic/mapsPlaceCheck.ts` omits `rawText` from `MapsPlaceCheckResult` and returns only status, attribution, model, candidate, and source fields |
| Public Truth Tools boundary updated | PASS | `__docs__/menulist-tools/public-truth-tools/README.md` references Maps Place Check as a separate provider-backed prototype |
| Provider-neutral store contract | PASS | `src/types/platform/store.ts:44` through `src/types/platform/store.ts:59` define the binding types; `src/types/platform/store.ts:296` through `src/types/platform/store.ts:304` attach the optional store field |
| Owner Maps link mirrors in the same write | PASS | `src/database/stores/index.tsx:104` through `src/database/stores/index.tsx:151` build the nested mirror and `src/database/stores/index.tsx:504` invokes it in `updateStore` |
| Invalid or caller-forged generic identity updates fail closed | PASS | `src/database/stores/index.tsx:491` through `src/database/stores/index.tsx:504` reject direct identity metadata and reject invalid Maps-link values rather than treating them as clears |
| Owner desktop, mobile, and embedded save paths preserve unrelated identity freshness | PASS | `MobileOfficialPageScreen.tsx:747`, `businessSettings/index.tsx:1298`, and `projects/b2cView/index.tsx:221` use `getStoreDeepDifference` before `updateStore`, so unchanged Maps links are omitted instead of restamping confirmation time |
| Grounded candidate confirmation is explicit | PASS | `src/lib/public-truth-tools/mapsPlaceCheckClient.ts:91` through `src/lib/public-truth-tools/mapsPlaceCheckClient.ts:117` require a confirmation candidate and the DAL revalidates it before persistence |
| New confirmation is feature-gated in both client and DAL | PASS | `confirmMapsPlaceCheckIdentity` and `confirmExternalLocationIdentity` independently reject while `ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK` is false |
| Removal remains available while disabled | PASS | Neither removal path is blocked by the confirmation feature flag |
| Cross-store provider-ID collision handling | ACTIVATION BLOCKER | No server-authoritative uniqueness claim exists yet; the Business Truth Contract prohibits releasing confirmation UI until fail-closed, reviewable, reversible collision handling exists |
| Stable identity requires attributable source evidence | PASS | `src/lib/public-truth-tools/externalLocationIdentity.ts:55` through `src/lib/public-truth-tools/externalLocationIdentity.ts:83` accept the Place ID and URI only when both occur on the same bounded Maps grounding source |
| Confirmation cannot manufacture a browser-side GBP claim | PASS | `src/database/stores/index.tsx:997` through `src/database/stores/index.tsx:1004` accept only `google_maps` plus `maps_place_check` for browser confirmation |
| Confirmation and removal recheck current store truth | PASS | `src/database/stores/index.tsx:955` through `src/database/stores/index.tsx:977` validate tenant/store/availability; both mutations run the check inside Firestore transactions at `src/database/stores/index.tsx:1016` and `src/database/stores/index.tsx:1067` |
| Confirmation is reversible and provider-scoped | PASS | `src/database/stores/index.tsx:1046` through `src/database/stores/index.tsx:1091` remove only the selected provider binding |
| Nested writes preserve other providers | PASS | `src/lib/store/storeNestedUpdateProjection.ts:1` through `src/lib/store/storeNestedUpdateProjection.ts:19` treat `externalLocationIdentity` as a nested patch field |
| Internal identity stays out of public output | PASS | `src/lib/publicTruth/clientStoreProjection.ts:26` through `src/lib/publicTruth/clientStoreProjection.ts:54` positively project public presence without the field, and `src/app/api/public/v1/business/route.ts:114` through `src/app/api/public/v1/business/route.ts:155` omit it from Platform Pull |
| Outlet propagation stays excluded | PASS | `src/lib/multiOutlet/brandPropagationBoundary.ts` does not include `externalLocationIdentity` in inherited brand fields |
| Firebase cost is bounded | PASS | Link save/removal adds no extra write; explicit confirmation/removal each use one transaction read plus one write; no collection, history row, scheduler, index, rule, or Storage object was added |
| Current provider billing truth is documented | PASS | Gemini Maps grounding may execute and bill multiple search queries for one prompt; the provider path stays flag-off pending provider smoke and deployment |
| No new Firebase infrastructure | PASS | No new Function, collection, index, Firestore rule, Storage rule, or scheduler was added. Existing `mapsPlaceCheck` Function logic did change, so the scoped Function requires deployment. |

## Verification Commands

| Command | Result |
| --- | --- |
| `npm --prefix functions run build` | PASS |
| `npm run test:public-truth-tools-runtime` | PASS |
| `npm run test:store-nested-update-projection` | PASS |
| `npm run verify:public-truth-tools` | PASS |
| `npm run verify:public-business-truth` | PASS |
| `npm run verify:official-business-page-boundary` | PASS |
| `npm run verify:platform-pull-api-boundary` | PASS |
| `npm run verify:dependency-freeze` | PASS |
| `npx tsc --noEmit --incremental false --pretty false` | PASS |
| Focused ESLint on touched TypeScript and verifier files | PASS |
| `npm run verify:functions-deploy-preflight` | PASS |
| `npm run verify:official-business-page-boundary` | PASS |
| `npm run verify:public-truth-tools` | PASS |
| `npm run test:public-truth-tools-runtime` | PASS |
| `npm run verify:doc-npm-scripts` | PASS |
| `npm run docs:check-links` | PASS - 0 broken links; 62 pre-existing naming warnings outside this slice |
| `npm run typecheck` | PASS after aligning the root script to the committed non-incremental verifier contract |
| `firebase projects:list --json` | BLOCKED - `Failed to authenticate, have you run firebase login?` |
| `firebase deploy --project menulist-qa --config firebase.json --only functions:mapsPlaceCheck --non-interactive` | BLOCKED BEFORE UPLOAD - `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed |
| `npm run verify:ai-accounting` | BLOCKED OUTSIDE THIS SLICE - the current worktree reports 50 owner-safe mobile enhancement-pack locale-message mismatches; none involve Maps Place Check or external identity files |
| `npm run verify:agent-readiness` | BLOCKED OUTSIDE THIS SLICE after the typecheck-contract repair - the aggregate verifier next stopped on pre-existing set-claims source-token drift; the focused MenuList truth, OBP, Platform Pull, Maps, TypeScript, lint, and docs gates pass |
| `git diff --check -- [touched paths]` | PASS |

## Runtime Notes

- The callable is remotely current only after a Firebase Functions deployment succeeds.
- Current Maps Place Check retry evidence must start with `npm run verify:functions-deploy-preflight`, followed by `firebase deploy --project menulist-qa --config firebase.json --only functions:mapsPlaceCheck --non-interactive` only from an isolated reviewed source state with authenticated project access.
- The older command shape is historical only. Do not reuse the older command shape from that attempt.
- Latest July 5 raw-provider-output retry completed predeploy lint/build, then failed before upload with Cloud Resource Manager HTTP 403 caller permission.
- The July 5, 2026 raw-provider-output boundary retry also completed predeploy lint/build and failed before upload with Cloud Resource Manager HTTP 403 caller permission for `menulist-qa`.
- The July 19 cross-check changed the existing Maps Function identity parser: Place IDs and source URLs now come only from validated grounding metadata, long valid Place IDs are preserved, and oversized or invalid values are rejected rather than truncated.
- `npm run verify:functions-deploy-preflight` passed. The scoped `menulist-qa` deploy was then attempted and stopped before upload because Firebase CLI authentication is unavailable. No remote Function revision changed.
- The older July 3 and July 5 Cloud Resource Manager IAM failures remain historical evidence for earlier deploy attempts; the current blocker is the Firebase CLI authentication error recorded above.
- App/API/public-route changes remain undeployed under the Vercel opt-in guard; this cross-check did not run a Vercel build or deploy.
- Production deploys require QA evidence and explicit production deploy approval.
- The feature is off by default until `PUBLIC_TRUTH_MAPS_PLACE_CHECK_ENABLED=true` is set in the Functions runtime or the code flag is intentionally changed.
- Do not enable the feature until a real provider smoke test confirms Maps grounding works through the pinned `@google/genai` `1.16.0` `generateContent` path, or until a scoped SDK migration moves this callable to another approved provider path.
- Any UI that displays generated Maps-grounded content must show Google Maps sources immediately after the generated content or within one user interaction.
- A confirmed identity binding is internal owner-confirmed metadata, not provider certification and not a canonical public field update, so it does not invalidate or refill the public cache.
- Any future address, hours, menu, availability, or other canonical update must remain a separate owner/admin confirmation path with public cache invalidation.
- There is no bulk backfill. Existing public Maps links gain the internal URI-only binding only after the next explicit owner save.
- Google recommends refreshing stored Place IDs older than 12 months. MenuList records `confirmedAt` for future on-demand revalidation; no scheduler was introduced while the provider path remains disabled.

## Final Verdict

The provider-neutral, reversible location-identity foundation is complete and
verified locally across Functions parsing, owner desktop/mobile/embedded writes,
store scope, public-output exclusion, outlet isolation, Firebase cost, and docs.
The scoped QA Function deploy remains pending because Firebase CLI authentication
fails before project access. Maps Place Check stays flag-off and must not be
enabled until the QA deploy, a real attributed provider smoke, and the
server-authoritative collision policy all succeed.
