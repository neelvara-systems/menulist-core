# Next.js Runtime Migration Implementation Playbook

**Status:** EXECUTION PLAN — do not skip phases
**Final target:** Next.js 16.2.10 / React 19.2.7 / Turbopack / Serwist
**Rollback unit:** Complete checkpoint dependency and source set

## 1. Execution principles

- Work from a known saved worktree checkpoint. Do not absorb the current unrelated dirty tree into the migration by accident.
- Use exact dependency pins. Never use `latest` in `package.json`, `--force`, or `--legacy-peer-deps`.
- Change one failure domain at a time: supporting libraries, React/request APIs, Next 16/Webpack, cache/lint/config, PWA/Turbopack, then optional proxy.
- Run the focused gates after each phase. Run the expensive aggregate/build/browser gates at defined checkpoints.
- Treat codemods as suggestions. Review every changed file and remove all `@next/codemod` comments and `UnsafeUnwrapped*` casts.
- Do not edit Firebase infrastructure or deploy Vercel as part of the local migration.
- Do not mark a checkpoint green if a later manual smoke is being used to compensate for an earlier source/type/build failure.

## 2. Phase and checkpoint map

| Phase | Checkpoint | Primary outcome | May advance when |
|---|---|---|---|
| 0 | C0 Baseline | Reproducible current-runtime evidence and isolated migration base | Worktree ownership is clear and baseline gates are recorded |
| 1 | C1 Guardrails | Migration inventory and final-state source gates exist | Verifiers accurately detect known current violations without false completion claims |
| 2 | C2 Library compatibility | React 19-compatible adjacent packages pass on React 18 where supported | Install, type, lint, focused UI/i18n/Redux checks pass |
| 3 | C3 Next 15 bridge | React 19 and async request contracts are complete | Zero sync/unsafe API residue; build/start/product smoke passes |
| 4 | C4 Next 16 Webpack | Final framework runs on controlled existing bundler | Config, lint, cache, build/start, route/security gates pass |
| 5 | C5 PWA modernization | `next-pwa` is removed and worker behavior is preserved | Worker host/scope/offline/cache matrix passes |
| 6 | C6 Turbopack | Normal dev/build use Turbopack | Webpack behavior has supported Turbopack/source equivalents and build/start passes |
| 7 | C7 Optional proxy | Middleware-to-proxy decision is evidence-backed | Full routing/security/latency matrix passes, or middleware retention is documented |
| 8 | C8 Final freeze | One final commit passes every local gate | Audit disposition and active governance docs match exact packages |
| 9 | External preview | Explicitly approved deploy verification | Preview/browser/provider evidence passes; production remains separate |

## 3. Phase 0 — establish the migration base

### 3.1 Save and isolate the current worktree

1. Review `git status --short` and the scoped diffs for `package.json`, `next.config.js`, `src/middleware.ts`, route files, docs, and verification scripts.
2. Finish, commit, or otherwise save the current user-owned work into a named checkpoint. Do not auto-stash or discard it.
3. Create a dedicated migration branch or equivalent isolated checkpoint only after the user-owned work is safe.
4. Record the base commit and the exact list of pre-existing untracked files that are intentionally carried into the migration.

**Stop gate P0-A:** If the current package/config/middleware edits do not have a coherent owner or cannot be safely separated, stop before dependency installation.

### 3.2 Reconfirm the external target

Run and record:

```bash
node -v
npm -v
npx tsc -v
npm view next dist-tags --json
npm view react dist-tags --json
npm view next@16.2.10 engines peerDependencies --json
```

Recheck the Next.js support policy and v15/v16 upgrade guides. If a newer stable patch exists, update this plan's exact patch only after reviewing its release/security notes; do not switch to canary, preview, beta, or RC.

### 3.3 Capture the baseline

Record these outputs without modifying packages:

```bash
npm run verify:dependency-freeze
npm ls --depth=0
npm audit --omit=dev --json
npm run typecheck
npm run lint
npm run verify:next-build-compatibility
```

With explicit execution authorization for the build checkpoint, capture:

```bash
NEXT_DIST_DIR=.next-next14-baseline npm run build
NEXT_DIST_DIR=.next-next14-baseline npm start -- -p 3014
```

Run the baseline HTTP/browser route matrix from the test-cases document, save response status/location/cache/security headers, and capture screenshots for representative desktop/mobile routes. Stop the server cleanly after the smoke.

Record build duration, peak memory if available, route count, start success, response timings, PWA worker identities, and current public cache freshness behavior.

**Stop gate P0-B:** If the current baseline cannot build and start on the saved migration base, diagnose and record that separate defect before upgrading. Do not make Next 16 responsible for an existing failure.

## 4. Phase 1 — add migration guardrails

### 4.1 Create an inventory verifier

Add a stage-aware `verify:nextjs-runtime-migration` source gate. Its baseline/report mode inventories issues; its final mode fails on:

- Next/React/final tooling pins that differ from the approved exact matrix.
- Invalid or missing lockfile root metadata.
- `next-pwa` or `@emoji-mart/react` declarations/imports.
- First-party/private `next/dist/**` imports in config/runtime code.
- `MenuListServerChunkCompatPlugin` final-state residue.
- `next lint` scripts or `eslint` in `next.config.js`.
- `experimental.serverComponentsExternalPackages` instead of top-level `serverExternalPackages`.
- Synchronous `headers()`, `cookies()`, or `draftMode()` access.
- Object-shaped `params`/`searchParams` in App Router entry-point contracts where Next supplies promises.
- `@next/codemod` comments or `UnsafeUnwrapped*` casts.
- One-argument `revalidateTag` calls.
- Missing cache classification for every changed invalidation call.
- Wrong service-worker registration mapping or legacy Workbox/next-pwa generated dependencies.
- Missing normal Turbopack build script and missing explicit Webpack diagnostic script if retained.

Use TypeScript AST parsing for call arity and entry-point type checks where regex would produce false positives.

### 4.2 Create a production-start smoke runner

Add a maintained smoke runner that:

1. Accepts an isolated `NEXT_DIST_DIR` and port.
2. Starts `next start` from the completed build.
3. Waits for readiness with a bounded timeout.
4. Requests the maintained public, protected, API, asset, manifest, sitemap, robots, image, and negative-route matrix with controlled Host headers.
5. Verifies status, redirect location, content type, CSP/security headers, cache headers, and absence of 500 responses.
6. Terminates the server even when an assertion fails.

It must include the App Router pages previously affected by manifest alias behavior.

### 4.3 Capture source inventories

Regenerate and commit the migration inventory counts. At minimum include:

- Request API call sites by product.
- Dynamic entry points using params/searchParams.
- Auth/wrapper consumers of route context.
- Cache tag producers and invalidators.
- Webpack-only rules/plugins and their source reason.
- Service-worker generation, registration, scope, and cache names.
- Direct packages with Next/React/ESLint peer ranges.

**Checkpoint C1:** The verifier must report the known current violations but must not claim the current runtime is final-compliant.

## 5. Phase 2 — modernize framework-adjacent libraries on the current runtime

This checkpoint reduces the number of simultaneous changes in the React/Next phases.

### 5.1 Update the compatible package group

Reconfirm versions, then install exact pins for:

```text
next-intl 4.13.2
@ant-design/nextjs-registry 1.3.0
@reduxjs/toolkit 2.12.0
react-redux 9.3.0
framer-motion 12.42.2
```

Keep Next 14.2.35 and React 18.3.1 at this checkpoint. These target libraries support React 18, allowing their migrations to be tested before React changes.

### 5.2 Migrate Redux Toolkit and React Redux

Review official RTK 2 migration requirements. The current store uses a callback form for default middleware and has no detected object-form `extraReducers`, so the expected source change is bounded, but typecheck is authoritative.

Verify:

- Store creation and persisted rehydration.
- Typed dispatch/selector hooks.
- Existing slices/actions/selectors.
- Login/logout state clearing.
- Store switching and active tenant state.
- Mobile shell and owner dashboard hydration.

Do not redesign state architecture or replace Redux Persist.

### 5.3 Migrate Motion

Keep `framer-motion` imports for this checkpoint. Do not combine the compatibility upgrade with a package-name migration to `motion/react`.

Verify animation entry/exit, layout motion, reduced-motion behavior, drag/tap/pointer interactions, modals, and public-site transitions. Fix only documented/current API differences.

### 5.4 Remove the unsupported Emoji Mart React wrapper

`src/components/atoms/IconPicker/EmojiGrid.tsx` is the only consumer. Replace the `<Picker>` browser portion with the existing first-party categorized/search grid behavior using supported framework-independent Emoji Mart data/search APIs, or choose another React 19-compatible implementation only after package/license/bundle review.

Acceptance requirements:

- Search, categories, locale fallback, native emoji output, selection, dark mode, keyboard use, and touch targets remain available.
- No `@emoji-mart/react` import or dependency remains.
- No new component library is added merely to replace this one consumer.

### 5.5 Migrate next-intl and Ant registry

Review every layout/provider/plugin integration, locale resolution, server/client translation hook, localized resource route, metadata, and fallback locale. Preserve full product-name environment and route rules.

Run targeted public/localized route smokes for MenuList and every product layout that installs the provider.

**Stop gate P2:** If the install requires peer overrides or any provider/store/animation behavior cannot be restored on the current framework, stop before React/Next changes.

**Checkpoint C2 gates:** clean install metadata, `npm ls`, typecheck, existing lint, focused Redux/i18n/UI tests, representative browser smokes, and dependency audit diff.

## 6. Phase 3 — Next 15.5.20 and React 19 bridge

### 6.1 Update the bridge package group

Use exact pins:

```text
next 15.5.20
react 19.2.7
react-dom 19.2.7
@types/react 19.2.17
@types/react-dom 19.2.3
@next/bundle-analyzer 15.5.20
eslint-config-next 15.5.20
```

Keep TypeScript 5.8.3. Use the compatible ESLint configuration for this bridge; the flat-config/ESLint 9 migration is completed in Phase 4.

### 6.2 Run the async request codemod in review mode

First run the exact codemod version in dry mode:

```bash
npx @next/codemod@15.5.20 next-async-request-api src/app --dry --print
```

After reviewing its proposed scope, run it on `src/app`, then manually review every change.

Required manual rules:

- Server Components, layouts, metadata functions, route handlers, robots, sitemap, and manifest handlers become async and `await` request APIs.
- Client Components use React `use()` only when Next supplies a promised prop and moving the resolution to a server boundary is not cleaner.
- Helper functions that call `headers()` become async and all callers await them.
- Do not retain `UnsafeUnwrappedHeaders`, `UnsafeUnwrappedCookies`, `UnsafeUnwrappedDraftMode`, or any other compatibility cast.
- Do not retain `@next/codemod` comments.
- Preserve `dynamic = 'force-dynamic'` declarations where request/session/header behavior requires them.

### 6.3 Migrate params and searchParams

For all App Router entry points:

- Type `params` and `searchParams` as promises.
- Await once near the boundary and pass plain validated values into business logic.
- Update `generateMetadata`, `generateViewport`, icon/OG handlers, and route handlers consistently.
- Resolve catch-all arrays without changing optional/empty semantics.
- Keep Zod/runtime validation at API boundaries.

Update the shared auth route wrapper so promised route context is resolved centrally and existing authenticated handler business contracts remain unambiguous. Add tests for missing, malformed, catch-all, and valid dynamic params.

### 6.4 React 19 source compatibility

Search and fix removed/deprecated React DOM and form APIs, ref behavior, TypeScript JSX/ref types, strict effect assumptions, hydration warnings, provider children types, and test utilities. The July 13 source scan found no obvious `ReactDOM.render`, `findDOMNode`, or `useFormState`, but the new typecheck and browser console are authoritative.

Do not enable React Compiler or change `reactStrictMode` in this migration.

### 6.5 Next 15 config compatibility

- Move `experimental.serverComponentsExternalPackages` to top-level `serverExternalPackages` if supported at the bridge.
- Preserve current image behavior.
- Keep Webpack for this checkpoint.
- Keep middleware unchanged.
- Keep current cache calls temporarily only if the bridge accepts them; their classified final migration occurs before C4.

**Checkpoint C3 gates:** zero sync/unsafe request API residue, zero React peer conflicts, typecheck, bridge lint, focused verifiers, clean isolated build, real `next start` smoke, cross-product public route smoke, owner auth smoke, and browser-console review.

## 7. Phase 4 — final Next 16 framework on Webpack

### 7.1 Install the final framework/lint group

Use exact pins:

```text
next 16.2.10
@next/bundle-analyzer 16.2.10
eslint-config-next 16.2.10
eslint 9.39.2
```

Keep the approved C3 React and adjacent library pins.

Run `npm ls` immediately. Any invalid peer is a stop, not a warning to suppress.

### 7.2 Move lint to flat config

Run the Next lint codemod only in dry/print mode first, then create/review the flat config deliberately. Final scripts must use ESLint CLI:

```text
lint -> eslint .
dev:emulators -> npm run lint && next dev && npm run firebase:emulators
```

Remove the `eslint` object from `next.config.js`. Keep lint and typecheck as separate pre-build gates because Next 16 build does not run lint.

Replace active `next lint --file` command contracts with ESLint file arguments. Do not rewrite historical audit commands that are clearly recorded as past evidence.

### 7.3 Remove private Next internals and the compatibility plugin

On the Next 16 branch:

1. Remove private `next/dist/**` imports used only by `MenuListServerChunkCompatPlugin`.
2. Remove the plugin, server-chunk copying, Pages shims, and manifest reconstruction.
3. Update `verify:next-build-compatibility` to verify native behavior and required dynamic route declarations instead of requiring the old plugin.
4. Run a clean isolated Webpack build and real start smoke.

If native behavior fails, follow the repeated-error research rule after two identical failures. Do not re-add normalized app-route aliases.

### 7.4 Update supported Next config

- Keep `serverExternalPackages` top-level for verified server-only native/provider packages.
- Remove unsupported `experimental` options and confirm every remaining option against Next 16 docs.
- Preserve `poweredByHeader: false`, controlled `distDir`, redirects, remote image patterns, Sentry behavior, and product env contracts.
- Set `images.minimumCacheTTL: 60` initially unless immutable owner-image URLs are proven.
- Keep local-IP image optimization denied.
- Preserve an explicit `build:webpack` diagnostic command while C4 is active.
- Use `next build --webpack` for the C4 normal build only; Phase 6 changes the final normal command.

### 7.5 Classify every cache invalidation call

For all current `revalidateTag` calls:

1. Identify the write and the public/owner consumers.
2. Record classification in the migration review ledger.
3. Use `{ expire: 0 }` for immediate public-truth invalidation.
4. Use `updateTag` only inside valid Server Action boundaries needing read-your-own-writes.
5. Use `'max'` only when stale-while-revalidate is explicitly acceptable.
6. Test the write-to-read behavior, not only call arity.

Add source gates for the three public tag families and all desktop/mobile/direct/API/multi-outlet writers covered by AGENTS.md.

### 7.6 Preserve middleware for C4

Do not run `middleware-to-proxy` yet. Resolve any Next 16 middleware warnings that do not change runtime semantics. Re-run host routing and security headers under the real production server.

**Checkpoint C4 gates:** final package group resolves cleanly; flat lint/typecheck pass; zero private-internal/plugin residue; zero one-argument cache calls; Next 16 Webpack build/start passes; full route/security/cache matrix passes; audit shows no direct framework regression.

## 8. Phase 5 — replace next-pwa and preserve PWA isolation

### 8.1 Remove the legacy integration

- Remove `next-pwa` from `package.json` and lockfile.
- Remove the `withPWA` and `withClientOnlyPWA` wrappers from `next.config.js`.
- Remove generated legacy Workbox artifacts only after confirming they are build outputs and not user-authored sources.
- Preserve `sw-customer.js` and `mycodex-sw.js` as first-party workers.

### 8.2 Add Serwist source and policy

Use exact compatible pins for `@serwist/turbopack`, `serwist`, and `esbuild`. Implement an owner-worker source whose route/cache policies match the current approved owner behavior. Do not import Serwist's broad default cache list without reviewing every route against the customer-public-truth doctrine.

The owner worker may cache approved owner shell/static/image resources. It must not cache customer menu content, protected API responses, auth/session responses, Firestore API responses, or cross-tenant data.

Integrate the Serwist route so middleware does not rewrite/block it and the response has correct JavaScript/service-worker headers.

### 8.3 Keep registration centralized

Update `ServiceWorkerRegister.tsx` only as required to register the new owner worker URL. Preserve the host resolver that selects:

- owner worker,
- customer worker,
- MyCodex worker,
- or no worker.

Add upgrade cleanup for old Workbox cache names and verify that a device upgrading from the previous worker does not keep stale routes.

**Checkpoint C5 gates:** no `next-pwa`; all worker build/registration/source gates; fresh install, update, offline, cache inspection, wrong-host negative tests; no customer menu in Cache Storage; owner offline fallback still works.

## 9. Phase 6 — move the normal build to Turbopack

### 9.1 Inventory each Webpack customization

| Current Webpack behavior | Final action |
|---|---|
| Server externals/native canvas/Firebase Admin/provider packages | Use top-level `serverExternalPackages`; verify server-only import boundaries |
| Client aliases/fallbacks for server modules | Prefer splitting server-only source from client DAL; use supported Turbopack aliasing only if necessary |
| PDF.js rule | Test native Turbopack ESM behavior; add a supported rule only if reproduced |
| SVGR | Add supported Turbopack loader rule or replace imports with static/component boundaries |
| Server chunk filename/plugin | Delete; native Next 16 output is authoritative |
| Webpack cache disable | Remove from normal Turbopack path |
| `next-pwa` | Already removed in C5 |
| Sentry | Verify the installed Sentry Next SDK's Turbopack support and source-map behavior |
| Bundle analyzer | Keep an explicit Webpack diagnostic build if needed; use browser/network metrics for release gates |

### 9.2 Make Turbopack normal

- Normal `dev` uses `next dev`.
- Normal `build` uses `next build` with no `--webpack` flag.
- `build:webpack` remains temporarily for differential diagnosis, not as release proof.
- Serwist uses its documented Turbopack route/provider integration.

Run differential route/build/start tests between C4 Webpack and C6 Turbopack. Resolve source boundaries instead of accumulating bundler-specific shims.

**Checkpoint C6 gates:** normal Turbopack build/start, same HTTP matrix, same auth/routing/cache/PWA behavior, no new browser console errors, and accepted performance/memory comparison.

## 10. Phase 7 — isolated middleware/proxy decision

Only after C6 is green:

1. Record current middleware runtime and latency evidence.
2. Run the `middleware-to-proxy` codemod in dry/print mode.
3. Review Node-only imports, host normalization, cookie handling, rewrites, redirects, and matcher behavior.
4. Apply the rename/function change in a separate commit.
5. Run the complete routing/security/latency matrix.

Adopt proxy if all evidence passes. Otherwise revert this phase alone and retain middleware with a documented Next 16 deprecation. The final framework migration may complete with middleware retained.

## 11. Phase 8 — final verification and freeze

### 11.1 Run the full local gate sequence

Run in this order on the same commit:

1. Install/peer/lockfile checks.
2. Migration boundary verifier.
3. Typecheck.
4. Flat-config lint.
5. Focused product/security/cache/PWA verifiers.
6. Functions builds only if shared types or root scripts require them; no Firebase deploy.
7. Documentation link and npm-script checks.
8. Dependency freeze.
9. Clean Turbopack build.
10. Real `next start` HTTP matrix.
11. Authenticated desktop/mobile and public browser matrix.
12. PWA install/update/offline/cache inspection.
13. Dependency audit and package-by-package disposition.
14. Diff integrity.

### 11.2 Update the freeze together

Update:

- `package.json` and `package-lock.json`.
- `scripts/verification/verify-dependency-freeze.js` exact core versions and stale-runtime tokens.
- `AGENTS.md` and `.windsurfrules`.
- Active `.codex` stack/rule surfaces referenced by the freeze verifier.
- `__docs__/project-memory-for-chatgpt.md` and technical variant.
- Production readiness/runbook/audit surfaces that state the current runtime.
- This README status and a new migration validation artifact containing actual commands/results.
- Infrastructure risk tracker status.

Historical audit records may retain old versions when clearly dated and not presented as current truth.

### 11.3 Final audit disposition

Re-run `npm audit --omit=dev --json`. For every remaining high/critical result record:

- dependency path,
- direct/transitive status,
- affected runtime surface,
- exploitability in this repo,
- available safe version,
- action or accepted blocker,
- verification evidence.

Do not claim the Next migration clears all 60 baseline advisories unless the final audit proves it.

## 12. Rollback plan

### 12.1 Source/dependency rollback

- Roll back to the last green checkpoint as a complete unit: source, `package.json`, lockfile, config, lint config, service-worker source, and verifiers.
- Reinstall from that checkpoint with `npm ci`.
- Remove only the isolated build output used by the failed checkpoint.
- Never downgrade only `next` while leaving React, types, intl, registry, ESLint, or lockfile on the later checkpoint.

### 12.2 Runtime rollback

- Stop the failed local/preview server.
- Start the previous checkpoint from a clean build and repeat the HTTP matrix.
- If a preview was explicitly deployed, use the platform's immutable previous deployment only after confirming environment and domain mapping.
- Production rollback is a separately approved operation.

### 12.3 Service-worker rollback

Service workers outlive deployments. A rollback must:

- restore the previous worker source/URL,
- bump or restore cache versioning deliberately,
- delete incompatible Serwist/Workbox cache namespaces,
- verify activation/controller takeover,
- verify customer/MyCodex workers were not touched,
- confirm no cached customer menu exists.

### 12.4 Data rollback

No data migration is planned, so no Firestore rollback should be necessary. If implementation discovers a need for a data/schema/rule/Function change, stop and create a separate approved Firebase plan before proceeding.

## 13. Global stop conditions

Stop the migration immediately when any of these occurs:

- A required install needs a peer override.
- A private Next internal appears necessary without a reproduced framework failure and exhausted supported alternatives.
- Any tenant, role, auth, CORS, CSP, cookie, rewrite, redirect, or direct-path protection changes unexpectedly.
- A public truth mutation serves stale menu/OBP/customer data beyond the existing contract.
- Owner/customer/MyCodex workers register on the wrong host or cache forbidden content.
- Build passes but `next start` returns a 500, wrong manifest, missing route, or incorrect header.
- Any product's focused verifier or browser journey fails.
- React/Redux state hydration or store switching changes semantics.
- Turbopack requires silently dropping a required server/client boundary.
- Direct high/critical framework/PWA advisories remain without a reviewed safe resolution.
- Vercel deploy, DNS, production environment, or cloud changes would be required without explicit approval.

## 14. Effort and sequencing estimate

This is expected to take roughly 8–12 focused implementation/verification days, not including external preview/device access or unrelated audit remediation. The largest work blocks are the 63-file async header migration, 47 dynamic entry-point candidates, cache classification, custom Next config removal, PWA replacement, and cross-product build/start/browser verification.

Do not compress the work by combining checkpoints. The value of the staged plan is the ability to identify and roll back the exact failure domain.
