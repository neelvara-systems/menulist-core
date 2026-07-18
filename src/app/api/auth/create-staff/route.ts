export const dynamic = 'force-dynamic';
/**
 * Create Staff User API — Server-side staff user creation
 *
 * Handles three cases (ADR: Global Email Uniqueness):
 * 1. New email → Create Firebase Auth user + Firestore user doc
 * 2. Email exists, same tenant → Add store mapping to existing user (multi-store)
 * 3. Email exists, different tenant → Reject (email belongs to another business)
 *
 * Existing unverified Firestore users are only marked verified after this
 * handler creates a new Firebase Auth user and commits that UID binding.
 * An unrelated pre-existing Auth email is rejected and never adopted.
 *
 * Requires: Active NextAuth session with canManageUsers for the target store.
 *
 * @see __docs__/auth/adr-email-uniqueness-strategy.md
 * @see __docs__/auth/README.md — Staff User Creation
 */

import { createStaffUser } from "@lib/staffManagement/server";
import { withAuth } from "../../../../middleware/auth";

export const POST = withAuth(createStaffUser);
