# Phone OTP Auth Firebase Notes

## Collections

### `authPhoneOtpChallenges`

Server-only challenge documents.

Important fields:

- `status`: `pending`, `verified`, `expired`, `too_many_attempts`, or delivery failure status
- `phoneE164`
- `phoneHash`
- `phoneLast4`
- `phoneUsername`
- `countryCode`
- `dialCode`
- `otpHash`
- `attempts`
- `maxAttempts`
- `createdAt`
- `expiresAt`
- `delivery`

### `authPhoneOtpLoginTokens`

Server-only one-time token documents.

Important fields:

- `status`: `active`, `consumed`, or `expired`
- `challengeId`
- `userId`
- `email`
- `phoneHash`
- `phoneLast4`
- `createdAt`
- `expiresAt`
- `consumedAt`

## Rules

No Firestore client access is required. Existing default-deny rules keep these collections server-only through Admin SDK access.

Verified owner/user/store documents should preserve the normalized phone shape when phone data is written:

- `countryCode`
- `dialCode`
- `phoneNumber`
- `phone`
- `phoneUsername` on user documents

## Indexes

No index is required. Challenge and token reads use document IDs. User reuse uses existing auth lookup queries already used by credential login.

## Cost

Per successful OTP send:

- Fail-closed IP throttle and 1KB body cap happen before phone normalization or challenge writes.
- Fail-closed phone-hash throttle happens before challenge creation or WhatsApp delivery.
- 1 challenge write
- 1 WhatsApp outbound message
- 1 delivery-status write

Per verification:

- Fail-closed IP throttle and 1KB body cap happen before challenge lookup or login-token writes.
- Fail-closed challenge throttle happens before challenge verification, user resolution, or login-token writes.
- 1 challenge reservation transaction read/update for valid, invalid, or expired attempts
- bounded existing-user lookup queries in the documented login-identifier order; a missing user also uses one deterministic document read
- 1 user update or create
- 1 final transaction with exact challenge and user reads, plus login-token create and challenge update

Per NextAuth token consumption:

- 1 transaction with exact token and `users/{userId}` reads, then 1 token update only after the stored email binding matches

The expensive operation is WhatsApp delivery, so send is separately rate-limited by IP and phone hash.

Limiter-provider unavailability returns 503 and produces no OTP Firestore/Auth/WhatsApp operation after the unavailable check. A normal exhausted limit returns 429. This changes outage behavior only; valid accepted requests keep the documented operation count and no rule, index, schema, Cloud Function, Storage, or deploy target changes.

The June 27 start-route error response hardening adds no Firestore reads/writes and no WhatsApp calls. It only changes failed response text selection so internal custom error messages are not returned directly to the browser.

The June 28 OTP diagnostic hardening adds no Firestore reads/writes and no WhatsApp calls. It only changes unexpected route/helper failure diagnostics to stable auth failure codes with bounded request/user metadata.

The June 29 browser response-parse hardening adds no Firestore reads/writes/deletes, Firebase Auth operations, WhatsApp provider calls, Storage operations, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. `PhoneOtpAuthPanel` only caps start/verify response parsing at 8KB, logs `phone_otp_response_parse_failed` / `phone_otp_response_invalid`, and preserves the existing fixed owner-facing send/verify failure copy.

The July 1 acknowledgement hardening adds no Firestore reads/writes/deletes, Firebase Auth operations, WhatsApp provider calls, Storage operations, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. Start responses now include `action: "start"` and the accepted purpose; verify responses include `action: "verify"` and the verified challenge id. The browser requires those acknowledgements before state changes or login-token use.

The July 5 challenge ID boundary adds no reads/writes/deletes for valid OTP attempts and does not change valid login behavior. The verify route now validates the Firestore auto-ID challenge shape before challenge-specific throttling, and `verifyPhoneOtpChallenge()` repeats the same `normalizePhoneOtpChallengeId()` guard before `authPhoneOtpChallenges/{challengeId}` transaction reads or login-token writes. Malformed, reserved, or path-shaped challenge IDs fail with the existing fixed invalid-code copy before Firestore work.

Phone OTP User Document ID Boundary adds no reads/writes/deletes for valid OTP attempts and does not change valid login behavior. Existing user profile updates, login-token `userId` writes, and consumed-token user comparisons now validate resolved user document IDs through `normalizePhoneOtpUserDocumentId()` before `users/{userId}` refs or token identity checks. Malformed, reserved, empty, whitespace-mutated, path-shaped, or oversized user IDs fail with the existing user-not-found path before user document refs or login-token trust. This adds no Firestore rules/indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, WhatsApp provider call, or owner-facing setting.

July 11 transaction hardening adds a transient `verifying` status plus `verificationOperationId` and `verificationReservedUntil` fields to server-only challenge documents. Invalid-attempt, challenge-expiry, and login-token-expiry writes now commit before the helper throws. A successful verification replaces the former separate token/challenge writes with one transaction after exact challenge/user reads. The new emulator proves five-attempt exhaustion, expiry persistence, one concurrent winner, one-time exact-user consumption, and expired-token persistence. No rule, index, Cloud Function, Storage, provider, cache, public DTO, Firebase deploy, or Vercel deploy change is required.
