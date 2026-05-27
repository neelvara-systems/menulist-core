# Multi-Chain Permissions — Mobile Support

**Last Updated:** May 27, 2026
**Decision:** ✅ MOBILE SUPPORTED — HQ owner can manage OutletPolicy from phone

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ⚠️ OCCASIONAL | Chain policy setup is rare, but phone-only owners must not be blocked |
| **Speed** | ✅ PASS | Policy changes are switch toggles in one mobile sheet |
| **Touch** | ✅ PASS | 15 flags are grouped into cards with native switches, state tags, unsaved-change handling, and sticky save actions |
| **Value** | ✅ PASS | Outlet rules directly control what outlet teams can edit on mobile and desktop |

**Decision:** Mobile management is supported through `MobileLocationsScreen`. OutletPolicy enforcement remains shared through `applyOutletPolicy()`, editor-level policy checks, linked outlet save validation, and AI API policy checks.

---

## Mobile Implementation

| Capability | Mobile Surface | Runtime Path |
|------------|----------------|--------------|
| Open Locations from More | `MobileMoreScreen` | `canManageLocationSettings()` |
| View stores/outlets | `MobileLocationsScreen` | `tenantDetails.storesList` |
| Add outlet | `MobileLocationsScreen` | `POST /api/outlets/create` |
| Switch outlet context | `MobileMoreScreen` Branch dropdown, billing store picker, `MobileLocationsScreen` | `canSwitchStores` + mapped active stores + `POST /api/auth/switch-store` |
| Manage OutletPolicy | `MobileLocationsScreen` outlet rules sheet | `updateOutletPolicy()` → `POST /api/outlets/policy` |
| Enforce outlet limits | Mobile menu/editor sheets | `userPermissions.outletPolicy` |

---

## Parity Notes

- Desktop and mobile now use the same `canManageLocationSettings()` gate.
- Desktop and mobile store switching now use the same mapped-store access rule: show the switcher only when the user has `canSwitchStores` and more than one active store mapping. On mobile, the Branch dropdown is below the signed-in profile card in More.
- Policy settings appear before the first outlet so HQ can set rules before creating a location.
- Mobile and desktop use the same `OUTLET_POLICY_CATEGORIES` taxonomy, so the 15 rules have the same owner-facing labels and descriptions on both surfaces.
- Legacy single-store tenants with no `isMaster` flag are treated as master candidates in UI and are repaired server-side during first outlet creation or policy save.
- Outlet users still cannot manage chain policy. `applyOutletPolicy()` forces outlet users away from chain-management and billing permissions.
- If an outlet session starts before the master policy is hydrated, `sessionProvider` loads the master store once and `applyOutletPolicy()` uses `DEFAULT_OUTLET_POLICY` as a safe fallback.
- Hidden mobile AI/override actions are backed by server checks: `/api/projects/outlet-save` rejects disabled linked-save changes, description/image API routes reject disabled linked outlet generation requests before provider calls, and `processMenuImagesJob` fails disabled linked outlet extraction jobs before extraction starts.
