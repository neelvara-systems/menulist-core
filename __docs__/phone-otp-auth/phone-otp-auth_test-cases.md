# Phone OTP Auth Test Cases

## API

- `POST /api/auth/phone-otp/start` with invalid phone returns 400.
- `POST /api/auth/phone-otp/start` with `phone=9876543210`, `countryCode=IN`, `dialCode=+91` sends to `919876543210`.
- `POST /api/auth/phone-otp/start` with explicit `+971...` phone keeps the pasted international country code.
- Disabled flag returns 404 from start and verify.
- Valid phone creates challenge and sends WhatsApp message when provider config exists.
- Send route rate-limits by IP.
- Send route rate-limits by phone hash.
- Send returns 503 and performs no challenge write or WhatsApp call when either limiter provider is unavailable.
- Verify rejects malformed code.
- Verify rejects expired challenge.
- Verify increments attempts on invalid code.
- Verify marks challenge `too_many_attempts` after max attempts.
- Verify returns 503 and performs no challenge/user/token work when either limiter provider is unavailable.
- Working exhausted limits return 429 with `Retry-After`; provider unavailability is not misreported as caller abuse.
- Invalid-attempt and expiry state changes remain committed after the helper returns its typed error.
- Concurrent valid-code verification produces one finalized login token and leaves no active verification lease.
- A failure between reservation and finalization can release only its own challenge operation for retry.
- Verify creates one-time login token for valid code.
- NextAuth consumes a login token only after reading the exact stored user and matching the stored email inside the transaction.
- A second token consumption fails.
- Expired login-token status persists after the typed expiry error.

Automated coverage: `npm run test:phone-otp-transaction:emulator` exercises the durable-attempt, expiry, concurrent verification, exact-user consumption, replay, and token-expiry boundaries against the Firestore emulator.

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
