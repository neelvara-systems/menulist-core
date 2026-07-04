# Multi-Outlet Consistency — Mobile Support

**Last Updated:** July 4, 2026 (v14 - master update acknowledgement snapshot hardening)

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
| Switch between stores            | `MobileMoreScreen` Branch dropdown + `MobileLocationsScreen` → `/api/auth/switch-store` | ✅     |
| Add new outlet                   | `MobileLocationsScreen` → `/api/outlets/create`    | ✅     |
| Proration display                | `MobileLocationsScreen` → `calculateProration`     | ✅     |
| Outlet Rules (15 toggles)        | `MobileLocationsScreen` → `updateOutletPolicy` → `/api/outlets/policy` | ✅     |
| Master update review/history     | `MobileMasterUpdateNotice` → `useMasterUpdateAwareness` | ✅     |

## DAL Parity

- Uses same `/api/outlets/create`, `/api/auth/switch-store`, and `/api/outlets/policy` endpoints as desktop
- Mobile and desktop expose store switching only when the user has `canSwitchStores` and more than one active mapped store. Mobile keeps the primary branch dropdown in More, below the signed-in profile card.
- Mobile Locations treats rejected `/api/auth/switch-store` responses as fixed-copy switch failures and logs bounded `mobile_location_store_switch_failed` diagnostics. Outlet creation logs rejected API responses and network/client exceptions through `mobile_location_create_failed`.
- Desktop header, desktop Billing, desktop Locations, mobile More, mobile Billing, and mobile Locations switch-store callers share the auth account browser request policy: no-store cache, same-origin credentials, and manual redirects before the existing rejected-response handling and Firebase claim refresh.
- Uses `/api/projects/outlet-save` for linked outlet menu saves, matching desktop persistence: mobile resolves master + outlet local data for display but saves only local `L_I_` / `L_C_` records and overrides.
- Mobile and desktop linked outlet save/publish flows, plus linked-outlet extraction review applies, call `/api/projects/outlet-save` with the shared no-store, same-origin, manual-redirect request policy and then parse acknowledgements through a shared 2MB bounded response guard before requiring the returned project to match the requested `projectId` and `masterProjectId`.
- Mobile and desktop extraction review applies pass the selected-change count into the shared apply helper and require the returned `projectId`, `jobId`, comparison mode, completion flag, and applied count before local success copy or completion callbacks run.
- `/api/projects/outlet-save` enforces OutletPolicy server-side for price, availability, description, image, language additions, local items/categories, project deactivation, theme, brand, and layout changes, so mobile controls are not the only protection.
- Linked outlet description/image APIs and menu extraction jobs also enforce OutletPolicy server-side before provider calls, so hidden mobile actions cannot be bypassed by direct API or job requests.
- Mobile menu now shows the same master-update awareness contract as desktop: current diff, outlet impact notes, "Got it" acknowledgment, and "Last changes" history.
- Mobile and desktop "Got it" acknowledgements write a Firestore-safe `masterSnapshot.lastDiff`: optional diff fields are omitted before persistence, so missing outlet override values do not block the acknowledgement. The local desktop/mobile project cache still updates only after the project write succeeds.
- Mobile menu linked-outlet resolution and related owner-menu failure paths use bounded diagnostics (`src/lib/multiOutlet/diagnostics.ts` and `src/components/mobile/utils/mobileMenuDiagnostics.ts`) instead of direct-console raw project/store/job payloads.
- Linked outlet local saves, direct overrides, and extraction apply stamp `outletLocalState` only on the outlet project, so mobile local work is observable without writing master data.
- Same `updateOutletPolicy` DAL function, now server-owned for policy writes. Mobile sends only changed policy flags; the server merges them into the master policy and the shared DAL requires a bounded, complete policy acknowledgement before local state updates.
- Mobile and desktop outlet create, rename, deactivate, and policy-save calls share `MULTI_OUTLET_ACTION_REQUEST_POLICY`, so these owner actions stay uncached, same-origin, and manual-redirect before the existing 16KB response guard and local tenant/store state updates.
- Same `OutletPolicy` type and `DEFAULT_OUTLET_POLICY`
- Same `calculateProration` utility
- Mobile and desktop hide the add-outlet proration card for `billingMode: "manual"` subscriptions because those accounts are prepaid/offline, not auto-debited through Razorpay.
- Mobile and desktop disable add-outlet submission for manual/offline accounts when prepaid location capacity is exhausted. The owner sees a reseller-capacity message instead of hitting a generic "outlet creation failed" error.
- Mobile and desktop also disable direct add-outlet submission for active UPI-backed Razorpay subscriptions when paid location capacity is exhausted. Razorpay does not allow quantity updates for that payment mode, so Locations shows "Paid location needed" and routes to Billing; Billing creates a replacement same-plan checkout with the next `quantity`.
- Mobile and desktop parse outlet create, rename, and deactivate acknowledgements through the shared 16KB outlet action response guard before updating local tenant/store UI state. Malformed successful responses log bounded parse/shape diagnostics and show fixed failure copy instead of applying incomplete outlet IDs, slugs, or billing flags.
- Mobile and desktop active outlet counters exclude inactive outlets, matching billing quantity, public visibility behavior, and the server-side maximum-outlet cap.
- Inactive outlets remain visible for context, but switch, rename, and deactivation actions are blocked through the normal UI and server routes.
- Same `canManageLocationSettings()` gate across mobile More, mobile Locations, desktop Locations, and desktop sidebars
- Mobile More `Branch` dropdown refreshes Firebase auth claims for the selected mapped store. Switching back to HQ refreshes claims back to the master store before clearing the active outlet context, preventing stale outlet-claim permission errors.
- Mobile outlet rules sheet uses the shared `OUTLET_POLICY_CATEGORIES` taxonomy with owner-facing labels, allowed/blocked state tags, an unsaved-change warning, and a discard confirmation before closing.
- Mobile menu command bubble is offset from the Answerlattice help launcher so the add item/category command sheet remains reachable on phone-sized screens.
- Multi-location boundary source gate: `npm run verify:multi-location-boundary` locks MobileShell route mapping, the shared outlet action request policy, bounded acknowledgement guards, active-outlet UI counters, Billing handoff copy, and docs/audit parity. It is source-only and does not replace authenticated browser or physical-device QA.

## Legacy Single-Store Repair

Older demo/production accounts may have a premium subscription but no `isMaster: true` flag on the first store. Mobile and desktop treat a tenant with exactly one store and no master as a safe master candidate. The actual data repair is server-side:

- `/api/outlets/create` promotes the current store to `isMaster: true` while creating the first outlet.
- `/api/outlets/policy` promotes the current store to `isMaster: true` when HQ saves policy before creating the first outlet.
- Both paths update `stores/{sId}`, `tenants/{tId}.storesList`, `platformSummary/storesSummary`, and public cache tags.
- Outlet create, rename, deactivate, and policy APIs reject bodies above 8KB before validation or writes; linked outlet project save rejects bodies above 2MB before OutletPolicy enforcement and project writes.
- Store switching normalizes numeric/string store IDs and rejects inactive target stores server-side, so stale mobile lists cannot switch into a disabled outlet.
- Mobile location text is covered by the shared `MobileLocations` locale namespace across all active locale files.
- Manual/offline premium accounts can create outlets from mobile only when prepaid `subscription.quantity` is greater than active store count. If capacity is exhausted, `/api/outlets/create` blocks with 402 and the reseller/platform adds capacity through the reseller dashboard after collecting payment.
- UPI-backed Razorpay accounts can create outlets from mobile only after Billing has increased paid capacity through the replacement-subscription checkout. `/api/outlets/create` returns `OUTLET_LOCATION_PAYMENT_REQUIRED` when direct provider quantity update is not supported.

## Actual Firebase Verification (May 19, 2026)

- QA tenant/store data: tenant `39`, master store `39`, outlet store `40`, master project `39-mpctee7o-39`, outlet project `39-mpcthm9t-40`.
- Mobile outlet menu displayed inherited `Master Mains` / `Master Thali` plus outlet local `Outlet Test Chaat`.
- Mobile added local item and local category via UI; Firestore confirmed outlet-only IDs `L_I_1779208870629_nhfqsp` and `L_C_1779209396986_b0rb6j`.
- Mobile `HQ` switch then refresh showed only the master menu and no outlet local data.
- Desktop Locations and desktop Projects were retested after the same data writes; outlet context showed inherited + local data, HQ context showed master data only.
- Final audit also verified the backend save, AI API, and extraction job contracts so disabled outlet-policy flags cannot be bypassed by posting crafted linked-outlet menu, generation, or extraction job requests.
