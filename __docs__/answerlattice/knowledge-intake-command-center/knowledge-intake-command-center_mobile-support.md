# Knowledge Intake Command Center — Mobile Support

> **Status:** IMPLEMENTED — responsive owner-screen contract
> **Version:** 1.2.2
> **Created:** 2026-05-31
> **Audience:** Mobile / Frontend / QA

---

## Mobile Decision

Mobile support is required for monitoring, review, and lightweight approvals. Bulk file management, ZIP uploads, multi-source selection, and large multi-destination publish review are desktop-preferred.

Rationale:

- founders may review launch decisions from a phone
- expensive file/media source setup needs clearer desktop affordances
- high-risk approvals must be readable and deliberate
- mobile should not hide cost/retention warnings

---

## Mobile Admission Gates

| Gate | Decision |
| --- | --- |
| Frequency | Owners may check progress and approve decisions often during launch. Mobile supported. |
| Speed | Summary and review item reads must be bounded. Mobile supported. |
| Touch | Review cards, accept/edit/reject, source status, and publish controls must use 44px targets. |
| Owner value | Mobile is useful for decisions, not bulk import setup. Partial action set accepted. |

---

## Mobile Allowed Actions

- View intake summary
- View current job status
- View bounded source list and status
- Review one decision at a time
- Accept, edit, or reject a review item when authorized
- View source evidence excerpts
- Publish accepted items when authorized

Source deletion, deferred review status, automatic risk-tier approvals, and topic readiness are not current Knowledge Intake actions.

---

## Desktop-Preferred Actions

- selecting many website pages
- uploading multiple supported files
- uploading media/video/audio
- mapping many product surfaces
- reviewing large draft batches
- editing long article content
- large multi-destination publish review

Mobile UI can show "Continue on desktop" for these actions.

---

## Responsive Layout

Mobile route:

- sticky header
- summary cards first
- current single-screen sections stack vertically
- source and review rows must remain readable without horizontal overflow
- review queue is a single-column list
- evidence/details use the existing responsive modal/drawer behavior
- publish and review actions require clear confirmation/state feedback

No horizontal overflow.

---

## Mobile Cost Rules

- Mobile dashboard reads `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` first.
- Mobile must not load source, review, or job lists until the owner opens the related screen.
- Mobile summary cards use the embedded urgent review preview instead of querying the review queue on first paint.
- Review list is paginated and capped.
- No realtime listener on mobile review lists.
- Active progress can poll on a slow interval while the screen is visible.
- Upload progress should not keep background mobile sessions alive indefinitely.

---

## Accessibility

- Minimum 44px touch targets.
- Browser file selection should be exposed through a 44px `Choose files` button on mobile instead of relying on the native unstyled file input.
- Clear color contrast in light/dark themes.
- Source risk labels must not rely on color alone.
- Approve/reject controls require text labels.
- Evidence excerpts must wrap and be scrollable.
- Long filenames and URLs must truncate with accessible full text.

---

## Test Matrix

| Device class | Required check |
| --- | --- |
| iPhone small | No horizontal overflow, review cards readable, sticky actions visible. |
| iPhone large | Source cards and readiness topics fit without clipping. |
| Android mid-size | File/source names wrap or truncate cleanly. |
| Tablet | Two-column summary may be used; no desktop table overflow. |
| Dark mode | Parent cards, source risk labels, and action buttons remain readable. |
| Light mode | Same as dark mode; avoid stale theme styles after toggle. |

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial mobile support contract for Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added summary-first mobile loading and urgent-review preview rules. |
| 2026-06-11 | 1.1.1 | Added the mobile-friendly file selection requirement and aligned the implemented intake screen with a visible 44px file chooser plus clearer first-run empty states. |
| 2026-07-17 | 1.2.0 | Required bounded source evidence and applicability to appear before 44px review decision controls on mobile. |
| 2026-07-18 | 1.2.1 | Removed the unimplemented persisted publish-manifest implication from the mobile contract. |
| 2026-07-18 | 1.2.2 | Removed unimplemented topic-readiness, delete, defer, and risk-tier mobile actions; aligned to the shared responsive review flow. |
