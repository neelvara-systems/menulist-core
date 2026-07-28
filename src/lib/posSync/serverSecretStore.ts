import { DB_COLLECTIONS } from '@constant/database';
import { admin } from '@lib/firebase/firebaseAdmin';
import {
    normalizePosSyncStoredSecret,
    projectPosSyncSecretDocument,
} from './secretDocumentBoundary';

export type ResolvedPosSyncSecret = {
    secret: string;
    version: number;
};

export function normalizePosSyncSecretVersion(value: unknown): number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0;
}

export function getNextPosSyncSecretVersion(value: unknown): number | null {
    const current = normalizePosSyncSecretVersion(value);
    return current < Number.MAX_SAFE_INTEGER ? current + 1 : null;
}

export function getPosSyncSecretDocumentId(tenantDocumentId: string, storeDocumentId: string): string {
    return `${tenantDocumentId}_${storeDocumentId}`;
}

export function getPosSyncSecretRef(
    db: FirebaseFirestore.Firestore,
    tenantDocumentId: string,
    storeDocumentId: string,
): FirebaseFirestore.DocumentReference {
    return db
        .collection(DB_COLLECTIONS.POS_SYNC_SECRETS)
        .doc(getPosSyncSecretDocumentId(tenantDocumentId, storeDocumentId));
}

/**
 * Resolve the server-owned signing secret. By default, migrate the legacy store
 * field in the same transaction. Rotation can disable that migration because it
 * replaces the secret and version itself. The store keeps only a non-secret
 * version marker so concurrent rotation invalidates in-flight status work.
 */
export function resolvePosSyncSecretInTransaction(params: {
    migrate?: boolean;
    transaction: FirebaseFirestore.Transaction;
    storeRef: FirebaseFirestore.DocumentReference;
    storeData: FirebaseFirestore.DocumentData;
    secretRef: FirebaseFirestore.DocumentReference;
    secretSnapshot: FirebaseFirestore.DocumentSnapshot;
    tenantId: number;
    storeId: number;
}): ResolvedPosSyncSecret | null {
    const serverData = params.secretSnapshot.data();
    const serverDocument = projectPosSyncSecretDocument(
        serverData,
        params.tenantId,
        params.storeId,
    );
    const serverSecret = serverDocument?.secret || null;
    const legacySecret = normalizePosSyncStoredSecret(params.storeData?.posSync?.webhookSecret);
    const secret = serverSecret || legacySecret;
    if (!secret) return null;

    const existingVersion = Math.max(
        serverDocument?.version || 0,
        normalizePosSyncSecretVersion(params.storeData?.posSync?.secretVersion),
    );
    const version = existingVersion || 1;
    const legacyFieldPresent = legacySecret !== null;

    if (
        params.migrate !== false
        && (
            !serverSecret
            || serverDocument?.version !== version
            || serverDocument?.requiresRewrite === true
        )
    ) {
        const now = admin.firestore.Timestamp.now();
        params.transaction.set(params.secretRef, {
            createdOn: serverDocument?.createdOn instanceof admin.firestore.Timestamp
                ? serverDocument.createdOn
                : now,
            modifiedOn: now,
            migrationSource: serverSecret ? 'server' : 'store.posSync.webhookSecret',
            pId: 'ML',
            sId: params.storeId,
            secret,
            tId: params.tenantId,
            version,
        });
    }

    if (
        params.migrate !== false
        && (
            legacyFieldPresent
            || normalizePosSyncSecretVersion(params.storeData?.posSync?.secretVersion) !== version
        )
    ) {
        params.transaction.update(params.storeRef, {
            'posSync.secretVersion': version,
            ...(legacyFieldPresent ? {
                'posSync.webhookSecret': admin.firestore.FieldValue.delete(),
            } : {}),
        });
    }

    return { secret, version };
}
