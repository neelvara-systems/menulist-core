# Ticket System — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-05-13
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The Ticket System is MenuList's **structured support request infrastructure** — a dual-sided system where SMB owners submit and track support tickets, and platform administrators manage, respond, and resolve them with SLA tracking, real-time updates, conversation threading, and internal notes.

---

## Document Index

| #   | Document                          | Audience        | Purpose                                  |
| --- | --------------------------------- | --------------- | ---------------------------------------- |
| 1   | **README.md** (this file)         | Everyone        | Master index                             |
| 2   | `ticket-system_spec.md`           | CEO/PM          | Business requirements, user flows        |
| 3   | `ticket-system_impl.md`           | Developers      | Technical blueprint, every file/function |
| 4   | `ticket-system_firebase.md`       | Developers/Ops  | Firestore operations, cost estimates     |
| 5   | `ticket-system_marketing.md`      | Sales/Marketing | Pitch points                             |
| 6   | `ticket-system_website.md`        | Public          | Landing page content                     |
| 7   | `ticket-system_helpdoc.md`        | End users       | Customer help article                    |
| 8   | `ticket-system_mobile-support.md` | Mobile team     | Mobile assessment                        |

---

## Key Files

### Pages

- `/help-center` (ticket tab) → `src/app/(main)/help-center/page.tsx`
- `/platform/support-tickets` → `src/app/(main)/platform/support-tickets/page.tsx`

### Owner-Side Components

- `src/components/templates/main-app/helpCenter/TicketView.tsx` — Main ticket view (form + history)
- `src/components/templates/main-app/helpCenter/TicketItem.tsx` — Ticket card component
- `src/components/templates/main-app/helpCenter/TicketHistoryView.tsx` — Ticket history list
- `src/components/templates/main-app/helpCenter/landing/RunningTickets.tsx` — Landing page active tickets
- `src/components/organisms/addSupportTicket/index.tsx` — Ticket creation form (modal + inline)

### Platform-Side Components

- `src/components/templates/platform/supportTickets/index.tsx` — Root orchestrator (3-view: Analytics, Queue, Trash)
- `src/components/templates/platform/supportTickets/AnalyticsView.tsx` — Analytics dashboard (SLA, metrics, charts)
- `src/components/templates/platform/supportTickets/exportConfig.ts` — 3 CSV export column configurations
- `src/components/templates/platform/supportTickets/PlatformTicketsView.tsx` — Ticket queue table
- `src/components/templates/platform/supportTickets/TicketDetailView.tsx` — Ticket detail drawer
- `src/components/templates/platform/supportTickets/TicketActions.tsx` — Properties panel
- `src/components/templates/platform/supportTickets/TicketFiltersBar.tsx` — Filter controls
- `src/components/templates/platform/supportTickets/TicketStatsCards.tsx` — Summary stats
- `src/components/templates/platform/supportTickets/TicketTableColumns.tsx` — Table columns
- `src/components/templates/platform/supportTickets/TicketLogsView.tsx` — Browser logs viewer
- `src/components/templates/platform/supportTickets/ConversationTimeline.tsx` — Chat-style messaging

### Shared Atoms

- `src/components/organisms/SupportTicket/SupportTicketCategory.tsx`
- `src/components/organisms/SupportTicket/SupportTicketPriority.tsx`
- `src/components/organisms/SupportTicket/SupportTicketStatus.tsx`

### Database Layer

- `src/database/tickets/index.ts` — 10 DAL functions + 2 real-time listeners

### Types

- `src/types/supportTicket.ts` — Types, constants, SLA config

### Hooks

- `src/hooks/useTicketCache.ts` — Cache management via PlatformGlobalDataContext

---

## Version History

| Date       | Version | Change                                                                |
| ---------- | ------- | --------------------------------------------------------------------- |
| 2026-03-02 | 1.0.0   | Initial forensic documentation — 18 component files, 10 DAL functions |
