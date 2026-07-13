import { createHash } from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import type { AnswerlatticeAccessContext } from '@lib/answerlattice/accessControl';
import { revalidateAnswerlatticePublicCache } from '@lib/actions/revalidateAnswerlatticePublicCache';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
    ANSWERLATTICE_CHANGELOG_PAGE_MAX_BYTES,
    ANSWERLATTICE_CHANGELOG_PAGE_MAX_ENTRIES,
    normalizeAnswerlatticeStoredChangelogPage,
    type AnswerlatticeChangelogAction,
    type AnswerlatticeChangelogEntryInput,
} from './changelogContracts';
import { getAnswerlatticeBundleManifestDocId, getAnswerlatticeSourceVersionsDocId } from './compiledContext';

const CHANGELOG = DB_COLLECTIONS.CHANGELOG;
const ENTRY_INDEX = DB_COLLECTIONS.ANSWERLATTICE_CHANGELOG_ENTRY_INDEX;
const INDEX_TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const entryIdForRequest = (tId: number, sId: number, requestId: string) => `change_${hash(`${tId}:${sId}:${requestId}`).slice(0, 40)}`;
const pageIdForNumber = (pageNumber: number) => `page_${String(pageNumber).padStart(6, '0')}`;
const entryFingerprint = (entry: AnswerlatticeChangelogEntryInput) => hash(JSON.stringify(entry));

export type AnswerlatticeChangelogServerResult = {
    success: true;
    action: 'create' | 'update' | 'delete';
    entryId: string;
    pageId: string;
    replayed: boolean;
    removedFileUrls: string[];
};

export class AnswerlatticeChangelogError extends Error {
    constructor(public readonly status: number, public readonly publicMessage: string) {
        super(publicMessage);
        this.name = 'AnswerlatticeChangelogError';
    }
}

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new AnswerlatticeChangelogError(503, 'Changelog management is temporarily unavailable.');
    }
    return answerlatticeFirestoreAdmin;
};

const getActor = (access: AnswerlatticeAccessContext) => ({
    id: String(access.user.id || access.user.email || 'unknown').slice(0, 180),
    label: String(access.user.email || access.user.name || access.user.id || 'Team member').slice(0, 200),
});

const changelogCollection = (access: AnswerlatticeAccessContext) => getDb()
    .collection(CHANGELOG)
    .doc(String(access.scope.tenantId))
    .collection(String(access.scope.storeId));

const assertPage = (
    value: Record<string, any> | undefined,
    access: AnswerlatticeAccessContext,
    pageId: string,
) => {
    if (!value || !normalizeAnswerlatticeStoredChangelogPage(value, pageId, {
        tId: access.scope.tenantId,
        sId: access.scope.storeId,
    })) {
        throw new AnswerlatticeChangelogError(409, `Changelog page ${pageId} has an invalid stored shape.`);
    }
    return value;
};

const assertIndex = (
    value: Record<string, any> | undefined,
    access: AnswerlatticeAccessContext,
    entryId: string,
) => {
    if (!value
        || value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || value.tId !== access.scope.tenantId
        || value.sId !== access.scope.storeId
        || value.entryId !== entryId
        || typeof value.pageId !== 'string') {
        throw new AnswerlatticeChangelogError(409, 'Changelog entry index is invalid for this workspace.');
    }
    return value;
};

const buildStoredEntry = (
    entryId: string,
    input: AnswerlatticeChangelogEntryInput,
    actor: { id: string; label: string },
    existing?: Record<string, any>,
) => {
    const now = Timestamp.now();
    return ({
    id: entryId,
    title: input.title,
    description: input.description,
    tags: input.tags,
    releasedOn: Timestamp.fromDate(new Date(input.releasedOn)),
    published: input.published,
    version: input.version,
    contextKeys: input.contextKeys,
    kbSources: input.kbSources,
    youtubeLinks: input.youtubeLinks,
    files: input.files,
    entityChanges: input.entityChanges,
    releaseId: input.releaseId || null,
    likes: Number.isSafeInteger(existing?.likes) && existing.likes >= 0 ? existing.likes : 0,
    dislikes: Number.isSafeInteger(existing?.dislikes) && existing.dislikes >= 0 ? existing.dislikes : 0,
    createdOn: existing?.createdOn || now,
    createdBy: existing?.createdBy || actor.label,
    modifiedOn: now,
    modifiedBy: actor.label,
    uId: actor.id,
    });
};

const serializedPageBytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');

const markContextStale = (
    transaction: FirebaseFirestore.Transaction,
    access: AnswerlatticeAccessContext,
    action: 'create' | 'update' | 'delete',
    entryId: string,
) => {
    const db = getDb();
    const now = FieldValue.serverTimestamp();
    const common = {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: access.scope.tenantId,
        sId: access.scope.storeId,
        updatedAt: now,
        lastReason: `changelog_${action}`,
        lastSourceId: entryId,
        lastSourceType: CHANGELOG,
    };
    transaction.set(
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeSourceVersionsDocId(access.scope.tenantId, access.scope.storeId)),
        { ...common, releases: FieldValue.increment(1) },
        { merge: true },
    );
    transaction.set(
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(access.scope.tenantId, access.scope.storeId)),
        { ...common, status: 'stale', staleReason: `changelog_${action}` },
        { merge: true },
    );
};

async function createEntry(
    action: Extract<AnswerlatticeChangelogAction, { action: 'create' }>,
    access: AnswerlatticeAccessContext,
): Promise<AnswerlatticeChangelogServerResult> {
    const db = getDb();
    const actor = getActor(access);
    const entryId = entryIdForRequest(access.scope.tenantId, access.scope.storeId, action.requestId);
    const indexRef = db.collection(ENTRY_INDEX).doc(entryId);
    const fingerprint = entryFingerprint(action.entry);
    let result: AnswerlatticeChangelogServerResult | null = null;

    await db.runTransaction(async (transaction) => {
        const indexSnapshot = await transaction.get(indexRef);
        if (indexSnapshot.exists) {
            const index = assertIndex(indexSnapshot.data(), access, entryId);
            if (index.deleted === true || index.createFingerprint !== fingerprint) {
                throw new AnswerlatticeChangelogError(409, 'This changelog request was already used with different details.');
            }
            result = { success: true, action: 'create', entryId, pageId: index.pageId, replayed: true, removedFileUrls: [] };
            return;
        }

        const latestQuery = changelogCollection(access).orderBy('pageNumber', 'desc').limit(1);
        const latestSnapshot = await transaction.get(latestQuery);
        const latestDocument = latestSnapshot.docs[0];
        const storedEntry = buildStoredEntry(entryId, action.entry, actor);

        let pageId = pageIdForNumber(1);
        let pageNumber = 1;
        let pageRef = changelogCollection(access).doc(pageId);
        let pageData: Record<string, unknown> = {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: access.scope.tenantId,
            sId: access.scope.storeId,
            pageNumber,
            nextPageId: null,
            entries: [storedEntry],
            entryIds: [entryId],
            createdOn: FieldValue.serverTimestamp(),
            createdBy: actor.label,
            modifiedOn: FieldValue.serverTimestamp(),
            modifiedBy: actor.label,
        };

        if (latestDocument) {
            const latest = assertPage(latestDocument.data(), access, latestDocument.id);
            const candidate = {
                ...latest,
                entries: [storedEntry, ...latest.entries],
                entryIds: [entryId, ...latest.entryIds],
            };
            if (candidate.entries.length <= ANSWERLATTICE_CHANGELOG_PAGE_MAX_ENTRIES
                && serializedPageBytes(candidate) < ANSWERLATTICE_CHANGELOG_PAGE_MAX_BYTES) {
                pageId = latestDocument.id;
                pageNumber = latest.pageNumber;
                pageRef = latestDocument.ref;
                pageData = {
                    entries: candidate.entries,
                    entryIds: candidate.entryIds,
                    approxSizeBytes: serializedPageBytes(candidate),
                    modifiedOn: FieldValue.serverTimestamp(),
                    modifiedBy: actor.label,
                };
            } else {
                pageNumber = latest.pageNumber + 1;
                pageId = pageIdForNumber(pageNumber);
                pageRef = changelogCollection(access).doc(pageId);
                pageData = {
                    ...pageData,
                    pageNumber,
                    nextPageId: latestDocument.id,
                    approxSizeBytes: serializedPageBytes(pageData),
                };
            }
        }

        if (latestDocument && pageRef.path === latestDocument.ref.path) transaction.update(pageRef, pageData);
        else transaction.create(pageRef, pageData);
        transaction.create(indexRef, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: access.scope.tenantId,
            sId: access.scope.storeId,
            entryId,
            pageId,
            createRequestId: action.requestId,
            createFingerprint: fingerprint,
            deleted: false,
            createdOn: FieldValue.serverTimestamp(),
            modifiedOn: FieldValue.serverTimestamp(),
        });
        markContextStale(transaction, access, 'create', entryId);
        result = { success: true, action: 'create', entryId, pageId, replayed: false, removedFileUrls: [] };
    });

    if (!result) throw new AnswerlatticeChangelogError(500, 'Changelog entry was not created.');
    return result;
}

async function updateEntry(
    action: Extract<AnswerlatticeChangelogAction, { action: 'update' }>,
    access: AnswerlatticeAccessContext,
): Promise<AnswerlatticeChangelogServerResult> {
    const db = getDb();
    const actor = getActor(access);
    const indexRef = db.collection(ENTRY_INDEX).doc(action.entryId);
    const fingerprint = entryFingerprint(action.entry);
    let result: AnswerlatticeChangelogServerResult | null = null;

    await db.runTransaction(async (transaction) => {
        const indexSnapshot = await transaction.get(indexRef);
        if (!indexSnapshot.exists) throw new AnswerlatticeChangelogError(404, 'Changelog entry not found.');
        const index = assertIndex(indexSnapshot.data(), access, action.entryId);
        if (index.deleted === true) throw new AnswerlatticeChangelogError(409, 'Deleted changelog entries cannot be updated.');
        if (index.lastRequestId === action.requestId) {
            if (index.lastFingerprint !== fingerprint) throw new AnswerlatticeChangelogError(409, 'This update request was reused with different details.');
            result = { success: true, action: 'update', entryId: action.entryId, pageId: index.pageId, replayed: true, removedFileUrls: [] };
            return;
        }

        const pageRef = changelogCollection(access).doc(index.pageId);
        const pageSnapshot = await transaction.get(pageRef);
        if (!pageSnapshot.exists) throw new AnswerlatticeChangelogError(409, 'Changelog entry page is missing.');
        const page = assertPage(pageSnapshot.data(), access, pageSnapshot.id);
        const entryPosition = page.entryIds.indexOf(action.entryId);
        if (entryPosition < 0) throw new AnswerlatticeChangelogError(409, 'Changelog entry index is stale.');
        const previous = page.entries[entryPosition] as Record<string, any>;
        const nextEntry = buildStoredEntry(action.entryId, action.entry, actor, previous);
        const entries = [...page.entries];
        entries[entryPosition] = nextEntry;
        const candidate = { ...page, entries };
        if (serializedPageBytes(candidate) >= ANSWERLATTICE_CHANGELOG_PAGE_MAX_BYTES) {
            throw new AnswerlatticeChangelogError(413, 'This update would make the changelog page too large.');
        }
        const previousUrls = new Set((Array.isArray(previous.files) ? previous.files : []).map((file: any) => file?.url).filter(Boolean));
        const nextUrls = new Set(action.entry.files.map((file) => file.url));
        const removedFileUrls = Array.from(previousUrls).filter((url): url is string => typeof url === 'string' && !nextUrls.has(url));

        transaction.update(pageRef, {
            entries,
            approxSizeBytes: serializedPageBytes(candidate),
            modifiedOn: FieldValue.serverTimestamp(),
            modifiedBy: actor.label,
        });
        transaction.update(indexRef, {
            lastRequestId: action.requestId,
            lastFingerprint: fingerprint,
            modifiedOn: FieldValue.serverTimestamp(),
        });
        markContextStale(transaction, access, 'update', action.entryId);
        result = { success: true, action: 'update', entryId: action.entryId, pageId: index.pageId, replayed: false, removedFileUrls };
    });

    if (!result) throw new AnswerlatticeChangelogError(500, 'Changelog entry was not updated.');
    return result;
}

async function deleteEntry(
    action: Extract<AnswerlatticeChangelogAction, { action: 'delete' }>,
    access: AnswerlatticeAccessContext,
): Promise<AnswerlatticeChangelogServerResult> {
    const db = getDb();
    const actor = getActor(access);
    const indexRef = db.collection(ENTRY_INDEX).doc(action.entryId);
    let result: AnswerlatticeChangelogServerResult | null = null;

    await db.runTransaction(async (transaction) => {
        const indexSnapshot = await transaction.get(indexRef);
        if (!indexSnapshot.exists) throw new AnswerlatticeChangelogError(404, 'Changelog entry not found.');
        const index = assertIndex(indexSnapshot.data(), access, action.entryId);
        if (index.deleted === true) {
            result = {
                success: true,
                action: 'delete',
                entryId: action.entryId,
                pageId: index.pageId,
                replayed: true,
                removedFileUrls: Array.isArray(index.removedFileUrls) ? index.removedFileUrls.slice(0, 4) : [],
            };
            return;
        }

        const pageRef = changelogCollection(access).doc(index.pageId);
        const pageSnapshot = await transaction.get(pageRef);
        if (!pageSnapshot.exists) throw new AnswerlatticeChangelogError(409, 'Changelog entry page is missing.');
        const page = assertPage(pageSnapshot.data(), access, pageSnapshot.id);
        const entryPosition = page.entryIds.indexOf(action.entryId);
        if (entryPosition < 0) throw new AnswerlatticeChangelogError(409, 'Changelog entry index is stale.');
        const previous = page.entries[entryPosition] as Record<string, any>;
        const entries = page.entries.filter((_: unknown, index: number) => index !== entryPosition);
        const entryIds = page.entryIds.filter((_: unknown, index: number) => index !== entryPosition);
        const removedFileUrls = (Array.isArray(previous.files) ? previous.files : [])
            .map((file: any) => file?.url)
            .filter((url: unknown): url is string => typeof url === 'string')
            .slice(0, 4);

        transaction.update(pageRef, {
            entries,
            entryIds,
            approxSizeBytes: serializedPageBytes({ ...page, entries, entryIds }),
            modifiedOn: FieldValue.serverTimestamp(),
            modifiedBy: actor.label,
        });
        transaction.update(indexRef, {
            deleted: true,
            deleteRequestId: action.requestId,
            removedFileUrls,
            deletedOn: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromMillis(Date.now() + INDEX_TOMBSTONE_RETENTION_MS),
            modifiedOn: FieldValue.serverTimestamp(),
        });
        markContextStale(transaction, access, 'delete', action.entryId);
        result = { success: true, action: 'delete', entryId: action.entryId, pageId: index.pageId, replayed: false, removedFileUrls };
    });

    if (!result) throw new AnswerlatticeChangelogError(500, 'Changelog entry was not deleted.');
    return result;
}

export const executeAnswerlatticeChangelogAction = async (
    action: AnswerlatticeChangelogAction,
    access: AnswerlatticeAccessContext,
): Promise<AnswerlatticeChangelogServerResult> => {
    const result = action.action === 'create'
        ? await createEntry(action, access)
        : action.action === 'update'
            ? await updateEntry(action, access)
            : await deleteEntry(action, access);

    if (!result.replayed) {
        const cacheResults = await Promise.allSettled([
            revalidateAnswerlatticePublicCache(access.scope.tenantId, access.scope.storeId, 'changelog'),
            revalidateAnswerlatticePublicCache(access.scope.tenantId, access.scope.storeId, 'context'),
        ]);
        if (cacheResults.some((item) => item.status === 'rejected')) {
            logRuntimeFailure('answerlattice_changelog_cache_revalidation_failed', new Error('cache_revalidation_failed'), {
                action: result.action,
                hasTenantScope: true,
                hasStoreScope: true,
            });
        }
    }
    return result;
};
