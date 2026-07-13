import { getUnitCost } from "@constant/AI/unitCosts";
import { PRODUCT_IDS } from "@constant/product";
import { firestoreAdmin, admin } from "@lib/firebase/firebaseAdmin";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import {
    AiCapacityReservation,
    consumeAICapacity,
    consumeAICapacityIdempotently,
    finalizeAiCapacityReservation,
    RemainingBalance,
} from "./capacityCheck";
import {
    AiOperationLogInput,
    buildAiOperationDocument,
    getMenuListAiOperationRef,
    normalizeAiOperationDocumentId,
    recordAiOperation,
    recordAiOperationForSession,
} from "./operationLog";

type FinalizeAiOperationAccountingParams = {
    capacityReservation?: AiCapacityReservation;
    capacitySubscription?: any | null;
    context?: Record<string, unknown>;
    input: AiOperationLogInput;
    idempotencyKey?: string;
    logLabel: string;
    session?: any;
};

type FinalizeAiOperationAccountingResult = {
    remainingBalance: RemainingBalance | null;
    transactionId: string | null;
    unitsConsumed: number;
};

const getContextShape = (context?: Record<string, unknown>) => ({
    contextPresent: Boolean(context),
    contextKeyCount: context ? Object.keys(context).length : 0,
});

const getAiAccountingLogContext = (
    input: AiOperationLogInput,
    logLabel: string,
    unitsConsumed: number,
    capacitySubscription: unknown,
    session: unknown,
    context?: Record<string, unknown>,
) => ({
    ...getBoundedRuntimeStringContext('action', input.action),
    ...getBoundedRuntimeStringContext('logLabel', logLabel),
    ...getBoundedRuntimeStringContext('productId', input.pId),
    ...getBoundedRuntimeStringContext('storeId', input.sId),
    ...getBoundedRuntimeStringContext('tenantId', input.tId),
    ...getBoundedRuntimeStringContext('userId', input.uId),
    ...getContextShape(context),
    hasCapacitySubscription: Boolean(capacitySubscription),
    hasSession: Boolean(session),
    unitsConsumed,
});

/**
 * Settle a pre-provider reservation after a successful paid provider result, or
 * record a zero-unit operation. The guarded idempotent branch remains only for
 * replaying historical operation IDs created before reservations were required.
 */
export async function finalizeAiOperationAccounting({
    capacityReservation,
    capacitySubscription,
    context,
    input,
    idempotencyKey,
    logLabel,
    session,
}: FinalizeAiOperationAccountingParams): Promise<FinalizeAiOperationAccountingResult> {
    const unitsConsumed = Number(input.unitsConsumed ?? getUnitCost(input.action));
    if (!Number.isSafeInteger(unitsConsumed) || unitsConsumed < 0) {
        throw new Error(`${logLabel} accounting units are invalid.`);
    }
    const operationInput: AiOperationLogInput = {
        ...input,
        ...(session ? {
            pId: input.pId ?? session?.pId ?? session?.user?.pId ?? session?.user?.productId,
            tId: input.tId ?? session?.tId ?? session?.user?.tenantId,
            sId: input.sId ?? session?.sId ?? session?.user?.storeId,
            uId: input.uId ?? session?.uId ?? session?.user?.id,
            createdBy: input.createdBy ?? session?.user?.name,
            modifiedBy: input.modifiedBy ?? session?.user?.name,
        } : {}),
        unitsConsumed,
    };

    let transactionId: string | null = null;
    let remainingBalance: RemainingBalance | null = null;

    if (capacityReservation) {
        if (unitsConsumed <= 0) {
            throw new Error(`${logLabel} cannot settle a paid reservation for a free operation.`);
        }
        if (idempotencyKey !== undefined && idempotencyKey !== capacityReservation.id) {
            throw new Error(`${logLabel} reservation idempotency key does not match.`);
        }
        try {
            const operationData = buildAiOperationDocument(operationInput) as Record<string, unknown>;
            const accounting = await finalizeAiCapacityReservation({
                operationData,
                reservation: capacityReservation,
            });
            return {
                remainingBalance: accounting.remainingBalance,
                transactionId: capacityReservation.id,
                unitsConsumed,
            };
        } catch (reservationAccountingError) {
            logRuntimeFailure(
                'ai_accounting_reservation_finalize_failed',
                reservationAccountingError,
                getAiAccountingLogContext(operationInput, logLabel, unitsConsumed, capacitySubscription, session, context),
            );
            throw reservationAccountingError;
        }
    }

    if (unitsConsumed > 0 && idempotencyKey === undefined) {
        throw new Error(`${logLabel} paid provider work requires a pre-provider credit reservation.`);
    }

    if (idempotencyKey !== undefined) {
        const operationId = normalizeAiOperationDocumentId(idempotencyKey);
        if (!operationId) throw new Error(`${logLabel} idempotency key is invalid.`);
        if (String(operationInput.pId || '').toUpperCase() === PRODUCT_IDS.ANSWERLATTICE) {
            throw new Error(`${logLabel} idempotent accounting is not available for this product.`);
        }
        try {
            const operationRef = getMenuListAiOperationRef(operationInput, operationId);
            const operationData = buildAiOperationDocument(operationInput) as Record<string, unknown>;
            if (unitsConsumed > 0 && !capacitySubscription) {
                const existing = await operationRef.get();
                const data = existing.data() || {};
                if (
                    !existing.exists
                    || data.accountingIdempotencyKey !== operationId
                    || Number(data.accountingUnits) !== unitsConsumed
                    || data.accountingStatus !== 'consumed'
                    || data.action !== operationData.action
                    || String(data.tId) !== String(operationData.tId)
                    || String(data.sId) !== String(operationData.sId)
                ) {
                    throw new Error(`${logLabel} billing subscription is required for idempotent accounting.`);
                }
                const monthlyCredits = Number(data.remainingMonthlyCredits);
                const topUpCredits = Number(data.remainingTopUpCredits);
                if (!Number.isFinite(monthlyCredits) || !Number.isFinite(topUpCredits)) {
                    throw new Error(`${logLabel} accounting replay balance is invalid.`);
                }
                return {
                    remainingBalance: { monthlyCredits, topUpCredits },
                    transactionId: operationId,
                    unitsConsumed,
                };
            }
            if (capacitySubscription && unitsConsumed > 0) {
                const accounting = await consumeAICapacityIdempotently({
                    idempotencyKey: operationId,
                    operationData,
                    operationRef,
                    subscription: capacitySubscription,
                    unitsToConsume: unitsConsumed,
                });
                remainingBalance = accounting.remainingBalance;
            } else {
                await firestoreAdmin.runTransaction(async (transaction) => {
                    const existing = await transaction.get(operationRef);
                    if (existing.exists) {
                        const data = existing.data() || {};
                        if (
                            data.accountingIdempotencyKey !== operationId
                            || Number(data.accountingUnits) !== unitsConsumed
                            || data.accountingStatus !== 'not_required'
                        ) {
                            throw new Error('AI accounting idempotency conflict.');
                        }
                        return;
                    }
                    transaction.set(operationRef, {
                        ...operationData,
                        accountingIdempotencyKey: operationId,
                        accountingStatus: 'not_required',
                        accountingUnits: unitsConsumed,
                        modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
                    });
                });
            }
            transactionId = operationId;
            return { remainingBalance, transactionId, unitsConsumed };
        } catch (idempotentAccountingError) {
            logRuntimeFailure(
                'ai_accounting_idempotent_finalize_failed',
                idempotentAccountingError,
                getAiAccountingLogContext(operationInput, logLabel, unitsConsumed, capacitySubscription, session, context),
            );
            throw idempotentAccountingError;
        }
    }

    try {
        transactionId = session
            ? await recordAiOperationForSession(session, operationInput)
            : await recordAiOperation(operationInput);
    } catch (operationLogError) {
        logRuntimeFailure(
            'ai_accounting_operation_log_failed',
            operationLogError,
            getAiAccountingLogContext(operationInput, logLabel, unitsConsumed, capacitySubscription, session, context),
        );
    }

    if (capacitySubscription && unitsConsumed > 0) {
        try {
            remainingBalance = await consumeAICapacity(capacitySubscription, unitsConsumed);
            if (!remainingBalance) {
                throw new Error(`${logLabel} credit consumption returned no balance`);
            }
        } catch (creditConsumptionError) {
            logRuntimeFailure(
                'ai_accounting_credit_consumption_failed',
                creditConsumptionError,
                getAiAccountingLogContext(operationInput, logLabel, unitsConsumed, capacitySubscription, session, context),
            );
            throw creditConsumptionError;
        }
    }

    return {
        remainingBalance,
        transactionId,
        unitsConsumed,
    };
}
