# Answerlattice Guided Workflows Mobile Support

> **Status:** Implemented
> **Last verified:** 2026-07-18

## Admission

The end-user guide is admitted on mobile because it helps complete an immediate task in the existing widget. Procedure authoring remains an owner governance workflow and is not promoted as a dedicated mobile feature.

## Runtime Behavior

- Widget actions retain at least 44 px touch targets.
- Procedure steps use the existing vertical widget flow.
- Guidance controls wrap without horizontal scrolling.
- The host highlight is fixed, non-interactive, and does not intercept taps.
- Scroll-to-target respects reduced-motion preference.
- `100dvh` widget sizing and existing safe-area behavior remain unchanged.
- A missing target falls back to written instructions.
- The host allows a bounded 800 ms for asynchronously rendered mobile controls before reporting a target missing.
- **Still stuck** opens the same explicit support form and does not claim escalation until ticket creation succeeds.
- Route/context changes clear the guide rather than pointing at stale mobile UI.

## MenuList Reference State

MenuList mobile menu import, review, publish, and public-link controls now carry the same semantic target/event contracts as desktop. The Answerlattice widget is still intentionally hidden on MenuList mobile, so these calls safely return without changing behavior. Enabling a mobile guide later requires a separate UX and deployed-client smoke decision; instrumentation alone does not enable it.

## Mobile Risks

| Risk | Control |
|---|---|
| Control hidden behind a mobile drawer | Instrument the actual mobile control or omit the target |
| Desktop/mobile target drift | Reuse one semantic ID for equivalent controls only when they perform the same action |
| Virtual keyboard changes layout | Highlight is recalculated from the current target rectangle |
| Small target | Client product remains responsible for accessible touch size |
| Intrusive scrolling | Scroll occurs only after the user starts/continues a guide |

## Verification Boundary

Source-level responsive and touch contracts are verified. A real installed client page must still be tested on mobile Chrome and mobile Safari before that workspace is enabled.
