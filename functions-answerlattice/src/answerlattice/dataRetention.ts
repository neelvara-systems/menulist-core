import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db, storageAdmin } from '../firebaseAdmin';
import {
    getAnswerlatticeBundleManifestDocId,
    normalizeAnswerlatticeStoredBundleVersion,
} from './compiledContextVersions';
import { parseExactAnswerlatticeScope } from './scopeBoundary';
import {
    ANSWERLATTICE_RETENTION_DAYS,
    ANSWERLATTICE_RETENTION_DAY_MS,
    type AnswerlatticeRetentionKey,
    getAnswerlatticeRetentionExpiryMillis,
} from '../sharedData/answerlatticeRetention';

const BUNDLE_ROOT = 'answerlattice-context';
const DEFAULT_BATCH_LIMIT = 100;
const DEFAULT_STORAGE_DELETE_LIMIT = 250;
const RETENTION_TASK_FAILED = 'ANSWERLATTICE_RETENTION_TASK_FAILED';

export const ANSWERLATTICE_CONTEXT_BUNDLE_KEEP_PREVIOUS_VERSIONS = 2;
export { ANSWERLATTICE_RETENTION_DAYS, type AnswerlatticeRetentionKey };

export interface AnswerlatticeRetentionTenantScope {
    tId: number;
    sId: number;
}

export interface AnswerlatticeRetentionCleanupResult {
    schedulerRunLogsDeleted: number;
    notificationLogsDeleted: number;
    ownerNotificationEventsDeleted: number;
    ownerNotificationDeliveriesDeleted: number;
    ownerNotificationRateLimitsDeleted: number;
    contactEnquiriesDeleted: number;
    queryEmbeddingsDeleted: number;
    aiSearchHistoryDeleted: number;
    contentFeedbackDeleted: number;
    contextBundleObjectsDeleted: number;
    errors: string[];
}

const emptyResult = (): AnswerlatticeRetentionCleanupResult => ({
    schedulerRunLogsDeleted: 0,
    notificationLogsDeleted: 0,
    ownerNotificationEventsDeleted: 0,
    ownerNotificationDeliveriesDeleted: 0,
    ownerNotificationRateLimitsDeleted: 0,
    contactEnquiriesDeleted: 0,
    queryEmbeddingsDeleted: 0,
    aiSearchHistoryDeleted: 0,
    contentFeedbackDeleted: 0,
    contextBundleObjectsDeleted: 0,
    errors: [],
});

const toMillis = (value?: Timestamp | Date | number | null): number => {
    if (!value) return Date.now();
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    return value.toMillis();
};

function getRetentionErrorContext(error: unknown): Record<string, string | number | null> {
    const source = error as { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown };
    const status = typeof source?.status === 'number'
        ? source.status
        : typeof source?.statusCode === 'number'
            ? source.statusCode
            : null;
    return {
        sourceErrorName: typeof source?.name === 'string' ? source.name : typeof error,
        sourceErrorCode: typeof source?.code === 'string' || typeof source?.code === 'number' ? String(source.code) : null,
        sourceStatusCode: status,
    };
}

export function getAnswerlatticeRetentionDays(key: AnswerlatticeRetentionKey): number {
    return ANSWERLATTICE_RETENTION_DAYS[key];
}

export function getAnswerlatticeRetentionExpiry(
    key: AnswerlatticeRetentionKey,
    from?: Timestamp | Date | number | null,
): Timestamp {
    return Timestamp.fromMillis(getAnswerlatticeRetentionExpiryMillis(key, toMillis(from)));
}

export function getAnswerlatticeRetentionFields(
    key: AnswerlatticeRetentionKey,
    from?: Timestamp | Date | number | null,
) {
    return {
        expiresAt: getAnswerlatticeRetentionExpiry(key, from),
        retentionDays: getAnswerlatticeRetentionDays(key),
    };
}

const cutoffFor = (key: AnswerlatticeRetentionKey) => (
    Timestamp.fromMillis(Date.now() - getAnswerlatticeRetentionDays(key) * ANSWERLATTICE_RETENTION_DAY_MS)
);

async function deleteDocsOlderThan(params: {
    collectionName: string;
    timestampField: string;
    retentionKey: AnswerlatticeRetentionKey;
    limit: number;
}): Promise<number> {
    const snap = await db
        .collection(params.collectionName)
        .where(params.timestampField, '<', cutoffFor(params.retentionKey))
        .limit(params.limit)
        .get();

    if (snap.empty) return 0;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
}

async function cleanupTenantContentFeedback(
    tenant: AnswerlatticeRetentionTenantScope,
    limit: number,
): Promise<number> {
    const scope = parseExactAnswerlatticeScope(tenant.tId, tenant.sId);
    if (!scope || limit <= 0) return 0;
    let deleted = 0;
    for (const collectionName of [
        DB_COLLECTIONS.ARTICLE_FEEDBACK,
        DB_COLLECTIONS.CHANGELOG_FEEDBACK,
        DB_COLLECTIONS.FAQ_FEEDBACK,
    ]) {
        if (deleted >= limit) break;
        const snapshot = await db
            .collection(collectionName)
            .doc(String(scope.tId))
            .collection(String(scope.sId))
            .where('expiresAt', '<=', Timestamp.now())
            .limit(limit - deleted)
            .get();
        if (snapshot.empty) continue;
        const batch = db.batch();
        snapshot.docs.forEach(document => batch.delete(document.ref));
        await batch.commit();
        deleted += snapshot.size;
    }
    return deleted;
}

const extractBundleVersion = (path: string): number | null => {
    const match = path.match(/\/v(\d+)\//);
    if (!match) return null;
    const version = normalizeAnswerlatticeStoredBundleVersion(match[1]);
    return version !== null && version > 0 ? version : null;
};

const getVersionsToKeep = (manifest: any): Set<number> => {
    const activeVersion = normalizeAnswerlatticeStoredBundleVersion(manifest?.activeVersion ?? manifest?.bundleVersion);
    const lastReadyVersion = normalizeAnswerlatticeStoredBundleVersion(manifest?.lastReadyVersion ?? activeVersion);
    const versions = new Set<number>();

    [activeVersion, lastReadyVersion].forEach((baseVersion) => {
        if (baseVersion === null || baseVersion <= 0) return;
        for (
            let version = Math.max(1, baseVersion - ANSWERLATTICE_CONTEXT_BUNDLE_KEEP_PREVIOUS_VERSIONS);
            version <= baseVersion;
            version += 1
        ) {
            versions.add(version);
        }
    });

    return versions;
};

async function cleanupTenantContextBundleVersions(
    tenant: AnswerlatticeRetentionTenantScope,
    storageDeleteLimit: number,
): Promise<number> {
    const scope = parseExactAnswerlatticeScope(tenant.tId, tenant.sId);
    if (!scope) return 0;
    const { tId, sId } = scope;

    const manifestSnap = await db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(tId, sId))
        .get();
    if (!manifestSnap.exists) return 0;

    const manifest = manifestSnap.data() || {};
    if (manifest.pId !== 'AL' || manifest.tId !== tId || manifest.sId !== sId) return 0;
    const activeVersion = normalizeAnswerlatticeStoredBundleVersion(manifest.activeVersion ?? manifest.bundleVersion);
    const lastRetentionCleanedVersion = normalizeAnswerlatticeStoredBundleVersion(manifest.lastRetentionCleanedVersion);
    if (!activeVersion || (lastRetentionCleanedVersion !== null && lastRetentionCleanedVersion >= activeVersion)) return 0;
    const publicBundleId = typeof manifest.publicBundleId === 'string' ? manifest.publicBundleId : '';
    const keepVersions = getVersionsToKeep(manifest);
    if (!keepVersions.size) return 0;

    const prefixes = [
        publicBundleId ? `${BUNDLE_ROOT}/public/${publicBundleId}/` : '',
        `${BUNDLE_ROOT}/private/${tId}/${sId}/`,
    ].filter(Boolean);

    let deleted = 0;
    let listingWasTruncated = false;
    const bucket = storageAdmin.bucket();

    for (const prefix of prefixes) {
        if (deleted >= storageDeleteLimit) break;

        const [files] = await bucket.getFiles({ prefix, maxResults: 1000 });
        if (files.length >= 1000) listingWasTruncated = true;
        for (const file of files) {
            if (deleted >= storageDeleteLimit) break;
            const version = extractBundleVersion(file.name);
            if (!version || keepVersions.has(version)) continue;

            await file.delete({ ignoreNotFound: true } as any);
            deleted += 1;
        }
    }

    if (!listingWasTruncated && deleted < storageDeleteLimit) {
        await manifestSnap.ref.set({
            lastRetentionCleanedVersion: activeVersion,
            lastRetentionCleanedAt: Timestamp.now(),
        }, { merge: true });
    }

    return deleted;
}

export async function cleanupAnswerlatticeOperationalRetention(options: {
    tenants?: AnswerlatticeRetentionTenantScope[];
    batchLimit?: number;
    storageDeleteLimit?: number;
    includeLegacyFirestoreCleanup?: boolean;
} = {}): Promise<AnswerlatticeRetentionCleanupResult> {
    const result = emptyResult();
    const batchLimit = Math.min(Math.max(Number(options.batchLimit || DEFAULT_BATCH_LIMIT), 1), 450);
    const storageDeleteLimit = Math.min(Math.max(Number(options.storageDeleteLimit || DEFAULT_STORAGE_DELETE_LIMIT), 1), 1000);

    const runCleanup = async (
        name: string,
        task: () => Promise<void>,
    ) => {
        try {
            await task();
        } catch (error) {
            result.errors.push(`${name}: ${RETENTION_TASK_FAILED}`);
            logger.warn('[Answerlattice Retention] Cleanup task failed', {
                failureCode: RETENTION_TASK_FAILED,
                taskName: name,
                ...getRetentionErrorContext(error),
            });
        }
    };

    // Dedicated Answerlattice production uses Firestore TTL on expiresAt for
    // these collections. The query/delete path remains available only for an
    // explicit legacy cleanup run, avoiding seven empty reads every night.
    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('schedulerRunLogs', async () => {
        result.schedulerRunLogsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS,
            timestampField: 'startedAt',
            retentionKey: 'schedulerRunLogs',
            limit: batchLimit,
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('notificationLogs', async () => {
        result.notificationLogsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.ANSWERLATTICE_NOTIFICATION_LOGS,
            timestampField: 'createdAt',
            retentionKey: 'notificationLogs',
            limit: batchLimit,
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('ownerNotificationEvents', async () => {
        result.ownerNotificationEventsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_EVENTS,
            timestampField: 'createdAt',
            retentionKey: 'ownerNotificationEvents',
            limit: batchLimit,
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('ownerNotificationDeliveries', async () => {
        result.ownerNotificationDeliveriesDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES,
            timestampField: 'createdAt',
            retentionKey: 'ownerNotificationDeliveries',
            limit: batchLimit,
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('ownerNotificationRateLimits', async () => {
        result.ownerNotificationRateLimitsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_RATE_LIMITS,
            timestampField: 'updatedAt',
            retentionKey: 'ownerNotificationRateLimits',
            limit: batchLimit,
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('contactEnquiries', async () => {
        result.contactEnquiriesDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.ANSWERLATTICE_CONTACT_ENQUIRIES,
            timestampField: 'createdAt',
            retentionKey: 'contactEnquiries',
            limit: batchLimit,
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('queryEmbeddings', async () => {
        result.queryEmbeddingsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.QUERY_EMBEDDINGS,
            timestampField: 'createdAt',
            retentionKey: 'queryEmbeddings',
            limit: batchLimit,
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('aiSearchHistory', async () => {
        result.aiSearchHistoryDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.AI_SEARCH_HISTORY,
            timestampField: 'createdOn',
            retentionKey: 'aiSearchHistory',
            limit: batchLimit,
        });
    });

    await runCleanup('contentFeedback', async () => {
        const seen = new Set<string>();
        for (const tenant of options.tenants || []) {
            if (result.contentFeedbackDeleted >= batchLimit) break;
            const scope = parseExactAnswerlatticeScope(tenant.tId, tenant.sId);
            if (!scope) continue;
            const key = `${scope.tId}:${scope.sId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            result.contentFeedbackDeleted += await cleanupTenantContentFeedback(
                scope,
                batchLimit - result.contentFeedbackDeleted,
            );
        }
    });

    await runCleanup('contextBundleVersions', async () => {
        const seen = new Set<string>();
        const tenants = (options.tenants || []).flatMap((tenant) => {
            const scope = parseExactAnswerlatticeScope(tenant.tId, tenant.sId);
            if (!scope) return [];
            const key = `${scope.tId}:${scope.sId}`;
            if (seen.has(key)) return [];
            seen.add(key);
            return [scope];
        });

        for (const tenant of tenants) {
            if (result.contextBundleObjectsDeleted >= storageDeleteLimit) break;
            result.contextBundleObjectsDeleted += await cleanupTenantContextBundleVersions(
                tenant,
                storageDeleteLimit - result.contextBundleObjectsDeleted,
            );
        }
    });

    return result;
}
