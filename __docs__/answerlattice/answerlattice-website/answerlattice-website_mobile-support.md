# AnswerLattice Website Mobile Support

> **Status:** Implemented source contract
> **Last audited:** July 19, 2026

## Scope

The public website is one responsive surface. It does not create a separate mobile data model, route family, onboarding API, pricing source, analytics contract, or product identity.

## Navigation

- The mobile trigger renders only after the sub-1280px client viewport is confirmed.
- The trigger identifies the navigation dialog with `aria-controls`.
- Opening the drawer moves focus to the close button.
- Tab and Shift+Tab stay inside the drawer.
- Escape and backdrop activation close it.
- Closing restores focus to the trigger when it remains mounted.
- One click handler owns activation; there is no duplicate touch-start handler.
- Body scroll is locked while the drawer is mounted.

## Forms

- Contact and onboarding use semantic forms and native submit behavior.
- Labels bind to controls.
- Email, URL, and telephone input types are explicit.
- Primary actions and navigation rows keep at least 44px targets.
- Server-matching maximum lengths prevent avoidable invalid submissions.
- Errors use alert/live semantics.
- The onboarding form requires at least one main product surface.

## Layout

The deterministic demo uses explicit `min-w-0`, horizontal stage overflow, and responsive grid collapse. Public copy and controls must remain usable at 390px width without horizontal page overflow.

## Verification

Local source checks cover markup, constraints, focus logic, route registry, demo boundaries, and TypeScript. Browser evidence must still cover:

- 390px and 430px screenshots;
- drawer open/close, focus loop, Escape, and restoration;
- keyboard-only onboarding/contact submission;
- light/system/dark themes;
- reduced motion;
- mobile payment-provider handoff;
- no overlap at 200% text zoom.
