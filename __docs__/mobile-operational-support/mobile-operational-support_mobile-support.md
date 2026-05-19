# Mobile Operational Support — Mobile Support

**Created:** February 15, 2026  
**Last Updated:** April 5, 2026 (v3 — current navigation contract)  
**Status:** ✅ PWA END-TO-END — Full mobile-only operation supported  
**Feature Flag:** `ENABLE_MOBILE_UI`

---

## Feature Admission Test Results

| Gate          | Result  | Reasoning                                                                |
| ------------- | ------- | ------------------------------------------------------------------------ |
| **Frequency** | ✅ PASS | Menu availability, hours, feedback — multiple times daily during service |
| **Speed**     | ✅ PASS | All actions complete in <2 seconds (optimistic updates)                  |
| **Touch**     | ✅ PASS | All targets 44px+, thumb-friendly, no precision needed                   |
| **Value**     | ✅ PASS | Owner is ON the floor during service hours — needs phone-based control   |

**Decision:** ✅ FULL MOBILE SUPPORT — This IS the mobile feature.

---

## Mobile Screens Implemented

| Screen                         | Tab                 | DAL Functions Used                                                                | Desktop Counterpart                    |
| ------------------------------ | ------------------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| `MobileTodayScreen`            | Today               | `getTodayCampaigns`, `completeCampaign`, `skipCampaign`                           | `TodayScreen`                          |
| `MobileMenuScreen`             | Menu                | `getProjectsList`, `getProjectData`, `updateProject`                              | `ProjectsPage`                         |
| `MenuUploadSheet`              | Menu (sheet)        | `addProject`, `uploadFile`, `createMenuProcessingJob`                             | Upload flow in `ProjectsPage`          |
| `MobileShareScreen`            | Share               | `getProjectsList`, `generateProjectUrl`, `generateOBPUrl`, `getScreenState`       | `UseMenuList`                          |
| `MobileFeedbackDetail`         | (sub)               | `updateFeedbackStatus`                                                            | `FeedbackCard`                         |
| `MobileMoreScreen`             | More                | `signOutSession`                                                                  | `ProfileActionsModal`                  |
| `MobileFeedbackScreen`         | More > Feedback     | `getFeedbackList`, `getFeedbackCount`                                             | `FeedbackInbox`                        |
| `MobilePublicInfoScreen`       | More > Public Info  | `updateStore`                                                                     | `BusinessSettings > LocationInfoTab`   |
| `MobileBillingScreen`          | More > Billing      | `usePaymentHandler`, `getActiveSubscriptionForStore`, `getBillingHistoryForStore` | `BillingPage`                          |
| `MobileBasicSettingsScreen`    | More > Basic        | `updateStore`, `BUSINESS_TYPES`                                                   | `BusinessSettings > BasicInfoTab`      |
| `MobileLocaleSettingsScreen`   | More > Locale       | (read-only display)                                                               | `BusinessSettings > LocaleSettingsTab` |
| `MobileWorkingHoursEditScreen` | More > Hours Edit   | `updateStore`                                                                     | `BusinessSettings > WorkingHoursTab`   |
| `MobileRolesScreen`            | More > Roles        | `updateStore` (roles array)                                                       | `UserPermissionsPage`                  |
| `MobileDigitalScreensScreen`   | More > Screens      | `getScreenState`, `initializeScreenState`, `updateScreenSettings`                 | `DigitalScreenSettings`                |
| `MobileLocationsScreen`        | More > Locations    | `updateOutletPolicy`, `/api/outlets/create`, `/api/auth/switch-store`             | `LocationsPage`                        |
| `MobileDashboardScreen`        | More > Dashboard    | `useOwnerDashboard`, `getProjectsList`                                            | `OwnerDashboard`                       |
| `MobileUsersScreen`            | More > Staff        | `addPlatformUser`, `updatePlatformUser`                                           | `UsersListPage`                        |
| `MobileTransactionsScreen`     | More > Transactions | `getPaginatedAiOperations`                                                        | `TransactionPage`                      |
| `MobileHelpScreen`             | More > Help         | (external links + FAQ)                                                            | `HelpCenter`                           |
| `MobileAdvancedSettingsScreen` | More > Advanced     | `updateStore` (contact, social, feedback)                                         | `BusinessSettings` (3 tabs)            |
| `BulkActionsSheet`             | Menu (sheet)        | `getProjectData`, `updateProject`                                                 | `CommandCenterModal`                   |
| `MobileDesignEditorScreen`     | More > Design       | `getProjectData`, `publishProject`                                                | `B2CView` (sidebar + preview)          |
| `ColorPickerSheet`             | Design (sheet)      | (local state → parent)                                                            | `BrandColorPicker`                     |
| `MobileSeoAnalyticsScreen`     | More > SEO          | `updateStore` (tagline, meta, analytics)                                          | `SeoTab` + `AnalyticsTab`              |
| `MobileTimeSlotsScreen`        | More > Time Slots   | `updateTimeSlotPresets`, `removePresetFromAllCategories`, `generatePresetId`      | `TimeSlotPresetsTab`                   |
| `MobileOfficialPageScreen`     | More > Official     | `updateStore`, `uploadOBPPhoto`                                                   | `OfficialPageTab`                      |
| `MobileBusinessAttributesScreen` | More > Attributes | `updateStore`                                                                     | `BusinessAttributesTab`                |
| `MobileDomainSettingsScreen`   | More > Domain       | `updateStore`, `/api/domain`, `/api/subdomain/check`                              | `DomainSettingsTab`                    |
| `MobileIntegrationsScreen`     | More > Integrations | read-only store GBP state                                                         | `IntegrationsTab`                      |
| `MobilePosSyncScreen`          | More > POS Sync     | `updateStore`, `/api/pos-sync/test`                                               | `PosSyncTab`                           |

---

## Shell Architecture

```
AntdLayoutWrapper (src/components/antdComponent/layoutWrapper/index.tsx)
  └─ if isMobile && ENABLE_MOBILE_UI && !forceDesktop → MobileShell
     ├─ MobileNavigation (TabBar: Today, Menu, Share, More)
     ├─ MobileTodayScreen
     ├─ MobileMenuScreen
     ├─ MobileShareScreen
     └─ MobileMoreScreen
         ├─ MobileFeedbackScreen
         ├─ MobilePublicInfoScreen
         ├─ MobileBillingScreen
         ├─ MobileBasicSettingsScreen
         ├─ MobileLocaleSettingsScreen
         ├─ MobileWorkingHoursEditScreen
         ├─ MobileRolesScreen
         ├─ MobileDigitalScreensScreen
         ├─ MobileLocationsScreen
         ├─ MobileDashboardScreen
         ├─ MobileUsersScreen
         ├─ MobileTransactionsScreen
         ├─ MobileHelpScreen
         ├─ MobileAdvancedSettingsScreen
         ├─ MobileDesignEditorScreen
         │   └─ ColorPickerSheet (bottom sheet)
         ├─ MobileSeoAnalyticsScreen
         ├─ MobileTimeSlotsScreen
         ├─ MobileOfficialPageScreen
         ├─ MobileBusinessAttributesScreen
         ├─ MobileDomainSettingsScreen
         ├─ MobileIntegrationsScreen
         └─ MobilePosSyncScreen
     MobileMenuScreen
         └─ BulkActionsSheet (bottom sheet)
```

---

## Key Files

| Purpose          | Path                                                   |
| ---------------- | ------------------------------------------------------ |
| Mobile shell     | `src/components/mobile/MobileShell.tsx`                |
| Navigation       | `src/components/mobile/MobileNavigation.tsx`           |
| All screens      | `src/components/mobile/screens/*.tsx`                  |
| Bottom sheets    | `src/components/mobile/sheets/*.tsx`                   |
| Menu upload      | `src/components/mobile/sheets/MenuUploadSheet.tsx`     |
| Roles & perms    | `src/components/mobile/screens/MobileRolesScreen.tsx`  |
| Mobile types     | `src/components/mobile/types.ts`                       |
| Feature flag     | `src/config/features.ts` → `ENABLE_MOBILE_UI`          |
| Device detection | `src/hooks/useDeviceType.ts`                           |
| Layout switch    | `src/components/antdComponent/layoutWrapper/index.tsx` |

---

## Shared Infrastructure (Inherited from Desktop)

- **Auth:** NextAuth session — same `getActiveSession()` in all DAL functions
- **Localization:** `next-intl` — same locale, RTL, timezone from store settings
- **State:** Redux Toolkit — same `AppSettings`, theme, language preferences
- **Data:** Same Firestore DAL functions (`@database/*`) — zero separate mobile DAL
- **Icons:** `react-icons/lu` (Lucide) only — consistent with desktop

## Shared Logic Layer (Desktop ↔ Mobile Code Reuse)

**Principle:** Share business logic, constants, hooks, and types. NEVER share UI components (`antd` ≠ `antd-mobile`).

| Shared File                               | What it contains                                             | Used by (Desktop)                   | Used by (Mobile)        |
| ----------------------------------------- | ------------------------------------------------------------ | ----------------------------------- | ----------------------- |
| `src/config/outletPolicy.ts`              | `OUTLET_POLICY_CATEGORIES` — 15 policy toggle groupings      | `OutletPolicyEditor`                | `MobileLocationsScreen` |
| `src/utils/campaignUtils.ts`              | `getMealName()`, `getExportMethod()`, `getShortButtonText()` | `PrimaryCard`, `OperationalSection` | `MobileTodayScreen`     |
| `src/hooks/useTodayCampaigns.ts`          | SWR hook for today's campaigns (pure DAL, no UI deps)        | `TodayScreen`                       | `MobileTodayScreen`     |
| `src/data/rolesPermissionsInitialData.ts` | `PERMISSION_CATEGORIES_CONFIG`, `PERMISSION_LABELS`          | `UserPermissionsPage`               | `MobileRolesScreen`     |
| `src/hooks/usePaymentHandler.ts`          | Razorpay payment flow (plan upgrade, topup, cancel)          | `BillingPage`                       | `MobileBillingScreen`   |
| `src/hooks/useOwnerDashboard.ts`          | SWR dashboard data (overview, WTD, MTD, daily, weekly)       | `OwnerDashboard`                    | `MobileDashboardScreen` |

**Rule:** If a hook uses `antd` (e.g. `notification`, `message`), it CANNOT be shared. Mobile must implement its own version using `antd-mobile` `Toast`. Example: `useCampaignActions` uses `antd` `notification` → stays desktop-only; mobile inlines its own complete/skip with `Toast`.

---

## Data Format Compatibility (Verified Feb 15, 2026)

All mobile screens write data in **identical format** to desktop:

| Data                 | Mobile Format                            | Desktop Format                   | Match |
| -------------------- | ---------------------------------------- | -------------------------------- | ----- |
| Working hours keys   | `sun`, `mon`, `tue`...                   | `sun`, `mon`, `tue`...           | ✅    |
| Working hours values | `HH:mm-HH:mm` (24h)                      | `HH:mm-HH:mm` (24h)              | ✅    |
| Feedback field names | `customerEmail`, `customerPhone`         | `customerEmail`, `customerPhone` | ✅    |
| Feedback status      | `'new'` \| `'resolved'`                  | `'new'` \| `'resolved'`          | ✅    |
| Business types       | `BUSINESS_TYPES` from `@constant/common` | Same constant                    | ✅    |
| Project ID field     | `projectId`                              | `projectId`                      | ✅    |
| Share URLs           | `generateProjectUrl()`                   | `generateProjectUrl()`           | ✅    |
| Store address field  | `addressLine`                            | `addressLine` (type)             | ✅    |

---

## PWA End-to-End Support Status

- **Service worker:** `next-pwa` v5.6.0 configured
- **Manifest:** `public/manifest.json` with proper icons, orientation, start_url, and owner shortcuts for Today, Menu, Share & QR, and Feedback
- **Offline banner:** Implemented in `MobileShell.tsx`
- **Desktop switch:** "Switch to Desktop" in More screen (sets `localStorage.forceDesktopMode`)
- **Return banner:** "Return to Mobile" shown when mobile user is in forced desktop mode
- **Subscription gate:** MobileShell checks `hasValidSubscriptionAccess` — no-sub users see upgrade prompt
- **Menu upload:** `MenuUploadSheet` enables camera/gallery → optimize → upload → AI extraction from mobile
- **Add item persistence:** `AddItemSheet` saves to Firestore via optimistic update + background sync
- **More badge:** `getFeedbackCount` unread count shown on More tab

---

## End-to-End PWA User Journey

| Step                   | Component                                                                           | Status |
| ---------------------- | ----------------------------------------------------------------------------------- | ------ |
| 1. Login               | `LoginPage` (mobile-responsive SCSS)                                                | ✅     |
| 2. Subscription check  | `MobileShell` → `hasValidSubscriptionAccess`                                        | ✅     |
| 3. First menu upload   | `MenuUploadSheet` (camera/gallery)                                                  | ✅     |
| 4. View/search menu    | `MobileMenuScreen`                                                                  | ✅     |
| 5. Toggle availability | `MobileMenuScreen` (Switch)                                                         | ✅     |
| 6. Edit item           | `ItemEditSheet`                                                                     | ✅     |
| 7. Add item            | `AddItemSheet` → Firestore persist                                                  | ✅     |
| 8. Working hours       | `MobileHoursScreen` / `MobileWorkingHoursEditScreen`                                | ✅     |
| 9. Share links/screens | `MobileShareScreen`                                                                 | ✅     |
| 10. View feedback      | `MobileFeedbackScreen` / `MobileFeedbackDetail`                                     | ✅     |
| 11. Business settings  | `MobileBasicSettingsScreen`, `MobileLocaleSettingsScreen`, `MobilePublicInfoScreen` | ✅     |
| 12. Billing            | `MobileBillingScreen` (redirects to desktop for plan changes)                       | ✅     |
| 13. Logout             | `MobileMoreScreen` (confirmation dialog)                                            | ✅     |
| 14. Delete item        | `ItemEditSheet` → confirmation → optimistic delete                                  | ✅     |
| 15. Manage staff roles | `MobileRolesScreen` → view/add/edit/delete roles + toggle permissions               | ✅     |

---

## B2C View — PWA Audit (Feb 16, 2026)

**Source:** `__docs__/projects/b2c-view/`  
**Route:** `src/app/(website)/menu/[projectId]/page.tsx`

The B2C View is the **customer-facing** digital menu page. It runs as a public Next.js page at `/{subdomain}.menulist.ai/{slug}` — it is **NOT** inside the owner MobileShell.

| Aspect                 | Status          | Notes                                          |
| ---------------------- | --------------- | ---------------------------------------------- |
| Mobile-responsive      | ✅ Already      | Spec: "Mobile-first: 70%+ mobile users"        |
| Customer access        | ✅              | Via QR code or share link                      |
| Owner preview          | ✅              | Owner taps share link from `MobileShareScreen` |
| Theme customization    | ❌ Desktop-only | Design work: fails Touch + Speed gates         |
| Publish design changes | ❌ Desktop-only | Tied to B2C UI Editor (view 3)                 |
| SEO (generateMetadata) | ✅ N/A          | Server-side, no mobile UI needed               |
| Schema.org JSON-LD     | ✅ N/A          | Server-side, no mobile UI needed               |

**Decision:** No MobileShell changes needed. B2C is a separate public page already optimized for mobile customers. Theme/design customization is a setup-phase task that fails the 4-gate test.

---

## Editor Features — 4-Gate PWA Audit (Feb 16, 2026)

**Source:** `__docs__/projects/editor/`  
**Desktop path:** `src/components/templates/main-app/projects/editorView/`

The desktop Editor has 3 view modes (Advanced, Traditional, Focus), 8+ modals, keyboard shortcuts, auto-save, and AI features. Below is the 4-gate test for each feature:

### Features that PASS 4-gate → Mobile implemented

| Feature                     | Freq       | Speed | Touch | Value    | Mobile Component               |
| --------------------------- | ---------- | ----- | ----- | -------- | ------------------------------ |
| View/search items           | Daily      | <1s   | ✅    | On floor | `MobileMenuScreen` (SearchBar) |
| Toggle availability         | Daily      | <1s   | ✅    | On floor | `MobileMenuScreen` (Switch)    |
| Edit item (name/price/desc) | Daily      | <2s   | ✅    | On floor | `ItemEditSheet`                |
| Add new item                | Occasional | <2s   | ✅    | On floor | `AddItemSheet` → Firestore     |
| **Delete item**             | Occasional | <1s   | ✅    | On floor | `ItemEditSheet` (onDelete)     |
| Upload menu photo           | First use  | <5s   | ✅    | Away     | `MenuUploadSheet`              |

### Features that FAIL 4-gate → Desktop-only

| Feature                                   | Fails Gate         | Reasoning                                   |
| ----------------------------------------- | ------------------ | ------------------------------------------- |
| Advanced View (side-by-side image+editor) | Touch, Speed       | Requires precision, split panels            |
| Traditional View (2-column categories)    | Touch              | Multi-panel precision layout                |
| Focus View (file tabs)                    | Touch              | Multi-tab navigation                        |
| Keyboard shortcuts                        | Touch              | Desktop-only input method                   |
| Image zoom/preview                        | Touch              | Pinch/zoom precision                        |
| Batch status toggle (Ctrl+B)              | Frequency          | Rare bulk operation                         |
| Reorder items/categories (Ctrl+R)         | Touch              | Drag-and-drop precision                     |
| AI description generation (Ctrl+G)        | Frequency, Speed   | Setup/polish phase                          |
| AI image generation                       | Frequency, Speed   | Setup/polish phase                          |
| Language management (Ctrl+L)              | Frequency          | One-time setup                              |
| Per-item image upload (Ctrl+U)            | Frequency          | Setup/polish phase                          |
| Add/edit/delete category                  | Frequency          | Rare structure changes                      |
| B2C theme customization                   | Touch, Speed, Freq | Design work at desk                         |
| Publish design changes                    | Frequency          | Tied to design customization                |
| Auto-save (debounced)                     | N/A                | Mobile uses per-action save pattern instead |

### Key insight: Data changes are LIVE immediately

The desktop editor's auto-save writes to Firestore via `updateProject()`. The B2C View reads directly from project data. The editor footer shows: _"Visible to customers now · Live"_.

This means mobile edits (toggle availability, edit price, add/delete item) are **immediately live** to customers — no separate "publish" step needed for DATA changes. The "Publish" button only exists for DESIGN changes (theme/layout) in the B2C UI Editor.

---

## Menu Editor Constitution — PWA Audit (Feb 16, 2026)

**Source:** `__docs__/projects/menu-editor/`

This folder contains **design specifications and UX constitution docs** — not feature implementations. These are rules for how the B2C output should look (readability, pricing transparency, navigation ergonomics, etc.).

**Decision:** No code changes needed. These are design principles that apply to the public B2C View, which is already mobile-responsive. The constitution guides desktop editor and B2C renderer — not the owner mobile shell.
