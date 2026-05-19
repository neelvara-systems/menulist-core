export const dynamic = 'force-dynamic';
/**
 * Update Profile API — Update logged-in user's profile fields
 *
 * Supports updating: name, displayEmail, phone, countryCode, dialCode
 * Auth login email changes are NOT supported here (requires re-verification flow).
 *
 * Requires: Active NextAuth session.
 *
 * @see __docs__/auth/README.md — User Profile Management
 */

import { updateCurrentUserProfile } from "@lib/userProfile/server";
import { withAuth } from "../../../../middleware/auth";

export const POST = withAuth(updateCurrentUserProfile);
