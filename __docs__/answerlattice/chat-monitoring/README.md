# Chat Monitoring — Feature Documentation

> **Status:** ACTIVE (Answerlattice isolated runtime)
> **Last Updated:** 2026-07-12
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

Chat Monitoring is Answerlattice's operator dashboard for reviewing support conversations, quality, feedback, internal notes, aggregate trends, and source-backed weekly summaries.

**Product boundary:** `chatSessions`, `chatAnalytics`, and `insights` are read and written through the dedicated Answerlattice Firebase clients and `functions-answerlattice/`. The MenuList scheduler records the migrated task names as skipped and its two legacy manual callable names return `failed-precondition`; they perform no help-center reads, writes, or provider calls.

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
- `src/components/templates/platform/chatManagement/WeeklyDigest.tsx` — source-backed weekly summary with optional explicit refresh
- `src/components/templates/platform/chatManagement/ChatInsights.tsx` — Analytics insights
- `src/components/templates/platform/chatManagement/ComprehensiveDashboard.tsx` — Empty (deprecated)
- `src/lib/answerlattice/supportClipboard.ts` — Shared acknowledged copy helper for platform message copy and ROI share text

### Database Layer
- `src/database/chatSessions/index.ts` — Admin methods: `getAllChatSessionsForAdmin`, `getChatStatistics`, `getTopQuestions`, `getKnowledgeGaps`, `getChatVolumeOverTime`, `updateSessionInternalNote`
- `src/database/chatAnalytics/index.ts` — Optimized: `getChatStatisticsOptimized`, `getTopQuestionsOptimized`, `getKnowledgeGapsOptimized`, `getChatVolumeOverTimeOptimized`, `getConversationsPaginated`

### Cloud Functions (Derived Intelligence)
- `functions-answerlattice/src/answerlattice/chatAnalyticsAggregation.ts` — bounded, resumable daily summary aggregation
- `functions-answerlattice/src/answerlattice/chatIntelligence.ts` — deterministic feedback and weekly insight projection
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` — existing tenant scheduler orchestration

### Types
- `src/types/chatSession.ts` — ConversationFilters, ADMIN_STATUS/PRIORITY/TAG/QUALITY_OPTIONS

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-12 | 1.2.0 | Migrated chat analytics and insight truth to isolated Answerlattice Firebase; scheduled insight wording is deterministic and source-hash idempotent; retired MenuList workers/callables no longer touch help-center data. |
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 13 UI files, 13 DAL functions, 4 Cloud Functions |
