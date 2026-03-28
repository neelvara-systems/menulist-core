# Stores Management — Technical Implementation

> **Audience:** Developers  
> **Last Updated:** February 13, 2026  
> **Version:** 1.1

---

## Architecture Overview

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
│  │ stores  │  │ tenants │  │ platformSummary/default │                      │
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
| `src/database/tenants/index.tsx`        | Tenant operations, storesList updates  |
| `src/database/platformSummary/index.ts` | Counter management, store summary sync |

### Types

| File                           | Key Types                                                 |
| ------------------------------ | --------------------------------------------------------- |
| `src/types/platform/store.ts`  | `StoreDataType`, `MinimalStoreDataType`, `TimeSlotPreset` |
| `src/types/platform/tenant.ts` | `TenantDataType`                                          |

---

## Database Operations

### Create Store Flow

```typescript
// 1. Get next store ID
const summary = await getPlatformSummary();
const newId = summary.stores?.count + 1;

// 2. Prepare store data
const storeData = {
  storeId: newId,
  tenantId: tenantDetails.tenantId,
  storeKey: name.toLowerCase().replaceAll(" ", "_"),
  email: tenantDetails.email,
  phoneNumber: tenantDetails.phoneNumber,
  tenantName: tenantDetails.name,
  // ... other fields
};

// 3. Add store to stores collection
await addStore(storeData);
// Internally:
//   - Uploads logo if base64 provided
//   - Assigns default timeSlotPresets based on businessType
//   - Writes to stores/{storeId}
//   - Updates platformSummary/default (stores.count++)
//   - Syncs to platformSummary/storesSummary

// 4. Update tenant's storesList
await updateTenantsStoreslist({
  tenantId: tenantDetails.tenantId,
  storesList: [
    ...tenantDetails.storesList,
    { storeId: newId, name: storeName },
  ],
});
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

  // 4. Call updateStore
  await updateStore(updatedChanges);
  // Internally:
  //   - Uploads new logo if base64 provided
  //   - Updates stores/{storeId}
  //   - Syncs to platformSummary/storesSummary

  // 5. Update tenant if name changed
  if ("name" in updatedChanges) {
    await updateTenantsStoreslist({
      tenantId: tenantDetails.tenantId,
      storesList: updatedStoresList,
    });
  }
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
      data.id = data.storeId;

      // Upload logo if provided
      if (data.imageToUpdate) {
        data.logo = await updateLogoImage(data);
      }

      // Assign default time slot presets
      if (!data.timeSlotPresets && data.businessType) {
        data.timeSlotPresets = getDefaultTimeSlotPresets(
          data.businessType,
          data.tenantId,
          data.storeId,
        );
      }

      // Write to Firestore
      await setDoc(getDocRef(data.id), await requestBodyComposer(data));

      // Update platform counters (skip during onboarding)
      if (from != "onboarding") {
        await updateStoresCountInPlatformSummary();
      }

      // Sync to storesSummary for Cloud Functions
      await syncStoreToSummary(data.storeId, {
        tId: data.tenantId,
        businessType: data.businessType || "unknown",
        businessCategory,
        active: true,
        name: data.name || "",
      });

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

      // Update Firestore
      await updateDoc(getDocRef(data.id), await requestBodyComposer(data));

      // Sync to storesSummary
      await syncStoreToSummary(data.storeId, {
        tId: data.tenantId,
        businessType: data.businessType || "unknown",
        businessCategory,
        active: data.active ?? true,
        name: data.name || "",
      });

      return data;
    },
    data,
    "updateStore",
  );
};
```

### `updateTenantsStoreslist(data)`

**Location:** `src/database/tenants/index.tsx`

Updates the `storesList` array in tenant document when store is added or name changes.

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
            name: string
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
        const summary = await getPlatformSummary();
        const newId = summary.stores?.count + 1;
        changesToUpload.storeId = newId;
        changesToUpload.tenantId = tenantDetails.tenantId;

        await addStore(changesToUpload);
        await updateTenantsStoreslist({...});
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
| Time Slots   | `TimeSlotPresetsTab` | Custom time slot presets              |
| Social       | `SocialMediaTab`     | Social media URLs                     |
| SEO          | `SeoTab`             | Meta title, description, keywords     |
| Analytics    | `AnalyticsTab`       | Google Analytics ID                   |
| Integrations | `IntegrationsTab`    | Google My Business                    |

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
