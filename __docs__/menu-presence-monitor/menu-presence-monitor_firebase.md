# Menu Presence Monitor — Firebase Cost Tracking

> **Version:** 1.7
> **Last Updated:** July 2, 2026

---

## Collections Affected

| Collection | Operation | When | Cost |
|-----------|-----------|------|------|
| `stores` | READ (1) | Page load — read store doc for `menuPresence` field | Already fetched by Use MenuList data loader — **$0.00 additional** |
| `stores` | WRITE (1) | Owner confirms/removes a surface | 1 write per confirmation action |

## New Fields

| Field | Document | Type | Size |
|-------|----------|------|------|
| `menuPresence` | `stores/{tId}_{sId}` | Map with 3 optional sub-maps | ~200 bytes max |
| `starterActivationSignals` | `stores/{tId}_{sId}` | Map of starter distribution actions | ~500 bytes max during starter activation |

For starter activation stores, confirming Google Business, Instagram Bio, or WhatsApp Profile also writes the matching `starterActivationSignals.actions.*` key in the same `updateDoc()` call. This keeps the distribution activation metric measurable without adding a second write.

`buildStarterActivationSummary()` computes activation proof from the already-loaded `menuPresence` and `starterActivationSignals` fields. It adds no Firestore read, write, listener, query, index, or collection.

`updateMenuPresence()` and `recordStarterActivationSignal()` also verify the active session store before any store write. Valid owner flows add no Firestore read/write beyond the existing write; store-scope mismatches fail before writing `menuPresence` or `starterActivationSignals`.

## Cost Estimate

| Scenario | Reads | Writes | Monthly Cost |
|----------|-------|--------|-------------|
| 1 owner, confirms 3 surfaces once | 0 additional | 3 | ~$0.000003 |
| 1,000 owners, each confirms 3 surfaces | 0 additional | 3,000 | ~$0.003 |
| 10,000 owners, each confirms 3 surfaces | 0 additional | 30,000 | ~$0.03 |
| Activation proof summary renders | 0 additional | 0 | Pure client computation from loaded store doc |

**Total incremental cost: $0.00–$0.03/month** at any realistic scale.

## Why Zero Additional Reads

The store document is already fetched by the Use MenuList data loader (`PlatformGlobalDataContext` provides store details). The `menuPresence` field piggybacks on this existing read. No new queries needed.

The published-menu readiness check uses the already-loaded projects list and does not add a read. Clipboard links are source-attributed in the browser with `entry_source=copy_link`, which adds no Firestore write.

## Firestore Indexes

None needed. No queries on `menuPresence` field — it's read as part of the store document.
No indexes are needed for `starterActivationSignals`; it is read as part of the existing store document.

## Diagnostic Hardening

Desktop and mobile presence monitors now log failed official-link copy, surface confirm, and surface remove actions through bounded diagnostics. Official-link copied feedback waits for Clipboard API or acknowledged textarea fallback success, and failed copy diagnostics may include clipboard/fallback support booleans. The Business Settings embedded wrapper logs failed screen-link loading through bounded Business Settings diagnostics; embedded official-link copy remains owned by the shared Presence Monitor component.

Confirm/remove actions also require the typed `updateMenuPresence()` acknowledgement before local presence state, success copy, or selected-surface state changes. A DAL fallback after a failed write reaches the same bounded failure handlers.

The same DAL boundary rejects mismatched active-session stores with `menu_presence_store_scope_mismatch` or `starter_activation_signal_store_scope_mismatch` before the Firestore update is attempted.

This adds no Firestore reads/writes, Storage operations, Cloud Functions, routes, durable artifacts, cache invalidations, indexes, rules, or owner-facing settings. Successful confirm/remove actions still use the existing single `updateMenuPresence()` store write.

## Source Gate

`npm run verify:menu-presence-monitor-boundary` verifies the active-session store guard, `menu_presence_store_scope_mismatch`, `starter_activation_signal_store_scope_mismatch`, typed `MenuPresenceUpdateResult` acknowledgement, desktop/mobile caller acknowledgement checks, bounded diagnostics, and docs parity. It does not run browser/device QA, live confirm/remove writes, Firebase deploys, Vercel deploys, production builds, provider smoke, or production-host checks.

---

**Document Signature:** Firebase Cost Analysis
**Created:** March 15, 2026
