# CampaignCue Product — Mobile Support Assessment

## Mobile Relevance Decision

**Decision:** YES for owner action flows, PARTIAL for agency/multi-location management, NO for heavy setup and advanced editing.

CampaignCue must work on mobile because WhatsApp download/share, campaign review, approval, asset upload, consent confirmation, and mark-posted are mobile-native business tasks.

## Admission Test

| Gate | Result | Notes |
| --- | --- | --- |
| Frequency | Pass | Owners may use campaign cues, WhatsApp downloads, approvals, and asset uploads weekly or daily. |
| Speed | Partial | Review/download/share can be under 5 seconds; full campaign setup/video editing is slower. |
| Touch | Pass for action flows | Cards, bottom sheets, large buttons, download/share/export fit thumb use. |
| Value | Pass | Owners and staff often handle WhatsApp/status/photo tasks away from a desk. |

## Mobile Scope

| Mobile allowed | Desktop preferred |
| --- | --- |
| View campaign cues | Full account setup |
| Generate small campaign pack | Bulk agency generation |
| Download WhatsApp-ready message | Advanced creative layer editing |
| Download/share status | Timeline video editing |
| Approve/request changes | Billing setup and role management |
| Upload photo/clip | Integration OAuth setup when complex |
| Confirm consent | Deep analytics dashboards |
| Mark posted | Large 30-day generation planning |

## Mobile UX Rules

- Use cards, lists, and bottom sheets.
- Keep touch targets at least 44px.
- Avoid dense tables, hover-only controls, and desktop canvas editing.
- Show trust status as Ready, Needs review, or Blocked.
- Keep export/download visible.
- Show credits before generation.

## Current Pass

No mobile code was changed. This document sets the implementation acceptance criteria.
