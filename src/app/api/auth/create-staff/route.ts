export const dynamic = 'force-dynamic';
/**
 * Create Staff User API — Server-side staff user creation
 *
 * Handles three cases (ADR: Global Email Uniqueness):
 * 1. New email → Create Firebase Auth user + Firestore user doc
 * 2. Email exists, same tenant → Add store mapping to existing user (multi-store)
 * 3. Email exists, different tenant → Reject (email belongs to another business)
 *
 * Requires: Active NextAuth session with owner/manager role.
 *
 * @see __docs__/auth/adr-email-uniqueness-strategy.md
 * @see __docs__/auth/README.md — Staff User Creation
 */

import { createStaffUser } from "@lib/staffManagement/server";
import { withAuth } from "../../../../middleware/auth";

export const POST = withAuth(createStaffUser);
