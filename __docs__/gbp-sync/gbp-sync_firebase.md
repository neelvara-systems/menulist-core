# GBP Sync — Firebase Cost Tracking

**Feature:** Google Business Profile Minimal Sync  
**Status:** 🔶 BLOCKED — Awaiting GBP API Access  
**Last Updated:** February 7, 2026  
**Priority:** LOW (currently) — Not yet implemented. Cost plan for future.

---

## Summary

> **Note:** Blocked pending Google Business Profile API access. All operations below are PLANNED.

- **Collections (Planned):** `gbpConnections/{tId}/{sId}`, `gbpAuditLog/{tId}/{sId}`, `stores` (menu link field)
- **Storage Buckets:** None
- **Cloud Functions (Planned):** `gbpMenuLinkSync` (on menu URL change), `gbpHoursDriftCheck` (weekly scheduled)
- **Estimated Monthly Cost:** **Very Low** — Weekly checks + rare sync operations

---

## Planned Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| Load GBP connection | `gbpConnections/{tId}/{sId}` | Any GBP operation | Per operation | OAuth tokens, selected location ID. |
| Load store hours | `stores/{storeId}` | Weekly hours drift check | Weekly per store | Compare MenuList hours vs GBP hours. |

### Writes

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| Save GBP connection | `gbpConnections/{tId}/{sId}` | Owner connects Google account | One-time setup | OAuth tokens, location ID. |
| Log audit entry | `gbpAuditLog/{tId}/{sId}` | Any GBP sync action | Per action | Action type, result, timestamp. Internal MOL. |
| Update menu link status | `stores/{storeId}` | After menu link sync | Per sync | Last sync time, sync status. |

---

## Cloud Functions (Planned)

| Function | Trigger | Frequency | Duration | Notes |
|----------|---------|-----------|----------|-------|
| `gbpMenuLinkSync` | Menu URL changes | Per URL change | 5-10s | Updates GBP menu link via API. |
| `gbpHoursDriftCheck` | Scheduled (weekly) | 1x/week per store | 5s per store | Compares hours, logs drift. |

---

## Cost Estimate (Planned)

Minimal — weekly checks + rare sync operations. Under $0.05/month for 1000 stores.

---

## Implementation Status

❌ **Not yet implemented.** Blocked on GBP API access.
