# VisualMeta - Mobile Support Plan

**Status:** Planning mobile support document
**Created:** May 31, 2026
**Product code:** `VM`

---

## 1. Mobile Admission Decision

VisualMeta needs mobile support, but mobile should not be the primary production workspace.

Mobile is valuable for:

- reviewing candidate content
- approving or rejecting assets
- adding short notes
- copying approved text
- downloading or sharing final kits where supported
- checking project readiness
- capturing quick source photos when allowed

Mobile is not the right surface for:

- large batch setup
- dense content-unit table management
- complex export configuration
- full image editing
- workspace administration
- billing setup

## 2. Required Mobile Workflows

| Workflow | Mobile support |
| --- | --- |
| View project status | Required |
| View content unit detail | Required |
| Compare source and candidate image | Required |
| Approve candidate | Required |
| Reject candidate with reason | Required |
| Add reviewer note | Required |
| Copy approved text | Required |
| Download final kit metadata | Required |
| Upload/capture simple source image | Allowed after Storage guardrails |
| Create large batch job | Desktop only |
| Configure billing | Desktop only |
| Manage workspace permissions | Desktop only |

## 3. Mobile UX Rules

Mobile screens must:

- use 44px minimum touch targets
- show one clear primary action at a time
- avoid dense multi-column tables
- make approval state visible without jargon
- show source image, candidate image, and key facts together
- make "Approve" and "Request changes" hard to confuse
- confirm irreversible export actions
- show upload/generation failures plainly
- never expose provider, token, or cost internals to normal users

## 4. Mobile Information Architecture

Suggested mobile tabs:

| Tab | Purpose |
| --- | --- |
| Review | Units waiting for approval or correction. |
| Approved | Units already approved for kit export. |
| Notes | Recent reviewer comments and requested changes. |
| Kits | Ready or exported kits. |

Avoid adding a full dashboard sidebar on mobile.

## 5. Review Detail Screen

The mobile review detail screen should include:

- content unit label
- source facts summary
- source image
- candidate image
- approved/rejected status
- generated text variants
- translation variants where present
- reviewer note field
- approve action
- request changes action
- stale-source warning

Do not hide source facts behind extra taps when approval is requested.

## 6. Data And Cost Rules

Mobile must use the same VisualMeta DAL and APIs as desktop.

Mobile must not:

- open separate Firestore listeners for every content unit
- fetch all project units at once
- upload unrestricted source files
- call generation providers directly from the client
- bypass credit checks
- write to MenuList or Canonica data

Use paginated reads and server-mediated provider calls.

## 7. Offline And Poor Network Behavior

Minimum behavior:

- project list can show last loaded state
- approval actions require online confirmation
- failed note/decision submissions show retry
- uploads show progress and can fail cleanly
- export downloads show unavailable state when signed URL expires

Do not queue approval decisions silently offline.

## 8. Accessibility

Mobile review must support:

- readable text sizes
- contrast-safe approve/reject states
- text labels in addition to icons for critical decisions
- screen-reader labels for image comparison controls
- visible focus states where applicable

## 9. Acceptance Criteria

Mobile support is acceptable when:

- reviewer can approve or reject a content unit from phone
- reviewer can see source facts before approval
- stale-source warning blocks mistaken approval
- approved text can be copied from phone
- final kit status can be checked from phone
- no mobile provider call bypass exists
- no mobile route appears inside MenuList owner navigation
- no mobile UI requires desktop-style table interaction

## 10. Documentation Cost

This mobile support plan creates no runtime cost.
