# Authentication — Mobile Support

**Last Updated:** July 6, 2026
**Decision:** ✅ SHARED INFRASTRUCTURE — Auth works identically on mobile and desktop

---

## Feature Admission Test

Not applicable — auth is shared infrastructure, not a separate mobile feature.

---

## How Mobile Uses Auth

- **NextAuth session**: Same `getActiveSession()` in all DAL functions — mobile inherits automatically, including the bounded `/api/auth/session` response parser and `auth_session_response_parse_failed` / `auth_session_response_invalid` diagnostics
- **Session health polling**: `SessionExpiryMonitor` is shared with mobile/PWA sessions and inherits same-origin, no-store, manual-redirect `/api/auth/access-status` requests plus the bounded response parser, access-status entity reference guard, canonical timestamp parsing, and `auth_access_status_response_redirected` / `auth_access_status_response_parse_failed` / `auth_access_status_response_invalid` diagnostics.
- **Shared auth request policy**: Mobile session, Phone OTP, account, and store-switch calls inherit `src/lib/auth/browserRequestPolicy.ts`, so browser auth requests stay uncached, same-origin, and manual-redirect before existing bounded response parsing.
- **Phone OTP login**: Mobile login and create-menu auth flows use the shared `PhoneOtpAuthPanel`, including the shared browser auth request policy, bounded start/verify response parser, and fixed owner-facing failure copy.
- **Google OAuth**: Works in mobile browser and PWA WebView
- **Login page**: Mobile-responsive SCSS (fixed in Feb 2026 — overflow, min-width, media queries). Mobile browser/PWA login inherits the bounded validate-claim, claim-account, and set-claims response parser, the Claim-token lookup boundary through `normalizeAuthClaimToken`, the Claim-account tenant/store scope boundary, the Switch-store scope document ID boundary, the Auth entity snapshot document ID boundary for inherited tenant/store block reads, and the same-origin callback redirect guard from the shared login page.
- **Logout**: `MobileMoreScreen` → `signOutSession()` with confirmation dialog
- **Session persistence**: Redux Persist + NextAuth cookies — survives PWA restarts
- **Staff/account access**: `MobileMoreScreen`, `MobileUsersScreen`, and `MobileRolesScreen` use the same server auth, staff, and role APIs as desktop. Mobile profile update, password/passcode change, staff creation, passcode reset, force sign-out, and role changes are supported. Mobile account and staff browser requests use same-origin credentials, no browser cache, and manual redirect handling before bounded response parsing. Staff login detail copy/share actions wait for Clipboard API success or acknowledged textarea fallback success before copied feedback, and failed diagnostics include clipboard/fallback support booleans without logging raw passcodes.
- **Account response parsing**: Mobile profile update and password/passcode change responses use the shared `src/lib/auth/accountClientResponses.ts` parser, including the 16KB cap and `auth_account_response_parse_failed` / `auth_account_response_invalid` diagnostics before mobile shows success.

## No Separate Mobile Auth

All mobile screens use the exact same auth layer as desktop. No mobile-specific auth code exists or is needed.

---

## Auth Audit Updates (Feb 19, 2026)

### User Profile and Account Access

- **Feature Admission Test:** Profile editing is operational (name/phone changes, password changes)
- **Frequency Gate:** Rare (monthly at most), but account correction is support-critical
- **Touch Gate:** Mobile profile and account forms use `antd-mobile` inputs/buttons inside `MobileMoreScreen`
- **Decision:** Desktop keeps the Ant Design profile modal. Mobile owner PWA uses `MobileMoreScreen` sub-screens for profile update and password/passcode change, with the same `/api/auth/update-profile` and `/api/auth/change-password` server contracts as desktop.

### Claim Account Flow

- **Login page** already has mobile-responsive SCSS
- **Claim UI** (Google OAuth + email/password setup) works on mobile browsers and PWA
- **No separate mobile flow needed** — claim happens on login page which is already responsive

### Staff Creation

- **Mobile supported** — staff management is available in `MobileUsersScreen` for phone-only owners.
- Mobile uses the same `/api/staff` server contract as desktop and receives current-store scoped staff payloads for non-master managers.
