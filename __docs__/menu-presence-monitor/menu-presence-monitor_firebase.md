# Menu Presence Monitor — Firebase Cost Tracking

> **Version:** 1.8
> **Last Updated:** July 11, 2026

---

## Collections Affected

| Collection | Operation | When | Cost |
|-----------|-----------|------|------|
| `stores` | READ (1) | Page load — read store doc for `menuPresence` field | Already fetched by Use MenuList data loader — **$0.00 additional** |
| `stores` | READ (1) | Owner confirms/removes a surface | Transaction verifies current store and tenant identity |
| `stores` | WRITE (1) | Owner confirms/removes a surface | Canonical presence and optional starter signal update |
| `platformSummary/storesSummary` | WRITE (1) | Owner confirms/removes a surface | Same-transaction presence projection for the current store slot |

## New Fields

| Field | Document | Type | Size |
|-------|----------|------|------|
| `menuPresence` | `stores/{tId}_{sId}` | Map with 3 optional sub-maps | ~200 bytes max |
| `starterActivationSignals` | `stores/{tId}_{sId}` | Map of starter distribution actions | ~500 bytes max during starter activation |

For starter activation stores, confirming Google Business, Apple Business Connect, Bing Places, Instagram Bio, or WhatsApp Profile also writes the matching `starterActivationSignals.actions.*` key in the canonical store update within the same transaction. This keeps the distribution activation metric measurable without another document write.

`buildStarterActivationSummary()` computes activation proof from the already-loaded `menuPresence` and `starterActivationSignals` fields. It adds no Firestore read, write, listener, query, index, or collection.

`updateMenuPresence()` and `recordStarterActivationSignal()` verify the active session store before any store write. `updateMenuPresence()` then performs one transactional store read and two transactional document writes: the canonical store plus the current `storesSummary` slot. The transaction rechecks store/tenant identity and supplies the validated summary `tId`, so a changed scope or rejected summary projection rolls back both writes. `recordStarterActivationSignal()` remains a single canonical store write because that private activation field is not projected into `storesSummary`.

Before constructing `starterActivationSignals.actions.{signal}`, the DAL requires a positive safe-integer store ID and the shared signal allowlist. Invalid values reject with `starter_activation_signal_input_invalid` and add no Firestore operation.

## Cost Estimate

| Scenario | Reads | Writes | Monthly Cost |
|----------|-------|--------|-------------|
| 1 owner, confirms 5 surfaces once | 5 | 10 | Negligible |
| 1,000 owners, each confirms 5 surfaces | 5,000 | 10,000 | Low; verify against current Firebase regional pricing |
| 10,000 owners, each confirms 5 surfaces | 50,000 | 100,000 | Low; verify against current Firebase regional pricing |

Apple and Bing reuse the existing store document and `storesSummary` transaction path. They add no collection, query, listener, index, rule, scheduled function, or server API.
| Activation proof summary renders | 0 additional | 0 | Pure client computation from loaded store doc |

No fixed currency total is asserted here because Firebase regional pricing can change. The bounded operation model is one read and two writes per presence confirmation/removal.

## Why Zero Additional Reads

The page display adds no read: `PlatformGlobalDataContext` already provides store details. A mutation intentionally adds one transactional point read so authorization-relevant store/tenant identity is rechecked at commit time. No query or listener is added.

The published-menu readiness check uses the already-loaded projects list and does not add a read. Clipboard links are source-attributed in the browser with `entry_source=copy_link`, which adds no Firestore write.

## Firestore Indexes

None needed. No queries on `menuPresence` field — it's read as part of the store document.
No indexes are needed for `starterActivationSignals`; it is read as part of the existing store document.

## Diagnostic Hardening

Desktop and mobile presence monitors now log failed official-link copy, surface confirm, and surface remove actions through bounded diagnostics. Official-link copied feedback waits for Clipboard API or acknowledged textarea fallback success, and failed copy diagnostics may include clipboard/fallback support booleans. The Business Settings embedded wrapper logs failed screen-link loading through bounded Business Settings diagnostics; embedded official-link copy remains owned by the shared Presence Monitor component.

Confirm/remove actions also require the typed `updateMenuPresence()` acknowledgement before local presence state, success copy, or selected-surface state changes. A DAL fallback after a failed write reaches the same bounded failure handlers.

The same DAL boundary rejects mismatched active-session stores with `menu_presence_store_scope_mismatch` or `starter_activation_signal_store_scope_mismatch` before the Firestore update is attempted. Presence mutations also reject malformed runtime input and a transaction-time store/tenant mismatch.

Successful presence mutations use post-commit public client cache invalidation so browser SWR/local-storage state and server public tags do not retain the pre-transaction projection. This change adds no Storage operations, Cloud Functions, routes, new durable artifacts, indexes, rules, or owner-facing settings.

## Source Gate

`npm run verify:menu-presence-monitor-boundary` verifies runtime input guards, active-session and transaction-time scope checks, atomic store/summary projection, post-commit public client cache invalidation, `menu_presence_store_scope_mismatch`, `starter_activation_signal_store_scope_mismatch`, typed `MenuPresenceUpdateResult` acknowledgement, desktop/mobile caller acknowledgement checks, bounded diagnostics, and docs parity. `npm run test:stores-summary:rules` exercises admitted and rejected atomic presence writes against the Firestore rules emulator. These gates do not run browser/device QA, live production confirm/remove writes, Firebase deploys, Vercel deploys, production builds, provider smoke, or production-host checks.

---

**Document Signature:** Firebase Cost Analysis
**Created:** March 15, 2026
