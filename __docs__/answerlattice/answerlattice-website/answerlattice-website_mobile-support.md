# AnswerLattice Website Mobile Support

> **Status:** Implemented source contract
> **Last audited:** August 27, 2026

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
- The drawer exposes two short groups only: Start here, and Learn and verify. Start here includes `Prepare your sources` to reach the primary human pre-onboarding page before installation. It does not duplicate every product feature and resource link from the desktop menus.
- Detailed routes remain reachable through Product and Resources, while the sticky drawer action uses `Build your first 10 answers`.

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

The homepage owner decision section uses one-column reading order on narrow screens:

1. eyebrow, heading, and supporting copy;
2. three linked owner outcomes with at least 44px touch targets;
3. the explicit no-automatic-publication boundary;
4. the product image below the decision content.

The private Knowledge Map is described on the public website but is not rendered as an interactive canvas there. Knowledge-governance product tabs may scroll inside their own container, but must not create document-level horizontal overflow.

## Installed App And Offline Recovery

- AnswerLattice management pages use the private dashboard manifest, not the public website manifest.
- On `answerlattice.com` and `canonica.app`, the installed app opens the host-root Activation route and uses root scope.
- On the shared local/platform host, it opens `/answerlattice/activation` and stays scoped to `/answerlattice/`, so it cannot capture MenuList or MyCodex routes.
- The manifest does not lock device orientation.
- The service worker is network-first and caches only the branded offline recovery page and public logo assets. It never writes workspace, ticket, conversation, knowledge, support, API, or provider responses to Cache Storage.
- The recovery screen respects light/dark system preference, safe-area insets, narrow widths, and a minimum 44px retry target.

## Verification

Local source checks cover markup, constraints, focus logic, route registry, demo boundaries, and TypeScript. Browser evidence must still cover:

- 390px and 430px screenshots;
- drawer open/close, focus loop, Escape, and restoration;
- keyboard-only onboarding/contact submission;
- light/system/dark themes;
- reduced motion;
- mobile payment-provider handoff;
- no overlap at 200% text zoom.
- install prompt and standalone launch on Android/Chromium and iOS Safari;
- offline reload reaches branded recovery, and reconnect/retry returns to Activation;
- Cache Storage contains no authenticated AnswerLattice data.

The July 29, 2026 implementation pass verified the owner decision section and knowledge-governance page at 390px and 1280px with no document-level horizontal overflow, loaded product media, and no browser console errors. Payment handoff, 200% text zoom, theme combinations, and full keyboard form behavior remain release-gate browser checks.
