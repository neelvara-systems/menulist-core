import 'server-only';

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticeRetentionExpiryMillis } from '@data/shared/answerlatticeRetention';
import { redactAnswerlatticeSupportEvidenceText } from '@data/shared/answerlatticeSupportEvidencePrivacy';
import {
    AnswerlatticeSignalReplayConflictError,
    emitAnswerlatticeSignalWithPersistence,
    type AnswerlatticeSignalPersistenceParams,
    type EmitSignalParams,
} from '@lib/answerlattice/signalEmitter';
import {
    buildAnswerlatticeSignalDocumentId,
    buildAnswerlatticeSignalPayloadFingerprint,
} from '@lib/answerlattice/signalIdentity';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedErrorCode } from '@lib/monitoring/boundedLogContext';
import { createRuntimeId } from '@lib/runtime/randomId';
import type { AnswerlatticeSignalType } from '@type/answerlattice';

export { AnswerlatticeSignalReplayConflictError };

const cleanSignalText = (value: unknown, maxLength = 500): string => (
    redactAnswerlatticeSupportEvidenceText(value, maxLength)
);

const isAlreadyExistsError = (error: unknown): boolean => {
    const code = getBoundedErrorCode(error);
    return code === '6'
        || code === 'already-exists'
        || Boolean(code?.toUpperCase().includes('ALREADY_EXISTS'));
};

const persistAnswerlatticeServerSignal = async (
    params: AnswerlatticeSignalPersistenceParams,
): Promise<void> => {
    if (
        !answerlatticeFirestoreAdmin
        || typeof answerlatticeFirestoreAdmin.collection !== 'function'
    ) {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }

    const now = new Date();
    const traceId = createRuntimeId('al');
    const createdBy = cleanSignalText(
        params.metadata?.source || 'system:answerlattice_signal',
        140,
    ) || 'system:answerlattice_signal';
    const uId = cleanSignalText(params.metadata?.userId || 'system', 140) || 'system';
    const payload = sanitizeForFirestore({
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: params.tId,
        sId: params.sId,
        entityId: params.entityId,
        type: params.type,
        timestamp: now,
        expiresAt: new Date(
            getAnswerlatticeRetentionExpiryMillis('signalEvents', now.getTime()),
        ),
        metadata: params.metadata,
        createdOn: now,
        modifiedOn: now,
        createdBy,
        modifiedBy: createdBy,
        uId,
        traceId,
        requestId: params.persistentDedupKey || traceId,
        ...(params.persistentDedupKey ? {
            dedupKey: cleanSignalText(params.persistentDedupKey, 260),
            identityFingerprint: params.identityFingerprint,
        } : {}),
    });

    const collectionRef = answerlatticeFirestoreAdmin.collection(
        DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
    );
    if (!params.persistentDedupKey) {
        await collectionRef.add(payload);
        return;
    }

    const docId = buildAnswerlatticeSignalDocumentId({
        tId: params.tId,
        sId: params.sId,
        deduplicationKey: params.persistentDedupKey,
    });
    if (!docId) throw new Error('answerlattice_signal_identity_invalid');

    try {
        await collectionRef.doc(docId).create(payload);
    } catch (error) {
        if (!isAlreadyExistsError(error)) throw error;

        const existingSnapshot = await collectionRef.doc(docId).get();
        const existing = existingSnapshot.data() || {};
        const existingFingerprint = typeof existing.identityFingerprint === 'string'
            ? existing.identityFingerprint
            : buildAnswerlatticeSignalPayloadFingerprint({
                type: existing.type,
                entityId: existing.entityId,
                deduplicationKey: existing.dedupKey,
                metadata: existing.metadata,
            });
        if (
            existing.pId === PRODUCT_IDS.ANSWERLATTICE
            && existing.tId === params.tId
            && existing.sId === params.sId
            && existing.type === params.type
            && existing.dedupKey === params.persistentDedupKey
            && existingFingerprint === params.identityFingerprint
        ) {
            return;
        }
        throw new AnswerlatticeSignalReplayConflictError();
    }
};

export const emitAnswerlatticeSignal = async (
    params: EmitSignalParams,
): Promise<boolean> => (
    emitAnswerlatticeSignalWithPersistence(params, persistAnswerlatticeServerSignal)
);

export const emitSuggestionSignal = async (params: {
    type: AnswerlatticeSignalType;
    triggerId: string;
    interactionId: string;
    entityId?: string;
    tId: number;
    sId: number;
    page: string;
    sessionId: string;
    contextKey?: string;
    actionType: string;
    triggerKind: string;
}): Promise<boolean> => {
    const idempotencyKey = `predictive:${params.triggerId}:${params.interactionId}:${params.type}`;

    return emitAnswerlatticeSignal({
        type: params.type,
        entityId: params.entityId,
        tId: params.tId,
        sId: params.sId,
        metadata: {
            source: 'widget:predictive_support',
            signalPurpose: 'predictive_support_interaction',
            requestId: idempotencyKey,
            idempotencyKey,
            triggerId: params.triggerId,
            page: params.page,
            interactionId: params.interactionId,
            sessionId: params.sessionId,
            contextKey: params.contextKey || null,
            actionType: params.actionType,
            triggerKind: params.triggerKind,
        },
    });
};
