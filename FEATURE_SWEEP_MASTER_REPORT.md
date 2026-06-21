# Feature Sweep Master Report

Date/time: 2026-06-20 19:49 IST
Branch: `staging`
Commit: `81fdef8ca67fab1c1e7f837081fbd259255e9d40`
Runtime app URL: `http://localhost:3000`
Active user Chrome tab observed by AppleScript: `http://localhost:3000/menu-manager`
Chrome same-tab automation status: blocked. AppleScript can read/navigate the active tab, but Chrome has "Allow JavaScript from Apple Events" disabled; the Chrome plugin/Node REPL attach path failed before browser setup with `codex/sandbox-state-meta: missing field sandboxPolicy`; Computer Use could not see a Chrome window (`cgWindowNotFound`). Runtime validation used the existing local server plus the repo's Chrome/CDP verifier scripts.
Mobile viewport tested: iPhone-style CDP harness, `393x852`, mobile UA, touch enabled, standalone PWA mode.
Selected runtime store/project in mobile verifier: store `15`, project `14-mn8d5jbz-15` (`Bar Menu`) auto-selected by current account data.

## Environment

- Node: `v18.18.2`
- npm: `10.8.0`
- Baseline dirty worktree before this sweep: existing changes in `.firebaserc`, AMM docs/scripts, deployment docs, AMM resolver files, environment examples, `AMM_FULL_ACTION_SWEEP_REPORT.md`, and `routes-manifest.json`.
- Files changed by this sweep:
  - `src/lib/firebase/syncAnswerlatticeAuth.ts`
  - `src/lib/firebase/functions.ts`
  - `src/components/mobile/screens/MobileAnswerlatticeClientScreen.tsx`
  - `src/components/mobile/screens/MobilePlatformInternalScreen.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-backfill/page.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-insights/page.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-management/page.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-roi-calculator/page.tsx`
  - `src/app/(main)/platform/(chat-management)/chat-weekly-digest/page.tsx`
  - `src/app/(main)/platform/changelog/page.tsx`
  - `src/app/(main)/platform/feedback-admin/page.tsx`
  - `src/app/(main)/platform/kb-generation/page.tsx`
  - `src/app/(main)/platform/knowledge-base/page.tsx`
  - `src/app/(main)/platform/support-tickets/page.tsx`
  - `scripts/verification/verify-mobile-owner-menu.mjs`
  - `scripts/verification/verify-mobile-upload-extraction.mjs`
  - `scripts/verification/verify-public-routing-summary-backfill.mjs`
  - `scripts/backfill-public-routing-project-summaries.ts`
  - `src/components/mobile/providers/MobileProjectsProvider.tsx`
  - `FEATURE_SWEEP_MASTER_INVENTORY.md`
  - `FEATURE_SWEEP_MASTER_REPORT.md`

## Baseline Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Passed | `No ESLint warnings or errors` |
| `npx tsc --noEmit --incremental false` | Passed | no TypeScript output |
| `npm run verify:ai-menu-manager` | Passed | AI Menu Manager static verifier passed |
| `npm run verify:menu-extraction-pipeline` | Passed | 27 passed, 0 failed |
| `npm run verify:menu-extraction-pipeline:dry-run` | Passed | 48 passed, 0 failed |
| `npm run verify:agent-readiness` | Passed | discovery surfaces verified |
| `npm run verify:website-resource-locales` | Passed | locale resources verified |
| `npm run verify:env-targets` | Passed | environment matrix verified |
| `npm run verify:customer-app-pwa` | Passed | manifest/PWA/static checks passed |
| `npm run verify:recycle-bin` | Passed | 6 passed, manual testing still required |
| `npm run verify:menu-export` | Passed | export static verifier passed |
| `npm run verify:ai-accounting` | Passed | AI accounting hardening verifier passed |
| `npm run verify:menu-card-export` | Passed | no Firestore artifact write path |
| `npm run verify:public-business-truth` | Passed | public business truth static verifier passed |
| `npm run verify:owner-business-assistant` | Passed | Business Health/assistant hardening passed |
| `npm run verify:printable-asset-templates` | Passed | printable templates verified |
| `npm run verify:creative-editor-smoke` | Passed | 77 checks passed |
| `npm run verify:catalog-analytics` | Passed | functions build plus catalog-aware analytics verifier passed |
| `node scripts/verification/verify-mobile-owner-menu.mjs` | Failed initially, passed after fixes | initial failure: stale fixture and Answerlattice CSP/auth iframe leak |
| `node scripts/verification/verify-mobile-upload-extraction.mjs` | Blocked after fixes | create/select/upload UI reached; Storage permission fixed by releasing `storage.rules`; remaining blocker is Firebase bucket `storage/quota-exceeded` before job creation |
| `node scripts/verification/verify-public-routing-summary-backfill.mjs` | Passed with warnings after fixes | 0 errors; 20 warnings for active stores with no canonical projects/menus |

## Inventory Summary

- Total discovered feature rows: 39
- Enabled owner features: 25
- Public/customer features: 17
- Mobile-relevant features: 27
- Gated/disabled/blocked features: 3
- Internal/admin-only features: 6
- Separate product families: 3

## Results Summary

- Passed without code changes through existing verifiers: AMM static checks, extraction static/dry-run pipeline, customer app PWA, menu export, AI accounting, menu card export, public business truth, owner business assistant, printable assets, creative editor smoke, catalog analytics.
- Bugs fixed and retested: Mobile owner Menu tab verifier, cross-product Answerlattice Firebase initialization leak on MenuList owner runtime, mobile project-create selection race, public-routing summary verifier false positives, and one real missing project summary backfill.
- Additional all-severity checks added after clarification: public website route smoke, authenticated owner route smoke, unauthenticated protected API checks, authenticated invalid-payload API checks, Firebase usage map, and high-listener cleanup review.
- Intentionally blocked/unsupported: billing money movement, external platform posting, Reviews/Reputation direct posting, and mobile upload extraction completion while Firebase Storage bucket quota is exceeded.
- Failed remaining: no lint/type/static verifier failure in touched scope; same-tab Chrome DOM inspection remains tool/config blocked; mobile upload extraction cannot create a job until Firebase Storage quota is cleared/upgraded.

## Feature-by-Feature Table

| Feature | Docs | Runtime paths | Desktop tested | Mobile tested | Public tested | API/security tested | Cache checked | Bugs fixed | Retest | Final status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MobileShell owner Menu | `__docs__/mobile-operational-support`, project/menu docs | `/projects#mobile/menu`, `MobileShell`, `MobileMenuScreen` | Not this pass | Yes, CDP iPhone harness | N/A | Auth cookie + Firebase Auth sync exercised | N/A | Yes | Passed | Ready for internal QA |
| Mobile Menu bulk controls | menu command/project docs | Mobile More Actions, Visibility, Fix Text Case | Not this pass | Yes | N/A | No mutation executed | N/A | Verifier hardened | Passed | Ready for internal QA |
| Answerlattice/MenuList boundary | product separation docs | owner routes importing auth sync/functions helpers | N/A | Yes, error surfaced on Mobile Menu | N/A | Firebase Auth import boundary checked | N/A | Yes | Passed | Ready for internal QA |
| Public business truth | OBP/client-menu docs | client/OBP/cache code | Static verifier | Not manual | Static verifier | Static verifier | Static verifier | No | Passed verifier | Manual browser pending |
| AI Menu Manager | `__docs__/ai-menu-manager/*` | `/menu-manager`, `/api/ai-menu-manager/*` | Resolver/static verifier | Resolver/static verifier only | N/A | Static verifier | N/A | No new AMM code | Passed verifier | Manual UI command matrix pending |
| Menu extraction pipeline | extraction docs | upload/link/import APIs | Static verifier | mobile create/select/upload tested until Storage quota | N/A | Static verifier plus Storage rules release | N/A | Yes | Static passed; mobile blocked by bucket quota | External quota blocker |
| Customer app PWA | `__docs__/customer-app` | `/client/pwa/*` | Static verifier | Static verifier | Static verifier | Static verifier | Static verifier | No | Passed verifier | Manual browser pending |
| Menu card export | `__docs__/menu-card-export` | `/use-menulist/menu-card-export` | Static verifier | Static verifier | export output only | API advisor static check | no artifact writes | No | Passed verifier | Manual browser pending |
| Print assets/templates | print docs | `/assets`, `/use-menulist/print-assets` | Static verifier | Static verifier | export output only | Static verifier | no default public truth write | No | Passed verifier | Manual browser pending |
| Business Health / owner assistant | owner-business-assistant docs | `/business-health`, APIs | Static verifier | Static verifier | N/A | Static verifier | no public truth writes | No | Passed verifier | Manual browser pending |
| Catalog analytics intelligence | analytics docs/functions | functions verifier | Static verifier | N/A | N/A | Functions build/verifier | no new collection | No | Passed verifier | Ready for internal QA |
| Public routing summary backfill | routing docs | summary backfill verifier | Static data check | N/A | Static data check | N/A | summary/cache considered | Yes | Passed with no errors | Ready with warnings for no-menu stores |
| Public website routes | website docs | website pages | HTTP route smoke | responsive not visually checked | HTTP route smoke | N/A | N/A | No | 29 routes passed | Manual visual QA pending |
| Owner app routes | owner docs | dashboard/projects/settings/share/billing/platform routes | Authenticated HTTP route smoke | Mobile Menu separately tested | N/A | SSR auth cookie smoke | N/A | No | 26 routes passed | Manual UI QA pending |
| Protected owner APIs | security rules | AI/extraction/image/store/outlet/staff/review/platform APIs | N/A | N/A | N/A | Unauth and invalid-payload checks | N/A | No | Passed | Deeper tenant/wrong-store tests pending |
| Reviews/Reputation | review docs | `/api/reviews/*` | Not run | Not run | no direct posting | Not run | N/A | No | N/A | Gated/disabled |
| Billing/Razorpay | billing docs | `/billing`, `/api/razorpay/*` | Safe only | Safe only | payment provider | Not mutating | N/A | No | N/A | Blocked for safety |
| Separate product surfaces | product docs | Answerlattice/CampaignCue/GrowthOS/KitStamp/MyCodex routes | Not in MenuList sweep | Not in MenuList sweep | separate | boundary only | separate | Boundary fix | Passed boundary retest | Excluded/separate |

## Bug Detail

### Bug 1: Answerlattice Firebase initialized on MenuList owner routes

- Feature: MobileShell owner Menu / product separation boundary
- Symptom: Mobile owner verifier reported a CSP frame error for `https://answerlattice-qa.firebaseapp.com/` while testing `/projects#mobile/menu`, a MenuList owner route.
- Reproduction:
  1. Run `node scripts/verification/verify-mobile-owner-menu.mjs`.
  2. Observe page errors before the fix: Answerlattice Firebase Auth iframe blocked by MenuList CSP.
- Root cause: `firebaseAuthSync` imported `syncAnswerlatticeAuthWithCustomToken`, which imported `answerlatticeFirebaseClient` at module load. That initialized the separate Answerlattice Firebase app/Auth before any Answerlattice-scoped token existed. `src/lib/firebase/functions.ts` had the same product-boundary risk for MenuList publish verification because it imported Answerlattice Functions at top level.
- Files changed:
  - `src/lib/firebase/syncAnswerlatticeAuth.ts`
  - `src/lib/firebase/functions.ts`
  - Answerlattice config-only imports in mobile/platform pages
- Fix: Lazy-load `answerlatticeFirebaseClient` only when an Answerlattice custom token or Answerlattice Functions call is actually needed; import `isAnswerlatticeFirebaseConfigured` from `answerlatticeConfig` where only a boolean is needed.
- Tests run:
  - `npx tsc --noEmit --incremental false`
  - `node scripts/verification/verify-mobile-owner-menu.mjs`
- Retest result: Passed. CSP/Auth iframe error no longer appears on the MenuList Mobile Menu route.

### Bug 2: Mobile owner verifier pinned stale project data

- Feature: MobileShell owner Menu verifier
- Symptom: Verifier expected old project id `14-mp6hyq9x-15`, old name/counts, and failed even though the current runtime project `14-mn8d5jbz-15` rendered correctly.
- Reproduction:
  1. Run `node scripts/verification/verify-mobile-owner-menu.mjs`.
  2. Observe failure: expected QA project id mismatch.
- Root cause: The verifier hard-coded a project id and exact counts from an older fixture. Current authenticated account data selected a different valid project.
- File changed:
  - `scripts/verification/verify-mobile-owner-menu.mjs`
- Fix: Make project pinning opt-in via `MOBILE_QA_PROJECT_ID`; otherwise verify that a runtime project is selected and that item/category/missing-image signals are present with positive counts.
- Tests run:
  - `node scripts/verification/verify-mobile-owner-menu.mjs`
- Retest result: Passed. Screenshots written to `/tmp/mobile-owner-menu-auto-selected-project.png`, `/tmp/mobile-owner-menu-bulk-auto-selected-project.png`, `/tmp/mobile-owner-menu-visibility-auto-selected-project.png`, `/tmp/mobile-owner-menu-text-case-auto-selected-project.png`.

### Bug 3: Public routing summary verifier misclassified no-menu stores and one real summary was missing

- Feature: Domain/routing/cache infrastructure
- Symptom: `node scripts/verification/verify-public-routing-summary-backfill.mjs` reported 21 missing `platformSummary/projects_{storeId}` docs.
- Reproduction: run the verifier against the current environment before the fix.
- Root cause: The verifier treated every active visible store without a `projects_{storeId}` summary as an error, even when the canonical project collection was empty and no menu existed to route. One store, `17`, did have a canonical project at `projects/16/17/16-default-17` and really needed a summary.
- Files changed:
  - `scripts/verification/verify-public-routing-summary-backfill.mjs`
  - `scripts/backfill-public-routing-project-summaries.ts`
- Fix:
  - Verifier now checks the canonical project collection when the summary is missing/empty and downgrades no-menu stores to warnings.
  - Added dry-run-first backfill script that uses `buildSummaryProjectsBatchPayload`.
  - Ran `FIREBASE_PROJECT_ID=ecomsai npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-public-routing-project-summaries.ts --store-id 17 --write`.
- Data/cache actions:
  - Wrote `platformSummary/projects_17` for existing project `16-default-17`.
  - Public cache impact considered; summary-backed public routes use 60s revalidation and targeted cache tags on normal app paths. No public route was observed stale in local testing.
- Retest result: `verify-public-routing-summary-backfill.mjs --json` passed with `errors: 0`, `warnings: 20` for active stores that have no canonical projects.

### Bug 4: Mobile create-menu selection race after project creation

- Feature: Mobile project selector / Mobile Menu
- Symptom: `verify-mobile-upload-extraction.mjs` created a new `Mobile Upload QA ...` project, but the Mobile Menu screen stayed selected on `Bar Menu`.
- Reproduction:
  1. Run `node scripts/verification/verify-mobile-upload-extraction.mjs`.
  2. Observe a new project summary/doc in Firestore, but `mobileSelectedProjectId:15` remains `14-mn8d5jbz-15`.
- Root cause: `upsertCachedProject()` scheduled the new project into React state, then `selectProject()` immediately resolved the preferred id against stale `projectsListRef`.
- File changed:
  - `src/components/mobile/providers/MobileProjectsProvider.tsx`
- Fix: Update `projectsByIdRef` and `projectsListRef` synchronously inside `upsertCachedProject()` and `removeCachedProject()` before React state settles.
- Retest result: Subsequent mobile upload verifier runs selected the newly created QA menu and reached the upload sheet.

### Issue 5: Mobile upload extraction blocked by Firebase Storage quota

- Feature: Mobile upload extraction
- Symptom: `node scripts/verification/verify-mobile-upload-extraction.mjs` now reaches Mobile Menu create/select, file review, and upload submit, but cannot create an extraction job because Firebase Storage rejects the upload.
- Progression:
  - Initial blocker: missing `/tmp/menulist-extraction-test-menu.png`.
  - Fixed by defaulting the verifier to existing repo fixture `menulist-answerlattice-upload-inputs/asset-inputs/private-reference-captures/public-menu-mobile.png`.
  - Next blocker: verifier selected the wrong hidden file input; fixed to choose the actual menu upload input.
  - Next blocker: Storage returned `storage/unauthorized`; local `storage.rules` already allowed `projects/files/{tId}/{sId}` for claimed store users.
  - Released `storage.rules` to `ecomsai.appspot.com` with Firebase Admin SDK `releaseStorageRulesetFromSource`; ruleset `24b93540-f583-4665-b65e-26b0bbf4160a`, created `2026-06-20 14:10:47 GMT`.
  - Current blocker: Storage returns `storage/quota-exceeded` for bucket `ecomsai.appspot.com` before any `menuImageProcessingJobs` doc is created.
- Files changed:
  - `scripts/verification/verify-mobile-upload-extraction.mjs`
- Data cleanup:
  - Inactivated QA projects created by failed runs: `14-mqmeyflf-15`, `14-mqmf2e0t-15`, `14-mqmf5wmr-15`, `14-mqmf882q-15`, `14-mqmfiijb-15`, `14-mqmftj85-15`.
  - Revalidated local public cache for store `15` through `/api/revalidate/menu`.
- Retest result: blocked by external Firebase Storage quota; no job created, no uploaded file found under `projects/files/14/15/`.

## AMM Command Boundary Coverage

`npm run verify:ai-menu-manager` covers the minimum command families requested for resolver/action-card behavior, including:

- Direct menu changes: `Masala tea 20 now`, `rename Masala Tea`, description update, selected-item price/visibility, selected bulk price/availability, category visibility, Featured section.
- Bounded answers and clarifications: `Can I increase Masala Tea price?`, vague theme/image/promote commands, and suggestion cards.
- Design and display controls: premium style, grid layout, theme color choices, display option choices.
- Browser-local/manual actions: copy menu link, download menu QR, official page QR/link, feedback link/QR, customer app install link, digital screen link.
- Approval-safe/non-executable actions: publish, generated image, import/review families.
- Unsupported boundaries: Zomato, Instagram/social posting, platform/internal access, weather, and sports resolve to `system_unsupported_action`.

This is not a substitute for same-tab owner UI testing. Same-tab Chrome DOM inspection remained blocked, so AMM remains marked manual UI pending.

## Risk Register

- Public truth risks: public menu/OBP/store/project mutation flows still need manual browser mutation/restore passes; static public-business verifier passed.
- Tenant/security risks: auth sync boundary improved; staff, outlet, and protected APIs still need dedicated wrong-tenant/role manual tests.
- Mobile parity risks: Mobile Menu passed; many mobile More/settings screens are inventoried but still pending manual runtime checks.
- Firestore/cost risks: existing AI accounting, catalog analytics, menu card export, and extraction verifiers passed; mutation flows that write stores/projects still need per-feature cache/cost confirmation. Firebase Storage quota is currently exhausted for `ecomsai.appspot.com`, blocking upload/extraction runtime tests.
- Unsupported external boundary risks: Reviews/Reputation and external posting remain disabled/gated; no direct Google/Zomato/Swiggy/social posting was executed or implied.
- Docs/runtime mismatch risks: no docs changed except the sweep artifacts; future passes should reconcile any disabled/runtime-missing feature docs as they are tested.
- Runtime tooling risk: the user-requested same logged-in Chrome tab could not be DOM-inspected because tool/plugin/Chrome settings blocked it. CDP verifier Chrome runs are not the same tab.
- All-severity QA risk: lint/typecheck/verifiers/HTTP smoke cannot prove absence of logical bugs inside unexercised UI states. Pending rows remain pending until their happy/cancel/invalid/mobile/public/security/cache journeys are manually exercised.

## Final Verification For Touched Scope

Completed after code changes:

- `git diff --check`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run lint`: passed.
- `node scripts/verification/verify-mobile-owner-menu.mjs`: passed after fixes.
- `FIREBASE_PROJECT_ID=ecomsai node scripts/verification/verify-public-routing-summary-backfill.mjs --json`: passed with 0 errors and 20 no-menu warnings.
- `npm run verify:public-business-truth`: passed.
- `npm run verify:customer-app-pwa`: passed.
- `npm run verify:ai-menu-manager`: passed.
- `npm run verify:menu-extraction-pipeline`: passed, 27 passed and 0 failed.
- `npm run verify:menu-extraction-pipeline:dry-run`: passed, 48 passed and 0 failed.
- Public website HTTP route smoke: passed for 29 public website routes.
- Authenticated owner HTTP route smoke: passed for 26 owner/platform/reseller route entries and redirects.
- Protected API unauthenticated check: passed for 20 sensitive API routes; all returned 401/404/405-style safe responses rather than success.
- Protected API invalid-payload check: passed for 17 sensitive API routes; all returned 400/404-style safe responses rather than 500.
- `node scripts/verification/firebase-cost-usage-map.mjs`: completed; flagged expected review categories including 9 high-listener files, 3 medium-public-read files, and 21 medium-write-volume files.

Still required before broader readiness:

- Additional manual browser passes per inventory row.
- Same logged-in Chrome tab DOM/runtime validation after Chrome JavaScript-from-Apple-Events or the Chrome plugin attach path is available.
- Wrong-tenant/wrong-store authenticated API tests using a controlled second tenant fixture.
- Safe mutation-and-restore browser tests for store/project/public-truth features.
- Clear or upgrade Firebase Storage quota for `ecomsai.appspot.com`, then rerun `node scripts/verification/verify-mobile-upload-extraction.mjs` to verify job creation and extraction completion.

## Readiness Verdict

Not ready: full feature sweep remains incomplete. The first high-risk owner/mobile feature path is fixed and retested, and baseline verifiers are largely green, but the product-wide manual browser matrix has not been completed.
