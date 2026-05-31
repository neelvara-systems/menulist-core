# Ticket System — Technical Implementation Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-05-13
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Ticket System is a **client-side DAL feature** with no API routes. All operations use Firestore client SDK via the standard DAL pattern (`apiCallComposer`, `requestBodyComposer`). Real-time updates use Firestore `onSnapshot` listeners.

**No API routes exist for tickets.** All CRUD operations go directly to Firestore via client SDK.

---

## 2. Complete File Map

### 2.1 Pages

| Route                       | File                                                                | Component                   |
| --------------------------- | ------------------------------------------------------------------- | --------------------------- |
| `/help-center` (ticket tab) | `src/app/(main)/help-center/page.tsx`                               | `HelpCenter` → `TicketView` |
| `/platform/support-tickets` | `src/app/(main)/platform/support-tickets/page.tsx` | `SupportTickets`            |

### 2.2 Owner-Side Components

| File                                                                      | Lines | Purpose                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/templates/main-app/helpCenter/TicketView.tsx`             | 187   | Main ticket view — split layout: form (left) + history (right). Uses `useTicketCache` for caching, `subscribeStoreTickets` for real-time updates. Shows live indicator badge.                                                                 |
| `src/components/templates/main-app/helpCenter/TicketItem.tsx`             | 141   | Ticket card — displays displayId, priority (icon+color), subject (2-line ellipsis), category, status badge, relative time. Hoverable, clickable.                                                                                              |
| `src/components/templates/main-app/helpCenter/TicketHistoryView.tsx`      | 44    | Ticket history list — maps tickets to `TicketItem` cards, opens `TicketDetailView` on click. Gets latest ticket version from props.                                                                                                           |
| `src/components/templates/main-app/helpCenter/landing/RunningTickets.tsx` | 148   | Landing page widget — shows top 3 non-closed tickets in responsive grid. Has own real-time subscription (separate from TicketView). Uses ref guards to prevent duplicate subscriptions.                                                       |
| `src/components/organisms/addSupportTicket/index.tsx`                     | 196   | Ticket creation form — supports modal + inline modes. Fields: category (Select, defaults to Technical Issue), priority (Select, defaults to Normal), subject (Input), message (TextArea), attachments (PasteUpload, max 4). Captures browser logs. Injects `clientDetails` from store context. |

### 2.3 Platform-Side Components

| File                                                                        | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/templates/platform/supportTickets/index.tsx`                | —     | **Root orchestrator** — 3-view Segmented navigation (Analytics Dashboard, Ticket Queue, Deleted/Trash). Uses one platform-wide `subscribeSupportTickets()` listener as the active-ticket initial load and live sync source. CSV export with 3 column configs (full, minimal, analytics). Deleted tickets lazy-loaded on trash view access. Fullscreen `Spin` loading state.                                      |
| `src/components/templates/platform/supportTickets/AnalyticsView.tsx`        | 471   | **Analytics dashboard** — Performance metrics: avg first response time, avg resolution time, high priority count, needs attention count. SLA compliance rate (%), SLA breached count, SLA at risk count. Tickets by status (progress bars with percentages), tickets by category (progress bars), tickets by priority (color-coded cards). All calculated client-side from ticket data via `useMemo`. Uses `calculateSLAStatus()` for SLA metrics. |
| `src/components/templates/platform/supportTickets/exportConfig.ts`          | 218   | **CSV export columns** — 3 configurations: `ticketCSVColumns` (14 columns — full export with SLA status/time remaining), `ticketCSVColumnsMinimal` (7 columns — quick export), `ticketAnalyticsColumns` (8 columns — first response time, resolution time, SLA breached flag). Uses `calculateSLAStatus()` and `formatTimestampForCSV()`.                                                                                                          |
| `src/components/templates/platform/supportTickets/PlatformTicketsView.tsx`  | 271   | Admin dashboard — `forwardRef` with `exportFilteredTickets` ref method. Full table view with all filters (status, priority, category, client, dateRange, tags, SLA, longRunning). Soft delete with `updateTicket({ deleted: true })`. Opens detail drawer on row click. High-priority rows highlighted red.                                                                                                                                        |
| `src/components/templates/platform/supportTickets/TicketDetailView.tsx`     | 211   | Detail drawer (1200px) — Two-column layout. Left: `TicketActions` panel (380px). Right: `ConversationTimeline`. Status changes auto-inject system messages. Footer: Close/Mark Resolved/Update buttons differ by `from` prop (client vs platform). Esc keyboard shortcut to close.                                                                                                                                                                 |
| `src/components/templates/platform/supportTickets/TicketActions.tsx`        | 254   | Properties panel — Shows displayId (monospace), subject (sanitized, 200 char), message (sanitized, 1000 char), priority badge, created date. Platform view: requester info (tenant/store/email/phone), editable status/priority/category dropdowns, attachments gallery (image preview + file links), internal notes (TextArea) + tags (multi-select). Client view: read-only status/priority/category + timestamps.                               |
| `src/components/templates/platform/supportTickets/TicketFiltersBar.tsx`     | 255   | Filter bar — Search input + filter drawer (8 filter types). Badge shows active filter count. Long-running tag shown inline. "Create Ticket" button (not in trash view). Clear All button in drawer.                                                                                                                                                                                                                                                |
| `src/components/templates/platform/supportTickets/TicketStatsCards.tsx`     | 109   | Summary stats — 4 cards: Total, Open (Open+InProgress), Resolved, Unresolved. Client-side calculation from ticket array. Responsive grid (4-col on md, 2-col on xs).                                                                                                                                                                                                                                                                               |
| `src/components/templates/platform/supportTickets/TicketTableColumns.tsx`   | 242   | Table column definitions — 8 columns: ID (monospace, sortable), Subject (ellipsis, sortable), Category (pill tag), Status (badge), Priority (colored dot), Created (datetime, default sort desc), Updated (datetime), Action (dropdown menu). High-priority row styling. Actions: View as Client / Edit / Delete (active) or View / Restore (trash). Delete has confirmation modal.                                                                |
| `src/components/templates/platform/supportTickets/TicketLogsView.tsx`       | 58    | Browser logs modal — Renders captured client logs with level-colored tags (info=blue, warn=orange, error=red), timestamps, raw user-agent string, and parsed browser/OS/device details when ticket debugging context exists.                                                                                                                                                                                                                         |
| `src/components/templates/platform/supportTickets/ConversationTimeline.tsx` | 297   | Chat-style messaging — Renders `user` messages as chat bubbles (blue=current user, white=other), `system` messages as centered italic with dashed border. Backwards compatible (converts old `statuses[].remark` to messages if `messages[]` empty). Reply form with sanitization (1000 char max). Auto-scroll on new messages. Ctrl+Enter keyboard shortcut.                                                                                      |

### 2.4 Shared Atoms

| File                                                               | Purpose                         |
| ------------------------------------------------------------------ | ------------------------------- |
| `src/components/organisms/SupportTicket/SupportTicketCategory.tsx` | Category display component      |
| `src/components/organisms/SupportTicket/SupportTicketPriority.tsx` | Priority display (icon + color) |
| `src/components/organisms/SupportTicket/SupportTicketStatus.tsx`   | Status badge component          |

### 2.5 Database Layer

**File:** `src/database/tickets/index.ts` (322 lines)

| Function                                                                      | Signature                               |  Reads   |        Writes         | Notes                                                                             |
| ----------------------------------------------------------------------------- | --------------------------------------- | :------: | :-------------------: | --------------------------------------------------------------------------------- |
| `addTicket(data)`                                                             | `SupportTicketType → SupportTicketType` |    0     |     1 + N storage     | Captures browser logs + compact client debugging context, uploads attachments, uses `requestBodyComposer` |
| `updateTicket(data)`                                                          | `any → any`                             |    0     |     1 + N storage     | Merge update, handles file uploads                                                |
| `addTicketMessage(ticketId, currentMessages, message, attachments)`           | → `TicketMessage`                       |    0     |     1 + N storage     | Appends to messages array. **No DB read** — takes current messages as param       |
| `updateTicketStatus(ticketId, currentStatuses, newStatus, remark, changedBy)` | → `{status, statusEntry}`               |    0     |           1           | Appends to statuses audit trail. **No DB read** — takes current statuses as param |
| `deleteTicket(data)`                                                          | → `null`                                |    0     | 1 + N storage deletes | **Hard delete** + file cleanup                                                    |
| `restoreTicket(data)`                                                         | → `any`                                 |    0     |           1           | Calls `updateTicket({ deleted: false })`                                          |
| `getTicketById(id)`                                                           | `string → SupportTicketType`            |    1     |           0           | Single doc get                                                                    |
| `getStoresTickets()`                                                          | → `SupportTicketType[]`                 |    N     |           0           | `tId + sId + deleted=false`, ordered by createdOn desc                            |
| `getSupportTickets(includeDeleted)`                                           | → `SupportTicketType[]`                 |    N     |           0           | All tickets (platform admin). Optional includeDeleted flag                        |
| `subscribeSupportTickets(onUpdate, onError, includeDeleted)`                  | → `unsubscribe`                         | Listener |           0           | Real-time `onSnapshot`, platform-wide                                             |
| `subscribeStoreTickets(onUpdate, onError)`                                    | → `unsubscribe`                         | Listener |           0           | Real-time `onSnapshot`, store-scoped                                              |

**Key implementation details:**

- `getDisplayId(id)`: `id.slice(0, 6).toUpperCase()` — first 6 chars of Firestore auto-ID
- `uploadImage()`: Uses `generateStoragePath()` for tenant-scoped paths
- `startLogCapture()`: Started for authenticated app sessions by `src/providers/sessionProvider.tsx`; keeps the last 5 sanitized browser logs for ticket submission.
- `getClientDebugContext()`: Captures a capped user-agent string and timestamp once during ticket creation so support can inspect the raw string and parsed browser/OS/device details without additional reads.
- Ticket queries use the active NextAuth session values for `tId` and `sId`; Answerlattice documents keep the standard `pId`/`tId`/`sId` shape.

### 2.6 Types

**File:** `src/types/supportTicket.ts` (200 lines)

**Interfaces:**

- `TicketMessage` — id, text, type ('user'|'system'), sender ({id, name, email}), timestamp, attachments[]
- `SupportTicketType` — Full ticket with messages[], statuses[], clientDetails, documents[], platformNotes, platformTags[], deleted flag, logs[], clientDebugContext

**Constants:**

- `SUPPORT_TICKET_STATUS` — 5 statuses: Open, In Progress, Resolved, Closed, Re-Opened
- `SUPPORT_TICKET_PRIORITY` — 3 levels: Low, Normal, High
- `SUPPORT_TICKET_PRIORITY_LIST` — User-facing labels for priority select
- `SUPPORT_TICKET_CATEGORY` — 7 categories
- `SUPPORT_TICKET_CATEGORY_LIST` — User-facing labels for category select
- `PLATFORM_SUPPORT_TICKET_TAG_OPTIONS` — 5 tags: Issue, Bug, Feature, Improvement, Performance
- `SLA_CONFIG` — Per-priority SLA hours
- `calculateSLAStatus()` — Runtime SLA calculation (response + resolution status, time used/remaining)
- `getCardColor()` — Status-to-color mapping for theme tokens

### 2.7 Hook

**File:** `src/hooks/useTicketCache.ts` (189 lines)

Provides session-level ticket caching via `PlatformGlobalDataContext`:

- `getAllItems(options)` — Fetch with cache check (maxAge default 5min), force refresh, includeDeleted
- `setAllItems(tickets)` — Direct set for real-time updates
- `updateItem(ticket, position, matchKey)` — Single ticket update using `updateList` utility
- `cachedItems` — Direct cache access (read-only)
- `clearCache()` — Clear on logout

---

## 3. Data Flow

### 3.1 Ticket Creation (Owner)

```
AddSupportTicket form submit
  → Validate form fields
  → Convert attachments to base64
  → Build payload with clientDetails from storeContext
  → Capture browser logs and client debugging context (getCapturedLogs + getClientDebugContext + clearCapturedLogs)
  → addTicket(payload) [DAL]
    → requestBodyComposer (injects tId, sId, uId, timestamps)
    → Upload attachments via uploadImage (tenant-scoped paths)
    → addDoc to supportTickets collection
  → updateItem in cache (position: 'first')
  → Show success message with displayId
```

### 3.2 Message Reply (Both sides)

```
ConversationTimeline form submit
  → Sanitize message (sanitizeFeedbackComment, 1000 chars)
  → Build TicketMessage object with sender info + Timestamp.now()
  → addTicketMessage(ticketId, currentMessages, newMessage) [DAL]
    → Upload attachments if any
    → Append to messages array (no DB read — uses passed currentMessages)
    → setDoc merge
  → Update local state (onMessageAdded callback)
  → No second DB write
```

### 3.3 Status Change (Platform Admin)

```
TicketDetailView handleTicketUpdate({ status: newStatus })
  → Check if status actually changed
  → If changed: create system message ("Status changed from X to Y")
  → Append system message to messages array
  → updateTicket({ ...updatePayload, id }) [DAL]
  → onUpdate callback (updates parent state)
  → Close drawer
```

### 3.4 Real-Time Sync (Owner)

```
TicketView mount
  → Show cached tickets immediately when available
  → subscribeStoreTickets(onUpdate, onError) [initial snapshot + live listener]
  → On each snapshot: setAllItems(tickets) [cache update]
  → Set isRealtimeActive badge
  → On unmount: unsubscribe()
```

---

## 4. Security Model

| Layer                  | Implementation                                                           |
| ---------------------- | ------------------------------------------------------------------------ |
| **Auth**               | `useSession()` from NextAuth — user must be logged in                    |
| **Tenant isolation**   | `where('tId', '==', session.tId)` in queries                             |
| **Store isolation**    | `where('sId', '==', session.sId)` for owner views                        |
| **Platform access**    | Parent route guards for `/platform/*` pages                              |
| **Input sanitization** | `sanitizeFeedbackComment()` on all user text (subject, message, replies) |
| **File storage**       | Tenant-scoped paths via `generateStoragePath()`                          |
| **Soft delete**        | `deleted: true` flag, filtered at DB level                               |

**Missing:**

- No `withAuth()` middleware (uses component-level session check)
- No explicit rate limiting on ticket operations
- No Zod validation on ticket data

---

## 5. Dependencies

| Dependency                                                | Usage                                               |
| --------------------------------------------------------- | --------------------------------------------------- |
| `@database/tickets`                                       | All DAL functions                                   |
| `@database/storage/uploadBase64ToStorage`                 | File uploads                                        |
| `@database/storage/deleteFromStorage`                     | File cleanup on delete                              |
| `@lib/storage/pathGenerator`                              | `generateStoragePath()` for tenant-scoped paths     |
| `@lib/apiHelper`                                          | `requestBodyComposer` (auto-injects session fields) |
| `@lib/apiHelper/apiCallComposer`                          | Standard DAL wrapper                                |
| `@lib/auth/getActiveSession`                              | Session retrieval in DAL                            |
| `@lib/firebase/firebaseClient`                            | Firestore client                                    |
| `@lib/sanitization`                                       | `sanitizeFeedbackComment()`                         |
| `@lib/localLogs/localLogsTracker`                         | `getCapturedLogs()`, `clearCapturedLogs()`          |
| `@hook/useTicketCache`                                    | Caching hook                                        |
| `@hook/useAppDispatch`                                    | Redux loader dispatch                               |
| `@reduxSlices/loader`                                     | `startLoader/stopLoader`                            |
| `@providers/platformProviders/platformGlobalDataProvider` | Cache context + storeDetails                        |
| `@atoms/DateTimeDisplay`                                  | Datetime rendering                                  |
| `@atoms/PasteUpload`                                      | Clipboard paste file upload                         |
| `@util/utils`                                             | `updateList()`, `getBase64()`                       |
| `next-auth/react`                                         | `useSession()`                                      |
| `next-intl`                                               | `useTranslations('HelpCenter')`                     |

---

## 6. Identified Issues

| #   | Issue                                                                  | Severity | File:Line                       | Notes                                                                                                              |
| --- | ---------------------------------------------------------------------- | -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Platform ticket listener is capped to latest 500 tickets, not cursor-paginated | Medium   | `database/tickets/index.ts` | Add cursor pagination when support volume exceeds the current operational cap                                      |
| 3   | `deleteTicket()` is hard delete, not soft delete                       | Medium   | `database/tickets/index.ts:172` | `handleDelete` in PlatformTicketsView uses soft delete via `updateTicket`, but DAL `deleteTicket` does hard delete |
| 4   | No `withAuth()` or rate limiting                                       | Medium   | All DAL functions               | Relies on component-level auth                                                                                     |
| 5   | Ticket messages are capped at 500 entries                              | Resolved | `database/tickets/index.ts`     | Guard protects Firestore 1MB document limit                                                                        |
| 6   | `console.log` used instead of `secureLog`                              | Low      | Multiple files                  | Debug logging not using secure logger                                                                              |
| 7   | Hardcoded English strings in platform components                       | Low      | Multiple platform files         | Not internationalized (owner-side uses `useTranslations`)                                                          |
| 8   | `RunningTickets` has separate real-time subscription from `TicketView` | Low      | `landing/RunningTickets.tsx`    | Two concurrent listeners for same data                                                                             |

---

## 7. Reverse Engineering Validation

### 7.1 File Coverage Check

| Category            | Expected Files | Found  |   Status    |
| ------------------- | :------------: | :----: | :---------: |
| Owner components    |       5        |   5    |     ✅      |
| Platform components |       8        |   8    |     ✅      |
| Shared atoms        |       3        |   3    |     ✅      |
| DAL                 |       1        |   1    |     ✅      |
| Types               |       1        |   1    |     ✅      |
| Hook                |       1        |   1    |     ✅      |
| Pages               |       2        |   2    |     ✅      |
| **Total**           |     **21**     | **21** | **✅ 100%** |

### 7.2 DAL Function Coverage

| Function                  | Used By                                                               |             Verified             |
| ------------------------- | --------------------------------------------------------------------- | :------------------------------: |
| `addTicket`               | `addSupportTicket/index.tsx`                                          |                ✅                |
| `updateTicket`            | `PlatformTicketsView.tsx`, `TicketDetailView.tsx`                     |                ✅                |
| `addTicketMessage`        | `ConversationTimeline.tsx`                                            |                ✅                |
| `updateTicketStatus`      | Not directly called (status changes go through `updateTicket`)        | ⚠️ Available but unused directly |
| `deleteTicket`            | Not called from UI (platform uses soft delete via `updateTicket`)     | ⚠️ Available but unused from UI  |
| `restoreTicket`           | Not called directly (restore uses `updateTicket({ deleted: false })`) |     ⚠️ Available but unused      |
| `getTicketById`           | Not called from current UI                                            |     ⚠️ Available but unused      |
| `getStoresTickets`        | `useTicketCache.ts`                                                   |                ✅                |
| `getSupportTickets`       | `useTicketCache.ts`                                                   |                ✅                |
| `subscribeSupportTickets` | `SupportTickets/index.tsx`                                           |                ✅                |
| `subscribeStoreTickets`   | `TicketView.tsx`, `RunningTickets.tsx`                                |                ✅                |

**Note:** 4 DAL functions (`updateTicketStatus`, `deleteTicket`, `restoreTicket`, `getTicketById`) exist but are not directly called from the current UI. They may have been used previously or are available for future use. The platform admin route now uses `subscribeSupportTickets()` directly for initial load and live updates.

### 7.3 Type Coverage

All types in `src/types/supportTicket.ts` are used:

- `SupportTicketType` — Used in 15+ files ✅
- `TicketMessage` — Used in DAL, ConversationTimeline, TicketDetailView ✅
- `SUPPORT_TICKET_STATUS` — Used in 8+ files ✅
- `SUPPORT_TICKET_PRIORITY` — Used in 5+ files ✅
- `SUPPORT_TICKET_CATEGORY` — Used in 3+ files ✅
- `SLA_CONFIG` / `calculateSLAStatus` — Used in PlatformTicketsView, TicketFiltersBar ✅
- `PLATFORM_SUPPORT_TICKET_TAG_OPTIONS` — Used in TicketActions, TicketFiltersBar ✅
