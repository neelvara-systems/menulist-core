# Phone OTP Auth Implementation

## Runtime Flow

1. Owner opens `/signin`; Google remains first, then the existing login form asks for one identity value.
2. If the identity looks like a phone number, the form embeds `PhoneOtpAuthPanel` and offers WhatsApp OTP as the primary action.
3. If the owner chooses passcode instead, or if the identity is email/staff ID, the same form shows the password/passcode field.
4. `PhoneOtpAuthPanel` sends `phone`, `countryCode`, and `dialCode`; dashboard embedded mode uses the identity phone value and defaults to India unless the owner entered an international `+...` number.
5. `POST /api/auth/phone-otp/start` validates and rate-limits by IP and normalized phone hash.
6. `createPhoneOtpChallenge()` normalizes to E.164, stores a server-only challenge with country metadata, and sends WhatsApp OTP.
7. Owner submits code to `POST /api/auth/phone-otp/verify`.
8. `verifyPhoneOtpChallenge()` checks TTL, attempts, and HMAC hash.
9. The helper reuses or creates a `users` profile and stores a one-time login token.
10. Browser calls `signIn('credentials', { phoneOtpLoginToken })`.
11. NextAuth `CredentialsProvider.authorize()` consumes the token, loads the user, applies block-state inheritance, and returns the existing minimal session user shape.
12. Dashboard login continues to sync Firebase Auth through `/api/auth/set-claims`.

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
