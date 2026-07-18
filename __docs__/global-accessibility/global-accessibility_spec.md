# Global Accessibility Specification

## Required behavior

1. App and public surfaces must allow browser and operating-system zoom.
2. Interactive controls must be native controls or expose equivalent keyboard behavior, role, and focusability.
3. Keyboard focus must be visible across owner, mobile, website, and public surfaces.
4. Owner and website shells must provide a keyboard skip path to primary content.
5. Shared mobile actions must retain at least a 44-pixel touch target, including icon-only and transparent buttons.
6. Icon-only actions require an accessible name; stateful choices expose state where applicable.
7. Raw content images require meaningful alternative text. Decorative images use an empty alternative only when they convey no information.
8. Reduced-motion preferences must suppress non-essential animation and smooth scrolling without removing content or actions.
9. Accessibility changes must not change authorization, persistence, public truth, billing, AI, publish, or navigation outcomes.

## Non-goals

- No alternate accessibility-only application.
- No new owner setting for browser or OS preferences.
- No dependency or design-system replacement.
- No claim that source checks replace authenticated keyboard, screen-reader, zoom, contrast, and device testing.
