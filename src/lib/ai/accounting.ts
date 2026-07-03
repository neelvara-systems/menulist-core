import { getUnitCost } from "@constant/AI/unitCosts";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { consumeAICapacity, RemainingBalance } from "./capacityCheck";
import { AiOperationLogInput, recordAiOperation, recordAiOperationForSession } from "./operationLog";

type FinalizeAiOperationAccountingParams = {
    capacitySubscription?: any | null;
    context?: Record<string, unknown>;
    input: AiOperationLogInput;
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
 * Record the AI operation and consume paid capacity after a successful provider result.
 *
 * Operation logging is best-effort so analytics gaps never give free paid output.
 * Credit consumption is mandatory for billable actions and is allowed to fail the request.
 */
export async function finalizeAiOperationAccounting({
    capacitySubscription,
    context,
    input,
    logLabel,
    session,
}: FinalizeAiOperationAccountingParams): Promise<FinalizeAiOperationAccountingResult> {
    const unitsConsumed = Number(input.unitsConsumed ?? getUnitCost(input.action));
    const operationInput: AiOperationLogInput = {
        ...input,
        unitsConsumed,
    };

    let transactionId: string | null = null;
    let remainingBalance: RemainingBalance | null = null;

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
