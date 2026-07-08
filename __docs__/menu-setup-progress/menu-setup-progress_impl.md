# Menu Setup Progress — Implementation Plan

## 1. Architecture

Menu Setup Progress is a pure read + compute feature.

```
storeDetails + project + quality signals + starter activation
  -> buildMenuSetupProgress()
  -> desktop card + mobile card
```

## 2. Shared Helper

File:

`src/lib/menuSetupProgress/buildMenuSetupProgress.ts`

Responsibilities:

- Count active items from existing project files.
- Compute critical Menu Check blockers using existing `computeQualitySignals()`.
- Read publish readiness from project `lastPublishedAt`.
- Read placement readiness from existing `buildStarterActivationSummary()`.
- Read optional translation readiness from existing Menu Check language signals.
- Read optional OBP polish from `socialMedia` and `publicPresence`.
- Return a stable `MenuSetupProgressSummary`.

## 3. Desktop

File:

`src/components/templates/main-app/dashboard/MenuSetupProgress.tsx`

Mount:

`src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx`

Dashboard loads the selected project once and passes the same project data to Menu Setup Progress and Menu Check. This prevents two dashboard project reads for adjacent setup/status cards.

## 4. Mobile

File:

`src/components/mobile/components/MenuSetupProgress.tsx`

Mounts:

- `MobileMenuScreen`: before Menu Check, using already-loaded selected project data.
- `MobileShareScreen`: after project selector/link cards begin, using selected project data already available from `MobileProjectsProvider`.
- `MobileMoreScreen`: conditional shortcut in the existing Modules section while setup is incomplete. It does not create a new group or screen.

Mobile actions are simple callbacks into existing shell screens:

- Open menu/project work: existing Menu tab/screen
- Open placement/sharing work: existing Share screen
- Open optional public-page work: existing More > Official Page screen

## 5. Routing

No new route is created.

Desktop action routes:

- Source/menu/check/publish: `/projects`
- Placement: `/use-menulist`
- OBP public links/photos: `/business-settings?section=business-profile&focus=official-page-actions` or `official-page-photos`

Mobile action callbacks stay inside the existing MobileShell screen system.
The More shortcut uses `MobileProjectsProvider` selected-project data and `MobileShell` callbacks; it must not add a standalone route or direct desktop-route bypass.

## 6. Feature Flag

Add:

`ENABLE_MENU_SETUP_PROGRESS`

Location:

`src/config/features.ts`

## 7. Verification

Add:

`npm run verify:menu-setup-progress-boundary`

The verifier checks:

- feature flag exists
- docs exist
- pure helper exists
- desktop/mobile components exist
- More shortcut uses shell navigation and provider data
- dashboard shares project data with Menu Check
- no API route, Firestore collection, or Cloud Function is introduced for this feature

---

**Created:** July 7, 2026
