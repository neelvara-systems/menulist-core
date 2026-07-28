import { secureError } from '@lib/security/secureLogger';
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type ChatAnalyticsLogContext = Record<string, boolean | number | string | undefined>;

export const getBoundedChatAnalyticsStringContext = (
    label: string,
    value: unknown,
): ChatAnalyticsLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getChatAnalyticsErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getChatAnalyticsErrorCode = (error: unknown): string | undefined => {
    const normalized = getBoundedErrorCode(error);
    if (normalized === undefined) return undefined;
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getChatAnalyticsErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
