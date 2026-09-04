# Next.js Runtime Migration Validation

**Status:** NEXT 16.3.4 SOURCE AND STATIC RUNTIME CONTRACTS VALIDATED; FULL BUILD EVIDENCE REMAINS FROM 16.3.0
**Validated:** September 4, 2026
**Runtime:** Node 22.23.1 / Next.js 16.3.4 / React 19.2.8
**Upgrade worktree base:** `e24ee02efb39669c029c56c2211624d2bc8e9c87`
**Original migration worktree base:** `fc292e9446ee3627ebf973a6adf291e3766f5474`
**Deployment:** `efc9456` failed from Vercel build OOM. The OOM-corrected `887f76ad` exposed an omitted `@swc/helpers` trace. After that source correction, production `/signin` exposed native Firebase Admin loading across the `jwks-rsa` CommonJS and ESM-only `jose` boundary. Both packaging corrections are locally verified and not yet redeployed.

## Result

The shared runtime migration remains complete. The Next 16.3.4 security patch has exact declaration/lock alignment and passes the maintained source/static runtime contracts. The full build, production-start, local multi-product routing, service-worker, and real image-optimization results below were produced on 16.3.0 and remain historical evidence until the consolidated release candidate reruns those expensive gates.

This is codebase evidence, not Vercel deploy approval or production-host/device certification.

## September 4 Next 16.3.4 security patch

Next.js 16.3.4 was adopted with matching `eslint-config-next` and `@next/bundle-analyzer` releases after the vendor's August 2026 image-optimization RCE disclosure. The application already uses bounded `remotePatterns`; the patch does not broaden image hosts, enable experimental runtime flags, or change Firebase, tenancy, routing, cache, or PWA contracts.

## August 5 stable 16.3 upgrade closure

Stable Next 16.3.0 was adopted with the matching `eslint-config-next` and `@next/bundle-analyzer` releases. Its private PostCSS dependency is patched `8.5.23`, so the former Next 16.2.11/PostCSS audit exception was closed without an override, canary, preview, forced audit fix, framework downgrade, or `node_modules` patch. This is retained as the prior minor-upgrade evidence; the active frozen patch is now 16.3.4.

The 16.3 generated route checks exposed and closed four compatibility gaps:

- the shared authenticated route wrapper now requires the asynchronous route context and resolves `context.params` before protected handlers validate dynamic IDs;
- the one static route that invokes the wrapper internally supplies an explicit empty promised parameter object;
- the Answerlattice robots renderer and policy constants moved out of the route entry module, leaving only supported Next route exports;
- the Answerlattice get-started page now declares the asynchronous `searchParams` contract.

The upgrade deliberately keeps Cache Components, Partial Prefetching, the experimental Rust compiler, offline compiler mode, and TypeScript 7 disabled. Those are separate opt-in architecture decisions, not requirements for receiving the stable 16.3 default runtime improvements.

## Exact runtime

| Package | Frozen version |
|---|---:|
| `next` | 16.3.4 |
| `react`, `react-dom` | 19.2.8 |
| `next-intl` | 4.13.4 |
| `next-auth` | 4.24.15 |
| `@ant-design/nextjs-registry` | 1.3.0 |
| `@reduxjs/toolkit` | 2.12.0 |
| `react-redux` | 9.3.0 |
| `framer-motion` | 12.42.2 |
| `eslint` | 9.39.5 |
| `eslint-config-next` | 16.3.4 |
| `@serwist/turbopack`, `serwist` | 9.5.12 |
| `fabric` | 7.4.0 |
| `firebase-admin` | 14.2.0 |
| root `postcss` | 8.5.23 |
| Next private `postcss` | 8.5.23 |
| direct `brace-expansion` | 1.1.18 |
| direct `fast-uri` | 3.1.7 |
| transitive `browserslist` | 4.28.9 |
| transitive `fflate` | 0.8.3 |
| transitive `postcss-selector-parser` | 6.1.3 |
| Next optional `sharp` override | 0.35.3 |
| transitive `uuid` override | 11.1.1 |

No install used `--force`, `--legacy-peer-deps`, or a peer override. `next-pwa` and `@emoji-mart/react` are absent.

## Historical 16.3.0 build evidence

| Gate | Result |
|---|---|
| `npm run build:vercel` | Passed with Next 16.3.0 Turbopack under Node 22.23.1 |
| Turbopack page generation | 441/441 |
| `npm run build:webpack` | Passed with Next 16.3.0 Webpack under Node 22.23.1 |
| Webpack page generation | 441/441 |
| Serwist generation | Passed in both builds |
| Serwist precache | 52 bounded entries; about 2.5 MiB |
| Proxy convention | Build output reports `Proxy (Middleware)` |
| TypeScript inside both builds | Passed |
| Clean-lockfile rebuild | Node 22.23.1 `npm ci` audited 1,619 packages with zero vulnerabilities; subsequent Turbopack build passed 441/441 |
| Cold Vercel-equivalent build after OOM correction | Passed with a 4096 MiB V8 ceiling, 439/439 pages |
| Whole-repository filesystem trace warnings | Reduced from four to zero |
| Exact `build:vercel` peak resident memory | Reduced from 7,292,469,248 to 6,735,249,408 bytes (557,219,840 bytes reclaimed) |
| Exact `build:vercel` after deployment-trace correction | Passed end to end at 6,728,482,816-byte peak RSS |
| Isolated website deployment bundle | Passed; 313 traced files and symlinks, including the Next 16 SWC helper runtime |
| Exact `build:vercel` after permanent Firebase Admin build-contract enforcement | Passed end to end at 7,044,726,784-byte peak RSS; 439/439 pages |
| Isolated sign-in deployment bundle | Passed; 429 traced files, no hashed Firebase Admin native external, and no raw `jwks-rsa` or nested `jose` entry |
| Isolated NextAuth API deployment bundle | Passed; 329 traced files, no hashed Firebase Admin native external, and successful route load without the repository's full `node_modules` |
| Current isolated deployment bundles | Passed; website 423, sign-in 474, NextAuth API 365 traced files; all three route bundles isolated-loaded |

Expected non-blocking warnings:

- Existing Sass `@import` deprecations remain. They are styling-modernization debt, not a Next 16 regression.
- Local build workers report missing optional Gemini key slots where the local environment intentionally does not supply them.

The Vercel failure was a total-container OOM, not a TypeScript, lint, or Next compilation diagnostic. The standard build had an 8 GiB machine while `build:vercel` allowed V8 to reserve 6144 MiB alongside Turbopack's native Rust allocations. The corrected command limits V8 to 4096 MiB, disables server source maps explicitly, and marks runtime-only MyCodex/credential filesystem paths with `turbopackIgnore`. Explicit MyCodex Markdown output tracing remains, so required documents still ship without making Turbopack traverse unrelated repository assets.

## Staging runtime-trace regression and closure

The user-deployed staging commit `887f76ad` proved that a successful `next build` and local `next start` were not enough for this migration:

- `https://menulist.online/`, `/signin`, `/privacy-policy`, and a dynamic API path returned the cached Next 500 page.
- `/robots.txt` and `/sitemap.xml` returned 200 because their static outputs did not need the broken server route bundle.
- The same build returned 200 locally because the complete repository `node_modules` remained available.
- Copying only the website route's `.nft.json` files into an isolated directory reproduced `Cannot find module '@swc/helpers/_/_interop_require_default'`.
- The root cause was the migration's broad `node_modules/@swc/**` tracing exclusion. Next 16's Turbopack server runtime imports `@swc/helpers` after deployment.
- The corrected configuration traces the helper runtime and excludes only compiler-specific SWC packages.
- `verify:next-deployment-bundle` now preserves traced symlinks, requires the helper trace, and loads the isolated website route after every Vercel build.

## Cloud Tasks proto trace regression and closure

The exact MenuList QA staging build `dee3ab5589176da136fd006a674c00c2eafc96ea`
returned an empty 500 for anonymous `POST
/api/image-generation/batch-trigger` before `withAuth` could return 401. Current
Vercel runtime evidence identified module-load failure in the external
`@google-cloud/tasks` ESM path: `json-helper.cjs` could not find
`node_modules/@google-cloud/tasks/build/protos/protos.json` in the serverless
bundle.

The correction keeps `@google-cloud/tasks` server-externalized and adds only
that exact descriptor to the batch-trigger route trace. The maintained source
gate freezes the narrow include, and `verify:next-deployment-bundle` now fails
if the route trace omits it or if the isolated route cannot load without the
repository's complete `node_modules`. This changes deployment packaging only;
it adds no Firestore read/write, Storage operation, Cloud Task, AI provider
call, cache entry, dependency, Firebase deploy, or payment execution.

After correction, the exact Node 22.23.1 `npm run build:vercel` passed TypeScript, zero-warning ESLint, compilation, 439/439 page generation, and the isolated 313-file deployment route at 6,728,482,816-byte peak RSS. `next start` returned 200 for `/`, `/signin`, `/privacy-policy`, and `/robots.txt` under the staging hostname contract. Chrome rendered the complete homepage with zero console errors.

This was corrected-source evidence at the time. The historical observation does not assert the current deployed state of `menulist.online`.

## Production sign-in Firebase Admin regression and closure

On July 26, Chrome reproduced the current production failure by clicking the desktop website header Login link:

- The header correctly navigated to `/signin?callbackUrl=%2Fdashboard`.
- Vercel returned 500 while loading the hashed `firebase-admin-<hash>/auth` external.
- The deployed Node runtime then executed `jwks-rsa/src/utils.js` as CommonJS, whose `require('jose')` reached the nested ESM-only `jose` 6 web API entry and raised `ERR_REQUIRE_ESM`.
- Local `next start` with the repository's complete `node_modules` did not expose the same packaging failure, so status-only local checks were not sufficient.

The correction removes Firebase Admin from Next and Webpack server externals, adds it to `transpilePackages`, and retains client-only aliases that keep Admin SDK imports out of browser bundles. This is now a build-enforced architecture rather than a mutable configuration convention:

- `build:verify` executes the Next source/dependency contract before TypeScript and lint on every Vercel build.
- The contract freezes Node 22.23.1 and the installed Firebase Admin 14.2.0 → `jwks-rsa` 4.1.0 → nested `jose` 6.2.4 chain.
- It rejects `jwks-rsa`/`jose` overrides, Firebase Admin server externalization, and removal from `transpilePackages`.
- The post-build gate rejects hashed Firebase Admin externals and isolated-loads the website, sign-in, and NextAuth API route traces without the repository's full `node_modules`.

After correction, the exact Node 22.23.1 `npm run build:vercel` passed TypeScript, zero-warning ESLint, compilation, 439/439 page generation, and all isolated route contracts. The latest isolated counts are website 315, sign-in 429, and NextAuth API 329 traced files. Under `next start`, Chrome followed the exact desktop homepage Login link to the full “Welcome back” screen, a direct sign-in reload retained the screen, and the browser console contained zero warnings or errors. Host-forwarded HTTP probes returned 200 for both `/signin?callbackUrl=%2Fdashboard` and `/api/auth/session`; no Firebase Admin, `jwks-rsa`, `jose`, or `ERR_REQUIRE_ESM` error appeared in the server log.

This proved the corrected local source and deployment bundle at the time. The historical observation does not assert the current deployed state of `menulist.online`.

## Served-runtime HTTP matrix

The August 5 Next 16.3 final Turbopack/Vercel output was served under Node 22.23.1 on port 3000 with process-only `VERCEL=1` and `VERCEL_ENV=development` markers. This keeps the compiled local deployment-stage contract aligned while exercising the Vercel-style non-crashing missing-secret boundary; no environment file or secret was written. `/`, `/signin?callbackUrl=%2Fdashboard`, `/api/auth/session`, `/privacy-policy`, `/robots.txt`, and `/serwist/sw.js` each returned 200.

Chrome loaded the homepage, found the single desktop Login link, followed it to the exact callback URL, rendered the full “Welcome back” and “Continue with Google” UI, and retained the sign-in UI after a direct reload. The browser console contained zero warnings or errors, and the server emitted no Firebase Admin, `jwks-rsa`, `jose`, or `ERR_REQUIRE_ESM` failure. This is unauthenticated local route/module-load evidence; it does not claim real OAuth or credential-backed Firebase behavior.

The completed Webpack output was served with `next start -p 3100`. Because a local build intentionally resolves the `local` deployment stage unless Vercel supplies its deployment markers, product routing was exercised through the canonical local aliases. Production and preview hostname mappings are separately guarded by `test-deployment-stage-boundary.js` and `verify:url-routing-boundary`; this run does not claim a Vercel-host smoke.

| Local path | Result |
|---|---|
| `/` | 200, MenuList website title |
| `/__answerlattice` | 200, Answerlattice website title |
| `/__campaigncue` | 200, CampaignCue website title |
| `/__neelvara` | 200, Neelvara website title |
| `/signaldesk` | 200, SignalDesk title |
| `/offline` | 200, offline fallback title |
| `/serwist/sw.js` | 200 JavaScript |
| `/_next/image?url=%2Ffavicon-16x16.png&w=32&q=75` | 200 `image/png`; valid optimized PNG through Sharp 0.35.3 |

This title-level check corrected an earlier status-only Host-header observation: supplying production host headers to a local-stage build correctly treats those hosts as custom domains. It is not valid evidence for production product-host routing.

## Creative Editor browser QA

The development-only browser harness ran against the migrated Fabric 7 runtime:

| Route | Result |
|---|---|
| `/creative-editor-smoke?qa=1` | Passed 10/10 browser checks; 17 final layers; zero console errors |
| `/creative-editor-smoke?qa=1&variant=stress` | Passed 10/10 browser checks; 89 final layers; zero console errors |

The first pass exposed a stale QA label (`Add QR code`) after the owner UI had been renamed to `Add plain QR`. The probe now selects the real accessible label; QR and barcode drawer insertion then pass through normal editor history.

## Source and product gates

Passed:

- `npm run verify:next-runtime-migration`
- `npm run verify:next-build-compatibility`
- `npm run verify:next-deployment-bundle`
- `npm run verify:dependency-freeze`
- `npm run typecheck`
- `npm run lint`
- `npm run verify:owner-pwa-lifecycle`
- `npm run verify:customer-app-pwa`
- `npm run verify:url-routing-boundary`
- `node scripts/verification/test-deployment-stage-boundary.js`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npm run verify:answerlattice-hosted-help`
- `node scripts/verification/verify-campaigncue-runtime.js`
- `node scripts/verification/verify-campaigncue-pwa-assets.js`
- `npm run verify:signaldesk`
- `npm run verify:mycodex-pwa-assets`
- `npm run verify:surfaceos-boundary`
- `npm run verify:agent-readiness`
- `npm run verify:doc-npm-scripts`
- `npm run docs:check-links`
- `npm run verify:menulist-api-tenant-safety`
- `npm run verify:campaigncue` including Firestore and Storage emulator rules

The migration verifier uses the TypeScript AST to reject synchronous imported `headers()`/`cookies()` calls and one-argument `revalidateTag()` calls.

## Dependency audit disposition

The security pass reduced the original 22 findings to two npm entries representing one upstream dependency chain.

Completed:

- Fabric 7.4.0 removed the critical native canvas/tar family and passed editor runtime compatibility checks.
- Firebase Admin 14.2.0 now runs through supported modular entry points behind the repository compatibility boundary.
- A `uuid@11.1.1` override cleared the ExcelJS, Gaxios, Teeny Request, Storage, and Firebase Admin moderate chain and passed focused compatibility checks.
- Next's optional Sharp is pinned to 0.35.3.
- Safe audit updates cleared the remaining YAML, WebSocket, minimatch, brace expansion, immutable, and diff findings.

Historical July 25 audit snapshot before stable 16.3 existed:

- `npm audit --omit=dev`: 2 total — 0 critical, 1 high, 1 moderate, 0 low.
- `npm audit`: 2 total — 0 critical, 1 high, 1 moderate, 0 low.
- The two entries are `postcss` and direct parent `next`; both describe Next 16.2.11's exact nested `postcss@8.4.31`.
- A fresh `npm ci` reproduced this exact result across 1,660 audited packages.
- `npm ls --all` exits zero with no invalid or missing peers. Its two macOS-only “extraneous” entries are Sharp optional WebAssembly artifacts installed by the clean lockfile.

August 5 closure:

- `npm audit --omit=dev`: zero vulnerabilities.
- `npm audit`: zero vulnerabilities.
- Node 22.23.1 `npm ci` reproduced the zero-vulnerability result across 1,619 audited packages.
- `npm ls --all` exits zero with no invalid or missing dependency.
- Next 16.3.0 carries private PostCSS 8.5.23; direct `brace-expansion@1.1.18`, compatible nested `brace-expansion@5.0.9`, and direct `fast-uri@3.1.5` close the additional advisories present on upgrade day.

The root and Next-resolved PostCSS copies are now both 8.5.23. The earlier exception is removed. Future framework upgrades must still avoid canary/preview releases, private dependency overrides, `node_modules` patches, forced audit fixes, or framework downgrades.

September 4 security refresh:

- root full and production audits each contain zero critical, high, and low findings;
- the only two moderate package entries are `@tiptap/core` and `@tiptap/starter-kit`, both representing `GHSA-cp6q-959q-f8rh`;
- the custom image renderer rejects own `__proto__` attributes before calling the Tiptap v2 merger, and the hostile-input test confirms that inherited `src`/`onerror` attributes are not created;
- exact compatible patches close the Browserslist, fflate, fast-uri, and selector-parser advisories without a Serwist downgrade or a Tiptap major migration.

Current local gates passed on September 4:

- dependency freeze, Next runtime migration, Next build compatibility, and Stack Change Watch readiness;
- Tiptap hostile-attribute regression and the cross-package security audit;
- root TypeScript and targeted ESLint;
- Answerlattice runtime-truth static verification;
- complete installed dependency trees for the root and all three Functions packages;
- MenuList and Answerlattice SecurityOS registry audits;
- documentation link check with zero broken links and `git diff --check`.

The maintained global policy and stop rules are in [Dependency Security](../security/dependency-security/complete-guide.md). `npm run verify:answerlattice-security-audit` now accepts only the exact controlled Tiptap pair at the root, requires zero vulnerabilities in all Functions roots, and rejects every other regression.

## External release evidence still required

A later explicitly authorized Vercel preview/release must capture:

- representative desktop and mobile browser routes for every product host;
- real owner worker replacement from legacy `/sw.js` to `/serwist/sw.js`;
- install, update, offline fallback, and wrong-host worker checks on iOS and Android;
- preview and production response/security headers;
- authenticated owner and product-app smoke;
- production-host monitoring after release.

No Firebase rules, indexes, Storage rules, or Cloud Functions changed, so no Firebase deploy was triggered.
