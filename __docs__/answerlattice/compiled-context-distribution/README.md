# Answerlattice Compiled Context Distribution

Answerlattice uses a permanent source-truth plus compiled-context architecture.

Firestore remains the governed source of truth for tenants, stores, KB articles, FAQs, entities, canonical answers, product surfaces, releases, tickets, signals, proposals, and audit state. Firebase Storage stores immutable generated JSON bundles for approved read-heavy context. Server memory, Redis, browser cache, and CDN cache are the hot serving layer.

This layer exists because widget sessions, public API clients, and MCP agents can repeat context reads far more often than owners open dashboards. Runtime surfaces must not fan out into raw Firestore collections on every request.

## Documents

- [compiled-context-distribution_spec.md](compiled-context-distribution_spec.md)
- [compiled-context-distribution_impl.md](compiled-context-distribution_impl.md)
- [compiled-context-distribution_firebase.md](compiled-context-distribution_firebase.md)
- [compiled-context-distribution_mobile-support.md](compiled-context-distribution_mobile-support.md)
- [compiled-context-distribution_marketing.md](compiled-context-distribution_marketing.md)
- [compiled-context-distribution_website.md](compiled-context-distribution_website.md)
- [compiled-context-distribution_helpdoc.md](compiled-context-distribution_helpdoc.md)
- [compiled-context-distribution_test-cases.md](compiled-context-distribution_test-cases.md)

## Permanent Rule

Read-hot Answerlattice runtimes must read:

`memory cache -> Redis/server cache -> Storage bundle -> platformSummary manifest -> Firestore source`

Governance and editing screens can still use Firestore because they need fresh mutable review state. Widget bootstrap, MCP tools, and public read APIs use compiled approved context first.

## Diagnostics Rule

Manual and nightly bundle builders must keep failure output bounded. Changelog fallback warnings, best-effort Storage manifest-copy failures, build locks, manifests, scheduler results, and owner-visible responses use fixed status/error codes plus source error name/code/status metadata only. They must not store or emit raw exception text, tenant/store identifiers, Storage paths beyond approved bundle refs, or source content.
