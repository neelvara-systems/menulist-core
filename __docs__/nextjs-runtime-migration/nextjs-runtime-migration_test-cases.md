# Next.js Runtime Migration Test Cases

**Status:** PLANNED — results must be recorded in a separate validation artifact
**Rule:** Every final release gate runs on the same exact commit and lockfile

## 1. Evidence levels

| Level | Evidence | What it proves |
|---|---|---|
| L0 | Source inventory and dependency metadata | Expected migration surface and supported peer ranges |
| L1 | Typecheck, lint, static verifiers | Compile-time and declared source contracts |
| L2 | Focused unit/emulator tests | Business/security/cache behavior in controlled fixtures |
| L3 | Clean build and real `next start` HTTP smoke | Generated production runtime can actually serve routes |
| L4 | Browser/PWA journeys | Hydration, navigation, interaction, worker, visual, and console behavior |
| L5 | Explicit preview/device/provider evidence | Hosted platform, domain, CDN, physical device, and external integration behavior |

No lower level substitutes for a higher level. In particular, L1/L2/L3 do not prove browser or deployed behavior.

## 2. Dependency and source gates

| ID | Test | Expected result |
|---|---|---|
| DEP-01 | `node`, npm, TypeScript version check | Node is at least 20.9; current TypeScript meets Next 16 minimum |
| DEP-02 | Exact package/lockfile parity | Every root declaration is exact and matches root/resolved lockfile entries |
| DEP-03 | `npm ls --depth=0` and full peer tree | No invalid/missing peer for Next, React, React DOM, ESLint, PWA, intl, registry, Redux, Motion |
| DEP-04 | Install log review | No `--force`, `--legacy-peer-deps`, or ignored peer failure |
| DEP-05 | Direct package scan | No `next-pwa` or `@emoji-mart/react`; approved Serwist packages only |
| DEP-06 | Framework package scan | Next/React/types/analyzer/config match exact approved pins |
| DEP-07 | `npm audit --omit=dev --json` | Next/React/PWA direct blockers cleared; every remaining high/critical has disposition |
| SRC-01 | Private import scan | No first-party runtime/config import from `next/dist/**`, absent approved exception |
| SRC-02 | Compatibility-plugin scan | `MenuListServerChunkCompatPlugin` and manifest alias/shim logic absent in final state |
| SRC-03 | Async request API AST gate | Zero synchronous `headers`, `cookies`, or `draftMode` access |
| SRC-04 | App entry-point AST gate | Next-supplied params/searchParams are typed/resolved as promises |
| SRC-05 | Codemod residue scan | Zero `@next/codemod` comments and zero `UnsafeUnwrapped*` casts |
| SRC-06 | Cache API AST gate | Zero one-argument `revalidateTag` calls |
| SRC-07 | Lint-contract scan | No `next lint`, no Next config `eslint` option, valid flat config |
| SRC-08 | Config-option check | `serverExternalPackages` top-level and no removed/unsupported Next 16 option |
| SRC-09 | Parallel route check | Every future `@slot` has a `default` entry; currently zero slots |
| SRC-10 | Legacy API check | No legacy image, AMP, server/public runtime config, or removed API introduction |

## 3. Compilation and build gates

Run separately for C3 Next 15 bridge, C4 Next 16 Webpack, and C6 final Turbopack.

| ID | Test | Expected result |
|---|---|---|
| BUILD-01 | Clean typecheck | Exit 0; no suppressed framework/type migration errors |
| BUILD-02 | Flat-config lint at final checkpoint | Exit 0; targeted file invocation also works |
| BUILD-03 | Functions TypeScript builds when shared contracts are touched | Exit 0; no deploy |
| BUILD-04 | Clean isolated build output | Exit 0 from an empty dedicated dist directory |
| BUILD-05 | Route generation log review | No missing pages, unexpected static export, async API warning, or silent dropped route |
| BUILD-06 | Native server output | No first-party manifest repair required |
| BUILD-07 | Real `next start` | Server becomes ready within bounded timeout and remains healthy through matrix |
| BUILD-08 | 404 and error shells | Unknown route returns intended 404; no missing `/_document`, `/_error`, or client reference manifest error |
| BUILD-09 | Repeated clean build | Second clean build is deterministic enough to serve the same route matrix |
| BUILD-10 | Differential Webpack/Turbopack route matrix | Status, redirect, content type, and security/cache headers are equivalent where required |

## 4. HTTP route matrix

The maintained smoke runner must use controlled Host headers and follow redirects only when the case says so. Exact production domains come from repo constants, not hardcoded invented aliases.

### 4.1 MenuList public/customer

| ID | Journey | Assertions |
|---|---|---|
| ML-PUB-01 | Root website | 200, correct content type, CSP/security headers, no hydration/runtime error |
| ML-PUB-02 | Pricing/resources/legal representative routes | 200 or documented redirect; metadata and canonical origin correct |
| ML-PUB-03 | Locale-prefixed resource route | promised locale/slug resolved; correct 200/404 behavior |
| ML-PUB-04 | Tenant root menu | host rewrites to customer namespace without exposing internal `/client` URL |
| ML-PUB-05 | Tenant OBP route | correct store content, schema, cache header, and no auth wall |
| ML-PUB-06 | Tenant robots/sitemap/manifest | correct content types and host-aware URLs |
| ML-PUB-07 | Direct internal `/sites/*` on protected environment | blocked/redirected exactly as middleware doctrine requires |
| ML-PUB-08 | Unknown tenant/custom domain | fail closed; no cross-tenant fallback |
| ML-PUB-09 | Local dev host with port | host parsing and local routing preserve intended tenant/product behavior |
| ML-PUB-10 | Image optimization for Firebase/Google avatar/approved remote patterns | successful allowed images; denied unapproved/local-IP source |

### 4.2 MenuList owner app

| ID | Journey | Assertions |
|---|---|---|
| ML-OWN-01 | Unauthenticated owner route | expected signin redirect; cookie/security headers correct |
| ML-OWN-02 | Signin and session bootstrap | no redirect loop; correct active product/store/session scope |
| ML-OWN-03 | Dashboard | Redux persisted state hydrates once; no mismatch/console error |
| ML-OWN-04 | Store switch | active tenant changes atomically; old store data does not leak |
| ML-OWN-05 | Menu editor CRUD/publish | action succeeds, state refreshes, public invalidation fires |
| ML-OWN-06 | Business settings | forms, Ant registry styles, locale/timezone providers, save feedback work |
| ML-OWN-07 | Billing/transactions | protected route and React/Redux rendering remain stable |
| ML-OWN-08 | Dynamic API routes with params | valid param accepted; missing/malformed/unauthorized paths reject correctly |
| ML-OWN-09 | SVG/PDF.js/native-canvas representative flow | final Turbopack config/source boundaries load without client server-module leak |
| ML-OWN-10 | Sentry instrumentation | no config/build error; controlled non-sensitive event behavior remains valid |

### 4.3 Answerlattice

| ID | Journey | Assertions |
|---|---|---|
| AL-01 | Public Answerlattice root and representative pages | 200, host/base-path links correct after async headers migration |
| AL-02 | Comparison, developer, product, resource, and use-case dynamic routes | valid params render; invalid params 404; metadata correct |
| AL-03 | Pricing, security, trust, privacy, terms | 200 and correct public headers/claims |
| AL-04 | Dashboard unauthenticated/authenticated | correct redirect/access; no provider/session regression |
| AL-05 | Hosted help catch-all | optional segments resolve correctly; canonical host enforcement remains |
| AL-06 | Hosted-help robots and sitemap | async headers/host behavior and content type correct |
| AL-07 | Widget public route/API | credential/origin/runtime-token boundary unchanged |
| AL-08 | Management dynamic APIs | promised params resolve before auth/business handler; inactive/foreign scope denied |
| AL-09 | Public disabled API/MCP surfaces | remain disabled/fail closed by default |
| AL-10 | Answerlattice PWA assets | manifest/icons/splash and registration policy unchanged |

### 4.4 CampaignCue

| ID | Journey | Assertions |
|---|---|---|
| CC-01 | Public CampaignCue root | remains dynamic where header-derived base path requires it |
| CC-02 | Feature slug route | promised slug resolves, metadata/render 200; invalid slug 404 |
| CC-03 | Small-business use case | dynamic host/base-path behavior preserved |
| CC-04 | Protected workspace | remains dynamic; unauthenticated redirect and authenticated render correct |
| CC-05 | Editor test/local host route | header-derived local behavior works without static prerender error |
| CC-06 | Build/start regression | no `Cannot read properties of undefined`, manifest, or page-data error |
| CC-07 | CampaignCue PWA assets | asset identities and host isolation pass |

### 4.5 SignalDesk

| ID | Journey | Assertions |
|---|---|---|
| SD-01 | Signin layout and route | async headers and host/session behavior correct |
| SD-02 | Protected workspace | auth, product scope, and redirect boundary unchanged |
| SD-03 | Webhook provider dynamic param | promised provider resolves; unsupported provider rejected before work |
| SD-04 | Representative API negative paths | auth/validation/rate-limit behavior unchanged |

### 4.6 MyCodex

| ID | Journey | Assertions |
|---|---|---|
| MC-01 | Root/catch-all docs route | promised segments resolve and doc tracing includes required files |
| MC-02 | Basic auth/session | private content remains private; cache headers no-store |
| MC-03 | Favorites/queue/creative editor test | async headers and client hydration work |
| MC-04 | Host/domain boundary | only intended MyCodex host/path maps to static reader |
| MC-05 | MyCodex worker | correct host/scope, private shell only, no other product registration |

## 5. Auth, security, and routing tests

| ID | Test | Expected result |
|---|---|---|
| SEC-01 | NextAuth cookie matrix over local HTTPS/preview | secure/same-site/domain behavior unchanged |
| SEC-02 | `withAuth` dynamic route context | params resolved once; valid session/role passes; missing/foreign role denied |
| SEC-03 | CORS preflight and disallowed origin | allowed preflight succeeds; disallowed origin rejects before expensive work |
| SEC-04 | CSP per product | required Firebase/Answerlattice/provider origins remain; no unsafe broadening |
| SEC-05 | HSTS/frame/content-type/referrer/permissions headers | present according to current environment contract |
| SEC-06 | Host header normalization | malformed/unknown host fails closed; no open redirect or sister-product confusion |
| SEC-07 | Rewrite header sanitization | internal routing headers cannot be supplied by an external requester to bypass routing |
| SEC-08 | Direct protected internal path | production environment blocks internal sites/hosted-help paths as designed |
| SEC-09 | API authentication negative path | protected dynamic and non-dynamic APIs return generic 401/403 without details |
| SEC-10 | Middleware/proxy comparison, if Phase 7 is attempted | identical security outcomes and acceptable latency under Node runtime |

## 6. Cache correctness tests

These cases must inspect the first public read after mutation, not only a later eventually fresh read.

| ID | Mutation | Required tags/behavior |
|---|---|---|
| CACHE-01 | Owner publishes menu item/category change | immediate expiry for `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` as applicable |
| CACHE-02 | Mobile owner publishes equivalent change | same behavior as desktop through shared invalidating boundary |
| CACHE-03 | Store identity/hours/contact update affecting OBP | first public menu/OBP read reflects change |
| CACHE-04 | Special menu switch | active public menu changes without stale-while-revalidate exposure |
| CACHE-05 | PWA/customer app setting change | first allowed public read reflects change; service worker does not mask it |
| CACHE-06 | Multi-outlet propagation/override | every affected outlet tag invalidated; unaffected outlet remains isolated |
| CACHE-07 | Direct server/API write path | server tags revalidated with classified immediate semantics |
| CACHE-08 | Non-critical content classified `'max'` | stale-while-revalidate occurs only for the explicitly approved content |
| CACHE-09 | Server Action using `updateTag` | read-your-own-write holds and API is used only in valid Server Action context |
| CACHE-10 | Cache failure/unknown tag | no false success claim; logging remains bounded and non-sensitive |

## 7. PWA and mobile tests

| ID | Test | Expected result |
|---|---|---|
| PWA-01 | Fresh owner worker install | Serwist owner worker installs, activates, controls correct host/scope |
| PWA-02 | Upgrade from existing Workbox worker | new worker takes control; legacy owner cache names cleaned deliberately |
| PWA-03 | Owner offline navigation | approved owner offline fallback/shell works; protected data not leaked |
| PWA-04 | Customer worker install | only `sw-customer.js`; no owner/Serwist worker |
| PWA-05 | Customer offline | offline fallback works according to policy; no menu content exists in Cache Storage |
| PWA-06 | Customer online after owner publish | fresh public menu appears; worker does not mask server invalidation |
| PWA-07 | MyCodex worker | only `mycodex-sw.js` and private shell policy |
| PWA-08 | Wrong-host negatives | no customer/MyCodex/owner worker cross-registration |
| PWA-09 | Multiple tabs/update | controller change does not loop/reload or strand mixed worker versions |
| PWA-10 | Clear/unregister recovery | documented recovery restores a clean install |
| MOB-01 | 390x844 owner shell | Today/Menu/Share/More, nested MobileShell, active state, back behavior, no clipping |
| MOB-02 | Touch targets | primary mobile actions remain at least 44x44px |
| MOB-03 | Sheets/forms/keyboards | focus, scroll, safe area, submit/cancel, validation work |
| MOB-04 | Reduced motion | Motion upgrade respects reduced-motion settings |
| MOB-05 | iOS Safari/standalone | install/launch/navigation/keyboard/safe-area/worker behavior |
| MOB-06 | Android Chrome/standalone | install/launch/navigation/back/worker behavior |

## 8. React/Redux/UI tests

| ID | Test | Expected result |
|---|---|---|
| UI-01 | SSR/hydration console | no mismatch, duplicate root, missing key, ref, or effect warning on representative routes |
| UI-02 | Redux Persist bootstrap | state rehydrates once and auth/store scope remains authoritative |
| UI-03 | Logout and tenant switch | persisted sensitive state clears/changes correctly |
| UI-04 | Ant Design SSR styles | no flash/missing CSS across all product layouts |
| UI-05 | Locale switch | messages, number/date/time, direction, route behavior remain correct |
| UI-06 | Emoji picker | search/category/locale/dark/keyboard/touch/native selection work without React wrapper |
| UI-07 | Motion enter/exit/layout | animations complete; no stuck exit or layout jump |
| UI-08 | Forms/modals/drawers | submit, Form.List, focus trap, close, validation unchanged |
| UI-09 | Error/loading/not-found boundaries | render under navigation and direct request without 500 |
| UI-10 | Fast Refresh | dev edits refresh without full state corruption or repeated side effects |

## 9. Performance and cost comparison

Collect baseline and final values under the same machine/fixture where possible.

| ID | Metric | Acceptance |
|---|---|---|
| PERF-01 | Clean build duration and peak memory | recorded; material regression explained and accepted |
| PERF-02 | Dev cold start and first compile | no blocking regression; Turbopack benefit recorded without using it as correctness proof |
| PERF-03 | `next start` representative TTFB | no >15% unexplained regression on comparable local runs |
| PERF-04 | Browser LCP/interaction/layout shift | no >15% unexplained regression on representative public/owner/mobile routes |
| PERF-05 | Downloaded JS/network payload | no material unexpected increase; Next 16 removed build size metrics, so browser evidence is authoritative |
| PERF-06 | Middleware/proxy overhead | proxy accepted only if route latency remains acceptable |
| PERF-07 | Owner worker/precache size | bounded and below configured maximum; no broad protected/customer precache |
| COST-01 | Public read count after cache migration | no extra read loop or accidental stale refresh fan-out |
| COST-02 | Firebase operation inventory | zero new runtime Firestore/Storage/Function operation introduced by migration |

## 10. Documentation and governance tests

| ID | Test | Expected result |
|---|---|---|
| DOC-01 | `npm run docs:check-links` | Exit 0 |
| DOC-02 | `npm run verify:doc-npm-scripts` | Exit 0 after lint/build command migration |
| DOC-03 | Dependency freeze | Exact final package set, lockfile, node_modules, and active stack docs pass |
| DOC-04 | Stale runtime scan | Active authority docs do not present Next 14/React 18/next-pwa as current |
| DOC-05 | Historical evidence | Dated audits remain historical and are not rewritten as current proof |
| DOC-06 | Migration validation artifact | Includes commands, exit codes, route/PWA/browser evidence, audit disposition, unresolved external gates |
| DOC-07 | Infrastructure risk tracker | Runtime risk moves from planned to resolved only after all local final gates pass; deploy evidence stays separate |
| DOC-08 | Diff integrity | `git diff --check` passes; unrelated user changes preserved |

## 11. External preview and release tests

These require explicit Vercel deploy permission and are not part of planning/local implementation authority.

| ID | Test | Expected result |
|---|---|---|
| EXT-01 | Preview build/install | Exact lockfile installs without peer override; Turbopack/Serwist build passes |
| EXT-02 | Preview host matrix | Product domains/paths/redirects/rewrites/security headers match local evidence |
| EXT-03 | Preview worker update | HTTPS install/update/offline/cache inspection passes |
| EXT-04 | Preview image/CDN | remote images, cache headers, invalidation, redirects behave as intended |
| EXT-05 | Authenticated preview | owner/product sessions and cookies work on actual preview/custom test domains |
| EXT-06 | Physical devices/browsers | Chrome, Firefox, Safari, iOS Safari, Android Chrome and standalone PWA pass |
| EXT-07 | Monitoring | errors/releases/source maps visible without sensitive logging |
| EXT-08 | Production decision | explicit owner approval after evidence; never inferred from local green state |

## 12. Result recording format

For every test record:

- ID and checkpoint.
- Date/time and commit.
- Exact command or manual steps.
- Fixture/host/browser/device.
- Exit code/status and concise output.
- Artifact path for screenshots/logs where maintained.
- Pass/fail/blocked.
- Failure owner and rollback checkpoint.
- Whether evidence is local, emulator, preview, device, provider, or production.

No planned row may be marked passed until the evidence exists on the final commit.
