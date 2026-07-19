# Feedback System — Feature Documentation

> **Status:** IMPLEMENTED
> **Last Updated:** 2026-07-19
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The Feedback System is Answerlattice-scoped **customer support feedback collection infrastructure**. Users submit general feedback or ratings, product-area usage feedback, feature requests, and suggestions from the Help Center. Owners review those items under the Answerlattice workspace, optionally link each item to a Product Surface, and move important submissions into Support Board or an owner-approved answer proposal.

It also includes a governed content-reaction system for published articles, changelog entries, and FAQs. Authenticated reactions pass through one protected server route that updates the source counter, a bounded audit, server-authoritative active-actor state, and any negative-feedback signal atomically. Workflow reactions are deliberately unsupported.

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
- `src/components/templates/main-app/helpCenter/GeneralFeedback.tsx` — Step 1: Star rating + bounded comment
- `src/components/templates/main-app/helpCenter/FeatureUsage.tsx` — Product-area issues checklist
- `src/components/templates/main-app/helpCenter/FeatureRequests.tsx` — Feature request and support-improvement votes
- `src/app/(answerlattice)/answerlattice/help/page.tsx` — authenticated Answerlattice Help Center route with Share Feedback tab

### Owner Review Components
- `src/app/(answerlattice)/answerlattice/feedback/page.tsx` — Answerlattice owner feedback route
- `src/components/templates/answerlattice/feedback/AnswerlatticeFeedbackReview.tsx` — owner-scoped feedback review wrapper
- `src/components/templates/platform/feedbackAdmin/index.tsx` — reusable platform/owner feedback review template with Product Surface filtering and assignment
- `src/hooks/answerlattice/useSupportBoard.ts` — imports actionable `feedback` signals into Support Board when source sync is enabled

### Database Layer
- `src/database/feedback/index.ts` — Help Center feedback API client, owner-scoped queries, and Product Surface assignment
- `src/lib/answerlattice/feedbackBoundary.ts` — exact submission request/result, persisted-record, and document-ID runtime boundary shared by the client and server
- `src/app/api/answerlattice/feedback/route.ts` — authenticated, rate-limited, body-capped Help Center feedback submission route
- `src/lib/answerlattice/feedbackSubmissionServer.ts` — deterministic server-owned feedback write, replay fingerprint, and identity-minimized signal handoff
- `src/database/feedback/genericFeedback.ts` — Fixed article/changelog/FAQ content-feedback router; workflow reactions fail closed
- `src/database/contentFeedback/index.ts` — Validated content-feedback client, bounded response reader, scoped audit reader, and retry idempotency state
- `src/app/api/answerlattice/content-feedback/route.ts` — Authenticated, rate-limited, body-capped content-feedback mutation route
- `src/lib/answerlattice/contentFeedbackServer.ts` — Server-owned article/changelog/FAQ counter, bounded actor state, audit, idempotency, and signal transaction
- `src/lib/answerlattice/signalEmitter.ts` — non-blocking Answerlattice signal emission

### Types
- `src/types/feedback.ts` — Normalized persisted Feedback interface
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

### 2. Content Feedback (Protected API)
**Collections:** `article_feedback/{tId}/{sId}`, `changelog_feedback/{tId}/{sId}`, `faq_feedback/{tId}/{sId}`
**Purpose:** Likes/dislikes and optional comments on exact published articles, changelog entries, and FAQs
**Mutation path:** `genericFeedback.ts` -> client validation -> `/api/answerlattice/content-feedback` -> one server transaction with server-authoritative active-actor state
**Read path:** authorized knowledge/support operators can open the bounded audit for one content item; customer reaction controls use aggregate counters
**Boundary:** reaction evidence is a signal, not approved product truth; direct client writes and workflow reactions are denied

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-19 | 1.9.0 | Moved Help Center creation behind a fail-closed authenticated server route with deterministic replay handling; blocked direct client creates; excluded widget-only roles from private review; added bounded server-authoritative reaction actor state; hid internal state documents; and labeled owner metrics as the latest loaded 200-row window |
| 2026-07-19 | 1.8.0 | Restricted shared feedback reads to support-control or exact-self access, added submit/reaction retry safety and mobile touch parity, reconciled optimistic counters to server authority, removed identity duplication from derived Help Center signals, and aligned docs with FAQ reactions plus the protected server transaction |
| 2026-07-11 | 1.7.0 | Partitioned browser reaction acknowledgement by tenant, store, user and content type; added an identity-bearing runtime envelope, invalid-cache eviction, bounded null-prototype maps and workspace-switch state reset |
| 2026-07-11 | 1.6.0 | Coupled article/changelog counters and actor audit rows in one transaction, made audit history exact-append and immutable at its cap, normalized audit reads, and blocked duplicate in-flight UI mutations |
| 2026-07-11 | 1.5.0 | Added exact runtime normalization, bounded shared field lists/text, fail-closed persisted-record reads, payload-shape Firestore rules, field-confined support updates, and dedicated rules/runtime regression gates |
| 2026-05-31 | 1.4.0 | Added optional Product Surface sorting/assignment for feedback review, Support Board surface carry-through, and compact widget-feedback context metadata |
| 2026-05-31 | 1.3.0 | Added public `/product/feedback-review` page and homepage/product preview treatment for Feedback Review |
| 2026-05-31 | 1.2.0 | Added owner-scoped `/answerlattice/feedback`, feedback signal emission, Support Board signal import, end-user create/self-read rules, and Answerlattice feedback indexes |
| 2026-05-31 | 1.1.0 | Reclassified feedback as Answerlattice-scoped Help Center feedback: `addFeedback()` writes through `answerlatticeRequestBodyComposer` and Answerlattice Firebase, with `/answerlattice/help` exposing the Share Feedback tab and `/platform/feedback-admin` reviewing submitted rows |
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 4 UI files, 3 DAL files, 1 type file |
