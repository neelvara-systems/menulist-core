# WhatsAppOS — Mobile Support

> **Status:** Settings implementation complete; owner delivery activation remains gated
> **Last Updated:** August 15, 2026

## Scope

WhatsAppOS has no standalone owner application. Mobile surfaces belong to phone authentication, messaging onboarding and NotificationOS settings, all inside existing product shells.

## Phone Onboarding

1. Owner requests an OTP for the entered phone number.
2. WhatsAppOS sends an authentication-class template.
3. Owner verifies the code.
4. Product completes authentication.
5. After the canonical owner/store exists, a separate optional screen asks whether important account notifications may use WhatsApp. If the question is shown earlier, it remains a bounded onboarding choice and does not become active consent until that scope is created.

The final choice must be unticked by default and must not block onboarding.

## Settings

- Show verified number in masked form.
- Show consent state and last change in owner language.
- Allow grant/revoke through the shared NotificationOS DAL.
- Explain whether revoking notifications affects authentication before confirmation; never conflate the two.
- Provide a test message only after provider/template certification and apply rate limits.

## UX Requirements

- Use `MobileShell`, shared hooks and 44px targets.
- Preserve locale and RTL behavior.
- Do not reveal Meta IDs, template names or Graph errors.
- Use stable owner copy: “WhatsApp notifications are not available” rather than provider jargon.
- Recovery state must include a safe support path.

## Tests

- OTP works with notification opt-in skipped.
- Notification consent can be granted/revoked without changing verified phone state.
- Offline/retry does not create duplicate consent events or sends.
- Deep link returns to the correct mobile sub-screen.
- Screen-reader labels distinguish login code from account notification permission.
