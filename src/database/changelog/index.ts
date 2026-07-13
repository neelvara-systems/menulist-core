import { DB_COLLECTIONS } from '@constant/database';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import uploadBase64ToStorage, { type SupportedFileType } from '@database/storage/uploadBase64ToStorage';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import {
    ANSWERLATTICE_CHANGELOG_MAX_FILE_BYTES,
    ANSWERLATTICE_CHANGELOG_MAX_FILES,
    AnswerlatticeChangelogActionResultSchema,
    normalizeAnswerlatticeStoredChangelogPage,
    parseAnswerlatticeChangelogAction,
    type AnswerlatticeChangelogAction,
} from '@lib/answerlattice/changelogContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient, answerlatticeStorage } from '@lib/firebase/answerlatticeFirebaseClient';
import { createRuntimeId } from '@lib/runtime/randomId';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import { generateStoragePath } from '@lib/storage/pathGenerator';
import type { ChangelogPage } from '@type/changelog';
import type { UserUploadedFileType } from '@type/common';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.CHANGELOG;
const ALLOWED_IMAGE_TYPES = new Set<SupportedFileType>(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const CHANGELOG_ACTION_RESPONSE_MAX_BYTES = 64 * 1024;

const getScope = async () => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!session || !scope) throw new Error('Answerlattice workspace scope is required');
    return { session, tId: scope.tenantId, sId: scope.storeId };
};

const getCollectionRef = (scope: { tId: number; sId: number }) => collection(
    answerlatticeFirebaseClient,
    `${COLLECTION}/${scope.tId}/${scope.sId}`,
);

const toIsoDate = (value: unknown): string | null => {
    if (!value || typeof value !== 'object' || typeof (value as { toDate?: unknown }).toDate !== 'function') return null;
    try {
        const date = (value as { toDate(): Date }).toDate();
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

const validatePendingFile = (value: unknown): UserUploadedFileType => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid changelog image');
    const file = value as Record<string, unknown>;
    const name = typeof file.name === 'string' ? file.name.trim() : '';
    const type = typeof file.type === 'string' ? file.type.trim().toLowerCase() as SupportedFileType : '' as SupportedFileType;
    const uid = typeof file.uid === 'string' ? file.uid.trim() : '';
    const url = typeof file.url === 'string' ? file.url.trim() : '';
    const size = file.size;
    if (!name || name.length > 240
        || !uid || uid.length > 180
        || !ALLOWED_IMAGE_TYPES.has(type)
        || typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0 || size > ANSWERLATTICE_CHANGELOG_MAX_FILE_BYTES
        || (!url.startsWith('https://') && !url.startsWith(`data:${type};base64,`))) {
        throw new Error('Changelog images must be JPG, PNG, WebP, or GIF files up to 5 MB.');
    }
    return { name, type, uid, url, size };
};

const uploadPendingFiles = async (
    values: unknown,
    session: any,
) => {
    if (!Array.isArray(values) || values.length > ANSWERLATTICE_CHANGELOG_MAX_FILES) {
        throw new Error(`A changelog entry can include up to ${ANSWERLATTICE_CHANGELOG_MAX_FILES} images.`);
    }
    const files = values.map(validatePendingFile);
    const uploadedUrls: string[] = [];
    try {
        const prepared = [];
        for (const file of files) {
            if (!file.url.startsWith('data:')) {
                prepared.push(file);
                continue;
            }
            const fileId = createRuntimeId('changelog_image');
            const path = generateStoragePath({
                collection: COLLECTION,
                fileType: 'files',
                session,
                fileId,
            });
            const url = await uploadBase64ToStorage({
                cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
                fileId,
                storage: answerlatticeStorage,
                url: file.url,
                path,
                type: file.type as SupportedFileType,
            });
            uploadedUrls.push(url);
            prepared.push({ ...file, url });
        }
        return { files: prepared, uploadedUrls };
    } catch (error) {
        await Promise.allSettled(uploadedUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)));
        throw error;
    }
};

const buildMutationAction = async (
    action: 'create' | 'update',
    entryPayload: unknown,
    entryId?: string,
): Promise<{ parsed: AnswerlatticeChangelogAction; uploadedUrls: string[] }> => {
    if (!entryPayload || typeof entryPayload !== 'object' || Array.isArray(entryPayload)) throw new Error('Invalid changelog entry');
    const value = entryPayload as Record<string, unknown>;
    const { session } = await getScope();
    const releasedOn = toIsoDate(value.releasedOn);
    if (!releasedOn) throw new Error('Invalid changelog release date');
    const prepared = await uploadPendingFiles(value.files ?? [], session);
    const raw = {
        action,
        requestId: typeof value.requestId === 'string' ? value.requestId : createRuntimeId(`changelog_${action}`),
        ...(entryId ? { entryId } : {}),
        entry: {
            title: value.title,
            description: value.description,
            tags: value.tags ?? [],
            releasedOn,
            published: value.published === true,
            version: typeof value.version === 'string' && value.version.trim() ? value.version.trim() : null,
            contextKeys: value.contextKeys ?? [],
            kbSources: value.kbSources ?? [],
            youtubeLinks: value.youtubeLinks ?? [],
            files: prepared.files,
            entityChanges: value.entityChanges ?? [],
            releaseId: value.releaseId ?? null,
        },
    };
    const parsed = parseAnswerlatticeChangelogAction(raw);
    if (!parsed) {
        await Promise.allSettled(prepared.uploadedUrls.map((url) => deleteFileByUrl(url, answerlatticeStorage)));
        throw new Error('Invalid changelog entry');
    }
    return { parsed, uploadedUrls: prepared.uploadedUrls };
};

const executeChangelogAction = async (action: AnswerlatticeChangelogAction) => {
    const response = await fetch('/api/answerlattice/changelog', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
    });
    const payload = await readJsonResponseWithLimit<unknown>(response, CHANGELOG_ACTION_RESPONSE_MAX_BYTES)
        .catch(() => null);
    if (!response.ok) {
        throw new Error('Changelog action failed');
    }
    const parsed = AnswerlatticeChangelogActionResultSchema.safeParse(payload);
    if (!parsed.success) throw new Error('Changelog action returned an invalid response');
    return parsed.data;
};

const cleanupRemovedFiles = async (urls: string[]) => {
    if (urls.length === 0) return;
    const results = await Promise.allSettled(urls.map((url) => deleteFileByUrl(url, answerlatticeStorage)));
    if (results.some((result) => result.status === 'rejected')) {
        logRuntimeFailure('answerlattice_changelog_storage_cleanup_failed', new Error('storage_cleanup_failed'), {
            fileCount: urls.length,
        });
    }
};

export const addChangelogEntry = async (entryPayload: unknown) => apiCallComposer(
    async () => {
        const prepared = await buildMutationAction('create', entryPayload);
        try {
            return await executeChangelogAction(prepared.parsed);
        } catch (error) {
            await cleanupRemovedFiles(prepared.uploadedUrls);
            throw error;
        }
    },
    { hasEntryPayload: Boolean(entryPayload) },
    'addChangelogEntry',
);

export const updateChangelogEntry = async (entryId: string, entryPayload: unknown) => apiCallComposer(
    async () => {
        const prepared = await buildMutationAction('update', entryPayload, entryId);
        try {
            const result = await executeChangelogAction(prepared.parsed);
            await cleanupRemovedFiles(result.removedFileUrls);
            return result;
        } catch (error) {
            await cleanupRemovedFiles(prepared.uploadedUrls);
            throw error;
        }
    },
    { entryId, hasEntryPayload: Boolean(entryPayload) },
    'updateChangelogEntry',
);

export const deleteChangelogEntry = async (entryId: string) => apiCallComposer(
    async () => {
        await getScope();
        const action = parseAnswerlatticeChangelogAction({
            action: 'delete',
            requestId: createRuntimeId('changelog_delete'),
            entryId,
        });
        if (!action) throw new Error('Invalid changelog entry ID');
        const result = await executeChangelogAction(action);
        await cleanupRemovedFiles(result.removedFileUrls);
        return result;
    },
    { entryId },
    'deleteChangelogEntry',
);

export const fetchLatestChangelogPage = async (): Promise<ChangelogPage | null> => {
    const scope = await getScope();
    const snapshot = await getDocs(query(getCollectionRef(scope), orderBy('pageNumber', 'desc'), limit(1)));
    const page = snapshot.docs[0];
    if (!page) return null;
    const normalized = normalizeAnswerlatticeStoredChangelogPage(page.data(), page.id, scope);
    if (!normalized) throw new Error('Invalid persisted changelog page');
    return normalized;
};

export const loadOlderChangelogPage = async (currentPageNumber: number): Promise<ChangelogPage | null> => {
    if (!Number.isSafeInteger(currentPageNumber) || currentPageNumber <= 1) return null;
    const scope = await getScope();
    const snapshot = await getDocs(query(
        getCollectionRef(scope),
        where('pageNumber', '<', currentPageNumber),
        orderBy('pageNumber', 'desc'),
        limit(1),
    ));
    const page = snapshot.docs[0];
    if (!page) return null;
    const normalized = normalizeAnswerlatticeStoredChangelogPage(page.data(), page.id, scope);
    if (!normalized) throw new Error('Invalid persisted changelog page');
    return normalized;
};
