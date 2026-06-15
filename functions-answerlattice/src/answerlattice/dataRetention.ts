import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db, storageAdmin } from '../firebaseAdmin';
import { getAnswerlatticeBundleManifestDocId } from './compiledContextVersions';

const DAY_MS = 24 * 60 * 60 * 1000;
const BUNDLE_ROOT = 'answerlattice-context';
const DEFAULT_BATCH_LIMIT = 100;
const DEFAULT_STORAGE_DELETE_LIMIT = 250;

export const ANSWERLATTICE_RETENTION_DAYS = {
    schedulerRunLogs: 90,
    notificationLogs: 90,
    ownerNotificationEvents: 90,
    ownerNotificationDeliveries: 90,
    ownerNotificationRateLimits: 2,
    contactEnquiries: 365,
    queryEmbeddings: 30,
    aiSearchHistory: 90,
} as const;

export const ANSWERLATTICE_CONTEXT_BUNDLE_KEEP_PREVIOUS_VERSIONS = 2;

export type AnswerlatticeRetentionKey = keyof typeof ANSWERLATTICE_RETENTION_DAYS;

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
    contextBundleObjectsDeleted: 0,
    errors: [],
});

const toMillis = (value?: Timestamp | Date | number | null): number => {
    if (!value) return Date.now();
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    return value.toMillis();
};

export function getAnswerlatticeRetentionDays(key: AnswerlatticeRetentionKey): number {
    return ANSWERLATTICE_RETENTION_DAYS[key];
}

export function getAnswerlatticeRetentionExpiry(
    key: AnswerlatticeRetentionKey,
    from?: Timestamp | Date | number | null,
): Timestamp {
    return Timestamp.fromMillis(toMillis(from) + getAnswerlatticeRetentionDays(key) * DAY_MS);
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
    Timestamp.fromMillis(Date.now() - getAnswerlatticeRetentionDays(key) * DAY_MS)
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

const extractBundleVersion = (path: string): number | null => {
    const match = path.match(/\/v(\d+)\//);
    if (!match) return null;
    const version = Number(match[1]);
    return Number.isFinite(version) && version > 0 ? version : null;
};

const getVersionsToKeep = (manifest: any): Set<number> => {
    const activeVersion = Number(manifest?.activeVersion || manifest?.bundleVersion || 0);
    const lastReadyVersion = Number(manifest?.lastReadyVersion || activeVersion || 0);
    const versions = new Set<number>();

    [activeVersion, lastReadyVersion].forEach((baseVersion) => {
        if (!Number.isFinite(baseVersion) || baseVersion <= 0) return;
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
    const tId = Number(tenant.tId);
    const sId = Number(tenant.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) return 0;

    const manifestSnap = await db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(tId, sId))
        .get();
    if (!manifestSnap.exists) return 0;

    const manifest = manifestSnap.data() || {};
    const publicBundleId = typeof manifest.publicBundleId === 'string' ? manifest.publicBundleId : '';
    const keepVersions = getVersionsToKeep(manifest);
    if (!keepVersions.size) return 0;

    const prefixes = [
        publicBundleId ? `${BUNDLE_ROOT}/public/${publicBundleId}/` : '',
        `${BUNDLE_ROOT}/private/${tId}/${sId}/`,
    ].filter(Boolean);

    let deleted = 0;
    const bucket = storageAdmin.bucket();

    for (const prefix of prefixes) {
        if (deleted >= storageDeleteLimit) break;

        const [files] = await bucket.getFiles({ prefix, maxResults: 1000 });
        for (const file of files) {
            if (deleted >= storageDeleteLimit) break;
            const version = extractBundleVersion(file.name);
            if (!version || keepVersions.has(version)) continue;

            await file.delete({ ignoreNotFound: true } as any);
            deleted += 1;
        }
    }

    return deleted;
}

export async function cleanupAnswerlatticeOperationalRetention(options: {
    tenants?: AnswerlatticeRetentionTenantScope[];
    batchLimit?: number;
    storageDeleteLimit?: number;
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
            const message = error instanceof Error ? error.message : String(error);
            result.errors.push(`${name}: ${message}`);
            logger.warn('[Answerlattice Retention] Cleanup task failed', { name, error: message });
        }
    };

    await runCleanup('schedulerRunLogs', async () => {
        result.schedulerRunLogsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS,
            timestampField: 'startedAt',
            retentionKey: 'schedulerRunLogs',
            limit: batchLimit,
        });
    });

    await runCleanup('notificationLogs', async () => {
        result.notificationLogsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.ANSWERLATTICE_NOTIFICATION_LOGS,
            timestampField: 'createdAt',
            retentionKey: 'notificationLogs',
            limit: batchLimit,
        });
    });

    await runCleanup('ownerNotificationEvents', async () => {
        result.ownerNotificationEventsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_EVENTS,
            timestampField: 'createdAt',
            retentionKey: 'ownerNotificationEvents',
            limit: batchLimit,
        });
    });

    await runCleanup('ownerNotificationDeliveries', async () => {
        result.ownerNotificationDeliveriesDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES,
            timestampField: 'createdAt',
            retentionKey: 'ownerNotificationDeliveries',
            limit: batchLimit,
        });
    });

    await runCleanup('ownerNotificationRateLimits', async () => {
        result.ownerNotificationRateLimitsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_RATE_LIMITS,
            timestampField: 'updatedAt',
            retentionKey: 'ownerNotificationRateLimits',
            limit: batchLimit,
        });
    });

    await runCleanup('contactEnquiries', async () => {
        result.contactEnquiriesDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.ANSWERLATTICE_CONTACT_ENQUIRIES,
            timestampField: 'createdAt',
            retentionKey: 'contactEnquiries',
            limit: batchLimit,
        });
    });

    await runCleanup('queryEmbeddings', async () => {
        result.queryEmbeddingsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.QUERY_EMBEDDINGS,
            timestampField: 'createdAt',
            retentionKey: 'queryEmbeddings',
            limit: batchLimit,
        });
    });

    await runCleanup('aiSearchHistory', async () => {
        result.aiSearchHistoryDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.AI_SEARCH_HISTORY,
            timestampField: 'createdOn',
            retentionKey: 'aiSearchHistory',
            limit: batchLimit,
        });
    });

    await runCleanup('contextBundleVersions', async () => {
        const seen = new Set<string>();
        const tenants = (options.tenants || []).filter((tenant) => {
            const key = `${Number(tenant.tId)}:${Number(tenant.sId)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
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
