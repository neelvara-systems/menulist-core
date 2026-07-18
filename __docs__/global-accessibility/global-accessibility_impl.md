# Global Accessibility Implementation

## Shared shell

`src/components/shared/accessibility/SkipToContentLink.tsx` locates and focuses the first maintained main-content landmark. The desktop owner shell exposes a stable `main-content` target, while the website shell applies the same component to its first page landmark.

Viewport exports under `src/app/` no longer set `maximumScale: 1` or `userScalable: false`. Product-specific theme color and viewport-fit behavior remain unchanged.

## Shared interaction primitives

`src/components/mobile/antd.tsx` is the mobile interaction boundary:

- transparent/icon buttons inherit the shared minimum touch size;
- clickable list items and tags support Enter and Space;
- the navigation back control has an accessible name;
- floating actions accept an accessible name;
- common ARIA relationship and expanded-state properties pass through the shared button.

Screen-level icon actions add localized names where the shared primitive cannot infer intent. Time-slot color choices expose pressed state.

## Visual behavior

`public/styles/base/_accessibility.scss` supplies a visible focus ring, a focus-only skip link, and a reduced-motion override. It is imported once through the existing global stylesheet.

## Content alternatives

The maintained TSX tree was parsed for raw `img` elements. Font previews, platform store/tenant logos, and platform user profile images now provide alternatives; the verifier rejects future missing raw-image alternatives.
