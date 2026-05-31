import { HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

const PLATFORM_ROLES = new Set(['PLATFORM', 'PLATFORM_SUPPORT']);

export const assertAnswerlatticePlatformCallable = (request: any, functionName: string) => {
    const auth = request.auth;
    if (!auth?.uid) {
        logger.warn('[Answerlattice Callable] Unauthenticated request blocked', { functionName });
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const token = auth.token || {};
    const platformRole = token.platformRole || token.role;
    if (!PLATFORM_ROLES.has(platformRole)) {
        logger.warn('[Answerlattice Callable] Unauthorized platform request blocked', {
            functionName,
            uid: auth.uid,
            email: token.email || undefined,
            platformRole: platformRole || undefined,
        });
        throw new HttpsError('permission-denied', 'Platform access is required.');
    }

    return {
        uid: auth.uid,
        email: token.email || undefined,
        platformRole,
    };
};
