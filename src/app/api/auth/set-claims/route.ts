export const dynamic = 'force-dynamic';
import { getUserByEmail } from '@database/users';
import { shouldUseSharedCanonicaFirebase } from '@lib/firebase/canonicaConfig';
import { canonicaAdminApp, canonicaAuthAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { authAdmin } from '@lib/firebase/firebaseAdmin';
import { validateAPIInput } from '@lib/security/inputValidation';
import { secureError, secureLog } from '@lib/security/secureLogger';
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

async function createCanonicaCustomTokenIfNeeded(
    email: string,
    displayName: string | null | undefined,
    customClaims: Record<string, string>,
): Promise<string | null> {
    if (shouldUseSharedCanonicaFirebase) return null;

    if (!canonicaAdminApp) {
        secureLog('[Auth] Canonica Firebase Admin not configured for separate auth sync');
        return null;
    }

    let canonicaUid: string;

    try {
        const canonicaUser = await canonicaAuthAdmin.getUserByEmail(email);
        canonicaUid = canonicaUser.uid;
    } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') {
            secureError('[Auth] Canonica user lookup failed during auth sync', error, { email });
            throw error;
        }

        const newCanonicaUser = await canonicaAuthAdmin.createUser({
            email,
            emailVerified: true,
            displayName: displayName || undefined,
        });
        canonicaUid = newCanonicaUser.uid;
    }

    await canonicaAuthAdmin.setCustomUserClaims(canonicaUid, customClaims);
    return canonicaAuthAdmin.createCustomToken(canonicaUid, customClaims);
}

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

        // Get user's current-store role. Older/platform records may still carry
        // a top-level role, so keep that as the compatibility fallback.
        const storeRole = Array.isArray(dbUser.stores)
            ? dbUser.stores.find((store: any) => store.storeId === dbUser.storeId)?.role
            : undefined;
        const userRole = storeRole || dbUser.role;

        const customClaims = {
            role: userRole || 'OWNER',
            platformRole: dbUser.platformRole || 'USER',
            tenantId: String(dbUser.tenantId),
            storeId: String(dbUser.storeId),
            uId: dbUser.id,
        };
        const canonicaCustomToken = await createCanonicaCustomTokenIfNeeded(
            session.user.email,
            session.user.name,
            customClaims,
        );

        // If UID provided, set claims on existing user
        if (uid) {
            await authAdmin.setCustomUserClaims(uid, customClaims);

            secureLog('[Auth] Custom claims set for existing Firebase user', {
                uid,
                email: session.user.email,
                role: customClaims.role,
                platformRole: customClaims.platformRole,
                tenantId: customClaims.tenantId,
                storeId: customClaims.storeId,
            });

            return NextResponse.json({
                success: true,
                claims: customClaims,
                canonicaCustomToken,
            });
        }

        // No UID - create custom token for OAuth users
        // Try to get or create Firebase user by email
        try {
            const firebaseUser = await authAdmin.getUserByEmail(session.user.email);
            uid = firebaseUser.uid;
        } catch (error: any) {
            if (error?.code !== 'auth/user-not-found') {
                secureError('[Auth] Firebase user lookup failed during auth sync', error, { email: session.user.email });
                throw error;
            }

            const newUser = await authAdmin.createUser({
                email: session.user.email,
                emailVerified: true,
                displayName: session.user.name || undefined,
            });
            uid = newUser.uid;
            secureLog('[Auth] Created Firebase Auth user for OAuth login', { email: session.user.email, uid });
        }

        // Set custom claims
        await authAdmin.setCustomUserClaims(uid, customClaims);

        // Create custom token for client to sign in with
        const customToken = await authAdmin.createCustomToken(uid, customClaims);

        secureLog('[Auth] Custom token created for OAuth user', {
            uid,
            email: session.user.email,
            role: customClaims.role,
            platformRole: customClaims.platformRole,
            tenantId: customClaims.tenantId,
            storeId: customClaims.storeId,
        });

        return NextResponse.json({
            success: true,
            customToken,  // Client can use this to sign in
            canonicaCustomToken,
            claims: customClaims
        });

    } catch (error) {
        secureError('Failed to set custom claims', error as Error, { email: session?.user?.email });
        return NextResponse.json(
            { error: 'Failed to set custom claims' },
            { status: 500 }
        );
    }
});
