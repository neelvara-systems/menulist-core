# Next.js Runtime Migration — Firebase and Cost Impact

**Status:** PLANNED
**Firebase runtime change:** None intended
**Firebase deploy:** None authorized or required by the plan

## 1. Boundary

The Next.js migration changes the root web framework, React runtime, build tooling, request APIs, cache APIs, and service-worker integration. It does not change:

- Firestore collections, document paths, fields, indexes, TTLs, or rules.
- Firebase Storage paths, metadata, lifecycle, or rules.
- Firebase Auth providers, claims, or account schema.
- MenuList or Answerlattice Cloud Functions.
- Scheduler cadence, leases, task registries, or cost documents.
- Firebase project identity or environment naming.

No Firebase auto-deploy is triggered because no Firebase infrastructure or Function logic is in scope.

## 2. Firebase operation impact

| Area | Expected delta | Reason |
|---|---:|---|
| Firestore reads | 0 by design | Request API/type/build changes do not require new data access |
| Firestore writes | 0 | No data contract or mutation change |
| Firestore deletes | 0 | No retention/cleanup change |
| Storage reads/writes/deletes | 0 | PWA/build migration does not change media persistence |
| Auth operations | 0 | NextAuth/session behavior is preserved |
| Cloud Function invocations | 0 | No Function route/scheduler change |
| AI/provider operations | 0 | No feature/provider flow change |

Any implementation proposal that adds a read, write, API route, Function, rule, index, or persistent migration is out of scope and must stop for a separate architecture/cost/security review.

## 3. Cache behavior and Firebase cost

Cache semantics are the only area where a framework-only change could indirectly affect Firebase cost or public truth.

Next 16 requires a second argument for `revalidateTag`. The repository currently uses immediate invalidation so that an owner mutation is visible on the next public read. Replacing every call with `'max'` would allow stale-while-revalidate and could:

- serve stale menu/OBP/customer truth,
- cause an extra background refresh pattern,
- make desktop/mobile/public behavior diverge,
- mask whether an owner write actually became public.

Therefore public-truth paths use immediate-expiry semantics (`{ expire: 0 }`) unless a traced consumer proves another contract. Non-critical content may use `'max'` only when explicitly documented.

The migration must test representative Firebase-backed flows with read counts where feasible:

- desktop menu publish,
- mobile menu publish,
- business identity/hours update,
- special menu switch,
- customer app setting change,
- multi-outlet propagation/override,
- server/API direct write.

No test should create uncontrolled production reads/writes. Use existing local/emulator fixtures or an explicitly approved QA fixture.

## 4. Server/client package boundaries

`next.config.js` currently uses Webpack externals and client aliases to prevent Firebase Admin/native/server packages from reaching client bundles. The final Turbopack state should prefer real source boundaries:

- Server-only Firebase Admin modules remain behind server-only entry points.
- Client DAL modules import only Firebase client SDK code.
- Shared files must not dynamically pull Firebase Admin into client graphs.
- `serverExternalPackages` is used for verified server packages; it is not a substitute for tenant/auth isolation.
- Browser bundles must not contain service-account material, server credentials, or admin-only code.

The migration build/browser tests must include representative client routes that previously depended on the Webpack `false` aliases.

## 5. Service workers and Firebase data

The owner worker may cache approved static/image resources, but it must not cache:

- Firestore REST/WebChannel responses,
- Firebase Auth/session responses,
- tenant-protected APIs,
- customer menu HTML/data,
- mutation responses.

Customer and MyCodex workers retain their separate policies. Cache Storage inspection is required because a source configuration assertion alone does not prove runtime caching behavior.

## 6. Validation and stop rules

Pass requirements:

- No diff in Firebase rules, indexes, Storage rules, Function source, or Firebase configs attributable to the migration.
- No new Firestore/Storage/Auth/Function operation in the reviewed data-flow inventory.
- Public cache tests preserve first-read freshness.
- Client bundles do not include Firebase Admin/server-only modules.
- Existing Firebase/security/emulator verifiers pass when their shared root contracts are touched.

Stop when:

- a framework issue is "fixed" by moving a client read/write to an unnecessary API route,
- a Turbopack issue is "fixed" by exposing an admin/server module to the client,
- a cache change adds unbounded reads or stale public truth,
- a Firebase deploy becomes necessary without a separately reviewed Firebase change plan.

## 7. Deployment statement

The local Next.js migration requires no Firebase deploy. A later Vercel preview/production deployment is separately controlled and does not imply Firebase deployment authority.
