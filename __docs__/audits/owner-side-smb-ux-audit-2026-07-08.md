# Owner-Side SMB UX Audit - July 8, 2026

## Audit Bar

This audit applies the owner-side rule from the July 8 design review:

> Minimum thinking, minimum fear, minimum time-to-correct-action.

The owner should always know what customers currently see, what needs attention, what will change after an action, and whether the business is represented correctly online. The audit focuses on owner dashboard, mobile owner shell, menu editing, hours/status controls, team roles, and public/private navigation boundaries.

## Scope And Limits

Code-inspected:

- Desktop Owner Dashboard and analytics placement.
- Mobile Dashboard, More, Menu, Hours, Roles, Design Editor, and item edit flows.
- Desktop Business Settings hours and temporary status access.
- Owner-facing confirmation copy for item deletion.

Not completed in this pass:

- Authenticated browser screenshot audit of owner-only screens.
- Production-host QA.
- Real-device mobile camera/upload QA.
- Firebase/Vercel deploy.

## Fixes Applied In This Pass

1. **Dashboard attention CTA now goes to the right fix.**
   The desktop dashboard now computes the first missing public-truth item and sends `Fix what needs attention` to Menu, Hours, or Public Listing instead of always opening Projects.
   Evidence: `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:177`, `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:384`.

2. **Special-hours quick action now deep-links to the correct card.**
   `Set special hours` now opens Business Settings > Hours with `focus=temp-status` instead of only opening the generic Hours section.
   Evidence: `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:398`.

3. **Desktop temporary status is now reachable from Business Settings.**
   The existing `TempStatusCard` is now mounted inside the Hours tab and is addressable by `focus=temp-status`.
   Evidence: `src/components/templates/main-app/businessSettings/index.tsx:101`, `src/components/templates/main-app/businessSettings/index.tsx:763`, `src/components/templates/main-app/businessSettings/index.tsx:884`.

4. **Item deletion now explains the customer consequence.**
   The mobile delete flow already uses a confirmation dialog; the locale copy now explains that customers will no longer see the item and that deletion cannot be undone.
   Evidence: `src/components/mobile/sheets/ItemEditSheet.tsx:1245`, `public/locales/menulist.ai/en-US.json:2075`.

## Current Passes

1. **Dashboard starts with public truth, not charts.**
   Desktop shows business live/not-live, menu freshness, hours status, public listing status, and common updates before analytics. Existing analytics remain below this status layer.
   Evidence: `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:354`, `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:394`, `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:420`.

2. **Mobile dashboard is task-first and thumb-friendly.**
   Mobile dashboard shows public-truth status, `Needs attention`, and 44px quick-action buttons for Menu, Hours, Today status, Photos, and Public link.
   Evidence: `src/components/mobile/screens/MobileDashboardScreen.tsx:338`, `src/components/mobile/screens/MobileDashboardScreen.tsx:370`, `src/components/mobile/screens/MobileDashboardScreen.tsx:395`.

3. **Public controls and account controls are separated on mobile.**
   More groups owner controls into `What customers see`, `Public links and materials`, `Account and team`, and `Advanced setup`.
   Evidence: `src/components/mobile/screens/MobileMoreScreen.tsx:739`, `src/components/mobile/screens/MobileMoreScreen.tsx:761`.

4. **Menu item editing uses preview and progressive disclosure.**
   The item sheet shows availability, show-on-menu, customer preview, then hides secondary controls under `More options`.
   Evidence: `src/components/mobile/sheets/ItemEditSheet.tsx:984`, `src/components/mobile/sheets/ItemEditSheet.tsx:1004`, `src/components/mobile/sheets/ItemEditSheet.tsx:1032`.

5. **Hours editing has risk-based friction.**
   Regular weekly-hours save shows a publish confirmation explaining what customers will see before the change is applied.
   Evidence: `src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx:140`.

6. **Today-hours edit has a customer preview.**
   The mobile Today hours sheet shows what customers will see before save.
   Evidence: `src/components/mobile/screens/MobileHoursScreen.tsx:884`.

7. **Search and batch repair exist for large menus.**
   Mobile Menu keeps a search query, filtered item list, and contextual bulk repair actions for filtered issues.
   Evidence: `src/components/mobile/screens/MobileMenuScreen.tsx:515`, `src/components/mobile/screens/MobileMenuScreen.tsx:2028`, `src/components/mobile/screens/MobileMenuScreen.tsx:3044`.

8. **Bulk menu changes have recovery.**
   Bulk menu updates can show an Undo action with a previous-project snapshot.
   Evidence: `src/components/mobile/screens/MobileMenuScreen.tsx:1170`.

9. **Team permissions are simpler and safer by default.**
   New custom roles start with no permissions; mobile copy keeps Owner/Manager/Staff as the normal model.
   Evidence: `src/data/rolesPermissionsInitialData.ts:12`, `src/components/mobile/screens/MobileRolesScreen.tsx:323`.

10. **Analytics are preserved but no longer the first mental model.**
    Desktop and mobile still render the existing analytics cards and tabs after the business-truth status and common-action layer.
    Evidence: `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:223`, `src/components/mobile/screens/MobileDashboardScreen.tsx:571`.

## Remaining Improvements

1. **Authenticated screenshot QA is still required.**
   This audit is code-backed. The Product Design audit standard still needs an authenticated owner session to capture desktop and mobile screenshots of Dashboard, More, Menu item edit, Hours, Temp Status, and Roles.

2. **Individual item edits need stronger recovery.**
   Bulk menu changes have Undo, but single item saves mostly rely on reset before save and local toasts after save. A future pass should add item-level recent activity/restore for public truth edits.

3. **Temporary status should add confirmation for high-impact states.**
   The temporary status card is now reachable, but setting `Closed Today` affects public truth. Add consequence confirmation for closing states while keeping low-risk notices fast.

4. **Hardcoded owner copy should move to locale files.**
   Several new owner-first labels are currently hardcoded in Dashboard, Mobile Dashboard, Mobile More hub text, Item Edit preview/options, Roles guidance, and Temp Status. They are plain-language enough, but localization coverage is incomplete.

5. **Activity history should become cross-surface, not menu-bulk-only.**
   The desired trust model is `what changed / who changed it / when / previous value / public state`. Existing recovery is partial. Menu, hours, public profile, photos, and staff changes should converge on one owner-readable activity model.

6. **Desktop/mobile visual density needs screenshot validation.**
   The code moves the hierarchy in the right direction, but real screenshots are still needed to catch text wrapping, button crowding, and mobile screen height issues.

## Decision

The current owner-side implementation now follows the requested direction enough to ship this hardening pass:

- Keep analytics as-is, but position them below business-truth status and common actions.
- Prefer task labels over data-model labels.
- Show live/missing/visible states near the top.
- Use preview and consequence copy for public-facing changes.
- Add friction only when the action affects public business truth or is destructive.

Do not add more owner settings for this audit. The next useful work is visual QA, item-level recovery/activity history, high-impact temporary-status confirmation, and localization cleanup.
