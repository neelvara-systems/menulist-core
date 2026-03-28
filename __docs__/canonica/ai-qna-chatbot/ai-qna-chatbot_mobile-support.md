# AI QnA Chatbot — Mobile Support Assessment

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Mobile team, Product

---

## 1. Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|:-----:|
| **Frequency** | Used daily/multiple times per day? | Yes — owners search for answers frequently | ✅ |
| **Speed** | Completes in <5 seconds? | Cached: ~100ms, Uncached: ~3s. Both under 5s | ✅ |
| **Touch** | Works with thumb-only? | Search bar + suggested questions = thumb-friendly | ✅ |
| **Value** | Needed away from desk? | Yes — owner needs quick answers while on the floor | ✅ |

**Result: ALL 4 GATES PASS → Mobile UI is MANDATORY**

---

## 2. Current Mobile Implementation

- `MobileHelpScreen.tsx` exists but is a basic help center view, not a dedicated AI chat screen
- Desktop `HelpChat` uses a 92vw modal with two-panel layout (320px sidebar + chat) — not mobile-friendly
- `AISearchModal` exists as a global search component but is desktop-optimized

---

## 3. Mobile Screens Needed

| Screen | Priority | Complexity | Description |
|--------|:--------:|:----------:|-------------|
| **AI Chat (Full Screen)** | P0 | High | Full-screen chat with messages, input, suggested questions |
| **Chat History** | P1 | Medium | Session list as separate screen (not sidebar) |
| **Search Bar** | P0 | Low | Prominent search input on help screen |

---

## 4. Mobile Architecture Rules

- **DAL:** Same `src/database/chatSessions/` functions
- **API:** Same `/api/helpCenter/search-kb` route
- **Hooks:** Same `useChatHandlers`, `useChatData` hooks
- **Types:** Same `src/types/chatSession.ts`
- **UI:** antd-mobile components (NOT antd Modal/Drawer)
- **Icons:** react-icons/lu (Lucide) only
- **Touch targets:** 44px minimum
- **Optimistic updates:** Show user message immediately, AI response streams in

---

## 5. Mobile-Specific Considerations

- **Full-screen chat** — No modal, no sidebar. Chat is a full-screen view
- **Bottom-anchored input** — Input bar at bottom like iMessage/WhatsApp
- **Camera integration** — Direct camera access for image queries (not file picker)
- **Keyboard management** — Auto-focus input, dismiss on scroll up, grow TextArea with content
- **Suggested questions as chips** — Horizontal scrollable chip row below answer
- **Source tag** — Compact, tappable, opens article in sheet
- **Message bubbles** — Full-width on mobile (no 70% max-width)
- **Typing indicator** — Centered, compact
- **QnA action buttons** — Full-width stacked buttons (not side-by-side)
- **Back navigation** — Hardware back button returns to help screen, not closes app
- **Pull-to-refresh** — Refresh chat sessions list

---

## 6. What NOT to Build on Mobile

- Chat history sidebar (use separate screen instead)
- Mode toggle in header (simplify — QnA default, auto-switch to Assistant on follow-up)
- Dev-only clear data button
- Rename session (desktop-only)
- Complex message actions menu (simplify to copy + feedback only)
