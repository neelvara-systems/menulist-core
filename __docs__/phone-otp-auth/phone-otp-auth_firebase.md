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

- IP throttle and 1KB body cap happen before phone normalization or challenge writes.
- 1 challenge write
- 1 WhatsApp outbound message
- 1 delivery-status write

Per verification:

- IP throttle and 1KB body cap happen before challenge lookup or login-token writes.
- 1 challenge transaction read/update
- 0-2 user lookup queries depending on whether an existing phone user is found
- 1 user update or create
- 1 login-token write
- 1 challenge merge write

Per NextAuth token consumption:

- 1 token transaction read/update
- 1 user lookup by email

The expensive operation is WhatsApp delivery, so send is separately rate-limited by IP and phone hash.

The June 27 start-route error response hardening adds no Firestore reads/writes and no WhatsApp calls. It only changes failed response text selection so internal custom error messages are not returned directly to the browser.

The June 28 OTP diagnostic hardening adds no Firestore reads/writes and no WhatsApp calls. It only changes unexpected route/helper failure diagnostics to stable auth failure codes with bounded request/user metadata.

The June 29 browser response-parse hardening adds no Firestore reads/writes/deletes, Firebase Auth operations, WhatsApp provider calls, Storage operations, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. `PhoneOtpAuthPanel` only caps start/verify response parsing at 8KB, logs `phone_otp_response_parse_failed` / `phone_otp_response_invalid`, and preserves the existing fixed owner-facing send/verify failure copy.

The July 1 acknowledgement hardening adds no Firestore reads/writes/deletes, Firebase Auth operations, WhatsApp provider calls, Storage operations, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. Start responses now include `action: "start"` and the accepted purpose; verify responses include `action: "verify"` and the verified challenge id. The browser requires those acknowledgements before state changes or login-token use.
