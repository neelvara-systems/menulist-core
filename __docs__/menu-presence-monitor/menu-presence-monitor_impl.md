# Menu Presence Monitor — Implementation Plan

> **Version:** 2.7 (focused boundary source gate)
> **Last Updated:** July 2, 2026
> **Audience:** Developers

---

## 1. Architecture Overview

Menu Presence Monitor is a **pure UI component** embedded in the Use MenuList page. It combines:

- **Auto-detected statuses** from existing data (screen token, Menu Kit download, feedback setting)
- **Manual confirmations** stored as a lightweight field on the store document
- **Starter activation telemetry** piggybacked on the same store document for unpaid public starter workspaces
- **Activation-proof summary** from `buildStarterActivationSummary()` so owners and SignalDesk can tell whether an action was MenuList-recorded or owner-confirmed

Zero new collections. Zero new API routes. Client-side DAL only.

Failed desktop copy/confirm/remove actions use `use_menulist_presence_official_link_copy_failed`, `use_menulist_presence_confirm_failed`, and `use_menulist_presence_remove_failed` through Use MenuList diagnostics. Failed mobile copy/confirm/remove actions use `mobile_presence_official_link_copy_failed`, `mobile_presence_confirm_failed`, and `mobile_presence_remove_failed` through mobile owner diagnostics. Official-link copied feedback must wait for Clipboard API or acknowledged textarea fallback success, and failed copy diagnostics may include clipboard/fallback support booleans. Business Settings' embedded Presence Monitor wrapper logs `business_settings_presence_screen_links_load_failed` through Business Settings diagnostics when local screen-link loading fails; embedded official-link copy remains owned by the shared Presence Monitor component. Context is limited to bounded store/tenant, project/link, surface ID/key, active-count, starter-signal, screen-link, domain-presence, clipboard/fallback support, and source error metadata. Do not log raw official business links, store names, surface labels, owner-entered values, or browser/Firestore exception text.

`updateMenuPresence()` returns a typed `MenuPresenceUpdateResult` with `success: true`, `storeId`, `surface`, and `confirmed`. Desktop and mobile callers must call `assertMenuPresenceUpdateSucceeded()` before changing local presence state, showing success copy, or closing/clearing the selected surface. If the DAL wrapper returns a fallback value after a failed write, the existing bounded confirm/remove failure handlers must run instead.

`updateMenuPresence()` and `recordStarterActivationSignal()` must call the active-session store guard before any store write. A passed store that does not match the active session must reject with `menu_presence_store_scope_mismatch` or `starter_activation_signal_store_scope_mismatch` before writing `menuPresence` or `starterActivationSignals`.

---

## 2. Data Model

### 2.1 Store Document Extension

Timestamp-only schema. Exists = confirmed, missing = not confirmed. Surface IDs are IMMUTABLE — never rename. Max 6 surfaces forever.

```typescript
// On StoreDataType (src/types/platform/store.ts)
menuPresence?: {
  googleBusiness?: string;   // ISO 8601 timestamp when owner confirmed
  instagramBio?: string;     // ISO 8601 timestamp when owner confirmed
  whatsappProfile?: string;  // ISO 8601 timestamp when owner confirmed
}

starterActivationSignals?: {
  actions?: Record<string, string>; // starter activation signal -> ISO 8601 timestamp
  lastSignalAt?: string;
}
```

`starterActivationSignals` is only written for stores in starter activation state. The signal contract lives in `src/lib/onboarding/starterActivation.ts`.

### 2.2 Activation Proof Helper

`src/lib/onboarding/starterActivation.ts` exports `buildStarterActivationSummary()`:

```typescript
{
  target: 2,
  signalCount: number,
  activated: boolean,
  systemRecordedCount: number,
  ownerConfirmedCount: number,
  recordedSignals: Array<{
    signal: StarterActivationSignal;
    label: string;
    evidenceType: "menulist_recorded" | "owner_confirmed_external";
    howKnown: string;
    recordedAt?: string;
  }>
}
```

This is the practical "how do we know it is done" contract:

| Evidence type | Meaning |
| --- | --- |
| `menulist_recorded` | MenuList observed the owner copying, sharing, downloading QR/Menu Kit, or using native share. |
| `owner_confirmed_external` | The owner confirmed the external platform placement in Presence Monitor. MenuList does not claim API-level verification. |

### 2.3 Auto-Detected Surfaces

| Surface         | Source                    | Detection Logic                                                     |
| --------------- | ------------------------- | ------------------------------------------------------------------- |
| Table QR        | Use MenuList data loader  | At least one non-deleted active project exists                      |
| Digital Screens | `data.hasScreen`          | Screen token exists in campaigns collection                         |
| Feedback QR     | `data.hasFeedbackEnabled` | Store `feedbackEnabled !== false`                                   |

### 2.4 Surface Status Type

```typescript
// src/components/templates/main-app/useMenuList/presenceTypes.ts
export type SurfaceStatus = "active" | "missing" | "not_applicable";

export interface PresenceSurface {
  id: string;
  label: string;
  status: SurfaceStatus;
  isAutoDetected: boolean;
  confirmedAt?: Date;
  copyAction?: string; // URL to copy when status is 'missing'
  guide?: string; // Short instruction text
}
```

---

## 3. File Structure

```
src/components/templates/main-app/useMenuList/
├── PresenceMonitor.tsx          # ~150 lines — Presence checklist card
├── presenceTypes.ts             # ~30 lines — Types
└── index.tsx                    # Modified — embed PresenceMonitor

src/components/mobile/components/
└── PresenceMonitor.tsx          # ~120 lines — Mobile version (antd-mobile)

src/types/platform/store.ts      # Modified — add menuPresence field
src/database/stores/index.ts     # Modified — add updateMenuPresence() + recordStarterActivationSignal()
src/lib/onboarding/starterActivation.ts # Modified — shared starter signal contract, 2-action target, and evidence summary
src/config/features.ts           # Modified — add ENABLE_MENU_PRESENCE_MONITOR
```

---

## 4. Implementation Phases

### Phase 1: Data Layer (~30 min)

1. Add `menuPresence` optional field to `StoreDataType` in `src/types/platform/store.ts`
2. Add `updateMenuPresence()` and `recordStarterActivationSignal()` functions to `src/database/stores/index.tsx`:
   ```typescript
   export const updateMenuPresence = async (
     storeId: number,
     surface: MenuPresenceSurface,
     confirmed: boolean,
     options?: { starterSignal?: StarterActivationSignal },
   ) => {
     return await apiCallComposer(
       async () => {
         const docRef = getDocRef(`${storeId}`);
         const now = new Date().toISOString();
         if (confirmed) {
           const updatePayload: Record<string, string> = {
             [`menuPresence.${surface}`]: now,
           };
           if (options?.starterSignal) {
             updatePayload[`starterActivationSignals.actions.${options.starterSignal}`] = now;
             updatePayload["starterActivationSignals.lastSignalAt"] = now;
           }
           await updateDoc(docRef, updatePayload);
         } else {
           await updateDoc(docRef, {
             [`menuPresence.${surface}`]: deleteField(),
           });
         }
         return { surface, confirmed };
       },
       { storeId, surface, confirmed, starterSignal: options?.starterSignal },
       "updateMenuPresence",
     );
   };
   ```
3. Add feature flag `ENABLE_MENU_PRESENCE_MONITOR: false` to `src/config/features.ts`

### Phase 2: Desktop UI (~1 hour)

1. Create `presenceTypes.ts` with `PresenceSurface` and `SurfaceStatus` types
2. Create `PresenceMonitor.tsx`:
   - Receives `UseMenuListData` + store's `menuPresence` field
   - Builds surface list: 3 auto-detected + 3 manual
   - Renders compact Card with rows: icon + label + status + action button
   - "I added it" button -> calls `updateMenuPresence(surface, true)` and asserts the typed acknowledgement before local success state
   - Remove button on confirmed rows -> calls `updateMenuPresence(surface, false)` and asserts the typed acknowledgement before local removal state
   - Progress indicator: "X ready/confirmed"
   - Activation proof panel: "X of 2 done" plus MenuList-recorded vs owner-confirmed counts
3. Embed in `useMenuList/index.tsx` between Quick Actions and Share section
4. Gate behind `FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR`
5. Copy actions append `entry_source=copy_link` through `withAnalyticsSource()` before writing to clipboard.

### Phase 3: Mobile UI (~45 min)

1. Create mobile `PresenceMonitor.tsx` using antd-mobile components
2. Same data/logic as desktop, different UI: antd-mobile `List` plus a bottom-sheet `Popup` with explicit copy/open/mark-as-added/remove buttons
3. Reach from Mobile More > Search & Discovery > Discovery Setup through `MobilePresenceMonitorScreen`
4. Show the same activation-proof summary using mobile translation keys

### Phase 4: Type Check + Polish (~15 min)

1. Run `npx tsc --noEmit` — zero errors
2. Verify feature flag gates work (OFF = component not rendered)
3. Run `npm run verify:menulist-activation-concierge`
4. Run `npm run verify:menu-presence-monitor-boundary` after changes to desktop/mobile Presence Monitor, Business Settings Search & Discovery wiring, Mobile More routing, `updateMenuPresence()`, `recordStarterActivationSignal()`, or starter activation proof.

---

## 5. Security

- **Auth:** Same as Use MenuList page — requires authenticated session
- **Tenant isolation:** `updateMenuPresence` uses `getActiveSession()` for tId/sId
- **No API route needed** — client-side DAL only (store document update)
- **Rate limiting:** Not needed — simple field update, not expensive

---

## 6. Testing Guide

1. Set `ENABLE_MENU_PRESENCE_MONITOR: true`
2. Open `/use-menulist` — see presence card
3. Auto-detected surfaces should show correct status
4. Click "I added it" on Google Business → status changes to ✓
5. Click ✕ on Google Business → status reverts to ⚠
6. Refresh page → confirmation persists
7. Set flag to `false` → card disappears
8. Confirm Activation proof distinguishes MenuList-recorded actions from owner-confirmed external placements

---

**Document Signature:** Technical Implementation Plan
**Created:** March 15, 2026
