import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db, storageAdmin } from '../firebaseAdmin';
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';
import {
    getAnswerlatticeBundleLockDocId,
    getAnswerlatticeBundleManifestDocId,
    getExpectedAnswerlatticePublicBundleId,
    isOwnedAnswerlatticeBundleManifest,
    normalizeAnswerlatticeStoredBundleVersion,
    shouldDeleteAnswerlatticeContextBundleVersion,
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
const MAX_CONTEXT_BUNDLE_VERSIONS_SCANNED_PER_RUN = 25;
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
    if (value === null || value === undefined) return Date.now();
    const millis = typeof value === 'number'
        ? value
        : value instanceof Date
            ? value.getTime()
            : value.toMillis();
    if (!Number.isSafeInteger(millis)) {
        throw new TypeError('answerlattice_retention_from_invalid');
    }
    return millis;
};

function getRetentionErrorContext(error: unknown): Record<string, string | number | null> {
    const context = getBoundedFunctionsErrorContext(error);
    return {
        sourceErrorName: context.sourceErrorName ?? null,
        sourceErrorCode: context.sourceErrorCode ?? null,
        sourceStatusCode: context.sourceStatusCode ?? null,
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
    productField?: 'pId' | 'productId';
    productValue?: 'AL';
}): Promise<number> {
    const collection = db.collection(params.collectionName);
    const productScopedQuery = params.productField && params.productValue
        ? collection.where(params.productField, '==', params.productValue)
        : collection;
    const snap = await productScopedQuery
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

type ContextBundleRetentionScan = {
    activeVersion: number;
    keepVersions: Set<number>;
    nextVersion: number;
    publicBundleId: string;
};

const isOwnedFailedBundleLock = (
    value: unknown,
    tId: number,
    sId: number,
): value is Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const lock = value as Record<string, unknown>;
    return lock.schemaVersion === 1
        && lock.pId === 'AL'
        && lock.tId === tId
        && lock.sId === sId
        && typeof lock.lockId === 'string'
        && lock.lockId.length > 0
        && lock.status === 'failed'
        && normalizeAnswerlatticeStoredBundleVersion(lock.bundleVersion) !== null;
};

const getContextBundleRetentionScan = (
    manifest: Record<string, any>,
    currentActiveVersion: number,
    currentKeepVersions: Set<number>,
    currentPublicBundleId: string,
): ContextBundleRetentionScan => {
    const storedActiveVersion = normalizeAnswerlatticeStoredBundleVersion(manifest.retentionScanActiveVersion);
    const storedNextVersion = normalizeAnswerlatticeStoredBundleVersion(manifest.retentionScanNextVersion);
    const storedKeepVersions = Array.isArray(manifest.retentionScanKeepVersions)
        ? manifest.retentionScanKeepVersions.map(normalizeAnswerlatticeStoredBundleVersion)
        : null;
    const storedPublicBundleId = typeof manifest.retentionScanPublicBundleId === 'string'
        ? manifest.retentionScanPublicBundleId
        : null;
    const hasValidStoredKeepVersions = storedKeepVersions !== null
        && storedKeepVersions.length > 0
        && storedActiveVersion !== null
        && storedKeepVersions.includes(storedActiveVersion)
        && storedKeepVersions.every((version): version is number => (
            version !== null
            && version > 0
            && version <= storedActiveVersion
        ))
        && new Set(storedKeepVersions).size === storedKeepVersions.length;

    if (
        storedActiveVersion !== null
        && storedActiveVersion > 0
        && storedActiveVersion <= currentActiveVersion
        && storedNextVersion !== null
        && storedNextVersion > 0
        && storedNextVersion <= storedActiveVersion + 1
        && hasValidStoredKeepVersions
        && storedPublicBundleId === currentPublicBundleId
    ) {
        return {
            activeVersion: storedActiveVersion,
            keepVersions: new Set(storedKeepVersions),
            nextVersion: storedNextVersion,
            publicBundleId: storedPublicBundleId,
        };
    }

    return {
        activeVersion: currentActiveVersion,
        keepVersions: currentKeepVersions,
        nextVersion: 1,
        publicBundleId: currentPublicBundleId,
    };
};

const deleteContextBundleVersionPrefix = async (
    prefix: string,
    deleteLimit: number,
): Promise<{ complete: boolean; deleted: number }> => {
    if (deleteLimit <= 0) return { complete: false, deleted: 0 };
    const [files, nextQuery] = await storageAdmin.bucket().getFiles({
        autoPaginate: false,
        maxResults: deleteLimit + 1,
        prefix,
    });
    const targets = files.slice(0, deleteLimit);
    await Promise.all(targets.map(file => file.delete({ ignoreNotFound: true })));
    return {
        complete: files.length <= targets.length && !nextQuery,
        deleted: targets.length,
    };
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
    if (!isOwnedAnswerlatticeBundleManifest(manifest, tId, sId)) return 0;
    const activeVersion = normalizeAnswerlatticeStoredBundleVersion(manifest.activeVersion ?? manifest.bundleVersion);
    if (!activeVersion) return 0;
    const lastRetentionCleanedVersion = normalizeAnswerlatticeStoredBundleVersion(manifest.lastRetentionCleanedVersion);
    const hasStoredScan = manifest.retentionScanActiveVersion !== undefined
        || manifest.retentionScanNextVersion !== undefined
        || manifest.retentionScanKeepVersions !== undefined
        || manifest.retentionScanPublicBundleId !== undefined;
    if (!hasStoredScan && lastRetentionCleanedVersion !== null && lastRetentionCleanedVersion >= activeVersion) return 0;
    const storedPublicBundleId = typeof manifest.publicBundleId === 'string' ? manifest.publicBundleId : '';
    const expectedPublicBundleId = getExpectedAnswerlatticePublicBundleId(tId, sId);
    if (
        !expectedPublicBundleId
        || (storedPublicBundleId && storedPublicBundleId !== expectedPublicBundleId)
    ) {
        throw new Error('ANSWERLATTICE_CONTEXT_BUNDLE_PUBLIC_ID_SCOPE_MISMATCH');
    }
    const publicBundleId = expectedPublicBundleId;
    const keepVersions = getVersionsToKeep(manifest);
    if (!keepVersions.size) return 0;
    const scan = getContextBundleRetentionScan(
        manifest,
        activeVersion,
        keepVersions,
        publicBundleId,
    );
    let deleted = 0;
    let versionsScanned = 0;
    while (
        scan.nextVersion <= scan.activeVersion
        && deleted < storageDeleteLimit
        && versionsScanned < MAX_CONTEXT_BUNDLE_VERSIONS_SCANNED_PER_RUN
    ) {
        const candidateVersion = scan.nextVersion;
        versionsScanned += 1;
        if (!shouldDeleteAnswerlatticeContextBundleVersion(
            candidateVersion,
            scan.activeVersion,
            scan.keepVersions,
        )) {
            scan.nextVersion += 1;
            continue;
        }

        const prefixes = [
            ...(scan.publicBundleId
                ? [`${BUNDLE_ROOT}/public/${scan.publicBundleId}/v${candidateVersion}/`]
                : []),
            `${BUNDLE_ROOT}/private/${tId}/${sId}/v${candidateVersion}/`,
        ];
        let versionComplete = true;
        for (const prefix of prefixes) {
            const result = await deleteContextBundleVersionPrefix(
                prefix,
                storageDeleteLimit - deleted,
            );
            deleted += result.deleted;
            if (!result.complete) {
                versionComplete = false;
                break;
            }
        }
        if (!versionComplete) break;
        scan.nextVersion += 1;
    }

    await db.runTransaction(async transaction => {
        const currentManifestSnap = await transaction.get(manifestSnap.ref);
        const currentManifest = currentManifestSnap.data();
        const currentActiveVersion = normalizeAnswerlatticeStoredBundleVersion(
            currentManifest?.activeVersion ?? currentManifest?.bundleVersion,
        );
        const currentStoredPublicBundleId = typeof currentManifest?.publicBundleId === 'string'
            ? currentManifest.publicBundleId
            : '';
        if (
            !currentManifestSnap.exists
            || !isOwnedAnswerlatticeBundleManifest(currentManifest, tId, sId)
            || currentActiveVersion === null
            || currentActiveVersion < scan.activeVersion
            || (
                currentStoredPublicBundleId
                && currentStoredPublicBundleId !== scan.publicBundleId
            )
        ) return;
        if (scan.nextVersion > scan.activeVersion) {
            transaction.update(manifestSnap.ref, {
                lastRetentionCleanedVersion: scan.activeVersion,
                lastRetentionCleanedAt: Timestamp.now(),
                retentionScanActiveVersion: FieldValue.delete(),
                retentionScanKeepVersions: FieldValue.delete(),
                retentionScanNextVersion: FieldValue.delete(),
                retentionScanPublicBundleId: FieldValue.delete(),
                retentionScanUpdatedAt: FieldValue.delete(),
            });
            return;
        }
        transaction.update(manifestSnap.ref, {
            retentionScanActiveVersion: scan.activeVersion,
            retentionScanKeepVersions: Array.from(scan.keepVersions).sort((left, right) => left - right),
            retentionScanNextVersion: scan.nextVersion,
            retentionScanPublicBundleId: scan.publicBundleId,
            retentionScanUpdatedAt: Timestamp.now(),
        });
    });

    return deleted;
}

async function cleanupTenantFailedContextBundleVersion(
    tenant: AnswerlatticeRetentionTenantScope,
    storageDeleteLimit: number,
): Promise<number> {
    const scope = parseExactAnswerlatticeScope(tenant.tId, tenant.sId);
    if (!scope || storageDeleteLimit <= 0) return 0;
    const { tId, sId } = scope;
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(tId, sId));
    const lockRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleLockDocId(tId, sId));
    const [manifestSnap, lockSnap] = await Promise.all([
        manifestRef.get(),
        lockRef.get(),
    ]);
    const manifest = manifestSnap.data();
    const lock = lockSnap.data();
    if (
        !manifestSnap.exists
        || !isOwnedAnswerlatticeBundleManifest(manifest, tId, sId)
        || !lockSnap.exists
        || !isOwnedFailedBundleLock(lock, tId, sId)
    ) return 0;

    const failedVersion = normalizeAnswerlatticeStoredBundleVersion(lock.bundleVersion);
    const activeVersion = normalizeAnswerlatticeStoredBundleVersion(manifest.activeVersion);
    const lastReadyVersion = normalizeAnswerlatticeStoredBundleVersion(manifest.lastReadyVersion);
    if (
        !failedVersion
        || failedVersion === activeVersion
        || failedVersion === lastReadyVersion
        || normalizeAnswerlatticeStoredBundleVersion(lock.storageCleanupCompletedVersion) === failedVersion
    ) return 0;

    const expectedPublicBundleId = getExpectedAnswerlatticePublicBundleId(tId, sId);
    const storedPublicBundleId = typeof manifest.publicBundleId === 'string' ? manifest.publicBundleId : '';
    if (
        !expectedPublicBundleId
        || (storedPublicBundleId && storedPublicBundleId !== expectedPublicBundleId)
    ) {
        throw new Error('ANSWERLATTICE_CONTEXT_BUNDLE_PUBLIC_ID_SCOPE_MISMATCH');
    }

    let deleted = 0;
    let complete = true;
    for (const prefix of [
        `${BUNDLE_ROOT}/public/${expectedPublicBundleId}/v${failedVersion}/`,
        `${BUNDLE_ROOT}/private/${tId}/${sId}/v${failedVersion}/`,
    ]) {
        const result = await deleteContextBundleVersionPrefix(
            prefix,
            storageDeleteLimit - deleted,
        );
        deleted += result.deleted;
        if (!result.complete) {
            complete = false;
            break;
        }
    }
    if (!complete) return deleted;

    await db.runTransaction(async transaction => {
        const [currentManifestSnap, currentLockSnap] = await Promise.all([
            transaction.get(manifestRef),
            transaction.get(lockRef),
        ]);
        const currentManifest = currentManifestSnap.data();
        const currentLock = currentLockSnap.data();
        if (
            !currentManifestSnap.exists
            || !isOwnedAnswerlatticeBundleManifest(currentManifest, tId, sId)
            || !currentLockSnap.exists
            || !isOwnedFailedBundleLock(currentLock, tId, sId)
            || normalizeAnswerlatticeStoredBundleVersion(currentLock.bundleVersion) !== failedVersion
            || normalizeAnswerlatticeStoredBundleVersion(currentManifest.activeVersion) === failedVersion
            || normalizeAnswerlatticeStoredBundleVersion(currentManifest.lastReadyVersion) === failedVersion
        ) return;
        transaction.update(lockRef, {
            storageCleanupCompletedAt: Timestamp.now(),
            storageCleanupCompletedVersion: failedVersion,
        });
    });
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
            productField: 'productId',
            productValue: 'AL',
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('ownerNotificationEvents', async () => {
        result.ownerNotificationEventsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_EVENTS,
            timestampField: 'createdAt',
            retentionKey: 'ownerNotificationEvents',
            limit: batchLimit,
            productField: 'productId',
            productValue: 'AL',
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('ownerNotificationDeliveries', async () => {
        result.ownerNotificationDeliveriesDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES,
            timestampField: 'createdAt',
            retentionKey: 'ownerNotificationDeliveries',
            limit: batchLimit,
            productField: 'productId',
            productValue: 'AL',
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('ownerNotificationRateLimits', async () => {
        result.ownerNotificationRateLimitsDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.OWNER_NOTIFICATION_RATE_LIMITS,
            timestampField: 'updatedAt',
            retentionKey: 'ownerNotificationRateLimits',
            limit: batchLimit,
            productField: 'productId',
            productValue: 'AL',
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
            productField: 'pId',
            productValue: 'AL',
        });
    });

    if (options.includeLegacyFirestoreCleanup === true) await runCleanup('aiSearchHistory', async () => {
        result.aiSearchHistoryDeleted = await deleteDocsOlderThan({
            collectionName: DB_COLLECTIONS.AI_SEARCH_HISTORY,
            timestampField: 'createdOn',
            retentionKey: 'aiSearchHistory',
            limit: batchLimit,
            productField: 'pId',
            productValue: 'AL',
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
            if (result.contextBundleObjectsDeleted >= storageDeleteLimit) break;
            result.contextBundleObjectsDeleted += await cleanupTenantFailedContextBundleVersion(
                tenant,
                storageDeleteLimit - result.contextBundleObjectsDeleted,
            );
        }
    });

    return result;
}
