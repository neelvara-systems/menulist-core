# Auth & User Flow Audit — Decision Log

**Feature:** Authentication & User Registration/Login Flow Audit  
**Status:** ✅ Implemented  
**Date:** February 19, 2026  
**Scope:** Firebase Auth, Google Auth, NextAuth, roles, passwords, claim tokens, user profile

---

## 1. Audit Scope

Full end-to-end audit of user authentication and registration flows covering:
- Manual onboarding (pricing → Google OAuth → onboard → pay)
- Messaging onboarding (WhatsApp → AI extraction → publish → claim account)
- Staff user creation
- User profile management
- Password management

---

## 2. Decisions Made (with Reasoning)

### Decision A1: `isVerified` — KEEP

**Field:** `UserDataType.isVerified: boolean`  
**Location:** `src/types/platform/user.ts`

**Reasoning:** `isVerified` is a real login gate. When `false`, it means a user doc exists in Firestore but no Firebase Auth account has been created yet. The platform admin uses this to show a "Verify" button that creates the Firebase Auth user. Without this field, there's no way to distinguish between "user who can log in" and "user doc placeholder."

**Usages found:**
- `src/lib/auth/index.ts:234` — Embedded in session
- `src/app/api/msg-preview/[sessionId]/approve/route.ts` — Set during messaging publish
- `src/components/templates/platform/users/index.tsx` — "Verify" button logic
- `src/components/templates/main-app/users/usersList/userForm/index.tsx` — Set on user creation

---

### Decision A2: `platformRole` — KEEP

**Field:** `UserDataType.platformRole: string`  
**Location:** `src/types/platform/user.ts`

**Reasoning:** Controls platform-level access. Value `"PLATFORM"` gives admin access to all tenants/stores/logs. Without it, owners could see admin pages. The session callback reads this and sets `session.platformRole`. Values: `"PLATFORM"`, `"OWNER"`, `"USER"`.

**Usages found:**
- `src/lib/auth/index.ts:238,241` — Embedded in session + `session.platformRole`
- `src/app/api/msg-preview/[sessionId]/approve/route.ts` — Set to `"OWNER"` during messaging publish
- `src/app/api/onboarding/create-subscription/route.ts` — Set during manual onboarding
- Platform admin pages use `session.platformRole === "PLATFORM"` for access control

---

### Decision A3: `role` vs `roles` — Keep `role` (singular), REMOVE `roles`

**Field:** `UserStoreMappingType.role: string`  
**Location:** `src/types/platform/user.ts`

**Reasoning:** Firestore stores `role` (singular) everywhere — one role per store per user. The `UserStoreMappingType` interface confirms: `role: string`. Even in multi-chain scenarios, a user has separate `role` entries per store in their `stores[]` array. The `roles` (plural) field never existed in the type definition — it was a ghost field in the session sanitizer.

**Change:** Removed `roles` from `getDatabaseUserForSession()` sanitizer in `src/lib/auth/index.ts:374-378`. Now only maps `role` (singular).

**Impact on multi-chain:** None. Each `stores[]` entry has its own `role` field. Multi-chain = multiple entries, each with its own role.

---

### Decision A4 + B4: Claim Token — Remove Expiry, Add Email/Password Setup

**Field:** `UserDataType.claimToken: string`, `claimTokenExpiresAt: Timestamp`

**Reasoning for removing expiry:**
- Token is 256-bit cryptographic random (`crypto.randomBytes(32).toString('hex')`)
- Brute force attack is mathematically impossible (2^256 combinations)
- Token is single-use (cleared after claim)
- Expiry created a support dependency — owner contacts support if expired, support has no tool to regenerate
- Removing expiry eliminates this support bottleneck entirely

**Reasoning for adding email/password setup (MODE 2):**
- Some SMB owners don't have Google accounts
- Some prefer email/password login
- Providing both options removes friction
- MODE 2 uses the claim token as authentication (no session required)
- Creates Firebase Auth user via Admin SDK, updates messaging user doc directly

**Changes:**
- `src/app/api/auth/validate-claim/route.ts` — Removed expiry check
- `src/app/api/auth/claim-account/route.ts` — Removed expiry check, added MODE 2 (email+password)
- `src/components/templates/loginPage/index.tsx` — Added UI for choosing Google or email/password setup

---

### Decision B1: Staff Creation — Server-Side API

**Previous:** `createUserWithEmailAndPassword(firebaseAuth, email, email)` on client side  
**New:** `POST /api/auth/create-staff` using Firebase Admin SDK

**Reasoning:**
1. **CRITICAL BUG:** Client-side `createUserWithEmailAndPassword` signs in as the new user — this breaks the admin's Firebase Auth session. After creating a staff user, the admin would be logged out.
2. **SECURITY:** Password was set to the email address — trivially guessable by anyone who knows the staff member's email.
3. **INDUSTRY STANDARD:** Admin SDK creates users without affecting the current session. A secure random password is generated, and a password reset email is sent so the staff member sets their own password.

**Changes:**
- Created `src/app/api/auth/create-staff/route.ts` — Server-side Firebase Auth user creation
- Updated `src/components/templates/main-app/users/usersList/userForm/index.tsx:103-147` — Calls server API instead of client-side Firebase
- Updated `src/components/templates/platform/users/index.tsx:154-177` — Same fix for platform admin verify flow
- Removed dead code `useEffect` in platform/users that read `firebaseAuth.currentUser` but never used it

---

### Decision B2 + D1: User Profile Modal — Build End-to-End

**Previous:** `LoggedInUserProfile` was an empty placeholder component. "My Profile" button in header had an empty `onClick` handler.

**Reasoning:** Users need to be able to edit their name, phone number, and change their password. This is a basic expectation of any SaaS dashboard. Without it, users have no way to manage their account details.

**Changes:**
- Created `src/app/api/auth/update-profile/route.ts` — Profile field updates (name, phone)
- Created `src/app/api/auth/change-password/route.ts` — Password change with current password verification
- Created `src/components/organisms/headerComponent/profileActionsModal/userProfileModal/index.tsx` — Full profile modal with Overview, Edit profile, Security, and Access sections
- Updated `src/components/organisms/headerComponent/profileActionsModal/index.tsx` — Wired "My Profile" to open the profile modal

**Security:**
- Profile update only allows whitelisted fields (name, phone, phoneNumber, countryCode, dialCode)
- Email changes are NOT allowed through this API (requires separate re-verification flow)
- Password change verifies current password via Firebase Auth REST API before updating
- OAuth-only users see an info message explaining they don't have a password to change
- Store access, role, activation, owner-created passcode reset, and forced sign-out controls remain in Users; My Profile shows those as read-only account context.

---

### Decision C1: Google Account Linking

**Approach:** Handled via the claim flow on the login page, not as a separate profile feature.

**Reasoning:** The claim flow already handles the Google account linking scenario for messaging-onboarded users. Adding a separate "Link Google Account" feature in the profile would be over-engineering at this stage. If a user signed up via email/password and later wants to link Google, they can use the Google login flow which will match by email.

---

## 3. Files Modified (Complete Inventory)

| File | Change | Lines |
|------|--------|-------|
| `src/lib/auth/index.ts` | Removed `roles` (plural) from session sanitizer | 374-378 |
| `src/app/api/auth/validate-claim/route.ts` | Removed token expiry check | 39-41 |
| `src/app/api/auth/claim-account/route.ts` | Added MODE 2 (email+password), removed expiry | Full rewrite |
| `src/components/templates/loginPage/index.tsx` | Added email/password claim setup UI | 168-206, 304-478 |
| `src/components/templates/main-app/users/usersList/userForm/index.tsx` | Server-side staff creation API | 1-12, 103-147 |
| `src/components/templates/platform/users/index.tsx` | Server-side verify, removed dead code | 1-17, 65, 154-177 |
| `src/components/organisms/headerComponent/profileActionsModal/index.tsx` | Wired UserProfileModal | 13, 19, 27, 192-196 |

### New Files Created

| File | Purpose |
|------|---------|
| `src/app/api/auth/create-staff/route.ts` | Server-side Firebase Auth staff creation |
| `src/app/api/auth/update-profile/route.ts` | Profile field updates |
| `src/app/api/auth/change-password/route.ts` | Password change with verification |
| `src/components/organisms/headerComponent/profileActionsModal/userProfileModal/index.tsx` | Profile modal UI |

---

## 4. API Reference

### `POST /api/auth/create-staff`
- **Purpose:** Create Firebase Auth user for staff via Admin SDK
- **Auth:** Requires active NextAuth session
- **Body:** `{ email, name, tenantId, storeId }`
- **Returns:** `{ success, uid, email }`
- **Firestore:** No direct Firestore ops (caller handles user doc creation)
- **Firebase Auth:** `authAdmin.createUser()`, `authAdmin.generatePasswordResetLink()`

### `POST /api/auth/claim-account`
- **Purpose:** Link messaging-onboarded business to real account
- **Mode 1 (Google):** `{ claimToken }` — requires active NextAuth session
- **Mode 2 (Email/Password):** `{ claimToken, email, password, name? }` — no session required
- **Firestore:** Reads `users` (1, by claimToken query), writes `users` + `tenants` + `stores` (3-4 in batch)
- **Firebase Auth (Mode 2 only):** `authAdmin.createUser()`, `authAdmin.setCustomUserClaims()`

### `GET /api/auth/validate-claim?token=TOKEN`
- **Purpose:** Validate claim token, return business info for welcome message
- **Auth:** None required (token IS auth)
- **Firestore:** Reads `users` (1, by claimToken query)
- **Returns:** `{ valid, businessName, phone }`

### `POST /api/auth/update-profile`
- **Purpose:** Update logged-in user's profile fields
- **Auth:** Requires active NextAuth session
- **Body:** `{ name?, phone?, phoneNumber?, countryCode?, dialCode? }`
- **Firestore:** Reads `users` (1), writes `users` (1)

### `POST /api/auth/change-password`
- **Purpose:** Change logged-in user's password
- **Auth:** Requires active NextAuth session
- **Body:** `{ currentPassword, newPassword }`
- **Firestore:** Writes `users` (1, modifiedOn + passwordChangedAt)
- **Firebase Auth:** `authAdmin.getUserByEmail()`, REST API verify, `authAdmin.updateUser()`

---

## 5. Security Considerations

- All APIs except `validate-claim` and `claim-account MODE 2` require active NextAuth session
- `claim-account MODE 2` uses the claim token as authentication — 256-bit random, single-use
- `update-profile` only allows whitelisted fields — no email changes
- `change-password` verifies current password before allowing change
- `create-staff` generates 24-byte cryptographic random password — never exposed
- All user doc updates use batch writes where multiple docs are affected

---

## 6. Build Status

- **TypeScript:** ✅ All changes compile clean
- **Pre-existing error:** `countryData` import in `approve/route.ts:11` (out of scope)
