# Next.js Runtime Migration Specification

**Status:** LOCALLY IMPLEMENTED AND VERIFIED
**Risk class:** Critical shared-runtime migration
**Final target:** Next.js 16.3.0 with React 19.2.8
**Applies to:** Root Next.js application and every product/surface hosted by it

## 1. Problem statement

The root app was frozen on Next.js 14.2.35. It is now frozen on Next.js 16.3.0 and React 19.2.8 after the shared runtime, framework-adjacent dependencies, request APIs, cache calls, service worker, production build paths, and the stable 16.3 security/runtime refresh were migrated together.

This migration must improve the support and security posture without changing product behavior, public truth, tenant isolation, service-worker boundaries, or Firebase contracts.

## 2. Goals

1. Move the root app to an exact, supported Next.js 16 stable patch.
2. Move the App Router runtime to the corresponding stable React 19 line.
3. Remove every known direct peer conflict with Next 16 or React 19 without peer overrides.
4. Convert request-time APIs and dynamic segment contracts to their supported asynchronous forms.
5. Preserve the semantics of public cache invalidation rather than applying a type-only migration.
6. Remove reliance on private Next.js internals and Next 14 build-output repair behavior.
7. Replace the obsolete owner PWA build integration while preserving existing host/scope isolation.
8. Make Turbopack the final production bundler only after equivalent Webpack behavior is proven.
9. Establish build-plus-start and cross-product browser evidence on one final commit.
10. Re-freeze the exact supported runtime and make stale stack declarations fail verification.

## 3. Non-goals

- No Firebase rule, index, Storage rule, Function, collection, field, or retention change.
- No NextAuth v5/Auth.js migration.
- No Ant Design v6 migration.
- No React Compiler enablement.
- No Cache Components/PPR adoption.
- No Partial Prefetching, TypeScript 7, experimental Rust compiler, or experimental offline-retry adoption.
- No route redesign, middleware decomposition, new domain, or product architecture change.
- No owner/customer feature, settings toggle, public copy, pricing, billing, or plan change.
- No broad `npm audit fix`, `npm audit fix --force`, or unrelated dependency refresh.
- No Vercel deployment until explicitly requested after local evidence is complete.

## 4. Architecture decisions

### ADR-1 — Final target is Next.js 16, not Next.js 15

Next.js 16 is Active LTS. Next.js 15 is Maintenance LTS and is used only to expose migration warnings and isolate the React/request-API transition. The freeze is updated only for the Next 16 final state.

### ADR-2 — Execute continuously with reversible safety gates

The migration ran as one uninterrupted end-to-end operation. Baseline, dependency, source, Webpack, Turbopack, start/smoke, and final verification checks were internal safety gates rather than user-facing phases or approval stops. The original base commit remains the rollback anchor.

### ADR-3 — Remove the custom Next 14 build-output compatibility layer by default

`next.config.js` currently reads private modules under `next/dist/**` and reconstructs server chunks, reserved Pages Router shims, route manifests, and app-path manifests. The July 13 package probe shows that several internal modules still exist in Next 16, but internal identifiers have changed: for example `NEXT_ROUTER_STATE_TREE` is now exposed as `NEXT_ROUTER_STATE_TREE_HEADER`, and `RSC_PREFETCH_SUFFIX` is absent. Porting the current code would therefore be both brittle and behaviorally unsafe.

The implementation must:

1. Reproduce the current Next 14 baseline reason for the plugin.
2. Disable the plugin and private imports on the Next 16 checkpoint.
3. Test a clean native build and real production start.
4. Keep the plugin deleted if native Next 16 passes.
5. If native Next 16 fails, record the exact framework error, test supported config/source fixes, and use the smallest version-scoped workaround only after those options fail.

No workaround may manufacture normalized App Router aliases. Build success without start success is a hard failure.

### ADR-4 — Webpack is the first Next 16 checkpoint; Turbopack is the final target

Next 16 defaults `next dev` and `next build` to Turbopack. The repo currently has a custom Webpack function, a Webpack PWA plugin, SVGR, native/server externals, client fallbacks, PDF.js handling, Sentry, and a bundle analyzer. A direct framework-plus-bundler switch would hide causality.

The initial Next 16 scripts use `next build --webpack`. After that passes, each Webpack behavior is either removed as obsolete, implemented with supported Turbopack/source boundaries, or retained only in a diagnostic Webpack build.

The final normal build must use Turbopack. `build:analyze` may remain an explicitly diagnostic Webpack command if the analyzer requires it; it must not define production correctness.

### ADR-5 — Adopt the Next 16 proxy convention after runtime parity

Next 16 deprecates `middleware.ts` in favor of `proxy.ts`; proxy uses the Node.js runtime rather than Edge. The repo's large multi-product routing and security boundary was migrated only after the native Next 16 build and route behavior were proven.

The final state uses `src/proxy.ts` and exports `proxy`. Routing, security headers, CSP, cookies, redirects, rewrites, product-domain behavior, and production-start HTTP results were checked after the convention change. All active verifiers now read the proxy boundary.

### ADR-6 — Cache calls are classified by consistency requirement

Next 16 requires the second `revalidateTag` argument. The calls must not be mass-replaced.

| Call class | Target behavior |
|---|---|
| Public menu, OBP, customer app, outlet/store identity, publish, and owner-visible truth writes | `revalidateTag(tag, { expire: 0 })` where current behavior is immediate blocking invalidation |
| Server Actions requiring read-your-own-writes | Prefer `updateTag(tag)` when the API boundary permits it |
| Content where a stale response is explicitly acceptable | `revalidateTag(tag, 'max')` |
| Unknown or mixed consumers | Stop, trace producer/consumer behavior, then classify |

Every existing tag must remain intact. The public cache-invalidation doctrine in AGENTS.md remains authoritative.

### ADR-7 — Replace `next-pwa`; preserve the three-worker model

The owner PWA currently receives generated `sw.js` behavior from `next-pwa`. Customer and MyCodex workers are maintained separately. The target is Serwist's Turbopack integration, not a single universal service worker.

Required final responsibilities:

- Owner hosts: Serwist-built `sw.js` with the approved owner/offline/static caching policies.
- Customer tenant and custom-domain hosts: existing `sw-customer.js` policy, with no menu-content cache.
- MyCodex host: existing `mycodex-sw.js` private shell policy.
- Answerlattice and CampaignCue PWA asset contracts remain isolated and must not inherit the owner worker accidentally.

The registration decision remains centralized in `ServiceWorkerRegister.tsx`. Service-worker replacement must include cache versioning/cleanup so a previous Workbox worker cannot survive and mask the new behavior.

### ADR-8 — React 19 compatibility is resolved, not overridden

The current direct conflicts are:

- `@emoji-mart/react@1.1.1`
- `@reduxjs/toolkit@1.9.7`
- `react-redux@8.1.3`
- `framer-motion@10.18.0`
- `next-intl@3.26.5` for Next 16
- `@ant-design/nextjs-registry@1.0.2` for Next 16
- `eslint-config-next@14.2.33` for ESLint 9+

The React wrapper for Emoji Mart is removed rather than installed against an unsupported peer. Its only consumer already owns custom categorized/search result rendering and may use the framework-independent Emoji Mart data/search APIs for the remaining browser view.

### ADR-9 — ESLint moves to the CLI and flat config

Next 16 removes `next lint` and the `eslint` option in `next.config.js`. The final runtime uses ESLint 9.39.5 and `eslint-config-next@16.3.0` with flat config.

The migration must update:

- `lint` and `dev:emulators` scripts.
- Targeted lint command examples that depend on `next lint --file`.
- Active validation/runbook documents, while leaving historical audit evidence intact when it is clearly historical.
- Any verification script that invokes the old CLI contract.

`next build` no longer runs lint; lint and typecheck remain explicit required gates.

### ADR-10 — Preserve image behavior during the framework migration

Current source inventory found no legacy Next image imports, explicit quality props, or runtime config APIs. The existing `remotePatterns` model is already preferred.

Next 16 changes the default image cache TTL to four hours. The initial migration should explicitly preserve the prior 60-second `minimumCacheTTL` unless source/runtime evidence proves every mutable owner image uses immutable URLs. Image cache optimization can be reconsidered after correctness is proven.

Local-IP image optimization remains denied. Redirect limits are not increased without a verified provider need.

## 5. Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | Every current public and authenticated route must retain its intended status, redirect, rewrite, canonical host, and access boundary. |
| FR-2 | All request-time `headers`, `params`, and `searchParams` access must use supported async contracts with no compatibility casts. |
| FR-3 | Shared route wrappers, especially `withAuth`, must resolve promised context params centrally before passing the existing plain object to business handlers, or adopt one consistent promised-handler contract. |
| FR-4 | Public cache invalidation must remain immediate wherever owner changes affect menu/OBP/customer truth. |
| FR-5 | All direct packages must have valid Next 16/React 19 peer ranges; `npm ls` must not report invalid peers. |
| FR-6 | The normal dev/build commands must not depend on removed `next lint` behavior or Next 14 private internals. |
| FR-7 | Owner, customer, and MyCodex service workers must be host- and scope-isolated. |
| FR-8 | A production build must be started with `next start` and tested over HTTP; generated-file inspection alone is insufficient. |
| FR-9 | All products must pass source gates and browser route journeys on the same final commit. |
| FR-10 | The final dependency freeze must pin exact versions and reject reintroduction of Next 14, React 18, `next-pwa`, private Next imports, sync request APIs, and one-argument `revalidateTag`. |

## 6. Non-functional requirements

### Security

- No auth, CORS, CSP, HSTS, tenant, role, cookie, rate-limit, or public-route weakening.
- No confidential value may be added to `NEXT_PUBLIC_*` during config cleanup.
- Proxy evaluation must repeat the security matrix because runtime behavior changes from Edge to Node.
- The final audit must distinguish fixed, remaining, non-exploitable, and externally blocked advisories.

### Reliability

- Clean install, no peer overrides.
- Clean build output for each framework checkpoint.
- Successful build and start are separate gates.
- Dynamic routes, 404/500 shells, metadata, robots, sitemap, manifests, and ImageResponse routes are included.
- Rollback restores the whole compatible dependency group, never only `next`.

### Performance

- Record baseline build time, peak memory, representative response time, browser Core Web Vitals, route JS/network payload, and service-worker install size before migration.
- Final p75-like lab measurements must not regress representative LCP or interaction time by more than 15% without an explained, accepted tradeoff.
- Middleware/proxy p95 local/preview response overhead must not materially regress domain routing.

### Cost

- No new Firebase operation.
- No accidental cache-policy change that increases public Firebase reads or serves stale truth.
- Turbopack/Serwist changes must not create unbounded precache lists or repeated provider calls.

### Accessibility and mobile

- React/animation changes must preserve reduced-motion behavior, focus, keyboard interaction, mobile touch targets, sheets, and shell navigation.
- Real iOS Safari and Android Chrome PWA checks remain mandatory before launch certification.

## 7. Product impact matrix

| Product/surface | Primary risk | Required proof |
|---|---|---|
| MenuList public website | layouts, metadata, locale, image, routing | desktop/mobile route and metadata smoke |
| MenuList owner app | React/Redux, auth, mobile shell, forms, animations | authenticated desktop/mobile workflow |
| MenuList tenant menu and OBP | host rewrite, cache invalidation, customer worker | mutation-to-public-freshness and offline boundary |
| Answerlattice website | concentrated sync `headers()` usage | all public families and metadata under build/start/browser |
| Answerlattice app/API/widget/hosted help | params, auth wrappers, CSP, host routing | authenticated, unauthenticated, widget, hosted-help matrix |
| CampaignCue website/app | dynamic header-derived routes and build history | feature/root/app routes under real start |
| SignalDesk | layouts, auth host/session, webhook params | signin/app/API negative and positive boundaries |
| MyCodex | catch-all params, docs tracing, private worker | auth, catch-all content, worker scope/offline shell |

## 8. Success criteria

The final commit must satisfy all of the following:

- Exact final pins are recorded and lockfile/node_modules parity passes.
- No invalid peer dependency, `--force`, or `--legacy-peer-deps` use.
- Zero synchronous request-time API violations identified by the migration verifier.
- Zero one-argument `revalidateTag` calls.
- Zero private `next/dist/**` imports in project configuration or first-party runtime code unless an explicitly approved exception has a version guard and regression test.
- `next-pwa` and its generated legacy worker dependency are removed.
- Normal development and production builds use the approved final bundler.
- Typecheck, flat-config lint, focused verifiers, clean build, real start smoke, cross-product browser matrix, cache mutation tests, and PWA tests pass.
- Direct Next/React/PWA advisories are cleared or the migration is stopped; remaining audit findings have an explicit package-by-package disposition.
- Freeze/governance docs match the final runtime.
- No Firebase or Vercel production change has occurred without the separate required authority.

## 9. Planning evidence limits

The original counts are the July 13, 2026 planning inventory. Installed versions and implementation evidence are current to July 24, 2026 and are recorded in `nextjs-runtime-migration_validation.md`.
