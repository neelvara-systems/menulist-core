# Mobile Screens Specification

**Created:** February 14, 2026  
**Status:** 📋 SPEC COMPLETE — Ready for implementation  
**Author:** Lead Architect (Cascade)  
**Source:** ChatGPT Brainstorm + Codebase Analysis + Mobile UI Doctrine  
**Depends On:** `02-mobile-ui-doctrine.md`

---

## Screen Inventory (Updated April 5, 2026 — from codebase truth)

**35 files total:** 28 screens + 5 sheets + 2 shell/nav

### Tab Bar Screens (4)

| #   | Screen         | Tab      | File                       | Frequency          |
| --- | -------------- | -------- | -------------------------- | ------------------ |
| 1   | Today Screen   | Today    | `MobileHoursScreen.tsx`    | Daily              |
| 2   | Menu Screen    | Menu     | `MobileMenuScreen.tsx`     | Multiple times/day |
| 3   | Share Hub      | Share    | `MobileShareScreen.tsx`    | Daily              |
| 4   | More Hub       | More     | `MobileMoreScreen.tsx`     | As needed          |

### Bottom Sheets (5)

| #   | Sheet        | Parent        | File                   | Trigger           |
| --- | ------------ | ------------- | ---------------------- | ----------------- |
| 5   | Item Edit    | Menu          | `ItemEditSheet.tsx`    | Tap item row      |
| 6   | Add Item     | Menu          | `AddItemSheet.tsx`     | Floating + button |
| 7   | Menu Upload  | Menu          | `MenuUploadSheet.tsx`  | Camera icon       |
| 8   | Bulk Actions | Menu          | `BulkActionsSheet.tsx` | Filter icon       |
| 9   | Color Picker | Design Editor | `ColorPickerSheet.tsx` | Tap brand color   |

### Drill-In Screens from More (24)

| #   | Screen              | File                               | Desktop Equivalent          | Frequency |
| --- | ------------------- | ---------------------------------- | --------------------------- | --------- |
| 10  | Feedback Detail     | `MobileFeedbackDetail.tsx`         | Feedback detail modal       | Daily     |
| 11  | Public Info         | `MobilePublicInfoScreen.tsx`       | BusinessSettings > Location | Monthly   |
| 12  | Billing             | `MobileBillingScreen.tsx`          | BillingPage                 | Monthly   |
| 13  | Dashboard           | `MobileDashboardScreen.tsx`        | OwnerDashboard              | Weekly    |
| 14  | Staff               | `MobileUsersScreen.tsx`            | UsersListPage               | Monthly   |
| 15  | Transactions        | `MobileTransactionsScreen.tsx`     | TransactionPage             | Monthly   |
| 16  | Help Center         | `MobileHelpScreen.tsx`             | HelpCenter                  | As needed |
| 17  | Basic Settings      | `MobileBasicSettingsScreen.tsx`    | BusinessSettings > Basic    | Monthly   |
| 18  | Locale Settings     | `MobileLocaleSettingsScreen.tsx`   | BusinessSettings > Locale   | Rare      |
| 19  | Working Hours Edit  | `MobileWorkingHoursEditScreen.tsx` | BusinessSettings > Hours    | Weekly    |
| 20  | Roles & Permissions | `MobileRolesScreen.tsx`            | UserPermissionsPage         | Rare      |
| 21  | Digital Screens     | `MobileDigitalScreensScreen.tsx`   | DigitalScreenSettings       | Rare      |
| 22  | Locations           | `MobileLocationsScreen.tsx`        | LocationsPage               | Rare      |
| 23  | Advanced Settings   | `MobileAdvancedSettingsScreen.tsx` | BusinessSettings (3 tabs)   | Monthly   |
| 24  | Design Editor       | `MobileDesignEditorScreen.tsx`     | B2CView sidebar             | Monthly   |
| 25  | SEO & Analytics     | `MobileSeoAnalyticsScreen.tsx`     | SeoTab + AnalyticsTab       | Rare      |
| 26  | Time Slots          | `MobileTimeSlotsScreen.tsx`        | TimeSlotPresetsTab          | Monthly   |
| 27  | Official Page       | `MobileOfficialPageScreen.tsx`     | OfficialPageTab             | Rare      |
| 28  | Business Attributes | `MobileBusinessAttributesScreen.tsx` | BusinessAttributesTab     | Rare      |
| 29  | Domain Settings     | `MobileDomainSettingsScreen.tsx`   | DomainSettingsTab           | Rare      |
| 30  | Integrations        | `MobileIntegrationsScreen.tsx`     | IntegrationsTab             | Rare      |
| 31  | POS Sync            | `MobilePosSyncScreen.tsx`          | PosSyncTab                  | Rare      |

### Shell (2)

| #   | Component        | File                   | Purpose                   |
| --- | ---------------- | ---------------------- | ------------------------- |
| 34  | MobileShell      | `MobileShell.tsx`      | Root wrapper, tab routing |
| 35  | MobileNavigation | `MobileNavigation.tsx` | Bottom TabBar             |

**Desktop-only remainder:** platform/ops workflows, complex editor precision tasks, and any feature explicitly rejected by its mobile support gate. Core owner operations have mobile equivalents.

---

## Screen 1 — Menu Screen

### Purpose

The most-used editing screen in the mobile app. Owner opens app → switches to Menu → searches item → edits/toggles → closes app. All in under 10 seconds.

### Layout

```
┌─────────────────────────────┐
│  🔍 Search items...         │  ← SearchBar (always visible, sticky)
├─────────────────────────────┤
│  [All] [Cat 1] [Cat 2] ... │  ← CapsuleTabs (horizontal scroll)
├─────────────────────────────┤
│                             │
│  ┌─────────────────────────┐│
│  │ Item Name        ₹250  ││  ← List.Item
│  │ Category    [Toggle ●] ││  ← Availability toggle
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ Item Name        ₹180  ││
│  │ Category    [Toggle ○] ││  ← Unavailable (greyed)
│  └─────────────────────────┘│
│  ...                        │  ← InfiniteScroll / PullToRefresh
│                             │
│                         [+] │  ← FloatingBubble (add item)
├─────────────────────────────┤
│ [Today] [Menu] [Share] [More]│ ← TabBar (bottom nav)
└─────────────────────────────┘
```

### Components Used

| Element             | antd-mobile Component | Behavior                                |
| ------------------- | --------------------- | --------------------------------------- |
| Search bar          | `SearchBar`           | Sticky top, client-side filter, instant |
| Category filter     | `CapsuleTabs`         | Horizontal scroll, "All" default        |
| Item list           | `List` + `List.Item`  | Pull to refresh, infinite scroll        |
| Availability toggle | `Switch`              | One-tap, auto-publish, no confirmation  |
| Price display       | Custom text           | Tap to open edit sheet                  |
| Add button          | `FloatingBubble`      | Floating bottom-right, opens Add Sheet  |
| Empty state         | `Empty`               | "No items found"                        |
| Loading             | `DotLoading`          | Skeleton on first load only             |

### Interactions

| Action              | Trigger           | Result                        | Time Target |
| ------------------- | ----------------- | ----------------------------- | ----------- |
| Search item         | Type in SearchBar | Instant filter (client-side)  | < 100ms     |
| Toggle availability | Tap Switch        | Toggle + auto-publish + toast | < 200ms UI  |
| Edit item           | Tap item row      | Opens Item Quick Edit Sheet   | < 150ms     |
| Add item            | Tap floating [+]  | Opens Add Item Sheet          | < 150ms     |
| Refresh menu        | Pull down         | Refresh from Firestore        | < 2 sec     |
| Filter category     | Tap category tab  | Filter items by category      | < 100ms     |

### Data Source

```typescript
// Existing DAL functions — NO new functions needed
import { getProjectData } from "@database/projects";
import { updateProject } from "@database/projects";

// From existing context
const { storeDetails, activeSubscription } = useContext(
  PlatformGlobalDataContext,
);
```

### Edge Cases

- **Empty menu**: Show "No items yet. Add your first item." + prominent add button
- **Search no results**: Show "No items matching '[query]'" + clear button
- **Offline**: Show cached menu. Toggle queues. Show "Syncing..." dot
- **Very long menu (500+ items)**: Virtualized list + search-first approach
- **Item with no price**: Show "—" instead of price

---

## Screen 2 — Item Quick Edit Sheet

### Purpose

Opens as a bottom sheet when owner taps any item on the Menu screen. Fast editing of operational fields only. No heavy editing.

### Layout

```
┌─────────────────────────────┐
│  ────────  (drag handle)    │  ← Swipe down to dismiss
│                             │
│  Item Name                  │
│  ┌─────────────────────────┐│
│  │ Paneer Tikka            ││  ← Input (editable)
│  └─────────────────────────┘│
│                             │
│  Price                      │
│  ┌─────────────────────────┐│
│  │ ₹ 250                   ││  ← Input (number, with currency)
│  └─────────────────────────┘│
│                             │
│  Category                   │
│  ┌─────────────────────────┐│
│  │ Starters            ▼  ││  ← Picker (category selector)
│  └─────────────────────────┘│
│                             │
│  Available                  │
│  ┌──────────────────[●]───┐│  ← Switch (large, prominent)
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │       Save Changes      ││  ← Button (primary, full-width)
│  └─────────────────────────┘│
│                             │
│  Delete Item                │  ← TextButton (danger, small)
│                             │
└─────────────────────────────┘
```

### Components Used

| Element          | antd-mobile Component                                |
| ---------------- | ---------------------------------------------------- |
| Sheet            | `Popup` (position="bottom", round)                   |
| Item name        | `Input`                                              |
| Price            | `Input` (type="number", prefix="₹")                  |
| Category         | `Picker` (single column)                             |
| Available toggle | `Switch`                                             |
| Save button      | `Button` (color="primary", block, size="large")      |
| Delete           | `Button` (fill="none", color="danger", size="small") |
| Toast            | `Toast` ("Item updated")                             |

### Interactions

| Action           | Trigger                   | Result                             |
| ---------------- | ------------------------- | ---------------------------------- |
| Open sheet       | Tap item on Menu screen   | Sheet slides up with item data     |
| Edit price       | Tap price field, type     | Keyboard opens (numeric)           |
| Change category  | Tap category picker       | Native picker wheel opens          |
| Toggle available | Tap switch                | Instant UI toggle                  |
| Save             | Tap "Save Changes"        | Auto-publish + close sheet + toast |
| Delete           | Tap "Delete Item"         | Confirm dialog → delete → close    |
| Dismiss          | Swipe down or tap outside | Close without saving               |

### Auto-Publish Behavior

On save:

1. Update UI immediately (optimistic)
2. Call `updateProject()` with modified item data
3. Show toast: "Item updated and live"
4. If Firestore fails → revert UI + show toast: "Failed to save. Try again."

### Data Flow

```typescript
// Open with item data from parent Menu screen
interface QuickEditProps {
  item: ExtractedDataItem; // Existing type from projects/types
  categories: string[]; // Category list from project
  onSave: (updatedItem: ExtractedDataItem) => void;
  onDelete: (itemId: string) => void;
  onClose: () => void;
}
```

---

## Screen 3 — Add Item Sheet

### Purpose

Quick add of a simple item. Minimal fields. Not a full editor.

### Layout

```
┌─────────────────────────────┐
│  ────────  (drag handle)    │
│                             │
│  Add New Item               │  ← Title
│                             │
│  Item Name *                │
│  ┌─────────────────────────┐│
│  │                         ││  ← Input (auto-focus, keyboard opens)
│  └─────────────────────────┘│
│                             │
│  Price *                    │
│  ┌─────────────────────────┐│
│  │ ₹                       ││  ← Input (numeric keyboard)
│  └─────────────────────────┘│
│                             │
│  Category                   │
│  ┌─────────────────────────┐│
│  │ [Last used category] ▼ ││  ← Picker (default: last used)
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │     Add Item & Publish  ││  ← Button (primary, full-width)
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Key UX Details

- **Auto-focus**: Name input focused on open, keyboard appears instantly
- **Last category**: Auto-select last used category (saves time for batch adding)
- **Numeric keyboard**: Price field triggers numeric keyboard
- **Required fields**: Name and Price only. Category defaults to "Menu" or last used.
- **After save**: Close sheet, scroll to new item in list, brief highlight

### NOT Included (Desktop Only)

- Description field
- Image upload
- AI generation
- Translation
- Variants/options
- Tags/dietary icons
- Duration/preparation time

---

## Screen 4 — Hours & Status Screen

### Purpose

Instant control of business open/closed status + daily social content actions. Used daily for:

- "Close for today" (holiday/emergency)
- "We're running late, opening at 11"
- Checking if status is correct
- **Share today's campaign on WhatsApp** (discovered via deep audit — inherently mobile-first action)

### Layout

```
┌─────────────────────────────┐
│  Hours & Status             │  ← NavBar title
├─────────────────────────────┤
│                             │
│  ┌─────────────────────────┐│
│  │      TODAY STATUS       ││
│  │                         ││
│  │    🟢 OPEN              ││  ← Large status indicator
│  │    Closes at 10:00 PM   ││
│  │                         ││
│  │  ┌───────────────────┐  ││
│  │  │  Close for Today  │  ││  ← Button (prominent)
│  │  └───────────────────┘  ││
│  │                         ││
│  │  Temporarily close       ││  ← Link: opens duration picker
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│  ← TODAY ACTIONS (v1.1 addition)
│  │  📱 Today's Action      ││
│  │                         ││
│  │  "Paneer Tikka is the   ││  ← Campaign content preview
│  │   perfect lunch choice" ││
│  │                         ││
│  │  [Share on WhatsApp]    ││  ← Primary action
│  │  Skip for today         ││  ← Secondary action
│  └─────────────────────────┘│  ← Hidden if no campaign today
│                             │
│  Weekly Hours               │  ← Section heading
│  ┌─────────────────────────┐│
│  │ Mon   9:00 AM - 10:00 PM││
│  │ Tue   9:00 AM - 10:00 PM││
│  │ Wed   9:00 AM - 10:00 PM││
│  │ Thu   9:00 AM - 10:00 PM││
│  │ Fri   9:00 AM - 11:00 PM││
│  │ Sat   9:00 AM - 11:00 PM││
│  │ Sun   Closed             ││  ← Tap any day to edit
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│ [Menu] [Hours] [Feed] [More]│
└─────────────────────────────┘
```

### Today Status Card States

**State: OPEN**

```
🟢 OPEN
Closes at 10:00 PM
[Close for Today]
Temporarily close
```

**State: CLOSED TODAY**

```
🔴 CLOSED TODAY
Customers will see: Closed
[Reopen Today]
```

**State: TEMPORARILY CLOSED**

```
🟡 TEMPORARILY CLOSED
Reopens in 1h 30m (or at 3:00 PM)
[Reopen Now]
```

### Interactions

| Action            | Trigger         | Result                                                    |
| ----------------- | --------------- | --------------------------------------------------------- |
| Close for today   | Tap button      | Instant close + auto-publish to all surfaces              |
| Reopen today      | Tap button      | Instant reopen + auto-publish                             |
| Temporarily close | Tap link        | Duration picker (1h, 2h, 3h, custom, until manual reopen) |
| Reopen now        | Tap button      | Instant reopen from temp close                            |
| Edit day hours    | Tap any day row | Bottom sheet with time pickers                            |
| Auto-reopen       | System          | When next scheduled open time arrives                     |

### Data Source

```typescript
// Existing DAL — hours
import { updateStore } from "@database/stores";

// From existing context
const { storeDetails } = useContext(PlatformGlobalDataContext);
// storeDetails.workingHours → weekly hours
// New fields needed: todayOverride, tempCloseUntil

// Existing hooks — Today Actions (v1.1 addition)
import { useTodayCampaigns } from "@template/main-app/today/hooks/useTodayCampaigns";
import { useCampaignActions } from "@template/main-app/today/hooks/useCampaignActions";
// todayCampaigns.primary → today's main campaign card
// completeCampaign() → mark as shared
// skipCampaign() → skip for today
```

### Today Actions Behavior

- If no campaign today → section hidden entirely (silence = feature, per doctrine)
- If campaign exists → show single card with content preview + "Share on WhatsApp" button
- After sharing → card shows "Shared today ✓" state, non-intrusive
- After skipping → card disappears for today
- Only WhatsApp/social campaigns shown on mobile. Stickers, tent cards, physical surfaces = desktop only.
- Uses existing `useTodayCampaigns` and `useCampaignActions` hooks — zero new DAL needed.

### New Fields Required (Firestore)

```typescript
// Add to store document (minimal addition)
interface StoreHoursOverride {
  todayOverride?: "open" | "closed" | "temp_closed" | null; // null = follow schedule
  tempCloseUntil?: Timestamp | null; // When temp close expires
  overrideDate?: string; // ISO date string, auto-clear next day
}
```

---

## Screen 5 — Feedback Inbox

### Purpose

Quick scan of customer feedback. Reply if needed. Mark resolved. Move on.

### Layout

```
┌─────────────────────────────┐
│  Guest Feedback             │  ← NavBar title
│  [All] [Needs Attention]    │  ← CapsuleTabs filter
├─────────────────────────────┤
│                             │
│  ┌─────────────────────────┐│
│  │ ⭐⭐⭐⭐  •  2 hrs ago  ││  ← Rating + time
│  │ "Great food but service ││  ← Message preview
│  │  was slow today"        ││
│  │              [Resolve ✓]││  ← Quick action
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ ⭐⭐  •  Yesterday      ││
│  │ "Cold food, waited too  ││
│  │  long"                  ││
│  │  🔴 Needs attention     ││  ← Status indicator
│  └─────────────────────────┘│
│                             │
│  ...                        │  ← PullToRefresh + InfiniteScroll
│                             │
├─────────────────────────────┤
│ [Menu] [Hours] [Feed] [More]│
└─────────────────────────────┘
```

### Components Used

| Element       | antd-mobile Component                 |
| ------------- | ------------------------------------- |
| Filter tabs   | `CapsuleTabs`                         |
| Feedback list | `List` with `PullToRefresh`           |
| Feedback card | Custom card (antd-mobile `Card`)      |
| Quick resolve | `SwipeAction` (swipe right) or button |
| Empty state   | `Empty`                               |
| Loading       | `DotLoading`                          |

### Interactions

| Action        | Trigger                           | Result                              |
| ------------- | --------------------------------- | ----------------------------------- |
| View detail   | Tap feedback card                 | Navigate to Feedback Detail screen  |
| Quick resolve | Swipe right OR tap resolve button | Mark resolved + toast               |
| Filter        | Tap tab                           | Filter list (All / Needs Attention) |
| Refresh       | Pull down                         | Refresh from Firestore              |
| Load more     | Scroll to bottom                  | Load next page                      |

### Data Source

```typescript
// Existing DAL — NO changes needed
import { getFeedbackList, updateFeedbackStatus } from "@database/guestFeedback";
```

### Reuse Opportunity

The existing `FeedbackInbox` component at `src/components/templates/main-app/feedback/index.tsx` already uses Tailwind responsive classes (`md:p-6`, `md:flex-row`). The DAL calls (`getFeedbackList`, `updateFeedbackStatus`) can be shared directly.

The mobile version creates a NEW component but reuses:

- `FeedbackCard` component (may need mobile-optimized variant)
- All DAL functions
- All types (`GuestFeedback`, `GuestFeedbackFilter`)

---

## Screen 6 — Feedback Detail

### Purpose

Read full feedback message and reply (if reply feature enabled). Mark resolved.

### Layout

```
┌─────────────────────────────┐
│  ← Back    Feedback    [✓]  │  ← NavBar with back + resolve
├─────────────────────────────┤
│                             │
│  ⭐⭐⭐⭐                   │  ← Rating (large)
│                             │
│  "Great food but the        │
│   service was a bit slow    │  ← Full message
│   today. We waited about    │
│   20 minutes for our main   │
│   course."                  │
│                             │
│  Today, 2:45 PM             │  ← Timestamp
│                             │
│  ─────────────────────────  │  ← Divider
│                             │
│  Reply                      │  ← Section (if reply enabled)
│  ┌─────────────────────────┐│
│  │ Reply to customer...    ││  ← TextArea
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │     Send Reply          ││  ← Button
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Interactions

| Action        | Trigger              | Result                                |
| ------------- | -------------------- | ------------------------------------- |
| Go back       | Tap ← or swipe right | Return to inbox                       |
| Mark resolved | Tap ✓ in NavBar      | Mark resolved + go back + toast       |
| Send reply    | Tap "Send Reply"     | Send + auto-resolve + go back + toast |

---

## Screen 7 — Share & QR Screen

### Purpose

Quick distribution of menu link. Owners constantly send "here is our menu" to customers, partners, events. This will be used daily.

### Layout

```
┌─────────────────────────────┐
│  ← Back    Share Menu       │  ← NavBar
├─────────────────────────────┤
│                             │
│  Your Menu Link             │
│  ┌─────────────────────────┐│
│  │ menulist.app/abc-cafe   ││  ← Link display
│  │                         ││
│  │ [Copy Link] [Share]     ││  ← Action buttons
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │  Share on WhatsApp      ││  ← Dedicated WhatsApp button
│  └─────────────────────────┘│  ← (Most used action for India)
│                             │
│  QR Code                    │
│  ┌─────────────────────────┐│
│  │                         ││
│  │      [QR IMAGE]         ││  ← QR code preview
│  │                         ││
│  │ [Download] [Share QR]   ││  ← QR actions
│  └─────────────────────────┘│
│                             │
│  Preview Menu               │
│  ┌─────────────────────────┐│
│  │  See how customers      ││
│  │  see your menu →        ││  ← Opens public menu page
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Interactions

| Action      | Trigger                 | Result                                  |
| ----------- | ----------------------- | --------------------------------------- |
| Copy link   | Tap "Copy Link"         | Copy to clipboard + toast "Link copied" |
| Share       | Tap "Share"             | Native share sheet (all apps)           |
| WhatsApp    | Tap "Share on WhatsApp" | Open WhatsApp with prefilled link       |
| Download QR | Tap "Download"          | Save QR PNG to phone                    |
| Share QR    | Tap "Share QR"          | Native share sheet with QR image        |
| Preview     | Tap preview card        | Open public menu page in browser        |

---

## Screen 8 — Public Info Screen

### Purpose

Edit customer-facing business identity. Low frequency but important for accuracy.

### Layout

```
┌─────────────────────────────┐
│  ← Back    Public Info      │
├─────────────────────────────┤
│                             │
│  Business Name              │
│  ┌─────────────────────────┐│
│  │ ABC Café                ││
│  └─────────────────────────┘│
│                             │
│  Phone                      │
│  ┌─────────────────────────┐│
│  │ +91 98xxxxxxxx          ││
│  └─────────────────────────┘│
│                             │
│  WhatsApp                   │
│  ┌─────────────────────────┐│
│  │ +91 98xxxxxxxx          ││
│  │ □ Same as phone         ││
│  └─────────────────────────┘│
│                             │
│  Address                    │
│  ┌─────────────────────────┐│
│  │ 123 MG Road, Pune       ││
│  └─────────────────────────┘│
│                             │
│  Logo                       │
│  ┌──────┐                   │
│  │ LOGO │  [Change]         │
│  └──────┘                   │
│                             │
│  Auto-saved                 │  ← Subtle indicator
│                             │
└─────────────────────────────┘
```

### Save Behavior

Auto-save on field blur (when user moves to next field). No save button needed.
Show subtle "Saved" indicator. Changes go live instantly.

### Data Source

```typescript
import { updateStore } from "@database/stores";
// Uses storeDetails from PlatformGlobalDataContext
```

---

## Screen 9 — Billing Screen

### Purpose

Simple plan display. Upgrade button. Invoice access. Minimal.

### Layout

```
┌─────────────────────────────┐
│  ← Back    Plan & Billing   │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────────┐│
│  │  Pro Plan          🟢   ││  ← Current plan card
│  │  Active                 ││
│  │                         ││
│  │  Next billing:          ││
│  │  March 12, 2026         ││
│  │                         ││
│  │  Card ending 4242       ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │  Update Payment Method  ││  ← Opens Razorpay/Stripe
│  └─────────────────────────┘│
│                             │
│  Recent Invoices            │
│  ┌─────────────────────────┐│
│  │ Jan 2026  ₹999   Paid  ││
│  │ Dec 2025  ₹999   Paid  ││
│  │ Nov 2025  ₹999   Paid  ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Payment Failed State

```
┌─────────────────────────────┐
│  ⚠️ Payment Issue            │
│                             │
│  Your last payment failed.  │
│  Update your payment method │
│  to continue service.       │
│                             │
│  [Fix Payment]              │
└─────────────────────────────┘
```

---

## Screen 10 — More Screen

### Purpose

Container for all low-frequency features. Clean list.

### Layout

```
┌─────────────────────────────┐
│  More                       │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────────┐│
│  │ 📤  Share Menu & QR     ││  → Screen 7
│  │ 🏪  Public Info         ││  → Screen 8
│  │ 💳  Plan & Billing      ││  → Screen 9
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ 🔄  Switch Outlet       ││  → Outlet picker (if multi-outlet)
│  └─────────────────────────┘│  ← Hidden for single-outlet users
│                             │
│  ┌─────────────────────────┐│
│  │ 📱  Open Desktop View   ││  → Opens full desktop in browser
│  │ 💬  Contact Support     ││  → WhatsApp support link
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ Account                 ││
│  │ +91 98xxxxxxxx          ││  ← Logged in as
│  │                         ││
│  │ [Logout]                ││  ← Confirm dialog before logout
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│ [Menu] [Hours] [Feed] [More]│
└─────────────────────────────┘
```

### Multi-Outlet: Switch Outlet

If user has multiple outlets:

- Show "Switch Outlet" option
- Tap → opens Picker with outlet list
- Select → reload all data for new outlet
- Remember last selected outlet in localStorage

If single outlet: Hide "Switch Outlet" entirely.

---

## Implementation Phases

### Phase 1: Foundation (2-3 days)

- Install antd-mobile
- Create `useDeviceType` hook
- Create `MobileShell` component (TabBar + layout)
- Wire device detection in `AntdLayoutWrapper`
- Add `ENABLE_MOBILE_UI` feature flag

### Phase 2: Core Screens (5-7 days)

- Screen 1: Menu Screen
- Screen 2: Item Quick Edit Sheet
- Screen 3: Add Item Sheet
- Screen 4: Hours & Status Screen

### Phase 3: Secondary Screens (3-4 days)

- Screen 5: Feedback Inbox
- Screen 6: Feedback Detail
- Screen 7: Share & QR Screen

### Phase 4: Polish (2-3 days)

- Screen 8: Public Info Screen
- Screen 9: Billing Screen
- Screen 10: More Screen
- PWA manifest updates
- Performance testing

**Total: ~12-14 focused days**

---

**Document Signature:** Mobile Screens Specification  
**Version:** 1.0  
**Last Updated:** February 14, 2026
