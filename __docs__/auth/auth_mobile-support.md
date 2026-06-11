# Authentication — Mobile Support

**Last Updated:** June 11, 2026
**Decision:** ✅ SHARED INFRASTRUCTURE — Auth works identically on mobile and desktop

---

## Feature Admission Test

Not applicable — auth is shared infrastructure, not a separate mobile feature.

---

## How Mobile Uses Auth

- **NextAuth session**: Same `getActiveSession()` in all DAL functions — mobile inherits automatically
- **Google OAuth**: Works in mobile browser and PWA WebView
- **Login page**: Mobile-responsive SCSS (fixed in Feb 2026 — overflow, min-width, media queries)
- **Logout**: `MobileMoreScreen` → `signOutSession()` with confirmation dialog
- **Session persistence**: Redux Persist + NextAuth cookies — survives PWA restarts
- **Staff/account access**: `MobileMoreScreen`, `MobileUsersScreen`, and `MobileRolesScreen` use the same server auth, staff, and role APIs as desktop. Mobile staff creation, passcode reset, force sign-out, and role changes are supported.

## No Separate Mobile Auth

All mobile screens use the exact same auth layer as desktop. No mobile-specific auth code exists or is needed.

---

## Auth Audit Updates (Feb 19, 2026)

### New: User Profile Modal

- **Feature Admission Test:** Profile editing is operational (name/phone changes, password changes)
- **Frequency Gate:** Rare (monthly at most) → desktop only is acceptable
- **Touch Gate:** Form inputs work on mobile, but modal UX is desktop-optimized
- **Decision:** Profile modal uses Ant Design `<Modal>` which is responsive by default. No separate mobile profile screen needed at this time. If usage data shows mobile profile edits are frequent, consider adding to `MobileMoreScreen`.

### Claim Account Flow

- **Login page** already has mobile-responsive SCSS
- **Claim UI** (Google OAuth + email/password setup) works on mobile browsers and PWA
- **No separate mobile flow needed** — claim happens on login page which is already responsive

### Staff Creation

- **Mobile supported** — staff management is available in `MobileUsersScreen` for phone-only owners.
- Mobile uses the same `/api/staff` server contract as desktop and receives current-store scoped staff payloads for non-master managers.
