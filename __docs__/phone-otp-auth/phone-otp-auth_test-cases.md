# Phone OTP Auth Test Cases

## API

- `POST /api/auth/phone-otp/start` with invalid phone returns 400.
- `POST /api/auth/phone-otp/start` with `phone=9876543210`, `countryCode=IN`, `dialCode=+91` sends to `919876543210`.
- `POST /api/auth/phone-otp/start` with explicit `+971...` phone keeps the pasted international country code.
- Disabled flag returns 404 from start and verify.
- Valid phone creates challenge and sends WhatsApp message when provider config exists.
- Send route rate-limits by IP.
- Send route rate-limits by phone hash.
- Verify rejects malformed code.
- Verify rejects expired challenge.
- Verify increments attempts on invalid code.
- Verify marks challenge `too_many_attempts` after max attempts.
- Verify creates one-time login token for valid code.
- NextAuth consumes login token once.
- A second token consumption fails.

## Dashboard Login

- Google button renders before the identity form.
- Empty identity shows only the identity field and does not show password/passcode or OTP controls.
- Phone identity shows `Send WhatsApp code` and `Use passcode instead`.
- Choosing passcode for a phone identity shows the passcode field and `Send WhatsApp code instead`.
- Email identity shows the password field.
- Staff ID/passcode path remains handled by the credentials provider.
- Existing phone owner can log in with OTP.
- Existing Google/password users can still log in with previous methods.
- Existing phone/passcode users can still log in with passcode.
- Firebase Auth custom claims sync after OTP session.

## Create Menu

- Fresh visitor sees phone OTP gate before upload/link controls.
- Fresh visitor can choose country code before requesting a WhatsApp OTP.
- After OTP verification, upload controls appear without leaving `/create-menu`.
- Unauthenticated upload API calls still return 401.
- Authenticated upload/link import still uses `PUBLIC_MENU_ENTRY_AUTH` rate limit.

## Mobile

- Phone keyboard opens on phone field.
- Numeric keyboard opens on OTP field.
- Buttons remain at least 44px high.
- Text does not overflow on narrow mobile screens.
