# Feedback System — Feature Documentation

> **Status:** IMPLEMENTED
> **Last Updated:** 2026-05-31
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The Feedback System is Answerlattice-scoped **customer support feedback collection infrastructure**. Users submit general feedback or ratings, product-area usage feedback, feature requests, and suggestions from the Help Center. Owners review those items under the Answerlattice workspace, optionally link each item to a Product Surface, and move important submissions into Support Board or an owner-approved answer proposal.

It also includes a generic content feedback system that handles likes/dislikes for articles, changelog entries, and future content types through a unified API.

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

### Feedback Submission Components
- `src/components/templates/main-app/helpCenter/ShareFeedbackView.tsx` — selectable feedback-category flow with direct submit
- `src/components/templates/main-app/helpCenter/GeneralFeedback.tsx` — Step 1: Star rating + comment (30 lines)
- `src/components/templates/main-app/helpCenter/FeatureUsage.tsx` — Product-area issues checklist
- `src/components/templates/main-app/helpCenter/FeatureRequests.tsx` — Feature request and support-improvement votes
- `src/app/(answerlattice)/answerlattice/help/page.tsx` — authenticated Answerlattice Help Center route with Share Feedback tab

### Owner Review Components
- `src/app/(answerlattice)/answerlattice/feedback/page.tsx` — Answerlattice owner feedback route
- `src/components/templates/answerlattice/feedback/AnswerlatticeFeedbackReview.tsx` — owner-scoped feedback review wrapper
- `src/components/templates/platform/feedbackAdmin/index.tsx` — reusable platform/owner feedback review template with Product Surface filtering and assignment
- `src/hooks/answerlattice/useSupportBoard.ts` — imports actionable `feedback` signals into Support Board when source sync is enabled

### Database Layer
- `src/database/feedback/index.ts` — Help Center feedback DAL, owner-scoped queries, Product Surface assignment, and feedback signal emission
- `src/database/feedback/genericFeedback.ts` — Unified content feedback router (131 lines)
- `src/database/contentFeedback/index.ts` — Article/changelog feedback with comments (68 lines)
- `src/lib/answerlattice/signalEmitter.ts` — non-blocking Answerlattice signal emission

### Types
- `src/types/feedback.ts` — Feedback interface (17 lines)
- `src/types/answerlattice/index.ts` — `ANSWERLATTICE_SIGNAL_TYPE.FEEDBACK`

### Hooks
- `src/hooks/useFeedback.ts` — Feedback state management

---

## Two Feedback Systems

### 1. Help Center Feedback (3-Step Wizard)
**Collection:** `feedback`
**Purpose:** Collect product/support experience, product-area usage issues, ratings, feature requests, and suggestions
**Data:** Rating, comments, feature issues, feature requests, popular request votes, optional Product Surface assignment
**Owner path:** `/answerlattice/feedback`
**Public website path:** `/product/feedback-review`
**Support path:** owner reviews at `/answerlattice/feedback` -> optional Product Surface assignment -> optional **Add to Support Board** -> owner links entity -> answer proposal if needed
**Signal path:** `feedback` submission -> `answerlattice_signalEvents(type='feedback')` -> Support Board signal sync / Signal Queue context

### 2. Content Feedback (Unified API)
**Collections:** `article_feedback/{tId}/{sId}`, `changelog_feedback/{tId}/{sId}`
**Purpose:** Likes/dislikes/comments on specific content items (articles, changelog entries)
**Router:** `genericFeedback.ts` routes to appropriate handler by content type

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-31 | 1.4.0 | Added optional Product Surface sorting/assignment for feedback review, Support Board surface carry-through, and compact widget-feedback context metadata |
| 2026-05-31 | 1.3.0 | Added public `/product/feedback-review` page and homepage/product preview treatment for Feedback Review |
| 2026-05-31 | 1.2.0 | Added owner-scoped `/answerlattice/feedback`, feedback signal emission, Support Board signal import, end-user create/self-read rules, and Answerlattice feedback indexes |
| 2026-05-31 | 1.1.0 | Reclassified feedback as Answerlattice-scoped Help Center feedback: `addFeedback()` writes through `answerlatticeRequestBodyComposer` and Answerlattice Firebase, with `/answerlattice/help` exposing the Share Feedback tab and `/platform/feedback-admin` reviewing submitted rows |
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 4 UI files, 3 DAL files, 1 type file |
