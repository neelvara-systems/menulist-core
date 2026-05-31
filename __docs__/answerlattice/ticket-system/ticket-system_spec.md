# Ticket System — Product Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-05-13
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Provide a structured support request system where SMB owners can submit, track, and communicate on support tickets, and platform administrators can manage, prioritize, respond, and resolve them with SLA tracking.

### Scope

- Ticket creation with categorization and priority
- Bi-directional conversation threading (owner ↔ platform)
- Status lifecycle with audit trail
- SLA tracking with auto-calculated breach/risk status
- File attachments (tenant-scoped storage)
- Real-time updates via Firestore listeners
- Browser log capture on ticket submission (debugging aid)
- Platform admin dashboard with filters, search, stats, and bulk actions

### Out of Scope

- Automated ticket routing / assignment
- Email notifications on ticket updates
- Customer satisfaction surveys post-resolution
- Ticket templates / canned responses
- Ticket merging / linking
- Public ticket status page

---

## 2. User Roles

### 2.1 SMB Owner (Ticket Creator)

**Access:** `/help-center` → "Submit a Ticket" tab
**Can do:**

- Create new tickets with subject, category, priority, message, attachments
- View own ticket history (store-scoped)
- Read conversation thread
- Send replies with attachments
- Close own tickets
- See real-time status updates (live indicator)

### 2.2 Platform Administrator

**Access:** `/platform/support-tickets`
**Can do:**

- View all tickets across all tenants
- Filter by status, priority, category, client, SLA status, tags, date range, long-running
- Search by ticket ID, subject, store name, tenant name
- Change ticket status (Open → In Progress → Resolved → Closed)
- Change ticket priority
- Change ticket category
- Add internal notes and tags
- Send replies in conversation thread
- View client browser logs (debugging)
- Soft-delete tickets (with restore capability)
- Create tickets on behalf of clients
- Export filtered ticket list
- View summary statistics (total, open, resolved, unresolved)

---

## 3. Ticket Lifecycle

### 3.1 Status Flow

```
Open → In Progress → Resolved → Closed
  ↑                                ↓
  └──────── Re-Opened ←───────────┘
```

### 3.2 Status Definitions

| Status          | Meaning                            | Who Sets                |
| --------------- | ---------------------------------- | ----------------------- |
| **Open**        | New ticket, awaiting attention     | Auto on creation        |
| **In Progress** | Platform team is working on it     | Platform admin          |
| **Resolved**    | Issue fixed, awaiting confirmation | Platform admin          |
| **Closed**      | Ticket completed                   | Owner or platform admin |
| **Re-Opened**   | Closed ticket reopened by owner    | Owner                   |

### 3.3 Status Audit Trail

Every status change creates a `statuses[]` entry with:

- New status
- Timestamp
- Changed by (id, name, email)
- Remark text

Additionally, status changes inject a **system message** into the conversation thread (type: `system`), visible to both owner and admin.

---

## 4. SLA Configuration

| Priority               | First Response Target | Resolution Target  |
| ---------------------- | --------------------- | ------------------ |
| **High (Urgent)**      | 2 hours               | 24 hours (1 day)   |
| **Normal (Important)** | 8 hours               | 72 hours (3 days)  |
| **Low (Not urgent)**   | 24 hours              | 168 hours (7 days) |

### SLA Status Calculation

Runtime calculation based on `createdOn` timestamp:

| SLA Status   | Condition                |
| ------------ | ------------------------ |
| **On Time**  | < 80% of SLA time used   |
| **At Risk**  | 80-100% of SLA time used |
| **Breached** | > 100% of SLA time used  |

SLA is calculated client-side using `calculateSLAStatus()` in `src/types/supportTicket.ts`. No Cloud Functions or scheduled checks.

---

## 5. Ticket Categories

| Category             | Label (User-Facing)   |
| -------------------- | --------------------- |
| Technical Issue      | Something not working |
| Billing Inquiry      | Billing / Payments    |
| General Question     | General Question      |
| Content Update       | Content / Menu Update |
| Feature Suggestion   | Feature Suggestion    |
| Account & Login Help | Account & Login Help  |
| Other                | Other                 |

---

## 6. Conversation System

### 6.1 Message Types

| Type     | Description                         | Visual                                 |
| -------- | ----------------------------------- | -------------------------------------- |
| `user`   | Regular message from owner or admin | Chat bubble (blue=sender, white=other) |
| `system` | Auto-generated on status changes    | Centered, dashed border, italic        |

### 6.2 Conversation Features

- **Bi-directional:** Both owner and admin can send messages
- **Attachments:** File uploads on messages (tenant-scoped storage)
- **Auto-scroll:** Scrolls to latest message on load/new message
- **Keyboard shortcut:** Ctrl/Cmd + Enter to send
- **Sanitization:** All messages sanitized via `sanitizeFeedbackComment()` (max 1000 chars)
- **Backwards compatibility:** Old tickets without `messages[]` array fall back to converting `statuses[].remark` to messages

---

## 7. Real-Time Updates

Both owner and platform views use Firestore `onSnapshot` listeners for real-time ticket updates:

- **Owner view (`TicketView`):** Subscribes to store-scoped tickets after initial fetch
- **Landing page (`RunningTickets`):** Subscribes when cached data becomes available
- **Platform admin:** Gets tickets passed from parent with real-time subscription

Real-time indicator badge shows "Live" when subscription is active.

---

## 8. File Attachments

### 8.1 On Ticket Creation

- Max 4 files per ticket
- Files uploaded as base64 → converted to Firebase Storage URLs
- Storage path: `supportTickets/documents/{tId}/{sId}/{fileId}` (tenant-scoped)
- Supports paste upload (clipboard images)

### 8.2 On Message Reply

- Attachments on individual messages
- Storage path: `supportTickets/messages/{tId}/{sId}/{fileId}` (tenant-scoped)
- Each attachment stored with: url, name, type, size

---

## 9. Browser Log Capture

On ticket creation, the system captures the last 5 sanitized browser console logs via `getCapturedLogs()` from `@lib/localLogs/localLogsTracker`. It also stores compact `clientDebugContext` with a capped user-agent string and capture timestamp. These details are stored in the ticket document and viewable by platform admins from the ticket detail Logs button through the `TicketLogsView` modal, which shows both the raw user-agent string and parsed browser/OS/device values. This provides debugging context without requiring the owner to describe technical details.

Log entries include: timestamp, message, level (info/warn/error).

---

## 10. Caching Strategy

Tickets use a session-level cache via `useTicketCache` hook (backed by `PlatformGlobalDataContext`):

| Feature                | Behavior                                            |
| ---------------------- | --------------------------------------------------- |
| **Cache duration**     | 5 minutes default (configurable)                    |
| **Force refresh**      | Available via `getAllItems({ forceRefresh: true })` |
| **Real-time sync**     | Cache updated by the Firestore `onSnapshot` initial snapshot and subsequent changes |
| **Fallback**           | Returns stale cache on fetch error                  |
| **Single item update** | `updateItem()` uses `updateList()` utility          |
| **Clear**              | On logout or manual refresh                         |

---

## 11. Platform Admin — 3-View Architecture

The platform admin page (`/platform/support-tickets`) has a **Segmented navigation** with 3 views:

| View                    | Label                        | Description                                                              |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| **Analytics Dashboard** | "Dashboard" (default)        | SLA compliance, performance metrics, tickets by status/category/priority |
| **Ticket Queue**        | "Ticket Queue"               | Full table with filters, detail drawer, CRUD                             |
| **Deleted**             | "Deleted" (with badge count) | Trash view for soft-deleted tickets with restore capability              |

### 11.1 Analytics Dashboard (Default View)

**Component:** `AnalyticsView.tsx` (471 lines)

**Quick Stats Cards:**

- Total Tickets, Open Tickets, Resolved Tickets, Unresolved Tickets

**Performance Metrics:**

- Avg. First Response Time (creation → first admin message)
- Avg. Resolution Time (creation → resolved status)
- High Priority count
- Needs Attention count (SLA breached + at risk)

**SLA Metrics:**

- SLA Compliance Rate (% of tickets resolved within SLA)
- SLA Breached count (exceeded deadline)
- SLA At Risk count (80-100% time used)

**Breakdown Charts (Progress Bars):**

- Tickets by Status (with percentages)
- Tickets by Category (with percentages)
- Tickets by Priority (color-coded cards: red=High, blue=Normal, green=Low)

All analytics calculated **client-side** from ticket data via `useMemo`.

### 11.2 CSV Export

3 export configurations available:

- **Full Export** (14 columns) — Ticket ID, Client Store/Tenant, Status, Priority, Category, Subject, Message, SLA Status, SLA Time Remaining, Tags, Messages Count, Created On, Last Updated
- **Minimal Export** (7 columns) — Ticket ID, Client, Status, Priority, Subject, SLA Status, Created On
- **Analytics Export** (8 columns) — Ticket ID, Priority, Category, Created On, First Response Time (hours), Resolution Time (hours), SLA Status, SLA Breached

### 11.3 Trash View

- Lazy-loaded: deleted tickets fetched only when trash view is accessed
- Uses same `PlatformTicketsView` component with `isTrashView={true}` prop
- Actions: View Details, Restore Ticket (with confirmation modal)
- Restore moves the ticket back to the active queue; the active list updates through the live listener and the trash list refreshes lazily
- Badge count on Deleted tab shows number of deleted tickets

---

## 12. Ticket Queue (Table View)

### 12.1 Table View

- Sortable columns: Ticket ID, Subject, Category, Status, Priority, Created, Updated
- Pagination: 10/15/25/50 items per page
- Row highlighting: High-priority tickets get red background
- Click row to open detail drawer

### 11.2 Filters (Drawer)

- Status (5 options)
- Priority (3 options)
- Category (7 options)
- Client/Store (auto-populated from ticket data)
- Tags (5 platform tag options: Issue, Bug, Feature, Improvement, Performance)
- SLA Status (Breached, At Risk, On Time)
- Date Range (date picker)
- Long Running checkbox (>3 days unresolved)

### 11.3 Stats Cards

- Total Tickets
- Open Tickets (Open + In Progress)
- Resolved Tickets
- Unresolved Tickets (not Resolved, not Closed)

### 11.4 Detail Drawer (1200px width)

Two-column layout:

- **Left panel (380px):** Ticket properties (status/priority/category dropdowns), requester info, attachments, internal notes + tags
- **Right panel (flex):** Conversation timeline with reply form

### 11.5 Actions

- View as Client (read-only mode)
- Edit Ticket (editable properties)
- Mark as Resolved
- Update Ticket (save all changes)
- Delete (soft delete with confirmation modal)
- Restore (from trash view)

---

## 12. Data Isolation

| Scope             | Implementation                                        |
| ----------------- | ----------------------------------------------------- |
| **Tenant**        | `where('tId', '==', session.tId)`                     |
| **Store**         | `where('sId', '==', session.sId)`                     |
| **Platform-wide** | `subscribeSupportTickets()` / `getSupportTickets()` with latest-500 cap (admin only) |
| **Soft delete**   | `where('deleted', '==', false)` — default exclusion   |

---

## 13. Risks & Open Questions

| #   | Item                                                                                                           | Status                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | No email notifications on ticket status changes                                                                | Not implemented                                                           |
| 2   | No automated ticket assignment/routing                                                                         | Not implemented                                                           |
| 3   | SLA is client-side calculation only — no server-side enforcement                                               | By design                                                                 |
| 4   | Platform support admin is capped to latest 500 tickets, not cursor-paginated                                   | Add pagination before support volume exceeds operational cap              |
| 6   | No ticket de-duplication detection                                                                             | Not implemented                                                           |
| 7   | Conversation messages stored as array inside ticket document — large tickets could hit Firestore 1MB doc limit | Low risk for now                                                          |
| 8   | 17x `console.log`/`console.error` across DAL + 7 component files                                               | ✅ RESOLVED — all removed in audit                                        |
| 9   | No CSAT satisfaction survey after ticket resolution                                                            | ✅ RESOLVED — `satisfaction` field + `submitTicketSatisfaction` DAL added |

---

## 14. STEP 9C Audit (2026-03-04)

### Bugs Fixed (17 violations)

- Removed 4x `console.error` from `database/tickets/index.ts` (subscription error handlers)
- Removed debug `console.log` + 2x `console.error` from `PlatformTicketsView.tsx` (drawer debug, delete, restore)
- Removed `console.error` from `AnalyticsView.tsx` (analytics calculation)
- Removed `console.error` from `index.tsx` (subscription error)
- Removed `console.error` from `ConversationTimeline.tsx` (send message)
- Removed 2x `console.error` + 2x `console.log` from `TicketView.tsx` (real-time subscription)
- Removed 2x `console.error` + 2x `console.log` from `RunningTickets.tsx` (real-time subscription)

### Industry Best Practices Comparison (Step D Web Search)

Sources: Intercom, Zendesk, Freshdesk, Pylon, Raiseaticket

| Industry Feature                             | Our Status              | Gap?                    |
| -------------------------------------------- | ----------------------- | ----------------------- |
| Ticket lifecycle (create/assign/track/close) | ✅ Full                 | No                      |
| SLA tracking (response + resolution)         | ✅ 3 tiers              | No                      |
| Real-time updates                            | ✅ Firestore onSnapshot | No                      |
| File attachments                             | ✅ Tenant-scoped        | No                      |
| Conversation threading                       | ✅ Bi-directional       | No                      |
| Status audit trail                           | ✅ With system messages | No                      |
| Analytics dashboard                          | ✅ Client-side          | No                      |
| CSV export                                   | ✅ 3 types              | No                      |
| **CSAT survey post-resolution**              | ✅ Now implemented      | **Was missing**         |
| Canned responses / templates                 | ❌                      | Low priority at scale   |
| Auto-close stale tickets                     | ❌                      | Low priority            |
| Email notifications                          | ❌                      | Explicitly out of scope |

### Improvements Implemented

1. ✅ **CSAT satisfaction survey:** Added `satisfaction` field to `SupportTicketType` (rating 1-5, optional comment, submittedAt). Added `submitTicketSatisfaction()` DAL function. Industry-standard feature (Zendesk, Freshdesk, Intercom all have it).

### Skipped (Validated)

- **Canned responses:** Useful but requires new template management UI. Higher effort than value at current admin count.
- **Auto-close stale tickets:** Needs Cloud Function. Low priority — tickets are manually managed effectively.
