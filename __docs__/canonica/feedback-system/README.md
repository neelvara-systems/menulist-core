# Feedback System — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-03-02
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The Feedback System is MenuList's **multi-step owner feedback collection infrastructure** — a 3-step wizard where SMB owners submit general platform feedback (star rating + comment), feature-specific usage feedback (issue checklist + comment), and feature requests (free-text + vote on popular requests). It also includes a **generic content feedback system** that handles likes/dislikes for articles, changelog entries, and future content types through a unified API.

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `feedback-system_spec.md` | CEO/PM | Business requirements |
| 3 | `feedback-system_impl.md` | Developers | Technical blueprint |
| 4 | `feedback-system_firebase.md` | Developers/Ops | Firestore operations, cost |
| 5 | `feedback-system_marketing.md` | Sales/Marketing | Pitch points |
| 6 | `feedback-system_website.md` | Public | Landing page content |
| 7 | `feedback-system_helpdoc.md` | End users | Customer help article |
| 8 | `feedback-system_mobile-support.md` | Mobile team | Mobile assessment |

---

## Key Files

### Owner-Side Components
- `src/components/templates/main-app/helpCenter/ShareFeedbackView.tsx` — 3-step wizard (164 lines)
- `src/components/templates/main-app/helpCenter/GeneralFeedback.tsx` — Step 1: Star rating + comment (30 lines)
- `src/components/templates/main-app/helpCenter/FeatureUsage.tsx` — Step 2: Feature issues checklist (52 lines)
- `src/components/templates/main-app/helpCenter/FeatureRequests.tsx` — Step 3: Feature request + voting (88 lines)

### Database Layer
- `src/database/feedback/index.ts` — 2 DAL functions (54 lines)
- `src/database/feedback/genericFeedback.ts` — Unified content feedback router (131 lines)
- `src/database/contentFeedback/index.ts` — Article/changelog feedback with comments (68 lines)

### Types
- `src/types/feedback.ts` — Feedback interface (17 lines)

### Hooks
- `src/hooks/useFeedback.ts` — Feedback state management

---

## Two Feedback Systems

### 1. Owner Feedback (3-Step Wizard)
**Collection:** `feedback`
**Purpose:** Collect general platform experience, feature usage issues, and feature requests
**Data:** Rating, comments, feature issues, feature requests, popular request votes

### 2. Content Feedback (Unified API)
**Collections:** `article_feedback/{tId}/{sId}`, `changelog_feedback/{tId}/{sId}`
**Purpose:** Likes/dislikes/comments on specific content items (articles, changelog entries)
**Router:** `genericFeedback.ts` routes to appropriate handler by content type

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 4 UI files, 3 DAL files, 1 type file |
