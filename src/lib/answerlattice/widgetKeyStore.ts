import { DB_COLLECTIONS } from '@constant/database';
import { isAnswerlatticeStoreInScope, normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import {
    buildAnswerlatticeWidgetApiStateWithNewKey,
    buildAnswerlatticeWidgetKeySummaries,
    renameAnswerlatticeWidgetKey,
    revokeAnswerlatticeWidgetKey,
    type AnswerlatticeWidgetApiState,
    type AnswerlatticeWidgetKeyRecord,
} from '@lib/answerlattice/widgetKeyManager';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';

export class AnswerlatticeWidgetKeyStoreError extends Error {
    readonly code: 'key_limit' | 'key_not_found' | 'store_not_found' | 'workspace_mismatch';
    readonly status: number;

    constructor(
        code: AnswerlatticeWidgetKeyStoreError['code'],
        status: number,
        message: string,
    ) {
        super(message);
        this.name = 'AnswerlatticeWidgetKeyStoreError';
        Object.setPrototypeOf(this, new.target.prototype);
        this.code = code;
        this.status = status;
    }
}

type WidgetKeyMutation =
    | { action: 'generate'; apiKey: string; keyHash: string; name?: string }
    | { action: 'rename'; keyId: string; name: string }
    | { action: 'delete' | 'revoke'; keyId?: string };

export type AnswerlatticeWidgetKeyStoreResult = {
    state: AnswerlatticeWidgetApiState;
    generatedRecord?: AnswerlatticeWidgetKeyRecord;
};

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof (answerlatticeFirestoreAdmin as any).collection !== 'function') {
        throw new Error('Answerlattice Firebase is not configured');
    }
    return answerlatticeFirestoreAdmin;
};

export const mutateAnswerlatticeWidgetKeys = async (
    scope: { tenantId: number; storeId: number },
    mutation: WidgetKeyMutation,
): Promise<AnswerlatticeWidgetKeyStoreResult> => {
    const tenantId = normalizeAnswerlatticeScopeDocumentId(scope.tenantId);
    const storeId = normalizeAnswerlatticeScopeDocumentId(scope.storeId);
    if (tenantId === null || storeId === null) {
        throw new AnswerlatticeWidgetKeyStoreError('workspace_mismatch', 403, 'Answerlattice workspace is not available.');
    }

    const storeRef = getDb().collection(DB_COLLECTIONS.STORES).doc(String(storeId));
    return getDb().runTransaction(async transaction => {
        const storeSnapshot = await transaction.get(storeRef);
        if (!storeSnapshot.exists) {
            throw new AnswerlatticeWidgetKeyStoreError('store_not_found', 404, 'Store not found.');
        }
        const storeData = storeSnapshot.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, { tenantId, storeId }, storeSnapshot.id)) {
            throw new AnswerlatticeWidgetKeyStoreError('workspace_mismatch', 403, 'Answerlattice workspace is not available.');
        }

        if (mutation.action === 'generate') {
            let generated;
            try {
                generated = buildAnswerlatticeWidgetApiStateWithNewKey({
                    currentState: storeData.answerlatticeWidgetApi,
                    apiKey: mutation.apiKey,
                    keyHash: mutation.keyHash,
                    name: mutation.name,
                });
            } catch (error) {
                if ((error as Error).message === 'ANSWERLATTICE_WIDGET_KEY_LIMIT_REACHED') {
                    throw new AnswerlatticeWidgetKeyStoreError('key_limit', 409, 'Widget key limit reached.');
                }
                throw error;
            }
            transaction.update(storeRef, { answerlatticeWidgetApi: generated.state });
            return { state: generated.state, generatedRecord: generated.record };
        }

        const targetKeyId = mutation.action === 'rename'
            ? mutation.keyId
            : mutation.keyId || buildAnswerlatticeWidgetKeySummaries(storeData.answerlatticeWidgetApi)[0]?.id;
        if (!targetKeyId) {
            throw new AnswerlatticeWidgetKeyStoreError('key_not_found', 404, 'Widget key not found.');
        }
        const nextState = mutation.action === 'rename'
            ? renameAnswerlatticeWidgetKey({
                currentState: storeData.answerlatticeWidgetApi,
                keyId: targetKeyId,
                name: mutation.name,
            })
            : revokeAnswerlatticeWidgetKey({
                currentState: storeData.answerlatticeWidgetApi,
                keyId: targetKeyId,
            });
        if (!nextState) {
            throw new AnswerlatticeWidgetKeyStoreError('key_not_found', 404, 'Widget key not found.');
        }
        transaction.update(storeRef, { answerlatticeWidgetApi: nextState });
        return { state: nextState };
    });
};
