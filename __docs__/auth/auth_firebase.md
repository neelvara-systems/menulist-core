# Authentication — Firebase Cost Tracking

**Feature:** Authentication System (NextAuth.js + Firebase)  
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** July 6, 2026
**Priority:** MEDIUM — Every API call validates auth. Session-based caching minimizes reads.

> **Launch Boundary:** This file records auth Firebase cost evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, auth browser/API smoke, App Check/session-cookie review, Firebase Auth custom-claims evidence, target deploy evidence, and production-host smoke.

---

## Summary

- **Collections Used:** `users`, `tenants`, `stores`
- **Firebase Auth:** Google OAuth via NextAuth.js
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **Very Low** — JWT sessions eliminate per-request Firestore reads
- **Client Bootstrap Diagnostics:** App Check, Firebase client initialization, Firebase Auth sync, and session-provider auth bootstrap failures use bounded secure diagnostics only. Normal sync/success paths stay quiet.
- **Client Session Response Diagnostics:** `getActiveSession()` reads `/api/auth/session` through a 64KB bounded JSON parser, logs `auth_session_response_parse_failed` or `auth_session_response_invalid` for malformed responses, and keeps normal no-user session responses as `null`.
- **Client Session Scope Isolation:** The five-second browser cache and shared in-flight request contain only the raw signed session. Every caller first applies an exact mapped MenuList store context and then projects the current route/host product scope. A local `activeStoreContext` is an untrusted hint: its numeric tenant/base/target aliases must match the signed session and the target must exist in the signed store mappings, otherwise it is removed.
- **Logout Session Generation:** Successful authenticated browser cleanup invalidates the raw five-second session cache before other tenant state. Request creators and joiners may return or cache a session only while their logout generation and exact promise ownership remain current, so a pre-logout response cannot repopulate or expose the former account after a same-tab account transition.
- **Session duration:** Current NextAuth JWT sessions use the source-defined seven-day maximum, not the retired 30-day guide value.
- **Store-role claims:** Missing/malformed normal-user store roles and non-platform `PLATFORM` store roles fail before custom-token creation. There is no owner fallback; legitimate platform/support fallback is least-privileged `staff` plus separate account-level platform claims.
- **Public auth availability:** Phone OTP IP/phone/challenge limits plus claim preview/mutation limits fail closed. Limiter-provider unavailability returns 503 before WhatsApp, claim lookup/mutation, Firebase Auth, or OTP challenge/token side effects.
- **JWT Store-Membership Boundary:** `getDatabaseUserForSession()` uses one exact positive-safe-integer projector for persisted tenant/store aliases before compact JWT/session construction. Canonical numeric strings remain compatible; exponent, whitespace, leading-zero, decimal, unsafe and non-scalar aliases cannot become another signed store membership. Same-role duplicate mappings collapse; contradictory roles fail closed to no role and cannot fall back to a broader top-level role.
- **Serialized Session Contract:** `LoginUserType` describes the compact JSON session rather than the persisted Firestore user. Expiry is an ISO string, tenant/store may be explicit `null` only before onboarding completes, and top-level identity/scope/role/product aliases must agree with the nested user before browser or server consumers receive the session. `useClientAuthSession()` and `getActiveSession()` share this runtime boundary plus the same active-store and product-route projection, including Answerlattice support routes.
- **SessionProvider Store Boundary:** Tenant `storesList` is a denormalized read model, not outlet authority. Summary IDs must be canonical, and embedded/fetched store details must match the signed tenant and selected store with active lifecycle before owner state, subscription or permission use. Malformed summary IDs cannot confer legacy master status.
- **Client Access-Status Diagnostics:** `SessionExpiryMonitor` reads `/api/auth/access-status` with same-origin credentials, no-store cache policy, and manual redirect handling before the 8KB bounded JSON parser. Redirected responses log `auth_access_status_response_redirected`, malformed or invalid responses log `auth_access_status_response_parse_failed` / `auth_access_status_response_invalid`, and transient malformed responses preserve retry behavior.
- **Access-status entity reference boundary:** `/api/auth/access-status` normalizes session/user document IDs with the shared Firestore document ID guard before user, tenant, or store direct reads. Path-shaped or whitespace-mutated user IDs fail as `USER_NOT_FOUND`; path-shaped or whitespace-mutated tenant/store references fail as `TENANT_REFERENCE_INVALID` or `STORE_REFERENCE_INVALID` before entity-block checks. Persisted user aliases are authoritative when present but must agree with each other; fallback session aliases must likewise agree. Existing tenant/store documents may omit redundant embedded identity, but every embedded identity alias that is present must agree with the document path, and every store tenant alias must agree with the checked tenant. For non-platform sessions, missing tenant/store documents, omitted tenant context on a store-scoped session, and store-to-tenant mismatches fail closed before session-revocation success. String revocation timestamps must be canonical ISO `...Z` values that round-trip before participating in session-revocation comparison.
- **Phone OTP challenge ID boundary:** `/api/auth/phone-otp/verify` requires raw 20-character Firestore auto-ID challenge IDs through `normalizePhoneOtpChallengeId()` before challenge-specific throttling, challenge document reads, OTP hash comparison, or login-token writes. Whitespace-mutated, path-shaped, reserved, or non-auto-ID challenge IDs return the fixed invalid-code path.
- **Change-password user document boundary:** `/api/auth/change-password` validates the session user ID with the shared Firestore document ID guard before rate limiting, bounded body parsing, Firebase password verification, Firebase Auth password update, or `users/{userId}` timestamp writes. Malformed session user IDs fail with generic unauthenticated copy and fixed bounded `change_password_invalid_session_user_id` diagnostics.
- **Claim-token lookup boundary:** `/api/auth/validate-claim` and `/api/auth/claim-account` use `normalizeAuthClaimToken()` before indexed `users.claimToken` lookups. Claim tokens must be 20-256 base64url/hex-safe characters; the shared lookup reads at most two matches and rejects duplicate identities. `claimTokenExpiresAt` is required and must parse to a future timestamp. Preview admission also reuses active/unblocked, exact tenant/store scope, and owner-mapping checks. Expired cleanup is transactional and clears only the same unchanged expired token.
- **Claim-account tenant/store scope boundary:** `/api/auth/claim-account` normalizes claimed tenant/store IDs with the shared Firestore document ID guard and exact positive numeric check before Firebase Auth user mutation, tenant/store document writes, subscription relinking, public cache revalidation, custom-claim minting, or success acknowledgement. The final claim transaction re-checks the same normalized scope after re-reading the messaging user.
- **Switch-store scope document ID boundary:** `/api/auth/switch-store` normalizes session tenant/current-store IDs and the requested target-store ID through the shared store-permission document ID guard before tenant access checks, caller-store permission reads, tenant storesList reads, canonical target-store reads, access mapping, or success acknowledgement. Tenant-list membership, session mapped-store authorization and per-store role selection also require the same canonical positive safe-integer form; whitespace, leading zeros, exponent notation, decimals and unsafe integers are not coerced into another store. Malformed scope fails with the existing not-onboarded or invalid-input boundary before Firestore path composition.
- **Auth entity snapshot document ID boundary:** `src/lib/auth/serverUserContext.ts` validates generic auth entity document IDs with the shared Firestore document ID guard and requires the shared exact numeric tenant/store scope guard before NextAuth entity-block inheritance reads `tenants/{tenantId}` or `stores/{storeId}`. Malformed tenant/store IDs fail closed as no inherited block context before Firestore path composition.
- **OAuth user single-claim boundary:** first Google OAuth login derives `users/oauth_{sha256(normalizedEmail)}` without placing raw email in the path. A Firestore transaction creates that deterministic document once; concurrent callbacks resolve the same document, while existing legacy random-ID users continue to win through the global email lookup. A deterministic-path collision with different stored email fails closed.
- **Set-claims rate-limit boundary:** `/api/auth/set-claims` now applies the shared `AUTH_CLAIM_SYNC` limiter with HMAC-hashed session user/email key material before optional body parsing, product-user lookups, Firebase Auth user reads/creates, custom-claim writes, or custom-token creation. The 30-per-15-minute actor ceiling allows normal login handoff, session bootstrap, store switching, and multi-tab refreshes while still bounding repeated sync attempts. Rate-limited attempts return 429 with retry headers and bounded security diagnostics only.
- **Shared Browser Auth Request Policy:** `src/lib/auth/browserRequestPolicy.ts` pins `cache: 'no-store'`, `credentials: 'same-origin'`, and `redirect: 'manual'` for browser auth calls. Session fetch, Firebase claim sync, login claim/setup, Phone OTP start/verify, access-status polling, account profile/password updates, and store switching now inherit that request boundary before their existing bounded response parsers run.
- **Claim Account Client Acknowledgement:** Login-page claim linking and claim setup read `/api/auth/claim-account` through the bounded auth parser, then require `success: true`, the expected claim mode, and tenant/store identity before clearing the claim token, showing success, or redirecting.
- **Auth Middleware Security Logs:** `src/middleware/auth.ts` logs CORS, authentication, account-state, platform-role, store-role, tenant-access, and store-access security events with bounded route/session metadata only. Raw `buildSecurityContext()` output, raw IPs, raw user agents, raw emails, and raw tenant/store/user IDs are not spread into central auth middleware security events.
- **Profile Validation Security Logs:** `src/lib/userProfile/server.ts` logs invalid profile update payloads with bounded route/session metadata and validation-error presence/length only. Raw `buildSecurityContext()` output and raw validation text are not spread into central security logs.

---

## Firestore Operations

### Reads

| Operation          | Collection          | Trigger                   | Frequency | Docs Read | Notes                                                                    |
| ------------------ | ------------------- | ------------------------- | --------- | --------- | ------------------------------------------------------------------------ |
| User lookup        | `users`             | Login (NextAuth callback) | Per login | 1         | Check/create user doc.                                                   |
| Session validation | — (JWT)             | Per API call              | Per call  | 0         | JWT-based session — no Firestore read. `withAuth()` validates JWT token. The compact session user includes `storeIds` derived from the user document for multi-location guard helpers. |
| Tenant/store data  | `tenants`, `stores` | Login (embedded in JWT)   | Per login | 1-2       | Loaded once, embedded in session token.                                  |

### Writes

| Operation                | Collection       | Trigger          | Frequency    | Docs Written | Notes                             |
| ------------------------ | ---------------- | ---------------- | ------------ | ------------ | --------------------------------- |
| Update last login        | `users/{userId}` | Each login       | Per login    | 1            | `lastLoginAt` timestamp.          |
| Create user (new signup) | `users/oauth_{emailHash}` | First-time OAuth login | Per new user | 1 | Deterministic transaction `create`; concurrent callbacks resolve one document. Legacy random-ID users remain discoverable by email. |

### Deletes

None — users are deactivated (soft delete), never hard deleted.

---

## Firebase Auth Operations

| Operation             | Trigger                 | Free Tier      | Notes                                           |
| --------------------- | ----------------------- | -------------- | ----------------------------------------------- |
| Google Sign-In        | User login              | 10K/month free | OAuth flow via NextAuth.                        |
| Token verification    | `withAuth()` middleware | Free           | Firebase Admin SDK verifies tokens server-side. |
| Custom token creation | Session establishment   | Free           | `createCustomToken()` if needed.                |

Client Firebase bootstrap uses `src/lib/firebase/firebaseDiagnostics.ts` for App Check, emulator setup, auth-sync hook, and session-provider auth bootstrap failures. These diagnostics log normalized failure codes, source error name/code, numeric status, and identifier presence/length metadata only; they do not log Firebase users, emails, tenant/store IDs, custom tokens, provider payloads, or raw browser exception objects.

June 29 client session response parsing is Firebase-cost neutral. `src/lib/auth/getActiveSession.ts` reads `/api/auth/session` with same-origin credentials, no-store cache policy, and manual redirect handling, caps response parsing at 64KB, and logs bounded `auth_session_response_parse_failed` / `auth_session_response_invalid` diagnostics before failing through the existing client session fetch failure path. This adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, provider calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 13 browser session scope isolation is Firebase-cost neutral. `getActiveSession()` deduplicates only the raw `/api/auth/session` fetch and applies current route scope separately for request creators, joiners and cache hits. `activeStoreContext` accepts only structured positive safe-integer IDs, requires coherent top-level/nested signed tenant/store aliases and an exact mapped target, and clears invalid/stale values before downstream owner code can consume them. MenuList store selection occurs before any Answerlattice route projection. This adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, provider calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 29 logout session-generation hardening is Firebase-cost neutral. `clearAuthenticatedBrowserState()` clears the raw client session cache first, increments its identity generation, and makes older request creators/joiners return no session instead of repopulating former-account state. Exact promise ownership also prevents an older `finally` from clearing a newer fetch. This adds no Firestore reads/writes/deletes, Firebase Auth operations, route calls, Storage operations, provider calls, rules, indexes, schema changes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

July 13 serialized session contract repair is Firebase-cost neutral. The NextAuth response is projected through one compact runtime contract before DAL or hook use; malformed expiry, identity, product, role, tenant/store aliases, store mappings, product-account keys and lifecycle value kinds fail closed. The React hook now shares the exact active-store and product-route projector already used by the browser DAL, so it cannot retain the login store or MenuList scope while the owner is operating in another signed outlet or an eligible Answerlattice support surface. This adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, provider calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 13 JWT membership normalization is Firebase-cost neutral. The compact auth user projects `tenantId`, `storeId`, `storeIds[]`, and `stores[].storeId` through the same exact canonical boundary before JWT/session creation. It no longer applies `Number(...)` to persisted membership values, so malformed legacy values cannot alias another store. Canonical numeric-string legacy values remain readable as canonical numbers. Same-role duplicates collapse; contradictory roles become an explicit no-role mapping and the session callback does not replace it with broader top-level authority. This adds no reads, writes, deletes, Firebase Auth operations, rules, indexes, Cloud Functions, provider calls, settings, Firebase deploy requirement, or Vercel deploy action.

June 29 auth UI response parsing is Firebase-cost neutral. `src/components/auth/PhoneOtpAuthPanel.tsx` caps phone OTP start/verify response parsing at 8KB, and `src/components/auth/SessionExpiryMonitor.tsx` applies same-origin credentials, no-store cache policy, manual redirect handling, and an 8KB cap before accepting access-status responses. Redirected access-status responses log bounded `auth_access_status_response_redirected` diagnostics and end the browser session through the existing expired-session path. Malformed or invalid responses log bounded `phone_otp_response_parse_failed`, `phone_otp_response_invalid`, `auth_access_status_response_parse_failed`, or `auth_access_status_response_invalid` diagnostics. July 1 tightens Phone OTP success acknowledgement only: start responses must include `action: "start"` plus the accepted purpose, and verify responses must include `action: "verify"` plus the matching challenge id before browser state changes or login-token use. This adds no Firestore reads/writes/deletes, Firebase Auth operations, WhatsApp provider calls, Storage operations, provider calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30 shared browser auth request policy is Firebase-cost neutral. `src/lib/auth/browserRequestPolicy.ts` centralizes the no-store, same-origin, manual-redirect request boundary now used by `getActiveSession()`, `firebaseAuthSync`, the login claim/set-claims flow, `PhoneOtpAuthPanel`, `SessionExpiryMonitor`, profile/password account calls, and store-switch callers. This changes only browser `fetch` request options before existing route contracts and bounded response parsers run. It adds no Firestore reads/writes/deletes, Firebase Auth operations, WhatsApp provider calls, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

Set-claims workspace scope boundary now performs one canonical target-store read for each valid sync attempt. `/api/auth/set-claims` normalizes the selected store, reads it from the correct MenuList or separate Answerlattice Firestore project, requires exact stored identity and active/unblocked state, derives the minted tenant from that store, and requires non-platform user tenant equality before creating custom claims. Separate Answerlattice sync forces `pId: AL`; its platform fallback no longer copies MenuList store mappings. This adds one security-critical Firestore read per valid sync but no writes/deletes, Firebase Auth operation-count change, rule/index/Cloud Function change, provider call, owner setting, Firebase deploy requirement, or Vercel deploy action.

Set-claims rate-limit boundary is Firebase-cost neutral for valid sync attempts. `/api/auth/set-claims` now runs the shared `AUTH_CLAIM_SYNC` limiter with HMAC-hashed session user/email key material before optional request-body parsing, MenuList/Answerlattice profile lookups, Firebase Auth user lookup/create, custom-claim writes, and custom-token creation. The 30-per-15-minute actor ceiling is intentionally separate from stricter account-mutation limits because login handoff, session bootstrap, store switching, and multi-tab refreshes can legitimately make several set-claims calls. Rate-limited attempts stop with 429 before Firestore reads or Firebase Auth operations. This adds no Firestore reads/writes/deletes for valid requests, Firebase Auth operation count changes for valid syncs, rules, indexes, Cloud Functions, provider calls, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

Set-claims browser acknowledgement is Firebase-cost neutral. After a store-switch refresh, the browser forces an ID-token result and requires canonical tenant/store/admin/store-membership claim types plus the exact requested target store before updating active local context. This adds no provider or Firestore operation beyond the existing forced token refresh.

---

## New Auth APIs (Added Feb 19, 2026 — Auth Audit)

### `POST /api/staff`

| Operation                               | Collection | Type       | Frequency          | Notes                             |
| --------------------------------------- | ---------- | ---------- | ------------------ | --------------------------------- |
| Firebase Auth createUser                | —          | Auth Write | Per staff creation | Admin SDK. Staff get Staff ID alias; email staff also get setup email |
| Firebase Auth sendOobCode               | —          | Auth Write | Per email staff creation | Sends password setup email        |
| Update staff doc reset metadata         | `users`    | Write      | Per staff creation | `staffLoginId`, `loginUsername`, `phoneUsername`, setup metadata |

Admission guard: staff create/update/reset/signout/role-save helpers use a 16KB bounded JSON body before schema validation, store/tenant authority checks, Firebase Auth work, or Firestore writes. Create/reset/force-signout keep the existing `AUTH_SENSITIVE` limiter; update/role-save keep the existing `DATA_WRITE` limiter.

Password setup email delivery uses the fixed Firebase Auth `sendOobCode` host/path and encodes `FIREBASE_API_KEY` with `URLSearchParams` before the provider call. Malformed local API keys fail before the network request, and provider failures return a fixed local `PASSWORD_RESET_EMAIL_FAILED` code. This does not add Firestore reads/writes or change the one Firebase Auth sendOobCode operation per email staff creation.

### `POST /api/staff/password-reset`

| Operation                       | Collection | Type       | Frequency | Notes                                      |
| ------------------------------- | ---------- | ---------- | --------- | ------------------------------------------ |
| Read staff doc                  | `users`    | Read       | Per reset | Validate tenant and current store mapping  |
| Firebase Auth updateUser        | —          | Auth Write | Per reset | Owner reset creates a new temporary passcode for the same Firebase Auth account |
| Update staff doc reset metadata | `users`    | Write      | Per reset | Records request timestamp and requester ID |

Owner-triggered reset never stores the staff password or passcode. The temporary passcode is returned once to the owner so it can be shared offline. Staff self-service reset still uses Firebase email reset when a real email exists.

### `POST /api/auth/claim-account`

| Operation                         | Collection | Type       | Frequency               | Notes                               |
| --------------------------------- | ---------- | ---------- | ----------------------- | ----------------------------------- |
| Query by claimToken               | `users`    | Read       | Per claim               | 1 doc read (indexed query)          |
| Reserve claim operation           | `users`    | 1R + 1W transaction | Per claim | Rechecks token, expiry, user eligibility, exact scope and owner mapping; rejects an active competing lease before Auth side effects |
| Final claim transaction           | `users`, `tenants`, `stores`, `subscriptions` | 4-6R + bounded subscription query + writes | Per claim | Rechecks the exact reservation, canonical tenant/store status and up to 100 subscriptions; consumes token and couples ownership plus subscription relinking |
| Create target user                | `users`    | Write      | Mode 1/2 when target is absent | Mode 2 uses the shared deterministic global-email user ID; Mode 1 uses the exact normalized Google user ID; both use transaction `create` |
| Update messaging source user      | `users`    | Write      | Per claim | Mode 1/2 retire the source and record the target; Mode 3 keeps the canonical phone user and clears its token |
| Update tenant/store docs          | `tenants`, `stores` | Write | Mode 1 and 2 | Sync claimed owner email in the same final transaction; public cache is revalidated after commit |
| Revalidate public cache           | Next.js cache | Cache   | Per claim (Mode 1 and 2) | Best-effort refresh of menu, OBP, store, and client-store tags after commit; failure is observable and does not reverse or falsely fail the completed claim |
| Firebase Auth createUser/updateUser | —        | Auth Write | Per claim (Mode 2 and 3) | Admin SDK; Mode 3 uses generated messaging email behind phone login |
| Firebase Auth setCustomUserClaims | —          | Auth Write | Per claim (Mode 2 and 3) | Best-effort mirror after commit; bounded failure diagnostics and normal sign-in claim sync provide recovery |

Admission guard: `AUTH_SENSITIVE` hashed-IP rate limit, then 16KB bounded JSON body before claim-token lookup or Firebase Auth writes. Missing-token diagnostics store only claim-token presence and length metadata.

Claim-token single-use and side-effect guard: each mode first writes a 15-minute reservation after re-reading the token document. Only the reservation winner may mutate Firebase Auth. Finalization verifies the same reservation and atomically consumes the token with canonical tenant/store, target-user and bounded subscription writes. Failure releases only the matching operation; request-created Auth cleanup first proves the UID is not bound by any user document.

Post-commit cache boundary: Modes 1 and 2 pass the normalized numeric tenant/store scope to the public cache helper only after the final transaction succeeds. Cache revalidation failure is caught and logged with stable code `claim_account_cache_revalidation_failed`; it does not return HTTP 500 for the completed claim and does not skip the custom-claims mirror. The existing invalidation attempts and Firestore/Auth operation counts are unchanged. A failed cache attempt can temporarily leave the old public email visible until normal cache expiry or a later invalidation, but no ownership write is repeated or rolled back.

Client response boundary: `src/components/templates/loginPage/index.tsx` caps claim-account response parsing at 32KB through the shared login-page auth parser. Successful Google linking, email/password setup, and WhatsApp phone/passcode setup require an OK HTTP response plus `success: true`, the expected `mode` (`google`, `email-password`, or `whatsapp-phone`), and tenant/store identity before local claim state or success copy changes. Invalid acknowledgements log `login_page_claim_account_response_invalid` with bounded mode/identity presence metadata only. This adds no Firestore reads/writes/deletes, Firebase Auth operations, route calls, rules, indexes, Cloud Function logic changes, Firebase deploy requirement, or Vercel deploy action.

### `GET /api/auth/validate-claim`

| Operation           | Collection | Type | Frequency      | Notes                      |
| ------------------- | ---------- | ---- | -------------- | -------------------------- |
| Query by claimToken | `users`    | Read | Per validation | 1 doc read (indexed query) |

Unexpected route failures are logged through `src/lib/auth/authDiagnostics.ts` with `validate_claim_unexpected_error`, source error name/code/status, and bounded claim-token/request metadata only.

Admission guard: `AUTH_SENSITIVE` hashed-IP rate limit, then `normalizeAuthClaimToken()` shape and length validation before the claim-token query.

Client response boundary: the login page caps validate-claim response parsing at 32KB and requires `valid: true`, `status: "valid"`, `preview: "claim-token"`, and a non-empty business name before claim setup UI appears. Invalid OK acknowledgements log `login_page_validate_claim_response_invalid` with bounded marker/name presence only. Phone preview values render only when masked. This changes only route/browser acknowledgement shape and adds no Firestore reads/writes/deletes, Firebase Auth operations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

All validate-claim responses use the shared auth `private, no-store, max-age=0`, `Pragma: no-cache`, and `nosniff` policy. Bounded claim preview data and invalid/expired token state therefore cannot become stored browser or intermediary response truth.

Access-status entity reference boundary: `src/app/api/auth/access-status/route.ts` uses the shared Firestore document ID guard and exact raw-value comparison before user, tenant, or store direct document reads. Malformed, whitespace-mutated, or path-shaped user references fail before user lookup, and malformed, whitespace-mutated, or path-shaped tenant/store references return fixed invalid-access reasons before entity block checks. String revocation timestamps must match canonical ISO `...Z` timestamp shape and round-trip through `toISOString()` before they affect session-revocation comparison. This changes access-status admission only and adds no Firestore reads/writes/deletes, Firebase Auth operations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

Phone OTP challenge ID boundary: `src/lib/auth/phoneOtp.ts` requires the raw `challengeId` to match the 20-character Firestore auto-ID shape generated by `createPhoneOtpChallenge()` and to pass the shared Firestore document ID guard before challenge-specific throttling, challenge document reads, OTP hash comparison, or login-token writes. Whitespace-mutated, path-shaped, reserved, or non-auto-ID challenge IDs return the fixed invalid-code path. This changes Phone OTP challenge admission only and adds no Firestore reads/writes/deletes for valid requests, Firebase Auth operations, WhatsApp provider calls, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

Login callback redirect boundary: `src/components/templates/loginPage/index.tsx` parses `callbackUrl` with `new URL(callbackUrl, window.location.origin)`, requires the parsed origin to match the current origin, and returns only `pathname`, `search`, and `hash` for post-login navigation. Protocol-relative `//...` and cross-origin callback targets fall back to the normal dashboard/subscription routing instead of becoming external redirects. This changes browser-local post-login navigation admission only and adds no Firestore reads/writes/deletes, Firebase Auth operations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

### `POST /api/auth/update-profile`

| Operation       | Collection | Type  | Frequency  | Notes                           |
| --------------- | ---------- | ----- | ---------- | ------------------------------- |
| Read user doc   | `users`    | Read  | Per update | 1 doc read (by normalized session user ID) |
| Update user doc | `users`    | Write | Per update | Whitelisted fields only         |

Admission guard: session user ID normalized through the shared Firestore document-ID guard, then `DATA_WRITE` limiter by HMAC-hashed normalized session user ID, then 4KB bounded JSON body before validation or the user-document read. Malformed, reserved, whitespace-mutated, path-shaped, or oversized session user IDs fail with the existing unauthenticated response before limiter key material or `users/{userId}` refs are composed.

Client response boundary: `src/lib/auth/accountClientResponses.ts` caps desktop/mobile profile-update response parsing at 16KB and requires `success: true`, an `updated` array, and an `updates` object before the account UI shows success.

### `POST /api/auth/change-password`

| Operation                    | Collection | Type       | Frequency  | Notes                          |
| ---------------------------- | ---------- | ---------- | ---------- | ------------------------------ |
| Firebase Auth getUserByEmail | —          | Auth Read  | Per change | Verify user exists             |
| Read current user doc        | `users`    | Read       | Per change | Recheck exact current lifecycle, identity, and revocation truth |
| Firebase Auth REST verify    | —          | Auth Read  | Per change | Verify current password        |
| Firebase Auth updateUser     | —          | Auth Write | Per change | Set new password               |
| Update user doc              | `users`    | Write      | Per change | modifiedOn + passwordChangedAt + Firebase/MenuList revocation markers by exact session user ID |

Admission guard: root and nested session actor aliases must resolve to one exact ID before the shared Firestore document-ID/160-character guard, `AUTH_SENSITIVE` rate limit by HMAC-hashed normalized session user ID, and 2KB bounded JSON body. Missing, conflicting, malformed, reserved, whitespace-mutated, path-shaped, or oversized session user IDs fail with generic unauthenticated copy and fixed `change_password_invalid_session_user_id` diagnostics before limiter key material, provider calls, or `users/{userId}` refs are composed.

Current-authority guard: after bounded input validation, the route re-reads only the exact session user document through `getCurrentUser()`. The record must remain active, verified, unblocked, non-deleted, non-disabled, email-identical, and newer than any persisted revocation marker. The Firebase Auth record must be enabled and email-identical; an optional legacy `firebaseUid`, when present, must be a strict exact match. The fail-closed sensitive limiter distinguishes provider unavailability as 503, and the Firebase REST credential check has an eight-second abort deadline.

Commit boundary: the Firebase Auth password update is authoritative and Firebase invalidates old refresh tokens after the major account change. The subsequent metadata write records `modifiedOn`, `passwordChangedAt`, `authTokensRevokedAt`, and `sessionRevokedAt`; the existing 30-second/focus access-status monitor rejects older MenuList server sessions. Metadata failure emits bounded `change_password_metadata_sync_failed` diagnostics and still acknowledges the already-completed password change instead of instructing the owner to retry an effect that happened. Audit marker: change-password current-authority hardening.

Missing Firebase API key, current-password verification exceptions, and unexpected route failures are logged through `src/lib/auth/authDiagnostics.ts` with stable `change_password_*` codes, bounded session/request metadata, and source error name/code/status only.

Client response boundary: all route branches use protected private/no-store headers. `src/lib/auth/accountClientResponses.ts` caps desktop/mobile password-change response parsing at 16KB and requires `success: true` with `reauthenticationRequired: true`. Both owner surfaces then end the current Firebase and NextAuth browser session; sign-out failures receive separate bounded post-commit diagnostics and never relabel the completed password write as failed.

---

## Security Rules

- All API routes protected with `withAuth()` middleware (except validate-claim and claim-account Mode 2)
- Multi-tenant isolation via `verifyTenantAccess()` — checks `tId/sId` match session
- Rate limiting on expensive operations (`checkExpensiveAILimit`)
- Auth/session mutation routes use hashed rate-limit key material and bounded JSON body admission before expensive auth, claim-token, OTP, or store-switch work.
- Firebase client bootstrap and auth-sync diagnostics are bounded through `src/lib/firebase/firebaseDiagnostics.ts`; browser success paths do not emit Firebase user/session console logs.
- Account profile and password browser handoffs are bounded. `src/lib/auth/accountClientResponses.ts` caps `/api/auth/update-profile` and `/api/auth/change-password` responses at 16KB with `auth_account_response_parse_failed` / `auth_account_response_invalid` diagnostics, and desktop/mobile callers use same-origin credentials, no browser cache, and manual redirect handling before showing success.
- Staff and Platform Users browser handoffs are bounded. `src/lib/staffManagement/client.ts` applies same-origin credentials, no browser cache, and manual redirect handling to staff list, staff mutation, role mutation, and `/api/auth/create-staff` verification calls before bounded response parsing. Invalid successful or rejected create-staff envelopes log `staff_create_compatibility_response_invalid`; malformed or oversized bodies inherit `staff_client_response_parse_failed`. Platform verification accepts only `existing_user_auth_bound` with the exact expected user ID/email and returned verified user state. `EMAIL_EXISTS` is a refusal, not a compatibility success.
- Login-page and Firebase Auth sync browser handoffs are bounded. `src/components/templates/loginPage/index.tsx` sends validate-claim, claim-account, and set-claims requests with the shared auth browser request policy before capping response parsing at 32KB with `login_page_response_parse_failed` / `login_page_response_invalid` diagnostics. `src/lib/auth/firebaseAuthSync.ts` sends `/api/auth/set-claims` sync/refresh requests with the same policy before capping response parsing at 32KB with `firebase_auth_sync_response_parse_failed` / `firebase_auth_sync_response_invalid` diagnostics and before custom tokens are used.
- Firebase access tokens and refresh tokens must stay inside the Firebase SDK. The unused `src/utils/usersUtils.ts` token extraction helper was removed, and `npm run verify:auth-security-failure-matrix` guards against reintroducing `stsTokenManager`, `accessToken`, or `refreshToken` extraction in user utilities.
- Generic error messages (no sensitive data leakage)
- `claim-account` Mode 2 uses 256-bit claim token as authentication. Claim-account writes re-check and consume the token inside a transaction so duplicate submits cannot both complete ownership writes.
- `users/{userId}` direct Firestore writes are platform-admin only. Owner/staff profile changes, password changes, staff CRUD, role assignments, and revocation metadata are server API writes.
- `update-profile` allows only whitelisted fields — no login email changes
- `change-password` verifies current password before allowing change
- `create-staff` generates 24-byte cryptographic random password — never exposed

## Diagnostic Cost Boundary

The June 27 Firebase bootstrap diagnostic hardening adds no Firestore reads/writes, Firebase Auth operations, App Check calls, Storage operations, Cloud Functions, cache invalidations, or owner-facing settings. It changes only client-side/internal diagnostics and generic error text for failed auth bootstrap paths. `npm run verify:auth-security-failure-matrix` guards the helper, App Check, Firebase client, auth sync hook/helper, and session-provider auth bootstrap path.

The June 27 Firebase user-token extraction removal adds no runtime cost and changes no live auth flow because `src/utils/usersUtils.ts` had no repo imports. It removes a dead helper that copied Firebase access/refresh tokens into a plain user object and adds source-level verifier coverage against reintroducing that pattern.

The June 29 shared header `StoreSwitcher` diagnostic cleanup adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, or Firebase deploy requirement. It keeps the existing `/api/auth/switch-store` call and `refreshFirebaseAuthClaims()` behavior, converts rejected switch responses to a local coded error, and logs bounded current/login/target store, tenant, user, permission, and accessible-store count metadata only.

The June 29 `useAuth` browser auth-state diagnostic cleanup adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, or Firebase deploy requirement. It keeps the existing Firebase Auth state listener, token-result lookup, and token retrieval behavior, but replaces raw Firebase UID/email debug logs with development-only `auth_state_changed` and `auth_signed_out` diagnostics that record only user/email presence-length metadata and email verification state.

The June 29 account response diagnostic cleanup adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. It keeps the existing `/api/auth/update-profile` and `/api/auth/change-password` server behavior, but routes desktop/mobile browser responses through the 16KB bounded `src/lib/auth/accountClientResponses.ts` parser with fixed local failure copy and bounded status/code diagnostics.

The June 30 switch-store request-policy hardening adds no Firestore reads/writes/deletes, Firebase Auth operations beyond existing valid claim-refresh attempts, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. It keeps the existing `/api/auth/switch-store` route and caller-specific fixed failure copy, but sends desktop/mobile switch-store browser requests through the shared auth account request policy: no-store cache, same-origin credentials, and manual redirect handling.

The June 30 account rejection diagnostic parity cleanup adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. It keeps the same desktop/mobile profile and password mutation behavior, but ensures non-OK account responses become local status-only `desktop_account_*_rejected` or `mobile_account_*_rejected` codes after the bounded account parser handles malformed response bodies.

The June 30 platform user verification response cleanup originally kept `EMAIL_EXISTS` compatibility behavior. The July 16 staff/roles audit supersedes that acceptance: an Auth collision cannot prove ownership or a matching user binding and now fails closed.

The July 1 platform staff verification acknowledgement cleanup was further narrowed on July 16. The server now creates and transactionally binds a new Firebase Auth UID to an unverified placeholder, compensates its own Auth UID if the Firestore commit fails, and returns `existing_user_auth_bound`. The browser matches that explicit mode, user ID, email, and verified state and no longer writes `isVerified` itself. This uses the existing user/store/access-state documents and adds no rules, indexes, Storage, Functions, or Firebase deploy requirement.

The June 30 platform user update acknowledgement cleanup adds no Firestore reads/writes/deletes beyond the existing platform user document update attempt, Firebase Auth operations beyond existing staff verification behavior, Storage operations beyond existing user media uploads, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. Platform Users now requires the user DAL result to acknowledge the same user id before updating the table, closing the drawer, or showing success copy.

The June 30 staff login detail copy fallback cleanup adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. Desktop and mobile staff login detail copies now require Clipboard API success or acknowledged textarea fallback success before copied feedback, and failed diagnostics record only clipboard/fallback support booleans plus bounded Staff ID/passcode/text length metadata.

The June 30 auth and staff browser request policy cleanup adds no Firestore reads/writes/deletes beyond the existing valid account, staff, role, and platform staff-verification requests; no Firebase Auth operations beyond existing valid profile/password/staff flows; no Storage operations; no Cloud Function logic changes; no provider calls beyond existing valid password/staff email behavior; no API routes; no public routes; no cache invalidations; no rules; no indexes; no schema changes; no tenant-shape changes; no owner-facing settings; no Firebase deploy requirement; and no Vercel deploy action. It keeps the same bounded response parsers and acknowledgement requirements while adding no-store cache, same-origin credentials, and manual redirect handling to the browser request side.

The June 30 auth route security-log boundary cleanup adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. `/api/auth/access-status`, `/api/auth/change-password`, `/api/auth/switch-store`, and `/api/auth/claim-account` now use `getBoundedSecurityRouteContext()` for security events instead of raw `buildSecurityContext()` output. Valid session polling, password change, store switching, claim-account linking, claim-token behavior, and existing hashed limiter boundaries remain unchanged.

The June 30 auth middleware security-log boundary cleanup adds no Firestore reads/writes/deletes, Firebase Auth operations, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action. `withAuth()` and `verifyTenantAccess()` keep the same CORS validation, session checks, role gates, tenant/store checks, response codes, and Sentry security event severities, but central security payloads now use bounded route/session metadata and length-only reason/role/tenant/store context instead of raw `buildSecurityContext()` output, raw request IPs, raw user agents, raw emails, or raw account identifiers.

The July 11 auth identity uniqueness boundary changes authentication reads only. Default MenuList email lookup, phone/staff-login alias lookup, legacy country-aware phone lookup, separate Answerlattice claim-sync email lookup, and reseller owner availability checks no longer select one arbitrary document when multiple user records claim the same identity. The shared resolver reads at most two documents per exact field/value pair, deduplicates the same document across aliases, and throws `AuthUserIdentityConflictError` when distinct documents match. This fails before NextAuth session/custom-token creation or reseller ownership writes. Valid email lookup remains one query; phone alias login performs the bounded configured field/candidate queries so cross-field ambiguity cannot choose a tenant nondeterministically. No writes, rules, indexes, Cloud Functions, public DTOs, caches, Firebase deploy, or Vercel deploy are added.

---

## Cost Estimate (per 1000 users, 100 logins/month total)

| Resource         | Operations/month                                | Unit Cost  | Monthly Cost    |
| ---------------- | ----------------------------------------------- | ---------- | --------------- |
| Firebase Auth    | 100 sign-ins + 5 staff creates + 2 claims       | Free tier  | $0.00           |
| Firestore Reads  | 310 (300 login + 5 claim + 5 profile)           | $0.06/100K | $0.00           |
| Firestore Writes | 115 (100 login + 5 staff + 5 claim + 5 profile) | $0.18/100K | $0.00           |
| **Total**        |                                                 |            | **$0.00/month** |
