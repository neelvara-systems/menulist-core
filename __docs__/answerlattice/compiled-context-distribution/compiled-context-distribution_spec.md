# Compiled Context Distribution Spec

**Version:** 2.0

**Last updated:** July 18, 2026

**Flags:** `ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES`, `ENABLE_ANSWERLATTICE_BUNDLE_BUILDER`

## Customer problem

Approved support context is read repeatedly by customer and agent surfaces, but those reads must not require a broad Firestore fan-out or weaken governance. Distribution must remain tenant-isolated, current enough for the use case, bounded in cost, and reversible when a build fails.

## Required behavior

1. A governed source mutation increments the applicable source version and marks the manifest stale in the same domain write/batch when supported by that writer.
2. A manual or scheduled builder validates exact `AL` product and numeric tenant/workspace scope.
3. The builder transactionally claims a lease and a unique positive bundle version.
4. Every source collection is read with an explicit maximum plus one overflow row.
5. Only approved/public-safe fields enter public objects. Tickets, chats, raw signals, drafts, audit logs, secrets, billing data, private URLs, and private evidence IDs are excluded.
6. Every serialized object is checked by UTF-8 byte size before upload.
7. Source versions are re-read after generation. A changed source snapshot makes the new build superseded instead of active.
8. The Firestore manifest is published only by the worker that still owns the lease.
9. Failure preserves the previous ready version and records a bounded failure state.
10. Readers derive the expected immutable Storage path from the validated manifest; they never trust an arbitrary stored path.

## Limits

| Boundary | Limit |
| --- | ---: |
| Public `widget-bootstrap.json` | 50 KB |
| Public `routes/*` object | 50 KB |
| Other public object | 512 KiB |
| Private object | 2 MiB |
| MCP response | 24 KB |
| MCP calls | 60/minute per scoped session |
| Manifest memory cache | 60 seconds |
| Bundle-object memory cache | 10 minutes |

Source collection limits are defined beside the builders. Crossing a limit is a build failure, not a partial-success state.

## Rollout truth

- Manual and nightly bundle builders: enabled.
- Public API bundle preference: implemented, but the Public API itself is rollout-gated.
- MCP bundle reads: implemented, but MCP is disabled by default.
- Widget bundle bootstrap: disabled until the widget consumes and verifies the files.

## Success measures

- percentage of due stale manifests returning to ready;
- failed and superseded build rate;
- source-limit saturation rate;
- public/private object-limit rejection rate;
- fallback rate by consumer;
- time from governed source change to a ready active bundle;
- incorrect or cross-scope ref acceptance: zero.

No latency, hit-rate, cost-savings, or zero-staleness target is a public promise until measured in a configured environment.
