import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import type { NextRequest } from 'next/server';

type AnswerlatticeLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedAnswerlatticeStringContext = (
    label: string,
    value: unknown,
): AnswerlatticeLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getAnswerlatticeErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getAnswerlatticeErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getAnswerlatticeErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const getAnswerlatticeScopeLogContext = (scope: {
    articleId?: unknown;
    entityId?: unknown;
    proposalId?: unknown;
    sId?: unknown;
    signalType?: unknown;
    tId?: unknown;
}): AnswerlatticeLogContext => ({
    ...getBoundedAnswerlatticeStringContext('articleId', scope.articleId),
    ...getBoundedAnswerlatticeStringContext('entityId', scope.entityId),
    ...getBoundedAnswerlatticeStringContext('proposalId', scope.proposalId),
    ...getBoundedAnswerlatticeStringContext('signalType', scope.signalType),
    ...getBoundedAnswerlatticeStringContext('storeId', scope.sId),
    ...getBoundedAnswerlatticeStringContext('tenantId', scope.tId),
});

export const getAnswerlatticeSecurityLogContext = (
    session: any,
    request: NextRequest,
    endpoint = request.nextUrl.pathname,
    context: AnswerlatticeLogContext = {},
): AnswerlatticeLogContext => ({
    ...getBoundedSecurityRouteContext(session, request),
    ...getBoundedAnswerlatticeStringContext('endpoint', endpoint),
    ...getBoundedAnswerlatticeStringContext('method', request.method),
    ...context,
});

export const logAnswerlatticeDiagnostic = (
    diagnosticCode: string,
    context: AnswerlatticeLogContext = {},
): void => {
    secureLog('[Answerlattice] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logAnswerlatticeFailure = (
    failureCode: string,
    error?: unknown,
    context: AnswerlatticeLogContext = {},
): void => {
    secureError('[Answerlattice] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getAnswerlatticeErrorName(error),
        sourceErrorCode: getAnswerlatticeErrorCode(error),
        sourceStatusCode: getAnswerlatticeErrorStatus(error),
    });
};
