import { getUnitCost } from "@constant/AI/unitCosts";
import { logger } from "@lib/monitoring/logger";
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
        logger.error(`${logLabel} operation log failed`, operationLogError, context);
    }

    if (capacitySubscription && unitsConsumed > 0) {
        try {
            remainingBalance = await consumeAICapacity(capacitySubscription, unitsConsumed);
            if (!remainingBalance) {
                throw new Error(`${logLabel} credit consumption returned no balance`);
            }
        } catch (creditConsumptionError) {
            logger.error(`${logLabel} credit consumption failed`, creditConsumptionError, context);
            throw creditConsumptionError;
        }
    }

    return {
        remainingBalance,
        transactionId,
        unitsConsumed,
    };
}
