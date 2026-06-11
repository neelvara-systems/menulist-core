# Knowledge Intake Command Center — Mobile Support

> **Status:** IMPLEMENTED — responsive owner-screen contract
> **Version:** 1.0.0
> **Created:** 2026-05-31
> **Audience:** Mobile / Frontend / QA

---

## Mobile Decision

Mobile support is required for monitoring, review, and lightweight approvals. Bulk file management, ZIP uploads, multi-source selection, and complex publish manifests are desktop-preferred.

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
| Touch | Review cards, approve/reject, source status, and readiness must use 44px targets. |
| Owner value | Mobile is useful for decisions, not bulk import setup. Partial action set accepted. |

---

## Mobile Allowed Actions

- View intake summary
- View current job status
- View source audit summary
- View readiness by topic
- Review one decision at a time
- Approve/reject/defer low-risk decisions
- Approve high-risk decisions only with explicit confirmation
- View source evidence excerpts
- Retry failed source normalization when safe
- Delete a source only with confirmation

---

## Desktop-Preferred Actions

- selecting many website pages
- uploading multiple supported files
- uploading media/video/audio
- mapping many product surfaces
- reviewing large draft batches
- editing long article content
- publish manifest review for many destinations

Mobile UI can show "Continue on desktop" for these actions.

---

## Responsive Layout

Mobile route:

- sticky header
- summary cards first
- tabs become segmented controls or stacked sections
- source table becomes cards
- review queue is a single-column list
- readiness by topic is a compact list
- evidence drawer uses full-screen sheet
- destructive actions require modal confirmation

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
