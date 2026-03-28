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

Platform admin ticket management is **NOT required on mobile**:
- Complex table with 8 columns needs desktop
- Filter drawer with 8 filter types needs desktop
- 1200px detail drawer needs desktop
- Internal notes/tags editing needs desktop

Only **owner-side** ticket operations need mobile support.
