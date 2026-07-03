# Chat Monitoring — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-06-30
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

Chat Monitoring is MenuList's **platform admin dashboard for managing AI chatbot conversations** — a comprehensive system where administrators view all conversations, filter by quality/status/priority/feedback, manage conversation metadata (status, priority, tags), add internal team notes, calculate ROI metrics, and view AI-generated weekly performance digests.

**Product-boundary note:** this doc lives under the historical Answerlattice/support documentation family, but the current runtime is MenuList-hosted. The Cloud Functions listed below run from `functions/src/`, scan MenuList `tenants`, `stores`, `chatAnalytics`, `aiSearchHistory`, and nested `knowledgeBase` data, and write MenuList `insights/{tId}/stores/{sId}/ai/*` documents. They are not active `functions-answerlattice/` scheduler exports.

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `chat-monitoring_spec.md` | CEO/PM | Business requirements |
| 3 | `chat-monitoring_impl.md` | Developers | Technical blueprint |
| 4 | `chat-monitoring_firebase.md` | Developers/Ops | Firestore operations, cost |
| 5 | `chat-monitoring_marketing.md` | Sales/Marketing | Pitch points |
| 6 | `chat-monitoring_website.md` | Public | Landing page content |
| 7 | `chat-monitoring_helpdoc.md` | End users | N/A (platform-admin only) |
| 8 | `chat-monitoring_mobile-support.md` | Mobile team | Mobile assessment |

---

## Key Files

### Platform Admin Components (13 files)
- `src/components/templates/platform/chatManagement/index.tsx` — Entry point (renders ConversationsList)
- `src/components/templates/platform/chatManagement/ConversationsList.tsx` — Paginated conversation table
- `src/components/templates/platform/chatManagement/ConversationDrawer.tsx` — Conversation detail drawer
- `src/components/templates/platform/chatManagement/ConversationCard.tsx` — Conversation list card
- `src/components/templates/platform/chatManagement/ConversationDetail.tsx` — Full conversation view
- `src/components/templates/platform/chatManagement/ConversationFiltersPopover.tsx` — Filter popover (9 filter types)
- `src/components/templates/platform/chatManagement/MessageBubble.tsx` — Admin message rendering
- `src/components/templates/platform/chatManagement/AdminMetadataPopover.tsx` — Status/priority/tag management
- `src/components/templates/platform/chatManagement/TeamNoteModal.tsx` — Internal notes editor
- `src/components/templates/platform/chatManagement/ROICalculator.tsx` — ROI calculation dashboard
- `src/components/templates/platform/chatManagement/WeeklyDigest.tsx` — AI-generated weekly summary
- `src/components/templates/platform/chatManagement/ChatInsights.tsx` — Analytics insights
- `src/components/templates/platform/chatManagement/ComprehensiveDashboard.tsx` — Empty (deprecated)
- `src/lib/answerlattice/supportClipboard.ts` — Shared acknowledged copy helper for platform message copy and ROI share text

### Database Layer
- `src/database/chatSessions/index.ts` — Admin methods: `getAllChatSessionsForAdmin`, `getChatStatistics`, `getTopQuestions`, `getKnowledgeGaps`, `getChatVolumeOverTime`, `updateSessionInternalNote`
- `src/database/chatAnalytics/index.ts` — Optimized: `getChatStatisticsOptimized`, `getTopQuestionsOptimized`, `getKnowledgeGapsOptimized`, `getChatVolumeOverTimeOptimized`, `getConversationsPaginated`

### Cloud Functions (AI Intelligence)
- `functions/src/aggregateDailyChatStats.ts` — Nightly aggregation
- `functions/src/analytics/feedbackIntelligence.ts` — AI feedback analysis
- `functions/src/analytics/kbQuality.ts` — KB article quality scoring
- `functions/src/analytics/weeklyNarrative.ts` — Weekly digest generation

### Types
- `src/types/chatSession.ts` — ConversationFilters, ADMIN_STATUS/PRIORITY/TAG/QUALITY_OPTIONS

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 13 UI files, 13 DAL functions, 4 Cloud Functions |
