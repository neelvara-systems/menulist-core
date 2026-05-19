# Multi-Outlet Consistency — Mobile Support

**Last Updated:** May 19, 2026 (v3 — mobile/desktop access gate and legacy master repair aligned)
**Decision:** ✅ MOBILE SUPPORTED — Owner can manage outlets and chain policy from phone

---

## Feature Admission Test (Re-evaluated with "no desktop at all" lens)

| Gate          | Result        | Reasoning                                              |
| ------------- | ------------- | ------------------------------------------------------ |
| **Frequency** | ⚠️ OCCASIONAL | Outlet management is rare but BLOCKING without desktop |
| **Speed**     | ✅ PASS       | Add outlet <5s, switch store <2s, toggle policy <1s    |
| **Touch**     | ✅ PASS       | List + switches + input field                          |
| **Value**     | ✅ PASS       | Phone-only chain owner MUST manage outlets from phone  |

---

## Mobile Implementation

| Feature                          | Mobile Component                                   | Status |
| -------------------------------- | -------------------------------------------------- | ------ |
| View all outlets                 | `MobileLocationsScreen`                            | ✅     |
| Billing summary (stores × price) | `MobileLocationsScreen`                            | ✅     |
| Switch between stores            | `MobileLocationsScreen` → `/api/auth/switch-store` | ✅     |
| Add new outlet                   | `MobileLocationsScreen` → `/api/outlets/create`    | ✅     |
| Proration display                | `MobileLocationsScreen` → `calculateProration`     | ✅     |
| Outlet Policy (15 toggles)       | `MobileLocationsScreen` → `updateOutletPolicy` → `/api/outlets/policy` | ✅     |

## DAL Parity

- Uses same `/api/outlets/create`, `/api/auth/switch-store`, and `/api/outlets/policy` endpoints as desktop
- Same `updateOutletPolicy` DAL function, now server-owned for policy writes
- Same `OutletPolicy` type and `DEFAULT_OUTLET_POLICY`
- Same `calculateProration` utility
- Same `canManageLocationSettings()` gate across mobile More, mobile Locations, desktop Locations, and desktop sidebars

## Legacy Single-Store Repair

Older demo/production accounts may have a premium subscription but no `isMaster: true` flag on the first store. Mobile and desktop treat a tenant with exactly one store and no master as a safe master candidate. The actual data repair is server-side:

- `/api/outlets/create` promotes the current store to `isMaster: true` while creating the first outlet.
- `/api/outlets/policy` promotes the current store to `isMaster: true` when HQ saves policy before creating the first outlet.
- Both paths update `stores/{sId}`, `tenants/{tId}.storesList`, `platformSummary/storesSummary`, and public cache tags.
- Store switching normalizes numeric/string store IDs and rejects inactive target stores server-side, so stale mobile lists cannot switch into a disabled outlet.
- Mobile location text is covered by the shared `MobileLocations` locale namespace across all active locale files.
