import { secureError, secureLog } from '@lib/security/secureLogger';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import type { NextRequest } from 'next/server';

type AnswerlatticeLogContext = Record<string, boolean | number | string | null | undefined>;

type AnswerlatticeErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

export const getBoundedAnswerlatticeStringContext = (
    label: string,
    value: unknown,
): AnswerlatticeLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getAnswerlatticeErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getAnswerlatticeErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as AnswerlatticeErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getAnswerlatticeErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as AnswerlatticeErrorLike).status
        : (error as AnswerlatticeErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
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
