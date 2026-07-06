# Phone OTP Auth Implementation

## Runtime Flow

1. Owner opens `/signin`; Google remains first, then the existing login form asks for one identity value.
2. If the identity looks like a phone number, the form embeds `PhoneOtpAuthPanel` as the active phone row, with country dial code and number aligned together, and offers WhatsApp OTP as the primary action.
3. If the owner chooses passcode instead, or if the identity is email/staff ID, the same form shows the password/passcode field.
4. `PhoneOtpAuthPanel` sends `phone`, `countryCode`, and `dialCode`; dashboard embedded mode syncs phone-row edits back to the identity value and defaults to India unless the owner entered an international `+...` number.
5. `POST /api/auth/phone-otp/start` rate-limits by IP before reading the body, rejects bodies above 1KB, validates, then rate-limits by normalized phone hash.
6. `createPhoneOtpChallenge()` normalizes to E.164, stores a server-only challenge with country metadata, and sends WhatsApp OTP.
7. Owner submits code to `POST /api/auth/phone-otp/verify`.
8. The verify route rate-limits by IP before reading the body, rejects bodies above 1KB, validates, then rate-limits by challenge hash.
9. `verifyPhoneOtpChallenge()` checks TTL, attempts, and HMAC hash.
10. The helper reuses or creates a `users` profile and stores a one-time login token.
11. Browser calls `signIn('credentials', { phoneOtpLoginToken })`.
12. NextAuth `CredentialsProvider.authorize()` consumes the token, loads the user, applies block-state inheritance, and returns the existing minimal session user shape.
13. Dashboard login continues to sync Firebase Auth through `/api/auth/set-claims`.

Start-route custom errors are mapped through a client-safe response helper. Invalid phone input can return "Enter a valid phone number."; delivery and unexpected custom failures return "Could not send code. Please try again." while the internal code is logged with secure logging. The route does not return raw `PhoneOtpError.message` text to the browser.

Unexpected start/verify route failures and consumed-token user mismatches are logged through `src/lib/auth/authDiagnostics.ts` with stable `phone_otp_*` failure codes, source error name/code/status, and bounded request/user metadata only. Expected `PhoneOtpError` branches still log code-only and return fixed client-safe copy. The shared `PhoneOtpAuthPanel` also allowlists local send/verify/account-open failure copy, so browser fetch errors or unexpected exception text are not shown to owners.

June 29 follow-up: `PhoneOtpAuthPanel` parses start and verify responses through `readJsonResponseWithLimit()` with an 8KB cap. Malformed or oversized responses log `phone_otp_response_parse_failed` with bounded action/status metadata only. Successful start responses must include `success: true` and a non-empty `challengeId`; successful verify responses must include `success: true` and a non-empty `loginToken`. Invalid acknowledgement shapes log `phone_otp_response_invalid` and still show the existing fixed send/verify failure copy.

July 1 acknowledgement follow-up: the start route now returns `action: "start"` and the accepted purpose, and the verify route returns `action: "verify"` with the verified challenge id. `PhoneOtpAuthPanel` requires those acknowledgements before showing code entry or using the login token. Challenge creation, OTP verification, token consumption, WhatsApp delivery, NextAuth credentials login, and Firebase Auth claim sync are unchanged.

July 5 challenge ID boundary: the verify route and `verifyPhoneOtpChallenge()` now share `normalizePhoneOtpChallengeId()` from `src/lib/auth/phoneOtp.ts`. Valid challenge IDs keep the Firestore auto-ID shape created by `createPhoneOtpChallenge()`. Malformed, reserved, or path-shaped challenge IDs fail before challenge-specific throttling, `authPhoneOtpChallenges/{challengeId}` reads, OTP hash comparison, or login-token writes. Valid OTP challenge creation, verification, login-token consumption, WhatsApp delivery, NextAuth credentials login, and Firebase Auth claim sync are unchanged.

Phone OTP User Document ID Boundary: `src/lib/auth/phoneOtp.ts` now validates existing and resolved user document IDs through `normalizePhoneOtpUserDocumentId()` before updating `users/{userId}`, writing the login-token `userId`, or comparing the consumed login token to the resolved auth user. Malformed, reserved, empty, whitespace-mutated, path-shaped, or oversized user IDs fail with the existing user-not-found path before user document refs or token handoff trust. Valid OTP user lookup, deterministic first-time phone user creation, login-token creation, token consumption, NextAuth credentials login, and Firebase Auth claim sync are unchanged.

## User Resolution

Existing user lookup order:

- `username`
- `loginUsername`
- `phoneUsername`
- local `phoneNumber` only when stored `dialCode` or `countryCode` matches the normalized OTP country
- `phone`
- `phoneNumber`
- generated internal email from phone digits

New first-time OTP users receive:

- `email`: generated internal `msg.menulist.online` email
- `isVerified: true`
- `active: true`
- `platformRole: OWNER`
- `role: owner`
- `tenantId: null`
- `storeId: null`
- `phoneLoginEnabled: true`

## Phone Storage Contract

Phone values are normalized through `src/lib/phone/phoneNumber.ts` before auth, staff, reseller onboarding, create-menu claim, messaging onboarding, profile, business settings, and public call/WhatsApp links use them.

Persist both display metadata and canonical lookup fields:

- `countryCode`: selected or inferred country code, defaulting to `IN` when no country is known
- `dialCode`: selected or inferred dial code, such as `+91`
- `phoneNumber`: local/display number without the dial code when it can be separated
- `phone`: canonical E.164 value, such as `+919876543210`
- `phoneUsername`: digits-only international lookup and WhatsApp delivery key, such as `919876543210`

Rules:

- Dropdown country selection wins over stale stored `dialCode`.
- Explicit international input beginning with `+` or `00` wins over the selected/default country.
- WhatsApp API calls use `phoneUsername` / international digits, not local `phoneNumber`.
- `tel:` links use canonical `phone`.
- Public menu and OBP WhatsApp links use the shared normalizer so local stored numbers still produce international `wa.me` destinations.

## WhatsApp Delivery

The sender reuses `sendOwnerNotificationWhatsApp()`.

The WhatsApp Graph API recipient is digits-only international format. The OTP normalizer builds that value from:

- explicit `+...` phone input, or
- selected `dialCode` + local phone number, or
- legacy bare 10-digit India numbers for backward compatibility.

Production should provide:

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_OTP_TEMPLATE_NAME`
- `WHATSAPP_OTP_TEMPLATE_LANGUAGE` optional, defaults to `en`

Free-text fallback is only used when `WHATSAPP_OTP_ALLOW_TEXT_FALLBACK=true`.

Local-only testing helpers:

- `PHONE_OTP_DEV_SKIP_SEND=true`
- `PHONE_OTP_DEV_CODE=123456`
- `PHONE_OTP_DEBUG_RESPONSE=true`

The debug code response is guarded to non-production runtime.

## Feature Flag

`FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH` gates:

- UI rendering
- start route
- verify route
- token consumption

## Compatibility

No existing login method was removed. Password/passcode credentials still resolve email, phone username, Staff ID/login username, and phone aliases before verifying with Firebase Auth password. Google OAuth remains unchanged.
