import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getBoundedSecurityStringContext } from '@lib/security/securityDiagnostics';
import {
    getBoundedErrorName,
    getBoundedErrorStringField,
} from '@lib/monitoring/boundedLogContext';

type DiagnosticsErrorDetails = {
    code?: number | string | null;
    details?: unknown;
    message?: string | null;
    status?: string | null;
};

type DiagnosticsErrorLike = Error & {
    code?: number | string;
    error?: DiagnosticsErrorDetails;
    httpStatusCode?: number;
    status?: number | string;
};

type AIRouteLogContext = Record<string, boolean | number | string | null | undefined>;

type AIRouteSessionLike = {
    sId?: unknown;
    storeId?: unknown;
    tId?: unknown;
    tenantId?: unknown;
    user?: {
        email?: unknown;
        id?: unknown;
        storeId?: unknown;
        tenantId?: unknown;
    };
    userId?: unknown;
};

const AI_ROUTE_STRING_FIELDS = [
    'action',
    'attempt',
    'businessType',
    'campaignType',
    'contentLength',
    'endpoint',
    'fileId',
    'language',
    'model',
    'projectId',
    'requestId',
    'responseTextSummary',
    'sourceLang',
    'storeId',
    'storeName',
    'surface',
    'targetLang',
    'tenantId',
    'tone',
    'transactionId',
    'userId',
] as const;

const AI_ROUTE_NUMBER_FIELDS = [
    'candidateTokenCount',
    'candidatesTokenCount',
    'categoryCount',
    'fallbackKeyCount',
    'failedPromptCount',
    'generatedImageCount',
    'imageCount',
    'inputImageCount',
    'inputKeyCount',
    'itemCount',
    'missingIdCount',
    'pageCount',
    'processingTime',
    'promptCount',
    'promptImageCount',
    'promptLength',
    'promptTokenCount',
    'referenceImageCount',
    'requestedCount',
    'returnedCount',
    'responseTextLength',
    'totalTokenCount',
    'translatedKeyCount',
    'translationCoverageCount',
] as const;

const AI_ROUTE_BOOLEAN_FIELDS = [
    'isArray',
    'isBatch',
    'hasGenerationConfig',
    'hasPrompt',
    'hasPromptImages',
    'hasReferenceImage',
    'responseTextPresent',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object');
}

function getSafeDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    return /^[a-zA-Z0-9_.:/-]{1,80}$/.test(trimmed) ? trimmed : 'present';
}

function getStatusCode(value: unknown): number | null {
    const statusCode = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
        ? statusCode
        : null;
}

function getDetailCount(details: unknown): number | null {
    if (Array.isArray(details)) return details.length;
    return details === undefined || details === null ? null : 1;
}

export function getAIGatewayDiagnostics(client: unknown) {
    if (!client || typeof client !== 'object') return undefined;

    const maybeGateway = client as { getKeyStats?: () => unknown };
    if (typeof maybeGateway.getKeyStats !== 'function') return undefined;

    try {
        return maybeGateway.getKeyStats();
    } catch {
        return undefined;
    }
}

function getAIGatewayStatsLogContext(stats: unknown): AIRouteLogContext {
    if (!isRecord(stats)) return {};

    return {
        gatewayActiveKeys: getFiniteNumber(stats.activeKeys),
        gatewayCoolingDownKeys: getFiniteNumber(stats.coolingDownKeys),
        gatewayCurrentKeyIndex: getFiniteNumber(stats.currentKeyIndex),
        gatewayKeyEntryCount: Array.isArray(stats.keys) ? stats.keys.length : undefined,
        gatewayTotalKeys: getFiniteNumber(stats.totalKeys),
    };
}

function getFiniteNumber(value: unknown): number | undefined {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
}

export function getAIRouteLogContext(context: Record<string, unknown> = {}): AIRouteLogContext {
    const logContext: AIRouteLogContext = {};

    AI_ROUTE_STRING_FIELDS.forEach((field) => {
        if (!(field in context)) return;
        Object.assign(logContext, getBoundedRuntimeStringContext(field, context[field]));
    });

    AI_ROUTE_NUMBER_FIELDS.forEach((field) => {
        if (!(field in context)) return;
        logContext[field] = getFiniteNumber(context[field]);
    });

    AI_ROUTE_BOOLEAN_FIELDS.forEach((field) => {
        if (!(field in context)) return;
        logContext[field] = Boolean(context[field]);
    });

    if (Array.isArray(context.targetLangs)) {
        logContext.targetLangCount = context.targetLangs.length;
        logContext.targetLangsLength = context.targetLangs.reduce(
            (total, language) => total + String(language ?? '').length,
            0,
        );
    }

    if ('responseType' in context) {
        logContext.responseType = typeof context.responseType === 'string'
            ? context.responseType.slice(0, 64)
            : typeof context.responseType;
    }

    if (isRecord(context.responseUsage)) {
        logContext.promptTokenCount = getFiniteNumber(context.responseUsage.promptTokenCount);
        logContext.candidatesTokenCount = getFiniteNumber(context.responseUsage.candidatesTokenCount);
        logContext.totalTokenCount = getFiniteNumber(context.responseUsage.totalTokenCount);
    }

    if ('gatewayDiagnostics' in context) {
        Object.assign(logContext, getAIGatewayStatsLogContext(context.gatewayDiagnostics));
    }

    return logContext;
}

export function getAIRouteSecurityContext(
    session: AIRouteSessionLike | undefined,
    request?: Request,
): AIRouteLogContext {
    return {
        ...getBoundedSecurityStringContext('userId', session?.user?.id ?? session?.userId),
        ...getBoundedSecurityStringContext('email', session?.user?.email),
        ...getBoundedSecurityStringContext('tenantId', session?.tId ?? session?.tenantId ?? session?.user?.tenantId),
        ...getBoundedSecurityStringContext('storeId', session?.sId ?? session?.storeId ?? session?.user?.storeId),
        ...getBoundedSecurityStringContext('ip', request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip')),
        ...getBoundedSecurityStringContext('userAgent', request?.headers?.get('user-agent')),
    };
}

export function logAIRouteFailure(
    failureCode: string,
    error?: unknown,
    context: Record<string, unknown> = {},
): void {
    logRuntimeFailure(failureCode, error, {
        ...getAIErrorDiagnostics(error),
        ...getAIRouteLogContext(context),
    });
}

export function getAIErrorDiagnostics(error: unknown) {
    const resolved = (isRecord(error) ? error : {}) as unknown as DiagnosticsErrorLike;
    const nestedError = isRecord(resolved.error) ? resolved.error as DiagnosticsErrorDetails : {};
    const sourceStatus = resolved.status ?? resolved.httpStatusCode ?? nestedError.code ?? null;
    const sourceErrorCode = getSafeDiagnosticValue(resolved.code ?? nestedError.code);

    return {
        code: sourceErrorCode,
        hasMessage: resolved instanceof Error
            ? Boolean(getBoundedErrorStringField(resolved, 'message'))
            : typeof error === 'string' && error.length > 0,
        hasNestedMessage: typeof nestedError.message === 'string' && nestedError.message.length > 0,
        hasStack: resolved instanceof Error && Boolean(getBoundedErrorStringField(resolved, 'stack')),
        name: getBoundedErrorName(resolved) || typeof error,
        nestedCode: getSafeDiagnosticValue(nestedError.code),
        nestedDetailCount: getDetailCount(nestedError.details),
        nestedStatus: getSafeDiagnosticValue(nestedError.status),
        sourceErrorCode,
        sourceErrorName: getBoundedErrorName(resolved) || typeof error,
        sourceStatus: getSafeDiagnosticValue(sourceStatus),
        sourceStatusCode: getStatusCode(sourceStatus),
        status: getStatusCode(sourceStatus) ?? getSafeDiagnosticValue(sourceStatus),
    };
}

export function getPreviewText(value: string | undefined | null, maxLength: number = 300) {
    const text = String(value || '');
    if (!text) return '';
    return `[response_text_present:length=${text.length}:limit=${maxLength}]`;
}
