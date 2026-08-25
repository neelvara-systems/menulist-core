# Next.js Runtime Migration Implementation

**Status:** LOCALLY IMPLEMENTED AND VERIFIED
**Completed locally:** July 24, 2026; stable 16.3 refresh completed August 5, 2026
**Runtime:** Next.js 16.3.0 / React 19.2.8
**Bundlers:** Turbopack default; Webpack parity command retained
**Rollback anchor:** `fc292e9446ee3627ebf973a6adf291e3766f5474`
**Deployment:** User deployments exposed missing SWC trace and Firebase Admin ESM interop boundaries; corrected source is locally verified and not yet redeployed

## Implementation outcome

The shared root runtime was migrated continuously end to end. No peer override, force install, Firebase schema/rule/index/Function change, or deploy was used.

### Dependency and toolchain contract

- `next`, `eslint-config-next`, and `@next/bundle-analyzer`: `16.3.0`
- `react` and `react-dom`: `19.2.8`
- `next-intl`: `4.13.4`
- `next-auth`: `4.24.15`
- `@ant-design/nextjs-registry`: `1.3.0`
- `@reduxjs/toolkit`: `2.12.0`
- `react-redux`: `9.3.0`
- `framer-motion`: `12.42.2`
- `eslint`: `9.39.5`
- `@serwist/turbopack` and `serwist`: `9.5.12`
- `esbuild`: `0.28.1`
- `postcss`: `8.5.23` at both the root and within Next 16.3.0
- `brace-expansion`: direct compatibility pin `1.1.18`; all modern Minimatch chains resolve `5.0.9`
- `fast-uri`: direct development-tooling security pin `3.1.5`
- `next-pwa` and `@emoji-mart/react`: removed

All declarations remain exact and are guarded by `npm run verify:dependency-freeze` and `npm run verify:next-runtime-migration`.

Next 16.3 default performance improvements are accepted without enabling its opt-in application model. `cacheComponents`, `partialPrefetching`, the Rust React Compiler, experimental offline retry, and TypeScript 7 remain disabled or uninstalled until separately scoped migrations prove route, cache, PWA, type, and browser behavior.

### Framework API migration

- All imported `headers()` and `cookies()` request APIs are awaited or validly unwrapped.
- App Router `params` and `searchParams` contracts use promises where Next supplies promises.
- Every executable `revalidateTag()` call supplies an explicit second argument.
- Public menu/store/customer invalidations retain immediate expiry through `{ expire: 0 }`.
- React 19 ref initialization and global JSX type incompatibilities were corrected.
- Framer Motion variants and transitions use current typed contracts.
- Answerlattice client-only dynamic pages moved behind a Client Component wrapper so metadata stays server-owned.

### Next configuration and routing boundary

- Removed private `next/dist/**` imports and `MenuListServerChunkCompatPlugin`.
- Removed obsolete Pages Router `_app`, `_document`, and `_error` compatibility files; native Next 16 App Router handling now passes page-data collection.
- Moved the request boundary from `src/middleware.ts` to `src/proxy.ts` and exports `proxy`.
- Preserved product-domain routing, tenant routing, redirects, rewrites, CSP, HSTS, cookie, noindex, and security-header behavior.
- Moved supported options to their current top-level locations.
- Added explicit Turbopack SVGR handling for existing SVG-as-component imports.
- Retained `config.cache = false` for the diagnostic Webpack path because persistent Webpack caching reproducibly exceeded the available heap for this repository graph.
- Default `npm run build` uses Turbopack. `npm run build:webpack` is the full parity path.
- Vercel Turbopack builds cap V8 at 4096 MiB inside the standard 8 GiB container, keep browser/server source maps disabled, and exclude runtime-only credential/MyCodex filesystem expressions from automatic Turbopack tracing. Required MyCodex Markdown remains explicitly included through `outputFileTracingIncludes`.
- Output tracing never uses a global `node_modules/@swc/**` exclusion. Next 16's deployed Turbopack route runtime requires `@swc/helpers`; only compiler-specific SWC packages remain excluded.
- The server-externalized `@google-cloud/tasks` ESM runtime resolves its proto descriptor dynamically. `/api/image-generation/batch-trigger` therefore carries one narrow `outputFileTracingIncludes` entry for `build/protos/protos.json`; the include is route-scoped rather than broadening every deployment trace.
- Root `firebase-admin` stays in `transpilePackages` and out of `serverExternalPackages` and custom Webpack server externals. This bundles the Firebase Admin 14 → `jwks-rsa` 4 CommonJS → ESM-only `jose` 6 boundary instead of leaving deployed routes to native `require()`.
- Browser builds still map Firebase Admin imports to `false`; bundling the server dependency does not make Admin SDK code available to client graphs.
- `build:verify` runs `verify:next-build-compatibility` before TypeScript and lint. It freezes Node 22.23.1 plus Firebase Admin 14.2.0 → `jwks-rsa` 4.1.0 → nested `jose` 6.2.4, rejects dependency overrides/downgrades, and rejects every source configuration that could restore native Firebase Admin loading.
- `build:vercel` finishes with `verify:next-deployment-bundle`, which preserves traced files and symlinks in isolated directories, rejects hashed native Firebase Admin externals in the sign-in and NextAuth API graphs, requires the Cloud Tasks proto descriptor in the batch-image route trace, and loads website, sign-in, NextAuth API, and batch-image trigger routes without access to the repository's complete `node_modules`.

### Server and browser module boundary

Turbopack exposed a legacy browser graph that could reach `firebase-admin` through the universal Answerlattice signal emitter. The migration split persistence cleanly:

- `signalEmitter.ts` contains browser-safe validation, deduplication, and client persistence orchestration.
- `signalEmitterServer.ts` is server-only and owns Admin SDK persistence.
- API routes and server modules import the server entry point.
- Browser DAL and UI consumers remain on the browser-safe entry point.

This removes reliance on Webpack aliases that previously hid Node built-ins from the client graph.

### ESLint 9 contract

- Replaced `.eslintrc.json` with `eslint.config.mjs`.
- Preserved the repo's established rules-of-hooks and Next correctness contract.
- React Compiler adoption remains out of scope, so new compiler-only diagnostics from `eslint-plugin-react-hooks` 7 are explicitly disabled instead of forcing unrelated behavior refactors into the runtime migration.

### Service-worker contract

- Owner worker source: `src/app/sw.ts`
- Generated route: `src/app/serwist/[path]/route.ts`
- Registered URL: `/serwist/sw.js`
- Legacy `/sw.js` registrations are recognized and cleaned.
- Customer worker remains `/sw-customer.js`.
- MyCodex worker remains `/mycodex-sw.js`.
- Owner runtime caches only bounded Google font resources.
- Owner precache includes the offline fallback, CSS, owner icons, and manifests; it does not precache every product JavaScript chunk.
- Customer menu HTML/data, Firebase APIs, and application APIs are not runtime-cached by the owner worker.
- Retired broad owner cache names are deleted on activation.

## Maintained verification commands

```bash
npm run verify:dependency-freeze
npm run verify:next-runtime-migration
npm run verify:next-build-compatibility
npm run verify:next-deployment-bundle
npm run typecheck
npm run lint
npm run build:webpack
npm run build
```

The full cross-product verifier matrix and production-start HTTP evidence are recorded in `nextjs-runtime-migration_validation.md`.

## Rollback

If an externally deployed preview reveals a Next 16-only regression:

1. Preserve the failing URL, Host header, response headers, logs, and worker state.
2. Reproduce against the exact migrated worktree before changing dependencies.
3. Revert the migration as one dependency/config/source/doc/verifier unit to the rollback anchor; do not mix a Next 14 package with Next 16 source contracts.
4. Reinstall from the matching lockfile.
5. Re-run the baseline build/start matrix.

Do not restore `next-pwa`, private Next imports, the server-chunk compatibility plugin, or browser access to `firebase-admin` as an isolated workaround.

## Remaining release evidence

User-run Vercel deployments after the migration exposed the route-trace and Firebase Admin ESM interop failures described above. The corrected source is not yet deployed. A later authorized release action must redeploy it and capture the homepage-to-sign-in flow, preview-host browser/device behavior, install/update/offline worker replacement on real devices, and production-host smoke. Those are release-certification actions, not missing local migration code.
