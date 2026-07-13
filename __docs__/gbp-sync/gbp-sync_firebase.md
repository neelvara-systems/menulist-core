# GBP Sync — Firebase Cost Tracking

**Feature:** Google Business Profile Minimal Sync  
**Status:** 🔶 BLOCKED — Awaiting GBP API Access  
**Last Updated:** July 10, 2026
**Priority:** Reserved integration; no active GBP Firebase cost.

> **Launch boundary:** Not current launch certification or deploy approval. This document records disabled/reserved GBP Sync evidence only: `ENABLE_GBP_SYNC` remains false, token operations fail closed with `GBP_TOKEN_STORE_DISABLED`, and manual Google handoff is the only current owner path. Current implementation or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:public-business-truth`, Google Business Profile API access, OAuth and target-secret setup, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke.

---

## Summary

> **Current source boundary:** `ENABLE_GBP_SYNC` is false. The token DAL defines the server-only path shape but throws `GBP_TOKEN_STORE_DISABLED`; no active Google OAuth route, token write, sync worker, Firestore rule change, or scheduled Cloud Function is shipped.

- **Current GBP Firestore operations:** none
- **Reserved token path:** `tenants/{tId}/integrations/gbp/{sId}` (server-only; disabled)
- **Storage Buckets:** None
- **Current Cloud Functions:** none
- **Estimated Current Monthly Cost:** ₹0 for GBP sync

---

## Reserved Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| Load GBP token | `tenants/{tId}/integrations/gbp/{sId}` | Reserved provider operation | Per operation | Requires server-only rules and enabled token store. |
| Load store hours | `stores/{storeId}` | Reserved provider operation | Per sync check | Compare MenuList hours vs Google hours after provider gates. |

### Writes

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| Save GBP token | `tenants/{tId}/integrations/gbp/{sId}` | Reserved OAuth callback | Per connection | Not active while `GBP_TOKEN_STORE_DISABLED` is thrown. |
| Log audit event | Existing MOL path | Reserved provider action | Per action | Must reuse Menu Observation Layer, not a new noisy ledger. |
| Update GBP state | `stores/{storeId}` | Reserved provider action | Per sync | Requires cache invalidation and owner-safe copy review. |

---

## Reserved Cloud Functions

| Function | Trigger | Frequency | Duration | Notes |
|----------|---------|-----------|----------|-------|
| GBP sync worker | Reserved scheduler task | TBD after provider approval | TBD after smoke | Must be added to the approved scheduler pattern with cost note and scoped deploy evidence. |

---

## Reserved Cost Estimate

No active GBP cost exists today. Re-estimate before activation using real provider call count, Firestore read/write count, scheduler cadence, and target store volume.

---

## Implementation Status

❌ **Not active runtime.** Blocked on GBP API access, OAuth setup, provider smoke, deploy evidence, browser/device QA, and production-host smoke.
