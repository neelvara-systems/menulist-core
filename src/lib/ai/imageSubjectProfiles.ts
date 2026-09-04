import { randomUUID } from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin, storageAdmin } from '@lib/firebase/firebaseAdmin';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { prepareMediaImageAdmin } from '@lib/media/prepareMediaImageAdmin';
import { getMediaDataFingerprint } from '@lib/media/mediaStorage';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    IMAGE_SUBJECT_CONSENT_VERSION,
    IMAGE_SUBJECT_PROFILE_LIMIT,
    IMAGE_SUBJECT_REFERENCE_MAX,
    IMAGE_SUBJECT_REFERENCE_MIN,
    type ImageSubjectProfileConsentInput,
    type ImageSubjectProfileCreateInput,
    type ImageSubjectProfileUpdateInput,
    type ImageSubjectProfileStatus,
    type ImageSubjectProfileSummary,
} from '@type/imageSubjectProfile';

const SUBJECT_STORAGE_PREFIX = 'system/imageSubjectProfiles';
const SUBJECT_REFERENCE_MAX_BYTES = 700 * 1024;

type StoredReference = {
    checksum: string;
    height: number;
    id: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    width: number;
};

type StoredConsent = ImageSubjectProfileConsentInput & {
    assertedAt: FirebaseFirestore.Timestamp;
    assertedBy: string;
    version: string;
    withdrawnAt: FirebaseFirestore.Timestamp | null;
    withdrawnBy: string | null;
};

type StoredProfile = {
    consent: StoredConsent;
    createdAt: FirebaseFirestore.Timestamp;
    createdBy: string;
    label: string;
    references: StoredReference[];
    status: ImageSubjectProfileStatus;
    updatedAt: FirebaseFirestore.Timestamp;
    updatedBy: string;
    version: number;
};

export type ResolvedImageSubjectReference = {
    base64ImageData: string;
    checksum: string;
    mimeType: string;
};

export type ResolvedImageSubjectProfile = {
    id: string;
    references: ResolvedImageSubjectReference[];
    version: number;
};

export class ImageSubjectProfileError extends Error {
    constructor(readonly code: 'CONSENT_REQUIRED' | 'INVALID_INPUT' | 'LIMIT_REACHED' | 'NOT_FOUND' | 'NOT_ACTIVE' | 'VERSION_MISMATCH') {
        super(code);
        this.name = 'ImageSubjectProfileError';
    }
}

function profileCollection(tId: string, sId: string) {
    return firestoreAdmin
        .collection(DB_COLLECTIONS.IMAGE_SUBJECT_PROFILES)
        .doc(tId)
        .collection(sId);
}

function profileRef(tId: string, sId: string, profileId: string) {
    return profileCollection(tId, sId).doc(profileId);
}

function assertConsent(consent: ImageSubjectProfileConsentInput): void {
    if (
        consent.adultConfirmed !== true
        || consent.commercialUsePermissionConfirmed !== true
        || consent.publicFigureConfirmedFalse !== true
        || consent.rightsConfirmed !== true
    ) {
        throw new ImageSubjectProfileError('CONSENT_REQUIRED');
    }
}

function isStoredProfile(value: unknown): value is StoredProfile {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const profile = value as Partial<StoredProfile>;
    return typeof profile.label === 'string'
        && profile.label.length > 0
        && profile.label.length <= 80
        && Number.isSafeInteger(profile.version)
        && Number(profile.version) > 0
        && Array.isArray(profile.references)
        && profile.references.length >= IMAGE_SUBJECT_REFERENCE_MIN
        && profile.references.length <= IMAGE_SUBJECT_REFERENCE_MAX
        && profile.references.every((reference) => (
            reference
            && typeof reference.id === 'string'
            && typeof reference.checksum === 'string'
            && typeof reference.storagePath === 'string'
            && ['image/jpeg', 'image/png', 'image/webp'].includes(reference.mimeType)
            && Number.isSafeInteger(reference.sizeBytes)
            && reference.sizeBytes > 0
            && reference.sizeBytes <= SUBJECT_REFERENCE_MAX_BYTES
            && Number.isSafeInteger(reference.width)
            && reference.width > 0
            && Number.isSafeInteger(reference.height)
            && reference.height > 0
        ))
        && ['active', 'withdrawn', 'deleting'].includes(String(profile.status))
        && Boolean(profile.consent)
        && profile.consent?.adultConfirmed === true
        && profile.consent?.commercialUsePermissionConfirmed === true
        && profile.consent?.publicFigureConfirmedFalse === true
        && profile.consent?.rightsConfirmed === true;
}

function timestampToIso(value: FirebaseFirestore.Timestamp): string {
    return value.toDate().toISOString();
}

function buildPreviewUrl(profileId: string, referenceId: string): string {
    const params = new URLSearchParams({ profileId, referenceId });
    return `/api/image-subject-profiles?${params.toString()}`;
}

function toSummary(id: string, profile: StoredProfile): ImageSubjectProfileSummary {
    return {
        createdAt: timestampToIso(profile.createdAt),
        id,
        label: profile.label,
        references: profile.references.map((reference) => ({
            checksum: reference.checksum,
            height: reference.height,
            id: reference.id,
            mimeType: reference.mimeType,
            previewUrl: buildPreviewUrl(id, reference.id),
            sizeBytes: reference.sizeBytes,
            width: reference.width,
        })),
        status: profile.status,
        updatedAt: timestampToIso(profile.updatedAt),
        version: profile.version,
    };
}

function buildStoragePath(tId: string, sId: string, profileId: string, version: number, referenceId: string): string {
    return `${SUBJECT_STORAGE_PREFIX}/${tId}/${sId}/${profileId}/v${version}/${referenceId}.webp`;
}

function isExpectedStoragePath(path: string, tId: string, sId: string, profileId: string): boolean {
    return path.startsWith(`${SUBJECT_STORAGE_PREFIX}/${tId}/${sId}/${profileId}/`);
}

async function deleteReferences(paths: string[]): Promise<void> {
    await Promise.all(paths.map((path) => storageAdmin.bucket().file(path).delete({ ignoreNotFound: true })));
}

export async function listImageSubjectProfiles(
    tId: string,
    sId: string,
    options: { includeWithdrawn?: boolean } = {},
): Promise<ImageSubjectProfileSummary[]> {
    const snapshot = await profileCollection(tId, sId)
        .orderBy('updatedAt', 'desc')
        .limit(IMAGE_SUBJECT_PROFILE_LIMIT)
        .get();

    return snapshot.docs.flatMap((document) => {
        const data = document.data();
        return isStoredProfile(data)
            && data.status !== 'deleting'
            && (options.includeWithdrawn === true || data.status === 'active')
            ? [toSummary(document.id, data)]
            : [];
    });
}

export async function createImageSubjectProfile(params: {
    input: ImageSubjectProfileCreateInput;
    sId: string;
    tId: string;
    userId: string;
}): Promise<ImageSubjectProfileSummary> {
    assertConsent(params.input.consent);
    if (
        !params.input.label.trim()
        || params.input.label.trim().length > 80
        || params.input.references.length < IMAGE_SUBJECT_REFERENCE_MIN
        || params.input.references.length > IMAGE_SUBJECT_REFERENCE_MAX
    ) {
        throw new ImageSubjectProfileError('INVALID_INPUT');
    }
    const countSnapshot = await profileCollection(params.tId, params.sId).limit(IMAGE_SUBJECT_PROFILE_LIMIT).get();
    if (countSnapshot.size >= IMAGE_SUBJECT_PROFILE_LIMIT) {
        throw new ImageSubjectProfileError('LIMIT_REACHED');
    }

    const profileId = randomUUID();
    const version = 1;
    const uploadedPaths: string[] = [];
    try {
        const references: StoredReference[] = [];
        for (const source of params.input.references) {
            const referenceId = randomUUID();
            const prepared = await prepareMediaImageAdmin(source.dataUrl, 'menuItem', { aspectRatio: '1:1' });
            const storagePath = buildStoragePath(params.tId, params.sId, profileId, version, referenceId);
            await storageAdmin.bucket().file(storagePath).save(prepared.buffer, {
                resumable: false,
                metadata: {
                    cacheControl: 'private, max-age=0, no-store',
                    contentType: prepared.mimeType,
                    metadata: {
                        checksum: prepared.checksum,
                        profileId,
                        referenceId,
                        version: String(version),
                    },
                },
            });
            uploadedPaths.push(storagePath);
            references.push({
                checksum: prepared.checksum,
                height: prepared.height,
                id: referenceId,
                mimeType: prepared.mimeType,
                sizeBytes: prepared.sizeBytes,
                storagePath,
                width: prepared.width,
            });
        }

        const now = admin.firestore.Timestamp.now();
        const profile: StoredProfile = {
            consent: {
                ...params.input.consent,
                assertedAt: now,
                assertedBy: params.userId,
                version: IMAGE_SUBJECT_CONSENT_VERSION,
                withdrawnAt: null,
                withdrawnBy: null,
            },
            createdAt: now,
            createdBy: params.userId,
            label: params.input.label.trim(),
            references,
            status: 'active',
            updatedAt: now,
            updatedBy: params.userId,
            version,
        };
        const ref = profileRef(params.tId, params.sId, profileId);
        await firestoreAdmin.runTransaction(async (transaction) => {
            const latestProfiles = await transaction.get(
                profileCollection(params.tId, params.sId).limit(IMAGE_SUBJECT_PROFILE_LIMIT),
            );
            if (latestProfiles.size >= IMAGE_SUBJECT_PROFILE_LIMIT) {
                throw new ImageSubjectProfileError('LIMIT_REACHED');
            }
            transaction.create(ref, sanitizeForFirestore(profile, {
                undefinedObjectValue: 'omit',
            }));
        });
        return toSummary(profileId, profile);
    } catch (error) {
        await deleteReferences(uploadedPaths).catch((cleanupError) => {
            logRuntimeFailure('image_subject_profile_failed_create_cleanup_failed', cleanupError, {
                uploadedReferenceCount: uploadedPaths.length,
            });
        });
        throw error;
    }
}

export async function withdrawImageSubjectProfile(params: {
    profileId: string;
    sId: string;
    tId: string;
    userId: string;
}): Promise<ImageSubjectProfileSummary> {
    const ref = profileRef(params.tId, params.sId, params.profileId);
    let nextProfile: StoredProfile | null = null;
    await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists || !isStoredProfile(snapshot.data())) throw new ImageSubjectProfileError('NOT_FOUND');
        const current = snapshot.data() as StoredProfile;
        if (current.status === 'deleting') throw new ImageSubjectProfileError('NOT_FOUND');
        if (current.status === 'withdrawn') {
            nextProfile = current;
            return;
        }
        const now = admin.firestore.Timestamp.now();
        const next: StoredProfile = {
            ...current,
            consent: {
                ...current.consent,
                withdrawnAt: now,
                withdrawnBy: params.userId,
            },
            status: 'withdrawn',
            updatedAt: now,
            updatedBy: params.userId,
        };
        transaction.set(ref, sanitizeForFirestore(next, { undefinedObjectValue: 'omit' }));
        nextProfile = next;
    });
    if (!nextProfile) throw new ImageSubjectProfileError('NOT_FOUND');
    return toSummary(params.profileId, nextProfile);
}

export async function renameImageSubjectProfile(params: {
    expectedVersion: number;
    label: string;
    profileId: string;
    sId: string;
    tId: string;
    userId: string;
}): Promise<ImageSubjectProfileSummary> {
    const label = params.label.trim();
    if (!label || label.length > 80) throw new ImageSubjectProfileError('INVALID_INPUT');
    const ref = profileRef(params.tId, params.sId, params.profileId);
    let nextProfile: StoredProfile | null = null;
    await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists || !isStoredProfile(snapshot.data())) throw new ImageSubjectProfileError('NOT_FOUND');
        const current = snapshot.data() as StoredProfile;
        if (current.status === 'deleting') throw new ImageSubjectProfileError('NOT_FOUND');
        if (current.version !== params.expectedVersion) throw new ImageSubjectProfileError('VERSION_MISMATCH');
        const next: StoredProfile = {
            ...current,
            label,
            updatedAt: admin.firestore.Timestamp.now(),
            updatedBy: params.userId,
        };
        transaction.set(ref, sanitizeForFirestore(next, { undefinedObjectValue: 'omit' }));
        nextProfile = next;
    });
    if (!nextProfile) throw new ImageSubjectProfileError('NOT_FOUND');
    return toSummary(params.profileId, nextProfile);
}

export async function replaceImageSubjectProfileReferences(params: {
    input: ImageSubjectProfileUpdateInput;
    sId: string;
    tId: string;
    userId: string;
}): Promise<ImageSubjectProfileSummary> {
    assertConsent(params.input.consent);
    if (
        !params.input.label.trim()
        || params.input.label.trim().length > 80
        || params.input.references.length < IMAGE_SUBJECT_REFERENCE_MIN
        || params.input.references.length > IMAGE_SUBJECT_REFERENCE_MAX
    ) {
        throw new ImageSubjectProfileError('INVALID_INPUT');
    }

    const ref = profileRef(params.tId, params.sId, params.input.profileId);
    const initialSnapshot = await ref.get();
    if (!initialSnapshot.exists || !isStoredProfile(initialSnapshot.data())) {
        throw new ImageSubjectProfileError('NOT_FOUND');
    }
    const initial = initialSnapshot.data() as StoredProfile;
    if (initial.status !== 'active' || initial.consent.withdrawnAt) {
        throw new ImageSubjectProfileError('NOT_ACTIVE');
    }
    if (initial.version !== params.input.expectedVersion) {
        throw new ImageSubjectProfileError('VERSION_MISMATCH');
    }

    const nextVersion = initial.version + 1;
    const uploadedPaths: string[] = [];
    try {
        const references: StoredReference[] = [];
        for (const source of params.input.references) {
            const referenceId = randomUUID();
            const prepared = await prepareMediaImageAdmin(source.dataUrl, 'menuItem', { aspectRatio: '1:1' });
            const storagePath = buildStoragePath(
                params.tId,
                params.sId,
                params.input.profileId,
                nextVersion,
                referenceId,
            );
            await storageAdmin.bucket().file(storagePath).save(prepared.buffer, {
                resumable: false,
                metadata: {
                    cacheControl: 'private, max-age=0, no-store',
                    contentType: prepared.mimeType,
                    metadata: {
                        checksum: prepared.checksum,
                        profileId: params.input.profileId,
                        referenceId,
                        version: String(nextVersion),
                    },
                },
            });
            uploadedPaths.push(storagePath);
            references.push({
                checksum: prepared.checksum,
                height: prepared.height,
                id: referenceId,
                mimeType: prepared.mimeType,
                sizeBytes: prepared.sizeBytes,
                storagePath,
                width: prepared.width,
            });
        }

        let nextProfile: StoredProfile | null = null;
        await firestoreAdmin.runTransaction(async (transaction) => {
            const currentSnapshot = await transaction.get(ref);
            if (!currentSnapshot.exists || !isStoredProfile(currentSnapshot.data())) {
                throw new ImageSubjectProfileError('NOT_FOUND');
            }
            const current = currentSnapshot.data() as StoredProfile;
            if (current.status !== 'active' || current.consent.withdrawnAt) {
                throw new ImageSubjectProfileError('NOT_ACTIVE');
            }
            if (current.version !== params.input.expectedVersion) {
                throw new ImageSubjectProfileError('VERSION_MISMATCH');
            }
            const now = admin.firestore.Timestamp.now();
            const next: StoredProfile = {
                ...current,
                consent: {
                    ...params.input.consent,
                    assertedAt: now,
                    assertedBy: params.userId,
                    version: IMAGE_SUBJECT_CONSENT_VERSION,
                    withdrawnAt: null,
                    withdrawnBy: null,
                },
                // Preserve transaction-current metadata so a concurrent rename is not lost.
                label: current.label,
                references,
                updatedAt: now,
                updatedBy: params.userId,
                version: nextVersion,
            };
            transaction.set(ref, sanitizeForFirestore(next, { undefinedObjectValue: 'omit' }));
            nextProfile = next;
        });
        if (!nextProfile) throw new ImageSubjectProfileError('NOT_FOUND');

        const oldPaths = initial.references
            .map((reference) => reference.storagePath)
            .filter((path) => isExpectedStoragePath(path, params.tId, params.sId, params.input.profileId));
        await deleteReferences(oldPaths).catch((cleanupError) => {
            logRuntimeFailure('image_subject_profile_replaced_reference_cleanup_failed', cleanupError, {
                oldReferenceCount: oldPaths.length,
                profileIdPresent: true,
            });
        });
        return toSummary(params.input.profileId, nextProfile);
    } catch (error) {
        await deleteReferences(uploadedPaths).catch((cleanupError) => {
            logRuntimeFailure('image_subject_profile_failed_update_cleanup_failed', cleanupError, {
                uploadedReferenceCount: uploadedPaths.length,
                profileIdPresent: true,
            });
        });
        throw error;
    }
}

export async function deleteImageSubjectProfile(params: {
    profileId: string;
    sId: string;
    tId: string;
    userId: string;
}): Promise<void> {
    const ref = profileRef(params.tId, params.sId, params.profileId);
    const paths = await firestoreAdmin.runTransaction(async (transaction): Promise<string[]> => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return [];
        if (!isStoredProfile(snapshot.data())) throw new ImageSubjectProfileError('NOT_FOUND');
        const current = snapshot.data() as StoredProfile;
        const currentPaths = current.references
            .map((reference) => reference.storagePath)
            .filter((path) => isExpectedStoragePath(path, params.tId, params.sId, params.profileId));
        transaction.update(ref, {
            status: 'deleting',
            updatedAt: admin.firestore.Timestamp.now(),
            updatedBy: params.userId,
        });
        return currentPaths;
    });
    if (paths.length === 0) return;
    await deleteReferences(paths);
    await ref.delete();
}

export async function readImageSubjectReference(params: {
    profileId: string;
    referenceId: string;
    sId: string;
    tId: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
    const snapshot = await profileRef(params.tId, params.sId, params.profileId).get();
    if (!snapshot.exists || !isStoredProfile(snapshot.data())) throw new ImageSubjectProfileError('NOT_FOUND');
    const profile = snapshot.data() as StoredProfile;
    if (profile.status !== 'active' || profile.consent.withdrawnAt) {
        throw new ImageSubjectProfileError('NOT_FOUND');
    }
    const reference = profile.references.find((candidate) => candidate.id === params.referenceId);
    if (!reference || !isExpectedStoragePath(reference.storagePath, params.tId, params.sId, params.profileId)) {
        throw new ImageSubjectProfileError('NOT_FOUND');
    }
    const [buffer] = await storageAdmin.bucket().file(reference.storagePath).download();
    if (buffer.length <= 0 || buffer.length > SUBJECT_REFERENCE_MAX_BYTES) throw new ImageSubjectProfileError('NOT_FOUND');
    const checksum = getMediaDataFingerprint(`data:${reference.mimeType};base64,${buffer.toString('base64')}`);
    if (checksum !== reference.checksum) throw new ImageSubjectProfileError('NOT_FOUND');
    return { buffer, mimeType: reference.mimeType };
}

export async function resolveImageSubjectProfileForGeneration(params: {
    expectedVersion?: number | null;
    profileId?: string | null;
    sId: string;
    tId: string;
}): Promise<ResolvedImageSubjectProfile | null> {
    if (!params.profileId) return null;
    const snapshot = await profileRef(params.tId, params.sId, params.profileId).get();
    if (!snapshot.exists || !isStoredProfile(snapshot.data())) throw new ImageSubjectProfileError('NOT_FOUND');
    const profile = snapshot.data() as StoredProfile;
    if (profile.status !== 'active' || profile.consent.withdrawnAt) throw new ImageSubjectProfileError('NOT_ACTIVE');
    assertConsent(profile.consent);
    if (params.expectedVersion && profile.version !== params.expectedVersion) {
        throw new ImageSubjectProfileError('VERSION_MISMATCH');
    }

    const references = await Promise.all(profile.references.map(async (reference) => {
        if (!isExpectedStoragePath(reference.storagePath, params.tId, params.sId, params.profileId!)) {
            throw new ImageSubjectProfileError('NOT_FOUND');
        }
        const [buffer] = await storageAdmin.bucket().file(reference.storagePath).download();
        if (buffer.length <= 0 || buffer.length > SUBJECT_REFERENCE_MAX_BYTES) {
            throw new ImageSubjectProfileError('NOT_FOUND');
        }
        const dataUrl = `data:${reference.mimeType};base64,${buffer.toString('base64')}`;
        const checksum = getMediaDataFingerprint(dataUrl);
        if (checksum !== reference.checksum) throw new ImageSubjectProfileError('NOT_FOUND');
        return {
            base64ImageData: buffer.toString('base64'),
            checksum,
            mimeType: reference.mimeType,
        };
    }));

    return { id: snapshot.id, references, version: profile.version };
}

export async function assertImageSubjectProfileAvailable(params: {
    expectedVersion?: number | null;
    profileId?: string | null;
    sId: string;
    tId: string;
}): Promise<{ id: string; version: number } | null> {
    if (!params.profileId) return null;
    const snapshot = await profileRef(params.tId, params.sId, params.profileId).get();
    if (!snapshot.exists || !isStoredProfile(snapshot.data())) throw new ImageSubjectProfileError('NOT_FOUND');
    const profile = snapshot.data() as StoredProfile;
    if (profile.status !== 'active' || profile.consent.withdrawnAt) throw new ImageSubjectProfileError('NOT_ACTIVE');
    assertConsent(profile.consent);
    if (params.expectedVersion && profile.version !== params.expectedVersion) {
        throw new ImageSubjectProfileError('VERSION_MISMATCH');
    }
    return { id: snapshot.id, version: profile.version };
}
