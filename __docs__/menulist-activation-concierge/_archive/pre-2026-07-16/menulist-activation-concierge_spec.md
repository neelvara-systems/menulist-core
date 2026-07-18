# MenuList Activation Concierge - Specification

**Status:** Docs complete; runtime implementation gated
**Created:** June 24, 2026
**Related:** SignalDesk founder distribution research, public menu entry, menu extraction pipeline, messaging onboarding, starter activation

## Purpose

Activation Concierge turns a qualified interested business into a live MenuList customer link and two active customer surfaces within seven days.

The goal is not lead volume. The goal is activated businesses with a current list customers can actually open, share, and trust.

## Problem

SignalDesk can find, score, prepare, and route prospects. That is not enough if every interested owner still needs manual closing, manual onboarding, and manual proof creation.

The owner path must compress the work after interest:

```txt
send/upload current list
-> review preview
-> approve publish
-> copy/share/place customer link
-> complete two surfaces
-> generate proof
```

## Product Truth

MenuList already has the foundations:

- public `/create-menu` queues durable extraction jobs through `publicMenuDrafts`;
- claim/publish creates real tenant, store, project, project summary, and public URLs;
- starter activation has a 7-day window and two-action target;
- share and presence surfaces can record starter distribution signals;
- messaging onboarding has a provider-agnostic publish path for owner-approved messaging intake.

Activation Concierge should connect and guide these pieces. It should not rebuild them.

## North Star

```txt
published MenuList customer link + two customer surfaces activated within 7 days
```

Customer surfaces count only when the owner takes or confirms the action:

| Surface | Counts when |
| --- | --- |
| QR | QR is downloaded, printed, placed, or tested. |
| WhatsApp | Link is copied, shared, placed in profile, or sent by owner/staff. |
| Google/Profile | Owner marks the link placed on Google/Profile or equivalent listing. |
| Instagram | Owner marks bio/story/highlight/caption placement complete. |
| Website/link page | Owner adds the link to an existing public page. |
| Print/Menu Kit | Owner downloads or places print material. |
| Staff replies | Owner confirms staff use the link instead of old screenshots/PDFs. |

Do not count planned placement, internal preview, SignalDesk draft generation, or an unconfirmed external-platform change.

## In Scope

| ID | Requirement | Priority |
| --- | --- | --- |
| AC-01 | Show a guided post-publish activation checklist after public create-menu claim. | P0 |
| AC-02 | Reuse existing starter activation signals for copy, WhatsApp share, QR, Menu Kit, and presence confirmations. | P0 |
| AC-03 | Make the next best owner action obvious: copy link, share on WhatsApp, download QR/Menu Kit, mark Google/Profile, mark Instagram, or go to dashboard. | P0 |
| AC-04 | Track two unique activation actions within seven days. | P0 |
| AC-05 | Surface stuck states: preview not approved, published but no surface active, one surface active, deadline near. | P0 |
| AC-06 | Create a SignalDesk-observable outcome summary without allowing SignalDesk to write MenuList truth. | P0 |
| AC-07 | Generate proof candidates only from confirmed activation state and owner-permission status. | P1 |
| AC-08 | Support mobile-first activation actions for phone-only owners. | P0 |
| AC-09 | Keep all external placement instructions manual and owner-confirmed. | P0 |

## Out Of Scope

- New extraction model path.
- New public SignalDesk page.
- SignalDesk direct write to MenuList stores, projects, billing, menus, or public output.
- Cold messaging automation.
- Google Business Profile API publishing.
- Instagram/Meta publishing.
- WhatsApp provider send.
- Paid campaigns.
- CRM pipeline.
- Proof publication without owner approval.

## Primary User Stories

### Owner Creates A Current Link

1. Owner arrives from `/create-menu`, messaging onboarding, founder reply, partner intro, or SignalDesk route.
2. Owner uploads or links the current list.
3. MenuList prepares a preview.
4. Owner reviews and approves.
5. MenuList publishes a customer link.
6. Activation Concierge guides two surface actions.
7. Owner reaches activation when two unique actions are recorded within seven days.

### Founder Monitors Activation

1. SignalDesk routes or observes the MenuList outcome.
2. SignalDesk receives summary state only: upload started, preview ready, approved, published, one surface, activated, stalled, proof permission.
3. Founder sees whether the pod is producing activated businesses, not just replies.

### Partner Sends A Client

1. Partner sends an owner to the same current-list path.
2. Activation Concierge records source context when available.
3. Outcome can be attributed to partner in SignalDesk or a manual board.
4. Partner payout remains manual and owner-approved.

## States

| State | Meaning |
| --- | --- |
| `source_requested` | Owner has not submitted a current list yet. |
| `source_received` | Menu/photo/PDF/link exists. |
| `preview_preparing` | Extraction or setup is in progress. |
| `preview_ready` | Owner can review the prepared customer link. |
| `changes_requested` | Owner asked for correction before publish. |
| `approved` | Owner approved the preview. |
| `published` | Customer link exists. |
| `one_surface_active` | One unique activation action is recorded. |
| `activated` | Two unique activation actions are recorded within seven days. |
| `stalled` | Expected next action has not happened after a reasonable interval. |
| `expired` | Starter activation window ended without payment/recovery. |
| `closed` | Owner opted out, was not fit, or stopped. |

## Approved Owner Copy

Use:

- "current menu"
- "current list"
- "official customer link"
- "review before publishing"
- "one link for QR, WhatsApp, Google/Profile, Instagram, and repeat customers"

Avoid:

- "guaranteed sales"
- "automatic Google update"
- "AI-powered marketing"
- "we scraped your business"
- "we will post for you"
- "we are partnered with WhatsApp/Google/Instagram"

## Acceptance Criteria

Activation Concierge is ready for local trial when:

1. Owner can publish from a public draft or messaging session using existing truth-write paths.
2. Owner sees two-surface activation guidance immediately after publish.
3. Each activation action records through existing starter activation signal rules.
4. SignalDesk can observe outcome state through a summary bridge only.
5. No automated external send/post/publish is added.
6. No SignalDesk direct MenuList truth mutation is possible.
7. Mobile owner can complete the same activation actions with large touch targets.
8. Proof generation is held until confirmation and owner permission exist.

## Done From This Doc Pass

This doc set completes the research-to-feature planning work. Runtime implementation is not complete and must be scheduled as a separate implementation pass.
