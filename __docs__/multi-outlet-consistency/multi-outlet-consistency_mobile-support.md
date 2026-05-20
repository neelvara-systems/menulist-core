# Multi-Outlet Consistency — Mobile Support

**Last Updated:** May 20, 2026 (v8 — prepaid manual location capacity)

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
| Master update review/history     | `MobileMasterUpdateNotice` → `useMasterUpdateAwareness` | ✅     |

## DAL Parity

- Uses same `/api/outlets/create`, `/api/auth/switch-store`, and `/api/outlets/policy` endpoints as desktop
- Uses `/api/projects/outlet-save` for linked outlet menu saves, matching desktop persistence: mobile resolves master + outlet local data for display but saves only local `L_I_` / `L_C_` records and overrides.
- `/api/projects/outlet-save` enforces OutletPolicy server-side for price, availability, description, image, language additions, local items/categories, project deactivation, theme, brand, and layout changes, so mobile controls are not the only protection.
- Linked outlet AI description/image APIs also enforce OutletPolicy server-side before provider calls, so hidden mobile actions cannot be bypassed by direct API requests.
- Mobile menu now shows the same master-update awareness contract as desktop: current diff, outlet impact notes, "Got it" acknowledgment, and "Last changes" history.
- Linked outlet local saves, direct overrides, and extraction apply stamp `outletLocalState` only on the outlet project, so mobile local work is observable without writing master data.
- Same `updateOutletPolicy` DAL function, now server-owned for policy writes
- Same `OutletPolicy` type and `DEFAULT_OUTLET_POLICY`
- Same `calculateProration` utility
- Mobile and desktop hide the add-outlet proration card for `billingMode: "manual"` subscriptions because those accounts are prepaid/offline, not auto-debited through Razorpay.
- Mobile and desktop disable add-outlet submission for manual/offline accounts when prepaid location capacity is exhausted. The owner sees a reseller-capacity message instead of hitting a generic "outlet creation failed" error.
- Same `canManageLocationSettings()` gate across mobile More, mobile Locations, desktop Locations, and desktop sidebars
- MobileShell `HQ` switch refreshes Firebase auth claims back to the master store before clearing the active outlet context, preventing stale outlet-claim permission errors after switching back.
- Mobile menu command bubble is offset from the Canonica help launcher so the add item/category command sheet remains reachable on phone-sized screens.

## Legacy Single-Store Repair

Older demo/production accounts may have a premium subscription but no `isMaster: true` flag on the first store. Mobile and desktop treat a tenant with exactly one store and no master as a safe master candidate. The actual data repair is server-side:

- `/api/outlets/create` promotes the current store to `isMaster: true` while creating the first outlet.
- `/api/outlets/policy` promotes the current store to `isMaster: true` when HQ saves policy before creating the first outlet.
- Both paths update `stores/{sId}`, `tenants/{tId}.storesList`, `platformSummary/storesSummary`, and public cache tags.
- Store switching normalizes numeric/string store IDs and rejects inactive target stores server-side, so stale mobile lists cannot switch into a disabled outlet.
- Mobile location text is covered by the shared `MobileLocations` locale namespace across all active locale files.
- Manual/offline premium accounts can create outlets from mobile only when prepaid `subscription.quantity` is greater than active store count. If capacity is exhausted, `/api/outlets/create` blocks with 402 and the reseller/platform adds capacity through the reseller dashboard after collecting payment.

## Actual Firebase Verification (May 19, 2026)

- QA tenant/store data: tenant `39`, master store `39`, outlet store `40`, master project `39-mpctee7o-39`, outlet project `39-mpcthm9t-40`.
- Mobile outlet menu displayed inherited `Master Mains` / `Master Thali` plus outlet local `Outlet Test Chaat`.
- Mobile added local item and local category via UI; Firestore confirmed outlet-only IDs `L_I_1779208870629_nhfqsp` and `L_C_1779209396986_b0rb6j`.
- Mobile `HQ` switch then refresh showed only the master menu and no outlet local data.
- Desktop Locations and desktop Projects were retested after the same data writes; outlet context showed inherited + local data, HQ context showed master data only.
- Final audit also verified the backend save and AI API contracts so disabled outlet-policy flags cannot be bypassed by posting crafted linked-outlet menu or generation requests.
