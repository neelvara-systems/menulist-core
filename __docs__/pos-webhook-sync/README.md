# POS Webhook Sync — Documentation Hub

> **Feature:** POS Webhook Sync (Menu Snapshot Broadcast)
> **Status:** Implemented — Feature flag: `ENABLE_POS_SYNC: false`
> **Last Updated:** March 14, 2026
> **Version:** 2.1

---

## Quick Navigation

| Audience              | Document                                          | Purpose                |
| --------------------- | ------------------------------------------------- | ---------------------- |
| **CEO / PM**          | [\_spec.md](./pos-webhook-sync_spec.md)           | Business requirements  |
| **Developers**        | [\_impl.md](./pos-webhook-sync_impl.md)           | Technical blueprint    |
| **Sales / Marketing** | [\_marketing.md](./pos-webhook-sync_marketing.md) | Pitch deck, messaging  |
| **Website**           | [\_website.md](./pos-webhook-sync_website.md)     | Landing page content   |
| **Customers**         | [\_helpdoc.md](./pos-webhook-sync_helpdoc.md)     | Help documentation     |
| **Cost Control**      | [\_firebase.md](./pos-webhook-sync_firebase.md)   | Firebase cost tracking |

---

## What Is This Feature?

**One-liner:** Menu changes automatically reach your POS system via a secure webhook — no integration, no manual updates.

**Problem Solved:** When a business uses both MenuList (for digital menu) and a POS system, menu changes must be manually replicated in both places. This leads to price mismatches, missing items, and daily operational friction — especially for chains with multiple outlets.

**Solution:** MenuList automatically sends a full menu snapshot to a store's configured POS webhook endpoint whenever menu-affecting changes occur. One edit in MenuList = everywhere updated. MenuList stays upstream; POS consumes.

---

## Architecture Overview (60-Second Summary)

```
Owner edits menu in MenuList Editor
        ↓
Editor.tsx syncChanges() → triggerPosSyncDebounced()
        ↓
Debounce (25 sec after last edit)
        ↓
POST /api/pos-sync/deliver (server-side)
        ↓
Build full menu snapshot (versioned) + Sign (HMAC-SHA256)
        ↓
POST to store's webhook URL (5s timeout)
        ↓
Log delivery result to stores/{storeId}/posDeliveryLogs
```

**Key design decisions:**

- **Full snapshot only** — no delta/partial updates, ever (ADR-3)
- **Store-level only** — each outlet configures its own webhook
- **Silent operation** — no toasts, no UI feedback when healthy
- **Only 2 server routes** — test + deliver; 3 ops moved client-side (ADR-1)
- **HMAC-SHA256 signatures** — enterprise-grade security
- **3 consecutive failures** before marking connection_issue (not 1)
- See `_impl.md` §14 for full Architecture Decision Record (12 ADRs)

---

## Key Files in Codebase

| Purpose                  | File Path                                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| Feature flag             | `src/config/features.ts` → `ENABLE_POS_SYNC`                             |
| DB collection constant   | `src/constants/database.ts` → `POS_DELIVERY_QUEUE`                       |
| Store type (posSync)     | `src/types/platform/store.ts` → `StoreDataType.posSync`                  |
| Shared types             | `src/lib/posSync/types.ts`                                               |
| Signature utility        | `src/lib/posSync/signature.ts`                                           |
| Payload formatter        | `src/lib/posSync/payloadFormatter.ts`                                    |
| Event builder (debounce) | `src/lib/posSync/eventBuilder.ts`                                        |
| POS Sync settings tab    | `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx` |
| Editor integration       | `src/components/.../editorView/Editor.tsx` (syncChanges)                 |
| API: test webhook        | `src/app/api/pos-sync/test/route.ts`                                     |
| API: deliver snapshot    | `src/app/api/pos-sync/deliver/route.ts`                                  |

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_POS_SYNC: false, // Toggle to enable POS webhook sync
```

---

## Version History

| Version | Date              | Changes                                                                                                                                                                                           |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | February 13, 2026 | Initial documentation (no code yet)                                                                                                                                                               |
| 2.0     | February 14, 2026 | Full implementation complete. 5→2 server routes. ADR section added.                                                                                                                               |
| 2.1     | March 14, 2026    | ChatGPT infrastructure audit review. +4 ADRs (9-12). payloadHash added to delivery logs. Failure threshold 1→3. Phase 2 architecture documented. MOL synergy documented. Open questions resolved. |

---

## Archive

| Document                                                  | Date         | Purpose                                                         |
| --------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| `_archive/chatgpt-review-session-pos-intelligence.md`     | Feb 2026     | Initial ChatGPT conversation review                             |
| `_archive/code-feedback-audit.md`                         | Feb 2026     | Code feedback audit                                             |
| `_archive/chatgpt-review-session-infrastructure-audit.md` | Mar 14, 2026 | Infrastructure-grade webhook architecture audit (~40% accuracy) |
