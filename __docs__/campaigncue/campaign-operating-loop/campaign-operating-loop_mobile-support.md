# Campaign Operating Loop - Mobile Support

## Admission Decision

Accepted. Updating today's business state, confirming a destination, scheduling a staff task, and recording a result are frequent, short owner actions that are useful on a phone.

## Responsive Contract

- Owner Pulse controls use the existing responsive CampaignCue form grid.
- Inputs, selects, and buttons inherit the existing minimum 44px touch-target rules.
- Commercial policy, presence, language, schedule, and result fields collapse to one column at the existing mobile breakpoints.
- Dark mode, RTL direction, session, locale, timezone, sidebar shell, and header behavior remain inherited from the shared dashboard shell.
- Dense Creative Editor work remains desktop-first; mobile remains suitable for pack review, copy/download, pulse update, manual task scheduling, and result capture.
- Campaign Rhythm is a compact review/action surface on mobile: resolve approval, record result, open a due task, or rebuild one useful pack.
- **Reuse safely** rebuilds current truth on the server; mobile does not clone or edit old output JSON.
- Approve/reject controls remain 44px actions and rejected approval requires a short reason.

## Mobile Failure Rules

- A stale or expired pack stays blocked on mobile.
- Date-time inputs convert through the workspace timezone helpers.
- Long profile URLs and owner notes remain inside responsive fields and must not create horizontal page overflow.
- No mobile route creates a separate data loader or realtime listener.
- Pending/rejected approval remains visibly blocked before manual-use actions.
