export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { RESELLER_CAPS } from "@config/resellerPricing";
import { DB_COLLECTIONS } from "@constant/database";
import {
    getAllResellerProfiles,
    getResellerProfileById,
} from "@database/reseller/server";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { logger } from "@lib/monitoring/logger";
import { getEmailValidationError, validateEmail } from "@lib/validation/emailDomainValidator";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { z } from "zod";
import { validateAPIInput } from "@lib/security/inputValidation";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { applyResellerReadRateLimit } from "../readRateLimit";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";

/**
 * GET /api/reseller/manage — List all reseller profiles (PLATFORM only)
 * POST /api/reseller/manage — Create or update a reseller profile (PLATFORM only)
 * 
 * This is the founder's reseller management endpoint.
 * NOT accessible by resellers — only PLATFORM role.
 */

// --- GET: List all reseller profiles ---
export const GET = withAuth(async (request, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitResponse = await applyResellerReadRateLimit(session, "manage");
        if (rateLimitResponse) return rateLimitResponse;

        const profiles = await getAllResellerProfiles();
        return NextResponse.json({ profiles });
    } catch (error) {
        logResellerApiFailure('reseller_manage_get_route_failed', error, {
            ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
        });
        return NextResponse.json({ error: 'Failed to fetch reseller profiles.' }, { status: 500 });
    }
}, { requiredPlatformRole: 'PLATFORM' });

// --- POST: Create or update a reseller profile ---
const CreateResellerSchema = z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(15),
    email: z.string().email(),
    username: z.string().min(3).max(50),
    password: z.string().min(6).max(100),
    addressLine: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(10).optional(),
    country: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
    maxOfflineActivations: z.number().int().min(1).max(100).optional(),
    active: z.boolean().optional(),
});

const UpdateResellerSchema = z.object({
    profileId: z.string().min(1).max(128).refine((value) => value === value.trim() && isValidFirestoreDocumentId(value), 'Invalid profile ID'),
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(10).max(15).optional(),
    email: z.string().email().optional(),
    username: z.string().min(3).max(50).optional(),
    password: z.string().min(6).max(100).optional(),
    addressLine: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(10).optional(),
    country: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
    maxOfflineActivations: z.number().int().min(1).max(100).optional(),
    active: z.boolean().optional(),
});

const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;

const normalizeEmail = (email: string) => email.toLowerCase().trim();

const getDb = () => admin.firestore();

const removeUndefinedFields = (data: Record<string, unknown>) => sanitizeForFirestore(data, {
    undefinedObjectValue: "omit",
});

async function assertResellerUniqueness(
    db: admin.firestore.Firestore,
    email: string,
    username: string,
    excludeProfileId?: string,
    allowedUserIds: string[] = [],
) {
    const [emailSnapshot, usernameSnapshot, userSnapshot] = await Promise.all([
        db.collection(DB_COLLECTIONS.RESELLER_PROFILES).where('email', '==', email).limit(1).get(),
        db.collection(DB_COLLECTIONS.RESELLER_PROFILES).where('username', '==', username).limit(1).get(),
        db.collection(DB_COLLECTIONS.USERS).where('email', '==', email).limit(1).get(),
    ]);
    const authUser = await authAdmin.getUserByEmail(email).catch((error: any) => {
        if (error?.code === 'auth/user-not-found') return null;
        throw error;
    });

    const emailProfile = emailSnapshot.docs[0];
    if (emailProfile && emailProfile.id !== excludeProfileId) {
        return "A reseller profile already uses this email.";
    }

    const usernameProfile = usernameSnapshot.docs[0];
    if (usernameProfile && usernameProfile.id !== excludeProfileId) {
        return "A reseller profile already uses this username.";
    }

    const userDoc = userSnapshot.docs[0];
    if (userDoc && userDoc.id !== excludeProfileId && !allowedUserIds.includes(userDoc.id)) {
        return "This email is already linked to another MenuList account.";
    }

    if (authUser && authUser.uid !== excludeProfileId && !allowedUserIds.includes(authUser.uid)) {
        return "This email already has a login account.";
    }

    return null;
}

async function findAuthUser(existingProfile: any, email: string) {
    const candidateIds = [existingProfile?.authUserId, existingProfile?.id].filter(Boolean);
    for (const uid of candidateIds) {
        try {
            return await authAdmin.getUser(String(uid));
        } catch (error: any) {
            if (error?.code !== 'auth/user-not-found') throw error;
        }
    }

    try {
        return await authAdmin.getUserByEmail(email);
    } catch (error: any) {
        if (error?.code === 'auth/user-not-found') return null;
        throw error;
    }
}

async function syncResellerLoginAccount(params: {
    active: boolean;
    db: admin.firestore.Firestore;
    email: string;
    name: string;
    password?: string;
    profileId?: string;
    username: string;
}) {
    const now = admin.firestore.Timestamp.now();
    const authUser = params.profileId
        ? await findAuthUser({ authUserId: params.profileId, id: params.profileId }, params.email)
        : null;

    let uid = authUser?.uid;
    if (uid) {
        const updatePayload: admin.auth.UpdateRequest = {
            disabled: !params.active,
            displayName: params.name,
            email: params.email,
            emailVerified: true,
        };
        if (params.password) updatePayload.password = params.password;
        await authAdmin.updateUser(uid, updatePayload);
    } else {
        const createdUser = await authAdmin.createUser({
            disabled: !params.active,
            displayName: params.name,
            email: params.email,
            emailVerified: true,
            password: params.password,
        });
        uid = createdUser.uid;
    }

    await authAdmin.setCustomUserClaims(uid, {
        platformRole: 'RESELLER',
        resellerProfileId: uid,
        role: '',
        uId: uid,
    });

    await params.db.collection(DB_COLLECTIONS.USERS).doc(uid).set({
        active: params.active,
        email: params.email,
        isVerified: true,
        modifiedOn: now,
        name: params.name,
        onboardingSource: 'RESELLER_MANAGEMENT',
        platformRole: 'RESELLER',
        profileImage: '',
        resellerProfileId: uid,
        role: '',
        storeIds: [],
        stores: [],
        username: params.username,
        ...(params.profileId ? {} : { createdOn: now, createdVia: 'reseller-management' }),
    }, { merge: true });

    return uid;
}

export const POST = withAuth(async (request, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const userRateLimitHash = hashPublicRateLimitValue(session.user.id);
        const rateLimitResult = await checkRateLimit({
            key: `reseller-manage:${userRateLimitHash}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            }, { status: 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const isUpdate = Boolean(body.profileId);
        const db = getDb();

        if (isUpdate) {
            // UPDATE existing profile
            const validation = validateAPIInput(UpdateResellerSchema, body);
            if (!validation.success) {
                const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
                return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
            }

            const { profileId, ...updates } = validation.data;

            // Verify profile exists
            const existing = await getResellerProfileById(profileId);
            if (!existing) {
                return NextResponse.json({ error: "Reseller profile not found." }, { status: 404 });
            }

            const nextEmail = normalizeEmail(updates.email || existing.email);
            const emailValidation = validateEmail(nextEmail);
            if (!emailValidation.valid) {
                return NextResponse.json({ error: getEmailValidationError(nextEmail) }, { status: 400 });
            }

            const nextUsername = (updates.username || existing.username || '').trim();
            const existingAuthUser = await findAuthUser(existing, nextEmail);
            const duplicateError = await assertResellerUniqueness(
                db,
                nextEmail,
                nextUsername,
                profileId,
                [existingAuthUser?.uid, existing.authUserId].filter(Boolean) as string[],
            );
            if (duplicateError) {
                return NextResponse.json({ error: duplicateError }, { status: 409 });
            }

            if (!existingAuthUser && !updates.password) {
                return NextResponse.json({
                    error: "Set a password to create this reseller's login account.",
                }, { status: 409 });
            }

            const authUserId = await syncResellerLoginAccount({
                active: updates.active ?? existing.active !== false,
                db,
                email: nextEmail,
                name: updates.name || existing.name,
                password: updates.password,
                profileId: existingAuthUser?.uid,
                username: nextUsername,
            });

            const { password: _password, ...profileUpdates } = updates;
            await db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(profileId).set(removeUndefinedFields({
                ...profileUpdates,
                authUserId,
                email: nextEmail,
                modifiedOn: admin.firestore.Timestamp.now(),
                password: admin.firestore.FieldValue.delete(),
                passwordSetAt: updates.password ? admin.firestore.Timestamp.now() : existing.passwordSetAt || null,
                username: nextUsername,
            }), { merge: true });

            logger.info('Reseller profile updated', {
                endpoint: request.nextUrl.pathname,
                ...getBoundedResellerApiStringContext('profileId', profileId),
                updatedFieldCount: Object.keys(profileUpdates).length,
                ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
            });

            return NextResponse.json({ success: true, profileId, action: 'updated' });
        } else {
            // CREATE new profile
            const validation = validateAPIInput(CreateResellerSchema, body);
            if (!validation.success) {
                const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
                return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
            }

            const data = validation.data;
            const email = normalizeEmail(data.email);
            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                return NextResponse.json({ error: getEmailValidationError(email) }, { status: 400 });
            }

            const existingProfiles = await getAllResellerProfiles();
            if (existingProfiles.length >= RESELLER_CAPS.MAX_TOTAL_RESELLERS) {
                return NextResponse.json({
                    error: `Maximum reseller accounts reached (${RESELLER_CAPS.MAX_TOTAL_RESELLERS}). Deactivate an existing reseller before adding another.`,
                }, { status: 400 });
            }

            const username = data.username.trim();
            const duplicateError = await assertResellerUniqueness(db, email, username);
            if (duplicateError) {
                return NextResponse.json({ error: duplicateError }, { status: 409 });
            }

            const authUserId = await syncResellerLoginAccount({
                active: data.active !== undefined ? data.active : true,
                db,
                email,
                name: data.name,
                password: data.password,
                username,
            });

            const now = admin.firestore.Timestamp.now();
            await db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(authUserId).set(removeUndefinedFields({
                active: data.active !== undefined ? data.active : true,
                activatedAt: now,
                addressLine: data.addressLine,
                authUserId,
                city: data.city,
                country: data.country,
                createdBy: session.user?.email || 'platform',
                createdOn: now,
                currentActiveOfflineStores: 0,
                email,
                id: authUserId,
                maxOfflineActivations: data.maxOfflineActivations || RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER,
                modifiedOn: now,
                name: data.name,
                notes: data.notes,
                phone: data.phone,
                passwordSetAt: now,
                postalCode: data.postalCode,
                state: data.state,
                totalOfflineStores: 0,
                totalOnlineStores: 0,
                totalRevenueCollectedPaise: 0,
                totalStoresOnboarded: 0,
                totalTransactions: 0,
                username,
            }));

            logger.info('Reseller profile created', {
                endpoint: request.nextUrl.pathname,
                ...getBoundedResellerApiStringContext('profileId', authUserId),
                ...getBoundedResellerApiStringContext('resellerName', data.name),
                ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
            });

            return NextResponse.json({ success: true, profileId: authUserId, action: 'created' });
        }
    } catch (error) {
        logResellerApiFailure('reseller_manage_post_route_failed', error, {
            ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
        });
        return NextResponse.json({ error: 'Failed to manage reseller profile.' }, { status: 500 });
    }
}, { requiredPlatformRole: 'PLATFORM' });
