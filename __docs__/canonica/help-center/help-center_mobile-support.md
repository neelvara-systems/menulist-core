# Help Center — Mobile Support Assessment

> **Version:** 1.0.0
> **Last Updated:** 2026-03-01
> **Audience:** Mobile team, Product
> **Source:** Codebase forensic audit

---

## 1. Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|:-----:|
| **Frequency** | Used daily/multiple times per day? | Yes — owners check tickets, search for answers daily | ✅ |
| **Speed** | Completes in <5 seconds? | AI search: 1-3s (cached), 3-10s (uncached). Ticket submission: ~2s | ✅ |
| **Touch** | Works with thumb-only? | Search bar, tab navigation, ticket form — all thumb-friendly | ✅ |
| **Value** | Needed away from desk? | Yes — owner gets a ticket notification, needs to check/respond from phone | ✅ |

**Result: ALL 4 GATES PASS → Mobile UI is MANDATORY**

---

## 2. Current Mobile Implementation

### Existing Mobile Screen
- **File:** `src/components/mobile/screens/MobileHelpScreen.tsx`
- **Status:** Exists (basic implementation)

### What's Needed for Full Mobile Coverage

| Feature | Priority | Complexity | Notes |
|---------|----------|-----------|-------|
| **AI Search/Chat** | P0 | Medium | Core use case — search from phone |
| **Ticket Viewing** | P0 | Low | Read ticket status, messages |
| **Ticket Submission** | P0 | Medium | Form with camera/file upload |
| **KB Browsing** | P1 | Medium | Category → section → article navigation |
| **Changelog Viewing** | P2 | Low | Read-only, simple list |
| **Feedback Submission** | P2 | Low | 3-step form |

---

## 3. Mobile Architecture Rules

Per mobile doctrine (`.cascade/rules/MOBILE_SUPPORT_RULES.md`):

- **DAL:** Same functions as desktop — `src/database/chatSessions/`, `src/database/tickets/`, etc.
- **Hooks:** Same hooks — `useTicketCache`, `useChangelogCache`, `useFeedback`
- **UI Library:** antd-mobile + Tailwind CSS (NOT antd)
- **Icons:** react-icons/lu (Lucide) only
- **Touch targets:** 44px minimum
- **Optimistic updates:** UI responds instantly, sync happens after
- **No desktop refactoring** — mobile is a new clean layer

---

## 4. Mobile-Specific Considerations

### AI Chat on Mobile
- Full-screen chat panel (no side-by-side layout)
- Camera integration for image queries (use device camera directly)
- Keyboard management (auto-focus, dismiss on scroll)
- Message bubbles need mobile-optimized sizing
- Suggested questions as horizontal scrollable chips

### Tickets on Mobile
- Pull-to-refresh for ticket list
- Swipe actions (open ticket details)
- Camera for ticket attachments
- Status badges need to be large enough for touch

### KB on Mobile
- Single-column layout (no 3-panel)
- Collapsible category/section accordion
- Article content needs responsive TipTap rendering
- Breadcrumb navigation for back-tracking

---

## 5. Data Format Parity

All mobile screens MUST use identical data shapes as desktop:

| Data | Type | Desktop Component | Mobile Screen |
|------|------|-------------------|---------------|
| Chat sessions | `ChatSession` | `helpChat/index.tsx` | `MobileHelpScreen.tsx` |
| Tickets | `SupportTicketType` | `helpCenter/TicketView.tsx` | TBD |
| KB articles | `KnowledgeBaseArticleType` | `KnowledgeBaseExplorer/` | TBD |
| Changelog | `ChangelogPage` | `helpCenter/ChangelogView.tsx` | TBD |
| Feedback | `Feedback` | `helpCenter/ShareFeedbackView.tsx` | TBD |

---

## 6. Platform Admin on Mobile

**Updated 2026-05-19:** Platform admin features are available to `PLATFORM` users from MenuList Mobile More -> Canonica. This does not replace the owner-facing Help Center mobile flow; it adds operator access for support recovery and emergency admin work.

| Feature | Mobile? | Route model |
|---------|:-------:|-------------|
| Ticket dashboard (platform) | Yes | Real platform template through `MobilePlatformInternalScreen` |
| Feedback Admin | Yes | Real platform template through `MobilePlatformInternalScreen` |
| KB management | Yes | Real platform template through `MobilePlatformInternalScreen` |
| KB generation | Yes | Real platform template through `MobilePlatformInternalScreen` |
| Chat monitoring | Yes | Real platform template through `MobilePlatformInternalScreen` |
| Changelog CRUD | Yes | Real platform template through `MobilePlatformInternalScreen` |
| Widget Management | Yes | Same `CanonicaWidgetManagement` template with embedded mobile mode |

Desktop remains preferred for dense authoring, exports, and long triage sessions. Mobile platform routes must still be readable, navigable, and action-capable without horizontal page overflow.
