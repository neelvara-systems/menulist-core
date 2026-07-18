# Stores Management — Technical Implementation

> **Audience:** Developers  
> **Last Updated:** June 30, 2026
> **Version:** 1.2

---

## Architecture Overview

> **July 11, 2026 tenant-name propagation boundary:** `updateTenant()` delegates changed tenant names to authenticated `POST /api/tenants/name`. The route transactionally reads the canonical tenant and a bounded tenant store query, rechecks owner/platform authority, and writes tenant `name/storesList`, every canonical store `tenantName`, and one nested `storesSummary` merge together. Browser DAL code requires a bounded shaped acknowledgement and removes server-owned `name/storesList` from the follow-up direct update. Public menu/store/client-store/screen and Owner Business Assistant effects run in bounded chunks after commit. Each derived effect is isolated with all-settled execution: one failure cannot stop later stores/global tags or turn the committed rename into HTTP 500. The response reports `effectsPending` and `failedEffectCount`, while bounded diagnostics preserve recovery visibility.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STORES MANAGEMENT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  UI LAYER                                                                    │
│  ━━━━━━━━━                                                                   │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │ StoresDashboard  │    │ TenantDetailsModal│    │ StoreDetailsModal│       │
│  │ (index.tsx)      │───▶│ (tenantDetails    │───▶│ (storeDetails    │       │
│  │                  │    │  Modal.tsx)       │    │  Modal.tsx)      │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│                                   │                       │                  │
│                                   └───────────┬───────────┘                  │
│                                               ▼                              │
│                                 ┌──────────────────────┐                     │
│                                 │  BusinessSettings    │                     │
│                                 │  (10 Tab Sections)   │                     │
│                                 └──────────────────────┘                     │
│                                               │                              │
│  DAL LAYER                                    │                              │
│  ━━━━━━━━━━                                   ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │ stores/index.tsx │◀───│ tenants/index.tsx│◀───│ platformSummary/ │       │
│  │ addStore()       │    │ updateTenants... │    │ index.ts         │       │
│  │ updateStore()    │    │                  │    │ syncStoreToSumm..│       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│           │                       │                       │                  │
│           └───────────────────────┼───────────────────────┘                  │
│                                   ▼                                          │
│  FIRESTORE                                                                   │
│  ━━━━━━━━━━                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────────┐                      │
│  │ stores  │  │ tenants │  │ platformSummary/summary │                      │
│  │         │  │         │  │ platformSummary/storesSummary │                │
│  └─────────┘  └─────────┘  └─────────────────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files

### UI Components

| File                                                               | Purpose                                 | Lines    |
| ------------------------------------------------------------------ | --------------------------------------- | -------- |
| `src/components/templates/platform/stores/index.tsx`               | Stores dashboard with table and filters | 210      |
| `src/components/templates/platform/stores/storeDetailsModal.tsx`   | Modal wrapper for BusinessSettings      | 45       |
| `src/components/templates/platform/tenants/tenantDetailsModal.tsx` | Tenant modal with "Add Store" button    | 340      |
| `src/components/templates/main-app/businessSettings/index.tsx`     | Main form with 10 sections              | 569      |
| `src/components/templates/main-app/businessSettings/tabs/`         | Individual tab components               | Multiple |

### Data Access Layer

| File                                    | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `src/database/stores/index.tsx`         | Store CRUD operations                  |
| `src/database/projects/index.ts`        | Time-slot preset category cascades     |
| `src/database/tenants/index.tsx`        | Tenant operations, storesList updates  |
| `src/database/platformSummary/index.ts` | Counter management, store summary sync |
| `src/app/api/domain/route.ts`           | Custom-domain add/verify/remove writes |

### Types

| File                           | Key Types                                                 |
| ------------------------------ | --------------------------------------------------------- |
| `src/types/platform/store.ts`  | `StoreDataType`, `MinimalStoreDataType`, `TimeSlotPreset` |
| `src/types/platform/tenant.ts` | `TenantDataType`                                          |

---

## Database Operations

### Create Store Flow

```typescript
// Prepare store data; addStore reserves the collision-checked global ID.
const storeData = {
  tenantId: tenantDetails.tenantId,
  storeKey: name.toLowerCase().replaceAll(" ", "_"),
  email: tenantDetails.email,
  phoneNumber: tenantDetails.phoneNumber,
  tenantName: tenantDetails.name,
  // ... other fields
};

const savedStore = await addStore(storeData);
// Internally:
//   - Uploads logo if base64 provided
//   - Assigns default timeSlotPresets based on businessType
//   - Reserves a collision-checked ID through canonical platformSummary/summary
//   - Reads the current tenant and target store in one transaction
//   - Creates stores/{storeId}, writes platformSummary/storesSummary,
//     and upserts the current tenant storesList entry atomically
```

### Update Store Flow

```typescript
// 1. Detect changes
const updatedChanges = getObjectDifferance(newData, existingData);

// 2. Update if changes exist
if (Object.keys(updatedChanges).length > 0) {
  updatedChanges.storeId = existingData.storeId;

  // 3. Update storeKey if name changed
  if ("name" in updatedChanges) {
    updatedChanges.storeKey = updatedChanges.name
      .toLowerCase()
      .replaceAll(" ", "_");
  }

  // Call updateStore
  await updateStore(updatedChanges);
// Internally:
//   - Uploads new logo if base64 provided
  //   - Re-reads the current canonical store inside a transaction
  //   - Atomically updates stores/{storeId} and platformSummary/storesSummary
  //   - If name/tenantName changed, upserts the tenant list entry from current state
  //   - Revalidates public menu/OBP store cache tags
}
```

---

## DAL Functions Reference

### `addStore(data, from?)`

**Location:** `src/database/stores/index.tsx:99-143`

```typescript
export const addStore = async (data: any, from: string = "") => {
  return await apiCallComposer(
    async () => {
      if (from !== "onboarding") {
        data.storeId = await reserveNextPlatformEntityId("store");
      }
      const storeId = Number(data.storeId);
      const tenantId = Number(data.tenantId);
      const storeRef = getDocRef(storeId);
      const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, String(tenantId));
      const summaryRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, "storesSummary");
      const composedStore = await requestBodyComposer(data, { isNew: true });
      await runTransaction(firebaseClient, async (transaction) => {
        const [storeSnapshot, tenantSnapshot] = await Promise.all([
          transaction.get(storeRef),
          transaction.get(tenantRef),
        ]);
        if (storeSnapshot.exists()) throw new Error("store_create_id_conflict");
        if (!tenantSnapshot.exists()) throw new Error("store_create_tenant_missing");
        if (String(tenantSnapshot.data()?.tenantId) !== String(tenantId)) {
          throw new Error("store_create_tenant_scope_mismatch");
        }
        transaction.set(storeRef, composedStore);
        transaction.set(summaryRef, {
          stores: { [String(storeId)]: buildStoreSummaryEntry(buildSummaryDataFromStore(data)) },
        }, { merge: true });
        transaction.update(tenantRef, {
          storesList: upsertTenantStoreListEntry(tenantSnapshot.data()?.storesList, data),
        });
      });
      await revalidatePublicClientCache(data.storeId, "addStore");
      return { ...data };
    },
    data,
    "addStore",
  );
};
```

### `updateStore(data)`

**Location:** `src/database/stores/index.tsx:146-178`

```typescript
export const updateStore = async (data: any) => {
  return await apiCallComposer(
    async () => {
      data.id = data.storeId;

      // Upload new logo if provided
      if (data.imageToUpdate) {
        data.logo = await updateLogoImage(data);
      }

      // Summary-relevant paths read current scope and write canonical store,
      // summary, and affected tenant list identity together.
      await runTransaction(firebaseClient, async (transaction) => {
        const [storeSnapshot, tenantSnapshot] = await Promise.all([
          transaction.get(storeRef),
          transaction.get(tenantRef),
        ]);
        // Fail closed on collision/missing or mismatched tenant.
        transaction.set(storeRef, composedStore);
        transaction.set(summaryRef, summaryPayload, { merge: true });
        transaction.update(tenantRef, { storesList: nextStoresList });
      });

      return data;
    },
    data,
    "updateStore",
  );
};
```

### Tenant `storesList` identity mirror

There is no active whole-list browser replacement helper. `addStore()` and summary-relevant `updateStore()` re-read the tenant in their transaction and upsert/deduplicate the affected store entry. This prevents a stale Business Settings snapshot from erasing concurrent outlet create, rename, policy, or deactivation changes.

### Tenant Details Modal Write Acknowledgement

**Location:** `src/components/templates/platform/tenants/tenantDetailsModal.tsx`

Tenant create/update actions must await `addTenant()` or `updateTenant()` and call `assertTenantUpdateSucceeded()` before closing the drawer. Rejected acknowledgements use `platform_tenant_create_rejected` or `platform_tenant_update_rejected`, log `platform_tenant_save_failed`, and keep the drawer open.

This does not add Firestore operations. It only prevents local UI success after `apiCallComposer()` returns a fallback value for a failed tenant write.

---

## Firestore Schema

### `stores/{storeId}`

```typescript
{
    // Identity
    storeId: number,           // Sequential ID
    tenantId: number,          // Parent tenant
    storeKey: string,          // URL-safe slug
    name: string,              // Display name

    // Basic Info
    businessType: string,      // "restaurant", "retail", etc.
    businessCategory: string,  // Derived from businessType
    description: string,
    tags: string[],
    logo: string,              // Firebase Storage URL

    // Location
    addressLine: string,
    area: string,
    city: string,
    state: string,
    country: string,
    postalCode: string,
    latitude: number,
    longitude: number,

    // Locale
    timeZone: string,
    currencyCode: string,      // Default: "INR"
    currencySymbol: string,    // Default: "₹"
    dateFormat: string,
    timeFormat: string,

    // Contact
    email: string,
    phoneNumber: string,
    contactPerson: {
        name: string,
        phone: string,
        email: string
    },

    // Operating Hours
    workingHours: {
        mon: "09:00-18:00" | null,
        tue: "09:00-18:00" | null,
        // ... etc
    },
    timeSlotPresets: TimeSlotPreset[],

    // Social & SEO
    socialMedia: {
        facebook: string,
        instagram: string,
        // ... etc
    },
    seoTitle: string,
    seoDescription: string,
    seoKeywords: string[],

    // Analytics
    googleAnalyticsId: string,

    // Status Flags
    active: boolean,           // Default: true
    verified: boolean,         // Default: false
    bloked: boolean,           // Default: false (typo in schema)
    deleted: boolean,          // Default: false

    // Roles (✅ Auto-populated by createDefaultRoles() in addStore())
    roles: StoreRoleDataType[],  // Owner, Manager, Staff (+ custom)
    // rolesPermissionStrategy removed (single role per store, no strategy needed)

    // Metadata
    createdOn: Timestamp,
    modifiedOn: Timestamp,
    createdBy: string,
    modifiedBy: string
}
```

### `tenants/{tenantId}`

```typescript
{
    tenantId: number,
    name: string,
    storesList: [
        { storeId: number, name: string },
        // ...
    ],
    // ... other tenant fields
}
```

### `platformSummary/storesSummary`

```typescript
{
    stores: {
        [storeId: string]: {
            tId: number,
            businessType: string,
            businessCategory: string,
            active: boolean,
            name: string,
            activePlanType?: string // Denormalized billing plan id for scheduler entitlements
        }
    }
}
```

---

## UI Component Flow

### BusinessSettings Component

**Location:** `src/components/templates/main-app/businessSettings/index.tsx`

```typescript
// Determines create vs update mode
const isUpdateMode = Boolean(storeDetails?.storeId) ||
                     storeDetails?.storeId == ECOMSAI_PLATFORM_STORE_ID;

// Form submission handler
const addUpdateDetails = async (changesToUpload) => {
    if (isUpdateMode) {
        // UPDATE FLOW
        const updatedChanges = getObjectDifferance(changesToUpload, storeDetails);
        if (Object.keys(updatedChanges).length > 0) {
            await updateStore(updatedChanges);
            // Update tenant if name changed
        }
    } else {
        // CREATE FLOW
        changesToUpload.tenantId = tenantDetails.tenantId;

        await addStore(changesToUpload);
    }
};
```

### Tab Sections

| Tab          | Component            | Key Fields                            |
| ------------ | -------------------- | ------------------------------------- |
| Basic        | `BasicInfoTab`       | name, businessType, description, tags |
| Location     | `LocationInfoTab`    | address fields, coordinates           |
| Locale       | `LocaleSettingsTab`  | timezone, currency, dateFormat        |
| Contact      | `ContactPersonTab`   | contact person details                |
| Hours        | `WorkingHoursTab`    | Mon-Sun time ranges                   |
| Time Slots   | `TimeSlotPresetsTab` | Custom time slot presets; edit/delete cascades assigned category windows |
| Social       | `SocialMediaTab`     | Social media URLs                     |
| SEO          | `SeoTab`             | Meta title, description, keywords     |
| Analytics    | `AnalyticsTab`       | Google Analytics ID                   |
| Integrations | `IntegrationsTab`    | Google My Business                    |

### Public Cache and Domain Writes

Store fields that affect public menu, OBP, metadata, PWA, domain routing, or owner-assistant context must invalidate public truth cache tags:

- `menu-store-{storeId}`
- `store-{storeId}`
- `client-stores`

`updateStore()` handles desktop and mobile owner settings through `revalidatePublicClientCache()`. Custom-domain add, verification, and removal are API-owned writes in `src/app/api/domain/route.ts`; the desktop and mobile domain screens update local UI state after the API succeeds and must not call `updateStore()` for the same domain fields.

### Time-Slot Preset Cascades

Categories store `presetId` plus copied `startTime` / `endTime` values so public menu rendering does not need an extra store read to evaluate category visibility. Therefore:

- Creating a preset writes only `stores/{storeId}.timeSlotPresets`.
- Editing a preset writes `stores/{storeId}.timeSlotPresets`, then `updatePresetInAllCategories()` updates only current-store project docs that reference the preset and revalidates their public cache.
- Deleting a preset writes `stores/{storeId}.timeSlotPresets`, then `removePresetFromAllCategories()` removes matching category windows from changed projects and revalidates their public cache.
- Edit/delete cascades must require `assertProjectPresetCascadeSucceeded()` before local preset state or success copy changes. Rejected acknowledgements use desktop `business_settings_time_slot_preset_cascade_*_rejected` or mobile `mobile_time_slot_preset_cascade_*_rejected` codes and route through the existing bounded save/delete failure handlers.
- Failed desktop preset save/delete actions use `src/components/templates/main-app/businessSettings/utils/businessSettingsDiagnostics.ts` with `business_settings_time_slot_preset_save_failed` and `business_settings_time_slot_preset_delete_failed`. Diagnostics record only bounded tenant/store/preset/label/time presence and length metadata plus source error metadata; raw preset labels, store IDs, tenant IDs, preset IDs, category/project payloads, and provider/browser exceptions must not be direct-console logged.

---

## Local State Management

### StoresDashboard State

```typescript
const [storesList, setStoresList] = useState<StoreDataType[]>([]);
const [storeModal, setStoreModal] = useState<{
  active: boolean;
  data: StoreDataType | null;
  tenantData: any | null;
}>({ active: false, data: null, tenantData: null });
const [filterTenant, setFilterTenant] = useState<number | null>(null);
```

### onCloseStoreModal - Optimistic Update

```typescript
const onCloseStoreModal = (updatedStore: StoreDataType) => {
  if (Boolean(updatedStore?.name)) {
    // Update tenantsList (local state)
    const tenantsCopy = removeObjRef(tenantsList);
    // ... find and update tenant's storesList
    setTenantsList(tenantsCopy);

    // Update storesList (local state)
    const storesCopy = removeObjRef(storesList);
    // ... find and update or push store
    setStoresList(storesCopy);
  }
  setStoreModal({ active: false, data: null, tenantData: null });
};
```

---

## Logo Upload Flow

```typescript
// 1. User selects file via ImageUploadInput
// 2. File converted to base64 in selectedFile state
// 3. On form submit, base64 is passed as imageToUpdate

const updateLogoImage = async (data) => {
  if (data.imageToUpdate?.includes("base64")) {
    const logoUrl = await uploadBase64ToStorage({
      fileId: data.storeId,
      url: data.imageToUpdate,
      path: `stores/logos/${data.storeId}`,
      type: data.imageType,
    });
    return logoUrl;
  }
  return "";
};
```

---

## Known Issues & Tech Debt

### 1. Default Roles on Manual Creation ✅ RESOLVED (Feb 2026)

**Previously:** When creating stores via admin panel, `roles: []` was empty.

**Resolution:** `addStore()` now calls `createDefaultRoles()` automatically when `from !== "onboarding"`. Three default roles (Owner, Manager, Staff) with 23 permission flags each are created as part of the store document. `rolesPermissionStrategy` was removed (single role per store, no strategy needed).

**File:** `src/database/stores/index.tsx` (lines 121-126)

**See:** [Roles & Permissions](../roles-permissions/) for full role model details.

### 2. Typo in Schema: `bloked`

**Issue:** Field is `bloked` instead of `blocked`.

**Impact:** Inconsistent querying.

**Fix:** Migration to rename field across all documents.

### 3. Missing Validation

**Issue:** No Zod schema validation on store creation/update.

**Recommendation:** Add validation similar to API routes.

---

## Testing Checklist

| Test Case                        | Expected Result                      |
| -------------------------------- | ------------------------------------ |
| Create store with all fields     | Store saved, appears in list         |
| Create store with minimum fields | Store saved with defaults            |
| Update store name                | Store and tenant.storesList updated  |
| Upload logo                      | Image uploaded to Storage, URL saved |
| Filter stores by tenant          | Only tenant's stores shown           |
| Open store from tenant modal     | Correct store data loaded            |
| Working hours with gaps          | Null stored for closed days          |

---

## Related Documentation

- [Auth & Onboarding](../auth-onboarding/) - Automatic store creation during signup
- [Roles & Permissions](../roles-permissions/) - Role assignment, `canManageOutlets`/`canSwitchStores` permissions
- [Summary Document Pattern](../patterns/summary-document-pattern.md) - storesSummary optimization
- [Multi-Outlet Store Onboarding](../multi-outlet-consistency/store-onboarding/) - Outlet creation flow (Feature #4C): billing-first orchestration, atomic lock, project propagation. API routes: `POST /api/outlets/create`, `POST /api/outlets/deactivate`, `POST /api/auth/switch-store`
- [Multi-Chain Permissions](../multi-chain-permissions/) - `OutletPolicy` enforcement via `applyOutletPolicy()`
