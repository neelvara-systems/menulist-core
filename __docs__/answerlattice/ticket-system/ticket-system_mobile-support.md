# Ticket System — Mobile Support Assessment

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Mobile team, Product

---

## 1. Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|:-----:|
| **Frequency** | Used daily/multiple times per day? | Yes — owners check ticket status, reply to messages | ✅ |
| **Speed** | Completes in <5 seconds? | Ticket creation: ~3s. Reply: ~2s. Status check: instant | ✅ |
| **Touch** | Works with thumb-only? | Form fields, reply input, status badges — all thumb-friendly | ✅ |
| **Value** | Needed away from desk? | Yes — owner gets notified of reply, needs to check/respond from phone | ✅ |

**Result: ALL 4 GATES PASS → Mobile UI is MANDATORY**

---

## 2. Current Mobile Implementation

- **No dedicated mobile ticket screen exists yet**
- `MobileHelpScreen.tsx` exists but focuses on general help, not ticket-specific views
- Desktop `TicketView` is responsive (flex-wrap) but not mobile-optimized

---

## 3. Mobile Screens Needed

| Screen | Priority | Complexity | Description |
|--------|:--------:|:----------:|-------------|
| **Ticket List** | P0 | Low | List of own tickets with status badges, pull-to-refresh |
| **Ticket Detail** | P0 | Medium | Conversation thread + reply input (full-screen chat layout) |
| **Create Ticket** | P0 | Medium | Form with category/priority/subject/message + camera for attachments |
| **Ticket Status** | P1 | Low | Status badge component for mobile |

---

## 4. Mobile Architecture Rules

- **DAL:** Same `src/database/tickets/index.ts` functions
- **Hook:** Same `useTicketCache` hook
- **Types:** Same `src/types/supportTicket.ts`
- **Real-time:** Same `subscribeStoreTickets` listener
- **UI:** antd-mobile components (NOT antd)
- **Icons:** react-icons/lu (Lucide) only
- **Touch targets:** 44px minimum
- **Optimistic updates:** Show message immediately, sync in background

---

## 5. Mobile-Specific Considerations

- **Camera integration** for ticket attachments (device camera directly)
- **Push notification** when ticket status changes (future — not currently implemented)
- **Compact ticket cards** — display ID, subject (1-line ellipsis), status badge, priority dot
- **Full-screen conversation** — chat-style layout with bottom-pinned reply input
- **Swipe gestures** — swipe to close ticket (optional)
- **Keyboard management** — auto-focus reply input, dismiss on scroll

---

## 6. Platform Admin on Mobile

**Updated 2026-05-19:** Platform ticket management is exposed to `PLATFORM` users from MenuList Mobile More -> Answerlattice -> Support Tickets.

The mobile route mounts the same platform Support Tickets template through `MobilePlatformInternalScreen`. It is a real product workflow with analytics, queue, deleted tickets, filters, ticket details, replies, status changes, internal notes, tags, and export actions where the browser supports them.

Mobile expectations:

- tables scroll inside their own container instead of widening the page;
- ticket detail drawers collapse to viewport width;
- reply input remains reachable above the mobile shell bottom navigation;
- Back returns to More -> Answerlattice;
- expensive or destructive actions keep confirmation/error states.
