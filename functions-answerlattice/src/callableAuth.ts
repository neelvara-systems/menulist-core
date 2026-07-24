import { HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from './constants/database';
import { firestoreAdmin } from './firebaseAdmin';
import {
    isCurrentAnswerlatticePlatformCallableUser,
    normalizeAnswerlatticeCallableAccessRevision,
    normalizeAnswerlatticeCallableEmail,
    normalizeAnswerlatticeCallableUserId,
} from './callableAuthBoundary';

const PLATFORM_ROLES = new Set(['PLATFORM', 'PLATFORM_SUPPORT']);

export const assertAnswerlatticePlatformCallable = async (
    request: any,
    functionName: string,
    options: { allowPlatformSupport?: boolean } = {},
) => {
    const auth = request.auth;
    if (!auth?.uid) {
        logger.warn('[Answerlattice Callable] Unauthenticated request blocked', { functionName });
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const token = auth.token || {};
    const platformRole = token.platformRole || token.role;
    if (
        !PLATFORM_ROLES.has(platformRole)
        || (platformRole === 'PLATFORM_SUPPORT' && options.allowPlatformSupport !== true)
    ) {
        logger.warn('[Answerlattice Callable] Unauthorized platform request blocked', {
            functionName,
            callerUidLength: auth.uid.length,
            platformRole: platformRole || undefined,
        });
        throw new HttpsError('permission-denied', 'Platform access is required.');
    }

    const userId = normalizeAnswerlatticeCallableUserId(token.uId);
    const email = normalizeAnswerlatticeCallableEmail(token.email);
    const accessRevision = normalizeAnswerlatticeCallableAccessRevision(token.accessRevision);
    if (!userId || !email || accessRevision === null) {
        logger.warn('[Answerlattice Callable] Incomplete platform identity blocked', {
            functionName,
            callerUidLength: auth.uid.length,
            platformRole,
        });
        throw new HttpsError('permission-denied', 'Current platform access is required.');
    }

    const userSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId).get();
    if (
        !userSnapshot.exists
        || !isCurrentAnswerlatticePlatformCallableUser(userSnapshot.data(), {
            accessRevision,
            email,
            platformRole,
            userId,
        })
    ) {
        logger.warn('[Answerlattice Callable] Stale or revoked platform identity blocked', {
            functionName,
            callerUidLength: auth.uid.length,
            platformRole,
            userDocumentExists: userSnapshot.exists,
        });
        throw new HttpsError('permission-denied', 'Current platform access is required.');
    }

    return {
        accessRevision,
        email,
        uid: auth.uid,
        platformRole,
        userId,
    };
};
