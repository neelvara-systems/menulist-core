export const dynamic = 'force-dynamic';
/**
 * Update Profile API — Update logged-in user's profile fields
 *
 * Supports updating: name, phone, countryCode, dialCode
 * Email changes are NOT supported here (requires re-verification flow).
 *
 * Requires: Active NextAuth session.
 *
 * @see __docs__/auth/README.md — User Profile Management
 */

import { DB_COLLECTIONS } from "@constant/database";
import { authOptions } from "@lib/auth";
import { admin } from "@lib/firebase/firebaseAdmin";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const db = admin.firestore();

const ALLOWED_FIELDS = ["name", "phone", "phoneNumber", "countryCode", "dialCode"] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    // Only allow whitelisted fields
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string" || body[field].length > 200) {
          return NextResponse.json({ error: `Invalid value for ${field}` }, { status: 400 });
        }
        updates[field] = body[field].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.modifiedOn = admin.firestore.Timestamp.now();

    // Update user doc in Firestore
    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(session.user.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await userRef.update(updates);

    console.log(`[update-profile] Updated profile for ${session.user.email}:`, Object.keys(updates));

    return NextResponse.json({
      success: true,
      updated: Object.keys(updates).filter(k => k !== "modifiedOn"),
    });
  } catch (error) {
    console.error("[update-profile] Error:", (error as Error).message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
