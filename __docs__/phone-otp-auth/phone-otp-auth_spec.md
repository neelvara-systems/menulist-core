# Phone OTP Auth Spec

## Goal

Make the primary owner authentication flow work for phone-first SMB owners while keeping MenuList cost, security, and account ownership controlled.

## Entry Points

- Public create-menu flow: owner verifies phone before free extraction.
- Dashboard login: owner verifies phone to access an existing business account.
- Existing fallback paths: Google OAuth, password/passcode credentials, staff ID.

## Required Behavior

- A phone number receives one WhatsApp OTP per accepted send request.
- The OTP send request includes country metadata (`countryCode`, `dialCode`) and normalizes the recipient to international digits before calling WhatsApp.
- Owner-facing phone inputs use a country dropdown backed by the existing MenuList country list instead of asking owners to type dial codes manually.
- OTP expires after 5 minutes.
- OTP challenge allows at most 5 verification attempts.
- A verified OTP returns a short-lived login token.
- NextAuth consumes the login token once and creates the normal MenuList session.
- Existing user records are reused by `phoneUsername`, `phone`, `phoneNumber`, or generated internal email.
- Verified phone profiles persist `countryCode`, `dialCode`, `phone`, `phoneNumber`, and `phoneUsername` when available.
- Auth, staff, reseller onboarding, create-menu claim, messaging onboarding, profile, business settings, public menu, PWA shortcuts, and OBP destination links use the same phone normalizer.
- New first-time phone owners get a verified active owner profile with no tenant/store until onboarding or create-menu publish attaches one.

## Non-Goals

- No anonymous extraction.
- No separate phone-auth session model.
- No owner-facing choice between multiple OTP providers.
- No new Firebase client read/write access to OTP collections.

## Security

- Public OTP routes validate input with Zod.
- Send and verify are separately rate limited.
- OTPs and login tokens are HMAC hashed before storage.
- Login tokens are one-time use and expire after 10 minutes.
- Raw OTP is never logged.
