# SignalDesk Outcome Bridge - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Objective

Measure whether SignalDesk activity leads to meaningful MenuList outcomes while preserving MenuList as the source of truth.

## Goals

1. Create safe route tokens for approved growth actions.
2. Record outcome events from MenuList-controlled surfaces or manual operator confirmation.
3. Attribute outcomes back to target, source, channel, campaign/action, and conversation.
4. Prevent SignalDesk from mutating MenuList store/menu truth directly.
5. Produce summary metrics for activation and growth learning.

## Non-Goals

- No replacement of MenuList onboarding.
- No direct Firestore writes to MenuList store/menu documents.
- No owner/customer UI inside SignalDesk.
- No public SignalDesk route.
- No attribution model that rewards send volume over real outcomes.

## Outcome Events

| Event | Meaning |
| --- | --- |
| `current_list_received` | Prospect submitted or shared a current list/menu/service list. |
| `preview_prepared` | MenuList preview was prepared for review. |
| `owner_approved` | Owner approved core public output. |
| `public_link_published` | MenuList public link went live. |
| `qr_downloaded` | QR or share material was downloaded or prepared. |
| `whatsapp_link_copied` | WhatsApp/share link was copied from MenuList surface. |
| `google_profile_placement_marked_done` | Operator marked profile/menu link placement as complete. |
| `paid_plan_started` | Prospect became a paid MenuList account. |
| `partner_lead_created` | Partner/referral opportunity was created. |
| `multi_location_review_started` | Multi-location opportunity entered review. |

## Requirements

| ID | Requirement |
| --- | --- |
| OUT-001 | Every route token must have scope, expiry, target, and source action. |
| OUT-002 | Outcome events must be append-only. |
| OUT-003 | Outcome summaries must be derived from events, not hand-edited. |
| OUT-004 | MenuList writes must happen only through approved MenuList systems. |
| OUT-005 | Attribution must handle multiple touches without overwriting history. |
| OUT-006 | Operator-entered outcomes require evidence note or linked MenuList record. |
| OUT-007 | Route tokens must not expose internal target IDs publicly. |

## Attribution Rules

- First-touch, last-touch, and assisted-touch values may be stored, but summaries must show the method used.
- Suppressed or invalid outreach must not receive positive attribution.
- Anonymous customer activity alone must not create a prospect.
- Manual operator attribution requires audit.

## Acceptance Criteria

- Approved email/export action can include a scoped route token.
- MenuList outcome event can be linked back to SignalDesk target and action.
- Duplicate outcome events do not inflate summaries.
- SignalDesk cannot update MenuList store/menu truth through this bridge.
