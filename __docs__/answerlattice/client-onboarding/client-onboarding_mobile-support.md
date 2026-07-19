# Answerlattice Client Onboarding — Mobile Support

> **Last Audited:** 2026-07-19

## Scope

Client onboarding is a responsive public Answerlattice website flow, not a MenuList owner `MobileShell` feature. It requires no separate native/mobile data layer.

## Required Behavior

- Authentication, form controls, plan/currency selection, consent rows, submit, checkout, and next-step actions retain at least 44px touch targets.
- Content must fit a 390px viewport without horizontal scrolling.
- Browser response parsing, recovery codes, one-time key handling, and checkout-host validation are identical on mobile and desktop.
- Product URLs are admitted only over HTTP(S) and cannot contain embedded credentials on either surface.
- Opening provider checkout must use `noopener,noreferrer`.
- Copyable credentials must wrap without expanding the viewport.
- A backgrounded or refreshed browser can retry the same details and recover persisted `payment_pending` truth.

## Mobile Failure Paths

- Do not auto-submit after a connectivity change.
- Do not infer failure when the browser loses the response.
- Show provider-recovery guidance before inviting another submission.
- When the fixed terminal-checkout code is returned, explain that the old checkout cannot be reused and let the founder submit the same details again.
- If the one-time key was lost during navigation, direct the founder to rotate it rather than attempting recovery.

## Verification

Local source checks cover control sizing and response behavior. Real Google OAuth, provider checkout, browser back/forward behavior, keyboard coverage, password-manager interaction, and screen-reader QA on physical iOS/Android devices remain external evidence.
