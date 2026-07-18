# Menu Presence Monitor — Implementation Plan

> **Version:** 2.9 (canonical publish evidence and stale-state hardening)
> **Last Updated:** July 16, 2026
> **Audience:** Developers

---

## 1. Architecture Overview

Menu Presence Monitor is a **pure UI component** embedded in the Use MenuList page. It combines:

- **Source-derived statuses** from existing data (valid publish acknowledgement, screen token, feedback setting)
- **Manual confirmations** stored as a lightweight field on the store document
- **Starter activation telemetry** piggybacked on the same store document for unpaid public starter workspaces
- **Activation-proof summary** from `buildStarterActivationSummary()` so owners and SignalDesk can tell whether an action was MenuList-recorded or owner-confirmed

Zero new collections. Zero new API routes. Client-side DAL only.

Failed desktop copy/confirm/remove actions use `use_menulist_presence_official_link_copy_failed`, `use_menulist_presence_confirm_failed`, and `use_menulist_presence_remove_failed` through Use MenuList diagnostics. Failed mobile copy/confirm/remove actions use `mobile_presence_official_link_copy_failed`, `mobile_presence_confirm_failed`, and `mobile_presence_remove_failed` through mobile owner diagnostics. Official-link copied feedback must wait for Clipboard API or acknowledged textarea fallback success, and failed copy diagnostics may include clipboard/fallback support booleans. Business Settings' embedded Presence Monitor wrapper logs `business_settings_presence_screen_links_load_failed` through Business Settings diagnostics when local screen-link loading fails; embedded official-link copy remains owned by the shared Presence Monitor component. Context is limited to bounded store/tenant, project/link, surface ID/key, active-count, starter-signal, screen-link, domain-presence, clipboard/fallback support, and source error metadata. Do not log raw official business links, store names, surface labels, owner-entered values, or browser/Firestore exception text.

`updateMenuPresence()` returns a typed `MenuPresenceUpdateResult` with `success: true`, `storeId`, `surface`, `confirmed`, `recordedAt`, and the canonical starter signal when that action was written/removed. Desktop and mobile callers must call `assertMenuPresenceUpdateSucceeded()` before changing local/global presence state, showing success copy, or closing/clearing the selected surface. If the DAL wrapper returns a fallback value after a failed write, the existing bounded confirm/remove failure handlers must run instead.

`updateMenuPresence()` and `recordStarterActivationSignal()` must call the active-session store guard before any store write. A passed store that does not match the active session must reject with `menu_presence_store_scope_mismatch` or `starter_activation_signal_store_scope_mismatch` before writing `menuPresence` or `starterActivationSignals`.

`recordStarterActivationSignal()` also requires a positive safe-integer store ID and `isStarterActivationSignal(signal)` before interpolating the signal into a Firestore dotted field path. Invalid runtime values reject with `starter_activation_signal_input_invalid`.

For presence confirmation/removal, the DAL also validates the surface, boolean action, optional backwards-compatible signal hint, numeric store/tenant scope, and freshly read store identity. The hint must match the immutable surface-to-signal map, while actual starter eligibility is derived from the transaction-current store. Confirm writes the matching starter action only when currently eligible; remove deletes the matching action. It transactionally updates the canonical store and current `storesSummary` slot, including the bounded tenant identity required by Firestore rules. Inactive, deleted, blocked, tenant-blocked, missing, or scope-changed stores reject. A rejected summary scope therefore rolls back both projections.

Presence confirmation is owner-private distribution evidence, not customer-facing menu/store output. The DAL intentionally does not call `revalidatePublicClientCache`; public cache invalidation remains on actual public store/project mutation paths.

`recordStarterActivationSignal()` returns a typed store/signal/timestamp acknowledgement. Desktop Use MenuList and Mobile Share assert it, then apply it to loaded store context only when the same store is still selected. Presence confirm/remove follows the same same-store projection rule. This keeps the banner/setup cards current without a refresh read.

Both presence components resynchronize local confirmation state when loaded `menuPresence` or store ID changes. Late acknowledgements may update global context only through the expected-store helper and may update local state only while that same store is still current. Invalid timestamp-like confirmation values do not render as confirmed.

### 1.1 Canonical automatic evidence

`src/lib/menuPresence/presenceReadiness.ts` is shared by desktop Use MenuList, Business Settings, Mobile Share, and Mobile Presence Monitor. An active/non-deleted project counts as published only when it has a non-empty `projectId` and a valid `lastPublishedAt`. Feedback readiness additionally requires `feedbackEnabled !== false`. Business Settings uses the already-loaded store `lastPublishedAt`; it does not add a project query.

The timestamp is now committed by every active publish path:

- standard `publishProject()` reads current project/store truth and atomically updates the full project, `platformSummary/projects_{sId}` entry, and store `lastPublishedAt`;
- linked-outlet publish folds project-summary `lastPublishedAt` into its existing bounded summary write and updates the already-read outlet store;
- public create-menu claim folds `lastPublishedAt` into its existing store, project, and project-summary writes without another document operation.

Desktop and mobile publish callers project the acknowledged timestamp into the currently selected loaded store only when store identity still matches. This makes Business Settings readiness current without a refresh read. Use MenuList loader dependencies are field-scoped, so a presence/starter-only context update does not repeat the projects/screen reads. The Business Settings screen-state effect follows the same stable-field rule.

---

## 2. Data Model

### 2.1 Store Document Extension

Timestamp-only schema. Exists = confirmed, missing = not confirmed. Surface IDs are IMMUTABLE — never rename. Five manual discovery placements are approved; desktop also derives three product-readiness surfaces and mobile derives two.

```typescript
// On StoreDataType (src/types/platform/store.ts)
menuPresence?: {
  googleBusiness?: string;   // ISO 8601 timestamp when owner confirmed
  appleBusiness?: string;    // ISO 8601 timestamp when owner confirmed
  bingPlaces?: string;       // ISO 8601 timestamp when owner confirmed
  instagramBio?: string;     // ISO 8601 timestamp when owner confirmed
  whatsappProfile?: string;  // ISO 8601 timestamp when owner confirmed
}

starterActivationSignals?: {
  actions?: Record<string, string>; // starter activation signal -> ISO 8601 timestamp
  lastSignalAt?: string;
}
```

Presence-derived `starterActivationSignals` is only written for transaction-current starter activation state. Direct product-action recording remains guarded by the caller's loaded starter state plus active-session store and signal allowlist. The signal contract and valid timestamp boundary live in `src/lib/onboarding/starterActivation.ts`.

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
| Table QR        | Existing project summary  | Active/non-deleted project with valid `lastPublishedAt`             |
| Digital Screens | `data.hasScreen`          | Screen token exists in campaigns collection                         |
| Feedback QR     | Project/store truth       | Valid published menu and store `feedbackEnabled !== false`          |

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
2. Add `updateMenuPresence()` and `recordStarterActivationSignal()` functions to `src/database/stores/index.tsx`. The current presence write contract is:
   ```typescript
   validateRuntimeInputAndActiveSessionScope();
   await runTransaction(firebaseClient, async (transaction) => {
     const store = await readAndVerifyCurrentStoreScope(transaction);
     transaction.update(store.ref, canonicalPresenceAndOptionalStarterSignalUpdate);
     transaction.set(storesSummaryRef, {
       stores: { [storeId]: { menuPresence: { [surface]: timestampOrNull }, tId: tenantId } },
     }, { merge: true });
   });
   // No public cache invalidation: menuPresence is owner-private evidence.
   ```
3. Keep the existing `ENABLE_MENU_PRESENCE_MONITOR` runtime flag as the single mount control; it is enabled in current source

### Phase 2: Desktop UI (~1 hour)

1. Create `presenceTypes.ts` with `PresenceSurface` and `SurfaceStatus` types
2. Create `PresenceMonitor.tsx`:
   - Receives `UseMenuListData` + store's `menuPresence` field
   - Builds surface list: 3 auto-detected + 5 manual
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
- **Tenant isolation:** `updateMenuPresence` validates active-session tId/sId, then rechecks the freshly read canonical store identity inside the transaction
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
9. Run `npm run test:stores-summary:rules` and confirm rejected forged-summary identity rolls back the canonical presence update
10. Verify an active never-published project is not shown as Table QR/Feedback ready; publish it and verify desktop/mobile readiness changes from the acknowledged timestamp

---

**Document Signature:** Technical Implementation Plan
**Created:** March 15, 2026
