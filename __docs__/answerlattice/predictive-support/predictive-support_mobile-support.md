# Predictive Support Mobile Support

**Status:** Shared responsive widget runtime; external device proof pending
**Last verified:** July 18, 2026

## Customer runtime

Predictive support uses the existing responsive Answerlattice widget iframe. The same strict suggestion, context, runtime-token, and interaction contracts apply on desktop and mobile browsers.

The host can suppress the widget through its existing mobile visibility configuration. When hidden, denied, disabled, or moved to a new context, the loader clears the pending suggestion.

## Mobile requirements

- Do not render a second predictive overlay outside the widget.
- Keep the cue dismissible and non-blocking.
- Do not cover host navigation or primary actions.
- Clear stale cues on single-page-app route/workflow changes.
- Preserve 44px touch targets through the existing widget controls.
- Never require hover.
- Do not send raw mobile screen, clipboard, form, or account state.

## Owner management

Predictive trigger and known-issue management remain management workflows. The current source reuses responsive Answerlattice surfaces; no separate native mobile mutation contract was added.

## External proof still required

- real iOS Safari and Android Chrome host behavior;
- keyboard and viewport changes;
- safe-area and small-screen overlap;
- touch dismissal/opening;
- route changes in real mobile single-page apps;
- accessibility and reduced-motion review.

MenuList mobile intentionally suppresses its widget, so it is not evidence for general mobile-host support.
