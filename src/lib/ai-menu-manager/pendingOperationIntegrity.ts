import type { AiMenuManagerPendingOperation } from '@type/aiMenuManager';

const STALE_OPERATION_MESSAGE = 'Card no longer matches the selected menu';
const INVALID_GROUP_MESSAGE = 'Prepared updates no longer match this request';

function requireDistinctOperationIds(operations: AiMenuManagerPendingOperation[]): string[] {
    const operationIds = operations.map((operation) => operation.operationId);
    if (
        operationIds.some((operationId) => !operationId)
        || new Set(operationIds).size !== operationIds.length
    ) {
        throw new Error(INVALID_GROUP_MESSAGE);
    }
    return operationIds;
}

export function assertAiMenuManagerPreparedOperationGroup(
    operations: AiMenuManagerPendingOperation[],
): string {
    if (operations.length < 2) throw new Error(INVALID_GROUP_MESSAGE);
    requireDistinctOperationIds(operations);

    const first = operations[0];
    const commandGroupId = first.commandGroupId;
    const commandGroupSize = first.commandGroupSize;
    if (
        !commandGroupId
        || commandGroupSize !== operations.length
        || operations.some((operation) => (
            operation.commandGroupId !== commandGroupId
            || operation.commandGroupSize !== commandGroupSize
            || operation.sessionId !== first.sessionId
            || String(operation.tId) !== String(first.tId)
            || String(operation.sId) !== String(first.sId)
            || String(operation.projectId) !== String(first.projectId)
        ))
    ) {
        throw new Error(INVALID_GROUP_MESSAGE);
    }
    return commandGroupId;
}

export function resolveCurrentAiMenuManagerOperation(params: {
    currentOperations: AiMenuManagerPendingOperation[];
    requestedOperation: AiMenuManagerPendingOperation;
}): AiMenuManagerPendingOperation {
    const matches = params.currentOperations.filter((operation) => (
        operation.operationId === params.requestedOperation.operationId
    ));
    if (matches.length !== 1) {
        throw new Error(STALE_OPERATION_MESSAGE);
    }
    return matches[0];
}

export function resolveCurrentAiMenuManagerOperationGroup(params: {
    currentOperations: AiMenuManagerPendingOperation[];
    requestedOperations: AiMenuManagerPendingOperation[];
}): AiMenuManagerPendingOperation[] {
    if (params.requestedOperations.length < 2) {
        throw new Error(INVALID_GROUP_MESSAGE);
    }

    const requestedIds = requireDistinctOperationIds(params.requestedOperations);
    const requestedIdSet = new Set(requestedIds);
    const matchingOperations = params.currentOperations.filter((operation) => (
        requestedIdSet.has(operation.operationId)
    ));
    if (
        matchingOperations.length !== requestedIds.length
        || new Set(matchingOperations.map((operation) => operation.operationId)).size !== matchingOperations.length
    ) {
        throw new Error(INVALID_GROUP_MESSAGE);
    }

    const operationsById = new Map(
        matchingOperations.map((operation) => [operation.operationId, operation] as const),
    );
    const canonicalOperations = requestedIds.map((operationId) => operationsById.get(operationId));
    if (canonicalOperations.some((operation) => !operation)) {
        throw new Error(INVALID_GROUP_MESSAGE);
    }

    const currentOperations = canonicalOperations as AiMenuManagerPendingOperation[];
    const commandGroupId = currentOperations[0].commandGroupId;
    if (
        !commandGroupId
        || currentOperations.some((operation) => operation.commandGroupId !== commandGroupId)
    ) {
        throw new Error(INVALID_GROUP_MESSAGE);
    }

    const fullPendingGroup = params.currentOperations.filter((operation) => (
        operation.commandGroupId === commandGroupId
    ));
    if (
        fullPendingGroup.length !== currentOperations.length
        || new Set(fullPendingGroup.map((operation) => operation.operationId)).size !== fullPendingGroup.length
        || fullPendingGroup.some((operation) => (
            operation.commandGroupSize !== undefined
            && operation.commandGroupSize !== fullPendingGroup.length
        ))
    ) {
        throw new Error(INVALID_GROUP_MESSAGE);
    }

    return currentOperations;
}
