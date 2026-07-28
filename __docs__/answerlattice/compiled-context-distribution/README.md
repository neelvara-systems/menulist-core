# Answerlattice Compiled Context Distribution

**Status:** Implemented and Feature 14 source-hardened; reserved-counter boundary reverified on July 26, 2026

**Role:** Read distribution for approved support context; Firestore remains the governed source of truth.

Answerlattice compiles selected approved, read-heavy context into content-immutable versioned JSON objects in Firebase Storage. The active Firestore manifest selects one exact version. Public transport is server-mediated through the bounded proxy and must revalidate object existence so workspace closure can revoke an otherwise valid versioned URL; client Storage rules deny direct reads. Private transport remains authenticated and short cached. Public and private consumers may use those objects only after product, tenant, workspace, version, path, hash, and byte-limit validation.

The public prefix is deterministic ownership data, not a bearer-selected path. Every server writer/deleter derives the exact expected ID from tenant, workspace, and `ANSWERLATTICE_PUBLIC_BUNDLE_SALT`; a missing salt or mismatched manifest stops for operator review. Nightly retention advances a durable, bounded exact-version cursor so large kept/old prefixes cannot starve later cleanup.

## Current runtime truth

- Manual and nightly builders share source-version, lock, version, object-limit, failure, and last-ready behavior.
- Public objects contain public-safe product, canonical, documentation-navigation, surface, release, and predictive context only.
- Private objects support server-side entity and MCP-style retrieval; they are never public Storage reads.
- Public API bundle reads are implemented behind their existing rollout flags.
- MCP is implemented but disabled by default.
- Widget bundle bootstrap is disabled because the current widget does not consume the returned bundle files. Widget search continues through the governed server path.
- `branding` and `mcpPolicy` remain reserved invalidation counters. Their numeric values appear only in the complete source-version snapshot stored in Firestore control state and private `mcp/product-summary.json` metadata. The app and Functions builders do not read the private advanced-branding profile or an MCP authorization-policy document, and compiled context does not serialize either payload.

## Safety invariants

- Source queries use cap-plus-one reads and fail the build instead of silently truncating approved truth.
- Public bootstrap and route objects are capped at 50 KB, other public objects at 512 KiB, and private objects at 2 MiB.
- The public `manifest.json` is a restricted projection. It does not expose tenant/workspace identifiers, source versions, private paths, stats, or limits.
- Manifest objects are not self-referential entries in `manifest.bundles`; the Firestore manifest remains the authoritative ref map.
- A failed build preserves the previous ready pointer and removes only the failed version's unreferenced public/private prefixes best effort.
- In-process manifest reads may remain cached for up to 60 seconds. Consumers still validate exact refs and fail closed or use their documented fallback.
- Manual request metadata uses fixed reason/requester codes. Diagnostics never store raw owner ids/emails or arbitrary request reason text.

## Documents

- [compiled-context-distribution_spec.md](compiled-context-distribution_spec.md)
- [compiled-context-distribution_impl.md](compiled-context-distribution_impl.md)
- [compiled-context-distribution_firebase.md](compiled-context-distribution_firebase.md)
- [compiled-context-distribution_test-cases.md](compiled-context-distribution_test-cases.md)
- [compiled-context-distribution_helpdoc.md](compiled-context-distribution_helpdoc.md)
- [compiled-context-distribution_mobile-support.md](compiled-context-distribution_mobile-support.md)
- [compiled-context-distribution_marketing.md](compiled-context-distribution_marketing.md)
- [compiled-context-distribution_website.md](compiled-context-distribution_website.md)
