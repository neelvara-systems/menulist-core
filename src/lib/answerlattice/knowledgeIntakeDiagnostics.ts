import { getBoundedSecurityStringContext } from '@lib/security/securityDiagnostics';
import { secureError } from '@lib/security/secureLogger';
import {
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type IntakeLogScope = {
    tId?: unknown;
    sId?: unknown;
};

type IntakeLogContextInput = {
    articleId?: unknown;
    articleTitle?: unknown;
    cacheSegment?: unknown;
    createdCount?: unknown;
    itemId?: unknown;
    jobId?: unknown;
    ledgerId?: unknown;
    mediaKind?: unknown;
    publishedCount?: unknown;
    scope?: IntakeLogScope;
    sourceId?: unknown;
    sourceType?: unknown;
    usageUnits?: unknown;
};

const toFiniteNumber = (value: unknown): number | undefined => {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const toSafeLabel = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    if (!normalized) return undefined;
    return /^[a-zA-Z0-9_.:/-]{1,80}$/.test(normalized) ? normalized : 'present';
};

const getSourceErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getSourceErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getSourceErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export function getAnswerlatticeKnowledgeIntakeSourceErrorContext(error: unknown) {
    return {
        sourceErrorName: getSourceErrorName(error),
        sourceErrorCode: getSourceErrorCode(error),
        sourceStatusCode: getSourceErrorStatus(error),
    };
}

export function getAnswerlatticeKnowledgeIntakeLogContext(input: IntakeLogContextInput = {}) {
    return {
        ...getBoundedSecurityStringContext('tenantId', input.scope?.tId),
        ...getBoundedSecurityStringContext('storeId', input.scope?.sId),
        ...getBoundedSecurityStringContext('jobId', input.jobId),
        ...getBoundedSecurityStringContext('itemId', input.itemId),
        ...getBoundedSecurityStringContext('sourceId', input.sourceId),
        ...getBoundedSecurityStringContext('ledgerId', input.ledgerId),
        ...getBoundedSecurityStringContext('articleId', input.articleId),
        ...getBoundedSecurityStringContext('articleTitle', input.articleTitle),
        cacheSegment: toSafeLabel(input.cacheSegment),
        createdCount: toFiniteNumber(input.createdCount),
        mediaKind: toSafeLabel(input.mediaKind),
        publishedCount: toFiniteNumber(input.publishedCount),
        sourceType: toSafeLabel(input.sourceType),
        usageUnits: toFiniteNumber(input.usageUnits),
    };
}

export function logAnswerlatticeKnowledgeIntakeFailure(
    message: string,
    failureCode: string,
    error: unknown,
    input: IntakeLogContextInput = {},
) {
    secureError(message, new Error(failureCode), {
        failureCode,
        ...getAnswerlatticeKnowledgeIntakeLogContext(input),
        ...getAnswerlatticeKnowledgeIntakeSourceErrorContext(error),
    });
}
