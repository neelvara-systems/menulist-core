# NotificationOS — Mobile Support

> **Status:** Implemented in `MobileShell`; provider-dependent options remain gated
> **Last Updated:** August 23, 2026

## Admission Decision

Mobile support is required because MenuList phone onboarding and WhatsApp preference/consent are frequent, owner-controlled actions. The UI must be a layer over the shared DAL and NotificationOS policy; it must not create a second mobile notification system.

## Mobile Surfaces

| Surface                 | Required behavior                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone onboarding        | OTP verification remains separate; optional WhatsApp notification opt-in appears only after verification and is committed after canonical owner/store creation |
| Google/email onboarding | Confirm real email; offer WhatsApp setup without blocking product use                                                                                          |
| More / Settings         | Show channel preference and separate WhatsApp consent; provider delivery remains fail-closed when configuration or certification is absent                     |
| Recovery                | Explain missing/revoked channel without exposing provider details                                                                                              |

## UX Rules

- Use `MobileShell` sub-screen state, shared hooks and shared DAL.
- Minimum 44px touch targets and immediate feedback.
- Never pre-check WhatsApp opt-in.
- Explain that login codes may arrive on WhatsApp while product notifications require a separate choice.
- Display email as unavailable when only an internal generated auth email exists.
- Changes must be optimistic only where the server can safely validate and roll back.
- No desktop-route redirect, forced reload or parallel Firestore query.

## Required States

- Email verified / missing / internal-only / suppressed.
- Phone verified / missing.
- WhatsApp notifications allowed / not allowed / revoked / unavailable.
- Email only / WhatsApp only / both / use preferred available.
- Save in progress, saved, failed with retry, and policy-disabled.

New empty/recovery states must follow the contextual state illustration rules. Healthy settings rows remain plain.

## Mobile Test Matrix

- Phone-only new owner opts in and later revokes.
- Phone-only new owner skips opt-in and still completes onboarding.
- Google owner uses email only.
- Google owner adds WhatsApp and selects both.
- Generated auth email is never shown or selected.
- RTL, locale, dynamic text, keyboard, offline and narrow viewport behavior.
- Desktop and mobile write identical consent/preference contracts.

## Journey Closure — August 15, 2026

- Desktop Business Settings and Mobile More expose the same delivery modes, readiness states, permission control and save contract.
- Both surfaces show masked verified sign-in contacts; public business contact fields are explicitly not presented as verified notification destinations.
- Unavailable channel combinations are disabled before save, while consent withdrawal remains available even when the provider is disabled or the contact is no longer eligible.
- Save stays disabled until the owner changes a value, avoiding an unnecessary Firestore write for an unchanged form.
- `preferred_available` accepts a verified email without forcing WhatsApp setup and falls back to the first eligible channel.
- New stores open with Email and WhatsApp selected as the default routing policy. The owner still controls a separate WhatsApp permission switch; an unverified number or missing consent keeps WhatsApp ineligible without blocking eligible email.
