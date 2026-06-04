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

- 1 challenge write
- 1 WhatsApp outbound message
- 1 delivery-status write

Per verification:

- 1 challenge transaction read/update
- 0-2 user lookup queries depending on whether an existing phone user is found
- 1 user update or create
- 1 login-token write
- 1 challenge merge write

Per NextAuth token consumption:

- 1 token transaction read/update
- 1 user lookup by email

The expensive operation is WhatsApp delivery, so send is separately rate-limited by IP and phone hash.
