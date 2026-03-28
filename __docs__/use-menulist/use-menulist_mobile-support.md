# Use MenuList — Mobile Support

> **Version:** 1.0

## Feature Admission Test

| Gate | Result | Reason |
|------|--------|--------|
| Frequency | PASS | Owners copy menu links daily from their phone |
| Speed | PASS | Copy link < 3 seconds, download < 10 seconds |
| Touch | PASS | Large buttons, single-tap actions |
| Value | PASS | Owners are IN the restaurant when they need this |

**Verdict:** PASS — Mobile is the PRIMARY surface for this feature.

## Mobile Architecture

- Desktop: antd components + responsive layout
- Mobile: Same page, responsive design (not separate mobile screen)
- The page is inherently mobile-friendly (large buttons, simple cards, vertical stack)

## Mobile UX Requirements

1. Quick Actions buttons: min 48px height, full-width on mobile
2. Copy confirmation toast visible at bottom
3. Cards stack vertically on < 768px
4. Download triggers native file save dialog
5. Preview modals scale to viewport
6. No horizontal scrolling

## Why Not a Separate Mobile Screen

This page is already designed mobile-first:
- Large tap targets
- One-column layout on mobile
- Simple copy/download actions
- No complex interactions

A separate `MobileUseMenuListScreen.tsx` would duplicate logic without benefit.
