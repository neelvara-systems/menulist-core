import { DB_COLLECTIONS } from '@constant/database';
import { MENULIST_PLATFORM_USER_ROLE } from '@constant/user';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { resolveCurrentSessionUserDocumentId } from './sessionUserDocumentId';

export { resolveCurrentSessionUserDocumentId } from './sessionUserDocumentId';

const CANONICAL_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const isUnknownRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFalseOrUnset = (value: unknown): boolean => (
    value === undefined || value === null || value === false
);

const hasValidUnblockedLifecycleState = (userData: Record<string, unknown>): boolean => {
    const blockDetails = userData.blockDetails;
    return isFalseOrUnset(userData.deleted)
        && isFalseOrUnset(userData.authDisabled)
        && isFalseOrUnset(userData.blocked)
        && isFalseOrUnset(userData.tenantBlocked)
        && (
            blockDetails === undefined
            || blockDetails === null
            || (isUnknownRecord(blockDetails) && isFalseOrUnset(blockDetails.blocked))
        );
};

const normalizeCurrentPlatformUserDocumentId = (value: unknown): string | null => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
};

const normalizeCurrentPlatformEmail = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const email = value.toLowerCase().trim();
    return email && email.includes('@') ? email : null;
};

const currentPlatformTimestampMillis = (value: unknown): number | null => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const millis = value < 1_000_000_000_000 ? value * 1000 : value;
        return millis > 0 ? millis : null;
    }
    if (typeof value === 'string') {
        const timestamp = value.trim();
        if (!CANONICAL_ISO_TIMESTAMP_PATTERN.test(timestamp)) return null;
        const millis = Date.parse(timestamp);
        return Number.isFinite(millis) && millis > 0 && new Date(millis).toISOString() === timestamp
            ? millis
            : null;
    }
    if (isUnknownRecord(value)) {
        try {
            const toMillis = value.toMillis;
            if (typeof toMillis === 'function') {
                const millis = Number(toMillis.call(value));
                return Number.isFinite(millis) && millis > 0 ? millis : null;
            }
            const seconds = Number(value.seconds ?? value._seconds);
            const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
            if (
                !Number.isFinite(seconds)
                || seconds <= 0
                || !Number.isInteger(seconds)
                || !Number.isFinite(nanoseconds)
                || !Number.isInteger(nanoseconds)
                || nanoseconds < 0
                || nanoseconds >= 1_000_000_000
            ) {
                return null;
            }
            return (seconds * 1000) + Math.floor(nanoseconds / 1_000_000);
        } catch {
            return null;
        }
    }
    return null;
};

export function isCurrentUserRecordEligible(params: {
    documentId: string;
    session: unknown;
    userData: unknown;
}): boolean {
    if (!isUnknownRecord(params.userData)) return false;
    const userData = params.userData;
    const session = isUnknownRecord(params.session)
        ? params.session
        : {};
    const sessionUser = isUnknownRecord(session.user)
        ? session.user
        : {};
    const sessionUserId = resolveCurrentSessionUserDocumentId(session);
    const storedUserIdValue = userData.id ?? userData.uId;
    const storedUserId = storedUserIdValue === undefined || storedUserIdValue === null
        ? params.documentId
        : normalizeCurrentPlatformUserDocumentId(storedUserIdValue);
    const sessionEmail = normalizeCurrentPlatformEmail(sessionUser.email);
    const currentEmail = normalizeCurrentPlatformEmail(userData.email);
    if (
        !sessionUserId
        || !storedUserId
        || sessionUserId !== params.documentId
        || storedUserId !== params.documentId
        || !sessionEmail
        || currentEmail !== sessionEmail
        || userData.active !== true
        || userData.isVerified !== true
        || userData.deleted === true
        || userData.authDisabled === true
        || isPlatformEntityBlocked(userData)
        || !hasValidUnblockedLifecycleState(userData)
    ) {
        return false;
    }

    const revocationTimestamps = [
        currentPlatformTimestampMillis(userData.sessionRevokedAt),
        currentPlatformTimestampMillis(userData.authTokensRevokedAt),
        currentPlatformTimestampMillis(userData.accessRevokedAt),
    ];
    const issuedAt = currentPlatformTimestampMillis(session.authIssuedAt ?? sessionUser.authIssuedAt);
    if (issuedAt === null || issuedAt <= 0 || revocationTimestamps.some((timestamp) => timestamp === null)) {
        return false;
    }
    const revokedAt = Math.max(...revocationTimestamps.filter((timestamp): timestamp is number => timestamp !== null));
    return revokedAt === 0 || revokedAt < issuedAt;
}

export function isCurrentPlatformUserRecordEligible(params: {
    documentId: string;
    session: unknown;
    userData: unknown;
}): boolean {
    return isCurrentUserRecordEligible(params)
        && isUnknownRecord(params.userData)
        && params.userData.platformRole === MENULIST_PLATFORM_USER_ROLE;
}

export async function getCurrentUser(session: unknown): Promise<{
    documentId: string;
    userData: Record<string, unknown>;
} | null> {
    const sessionRecord = isUnknownRecord(session)
        ? session
        : {};
    const sessionUser = isUnknownRecord(sessionRecord.user)
        ? sessionRecord.user
        : {};
    const userDocumentId = resolveCurrentSessionUserDocumentId(sessionRecord);
    const email = normalizeCurrentPlatformEmail(sessionUser.email);
    if (!userDocumentId || !email) return null;

    const directSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userDocumentId).get();
    if (!directSnapshot.exists) return null;
    const userData = directSnapshot.data();
    if (!isUnknownRecord(userData)) return null;
    if (!isCurrentUserRecordEligible({
        documentId: directSnapshot.id,
        session,
        userData,
    })) {
        return null;
    }
    return { documentId: directSnapshot.id, userData };
}

export async function getCurrentPlatformUser(session: unknown): Promise<{
    documentId: string;
    userData: Record<string, unknown>;
} | null> {
    const currentUser = await getCurrentUser(session);
    if (!currentUser || currentUser.userData.platformRole !== MENULIST_PLATFORM_USER_ROLE) {
        return null;
    }
    return currentUser;
}
