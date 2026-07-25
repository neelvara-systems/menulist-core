# Next.js Runtime Migration Validation

**Status:** LOCAL SOURCE, BUILD, ISOLATED DEPLOYMENT TRACE, AND START VALIDATION PASSED
**Validated:** July 25, 2026
**Runtime:** Node 22.23.1 / Next.js 16.2.11 / React 19.2.8
**Worktree base:** `fc292e9446ee3627ebf973a6adf291e3766f5474`
**Deployment:** `efc9456` failed from Vercel build OOM. The OOM-corrected `887f76ad` built and deployed, but every server-rendered staging route returned 500 because its route trace omitted `@swc/helpers`. The trace correction is locally verified and not yet redeployed.

## Result

The shared runtime migration is locally complete. The exact migrated worktree passes clean installation/dependency resolution, type and lint checks, native Next 16 Turbopack and Webpack production builds, production start, local multi-product routing, service-worker generation, real Next image optimization, development-browser editor QA, and focused cross-product source contracts.

This is codebase evidence, not Vercel deploy approval or production-host/device certification.

## Exact runtime

| Package | Frozen version |
|---|---:|
| `next` | 16.2.11 |
| `react`, `react-dom` | 19.2.8 |
| `next-intl` | 4.13.4 |
| `next-auth` | 4.24.15 |
| `@ant-design/nextjs-registry` | 1.3.0 |
| `@reduxjs/toolkit` | 2.12.0 |
| `react-redux` | 9.3.0 |
| `framer-motion` | 12.42.2 |
| `eslint` | 9.39.5 |
| `eslint-config-next` | 16.2.11 |
| `@serwist/turbopack`, `serwist` | 9.5.12 |
| `fabric` | 7.4.0 |
| `firebase-admin` | 14.2.0 |
| root `postcss` | 8.5.23 |
| Next optional `sharp` override | 0.35.3 |
| transitive `uuid` override | 11.1.1 |

No install used `--force`, `--legacy-peer-deps`, or a peer override. `next-pwa` and `@emoji-mart/react` are absent.

## Build evidence

| Gate | Result |
|---|---|
| `npm run build` | Passed with Next 16.2.11 Turbopack |
| Turbopack page generation | 439/439 |
| `npm run build:webpack` | Passed with Next 16.2.11 Webpack |
| Webpack page generation | 439/439 |
| Serwist generation | Passed in both builds |
| Serwist precache | 51 bounded entries; about 2.5 MiB |
| Proxy convention | Build output reports `Proxy (Middleware)` |
| TypeScript inside both builds | Passed |
| Clean-lockfile rebuild | `npm ci` followed by Turbopack build passed, 439/439 |
| Cold Vercel-equivalent build after OOM correction | Passed with a 4096 MiB V8 ceiling, 439/439 pages |
| Whole-repository filesystem trace warnings | Reduced from four to zero |
| Exact `build:vercel` peak resident memory | Reduced from 7,292,469,248 to 6,735,249,408 bytes (557,219,840 bytes reclaimed) |
| Exact `build:vercel` after deployment-trace correction | Passed end to end at 6,728,482,816-byte peak RSS |
| Isolated website deployment bundle | Passed; 313 traced files and symlinks, including the Next 16 SWC helper runtime |

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

After correction, the exact Node 22.23.1 `npm run build:vercel` passed TypeScript, zero-warning ESLint, compilation, 439/439 page generation, and the isolated 313-file deployment route at 6,728,482,816-byte peak RSS. `next start` returned 200 for `/`, `/signin`, `/privacy-policy`, and `/robots.txt` under the staging hostname contract. Chrome rendered the complete homepage with zero console errors.

This is corrected-source evidence. `menulist.online` remains broken until Vercel receives and deploys this source.

## Served-runtime HTTP matrix

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

Final July 25 audit snapshot:

- `npm audit --omit=dev`: 2 total — 0 critical, 1 high, 1 moderate, 0 low.
- `npm audit`: 2 total — 0 critical, 1 high, 1 moderate, 0 low.
- The two entries are `postcss` and direct parent `next`; both describe Next 16.2.11's exact nested `postcss@8.4.31`.
- A fresh `npm ci` reproduced this exact result across 1,660 audited packages.
- `npm ls --all` exits zero with no invalid or missing peers. Its two macOS-only “extraneous” entries are Sharp optional WebAssembly artifacts installed by the clean lockfile.

The root application itself pins patched PostCSS 8.5.23 and does not process untrusted CSS at runtime. Next's private pin must not be overridden or patched locally. npm's suggested `--force` action downgrades the framework to Next 9.3.3 and is rejected. Upgrade when a stable Next release carries the patched nested PostCSS; do not adopt a canary only to suppress the audit.

The maintained global policy and stop rules are in [Dependency Security](../security/dependency-security/complete-guide.md). `npm run verify:answerlattice-security-audit` now permits at most this one high/one moderate family and rejects any new critical, low, high, or moderate package.

## External release evidence still required

A later explicitly authorized Vercel preview/release must capture:

- representative desktop and mobile browser routes for every product host;
- real owner worker replacement from legacy `/sw.js` to `/serwist/sw.js`;
- install, update, offline fallback, and wrong-host worker checks on iOS and Android;
- preview and production response/security headers;
- authenticated owner and product-app smoke;
- production-host monitoring after release.

No Firebase rules, indexes, Storage rules, or Cloud Functions changed, so no Firebase deploy was triggered.
