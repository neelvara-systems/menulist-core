# Next.js Runtime Migration

**Status:** PLAN READY FOR REVIEW — implementation has not started
**Created:** July 13, 2026
**Scope:** Shared root web runtime for MenuList, Answerlattice, CampaignCue, SignalDesk, MyCodex, public sites, route handlers, and PWAs
**Current runtime:** Next.js 14.2.35, React 18.3.1
**Final target verified on July 13, 2026:** Next.js 16.2.10 Active LTS, React 19.2.7
**Release boundary:** No dependency, runtime, Firebase, or deploy change was made while preparing this plan

## Decision

Migrate the shared root application to the current stable Active LTS line. Do not perform a direct package-only bump.

The migration will use two framework checkpoints:

1. Next.js 15.5.20 as a temporary compatibility checkpoint for React 19 and asynchronous request APIs.
2. Next.js 16.2.10 as the only final frozen runtime.

The first Next.js 16 build will intentionally use Webpack. Turbopack becomes the final production bundler only after the framework, routing, auth, cache, and production-start gates pass on Webpack. This separates framework regressions from bundler regressions.

The final state must also remove two legacy runtime liabilities:

- `next-pwa@5.6.0` is replaced by the maintained Serwist integration while preserving the existing three-service-worker isolation model.
- `next.config.js` must not depend on private `next/dist/**` implementation details or retain the Next 14-specific `MenuListServerChunkCompatPlugin` unless a Next 16 failure is independently reproduced and no supported solution exists. The default decision is to delete the compatibility layer and prove native Next 16 build/start behavior.

## Why this is required

- Next.js 14 is outside the official support policy. Next.js 16 is Active LTS and Next.js 15 is Maintenance LTS.
- The July 13 production dependency audit reports 60 production advisories: 3 critical, 26 high, 29 moderate, and 2 low. `next` and `next-pwa` are direct high-severity findings. The migration does not claim it will clear unrelated advisories; every remaining direct and transitive finding must be reviewed after the new lockfile is generated.
- The root runtime serves all products from one App Router and one routing/security boundary. A failure can affect every product, public site, owner flow, API route, and PWA at once.
- A prior production audit proved that a successful `next build` is insufficient: a manifest compatibility change produced App Router 500 responses under `next start`. A real production-start HTTP matrix is therefore a mandatory gate.

Official references:

- [Next.js support policy](https://nextjs.org/support-policy)
- [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js `revalidateTag` reference](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Serwist Next.js Turbopack guide](https://serwist.pages.dev/docs/next/turbo)

## Repo-specific migration surface

The July 13 source inventory found:

| Surface | Current evidence | Migration consequence |
|---|---:|---|
| Synchronous `headers()` | 64 calls in 63 files; none awaited | Convert all request-time header reads to the async contract and preserve dynamic rendering intent |
| Object-shaped `params` declarations | 47 candidate route/page/layout files | Convert page, layout, route-handler, metadata, and wrapper contracts to promised params |
| Object-shaped `searchParams` declarations | 1 candidate file | Convert to the promised search-parameter contract |
| `revalidateTag` | 70 calls in 20 files; approximately 69 single-argument calls | Classify by consistency requirement; public truth invalidation must remain immediate |
| `unstable_cache` | 13 files | Revalidate behavior and key/tag isolation must be regression-tested |
| Parallel route slots | 0 directories | No `default.tsx` migration currently expected; keep the source gate |
| Legacy Next image imports | 0 | No `next/legacy/image` migration currently expected |
| Runtime config APIs | 0 | No `serverRuntimeConfig` or `publicRuntimeConfig` migration currently expected |
| AMP usage | 0 | No AMP removal work currently expected |
| Explicit `<Image quality>` props | 0 | Next 16 quality allowlist does not currently require a repo-wide prop migration |
| Shared middleware | More than 800 lines, multi-product routing and security | Retain `middleware.ts` during the first Next 16 checkpoint; evaluate `proxy.ts` only as a later isolated change |
| Next configuration | Private `next/dist/**` imports, custom manifest/chunk plugin, custom Webpack, PWA, Sentry, intl, bundle analyzer | Replace or prove every integration; never port the Next 14 compatibility plugin by assumption |
| Direct peer conflicts with React 19 / Next 16 | 7 package families | Resolve without `--force` or `--legacy-peer-deps` |

The synchronous header calls are concentrated in Answerlattice public/runtime routes, with additional CampaignCue, SignalDesk, MenuList public/customer, MyCodex, and shared layout consumers. This is a cross-product migration, not an Answerlattice-only change.

## Target package decisions

These versions are the July 13 planning targets. The execution session must recheck stable versions and advisories immediately before changing the lockfile, then keep exact pins.

| Package | Current | Planned target or action | Reason |
|---|---:|---:|---|
| `next` | 14.2.35 | 15.5.20 bridge, then 16.2.10 final | Supported migration path and final Active LTS |
| `react`, `react-dom` | 18.3.1 | 19.2.7 | Official App Router generation for the final runtime |
| `@types/react` | 18.3.21 | 19.2.17 | React 19 type contract |
| `@types/react-dom` | 18.3.7 | 19.2.3 | React 19 DOM type contract |
| `typescript` | 5.8.3 | Keep 5.8.3 unless evidence requires change | Already exceeds Next 16 minimum; avoid unrelated drift |
| `next-intl` | 3.26.5 | 4.13.2 | Current version excludes Next 16; target supports it |
| `@ant-design/nextjs-registry` | 1.0.2 | 1.3.0 | Current version excludes Next 16; target supports it |
| `@reduxjs/toolkit` | 1.9.7 | 2.12.0 | Current peer range excludes React 19 |
| `react-redux` | 8.1.3 | 9.3.0 | Current peer range excludes React 19 |
| `framer-motion` | 10.18.0 | 12.42.2 | Current peer range excludes React 19; keep existing import surface initially |
| `@emoji-mart/react` | 1.1.1 | Remove | No React 19 peer support; only one repo consumer exists |
| `@emoji-mart/data`, `emoji-mart` | 1.2.1 / 5.6.0 | Retain initially if their core APIs pass | Existing custom search/grid code can replace the unsupported React wrapper |
| `eslint` | 8.57.1 | 9.39.2 first | Next 16 requires ESLint 9+; use flat config with lower migration risk than an incidental ESLint 10 jump |
| `eslint-config-next` | 14.2.33 | 16.2.10 | Match the framework and flat-config contract |
| `@next/bundle-analyzer` | 16.2.1 | 16.2.10 | Match the final Next patch |
| `next-pwa` | 5.6.0 | Remove | Old direct high-risk dependency and Webpack-era integration |
| `@serwist/turbopack`, `serwist`, `esbuild` | absent | 9.5.11 / 9.5.11 / 0.28.1 planning targets | Maintained Turbopack service-worker build path |
| `next-auth` | 4.24.13 | Keep initially | Its peer contract already includes Next 16 and React 19; auth migration is out of scope |
| `antd` | 5.25.1 | Keep | No UI-library major upgrade inside the framework migration |

No install may use peer-dependency overrides. If the clean exact-pin install cannot resolve, stop and revise the package set.

## Non-negotiable invariants

- Product host routing, rewrites, redirects, direct `/sites/*` blocking, CSP, HSTS, auth cookies, and tenant boundaries must remain equivalent.
- MenuList public menu, OBP, customer app, and multi-outlet mutations must invalidate `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` with immediate-expiry semantics where they do so today.
- `revalidateTag(tag, 'max')` must not be applied mechanically to owner-public truth writes because it permits a stale response while refreshing.
- Customer menu content remains intentionally absent from offline caches.
- Owner `sw.js`, customer `sw-customer.js`, and MyCodex `mycodex-sw.js` must never register on the wrong host or scope.
- Firebase collections, rules, indexes, Storage rules, Cloud Functions, and data shapes do not change as part of this migration.
- No new feature, public claim, owner setting, mobile navigation item, or product merge is included.
- No Vercel or production deploy occurs without explicit approval in the execution session.
- The dependency freeze remains exact. The verifier, lockfile, AGENTS, `.windsurfrules`, and active stack-memory docs change together only after the final package set passes.

## Document map

- [Specification](./nextjs-runtime-migration_spec.md) — decisions, requirements, risks, and success criteria.
- [Implementation playbook](./nextjs-runtime-migration_impl.md) — exact migration phases, checkpoints, rollback, and stop gates.
- [Test cases](./nextjs-runtime-migration_test-cases.md) — source, build/start, product, routing, cache, PWA, browser, performance, and security evidence.
- [Mobile/PWA impact](./nextjs-runtime-migration_mobile-support.md) — mobile shell and service-worker acceptance contract.
- [Firebase impact](./nextjs-runtime-migration_firebase.md) — explicit zero-schema/deploy boundary and cache-cost implications.

Marketing, website, and help-center documents are not created for this work because the migration adds no customer-visible capability or public claim. If execution changes behavior or public support requirements, that decision must reopen the content-layer review.

## Execution authorization boundary

This plan does not authorize runtime edits. When implementation is approved, work starts at Phase 0 in the playbook. The current dirty worktree must first be saved into a known checkpoint; the migration must not overwrite or silently absorb unrelated package, configuration, middleware, route, docs, or verifier edits.

## Completion statement

The migration is complete only when the final exact dependency set, async request APIs, cache semantics, Next configuration, production bundler, service workers, source gates, clean build, real `next start` HTTP matrix, cross-product browser matrix, audit review, and freeze documentation all pass on the same commit. A successful install, typecheck, or build alone is not completion.
