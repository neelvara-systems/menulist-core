# Multi-Outlet Consistency — Mobile Support

**Last Updated:** February 16, 2026 (v2 — mobile locations screen implemented)
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
| Outlet Policy (15 toggles)       | `MobileLocationsScreen` → `updateOutletPolicy`     | ✅     |

## DAL Parity

- Uses same `/api/outlets/create` and `/api/auth/switch-store` endpoints as desktop
- Same `updateOutletPolicy` DAL function
- Same `OutletPolicy` type and `DEFAULT_OUTLET_POLICY`
- Same `calculateProration` utility
- Same `FEATURE_FLAGS.ENABLE_CHAIN_CONTROL_PANEL` gate
