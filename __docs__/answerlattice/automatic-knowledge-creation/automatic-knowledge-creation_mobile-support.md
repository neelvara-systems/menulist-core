# Automatic Knowledge Creation - Mobile Support

> **Assessment:** Shared runtime supported; full governance review remains desktop-first

## Mobile Impact

- Signal admission and scheduler work are device independent.
- Ticket resolution from a mobile-compatible support surface may emit the same bounded signal event.
- The proposal review UI is responsive, but long-form factual review, source comparison, procedure editing, and scope/version validation are better suited to desktop.
- No separate mobile data model, route, or mutation authority is allowed.

## Mobile Requirements

- Reuse the same proposal DAL and governance server.
- Preserve large touch targets and readable pending/failed states.
- Do not reduce review evidence or bypass approval because of viewport size.
- If a draft cannot be safely reviewed on mobile, direct the user to continue in the governance workspace rather than offering a simplified approval.
