export const dynamic = 'force-dynamic';
import { getUserByEmail } from '@database/users';
import { authAdmin } from '@lib/firebase/firebaseAdmin';
import { validateAPIInput } from '@lib/security/inputValidation';
import { secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

/**
 * Set Firebase Auth Custom Claims & Create Custom Token
 * Called after NextAuth login to sync user data to Firebase Auth token
 * 
 * For Google OAuth users, creates a custom token they can use to sign in
 * 
 * SECURITY: OWASP A01 (Access Control) - Session required
 */

// Input validation schema
const setClaimsSchema = z.object({
    uid: z.string().optional().refine(
        val => !val || /^[a-zA-Z0-9_-]+$/.test(val),
        'Invalid UID format'
    )
});

export const POST = withAuth(async (request: NextRequest, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    try {
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Missing email in session' },
                { status: 400 }
            );
        }

        // Get user from database
        const dbUser: any = await getUserByEmail(session.user.email);

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get Firebase UID from request body (optional - we'll create if needed)
        const body = await request.json();

        // Validate input (OWASP A03: Injection Prevention)
        const validation = validateAPIInput(setClaimsSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            secureLog('[Auth] Invalid input for set-claims', { validationError: errorMsg });
            return NextResponse.json(
                { error: 'Invalid input' },
                { status: 400 }
            );
        }

        let { uid } = validation.data;

        // Get user's role from their stores (single role per store)
        const userRole = dbUser.stores
            ? dbUser.stores.find((store: any) => store.storeId === dbUser.storeId)?.role
            : null;

        const customClaims = {
            role: userRole || 'OWNER',
            tenantId: String(dbUser.tenantId),
            storeId: String(dbUser.storeId),
            uId: dbUser.id,
        };

        // If UID provided, set claims on existing user
        if (uid) {
            await authAdmin.setCustomUserClaims(uid, customClaims);

            console.log(' Custom claims set for existing user:', {
                uid,
                email: session.user.email,
                ...customClaims
            });

            return NextResponse.json({
                success: true,
                claims: customClaims
            });
        }

        // No UID - create custom token for OAuth users
        // Try to get or create Firebase user by email
        try {
            const firebaseUser = await authAdmin.getUserByEmail(session.user.email);
            uid = firebaseUser.uid;
        } catch (error) {
            // User doesn't exist in Firebase Auth, create them
            const newUser = await authAdmin.createUser({
                email: session.user.email,
                emailVerified: true,
                displayName: session.user.name || undefined,
            });
            uid = newUser.uid;
            console.log(' Created new Firebase Auth user for OAuth login');
        }

        // Set custom claims
        await authAdmin.setCustomUserClaims(uid, customClaims);

        // Create custom token for client to sign in with
        const customToken = await authAdmin.createCustomToken(uid, customClaims);

        console.log(' Custom token created for OAuth user:', {
            uid,
            email: session.user.email,
            ...customClaims
        });

        return NextResponse.json({
            success: true,
            customToken,  // Client can use this to sign in
            claims: customClaims
        });

    } catch (error) {
        console.error('Failed to set custom claims:', error);
        return NextResponse.json(
            { error: 'Failed to set custom claims', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
});
