# Answerlattice Ticket and Conversation Mobile Support

> **Last verified:** July 19, 2026

## Current surfaces

| Surface | Mobile status |
|---|---|
| Embedded widget support handoff | Responsive iframe form with 44px actions |
| `/answerlattice/support` | Responsive web workspace surface; no separate native/mobile DAL |
| `/answerlattice/conversations` | Responsive web management surface |
| `/platform/support-tickets` | Available to authorized internal platform users through the existing mobile internal shell |
| Email notifications | Open in the browser; no reply-by-email |
| Push notifications | Not implemented |

## Shared contracts

Mobile and desktop must use the same:

- `src/database/tickets/index.ts` transactions and acknowledgement helpers;
- `src/lib/answerlattice/supportTicketLifecycle.ts` validation and limits;
- `src/types/supportTicket.ts` lifecycle and operational indicator;
- `pId/tId/sId` permission boundary;
- attachment MIME/size/path rules;
- explicit support handoff and server-derived email authority.

No mobile client may optimistically claim ticket creation, reply, status change, or escalation before the persisted acknowledgement succeeds.

## Interaction requirements

- Primary controls remain at least 44px.
- Reply input and submit action remain reachable above the keyboard.
- Tables/drawers must stay within viewport width.
- Attachment selection communicates type/size rejection.
- Destructive actions retain confirmation.
- Failure copy distinguishes unsaved action from a saved ticket whose email notification failed.
- Widget handoff remains dismissible and does not interrupt known-answer guidance.

## Boundary

Do not add a separate mobile ticket backend, native SDK, push subsystem, swipe-to-close mutation, or background attachment sync for this feature. A dedicated owner-mobile ticket screen should be considered only after evidence shows the responsive support surface blocks real usage.

## Manual evidence still required

- iOS Safari and Android Chrome attachment selection;
- keyboard behavior during replies;
- widget support form at narrow width;
- ticket detail drawer and internal queue in the mobile shell;
- screen-reader labeling and focus return after modal close.
