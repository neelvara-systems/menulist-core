import { createHash } from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { buildAnswerlatticeVersionDriftReason } from '@data/shared/answerlatticeDrift';
import type { AnswerlatticeAccessContext } from '@lib/answerlattice/accessControl';
import {
    ANSWERLATTICE_CACHE_SOURCES,
} from '@lib/answerlattice/cacheVersionManifest';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
    ANSWERLATTICE_RELEASE_ACTIVATION_LEASE_MS,
    ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS,
    AnswerlatticeStoredReleaseSchema,
    getAnswerlatticeTimestampMillis,
    type AnswerlatticeReleaseAction,
    type AnswerlatticeReleaseActionResponse,
    type AnswerlatticeReleaseActionResult,
} from './releaseContracts';
import {
    AnswerlatticeInvalidationOwnershipError,
    getAnswerlatticeMissingBundleManifestBase,
    getAnswerlatticeMissingSourceVersionsBase,
    readAnswerlatticeInvalidationOwnership,
} from './invalidationOwnership';

const RELEASES = DB_COLLECTIONS.ANSWERLATTICE_RELEASES;
const ENTITIES = DB_COLLECTIONS.ANSWERLATTICE_ENTITIES;
const ANSWERS = DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS;
const AUDIT_LOGS = DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const stableJson = (value: Record<string, unknown>) => JSON.stringify(
    Object.keys(value).sort().reduce<Record<string, unknown>>((result, key) => {
        result[key] = value[key];
        return result;
    }, {}),
);

const readReleaseInvalidationOwnership = async (
    transaction: FirebaseFirestore.Transaction,
    access: AnswerlatticeAccessContext,
) => {
    try {
        return await readAnswerlatticeInvalidationOwnership({
            cacheSources: [ANSWERLATTICE_CACHE_SOURCES.CANONICAL],
            db: getDb(),
            scope: { tId: access.scope.tenantId, sId: access.scope.storeId },
            transaction,
        });
    } catch (error) {
        if (error instanceof AnswerlatticeInvalidationOwnershipError) {
            throw new AnswerlatticeReleaseError(409, 'Release cache authority needs repair before activation can continue.');
        }
        throw error;
    }
};

const releaseIdForRequest = (tId: number, sId: number, requestId: string) => (
    `release_${sha256(`${tId}:${sId}:${requestId}`).slice(0, 40)}`
);

const auditId = (action: string, releaseId: string, suffix = '') => (
    `release_${action}_${sha256(`${releaseId}:${suffix}`).slice(0, 40)}`
);

export class AnswerlatticeReleaseError extends Error {
    constructor(
        public readonly status: number,
        public readonly publicMessage: string,
        message = publicMessage,
    ) {
        super(message);
        this.name = 'AnswerlatticeReleaseError';
        Object.setPrototypeOf(this, AnswerlatticeReleaseError.prototype);
    }
}

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new AnswerlatticeReleaseError(503, 'Release management is temporarily unavailable.');
    }
    return answerlatticeFirestoreAdmin;
};

const getActor = (access: AnswerlatticeAccessContext) => ({
    id: String(access.user.id || access.user.email || 'unknown').slice(0, 180),
    label: String(access.user.email || access.user.name || access.user.id || 'Team member').slice(0, 200),
});

const readStoredRelease = (
    snapshot: FirebaseFirestore.DocumentSnapshot,
    access: AnswerlatticeAccessContext,
) => {
    if (!snapshot.exists) throw new AnswerlatticeReleaseError(404, 'Release not found.');
    const parsed = AnswerlatticeStoredReleaseSchema.safeParse(snapshot.data());
    if (!parsed.success
        || parsed.data.tId !== access.scope.tenantId
        || parsed.data.sId !== access.scope.storeId) {
        throw new AnswerlatticeReleaseError(409, 'Release data is invalid for this workspace.');
    }
    return parsed.data;
};

const buildAudit = (
    access: AnswerlatticeAccessContext,
    actorId: string,
    action: string,
    releaseId: string,
    previousState: Record<string, unknown> | null,
    newState: Record<string, unknown>,
) => ({
    pId: PRODUCT_IDS.ANSWERLATTICE,
    tId: access.scope.tenantId,
    sId: access.scope.storeId,
    action,
    entityType: 'release',
    entityId: releaseId,
    previousState,
    newState,
    performedBy: actorId,
    timestamp: FieldValue.serverTimestamp(),
    createdOn: FieldValue.serverTimestamp(),
});

async function createRelease(
    action: Extract<AnswerlatticeReleaseAction, { action: 'create' }>,
    access: AnswerlatticeAccessContext,
): Promise<AnswerlatticeReleaseActionResult> {
    const db = getDb();
    const actor = getActor(access);
    const releaseId = releaseIdForRequest(access.scope.tenantId, access.scope.storeId, action.requestId);
    const releaseRef = db.collection(RELEASES).doc(releaseId);
    const requestFingerprint = sha256(stableJson({
        entityChanges: [...action.entityChanges].sort(),
        releasedAt: action.releasedAt,
        versionLabel: action.versionLabel,
        versionNormalized: action.versionNormalized,
    }));
    let replayed = false;
    let replayStatus: 'pending' | 'processing' | 'active' = 'pending';

    await db.runTransaction(async (transaction) => {
        const existingSnapshot = await transaction.get(releaseRef);
        if (existingSnapshot.exists) {
            const existing = readStoredRelease(existingSnapshot, access);
            if (existing.requestId !== action.requestId || existing.requestFingerprint !== requestFingerprint) {
                throw new AnswerlatticeReleaseError(409, 'This release request was already used with different details.');
            }
            replayed = true;
            replayStatus = existing.status;
            return;
        }

        const latestQuery = db.collection(RELEASES)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', access.scope.tenantId)
            .where('sId', '==', access.scope.storeId)
            .orderBy('versionNormalized', 'desc')
            .limit(1);
        const entityRefs = action.entityChanges.map((entityId) => db.collection(ENTITIES).doc(entityId));
        const latestSnapshot = await transaction.get(latestQuery);
        const entitySnapshots = await transaction.getAll(...entityRefs);

        const latestSnapshotDoc = latestSnapshot.docs[0];
        if (latestSnapshotDoc) {
            const latest = AnswerlatticeStoredReleaseSchema.safeParse(latestSnapshotDoc.data());
            if (!latest.success
                || latest.data.tId !== access.scope.tenantId
                || latest.data.sId !== access.scope.storeId) {
                throw new AnswerlatticeReleaseError(409, 'Existing release data is invalid for this workspace.');
            }
            if (latest.data.versionNormalized >= action.versionNormalized) {
                throw new AnswerlatticeReleaseError(409, 'Release versions must increase in order.');
            }
        }
        for (const entitySnapshot of entitySnapshots) {
            const entity = entitySnapshot.data();
            if (!entitySnapshot.exists
                || entity?.pId !== PRODUCT_IDS.ANSWERLATTICE
                || entity?.tId !== access.scope.tenantId
                || entity?.sId !== access.scope.storeId) {
                throw new AnswerlatticeReleaseError(400, 'A changed entity does not belong to this workspace.');
            }
        }

        const now = FieldValue.serverTimestamp();
        transaction.create(releaseRef, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: access.scope.tenantId,
            sId: access.scope.storeId,
            versionLabel: action.versionLabel,
            versionNormalized: action.versionNormalized,
            releasedAt: Timestamp.fromDate(new Date(action.releasedAt)),
            entityChanges: action.entityChanges,
            status: 'pending',
            requestId: action.requestId,
            requestFingerprint,
            createdOn: now,
            createdBy: actor.label,
            modifiedOn: now,
            modifiedBy: actor.label,
        });
        transaction.create(
            db.collection(AUDIT_LOGS).doc(auditId('created', releaseId)),
            buildAudit(access, actor.id, 'release_created', releaseId, null, {
                status: 'pending',
                versionLabel: action.versionLabel,
                versionNormalized: action.versionNormalized,
                entityChanges: action.entityChanges,
            }),
        );
    });

    return { success: true, action: 'create', releaseId, status: replayStatus, replayed };
}

const claimReleaseActivation = async (
    releaseId: string,
    requestId: string,
    access: AnswerlatticeAccessContext,
) => {
    const db = getDb();
    const actor = getActor(access);
    const releaseRef = db.collection(RELEASES).doc(releaseId);
    let alreadyActive: { evaluatedAnswers: number; driftedAnswers: number } | null = null;

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(releaseRef);
        const release = readStoredRelease(snapshot, access);
        if (release.status === 'active') {
            alreadyActive = {
                evaluatedAnswers: release.driftEvaluation?.evaluatedAnswers || 0,
                driftedAnswers: release.driftEvaluation?.driftedAnswers || 0,
            };
            return;
        }

        const nowMillis = Date.now();
        const leaseMillis = getAnswerlatticeTimestampMillis(release.activation?.leaseExpiresAt);
        if (release.status === 'processing'
            && release.activation?.requestId !== requestId
            && leaseMillis > nowMillis) {
            throw new AnswerlatticeReleaseError(409, 'This release is already being activated.');
        }

        const now = Timestamp.now();
        transaction.update(releaseRef, {
            status: 'processing',
            activation: {
                requestId,
                startedAt: now,
                leaseExpiresAt: Timestamp.fromMillis(now.toMillis() + ANSWERLATTICE_RELEASE_ACTIVATION_LEASE_MS),
            },
            modifiedOn: now,
            modifiedBy: actor.label,
        });
    });

    return alreadyActive;
};

async function finishReleaseActivation(
    releaseId: string,
    requestId: string,
    access: AnswerlatticeAccessContext,
) {
    const db = getDb();
    const actor = getActor(access);
    const releaseRef = db.collection(RELEASES).doc(releaseId);
    let evaluatedAnswers = 0;
    let driftedAnswers = 0;

    await db.runTransaction(async (transaction) => {
        const releaseSnapshot = await transaction.get(releaseRef);
        const release = readStoredRelease(releaseSnapshot, access);
        if (release.status === 'active') {
            evaluatedAnswers = release.driftEvaluation?.evaluatedAnswers || 0;
            driftedAnswers = release.driftEvaluation?.driftedAnswers || 0;
            return;
        }
        if (release.status !== 'processing' || release.activation?.requestId !== requestId) {
            throw new AnswerlatticeReleaseError(409, 'Release activation ownership changed. Try again.');
        }

        const answersQuery = db.collection(ANSWERS)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', access.scope.tenantId)
            .where('sId', '==', access.scope.storeId)
            .where('scope.entityIds', 'array-contains-any', release.entityChanges)
            .where('status', '==', 'active')
            .limit(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS + 1);
        const answersSnapshot = await transaction.get(answersQuery);
        if (answersSnapshot.size > ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS) {
            throw new AnswerlatticeReleaseError(409, 'This release affects more answers than one safe activation can process.');
        }
        const invalidationOwnership = await readReleaseInvalidationOwnership(transaction, access);

        evaluatedAnswers = answersSnapshot.size;
        for (const answerSnapshot of answersSnapshot.docs) {
            const answer = answerSnapshot.data() as Record<string, any>;
            const entityIds = Array.isArray(answer.scope?.entityIds)
                && answer.scope.entityIds.every((entityId: unknown) => typeof entityId === 'string')
                ? answer.scope.entityIds as string[]
                : null;
            const lastValidated = answer.productBinding?.lastValidatedInVersion;
            if (answer.pId !== PRODUCT_IDS.ANSWERLATTICE
                || answer.tId !== access.scope.tenantId
                || answer.sId !== access.scope.storeId
                || !entityIds
                || !Number.isSafeInteger(lastValidated)
                || lastValidated < 0
                || !answer.governance
                || typeof answer.governance !== 'object') {
                throw new AnswerlatticeReleaseError(409, 'An affected approved answer has an invalid stored shape.');
            }
            if (lastValidated >= release.versionNormalized) continue;
            const releaseReason = buildAnswerlatticeVersionDriftReason(
                {
                    entityIds,
                    lastValidatedInVersion: lastValidated,
                },
                {
                    versionLabel: release.versionLabel,
                    versionNormalized: release.versionNormalized,
                    changedEntityIds: release.entityChanges,
                },
            );
            if (!releaseReason) continue;
            const previousReason = typeof answer.governance.driftReason === 'string'
                ? answer.governance.driftReason.trim()
                : '';
            const driftReason = previousReason.includes(releaseReason)
                ? previousReason
                : [previousReason, releaseReason].filter(Boolean).join('; ').slice(0, 2_000);
            transaction.update(answerSnapshot.ref, {
                'governance.driftFlag': true,
                'governance.driftReason': driftReason,
                'governance.reviewRequired': true,
                modifiedOn: FieldValue.serverTimestamp(),
                modifiedBy: actor.label,
            });
            transaction.create(
                db.collection(AUDIT_LOGS).doc(auditId('drift', releaseId, answerSnapshot.id)),
                {
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: access.scope.tenantId,
                    sId: access.scope.storeId,
                    action: 'drift_detected',
                    entityType: 'canonicalAnswer',
                    entityId: answerSnapshot.id,
                    previousState: {
                        driftFlag: Boolean(answer.governance.driftFlag),
                        driftReason: previousReason || null,
                    },
                    newState: { driftFlag: true, driftReason, reviewRequired: true, releaseId },
                    performedBy: actor.id,
                    timestamp: FieldValue.serverTimestamp(),
                    createdOn: FieldValue.serverTimestamp(),
                },
            );
            driftedAnswers += 1;
        }

        const now = FieldValue.serverTimestamp();
        transaction.update(releaseRef, {
            status: 'active',
            activation: FieldValue.delete(),
            activatedAt: now,
            driftEvaluation: {
                status: 'completed',
                evaluatedAnswers,
                driftedAnswers,
                completedAt: now,
            },
            modifiedOn: now,
            modifiedBy: actor.label,
        });
        transaction.create(
            db.collection(AUDIT_LOGS).doc(auditId('activated', releaseId)),
            buildAudit(access, actor.id, 'release_activated', releaseId, { status: 'processing' }, {
                status: 'active',
                evaluatedAnswers,
                driftedAnswers,
            }),
        );
        transaction.set(
            invalidationOwnership.sourceVersionsRef,
            {
                ...(!invalidationOwnership.sourceVersionsExists
                    ? getAnswerlatticeMissingSourceVersionsBase({ tId: access.scope.tenantId, sId: access.scope.storeId })
                    : {}),
                schemaVersion: 1,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: access.scope.tenantId,
                sId: access.scope.storeId,
                releases: FieldValue.increment(1),
                ...(driftedAnswers > 0 ? { canonical: FieldValue.increment(1) } : {}),
                updatedAt: now,
                lastReason: 'release_activate',
                lastSourceId: releaseId,
                lastSourceType: RELEASES,
            },
            { merge: true },
        );
        if (driftedAnswers > 0) {
            transaction.set(
                invalidationOwnership.cacheVersionRefs[ANSWERLATTICE_CACHE_SOURCES.CANONICAL]!,
                {
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: access.scope.tenantId,
                    sId: access.scope.storeId,
                    source: ANSWERLATTICE_CACHE_SOURCES.CANONICAL,
                    version: FieldValue.increment(1),
                    modifiedOn: now,
                    lastReason: 'release_drift_detected',
                    lastSourceId: releaseId,
                    lastSourceType: RELEASES,
                },
                { merge: true },
            );
        }
        transaction.set(
            invalidationOwnership.manifestRef,
            {
                ...(!invalidationOwnership.manifestExists
                    ? getAnswerlatticeMissingBundleManifestBase({ tId: access.scope.tenantId, sId: access.scope.storeId })
                    : {}),
                schemaVersion: 1,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: access.scope.tenantId,
                sId: access.scope.storeId,
                status: 'stale',
                staleReason: 'release_activate',
                updatedAt: now,
                lastReason: 'release_activate',
                lastSourceId: releaseId,
                lastSourceType: RELEASES,
            },
            { merge: true },
        );
    });

    return { evaluatedAnswers, driftedAnswers };
}

const releaseActivationFailure = async (
    releaseId: string,
    requestId: string,
    access: AnswerlatticeAccessContext,
) => {
    const db = getDb();
    const actor = getActor(access);
    const releaseRef = db.collection(RELEASES).doc(releaseId);
    let invalidAuditCollision = false;
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(releaseRef);
        if (!snapshot.exists) return;
        const release = AnswerlatticeStoredReleaseSchema.safeParse(snapshot.data());
        if (!release.success
            || release.data.tId !== access.scope.tenantId
            || release.data.sId !== access.scope.storeId
            || release.data.status !== 'processing'
            || release.data.activation?.requestId !== requestId) {
            return;
        }
        const failureAuditRef = db.collection(AUDIT_LOGS).doc(auditId('activation_failed', releaseId, requestId));
        const failureAuditSnapshot = await transaction.get(failureAuditRef);
        const existingAudit = failureAuditSnapshot.data();
        const existingAuditIsOwned = failureAuditSnapshot.exists
            && existingAudit?.pId === PRODUCT_IDS.ANSWERLATTICE
            && existingAudit?.tId === access.scope.tenantId
            && existingAudit?.sId === access.scope.storeId
            && existingAudit?.action === 'release_activation_failed'
            && existingAudit?.entityType === 'release'
            && existingAudit?.entityId === releaseId;
        invalidAuditCollision = failureAuditSnapshot.exists && !existingAuditIsOwned;
        const now = FieldValue.serverTimestamp();
        transaction.update(releaseRef, {
            status: 'pending',
            activation: FieldValue.delete(),
            driftEvaluation: {
                status: 'failed',
                evaluatedAnswers: 0,
                driftedAnswers: 0,
                failedAt: now,
                failureCode: 'release_drift_evaluation_failed',
            },
            modifiedOn: now,
            modifiedBy: actor.label,
        });
        if (!failureAuditSnapshot.exists) {
            transaction.create(
                failureAuditRef,
                buildAudit(access, actor.id, 'release_activation_failed', releaseId, { status: 'processing' }, {
                    status: 'pending',
                    failureCode: 'release_drift_evaluation_failed',
                }),
            );
        }
    });
    if (invalidAuditCollision) {
        logRuntimeFailure(
            'answerlattice_release_activation_failure_audit_collision',
            new Error('release_activation_failure_audit_collision'),
            { hasTenantScope: true, hasStoreScope: true },
        );
    }
};

async function activateRelease(
    action: Extract<AnswerlatticeReleaseAction, { action: 'activate' }>,
    access: AnswerlatticeAccessContext,
): Promise<AnswerlatticeReleaseActionResult> {
    const alreadyActive = await claimReleaseActivation(action.releaseId, action.requestId, access);
    if (alreadyActive) {
        return {
            success: true,
            action: 'activate',
            releaseId: action.releaseId,
            status: 'active',
            ...alreadyActive,
            replayed: true,
        };
    }

    try {
        const result = await finishReleaseActivation(action.releaseId, action.requestId, access);
        return {
            success: true,
            action: 'activate',
            releaseId: action.releaseId,
            status: 'active',
            ...result,
            replayed: false,
        };
    } catch (error) {
        try {
            await releaseActivationFailure(action.releaseId, action.requestId, access);
        } catch (recoveryError) {
            logRuntimeFailure('answerlattice_release_activation_failure_marker_failed', recoveryError, {
                ...getBoundedRuntimeStringContext('releaseId', action.releaseId),
                ...getBoundedRuntimeStringContext('requestId', action.requestId),
                ...getBoundedRuntimeStringContext('tenantId', access.scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', access.scope.storeId),
            });
        }
        throw error;
    }
}

export const executeAnswerlatticeReleaseAction = async (
    action: AnswerlatticeReleaseAction,
    access: AnswerlatticeAccessContext,
): Promise<AnswerlatticeReleaseActionResponse> => {
    if (
        action.scope.tId !== access.scope.tenantId
        || action.scope.sId !== access.scope.storeId
    ) {
        throw new AnswerlatticeReleaseError(409, 'The Answerlattice workspace changed. Reopen the changelog entry and try again.');
    }
    const result = action.action === 'create'
        ? await createRelease(action, access)
        : await activateRelease(action, access);
    return {
        ...result,
        scope: {
            tId: access.scope.tenantId,
            sId: access.scope.storeId,
        },
    };
};
