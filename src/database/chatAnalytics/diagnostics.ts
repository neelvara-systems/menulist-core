import { secureError } from '@lib/security/secureLogger';
import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';

type ChatAnalyticsLogContext = Record<string, boolean | number | string | undefined>;

type ChatAnalyticsErrorLike = Error & {
    code?: unknown;
    status?: unknown;
};

export const getBoundedChatAnalyticsStringContext = (
    label: string,
    value: unknown,
): ChatAnalyticsLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getChatAnalyticsErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getChatAnalyticsErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as ChatAnalyticsErrorLike).code;
    if (code === undefined || code === null) return undefined;
    const normalized = String(code).slice(0, 64);
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getChatAnalyticsErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as ChatAnalyticsErrorLike).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logChatAnalyticsFailure = (
    failureCode: string,
    error: unknown,
    context: ChatAnalyticsLogContext = {},
): void => {
    secureError('[Answerlattice Chat Analytics] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getChatAnalyticsErrorName(error),
        sourceErrorCode: getChatAnalyticsErrorCode(error),
        sourceStatusCode: getChatAnalyticsErrorStatus(error),
    });
};
