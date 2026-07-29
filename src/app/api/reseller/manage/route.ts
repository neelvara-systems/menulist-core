export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { RESELLER_CAPS } from "@config/resellerPricing";
import { DB_COLLECTIONS } from "@constant/database";
import {
    createResellerProfile,
    getAllResellerProfiles,
    getResellerProfileById,
    getResellerProfileAdmissionConflict,
    updateResellerProfile,
} from "@database/reseller/server";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { logger } from "@lib/monitoring/logger";
import { projectResellerManagementProfile } from "@lib/reseller/resellerManagementProfile";
import { getEmailValidationError, validateEmail } from "@lib/validation/emailDomainValidator";
import { LOGIN_USERNAME_PATTERN } from "@lib/auth/loginIdentifiers";
import { withAuth } from "../../../../middleware/auth";
import { z } from "zod";
import { validateAPIInput } from "@lib/security/inputValidation";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import {
    applyResellerReadRateLimit,
    resellerPrivateJson,
    withResellerPrivateHeaders,
} from "../readRateLimit";
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
            return resellerPrivateJson({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitResponse = await applyResellerReadRateLimit(session, "manage");
        if (rateLimitResponse) return rateLimitResponse;

        const persistedProfiles = await getAllResellerProfiles();
        const projectedProfiles = persistedProfiles
            .slice(0, 50)
            .map(projectResellerManagementProfile);
        const profiles = projectedProfiles.filter((profile) => profile !== null);
        const invalidProfileCount = projectedProfiles.length - profiles.length;
        return resellerPrivateJson({
            invalidProfileCount,
            isCapped: persistedProfiles.length > 50,
            isPartial: persistedProfiles.length > 50 || invalidProfileCount > 0,
            profiles,
        });
    } catch (error) {
        logResellerApiFailure('reseller_manage_get_route_failed', error, {
            ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
        });
        return resellerPrivateJson({ error: 'Failed to fetch reseller profiles.' }, { status: 500 });
    }
}, { requiredPlatformRole: 'PLATFORM' });

// --- POST: Create or update a reseller profile ---
const CreateResellerSchema = z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(15),
    email: z.string().email(),
    username: z.string().trim().toLowerCase().min(3).max(50).regex(LOGIN_USERNAME_PATTERN),
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
    username: z.string().trim().toLowerCase().min(3).max(50).regex(LOGIN_USERNAME_PATTERN).optional(),
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

type FirebaseErrorLike = {
    code?: unknown;
};

const getFirebaseErrorCode = (error: unknown): string | null => {
    if (!error || typeof error !== "object" || !("code" in error)) return null;
    const code = (error as FirebaseErrorLike).code;
    return typeof code === "string" ? code : null;
};

const getProfileAdmissionResponse = (
    error: unknown,
): ReturnType<typeof resellerPrivateJson> | null => {
    const conflict = getResellerProfileAdmissionConflict(error);
    if (conflict === "email") {
        return resellerPrivateJson({ error: "A reseller profile already uses this email." }, { status: 409 });
    }
    if (conflict === "username") {
        return resellerPrivateJson({ error: "A reseller profile already uses this username." }, { status: 409 });
    }
    if (conflict === "profile") {
        return resellerPrivateJson({ error: "Reseller profile changed while this request was running." }, { status: 409 });
    }
    if (conflict === "total-cap") {
        return resellerPrivateJson({
            error: `Maximum reseller accounts reached (${RESELLER_CAPS.MAX_TOTAL_RESELLERS}).`,
        }, { status: 409 });
    }
    return null;
};

async function cleanupCreatedResellerLoginAccount(
    db: admin.firestore.Firestore,
    uid: string,
): Promise<boolean> {
    const cleanupResults = await Promise.allSettled([
        db.collection(DB_COLLECTIONS.USERS).doc(uid).delete(),
        authAdmin.deleteUser(uid),
    ]);
    cleanupResults.forEach((result) => {
        if (result.status !== 'rejected') return;
        logResellerApiFailure('reseller_manage_auth_cleanup_failed', result.reason, {
            ...getBoundedResellerApiStringContext('authUserId', uid),
        });
    });
    return cleanupResults.every((result) => result.status === "fulfilled");
}

type ResellerAuthRollbackState = {
    customClaims?: Record<string, unknown>;
    disabled: boolean;
    displayName?: string;
    email?: string;
    emailVerified: boolean;
    uid: string;
};

async function restoreExistingResellerLoginAccount(
    rollback: ResellerAuthRollbackState,
): Promise<boolean> {
    try {
        await authAdmin.updateUser(rollback.uid, {
            disabled: rollback.disabled,
            displayName: rollback.displayName || null,
            emailVerified: rollback.emailVerified,
            ...(rollback.email ? { email: rollback.email } : {}),
        });
        await authAdmin.setCustomUserClaims(rollback.uid, rollback.customClaims || null);
        return true;
    } catch (error) {
        logResellerApiFailure('reseller_manage_auth_rollback_failed', error, {
            ...getBoundedResellerApiStringContext('authUserId', rollback.uid),
        });
        return false;
    }
}

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
    const authUser = await authAdmin.getUserByEmail(email).catch((error: unknown) => {
        if (getFirebaseErrorCode(error) === 'auth/user-not-found') return null;
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

async function findAuthUser(
    existingProfile: { authUserId?: string; id?: string },
    email: string,
) {
    const candidateIds = [existingProfile?.authUserId, existingProfile?.id].filter(Boolean);
    for (const uid of candidateIds) {
        try {
            return await authAdmin.getUser(String(uid));
        } catch (error: unknown) {
            if (getFirebaseErrorCode(error) !== 'auth/user-not-found') throw error;
        }
    }

    try {
        return await authAdmin.getUserByEmail(email);
    } catch (error: unknown) {
        if (getFirebaseErrorCode(error) === 'auth/user-not-found') return null;
        throw error;
    }
}

async function syncResellerLoginAccount(params: {
    active: boolean;
    authUserId?: string;
    db: admin.firestore.Firestore;
    email: string;
    name: string;
    password?: string;
    resellerProfileId?: string;
}) {
    const authUser = params.authUserId
        ? await findAuthUser({ authUserId: params.authUserId, id: params.authUserId }, params.email)
        : null;

    let uid = authUser?.uid;
    let createdAuthUser = false;
    const rollback = authUser ? {
        customClaims: authUser.customClaims,
        disabled: authUser.disabled,
        displayName: authUser.displayName,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        uid: authUser.uid,
    } satisfies ResellerAuthRollbackState : undefined;
    if (uid) {
        const updatePayload: admin.auth.UpdateRequest = {
            disabled: !params.active,
            displayName: params.name,
            email: params.email,
            emailVerified: true,
        };
        await authAdmin.updateUser(uid, updatePayload);
    } else {
        if (!params.password) throw new Error("Reseller login password is required.");
        const createdUser = await authAdmin.createUser({
            disabled: !params.active,
            displayName: params.name,
            email: params.email,
            emailVerified: true,
            password: params.password,
        });
        uid = createdUser.uid;
        createdAuthUser = true;
    }

    try {
        const resellerProfileId = params.resellerProfileId || uid;
        await authAdmin.setCustomUserClaims(uid, {
            platformRole: 'RESELLER',
            resellerProfileId,
            role: '',
            uId: uid,
        });

    } catch (error) {
        if (createdAuthUser) await cleanupCreatedResellerLoginAccount(params.db, uid);
        else if (rollback) await restoreExistingResellerLoginAccount(rollback);
        throw error;
    }

    return { createdAuthUser, rollback, uid };
}

const getResellerUserWrite = (params: {
    active: boolean;
    createdAuthUser: boolean;
    email: string;
    name: string;
    now: admin.firestore.Timestamp;
    resellerProfileId: string;
    username: string;
}): Record<string, unknown> => ({
    active: params.active,
    email: params.email,
    isVerified: true,
    modifiedOn: params.now,
    name: params.name,
    onboardingSource: 'RESELLER_MANAGEMENT',
    platformRole: 'RESELLER',
    profileImage: '',
    resellerProfileId: params.resellerProfileId,
    role: '',
    storeIds: [],
    stores: [],
    username: params.username,
    ...(params.createdAuthUser ? { createdOn: params.now, createdVia: 'reseller-management' } : {}),
});

export const POST = withAuth(async (request, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return resellerPrivateJson({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const userRateLimitHash = hashPublicRateLimitValue(session.user.id);
        const rateLimitResult = await checkRateLimit({
            key: `reseller-manage:${userRateLimitHash}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            return resellerPrivateJson({
                error: rateLimitResult.reason === 'provider_unavailable'
                    ? "Service temporarily unavailable. Please try again later."
                    : "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            }, { status: rateLimitResult.reason === 'provider_unavailable' ? 503 : 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return withResellerPrivateHeaders(bodyResult.response);
        const body = bodyResult.data;
        const isUpdate = (
            typeof body === "object"
            && body !== null
            && "profileId" in body
            && Boolean(body.profileId)
        );
        const db = getDb();

        if (isUpdate) {
            // UPDATE existing profile
            const validation = validateAPIInput(UpdateResellerSchema, body);
            if (!validation.success) {
                const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
                return resellerPrivateJson({ error: 'Invalid input', details: errorMsg }, { status: 400 });
            }

            const { profileId, ...updates } = validation.data;

            // Verify profile exists
            const existing = await getResellerProfileById(profileId);
            if (!existing) {
                return resellerPrivateJson({ error: "Reseller profile not found." }, { status: 404 });
            }

            const nextEmail = normalizeEmail(updates.email || existing.email);
            const emailValidation = validateEmail(nextEmail);
            if (!emailValidation.valid) {
                return resellerPrivateJson({ error: getEmailValidationError(nextEmail) }, { status: 400 });
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
                return resellerPrivateJson({ error: duplicateError }, { status: 409 });
            }

            if (!existingAuthUser && !updates.password) {
                return resellerPrivateJson({
                    error: "Set a password to create this reseller's login account.",
                }, { status: 409 });
            }

            const syncedAccount = await syncResellerLoginAccount({
                active: updates.active ?? existing.active !== false,
                authUserId: existingAuthUser?.uid,
                db,
                email: nextEmail,
                name: updates.name || existing.name,
                password: updates.password,
                resellerProfileId: profileId,
            });

            const { password: _password, ...profileUpdates } = updates;
            const modifiedOn = admin.firestore.Timestamp.now();
            try {
                await updateResellerProfile({
                    email: nextEmail,
                    profileId,
                    updates: removeUndefinedFields({
                        ...profileUpdates,
                        authUserId: syncedAccount.uid,
                        email: nextEmail,
                        modifiedOn,
                        password: admin.firestore.FieldValue.delete(),
                        passwordSetAt: syncedAccount.createdAuthUser
                            ? modifiedOn
                            : existing.passwordSetAt || null,
                        username: nextUsername,
                    }),
                    user: getResellerUserWrite({
                        active: updates.active ?? existing.active !== false,
                        createdAuthUser: syncedAccount.createdAuthUser,
                        email: nextEmail,
                        name: updates.name || existing.name,
                        now: modifiedOn,
                        resellerProfileId: profileId,
                        username: nextUsername,
                    }),
                    userId: syncedAccount.uid,
                    username: nextUsername,
                });
            } catch (error) {
                let compensationSucceeded = true;
                if (syncedAccount.createdAuthUser) {
                    compensationSucceeded = await cleanupCreatedResellerLoginAccount(db, syncedAccount.uid);
                } else if (syncedAccount.rollback) {
                    compensationSucceeded = await restoreExistingResellerLoginAccount(syncedAccount.rollback);
                }
                if (!compensationSucceeded) throw new Error("Reseller login compensation failed.");
                const admissionResponse = getProfileAdmissionResponse(error);
                if (admissionResponse) return admissionResponse;
                throw error;
            }

            if (updates.password && !syncedAccount.createdAuthUser) {
                await authAdmin.updateUser(syncedAccount.uid, { password: updates.password });
                await db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(profileId).update({
                    modifiedOn: admin.firestore.Timestamp.now(),
                    passwordSetAt: admin.firestore.Timestamp.now(),
                });
            }

            logger.info('Reseller profile updated', {
                endpoint: request.nextUrl.pathname,
                ...getBoundedResellerApiStringContext('profileId', profileId),
                updatedFieldCount: Object.keys(profileUpdates).length,
                ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
            });

            return resellerPrivateJson({ success: true, profileId, action: 'updated' });
        } else {
            // CREATE new profile
            const validation = validateAPIInput(CreateResellerSchema, body);
            if (!validation.success) {
                const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
                return resellerPrivateJson({ error: 'Invalid input', details: errorMsg }, { status: 400 });
            }

            const data = validation.data;
            const email = normalizeEmail(data.email);
            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                return resellerPrivateJson({ error: getEmailValidationError(email) }, { status: 400 });
            }

            const username = data.username.trim();
            const duplicateError = await assertResellerUniqueness(db, email, username);
            if (duplicateError) {
                return resellerPrivateJson({ error: duplicateError }, { status: 409 });
            }

            const syncedAccount = await syncResellerLoginAccount({
                active: data.active !== undefined ? data.active : true,
                db,
                email,
                name: data.name,
                password: data.password,
            });

            const now = admin.firestore.Timestamp.now();
            try {
                await createResellerProfile({
                    email,
                    maxProfiles: RESELLER_CAPS.MAX_TOTAL_RESELLERS,
                    profile: removeUndefinedFields({
                        active: data.active !== undefined ? data.active : true,
                        activatedAt: now,
                        addressLine: data.addressLine,
                        authUserId: syncedAccount.uid,
                        city: data.city,
                        country: data.country,
                        createdBy: session.user?.email || 'platform',
                        createdOn: now,
                        currentActiveOfflineStores: 0,
                        email,
                        id: syncedAccount.uid,
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
                    }),
                    profileId: syncedAccount.uid,
                    user: getResellerUserWrite({
                        active: data.active !== undefined ? data.active : true,
                        createdAuthUser: syncedAccount.createdAuthUser,
                        email,
                        name: data.name,
                        now,
                        resellerProfileId: syncedAccount.uid,
                        username,
                    }),
                    userId: syncedAccount.uid,
                    username,
                });
            } catch (error) {
                const cleanupSucceeded = await cleanupCreatedResellerLoginAccount(db, syncedAccount.uid);
                if (!cleanupSucceeded) throw new Error("Reseller login cleanup failed.");
                const admissionResponse = getProfileAdmissionResponse(error);
                if (admissionResponse) return admissionResponse;
                throw error;
            }

            logger.info('Reseller profile created', {
                endpoint: request.nextUrl.pathname,
                ...getBoundedResellerApiStringContext('profileId', syncedAccount.uid),
                ...getBoundedResellerApiStringContext('resellerName', data.name),
                ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
            });

            return resellerPrivateJson({ success: true, profileId: syncedAccount.uid, action: 'created' });
        }
    } catch (error) {
        logResellerApiFailure('reseller_manage_post_route_failed', error, {
            ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
        });
        return resellerPrivateJson({ error: 'Failed to manage reseller profile.' }, { status: 500 });
    }
}, { requiredPlatformRole: 'PLATFORM' });
