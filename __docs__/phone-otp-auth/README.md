# Phone OTP Auth

WhatsApp-first owner authentication for MenuList.

## Current Contract

- `/create-menu` shows phone OTP as the primary auth path before upload or link import.
- `/signin` keeps Google first, then uses one identity field to choose phone OTP, password, or passcode.
- Google OAuth and existing email/password, phone/passcode, and staff ID credentials remain available from the same page.
- OTP verification creates or reuses one `users` document, then signs in through the existing NextAuth credentials provider.
- Start and verify browser success requires route acknowledgements: `action: "start"` plus the accepted purpose before code entry, and `action: "verify"` plus the matching challenge id before the login token is used.
- Start and verify rate limits fail closed. If the shared limiter provider is unavailable, the route returns fixed 503 copy before WhatsApp delivery, challenge verification, user resolution, or login-token creation.
- Firebase Auth custom claims still sync through `/api/auth/set-claims`; no parallel dashboard auth system exists.
- Expected OTP errors log code-only. Unexpected start/verify route failures and consumed-token user mismatches use bounded auth diagnostics with request/user metadata presence-length only.

## Source Files

- Server helper: `src/lib/auth/phoneOtp.ts`
- Start route: `src/app/api/auth/phone-otp/start/route.ts`
- Verify route: `src/app/api/auth/phone-otp/verify/route.ts`
- NextAuth bridge: `src/lib/auth/index.ts`
- Shared UI: `src/components/auth/PhoneOtpAuthPanel.tsx`
- Dashboard login usage: `src/components/templates/loginPage/index.tsx`
- Create-menu usage: `src/app/(website)/create-menu/CreateMenuClient.tsx`

## Availability boundary

Limiter-provider unavailability is different from an exhausted limit: 503 means phone verification is temporarily unavailable, while 429 means the caller must wait. The owner can still use the existing Google or password/passcode path. This prevents a Redis/provider outage from silently disabling abuse controls around paid WhatsApp sends and public identity work.

## Related Docs

- [phone-otp-auth_spec.md](./phone-otp-auth_spec.md)
- [phone-otp-auth_impl.md](./phone-otp-auth_impl.md)
- [phone-otp-auth_firebase.md](./phone-otp-auth_firebase.md)
- [phone-otp-auth_mobile-support.md](./phone-otp-auth_mobile-support.md)
- [phone-otp-auth_test-cases.md](./phone-otp-auth_test-cases.md)
